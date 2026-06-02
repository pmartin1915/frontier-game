# Frontier Game

**Date:** 2026-06-02

Frontier is a narrative-driven survival game where players guide a pioneer across a perilous journey. The game features:
- Dynamic encounters and decision-making
- Resource management (health, morale, supplies)
- Procedural world generation
- Auto-play mode for testing and observation

## Core Architecture

```
src/
├── App.tsx                # Root component and game initialization
├── audio/                 # Audio system (ambiance, effects, voice)
├── engine/                # Game logic and state management
├── store/                 # Zustand store and game state
├── types/                 # TypeScript type definitions
├── ui/                    # React UI components
│   ├── components/        # Reusable UI elements
│   ├── hooks/             # Custom React hooks
│   ├── layout/            # Layout components
│   └── overlays/          # Game screen overlays
└── vite-env.d.ts          # Vite environment types
```

## Game Initialization

The game is initialized in `src/App.tsx`:

```typescript
// Initialize core systems
initAutoPlayer();
initAudio();

// Dev-only agent bridge for external tools
if (import.meta.env.DEV) {
  // State observation and command polling
}
```

## UI Components

### Overlays

| Component | Purpose |
|-----------|---------|
| `DecisionOverlay` | Daily decision-making (pace, actions) |
| `BargainOverlay` | Trade and negotiation encounters |
| `MorningBriefing` | Daily status summary |
| `SaveLoadModal` | Save/load game state |
| `CampOverlay` | Camp management and rest |
| `GameEndScreen` | Victory/defeat screen |
| `NewGameScreen` | Character creation |

### Layout

- `DesktopLayout` - Primary layout for desktop browsers
- `MobileLayout` - Responsive layout for mobile devices
- `useIsMobile` - Hook to detect mobile viewport

## Development Features

### Agent Bridge (Dev Mode)

In development mode, the game exposes an agent bridge for external tools to:
- Observe game state via `/api/agent/state`
- Send commands via `/api/agent/command`

Supported commands:
```typescript
type AgentCommand =
  | { action: 'setAutoPlay', value: boolean }
  | { action: 'dismissOverlay' }
  | { action: 'startDailyCycle' }
  | { action: 'setDailyDecisions', pace: Pace, discretionaryAction: DiscretionaryAction, nightTravel: boolean }
  | { action: 'resolveEncounterChoice', choiceId: string }
  | { action: 'resolveBargainChoice', accepted: boolean }
  | { action: 'initializeGame', playerName: string, horseName: string };
```

## Audio System

See [audio/README.md](audio/README.md) for details on the ambient music system.

## Error Handling

- `ErrorBoundary` - Catches and displays React errors
- `ErrorToast` - Shows non-fatal errors to the player

## State Management

The game uses [Zustand](https://github.com/pmndrs/zustand) for state management. The store is defined in `src/store/index.ts` and includes:
- Player state (health, morale, fatigue)
- Horse state (health, fatigue, lameness)
- Supplies inventory
- World state (biome, weather, distance)
- Journey progress (days elapsed, waypoint)
- Encounter state

## TypeScript Types

Core types are defined in `src/types/`:
- `game-state.ts` - Game state and enums
- `audio.ts` - Audio-related types
- `encounters.ts` - Encounter definitions

## Testing

Run tests with:
```bash
npm test
```

The test environment mocks the audio system and agent bridge.