import { useEffect, useState } from 'react';
import type { Move, VictoryOptions } from '../types';
import type { MoveAnalysis } from '../aiLogic';

// Une partie déjà analysée n'est pas recalculée (réouverture du replay)
const cache = new Map<string, MoveAnalysis[]>();
const keyOf = (moves: Move[], vo: VictoryOptions) =>
  `${vo.squares ? 'S' : 'L'}:${moves.map(m => `${m.givenBy}${m.piece}.${m.cell ? m.cell.row * 4 + m.cell.col : '-'}`).join(',')}`;

/** Analyse d'une partie (gaffes, erreurs), calculée dans un Web Worker. null tant qu'elle tourne. */
export function useGameAnalysis(moves: Move[], victoryOptions: VictoryOptions, enabled: boolean): MoveAnalysis[] | null {
  const key = keyOf(moves, victoryOptions);
  const [result, setResult] = useState<{ key: string; analysis: MoveAnalysis[] } | null>(null);

  useEffect(() => {
    if (!enabled || moves.length === 0 || cache.has(key)) return;
    let worker: Worker | null = null;
    let cancelled = false;
    const done = (analysis: MoveAnalysis[]) => {
      cache.set(key, analysis);
      if (!cancelled) setResult({ key, analysis });
    };
    try {
      worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<MoveAnalysis[]>) => done(e.data);
      worker.postMessage({ moves, victoryOptions });
    } catch {
      // Pas de worker disponible : calcul sur le fil principal, après l'affichage
      const id = setTimeout(() => import('../aiLogic').then(m => done(m.analyzeGame(moves, victoryOptions))), 50);
      return () => { cancelled = true; clearTimeout(id); };
    }
    return () => { cancelled = true; worker?.terminate(); };
    // key résume moves + victoryOptions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  if (!enabled) return null;
  return cache.get(key) ?? (result?.key === key ? result.analysis : null);
}
