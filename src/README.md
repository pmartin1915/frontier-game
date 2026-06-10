# Frontier Game

**Date:** 2026-06-10

## Overview
Frontier is a narrative-driven survival game where players navigate a perilous journey across uncharted lands. The game features dynamic encounters, resource management, and a day/night cycle with real-time decision-making.

## Core Systems

### Game Engine
- **State Management:** Centralized store with Redux-like patterns (see `src/store.ts`).
- **Auto-Player:** AI-driven gameplay for testing and demonstrations (see `src/engine/auto-player.ts`).
- **Daily Cycle:** Phased progression (morning → travel → camp → night) with randomized encounters.

### Audio
- **Ambient Music:** Dynamic tracks that adapt to biome and weather (see [`src/audio/ambiance.ts`](audio/README.md)).
- **Sound Effects:** Planned for encounters and UI interactions.

### UI
- **Responsive Layouts:** Desktop and mobile support via `useIsMobile` hook.
- **Overlays:** Modular screens for decisions, bargains, and game state (e.g., `DecisionOverlay`, `BargainOverlay`).

## Development

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```

### Key Directories
| Directory       | Purpose                                                                 |
|-----------------|-------------------------------------------------------------------------|
| `src/`          | Core game logic, UI components, and state management.                   |
| `src/audio/`    | Audio modules (ambient music, sound effects).                           |
| `src/engine/`   | Game mechanics (auto-player, encounter resolution).                     |
| `src/ui/`       | React components for layouts, overlays, and shared UI elements.         |
| `public/`       | Static assets (images, audio files).                                    |

### Agent Bridge (Development Only)
In development mode, the game exposes an HTTP API (`/api/agent/`) for external tools to:
- Observe game state (e.g., player stats, encounters).
- Send commands (e.g., `setAutoPlay`, `resolveEncounterChoice`).

Example state snapshot:
```json
{
  "dailyCyclePhase": "Travel",
  "player": { "health": 85, "morale": 70, "fatigue": 30 },
  "pendingEncounter": {
    "id": "bandit_ambush",
    "name": "Bandit Ambush",
    "choices": ["Fight", "Flee", "Negotiate"]
  }
}
```

## Testing
- **Unit Tests:** Vitest for pure functions (e.g., encounter resolution).
- **Integration Tests:** Cypress for UI flows (planned).

## Future Enhancements
- **Multiplayer:** Cooperative mode for shared journeys.
- **Modding Support:** JSON-based encounter definitions.
- **Accessibility:** Screen reader support and high-contrast themes.