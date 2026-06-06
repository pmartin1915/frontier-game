# Frontier — Roadmap

The dispatcher's `feature` task reads this file and the unchecked items below, picks the **single
smallest next one**, implements it in one small diff with passing tests, and records progress in
`ai/STATE.md`. Items are ordered; do the first unchecked item unless a dependency is noted.

**Hard rules for every item (the Three-Layer Safety Gate — see `CLAUDE.md`):**
- Game Logic (Layer 1) imports nothing from the Narrator. It is the sole source of truth.
- Director (Layer 2) is deterministic — **no AI/API calls**.
- Narrator (Layer 3) returns prose only and **never writes game state**.
- One feature per dispatch. All tests (`npm run test:run`) must pass. Add/extend tests for the change.

## Phase 1 — Wire up dormant Game-Logic mechanics (high test coverage, low risk)

- [x] **Companion skill bonuses wired into mechanics.** Coe's navigation skill reduces getting-lost
  chance; Vega's medicine skill improves condition-recovery; Blanchard's hunting skill raises hunt yield.
  The skill values already exist but the calculators ignore them. Touch `src/systems/movement.ts`,
  `src/systems/health.ts`, `src/systems/supplies.ts`; extend `tests/systems/companions.test.ts`
  (e.g. "Coe in party → getting-lost chance reduced"). _(Built on `auto/frontier-feature-companion-skills`; draft PR pending review.)_
- [ ] **Condition escalation when untreated.** `ActiveCondition` carries `daysUntilCritical` but it never
  decrements. In `src/systems/health.ts`, decrement it each day; at 0, emit a "worsened" `HealthEvent`
  and apply a permanent debuff (e.g. broken bone → lasting movement penalty). Extend `tests/systems/health.test.ts`.
- [ ] **Companion loyalty momentum.** Low loyalty + low morale should raise desertion probability. In
  `src/systems/companions.ts`, add a loyalty-dependent desertion roll. Extend `tests/systems/companions.test.ts`.
- [ ] **Hunting yield varies by biome/season.** Hunt currently returns a flat yield. Add a
  `HUNTING_YIELD_BY_BIOME` table + a date-based season factor in `src/systems/supplies.ts`; randomize ±20%.
  Extend `tests/systems/supplies.test.ts`.

## Phase 2 — Encounter depth (Layer 1 + data)

- [ ] **River-crossing terrain lock.** A river-crossing encounter should block forward movement until the
  player resolves it. Add `riverCrossingInProgress` to `JourneyState` (`src/types/game-state.ts`); in
  `src/systems/movement.ts` return 0 distance while set; clear it on the encounter choice. Test in
  `tests/systems/encounters.test.ts`.
- [ ] **Encounter outcome randomization within bounds.** Numeric outcome deltas should vary ±10% and the
  actual value should be logged in the `EventRecord`. `src/systems/encounters.ts`; extend its test.
- [ ] **Companion-specific encounter choices.** Add a `companion: CompanionId` requirement type so some
  choices are only available when that companion is present. `src/types/encounters.ts`,
  `src/systems/encounters.ts`; test "choice requiring Coe is unavailable if Coe deserted".
- [ ] **Settlement barter.** Add a "negotiate" choice to settlement resupply that uses a barter roll to
  adjust the water/food gained. `src/systems/encounters.ts`, `src/data/encounter-templates.ts`; test it.

## Phase 3 — Director compounding (the narrative ledger; all deterministic, no AI)

- [ ] **Narrative thread escalation.** In `src/engine/director.ts`, advance a `NarrativeThread`'s status
  (open → escalating → resolved) based on events (e.g. companion health < 25 escalates its thread). Add a
  `tests/engine/director.test.ts` case.
- [ ] **Pending-consequence evaluation.** Parse a `PendingConsequence.trigger` string (e.g. `loyalty < 20`)
  against current state and fire the consequence when true. `src/engine/director.ts`; test it.
- [ ] **Camp-pet narrative reflection.** When the camp pet is lost, bias the emotional arc toward
  melancholy and add a foreshadowing hint. `src/engine/director.ts`; test the emotional-arc derivation.
- [ ] **Critical-companion bible variant.** When a companion's health < 25, append a "fragile/hesitant"
  pressure note to their character-bible excerpt in the assembled prompt. `src/engine/director.ts`; test it.

## Phase 4 — Read-only UI (reads store state only; never writes via the Narrator)

- [ ] **Encounter outcome summary panel.** After an encounter resolves, show its effects in human-readable
  form ("+3 food", "−1 rifle durability", "Coe loyalty −10"). `src/ui/overlays/DecisionOverlay.tsx`.
- [ ] **Companion status on the map.** Render small health/morale bars per active companion in
  `src/ui/panels/MapPanel.tsx`.
- [ ] **Waypoint lore tooltip.** Clicking a waypoint shows historical context (from `LORE.md`). Add
  `src/data/waypoint-lore.ts` + wire into `src/ui/panels/MapPanel.tsx`.

## Done
_(Move completed items here with the PR number once merged.)_
