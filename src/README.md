# Frontier Game

Date: 2026-06-01

## Core Architecture

### `App.tsx`
The main application entry point that:
- Initializes core game systems (audio, auto-player)
- Sets up the global layout (desktop/mobile responsive)
- Renders all primary UI overlays and screens
- Includes development-only agent bridge for external tooling

#### Key Features
- **Responsive Layout**: Automatically switches between `DesktopLayout` and `MobileLayout` based on screen size
- **Error Handling**: Wrapped in `ErrorBoundary` with `ErrorToast` for user-friendly error display
- **Game State Bridge**: In development mode, exposes game state to external agents via HTTP API
- **System Initialization**: Sets up audio and auto-player systems at startup

#### Development Agent Bridge
When running in development mode (`import.meta.env.DEV`), the application:
1. Exposes current game state via POST to `/api/agent/state` on every phase change
2. Polls `/api/agent/command` every 1.5s for external commands
3. Supports commands including:
   - `setAutoPlay`
   - `dismissOverlay`
   - `startDailyCycle`
   - `setDailyDecisions`
   - `resolveEncounterChoice`
   - `resolveBargainChoice`
   - `initializeGame`

#### Overlay Components
The main application renders these primary overlays:
- `MorningBriefing`: Daily status summary
- `DecisionOverlay`: Daily decision making
- `BargainOverlay`: Trading/negotiation encounters
- `SaveLoadModal`: Game save/load interface
- `CampOverlay`: Camp management interface
- `GameEndScreen`: Victory/defeat screens
- `NewGameScreen`: Character creation