import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LoaderCircle, Pause, Play, SkipForward } from 'lucide-react';
import type { Move, VictoryOptions } from '../types';
import type { Decision, MoveAnalysis } from '../aiLogic';
import { cellName, checkVictory } from '../gameLogic';
import { useLanguage } from '../LanguageContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Board } from './Board';
import { Piece } from './Piece';
import { boardAt } from './replayMoves';
import { usePieceLabel, useSharedLabel } from './pieceText';
import { useGameAnalysis } from './useGameAnalysis';

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

const SYMBOL = { blunder: '??', mistake: '?' } as const;
const TONE = { blunder: 'text-destructive', mistake: 'text-warn' } as const;

/** Pire faute d'un coup (pièce donnée ou pose). */
const worst = (a: MoveAnalysis | undefined): Decision | null => {
  if (!a) return null;
  const all = [a.give, a.place].filter((d): d is Decision => d !== null);
  return all.find(d => d.severity === 'blunder') ?? all[0] ?? null;
};

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

  const analysis = useGameAnalysis(moves, victoryOptions, open);
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

  // Fautes du coup affiché, de chaque côté
  const here = analysis && step > 0 ? analysis[step - 1] : undefined;
  const notes: { by: 1 | 2; d: Decision; kind: 'give' | 'place' }[] = [];
  if (current && here?.give) notes.push({ by: current.givenBy, d: here.give, kind: 'give' });
  if (current && here?.place) notes.push({ by: current.givenBy === 1 ? 2 : 1, d: here.place, kind: 'place' });
  const betterCell = here?.place?.better.cell;

  const explain = ({ by, d, kind }: (typeof notes)[number]): string => {
    const who = nameOf(by);
    const piece = d.better.piece !== undefined ? pieceLabel(d.better.piece) : null;
    const cell = d.better.cell ? cellName(d.better.cell.row, d.better.cell.col) : null;
    const better = kind === 'give'
      ? (piece ? ` ${t.replay.betterGive(piece)}` : '')
      : (cell ? ` ${t.replay.betterPlace(cell)}` : '');
    return t.replay.reasons[d.reason](who) + better;
  };

  // Bilan par joueur : gaffes (??) et erreurs (?)
  const tally = { 1: { blunder: 0, mistake: 0 }, 2: { blunder: 0, mistake: 0 } };
  analysis?.forEach((a, k) => {
    const giver = moves[k].givenBy;
    if (a.give) tally[giver][a.give.severity]++;
    if (a.place) tally[giver === 1 ? 2 : 1][a.place.severity]++;
  });
  const faultSteps = analysis ? analysis.flatMap((a, k) => (a.give || a.place ? [k + 1] : [])) : [];
  const nextFault = faultSteps.find(s => s > step) ?? faultSteps[0];

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

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-muted px-3 py-2 text-[13px]">
          {analysis === null ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> {t.replay.analyzing}
            </span>
          ) : (
            <>
              {([1, 2] as const).map(p => (
                <span key={p} className="min-w-0">
                  <span className="font-semibold">{nameOf(p)}</span>{' '}
                  {tally[p].blunder + tally[p].mistake === 0 ? (
                    <span className="text-good">{t.replay.clean}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      {tally[p].blunder > 0 && <span className="font-mono font-semibold text-destructive">{tally[p].blunder} ??</span>}
                      {tally[p].blunder > 0 && tally[p].mistake > 0 && ' · '}
                      {tally[p].mistake > 0 && <span className="font-mono font-semibold text-warn">{tally[p].mistake} ?</span>}
                    </span>
                  )}
                </span>
              ))}
              {nextFault !== undefined && (
                <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 px-2" onClick={() => go(nextFault)}>
                  <SkipForward /> {t.replay.nextFault}
                </Button>
              )}
            </>
          )}
        </div>

        <div className="mx-auto w-full max-w-[340px]">
          <Board
            board={board}
            winningPositions={win}
            lastPlaced={current?.cell ?? null}
            hintPositions={betterCell ? [betterCell] : undefined}
          />
        </div>

        <div className="min-h-[2.6em] space-y-1.5 text-center text-[13px]" aria-live="polite">
          <p className="text-muted-foreground">{caption}</p>
          {notes.map(n => (
            <p key={n.kind} className={`rounded-md px-2 py-1 text-left font-medium ${n.d.severity === 'blunder' ? 'bg-destructive/10' : 'bg-warn/10'}`}>
              <span className={`mr-1.5 font-mono font-bold ${TONE[n.d.severity]}`}>{SYMBOL[n.d.severity]}</span>
              {explain(n)}
            </p>
          ))}
        </div>

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
                className={`grid w-full grid-cols-[1.3rem_1rem_1fr_auto] items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors ${
                  step === i + 1 ? 'bg-primary/15 text-primary' : 'hover:bg-muted'
                }`}
              >
                <span className="font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                <Piece piece={m.piece} className="w-[15px]" />
                <span className="font-mono font-semibold">{m.cell ? cellName(m.cell.row, m.cell.col) : '…'}</span>
                {(() => {
                  const d = worst(analysis?.[i]);
                  return d ? <span className={`font-mono text-xs font-bold ${TONE[d.severity]}`}>{SYMBOL[d.severity]}</span> : null;
                })()}
              </button>
            </li>
          ))}
        </ol>
        {analysis && <p className="text-[11px] text-muted-foreground">{t.replay.legend}</p>}
      </DialogContent>
    </Dialog>
  );
}
