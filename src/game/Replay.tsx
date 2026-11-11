import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Pause, Play } from 'lucide-react';
import type { Move, VictoryOptions } from '../types';
import { cellName, checkVictory } from '../gameLogic';
import { useLanguage } from '../LanguageContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Board } from './Board';
import { Piece } from './Piece';
import { boardAt } from './replayMoves';
import { usePieceLabel, useSharedLabel } from './pieceText';

interface ReplayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moves: Move[];
  victoryOptions: VictoryOptions;
  /** Nom affiché pour chaque joueur */
  nameOf: (p: 1 | 2) => string;
  /** Ligne sous le titre (adversaire, niveau, date…) */
  subtitle?: string;
}

const AUTOPLAY_MS = 1100;

/** Revoir une partie coup par coup : plateau, curseur, lecture automatique, liste des coups. */
export function Replay({ open, onOpenChange, moves, victoryOptions, nameOf, subtitle }: ReplayProps) {
  const { t } = useLanguage();
  const pieceLabel = usePieceLabel();
  const sharedLabel = useSharedLabel();
  const total = moves.length;
  const [step, setStep] = useState(total);
  const [playing, setPlaying] = useState(false);

  // À chaque ouverture : on part de la position finale
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setStep(total); setPlaying(false); }
  }

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStep(s => {
        if (s >= total) { setPlaying(false); return s; }
        return s + 1;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [playing, total]);

  const board = useMemo(() => boardAt(moves, step), [moves, step]);
  const win = step === total ? checkVictory(board, victoryOptions) ?? undefined : undefined;
  const current = step > 0 ? moves[step - 1] : null;

  let caption = t.replay.start;
  if (current) {
    const giver = nameOf(current.givenBy);
    const placer = nameOf(current.givenBy === 1 ? 2 : 1);
    caption = current.cell
      ? t.replay.moveCaption(giver, pieceLabel(current.piece), placer, cellName(current.cell.row, current.cell.col))
      : t.replay.timeoutCaption(giver, pieceLabel(current.piece), placer);
  }
  if (step === total && total > 0) {
    caption += ' ' + (win ? t.replay.endWin(sharedLabel(board, win)) : current?.cell ? t.replay.endDraw : '');
  }

  const go = (s: number) => { setPlaying(false); setStep(Math.max(0, Math.min(total, s))); };
  const togglePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (step >= total) setStep(0);
    setPlaying(true);
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) setPlaying(false); onOpenChange(o); }}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] gap-3 overflow-y-auto bg-card p-5 sm:max-w-[34rem]"
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); go(step - 1); }
          if (e.key === 'ArrowRight') { e.preventDefault(); go(step + 1); }
          if (e.key === 'Home') { e.preventDefault(); go(0); }
          if (e.key === 'End') { e.preventDefault(); go(total); }
        }}
      >
        <DialogHeader className="gap-1 pr-8">
          <DialogTitle className="font-display text-xl font-bold tracking-tight">{t.replay.title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        <div className="mx-auto w-full max-w-[340px]">
          <Board board={board} winningPositions={win} lastPlaced={current?.cell ?? null} />
        </div>

        <p className="min-h-[2.6em] text-center text-[13px] text-muted-foreground" aria-live="polite">{caption}</p>

        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{step}/{total}</span>
          <input
            type="range"
            min={0}
            max={total}
            value={step}
            onChange={e => go(Number(e.target.value))}
            aria-label={t.replay.position}
            className="h-1.5 flex-1 cursor-pointer accent-[var(--primary)]"
          />
        </div>

        <div className="flex justify-center gap-1.5">
          <Button variant="outline" size="icon-lg" onClick={() => go(0)} disabled={step === 0} aria-label={t.replay.first}><ChevronsLeft /></Button>
          <Button variant="outline" size="icon-lg" onClick={() => go(step - 1)} disabled={step === 0} aria-label={t.replay.previous}><ChevronLeft /></Button>
          <Button onClick={togglePlay} className="h-9 w-28 gap-1.5" aria-label={playing ? t.replay.pause : t.replay.play}>
            {playing ? <Pause /> : <Play className="fill-current" />} {playing ? t.replay.pause : t.replay.play}
          </Button>
          <Button variant="outline" size="icon-lg" onClick={() => go(step + 1)} disabled={step === total} aria-label={t.replay.next}><ChevronRight /></Button>
          <Button variant="outline" size="icon-lg" onClick={() => go(total)} disabled={step === total} aria-label={t.replay.last}><ChevronsRight /></Button>
        </div>

        <ol className="grid max-h-36 grid-cols-2 gap-0.5 overflow-y-auto text-[13px] sm:grid-cols-3">
          {moves.map((m, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => go(i + 1)}
                aria-current={step === i + 1 ? 'step' : undefined}
                className={`grid w-full grid-cols-[1.3rem_1rem_1fr] items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors ${
                  step === i + 1 ? 'bg-primary/15 text-primary' : 'hover:bg-muted'
                }`}
              >
                <span className="font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                <Piece piece={m.piece} className="w-[15px]" />
                <span className="font-mono font-semibold">{m.cell ? cellName(m.cell.row, m.cell.col) : '…'}</span>
              </button>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
