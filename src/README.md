```
# Frontier Game Core

Date: 2026-06-07

## Application Structure

### Root Component (`src/App.tsx`)
The main application component that:
- Initializes core game systems (audio, auto-player)
- Sets up global layout (desktop/mobile responsive)
- Renders all primary UI overlays and screens
- Includes development agent bridge for external tools

#### Key Features:
- **Responsive Layout**: Automatically switches between `DesktopLayout` and `MobileLayout` based on screen size
- **Error Handling**: Wrapped in `ErrorBoundary` with `ErrorToast` for user-friendly error display
- **Game Screens**: Renders all major game overlays:
  - `MorningBriefing`
  - `DecisionOverlay`
  - `BargainOverlay`
  - `SaveLoadModal`
  - `CampOverlay`
  - `GameEndScreen`
  - `NewGameScreen`

#### Development Agent Bridge
In development mode, the application:
- Exposes game state to external tools via `/api/agent/state` endpoint
- Accepts commands from external agents via `/api/agent/command` polling
- Supports commands for:
  - Auto-play control
  - Overlay dismissal
  - Game initialization
  - Daily decisions
  - Encounter resolution

#### Initialization
```typescript
// Initialize core systems
initAutoPlayer();
initAudio();
```

## Core Systems

### Audio System
See [audio/README.md](./audio/README.md) for details.

### Auto-Player
Automated game progression system (documentation TBD).

### State Management
Uses a centralized store pattern with subscriptions for state changes.

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm or npm

### Installation
```bash
pnpm install
# or
npm install
```

### Running the Development Server
```bash
pnpm dev
# or
npm run dev
```

### Building for Production
```bash
pnpm build
# or
npm run build
```

## TypeScript Support
The project uses TypeScript for type safety. Key type definitions can be found in:
- `src/types/game-state.ts` - Core game state types
- `src/types/audio.ts` - Audio-related types
- `src/types/encounters.ts` - Encounter and event types
```