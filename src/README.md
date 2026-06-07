# Frontier Game Engine

**Date:** 2026-06-07

## Core Structure

### `App.tsx`
The main application component that initializes core game systems and renders the UI layout. Key responsibilities:

- Initializes audio and auto-player systems
- Sets up responsive layout (mobile/desktop)
- Renders all primary UI overlays and screens
- Includes development-mode agent bridge for external tooling

**Key Features:**
- Error boundary for graceful error handling
- Dynamic layout switching based on screen size
- Development agent bridge for state observation and control
- Centralized overlay management

## Development Agent Bridge
In development mode (`import.meta.env.DEV`), the application includes an agent bridge that:

1. **State Observation**: Pushes game state snapshots to `/api/agent/state` on every phase change
2. **Command Execution**: Polls `/api/agent/command` every 1.5s for external commands
3. **Supported Commands**:
   - `setAutoPlay` - Toggle auto-play mode
   - `dismissOverlay` - Close active overlays
   - `startDailyCycle` - Begin the daily cycle
   - `setDailyDecisions` - Set pace and discretionary actions
   - `resolveEncounterChoice` - Handle encounter choices
   - `resolveBargainChoice` - Handle bargain outcomes
   - `initializeGame` - Start a new game

**State Snapshot Structure:**
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
    choices: Array<{ id: string; text: string }>;
  } | null;
}
```

## UI Architecture
The UI is built with a layered overlay system:

1. **Layout Components**:
   - `DesktopLayout` - Primary layout for desktop browsers
   - `MobileLayout` - Optimized layout for mobile devices

2. **Overlay Components**:
   - `DecisionOverlay` - Daily decision making
   - `BargainOverlay` - Trading and negotiation
   - `MorningBriefing` - Daily status updates
   - `SaveLoadModal` - Game save/load interface
   - `CampOverlay` - Camp management
   - `GameEndScreen` - Victory/defeat screens
   - `NewGameScreen` - Game initialization
   - `ErrorToast` - Error notifications

3. **Utility Components**:
   - `ErrorBoundary` - Global error handling
   - `useIsMobile` - Responsive design hook

## Initialization Sequence
1. Auto-player system initialization
2. Audio system initialization
3. Development agent bridge setup (if in DEV mode)
4. Layout selection (mobile/desktop)
5. Overlay rendering

## Error Handling
The application uses a two-tier error handling system:
1. **Global Error Boundary**: Catches and displays errors at the root level
2. **Error Toast**: Shows non-fatal errors to the user without breaking the game flow

## Styling
The application uses a theme-based styling system with:
- `frontier-theme.css` - Global theme variables and base styles
- Component-specific styles defined in each component file