# FRONTIER — Project Context for AI Coding Agents

## What This Is

Frontier is a narrative-driven survival game set on the 1866 Goodnight-Loving Trail. The player rides from Fort Belknap, Texas to Denver/Cheyenne over 60–90 in-game days. An AI literary engine (Claude Sonnet 4.5) generates travel log entries in the voices of three western authors: Andy Adams, Washington Irving, and Larry McMurtry.

Web-based. Phaser.js handles the animation panel. React handles the UI shell. Zustand bridges the two. The Anthropic API generates narrative prose. Vercel deploys and proxies API calls.

The canonical design spec is `Frontier_GDD_v4.docx`. This file distills the technical rules you need to write code.

---

## Architecture: The Three-Layer Rule

Every game event passes through three layers in strict order. No layer may skip or reach into another.

### Layer 1 — Game Logic (Pure TypeScript)
- Calculates ALL mechanical outcomes: movement, supply consumption, health, morale, encounters, equipment degradation.
- Produces a structured `EventRecord` (typed JSON) describing what happened.
- This is the canonical source of truth. If Game Logic says the player has 12 water units, the player has 12 water units.
- **HARD RULE: The AI Narrator cannot override, modify, or invent game state.** The Narrator receives state; it never writes to it.

### Layer 2 — Director (TypeScript, rule-based)
- Receives the `EventRecord` from Game Logic.
- Selects the author voice (Adams/Irving/McMurtry) based on the Voice Switchboard lookup table.
- Sets emotional arc, advances narrative threads, manages the Structured Narrative Ledger.
- Assembles the prompt for Layer 3.
- **No AI calls in this layer.** Pure deterministic rules.

### Layer 3 — Narrator (Anthropic API)
- Receives the assembled prompt from the Director.
- Generates prose in the selected author voice.
- Returns text only. The response is displayed in the Travel Log panel.
- **HARD RULE: Narrator output is rendered as-is. It is never parsed for game state changes.**

### Why This Matters
If you are writing code that modifies `supplies.water`, that code belongs in `src/engine/game-logic.ts` or `src/systems/supplies.ts`. Never in `src/engine/narrator.ts`. If you are writing code that selects a voice, that belongs in `src/engine/director.ts`. Never in a React component.

---

## State Management: Zustand Ownership

Zustand is the single shared store between React and Phaser. Understand the boundary:

### Zustand Owns (Significant State)
Everything that affects game mechanics or UI display:
- `world`: date, timeOfDay, weather, biome, terrain, distances, currentAct
- `player`: health, conditions, fatigue, morale, skills, equipment
- `horse`: health, fatigue, lameness, thirst, hunger, tackCondition
- `party`: companions array (health, morale, loyalty, skills, conditions)
- `supplies`: water, food, coffee, medical, repair, ammo, tradeGoods, funds
- `narrative`: structuredLedger, chapterSummaries, previousEntry, activeThreads, currentVoice
- `journey`: currentAct, waypoint, routeChoices, events, daysElapsed, failForwardsUsed, fortSumnerDebt
- `meta`: saveSlot, timestamp, hash, version, playtimeMs

### Phaser Owns (Transient State)
Everything that is purely visual and changes every frame:
- Sprite positions, animation frames, parallax offsets, particle systems
- Camera position, tween progress, visual effects
- **Never write transient state to Zustand.** Phaser reads Zustand via `subscribe()`; it does not write frame-level data back.

### Update Rules
- Zustand updates happen on meaningful game events only (day-end, decision, encounter resolution). Not per-frame.
- Use atomic selectors per component: `useStore(s => s.supplies.water)` not `useStore(s => s)`.
- Phaser reads the store via `store.subscribe()` in scene `create()`, bypassing the React render cycle. This is critical for 60fps.

---

## The React–Phaser Bridge

### React → Phaser: Command Queue
React dispatches commands (e.g., "advance to evening", "start camp scene") by pushing to a command queue in the Zustand store. Phaser reads this queue once per `update()` call and executes.

```typescript
// In store
commandQueue: GameCommand[];
pushCommand: (cmd: GameCommand) => void;

// In Phaser scene update()
const commands = store.getState().commandQueue;
commands.forEach(cmd => this.executeCommand(cmd));
store.getState().clearCommands();
```

### Phaser → React: Custom Events
Phaser emits custom events (e.g., "animation complete", "camp scene ready") via `this.game.events.emit()`. React listens via a `useEffect` bridge in the `AnimationPanel` component.

```typescript
// In React
useEffect(() => {
  const handler = (data) => { /* update React state */ };
  gameRef.current.events.on('camp-ready', handler);
  return () => gameRef.current.events.off('camp-ready', handler);
}, []);
```

### What NOT to Do
- Never import React hooks inside Phaser scenes.
- Never call `store.setState()` from a Phaser `update()` loop for transient data.
- Never pass Phaser game objects through Zustand.

---

## Module Boundaries

```
src/
├── types/          # Shared TypeScript interfaces. No logic. No imports from other src/ dirs.
├── store/          # Zustand store definition + atomic selectors. Imports only from types/.
├── engine/         # Three-layer pipeline. Imports from types/, store/, systems/, data/.
│   ├── game-logic.ts    # Layer 1. Calls into systems/ for mechanics.
│   ├── director.ts      # Layer 2. Pure rules. No API calls.
│   ├── narrator.ts      # Layer 3. API client. Returns prose string.
│   └── daily-cycle.ts   # Orchestrates Layer 1 → 2 → 3 for one in-game day.
├── systems/        # Individual mechanics. Pure functions. Import only from types/.
│   ├── movement.ts      # Distance, pace, terrain modifiers
│   ├── supplies.ts      # Water, food, coffee consumption
│   ├── health.ts        # 10 conditions, treatment, death timers
│   ├── morale.ts        # Morale calculation, camp pet bonus, coffee bonus
│   ├── equipment.ts     # Degradation, repair
│   ├── encounters.ts    # Encounter generation, resolution
│   └── fail-forward.ts  # Devil's Bargain hard-coded table
├── phaser/         # All Phaser code. Imports from types/, store/.
│   ├── config.ts        # Phaser.Types.Core.GameConfig
│   ├── scenes/          # BootScene, TrailScene, CampScene
│   ├── sprites/         # CharacterSprite, HorseSprite, AccessoryLayer
│   └── bridge.ts        # subscribe() setup, command queue reader
├── ui/             # React components. Import from types/, store/.
│   ├── panels/          # TravelLog, AnimationPanel, HUD, MapPanel
│   ├── overlays/        # DecisionOverlay, MorningBriefing
│   └── components/      # TypewriterText, ResourceBar, etc.
├── audio/          # Web Audio API + Howler.js. Imports from types/, store/.
├── data/           # Static data: trail routes, provisions, fallback ledger, bargain table.
├── persistence/    # IndexedDB Active/Archive split, JSON backup export/import.
└── api/            # Client-side API utilities (calls Vercel edge proxy).
```

### Import Rules
- `types/` imports nothing from `src/`.
- `systems/` imports only from `types/`.
- `store/` imports only from `types/`.
- `engine/` imports from `types/`, `store/`, `systems/`, `data/`, `api/`.
- `phaser/` imports from `types/`, `store/`. Never from `engine/` directly.
- `ui/` imports from `types/`, `store/`. Never from `engine/` directly.
- `engine/daily-cycle.ts` is the only orchestrator that calls across layers.

**If you find yourself importing `engine/` from `ui/` or `phaser/`, you are breaking the boundary.** The UI and Phaser react to Zustand state changes. They do not call engine functions directly. The daily cycle writes results to Zustand; the UI reads them.

---

## Naming Conventions

### Files
- TypeScript: `kebab-case.ts` / `kebab-case.tsx`
- React components: `PascalCase.tsx`
- Phaser scenes: `PascalCase.ts` (e.g., `TrailScene.ts`)
- Types: `kebab-case.ts` (e.g., `game-state.ts`)

### Code
- Interfaces: `PascalCase` prefixed descriptively (e.g., `GameState`, `LedgerEntry`, `CompanionProfile`)
- Enums: `PascalCase` with `PascalCase` members (e.g., `AuthorVoice.Adams`)
- Zustand actions: `camelCase` verbs (e.g., `advanceDay`, `consumeSupplies`, `pushCommand`)
- System functions: `camelCase` verbs returning new state (e.g., `calculateWaterConsumption(state, pace)`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `FALLBACK_ENTRIES`, `DEVILS_BARGAIN_TABLE`)

### Game State Keys
Use the exact keys from the `GameState` interface in `src/types/game-state.ts`. Do not rename them. Do not abbreviate. The GDD, the types, the store, and the save file all use the same key names.

---

## Critical Technical Constraints

### Anachronism Firewall
The Narrator system prompt must include negative constraints in the **system message** (not user prompt). Key restrictions:
- No Winchester rifles (1873). Single-shot and cap-and-ball only.
- No barbed wire (1874). No railroad in Texas. No telegraph west of settlements.
- "Melancholy" not "depression." "Haunted" not "traumatized." No 20th-century idioms.
- Civil War ended 1 year ago. Reconstruction underway. Comanche Wars ongoing.

### API Cost Budget
- ~$0.00825 per Narrator call (~4,500–5,500 tokens in, ~300 tokens out).
- ~$0.80 per full 90-day playthrough.
- Cache the static Author Persona in the system prompt. Anthropic cache TTL = 5 minutes.
- Fire a background heartbeat ping every 4 minutes during idle to prevent cache expiry.

### API Security (Vercel Edge)
- All Narrator API calls route through `/api/narrator` Vercel edge function.
- IP-based rate limiting: 10 req/min normal, 100 req/hr sustained cap.
- Every request includes the save file's `integrityHash` (SHA-256). Reject 403 on mismatch.
- CORS enforced to deployed domain only.

### Offline Fallback
- If Narrator API times out after 8 seconds, inject a hard-coded fallback entry from `src/data/fallback-ledger.ts`.
- Fallback entries are Adams-register, tagged by biome and morale band.
- Flag the day as `fallback: true` in the Narrative Ledger.
- Game Logic layer processes normally regardless of Narrator success/failure.

### Persistence
- IndexedDB, not localStorage. Two buckets:
  - **Active State** ("Hot"): Zustand snapshot, current Ledger, last 5 days. Saved every day-end. ~20KB. Serialization must complete in <16ms.
  - **Journal Archive** ("Cold"): Complete history, resolved Ledger, full event log. Saved at session end. Lazy-loaded.
- Safari Eviction Insurance: Offer JSON backup download on save. Prompt for import on empty IndexedDB.

### Performance Targets
- 60fps on mobile Safari with simultaneous React updates and Phaser rendering.
- Zustand `subscribe()` for Phaser. No React re-renders from Phaser state reads.
- Speculative execution: fire Narrator API call during travel animation (5–10s). Text should be ready before campfire renders.

---

## Phase 0 Deliverables (Walking Skeleton)

The first coding session must produce:
1. Vite dev server running with React shell and 4-panel layout (TravelLog left, AnimationPanel upper-right, HUD middle-right, MapPanel lower-right).
2. Phaser canvas embedded in `AnimationPanel` via a React ref.
3. Zustand store initialized with test values from `GameState`.
4. React → Phaser command queue: push a command from a React button, verify Phaser scene receives it.
5. Phaser → React event bridge: emit an event from Phaser scene, verify React component receives it.
6. Zustand `subscribe()`: Phaser scene reads store value without triggering React re-render.
7. Benchmark: 60fps on desktop Chrome with all bridges active.

If the bridge fails (Phaser and React fight over the DOM or state), the fallback is iframe isolation for the Phaser canvas. Test this before building anything else.

---

## What the AI Narrator Must NEVER Do

When writing prompt templates or parsing Narrator responses:
- Never parse Narrator output for game state changes (supply counts, health values, distances).
- Never let the Narrator "decide" encounters, discoveries, or mechanical outcomes.
- Never pass raw Narrator output to `store.setState()`.
- Never let the Narrator address the player in second person ("you find water"). The log is third-person or first-person journal style.
- Never include post-1866 vocabulary, technology, or social context in prompts.

The Narrator is a translator. It receives facts and writes prose. That is all.

---

## Dev Environment

- **Runtime:** Node 20+
- **Package manager:** npm
- **Build:** Vite 6.x
- **Language:** TypeScript 5.x, strict mode
- **Linting:** ESLint with @typescript-eslint
- **Formatting:** Prettier (2-space indent, single quotes, trailing commas)
- **Testing:** Vitest for unit tests on systems/ and engine/

---

## Quick Reference: Key Files

| File | Purpose |
|------|---------|
| `src/types/game-state.ts` | Core state interfaces. Every module imports from here. |
| `src/types/narrative.ts` | LedgerEntry, VoiceDirective, PromptAssembly, FallbackEntry |
| `src/types/companions.ts` | CompanionProfile, CharacterBible |
| `src/types/encounters.ts` | Encounter types, Devil's Bargain table type |
| `src/types/animation.ts` | AnimationState, SpriteConfig, AccessoryLayer |
| `src/store/index.ts` | Zustand store. Single source of shared state. |
| `src/engine/daily-cycle.ts` | Orchestrates one in-game day through all three layers. |
| `src/data/fallback-ledger.ts` | Hard-coded Adams-register fallback entries. |
| `src/data/devils-bargain.ts` | Hard-coded Devil's Bargain cost table. |
| `api/narrator.ts` | Vercel edge function. Rate limiting + API proxy. |
