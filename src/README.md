```
# Frontier Game Core

Date: 2026-06-03

## Overview
This directory contains the core application logic for the Frontier game. It includes the main application component, game state management, and initialization systems.

## Main Components

### `App.tsx`
The root component of the application that:
- Initializes core game systems (audio, auto-player)
- Sets up the global layout
- Renders all primary UI overlays and screens
- Handles responsive layout switching between mobile and desktop
- Includes development-only agent bridge for external tool integration

#### Key Features
- **Responsive Layout**: Automatically switches between `MobileLayout` and `DesktopLayout` based on screen size
- **Error Boundary**: Wraps the entire application in an error boundary to prevent crashes
- **Overlay System**: Manages all game overlays (decision, bargain, camp, etc.)
- **Development Bridge**: In development mode, exposes game state to external agents via HTTP API

#### Development Agent Bridge
When running in development mode (`import.meta.env.DEV`), the application:
1. Pushes game state snapshots to `/api/agent/state` on every phase change
2. Polls `/api/agent/command` every 1.5 seconds for external commands
3. Supports commands for:
   - Controlling auto-play mode
   - Dismissing overlays
   - Starting daily cycles
   - Setting daily decisions
   - Resolving encounters and bargains
   - Initializing new games

## Initialization Systems
The application initializes several core systems at startup:
- **Auto-player**: Managed by `initAutoPlayer()` from `./engine/auto-player`
- **Audio System**: Managed by `initAudio()` from `./audio`

## Game State Management
The application uses a centralized store (imported from `./store`) that contains:
- Player state (health, morale, fatigue, skills)
- Horse state (health, fatigue, lameness)
- Supplies inventory
- World state (biome, weather, distance)
- Journey progress (days elapsed, waypoint, pace)
- Encounter state
- Game phase and initialization status

## Directory Structure
```
src/
├── App.tsx                # Main application component
├── audio/                 # Audio system modules
├── engine/                # Game engine components
├── store/                 # State management
├── types/                 # TypeScript type definitions
├── ui/                    # User interface components
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── layout/            # Layout components
│   └── overlays/          # Game overlay screens
└── ...                    # Other supporting files
```

## Development Notes
- The application uses Vite's environment variables (`import.meta.env.DEV`)
- All overlays are rendered in the root component and conditionally shown based on game state
- The error boundary catches and displays errors without crashing the entire application
- Mobile detection is handled by the `useIsMobile` hook
```