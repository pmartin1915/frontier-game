# Frontier Game Engine

**Date:** 2026-06-02

The core game engine and UI components for Frontier, a narrative-driven survival game set in the American frontier.

## Core Structure

### `App.tsx`
The main application component that:
- Initializes core game systems (audio, auto-player)
- Sets up the global layout (mobile/desktop responsive)
- Renders all primary UI overlays and screens
- Includes development-only agent bridge for external tools

### Key Features

1. **Responsive Layout**
   - Automatically switches between `MobileLayout` and `DesktopLayout` based on screen size
   - Uses the `useIsMobile` hook to detect mobile devices

2. **Game State Management**
   - Centralized store with Redux-like patterns
   - Game state snapshots pushed to external agents in development

3. **Overlay System**
   - Multiple overlay components for different game states:
     - `DecisionOverlay` - Daily decisions and choices
     - `BargainOverlay` - Trading and negotiation encounters
     - `MorningBriefing` - Daily status updates
     - `SaveLoadModal` - Game save/load interface
     - `CampOverlay` - Camp management interface
     - `GameEndScreen` - Victory/defeat screens
     - `NewGameScreen` - Character creation

4. **Development Tools**
   - Agent bridge for external observation and control
   - State snapshots pushed on every phase change
   - Command polling for external control

## Initialization Systems

### Auto-Player
- Initialized via `initAutoPlayer()`
- Handles automated game progression when enabled

### Audio System
- Initialized via `initAudio()`
- Manages ambient music, sound effects, and voice
- See [audio/README.md](audio/README.md) for details

## Development Agent Bridge

In development mode, the game exposes an API for external tools to:
- Observe game state via `/api/agent/state`
- Send commands via `/api/agent/command`
- Supported commands include:
  - `setAutoPlay` - Toggle auto-play mode
  - `dismissOverlay` - Close current overlay
  - `startDailyCycle` - Advance to next day
  - `setDailyDecisions` - Set pace and actions
  - `resolveEncounterChoice` - Make encounter choices
  - `resolveBargainChoice` - Accept/reject bargains
  - `initializeGame` - Start a new game

## Error Handling

- Global `ErrorBoundary` component
- `ErrorToast` for displaying errors to the user
- Non-fatal errors are caught and logged without breaking the game

## Styling

- Global theme defined in `frontier-theme.css`
- Responsive styles for both mobile and desktop layouts