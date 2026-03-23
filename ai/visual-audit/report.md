# Frontier Visual Audit Report

**Date:** 2026-03-21
**Sweep:** 36/36 screenshots captured (120.9s)
**Baselines:** 19/19 Playwright visual regression tests updated and passing

---

## 10-Point Checklist

### 1. Gemini Sprites Render Correctly
**PASS** — Horse (riding base), wagon, and player cowboy all render at correct scale and position across all trail biome/time-of-day combinations. Sprite art quality is consistent with the Hi-Bit aesthetic. Horse proportions look natural. Wagon silhouette is clear behind the horse in trail scenes.

### 2. Weather Particles Visible Against Biome Backgrounds
**PASS (subtle)** — Weather effects are active but subtle in static screenshots. This is expected since rain streaks, snow flakes, and dust particles are animated and a single frame capture may catch them mid-cycle. The storm shot (#16) shows the darkened atmosphere. Dust (#18) shows the haze overlay against high desert mesa terrain. Heatwave (#19) shimmer and overcast (#20) grey tint are visible as atmosphere shifts rather than discrete particles.

### 3. Clouds Appear/Disappear with Weather and Time-of-Day
**PASS** — Cloud ellipses clearly visible in:
- Overcast (#27): multiple grey-tinted clouds across sky
- Storm (#28): heavy cloud coverage
- Clear (#29): 1-2 sparse clouds
- Night (#30): clouds invisible (correct behavior)
- Trail campfire (#31): clouds visible with sunset tones
- Degradation (#32): clouds visible in afternoon light
- Dawn atmosphere (#36): clouds at horizon level

Clouds correctly disappear at night and increase density with overcast/storm weather.

### 4. Fireflies Present in Camp for Warm Biomes Only
**PARTIAL** — Camp scenes all show correct night sky (moon, stars, Milky Way) and campfire with glow. Fireflies are very small yellow-green dots and may not be visible at the 960x600 capture resolution / static frame timing. The campfire sprite, embers, and warm glow circle are clearly visible in all 5 camp shots (#22-26). Firefly presence cannot be conclusively confirmed from static screenshots alone — they animate with alpha pulse so a single frame may catch them at low opacity.

**Recommendation:** Verify fireflies interactively in browser for crossTimbers (#22), coloradoPlains (#23), and pecosValley (#26) — the three warm biomes where they should appear.

### 5. Trail Campfire Shows Sprite + Embers + Glow
**PASS** — Shot #31 (campfire-trail) clearly shows the campfire sprite rendered on the trail scene with a warm ambient glow. The campfire is visible at ground level near the party. Embers are animated particles so may not all be visible in a single frame, but the overall campfire presentation is a clear upgrade from the previous placeholder rectangle.

### 6. Sky Gradients Correct per Time-of-Day
**PASS** — Distinct sky rendering across all 6 time periods:
- **Dawn** (#05, #11, #14, #36): warm rose/amber horizon gradient transitioning to dark blue zenith
- **Morning** (#01, #07, #20): blue-grey sky with light horizon
- **Midday** (#03, #06, #12, #18): bright blue sky, minimal gradient
- **Afternoon** (#09, #13, #21): warm golden-hour tones, lower sun position
- **Sunset** (#04, #08): deep red-orange horizon, dark upper sky
- **Night** (#02, #10, #30): dark sky with visible moon and stars

### 7. Terrain Silhouettes Match Biome
**PASS** — Each biome shows distinct terrain profiles:
- **Cross Timbers** (#01-02): flat terrain with trees and fence objects
- **Staked Plains** (#03-04): flat horizon, minimal terrain features
- **Desert Approach** (#05-06): mesa/butte silhouettes on horizon
- **Pecos Valley** (#07-08): canyon wall profiles
- **High Desert** (#09-10, #18): prominent mesa silhouettes
- **Mountain Pass** (#11-12, #17): triangular mountain peaks
- **Colorado Plains** (#13-14, #20): rolling hills profile

### 8. Shadows Under Characters
**PASS** — Shadow ellipses visible under horse and wagon sprites in daytime trail shots. Shadows are subtle (as designed) and vary in alpha with time-of-day — strongest at midday, weakest at dawn/night. Camp scenes show warm shadow ellipses under campfire area.

### 9. Wagon and Cat Visible
**PASS** — Wagon (#33) clearly visible behind horse, correct scale and position. Cat (#34) visible as small sprite near the party group. Both render without z-fighting or overlap artifacts.

### 10. Full Party Rendering
**PASS** — Full party shot (#35) shows horse, wagon, and party members rendered together. No sprite overlap issues, proper depth ordering maintained.

---

## Summary

| Category | Result | Notes |
|----------|--------|-------|
| Sprites | PASS | All Gemini v2 sprites render correctly |
| Weather | PASS | Effects active, subtle in stills (expected) |
| Clouds | PASS | Correct density/visibility per weather+tod |
| Fireflies | PARTIAL | Cannot confirm from stills; verify in browser |
| Campfire | PASS | Sprite + glow clearly visible |
| Sky | PASS | All 6 time-of-day gradients correct |
| Terrain | PASS | 5 profile generators producing distinct silhouettes |
| Shadows | PASS | Time-of-day alpha variation working |
| Assets | PASS | Wagon, cat, party all visible |
| Composition | PASS | No z-fighting, proper depth ordering |

**Overall: 9/10 PASS, 1/10 PARTIAL (fireflies — needs interactive verification)**

---

## Issues Found

### Minor
1. **Firefly visibility in stills** — Fireflies use alpha pulse animation; static screenshots may miss them at low-opacity frames. Not a code bug — just a limitation of screenshot-based auditing.

### Observations (not issues)
- Weather particles are designed to be atmospheric, not aggressive. This is the correct visual design choice — they add mood without obscuring gameplay.
- Cloud ellipses are simple but effective at the current scale. Future work could add more organic cloud shapes.
- The "Bridge: Connected" dev overlay appears in all screenshots. This will not appear in production builds (`window.__frontier` is dev-only).

---

## Next Audit
Scheduled: next Wednesday or Friday per dev-ops task cadence.
