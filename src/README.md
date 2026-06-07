# Frontier

**Date:** 2026-06-07

Frontier is a narrative-driven survival game where players guide a pioneer across a perilous journey. This repository contains the core game engine, UI components, and state management.

## Project Structure

```
src/
├── App.tsx                # Main application component
├── audio/                 # Audio system (Howler.js)
├── engine/                # Game logic and state transitions
├── store/                 # Zustand store and game state
├── types/                 # TypeScript type definitions
├── ui/
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── layout/            # Layout components
│   └── overlays/          # Game screen overlays
└── utils/                 # Utility functions
```

## Core Systems

### Game State

The game state is managed using [Zustand](https://github.com/pmndrs/zustand) in `src/store/`. Key state slices include:
- Player status (health, morale, fatigue)
- Horse status (health, fatigue, lameness)
- Supplies inventory
- World state (biome, weather, distance traveled)
- Journey progress (days elapsed, waypoints)
- Encounters and decisions

### Daily Cycle

The game operates on a daily cycle with distinct phases:
1. **Morning Briefing** - Overview of current status
2. **Daily Decisions** - Choose pace, actions, and travel options
3. **Travel** - Journey progress and random encounters
4. **Camp** - Rest and resource management

### Auto-Player

The `initAutoPlayer()` system in `src/engine/auto-player.ts` provides automated gameplay for testing and demonstration purposes.

## UI Components

### Layouts

- `DesktopLayout` - Primary layout for desktop browsers
- `MobileLayout` - Responsive layout for mobile devices
- `useIsMobile` hook - Detects mobile viewport size

### Overlays

Primary game screens are implemented as overlays:
- `MorningBriefing` - Daily status report
- `DecisionOverlay` - Daily decision making
- `BargainOverlay` - Trade and negotiation encounters
- `CampOverlay` - Camp management
- `SaveLoadModal` - Save/load game interface
- `GameEndScreen` - Victory/defeat screen
- `NewGameScreen` - Character creation
- `ErrorToast` - Error display component

### Error Handling

- `ErrorBoundary` - React error boundary component
- Global error display via `ErrorToast`

## Development Features

### Agent Bridge (Dev Mode Only)

In development mode (`import.meta.env.DEV`), the game exposes an agent bridge that:
1. **State Observation**: Pushes game state snapshots to `/api/agent/state` on every phase change
2. **Command Execution**: Polls `/api/agent/command` every 1500ms for external commands

Supported commands:
- `setAutoPlay` - Toggle auto-player
- `dismissOverlay` - Close current overlay
- `startDailyCycle` - Advance to next phase
- `setDailyDecisions` - Set pace and actions
- `resolveEncounterChoice` - Choose encounter option
- `resolveBargainChoice` - Accept/reject bargain
- `initializeGame` - Start new game

### Audio System

The audio system uses Howler.js for:
- Ambient music (biome/weather-specific)
- Sound effects
- Voiceovers

See [audio/README.md](audio/README.md) for details.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## TypeScript

The project uses TypeScript with strict type checking. Core types are defined in `src/types/`.

## Testing

*(Testing documentation to be added as test suite develops)*