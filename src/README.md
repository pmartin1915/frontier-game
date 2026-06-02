# Frontier Game Engine

**Date:** 2026-06-02

The `src` directory contains the core game engine, UI components, and state management for Frontier. This document provides an overview of the project structure and key modules.

## Core Architecture

Frontier is built with:
- **React** for UI rendering
- **Zustand** for state management
- **Howler.js** for audio
- **Vite** for development tooling

## Directory Structure

```
src/
├── audio/            # Audio system modules
├── engine/           # Core game logic and systems
├── store/            # State management
├── types/            # TypeScript type definitions
├── ui/               # UI components and layouts
│   ├── components/   # Reusable UI components
│   ├── hooks/        # Custom React hooks
│   ├── layout/       # Layout components
│   └── overlays/     # Game state overlays
└── App.tsx           # Main application component
```

## Key Modules

### `App.tsx`
The root application component that:
- Initializes core game systems (audio, auto-player)
- Sets up the global layout (mobile/desktop)
- Renders all primary UI overlays
- Includes development-only agent bridge for external tooling

**Development Features:**
- State snapshot posting to `/api/agent/state` on phase changes
- Command polling from `/api/agent/command` for external control
- Error boundary for graceful failure handling

### Audio System
See [`audio/README.md`](audio/README.md) for details on the ambient music system.

### UI Components
The `ui` directory contains all visual components organized by:
- **Overlays**: Game state-specific screens (e.g., `DecisionOverlay`, `BargainOverlay`)
- **Layouts**: Responsive layout components (`DesktopLayout`, `MobileLayout`)
- **Components**: Reusable UI elements (`ErrorToast`, `ErrorBoundary`)
- **Hooks**: Custom React hooks (`useIsMobile`)

## Development Environment

### Agent Bridge (Development Only)
When running in development mode (`import.meta.env.DEV`), Frontier exposes an agent bridge that:
1. **State Observation**: Posts game state snapshots to `/api/agent/state` on every phase change
2. **Command Execution**: Polls `/api/agent/command` every 1.5 seconds for external commands

Supported commands:
- `setAutoPlay`
- `dismissOverlay`
- `startDailyCycle`
- `setDailyDecisions`
- `resolveEncounterChoice`
- `resolveBargainChoice`
- `initializeGame`

### Error Handling
- Global `ErrorBoundary` component
- `ErrorToast` for non-fatal errors
- Development-only error logging

## TypeScript Types
Game state types are defined in `src/types/` and include:
- Game state enums (`Pace`, `DiscretionaryAction`, etc.)
- Audio track types (`AmbianceTrack`)
- Encounter definitions
- Player/horse state interfaces

## Initialization Flow
1. `initAutoPlayer()` - Sets up auto-play subscriptions
2. `initAudio()` - Initializes audio system
3. `App` component mounts and renders appropriate layout
4. Game state drives overlay visibility

## Testing
- Unit tests should mock audio modules in Node environments
- Integration tests should verify overlay visibility based on game state
- Agent bridge functionality should be tested in development mode only