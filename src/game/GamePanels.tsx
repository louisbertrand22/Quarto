import type { ReactNode } from 'react';
import { Bot } from 'lucide-react';
import type { Move, Piece as PieceValue } from '../types';
import { generateAllPieces } from '../types';
import { cellName } from '../gameLogic';
import { useLanguage } from '../LanguageContext';
import { Piece } from './Piece';
import { usePieceLabel } from './pieceText';

/* Blocs d'interface de la page de partie (barres joueurs, phase, réserve, coups, réglages). */

export function Block({ title, aside, children, className = '' }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
      {title && (
        <h2 className="mb-2.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
          {aside}
        </h2>
      )}
      {children}
    </section>
  );
}

const formatClock = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

interface PlayerBarProps {
  name: string;
  sub: string;
  isAI?: boolean;
  active: boolean;
  /** Pièce que ce joueur doit poser, s'il en a une */
  hand: PieceValue | null;
  /** Secondes restantes ; null = pas de pendule */
  clock: number | null;
  clockRunning: boolean;
}

export function PlayerBar({ name, sub, isAI, active, hand, clock, clockRunning }: PlayerBarProps) {
  const { t } = useLanguage();
  const label = usePieceLabel();
  return (
    <div className={`flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors ${active ? 'bg-card ring-1 ring-border' : ''}`}>
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">
        {isAI ? <Bot className="size-5" aria-hidden="true" /> : name.charAt(0).toUpperCase()}
      </div>
      <div className="mr-auto min-w-0">
        <div className="truncate font-semibold leading-tight">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      {hand !== null && (
        <>
          <div className="hidden text-right text-[11px] leading-tight text-muted-foreground sm:block">{t.game.pieceInHand}</div>
          <div className="grid h-12 w-10 shrink-0 place-items-end justify-center rounded-lg bg-muted pb-1" title={label(hand)}>
            <Piece key={hand} piece={hand} className="q-pop w-7" />
          </div>
        </>
      )}
      {clock !== null && (
        <div
          className={`min-w-[4.5rem] rounded-lg px-2.5 py-1 text-center font-mono text-lg font-semibold tabular-nums sm:text-xl ${
            clockRunning
              ? clock < 60 ? 'bg-destructive text-white' : 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground'
          }`}
          aria-label={formatClock(clock)}
        >
          {formatClock(clock)}
        </div>
      )}
    </div>
  );
}

export function PhaseBlock({ title, sub, state }: { title: string; sub: string; state: 'act' | 'wait' | 'over' }) {
  const dot = state === 'over'
    ? 'bg-good'
    : state === 'wait'
      ? 'bg-muted-foreground animate-pulse'
      : 'bg-primary ring-4 ring-primary/15';
  return (
    <Block>
      <div className="flex items-start gap-3" aria-live="polite">
        <span className={`mt-2.5 size-2.5 shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0">
          <p className="font-display text-xl font-bold leading-snug tracking-tight text-balance">{title}</p>
          {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </Block>
  );
}

interface ReserveProps {
  available: PieceValue[];
  inHand: PieceValue | null;
  canChoose: boolean;
  risky: PieceValue[];
  onChoose: (p: PieceValue) => void;
}

export function Reserve({ available, inHand, canChoose, risky, onChoose }: ReserveProps) {
  const { t } = useLanguage();
  const label = usePieceLabel();
  const remaining = available.filter(p => p !== inHand);
  return (
    <Block title={t.game.reserve} aside={<span className="font-mono tabular-nums">{remaining.length}/16</span>}>
      <div className="grid grid-cols-8 gap-1 sm:gap-1.5">
        {generateAllPieces().map(p => {
          if (!remaining.includes(p)) {
            return <div key={p} className="aspect-[3/4] rounded-lg border border-dashed border-border" />;
          }
          const isRisky = risky.includes(p);
          return (
            <button
              key={p}
              type="button"
              disabled={!canChoose}
              onClick={() => onChoose(p)}
              title={label(p)}
              aria-label={`${t.game.givePiece(label(p))}${isRisky ? ` (${t.game.risky})` : ''}`}
              className={`relative grid aspect-[3/4] place-items-end justify-center rounded-lg border border-transparent pb-[8%] transition-[transform,border-color] ${
                isRisky ? 'bg-destructive/15' : 'bg-muted'
              } ${canChoose ? 'cursor-pointer hover:-translate-y-0.5 hover:border-primary' : 'cursor-default'}`}
            >
              <Piece piece={p} className="w-[72%]" />
              {isRisky && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-destructive" />}
            </button>
          );
        })}
      </div>
    </Block>
  );
}

export function MoveList({ moves, nameOf }: { moves: Move[]; nameOf: (p: 1 | 2) => string }) {
  const { t } = useLanguage();
  return (
    <Block title={t.game.moves}>
      {moves.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.game.noMoves}</p>
      ) : (
        <ol
          className="flex max-h-48 flex-col gap-0.5 overflow-y-auto text-[13px]"
          ref={el => { if (el) el.scrollTop = el.scrollHeight; }}
        >
          {moves.map((m, i) => (
            <li key={i} className="grid grid-cols-[1.4rem_1.2rem_1fr_auto] items-center gap-2 rounded-md px-1.5 py-1 odd:bg-muted">
              <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
              <Piece piece={m.piece} className="w-[18px]" />
              <span className="truncate">{nameOf(m.givenBy)} → {nameOf(m.givenBy === 1 ? 2 : 1)}</span>
              <span className="font-mono font-semibold">{m.cell ? cellName(m.cell.row, m.cell.col) : '…'}</span>
            </li>
          ))}
        </ol>
      )}
    </Block>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-muted p-0.5" role="group" aria-label={label}>
      {options.map(o => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors ${
            o.value === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ id, label, description, checked, onChange, disabled }: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} className={`flex items-center justify-between gap-3 text-sm ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <span>
        {label}
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
      <input
        id={id}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className="relative h-[21px] w-9 shrink-0 rounded-full bg-border transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring after:absolute after:left-[3px] after:top-[3px] after:size-[15px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-[15px]"
      />
    </label>
  );
}
