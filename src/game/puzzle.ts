import type { Board, Piece, VictoryOptions } from '../types';
import { BOARD_SIZE } from '../types';
import { checkVictory, initializeBoard, isRiskyPiece } from '../gameLogic';

export interface DailyPuzzle {
  number: number;
  board: Board;
  /** Trois pièces proposées : une seule est sûre */
  options: Piece[];
}

const RULES: VictoryOptions = { lines: true, squares: false };
// Numérotation à partir du lancement du puzzle quotidien
const EPOCH = Date.UTC(2026, 0, 1);

// Générateur pseudo-aléatoire déterministe (mulberry32) : même puzzle pour tous le même jour
const seeded = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};

const shuffle = <T,>(arr: T[], rnd: () => number): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Puzzle du jour : « quelle pièce donner sans perdre ? », identique pour tous les joueurs un jour donné. */
export const getDailyPuzzle = (date = new Date()): DailyPuzzle => {
  const day = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - EPOCH) / 86_400_000);
  const rnd = seeded(day * 7919 + 17);

  for (let attempt = 0; attempt < 500; attempt++) {
    const board = initializeBoard();
    const pieces = shuffle(Array.from({ length: 16 }, (_, i) => i), rnd);
    const cells = shuffle(Array.from({ length: 16 }, (_, i) => i), rnd);
    const count = 6 + Math.floor(rnd() * 4);
    let valid = true;
    for (let k = 0; k < count; k++) {
      board[Math.floor(cells[k] / BOARD_SIZE)][cells[k] % BOARD_SIZE] = pieces[k];
      if (checkVictory(board, RULES)) { valid = false; break; }
    }
    if (!valid) continue;

    const reserve = pieces.slice(count);
    const risky = reserve.filter(p => isRiskyPiece(board, p, RULES));
    const safe = reserve.filter(p => !risky.includes(p));
    if (risky.length < 2 || safe.length < 1) continue;

    return { number: day + 1, board, options: shuffle([safe[0], risky[0], risky[1]], rnd) };
  }

  // Repli (statistiquement improbable) : puzzle fixe
  const board = initializeBoard();
  board[0][0] = 4; board[0][1] = 6; board[0][2] = 12; board[2][1] = 3; board[3][3] = 10;
  return { number: day + 1, board, options: [2, 1, 5] };
};
