# CLAUDE.md — Quarto Game

This file provides essential context for AI assistants working on the Quarto codebase.

## Project Overview

Quarto is a React + TypeScript web implementation of the [Quarto board game](https://en.wikipedia.org/wiki/Quarto_(board_game)). Players take turns placing pieces on a 4×4 board, where each piece has 4 binary attributes. The goal is to create a line (row, column, diagonal) or 2×2 square where all 4 pieces share at least one common attribute.

**Key features:**
- Two-player local mode
- vs-AI mode
- Online real-time multiplayer (Firebase Realtime Database)
- French/English i18n support
- SSO/OAuth2 authentication backend (Vercel serverless)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 19.x |
| Language | TypeScript | ~5.9 (strict) |
| Build Tool | Vite | 7.x |
| Styling | Tailwind CSS | 4.x |
| Backend | Express.js (Vercel serverless) | 5.x |
| Real-time DB | Firebase Realtime Database | 12.x |
| HTTP Client | Axios | 1.x |
| Linting | ESLint | 9.x (flat config) |

---

## Repository Structure

```
Quarto/
├── api/                        # Backend (Vercel serverless functions)
│   ├── auth.ts                 # Main auth entry point
│   ├── routes/
│   │   └── authRoutes.ts       # OAuth2 route handlers (login, callback, userinfo, refresh)
│   └── services/
│       └── ssoService.ts       # SSO token exchange and user info fetching
├── src/                        # Frontend React application
│   ├── main.tsx                # React entry point
│   ├── App.tsx                 # Root component — auth flow, view routing
│   ├── Game.tsx                # Core game component (largest file, ~55KB)
│   ├── Header.tsx              # Navigation and game mode selection
│   ├── Footer.tsx              # Footer
│   ├── Profile.tsx             # Authenticated user profile view
│   ├── Stats.tsx               # Leaderboard and global stats view
│   ├── User.tsx                # Individual user profile view
│   ├── PieceComponent.tsx      # Game piece visual rendering
│   ├── gameLogic.ts            # Board logic, win conditions, piece validation
│   ├── aiLogic.ts              # AI opponent strategy
│   ├── onlineLogic.ts          # Firebase real-time multiplayer sync
│   ├── firebaseConfig.ts       # Firebase init, game result saving, leaderboard queries
│   ├── types.ts                # Shared TypeScript type definitions
│   ├── translations.ts         # i18n strings (FR/EN)
│   ├── LanguageContext.tsx     # React context for language switching
│   └── index.css               # Global CSS (Tailwind base)
├── public/                     # Static assets (favicons, images)
├── index.html                  # HTML entry point
├── package.json
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── tailwind.config.js
├── eslint.config.js
├── vercel.json                 # Vercel deployment config + API rewrites
└── README.md                   # French-language user documentation
```

---

## Development Workflow

### Setup

```bash
npm install
```

Create a `.env` file in the project root with the required Firebase and SSO variables (see README.md for the full list of `VITE_*` variables).

### Common Commands

```bash
npm run dev       # Start Vite dev server with hot reload
npm run build     # TypeScript check + production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

### No tests currently exist

There is no test framework configured. If adding tests, use **Vitest** (Vite-native, compatible with the existing build setup).

---

## Architecture & Key Conventions

### Game Piece Representation

Each piece is a 4-bit integer (0–15). Each bit encodes one binary attribute:
- Bit 0: tall/short
- Bit 1: dark/light
- Bit 2: square/round
- Bit 3: hollow/solid

Win conditions are evaluated by checking if 4 placed pieces share at least one attribute using bitwise AND/OR operations. See `gameLogic.ts` for `checkWin()` and `getVictoryOptions()`.

### State Management

- All state is local React `useState` inside components — no Redux, Zustand, or other store.
- `Game.tsx` owns all game state (board, current piece, phase, scores, mode).
- `App.tsx` owns authentication state and current view (routing).

### Online Multiplayer Pattern

Online games use **action-based synchronization** via Firebase Realtime Database (`onlineLogic.ts`):
1. Each player pushes game actions (place piece, select piece) to a shared room path.
2. Actions include a `sequenceId` to prevent race conditions.
3. State is rebuilt from the action log on each update, not pushed as raw state.

### Authentication (SSO)

- Frontend initiates SSO login via redirect.
- Vercel serverless function at `/api/auth/*` handles OAuth2 code exchange (PKCE supported).
- After login, tokens are stored in state; the URL is immediately cleaned (`window.history.replaceState`) to remove tokens from the address bar.
- Token refresh is handled by `App.tsx` on page load.

### i18n

- Language is managed via `LanguageContext.tsx` (React context).
- All UI strings are in `translations.ts` — add new strings there for both `fr` and `en` keys.
- Default language: French.

### Environment Variables

Frontend variables use Vite's `import.meta.env.VITE_*` pattern. Backend/API variables use `process.env.*`. Never commit `.env` files.

---

## Code Style & TypeScript Rules

TypeScript is configured in strict mode with these extra checks (`tsconfig.app.json`):
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `erasableSyntaxOnly: true`

**ESLint** uses the new flat config format (`eslint.config.js`) with:
- `@eslint/js` recommended
- `typescript-eslint` recommended
- `eslint-plugin-react-hooks` recommended
- `eslint-plugin-react-refresh` for Vite HMR

**There is no Prettier.** Do not add Prettier config without discussion.

**Code comments** in this repo are primarily in French. Match the existing language when adding inline comments.

---

## Deployment

- **Platform**: Vercel
- **Trigger**: Only `main` branch deployments (enforced in `vercel.json`)
- **API routes**: `vercel.json` rewrites `/api/auth/:path*` → `/api/auth.ts`
- The frontend is a static SPA; the backend consists of serverless functions under `/api/`

---

## Debugging

Several files contain `DEBUG` flags (boolean constants) that enable verbose console logging:
- `Game.tsx`: `const DEBUG = false`
- `aiLogic.ts`: `const DEBUG = false`
- `onlineLogic.ts`: `const DEBUG = false`

Set to `true` locally during development; never commit with `DEBUG = true`.

---

## Known Architecture Notes

- **`Game.tsx` is very large (~55KB).** It handles all three game modes (local, AI, online) in a single component. Be cautious about adding more logic here; prefer extracting into `gameLogic.ts`, `aiLogic.ts`, or `onlineLogic.ts`.
- **No CI/CD pipeline exists.** Run `npm run lint` and `npm run build` manually before pushing.
- **Firebase security rules** are permissive in development (see README). Do not deploy to production without tightening them.
- **No pre-commit hooks.** Lint and build checks are manual responsibilities.
