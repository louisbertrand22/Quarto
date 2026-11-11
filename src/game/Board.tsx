import type { Board as BoardValue, Piece as PieceValue, WinningPosition } from '../types';
import { BOARD_SIZE } from '../types';
import { cellName } from '../gameLogic';
import { Piece } from './Piece';
import { usePieceLabel } from './pieceText';

interface BoardProps {
  board: BoardValue;
  /** Le joueur courant peut poser une pièce (active le survol et les clics) */
  canPlace?: boolean;
  onCellClick?: (row: number, col: number) => void;
  winningPositions?: WinningPosition[];
  /** Cases mises en évidence par l'aide visuelle */
  hintPositions?: WinningPosition[];
  /** Pièce affichée en transparence au survol d'une case vide */
  ghostPiece?: PieceValue | null;
  lastPlaced?: WinningPosition | null;
  showCoords?: boolean;
  className?: string;
}

const same = (a: WinningPosition, row: number, col: number) => a.row === row && a.col === col;

/** Plateau rond en bois, 4×4 cases creusées. */
export function Board({
  board, canPlace = false, onCellClick, winningPositions, hintPositions, ghostPiece,
  lastPlaced, showCoords = true, className = '',
}: BoardProps) {
  const label = usePieceLabel();

  return (
    <div className={`q-board ${className}`} data-can-place={canPlace}>
      <div className="q-grid">
        {board.flatMap((rowCells, row) =>
          rowCells.map((cell, col) => {
            const winIndex = winningPositions?.findIndex(p => same(p, row, col)) ?? -1;
            const isHint = hintPositions?.some(p => same(p, row, col)) ?? false;
            const isLast = lastPlaced ? same(lastPlaced, row, col) : false;
            const name = cellName(row, col);
            return (
              <button
                key={name}
                type="button"
                className="q-cell"
                style={{ zIndex: row + 1, ['--d' as string]: `${winIndex * 0.14}s` }}
                data-filled={cell !== null}
                data-win={winIndex >= 0}
                data-hint={isHint}
                tabIndex={canPlace && cell === null ? 0 : -1}
                aria-label={`${name}${cell !== null ? ` · ${label(cell)}` : ''}`}
                onClick={() => canPlace && cell === null && onCellClick?.(row, col)}
              >
                {cell !== null ? (
                  <Piece piece={cell} className={`q-piece ${isLast ? 'q-drop' : ''}`} />
                ) : ghostPiece != null && canPlace ? (
                  <Piece piece={ghostPiece} className="q-piece q-ghost" />
                ) : null}
                {showCoords && row === BOARD_SIZE - 1 && <span className="q-coord q-coord-file">{'abcd'[col]}</span>}
                {showCoords && col === 0 && <span className="q-coord q-coord-rank">{BOARD_SIZE - row}</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
