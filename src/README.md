# Frontier Game Engine

**Date:** 2026-06-06

The `src` directory contains the core game engine, UI components, and state management for the Frontier game.

## Directory Structure

```
src/
├── api/               # External API integrations (currently placeholder)
├── audio/             # Audio system (ambient music, sound effects)
├── engine/            # Core game logic and systems
├── store/             # State management (Redux store and slices)
├── types/             # TypeScript type definitions
├── ui/                # User interface components
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── layout/        # Layout components
│   └── overlays/      # Game overlay screens
└── App.tsx            # Main application component
```

## Core Systems

### App.tsx
The main application entry point that:
- Initializes core game systems (audio, auto-player)
- Sets up the global layout (mobile/desktop responsive)
- Renders all primary UI overlays and screens
- Includes development-mode agent bridge for external tools

#### Key Features
- Responsive layout switching based on viewport size
- Error boundary for graceful error handling
- Development agent bridge for state observation and control

#### Development Agent Bridge
In development mode, the application:
1. Pushes game state snapshots to `/api/agent/state` on phase changes
2. Polls `/api/agent/command` every 1.5 seconds for external commands
3. Supports commands like:
   - `setAutoPlay`
   - `dismissOverlay`
   - `startDailyCycle`
   - `setDailyDecisions`
   - `resolveEncounterChoice`
   - `resolveBargainChoice`
   - `initializeGame`

### Audio System
See [`audio/README.md`](audio/README.md) for details.

## UI Architecture

The UI is built with React and follows a component-based architecture:

1. **Layout Components**
   - `DesktopLayout` - Main desktop UI layout
   - `MobileLayout` - Mobile-optimized UI layout

2. **Overlay Screens**
   - `DecisionOverlay` - Daily decision making interface
   - `BargainOverlay` - Trade/negotiation interface
   - `MorningBriefing` - Daily status report
   - `SaveLoadModal` - Game save/load interface
   - `CampOverlay` - Camp management interface
   - `GameEndScreen` - Victory/defeat screen
   - `NewGameScreen` - New game setup

3. **Reusable Components**
   - `ErrorToast` - Error notification system
   - `ErrorBoundary` - Global error handling

4. **Custom Hooks**
   - `useIsMobile` - Detects mobile viewport size

## State Management

The game uses Redux for state management with the store defined in `src/store`. Key state domains include:
- Player state (health, morale, fatigue, skills)
- Horse state (health, fatigue, lameness)
- Supplies inventory
- World state (biome, weather, distance)
- Journey progress (days elapsed, waypoint, pace)
- Encounters and pending decisions

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. For production build:
```bash
npm run build
```

## Testing

The project includes Vitest for unit testing. Run tests with:
```bash
npm test
```