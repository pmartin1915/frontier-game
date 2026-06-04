```markdown
# Frontier Game Core

Date: 2026-06-04

## Application Structure

### `src/App.tsx`
The main application component that:
- Initializes core game systems (audio, auto-player)
- Sets up the global layout (mobile/desktop responsive)
- Renders all primary UI overlays and screens
- Includes development-only agent bridge for external tooling

#### Key Features
- **Responsive Layout**: Automatically switches between `MobileLayout` and `DesktopLayout` based on viewport size
- **Error Boundary**: Catches and displays errors without crashing the entire application
- **Overlay System**: Manages all game screens and modals in a single render tree
- **Agent Bridge**: In development mode, exposes game state and accepts commands from external tools

#### Development Agent Bridge
When running in development mode (`import.meta.env.DEV`), the application:
1. Pushes game state snapshots to `/api/agent/state` on every phase change
2. Polls `/api/agent/command` every 1.5 seconds for external commands
3. Supports commands for:
   - Auto-play control
   - Overlay dismissal
   - Daily cycle management
   - Encounter resolution
   - Game initialization

#### Overlays
The application renders the following overlays in a stacked layout:
- `MorningBriefing`: Daily status report
- `DecisionOverlay`: Daily decision-making interface
- `BargainOverlay`: Trade/negotiation interface
- `SaveLoadModal`: Save/load game dialog
- `CampOverlay`: Camp management interface
- `GameEndScreen`: Victory/defeat screen
- `NewGameScreen`: Character creation screen
- `ErrorToast`: Error notification system

#### Initialization
Core systems initialized at module load:
```typescript
initAutoPlayer();  // Sets up auto-play subscriptions
initAudio();       // Initializes audio system
```
```