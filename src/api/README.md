```
# Frontier API Bridge

**Date:** 2026-06-02

The API bridge provides a development-only interface for external tools to observe and control the Frontier game state. This is primarily used for:

- AI-assisted testing
- Automated game progression
- External monitoring tools
- Integration with development environments

## Endpoints

### `POST /api/agent/state`
Receives game state snapshots whenever the daily cycle phase changes.

**Request Body:**
```json
{
  "dailyCyclePhase": "string",
  "gameInitialized": "boolean",
  "autoPlay": "boolean",
  "gameEndState": "object|null",
  "player": {
    "health": "number",
    "morale": "number",
    "fatigue": "number",
    "skills": "object"
  },
  "horse": {
    "health": "number",
    "fatigue": "number",
    "lameness": "number"
  },
  "supplies": "object",
  "world": {
    "biome": "string",
    "weather": "string",
    "totalMiles": "number"
  },
  "journey": {
    "daysElapsed": "number",
    "waypoint": "string",
    "pace": "string"
  },
  "pendingEncounter": {
    "id": "string",
    "name": "string",
    "choices": "array"
  }|null
}
```

### `GET /api/agent/command`
Polls for commands from external agents.

**Response:**
```json
{
  "command": {
    "action": "string",
    "value": "any",
    "choiceId": "string",
    "accepted": "boolean",
    "playerName": "string",
    "horseName": "string",
    "pace": "string",
    "discretionaryAction": "string",
    "nightTravel": "boolean"
  }
}
```

## Supported Commands

| Action                  | Parameters                                                                 | Description                          |
|-------------------------|----------------------------------------------------------------------------|--------------------------------------|
| `setAutoPlay`           | `value: boolean`                                                           | Toggle auto-play mode                |
| `dismissOverlay`        | -                                                                          | Close current overlay                |
| `startDailyCycle`       | -                                                                          | Advance to next day                  |
| `setDailyDecisions`     | `pace`, `discretionaryAction`, `nightTravel`                               | Set daily travel decisions           |
| `resolveEncounterChoice`| `choiceId: string`                                                         | Make a choice in an encounter        |
| `resolveBargainChoice`  | `accepted: boolean`                                                        | Accept/reject a bargain              |
| `initializeGame`        | `playerName: string`, `horseName: string`                                  | Start a new game                     |

## Implementation Notes

- The API bridge is only active in development mode (`import.meta.env.DEV`)
- Commands are polled every 1500ms
- All commands are executed against the current game store
- Errors are caught and logged but don't break the game
- The bridge uses simple fetch requests with JSON payloads

## Security

- The API bridge is disabled in production builds
- No authentication is required (development-only)
- All commands are validated before execution
```