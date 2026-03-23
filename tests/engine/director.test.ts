import { describe, it, expect } from 'vitest';
import {
  selectVoice,
  assemblePrompt,
  shouldGenerateLedgerEntry,
  generateLedgerEntry,
} from '@/engine/director';
import {
  AuthorVoice,
  NarrativeEventType,
} from '@/types/narrative';
import type { EventRecord } from '@/types/narrative';
import type { GameState } from '@/types/game-state';
import {
  Act,
  Biome,
  Pace,
  TimeOfDay,
  Weather,
  Terrain,
  DiscretionaryAction,
  EquipmentSlot,
  MoraleState,
} from '@/types/game-state';
import { CompanionId, CompanionSkill } from '@/types/companions';

// ============================================================
// BASE FIXTURES
// ============================================================

const BASE_EVENT_RECORD: EventRecord = {
  day: 10,
  act: Act.I,
  date: '1866-06-16',
  timeOfDay: TimeOfDay.Noon,
  biome: Biome.CrossTimbers,
  distanceTraveled: 18,
  nightTravel: false,
  dominantEvent: NarrativeEventType.RoutineTravel,
  events: [
    { type: 'travel', description: 'Traveled 18 miles', severity: 'minor' },
  ],
  supplyDeltas: { water: -4, food: -3 },
  healthEvents: [],
  moraleChange: 0,
  moraleState: MoraleState.Steady,
  companionEvents: [],
  equipmentEvents: [],
  devilsBargain: null,
  previousDayFallback: false,
  campPetEvent: null,
};

const BASE_STATE: GameState = {
  world: {
    date: '1866-06-16',
    timeOfDay: TimeOfDay.Noon,
    weather: Weather.Clear,
    biome: Biome.CrossTimbers,
    terrain: Terrain.Prairie,
    distanceToWaypoint: 100,
    totalMiles: 80,
    currentAct: Act.I,
    windSpeed: 15,
    temperature: 78,
  },
  player: {
    name: 'Martin',
    health: 85,
    conditions: [],
    fatigue: 20,
    morale: 65,
    skills: { survival: 40, navigation: 30, combat: 35, barter: 25 },
    equipment: [
      { slot: EquipmentSlot.Rifle, durability: 90 },
      { slot: EquipmentSlot.Boots, durability: 80 },
    ],
  },
  horse: {
    name: 'Whiskey',
    health: 90,
    fatigue: 15,
    lameness: false,
    thirst: 10,
    hunger: 10,
    tackCondition: 85,
  },
  party: { companions: [], maxCompanions: 4 },
  supplies: {
    water: 30,
    food: 25,
    coffee: 8,
    medical: 5,
    repair: 5,
    ammo: 15,
    tradeGoods: 10,
    funds: 40,
  },
  carryCapacity: { water: 80, food: 60, transport: 'wagon' as const },
  campPet: { adopted: false, name: null, dayAdopted: null, lost: false, dayLost: null },
  narrative: {
    structuredLedger: [],
    chapterSummaries: [],
    previousEntry: '',
    activeThreads: [],
    currentVoice: AuthorVoice.Adams,
  },
  journey: {
    currentAct: Act.I,
    waypoint: 'Middle Concho',
    routeChoices: [],
    daysElapsed: 10,
    failForwardsUsed: 0,
    fortSumnerDebt: false,
    nightTravel: false,
    pace: Pace.Normal,
    discretionaryAction: DiscretionaryAction.None,
    detourMilesRemaining: 0,
  },
  meta: {
    saveSlot: 0,
    timestamp: new Date().toISOString(),
    hash: '',
    version: 1,
    playtimeMs: 0,
  },
};

// ============================================================
// selectVoice
// ============================================================

describe('selectVoice', () => {
  it('selects Adams for routine travel', () => {
    const directive = selectVoice(BASE_EVENT_RECORD);
    expect(directive.primaryVoice).toBe(AuthorVoice.Adams);
    expect(directive.secondaryVoice).toBe(AuthorVoice.Irving);
  });

  it('selects McMurtry for companion drama', () => {
    const record: EventRecord = {
      ...BASE_EVENT_RECORD,
      dominantEvent: NarrativeEventType.CompanionDrama,
    };
    const directive = selectVoice(record);
    expect(directive.primaryVoice).toBe(AuthorVoice.McMurtry);
    expect(directive.secondaryVoice).toBeNull();
  });

  it('selects McMurtry for devil\'s bargain', () => {
    const record: EventRecord = {
      ...BASE_EVENT_RECORD,
      dominantEvent: NarrativeEventType.DevilsBargain,
    };
    const directive = selectVoice(record);
    expect(directive.primaryVoice).toBe(AuthorVoice.McMurtry);
  });

  it('defaults to Adams for unknown event types', () => {
    const record: EventRecord = {
      ...BASE_EVENT_RECORD,
      dominantEvent: 'unknownEvent' as NarrativeEventType,
    };
    const directive = selectVoice(record);
    expect(directive.primaryVoice).toBe(AuthorVoice.Adams);
  });

  it('populates characterBibles from state companions', () => {
    const stateWithCompanions: GameState = {
      ...BASE_STATE,
      party: {
        companions: [
          {
            id: CompanionId.EliasCoe,
            health: 85,
            morale: 60,
            loyalty: 50,
            conditions: [],
            dayJoined: 3,
            status: 'active',
          },
        ],
        maxCompanions: 4,
      },
    };
    const directive = selectVoice(BASE_EVENT_RECORD, stateWithCompanions);
    expect(directive.characterBibles.length).toBe(1);
    expect(directive.characterBibles[0]).toContain('Elias Coe');
  });

  it('excludes dead companions from characterBibles', () => {
    const stateWithDead: GameState = {
      ...BASE_STATE,
      party: {
        companions: [
          {
            id: CompanionId.EliasCoe,
            health: 0,
            morale: 0,
            loyalty: 0,
            conditions: [],
            dayJoined: 3,
            status: 'dead',
          },
        ],
        maxCompanions: 4,
      },
    };
    const directive = selectVoice(BASE_EVENT_RECORD, stateWithDead);
    expect(directive.characterBibles.length).toBe(0);
  });

  it('populates threadReferences from active threads', () => {
    const stateWithThreads: GameState = {
      ...BASE_STATE,
      narrative: {
        ...BASE_STATE.narrative,
        activeThreads: [
          {
            id: 'thread_coe_war',
            description: "Coe's war secret",
            status: 'open',
            participants: ['Coe'],
            plantedDay: 5,
          },
          {
            id: 'thread_resolved',
            description: 'Resolved thread',
            status: 'resolved',
            participants: [],
            plantedDay: 2,
          },
        ],
      },
    };
    const directive = selectVoice(BASE_EVENT_RECORD, stateWithThreads);
    expect(directive.threadReferences.length).toBe(1);
    expect(directive.threadReferences[0]).toContain("Coe's war secret");
  });

  it('populates foreshadowingHints from ledger pending consequences', () => {
    const stateWithLedger: GameState = {
      ...BASE_STATE,
      narrative: {
        ...BASE_STATE.narrative,
        structuredLedger: [
          {
            period: 'Days 1-5',
            act: 'Act I',
            majorEvents: [],
            activeThreads: [],
            relationships: [],
            pendingConsequences: [
              { trigger: 'loyalty < 20', consequence: 'Coe may desert', foreshadowed: false },
              { trigger: 'Day >= 20', consequence: 'Storm front', foreshadowed: true },
            ],
            emotionalArc: 'Steady',
            lossesAndGains: [],
          },
        ],
      },
    };
    const directive = selectVoice(BASE_EVENT_RECORD, stateWithLedger);
    expect(directive.foreshadowingHints.length).toBe(1);
    expect(directive.foreshadowingHints[0]).toBe('Coe may desert');
  });

  it('returns empty arrays without state param', () => {
    const directive = selectVoice(BASE_EVENT_RECORD);
    expect(directive.characterBibles).toEqual([]);
    expect(directive.threadReferences).toEqual([]);
    expect(directive.foreshadowingHints).toEqual([]);
  });
});

// ============================================================
// shouldGenerateLedgerEntry
// ============================================================

describe('shouldGenerateLedgerEntry', () => {
  it('returns true for multiples of 5', () => {
    expect(shouldGenerateLedgerEntry(5)).toBe(true);
    expect(shouldGenerateLedgerEntry(10)).toBe(true);
    expect(shouldGenerateLedgerEntry(15)).toBe(true);
    expect(shouldGenerateLedgerEntry(100)).toBe(true);
  });

  it('returns false for non-multiples of 5', () => {
    expect(shouldGenerateLedgerEntry(1)).toBe(false);
    expect(shouldGenerateLedgerEntry(7)).toBe(false);
    expect(shouldGenerateLedgerEntry(13)).toBe(false);
  });

  it('returns false for day 0', () => {
    expect(shouldGenerateLedgerEntry(0)).toBe(false);
  });
});

// ============================================================
// generateLedgerEntry
// ============================================================

describe('generateLedgerEntry', () => {
  it('creates valid ledger entry with correct period', () => {
    const ledger = generateLedgerEntry(BASE_STATE, [BASE_EVENT_RECORD]);
    expect(ledger.period).toBe('Days 6-10');
    expect(ledger.act).toContain('Act');
  });

  it('extracts major/critical events', () => {
    const eventWithMajor: EventRecord = {
      ...BASE_EVENT_RECORD,
      events: [
        { type: 'encounter', description: 'Bandit ambush', severity: 'major' },
        { type: 'travel', description: 'Traveled 18 miles', severity: 'minor' },
        { type: 'weather', description: 'Flash flood', severity: 'critical' },
      ],
    };
    const ledger = generateLedgerEntry(BASE_STATE, [eventWithMajor]);
    expect(ledger.majorEvents.length).toBe(2);
    expect(ledger.majorEvents[0]).toContain('Bandit ambush');
    expect(ledger.majorEvents[1]).toContain('Flash flood');
  });

  it('caps major events at 5', () => {
    const manyEvents: EventRecord = {
      ...BASE_EVENT_RECORD,
      events: Array.from({ length: 10 }, (_, i) => ({
        type: 'event',
        description: `Major event ${i}`,
        severity: 'major' as const,
      })),
    };
    const ledger = generateLedgerEntry(BASE_STATE, [manyEvents]);
    expect(ledger.majorEvents.length).toBe(5);
  });

  it('includes companion departures in major events', () => {
    const eventWithDeparture: EventRecord = {
      ...BASE_EVENT_RECORD,
      companionEvents: [
        { companion: 'Coe', type: 'deserted', detail: 'Elias Coe left in the night.' },
      ],
    };
    const ledger = generateLedgerEntry(BASE_STATE, [eventWithDeparture]);
    expect(ledger.majorEvents.some((e) => e.includes('Elias Coe left'))).toBe(true);
  });

  it("includes Devil's Bargain in major events", () => {
    const eventWithBargain: EventRecord = {
      ...BASE_EVENT_RECORD,
      devilsBargain: {
        crisis: 'Water zero',
        encounter: 'Comanchero trader',
        cost: 'Rifle lost',
        accepted: true,
      },
    };
    const ledger = generateLedgerEntry(BASE_STATE, [eventWithBargain]);
    expect(ledger.majorEvents.some((e) => e.includes("Devil's Bargain accepted"))).toBe(true);
  });

  it('builds relationships from active companions', () => {
    const stateWithCompanion: GameState = {
      ...BASE_STATE,
      party: {
        companions: [
          {
            id: CompanionId.EliasCoe,
            health: 85,
            morale: 60,
            loyalty: 70,
            conditions: [],
            dayJoined: 3,
            status: 'active',
          },
        ],
        maxCompanions: 4,
      },
    };
    const ledger = generateLedgerEntry(stateWithCompanion, [BASE_EVENT_RECORD]);
    expect(ledger.relationships.length).toBe(1);
    expect(ledger.relationships[0].companion).toBe('Coe');
    expect(ledger.relationships[0].loyalty).toBe(70);
  });

  it('adds pending consequences for low-loyalty companions', () => {
    const stateWithLowLoyalty: GameState = {
      ...BASE_STATE,
      party: {
        companions: [
          {
            id: CompanionId.EliasCoe,
            health: 85,
            morale: 60,
            loyalty: 15,
            conditions: [],
            dayJoined: 3,
            status: 'active',
          },
        ],
        maxCompanions: 4,
      },
    };
    const ledger = generateLedgerEntry(stateWithLowLoyalty, [BASE_EVENT_RECORD]);
    expect(ledger.pendingConsequences.some((pc) => pc.consequence.includes('desert'))).toBe(true);
  });

  it('adds Fort Sumner debt as pending consequence', () => {
    const stateWithDebt: GameState = {
      ...BASE_STATE,
      journey: { ...BASE_STATE.journey, fortSumnerDebt: true },
    };
    const ledger = generateLedgerEntry(stateWithDebt, [BASE_EVENT_RECORD]);
    expect(ledger.pendingConsequences.some((pc) => pc.consequence.includes('Comanchero'))).toBe(true);
  });

  it('has valid emotional arc', () => {
    const ledger = generateLedgerEntry(BASE_STATE, [BASE_EVENT_RECORD]);
    expect(ledger.emotionalArc).toContain('Morale');
    expect(ledger.emotionalArc).toContain('10 days');
  });
});

// ============================================================
// assemblePrompt
// ============================================================

describe('assemblePrompt', () => {
  it('includes encounter context when events contain encounter type', () => {
    const eventWithEncounter: EventRecord = {
      ...BASE_EVENT_RECORD,
      events: [
        { type: 'encounter', description: 'Bandits ambushed the party', severity: 'major' },
      ],
    };
    const directive = selectVoice(eventWithEncounter, BASE_STATE);
    const prompt = assemblePrompt(directive, eventWithEncounter, BASE_STATE);

    expect(prompt.encounterContext).toContain('ENCOUNTER');
    expect(prompt.encounterContext).toContain('Bandits ambushed the party');
  });

  it('encounterContext is empty when no encounter events', () => {
    const directive = selectVoice(BASE_EVENT_RECORD, BASE_STATE);
    const prompt = assemblePrompt(directive, BASE_EVENT_RECORD, BASE_STATE);

    expect(prompt.encounterContext).toBe('');
  });

  it('includes Devil\'s Bargain in encounter context when accepted', () => {
    const eventWithBargain: EventRecord = {
      ...BASE_EVENT_RECORD,
      devilsBargain: {
        crisis: 'Water zero',
        encounter: 'Comanchero trader',
        cost: 'Rifle lost',
        accepted: true,
      },
    };
    const directive = selectVoice(eventWithBargain, BASE_STATE);
    const prompt = assemblePrompt(directive, eventWithBargain, BASE_STATE);

    expect(prompt.encounterContext).toContain("DEVIL'S BARGAIN ACCEPTED");
    expect(prompt.encounterContext).toContain('Comanchero trader');
  });

  it('includes companion drama in encounter context', () => {
    const eventWithCompanionDrama: EventRecord = {
      ...BASE_EVENT_RECORD,
      companionEvents: [
        {
          companion: 'Coe',
          type: 'loyaltyChange',
          detail: 'Elias Coe loyalty -8 from Companion Tension',
          loyaltyDelta: -8,
        },
      ],
    };
    const directive = selectVoice(eventWithCompanionDrama, BASE_STATE);
    const prompt = assemblePrompt(directive, eventWithCompanionDrama, BASE_STATE);

    expect(prompt.encounterContext).toContain('COMPANION');
    expect(prompt.encounterContext).toContain('Coe');
  });

  it('has all required prompt fields populated', () => {
    const directive = selectVoice(BASE_EVENT_RECORD, BASE_STATE);
    const prompt = assemblePrompt(directive, BASE_EVENT_RECORD, BASE_STATE);

    expect(prompt.systemMessage).toContain('narrator');
    expect(prompt.eventRecord).toContain('"day"');
    expect(prompt.gameStateSnapshot).toContain('"biome"');
    expect(prompt.voiceDirective).toContain('"voice"');
  });
});
