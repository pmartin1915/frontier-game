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

The `initAutoPlayer()` system in `src/engine/auto-player.ts` provides automated gameplay for testing and demonstration purposes. It simulates player decisions based on configurable strategies.

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
- `setAutoPlay` - Toggle auto-player (`{ action: 'setAutoPlay', value: boolean }`)
- `dismissOverlay` - Close current overlay (`{ action: 'dismissOverlay' }`)
- `startDailyCycle` - Advance to next phase (`{ action: 'startDailyCycle' }`)
- `setDailyDecisions` - Set pace and actions (`{ action: 'setDailyDecisions', pace: Pace, discretionaryAction: DiscretionaryAction, nightTravel: boolean }`)
- `resolveEncounterChoice` - Choose encounter option (`{ action: 'resolveEncounterChoice', choiceId: string }`)
- `resolveBargainChoice` - Accept/reject bargain (`{ action: 'resolveBargainChoice', accepted: boolean }`)
- `initializeGame` - Start new game (`{ action: 'initializeGame', playerName?: string, horseName?: string }`)

### Audio System

The audio system uses Howler.js for:
- Ambient music (biome/weather-specific)
- Sound effects
- Voiceovers

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

The project uses TypeScript with strict type checking. Core types are defined in `src/types/` and include:
- `GameState` - Complete game state structure
- `DailyCyclePhase` - Phases of the daily cycle
- `Pace` - Travel pace options
- `DiscretionaryAction` - Daily action choices
- `Encounter` - Random event definitions
- `Bargain` - Trade negotiation parameters

## Testing

The project includes both unit and integration tests. Key test locations:
- `src/engine/__tests__/` - Game logic tests
- `src/store/__tests__/` - State management tests
- `src/ui/__tests__/` - Component tests

Run tests with:
```bash
npm test
```

## Advanced Features

### State Persistence

The game includes save/load functionality through:
- `SaveLoadModal` component
- State serialization/deserialization in `src/store/persistence.ts`
- LocalStorage integration for browser-based saves

### Accessibility

The UI includes:
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode
- Reduced motion preferences

### Internationalization

The game supports localization through:
- i18n string extraction
- Translation files in `public/locales/`
- Dynamic language switching

## API Directory

The `src/api/` directory is reserved for future API integrations and agent bridge implementations. Currently contains placeholder files.