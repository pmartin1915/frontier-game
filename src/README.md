# Frontier Game Engine

**Date:** 2026-06-06

The `src` directory contains the core game engine, UI components, and state management for Frontier.

## Directory Structure

```
src/
├── audio/            # Audio system (ambient, SFX, voice)
├── engine/           # Game logic and simulation
├── store/            # State management (Redux/Zustand)
├── types/            # TypeScript type definitions
├── ui/               # UI components and layouts
│   ├── components/   # Reusable UI components
│   ├── hooks/        # Custom React hooks
│   ├── layout/       # Layout components
│   └── overlays/     # Game screen overlays
└── App.tsx           # Main application component
```

## Core Systems

### App.tsx
The main application entry point that:
- Initializes core game systems (audio, auto-player)
- Sets up the global layout (mobile/desktop responsive)
- Renders all primary UI overlays and screens
- Includes development-only agent bridge for external tools

#### Development Features
In development mode (`import.meta.env.DEV`), the app:
- Pushes game state snapshots to `/api/agent/state` on phase changes
- Polls `/api/agent/command` every 1.5s for external commands
- Supports commands like:
  - `setAutoPlay`
  - `dismissOverlay`
  - `startDailyCycle`
  - `setDailyDecisions`
  - `resolveEncounterChoice`
  - `resolveBargainChoice`
  - `initializeGame`

### Audio System
See [audio/README.md](./audio/README.md) for details on the ambient music system.

### UI Components
The UI is built with React and organized into:
- **Layouts**: `DesktopLayout` and `MobileLayout` for responsive design
- **Overlays**: Game screens like `DecisionOverlay`, `BargainOverlay`, etc.
- **Components**: Reusable UI elements like `ErrorToast` and `ErrorBoundary`

## Error Handling
- Global `ErrorBoundary` component catches and displays errors
- `ErrorToast` component shows non-fatal errors to the user

## Initialization
The game initializes these systems at module load:
```typescript
// Initialize the auto-player subscription
initAutoPlayer();

// Initialize the audio system
initAudio();
```

## TypeScript
The project uses TypeScript with type definitions in the `types/` directory. Key types include:
- Game state types
- Audio track identifiers
- Encounter definitions
- UI state types

---

**As of:** 2026-06-06