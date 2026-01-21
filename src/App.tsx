import { useState } from 'react'
import { PieceComponent } from './PieceComponent'
import { generateAllPieces, type GameState, type Piece, BOARD_SIZE } from './types'
import { initializeBoard, placePiece, isPositionEmpty, checkVictory } from './gameLogic'

function App() {
  const [gameState, setGameState] = useState<GameState>({
    board: initializeBoard(),
    availablePieces: generateAllPieces(),
    currentPiece: null,
    currentPlayer: 1,
    winner: null,
    gameOver: false,
  });

  const handlePieceSelection = (piece: Piece) => {
    if (gameState.gameOver || gameState.currentPiece !== null) return;

    setGameState({
      ...gameState,
      currentPiece: piece,
    });
  };

  const handleBoardClick = (row: number, col: number) => {
    // Add bounds checking
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return;
    }
    
    if (gameState.gameOver || gameState.currentPiece === null || !isPositionEmpty(gameState.board, row, col)) {
      return;
    }

    const newBoard = placePiece(gameState.board, row, col, gameState.currentPiece);
    const hasWon = checkVictory(newBoard);
    const newAvailablePieces = gameState.availablePieces.filter(p => p !== gameState.currentPiece);

    setGameState({
      ...gameState,
      board: newBoard,
      availablePieces: newAvailablePieces,
      currentPiece: null,
      currentPlayer: gameState.currentPlayer === 1 ? 2 : 1,
      winner: hasWon ? gameState.currentPlayer : null,
      gameOver: hasWon || newAvailablePieces.length === 0,
    });
  };

  const handleReset = () => {
    setGameState({
      board: initializeBoard(),
      availablePieces: generateAllPieces(),
      currentPiece: null,
      currentPlayer: 1,
      winner: null,
      gameOver: false,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-center text-gray-800 mb-8">Quarto</h1>

        {/* Game Status */}
        <div className="text-center mb-8">
          {gameState.gameOver ? (
            <div className="space-y-2">
              {gameState.winner ? (
                <p className="text-3xl font-bold text-green-600">
                  Joueur {gameState.winner} a gagné ! 🎉
                </p>
              ) : (
                <p className="text-3xl font-bold text-gray-600">
                  Match nul !
                </p>
              )}
              <button
                onClick={handleReset}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Nouvelle partie
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {(() => {
                // When a piece is selected, the opposite player should place it
                const displayPlayer = gameState.currentPiece === null 
                  ? gameState.currentPlayer 
                  : gameState.currentPlayer === 1 ? 2 : 1;
                
                return (
                  <>
                    <p className="text-2xl font-semibold text-gray-700">
                      Joueur {displayPlayer}
                    </p>
                    {gameState.currentPiece === null ? (
                      <p className="text-lg text-gray-600">
                        Choisissez une pièce pour l'adversaire
                      </p>
                    ) : (
                      <p className="text-lg text-gray-600">
                        Placez la pièce sur le plateau
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Board */}
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Plateau
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {gameState.board.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => handleBoardClick(rowIndex, colIndex)}
                    className={`
                      w-24 h-24 border-2 border-gray-400 rounded-lg
                      flex items-center justify-center
                      ${cell === null && gameState.currentPiece !== null && !gameState.gameOver
                        ? 'bg-amber-100 hover:bg-amber-200 cursor-pointer'
                        : 'bg-amber-50'
                      }
                      transition-colors
                    `}
                  >
                    {cell !== null && <PieceComponent piece={cell} disabled />}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Available Pieces */}
          <div className="bg-white rounded-xl shadow-2xl p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Pièces disponibles
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {gameState.availablePieces.map(piece => (
                <div
                  key={piece}
                  className="flex items-center justify-center p-2"
                >
                  <PieceComponent
                    piece={piece}
                    onClick={() => handlePieceSelection(piece)}
                    selected={gameState.currentPiece === piece}
                    disabled={gameState.currentPiece !== null || gameState.gameOver}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Règles du jeu</h3>
          <ul className="space-y-2 text-gray-600">
            <li>• Le joueur A choisit une pièce pour le joueur B</li>
            <li>• Le joueur B place la pièce sur le plateau</li>
            <li>• Le joueur B choisit ensuite une pièce pour le joueur A</li>
            <li>• Pour gagner : aligner 4 pièces avec au moins 1 attribut commun (couleur, forme, taille ou creux)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default App

