# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Instructions

Keep going until the job is completely solved before ending your turn.
If you're unsure about code or files, open them—do not hallucinate.
Plan thoroughly before every tool call and reflect on the outcome after.

## Commands

All commands run from the `frontend/` directory:

```bash
npm run dev          # Start Vite dev server (http://localhost:5173)
npm run build        # Type-check + build for production
npm run type-check   # Run vue-tsc type checking
npm run lint         # ESLint with auto-fix
npm run format       # Prettier formatting
```

## Architecture

This is a Vue 3 + TypeScript + Pinia idle game with two primary gameplay loops: an idle clicker and an auto-battle simulator.

### State Management (Pinia stores)

Three stores in `frontend/src/stores/` handle all game state:

- **gameStore.ts** — Core idle mechanics: `chimes` (primary currency), `meeps` (creatures), leveling (`10 * level^1.2` formula), skill points, ability levels (Q/W/E/R), universe prestige system, and the `tick()` function called every second
- **shopStore.ts** — Building upgrades (6 types with exponential cost scaling), bulk purchase logic (1x/5x/10x/max), and CPS analytics (1min/10min/1h history)
- **battleStore.ts** — Auto-battle simulation every 10s: ELO-based MMR (K=32), tier/division ranking (Iron→Challenger), 5v5 champion team simulation, LP/promotion logic, and in-game chat generation

Components communicate exclusively through stores — no direct parent/child prop drilling for game state.

### Component Structure

```
App.vue
├── GameCenterComponent (3 tabs)
│   ├── IdleGameComponent — clicker button, level/meep progress bars, universe progress
│   │   └── ShopComponent — building purchases
│   │   └── ChimesPerSecondModal — detailed CPS breakdown
│   ├── BattleResultComponent — 5v5 battle display, chat feed, auto-battle timer
│   └── ChampionLobbyComponent — team configuration
└── Bottom HUD: BardHudComponent, AbilityBarComponent, StatsPanelComponent
```

New modal/overlay components go in `frontend/src/components/`. Layout wrappers go in `frontend/src/components/layout/`. Vue composables go in `frontend/src/composables/`.

### Config Files

`frontend/src/config/` holds static game data:

- `universes.ts` — 10 prestige universes (League of Legends themed)
- `messages.ts` — Battle chat messages (~500 entries) and Bard title quotes (German)
- `numberFormat.ts` — `formatNumber()` converts large numbers to K/M/B/T shorthand (up to 1e30)

### Styling

Tailwind CSS v3 with a dark cosmic purple theme. Custom animations in `tailwind.config.js`: `blob`, `shimmer`, `twinkle`, `moveLeftStar`, `cosmicShift`, `spin-slow`, `fadeUpEnhanced`. Glassmorphism (backdrop-blur + transparency) is used throughout.

### Key Game Mechanics

- **Chime generation:** Manual clicks + passive CPS from buildings. Building costs scale as `baseCost × multiplier^level`.
- **Leveling:** Cumulative chimes required = `10 * level^1.2`. Every 2 levels grants 1 skill point for ability upgrades (max level 5 each).
- **Meeps:** Cost `20 * meeps^1.2` chimes each; contribute 100 combat power per meep to battles.
- **Battle ELO:** Win probability = `1 / (1 + 10^(-powerDiff/400))` ± 7.5% luck factor.
