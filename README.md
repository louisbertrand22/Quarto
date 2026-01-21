# Quarto - Jeu de stratégie

Quarto est un jeu de stratégie pour deux joueurs développé avec React, TypeScript et Vite. Le but est d'aligner 4 pièces ayant au moins une caractéristique commune.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
- npm (inclus avec Node.js)

## 🚀 Installation

1. Clonez le dépôt :
```bash
git clone https://github.com/louisbertrand22/Quarto.git
cd Quarto
```

2. Installez les dépendances :
```bash
npm install
```

## 🎮 Lancer le projet

### Mode développement

Pour lancer le serveur de développement avec rechargement automatique :

```bash
npm run dev
```

Le jeu sera accessible à l'adresse : `http://localhost:5173` (ou un autre port si celui-ci est occupé)

### Build de production

Pour créer une version optimisée pour la production :

```bash
npm run build
```

Les fichiers compilés seront dans le dossier `dist/`.

### Prévisualiser le build de production

Pour tester le build de production localement :

```bash
npm run preview
```

### Linter

Pour vérifier le code avec ESLint :

```bash
npm run lint
```

## 🎯 Règles du jeu

Quarto est un jeu de stratégie abstrait pour deux joueurs :

1. **Le joueur A choisit une pièce** pour le joueur B
2. **Le joueur B place la pièce** sur le plateau (grille 4x4)
3. **Le joueur B choisit ensuite une pièce** pour le joueur A
4. **Pour gagner** : aligner 4 pièces partageant au moins une caractéristique commune

### Modes de jeu

Le jeu propose trois modes de jeu :

- **🎮 Deux joueurs** : Mode local où deux joueurs jouent sur le même appareil
- **🤖 Contre l'IA** : Jouez contre une intelligence artificielle
- **🌐 En ligne** : Jouez contre un autre joueur en ligne
  - Créez une salle et partagez le code avec votre adversaire
  - Ou rejoignez une salle existante avec un code à 6 caractères

### Caractéristiques des pièces

Chaque pièce possède 4 attributs binaires :
- **Couleur** : claire ou foncée
- **Forme** : ronde ou carrée
- **Taille** : grande ou petite
- **Surface** : creuse ou pleine

Il y a donc 16 pièces uniques (2⁴ = 16 combinaisons).

### Conditions de victoire

Un joueur gagne s'il aligne 4 pièces (horizontalement, verticalement ou en diagonale) qui partagent au moins une caractéristique commune :
- Toutes de la même couleur
- Toutes de la même forme
- Toutes de la même taille
- Toutes avec la même surface (creuses ou pleines)

## 📁 Structure du projet

```
Quarto/
├── src/
│   ├── App.tsx              # Composant principal du jeu
│   ├── PieceComponent.tsx   # Composant d'affichage des pièces
│   ├── gameLogic.ts         # Logique du jeu (victoire, placement)
│   ├── aiLogic.ts           # Logique de l'IA
│   ├── onlineLogic.ts       # Logique multijoueur en ligne
│   ├── types.ts             # Types TypeScript
│   ├── main.tsx             # Point d'entrée React
│   └── index.css            # Styles globaux
├── public/                   # Ressources publiques
├── index.html               # Template HTML
├── package.json             # Dépendances et scripts
├── vite.config.ts           # Configuration Vite
├── tsconfig.json            # Configuration TypeScript
└── tailwind.config.js       # Configuration Tailwind CSS
```

## 🛠️ Technologies utilisées

- **React 19** - Bibliothèque UI
- **TypeScript** - Typage statique
- **Vite** - Build tool et serveur de développement
- **Tailwind CSS** - Framework CSS utilitaire
- **ESLint** - Linter pour la qualité du code

## 📝 Développement

Le projet utilise :
- **React avec hooks** pour la gestion d'état
- **TypeScript strict** pour la sécurité des types
- **Tailwind CSS** pour le styling responsive
- **Opérations binaires** pour optimiser la logique du jeu

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

Ce projet est open source et disponible sous licence MIT.
