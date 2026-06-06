# Frontier Game Engine

**Date:** 2026-06-06

The `src` directory contains the core game engine, UI components, and state management for Frontier.

## Directory Structure

```
src/
├── api/            # External API integrations (empty placeholder)
├── audio/          # Audio system (ambient music, sound effects)
├── engine/         # Core game logic and systems
├── store/          # State management (Redux/Zustand)
├── types/          # TypeScript type definitions
├── ui/             # UI components and layouts
│   ├── components/ # Reusable UI components
│   ├── hooks/      # Custom React hooks
│   ├── layout/     # Layout components (desktop/mobile)
│   └── overlays/   # Game screen overlays
└── App.tsx         # Main application entry point
```

## Core Systems

### App.tsx
The main application component that:
- Initializes core game systems (audio, auto-player)
- Sets up global layout (desktop/mobile responsive)
- Renders all primary UI overlays and screens
- Includes an agent bridge in development mode for external tooling

#### Development Agent Bridge
In development mode (`import.meta.env.DEV`), the app exposes a state observation and command API:
- **State Observation**: Game state snapshots are POSTed to `/api/agent/state` on every phase change
- **Command API**: Polls `/api/agent/command` every 1.5 seconds for external commands

Supported commands:
- `setAutoPlay`
- `dismissOverlay`
- `startDailyCycle`
- `setDailyDecisions`
- `resolveEncounterChoice`
- `resolveBargainChoice`
- `initializeGame`

### Audio System
See [`audio/README.md`](audio/README.md) for details on ambient music management.

## UI Architecture

### Layouts
- `DesktopLayout`: Primary layout for desktop browsers
- `MobileLayout`: Touch-optimized layout for mobile devices
- Selected via `useIsMobile()` hook

### Overlays
Modular screen overlays that render based on game state:
- `DecisionOverlay`: Daily decision prompts
- `BargainOverlay`: Trade/negotiation screens
- `MorningBriefing`: Daily status summary
- `SaveLoadModal`: Save/load game interface
- `CampOverlay`: Camp management screen
- `GameEndScreen`: Victory/defeat screens
- `NewGameScreen`: Character creation

### Error Handling
- `ErrorBoundary`: Global React error boundary
- `ErrorToast`: Non-blocking error notifications

## Initialization
The app initializes core systems at module load:
```ts
// Auto-player system
initAutoPlayer();

// Audio system
initAudio();
```

## Development Notes
- The project uses TypeScript for type safety
- CSS is scoped via CSS Modules (`.module.css` files)
- The theme is defined in `src/ui/layout/frontier-theme.css`
- State management uses [Zustand/Redux] (update based on actual implementation)