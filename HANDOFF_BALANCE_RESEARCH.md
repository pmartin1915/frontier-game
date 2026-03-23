# Frontier — Balance Research Handoff Report

## Executive Summary

The Frontier headless simulator has been enhanced with **journey quality metrics** and **dynamic encounter scaling**. The game is now playable (52–66% survival vs 0% before tuning), but the balance system needs deeper research to ensure the numbers translate to **fun gameplay**, not just passing targets.

**Your mission**: Analyze the simulator data and game mechanics below. Recommend specific tuning adjustments that maximize player engagement — tension arcs, meaningful choices, and the feeling of a dangerous-but-survivable frontier journey.

---

## 1. What the Game Is

An Oregon Trail-inspired survival game set in 1866 Texas-to-Denver. Players manage health, supplies, equipment, horse, and morale over a ~700-mile, 28–55 day journey through 7 biomes and 9 waypoints.

**Three-layer architecture**:
- **Game Logic**: Pure functions (movement, supplies, health, morale, equipment, encounters, camp)
- **Director**: Assembles narrative prompts from game events
- **Narrator**: LLM-generated prose (falls back to templated text in dev)

**Daily loop**: Player sets pace/action → game-logic resolves day → encounter check → encounter resolution → camp phase → Director/Narrator → next day.

---

## 2. Current Balance Mechanism: Two-Stage Encounter Gate

### Stage 1 — Master Daily Gate
Single roll against a computed probability. If it fails, no encounter that day.

```
gate = ENCOUNTER_GATE_BASE (0.20)
gate *= ENCOUNTER_ACT_SCALING[currentAct]  // Act I=0.8, II=1.0, III=1.2, IV=1.4, V=1.0
gate *= modifiers (low morale ×1.3, scouting ×1.2, settlement ×1.3, near waypoint ×1.2, severe weather ×1.15)
gate += calmDayStreak × ENCOUNTER_CALM_RAMP (0.05)  // +5% per consecutive day without encounter
gate = min(gate, 0.95)
if (roll >= gate) → no encounter
```

### Stage 2 — Weighted Template Selection
If the gate passes, one template is selected from the eligible pool using `baseProbability` as selection weight. Templates are filtered by biome, act, minDay, and maxOccurrences.

### Constants (all in `src/systems/encounters.ts`)
| Constant | Value | Purpose |
|----------|-------|---------|
| `ENCOUNTER_GATE_BASE` | 0.20 | Daily encounter probability before modifiers |
| `ENCOUNTER_ACT_SCALING` | {act1: 0.8, act2: 1.0, act3: 1.2, act4: 1.4, act5: 1.0} | Difficulty curve |
| `ENCOUNTER_CALM_RAMP` | 0.05 | Per-day probability boost during encounter droughts |
| `ENCOUNTER_GATE_MAX` | 0.95 | Hard cap after all modifiers |
| `ENCOUNTER_GATE_MODIFIERS` | lowMorale ×1.3, scouting ×1.2, settlement ×1.3, nearWaypoint ×1.2, severeWeather ×1.15 | Situational multipliers |

---

## 3. Simulator Results (50 runs per strategy, 100 days max, seed 42)

### Endpoint Metrics

| Metric | Random | Conservative | Aggressive | Optimal | Target Range |
|--------|--------|-------------|-----------|---------|-------------|
| Survival Rate | 28% | **66%** | 12% | 52% | 50–95% |
| Denver Arrival | 12% | **24%** | 10% | 4% | — |
| Encounter Freq | 0.38 | 0.39 | 0.37 | 0.36 | 0.15–0.35 |
| Equip Breakages | 3.9 | 3.1 | 5.0 | 4.3 | 1–4 |
| Final Health | 42.8 | 68.7 | 24.3 | 69.8 | 30–80 |
| Horse Alive | 86% | 90% | 90% | 90% | 70–95% |
| Water Depletions | 2.1 | 2.4 | 2.6 | 2.5 | 2–6 |
| Days to Denver | 57.2 | 53.7 | 63.2 | 51.0 | 28–55 |
| Bargains Used | 0.4 | 0.2 | 0.0 | 0.2 | — |

### Journey Quality Metrics (new)

| Metric | Random | Conservative | Aggressive | Optimal | Interpretation |
|--------|--------|-------------|-----------|---------|----------------|
| Close-Call Days | 6.6 | 3.0 | 6.5 | 3.9 | Days with health < 25 |
| Max Crisis Streak | **24.7** | **21.1** | **26.7** | **24.0** | Consecutive crisis days — **VERY HIGH** |
| Health Volatility | 28.1 | 21.1 | 29.0 | 22.8 | Stddev of health values |
| Action Entropy | 1.59 | 1.05 | 0.62 | 0.98 | Shannon entropy (max ~2.3 for 5 actions) |
| Max Calm Streak | 6.2 | 6.3 | 6.2 | 6.3 | Longest stretch without encounter |

### Camp Activity Distribution

| Activity | Random | Conservative | Aggressive | Optimal |
|----------|--------|-------------|-----------|---------|
| Cook | 32.9% | **59.8%** | 0% | 47.7% |
| Rest | 34.2% | 27.0% | **100%** | 38.3% |
| Repair | 32.9% | 13.3% | 0% | 14.0% |

### Pass/Fail Summary

| Strategy | Passing | Failing Metrics |
|----------|---------|----------------|
| **Conservative** | **6/7** | encounterFrequency (0.39) |
| **Optimal** | 5/7 | encounterFrequency (0.36), equipBreakages (4.34) |
| **Random** | 4/7 | survival (0.28), daysToComplete (57.2), encounterFreq (0.38) |
| **Aggressive** | 2/7 | survival (0.12), daysToComplete (63.2), encounterFreq (0.37), equipBreak (5.0), health (24.3) |

---

## 4. Red Flags Requiring Research

### 4.1 Crisis Streaks Are Extremely Long (21–27 days)
The max crisis streak (consecutive days at health < 25 OR water = 0 OR food = 0) averages **21–27 days across all strategies**. This means once a player enters a death spiral, they **never escape**. Camp healing (Rest: -15 fatigue +5 morale, Cook: +3 health) cannot outpace the daily damage from encounters + environmental drain.

**Questions**:
- Should camp healing scale with crisis severity? (Triage mechanic: more desperate = more recovery from rest?)
- Should health recovery be buffered? (e.g., +3 passive recovery per day when food/water available, currently exists but may be overwhelmed)
- Is 21+ day crisis streak fundamentally a death spiral with extra steps? Should the game mercy-kill or provide a rescue mechanic at some threshold?

### 4.2 Encounter Frequency Consistently Above Target (0.36–0.39)
All strategies hit 0.36–0.39/day vs the 0.15–0.35 target. This is **by design** — Act III-IV scaling (×1.2, ×1.4) and calm-day ramp (+0.05/day) push the average above the base 0.20. But the question is whether the target range needs updating, or the scaling should be gentler.

**The interaction is**: Act scaling is multiplicative, calm ramp is additive. In Act IV with a 3-day calm streak:
`gate = 0.20 × 1.4 + 3 × 0.05 = 0.28 + 0.15 = 0.43`

**Questions**:
- Should the target range be 0.15–0.45 to accommodate the difficulty curve?
- Or should the base drop to 0.15 to keep the weighted average under 0.35?
- Is the calm ramp too aggressive? +0.05/day → after 6 calm days, ramp adds 0.30 to gate.

### 4.3 Conservative Strategy Is the Best (and It's Not Close)
Conservative achieves 66% survival vs Optimal's 52%. It also reaches Denver 24% vs Optimal's 4%. This suggests the "optimal" strategy isn't actually optimal — or more precisely, the game mechanics reward caution so heavily that aggressive play of any kind is punished.

**Questions**:
- Is this desirable? A trail game should reward caution, but should it reward it *this much*?
- The Optimal strategy uses HardPush when health/fatigue/supplies are good. Should hard-pushing be less penalizing?
- Aggressive strategy (always HardPush, always night travel, refuses bargains) has 12% survival. Is this too punishing, or appropriately suicidal?

### 4.4 Action Entropy Is Low for Smart Strategies
Optimal and Conservative have entropy ~1.0 (out of max ~2.3). This means they cycle between 2–3 actions most of the time. The optimal loop is: Hunt when food < 19, Forage when water < 19, Rest when fatigued > 60, else None.

**Questions**:
- Are Scout, Trade, and Repair undervalued by the strategy heuristics, or by the game mechanics themselves?
- Should scouting provide stronger benefits (better encounter outcomes, not just +20% encounter chance)?
- Should trade be more valuable at settlements?

### 4.5 Optimal Strategy Barely Reaches Denver (4%)
Despite being designed to optimize, the Optimal strategy only gets 4% to Denver. Conservative gets 24%. The difference is that Conservative runs a longer game (slower pace = less fatigue/supply drain) and survives to the end, while Optimal pushes hard and burns out.

**Questions**:
- Should the journey distance (700mi) be shorter?
- Should pace bonuses scale non-linearly (HardPush: 35-45mi but at higher cost, vs Normal: 25-30mi)?
- Is the food/water drain rate the bottleneck, or is it encounter damage?

### 4.6 Camp Repair Rate Is Healthy, But Equipment Still Breaks Too Much
Camp repair accounts for only 13–14% of optimal/conservative camp slots — NOT the mandatory homework we feared. But equipment breakages still push over the 4.0 target (4.3 for Optimal, 5.0 for Aggressive). This suggests the encounter-driven equipment damage is the issue, not the repair mechanism.

---

## 5. System Mechanics Reference

### Supply Consumption (per day)
Defined in `src/systems/supplies.ts`:
- Water: base 5/day (Conservative ×1.0, Normal ×1.0, HardPush ×1.25, night travel ×0.5 extra)
- Food: base 3/day (Conservative ×1.0, Normal ×1.1, HardPush ×1.25)
- Coffee: 1/day when stocked
- Hunt: +4 food, costs 2 ammo
- Forage: +4 food, +4 water

### Health System (per day)
Defined in `src/systems/health.ts`:
- Passive recovery: +4 health/day when food AND water available AND health < 100
- Fatigue: Conservative -5, Normal 0, HardPush +15 (×1.2 with night travel)
- Rest action: -20 fatigue
- High fatigue (>80): -2 health/day
- Water depleted: acquires Dehydration (-2 health/day ongoing)
- Food depleted: -2 health/day starvation
- Horse: passive +3 health/day when thirst/hunger < 70 and supplies available

### Camp Activities
Defined in `src/systems/camp.ts`:
- **Rest**: -15 fatigue, +5 morale
- **Cook**: +3 health, +2 morale (requires food ≥ 2, consumes 1 food; +3 extra morale if coffee > 0)
- **Repair**: +20 durability to worst equipment (requires repair ≥ 1, consumes 1)
- **CompanionChat**: +8 loyalty to target companion
- Evening camp: 1 slot. Full-day camp (Rest action): 2 slots, effects doubled.

### Equipment
Defined in `src/systems/equipment.ts`:
- 6 slots: Saddle, Boots, Rifle, WagonWheel, Canteen, Bedroll
- Daily wear: base 3–5 (Conservative ×1.0, Normal ×1.0, HardPush ×1.5)
- Breakage: durability hits 0. Broken items cause penalties (e.g., broken canteen = -20% water capacity)

### Starting State
Defined in `src/simulator/initial-state.ts`:
- Health: 100, Fatigue: 10, Morale: 70
- Water: 30 (capacity: 80 wagon), Food: 25 (capacity: 60 wagon)
- Ammo: 20, Medical: 5, Repair: 10, Coffee: 8
- All equipment at durability 100
- Skills: survival 40, navigation 30, combat 35, barter 25

### Movement
Defined in `src/systems/movement.ts`:
- Conservative: 15–20 mi/day, Normal: 25–30, HardPush: 35–45
- Night travel: ×0.85 distance, ×1.2 fatigue, 15% lost chance
- Total journey: ~700 miles (Fort Belknap → Denver)

---

## 6. Files Modified in This Enhancement

| File | Changes |
|------|---------|
| `src/simulator/types.ts` | Added `DaySnapshot` fields (pace, action, campActivities, calmDayStreak, equipmentMinDurability); added 8 journey metric fields to `AggregateMetrics` |
| `src/simulator/runner.ts` | Collect per-day snapshots with all new fields; reads `state.journey.calmDayStreak` |
| `src/simulator/report.ts` | `computeJourneyMetrics()` function; stddev/shannonEntropy helpers; Journey Quality + Camp Distribution report sections |
| `src/systems/encounters.ts` | `ENCOUNTER_ACT_SCALING` constant; `ENCOUNTER_CALM_RAMP` constant; `calmDayStreak` in `EncounterCheckInput`; gate calculation uses both |
| `src/types/game-state.ts` | `calmDayStreak?: number` on `JourneyState` |
| `src/engine/game-logic.ts` | Passes `calmDayStreak` to `checkEncounter`; computes next streak in `DayResults` |
| `tests/systems/encounters.test.ts` | 3 new tests (Act I reduces, Act IV increases, calm ramp); morale test updated for act scaling |

---

## 7. Specific Research Questions

Please provide **concrete numerical recommendations** for each:

1. **Encounter gate base**: Should 0.20 stay, drop to 0.15, or change? What should the act scaling multipliers be?
2. **Calm ramp**: Is +0.05/day too aggressive? Should it cap at a lower ceiling (e.g., max +0.15 = 3 calm days)?
3. **Crisis recovery**: What mechanic would break the 21+ day death spiral? (Stronger camp healing? Passive recovery buff? Auto-bargain at critical thresholds?)
4. **Supply rates**: Are consumption rates appropriate? Starting supplies? Hunt/forage yields?
5. **Equipment wear**: Should encounter-caused damage be reduced? Should repair restore more? Should base wear be lower?
6. **Journey length**: Is 700mi / 28–55 day target appropriate, or should it compress?
7. **Difficulty curve shape**: Linear act scaling? Exponential? Should Act I be even gentler (0.6×)?
8. **Balance target ranges**: Should encounterFrequency target widen to 0.15–0.45? Should equipBreakages widen to 1–5?

---

## 8. How to Run the Simulator

```bash
cd c:\frontier\files\frontier-scaffold\frontier

# Quick check (10 runs, random strategy)
npm run simulate:quick

# Full check (50 runs, optimal strategy)
npm run simulate:full

# Custom run
npx tsx src/simulator/index.ts --runs=100 --days=100 --strategy=conservative --seed=12345
```

Available strategies: `random`, `conservative`, `aggressive`, `optimal`

---

## 9. Balance Target Definitions

From `src/simulator/report.ts`:
```typescript
{ metric: 'survivalRate',          min: 0.50, max: 0.95 }
{ metric: 'avgDaysToComplete',     min: 28,   max: 55   }
{ metric: 'avgWaterDepletions',    min: 2,    max: 6    }
{ metric: 'encounterFrequency',    min: 0.15, max: 0.35 }
{ metric: 'avgEquipmentBreakages', min: 1,    max: 4    }
{ metric: 'avgFinalHealth',        min: 30,   max: 80   }
{ metric: 'horseAliveRate',        min: 0.70, max: 0.95 }
```

---

*Generated 2026-02-18. 387 tests passing. Implementation commit: pending (will be committed after this handoff report).*
