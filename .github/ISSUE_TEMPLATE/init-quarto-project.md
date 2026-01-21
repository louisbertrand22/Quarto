---
name: "🚀 Init Quarto Project"
about: "Demander à l'IA d'initier la structure de base du jeu Quarto"
title: "[INIT] Setup Quarto Web App"
labels: enhancement
assignees: ''

---

## 📝 Project Description
Build a web-based version of the board game **Quarto** for my brother and me. 
As an EPITA student, I want the core logic to be based on **binary attributes**.

## 🛠 Technical Stack
- **Framework**: React.js (Vite)
- **Styling**: Tailwind CSS (for quick and clean UI)
- **Language**: TypeScript (preferred for the piece attribute logic)

## 🎲 Game Rules to Implement
1. **The Board**: 4x4 grid.
2. **The Pieces**: 16 unique pieces with 4 binary characteristics:
   - Color: Light / Dark
   - Shape: Round / Square
   - Size: Tall / Short
   - Top: Hollow / Solid
3. **The Gameplay**: 
   - Player A chooses a piece for Player B.
   - Player B places the piece on the board and then chooses a piece for Player A.
4. **Win Condition**: 4 pieces in a row (horizontal, vertical, or diagonal) sharing at least one common attribute.

## 💻 Requirements for Copilot
Please generate:
1. A `types.ts` file defining the `Piece` type using bitwise flags.
2. A `gameLogic.ts` file with a `checkVictory` function using bitwise operators (AND/OR).
3. A main React component displaying the board and the remaining pieces gallery.
4. Basic Tailwind CSS classes to distinguish pieces (e.g., rounded-full for circles, borders for hollows).

## 🌍 Language Note
- Comments and Variable names: **English** (to practice).
- UI Labels: **French** (for my brother).
