import { useEffect, useMemo, useState } from 'react';
import { Link2, Play, Users } from 'lucide-react';
import type { Board as BoardValue, GameMode, Piece as PieceValue, WinningPosition } from './types';
import { cellName, checkVictory, getWinningCells, placePiece } from './gameLogic';
import { getLastGames, getLeaderboard } from './firebaseConfig';
import { useLanguage } from './LanguageContext';
import { Button } from './components/ui/button';
import { Skeleton } from './components/ui/skeleton';
import { Board } from './game/Board';
import { Piece } from './game/Piece';
import { getDailyPuzzle } from './game/puzzle';
import { usePieceLabel, useSharedLabel } from './game/pieceText';
import type { GameRecord } from './ProfileParts';

interface HomeProps {
  user: { id: string; username: string } | null;
  onSelectMode: (mode: GameMode) => void;
  onViewStats: () => void;
  onViewProfile: () => void;
  onViewUser: (id: string) => void;
}

interface LeaderRow { id: string; username: string; wins: number }

// Position décorative du plateau d'accueil (aucune ligne gagnante)
const HERO_BOARD: BoardValue = [
  [6, null, 13, null],
  [null, 4, 9, 2],
  [1, null, null, null],
  [11, null, null, 7],
];

const card = 'flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-5';
const tag = 'rounded-full border border-border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.07em] text-muted-foreground';

function PuzzleCard() {
  const { t } = useLanguage();
  const pieceLabel = usePieceLabel();
  const sharedLabel = useSharedLabel();
  const puzzle = useMemo(() => getDailyPuzzle(), []);
  const [picked, setPicked] = useState<PieceValue | null>(null);

  const rules = { lines: true, squares: false };
  let board = puzzle.board;
  let win: WinningPosition[] | undefined;
  let message = t.home.puzzleIdle;
  let solved = false;
  if (picked !== null) {
    const cells = getWinningCells(puzzle.board, picked, rules);
    if (cells.length === 0) {
      solved = true;
      message = t.home.puzzleSolved;
    } else {
      board = placePiece(puzzle.board, cells[0].row, cells[0].col, picked);
      win = checkVictory(board, rules) ?? undefined;
      message = t.home.puzzleFailed(cellName(cells[0].row, cells[0].col), sharedLabel(board, win));
    }
  }

  return (
    <article className={card}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold tracking-tight">{t.home.puzzleTitle}</h2>
        <span className={tag}>{t.home.puzzleNumber(puzzle.number)}</span>
      </div>
      <p className="text-xs text-muted-foreground">{t.home.puzzlePrompt}</p>
      <div className="mx-auto w-full max-w-[250px]">
        <Board board={board} winningPositions={win} showCoords={false} />
      </div>
      <div className="flex justify-center gap-2">
        {puzzle.options.map(p => {
          const state = picked === p ? (solved ? 'border-good bg-good/15' : 'border-destructive bg-destructive/15') : 'border-transparent bg-muted';
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPicked(p)}
              disabled={solved}
              aria-label={t.game.givePiece(pieceLabel(p))}
              title={pieceLabel(p)}
              className={`grid aspect-[3/4] w-14 place-items-end justify-center rounded-lg border pb-1.5 transition-[transform,border-color] enabled:hover:-translate-y-0.5 enabled:hover:border-primary ${state}`}
            >
              <Piece piece={p} className="w-[72%]" />
            </button>
          );
        })}
      </div>
      <p className="min-h-[3em] text-center text-[13px] text-muted-foreground" aria-live="polite">{message}</p>
    </article>
  );
}

function LeaderboardCard({ user, onViewStats, onViewUser }: Pick<HomeProps, 'user' | 'onViewStats' | 'onViewUser'>) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getLeaderboard()
      .then(data => setRows((data as LeaderRow[]).slice(0, 5)))
      .catch(() => setFailed(true));
  }, []);

  return (
    <article className={card}>
      <h2 className="font-display text-xl font-bold tracking-tight">{t.home.leaderboardTitle}</h2>
      {failed ? (
        <p className="text-sm text-muted-foreground">{t.stats.loadError}</p>
      ) : rows === null ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.home.empty}</p>
      ) : (
        <ol className="flex flex-col">
          {rows.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onViewUser(r.id)}
                className={`grid w-full grid-cols-[1.6rem_1fr_auto] items-center gap-2.5 border-b border-border py-2 text-left text-sm last:border-0 hover:text-primary ${
                  user?.id === r.id ? 'font-semibold text-primary' : ''
                }`}
              >
                <span className="font-mono text-[13px] text-muted-foreground">{i + 1}</span>
                <span className="truncate">{r.username}</span>
                <span className="font-mono font-semibold tabular-nums">{t.home.wins(r.wins)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <Button variant="outline" className="mt-auto h-9" onClick={onViewStats}>{t.home.seeLeaderboard}</Button>
    </article>
  );
}

function RecentGamesCard({ user, onViewProfile }: Pick<HomeProps, 'user' | 'onViewProfile'>) {
  const { t, language } = useLanguage();
  const [games, setGames] = useState<GameRecord[] | null>(null);

  useEffect(() => {
    if (!user) return;
    getLastGames(user.id)
      .then(g => setGames((g as GameRecord[]).slice(0, 4)))
      .catch(() => setGames([]));
  }, [user]);

  const chip = {
    win: ['bg-good/15 text-good', t.profile.win],
    loss: ['bg-destructive/15 text-destructive', t.profile.loss],
    draw: ['bg-muted text-muted-foreground', t.profile.draw],
  } as const;

  return (
    <article className={card}>
      <h2 className="font-display text-xl font-bold tracking-tight">{t.home.yourGamesTitle}</h2>
      {!user ? (
        <>
          <p className="text-sm text-muted-foreground">{t.home.signInForHistory}</p>
          <Button className="mt-auto h-9" onClick={() => { window.location.href = '/api/auth/login'; }}>{t.header.login}</Button>
        </>
      ) : games === null ? (
        <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : games.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.home.noGamesYet}</p>
      ) : (
        <ul className="flex flex-col">
          {games.map(g => {
            const [cls, text] = chip[g.result] ?? chip.draw;
            return (
              <li key={g.id} className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(g.date).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${cls}`}>{text}</span>
              </li>
            );
          })}
        </ul>
      )}
      {user && <Button variant="outline" className="mt-auto h-9" onClick={onViewProfile}>{t.home.seeProfile}</Button>}
    </article>
  );
}

/** Page d'accueil : accroche, accès rapide aux modes, puzzle du jour, classement et parties récentes. */
function Home({ user, onSelectMode, onViewStats, onViewProfile, onViewUser }: HomeProps) {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <section className="grid items-center gap-8 pb-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-primary">{t.home.eyebrow}</p>
          <h1 className="mb-5 mt-3 font-display text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-balance">
            {t.home.titleStart} <span className="text-primary">{t.home.titleAccent}</span> {t.home.titleEnd}
          </h1>
          <p className="mb-7 max-w-[46ch] text-[17px] text-muted-foreground">{t.home.lead}</p>
          <div className="flex flex-wrap gap-2.5">
            <Button onClick={() => onSelectMode('vs-ai')} className="h-12 gap-2 px-5 text-base">
              <Play className="fill-current" /> {t.home.playAI}
            </Button>
            <Button variant="outline" onClick={() => onSelectMode('online')} className="h-12 gap-2 px-5 text-base">
              <Link2 /> {t.home.inviteFriend}
            </Button>
            <Button variant="ghost" onClick={() => onSelectMode('two-player')} className="h-12 gap-2 px-4 text-base">
              <Users /> {t.home.playLocal}
            </Button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[380px] lg:max-w-[470px]">
          <Board board={HERO_BOARD} showCoords={false} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <PuzzleCard />
        <LeaderboardCard user={user} onViewStats={onViewStats} onViewUser={onViewUser} />
        <RecentGamesCard user={user} onViewProfile={onViewProfile} />
      </div>
    </div>
  );
}

export default Home;
