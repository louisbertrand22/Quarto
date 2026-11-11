/**
 * Série du puzzle du jour, façon Wordle : seule la première pièce choisie compte.
 * Stockée dans le navigateur (aucun compte nécessaire) ; tolère un stockage indisponible.
 */

const KEY = 'quarto-puzzle';

export interface PuzzleProgress {
  /** Numéro du dernier puzzle joué */
  last: number;
  /** Résultat du premier essai sur ce puzzle */
  lastSolved: boolean;
  /** Pièces essayées sur le dernier puzzle, dans l'ordre (true = sûre) */
  tries: boolean[];
  streak: number;
  best: number;
  played: number;
  solved: number;
}

const EMPTY: PuzzleProgress = { last: 0, lastSolved: false, tries: [], streak: 0, best: 0, played: 0, solved: 0 };

export const loadProgress = (): PuzzleProgress => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<PuzzleProgress>) } : EMPTY;
  } catch {
    return EMPTY;
  }
};

const save = (p: PuzzleProgress) => {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* stockage indisponible */ }
};

/** Série affichée aujourd'hui : elle tombe à 0 si un jour a été sauté. */
export const currentStreak = (p: PuzzleProgress, today: number): number =>
  p.last === today || (p.last === today - 1 && p.lastSolved) ? p.streak : 0;

/** Enregistre un essai sur le puzzle `n`. Le premier essai fixe le résultat du jour. */
export const recordTry = (p: PuzzleProgress, n: number, safe: boolean): PuzzleProgress => {
  let next: PuzzleProgress;
  if (p.last === n) {
    // Essais suivants : affichés dans le partage, sans effet sur la série
    if (p.tries.includes(true)) return p;
    next = { ...p, tries: [...p.tries, safe] };
  } else {
    const continues = p.last === n - 1 && p.lastSolved;
    const streak = safe ? (continues ? p.streak + 1 : 1) : 0;
    next = {
      last: n,
      lastSolved: safe,
      tries: [safe],
      streak,
      best: Math.max(p.best, streak),
      played: p.played + 1,
      solved: p.solved + (safe ? 1 : 0),
    };
  }
  save(next);
  return next;
};

/** Texte à partager, sans rien dévoiler de la solution. */
export const shareText = (
  n: number,
  p: PuzzleProgress,
  labels: { title: (n: number) => string; streak: (n: number) => string },
  url: string,
): string => {
  const squares = p.tries.map(ok => (ok ? '🟩' : '🟥')).join('');
  const lines = [labels.title(n), squares];
  if (p.streak > 0) lines.push(`🔥 ${labels.streak(p.streak)}`);
  lines.push(url);
  return lines.join('\n');
};
