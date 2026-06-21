# Frontier — Roadmap

The dispatcher's `feature` task reads this file and the unchecked items below, picks the **single
smallest next one**, implements it in one small diff with passing tests, and records progress in
`ai/STATE.md`. Items are ordered; do the first unchecked item unless a dependency is noted.

**Hard rules for every item (the Three-Layer Safety Gate — see `CLAUDE.md`):**
- Game Logic (Layer 1) imports nothing from the Narrator. It is the sole source of truth.
- Director (Layer 2) is deterministic — **no AI/API calls**.
- Narrator (Layer 3) returns prose only and **never writes game state**.
- One feature per dispatch. All tests (`npm run test:run`) must pass. Add/extend tests for the change.

**Authoring rule — write every item single-file and decoupled (modular-monolith).**
Each unchecked item should touch **one source file + its test**. If a feature needs a new
type/data shape AND logic that consumes it, split it into ordered steps — first add the type/data
(with a safe default), then the consumer (with a `dep:` note) — so each dispatch is an atomic,
independently-testable diff. Cross-file, shared-mutable-state changes are exactly where autonomous
builds fail (the within-model atomic→coupled success cliff is larger than the gap between model
tiers); decomposing them is what lets free models compound this repo. Rationale + evidence:
`claude-budget-dispatcher/docs/research/RESEARCH-LEDGER-autonomous-coding-2026-06-21.md` (Insights 1 & 7).

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

<!-- River-crossing terrain lock — atomized into 3 single-file steps (was a 3-file coupled item). -->
- [ ] **River-crossing: add the lock flag.** Add an optional `riverCrossingInProgress?: boolean` field
  to `JourneyState` in `src/types/game-state.ts` (default-absent = not crossing). If the journey-state
  factory lives in this same module, initialize it to `false`. Extend the game-state type test to assert
  the field's default. No behavior change yet — this just introduces the flag.
- [ ] **River-crossing: block movement while locked.** In `src/systems/movement.ts`, return 0 distance
  when `state.riverCrossingInProgress === true`. Extend `tests/systems/movement.test.ts` ("no forward
  distance while a river crossing is in progress"). _(dep: "add the lock flag" above.)_
- [ ] **River-crossing: clear the lock on resolve.** In the river-crossing encounter resolver
  (`src/systems/encounters.ts`), set `riverCrossingInProgress` true when the encounter starts and clear
  it to false on the player's resolving choice. Extend `tests/systems/encounters.test.ts`. _(dep: the two
  steps above.)_
- [ ] **Encounter outcome randomization within bounds.** Numeric outcome deltas should vary ±10% and the
  actual value should be logged in the `EventRecord`. `src/systems/encounters.ts`; extend its test.
<!-- Companion-specific encounter choices — atomized into 2 single-file steps (was a 2-file coupled item). -->
- [ ] **Companion choice gating: add the requirement type.** Add a `companion: CompanionId` requirement
  variant to the choice-requirement type in `src/types/encounters.ts`. Extend the encounters type test.
  No enforcement yet — just the shape. _(Layer-1 type only.)_
- [ ] **Companion choice gating: enforce presence.** In `src/systems/encounters.ts`, hide/disable any
  choice carrying a `companion` requirement when that companion is absent. Test "choice requiring Coe is
  unavailable if Coe deserted". _(dep: "add the requirement type" above.)_
<!-- Settlement barter — atomized into 2 single-file steps (was a 2-file coupled item). -->
- [ ] **Settlement barter: add the barter data.** Add barter parameters (e.g. a roll range / yield
  multipliers) to the settlement resupply template in `src/data/encounter-templates.ts`. Extend the
  encounter-templates test for the new data shape. No logic yet — data only. _(data-table step.)_
- [ ] **Settlement barter: add the negotiate choice.** Add a "negotiate" choice to settlement resupply in
  `src/systems/encounters.ts` that consumes the barter data via a barter roll to adjust water/food gained.
  Extend `tests/systems/encounters.test.ts`. _(dep: "add the barter data" above.)_

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
<!-- Waypoint lore tooltip — atomized into 2 single-file steps (was a data-file + wiring coupled item). -->
- [ ] **Waypoint lore: add the lore table.** Add `src/data/waypoint-lore.ts` mapping waypoints to
  historical context (from `LORE.md`). Add a unit test asserting a couple of known entries resolve.
  Data only — no UI wiring yet. _(data-table step.)_
- [ ] **Waypoint lore: wire the tooltip.** Clicking a waypoint shows its lore from `waypoint-lore.ts` in
  `src/ui/panels/MapPanel.tsx`. _(dep: "add the lore table" above.)_

## Done
_(Move completed items here with the PR number once merged.)_
