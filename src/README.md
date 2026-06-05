# Frontier Game Client

Date: 2026-06-05

## Core Architecture

### `App.tsx`
The main application component that:
- Initializes core game systems (audio, auto-player)
- Sets up the global layout
- Renders all primary UI overlays and screens
- Dynamically switches between mobile and desktop layouts
- Includes agent bridge for external tools in development mode

#### Key Features
- Error boundary for global error handling
- Responsive layout switching via `useIsMobile` hook
- State synchronization with external tools in development
- Command polling for external control

#### Development Agent Bridge
In development mode, the application:
1. Pushes game state snapshots to `/api/agent/state` on every phase change
2. Polls `/api/agent/command` every 1500ms for external commands
3. Supports commands for:
   - Auto-play control
   - Overlay dismissal
   - Daily cycle management
   - Encounter resolution
   - Game initialization

## UI Structure

### Overlays
- `DecisionOverlay`: Daily decision making interface
- `BargainOverlay`: Trade and negotiation interface
- `MorningBriefing`: Daily status report
- `SaveLoadModal`: Game save/load interface
- `CampOverlay`: Camp management interface
- `GameEndScreen`: Victory/defeat screen
- `NewGameScreen`: Character creation screen

### Layouts
- `DesktopLayout`: Primary layout for desktop browsers
- `MobileLayout`: Optimized layout for mobile devices

### Components
- `ErrorToast`: Global error notification system
- `ErrorBoundary`: React error boundary component

## Initialization Systems

### Auto-Player
Initialized via `initAutoPlayer()` in `src/engine/auto-player.ts`. Manages automated game progression when enabled.

### Audio System
Initialized via `initAudio()` in `src/audio/index.ts`. Handles:
- Ambient music
- Sound effects
- Volume control
- Mute functionality