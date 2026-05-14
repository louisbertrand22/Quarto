import type { Piece } from './types';
import { isDark, isRound, isTall, isHollow } from './types';

interface PieceComponentProps {
  piece: Piece;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  highlighted?: boolean;
}

export const PieceComponent = ({ piece, onClick, selected, disabled, highlighted }: PieceComponentProps) => {
  const dark = isDark(piece);
  const round = isRound(piece);
  const tall = isTall(piece);
  const hollow = isHollow(piece);

  const shapeClasses = round ? "rounded-full" : "rounded-md";
  const sizeClasses = tall ? "w-10 h-14 sm:w-12 sm:h-16" : "w-10 h-8 sm:w-12 sm:h-10";

  const colorClasses = dark
    ? "bg-indigo-900 shadow-md"
    : "bg-amber-200 border-2 border-amber-400 shadow-sm";

  const selectionClasses = selected
    ? "ring-3 ring-indigo-500 ring-offset-2 scale-110"
    : "";

  const highlightClasses = highlighted
    ? "ring-3 ring-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50"
    : "";

  const interactionClasses = disabled
    ? "opacity-40 cursor-not-allowed"
    : onClick
    ? "cursor-pointer hover:scale-110 hover:shadow-lg transition-all duration-150"
    : "";

  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-200 ${colorClasses} ${shapeClasses} ${sizeClasses} ${selectionClasses} ${highlightClasses} ${interactionClasses}`}
      onClick={!disabled ? onClick : undefined}
    >
      {hollow && (
        <div
          className={`${round ? "rounded-full" : "rounded-sm"} w-3 h-3 sm:w-4 sm:h-4 ${dark ? "bg-amber-200" : "bg-indigo-900"}`}
        />
      )}
    </div>
  );
};
