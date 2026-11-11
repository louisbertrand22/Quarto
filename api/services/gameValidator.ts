/**
 * Validation serveur d'une partie terminée, avant d'enregistrer le résultat.
 *
 * Le client n'annonce jamais « j'ai gagné » : il envoie la liste des coups,
 * le serveur rejoue la partie et en déduit lui-même le résultat.
 *
 * Volontairement autonome (pas d'import depuis src/) : l'API tourne en ESM Node,
 * où les imports sans extension du front ne se résolvent pas.
 * Les règles doivent rester identiques à src/gameLogic.ts et src/aiLogic.ts.
 */

export type GameResult = 'win' | 'loss' | 'draw';
export type AILevel = 'easy' | 'normal' | 'expert';

export interface SubmittedMove {
  piece: number;
  givenBy: 1 | 2;
  cell: { row: number; col: number } | null;
}

export interface SubmittedGame {
  mode: 'vs-ai' | 'online';
  level?: AILevel;
  victoryOptions: { lines: boolean; squares: boolean };
  moves: SubmittedMove[];
  timedOut?: boolean;
  /** Numéro du joueur qui soumet (en ligne) ; contre l'IA, l'humain est toujours le joueur 1 */
  playerNumber?: 1 | 2;
}

export type Verdict =
  | { ok: true; result: GameResult; game: SubmittedGame }
  | { ok: false; reason: string };

const LINES: number[][] = [
  [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
  [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
  [0, 5, 10, 15], [3, 6, 9, 12],
];
const SQUARES: number[][] = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
  SQUARES.push([r * 4 + c, r * 4 + c + 1, (r + 1) * 4 + c, (r + 1) * 4 + c + 1]);
}

const isWin = (b: number[], groups: number[][]): boolean =>
  groups.some(g => {
    const v = g.map(i => b[i]);
    if (v.some(x => x < 0)) return false;
    return (v[0] & v[1] & v[2] & v[3]) !== 0 || (~v[0] & ~v[1] & ~v[2] & ~v[3] & 15) !== 0;
  });

const winningCells = (b: number[], piece: number, groups: number[][]): number[] => {
  const res: number[] = [];
  for (let i = 0; i < 16; i++) {
    if (b[i] >= 0) continue;
    b[i] = piece;
    if (isWin(b, groups)) res.push(i);
    b[i] = -1;
  }
  return res;
};

/**
 * Forme compacte d'une partie, stockée dans l'historique pour la revoir coup par coup
 * (décodée par src/game/replayMoves.ts) : « 1:3a5f0- » = premier donneur, puis pour chaque coup
 * la pièce et la case (0-15) en hexadécimal, « - » si la pièce n'a pas été posée (temps écoulé).
 */
export const encodeMoves = (moves: SubmittedMove[]): string =>
  `${moves[0]?.givenBy ?? 1}:` +
  moves.map(m => m.piece.toString(16) + (m.cell ? (m.cell.row * 4 + m.cell.col).toString(16) : '-')).join('');

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Vérifie la forme de la requête (le corps vient du client : rien n'est garanti). */
const parse = (body: unknown): SubmittedGame | string => {
  if (!body || typeof body !== 'object') return 'corps invalide';
  const b = body as Record<string, unknown>;
  if (b.mode !== 'vs-ai' && b.mode !== 'online') return 'mode invalide';
  if (b.mode === 'vs-ai' && !['easy', 'normal', 'expert'].includes(b.level as string)) return 'niveau invalide';
  if (b.mode === 'online' && b.playerNumber !== 1 && b.playerNumber !== 2) return 'joueur invalide';
  const vo = b.victoryOptions as Record<string, unknown> | undefined;
  if (!vo || vo.lines !== true || typeof vo.squares !== 'boolean') return 'règles invalides';
  if (!Array.isArray(b.moves) || b.moves.length < 1 || b.moves.length > 16) return 'coups invalides';

  const moves: SubmittedMove[] = [];
  for (const m of b.moves as unknown[]) {
    if (!m || typeof m !== 'object') return 'coup invalide';
    const mm = m as Record<string, unknown>;
    if (!isInt(mm.piece, 0, 15) || (mm.givenBy !== 1 && mm.givenBy !== 2)) return 'coup invalide';
    let cell: SubmittedMove['cell'] = null;
    if (mm.cell !== null && mm.cell !== undefined) {
      const c = mm.cell as Record<string, unknown>;
      if (!isInt(c.row, 0, 3) || !isInt(c.col, 0, 3)) return 'case invalide';
      cell = { row: c.row, col: c.col };
    }
    moves.push({ piece: mm.piece, givenBy: mm.givenBy, cell });
  }

  return {
    mode: b.mode,
    level: b.mode === 'vs-ai' ? (b.level as AILevel) : undefined,
    victoryOptions: { lines: true, squares: vo.squares },
    moves,
    timedOut: b.timedOut === true,
    playerNumber: b.mode === 'online' ? (b.playerNumber as 1 | 2) : 1,
  };
};

export const validateGame = (body: unknown): Verdict => {
  const game = parse(body);
  if (typeof game === 'string') return { ok: false, reason: game };

  const { moves, mode, level, timedOut } = game;
  const groups = game.victoryOptions.squares ? LINES.concat(SQUARES) : LINES;
  const board = Array<number>(16).fill(-1);
  const given = new Set<number>();
  let winner: 1 | 2 | null = null;

  for (let k = 0; k < moves.length; k++) {
    const m = moves[k];
    const placer: 1 | 2 = m.givenBy === 1 ? 2 : 1;
    const isLast = k === moves.length - 1;

    if (given.has(m.piece)) return { ok: false, reason: 'pièce jouée deux fois' };
    if (k > 0 && m.givenBy !== moves[k - 1].givenBy % 2 + 1) return { ok: false, reason: 'ordre des tours incohérent' };

    // Comportement de l'IA (joueur 2) : impossible à falsifier sans incohérence
    if (mode === 'vs-ai' && level !== 'easy') {
      // Les niveaux Normal et Expert prennent toujours une victoire immédiate
      if (placer === 2 && m.cell && winningCells(board, m.piece, groups).length > 0) {
        board[m.cell.row * 4 + m.cell.col] = m.piece;
        const aiWon = isWin(board, groups);
        board[m.cell.row * 4 + m.cell.col] = -1;
        if (!aiWon) return { ok: false, reason: "coup de l'IA incohérent" };
      }
      // L'Expert ne donne jamais une pièce gagnante s'il en existe une sûre
      if (level === 'expert' && m.givenBy === 2 && winningCells(board, m.piece, groups).length > 0) {
        const reserve = Array.from({ length: 16 }, (_, p) => p).filter(p => !given.has(p) && !board.includes(p));
        if (reserve.some(p => winningCells(board, p, groups).length === 0)) {
          return { ok: false, reason: "choix de l'IA incohérent" };
        }
      }
    }

    given.add(m.piece);

    if (!m.cell) {
      // Seul le dernier coup peut rester en main, et seulement en cas de temps écoulé
      if (!isLast || !timedOut) return { ok: false, reason: 'partie inachevée' };
      break;
    }
    const idx = m.cell.row * 4 + m.cell.col;
    if (board[idx] >= 0) return { ok: false, reason: 'case déjà occupée' };
    board[idx] = m.piece;

    if (isWin(board, groups)) {
      if (!isLast) return { ok: false, reason: 'coups joués après la victoire' };
      winner = placer;
    }
  }

  if (winner === null) {
    if (timedOut) {
      if (mode === 'online') return { ok: false, reason: 'pas de pendule en ligne' };
      // Celui qui devait jouer a épuisé son temps : le donneur du dernier coup gagne
      winner = moves[moves.length - 1].givenBy;
      // L'IA joue en moins d'une seconde : elle ne perd jamais au temps
      if (mode === 'vs-ai' && winner === 1) return { ok: false, reason: "l'IA ne perd pas au temps" };
    } else if (moves.length < 16) {
      return { ok: false, reason: 'partie inachevée' };
    }
  }

  const me = game.playerNumber ?? 1;
  const result: GameResult = winner === null ? 'draw' : winner === me ? 'win' : 'loss';
  return { ok: true, result, game };
};
