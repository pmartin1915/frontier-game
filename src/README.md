```
# Frontier

**Date:** 2026-06-20

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

The `initAutoPlayer()` system in `src/engine/auto-player.ts` provides automated gameplay for testing and demonstration purposes. It makes decisions based on current game state and predefined strategies.

## UI Components

### Layouts

- `DesktopLayout` - Primary layout for desktop browsers with sidebar and main content area
- `MobileLayout` - Responsive layout for mobile devices with bottom navigation
- `useIsMobile` hook - Detects mobile viewport size (threshold: 768px)

### Overlays

Primary game screens are implemented as overlays:
- `MorningBriefing` - Daily status report with weather, supplies, and journey progress
- `DecisionOverlay` - Daily decision making (pace, actions, night travel)
- `BargainOverlay` - Trade and negotiation encounters with NPCs
- `CampOverlay` - Camp management (rest, hunt, repair gear)
- `SaveLoadModal` - Save/load game interface with localStorage persistence
- `GameEndScreen` - Victory/defeat screen with journey summary
- `NewGameScreen` - Character creation with name input and difficulty selection
- `ErrorToast` - Error display component with auto-dismiss

### Error Handling

- `ErrorBoundary` - React error boundary component that catches and displays errors
- Global error display via `ErrorToast` with stack traces in development mode

## Development Features

### Agent Bridge (Dev Mode Only)

In development mode (`import.meta.env.DEV`), the game exposes an agent bridge that:
1. **State Observation**: Pushes game state snapshots to `/api/agent/state` on every phase change
2. **Command Execution**: Polls `/api/agent/command` every 1500ms for external commands

Supported commands:
- `setAutoPlay` - Toggle auto-player (value: boolean)
- `dismissOverlay` - Close current overlay
- `startDailyCycle` - Advance to next phase
- `setDailyDecisions` - Set pace and actions (parameters: pace, discretionaryAction, nightTravel)
- `resolveEncounterChoice` - Choose encounter option (parameter: choiceId)
- `resolveBargainChoice` - Accept/reject bargain (parameter: accepted)
- `initializeGame` - Start new game (parameters: playerName, horseName)

### Audio System

The audio system uses Howler.js for:
- Ambient music (biome/weather-specific with crossfading)
- Sound effects (UI interactions, environmental sounds)
- Voiceovers (narrative events)

See [audio/README.md](audio/README.md) for implementation details.

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

The project uses TypeScript with strict type checking. Core types are defined in `src/types/`:
- `game-state.ts` - Main game state types and enums
- `encounters.ts` - Encounter definitions and types
- `audio.ts` - Audio system types
- `ui.ts` - UI component props and types

## Testing

The project includes:
- Unit tests for game engine logic (Jest)
- Integration tests for state transitions
- E2E tests for critical user flows (Playwright)

Run tests with:
```bash
npm test
npm run test:e2e
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -am 'Add some feature'`)
4. Push to branch (`git push origin feature/your-feature`)
5. Open a Pull Request
```