import type { Piece } from './types';
import { isDark, isRound, isTall, isHollow } from './types';

interface PieceComponentProps {
  piece: Piece;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}

export const PieceComponent = ({ piece, onClick, selected, disabled }: PieceComponentProps) => {
  const dark = isDark(piece);
  const round = isRound(piece);
  const tall = isTall(piece);
  const hollow = isHollow(piece);

  // Base classes
  const baseClasses = "relative cursor-pointer transition-all duration-200 flex items-center justify-center";
  
  // Color classes
  const colorClasses = dark ? "bg-blue-900" : "bg-yellow-100";
  
  // Border classes - add blue border for white/light pieces
  const borderClasses = dark ? "" : "border-2 border-blue-500";
  
  // Shape classes (rounded for round, square for not)
  const shapeClasses = round ? "rounded-full" : "rounded-md";
  
  // Size classes - responsive
  const sizeClasses = tall ? "w-10 h-14 sm:w-12 sm:h-16" : "w-10 h-8 sm:w-12 sm:h-10";
  
  // Border classes for selection
  const selectionClasses = selected ? "ring-4 ring-blue-500" : "";
  
  // Disabled classes
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-110";
  
  return (
    <div
      className={`${baseClasses} ${colorClasses} ${borderClasses} ${shapeClasses} ${sizeClasses} ${selectionClasses} ${disabledClasses}`}
      onClick={!disabled ? onClick : undefined}
    >
      {/* Hollow indicator - a circle or square in the center */}
      {hollow && (
        <div 
          className={`${dark ? "bg-yellow-100" : "bg-blue-900"} ${round ? "rounded-full" : "rounded-sm"} w-3 h-3 sm:w-4 sm:h-4`}
        />
      )}
    </div>
  );
};
