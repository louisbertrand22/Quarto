import { useCallback } from 'react';
import type { Board, Piece, WinningPosition } from '../types';
import { isDark, isRound, isTall, isHollow } from '../types';
import { getSharedAttribute } from '../gameLogic';
import { useLanguage } from '../LanguageContext';

/** Libellé lisible d'une pièce (« foncée · ronde · haute · creuse »). */
export function usePieceLabel() {
  const { t } = useLanguage();
  return useCallback(
    (p: Piece) => t.pieces.describe(isDark(p), isRound(p), isTall(p), isHollow(p)),
    [t]
  );
}

/** Attribut commun d'une ligne gagnante, au pluriel (« hautes », « claires »…). */
export function useSharedLabel() {
  const { t } = useLanguage();
  return useCallback(
    (board: Board, positions: WinningPosition[] | undefined | null) => {
      if (!positions) return '';
      const shared = getSharedAttribute(board, positions);
      if (!shared) return '';
      const [whenSet, whenUnset] = t.pieces.shared[shared.bit];
      return shared.set ? whenSet : whenUnset;
    },
    [t]
  );
}
