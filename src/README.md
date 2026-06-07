# Frontier Game Engine

**As of: 2026-06-07**

The `src` directory contains the core game engine, UI components, and state management for the Frontier game.

## Directory Structure

```
src/
├── api/            # External API integrations
├── audio/          # Audio system (ambient, SFX, voice)
├── engine/         # Core game logic and systems
├── store/          # State management (Redux/Zustand)
├── types/          # TypeScript type definitions
├── ui/             # All UI components and layouts
│   ├── components/ # Reusable UI components
│   ├── hooks/      # Custom React hooks
│   ├── layout/     # Layout components
│   └── overlays/   # Game overlay screens
└── App.tsx         # Main application entry point
```

## Core Systems

### App.tsx
The main application component that:
- Initializes core game systems (audio, auto-player)
- Sets up the global layout (mobile/desktop)
- Renders all primary UI overlays and screens
- Includes development-only agent bridge for external tools

### Audio System
See [`audio/README.md`](audio/README.md) for details on the ambient music system.

### State Management
The game uses a centralized store for state management with the following key state slices:
- Player state (health, morale, fatigue, skills)
- Horse state (health, fatigue, lameness)
- World state (biome, weather, distance)
- Journey state (days elapsed, waypoint, pace)
- Encounter state (pending encounters and choices)

## Development Features

### Agent Bridge (Development Only)
In development mode, the game includes an agent bridge that:
- Exposes game state to external tools via `/api/agent/state` endpoint
- Accepts commands from external tools via `/api/agent/command` endpoint
- Supports actions like:
  - Setting auto-play mode
  - Dismissing overlays
  - Starting daily cycles
  - Making decisions
  - Resolving encounters
  - Initializing new games

### Error Handling
- Global `ErrorBoundary` component
- `ErrorToast` component for displaying errors to users
- Graceful handling of missing audio files

## UI Components

### Overlays
- `DecisionOverlay`: Daily decision making interface
- `BargainOverlay`: Trade and negotiation interface
- `MorningBriefing`: Daily status report
- `SaveLoadModal`: Save/load game interface
- `CampOverlay`: Camp management interface
- `GameEndScreen`: Victory/defeat screen
- `NewGameScreen`: Character creation screen

### Layouts
- `DesktopLayout`: Primary layout for desktop browsers
- `MobileLayout`: Responsive layout for mobile devices

### Hooks
- `useIsMobile`: Detects mobile device screen size

## Initialization
The game initializes several core systems at startup:
1. Auto-player system (for automated testing)
2. Audio system (Howler.js context)
3. State subscriptions for development tools

## TypeScript
The project uses TypeScript for type safety. Key type definitions can be found in the `types/` directory.