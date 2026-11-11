import type { Board, Piece, VictoryOptions } from './types';
import { BOARD_SIZE } from './types';

// Debug flag for AI logging — ne jamais committer à true
const DEBUG_AI = false;

export type AILevel = 'easy' | 'normal' | 'expert';

/*
 * Représentation interne : plateau à plat (16 cases, -1 = vide) pour aller vite
 * dans la recherche. Les lignes gagnantes sont précalculées selon les règles.
 */

type Flat = number[];

const LINES: number[][] = (() => {
  const l: number[][] = [];
  for (let r = 0; r < 4; r++) l.push([0, 1, 2, 3].map(c => r * 4 + c));
  for (let c = 0; c < 4; c++) l.push([0, 1, 2, 3].map(r => r * 4 + c));
  l.push([0, 5, 10, 15], [3, 6, 9, 12]);
  return l;
})();

const SQUARES: number[][] = (() => {
  const s: number[][] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    s.push([r * 4 + c, r * 4 + c + 1, (r + 1) * 4 + c, (r + 1) * 4 + c + 1]);
  }
  return s;
})();

// Pour chaque case, les groupes gagnants qui la contiennent
const groupsByCell = (opts: VictoryOptions): number[][][] => {
  const groups = [...(opts.lines ? LINES : []), ...(opts.squares ? SQUARES : [])];
  return Array.from({ length: 16 }, (_, i) => groups.filter(g => g.includes(i)));
};

const toFlat = (board: Board): Flat => board.flat().map(c => (c === null ? -1 : c));

/** Vrai si poser une pièce en `cell` (déjà posée dans `b`) complète un groupe gagnant. */
const winsAt = (b: Flat, cell: number, groups: number[][][]): boolean => {
  for (const g of groups[cell]) {
    const a = b[g[0]], c = b[g[1]], d = b[g[2]], e = b[g[3]];
    if (a < 0 || c < 0 || d < 0 || e < 0) continue;
    if ((a & c & d & e) !== 0 || (~a & ~c & ~d & ~e & 15) !== 0) return true;
  }
  return false;
};

const emptyCells = (b: Flat): number[] => b.reduce<number[]>((acc, v, i) => (v < 0 ? (acc.push(i), acc) : acc), []);

const winningCellsFlat = (b: Flat, piece: number, groups: number[][][]): number[] => {
  const res: number[] = [];
  for (const i of emptyCells(b)) {
    b[i] = piece;
    if (winsAt(b, i, groups)) res.push(i);
    b[i] = -1;
  }
  return res;
};

const isSafe = (b: Flat, piece: number, groups: number[][][]) => winningCellsFlat(b, piece, groups).length === 0;

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const toPos = (i: number) => ({ row: Math.floor(i / BOARD_SIZE), col: i % BOARD_SIZE });

// =============================================================================
// Recherche exacte (niveau Expert, fin de partie)
// =============================================================================

/** Au-delà de ce nombre de cases vides, la recherche exacte est trop coûteuse. */
const SEARCH_MAX_EMPTY = 7;
const NODE_BUDGET = 600_000;

class BudgetExceeded extends Error {}

/**
 * Valeur (+1 gagne, 0 nul, -1 perd) pour le joueur qui doit poser `piece`,
 * en jouant parfaitement des deux côtés. Négamax avec coupure dès qu'une victoire est trouvée.
 */
const solvePlace = (b: Flat, piece: number, reserve: number[], groups: number[][][], counter: { n: number }): number => {
  if (++counter.n > NODE_BUDGET) throw new BudgetExceeded();
  const empties = emptyCells(b);
  // Victoire immédiate ?
  for (const i of empties) {
    b[i] = piece;
    const w = winsAt(b, i, groups);
    b[i] = -1;
    if (w) return 1;
  }
  if (empties.length === 1 || reserve.length === 0) return 0;

  let best = -1;
  for (const i of empties) {
    b[i] = piece;
    const v = solveChoose(b, reserve, groups, counter);
    b[i] = -1;
    if (v > best) best = v;
    if (best === 1) break;
  }
  return best;
};

/** Valeur pour le joueur qui doit choisir la pièce de l'adversaire. */
const solveChoose = (b: Flat, reserve: number[], groups: number[][][], counter: { n: number }): number => {
  let best = -1;
  for (let k = 0; k < reserve.length; k++) {
    const q = reserve[k];
    // Une pièce qui donne la victoire immédiate vaut -1 : inutile d'explorer
    if (!isSafe(b, q, groups)) continue;
    const rest = reserve.slice(0, k).concat(reserve.slice(k + 1));
    const v = -solvePlace(b, q, rest, groups, counter);
    if (v > best) best = v;
    if (best === 1) break;
  }
  return best;
};

// =============================================================================
// Heuristique (milieu de partie)
// =============================================================================

/** Nombre de pièces sûres à donner après avoir posé `piece` en `cell`. */
const safeCountAfter = (b: Flat, cell: number, piece: number, reserve: number[], groups: number[][][]): number => {
  b[cell] = piece;
  const n = reserve.filter(q => isSafe(b, q, groups)).length;
  b[cell] = -1;
  return n;
};

const heuristicPlace = (b: Flat, piece: number, reserve: number[], groups: number[][][]): number => {
  const empties = emptyCells(b);
  let best: number[] = [];
  let bestScore = -Infinity;
  for (const i of empties) {
    const safe = safeCountAfter(b, i, piece, reserve, groups);
    // Un coup qui ne laisse aucune pièce sûre est un suicide ; sinon on préfère garder des options
    const score = safe === 0 && reserve.length > 0 ? -1000 : safe;
    if (score > bestScore) { bestScore = score; best = [i]; }
    else if (score === bestScore) best.push(i);
  }
  return rand(best);
};

// =============================================================================
// API publique
// =============================================================================

/** Choisit la case où poser `pieceToPlace`. `availablePieces` = réserve hors pièce en main. */
export const aiChoosePosition = (
  board: Board,
  pieceToPlace: Piece,
  availablePieces: Piece[],
  victoryOptions: VictoryOptions,
  level: AILevel = 'normal'
): { row: number; col: number } => {
  const b = toFlat(board);
  const groups = groupsByCell(victoryOptions);
  const empties = emptyCells(b);
  const reserve = availablePieces.filter(p => p !== pieceToPlace);

  if (level === 'easy') {
    // Saisit la victoire une fois sur deux seulement
    const wins = winningCellsFlat(b, pieceToPlace, groups);
    return toPos(wins.length && Math.random() < 0.5 ? wins[0] : rand(empties));
  }

  const wins = winningCellsFlat(b, pieceToPlace, groups);
  if (wins.length) return toPos(wins[0]);

  if (level === 'expert' && empties.length <= SEARCH_MAX_EMPTY) {
    try {
      const counter = { n: 0 };
      let best: number[] = [];
      let bestValue = -2;
      for (const i of empties) {
        b[i] = pieceToPlace;
        const v = empties.length === 1 ? 0 : solveChoose(b, reserve, groups, counter);
        b[i] = -1;
        if (v > bestValue) { bestValue = v; best = [i]; }
        else if (v === bestValue) best.push(i);
      }
      if (DEBUG_AI) console.log(`[IA] recherche place: valeur ${bestValue}, ${counter.n} nœuds`);
      return toPos(rand(best));
    } catch (e) {
      if (!(e instanceof BudgetExceeded)) throw e;
      if (DEBUG_AI) console.log('[IA] budget dépassé, heuristique');
    }
  }

  return toPos(heuristicPlace(b, pieceToPlace, reserve, groups));
};

/** Choisit la pièce à donner à l'adversaire parmi `availablePieces`. */
export const aiChoosePiece = (
  board: Board,
  availablePieces: Piece[],
  victoryOptions: VictoryOptions,
  level: AILevel = 'normal'
): Piece => {
  const b = toFlat(board);
  const groups = groupsByCell(victoryOptions);

  if (level === 'easy') return rand(availablePieces);

  const safe = availablePieces.filter(p => isSafe(b, p, groups));
  if (safe.length === 0) return rand(availablePieces);

  // Niveau normal : se trompe de temps en temps pour rester battable
  if (level === 'normal') return Math.random() < 0.15 ? rand(availablePieces) : rand(safe);

  if (emptyCells(b).length <= SEARCH_MAX_EMPTY) {
    try {
      const counter = { n: 0 };
      let best: Piece[] = [];
      let bestValue = -2;
      for (const q of safe) {
        const rest = availablePieces.filter(p => p !== q);
        const v = -solvePlace(b, q, rest, groups, counter);
        if (v > bestValue) { bestValue = v; best = [q]; }
        else if (v === bestValue) best.push(q);
      }
      if (DEBUG_AI) console.log(`[IA] recherche pièce: valeur ${bestValue}, ${counter.n} nœuds`);
      return rand(best);
    } catch (e) {
      if (!(e instanceof BudgetExceeded)) throw e;
    }
  }

  // Milieu de partie : donner la pièce qui laisse le moins de bons coups à l'adversaire
  let best: Piece[] = [];
  let bestScore = Infinity;
  for (const q of safe) {
    const rest = availablePieces.filter(p => p !== q);
    // Pour chaque case où il pourrait poser q, combien de pièces sûres pourrait-il me donner ?
    const options = emptyCells(b).map(i => safeCountAfter(b, i, q, rest, groups));
    const score = Math.max(...options);
    if (score < bestScore) { bestScore = score; best = [q]; }
    else if (score === bestScore) best.push(q);
  }
  return rand(best);
};
