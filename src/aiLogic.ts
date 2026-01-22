import type { Board, Piece, VictoryOptions } from './types';
import { BOARD_SIZE } from './types';

// =============================================================================
// 1. UTILITAIRES DE BASE (Helpers)
// =============================================================================

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
 * Récupère les pièces qui ne sont pas encore sur le plateau.
 * (Exclut la pièce actuellement en main)
 */
const getRemainingReserve = (board: Board, pieceInHand: Piece): Piece[] => {
  const usedIds = new Set<number>();
  
  // On marque la pièce en main comme utilisée
  const pId = typeof pieceInHand === 'object' ? (pieceInHand as any).id : pieceInHand;
  usedIds.add(pId);

  // On marque les pièces du plateau comme utilisées
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) {
        const p = board[r][c];
        usedIds.add(typeof p === 'object' ? (p as any).id : p as any);
      }
    }
  }

  // On reconstruit la réserve avec ce qui reste (0 à 15)
  const available: any[] = [];
  for (let i = 0; i < 16; i++) {
    if (!usedIds.has(i)) {
      available.push({ id: i }); // Adapte selon ta structure d'objet Piece
    }
  }
  return available;
};

/**
 * Vérifie si une liste de pièces a un attribut commun (Condition de victoire)
 */
const hasCommonAttributeInList = (pieces: Piece[]): boolean => {
  if (pieces.length === 0) return false;
  const mask = 15; // 1111 en binaire
  const ids = pieces.map(p => (typeof p === 'object' ? (p as any).id : p));
  const commonOnes = ids.reduce((acc, id) => acc & id, mask);
  const commonZeros = ids.reduce((acc, id) => acc & (~id & mask), mask);
  return (commonOnes > 0) || (commonZeros > 0);
};

// =============================================================================
// 2. LOGIQUE DE VICTOIRE (Simulation)
// =============================================================================

const checkWinningLine = (board: Board, row: number, col: number, victoryOptions: VictoryOptions): boolean => {
  const check = (arr: (Piece | null)[]) => {
    if (arr.some(x => x === null)) return false;
    return hasCommonAttributeInList(arr as Piece[]);
  };

  if (victoryOptions.lines) {
    // Ligne
    if (check(board[row])) return true;
    // Colonne
    const colPieces = [board[0][col], board[1][col], board[2][col], board[3][col]];
    if (check(colPieces)) return true;
    // Diagonales
    if (row === col && check([board[0][0], board[1][1], board[2][2], board[3][3]])) return true;
    if (row + col === 3 && check([board[0][3], board[1][2], board[2][1], board[3][0]])) return true;
  }
  
  if (victoryOptions.squares) {
    const startRow = Math.max(0, row - 1);
    const endRow = Math.min(BOARD_SIZE - 2, row); // BOARD_SIZE - 2 car un carré commence au max à l'avant-dernière ligne
    
    const startCol = Math.max(0, col - 1);
    const endCol = Math.min(BOARD_SIZE - 2, col);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const squarePieces = [
          board[r][c],       // Haut-Gauche
          board[r][c+1],     // Haut-Droite
          board[r+1][c],     // Bas-Gauche
          board[r+1][c+1]    // Bas-Droite
        ];
        
        if (check(squarePieces)) return true;
      }
    }
  }
  return false;
};

/**
 * Vérifie si placer 'piece' en (row, col) fait gagner
 */
const wouldWin = (board: Board, row: number, col: number, piece: Piece, victoryOptions: VictoryOptions): boolean => {
  board[row][col] = piece; // Pose temporaire
  const win = checkWinningLine(board, row, col, victoryOptions);
  board[row][col] = null;  // Nettoyage
  return win;
};

// =============================================================================
// 3. COEUR DE L'IA (Thinking Process)
// =============================================================================

const calculateOffensiveScore = (board: Board, row: number, col: number, piece: Piece, victoryOptions: VictoryOptions): number => {
  let score = 0;
  
  // Fonction interne pour vérifier si une ligne virtuelle a des points communs
  const checkLinePotential = (arr: (Piece | null)[]) => {
      // On filtre pour ne garder que les pièces posées (y compris celle qu'on simule)
      const pieces = arr.filter(p => p !== null) as Piece[];
      // S'il y a moins de 2 pièces, pas d'alignement possible
      if (pieces.length < 2) return 0;
      
      // Si elles ont un point commun, c'est une bonne ligne !
      if (hasCommonAttributeInList(pieces)) {
          // Bonus exponentiel : aligner 3 pièces vaut beaucoup plus que 2
          return pieces.length === 3 ? 50 : 10; 
      }
      return 0;
  };

  // On simule la présence de la pièce sur le plateau temporairement pour le calcul
  // (Note: board[row][col] est déjà défini dans la boucle principale, donc on peut lire directement)
  
  if (victoryOptions.lines) {
      // Ligne
      score += checkLinePotential(board[row]);
      // Colonne
      const colPieces = [board[0][col], board[1][col], board[2][col], board[3][col]];
      score += checkLinePotential(colPieces);
      // Diagonales
      if (row === col) score += checkLinePotential([board[0][0], board[1][1], board[2][2], board[3][3]]);
      if (row + col === 3) score += checkLinePotential([board[0][3], board[1][2], board[2][1], board[3][0]]);
  }
  
  // (Optionnel) Tu peux ajouter la gestion des carrés ici

  return score;
};

/**
 * Calcule un "Score d'alignement" (Heuristique).
 * Sert uniquement à départager deux coups qui ont la même sûreté.
 * Favorise les coups qui alignent 2 ou 3 pièces.
 */
const calculateAlignmentBonus = (board: Board, row: number, col: number): number => {
    let bonus = 0;
    // On regarde juste les voisins pour faire simple et rapide
    const directions = [[0,1], [1,0], [1,1], [1,-1]];
    
    // Si poser la pièce crée un alignement de 3, c'est un bon bonus offensif
    // (Implémentation simplifiée pour la lisibilité)
    return Math.random(); // Pour l'instant, un aléatoire suffit pour ne pas être robotique
};

/**
 * FONCTION PRINCIPALE : Choisir où poser la pièce
 */
export const aiChoosePosition = (
  board: Board,
  pieceToPlace: Piece,
  victoryOptions: VictoryOptions = { lines: true, squares: false }
): { row: number; col: number } => {
  
  const emptyPositions = getEmptyPositions(board);
  
  let bestMove = emptyPositions[0];
  let maxScore = -Infinity;

  // On teste CHAQUE case vide
  for (const pos of emptyPositions) {
    let currentScore = 0;

    // --- ETAPE A : Test de victoire immédiate ---
    if (wouldWin(board, pos.row, pos.col, pieceToPlace, victoryOptions)) {
      return pos; // Victoire trouvée, on joue immédiatement !
    }

    // --- ETAPE B : Simulation du futur (Lookahead) ---
    // 1. On simule la pose de la pièce
    board[pos.row][pos.col] = pieceToPlace;

    // 2. On récupère la liste des pièces qui resteront dans la réserve
    const remainingReserve = getRemainingReserve(board, pieceToPlace);

    // 3. On compte combien de pièces sont "Sûres" à donner à l'adversaire
    // Une pièce est sûre si l'adversaire ne peut PAS gagner immédiatement avec.
    let safePiecesCount = 0;
    const nextEmptyPositions = getEmptyPositions(board); // Cases restantes après mon coup

    if (nextEmptyPositions.length === 0) {
        // Match nul ou fin de partie
        safePiecesCount = 0;
    } else {
        for (const reservePiece of remainingReserve) {
            let doesMakeOpponentWin = false;
            // L'adversaire peut-il gagner avec cette pièce 'reservePiece' ?
            for (const nextPos of nextEmptyPositions) {
                if (wouldWin(board, nextPos.row, nextPos.col, reservePiece, victoryOptions)) {
                    doesMakeOpponentWin = true;
                    break; 
                }
            }
            if (!doesMakeOpponentWin) {
                safePiecesCount++;
            }
        }
    }

    // --- ETAPE C : Attribution du Score ---
    
    if (safePiecesCount === 0 && remainingReserve.length > 0) {
        // CATASTROPHE : Peu importe la pièce que je donne, l'adversaire gagne.
        // C'est un coup suicide.
        currentScore = -1000;
    } else {
        // // Le score est principalement le nombre d'options de survie.
        // // Plus j'ai de choix de pièces sûres, mieux c'est.
        // currentScore = safePiecesCount * 10;
        
        // // Bonus pour départager (attaque / alignement)
        // currentScore += calculateAlignmentBonus(board, pos.row, pos.col);

        // 1. BASE DE SURVIE (Le plus important est d'avoir au moins 1 option)
        // Si on a au moins une pièce sûre, on est content (Base = 1000).
        // Avoir plus de pièces sûres n'apporte qu'un tout petit bonus (+ safePiecesCount).
        // Cela "aplatit" la différence entre bloquer (6 pièces sûres) et ne pas bloquer (5 pièces sûres).
        currentScore = 1000 + safePiecesCount;
        
        // 2. BONUS OFFENSIF
        // Maintenant, c'est l'attaque qui va faire la différence entre deux coups sûrs.
        const offensiveScore = calculateOffensiveScore(board, pos.row, pos.col, pieceToPlace, victoryOptions);
        currentScore += offensiveScore;
        
        // 3. PETIT ALÉATOIRE
        // Pour éviter que l'IA joue toujours au même endroit en début de partie
        currentScore += Math.random() * 5;
    }

    // 4. On annule la simulation (Backtracking)
    board[pos.row][pos.col] = null;

    // --- ETAPE D : Comparaison ---
    if (currentScore > maxScore) {
      maxScore = currentScore;
      bestMove = pos;
    }
  }

  return bestMove;
};

/**
 * FONCTION SECONDAIRE : Choisir quelle pièce donner à l'adversaire
 */
export const aiChoosePiece = (
  board: Board,
  availablePieces: Piece[],
  victoryOptions: VictoryOptions = { lines: true, squares: false }
): Piece => {
  const emptyPositions = getEmptyPositions(board);
  
  // On filtre : on ne garde que les pièces qui ne permettent PAS à l'adversaire de gagner
  const safePieces = availablePieces.filter(piece => {
    // Pour chaque case vide, on vérifie si cette pièce donne la victoire
    for (const pos of emptyPositions) {
      if (wouldWin(board, pos.row, pos.col, piece, victoryOptions)) {
        return false; // Pièce dangereuse !
      }
    }
    return true; // Pièce sûre
  });

  if (safePieces.length > 0) {
    // Si on a des pièces sûres, on en prend une au hasard (ou la plus complexe)
    console.log(`IA: J'ai le choix entre ${safePieces.length} pièces sûres.`);
    const randomIndex = Math.floor(Math.random() * safePieces.length);
    return safePieces[randomIndex];
  }

  // Si aucune pièce n'est sûre, on a probablement perdu. On donne au hasard.
  console.log("IA: Aïe, je suis obligée de donner une pièce gagnante.");
  const randomIndex = Math.floor(Math.random() * availablePieces.length);
  return availablePieces[randomIndex];
};