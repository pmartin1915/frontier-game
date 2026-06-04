```
# Frontier

Date: 2026-06-04

## Core Architecture

### App Entry Point (`src/App.tsx`)
The main application component that:
- Initializes core game systems (audio, auto-player)
- Sets up global layout (desktop/mobile responsive)
- Renders all primary UI overlays and screens
- Includes development-only agent bridge for external tooling

### Key Features
1. **Responsive Layout**: Automatically switches between mobile and desktop layouts
2. **State Management**: Centralized store with game state and actions
3. **Audio System**: Ambient music and sound effects with crossfading
4. **Auto-Player**: AI-driven gameplay for testing and demonstration
5. **Error Handling**: Comprehensive error boundaries and toast notifications

## Development Environment

### Agent Bridge (Development Only)
In development mode, the application exposes a bridge for external tools to:
- Observe game state changes
- Send commands to control gameplay
- Test encounter resolution

The bridge operates via:
- State snapshot POST to `/api/agent/state` on phase changes
- Command polling from `/api/agent/command` every 1500ms

Supported commands:
```typescript
type AgentCommand =
  | { action: 'setAutoPlay', value: boolean }
  | { action: 'dismissOverlay' }
  | { action: 'startDailyCycle' }
  | { action: 'setDailyDecisions', pace: Pace, discretionaryAction: DiscretionaryAction, nightTravel: boolean }
  | { action: 'resolveEncounterChoice', choiceId: string }
  | { action: 'resolveBargainChoice', accepted: boolean }
  | { action: 'initializeGame', playerName?: string, horseName?: string };
```

## UI Components

### Overlays
- `DecisionOverlay`: Daily decision making interface
- `BargainOverlay`: Trade and negotiation interface
- `MorningBriefing`: Daily status report
- `SaveLoadModal`: Game save/load interface
- `CampOverlay`: Camp management interface
- `GameEndScreen`: Victory/defeat screen
- `NewGameScreen`: Character creation screen

### Layout
- `DesktopLayout`: Primary layout for desktop browsers
- `MobileLayout`: Touch-optimized layout for mobile devices

### Components
- `ErrorToast`: Non-blocking error notifications
- `ErrorBoundary`: Global error handling component

## Game Systems

### Initialization
Core systems are initialized at module load:
```typescript
// Auto-player for AI-driven gameplay
initAutoPlayer();

// Audio system with Howler.js
initAudio();
```

### State Management
The game uses a centralized store pattern with:
- Player state (health, morale, fatigue, skills)
- Horse state (health, fatigue, lameness)
- World state (biome, weather, distance)
- Journey state (days elapsed, waypoint, pace)
- Encounter state (pending encounters and choices)
```