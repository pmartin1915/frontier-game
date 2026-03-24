# Agent Handoff Document
<!-- Generated 2026-03-23 -->

## Handoff Metadata

- **Timestamp:** 2026-03-23T21:20
- **Sending Agent:** Claude Opus 4.6 (Claude Code)
- **Reason:** Context window approaching limit after extended session
- **Branch:** main
- **Latest tag:** v1.0.4 (building → TestFlight)

## What Was Done This Session

### Phase 8: Polish & Feel (complete)
- Scene fade transitions (400ms camera fadeOut/fadeIn)
- ErrorBoundary + toast system (success/error, aria-live)
- Keyboard navigation (Escape closes overlays)
- Mobile responsive CSS + HelpCard
- 7 Playwright e2e tests for Phase 8 features

### iOS TestFlight Pipeline (complete)
- Tauri 2.10 wrapper (WKWebView)
- Bundle ID: `com.perrymartin.frontier`, App Store name: "Frontier Trail"
- GitHub Actions: `ios-build.yml` + `ios-init.yml`
- Custom cargo build script (tauri-cli --configuration bug workaround)
- Version strategy: `1.0.<github.run_number>` (auto-increments)
- 8 GitHub secrets configured, app icon generated (western sunset silhouette)
- App Store Connect app record created, tester added

### Mobile Layout Redesign (complete)
- `useIsMobile` hook (767px breakpoint)
- `MobileLayout`: full-screen Phaser canvas + bottom HUD bar + modal system
- `MobileHudBar`, `MobileModal`, `MobileStatsPanel`, `MobileDaySheet`
- Desktop flexlayout preserved for >=768px

### Silhouette Sprite Pivot (complete)
- `scripts/generate-silhouettes.py` converts all 14 character sprite sheets
- `scripts/silhouette-objects.py` converts all 26 scenery object PNGs
- Rim light system: second sprite per character, tinted by time-of-day (RIM_COLORS)
- Color backups as `*_color_backup.png`

### Bug Fixes from Device Testing (complete, deploying in v1.0.4)
- Canvas context null-checks (8 locations) — prevents WKWebView black screen
- Player leads party (rightmost position)
- Sprites animate to Walk during travel → triggers parallax scroll
- **v1.0.4 fixes (just committed):**
  - Phaser Scale.RESIZE → Scale.FIT (640×360, 16:9 preserved, works in landscape)
  - Resize + orientationchange listener for viewport rotation
  - viewport-fit=cover in index.html
  - SPRITE_SCALE rebalanced: player 0.65, horse 0.55 (was 1.0 = grotesquely oversized)
  - Walk-bob tween (2-3px vertical bounce during Walk/Run)
  - Camp scene: warm fill tint (0x442200) + fire rim so silhouettes visible at night

### Auto-Play Test Harness (complete)
- `e2e/auto-play.spec.ts` — plays 20 days via built-in auto-player
- Validates: no negative health/water/food, no soft-locks, canvas stays visible
- `npm run test:auto-play`

## Current Test Status
- **401 Vitest** — all passing
- **28 Playwright** (sprites + visual regression + phase8 polish) — all passing
- **1 Auto-play** (20-day run) — passing
- TypeScript clean

## What's Next (Prioritized)

### 1. Sprite Quality Pipeline (HIGH — user's next request)
The user shared a sprite visual review pipeline prompt from their Wilderness project. The idea: use Gemini vision to triage each spritesheet, identify bad frames (especially horse front legs which never lift), and iterate until quality passes. Key reference:
- Sprite-Forge at `C:\Users\perry\DevProjects\sprite-forge\`
- 13 entities, silhouette style with rim highlights
- Horse walk cycle is the worst offender — front legs barely move
- Current workaround: walk-bob tween hides the stiffness
- Long-term: regenerate with better AI or hand-edit silhouette frames

### 2. Verify v1.0.4 on Device
- Scale.FIT should fix landscape black void
- Proportions should look correct (horse no longer 2x player size)
- Walk-bob should convey movement
- Camp characters should be visible at night

### 3. Haptics + Sound
- iOS Taptic Engine feedback on button presses, encounters, day transitions
- Verify audio works in WKWebView (autoplay policies)
- Audio system already implemented (Web Audio + Howler.js) — needs iOS testing

### 4. Narrator API in Production
- Claude Sonnet narrative engine needs Vercel edge proxy wired up
- Without it, only fallback text appears in Travel Log
- API key: ANTHROPIC_API_KEY in Vercel env vars

### 5. World Polish
- Increase scenery object density for richer landscapes
- Add more parallax depth layers
- Verify dust particles emit during travel
- Consider landscape orientation lock for gameplay

## Key Architecture Notes

- **Three-layer rule:** Game Logic → Director → Narrator (strict order)
- **Import boundaries:** types/ ← systems/ ← store/ ← engine/ ← phaser/ui
- **Phaser ↔ React:** Zustand store bridges via `subscribe()`. Phaser never uses React hooks.
- **Mobile layout:** `useIsMobile()` switches between `DesktopLayout` (flexlayout) and `MobileLayout` (fullscreen canvas + modals)
- **Silhouette sprites:** Dark warm brown fill (#1a1410) + rim edge highlights (#3a2a20/#5a4632). Rim light sprite at 1.06x scale, 0.35 alpha, tinted by `RIM_COLORS[timeOfDay]`.
- **iOS build:** `npx tauri ios build` with custom cargo build script in project.pbxproj. Version injected as `1.0.<run_number>` before build.

## File Map (Key Files)

| Area | File |
|------|------|
| App root | `src/App.tsx` |
| Mobile layout | `src/ui/layout/MobileLayout.tsx`, `MobileHudBar.tsx`, `MobileModal.tsx`, `MobileStatsPanel.tsx`, `MobileDaySheet.tsx` |
| Desktop layout | `src/ui/layout/DesktopLayout.tsx` |
| Phaser config | `src/phaser/config.ts`, `src/ui/panels/AnimationPanel.tsx` |
| Sprite system | `src/phaser/sprites/CharacterSprite.ts`, `src/phaser/sprite-registry.ts` |
| Animation types | `src/types/animation.ts` (AnimationState, RIM_COLORS, TIME_PALETTES) |
| Trail scene | `src/phaser/scenes/TrailScene.ts` |
| Camp scene | `src/phaser/scenes/CampScene.ts` |
| Sky/terrain | `src/phaser/effects/sky-renderer.ts`, `terrain-layers.ts` |
| Parallax | `src/phaser/effects/scenery-manager.ts` |
| Weather | `src/phaser/effects/weather-overlay.ts`, `cloud-layer.ts` |
| Store | `src/store/index.ts`, `src/store/selectors.ts` |
| Daily cycle | `src/engine/daily-cycle.ts` |
| Auto-player | `src/engine/auto-player.ts` |
| iOS build | `.github/workflows/ios-build.yml` |
| Silhouette gen | `scripts/generate-silhouettes.py`, `scripts/silhouette-objects.py` |
| Tests | `e2e/auto-play.spec.ts`, `e2e/phase8-polish.spec.ts`, `e2e/visual-regression.spec.ts` |

## GitHub Repo
- Remote: `https://github.com/pmartin1915/frontier.git`
- iOS build runs on `macos-15` via GitHub Actions
- 8 secrets configured (cert, key, provisioning profile, API key, team ID)
