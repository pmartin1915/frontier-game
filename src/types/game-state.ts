/**
 * Frontier — Core Game State Interfaces
 *
 * This file defines the canonical shape of ALL game state.
 * Every module that reads or writes game state imports from here.
 * The Zustand store, IndexedDB persistence, and JSON save files
 * all conform to these interfaces.
 *
 * Key names are final. Do not rename or abbreviate.
 */

// ============================================================
// ENUMS
// ============================================================

export enum TimeOfDay {
  Dawn = 'dawn',
  Morning = 'morning',
  Midday = 'midday',
  Afternoon = 'afternoon',
  Sunset = 'sunset',
  Night = 'night',
}

export enum Biome {
  CrossTimbers = 'crossTimbers',
  StakedPlains = 'stakedPlains',
  DesertApproach = 'desertApproach',
  PecosValley = 'pecosValley',
  HighDesert = 'highDesert',
  MountainPass = 'mountainPass',
  ColoradoPlains = 'coloradoPlains',
}

export enum Weather {
  Clear = 'clear',
  Overcast = 'overcast',
  Rain = 'rain',
  Storm = 'storm',
  Dust = 'dust',
  Snow = 'snow',
  Heatwave = 'heatwave',
}

export enum Terrain {
  Prairie = 'prairie',
  Forest = 'forest',
  Desert = 'desert',
  River = 'river',
  Canyon = 'canyon',
  Mountain = 'mountain',
  Plains = 'plains',
  Settlement = 'settlement',
}

export enum Act {
  I = 'act1',
  II = 'act2',
  III = 'act3',
  IV = 'act4',
  V = 'act5',
}

export enum Pace {
  Conservative = 'conservative',
  Normal = 'normal',
  HardPush = 'hardPush',
}

export enum DiscretionaryAction {
  Hunt = 'hunt',
  Scout = 'scout',
  Repair = 'repair',
  Forage = 'forage',
  Rest = 'rest',
  Trade = 'trade',
  NightTravel = 'nightTravel',
  None = 'none',
}

export enum HealthCondition {
  Dehydration = 'dehydration',
  Heatstroke = 'heatstroke',
  Dysentery = 'dysentery',
  Snakebite = 'snakebite',
  BrokenBone = 'brokenBone',
  Infection = 'infection',
  Hypothermia = 'hypothermia',
  Scurvy = 'scurvy',
  AlkaliPoisoning = 'alkaliPoisoning',
  HorseLameness = 'horseLameness',
}

export enum MoraleState {
  HighSpirits = 'highSpirits',
  Steady = 'steady',
  Wavering = 'wavering',
  Desperate = 'desperate',
  Broken = 'broken',
}

export enum EquipmentSlot {
  Saddle = 'saddle',
  Boots = 'boots',
  Rifle = 'rifle',
  WagonWheel = 'wagonWheel',
  Canteen = 'canteen',
  Bedroll = 'bedroll',
}

// ============================================================
// WORLD STATE
// ============================================================

export interface WorldState {
  /** Current in-game date as ISO string (1866-06-06 start) */
  date: string;
  timeOfDay: TimeOfDay;
  weather: Weather;
  biome: Biome;
  terrain: Terrain;
  /** Miles remaining to next named waypoint */
  distanceToWaypoint: number;
  /** Total miles traveled from Fort Belknap */
  totalMiles: number;
  currentAct: Act;
  /** Wind speed 0–100 for procedural audio */
  windSpeed: number;
  /** Temperature in Fahrenheit, affects heat/cold mechanics */
  temperature: number;
}

// ============================================================
// PLAYER STATE
// ============================================================

export interface ActiveCondition {
  condition: HealthCondition;
  /** Day the condition was acquired */
  dayAcquired: number;
  /** Days remaining before death/permanent damage if untreated */
  daysUntilCritical: number | null;
  /** Whether treatment has been applied */
  treated: boolean;
}

export interface Equipment {
  slot: EquipmentSlot;
  /** Durability 0–100. 0 = broken. */
  durability: number;
}

export interface PlayerState {
  name: string;
  /** Health 0–100. 0 = death. */
  health: number;
  conditions: ActiveCondition[];
  /** Fatigue 0–100. High = exhausted. Reduced by rest. */
  fatigue: number;
  /** Morale 0–100. Drives MoraleState thresholds. */
  morale: number;
  skills: PlayerSkills;
  equipment: Equipment[];
}

export interface PlayerSkills {
  /** 0–100. Affects hunting yield, repair quality. */
  survival: number;
  /** 0–100. Affects navigation, getting-lost chance. */
  navigation: number;
  /** 0–100. Affects combat, defense encounters. */
  combat: number;
  /** 0–100. Affects trade prices, NPC disposition. */
  barter: number;
}

// ============================================================
// HORSE STATE
// ============================================================

export interface HorseState {
  name: string;
  /** Health 0–100. 0 = death (catastrophic). */
  health: number;
  /** Fatigue 0–100. High = exhausted. */
  fatigue: number;
  /** Lameness flag. Requires rest + poultice. */
  lameness: boolean;
  /** Thirst 0–100. High = critical. */
  thirst: number;
  /** Hunger 0–100. High = critical. */
  hunger: number;
  /** Tack condition 0–100. Affects speed, horse fatigue. */
  tackCondition: number;
}

// ============================================================
// SUPPLIES
// ============================================================

export interface Supplies {
  /** Abstracted water units */
  water: number;
  /** Abstracted food units */
  food: number;
  /** Coffee units. 0 triggers morale penalty. */
  coffee: number;
  /** Medical supplies. Required for treatment. */
  medical: number;
  /** Repair materials. Required for equipment repair. */
  repair: number;
  /** Ammunition count */
  ammo: number;
  /** Trade goods value (used in settlements, Devil's Bargains) */
  tradeGoods: number;
  /** Currency in US dollars */
  funds: number;
}

export interface CarryCapacity {
  water: number;
  food: number;
  /** 'saddlebags' | 'packHorse' | 'wagon' */
  transport: 'saddlebags' | 'packHorse' | 'wagon';
}

export const TRANSPORT_CAPACITY: Record<CarryCapacity['transport'], { water: number; food: number }> = {
  saddlebags: { water: 10, food: 15 },
  packHorse: { water: 40, food: 30 },
  wagon: { water: 80, food: 60 },
};

// ============================================================
// CAMP PET
// ============================================================

export interface CampPet {
  /** Whether the party has adopted the camp pet */
  adopted: boolean;
  /** Pet name (set by Blanchard in McMurtry dialogue if adopted) */
  name: string | null;
  /** Day adopted */
  dayAdopted: number | null;
  /** Whether the pet has been lost */
  lost: boolean;
  /** Day lost (if applicable) */
  dayLost: number | null;
}

// ============================================================
// JOURNEY STATE
// ============================================================

export interface RouteChoice {
  day: number;
  description: string;
  /** Route option chosen */
  chosen: string;
  /** Route options available */
  options: string[];
}

export interface JourneyState {
  currentAct: Act;
  /** Name of current or next waypoint */
  waypoint: string;
  routeChoices: RouteChoice[];
  /** Total in-game days elapsed */
  daysElapsed: number;
  /** Devil's Bargain uses (max 3) */
  failForwardsUsed: number;
  /** Whether Fort Sumner debt flag is active */
  fortSumnerDebt: boolean;
  /** Night travel currently toggled */
  nightTravel: boolean;
  /** Current pace setting */
  pace: Pace;
  /** Current discretionary action */
  discretionaryAction: DiscretionaryAction;
  /** IDs of previously resolved encounters (for maxOccurrences filtering) */
  encounterHistory?: string[];
  /** Remaining detour miles from Devil's Bargain (consumed before regular progress) */
  detourMilesRemaining: number;
  /** Consecutive days without an encounter (for calm-day tension ramp) */
  calmDayStreak?: number;
}

// ============================================================
// META / SAVE STATE
// ============================================================

export interface MetaState {
  saveSlot: number;
  /** ISO timestamp of last save */
  timestamp: string;
  /** SHA-256 integrity hash of serialized state */
  hash: string;
  /** Schema version for migration */
  version: number;
  /** Total real-time play duration in ms */
  playtimeMs: number;
}

// ============================================================
// COMPOSITE GAME STATE
// ============================================================

/**
 * The complete game state. This is what gets serialized to IndexedDB
 * and what the Zustand store holds.
 *
 * Import { GameState } from '@/types/game-state' everywhere.
 */
export interface GameState {
  world: WorldState;
  player: PlayerState;
  horse: HorseState;
  party: PartyState;
  supplies: Supplies;
  carryCapacity: CarryCapacity;
  campPet: CampPet;
  narrative: NarrativeState;
  journey: JourneyState;
  meta: MetaState;
}

/**
 * Party state is imported from companions.ts but referenced here
 * for the composite. Re-exported for convenience.
 */
export interface PartyState {
  companions: import('./companions').CompanionInstance[];
  maxCompanions: number;
}

/**
 * Narrative state is imported from narrative.ts but referenced here
 * for the composite.
 */
export interface NarrativeState {
  structuredLedger: import('./narrative').LedgerEntry[];
  chapterSummaries: import('./narrative').ChapterSummary[];
  previousEntry: string;
  activeThreads: import('./narrative').NarrativeThread[];
  currentVoice: import('./narrative').AuthorVoice;
}

// ============================================================
// UTILITY TYPES
// ============================================================

/**
 * Morale state thresholds. Used by morale.ts to determine MoraleState
 * from numeric morale value.
 */
export const MORALE_THRESHOLDS: Record<MoraleState, [number, number]> = {
  [MoraleState.HighSpirits]: [80, 100],
  [MoraleState.Steady]: [50, 79],
  [MoraleState.Wavering]: [30, 49],
  [MoraleState.Desperate]: [10, 29],
  [MoraleState.Broken]: [0, 9],
};

/**
 * Pace configuration. Base values for movement calculations.
 */
export const PACE_CONFIG: Record<Pace, {
  baseDistanceMin: number;
  baseDistanceMax: number;
  waterMultiplier: number;
  foodMultiplier: number;
  fatigueChange: number;
  equipmentWearMultiplier: number;
}> = {
  [Pace.Conservative]: {
    baseDistanceMin: 15, baseDistanceMax: 20,
    waterMultiplier: 1.0, foodMultiplier: 1.0,
    fatigueChange: 5, equipmentWearMultiplier: 1.0,
  },
  [Pace.Normal]: {
    baseDistanceMin: 25, baseDistanceMax: 30,
    waterMultiplier: 1.0, foodMultiplier: 1.1,
    fatigueChange: 0, equipmentWearMultiplier: 1.0,
  },
  [Pace.HardPush]: {
    baseDistanceMin: 35, baseDistanceMax: 45,
    waterMultiplier: 1.25, foodMultiplier: 1.25,
    fatigueChange: -12, equipmentWearMultiplier: 1.35,
  },
};

/**
 * Night travel modifiers. Applied when journey.nightTravel is true.
 */
export const NIGHT_TRAVEL_MODIFIERS = {
  waterMultiplier: 0.5,
  distanceMultiplier: 0.85,
  horseInjuryMultiplier: 1.25,
  fatigueMultiplier: 1.2,
  gettingLostChance: 0.15,
} as const;

// ============================================================
// GAME END STATE
// ============================================================

export interface GameEndState {
  reason: 'victory' | 'death' | 'abandon';
  daysElapsed: number;
  totalMiles: number;
  finalHealth: number;
  finalMorale: number;
  companionsAlive: number;
  maxCompanions: number;
  journeyComplete: boolean;
}

// ============================================================
// DAY RESULTS (consumed by engine, store, and simulator)
// ============================================================

/**
 * Results from the Game Logic layer for a single day.
 * Applied to the store in one atomic update.
 */
export interface DayResults {
  world: Partial<WorldState>;
  player: Partial<PlayerState>;
  horse: Partial<HorseState>;
  supplies: Partial<Supplies>;
  party: Partial<PartyState>;
  journey: Partial<JourneyState>;
  campPet?: Partial<CampPet>;
  carryCapacity?: Partial<CarryCapacity>;
}
