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
 * Helper function to collect all empty positions on the board
 * Extracted to avoid duplicating this logic in multiple functions
 */
const getEmptyPositions = (board: Board): { row: number; col: number }[] => {
  const positions: { row: number; col: number }[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === null) {
        positions.push({ row, col });
      }
    }
  }
  return positions;
};

/**
 * Calculate the threat level of a position based on how many pieces are already
 * placed in lines/squares containing this position
 * Higher threat means more pieces in a line, which could lead to a win
 */
const calculateThreatLevel = (board: Board, row: number, col: number, victoryOptions: VictoryOptions): number => {
  let threatLevel = 0;
  
  const countFilledInLine = (cells: (Piece | null)[]): number => {
    return cells.filter(cell => cell !== null).length;
  };
  
  if (victoryOptions.lines) {
    // Check horizontal line
    const horizontalCount = countFilledInLine(board[row]);
    threatLevel += horizontalCount;
    
    // Check vertical line
    const verticalCells = [board[0][col], board[1][col], board[2][col], board[3][col]];
    const verticalCount = countFilledInLine(verticalCells);
    threatLevel += verticalCount;
    
    // Check diagonals
    if (row === col) {
      const diagonal1Cells = [board[0][0], board[1][1], board[2][2], board[3][3]];
      const diagonal1Count = countFilledInLine(diagonal1Cells);
      threatLevel += diagonal1Count;
    }
    if (row + col === BOARD_SIZE - 1) {
      const diagonal2Cells = [board[0][3], board[1][2], board[2][1], board[3][0]];
      const diagonal2Count = countFilledInLine(diagonal2Cells);
      threatLevel += diagonal2Count;
    }
  }
  
  if (victoryOptions.squares) {
    // Check 2x2 squares containing this position
    for (let startRow = Math.max(0, row - 1); startRow <= Math.min(BOARD_SIZE - 2, row); startRow++) {
      for (let startCol = Math.max(0, col - 1); startCol <= Math.min(BOARD_SIZE - 2, col); startCol++) {
        const squareCells = [
          board[startRow][startCol],
          board[startRow][startCol + 1],
          board[startRow + 1][startCol],
          board[startRow + 1][startCol + 1]
        ];
        const squareCount = countFilledInLine(squareCells);
        threatLevel += squareCount;
      }
    }
  }
  
  return threatLevel;
};

/**
 * Check if placing a piece at a position would create a win
 * Optimized to avoid unnecessary board cloning
 */
const wouldWin = (board: Board, row: number, col: number, piece: Piece, victoryOptions: VictoryOptions): boolean => {
  // Check if this creates a winning line or square without cloning the board
  return checkWinningLine(board, row, col, piece, victoryOptions);
};

/**
 * Check if a newly placed piece creates a winning line or square
 * Optimized to check with a hypothetical piece placement without modifying the board
 */
const checkWinningLine = (board: Board, row: number, col: number, piece: Piece, victoryOptions: VictoryOptions): boolean => {
  const checkLine = (cells: (Piece | null)[], positions: { row: number; col: number }[]): boolean => {
    // Create a virtual line with the hypothetical piece placement
    const virtualCells = cells.map((cell, idx) => {
      const pos = positions[idx];
      return (pos.row === row && pos.col === col) ? piece : cell;
    });
    
    if (virtualCells.some(cell => cell === null)) return false;
    const pieces = virtualCells as Piece[];
    return checkCommonAttribute(pieces[0], pieces[1], pieces[2], pieces[3]);
  };

  // Check lines if enabled
  if (victoryOptions.lines) {
    // Check horizontal
    const horizontalCells = [board[row][0], board[row][1], board[row][2], board[row][3]];
    const horizontalPositions = [{ row, col: 0 }, { row, col: 1 }, { row, col: 2 }, { row, col: 3 }];
    if (checkLine(horizontalCells, horizontalPositions)) return true;

    // Check vertical
    const verticalCells = [board[0][col], board[1][col], board[2][col], board[3][col]];
    const verticalPositions = [{ row: 0, col }, { row: 1, col }, { row: 2, col }, { row: 3, col }];
    if (checkLine(verticalCells, verticalPositions)) return true;

    // Check diagonals
    if (row === col) {
      const diagonal1Cells = [board[0][0], board[1][1], board[2][2], board[3][3]];
      const diagonal1Positions = [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 2 }, { row: 3, col: 3 }];
      if (checkLine(diagonal1Cells, diagonal1Positions)) return true;
    }
    if (row + col === BOARD_SIZE - 1) {
      const diagonal2Cells = [board[0][3], board[1][2], board[2][1], board[3][0]];
      const diagonal2Positions = [{ row: 0, col: 3 }, { row: 1, col: 2 }, { row: 2, col: 1 }, { row: 3, col: 0 }];
      if (checkLine(diagonal2Cells, diagonal2Positions)) return true;
    }
  }

  // Check 2x2 squares if enabled
  if (victoryOptions.squares) {
    // Check all 2x2 squares that include the position (row, col)
    // A position can be part of up to 4 different 2x2 squares
    for (let startRow = Math.max(0, row - 1); startRow <= Math.min(BOARD_SIZE - 2, row); startRow++) {
      for (let startCol = Math.max(0, col - 1); startCol <= Math.min(BOARD_SIZE - 2, col); startCol++) {
        const squareCells = [
          board[startRow][startCol],
          board[startRow][startCol + 1],
          board[startRow + 1][startCol],
          board[startRow + 1][startCol + 1]
        ];
        const squarePositions = [
          { row: startRow, col: startCol },
          { row: startRow, col: startCol + 1 },
          { row: startRow + 1, col: startCol },
          { row: startRow + 1, col: startCol + 1 }
        ];
        if (checkLine(squareCells, squarePositions)) return true;
      }
    }
  }

  return false;
};

/**
 * AI chooses where to place a piece on the board
 */
export const aiChoosePosition = (board: Board, piece: Piece, victoryOptions: VictoryOptions = { lines: true, squares: false }): { row: number; col: number } => {
  const emptyPositions = getEmptyPositions(board);

  // 1. Check if AI can win with this piece
  for (const pos of emptyPositions) {
    if (wouldWin(board, pos.row, pos.col, piece, victoryOptions)) {
      return pos;
    }
  }

  // 2. Check if we need to block opponent from winning on next turn
  // Look for positions where placing this piece would prevent a potential opponent win
  // This is a defensive strategy: find positions that are part of dangerous lines
  const blockingMoves: { row: number; col: number; threat: number }[] = [];
  
  for (const pos of emptyPositions) {
    const threatLevel = calculateThreatLevel(board, pos.row, pos.col, victoryOptions);
    if (threatLevel > 0) {
      blockingMoves.push({ row: pos.row, col: pos.col, threat: threatLevel });
    }
  }
  
  // If there are blocking moves, prioritize the most threatening position
  if (blockingMoves.length > 0) {
    blockingMoves.sort((a, b) => b.threat - a.threat);
    return { row: blockingMoves[0].row, col: blockingMoves[0].col };
  }

  // 3. If no winning or blocking move, choose randomly from available positions
  const randomIndex = Math.floor(Math.random() * emptyPositions.length);
  return emptyPositions[randomIndex];
};

/**
 * AI chooses a piece to give to the opponent
 * Strategy: Try to avoid giving a piece that would let the opponent win immediately
 * Optimized to reduce redundant checks
 */
export const aiChoosePiece = (board: Board, availablePieces: Piece[], victoryOptions: VictoryOptions = { lines: true, squares: false }): Piece => {
  const emptyPositions = getEmptyPositions(board);

  // Build a set of dangerous pieces (pieces that would give opponent an immediate win)
  const dangerousPieces = new Set<Piece>();
  
  // For each empty position, check which pieces would create a win
  for (const pos of emptyPositions) {
    for (const piece of availablePieces) {
      if (wouldWin(board, pos.row, pos.col, piece, victoryOptions)) {
        dangerousPieces.add(piece);
        break; // No need to check other positions for this piece
      }
    }
  }

  // Find pieces that won't give the opponent an immediate win
  const safePieces = availablePieces.filter(piece => !dangerousPieces.has(piece));

  // If there are safe pieces, choose one randomly
  if (safePieces.length > 0) {
    const randomIndex = Math.floor(Math.random() * safePieces.length);
    return safePieces[randomIndex];
  }

  // If all pieces would give opponent a win, choose randomly (game is likely lost)
  const randomIndex = Math.floor(Math.random() * availablePieces.length);
  return availablePieces[randomIndex];
};
