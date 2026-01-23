import { useState, useEffect, useCallback, useRef } from 'react'
import { PieceComponent } from './PieceComponent'
import { generateAllPieces, type GameState, type Piece, BOARD_SIZE, type GameMode, type VictoryOptions, type Board, type WinningPosition } from './types'
import { initializeBoard, placePiece, isPositionEmpty, checkVictory, normalizeBoard, formatBoardForLogging } from './gameLogic'
import { aiChoosePosition, aiChoosePiece } from './aiLogic'
import { createRoom, joinRoom, startPolling, leaveRoom, updateGameState, areBothPlayersConnected } from './onlineLogic'
import Header from './Header'
import Footer from './Footer'

// Debug flags for development logging
// Set to false to disable verbose logging in production
const DEBUG_FIREBASE_SYNC = false;
const DEBUG_GAME_ACTIONS = false;

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
  const gameJoinedRef = useRef(false); // Track if player 2 has already joined the game
  const pendingFirebaseWriteRef = useRef(false); // Track if a Firebase write is in progress to prevent race conditions

  // Helper function to randomly determine starting player in vs-ai mode
  const getStartingPlayer = (mode: GameMode): 1 | 2 => {
    if (mode === 'vs-ai') {
      // Randomly choose between player 1 (human) and player 2 (AI)
      return Math.random() < 0.5 ? 1 : 2;
    }
    return 1; // Always start with player 1 in two-player mode
  };

  // Helper function to compare boards efficiently
  // Comparison functions kept for potential future optimization
  // Currently not used as we always apply Firebase updates to ensure UI sync
  const _areBoardsDifferent = (board1: Board | undefined, board2: Board | undefined): boolean => {
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

  const _areAvailablePiecesDifferent = (pieces1: Piece[] | undefined, pieces2: Piece[] | undefined): boolean => {
    if (!pieces1 || !pieces2) return true;
    if (pieces1.length !== pieces2.length) return true;
    // Use Set for efficient comparison since pieces are integers
    const set1 = new Set(pieces1);
    return pieces2.some(piece => !set1.has(piece));
  };

  // Helper function to compare winning positions arrays
  const _areWinningPositionsDifferent = (
    positions1: WinningPosition[] | undefined,
    positions2: WinningPosition[] | undefined
  ): boolean => {
    // If both are undefined, they're the same
    if (positions1 === undefined && positions2 === undefined) return false;
    // If one is undefined and the other isn't, they're different
    if (positions1 === undefined || positions2 === undefined) return true;
    // If lengths differ, they're different
    if (positions1.length !== positions2.length) return true;
    // Compare each position
    return positions1.some((pos1, idx) => {
      const pos2 = positions2[idx];
      return pos1.row !== pos2.row || pos1.col !== pos2.col;
    });
  };
  
  // Use the functions to prevent unused variable warnings
  void _areBoardsDifferent;
  void _areAvailablePiecesDifferent;
  void _areWinningPositionsDifferent;

  // Helper function to normalize availablePieces from Firebase
  // Firebase may convert arrays to objects, so we need to convert them back
  const normalizeAvailablePieces = useCallback((pieces: Piece[] | Record<string, Piece> | undefined): Piece[] => {
    if (!pieces) return [];
    if (Array.isArray(pieces)) return pieces;
    // If it's an object, convert it back to an array
    if (typeof pieces === 'object') {
      const result: Piece[] = [];
      for (const key in pieces) {
        if (Object.prototype.hasOwnProperty.call(pieces, key)) {
          result[parseInt(key, 10)] = pieces[key];
        }
      }
      return result.filter(p => p !== undefined);
    }
    return [];
  }, []);

  const handleBoardClick = useCallback(async (row: number, col: number) => {
    // Add bounds checking
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return;
    }
    
    // Variables to track if we need to sync to Firebase
    let shouldSync = false;
    let roomIdToSync = '';
    let stateToSync: GameState | null = null;
    
    // Set the pending flag BEFORE updating state to prevent race conditions
    // This ensures Firebase listener won't overwrite our local change before it's synced
    const isOnlineMode = gameState.gameMode === 'online' && gameState.onlineRoom;
    if (isOnlineMode) {
      pendingFirebaseWriteRef.current = true;
    }
    
    setGameState(prevState => {
      // In vs-AI mode, prevent player from placing when AI is processing
      if (prevState.gameMode === 'vs-ai' && aiProcessingRef.current) {
        return prevState;
      }

      if (prevState.gameOver || prevState.currentPiece === null || !isPositionEmpty(prevState.board, row, col)) {
        return prevState;
      }

      // In online mode, only allow the current player to place
      if (prevState.gameMode === 'online' && prevState.onlineRoom && 
          prevState.currentPlayer !== prevState.onlineRoom.playerNumber) {
        return prevState;
      }

      const newBoard = placePiece(prevState.board, row, col, prevState.currentPiece);
      const winningPositions = checkVictory(newBoard, prevState.victoryOptions);
      const hasWon = winningPositions !== null;
      const newAvailablePieces = prevState.availablePieces.filter(p => p !== prevState.currentPiece);

      const newState = {
        ...prevState,
        board: newBoard,
        availablePieces: newAvailablePieces,
        currentPiece: null,
        // Don't switch player - the same player who placed will choose the next piece for the opponent
        winner: hasWon ? prevState.currentPlayer : null,
        gameOver: hasWon || newAvailablePieces.length === 0,
        winningPositions: winningPositions || undefined,
      };

      // In online mode, prepare to sync the full game state to Firebase
      // This ensures both players see the same authoritative state
      if (prevState.gameMode === 'online' && prevState.onlineRoom) {
        shouldSync = true;
        roomIdToSync = prevState.onlineRoom.roomId;
        stateToSync = newState;
      }

      return newState;
    });

    // Sync to Firebase after state update
    // This prevents race conditions where actions could overwrite each other
    if (shouldSync && stateToSync) {
      try {
        await updateGameState(roomIdToSync, stateToSync);
      } catch (error) {
        console.error('Failed to sync game state to Firebase:', error);
      } finally {
        // Reset the flag whether sync succeeds or fails
        if (isOnlineMode) {
          pendingFirebaseWriteRef.current = false;
        }
      }
    } else {
      // Reset the flag if we decided not to sync (e.g., action was invalid)
      if (isOnlineMode) {
        pendingFirebaseWriteRef.current = false;
      }
    }
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
            const winningPositions = checkVictory(newBoard, prevState.victoryOptions);
            const hasWon = winningPositions !== null;
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
              winningPositions: winningPositions || undefined,
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

  /**
   * Handle piece selection by a player.
   * In Quarto, the current player selects a piece for the opponent to place.
   * 
   * In online mode, this immediately syncs the selected piece to Firebase
   * so both players see the same game state in real-time.
   */
  const handlePieceSelection = async (piece: Piece) => {
    if (gameState.gameOver || gameState.currentPiece !== null) return;

    // In vs-AI mode, prevent player from selecting when AI is processing
    if (gameState.gameMode === 'vs-ai' && aiProcessingRef.current) {
      if (DEBUG_GAME_ACTIONS) console.log(`[PieceSelection] Blocked - AI is processing`);
      return;
    }

    // In vs-AI mode, prevent player from selecting when AI should choose
    if (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 2 && gameState.currentPiece === null) {
      if (DEBUG_GAME_ACTIONS) console.log(`[PieceSelection] Blocked - AI will choose the piece`);
      return;  // AI will choose the piece for the player
    }

    // In online mode, only allow the current player to select
    if (gameState.gameMode === 'online' && gameState.onlineRoom && 
        gameState.currentPlayer !== gameState.onlineRoom.playerNumber) {
      if (DEBUG_GAME_ACTIONS) console.log(`[PieceSelection] Blocked - Not this player's turn (current: ${gameState.currentPlayer}, you are: ${gameState.onlineRoom.playerNumber})`);
      return;
    }

    if (DEBUG_GAME_ACTIONS) {
      console.log(`[PieceSelection] Player ${gameState.currentPlayer} selecting piece ${piece} for player ${gameState.currentPlayer === 1 ? 2 : 1}`);
      console.log(`[PieceSelection] Game mode: ${gameState.gameMode}, Online room:`, gameState.onlineRoom);
    }

    // Set the pending flag BEFORE updating state to prevent race conditions
    const isOnlineMode = gameState.gameMode === 'online' && gameState.onlineRoom;
    const onlineRoomId = gameState.onlineRoom?.roomId;
    if (isOnlineMode && onlineRoomId) {
      pendingFirebaseWriteRef.current = true;
    }

    const newState = {
      ...gameState,
      currentPiece: piece,
      currentPlayer: (gameState.currentPlayer === 1 ? 2 : 1) as 1 | 2,  // Switch player - the other player will place the piece
    };

    setGameState(newState);

    // In online mode, sync the full game state to Firebase
    // This ensures both players see the same authoritative state
    if (isOnlineMode && onlineRoomId) {
      try {
        if (DEBUG_GAME_ACTIONS) console.log(`[PieceSelection] Syncing piece ${piece} to Firebase for room ${onlineRoomId}`);
        // Update the full game state for reliable synchronization
        await updateGameState(onlineRoomId, newState);
        if (DEBUG_GAME_ACTIONS) console.log(`[PieceSelection] Successfully synced piece selection to Firebase`);
      } catch (error) {
        console.error('Failed to sync game state to Firebase:', error);
      } finally {
        pendingFirebaseWriteRef.current = false;
      }
    } else {
      if (DEBUG_GAME_ACTIONS) console.log(`[PieceSelection] Skipping Firebase sync - not in online mode or no room info`);
    }
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

  const handleReturnHome = () => {
    // Clean up online room if active
    if (gameState.gameMode === 'online' && gameState.onlineRoom) {
      // Fire and forget - we're leaving anyway
      leaveRoom(gameState.onlineRoom.roomId, gameState.onlineRoom.playerNumber).catch((error) => {
        console.error('Error leaving room:', error);
      });
    }
    if (pollingCleanupRef.current) {
      pollingCleanupRef.current();
      pollingCleanupRef.current = null;
    }
    if (gameStartPollingCleanupRef.current) {
      gameStartPollingCleanupRef.current();
      gameStartPollingCleanupRef.current = null;
    }
    setGameMode(null);
    setShowOnlineSetup(false);
    setShowOptionsScreen(false);
    setWaitingForOpponent(false);
    setIsRoomHost(false);
    setRoomId('');
  };

  const handleCreateRoom = async () => {
    const newRoomId = await createRoom();
    setRoomId(newRoomId);
    setWaitingForOpponent(true);
    setIsRoomHost(true); // Mark this player as the host
    
    // Start polling for opponent
    const cleanup = startPolling(newRoomId, async () => {
      if (await areBothPlayersConnected(newRoomId)) {
        // Stop polling for opponent since both players are now connected
        cleanup();
        pollingCleanupRef.current = null;
        
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
      
      // Start polling for game start (similar to how host polls for opponent)
      if (DEBUG_GAME_ACTIONS) console.log('[Online] Player 2: Setting up Firebase listener for game start');
      const cleanup = startPolling(trimmedRoomId, (roomData) => {
        // Prevent processing if already joined
        // This is a defensive check in case the listener fires between setting
        // gameJoinedRef and the cleanup() call completing
        if (gameJoinedRef.current) {
          if (DEBUG_GAME_ACTIONS) console.log('[Online] Player 2: Ignoring update - already joined game');
          return;
        }
        
        if (DEBUG_GAME_ACTIONS) {
          console.log('[Online] Player 2: Firebase listener fired, checking game state:', {
            hasGameState: !!roomData.gameState,
            gameMode: roomData.gameState?.gameMode,
            hasBoard: !!roomData.gameState?.board,
          });
        }
        
        // Check if the game has been started by the host
        // We only need to check if gameState exists and gameMode is 'online'
        // The board should always exist if gameState exists because:
        // 1. handleStartOnlineGame creates gameState with an initialized board
        // 2. updateGameState preserves all fields except onlineRoom
        // 3. normalizeBoard handles any Firebase serialization issues
        if (roomData.gameState && roomData.gameState.gameMode === 'online') {
          if (DEBUG_GAME_ACTIONS) console.log('[Online] Player 2: Game has started! Joining game...');
          
          // Mark as joined to prevent duplicate processing
          gameJoinedRef.current = true;
          
          // Stop polling for game start
          cleanup();
          gameStartPollingCleanupRef.current = null;
          
          // Game has started, automatically join
          // In online mode, host is always player 1, non-host is always player 2
          const playerNumber: 1 | 2 = 2;
          
          // Update the room info ref BEFORE changing state
          onlineRoomInfoRef.current = { roomId: trimmedRoomId, playerNumber };
          
          if (DEBUG_GAME_ACTIONS) console.log('[Online] Player 2: Redirecting to game screen');
          // Set initial state FIRST, then start polling
          setShowOptionsScreen(false);
          setGameState({
            ...roomData.gameState,
            board: normalizeBoard(roomData.gameState.board),
            onlineRoom: {
              roomId: trimmedRoomId,
              playerNumber: playerNumber,
              isHost: false,
            },
          });
          
          // Set up game state polling AFTER setting initial state
          startGameStatePolling(trimmedRoomId);
          if (DEBUG_GAME_ACTIONS) console.log('[Online] Player 2: Successfully joined game');
        }
      });
      gameStartPollingCleanupRef.current = cleanup;
    } else {
      alert('Impossible de rejoindre cette salle. Elle n\'existe pas ou est déjà pleine.');
    }
  };

  // Helper function to start polling for game state updates
  const startGameStatePolling = useCallback((roomId: string) => {
    if (pollingCleanupRef.current) {
      pollingCleanupRef.current();
    }
    
    const cleanup = startPolling(roomId, (roomData) => {
      try {
        // Sync from the full game state in Firebase
        // This ensures both players always see the same authoritative state
        if (DEBUG_FIREBASE_SYNC) {
          console.log('[StateSync] Firebase callback triggered, checking conditions:', {
            hasGameState: !!roomData.gameState,
            hasBoard: !!roomData.gameState?.board,
            boardType: typeof roomData.gameState?.board,
            pendingWrite: pendingFirebaseWriteRef.current,
          });
        }
        
        // Skip Firebase updates if we have a pending write to prevent race conditions
        // This ensures local changes aren't overwritten by stale Firebase data
        if (pendingFirebaseWriteRef.current) {
          if (DEBUG_FIREBASE_SYNC) {
            console.log('[StateSync] ⏭️ Skipping Firebase update - pending write in progress');
          }
          return;
        }
        
        // Check if gameState exists - we don't check board here because normalizeBoard
        // can handle missing/malformed boards and return a valid empty board
        if (roomData.gameState) {
          if (DEBUG_FIREBASE_SYNC) console.log('[StateSync] Firebase update received, processing...');
          const remoteState = roomData.gameState!;
          
          // Log remote board content for debugging
          if (DEBUG_FIREBASE_SYNC) {
            const normalizedRemoteBoard = remoteState.board ? normalizeBoard(remoteState.board) : null;
            console.log('[StateSync] Remote state:', {
              currentPiece: remoteState.currentPiece,
              currentPlayer: remoteState.currentPlayer,
              availablePieces: remoteState.availablePieces?.length,
              gameOver: remoteState.gameOver,
              hasBoard: !!remoteState.board,
              boardType: Array.isArray(remoteState.board) ? 'array' : typeof remoteState.board,
              boardFilledCells: normalizedRemoteBoard ? normalizedRemoteBoard.flat().filter(cell => cell !== null).length : 0
            });
            console.log('[StateSync] Remote board:');
            console.log(formatBoardForLogging(normalizedRemoteBoard));
          }
          
          setGameState(prevState => {
            if (DEBUG_FIREBASE_SYNC) console.log('[StateSync] Previous state:', {
              currentPiece: prevState.currentPiece,
              currentPlayer: prevState.currentPlayer,
              availablePieces: prevState.availablePieces?.length,
              gameOver: prevState.gameOver,
              hasBoard: !!prevState.board,
              boardFilledCells: prevState.board?.flat().filter(cell => cell !== null).length
            });
            
            // Normalize the board to ensure it's a proper 2D array
            const normalizedBoard = normalizeBoard(remoteState.board);
            
            // In online mode, Firebase is the source of truth
            // Use remote values directly, only falling back to prevState if remote value is truly missing
            // Note: null is a valid value (e.g., currentPiece can be null when no piece is selected)
            // Use 'in' operator to check if property exists in the object (handles null/undefined correctly)
            const availablePieces = 'availablePieces' in remoteState 
              ? normalizeAvailablePieces(remoteState.availablePieces)
              : prevState.availablePieces;
            const currentPiece = 'currentPiece' in remoteState ? remoteState.currentPiece : prevState.currentPiece;
            const currentPlayer = 'currentPlayer' in remoteState ? remoteState.currentPlayer : prevState.currentPlayer;
            const winner = 'winner' in remoteState ? remoteState.winner : prevState.winner;
            const gameOver = 'gameOver' in remoteState ? remoteState.gameOver : prevState.gameOver;
            const winningPositions = 'winningPositions' in remoteState ? remoteState.winningPositions : prevState.winningPositions;
            const victoryOptions = 'victoryOptions' in remoteState ? remoteState.victoryOptions : prevState.victoryOptions;
            
            // Always update to ensure UI stays in sync with Firebase
            // Firebase is the authoritative source of truth in online mode
            if (DEBUG_FIREBASE_SYNC) {
              console.log('[StateSync] ✅ Applying Firebase state to UI...');
              console.log('[StateSync] New state values:', {
                currentPiece,
                currentPlayer,
                availablePiecesLength: availablePieces?.length,
                gameOver,
                boardFilledCells: normalizedBoard.flat().filter(cell => cell !== null).length
              });
            }
            
            const newState: GameState = { 
              ...prevState,
              board: normalizedBoard,
              availablePieces,
              currentPiece,
              currentPlayer,
              winner,
              gameOver,
              winningPositions,
              gameMode: 'online', // Ensure gameMode is set
              onlineRoom: prevState.onlineRoom, // Preserve connection info
              victoryOptions, // Sync victory options from host
            };
            
            if (DEBUG_FIREBASE_SYNC) console.log('[StateSync] Returning new state object');
            return newState;
          });
        } else {
          if (DEBUG_FIREBASE_SYNC) {
            console.log('[StateSync] ⚠️ Skipping state update - no gameState in roomData');
          }
        }
      } catch (error) {
        console.error('Error syncing game state from Firebase:', error);
      }
    });
    pollingCleanupRef.current = cleanup;
  }, [normalizeAvailablePieces]);

  const handleStartOnlineGame = async () => {
    setShowOptionsScreen(false);
    const playerNumber: 1 | 2 = isRoomHost ? 1 : 2;
    
    if (DEBUG_GAME_ACTIONS) console.log(`[Online] Player ${playerNumber}: Starting online game`);
    
    // Set the pending flag BEFORE updating state to prevent race conditions
    pendingFirebaseWriteRef.current = true;
    
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
    
    try {
      // Update the game state in the room to notify the other player
      // Await this to ensure state is written to Firebase before we start polling
      if (DEBUG_GAME_ACTIONS) console.log(`[Online] Player ${playerNumber}: Syncing game state to Firebase`);
      await updateGameState(roomId, newGameState);
      if (DEBUG_GAME_ACTIONS) console.log(`[Online] Player ${playerNumber}: Successfully synced game state to Firebase`);
    } catch (error) {
      console.error('Failed to sync initial game state to Firebase:', error);
      // Continue anyway - the game will start locally and polling will sync subsequent moves
      // Note: If this fails, the opponent may not see the initial game state
    } finally {
      pendingFirebaseWriteRef.current = false;
    }
    
    // Start polling for game updates (after Firebase write completes or fails)
    startGameStatePolling(roomId);
    
    // Update the room info ref
    onlineRoomInfoRef.current = { roomId, playerNumber };
    if (DEBUG_GAME_ACTIONS) console.log(`[Online] Player ${playerNumber}: Online game started successfully`);
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

  const handleStartGame = () => {
    if (gameMode === 'online') {
      handleStartOnlineGame().catch((error) => {
        console.error('Unexpected error starting online game:', error);
      });
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
        <Header onModeSelect={handleModeSelection} showNavigation={true} />
        <div className="flex-1 p-4 sm:p-8 flex items-center justify-center">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-center text-gray-700 mb-6 sm:mb-8">
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
        <Header onHomeClick={handleReturnHome} showNavigation={true} />
        <div className="flex-1 p-4 sm:p-8 flex items-center justify-center">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-center text-gray-700 mb-6 sm:mb-8">
              Jouer en ligne
            </h2>
          
          {waitingForOpponent ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-base sm:text-lg text-gray-700 mb-4">
                  Partagez ce code avec votre adversaire :
                </p>
                <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-green-600 tracking-widest mb-4">
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-xl sm:text-2xl tracking-widest uppercase focus:border-green-600 focus:outline-none"
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
        <Header onHomeClick={handleReturnHome} onModeSelect={handleModeSelection} showNavigation={true} />
        <div className="flex-1 p-4 sm:p-8 flex items-center justify-center">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-center text-gray-700 mb-6 sm:mb-8">
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
                  if (gameStartPollingCleanupRef.current) {
                    gameStartPollingCleanupRef.current();
                    gameStartPollingCleanupRef.current = null;
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
            {canModifyOptions ? (
              <button
                onClick={handleStartGame}
                disabled={!isValidConfiguration}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Commencer la partie
              </button>
            ) : (
              <div className="flex-1 px-6 py-3 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center">
                <span className="animate-pulse">En attente de l'hôte...</span>
              </div>
            )}
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
      <Header onHomeClick={handleReturnHome} onModeSelect={handleModeSelection} showNavigation={true} />
      <div className="flex-1 p-4 sm:p-8">
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
        <div className="text-center mb-4 sm:mb-8">
          {gameState.gameOver ? (
            <div className="space-y-2">
              {gameState.winner ? (
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">
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
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-600">
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
                    <p className="text-lg sm:text-2xl font-semibold text-gray-700">
                      {playerName}
                    </p>
                    <p className="text-sm sm:text-lg text-gray-600">
                      {getInstructionMessage(actingPlayer, gameState.currentPiece !== null)}
                    </p>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Board */}
          <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 text-center">
              Plateau
            </h2>
            <div className="grid grid-cols-4 gap-1 sm:gap-2">
              {normalizeBoard(gameState.board).flatMap((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  // Check if this position is a winning position
                  const isWinningPosition = gameState.winningPositions?.some(
                    pos => pos.row === rowIndex && pos.col === colIndex
                  ) || false;
                  
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleBoardClick(rowIndex, colIndex)}
                      className={`
                        aspect-square border-2 border-gray-400 rounded-lg
                        flex items-center justify-center
                        ${cell === null && gameState.currentPiece !== null && !gameState.gameOver
                          ? 'bg-amber-100 hover:bg-amber-200 cursor-pointer'
                          : 'bg-amber-50'
                        }
                        transition-colors
                      `}
                    >
                      {cell !== null && <PieceComponent piece={cell} disabled highlighted={isWinningPosition} />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Available Pieces */}
          <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 text-center">
              Pièces disponibles
            </h2>
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              {generateAllPieces().map(piece => {
                const isAvailable = gameState.availablePieces.includes(piece);
                return (
                  <div
                    key={piece}
                    className="flex items-center justify-center p-2"
                  >
                    {isAvailable ? (
                      <PieceComponent
                        piece={piece}
                        onClick={() => handlePieceSelection(piece)}
                        selected={gameState.currentPiece === piece}
                        disabled={
                          (gameState.currentPiece !== null && gameState.currentPiece !== piece) || 
                          gameState.gameOver ||
                          (gameState.gameMode === 'vs-ai' && gameState.currentPlayer === 2 && gameState.currentPiece === null)
                        }
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-16 sm:h-16"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rules */}
        <div className="mt-6 sm:mt-8 bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">Règles du jeu</h3>
          <ul className="space-y-2 text-sm sm:text-base text-gray-600">
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

