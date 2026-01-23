export type Language = 'fr' | 'en';

export interface Translations {
  // Header
  header: {
    title: string;
    subtitle: string;
    home: string;
    twoPlayer: string;
    vsAI: string;
    online: string;
    github: string;
  };
  
  // Footer
  footer: {
    aboutTitle: string;
    aboutDescription: string;
    quickLinksTitle: string;
    sourceCode: string;
    documentation: string;
    technologiesTitle: string;
    developedWith: string;
    by: string;
    license: string;
  };
  
  // Game modes
  gameModes: {
    twoPlayer: string;
    vsAI: string;
    online: string;
  };
  
  // Actions
  actions: {
    createRoom: string;
    joinRoom: string;
    victoryOptions: string;
    startGame: string;
    newGame: string;
    changeMode: string;
    back: string;
    join: string;
    or: string;
  };
  
  // Room/Online
  room: {
    roomCode: string;
    roomCodePlaceholder: string;
    hostOnlyOptions: string;
  };
  
  // Victory conditions
  victory: {
    linesLabel: string;
    linesDescription: string;
    squaresLabel: string;
    squaresDescription: string;
    selectAtLeastOne: string;
    linesDetail: string;
    squaresDetail: string;
  };
  
  // Game status
  status: {
    aiChoosing: string;
    choosePieceForAI: string;
    choosePieceForOpponent: string;
    aiPlacing: string;
    placePiece: string;
    waitingForHost: string;
  };
  
  // Players
  players: {
    you: string;
    opponent: string;
    ai: string;
    player: string;
  };
  
  // Instructions
  instructions: {
    chooseGameMode: string;
    playOnline: string;
    rulesTitle: string;
    playerAChooses: string;
    playerBPlaces: string;
    playerBChooses: string;
    toWin: string;
  };
  
  // Results
  results: {
    draw: string;
    aiWon: string;
    youWon: string;
    opponentWon: string;
    playerWon: string;
  };
  
  // Alerts
  alerts: {
    roomCodeLength: string;
    cannotJoinRoom: string;
  };
}

export const translations: Record<Language, Translations> = {
  fr: {
    header: {
      title: 'Quarto',
      subtitle: 'Jeu de stratégie',
      home: 'Accueil',
      twoPlayer: 'Deux joueurs',
      vsAI: 'Contre l\'IA',
      online: 'En ligne',
      github: 'GitHub',
    },
    footer: {
      aboutTitle: 'À propos de Quarto',
      aboutDescription: 'Un jeu de stratégie abstrait pour deux joueurs. Alignez 4 pièces avec au moins une caractéristique commune pour gagner !',
      quickLinksTitle: 'Liens rapides',
      sourceCode: 'Code source',
      documentation: 'Documentation',
      technologiesTitle: 'Technologies',
      developedWith: 'Développé avec',
      by: 'par',
      license: 'Open source sous licence MIT',
    },
    gameModes: {
      twoPlayer: 'Deux joueurs',
      vsAI: 'Contre l\'IA',
      online: 'En ligne',
    },
    actions: {
      createRoom: 'Créer une salle',
      joinRoom: 'Rejoindre une salle',
      victoryOptions: 'Options de victoire',
      startGame: 'Commencer la partie',
      newGame: 'Nouvelle partie',
      changeMode: 'Changer de mode',
      back: '← Retour',
      join: 'Rejoindre',
      or: 'ou',
    },
    room: {
      roomCode: 'Code de la salle:',
      roomCodePlaceholder: 'Code de la salle (ex: ABC123)',
      hostOnlyOptions: 'Seul l\'hôte de la salle peut modifier les options de victoire',
    },
    victory: {
      linesLabel: 'Lignes (classique)',
      linesDescription: 'Gagnez en alignant 4 pièces sur une ligne (horizontale, verticale ou diagonale)',
      squaresLabel: 'Carrés 2×2',
      squaresDescription: 'Gagnez en formant un carré 2×2 avec 4 pièces ayant un attribut commun',
      selectAtLeastOne: 'Veuillez sélectionner au moins une condition de victoire',
      linesDetail: 'Lignes: horizontales, verticales ou diagonales',
      squaresDetail: 'Carrés 2×2: 4 pièces formant un carré',
    },
    status: {
      aiChoosing: 'L\'IA choisit une pièce pour vous...',
      choosePieceForAI: 'Choisissez une pièce pour l\'IA',
      choosePieceForOpponent: 'Choisissez une pièce pour l\'adversaire',
      aiPlacing: 'L\'IA place la pièce...',
      placePiece: 'Placez la pièce sur le plateau',
      waitingForHost: 'En attente de l\'hôte...',
    },
    players: {
      you: 'Vous',
      opponent: 'Adversaire',
      ai: 'IA',
      player: 'Joueur',
    },
    results: {
      draw: 'Match nul !',
      aiWon: 'L\'IA a gagné ! 🤖',
      youWon: 'Vous avez gagné ! 🎉',
      opponentWon: 'Votre adversaire a gagné ! 😔',
      playerWon: 'a gagné ! 🎉',
    },
    instructions: {
      chooseGameMode: 'Choisissez le mode de jeu',
      playOnline: 'Jouer en ligne',
      rulesTitle: 'Règles du jeu',
      playerAChooses: 'Le joueur A choisit une pièce pour le joueur B',
      playerBPlaces: 'Le joueur B place la pièce sur le plateau',
      playerBChooses: 'Le joueur B choisit ensuite une pièce pour le joueur A',
      toWin: 'Pour gagner : aligner 4 pièces avec au moins 1 attribut commun (couleur, forme, taille ou creux)',
    },
    alerts: {
      roomCodeLength: 'Le code de la salle doit contenir 6 caractères',
      cannotJoinRoom: 'Impossible de rejoindre cette salle. Elle n\'existe pas ou est déjà pleine.',
    },
  },
  en: {
    header: {
      title: 'Quarto',
      subtitle: 'Strategy Game',
      home: 'Home',
      twoPlayer: 'Two Players',
      vsAI: 'Vs AI',
      online: 'Online',
      github: 'GitHub',
    },
    footer: {
      aboutTitle: 'About Quarto',
      aboutDescription: 'An abstract strategy game for two players. Align 4 pieces with at least one common characteristic to win!',
      quickLinksTitle: 'Quick Links',
      sourceCode: 'Source Code',
      documentation: 'Documentation',
      technologiesTitle: 'Technologies',
      developedWith: 'Developed with',
      by: 'by',
      license: 'Open source under MIT license',
    },
    gameModes: {
      twoPlayer: 'Two Players',
      vsAI: 'Vs AI',
      online: 'Online',
    },
    actions: {
      createRoom: 'Create Room',
      joinRoom: 'Join Room',
      victoryOptions: 'Victory Options',
      startGame: 'Start Game',
      newGame: 'New Game',
      changeMode: 'Change Mode',
      back: '← Back',
      join: 'Join',
      or: 'or',
    },
    room: {
      roomCode: 'Room Code:',
      roomCodePlaceholder: 'Room code (e.g., ABC123)',
      hostOnlyOptions: 'Only the room host can modify victory options',
    },
    victory: {
      linesLabel: 'Lines (classic)',
      linesDescription: 'Win by aligning 4 pieces in a line (horizontal, vertical, or diagonal)',
      squaresLabel: '2×2 Squares',
      squaresDescription: 'Win by forming a 2×2 square with 4 pieces sharing a common attribute',
      selectAtLeastOne: 'Please select at least one victory condition',
      linesDetail: 'Lines: horizontal, vertical, or diagonal',
      squaresDetail: '2×2 Squares: 4 pieces forming a square',
    },
    status: {
      aiChoosing: 'AI is choosing a piece for you...',
      choosePieceForAI: 'Choose a piece for the AI',
      choosePieceForOpponent: 'Choose a piece for your opponent',
      aiPlacing: 'AI is placing the piece...',
      placePiece: 'Place the piece on the board',
      waitingForHost: 'Waiting for host...',
    },
    players: {
      you: 'You',
      opponent: 'Opponent',
      ai: 'AI',
      player: 'Player',
    },
    results: {
      draw: 'Draw!',
      aiWon: 'AI won! 🤖',
      youWon: 'You won! 🎉',
      opponentWon: 'Your opponent won! 😔',
      playerWon: 'won! 🎉',
    },
    instructions: {
      chooseGameMode: 'Choose game mode',
      playOnline: 'Play Online',
      rulesTitle: 'Game Rules',
      playerAChooses: 'Player A chooses a piece for Player B',
      playerBPlaces: 'Player B places the piece on the board',
      playerBChooses: 'Player B then chooses a piece for Player A',
      toWin: 'To win: align 4 pieces with at least 1 common attribute (color, shape, size, or hollow)',
    },
    alerts: {
      roomCodeLength: 'Room code must be 6 characters long',
      cannotJoinRoom: 'Unable to join this room. It doesn\'t exist or is already full.',
    },
  },
};
