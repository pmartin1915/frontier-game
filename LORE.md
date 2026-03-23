# FRONTIER — Historical Ground Truth (1866 Goodnight-Loving Trail)

## Purpose

This document is the historical calibration target for game balance. The headless simulator (`src/simulator/`) validates game mechanics against these figures. AI agents (Claude, Gemini) reference this when making content or balance decisions.

**Cross-references:** Balance targets are encoded as constants in `src/simulator/report.ts`. When updating targets here, sync them there.

---

## Table 1: Key Landmarks & Hazards

| Landmark | Historical Miles | Game Waypoint | Cumulative Mi | Hazard Context | Game Mechanic |
|---|---|---|---|---|---|
| Fort Belknap, TX | 0 | `fort_belknap` | 0 | Abandoned frontier fort on the Brazos. Gathering point. | Start point. Initial supply purchase. Morale: Steady. |
| Middle Concho River | ~80 | `middle_concho` | 130 | Last reliable water before Staked Plains. | Water resupply opportunity. Segment through Cross Timbers. |
| Butterfield Stage Route | 0-80 | (segment) | — | "The Dry Drive." Notorious waterless stretch. High stress. | Water consumption 2x in StakedPlains biome. Rapid thirst decay. |
| Horsehead Crossing | ~80 | `horsehead_crossing` | 240 | Alkali water & quicksand on the Pecos. Bleached horse skulls. | AlkaliPoisoning condition. Horse death risk if water desperate. |
| Castle Gap | ~120 | `castle_gap` | 280 | Narrow canyon. Comanchero ambush point. | Hostile encounter territory. Canyon terrain = 0.6x movement. |
| Pecos River Upstream | 80-300 | (segment) | — | Steep banks, Comanche territory, water tantalizingly close. | Stampede risk, high encounter probability. |
| Fort Sumner / Bosque Redondo | ~450 | `fort_sumner` | 400 | Government post. Navajo reservation. First sale point. | Settlement. Trade opportunity. Fort Sumner debt mechanic. |
| Santa Fe | ~480 | `santa_fe` | 480 | Ancient trading hub. End of Santa Fe Trail. | Settlement. Resupply. |
| Raton Pass | ~600 | `raton_pass` | 560 | "Uncle Dick" Wootton's toll road. 7,800 ft. Snow any month. | Toll: funds cost. MountainPass biome. Snow/hypothermia risk. |
| Trinidad, CO | ~620 | `trinidad` | 600 | First Colorado settlement south of pass. | Settlement. Resupply. |
| Denver | ~700 | `denver` | 700 | Cherry Creek. End of trail. | Journey complete. Win condition. |

### Distance Mapping Note

Historical distances vary by source (600-700mi depending on route variant). The game uses 700 miles total across 9 waypoints. Segments are compressed or stretched for gameplay pacing — historical fidelity is maintained for hazard placement and relative difficulty, not exact mileage.

---

## Table 2: Resource Logistics

| Resource | 1866 Historical Value | Game Value | Source Constant | Calibration Note |
|---|---|---|---|---|
| Rider speed | 25-40 mi/day mounted | 15-45 mi/day | `PACE_CONFIG` in `game-state.ts` | Conservative 15-20, Normal 25-30, HardPush 35-45 |
| Herd speed | 10-15 mi/day | N/A (no herd) | — | Player travels faster than a herd; narrative references this |
| Water consumption | ~1 gal/day per rider | 3-5 units/day | `supplies.ts` base: -3 | Abstract units. HardPush multiplier 1.25x, heat adds -1 |
| Food consumption | 18oz flour + beans/day | 2-4 units/day | `supplies.ts` base: -2 | Companions add -1 each |
| Coffee | 1.6oz/day (critical morale) | 1 unit/day | `supplies.ts` base: -1 | Morale: +2 if available, -3 if depleted |
| Wagon capacity | 2,500-3,000 lbs | 80W / 60F units | `TRANSPORT_CAPACITY` | Overloading risk in historical; game caps at capacity |
| Pack horse capacity | ~200 lbs | 40W / 30F units | `TRANSPORT_CAPACITY` | Mid-tier transport |
| Saddlebags | ~50 lbs | 10W / 15F units | `TRANSPORT_CAPACITY` | Minimal capacity, high mobility |

---

## Table 3: Economic Variables (1866)

| Item | Historical Price | Game Equivalent | Notes |
|---|---|---|---|
| Trail Boss salary | $100-125/month | N/A (player is boss) | Narrative reference |
| Cook salary | $60/month | Companion cost ref | Critical role — converts flour to rations |
| Drover (cowboy) | $30/month | Companion cost ref | 1 drover per ~300 cattle |
| Steer sale price | ~$10/head at Denver | Narrative ref | Historical: $12,000 gold for 1,200 head |
| Raton Pass toll | $0.10/head cattle | funds -5 (abstracted) | Significant late-game expense |
| General store markup | 200-300% frontier | funds -10-15 per trade | Settlement trade encounters |
| Horse (replacement) | $25-50 | N/A (single horse) | Historical context |
| Rifle (Sharps carbine) | $30-50 | Equipment slot | Single-shot, cap-and-ball era |

---

## Balance Targets (Simulator Validation)

Pass/fail criteria for `npm run simulate`. Strategy: `optimal` with 50 runs.

| Metric | Target Min | Target Max | Rationale |
|---|---|---|---|
| Survival rate | 50% | 95% | Too low = unfun death spiral; too high = no tension |
| Avg days to Denver | 28 | 50 | 700mi / 15-25mi per day average |
| Water depletion events | 2 | 6 | Should feel scarce, not constant |
| Encounter frequency | 0.15/day | 0.35/day | Some days quiet, some eventful |
| Equipment breakage events | 1 | 4 | Enough to matter, not overwhelming |
| Avg player health at Denver | 30 | 80 | Arrival should feel earned, not trivial |
| Horse alive at Denver | 70% | 95% | Horse death is dramatic but not common |

If the simulator reports values outside these ranges, the finding is documented (not auto-corrected). Balance tuning is a separate task.

---

## Historical Context for Narrative

### Timeline (1866)

- **April 1865:** Civil War ended (14 months prior to game start)
- **June 1866:** Game begins. Reconstruction underway. Federal troops in Texas.
- **Comanche Wars:** Ongoing. No peace treaty until Medicine Lodge (October 1867).
- **Railroad:** No railroad in Texas yet. Nearest railhead in Kansas (Abilene not established until 1867).
- **Telegraph:** Only in major settlements east of the frontier.

### Period-Accurate Details

- **Weapons:** Single-shot rifles (Sharps, Spencer), cap-and-ball revolvers (Colt Navy/Army). NO Winchester (1873). NO metallic cartridge repeaters on the frontier.
- **Infrastructure:** NO barbed wire (1874). NO windmills on the plains. Adobe and log construction.
- **Currency:** US dollars and gold coin. Some Mexican pesos in border areas. Paper money distrusted on the frontier.
- **Medicine:** Quinine for fever, whiskey for anesthetic, poultices for wounds, bone-setting by hand. NO antiseptics (Lister's work published 1867). NO anesthesia beyond laudanum/whiskey.
- **Food:** Sourdough biscuits ("bullets"), beans ("Pecos strawberries"), salt pork, dried beef (jerky), coffee (essential). NO canned goods widely available.

### Vocabulary Constraints (Anachronism Firewall)

These supplement the constraints in CLAUDE.md's Narrator section:

| Use This | NOT This | Reason |
|---|---|---|
| melancholy | depression | Clinical term is 20th century |
| haunted | traumatized | PTSD concept is post-WWI |
| Negro / freedman | African American | Period terminology |
| consumptive | tubercular patient | Period terminology |
| Indian / Comanche | Native American | Period terminology |
| cattle | livestock (acceptable) | Specificity preferred |
| revolver / pistol | handgun | Period terminology |
| fortitude | resilience | Modern self-help connotation |

### Key Historical Figures

- **Charles Goodnight (1836-1929):** Texas Ranger, cattleman. Blazed the trail with Loving in 1866. Invented the chuck wagon.
- **Oliver Loving (1812-1867):** Goodnight's partner. Wounded by Comanches on the second drive (1867). Died of gangrene at Fort Sumner.
- **"Uncle Dick" Wootton (1816-1893):** Mountain man who built the toll road over Raton Pass in 1865. Charged $1.50/wagon, $0.10/head cattle.
- **Bose Ikard (1843-1929):** Freedman, one of the best cowhands on the Goodnight drives. Goodnight's most trusted hand.
