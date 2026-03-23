/**
 * Frontier — Auto-Player
 *
 * Subscribes to the Zustand store and autonomously handles every decision
 * point when autoPlay === true. Designed so AI instances (or observers)
 * can watch the game run itself end-to-end.
 *
 * Decision phases handled:
 *   briefing → dismiss (Begin Day)
 *   idle     → pick pace/action, start daily cycle
 *   event    → pick first available encounter choice
 *   camp     → pick best activity based on current needs
 *   bargain  → decline (conservative default)
 *   travel / evening → wait (engine-driven, no input needed)
 *
 * Call initAutoPlayer() once from App.tsx.
 * Toggle via store.setAutoPlay(true/false).
 */

import { store } from '@/store';
import { Pace, DiscretionaryAction } from '@/types/game-state';
import { CampActivity } from '@/types/camp';
import type { CampActivitySelection } from '@/types/camp';

/** Delay between phase detection and acting (ms). Keeps the UI watchable. */
const STEP_DELAY_MS = 1200;

// --- Decision thresholds (named constants so tweaks are self-documenting) ---
const HEALTH_CRISIS       = 35;  // Below: conservative pace
const HEALTH_ACTION_REST  = 40;  // Below: prefer Rest action
const FATIGUE_HIGH        = 70;  // Above: conservative pace + Rest action
const WATER_LOW           = 8;   // Below: conservative pace
const FOOD_HUNT           = 12;  // Below (+ ammo available): Hunt
const FOOD_FORAGE         = 20;  // Below (+ survival skill): Forage
const AMMO_MIN_HUNT       = 2;   // Minimum ammo to attempt hunting
const SKILL_FORAGE_MIN    = 25;  // Minimum survival skill to attempt foraging
const DURABILITY_REPAIR   = 25;  // Below: Repair action
const HORSE_CRISIS        = 35;  // Below: conservative pace
const HEALTH_PUSH_MIN     = 75;  // All-green threshold for Hard Push
const HORSE_PUSH_MIN      = 75;
const WATER_PUSH_MIN      = 30;
const FATIGUE_PUSH_MAX    = 25;
const SCOUT_INTERVAL      = 4;   // Scout every N days
// Camp thresholds
const CAMP_FATIGUE_REST   = 50;
const CAMP_MORALE_REST    = 40;
const CAMP_HEALTH_COOK    = 85;
const CAMP_HEALTH_URGENT  = 50;
const CAMP_FOOD_COOK      = 2;
const CAMP_DUR_REPAIR     = 50;
const CAMP_DUR_URGENT     = 20;
const CAMP_LOYALTY_LOW    = 40;

let unsubscribe: (() => void) | null = null;
let stepTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Decision helpers
// ---------------------------------------------------------------------------

function decideDailyStep(): { pace: Pace; action: DiscretionaryAction; nightTravel: boolean } {
  const s = store.getState();
  const { player, horse, supplies, journey } = s;

  // Pace — conservative when resources or health are stressed
  let pace = Pace.Normal;
  if (
    player.health < HEALTH_CRISIS ||
    horse.health  < HORSE_CRISIS  ||
    supplies.water < WATER_LOW    ||
    player.fatigue > FATIGUE_HIGH
  ) {
    pace = Pace.Conservative;
  } else if (
    player.health  > HEALTH_PUSH_MIN &&
    horse.health   > HORSE_PUSH_MIN  &&
    supplies.water > WATER_PUSH_MIN  &&
    player.fatigue < FATIGUE_PUSH_MAX
  ) {
    pace = Pace.HardPush;
  }

  // Action — survival priorities first; fallback to productive work
  let action = DiscretionaryAction.None;
  if (player.health < HEALTH_ACTION_REST || player.fatigue > FATIGUE_HIGH) {
    action = DiscretionaryAction.Rest;
  } else if (supplies.food < FOOD_HUNT && supplies.ammo > AMMO_MIN_HUNT) {
    action = DiscretionaryAction.Hunt;
  } else if (supplies.food < FOOD_FORAGE && player.skills.survival > SKILL_FORAGE_MIN) {
    action = DiscretionaryAction.Forage;
  } else if (supplies.food < FOOD_HUNT) {
    // Can't hunt or forage but food is critical — rest to conserve energy
    action = DiscretionaryAction.Rest;
  } else {
    const minDurability = Math.min(...player.equipment.map((e) => e.durability));
    if (minDurability < DURABILITY_REPAIR && supplies.repair > 0) {
      action = DiscretionaryAction.Repair;
    } else if (journey.daysElapsed % SCOUT_INTERVAL === 0) {
      action = DiscretionaryAction.Scout; // periodic scouting for discovery encounters
    }
  }

  return { pace, action, nightTravel: false };
}

function decideCampActivities(): CampActivitySelection[] {
  const s = store.getState();
  const { player, supplies, party, pendingCampIsFullDay, pendingDayResults } = s;

  const slots = pendingCampIsFullDay ? 2 : 1;

  // Use pending values where available (they include encounter effects)
  const fatigue = pendingDayResults?.player?.fatigue ?? player.fatigue;
  const morale  = pendingDayResults?.player?.morale  ?? player.morale;
  const health  = pendingDayResults?.player?.health  ?? player.health;
  const equip   = pendingDayResults?.player?.equipment ?? player.equipment;
  const sup     = { ...supplies, ...(pendingDayResults?.supplies ?? {}) };

  // Build a priority-ordered list of candidate activities
  const candidates: Array<{ sel: CampActivitySelection; priority: number }> = [];

  // Rest: high priority when tired or morale is low
  candidates.push({
    sel: { activity: CampActivity.Rest },
    priority: fatigue > CAMP_FATIGUE_REST || morale < CAMP_MORALE_REST ? 100 : 30,
  });

  // Cook: valuable when food available and health below threshold
  if ((sup.food as number) >= CAMP_FOOD_COOK && health < CAMP_HEALTH_COOK) {
    candidates.push({
      sel: { activity: CampActivity.Cook },
      priority: health < CAMP_HEALTH_URGENT ? 90 : 60,
    });
  }

  // Repair: when gear is degraded and repair supplies allow
  const minDur = Math.min(...equip.map((e) => e.durability));
  if ((sup.repair as number) > 0 && minDur < CAMP_DUR_REPAIR) {
    candidates.push({
      sel: { activity: CampActivity.Repair },
      priority: minDur < CAMP_DUR_URGENT ? 80 : 40,
    });
  }

  // CompanionChat: if any active companions
  const activeComp = (pendingDayResults?.party?.companions ?? party.companions).filter(
    (c) => c.status === 'active',
  );
  if (activeComp.length > 0) {
    candidates.push({
      sel: { activity: CampActivity.CompanionChat, targetCompanionId: activeComp[0].id },
      priority: activeComp[0].loyalty < CAMP_LOYALTY_LOW ? 70 : 20,
    });
  }

  // Sort by priority descending, take top N slots, deduplicate
  candidates.sort((a, b) => b.priority - a.priority);
  const selected: CampActivitySelection[] = [];
  const seen = new Set<CampActivity>();
  for (const { sel } of candidates) {
    if (seen.has(sel.activity)) continue;
    seen.add(sel.activity);
    selected.push(sel);
    if (selected.length >= slots) break;
  }

  // Always fill at least one slot with Rest as fallback
  if (selected.length === 0) {
    selected.push({ activity: CampActivity.Rest });
  }

  return selected;
}

// ---------------------------------------------------------------------------
// Phase handler
// ---------------------------------------------------------------------------

function handlePhase(phase: string): void {
  if (!store.getState().autoPlay) return;
  if (store.getState().gameEndState !== null) return;

  // Clear any pending timer before scheduling a new step
  if (stepTimer !== null) {
    clearTimeout(stepTimer);
    stepTimer = null;
  }

  switch (phase) {
    case 'briefing':
      stepTimer = setTimeout(() => {
        if (!store.getState().autoPlay) return;
        store.getState().dismissOverlay();
      }, STEP_DELAY_MS);
      break;

    case 'idle':
      if (!store.getState().gameInitialized) return;
      stepTimer = setTimeout(async () => {
        const s = store.getState();
        if (!s.autoPlay || s.dailyCyclePhase !== 'idle' || !s.gameInitialized) return;
        const { pace, action, nightTravel } = decideDailyStep();
        s.setDailyDecisions(pace, action, nightTravel);
        await s.startDailyCycle();
      }, STEP_DELAY_MS);
      break;

    case 'event': {
      const encounter = store.getState().pendingEncounter;
      if (!encounter) return;
      const available = encounter.choices.filter((c) => c.available);
      if (available.length === 0) return;
      // Prefer the first available choice (usually the safest/most neutral)
      const choice = available[0];
      stepTimer = setTimeout(async () => {
        if (!store.getState().autoPlay) return;
        await store.getState().resolveEncounterChoice(choice.id);
      }, STEP_DELAY_MS);
      break;
    }

    case 'camp':
      stepTimer = setTimeout(async () => {
        if (!store.getState().autoPlay) return;
        const activities = decideCampActivities();
        await store.getState().resolveCampActivities(activities);
      }, STEP_DELAY_MS);
      break;

    // bargain: decline — conservative AI never risks a Devil's Bargain
    // (pendingBargain being set doesn't change the phase, it overlays during 'event')
    // We watch pendingBargain separately below.

    default:
      // travel / evening: engine-driven, nothing to do
      break;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Call once from App.tsx. Sets up store subscriptions. */
export function initAutoPlayer(): void {
  if (unsubscribe) return; // already initialized

  // Watch dailyCyclePhase
  const unsubPhase = store.subscribe(
    (s) => s.dailyCyclePhase,
    (phase) => handlePhase(phase),
  );

  // Watch pendingBargain separately — appears during 'event' phase
  const unsubBargain = store.subscribe(
    (s) => s.pendingBargain,
    (bargain) => {
      if (!bargain) return;
      if (!store.getState().autoPlay) return;
      if (stepTimer !== null) clearTimeout(stepTimer);
      stepTimer = setTimeout(async () => {
        if (!store.getState().autoPlay) return;
        await store.getState().resolveBargainChoice(false); // always decline
      }, STEP_DELAY_MS);
    },
  );

  // Watch autoPlay toggle: if turned on while already idle, kick off immediately
  const unsubAutoPlay = store.subscribe(
    (s) => s.autoPlay,
    (on) => {
      if (!on) {
        if (stepTimer !== null) {
          clearTimeout(stepTimer);
          stepTimer = null;
        }
        return;
      }
      // Trigger on the current phase so we don't wait for the next change
      handlePhase(store.getState().dailyCyclePhase);
    },
  );

  unsubscribe = () => {
    unsubPhase();
    unsubBargain();
    unsubAutoPlay();
    if (stepTimer !== null) clearTimeout(stepTimer);
  };
}
