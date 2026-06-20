# Frontier API Integration

**Date:** 2026-06-20

The `src/api/` directory contains all external API integrations and the development agent bridge for the Frontier game.

## Agent Bridge (Development Only)

The agent bridge provides external tools with the ability to observe and control the game state during development. This system is only active in development mode (`import.meta.env.DEV`).

### State Observation

The game pushes state snapshots to `/api/agent/state` whenever the daily cycle phase changes. The snapshot includes:

```typescript
interface AgentStateSnapshot {
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
    choices: Array<{
      id: string;
      text: string;
    }>;
  } | null;
}
```

### Command Execution

The game polls `/api/agent/command` every 1500ms for commands. Supported commands:

| Command | Parameters | Description |
|---------|------------|-------------|
| `setAutoPlay` | `{ value: boolean }` | Toggle auto-player mode |
| `dismissOverlay` | None | Close current overlay |
| `startDailyCycle` | None | Advance to next daily cycle phase |
| `setDailyDecisions` | `{ pace: string, discretionaryAction: string, nightTravel: boolean }` | Set daily travel decisions |
| `resolveEncounterChoice` | `{ choiceId: string }` | Choose an encounter option |
| `resolveBargainChoice` | `{ accepted: boolean }` | Accept or reject a bargain |
| `initializeGame` | `{ playerName?: string, horseName?: string }` | Start a new game |

### Example Command Payloads

```json
// Enable auto-player
{ "action": "setAutoPlay", "value": true }

// Set daily decisions
{
  "action": "setDailyDecisions",
  "pace": "Fast",
  "discretionaryAction": "Hunt",
  "nightTravel": false
}

// Resolve encounter
{ "action": "resolveEncounterChoice", "choiceId": "choice_2" }
```

## Future API Integrations

The `src/api/` directory is structured to support future external API integrations:

### Leaderboard API

Planned integration with a leaderboard service to track high scores and journey statistics.

```typescript
// Example leaderboard API client
export class LeaderboardApi {
  async submitScore(scoreData: ScoreData): Promise<void> {
    // Implementation
  }

  async getHighScores(limit: number = 10): Promise<ScoreData[]> {
    // Implementation
  }
}
```

### Cloud Save API

Planned integration with cloud storage for cross-device save games.

```typescript
// Example cloud save API client
export class CloudSaveApi {
  async saveGame(saveData: SaveData): Promise<string> {
    // Implementation
  }

  async loadGame(saveId: string): Promise<SaveData> {
    // Implementation
  }

  async listSaves(): Promise<SaveMetadata[]> {
    // Implementation
  }
}
```

### Analytics API

Planned integration with analytics services to track game metrics.

```typescript
// Example analytics API client
export class AnalyticsApi {
  trackEvent(eventName: string, properties: Record<string, unknown>): void {
    // Implementation
  }

  trackJourneyProgress(progressData: JourneyProgress): void {
    // Implementation
  }
}
```

## Development Setup

To work with the API integrations:

1. Create a new API client in `src/api/[service-name].ts`
2. Implement the required methods
3. Add type definitions to `src/types/api.ts`
4. Integrate with the game state as needed

## Error Handling

All API integrations include:
- Network error handling
- Rate limiting
- Data validation
- Fallback mechanisms
- Error reporting to the game's error system

## Security Considerations

- All external API calls use HTTPS
- Sensitive data is encrypted
- API keys are stored in environment variables
- Input validation for all API responses
- Rate limiting to prevent abuse