import type { Board, Move, Piece, VictoryOptions } from './types';
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

/** Nœuds explorés et plafond de la recherche. */
interface Counter { n: number; max: number }

/**
 * Valeur (+1 gagne, 0 nul, -1 perd) pour le joueur qui doit poser `piece`,
 * en jouant parfaitement des deux côtés. Négamax avec coupure dès qu'une victoire est trouvée.
 */
const solvePlace = (b: Flat, piece: number, reserve: number[], groups: number[][][], counter: Counter): number => {
  if (++counter.n > counter.max) throw new BudgetExceeded();
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
const solveChoose = (b: Flat, reserve: number[], groups: number[][][], counter: Counter): number => {
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
      const counter: Counter = { n: 0, max: NODE_BUDGET };
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
      // La recherche interrompue laisse des pièces posées dans b : on repart du vrai plateau
      return toPos(heuristicPlace(toFlat(board), pieceToPlace, reserve, groups));
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

  let b2 = b;
  if (emptyCells(b).length <= SEARCH_MAX_EMPTY) {
    try {
      const counter: Counter = { n: 0, max: NODE_BUDGET };
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
      // La recherche interrompue laisse des pièces posées dans b : on repart du vrai plateau
      b2 = toFlat(board);
    }
  }

  // Milieu de partie : donner la pièce qui laisse le moins de bons coups à l'adversaire
  let best: Piece[] = [];
  let bestScore = Infinity;
  for (const q of safe) {
    const rest = availablePieces.filter(p => p !== q);
    // Pour chaque case où il pourrait poser q, combien de pièces sûres pourrait-il me donner ?
    const options = emptyCells(b2).map(i => safeCountAfter(b2, i, q, rest, groups));
    const score = Math.max(...options);
    if (score < bestScore) { bestScore = score; best = [q]; }
    else if (score === bestScore) best.push(q);
  }
  return rand(best);
};

// =============================================================================
// Analyse d'une partie terminée (replay)
// =============================================================================

/** `blunder` = gaffe (??) : le coup perd ; `mistake` = erreur (?) : le coup laisse filer la victoire. */
export type Severity = 'blunder' | 'mistake';

export type Reason =
  /** Pièce donnée qui permet à l'adversaire de gagner tout de suite, alors qu'une pièce sûre existait */
  | 'gives-win'
  /** Une case gagnante existait pour la pièce reçue */
  | 'missed-win'
  /** Après la pose, il ne reste aucune pièce sûre à donner, alors qu'une autre case en laissait */
  | 'no-safe-piece'
  /** Le coup transforme une position gagnée ou nulle en défaite forcée (solveur exact) */
  | 'now-losing'
  /** Le coup transforme une position gagnée en nulle (solveur exact) */
  | 'lets-win-slip';

export interface Decision {
  severity: Severity;
  reason: Reason;
  /** Meilleure alternative trouvée */
  better: { piece?: Piece; cell?: { row: number; col: number } };
}

/** Analyse d'un coup : choix de la pièce (par `givenBy`) puis pose (par l'adversaire). */
export interface MoveAnalysis {
  give: Decision | null;
  place: Decision | null;
  /** Vrai si le solveur exact a pu évaluer ce coup (fin de partie) */
  exact: boolean;
}

/** Cases vides à partir desquelles l'analyse tente le calcul exact. */
export const ANALYSIS_MAX_EMPTY = 9;
const ANALYSIS_BUDGET = 1_500_000;

/**
 * Repère les gaffes et erreurs de chaque joueur.
 * Les fautes immédiates (pièce gagnante donnée, victoire ratée, plus aucune pièce sûre) sont
 * détectées à tout moment ; en fin de partie, le solveur exact repère aussi les coups qui
 * changent l'issue de la partie avec un jeu parfait des deux côtés.
 */
export const analyzeGame = (moves: Move[], victoryOptions: VictoryOptions): MoveAnalysis[] => {
  const groups = groupsByCell(victoryOptions);
  const b: Flat = Array(16).fill(-1);
  const used = new Set<number>();
  const result: MoveAnalysis[] = [];

  for (const m of moves) {
    const reserve = Array.from({ length: 16 }, (_, p) => p).filter(p => !used.has(p)); // contient m.piece
    const rest = reserve.filter(p => p !== m.piece);
    const empties = emptyCells(b);
    const exactPossible = empties.length <= ANALYSIS_MAX_EMPTY;
    let exact = exactPossible;
    // Recherche exacte bornée : null si le budget est dépassé
    const solve = (fn: (c: Counter) => number): number | null => {
      const snapshot = b.slice();
      try {
        return fn({ n: 0, max: ANALYSIS_BUDGET });
      } catch (e) {
        if (!(e instanceof BudgetExceeded)) throw e;
        // Recherche interrompue : elle a laissé des pièces posées, on restaure le plateau
        for (let i = 0; i < 16; i++) b[i] = snapshot[i];
        exact = false;
        return null;
      }
    };

    // ── Choix de la pièce ────────────────────────────────────────────────────
    // Faute évidente : la pièce donnée gagne tout de suite alors qu'une pièce sûre existait
    const safe = reserve.filter(p => isSafe(b, p, groups));
    const obviousGive: Decision | null = !isSafe(b, m.piece, groups) && safe.length
      ? { severity: 'blunder', reason: 'gives-win', better: { piece: safe[0] } }
      : null;
    let give: Decision | null = null;
    let giveSolved = false;
    if (exactPossible) {
      // Valeur pour le donneur s'il donne q (−1 si q gagne tout de suite pour l'adversaire)
      const giveValue = (q: Piece): number | null =>
        isSafe(b, q, groups) ? solve(c => -solvePlace(b, q, reserve.filter(p => p !== q), groups, c)) : -1;
      const before = solve(c => solveChoose(b, reserve, groups, c));
      const after = before === null ? null : giveValue(m.piece);
      if (before !== null && after !== null) {
        giveSolved = true;
        if (after < before) {
          const better = safe.find(q => q !== m.piece && giveValue(q) === before);
          give = {
            severity: after === -1 ? 'blunder' : 'mistake',
            reason: obviousGive ? 'gives-win' : after === -1 ? 'now-losing' : 'lets-win-slip',
            better: { piece: better },
          };
        }
      }
    }
    // Sans verdict exact (milieu de partie), on garde la faute évidente
    if (!giveSolved) give = obviousGive;
    used.add(m.piece);

    // Pièce restée en main (temps écoulé) : rien à poser
    if (!m.cell) {
      result.push({ give, place: null, exact });
      break;
    }

    // ── Pose de la pièce ─────────────────────────────────────────────────────
    const cell = m.cell.row * BOARD_SIZE + m.cell.col;
    const wins = winningCellsFlat(b, m.piece, groups);
    const won = wins.includes(cell);
    let place: Decision | null = null;

    if (!won && wins.length) {
      // Victoire immédiate ratée : toujours une gaffe, quel que soit le reste
      place = { severity: 'blunder', reason: 'missed-win', better: { cell: toPos(wins[0]) } };
    } else if (!won) {
      const safeLeft = (i: number) => {
        b[i] = m.piece;
        const n = rest.filter(q => isSafe(b, q, groups)).length;
        b[i] = -1;
        return n;
      };
      // Faute évidente : plus aucune pièce sûre à donner alors qu'une autre case en laissait
      let obviousPlace: Decision | null = null;
      if (rest.length && safeLeft(cell) === 0) {
        const alt = empties.find(i => i !== cell && safeLeft(i) > 0);
        if (alt !== undefined) obviousPlace = { severity: 'blunder', reason: 'no-safe-piece', better: { cell: toPos(alt) } };
      }

      let placeSolved = false;
      if (exactPossible) {
        // Valeur pour le poseur après avoir posé en i (c'est ensuite à lui de choisir une pièce)
        const valueAt = (i: number): number | null => {
          b[i] = m.piece;
          try {
            if (winsAt(b, i, groups)) return 1;
            if (rest.length === 0 || empties.length === 1) return 0;
            return solve(c => solveChoose(b, rest, groups, c));
          } finally {
            b[i] = -1;
          }
        };
        const before = solve(c => solvePlace(b, m.piece, rest, groups, c));
        const after = before === null ? null : valueAt(cell);
        if (before !== null && after !== null) {
          placeSolved = true;
          if (after < before) {
            const better = empties.find(i => i !== cell && valueAt(i) === before);
            place = {
              severity: after === -1 ? 'blunder' : 'mistake',
              reason: obviousPlace ? 'no-safe-piece' : after === -1 ? 'now-losing' : 'lets-win-slip',
              better: { cell: better === undefined ? undefined : toPos(better) },
            };
          }
        }
      }
      if (!placeSolved) place = obviousPlace;
    }

    b[cell] = m.piece;
    result.push({ give, place, exact });
    if (won) break;
  }

  return result;
};
