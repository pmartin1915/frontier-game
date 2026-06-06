# Project State
<!-- The relay cursor for autonomous dispatch. Any agent may read/write it. Keep under 200 lines. -->

## Objective

Frontier is a narrative-driven survival game set on the 1866 Goodnight-Loving Trail (Fort Belknap, TX →
Denver/Cheyenne over ~60–90 in-game days). A three-layer engine turns deterministic game state into prose
in the voices of Adams, Irving, and McMurtry. The autonomous build loop advances `ROADMAP.md` one small,
tested feature at a time.

## Constraints (the Three-Layer Safety Gate — see `CLAUDE.md`)

- Layer 1 Game Logic imports nothing from the Narrator; it is the sole source of truth.
- Layer 2 Director is deterministic — no AI/API calls.
- Layer 3 Narrator returns prose only and never writes game state.
- One feature per dispatch. `npm run test:run` must stay green (421 tests). Add/extend tests for every change.

## What's done

- Full game loop (movement, supplies, health, morale, equipment, encounters, companions, waypoints, camp,
  Devil's Bargain), 51 encounter templates, Director voice switchboard, Narrator with fallback ledger,
  React/Phaser UI, 421 passing Vitest tests. See `HANDOFF.md` for session history.
- ROADMAP Phase 1 item 1 — companion skill bonuses (Coe navigation → getting-lost, Vega medicine →
  recovery, Blanchard hunting → hunt yield) now feed `movement.ts` / `health.ts` / `supplies.ts`. Built on
  branch `auto/frontier-feature-companion-skills`; **draft PR pending review** (not yet merged).

## Next

**Next: ROADMAP Phase 1, item 2 — condition escalation when untreated. `ActiveCondition` carries
`daysUntilCritical` but it never decrements. In `src/systems/health.ts`, decrement it each day; at 0, emit
a "worsened" `HealthEvent` and apply a permanent debuff. Extend `tests/systems/health.test.ts`.**

## Open loops

- (none — Phase 1 item 1 is in a draft PR; the next `feature` dispatch picks item 2 above.)
