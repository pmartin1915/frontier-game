```markdown
# Frontier Game

Date: 2026-06-05

## Core Architecture

### App Entry Point (`src/App.tsx`)
The main application component that:
- Initializes core game systems (audio, auto-player)
- Sets up global layout (desktop/mobile responsive)
- Renders all primary UI overlays and screens
- Includes development-only agent bridge for external tooling

### Key Features
- **Responsive Design**: Automatically switches between mobile and desktop layouts
- **Error Handling**: Global error boundary with toast notifications
- **State Management**: Redux-based game state with subscriptions
- **Audio System**: Howler.js-backed ambient music with crossfading
- **Auto-Player**: AI-driven gameplay for testing and demonstration

## Development Agent Bridge
In development mode (`import.meta.env.DEV`), the application exposes a bridge for external tools to:
- Observe game state via `/api/agent/state` (POST)
- Send commands via `/api/agent/command` (GET/POST)

### Supported Commands
| Action | Parameters | Description |
|--------|------------|-------------|
| `setAutoPlay` | `value: boolean` | Enable/disable auto-play mode |
| `dismissOverlay` | - | Dismiss the current overlay |
| `startDailyCycle` | - | Start the next daily cycle |
| `setDailyDecisions` | `pace`, `discretionaryAction`, `nightTravel` | Set daily decisions |
| `resolveEncounterChoice` | `choiceId: string` | Resolve a pending encounter |
| `resolveBargainChoice` | `accepted: boolean` | Accept/reject a bargain |
| `initializeGame` | `playerName`, `horseName` | Start a new game |

### State Snapshot Format
The state snapshot includes:
```typescript
{
  dailyCyclePhase: string;
  gameInitialized: boolean;
  autoPlay: boolean;
  gameEndState: string | null;
  player: {
    health: number;
    morale: number;
    fatigue: number;
    skills: Record<string, number>;
  };
  horse: {
    health: number;
    fatigue: number;
    lameness: number;
  };
  supplies: Record<string, number>;
  world: {
    biome: string;
    weather: string;
    totalMiles: number;
  };
  journey: {
    daysElapsed: number;
    waypoint: string;
    pace: string;
  };
  pendingEncounter: {
    id: string;
    name: string;
    choices: Array<{id: string, label: string}>;
  } | null;
}
```

## UI Components
### Overlays
- `DecisionOverlay`: Daily decision making interface
- `BargainOverlay`: Trade and negotiation interface
- `MorningBriefing`: Daily status report
- `SaveLoadModal`: Save/load game interface
- `CampOverlay`: Camp management interface
- `GameEndScreen`: Victory/defeat screen
- `NewGameScreen`: Character creation screen

### Layout
- `DesktopLayout`: Primary layout for desktop browsers
- `MobileLayout`: Touch-optimized layout for mobile devices

### Utility Components
- `ErrorToast`: Global error notification system
- `ErrorBoundary`: React error boundary component
```