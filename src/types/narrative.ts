/**
 * Frontier — Narrative System Interfaces
 *
 * Types for the three-layer narrative pipeline:
 * - Voice selection (Director)
 * - Prompt assembly (Director → Narrator)
 * - Structured Narrative Ledger (persistent memory)
 * - Fallback system (offline/timeout)
 */

import { Act, Biome, MoraleState, TimeOfDay } from './game-state';

// ============================================================
// AUTHOR VOICES
// ============================================================

export enum AuthorVoice {
  Adams = 'adams',
  Irving = 'irving',
  McMurtry = 'mcmurtry',
}

/**
 * Voice Switchboard entry. The Director looks up the current event type
 * to determine primary and permitted secondary voice.
 */
export interface VoiceSwitchEntry {
  eventType: NarrativeEventType;
  primary: AuthorVoice;
  secondary: AuthorVoice | null;
  rationale: string;
}

export enum NarrativeEventType {
  RoutineTravel = 'routineTravel',
  Vista = 'vista',
  Camp = 'camp',
  SupplyCrisis = 'supplyCrisis',
  CompanionDrama = 'companionDrama',
  InjuryDeathLoss = 'injuryDeathLoss',
  RiverCrossing = 'riverCrossing',
  Settlement = 'settlement',
  DevilsBargain = 'devilsBargain',
  NightTravel = 'nightTravel',
  WaypointArrival = 'waypointArrival',
}

/**
 * The Voice Switchboard lookup table. Hardcoded per GDD §4.2.
 * Director uses this to select voice based on the day's dominant event.
 */
export const VOICE_SWITCHBOARD: VoiceSwitchEntry[] = [
  { eventType: NarrativeEventType.RoutineTravel, primary: AuthorVoice.Adams, secondary: AuthorVoice.Irving, rationale: 'Trail rhythm, distance' },
  { eventType: NarrativeEventType.Vista, primary: AuthorVoice.Irving, secondary: AuthorVoice.Adams, rationale: 'Landscape, wonder' },
  { eventType: NarrativeEventType.Camp, primary: AuthorVoice.Irving, secondary: AuthorVoice.McMurtry, rationale: 'Contemplation' },
  { eventType: NarrativeEventType.SupplyCrisis, primary: AuthorVoice.Adams, secondary: AuthorVoice.McMurtry, rationale: 'Urgency' },
  { eventType: NarrativeEventType.CompanionDrama, primary: AuthorVoice.McMurtry, secondary: null, rationale: 'Pure character' },
  { eventType: NarrativeEventType.InjuryDeathLoss, primary: AuthorVoice.McMurtry, secondary: AuthorVoice.Adams, rationale: 'Human cost' },
  { eventType: NarrativeEventType.RiverCrossing, primary: AuthorVoice.Adams, secondary: AuthorVoice.McMurtry, rationale: 'Procedural danger' },
  { eventType: NarrativeEventType.Settlement, primary: AuthorVoice.McMurtry, secondary: AuthorVoice.Adams, rationale: 'Human interaction' },
  { eventType: NarrativeEventType.DevilsBargain, primary: AuthorVoice.McMurtry, secondary: null, rationale: 'Maximum drama' },
  { eventType: NarrativeEventType.NightTravel, primary: AuthorVoice.Irving, secondary: AuthorVoice.Adams, rationale: 'Moonlit atmosphere' },
  { eventType: NarrativeEventType.WaypointArrival, primary: AuthorVoice.Irving, secondary: AuthorVoice.Adams, rationale: 'Vista and landmark description' },
];

// ============================================================
// VOICE CONSTRAINTS (per GDD §4.3)
// ============================================================

export interface VoiceConstraints {
  voice: AuthorVoice;
  minWords: number;
  maxWords: number;
  maxTokens: number;
  /** Per-voice temperature for style fidelity (research-calibrated). */
  temperature: number;
  syntaxNotes: string;
  lexiconNotes: string;
}

export const VOICE_CONSTRAINTS: Record<AuthorVoice, VoiceConstraints> = {
  [AuthorVoice.Adams]: {
    voice: AuthorVoice.Adams,
    minWords: 180, maxWords: 240, maxTokens: 400,
    temperature: 0.65,
    syntaxNotes: 'Compound-complex, 25–35 words avg. Semicolon-chained participial phrases. Temporal clause → action → consequence.',
    lexiconNotes: 'Mixed vernacular-formal: Latinate (privation, ruinous) + unglossed trade jargon (remuda, drag, bed ground). Obsess over water, grass, terrain, distance.',
  },
  [AuthorVoice.Irving]: {
    voice: AuthorVoice.Irving,
    minWords: 200, maxWords: 280, maxTokens: 600,
    temperature: 0.75,
    syntaxNotes: 'Periodic, 35–55 words for description. Prepositional cascades delay the main clause. Short declaratives for humor and impact.',
    lexiconNotes: 'Systematically Latinate: sublime, verdant, diversified, picturesque, stupendous. Adjective pairs. Essayistic asides. Post-bellum elegy added.',
  },
  [AuthorVoice.McMurtry]: {
    voice: AuthorVoice.McMurtry,
    minWords: 160, maxWords: 240, maxTokens: 450,
    temperature: 0.55,
    syntaxNotes: 'Plain diction, 12–20 words avg. Cumulative accumulation not complex sentences. Indirect free discourse absorbs character idiom.',
    lexiconNotes: 'Eighth-grade vocabulary. Agrarian similes. Transient beauty named then withdrawn. Death reported flat. Deflect sentiment through physical action.',
  },
};

// ============================================================
// EVENT RECORD (Game Logic → Director)
// ============================================================

/**
 * The structured output of Layer 1 (Game Logic).
 * Describes everything that happened in a single in-game day.
 * The Director reads this to select voice and build the Narrator prompt.
 */
export interface EventRecord {
  day: number;
  act: Act;
  date: string;
  timeOfDay: TimeOfDay;
  biome: Biome;

  /** Distance traveled today in miles */
  distanceTraveled: number;
  /** Was night travel active? */
  nightTravel: boolean;

  /** Primary event type for voice selection */
  dominantEvent: NarrativeEventType;

  /** All events that occurred (may include secondary events) */
  events: DayEvent[];

  /** Supply changes (deltas) */
  supplyDeltas: Partial<Record<keyof import('./game-state').Supplies, number>>;

  /** Health events (new conditions, treatments, deaths) */
  healthEvents: HealthEvent[];

  /** Morale change and current state */
  moraleChange: number;
  moraleState: MoraleState;

  /** Companion events (joins, leaves, loyalty changes, dialogue triggers) */
  companionEvents: CompanionEvent[];

  /** Equipment changes */
  equipmentEvents: EquipmentEvent[];

  /** Whether a Devil's Bargain was triggered */
  devilsBargain: DevilsBargainEvent | null;

  /** Previous day used fallback (Narrator should bridge tonal gap) */
  previousDayFallback: boolean;

  /** Camp pet interaction for the day (if applicable) */
  campPetEvent: string | null;

  /** Waypoint arrival data (if a waypoint was reached this day) */
  waypointArrival?: {
    waypointName: string;
    landmark: string;
    isSettlement: boolean;
    journeyComplete: boolean;
  };
}

export interface DayEvent {
  type: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
}

export interface HealthEvent {
  target: string;
  condition: string;
  type: 'acquired' | 'treated' | 'worsened' | 'death';
}

export interface CompanionEvent {
  companion: string;
  type: 'joined' | 'left' | 'deserted' | 'loyaltyChange' | 'dialogue' | 'skillUse' | 'death';
  detail: string;
  loyaltyDelta?: number;
}

export interface EquipmentEvent {
  slot: string;
  type: 'degraded' | 'broken' | 'repaired';
  durabilityDelta: number;
}

export interface DevilsBargainEvent {
  crisis: string;
  encounter: string;
  cost: string;
  accepted: boolean;
}

// ============================================================
// VOICE DIRECTIVE (Director → Narrator)
// ============================================================

/**
 * The Director's instructions to the Narrator.
 * Assembled alongside the EventRecord into the final API prompt.
 */
export interface VoiceDirective {
  primaryVoice: AuthorVoice;
  secondaryVoice: AuthorVoice | null;
  constraints: VoiceConstraints;
  emotionalArc: string;
  /** Specific narrative threads the entry should reference */
  threadReferences: string[];
  /** Companion Character Bible excerpts for active companions */
  characterBibles: string[];
  /** Foreshadowing hints from Pending Consequences */
  foreshadowingHints: string[];
}

// ============================================================
// PROMPT ASSEMBLY
// ============================================================

/**
 * The complete prompt sent to the Anthropic API.
 * Assembled by the Director, consumed by the Narrator.
 */
export interface NarratorPrompt {
  /** Static author persona + prose anchors (cached system message — one of three VOICE_BIBLES). */
  systemMessage: string;
  /** Active voice — used by the API to set per-voice temperature and max_tokens. */
  voice: AuthorVoice;
  /** Structured Narrative Ledger (placed EARLY in user message) */
  ledgerContext: string;
  /** Character Bibles for active companions */
  characterBibles: string;
  /** Previous day's full entry (tonal continuity) */
  previousEntry: string;
  /** Current EventRecord as JSON */
  eventRecord: string;
  /** Current game state snapshot as JSON */
  gameStateSnapshot: string;
  /** Voice directive from Director */
  voiceDirective: string;
  /** Encounter narrative context (if an encounter was resolved today) */
  encounterContext: string;
}

// ============================================================
// STRUCTURED NARRATIVE LEDGER (per GDD §4.4)
// ============================================================

/**
 * Generated every 5 in-game days. The typed schema that prevents
 * "lossy compression" of narrative state.
 */
export interface LedgerEntry {
  /** e.g., "Days 11-15" */
  period: string;
  /** e.g., "Act II: Staked Plains" */
  act: string;
  /** Max 5 entries, 2–3 sentences each */
  majorEvents: string[];
  activeThreads: NarrativeThread[];
  relationships: RelationshipStatus[];
  pendingConsequences: PendingConsequence[];
  /** 1 sentence summary of emotional trajectory */
  emotionalArc: string;
  /** Permanent changes: deaths, losses, acquisitions */
  lossesAndGains: string[];
}

export interface NarrativeThread {
  /** Unique thread ID, e.g., "thread_coe_war_secret" */
  id: string;
  description: string;
  status: 'open' | 'escalating' | 'resolved';
  participants: string[];
  /** Day the thread was planted */
  plantedDay: number;
}

export interface RelationshipStatus {
  companion: string;
  loyalty: number;
  recentTension: string | null;
  recentBond: string | null;
  /** Inter-companion dynamics, e.g., "Coe distrusts Blanchard" */
  dynamicWith: string | null;
}

export interface PendingConsequence {
  /** Trigger condition, e.g., "loyalty < 20" or "Day >= 40" */
  trigger: string;
  consequence: string;
  /** Whether the narrative has hinted at this */
  foreshadowed: boolean;
}

/**
 * At Act boundaries, LedgerEntries compress into ChapterSummaries.
 * ~200 tokens each. Retain threads and consequences, discard resolved events.
 */
export interface ChapterSummary {
  act: Act;
  /** Compressed summary, ~200 tokens */
  summary: string;
  /** Threads that survived into the next act */
  survivingThreads: NarrativeThread[];
  /** Consequences still pending */
  pendingConsequences: PendingConsequence[];
}

// ============================================================
// FALLBACK SYSTEM (per GDD §9.5)
// ============================================================

/**
 * Hard-coded Adams-register fallback entries for API timeout scenarios.
 * Tagged by biome and morale band for contextual selection.
 */
export interface FallbackEntry {
  id: string;
  biome: Biome | 'any';
  moraleBand: MoraleState | 'any';
  text: string;
}

// ============================================================
// NARRATOR PROVIDER
// ============================================================

export type NarratorProvider = 'anthropic' | 'moonshot' | 'gemini';

/** Timeout protocol configuration */
export const NARRATOR_TIMEOUT_MS = 8000;
export const CONSECUTIVE_FALLBACK_WARNING_THRESHOLD = 3;

// ============================================================
// NARRATOR RESPONSE
// ============================================================

/**
 * The parsed response from the Narrator API (or fallback).
 */
export interface NarratorResponse {
  /** The prose entry for the Travel Log */
  text: string;
  /** Whether this was a fallback entry */
  fallback: boolean;
  /** Voice that was used (or 'adams' for fallback) */
  voice: AuthorVoice;
  /** API latency in ms (0 for fallback) */
  latencyMs: number;
  /** Token usage for cost tracking */
  tokensUsed: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  } | null;
}
