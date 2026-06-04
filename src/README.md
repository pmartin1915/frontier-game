# Frontier

**Date:** 2026-06-04

A narrative-driven survival game set on the American frontier. Players manage resources, make daily decisions, and navigate encounters while traveling westward.

## Core Structure

### `src/App.tsx`
The main application component. Initializes core game systems (audio, auto-player) and renders all primary UI overlays and screens. Dynamically switches between mobile and desktop layouts.

#### Key Features
- **Agent Bridge (Dev Mode)**: Exposes game state to external tools via `/api/agent/state` and polls for commands from `/api/agent/command`.
- **Error Boundary**: Catches and displays errors without crashing the game.
- **Responsive Layout**: Uses `useIsMobile` to switch between `MobileLayout` and `DesktopLayout`.

### `src/audio/`
Handles all audio-related functionality. See [audio/README.md](./audio/README.md) for details.

### `src/engine/`
Core game logic, including:
- Auto-player system (`auto-player.ts`)
- Daily cycle management
- Encounter resolution

### `src/store/`
State management using a custom store pattern. Centralizes game state and actions.

### `src/types/`
TypeScript type definitions for game state, audio, and other domains.

### `src/ui/`
All UI components, organized by:
- `components/`: Reusable UI elements (e.g., `ErrorToast`, `ErrorBoundary`)
- `hooks/`: Custom React hooks (e.g., `useIsMobile`)
- `layout/`: Layout components (`DesktopLayout`, `MobileLayout`)
- `overlays/`: Game screens and overlays (e.g., `DecisionOverlay`, `BargainOverlay`)

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm or npm

### Installation
```bash
pnpm install
```

### Running the Game
```bash
pnpm dev
```

### Building for Production
```bash
pnpm build
```

## Agent Bridge (Development Only)
In development mode, the game exposes an agent bridge for external tools to observe and control game state. This includes:

### State Snapshot
POST `/api/agent/state` with a snapshot of the current game state, including:
- Daily cycle phase
- Player, horse, and supply status
- World state (biome, weather, miles traveled)
- Pending encounters

### Command Polling
The game polls `/api/agent/command` every 1.5 seconds for commands. Supported actions:
- `setAutoPlay`
- `dismissOverlay`
- `startDailyCycle`
- `setDailyDecisions`
- `resolveEncounterChoice`
- `resolveBargainChoice`
- `initializeGame`

## Overlays and Screens
The game uses a layered overlay system for different phases of gameplay:

| Overlay | Purpose |
|---------|---------|
| `MorningBriefing` | Displays daily status and weather |
| `DecisionOverlay` | Daily decision-making (pace, actions) |
| `BargainOverlay` | Trade and negotiation encounters |
| `CampOverlay` | Rest and resource management |
| `GameEndScreen` | Victory or defeat screen |
| `NewGameScreen` | Character creation |
| `SaveLoadModal` | Save/load game state |

## Error Handling
- `ErrorBoundary`: Catches React errors and displays a fallback UI.
- `ErrorToast`: Shows non-fatal errors to the player without interrupting gameplay.