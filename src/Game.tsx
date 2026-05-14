import { useState, useEffect, useCallback, useRef } from 'react'
import { PieceComponent } from './PieceComponent'
import {
  generateAllPieces, type GameState, type Piece, BOARD_SIZE,
  type GameMode, type VictoryOptions, type WinningPosition,
} from './types'
import { initializeBoard, placePiece, isPositionEmpty, checkVictory, normalizeBoard } from './gameLogic'
import { aiChoosePosition, aiChoosePiece } from './aiLogic'
import {
  createRoom, joinRoom, startPolling, leaveRoom,
  updateGameState, areBothPlayersConnected, syncToGameState,
  type RoomData,
} from './onlineLogic'
import { useLanguage } from './LanguageContext'
import { saveGameResult } from './firebaseConfig'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'

interface GameProps {
  user?: { id: string; name: string; email: string; username: string } | null;
}

function Game({ user }: GameProps) {
  const { t } = useLanguage();
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [victoryOptions, setVictoryOptions] = useState<VictoryOptions>({ lines: true, squares: false });
  const [showOptionsScreen, setShowOptionsScreen] = useState(false);

  const [gameState, setGameState] = useState<GameState>({
    board: initializeBoard(),
    availablePieces: generateAllPieces(),
    currentPiece: null,
    currentPlayer: 1,
    winner: null,
    gameOver: false,
    gameMode: 'two-player',
    victoryOptions: { lines: true, squares: false },
  });

  const aiProcessingRef = useRef(false);

  // ── État mode en ligne ────────────────────────────────────────────────────
  const [showOnlineSetup, setShowOnlineSetup] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const [inputRoomId, setInputRoomId] = useState<string>('');
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [isRoomHost, setIsRoomHost] = useState(false);

  // roomId + numéro de joueur pour le client courant
  const onlineRoomInfoRef = useRef<{ roomId: string; playerNumber: 1 | 2 } | null>(null);
  const pollingCleanupRef = useRef<(() => void) | null>(null);
  const gameStartPollingCleanupRef = useRef<(() => void) | null>(null);

  // ── Enregistrement score ──────────────────────────────────────────────────
  useEffect(() => {
    if (!gameState.gameOver || !user) return;
    if (gameState.gameMode !== 'vs-ai' && gameState.gameMode !== 'online') return;
    let result: 'win' | 'loss' | 'draw' = 'draw';
    if (gameState.winner) {
      if (gameState.gameMode === 'vs-ai') {
        result = gameState.winner === 1 ? 'win' : 'loss';
      } else if (gameState.gameMode === 'online' && gameState.onlineRoom) {
        result = gameState.winner === gameState.onlineRoom.playerNumber ? 'win' : 'loss';
      }
    }
    saveGameResult(user.id || user.name, result, user.username, victoryOptions);
  }, [gameState.gameOver, gameState.winner, user, gameState.gameMode]);

  const getStartingPlayer = (mode: GameMode): 1 | 2 =>
    mode === 'vs-ai' ? (Math.random() < 0.5 ? 1 : 2) : 1;

  // ── Listener Firestore ────────────────────────────────────────────────────
  /**
   * Démarre l'écoute Firestore des mises à jour de jeu.
   * N'applique l'état reçu que si sync.movedBy ≠ notre numéro de joueur,
   * ce qui garantit qu'on n'applique jamais sa propre écriture.
   *
   * Firestore émet un seul événement par updateDoc({ sync }) → atomique.
   */
  const startGameStatePolling = useCallback((roomId: string) => {
    pollingCleanupRef.current?.();
    pollingCleanupRef.current = null;

    const cleanup = startPolling(roomId, (roomData: RoomData) => {
      const myPlayerNumber = onlineRoomInfoRef.current?.playerNumber;
      if (!myPlayerNumber || !roomData.sync) return;
      if (roomData.sync.movedBy === myPlayerNumber) return; // propre écriture

      const received = syncToGameState(roomData.sync);
      setGameState(prev => ({ ...received, onlineRoom: prev.onlineRoom }));
    });

    pollingCleanupRef.current = cleanup;
  }, []);

  // ── Placement d'une pièce ─────────────────────────────────────────────────
  const handleBoardClick = async (row: number, col: number) => {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;

    const snap = gameState;
    if (snap.gameOver || snap.currentPiece === null) return;
    if (!isPositionEmpty(snap.board, row, col)) return;
    if (snap.gameMode === 'vs-ai' && aiProcessingRef.current) return;
    if (snap.gameMode === 'online' && snap.onlineRoom &&
        snap.currentPlayer !== snap.onlineRoom.playerNumber) return;

    const piece = snap.currentPiece;
    const newBoard = placePiece(snap.board, row, col, piece);
    const winningPositions = checkVictory(newBoard, snap.victoryOptions);
    const hasWon = winningPositions !== null;
    const newAvailablePieces = snap.availablePieces.filter(p => p !== piece);

    const newState: GameState = {
      ...snap,
      board: newBoard,
      availablePieces: newAvailablePieces,
      currentPiece: null,
      winner: hasWon ? snap.currentPlayer : null,
      gameOver: hasWon || newAvailablePieces.length === 0,
      winningPositions: winningPositions ?? undefined,
    };

    setGameState(newState);

    if (snap.gameMode === 'online' && snap.onlineRoom) {
      try {
        await updateGameState(snap.onlineRoom.roomId, newState, snap.onlineRoom.playerNumber);
      } catch (err) {
        console.error('[Online] Erreur sync PLACE_PIECE:', err);
      }
    }
  };

  // ── Sélection d'une pièce ─────────────────────────────────────────────────
  const handlePieceSelection = async (piece: Piece) => {
    if (gameState.gameOver || gameState.currentPiece !== null) return;
    if (gameState.gameMode === 'vs-ai' && aiProcessingRef.current) return;
    if (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 2) return;
    if (gameState.gameMode === 'online' && gameState.onlineRoom &&
        gameState.currentPlayer !== gameState.onlineRoom.playerNumber) return;

    const newState: GameState = {
      ...gameState,
      currentPiece: piece,
      currentPlayer: (gameState.currentPlayer === 1 ? 2 : 1) as 1 | 2,
    };

    setGameState(newState);

    if (gameState.gameMode === 'online' && gameState.onlineRoom) {
      try {
        await updateGameState(gameState.onlineRoom.roomId, newState, gameState.onlineRoom.playerNumber);
      } catch (err) {
        console.error('[Online] Erreur sync SELECT_PIECE:', err);
      }
    }
  };

  // ── IA ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState.gameMode !== 'vs-ai' || gameState.gameOver || aiProcessingRef.current) return;
    const mustChoose = gameState.currentPlayer === 2 && gameState.currentPiece === null;
    const mustPlace = gameState.currentPlayer === 2 && gameState.currentPiece !== null;
    if (!mustChoose && !mustPlace) return;

    aiProcessingRef.current = true;
    const timer = setTimeout(() => {
      setGameState(prev => {
        if (prev.gameMode !== 'vs-ai' || prev.gameOver) {
          aiProcessingRef.current = false;
          return prev;
        }
        if (prev.currentPlayer === 2 && prev.currentPiece === null) {
          const chosen = aiChoosePiece(prev.board, prev.availablePieces, prev.victoryOptions);
          aiProcessingRef.current = false;
          return { ...prev, currentPiece: chosen, currentPlayer: 1 };
        }
        if (prev.currentPlayer === 2 && prev.currentPiece !== null) {
          const { row, col } = aiChoosePosition(prev.board, prev.currentPiece, prev.victoryOptions);
          const p = prev.currentPiece;
          if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE &&
              !prev.gameOver && isPositionEmpty(prev.board, row, col)) {
            const newBoard = placePiece(prev.board, row, col, p);
            const wPos = checkVictory(newBoard, prev.victoryOptions);
            const hasWon = wPos !== null;
            const newPieces = prev.availablePieces.filter(x => x !== p);
            aiProcessingRef.current = false;
            return {
              ...prev, board: newBoard, availablePieces: newPieces,
              currentPiece: null,
              winner: hasWon ? prev.currentPlayer : null,
              gameOver: hasWon || newPieces.length === 0,
              winningPositions: wPos ?? undefined,
            };
          }
        }
        aiProcessingRef.current = false;
        return prev;
      });
    }, Math.floor(Math.random() * 1500) + 500);

    return () => { clearTimeout(timer); aiProcessingRef.current = false; };
  }, [gameState.currentPlayer, gameState.currentPiece, gameState.gameMode, gameState.gameOver]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    const mode = gameMode || 'two-player';
    setGameState({
      board: initializeBoard(), availablePieces: generateAllPieces(),
      currentPiece: null, currentPlayer: getStartingPlayer(mode),
      winner: null, gameOver: false, gameMode: mode, victoryOptions,
    });
  };

  const handleModeSelection = (mode: GameMode) => {
    setGameMode(mode);
    if (mode === 'online') setShowOnlineSetup(true);
    else setShowOptionsScreen(true);
  };

  // ── Création de salle (hôte / joueur 1) ──────────────────────────────────
  const handleCreateRoom = async () => {
    const newRoomId = await createRoom();
    setRoomId(newRoomId);
    setWaitingForOpponent(true);
    setIsRoomHost(true);

    // Le listener Firestore passe les données complètes → on peut vérifier
    // player2Connected directement sans appel async supplémentaire
    const cleanup = startPolling(newRoomId, (roomData) => {
      if (!areBothPlayersConnected(roomData)) return;
      cleanup();
      pollingCleanupRef.current = null;
      setWaitingForOpponent(false);
      setShowOnlineSetup(false);
      setShowOptionsScreen(true);
    });
    pollingCleanupRef.current = cleanup;
  };

  // ── Rejoindre une salle (joueur 2) ────────────────────────────────────────
  const handleJoinRoom = async () => {
    const trimmed = inputRoomId.trim().toUpperCase();
    if (trimmed.length !== 6) { alert(t.alerts.roomCodeLength); return; }

    const success = await joinRoom(trimmed);
    if (!success) { alert(t.alerts.cannotJoinRoom); return; }

    setRoomId(trimmed);
    setIsRoomHost(false);
    setShowOnlineSetup(false);
    setShowOptionsScreen(true);

    // Attend que l'hôte écrive sync (gameMode='online') pour démarrer la partie
    const cleanup = startPolling(trimmed, (roomData) => {
      if (roomData.sync?.gameMode !== 'online') return;

      cleanup();
      gameStartPollingCleanupRef.current = null;

      const playerNumber: 1 | 2 = 2;
      onlineRoomInfoRef.current = { roomId: trimmed, playerNumber };

      const initialState: GameState = {
        ...syncToGameState(roomData.sync),
        onlineRoom: { roomId: trimmed, playerNumber, isHost: false },
      };

      setShowOptionsScreen(false);
      setGameState(initialState);
      startGameStatePolling(trimmed);
    });
    gameStartPollingCleanupRef.current = cleanup;
  };

  // ── Lancement de la partie (hôte) ─────────────────────────────────────────
  const handleStartOnlineGame = async () => {
    setShowOptionsScreen(false);
    const playerNumber: 1 | 2 = isRoomHost ? 1 : 2;

    const newGameState: GameState = {
      board: initializeBoard(), availablePieces: generateAllPieces(),
      currentPiece: null, currentPlayer: 1,
      winner: null, gameOver: false,
      gameMode: 'online', victoryOptions,
      onlineRoom: { roomId, playerNumber, isHost: playerNumber === 1 },
    };

    onlineRoomInfoRef.current = { roomId, playerNumber };
    setGameState(newGameState);

    try {
      await updateGameState(roomId, newGameState, playerNumber);
    } catch (err) {
      console.error('[Online] Erreur sync état initial:', err);
    }

    startGameStatePolling(roomId);
  };

  const handleStartGame = () => {
    if (gameMode === 'online') {
      handleStartOnlineGame().catch(console.error);
      return;
    }
    setShowOptionsScreen(false);
    const mode = gameMode || 'two-player';
    setGameState({
      board: initializeBoard(), availablePieces: generateAllPieces(),
      currentPiece: null, currentPlayer: getStartingPlayer(mode),
      winner: null, gameOver: false, gameMode: mode, victoryOptions,
    });
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

  // ── Affichage ─────────────────────────────────────────────────────────────
  const getPlayerName = (player: 1 | 2): string => {
    if (gameState.gameMode === 'vs-ai') return player === 2 ? t.players.ai : t.players.you;
    if (gameState.gameMode === 'online' && gameState.onlineRoom) {
      return player === gameState.onlineRoom.playerNumber ? t.players.you : t.players.opponent;
    }
    return `${t.players.player} ${player}`;
  };

  const getInstructionMessage = (player: 1 | 2, hasPiece: boolean): string => {
    if (gameState.gameMode === 'online' && gameState.onlineRoom) {
      const isMyTurn = player === gameState.onlineRoom.playerNumber;
      if (!hasPiece) return isMyTurn ? t.status.choosePieceForOpponent : t.status.waitingForOpponent;
      return isMyTurn ? t.status.placePiece : t.status.waitingForOpponent;
    }
    if (!hasPiece) {
      if (gameState.gameMode === 'vs-ai' && player === 2) return t.status.aiChoosing;
      return gameState.gameMode === 'vs-ai' ? t.status.choosePieceForAI : t.status.choosePieceForOpponent;
    }
    if (gameState.gameMode === 'vs-ai' && player === 2) return t.status.aiPlacing;
    return t.status.placePiece;
  };

  // ── Écran sélection de mode ───────────────────────────────────────────────
  if (gameMode === null) {
    return (
      <div className="min-h-full flex-col">
        <div className="flex-1 container mx-auto px-4 py-6 sm:py-12 flex flex-col items-center justify-center">
          <div className="text-center mb-6 sm:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-800 mb-4 tracking-tight">
              {t.instructions.chooseGameMode}
            </h2>
            <div className="h-1.5 w-24 bg-primary mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 w-full max-w-6xl">
            {([
              { mode: 'two-player' as GameMode, emoji: '🎮', label: t.gameModes.twoPlayer, border: 'border-blue-500', desc: 'Défiez un ami en local sur le même écran.' },
              { mode: 'vs-ai' as GameMode, emoji: '🤖', label: t.gameModes.vsAI, border: 'border-purple-500', desc: "Affrontez l'intelligence artificielle." },
              { mode: 'online' as GameMode, emoji: '🌐', label: t.gameModes.online, border: 'border-green-500', desc: 'Rejoignez une partie avec un code unique.' },
            ] as const).map(({ mode, emoji, label, border, desc }) => (
              <Card
                key={mode}
                onClick={() => handleModeSelection(mode)}
                className={`group cursor-pointer rounded-2xl sm:rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-b-4 sm:border-b-8 ${border}`}
              >
                <CardContent className="p-5 sm:p-8 lg:p-10">
                  <div className="text-4xl sm:text-5xl mb-3 sm:mb-5 group-hover:scale-110 transition-transform duration-300">{emoji}</div>
                  <h3 className="text-lg sm:text-2xl font-bold text-slate-800 mb-1">{label}</h3>
                  <p className="text-slate-500 text-sm">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Écran configuration en ligne ──────────────────────────────────────────
  if (showOnlineSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center text-xl sm:text-2xl text-gray-700">
              {t.instructions.playOnline}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {waitingForOpponent ? (
              <div className="space-y-6 text-center">
                <p className="text-muted-foreground">Partagez ce code avec votre adversaire :</p>
                <div className="text-4xl sm:text-5xl font-bold text-green-600 tracking-widest py-4 bg-green-50 rounded-xl">
                  {roomId}
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">En attente de l'adversaire…</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    pollingCleanupRef.current?.();
                    pollingCleanupRef.current = null;
                    leaveRoom(roomId, 1);
                    setWaitingForOpponent(false);
                    setIsRoomHost(false);
                    setShowOnlineSetup(false);
                    setGameMode(null);
                  }}
                >
                  Annuler
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  onClick={handleCreateRoom}
                  className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
                >
                  {t.actions.createRoom}
                </Button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-muted-foreground text-sm">{t.actions.or}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-foreground">{t.actions.joinRoom}</label>
                  <Input
                    type="text"
                    value={inputRoomId}
                    onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                    placeholder={t.room.roomCodePlaceholder}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest uppercase h-12"
                  />
                  <Button
                    variant="outline"
                    onClick={handleJoinRoom}
                    className="w-full h-11"
                  >
                    {t.actions.join}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => { setShowOnlineSetup(false); setGameMode(null); }}
                  className="w-full"
                >
                  {t.actions.back}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Écran options de victoire ─────────────────────────────────────────────
  if (showOptionsScreen) {
    const isValid = victoryOptions.lines || victoryOptions.squares;
    const canModify = gameMode !== 'online' || isRoomHost;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg rounded-2xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center text-xl sm:text-2xl text-gray-700">
              {t.actions.victoryOptions}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {gameMode === 'online' && !isRoomHost && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-sm text-yellow-800 text-center">{t.room.hostOnlyOptions}</p>
              </div>
            )}
            <div className="space-y-4">
              {([
                { key: 'lines' as const, label: t.victory.linesLabel, desc: t.victory.linesDescription },
                { key: 'squares' as const, label: t.victory.squaresLabel, desc: t.victory.squaresDescription },
              ]).map(({ key, label, desc }) => (
                <label
                  key={key}
                  className={`flex items-start gap-4 p-5 border-2 rounded-xl transition-colors ${
                    canModify ? 'cursor-pointer hover:border-primary/50' : 'cursor-not-allowed opacity-60'
                  } ${victoryOptions[key] ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <input
                    type="checkbox"
                    checked={victoryOptions[key]}
                    onChange={(e) => canModify && setVictoryOptions({ ...victoryOptions, [key]: e.target.checked })}
                    disabled={!canModify}
                    className="mt-1 w-5 h-5 accent-primary rounded"
                  />
                  <div>
                    <div className="font-semibold text-foreground">{label}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{desc}</div>
                  </div>
                </label>
              ))}
            </div>
            {!isValid && (
              <p className="text-center text-destructive text-sm">{t.victory.selectAtLeastOne}</p>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => {
                  if (gameMode === 'online') {
                    pollingCleanupRef.current?.();
                    gameStartPollingCleanupRef.current?.();
                    gameStartPollingCleanupRef.current = null;
                    if (roomId) leaveRoom(roomId, isRoomHost ? 1 : 2);
                    setIsRoomHost(false);
                    setShowOptionsScreen(false);
                    setShowOnlineSetup(true);
                  } else {
                    setGameMode(null);
                    setShowOptionsScreen(false);
                  }
                }}
              >
                {t.actions.back}
              </Button>
              {canModify ? (
                <Button
                  className="flex-1 h-11"
                  onClick={handleStartGame}
                  disabled={!isValid}
                >
                  {t.actions.startGame}
                </Button>
              ) : (
                <div className="flex-1 h-11 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                  <span className="animate-pulse text-sm">{t.status.waitingForHost}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Plateau de jeu ────────────────────────────────────────────────────────
  const isMyTurn =
    gameState.gameMode !== 'online' ||
    !gameState.onlineRoom ||
    gameState.currentPlayer === gameState.onlineRoom.playerNumber;

  let actingPlayer: 1 | 2;
  if (gameState.currentPiece === null) {
    actingPlayer = (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 2)
      ? 2 : gameState.currentPlayer;
  } else {
    actingPlayer = gameState.currentPlayer;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-5xl mx-auto px-3 py-4 sm:px-6 sm:py-8 space-y-4">

        {/* Code de salle */}
        {gameState.gameMode === 'online' && gameState.onlineRoom && (
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {t.room.roomCode}{' '}
              <span className="font-bold text-green-600 tracking-widest">
                {gameState.onlineRoom.roomId}
              </span>
            </p>
          </div>
        )}

        {/* Statut */}
        <div className="text-center">
          {gameState.gameOver ? (
            <div className="space-y-3">
              {gameState.winner ? (
                <p className="text-2xl sm:text-3xl font-bold text-green-600">
                  {gameState.gameMode === 'vs-ai' && gameState.winner === 2
                    ? t.results.aiWon
                    : gameState.gameMode === 'vs-ai' && gameState.winner === 1
                    ? t.results.youWon
                    : gameState.gameMode === 'online' && gameState.onlineRoom &&
                      gameState.winner === gameState.onlineRoom.playerNumber
                    ? t.results.youWon
                    : gameState.gameMode === 'online'
                    ? t.results.opponentWon
                    : `${t.players.player} ${gameState.winner} ${t.results.playerWon}`}
                </p>
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-gray-600">{t.results.draw}</p>
              )}
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={handleReset}>
                  {t.actions.newGame}
                </Button>
                <Button variant="secondary" onClick={() => { setGameMode(null); setShowOptionsScreen(false); }}>
                  {t.actions.changeMode}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-lg sm:text-xl font-semibold text-gray-700">
                {getPlayerName(actingPlayer)}
              </p>
              <p className={`text-sm sm:text-base mt-0.5 ${isMyTurn ? 'text-gray-600' : 'text-gray-400 italic'}`}>
                {getInstructionMessage(actingPlayer, gameState.currentPiece !== null)}
              </p>
            </div>
          )}
        </div>

        {/* Plateau + pièces */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Plateau */}
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 text-center">Plateau</h2>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {normalizeBoard(gameState.board).flatMap((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const winning = gameState.winningPositions?.some(
                      (p: WinningPosition) => p.row === rowIndex && p.col === colIndex
                    ) ?? false;
                    const canPlace =
                      cell === null &&
                      gameState.currentPiece !== null &&
                      !gameState.gameOver &&
                      isMyTurn;

                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        onClick={() => handleBoardClick(rowIndex, colIndex)}
                        className={[
                          'aspect-square border-2 rounded-lg flex items-center justify-center transition-colors',
                          canPlace
                            ? 'border-amber-400 bg-amber-100 hover:bg-amber-200 cursor-pointer'
                            : 'border-gray-200 bg-amber-50',
                        ].join(' ')}
                      >
                        {cell !== null && (
                          <PieceComponent piece={cell} disabled highlighted={winning} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pièces disponibles */}
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 text-center">
                Pièces disponibles
              </h2>
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {generateAllPieces().map(piece => {
                  const available = gameState.availablePieces.includes(piece);
                  const isSelected = gameState.currentPiece === piece;
                  const canSelect =
                    available && !isSelected &&
                    gameState.currentPiece === null &&
                    !gameState.gameOver && isMyTurn &&
                    !(gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 2);

                  return (
                    <div key={piece} className="flex items-center justify-center py-1">
                      {available ? (
                        <PieceComponent
                          piece={piece}
                          onClick={canSelect ? () => handlePieceSelection(piece) : undefined}
                          selected={isSelected}
                          disabled={!canSelect && !isSelected}
                        />
                      ) : (
                        <div className="w-10 h-14 opacity-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Règles */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-2">{t.instructions.rulesTitle}</h3>
            <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
              <li>• {t.instructions.playerAChooses}</li>
              <li>• {t.instructions.playerBPlaces}</li>
              <li>• {t.instructions.playerBChooses}</li>
              <li>• {t.instructions.toWin}</li>
              {gameState.victoryOptions.lines && <li className="ml-3 text-primary">→ {t.victory.linesDetail}</li>}
              {gameState.victoryOptions.squares && <li className="ml-3 text-primary">→ {t.victory.squaresDetail}</li>}
            </ul>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

export default Game
