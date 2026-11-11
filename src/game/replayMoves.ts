import type { Board, Move } from '../types';
import { initializeBoard } from '../gameLogic';

/**
 * Décode la forme compacte enregistrée par le serveur (cf. encodeMoves dans api/services/gameValidator.ts) :
 * « 1:3a5f0- » = premier donneur, puis pour chaque coup la pièce et la case en hexadécimal, « - » = non posée.
 */
export const decodeMoves = (encoded: unknown): Move[] | null => {
  if (typeof encoded !== 'string') return null;
  const match = /^([12]):((?:[0-9a-f][0-9a-f-])*)$/.exec(encoded);
  if (!match || !match[2]) return null;
  let giver = Number(match[1]) as 1 | 2;
  const moves: Move[] = [];
  for (let i = 0; i < match[2].length; i += 2) {
    const piece = parseInt(match[2][i], 16);
    const c = match[2][i + 1];
    const cell = c === '-' ? null : { row: Math.floor(parseInt(c, 16) / 4), col: parseInt(c, 16) % 4 };
    moves.push({ piece, givenBy: giver, cell });
    giver = giver === 1 ? 2 : 1;
  }
  return moves;
};

/** Plateau après les `step` premiers coups. */
export const boardAt = (moves: Move[], step: number): Board => {
  const board = initializeBoard();
  for (const m of moves.slice(0, step)) {
    if (m.cell) board[m.cell.row][m.cell.col] = m.piece;
  }
  return board;
};
