# Frontier Game

**Date:** 2026-06-05

Frontier is a narrative-driven survival game set in an open world. Players make daily decisions that affect their journey, health, and resources as they travel across varied biomes.

## Core Structure

### `src/App.tsx`
The main application component that:
- Initializes core game systems (audio, auto-player)
- Sets up global layout
- Renders all primary UI overlays and screens
- Dynamically switches between mobile and desktop layouts
- Includes agent bridge for external tools in development mode

### Key Features
- Responsive design with mobile/desktop layouts
- Comprehensive error handling with ErrorBoundary
- State management via Redux store
- Audio system with ambient music
- Auto-player functionality
- Development agent bridge for testing and AI interaction

## Development Agent Bridge
In development mode (`import.meta.env.DEV`), the game exposes an agent bridge that:
1. Pushes game state snapshots to `/api/agent/state` on every phase change
2. Polls `/api/agent/command` every 1500ms for commands to control the game

### Available Commands
- `setAutoPlay` - Toggle auto-play mode
- `dismissOverlay` - Close current overlay
- `startDailyCycle` - Begin the next day
- `setDailyDecisions` - Set pace and discretionary actions
- `resolveEncounterChoice` - Choose an encounter option
- `resolveBargainChoice` - Accept/reject a bargain
- `initializeGame` - Start a new game

## UI Components
The game uses a layered overlay system with these primary components:
- `DecisionOverlay` - Daily decision making
- `BargainOverlay` - Trade and negotiation encounters
- `MorningBriefing` - Daily status report
- `SaveLoadModal` - Game save/load interface
- `CampOverlay` - Camp management
- `GameEndScreen` - Victory/defeat screens
- `NewGameScreen` - Character creation
- `ErrorToast` - Error notifications