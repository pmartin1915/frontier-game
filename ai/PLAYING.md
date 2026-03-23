# Frontier — AI Agent Playing Guide

How Claude, Cline, or any AI agent can observe and control the game.

**Prerequisites:** `npm run dev` must be running at `http://localhost:3000`.

---

## Quick Start

### 1. See what's happening (text)
```bash
curl http://localhost:3000/api/agent/summary
# → {"summary":"Day 3 | Phase: idle\nPlayer: HP=88 Morale=62 Fatigue=14\n..."}
```

### 2. See full game state (JSON)
```bash
curl http://localhost:3000/api/agent/state
```

### 3. Take a screenshot
```bash
npx tsx src/scripts/screenshot.ts
# Saves to ai/screenshot.png, prints state to stdout
```

---

## Agent Control API

All endpoints are served by the Vite dev server at `http://localhost:3000`.

### GET /api/agent/state
Returns the latest game state snapshot (JSON).
Updated automatically on every daily cycle phase change.

### GET /api/agent/summary
Returns a one-paragraph plain-text summary of the current game state.
Ideal for feeding directly into a Claude/Cline prompt.

### POST /api/agent/command
Queue a game action. The browser executes it within ~1.5 seconds.

```bash
# Start a new game
curl -X POST http://localhost:3000/api/agent/command \
  -H "Content-Type: application/json" \
  -d '{"action":"initializeGame","playerName":"Claude","horseName":"Rocinante"}'

# Toggle auto-play ON (let the built-in AI player run)
curl -X POST http://localhost:3000/api/agent/command \
  -H "Content-Type: application/json" \
  -d '{"action":"setAutoPlay","value":true}'

# Toggle auto-play OFF
curl -X POST http://localhost:3000/api/agent/command \
  -H "Content-Type: application/json" \
  -d '{"action":"setAutoPlay","value":false}'

# Dismiss Morning Briefing ("Begin Day")
curl -X POST http://localhost:3000/api/agent/command \
  -H "Content-Type: application/json" \
  -d '{"action":"dismissOverlay"}'

# Set day decisions then start the cycle
curl -X POST http://localhost:3000/api/agent/command \
  -H "Content-Type: application/json" \
  -d '{"action":"setDailyDecisions","pace":"normal","discretionaryAction":"hunt","nightTravel":false}'

curl -X POST http://localhost:3000/api/agent/command \
  -H "Content-Type: application/json" \
  -d '{"action":"startDailyCycle"}'

# Resolve an encounter choice (choiceId from state.pendingEncounter.choices)
curl -X POST http://localhost:3000/api/agent/command \
  -H "Content-Type: application/json" \
  -d '{"action":"resolveEncounterChoice","choiceId":"negotiate"}'

# Decline Devil's Bargain
curl -X POST http://localhost:3000/api/agent/command \
  -H "Content-Type: application/json" \
  -d '{"action":"resolveBargainChoice","accepted":false}'
```

### Supported command actions

| action | params | description |
|--------|--------|-------------|
| `initializeGame` | `playerName`, `horseName` | Start a new game |
| `setAutoPlay` | `value: boolean` | Enable/disable built-in AI player |
| `dismissOverlay` | — | Dismiss Morning Briefing |
| `setDailyDecisions` | `pace`, `discretionaryAction`, `nightTravel` | Set day choices |
| `startDailyCycle` | — | Begin the day (must be idle phase) |
| `resolveEncounterChoice` | `choiceId: string` | Pick an encounter option |
| `resolveBargainChoice` | `accepted: boolean` | Accept or decline Devil's Bargain |

#### Pace values
`conservative` | `normal` | `hardPush`

#### DiscretionaryAction values
`none` | `hunt` | `scout` | `repair` | `forage` | `rest`

---

## Playwright (visual access)

The game exposes its store at `window.__frontier` in dev mode:

```typescript
// In a Playwright script:
const state = await page.evaluate(() => {
  return window.__frontier.getState();
});

// Execute any store action:
await page.evaluate(() => {
  window.__frontier.getState().setAutoPlay(true);
});
```

See [src/scripts/screenshot.ts](../src/scripts/screenshot.ts) for a working example.

---

## Typical AI play loop

```bash
# 1. Start the game
curl -X POST http://localhost:3000/api/agent/command \
  -d '{"action":"initializeGame","playerName":"Claude","horseName":"Scout"}'

sleep 2

# 2. Dismiss morning briefing
curl -X POST http://localhost:3000/api/agent/command \
  -d '{"action":"dismissOverlay"}'

sleep 2

# 3. Let the built-in auto-player take over
curl -X POST http://localhost:3000/api/agent/command \
  -d '{"action":"setAutoPlay","value":true}'

# 4. Watch progress
watch -n 5 'curl -s http://localhost:3000/api/agent/summary | python -c "import sys,json; print(json.load(sys.stdin)[\"summary\"])"'
```

---

## npm scripts

```bash
npm run dev            # Start game + agent bridge
npm run screenshot     # Take screenshot + print state (game must be running)
```
