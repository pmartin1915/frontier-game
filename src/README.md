# Frontier Game Engine

**Date:** 2026-06-03

Frontier is a narrative-driven journey management game where players make daily decisions to survive a perilous expedition.

## Core Architecture

### `src/App.tsx`
The main application component that:
- Initializes core game systems (audio, auto-player)
- Sets up the global layout
- Renders all primary UI overlays and screens
- Dynamically switches between mobile and desktop layouts
- Includes an agent bridge for external tools in development mode

### Key Directories

```
src/
├── audio/          # Audio system modules
├── engine/         # Core game logic
├── store/          # State management
├── types/          # TypeScript type definitions
├── ui/             # User interface components
│   ├── components/ # Reusable UI components
│   ├── hooks/      # Custom React hooks
│   ├── layout/     # Layout components
│   └── overlays/   # Game state overlays
└── utils/          # Utility functions
```

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
1. Audio system initialization (`initAudio()`)
2. Auto-player system initialization (`initAutoPlayer()`)
3. Layout selection based on device type
4. Rendering of all UI overlays within an error boundary

## Error Handling
- Global error boundary component
- Error toast notifications
- Non-fatal error handling for agent bridge communications

## Styling
- Global theme loaded from `./ui/layout/frontier-theme.css`
- Responsive design with mobile/desktop layouts