/**
 * Frontier — Layer 2: Director
 *
 * Rule-based switchboard. No AI calls. Pure deterministic logic.
 *
 * Receives EventRecord from Game Logic.
 * Selects author voice via the Voice Switchboard.
 * Assembles the prompt for the Narrator.
 * Manages Narrative Ledger updates.
 */

import type { EventRecord, VoiceDirective, NarratorPrompt, LedgerEntry } from '@/types/narrative';
import { AuthorVoice, VOICE_SWITCHBOARD, VOICE_CONSTRAINTS } from '@/types/narrative';
import { VOICE_BIBLES } from '@/data/voice-bibles';
import type { GameState, NarrativeState } from '@/types/game-state';
import { MoraleState } from '@/types/game-state';
import type { PartyState } from '@/types/game-state';
import { CHARACTER_BIBLES } from '@/types/companions';
import type { CompanionInstance } from '@/types/companions';
import { getMoraleState } from '@/systems/morale';

/**
 * Select the author voice based on the day's dominant event.
 * Optional state param populates characterBibles, threadReferences,
 * and foreshadowingHints for richer Narrator prompts.
 */
export function selectVoice(eventRecord: EventRecord, state?: GameState): VoiceDirective {
  const entry = VOICE_SWITCHBOARD.find((e) => e.eventType === eventRecord.dominantEvent);
  const primary = entry?.primary ?? AuthorVoice.Adams;
  const secondary = entry?.secondary ?? null;

  // Populate from state if available
  const characterBibles: string[] = [];
  const threadReferences: string[] = [];
  const foreshadowingHints: string[] = [];

  if (state) {
    // Character Bibles from active companions
    for (const c of state.party.companions) {
      if (c.status !== 'active') continue;
      const bible = CHARACTER_BIBLES[c.id];
      characterBibles.push(
        `${bible.fullName} (${bible.skill}): ${bible.speechPattern} | ${bible.pressureBehavior}`,
      );
    }

    // Thread references from active narrative threads
    for (const thread of state.narrative.activeThreads) {
      if (thread.status !== 'resolved') {
        threadReferences.push(`${thread.description} (${thread.status})`);
      }
    }

    // Foreshadowing hints from latest ledger's pending consequences
    const latestLedger = state.narrative.structuredLedger.at(-1);
    if (latestLedger) {
      for (const pc of latestLedger.pendingConsequences) {
        if (!pc.foreshadowed) {
          foreshadowingHints.push(pc.consequence);
        }
      }
    }
  }

  return {
    primaryVoice: primary,
    secondaryVoice: secondary,
    constraints: VOICE_CONSTRAINTS[primary],
    emotionalArc: deriveEmotionalArc(eventRecord.moraleState, eventRecord.events.length),
    threadReferences,
    characterBibles,
    foreshadowingHints,
  };
}

/**
 * Assemble the complete Narrator prompt.
 */
export function assemblePrompt(
  directive: VoiceDirective,
  eventRecord: EventRecord,
  state: GameState,
): NarratorPrompt {
  return {
    systemMessage: buildSystemMessage(directive),
    voice: directive.primaryVoice,
    ledgerContext: serializeLedgerContext(state.narrative),
    characterBibles: serializeCharacterBibles(state.party),
    previousEntry: state.narrative.previousEntry,
    eventRecord: JSON.stringify(eventRecord, null, 2),
    gameStateSnapshot: buildGameStateSnapshot(state),
    voiceDirective: JSON.stringify({
      voice: directive.primaryVoice,
      constraints: {
        minWords: directive.constraints.minWords,
        maxWords: directive.constraints.maxWords,
        syntax: directive.constraints.syntaxNotes,
        lexicon: directive.constraints.lexiconNotes,
      },
      emotionalArc: directive.emotionalArc,
    }, null, 2),
    encounterContext: buildEncounterContext(eventRecord),
  };
}

/**
 * Check if a Ledger Entry should be generated (every 5 days).
 */
export function shouldGenerateLedgerEntry(daysElapsed: number): boolean {
  return daysElapsed > 0 && daysElapsed % 5 === 0;
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

function deriveEmotionalArc(moraleState: MoraleState, eventCount: number): string {
  const intensity = eventCount > 3 ? 'turbulent' : eventCount > 1 ? 'eventful' : 'quiet';

  switch (moraleState) {
    case MoraleState.HighSpirits:
      return `${intensity} day with high spirits — tone should reflect cautious optimism`;
    case MoraleState.Steady:
      return `${intensity} day with steady morale — measured, matter-of-fact tone`;
    case MoraleState.Wavering:
      return `${intensity} day with wavering morale — undertone of doubt and fatigue`;
    case MoraleState.Desperate:
      return `${intensity} day with desperate morale — grim determination or resignation`;
    case MoraleState.Broken:
      return `${intensity} day with broken morale — spare, hollow, the words of someone enduring`;
    default:
      return `${intensity} day on the trail`;
  }
}

function buildSystemMessage(directive: VoiceDirective): string {
  return VOICE_BIBLES[directive.primaryVoice];
}

function serializeLedgerContext(narrative: NarrativeState): string {
  if (narrative.structuredLedger.length === 0) {
    return '';
  }

  const recent = narrative.structuredLedger.slice(-2);
  return recent
    .map((entry) => {
      const events = entry.majorEvents.join('; ');
      const threads = entry.activeThreads
        .map((t) => `${t.description} (${t.status})`)
        .join('; ');
      return `[${entry.period} — ${entry.act}]\nEvents: ${events}\nThreads: ${threads}\nArc: ${entry.emotionalArc}`;
    })
    .join('\n\n');
}

function serializeCharacterBibles(party: PartyState): string {
  const activeCompanions = party.companions.filter(
    (c: CompanionInstance) => c.status === 'active',
  );

  if (activeCompanions.length === 0) return '';

  return activeCompanions
    .map((c: CompanionInstance) => {
      const bible = CHARACTER_BIBLES[c.id];
      return `[${bible.fullName} — ${bible.skill}]
Backstory: ${bible.backstory}
Speech: ${bible.speechPattern}
Address: ${bible.addressStyle}
Topics: ${bible.topicBehavior}
Under pressure: ${bible.pressureBehavior}
Loyalty: ${c.loyalty}/100`;
    })
    .join('\n\n');
}

// ============================================================
// LEDGER GENERATION
// ============================================================

/**
 * Generate a Narrative Ledger entry summarizing a 5-day period.
 * Called every 5 days from the daily cycle.
 *
 * Extracts major events, companion relationships, Devil's Bargains,
 * and pending consequences to form a persistent narrative memory.
 */
export function generateLedgerEntry(
  state: GameState,
  recentEvents: EventRecord[],
): LedgerEntry {
  const daysElapsed = state.journey.daysElapsed;
  const periodStart = Math.max(1, daysElapsed - 4);
  const period = `Days ${periodStart}-${daysElapsed}`;
  const act = `Act ${state.world.currentAct}`;

  // Major events: severity major/critical from all recent days (max 5)
  const majorEvents: string[] = [];
  for (const record of recentEvents) {
    for (const evt of record.events) {
      if (evt.severity === 'major' || evt.severity === 'critical') {
        majorEvents.push(`Day ${record.day}: ${evt.description}`);
      }
    }
    // Companion departures
    for (const ce of record.companionEvents) {
      if (ce.type === 'deserted' || ce.type === 'death' || ce.type === 'joined') {
        majorEvents.push(`Day ${record.day}: ${ce.detail}`);
      }
    }
    // Devil's Bargain
    if (record.devilsBargain) {
      const verb = record.devilsBargain.accepted ? 'accepted' : 'declined';
      majorEvents.push(`Day ${record.day}: Devil's Bargain ${verb} — ${record.devilsBargain.cost}`);
    }
  }

  // Relationships from active companions
  const relationships = state.party.companions
    .filter((c) => c.status === 'active')
    .map((c) => {
      const bible = CHARACTER_BIBLES[c.id];
      // Look for recent loyalty changes to determine tension/bond
      let recentTension: string | null = null;
      let recentBond: string | null = null;
      for (const record of recentEvents) {
        for (const ce of record.companionEvents) {
          if (ce.companion === bible.name && ce.loyaltyDelta !== undefined) {
            if (ce.loyaltyDelta < 0) recentTension = ce.detail;
            if (ce.loyaltyDelta > 0) recentBond = ce.detail;
          }
        }
      }
      return {
        companion: bible.name,
        loyalty: c.loyalty,
        recentTension,
        recentBond,
        dynamicWith: null,
      };
    });

  // Emotional arc from morale trajectory
  const moraleState = getMoraleState(state.player.morale);
  const emotionalArc = `Morale ${moraleState} after ${daysElapsed} days on the trail.`;

  // Losses and gains
  const lossesAndGains: string[] = [];
  for (const record of recentEvents) {
    for (const he of record.healthEvents) {
      if (he.type === 'death') {
        lossesAndGains.push(`${he.target} died (${he.condition})`);
      }
    }
  }

  // Pending consequences from low loyalty companions
  const pendingConsequences = state.party.companions
    .filter((c) => c.status === 'active' && c.loyalty <= 20)
    .map((c) => ({
      trigger: `${CHARACTER_BIBLES[c.id].name} loyalty <= 20`,
      consequence: `${CHARACTER_BIBLES[c.id].fullName} may desert`,
      foreshadowed: false,
    }));

  // Fort Sumner debt
  if (state.journey.fortSumnerDebt) {
    pendingConsequences.push({
      trigger: 'Arrive at Fort Sumner',
      consequence: 'Comanchero debt must be repaid',
      foreshadowed: false,
    });
  }

  return {
    period,
    act,
    majorEvents: majorEvents.slice(0, 5),
    activeThreads: [...state.narrative.activeThreads],
    relationships,
    pendingConsequences,
    emotionalArc,
    lossesAndGains,
  };
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

/**
 * Build encounter narrative context from the EventRecord.
 * Extracts encounter events and Devil's Bargain info for richer prose.
 */
function buildEncounterContext(eventRecord: EventRecord): string {
  const parts: string[] = [];

  // Encounter events (type 'encounter')
  const encounterEvents = eventRecord.events.filter((e) => e.type === 'encounter');
  for (const evt of encounterEvents) {
    parts.push(`ENCOUNTER: ${evt.description} (severity: ${evt.severity})`);
  }

  // Devil's Bargain
  if (eventRecord.devilsBargain) {
    const bargain = eventRecord.devilsBargain;
    if (bargain.accepted) {
      parts.push(
        `DEVIL'S BARGAIN ACCEPTED: ${bargain.encounter} — Crisis: ${bargain.crisis}. Cost: ${bargain.cost}. ` +
        `Weave the weight of this choice into the narrative. The player sacrificed something precious to survive.`,
      );
    } else {
      parts.push(
        `DEVIL'S BARGAIN DECLINED: ${bargain.encounter} — Crisis: ${bargain.crisis}. ` +
        `The player chose to face the consequence rather than accept the bargain.`,
      );
    }
  }

  // Companion drama from encounters
  const companionDrama = eventRecord.companionEvents.filter(
    (ce) => ce.type === 'loyaltyChange' || ce.type === 'deserted' || ce.type === 'death',
  );
  for (const ce of companionDrama) {
    parts.push(`COMPANION: ${ce.companion} — ${ce.detail}`);
  }

  if (parts.length === 0) return '';

  return `ENCOUNTER CONTEXT FOR NARRATOR:\n${parts.join('\n')}\n\nUse these encounter details to ground the day's narrative. The events are canonical — do not contradict them, but enrich them with sensory detail and emotional weight.`;
}

function buildGameStateSnapshot(state: GameState): string {
  const moraleState = getMoraleState(state.player.morale);

  return JSON.stringify({
    day: state.journey.daysElapsed,
    date: state.world.date,
    biome: state.world.biome,
    terrain: state.world.terrain,
    weather: state.world.weather,
    temperature: state.world.temperature,
    totalMiles: state.world.totalMiles,
    distanceToWaypoint: state.world.distanceToWaypoint,
    waypoint: state.journey.waypoint,
    playerHealth: state.player.health,
    playerMorale: state.player.morale,
    moraleState,
    fatigue: state.player.fatigue,
    conditions: state.player.conditions.map((c) => c.condition),
    horseHealth: state.horse.health,
    horseLameness: state.horse.lameness,
    supplies: {
      water: state.supplies.water,
      food: state.supplies.food,
      coffee: state.supplies.coffee,
      medical: state.supplies.medical,
      ammo: state.supplies.ammo,
    },
    companions: state.party.companions
      .filter((c) => c.status === 'active')
      .map((c) => ({ id: c.id, loyalty: c.loyalty })),
    campPet: state.campPet.adopted && !state.campPet.lost
      ? state.campPet.name
      : null,
  }, null, 2);
}
