import type { Piece as PieceValue } from '../types';
import { isDark, isRound, isTall, isHollow } from '../types';

/**
 * Dégradés partagés par toutes les pièces (érable / noyer).
 * À monter une seule fois dans l'arbre (voir App.tsx).
 */
export function PieceDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <linearGradient id="q-grad-light" x1="0" x2="1">
          <stop offset="0" stopColor="#C08D52" />
          <stop offset=".38" stopColor="#F2D7A6" />
          <stop offset=".7" stopColor="#DDB27A" />
          <stop offset="1" stopColor="#B58049" />
        </linearGradient>
        <linearGradient id="q-grad-dark" x1="0" x2="1">
          <stop offset="0" stopColor="#36200F" />
          <stop offset=".38" stopColor="#7B4F31" />
          <stop offset=".7" stopColor="#5C3922" />
          <stop offset="1" stopColor="#321C0E" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface PieceProps {
  piece: PieceValue;
  className?: string;
}

/** Pièce de Quarto dessinée en pseudo-3D : cylindre (ronde) ou prisme (carrée). */
export function Piece({ piece, className = '' }: PieceProps) {
  const dark = isDark(piece);
  const round = isRound(piece);
  const tall = isTall(piece);
  const hollow = isHollow(piece);

  const base = 80;
  const top = base - (tall ? 56 : 30);
  const topColor = dark ? '#8A5C3C' : '#F6E0B6';
  const holeColor = dark ? '#24140A' : '#93652F';

  return (
    <svg className={`block overflow-visible ${className}`} viewBox="0 10 60 84" aria-hidden="true">
      <ellipse cx="30" cy={base + 5} rx="22" ry="5.5" fill="rgba(0,0,0,.16)" />
      {round ? (
        <>
          <path d={`M10 ${top} V${base} A20 7 0 0 0 50 ${base} V${top} Z`} fill={`url(#${dark ? 'q-grad-dark' : 'q-grad-light'})`} />
          <ellipse cx="30" cy={top} rx="20" ry="7" fill={topColor} />
          {hollow && <ellipse cx="30" cy={top} rx="9.5" ry="3.4" fill={holeColor} />}
        </>
      ) : (
        <>
          <path d={`M10 ${top} L30 ${top + 8} V${base + 8} L10 ${base} Z`} fill={dark ? '#6E4529' : '#E6C088'} />
          <path d={`M30 ${top + 8} L50 ${top} V${base} L30 ${base + 8} Z`} fill={dark ? '#44281A' : '#BF8E55'} />
          <path d={`M30 ${top - 8} L50 ${top} L30 ${top + 8} L10 ${top} Z`} fill={topColor} />
          {hollow && <path d={`M30 ${top - 3.8} L40 ${top} L30 ${top + 3.8} L20 ${top} Z`} fill={holeColor} />}
        </>
      )}
    </svg>
  );
}
