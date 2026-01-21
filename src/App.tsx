import { useState, useEffect, useCallback, useRef } from 'react'
import { PieceComponent } from './PieceComponent'
import { generateAllPieces, type GameState, type Piece, BOARD_SIZE, type GameMode } from './types'
import { initializeBoard, placePiece, isPositionEmpty, checkVictory } from './gameLogic'
import { aiChoosePosition, aiChoosePiece } from './aiLogic'

function App() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    board: initializeBoard(),
    availablePieces: generateAllPieces(),
    currentPiece: null,
    currentPlayer: 1,
    winner: null,
    gameOver: false,
    gameMode: 'two-player',
  });
  const aiProcessingRef = useRef(false);

  const handleBoardClick = useCallback((row: number, col: number) => {
    // Add bounds checking
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return;
    }
    
    setGameState(prevState => {
      if (prevState.gameOver || prevState.currentPiece === null || !isPositionEmpty(prevState.board, row, col)) {
        return prevState;
      }

      const newBoard = placePiece(prevState.board, row, col, prevState.currentPiece);
      const hasWon = checkVictory(newBoard);
      const newAvailablePieces = prevState.availablePieces.filter(p => p !== prevState.currentPiece);

      return {
        ...prevState,
        board: newBoard,
        availablePieces: newAvailablePieces,
        currentPiece: null,
        currentPlayer: prevState.currentPlayer === 1 ? 2 : 1,
        winner: hasWon ? prevState.currentPlayer : null,
        gameOver: hasWon || newAvailablePieces.length === 0,
      };
    });
  }, []);

  // AI turn effect - triggers when it's AI's turn (player 2 in vs-ai mode)
  // Also triggers when AI needs to choose a piece for the player
  useEffect(() => {
    if (gameState.gameMode !== 'vs-ai' || gameState.gameOver || aiProcessingRef.current) {
      return;
    }

    // AI acts in two cases:
    // 1. When it's AI's turn to place a piece (currentPlayer === 2 && currentPiece !== null)
    // 2. When AI needs to choose a piece for the player (currentPlayer === 1 && currentPiece === null)
    const shouldAIChoosePiece = gameState.currentPlayer === 1 && gameState.currentPiece === null;
    const shouldAIPlacePiece = gameState.currentPlayer === 2 && gameState.currentPiece !== null;

    if (!shouldAIChoosePiece && !shouldAIPlacePiece) {
      return;
    }

    aiProcessingRef.current = true;

    // Add a small delay to make AI moves visible
    const timer = setTimeout(() => {
      setGameState(prevState => {
        // Double-check conditions with latest state
        if (prevState.gameMode !== 'vs-ai' || prevState.gameOver) {
          aiProcessingRef.current = false;
          return prevState;
        }

        // AI chooses a piece for the player
        if (prevState.currentPlayer === 1 && prevState.currentPiece === null) {
          const chosenPiece = aiChoosePiece(prevState.board, prevState.availablePieces);
          aiProcessingRef.current = false;
          return {
            ...prevState,
            currentPiece: chosenPiece,
            currentPlayer: 2,  // Switch to AI's turn to place the piece
          };
        }

        // AI places the piece on the board
        if (prevState.currentPlayer === 2 && prevState.currentPiece !== null) {
          const position = aiChoosePosition(prevState.board, prevState.currentPiece);
          const { row, col } = position;
          const piece = prevState.currentPiece;
          
          if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && 
              !prevState.gameOver && piece !== null && isPositionEmpty(prevState.board, row, col)) {
            const newBoard = placePiece(prevState.board, row, col, piece);
            const hasWon = checkVictory(newBoard);
            const newAvailablePieces = prevState.availablePieces.filter(p => p !== piece);

            aiProcessingRef.current = false;
            return {
              ...prevState,
              board: newBoard,
              availablePieces: newAvailablePieces,
              currentPiece: null,
              currentPlayer: 1,  // After AI (player 2) plays, it's player 1's turn
              winner: hasWon ? prevState.currentPlayer : null,
              gameOver: hasWon || newAvailablePieces.length === 0,
            };
          }
        }
        
        aiProcessingRef.current = false;
        return prevState;
      });
    }, 800); // 800ms delay for better UX

    return () => {
      clearTimeout(timer);
      aiProcessingRef.current = false;
    };
  }, [gameState.currentPlayer, gameState.currentPiece, gameState.gameMode, gameState.gameOver]);

  const handlePieceSelection = (piece: Piece) => {
    if (gameState.gameOver || gameState.currentPiece !== null) return;

    // In vs-AI mode, prevent player from selecting when AI should choose
    if (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 1) {
      return;  // AI will choose the piece for the player
    }

    setGameState({
      ...gameState,
      currentPiece: piece,
      currentPlayer: gameState.currentPlayer === 1 ? 2 : 1,  // Switch player after piece selection
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
      gameMode: gameMode || 'two-player',
    });
  };

  const handleModeSelection = (mode: GameMode) => {
    setGameMode(mode);
    setGameState({
      board: initializeBoard(),
      availablePieces: generateAllPieces(),
      currentPiece: null,
      currentPlayer: 1,
      winner: null,
      gameOver: false,
      gameMode: mode,
    });
  };

  // Helper function to get player name based on game mode
  const getPlayerName = (player: 1 | 2): string => {
    if (gameState.gameMode === 'vs-ai') {
      return player === 2 ? 'IA' : 'Vous';
    }
    return `Joueur ${player}`;
  };

  // Helper function to get instruction message
  const getInstructionMessage = (player: 1 | 2, hasPiece: boolean): string => {
    if (!hasPiece) {
      if (gameState.gameMode === 'vs-ai') {
        // In vs-AI mode, when currentPlayer is 1 and no piece selected, AI chooses for player
        if (player === 1) {
          return "L'IA choisit une pièce pour vous...";
        }
        // When currentPlayer is 2 and no piece selected, player chooses for AI
        return "Choisissez une pièce pour l'IA";
      }
      return "Choisissez une pièce pour l'adversaire";
    } else {
      if (gameState.gameMode === 'vs-ai' && player === 2) {
        return "L'IA place la pièce...";
      }
      return "Placez la pièce sur le plateau";
    }
  };

  // Game mode selection screen
  if (gameMode === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8">
          <h1 className="text-5xl font-bold text-center text-gray-800 mb-8">Quarto</h1>
          <h2 className="text-2xl font-semibold text-center text-gray-700 mb-8">
            Choisissez le mode de jeu
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => handleModeSelection('two-player')}
              className="p-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xl font-semibold"
            >
              🎮 Deux joueurs
            </button>
            <button
              onClick={() => handleModeSelection('vs-ai')}
              className="p-8 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xl font-semibold"
            >
              🤖 Contre l'IA
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                  {gameState.gameMode === 'vs-ai' && gameState.winner === 2
                    ? "L'IA a gagné ! 🤖"
                    : gameState.gameMode === 'vs-ai' && gameState.winner === 1
                    ? "Vous avez gagné ! 🎉"
                    : `Joueur ${gameState.winner} a gagné ! 🎉`}
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
              <button
                onClick={() => setGameMode(null)}
                className="mt-2 ml-4 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Changer de mode
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {(() => {
                // Determine who should act based on current state
                let actingPlayer: 1 | 2;
                
                if (gameState.currentPiece === null) {
                  // No piece selected - someone needs to choose a piece
                  // In vs-AI mode with currentPlayer=1, AI will choose for player
                  // Otherwise, currentPlayer chooses for opponent
                  if (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 1) {
                    actingPlayer = 2;  // Show AI is acting
                  } else {
                    actingPlayer = gameState.currentPlayer;  // Current player chooses
                  }
                } else {
                  // Piece is selected - the OTHER player needs to place it
                  actingPlayer = gameState.currentPlayer === 1 ? 2 : 1;
                }
                
                const playerName = getPlayerName(actingPlayer);
                
                return (
                  <>
                    <p className="text-2xl font-semibold text-gray-700">
                      {playerName}
                    </p>
                    <p className="text-lg text-gray-600">
                      {getInstructionMessage(actingPlayer, gameState.currentPiece !== null)}
                    </p>
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
                    disabled={
                      gameState.currentPiece !== null || 
                      gameState.gameOver ||
                      (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 1 && gameState.currentPiece === null)
                    }
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

