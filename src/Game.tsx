import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, LogOut, RotateCcw, Undo2 } from 'lucide-react'
import type { GameMode, GameState, Piece, VictoryOptions } from './types'
import { getWinningCells, isRiskyPiece } from './gameLogic'
import { aiChoosePosition, aiChoosePiece, type AILevel } from './aiLogic'
import {
  createRoom, joinRoom, startPolling, leaveRoom,
  updateGameState, areBothPlayersConnected, syncToGameState,
  type RoomData,
} from './onlineLogic'
import { useLanguage } from './LanguageContext'
import { saveGameResult } from './firebaseConfig'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Board } from './game/Board'
import { applyChoosePiece, applyPlacePiece, createGameState, tickClock } from './game/gameActions'
import { Block, MoveList, PhaseBlock, PlayerBar, Reserve, Segmented, Toggle } from './game/GamePanels'
import { usePieceLabel, useSharedLabel } from './game/pieceText'

interface GameProps {
  user?: { id: string; name: string; email: string; username: string } | null;
  /** Mode de jeu de la page courante (chaque mode a sa propre page) */
  mode: GameMode;
  /** Retour à la page d'accueil */
  onExit: () => void;
  /** Code de salle présent dans l'URL (/online/ABC123) : rejoint automatiquement */
  initialRoomCode?: string | null;
}

type TimeControl = 0 | 3 | 5;

/** Réglage mémorisé dans le navigateur (confort uniquement, tolère un stockage indisponible). */
function useStored<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  const set = useCallback((v: T) => {
    setValue(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* stockage indisponible */ }
  }, [key]);
  return [value, set];
}

const inviteUrl = (code: string) => `${window.location.origin}/online/${code}`;

function Game({ user, mode, onExit, initialRoomCode }: GameProps) {
  const { t } = useLanguage();
  const pieceLabel = usePieceLabel();
  const sharedLabel = useSharedLabel();
  const isOnline = mode === 'online';

  // ── Réglages ──────────────────────────────────────────────────────────────
  const [aiLevel, setAiLevel] = useStored<AILevel>('quarto-ai-level', 'normal');
  const [timeControl, setTimeControl] = useStored<TimeControl>('quarto-time', 0);
  const [hint, setHint] = useStored<boolean>('quarto-hint', true);
  const [squares, setSquares] = useStored<boolean>('quarto-squares', false);
  const victoryOptions: VictoryOptions = useMemo(() => ({ lines: true, squares }), [squares]);

  // ── Partie ────────────────────────────────────────────────────────────────
  const [firstPlayer, setFirstPlayer] = useState<1 | 2>(1);
  const [gameState, setGameState] = useState<GameState>(() =>
    createGameState(mode, { lines: true, squares }, 1, isOnline ? 0 : timeControl * 60)
  );
  const [history, setHistory] = useState<GameState[]>([]);
  const [resultHidden, setResultHidden] = useState(false);

  // ── En ligne ──────────────────────────────────────────────────────────────
  const [showOnlineSetup, setShowOnlineSetup] = useState(isOnline);
  const [showOnlineOptions, setShowOnlineOptions] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [isRoomHost, setIsRoomHost] = useState(false);
  const [copied, setCopied] = useState(false);

  const onlineRoomInfoRef = useRef<{ roomId: string; playerNumber: 1 | 2 } | null>(null);
  const pollingCleanupRef = useRef<(() => void) | null>(null);
  const gameStartPollingCleanupRef = useRef<(() => void) | null>(null);
  const autoJoinDoneRef = useRef(false);
  const resultSavedRef = useRef(false);

  const myNumber: 1 | 2 = gameState.onlineRoom?.playerNumber ?? 1;
  const opponentNumber: 1 | 2 = myNumber === 1 ? 2 : 1;

  // ── Enregistrement du résultat (une seule fois par partie) ───────────────
  useEffect(() => {
    if (!gameState.gameOver) { resultSavedRef.current = false; return; }
    if (resultSavedRef.current || !user || mode === 'two-player') return;
    if (isOnline && !gameState.onlineRoom) return;
    resultSavedRef.current = true;
    const me = isOnline ? gameState.onlineRoom!.playerNumber : 1;
    const result = gameState.winner === null ? 'draw' : gameState.winner === me ? 'win' : 'loss';
    saveGameResult(user.id || user.name, result, user.username, gameState.victoryOptions);
  }, [gameState.gameOver, gameState.winner, gameState.onlineRoom, gameState.victoryOptions, user, mode, isOnline]);

  // ── Nouvelle partie (local / IA) ─────────────────────────────────────────
  const startNewGame = useCallback((opts: { alternate?: boolean; squares?: boolean; time?: TimeControl } = {}) => {
    const fp: 1 | 2 = opts.alternate ? (firstPlayer === 1 ? 2 : 1) : 1;
    const sq = opts.squares ?? squares;
    const time = opts.time ?? timeControl;
    setFirstPlayer(fp);
    setGameState(createGameState(mode, { lines: true, squares: sq }, fp, time * 60));
    setHistory([]);
    setResultHidden(false);
  }, [firstPlayer, squares, timeControl, mode]);

  // ── Tour de l'IA ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'vs-ai' || gameState.gameOver || gameState.currentPlayer !== 2) return;
    const timer = setTimeout(() => {
      setGameState(prev => {
        if (prev.gameOver || prev.currentPlayer !== 2) return prev;
        if (prev.currentPiece === null) {
          return applyChoosePiece(prev, aiChoosePiece(prev.board, prev.availablePieces, prev.victoryOptions, aiLevel));
        }
        const { row, col } = aiChoosePosition(prev.board, prev.currentPiece, prev.availablePieces, prev.victoryOptions, aiLevel);
        return applyPlacePiece(prev, row, col);
      });
    }, 600 + Math.random() * 500);
    return () => clearTimeout(timer);
  }, [mode, gameState, aiLevel]);

  // ── Pendule (parties locales au temps) ───────────────────────────────────
  const started = (gameState.moves?.length ?? 0) > 0;
  const clockRunning = !isOnline && !!gameState.clocks && started && !gameState.gameOver;
  useEffect(() => {
    if (!clockRunning) return;
    const id = setInterval(() => setGameState(prev => tickClock(prev)), 1000);
    return () => clearInterval(id);
  }, [clockRunning]);

  // ── Actions du joueur ─────────────────────────────────────────────────────
  const isHumanTurn = !gameState.gameOver && (
    mode === 'two-player' ||
    (mode === 'vs-ai' && gameState.currentPlayer === 1) ||
    (isOnline && !!gameState.onlineRoom && gameState.currentPlayer === myNumber)
  );
  const canChoose = isHumanTurn && gameState.currentPiece === null;
  const canPlace = isHumanTurn && gameState.currentPiece !== null;

  const commit = (next: GameState) => {
    if (!isOnline) setHistory(h => [...h, gameState]);
    setGameState(next);
    if (isOnline && gameState.onlineRoom) {
      updateGameState(gameState.onlineRoom.roomId, next, myNumber)
        .catch(err => console.error('[Online] Erreur de synchronisation :', err));
    }
  };

  const handleChoose = (piece: Piece) => {
    if (canChoose) commit(applyChoosePiece(gameState, piece));
  };
  const handlePlace = (row: number, col: number) => {
    if (canPlace) commit(applyPlacePiece(gameState, row, col));
  };
  const handleUndo = () => {
    if (!history.length) return;
    setGameState(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
    setResultHidden(false);
  };

  // ── En ligne : écoute de l'état ───────────────────────────────────────────
  const startGameStatePolling = useCallback((id: string) => {
    pollingCleanupRef.current?.();
    pollingCleanupRef.current = startPolling(id, (roomData: RoomData) => {
      const me = onlineRoomInfoRef.current?.playerNumber;
      if (!me || !roomData.sync || roomData.sync.movedBy === me) return; // propre écriture
      const received = syncToGameState(roomData.sync);
      setGameState(prev => ({ ...received, onlineRoom: prev.onlineRoom }));
      setResultHidden(false);
    });
  }, []);

  const handleCreateRoom = async () => {
    const newRoomId = await createRoom();
    setRoomId(newRoomId);
    setWaitingForOpponent(true);
    setIsRoomHost(true);
    const cleanup = startPolling(newRoomId, (roomData) => {
      if (!areBothPlayersConnected(roomData)) return;
      cleanup();
      pollingCleanupRef.current = null;
      setWaitingForOpponent(false);
      setShowOnlineSetup(false);
      setShowOnlineOptions(true);
    });
    pollingCleanupRef.current = cleanup;
  };

  const joinWithCode = useCallback(async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (code.length !== 6) { setJoinError(t.alerts.roomCodeLength); return; }
    setJoining(true);
    setJoinError('');
    const success = await joinRoom(code).catch(() => false);
    setJoining(false);
    if (!success) { setJoinError(t.alerts.cannotJoinRoom); return; }

    setRoomId(code);
    setIsRoomHost(false);
    setShowOnlineSetup(false);
    setShowOnlineOptions(true);

    // Attend que l'hôte écrive l'état initial pour démarrer
    const cleanup = startPolling(code, (roomData) => {
      if (roomData.sync?.gameMode !== 'online') return;
      cleanup();
      gameStartPollingCleanupRef.current = null;
      onlineRoomInfoRef.current = { roomId: code, playerNumber: 2 };
      setShowOnlineOptions(false);
      setGameState({
        ...syncToGameState(roomData.sync),
        onlineRoom: { roomId: code, playerNumber: 2, isHost: false },
      });
      startGameStatePolling(code);
    });
    gameStartPollingCleanupRef.current = cleanup;
  }, [t, startGameStatePolling]);

  // Lien d'invitation : /online/ABC123 rejoint directement
  useEffect(() => {
    if (!isOnline || !initialRoomCode || autoJoinDoneRef.current) return;
    autoJoinDoneRef.current = true;
    const timer = setTimeout(() => { setInputRoomId(initialRoomCode.toUpperCase()); joinWithCode(initialRoomCode); }, 0);
    return () => clearTimeout(timer);
  }, [isOnline, initialRoomCode, joinWithCode]);

  const handleStartOnlineGame = async (fp: 1 | 2 = 1) => {
    setShowOnlineOptions(false);
    setResultHidden(false);
    setFirstPlayer(fp);
    const newState: GameState = {
      ...createGameState('online', victoryOptions, fp),
      onlineRoom: { roomId, playerNumber: 1, isHost: true },
    };
    onlineRoomInfoRef.current = { roomId, playerNumber: 1 };
    setGameState(newState);
    try {
      await updateGameState(roomId, newState, 1);
    } catch (err) {
      console.error('[Online] Erreur sync état initial :', err);
    }
    startGameStatePolling(roomId);
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl(roomId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* presse-papiers refusé : le lien reste sélectionnable */ }
  };

  // ── Nettoyage ─────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      pollingCleanupRef.current?.();
      gameStartPollingCleanupRef.current?.();
      if (onlineRoomInfoRef.current) {
        leaveRoom(onlineRoomInfoRef.current.roomId, onlineRoomInfoRef.current.playerNumber);
      }
    };
  }, []);

  // ── Écran : créer / rejoindre une salle ──────────────────────────────────
  if (showOnlineSetup) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">{t.gameModes.online}</h1>
          <p className="mb-6 text-sm text-muted-foreground">{t.gameModes.onlineDesc}</p>

          {waitingForOpponent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.room.shareLink}</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background py-1.5 pl-3 pr-1.5">
                <code className="min-w-0 flex-1 truncate font-mono text-sm text-muted-foreground select-all">{inviteUrl(roomId)}</code>
                <Button size="sm" variant="outline" onClick={copyInvite} className="gap-1.5">
                  {copied ? <Check /> : <Copy />} {copied ? t.room.copied : t.room.copyLink}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{t.room.orShareCode}</p>
              <div className="rounded-xl bg-muted py-4 text-center font-mono text-4xl font-semibold tracking-[0.3em]">{roomId}</div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-primary" /> {t.room.waitingForOpponent}
              </p>
              <Button
                variant="outline"
                className="h-10 w-full"
                onClick={() => {
                  pollingCleanupRef.current?.();
                  pollingCleanupRef.current = null;
                  leaveRoom(roomId, 1);
                  setWaitingForOpponent(false);
                  setIsRoomHost(false);
                }}
              >
                {t.actions.cancel}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <Button onClick={handleCreateRoom} className="h-11 w-full text-base">{t.actions.createRoom}</Button>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="h-px flex-1 bg-border" />{t.actions.or}<div className="h-px flex-1 bg-border" />
              </div>
              <form
                className="space-y-2"
                onSubmit={e => { e.preventDefault(); joinWithCode(inputRoomId); }}
              >
                <label htmlFor="room-code" className="block text-sm font-medium">{t.actions.joinRoom}</label>
                <div className="flex gap-2">
                  <Input
                    id="room-code"
                    value={inputRoomId}
                    onChange={e => { setInputRoomId(e.target.value.toUpperCase()); setJoinError(''); }}
                    placeholder={t.room.roomCodePlaceholder}
                    maxLength={6}
                    autoComplete="off"
                    className="h-10 flex-1 text-center font-mono text-lg uppercase tracking-[0.3em]"
                  />
                  <Button type="submit" variant="outline" className="h-10 px-4" disabled={joining}>
                    {joining ? t.room.joining : t.actions.join}
                  </Button>
                </div>
                {joinError && <p className="text-sm text-destructive" role="alert">{joinError}</p>}
              </form>
              <Button variant="ghost" onClick={onExit} className="w-full">{t.actions.back}</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Écran : règles de la partie en ligne (choisies par l'hôte) ───────────
  if (showOnlineOptions) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-10">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div>
            <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">{t.victory.title}</h1>
            <p className="text-sm text-muted-foreground">
              {t.room.roomCode} <span className="font-mono font-semibold text-foreground">{roomId}</span>
            </p>
          </div>
          <Toggle
            id="online-squares"
            label={t.victory.squaresLabel}
            description={t.victory.squaresDescription}
            checked={squares}
            onChange={setSquares}
            disabled={!isRoomHost}
          />
          {isRoomHost ? (
            <Button className="h-11 w-full" onClick={() => handleStartOnlineGame(1)}>{t.actions.startGame}</Button>
          ) : (
            <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
              <span className="size-2 animate-pulse rounded-full bg-primary" /> {t.room.hostStarts}
            </p>
          )}
          <Button variant="ghost" className="w-full" onClick={onExit}>{t.actions.leave}</Button>
        </div>
      </div>
    );
  }

  // ── Textes de la partie ───────────────────────────────────────────────────
  const nameOf = (p: 1 | 2): string => {
    if (mode === 'two-player') return t.players.player(p);
    const me = user?.username ?? t.players.you;
    if (mode === 'vs-ai') return p === 2 ? t.players.ai : me;
    return p === myNumber ? me : t.players.opponent;
  };
  const subOf = (p: 1 | 2): string => {
    if (mode === 'two-player') return t.players.sameDevice;
    if (mode === 'vs-ai' && p === 2) return t.game.levels[aiLevel];
    if (isOnline && p !== myNumber) return t.players.onlineOpponent;
    return user ? t.players.you : t.players.guest;
  };

  const { board, currentPiece, currentPlayer, gameOver, winner, winningPositions } = gameState;
  const moves = gameState.moves ?? [];
  const lastPlacedMove = [...moves].reverse().find(m => m.cell !== null);
  const riskyPieces = hint && canChoose
    ? gameState.availablePieces.filter(p => isRiskyPiece(board, p, gameState.victoryOptions))
    : [];
  const hintCells = hint && canPlace && currentPiece !== null
    ? getWinningCells(board, currentPiece, gameState.victoryOptions)
    : [];
  const attr = sharedLabel(board, winningPositions);

  let phase: { title: string; sub: string; state: 'act' | 'wait' | 'over' };
  if (gameOver) {
    if (winner) {
      const who = mode === 'vs-ai'
        ? (winner === 1 ? t.game.youWin : t.game.aiWins)
        : isOnline
          ? (winner === myNumber ? t.game.youWin : t.game.opponentWins)
          : t.game.playerWins(nameOf(winner));
      phase = { title: `${t.game.quarto} ${who}`, sub: gameState.timedOut ? t.game.timeout : t.game.fourAligned(attr), state: 'over' };
    } else {
      phase = { title: `${t.game.draw}.`, sub: t.game.boardFull, state: 'over' };
    }
  } else if (!isHumanTurn) {
    const received = currentPiece !== null ? t.game.received(pieceLabel(currentPiece)) : '';
    phase = mode === 'vs-ai'
      ? { title: currentPiece === null ? t.game.aiChoosing : t.game.aiPlacing, sub: currentPiece === null ? t.game.aiAvoids : received, state: 'wait' }
      : { title: currentPiece === null ? t.game.opponentChoosing : t.game.opponentPlacing, sub: received, state: 'wait' };
  } else if (currentPiece === null) {
    const title = mode === 'two-player'
      ? t.game.chooseNamed(nameOf(currentPlayer), nameOf(currentPlayer === 1 ? 2 : 1))
      : mode === 'vs-ai' ? t.game.chooseForAI : t.game.chooseForOpponent;
    phase = { title, sub: started ? t.game.avoidCompleting : t.game.firstMoveSafe, state: 'act' };
  } else {
    phase = {
      title: mode === 'two-player' ? t.game.placeNamed(nameOf(currentPlayer)) : t.game.placeYours,
      sub: pieceLabel(currentPiece) + (hintCells.length ? ` · ${t.game.winningCellCircled}` : ''),
      state: 'act',
    };
  }

  const resultTitle = !winner
    ? t.game.draw
    : mode === 'two-player'
      ? t.game.playerWins(nameOf(winner))
      : winner === myNumber ? t.game.victory : t.game.defeat;
  const resultSub = !winner
    ? t.game.boardFull
    : gameState.timedOut ? t.game.timeout : t.game.inMoves(moves.length, attr);

  const canRematch = !isOnline || isRoomHost;
  const rematch = () => {
    if (isOnline) handleStartOnlineGame(firstPlayer === 1 ? 2 : 1);
    else startNewGame({ alternate: true });
  };

  const bottomPlayer: 1 | 2 = isOnline ? myNumber : 1;
  const topPlayer: 1 | 2 = isOnline ? opponentNumber : 2;
  const playerBar = (p: 1 | 2) => (
    <PlayerBar
      name={nameOf(p)}
      sub={subOf(p)}
      isAI={mode === 'vs-ai' && p === 2}
      active={!gameOver && currentPlayer === p}
      hand={!gameOver && currentPiece !== null && currentPlayer === p ? currentPiece : null}
      clock={gameState.clocks ? gameState.clocks[p - 1] : null}
      clockRunning={clockRunning && currentPlayer === p}
    />
  );
  const phaseBlock = <PhaseBlock title={phase.title} sub={phase.sub} state={phase.state} />;

  // ── Plateau de jeu ────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:py-8">
      <h1 className="sr-only">{t.header.title} · {mode === 'vs-ai' ? t.gameModes.vsAI : isOnline ? t.gameModes.online : t.gameModes.twoPlayer}</h1>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">

        <div className="mx-auto flex w-full max-w-[580px] flex-col gap-3">
          {playerBar(topPlayer)}
          <div className="relative py-1">
            <Board
              board={board}
              canPlace={canPlace}
              onCellClick={handlePlace}
              winningPositions={winningPositions}
              hintPositions={hintCells}
              ghostPiece={canPlace ? currentPiece : null}
              lastPlaced={lastPlacedMove?.cell ?? null}
            />
            {gameOver && !resultHidden && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center p-4">
                <div className="q-pop pointer-events-auto max-w-[19rem] rounded-2xl border border-border bg-card px-6 py-5 text-center shadow-2xl">
                  <p className="mb-1 font-display text-3xl font-extrabold tracking-tight">{resultTitle}</p>
                  <p className="mb-4 text-sm text-muted-foreground">{resultSub}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {canRematch ? (
                      <Button onClick={rematch} className="h-9 px-4">{t.game.rematch}</Button>
                    ) : (
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="size-2 animate-pulse rounded-full bg-primary" /> {t.room.waitingForHost}
                      </span>
                    )}
                    <Button variant="outline" onClick={() => setResultHidden(true)} className="h-9 px-4">{t.game.seeBoard}</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {playerBar(bottomPlayer)}
          <div className="lg:hidden">{phaseBlock}</div>
        </div>

        <aside className="mx-auto flex w-full max-w-[580px] flex-col gap-3.5 lg:max-w-none">
          <div className="hidden lg:block">{phaseBlock}</div>

          <Reserve
            available={gameState.availablePieces}
            inHand={currentPiece}
            canChoose={canChoose}
            risky={riskyPieces}
            onChoose={handleChoose}
          />

          <MoveList moves={moves} nameOf={nameOf} />

          <Block title={t.game.settings} className="flex flex-col gap-3">
            {isOnline ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {t.room.roomCode} <span className="font-mono font-semibold text-foreground">{gameState.onlineRoom?.roomId ?? roomId}</span>
                </p>
                <Toggle id="opt-hint" label={t.game.hint} description={t.game.hintDesc} checked={hint} onChange={setHint} />
                <Button variant="outline" onClick={onExit} className="h-9 gap-2">
                  <LogOut /> {t.actions.leave}
                </Button>
              </>
            ) : (
              <>
                {mode === 'vs-ai' && (
                  <Segmented<AILevel>
                    label={t.game.aiLevel}
                    value={aiLevel}
                    onChange={v => { setAiLevel(v); startNewGame(); }}
                    options={[
                      { value: 'easy', label: t.game.levels.easy },
                      { value: 'normal', label: t.game.levels.normal },
                      { value: 'expert', label: t.game.levels.expert },
                    ]}
                  />
                )}
                <Segmented<TimeControl>
                  label={t.game.timeControl}
                  value={timeControl}
                  onChange={v => { setTimeControl(v); startNewGame({ time: v }); }}
                  options={[
                    { value: 0, label: t.game.noLimit },
                    { value: 3, label: t.game.minutes(3) },
                    { value: 5, label: t.game.minutes(5) },
                  ]}
                />
                <Toggle
                  id="opt-squares"
                  label={t.victory.squaresLabel}
                  description={t.victory.squaresDescription}
                  checked={squares}
                  onChange={v => { setSquares(v); startNewGame({ squares: v }); }}
                />
                <Toggle id="opt-hint" label={t.game.hint} description={t.game.hintDesc} checked={hint} onChange={setHint} />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-9 flex-1 gap-2"
                    onClick={handleUndo}
                    disabled={!history.length || (mode === 'vs-ai' && gameOver)}
                  >
                    <Undo2 /> {t.game.undo}
                  </Button>
                  <Button variant="outline" className="h-9 flex-1 gap-2" onClick={() => startNewGame()}>
                    <RotateCcw /> {t.actions.newGame}
                  </Button>
                </div>
              </>
            )}
          </Block>

          <Block title={t.game.rulesTitle}>
            <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-muted-foreground">
              {t.game.rules.map(r => <li key={r}>{r}</li>)}
            </ul>
          </Block>
        </aside>
      </div>
    </div>
  );
}

export default Game
