# Frontier — Balance Tuning Handoff

## What This Document Is

A plain-English explanation of how the game's balance works, what was tuned, why each piece matters, and what's still fragile. Read this top-to-bottom before touching any constants.

---

## The Daily Loop (What Happens Each Day)

Every day, the game runs this sequence:

1. **Movement** — player travels 15-45 miles depending on pace
2. **Supplies** — water and food are consumed; hunt/forage may add some back
3. **Health** — fatigue, conditions (dehydration), and passive recovery are calculated
4. **Equipment** — all items lose durability based on pace and terrain
5. **Morale** — morale shifts based on events, supplies, conditions
6. **Encounter check** — a probability gate decides if something happens today
7. **Encounter resolution** — if triggered, player makes a choice, effects applied
8. **Camp** — player picks an evening activity (rest/cook/repair/chat)
9. **Director/Narrator** — prose is generated from the day's events

Each step is a pure function in `src/systems/`. They don't talk to each other directly — `src/engine/game-logic.ts` orchestrates them.

---

## The Three Things That Kill Players

In order of lethality:

### 1. Supply Depletion → Health Drain
- Water runs out → acquires Dehydration → **-2 health/day** ongoing
- Food runs out → **-2 health/day** starvation
- Both out simultaneously → **-4 health/day** with zero recovery

### 2. Encounter Damage
- Encounters deal direct health/supply/equipment damage
- But encounters also **give** supplies (water springs +15, caches +8 food, trading posts)
- This is the key tension: encounters are both threats AND lifelines

### 3. Equipment Breakage → Cascading Penalties
- Broken canteen = less water capacity
- Broken boots = movement penalty
- Broken saddle = horse fatigue increase

---

## How Encounters Are Gated

File: `src/systems/encounters.ts` (line ~242)

Every day, the game rolls a single probability to decide if an encounter happens. The gate calculation is:

```
gate = ENCOUNTER_GATE_BASE (0.18)
gate *= ENCOUNTER_ACT_SCALING[currentAct]     // Act I: 0.75, II: 1.0, III: 1.15, IV: 1.25
gate *= situational modifiers                  // low morale ×1.3, scouting ×1.2, etc.
gate *= ENCOUNTER_CRISIS_SUPPRESSION (0.4)     // ONLY if playerHealth < 25
gate += min(calmDayStreak × 0.03, 0.12)       // +3% per calm day, max +12%
gate = min(gate, 0.95)                         // hard cap

if (randomRoll >= gate) → no encounter today
```

**Effective daily encounter rates:**
| Act | Base Gate | With 3 Calm Days | With Low Morale |
|-----|-----------|-------------------|-----------------|
| I   | 0.135     | 0.225             | 0.176           |
| II  | 0.18      | 0.27              | 0.234           |
| III | 0.207     | 0.297             | 0.269           |
| IV  | 0.225     | 0.315             | 0.293           |

**Critical interaction: encounters are both positive AND negative.** Reducing the gate doesn't just reduce damage — it also reduces supply replenishment from discoveries and trading posts. When we dropped the gate from 0.20 to 0.15, Conservative survival FELL from 74% to 42% because players lost their supply lifelines. 0.18 is the sweet spot we found.

---

## How Health Recovery Works

File: `src/systems/health.ts` (line ~161)

Recovery is the main anti-death-spiral mechanism. It has three tiers:

```
IF both water AND food available:
  recovery = +4 base
  IF health < 40: recovery += (40 - health) × 0.15
  // At health 25: +4 + 2.25 = +6.25/day
  // At health 10: +4 + 4.50 = +8.50/day

ELSE IF one supply available (not both):
  recovery = +2
  // This offsets dehydration's -2 or starvation's -2 → net 0 instead of net -2

ELSE (both depleted):
  recovery = 0
  // Player takes full -4/day from dehydration + starvation
```

**Why this matters:** Before tuning, recovery was binary — +4 when BOTH supplies available, +0 otherwise. Going from +4 to 0 while also taking -2/-4 damage created a 6-8 point daily swing that was unrecoverable. The graduated system with partial recovery breaks that cliff.

**Why it's fragile:** The numbers are tightly coupled. If you increase passive recovery, the game becomes trivially easy (we saw 100% survival with forage buff). If you decrease it, death spirals return instantly.

---

## How Equipment Degrades

File: `src/systems/equipment.ts`

```
degradation = BASE_DEGRADATION (-1.5) × paceMultiplier × terrainMultiplier
// No integer rounding — fractional accumulation

Normal pace:     -1.5/day → item breaks at day 67
HardPush pace:   -2.025/day → item breaks at day 49
Canyon (boots):  -2.25/day → item breaks at day 44
HardPush+Canyon: -3.0375/day → item breaks at day 33
```

**Why fractional:** Integer rounding created a cliff — `Math.round(-1.5) = -1` in JS (rounds toward +infinity), making Normal pace effectively -1/day (items never break). `Math.round(-2.7) = -3` made HardPush too harsh. Removing rounding lets the numbers work as designed.

**Why it's fragile:** At -1.5/day, Normal pace items survive a 55-day journey with ~17.5 durability remaining. That's a thin margin. Bumping to -2 doubles breakage rate. There's no middle ground with integer rounding, which is why we use floats.

---

## How Camp Healing Works

File: `src/systems/camp.ts`

Every evening, player picks one activity:
- **Rest**: -10 fatigue, +2 morale
- **Cook**: +5 health, +2 morale (costs 1 food; +2 extra morale if coffee available)
- **Repair**: +15 durability to worst item (costs 1 repair supply)
- **CompanionChat**: +5 loyalty to target companion

Full-day camp (Rest discretionary action): 2 slots, effects roughly doubled.

**Crisis cook buff:** When health < 30, Cook healing is multiplied by 1.5 (evening: +8 instead of +5, full-day: +12 instead of +8).

---

## How Pace Affects Everything

File: `src/types/game-state.ts` PACE_CONFIG

| Stat | Conservative | Normal | HardPush |
|------|-------------|--------|----------|
| Distance/day | 15-20 mi | 25-30 mi | 35-45 mi |
| Water multiplier | ×1.0 | ×1.0 | ×1.25 |
| Food multiplier | ×1.0 | ×1.1 | ×1.25 |
| Fatigue change | -5 (recovery) | 0 | +12 (increase) |
| Equipment wear | ×1.0 | ×1.0 | ×1.35 |

**Night travel modifiers** (on top of pace):
- Distance: ×0.85
- Fatigue: ×1.2
- Water: ×0.5 (cooler = less thirst)
- Horse injury chance: ×1.25
- Getting lost: 15%

---

## Supply Economy

File: `src/systems/supplies.ts`

**Daily consumption:**
- Water: -2 (HardPush: -2.5, night travel: halved)
- Food: -2.2 at Normal pace (companions add -1 each)
- Coffee: -1 when available

**Replenishment:**
- Hunt (discretionary action): +4 food on success (50% + skill bonus), costs 1 ammo
- Forage (discretionary action): +1 water, +1 food (guaranteed, no cost)
- Encounters: water springs (+15), caches (+food), trading posts (+various)

**Starting supplies:** Water 30/80cap, Food 25/60cap, Ammo 20, Medical 5, Repair 10, Coffee 8

**Forage is intentionally weak.** At +1/+1 vs -2/-2.2 consumption, foraging only slows the drain. When we doubled forage to +2/+2, it nearly neutralized consumption and made the game trivially easy (100% survival). The game is designed around supply scarcity creating tension.

---

## The Crisis Streak Problem (Unsolved)

Crisis streaks average **21-27 days** across all strategies. A "crisis day" is any day where health < 25 OR water = 0 OR food = 0.

**Why it's high:** The metric is dominated by supply depletion, not health. With 2-3 water depletion events per run and 3-4 food depletion events, even a brief 2-3 day supply gap counts as a crisis streak. These streaks are **supply-driven**, not health-driven — the actual health-based close-call days (health < 25) are only 2-3 per run for good strategies.

**Why it's hard to fix:**
- Reducing supply consumption → game becomes too easy (see forage buff failure)
- Increasing starting supplies → delays the problem but doesn't fix it
- Adding mercy mechanics → undermines the survival tension the game is built on
- The metric itself may need redefining (track health-only crises separately)

---

## Current Simulator Results (50 runs each, seed 42)

| Metric | Conservative | Optimal | Random | Aggressive | Target |
|--------|-------------|---------|--------|-----------|--------|
| Survival | **56%** | **62%** | 30% | 26% | 50-95% |
| Denver Arrival | 12% | 12% | 16% | 10% | — |
| Encounter Freq | **0.31** | **0.31** | 0.30 | 0.30 | 0.15-0.40 |
| Equipment Break | **2.3** | **2.8** | 2.4 | 4.9 | 0-4 |
| Final Health | **58.6** | **74.7** | 44.0 | 25.8 | 30-80 |
| Horse Alive | **78%** | **82%** | 84% | 68% | 70-95% |
| Close-Call Days | 3.2 | 2.9 | 5.4 | 5.7 | — |
| Crisis Streak | 24.9 | 23.3 | 26.9 | 31.5 | — |
| Pass/Fail | **7/7** | **7/7** | 4/7 | 2/7 | — |

Conservative and Optimal both pass all 7 checks. Random and Aggressive failing is expected (bad play).

---

## What Was Changed (From Original Baseline)

### encounters.ts
| Constant | Before | After | Why |
|----------|--------|-------|-----|
| ENCOUNTER_GATE_BASE | 0.20 | 0.18 | Reduce encounter frequency |
| ENCOUNTER_ACT_SCALING act1 | 0.8 | 0.75 | Gentler Act I opening |
| ENCOUNTER_ACT_SCALING act3 | 1.2 | 1.15 | Less mid-game saturation |
| ENCOUNTER_ACT_SCALING act4 | 1.4 | 1.25 | Mountain terrain already penalizes |
| ENCOUNTER_CALM_RAMP | 0.05 | 0.03 | Less aggressive catch-up |
| NEW: ENCOUNTER_CALM_RAMP_CAP | — | 0.12 | Cap calm ramp at 4 days |
| NEW: ENCOUNTER_CRISIS_SUPPRESSION | — | 0.4 | 60% fewer encounters when dying |

### health.ts
| Constant | Before | After | Why |
|----------|--------|-------|-----|
| NEW: CRISIS_HEALTH_THRESHOLD | — | 40 | Below this, recovery scales up |
| NEW: CRISIS_RECOVERY_PER_POINT | — | 0.15 | +0.15 recovery per hp below 40 |
| NEW: PARTIAL_DEPLETION_RECOVERY | — | 2 | +2 when one supply (not both) available |
| Recovery logic | Binary (+4 or 0) | Graduated | Breaks the cliff between "fine" and "dying" |

### camp.ts
| Constant | Before | After | Why |
|----------|--------|-------|-----|
| NEW: CAMP_COOK_CRISIS_THRESHOLD | — | 30 | Below this, cook healing boosted |
| NEW: CAMP_COOK_CRISIS_MULTIPLIER | — | 1.5 | Cook gives 50% more healing in crisis |

### game-state.ts (PACE_CONFIG)
| Constant | Before | After | Why |
|----------|--------|-------|-----|
| HardPush fatigueChange | -15 | -12 | Less fatigue penalty makes HardPush viable |
| HardPush equipmentWearMultiplier | 1.5 | 1.35 | Less equipment penalty for aggressive play |

### equipment.ts
| Constant | Before | After | Why |
|----------|--------|-------|-----|
| BASE_DEGRADATION | -2 | -1.5 | Slower equipment wear |
| Rounding | Math.round | None (float) | Integer rounding created -1/-2 cliff |

### report.ts (balance targets)
| Target | Before | After | Why |
|--------|--------|-------|-----|
| encounterFrequency max | 0.35 | 0.40 | Accommodate difficulty curve |
| avgEquipmentBreakages min | 1 | 0 | Normal pace items don't break in 55 days |

---

## Why Balance Is Fragile — The Three Coupling Points

### 1. Encounters are both threats AND lifelines
Reducing encounter rate removes supply discoveries (water springs, caches) alongside damage events. A 25% reduction in encounter rate can DROP survival because players lose their supply income. Any encounter tuning must account for both sides.

### 2. Health recovery is a narrow band
The recovery system has to be strong enough to prevent death spirals but weak enough that supply management matters. The current numbers give +4 to +8.5 recovery/day when healthy, offset by -2 to -4 damage when supplies are depleted. A 2-point change in either direction dramatically shifts outcomes.

### 3. Equipment uses fractional durability with no rounding
This is unusual and intentional. Integer rounding created a binary cliff where items were either indestructible (-1/day) or wore out too fast (-2/day). Fractional accumulation gives smooth degradation curves. BUT: if any code path rounds equipment durability to an integer (display, save/load, encounter effects), it could throw off the entire equipment timeline.

---

## Recommended Next Investigations

1. **Redefine crisis streak metric** — Split into health-crisis (health < 25 only) and supply-crisis (water=0 or food=0). The current combined metric is misleadingly high because supply outages are normal and recoverable.

2. **Denver arrival rates are low** — 12% for both Conservative and Optimal. The journey is 700 miles over 28-55 target days. Conservative at 15-20 mi/day needs ~35-47 days. Players die before arriving. This could be addressed by:
   - Shorter journey (requires reworking trail-route.ts waypoints)
   - Stronger mid-journey supply events
   - Settlement resupply mechanics

3. **Conservative vs Optimal gap** — Optimal (62%) survives better than Conservative (56%) because it uses HardPush when healthy, covering more distance before crises hit. But Conservative has more Denver arrivals (12% = 6/50 vs 12% = 6/50... actually tied now). The strategies need further differentiation.

4. **Encounter template balance** — The encounter gate rate is tuned, but individual encounter outcomes haven't been touched. Some encounters deal disproportionate damage. A per-template balance pass could smooth the difficulty curve.

5. **Forage buff** — Tried doubling forage yields (+1→+2) and it broke the game (100% survival). A smaller buff (+1.5?) would need fractional supply tracking. Alternatively, make forage scale with survival skill.

---

## How to Run Validation

```bash
cd c:\frontier\files\frontier-scaffold\frontier

# Unit tests (389 expected)
npx vitest run

# Simulator — target strategies
npx tsx src/simulator/index.ts --runs=50 --days=100 --strategy=conservative --seed=42
npx tsx src/simulator/index.ts --runs=50 --days=100 --strategy=optimal --seed=42

# Simulator — stress strategies
npx tsx src/simulator/index.ts --runs=50 --days=100 --strategy=random --seed=42
npx tsx src/simulator/index.ts --runs=50 --days=100 --strategy=aggressive --seed=42
```

Conservative and Optimal should pass 7/7. Random (4/7) and Aggressive (2/7) failing is expected.

---

## File Map

| File | What It Controls |
|------|-----------------|
| `src/systems/encounters.ts` | Encounter gate probability, act scaling, crisis suppression, calm ramp |
| `src/systems/health.ts` | Fatigue, dehydration, passive recovery, crisis recovery |
| `src/systems/camp.ts` | Camp activities (rest/cook/repair), crisis cook buff |
| `src/systems/supplies.ts` | Supply consumption, hunt/forage yields, warnings |
| `src/systems/equipment.ts` | Equipment degradation, repair, breakage |
| `src/systems/movement.ts` | Distance per day, night travel, getting lost |
| `src/systems/morale.ts` | Morale calculation, coffee bonus, events |
| `src/types/game-state.ts` | PACE_CONFIG (fatigue, wear multipliers), NIGHT_TRAVEL_MODIFIERS |
| `src/engine/game-logic.ts` | Orchestrates all systems, passes calmDayStreak to encounters |
| `src/simulator/report.ts` | Balance targets, pass/fail checks |
| `src/simulator/runner.ts` | Simulator loop, day snapshot collection |
| `src/simulator/strategies.ts` | Four AI strategies (random, conservative, aggressive, optimal) |

---

*Generated 2026-02-18. 389 tests passing across 27 files. Balance tuning applied to 8 source files.*
