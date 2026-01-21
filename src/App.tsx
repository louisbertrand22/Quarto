import { useState, useEffect, useCallback, useRef } from 'react'
import { PieceComponent } from './PieceComponent'
import { generateAllPieces, type GameState, type Piece, BOARD_SIZE, type GameMode, type VictoryOptions, type Board } from './types'
import { initializeBoard, placePiece, isPositionEmpty, checkVictory, normalizeBoard } from './gameLogic'
import { aiChoosePosition, aiChoosePiece } from './aiLogic'
import { createRoom, joinRoom, startPolling, leaveRoom, updateGameState, sendAction, areBothPlayersConnected, getNextSequenceId, type GameAction } from './onlineLogic'
import Header from './Header'
import Footer from './Footer'

function App() {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [victoryOptions, setVictoryOptions] = useState<VictoryOptions>({ lines: true, squares: false });
  const [showOptionsScreen, setShowOptionsScreen] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    board: initializeBoard(),
    availablePieces: generateAllPieces(),
    currentPiece: null,
    currentPlayer: 1,
    winner: null,
    gameOver: false,
    gameMode: 'two-player',
    victoryOptions: { lines: true, squares: false },
  });
  const aiProcessingRef = useRef(false);
  
  // Online multiplayer state
  const [showOnlineSetup, setShowOnlineSetup] = useState(false);
  const [roomId, setRoomId] = useState<string>('');
  const [inputRoomId, setInputRoomId] = useState<string>('');
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [isRoomHost, setIsRoomHost] = useState(false);
  const pollingCleanupRef = useRef<(() => void) | null>(null);
  const onlineRoomInfoRef = useRef<{ roomId: string; playerNumber: 1 | 2 } | null>(null);
  const gameStartPollingCleanupRef = useRef<(() => void) | null>(null); // Separate ref for game start polling
  const lastProcessedActionRef = useRef<number>(-1); // Track last processed action sequenceId

  // Helper function to randomly determine starting player in vs-ai mode
  const getStartingPlayer = (mode: GameMode): 1 | 2 => {
    if (mode === 'vs-ai') {
      // Randomly choose between player 1 (human) and player 2 (AI)
      return Math.random() < 0.5 ? 1 : 2;
    }
    return 1; // Always start with player 1 in two-player mode
  };

  // Helper function to compare boards efficiently
  const areBoardsDifferent = (board1: Board | undefined, board2: Board | undefined): boolean => {
    // If either board is undefined, they are different
    if (!board1 || !board2) {
      return true;
    }
    for (let i = 0; i < BOARD_SIZE; i++) {
      // Check if rows exist and are arrays before accessing them
      if (!board1[i] || !board2[i] || !Array.isArray(board1[i]) || !Array.isArray(board2[i])) {
        return true;
      }
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (board1[i][j] !== board2[i][j]) {
          return true;
        }
      }
    }
    return false;
  };

  const handleBoardClick = useCallback((row: number, col: number) => {
    // Add bounds checking
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return;
    }
    
    setGameState(prevState => {
      if (prevState.gameOver || prevState.currentPiece === null || !isPositionEmpty(prevState.board, row, col)) {
        return prevState;
      }

      // In online mode, only allow the current player to place
      if (prevState.gameMode === 'online' && prevState.onlineRoom && 
          prevState.currentPlayer !== prevState.onlineRoom.playerNumber) {
        return prevState;
      }

      const newBoard = placePiece(prevState.board, row, col, prevState.currentPiece);
      const hasWon = checkVictory(newBoard, prevState.victoryOptions);
      const newAvailablePieces = prevState.availablePieces.filter(p => p !== prevState.currentPiece);

      const newState = {
        ...prevState,
        board: newBoard,
        availablePieces: newAvailablePieces,
        currentPiece: null,
        // Don't switch player - the same player who placed will choose the next piece for the opponent
        winner: hasWon ? prevState.currentPlayer : null,
        gameOver: hasWon || newAvailablePieces.length === 0,
      };

      // In online mode, sync the state
      if (prevState.gameMode === 'online' && prevState.onlineRoom) {
        const action: GameAction = {
          type: 'PLACE_PIECE',
          payload: {
            row,
            col,
            piece: prevState.currentPiece,
            board: newBoard,
            availablePieces: newAvailablePieces,
            currentPiece: null,
            currentPlayer: prevState.currentPlayer,
            winner: newState.winner,
            gameOver: newState.gameOver,
          },
          timestamp: Date.now(),
          sequenceId: getNextSequenceId(),
        };
        sendAction(prevState.onlineRoom.roomId, action);
        updateGameState(prevState.onlineRoom.roomId, newState);
      }

      return newState;
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
    // 2. When AI needs to choose a piece for the player (currentPlayer === 2 && currentPiece === null)
    const shouldAIChoosePiece = gameState.currentPlayer === 2 && gameState.currentPiece === null;
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
        if (prevState.currentPlayer === 2 && prevState.currentPiece === null) {
          const chosenPiece = aiChoosePiece(prevState.board, prevState.availablePieces, prevState.victoryOptions);
          aiProcessingRef.current = false;
          return {
            ...prevState,
            currentPiece: chosenPiece,
            currentPlayer: 1,  // Switch to player 1 who will place the piece
          };
        }

        // AI places the piece on the board
        if (prevState.currentPlayer === 2 && prevState.currentPiece !== null) {
          const position = aiChoosePosition(prevState.board, prevState.currentPiece, prevState.victoryOptions);
          const { row, col } = position;
          const piece = prevState.currentPiece;
          
          if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && 
              !prevState.gameOver && piece !== null && isPositionEmpty(prevState.board, row, col)) {
            const newBoard = placePiece(prevState.board, row, col, piece);
            const hasWon = checkVictory(newBoard, prevState.victoryOptions);
            const newAvailablePieces = prevState.availablePieces.filter(p => p !== piece);

            aiProcessingRef.current = false;
            return {
              ...prevState,
              board: newBoard,
              availablePieces: newAvailablePieces,
              currentPiece: null,
              // Don't switch player - AI (player 2) who just placed will choose the next piece for the player
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
    if (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 2 && gameState.currentPiece === null) {
      return;  // AI will choose the piece for the player
    }

    // In online mode, only allow the current player to select
    if (gameState.gameMode === 'online' && gameState.onlineRoom && 
        gameState.currentPlayer !== gameState.onlineRoom.playerNumber) {
      return;
    }

    const newState = {
      ...gameState,
      currentPiece: piece,
      currentPlayer: (gameState.currentPlayer === 1 ? 2 : 1) as 1 | 2,  // Switch player - the other player will place the piece
    };

    // In online mode, sync the state
    if (gameState.gameMode === 'online' && gameState.onlineRoom) {
      const action: GameAction = {
        type: 'SELECT_PIECE',
        payload: {
          piece,
          currentPiece: piece,
          currentPlayer: newState.currentPlayer,
        },
        timestamp: Date.now(),
        sequenceId: getNextSequenceId(),
      };
      sendAction(gameState.onlineRoom.roomId, action);
      updateGameState(gameState.onlineRoom.roomId, newState);
    }

    setGameState(newState);
  };

  const handleReset = () => {
    const mode = gameMode || 'two-player';
    setGameState({
      board: initializeBoard(),
      availablePieces: generateAllPieces(),
      currentPiece: null,
      currentPlayer: getStartingPlayer(mode),
      winner: null,
      gameOver: false,
      gameMode: mode,
      victoryOptions: victoryOptions,
    });
  };

  const handleModeSelection = (mode: GameMode) => {
    setGameMode(mode);
    if (mode === 'online') {
      setShowOnlineSetup(true);
    } else {
      setShowOptionsScreen(true);
    }
  };

  const handleCreateRoom = async () => {
    const newRoomId = await createRoom();
    setRoomId(newRoomId);
    setWaitingForOpponent(true);
    setIsRoomHost(true); // Mark this player as the host
    
    // Start polling for opponent
    const cleanup = startPolling(newRoomId, async () => {
      if (await areBothPlayersConnected(newRoomId)) {
        setWaitingForOpponent(false);
        setShowOnlineSetup(false);
        setShowOptionsScreen(true);
      }
    });
    pollingCleanupRef.current = cleanup;
  };

  const handleJoinRoom = async () => {
    const trimmedRoomId = inputRoomId.trim().toUpperCase();
    if (trimmedRoomId.length !== 6) {
      alert('Le code de la salle doit contenir 6 caractères');
      return;
    }
    
    const success = await joinRoom(trimmedRoomId);
    if (success) {
      setRoomId(trimmedRoomId);
      setIsRoomHost(false); // Mark this player as NOT the host
      setShowOnlineSetup(false);
      setShowOptionsScreen(true);
    } else {
      alert('Impossible de rejoindre cette salle. Elle n\'existe pas ou est déjà pleine.');
    }
  };

  // Helper function to compare available pieces arrays
  const areAvailablePiecesDifferent = (pieces1: Piece[] | undefined, pieces2: Piece[] | undefined): boolean => {
    if (!pieces1 || !pieces2) return true;
    if (pieces1.length !== pieces2.length) return true;
    // Use Set for efficient comparison since pieces are integers
    const set1 = new Set(pieces1);
    return pieces2.some(piece => !set1.has(piece));
  };

  // Helper function to start polling for game state updates
  const startGameStatePolling = useCallback((roomId: string) => {
    if (pollingCleanupRef.current) {
      pollingCleanupRef.current();
    }
    
    const cleanup = startPolling(roomId, (roomData) => {
      // Process lastAction if it exists and hasn't been processed yet
      if (roomData.lastAction && 
          typeof roomData.lastAction.sequenceId === 'number' && 
          roomData.lastAction.sequenceId > lastProcessedActionRef.current) {
        lastProcessedActionRef.current = roomData.lastAction.sequenceId;
        
        // Apply the action to the game state
        const action = roomData.lastAction;
        if (action.payload) {
          const payload = action.payload;
          setGameState(prevState => {
            // Create new state based on the action
            const newState = { ...prevState };
            
            if (payload.board !== undefined) {
              newState.board = normalizeBoard(payload.board);
            }
            if (payload.availablePieces !== undefined) {
              newState.availablePieces = payload.availablePieces;
            }
            if (payload.currentPiece !== undefined) {
              newState.currentPiece = payload.currentPiece;
            }
            if (payload.currentPlayer !== undefined) {
              newState.currentPlayer = payload.currentPlayer;
            }
            if (payload.winner !== undefined) {
              newState.winner = payload.winner;
            }
            if (payload.gameOver !== undefined) {
              newState.gameOver = payload.gameOver;
            }
            
            return newState;
          });
        }
      }
      
      // Fallback: sync full game state if available
      if (roomData.gameState && roomData.gameState.board) {
        setGameState(prevState => {
          // Normalize the board to ensure it's a proper 2D array
          const normalizedBoard = normalizeBoard(roomData.gameState!.board);
          
          // Safely access game state properties with fallbacks
          const remoteState = roomData.gameState!;
          const availablePieces = remoteState.availablePieces ?? prevState.availablePieces;
          const currentPiece = remoteState.currentPiece ?? prevState.currentPiece;
          const currentPlayer = remoteState.currentPlayer ?? prevState.currentPlayer;
          const winner = remoteState.winner ?? prevState.winner;
          const gameOver = remoteState.gameOver ?? prevState.gameOver;
          
          // Only update if the state is different
          if (areBoardsDifferent(prevState.board, normalizedBoard) ||
              areAvailablePiecesDifferent(prevState.availablePieces, availablePieces) ||
              prevState.currentPiece !== currentPiece ||
              prevState.currentPlayer !== currentPlayer ||
              prevState.winner !== winner ||
              prevState.gameOver !== gameOver) {
            return { 
              ...prevState,
              board: normalizedBoard,
              availablePieces,
              currentPiece,
              currentPlayer,
              winner,
              gameOver,
              gameMode: 'online', // Ensure gameMode is set
              onlineRoom: prevState.onlineRoom, // Preserve connection info
              victoryOptions: prevState.victoryOptions, // Preserve local settings
            };
          }
          return prevState;
        });
      }
    });
    pollingCleanupRef.current = cleanup;
  }, []);

  const handleStartOnlineGame = () => {
    setShowOptionsScreen(false);
    const playerNumber: 1 | 2 = isRoomHost ? 1 : 2;
    
    const newGameState: GameState = {
      board: initializeBoard(),
      availablePieces: generateAllPieces(),
      currentPiece: null,
      currentPlayer: 1,
      winner: null,
      gameOver: false,
      gameMode: 'online',
      victoryOptions: victoryOptions,
      onlineRoom: {
        roomId: roomId,
        playerNumber: playerNumber,
        isHost: playerNumber === 1,
      },
    };
    
    setGameState(newGameState);
    
    // Update the game state in the room to notify the other player
    updateGameState(roomId, newGameState);
    
    // Start polling for game updates
    startGameStatePolling(roomId);
    
    // Update the room info ref
    onlineRoomInfoRef.current = { roomId, playerNumber };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
      }
      if (gameStartPollingCleanupRef.current) {
        gameStartPollingCleanupRef.current();
      }
      if (onlineRoomInfoRef.current) {
        leaveRoom(onlineRoomInfoRef.current.roomId, onlineRoomInfoRef.current.playerNumber);
      }
    };
  }, []);

  // Poll for game start when non-host is on options screen
  useEffect(() => {
    if (gameMode !== 'online' || isRoomHost || !roomId) {
      return;
    }

    // Only start polling if we're on the options screen
    if (!showOptionsScreen) {
      return;
    }

    let hasDetectedGameStart = false;

    // Non-host player polls for game state changes
    const cleanup = startPolling(roomId, (roomData) => {
      // Check if the game has been started by the host
      if (!hasDetectedGameStart && roomData.gameState && roomData.gameState.gameMode === 'online' && roomData.gameState.board) {
        hasDetectedGameStart = true;
        
        // Game has started, automatically join
        // In online mode, host is always player 1, non-host is always player 2
        // This matches the logic in handleStartOnlineGame
        const playerNumber: 1 | 2 = 2;
        
        // Update the room info ref BEFORE changing state
        onlineRoomInfoRef.current = { roomId, playerNumber };
        
        // Stop this polling immediately
        cleanup();
        gameStartPollingCleanupRef.current = null;
        
        // Set up game state polling BEFORE changing showOptionsScreen
        // This ensures polling is active when the component re-renders
        startGameStatePolling(roomId);
        
        // Now update the state to trigger re-render
        setShowOptionsScreen(false);
        setGameState({
          ...roomData.gameState,
          board: normalizeBoard(roomData.gameState.board),
          onlineRoom: {
            roomId: roomId,
            playerNumber: playerNumber,
            isHost: false,
          },
        });
      }
    });

    gameStartPollingCleanupRef.current = cleanup;

    return () => {
      if (gameStartPollingCleanupRef.current) {
        gameStartPollingCleanupRef.current();
        gameStartPollingCleanupRef.current = null;
      }
    };
  }, [gameMode, showOptionsScreen, isRoomHost, roomId, startGameStatePolling]);

  const handleStartGame = () => {
    if (gameMode === 'online') {
      handleStartOnlineGame();
      return;
    }
    
    setShowOptionsScreen(false);
    const mode = gameMode || 'two-player';
    setGameState({
      board: initializeBoard(),
      availablePieces: generateAllPieces(),
      currentPiece: null,
      currentPlayer: getStartingPlayer(mode),
      winner: null,
      gameOver: false,
      gameMode: mode,
      victoryOptions: victoryOptions,
    });
  };

  // Helper function to get player name based on game mode
  const getPlayerName = (player: 1 | 2): string => {
    if (gameState.gameMode === 'vs-ai') {
      return player === 2 ? 'IA' : 'Vous';
    }
    if (gameState.gameMode === 'online' && gameState.onlineRoom) {
      return player === gameState.onlineRoom.playerNumber ? 'Vous' : 'Adversaire';
    }
    return `Joueur ${player}`;
  };

  // Helper function to get instruction message
  const getInstructionMessage = (player: 1 | 2, hasPiece: boolean): string => {
    if (!hasPiece) {
      if (gameState.gameMode === 'vs-ai') {
        // In vs-AI mode, when currentPlayer is 2 and no piece selected, AI chooses for player
        if (player === 2) {
          return "L'IA choisit une pièce pour vous...";
        }
        // When currentPlayer is 1 and no piece selected, player chooses for AI
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <Header />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8">
            <h2 className="text-2xl font-semibold text-center text-gray-700 mb-8">
              Choisissez le mode de jeu
            </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <button
              onClick={() => handleModeSelection('online')}
              className="p-8 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xl font-semibold"
            >
              🌐 En ligne
            </button>
          </div>
        </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Online setup screen
  if (showOnlineSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <Header />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8">
            <h2 className="text-2xl font-semibold text-center text-gray-700 mb-8">
              Jouer en ligne
            </h2>
          
          {waitingForOpponent ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg text-gray-700 mb-4">
                  Partagez ce code avec votre adversaire :
                </p>
                <div className="text-5xl font-bold text-green-600 tracking-widest mb-4">
                  {roomId}
                </div>
                <p className="text-sm text-gray-600">
                  En attente de l'adversaire...
                </p>
              </div>
              <button
                onClick={() => {
                  if (pollingCleanupRef.current) {
                    pollingCleanupRef.current();
                  }
                  leaveRoom(roomId, 1);
                  setWaitingForOpponent(false);
                  setIsRoomHost(false);
                  setShowOnlineSetup(false);
                  setGameMode(null);
                }}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <button
                  onClick={handleCreateRoom}
                  className="w-full p-6 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xl font-semibold"
                >
                  Créer une salle
                </button>
                
                <div className="text-center text-gray-600">ou</div>
                
                <div className="space-y-3">
                  <label className="block text-gray-700 font-semibold">
                    Rejoindre une salle
                  </label>
                  <input
                    type="text"
                    value={inputRoomId}
                    onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                    placeholder="Code de la salle (ex: ABC123)"
                    maxLength={6}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl tracking-widest uppercase focus:border-green-600 focus:outline-none"
                  />
                  <button
                    onClick={handleJoinRoom}
                    className="w-full p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold"
                  >
                    Rejoindre
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setShowOnlineSetup(false);
                  setGameMode(null);
                }}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Retour
              </button>
            </div>
          )}
        </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Victory options selection screen
  if (showOptionsScreen) {
    const isValidConfiguration = victoryOptions.lines || victoryOptions.squares;
    const canModifyOptions = gameMode !== 'online' || isRoomHost;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <Header />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8">
            <h2 className="text-2xl font-semibold text-center text-gray-700 mb-8">
              Options de victoire
            </h2>
          {gameMode === 'online' && !isRoomHost && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 text-center">
                Seul l'hôte de la salle peut modifier les options de victoire
              </p>
            </div>
          )}
          <div className="space-y-6 mb-8">
            <div className="border-2 border-gray-300 rounded-lg p-6">
              <label className={`flex items-start space-x-4 ${canModifyOptions ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                <input
                  type="checkbox"
                  checked={victoryOptions.lines}
                  onChange={(e) => canModifyOptions && setVictoryOptions({ ...victoryOptions, lines: e.target.checked })}
                  disabled={!canModifyOptions}
                  className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <div className="font-semibold text-lg text-gray-800">Lignes (classique)</div>
                  <div className="text-gray-600 text-sm mt-1">
                    Gagnez en alignant 4 pièces sur une ligne (horizontale, verticale ou diagonale)
                  </div>
                </div>
              </label>
            </div>
            <div className="border-2 border-gray-300 rounded-lg p-6">
              <label className={`flex items-start space-x-4 ${canModifyOptions ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                <input
                  type="checkbox"
                  checked={victoryOptions.squares}
                  onChange={(e) => canModifyOptions && setVictoryOptions({ ...victoryOptions, squares: e.target.checked })}
                  disabled={!canModifyOptions}
                  className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <div className="font-semibold text-lg text-gray-800">Carrés 2×2</div>
                  <div className="text-gray-600 text-sm mt-1">
                    Gagnez en formant un carré 2×2 avec 4 pièces ayant un attribut commun
                  </div>
                </div>
              </label>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => {
                if (gameMode === 'online') {
                  if (pollingCleanupRef.current) {
                    pollingCleanupRef.current();
                  }
                  if (roomId) {
                    leaveRoom(roomId, isRoomHost ? 1 : 2);
                  }
                  setIsRoomHost(false);
                  setShowOptionsScreen(false);
                  setShowOnlineSetup(true);
                } else {
                  setGameMode(null);
                  setShowOptionsScreen(false);
                }
              }}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Retour
            </button>
            <button
              onClick={handleStartGame}
              disabled={!isValidConfiguration}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Commencer la partie
            </button>
          </div>
          {!isValidConfiguration && (
            <p className="text-center text-red-600 text-sm mt-4">
              Veuillez sélectionner au moins une condition de victoire
            </p>
          )}
        </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <Header />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
        
        {/* Online room info */}
        {gameState.gameMode === 'online' && gameState.onlineRoom && (
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">
              Code de la salle: <span className="font-bold text-green-600 text-lg">{gameState.onlineRoom.roomId}</span>
            </p>
          </div>
        )}

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
                    : gameState.gameMode === 'online' && gameState.onlineRoom && gameState.winner === gameState.onlineRoom.playerNumber
                    ? "Vous avez gagné ! 🎉"
                    : gameState.gameMode === 'online' && gameState.onlineRoom && gameState.winner !== gameState.onlineRoom.playerNumber
                    ? "Votre adversaire a gagné ! 😔"
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
                onClick={() => {
                  setGameMode(null);
                  setShowOptionsScreen(false);
                }}
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
                  // In vs-AI mode with currentPlayer=2, AI will choose for player
                  // Otherwise, currentPlayer chooses for opponent
                  if (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 2) {
                    actingPlayer = 2;  // Show AI is choosing
                  } else {
                    actingPlayer = gameState.currentPlayer;  // Current player chooses
                  }
                } else {
                  // Piece is selected - currentPlayer needs to place it
                  actingPlayer = gameState.currentPlayer;
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
              {gameState.board && Array.isArray(gameState.board) && gameState.board.map((row, rowIndex) =>
                row && Array.isArray(row) ? row.map((cell, colIndex) => (
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
                )) : null
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
                      (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 2 && gameState.currentPiece === null)
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
            {gameState.victoryOptions.lines && (
              <li className="ml-4 text-blue-600">→ Lignes: horizontales, verticales ou diagonales</li>
            )}
            {gameState.victoryOptions.squares && (
              <li className="ml-4 text-blue-600">→ Carrés 2×2: 4 pièces formant un carré</li>
            )}
          </ul>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  )
}

export default App

