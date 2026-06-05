# Frontier Game

**Date:** 2026-06-05

Frontier is a narrative-driven survival game set in the American frontier. Players make daily decisions that affect their journey, health, and resources as they travel across varied biomes.

## Core Architecture

### `src/App.tsx`
The main application component that:
- Initializes core game systems (audio, auto-player)
- Sets up the global layout
- Renders all primary UI overlays and screens
- Dynamically switches between mobile and desktop layouts
- Includes an agent bridge for external tools in development mode

### Key Directories

#### `src/audio/`
Audio system for ambient music and sound effects. See [audio/README.md](audio/README.md) for details.

#### `src/engine/`
Core game logic and state management.

#### `src/store/`
Redux store and game state management.

#### `src/ui/`
All user interface components organized by:
- `components/` - Reusable UI elements
- `hooks/` - Custom React hooks
- `layout/` - Layout components
- `overlays/` - Game screen overlays

#### `src/types/`
TypeScript type definitions.

## Development Features

### Agent Bridge (Development Only)
In development mode, the game exposes an agent bridge that:
- Pushes game state snapshots to `/api/agent/state` on phase changes
- Polls `/api/agent/command` every 1.5 seconds for external commands
- Supports commands like:
  - `setAutoPlay`
  - `dismissOverlay`
  - `startDailyCycle`
  - `setDailyDecisions`
  - `resolveEncounterChoice`
  - `resolveBargainChoice`
  - `initializeGame`

## Initialization Flow
1. Initialize auto-player system
2. Initialize audio system
3. Set up agent bridge (development only)
4. Render appropriate layout (mobile/desktop)
5. Display game overlays based on current state

## Error Handling
- Global `ErrorBoundary` component
- `ErrorToast` component for displaying errors to users

## Theming
- Global theme defined in `src/ui/layout/frontier-theme.css`
- Responsive design with mobile/desktop layouts