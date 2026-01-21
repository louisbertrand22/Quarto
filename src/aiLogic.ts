import type { Board, Piece, VictoryOptions } from './types';
import { BOARD_SIZE } from './types';
import { checkCommonAttribute } from './gameLogic';

/**
 * Simple AI logic for single-player mode
 * The AI makes decisions based on:
 * 1. Winning moves (place to win)
 * 2. Blocking moves (prevent opponent from setting up a win)
 * 3. Safe piece selection (don't give opponent a winning piece)
 * 4. Random moves when no strategic move is available
 */

/**
 * Check if placing a piece at a position would create a win
 */
const wouldWin = (board: Board, row: number, col: number, piece: Piece, victoryOptions: VictoryOptions): boolean => {
  // Temporarily place the piece
  const testBoard = board.map(r => [...r]);
  testBoard[row][col] = piece;
  
  // Check if this creates a winning line or square
  return checkWinningLine(testBoard, row, col, victoryOptions);
};

/**
 * Check if a newly placed piece creates a winning line or square
 */
const checkWinningLine = (board: Board, row: number, col: number, victoryOptions: VictoryOptions): boolean => {
  const checkLine = (cells: (Piece | null)[]): boolean => {
    if (cells.some(cell => cell === null)) return false;
    const pieces = cells as Piece[];
    return checkCommonAttribute(pieces[0], pieces[1], pieces[2], pieces[3]);
  };

  // Check lines if enabled
  if (victoryOptions.lines) {
    // Check horizontal
    if (checkLine(board[row])) return true;

    // Check vertical
    const column = board.map(r => r[col]);
    if (checkLine(column)) return true;

    // Check diagonals
    if (row === col) {
      const diagonal1 = [board[0][0], board[1][1], board[2][2], board[3][3]];
      if (checkLine(diagonal1)) return true;
    }
    if (row + col === BOARD_SIZE - 1) {
      const diagonal2 = [board[0][3], board[1][2], board[2][1], board[3][0]];
      if (checkLine(diagonal2)) return true;
    }
  }

  // Check 2x2 squares if enabled
  if (victoryOptions.squares) {
    // Check all 2x2 squares that include the position (row, col)
    // A position can be part of up to 4 different 2x2 squares
    for (let startRow = Math.max(0, row - 1); startRow <= Math.min(BOARD_SIZE - 2, row); startRow++) {
      for (let startCol = Math.max(0, col - 1); startCol <= Math.min(BOARD_SIZE - 2, col); startCol++) {
        const square = [
          board[startRow][startCol],
          board[startRow][startCol + 1],
          board[startRow + 1][startCol],
          board[startRow + 1][startCol + 1]
        ];
        if (checkLine(square)) return true;
      }
    }
  }

  return false;
};

/**
 * AI chooses where to place a piece on the board
 */
export const aiChoosePosition = (board: Board, piece: Piece, victoryOptions: VictoryOptions = { lines: true, squares: false }): { row: number; col: number } => {
  const emptyPositions: { row: number; col: number }[] = [];
  
  // Collect all empty positions
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === null) {
        emptyPositions.push({ row, col });
      }
    }
  }

  // 1. Check if AI can win with this piece
  for (const pos of emptyPositions) {
    if (wouldWin(board, pos.row, pos.col, piece, victoryOptions)) {
      return pos;
    }
  }

  // 2. If no winning move, choose randomly from available positions
  // (A more advanced AI could try to set up future wins or block opponent)
  const randomIndex = Math.floor(Math.random() * emptyPositions.length);
  return emptyPositions[randomIndex];
};

/**
 * AI chooses a piece to give to the opponent
 * Strategy: Try to avoid giving a piece that would let the opponent win immediately
 */
export const aiChoosePiece = (board: Board, availablePieces: Piece[], victoryOptions: VictoryOptions = { lines: true, squares: false }): Piece => {
  const emptyPositions: { row: number; col: number }[] = [];
  
  // Collect all empty positions
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === null) {
        emptyPositions.push({ row, col });
      }
    }
  }

  // Find pieces that won't give the opponent an immediate win
  const safePieces = availablePieces.filter(piece => {
    // Check if this piece would let opponent win on any empty position
    return !emptyPositions.some(pos => wouldWin(board, pos.row, pos.col, piece, victoryOptions));
  });

  // If there are safe pieces, choose one randomly
  if (safePieces.length > 0) {
    const randomIndex = Math.floor(Math.random() * safePieces.length);
    return safePieces[randomIndex];
  }

  // If all pieces would give opponent a win, choose randomly (game is likely lost)
  const randomIndex = Math.floor(Math.random() * availablePieces.length);
  return availablePieces[randomIndex];
};
