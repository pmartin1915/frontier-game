# Frontier Game - Core Architecture

**Date:** 2026-06-07

This directory contains the main application logic and entry points for the Frontier game.

## Main Application (`App.tsx`)

The root component that initializes the game and renders the appropriate UI layout based on device type.

**Key Features:**
- Dynamic layout switching (mobile/desktop)
- Global error boundary
- Core game system initialization (audio, auto-player)
- Development agent bridge for external tooling
- Rendering of all primary UI overlays and screens

**Initialization Sequence:**
1. Initializes auto-player system
2. Sets up audio system
3. In development mode, establishes agent bridge for external observation/control
4. Renders appropriate layout based on device detection

## Directory Structure

```
src/
├── audio/            # Audio system modules
├── engine/           # Core game logic
├── store/            # State management
├── types/            # TypeScript type definitions
├── ui/               # User interface components
│   ├── components/   # Reusable UI components
│   ├── hooks/        # Custom React hooks
│   ├── layout/       # Layout components
│   └── overlays/     # Game screen overlays
└── App.tsx           # Main application component
```

## Development Agent Bridge

In development mode (`import.meta.env.DEV`), the application establishes a bridge for external tools to:
- Observe game state changes
- Send commands to control the game
- Simulate player actions

**Available Commands:**
- `setAutoPlay` - Toggle auto-play mode
- `dismissOverlay` - Close the current overlay
- `startDailyCycle` - Advance to the next game day
- `setDailyDecisions` - Set travel pace and discretionary actions
- `resolveEncounterChoice` - Choose an option in an encounter
- `resolveBargainChoice` - Accept/reject a bargain offer
- `initializeGame` - Start a new game with specified names

**State Observation:**
The bridge provides a comprehensive snapshot of game state including:
- Player/horse status
- Supplies
- World state (biome, weather, distance)
- Journey progress
- Pending encounters

## UI Architecture

The game uses a layered overlay system where different screens are rendered based on game state:

1. **Layouts**: `DesktopLayout` or `MobileLayout` based on device detection
2. **Overlays**: Modal screens that appear over the main layout
   - `MorningBriefing` - Daily status report
   - `DecisionOverlay` - Daily decision making
   - `BargainOverlay` - Trading encounters
   - `CampOverlay` - Camp management
   - `GameEndScreen` - Victory/defeat screen
   - `NewGameScreen` - Character creation
3. **Components**: Reusable UI elements
   - `ErrorToast` - Error notifications
   - `ErrorBoundary` - Global error handling

## Error Handling

The application includes:
- A global `ErrorBoundary` component
- `ErrorToast` for displaying non-fatal errors
- Graceful handling of missing audio assets
- Development-only error logging

## Initialization Systems

### Auto-Player
The `initAutoPlayer` system provides automated gameplay for testing and demonstration purposes.

### Audio System
The `initAudio` system initializes the audio context and sets up subscriptions for ambient music and sound effects.

## TypeScript Support

The project uses TypeScript for type safety. Core game types are defined in the `types/` directory and include:
- Game state
- Player/horse status
- World state
- Encounters
- Audio tracks