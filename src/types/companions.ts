/**
 * Frontier — Companion System Interfaces
 *
 * Defines companion profiles, Character Bibles, and runtime instances.
 * Per GDD §5: max 4 companions, each with health/morale/loyalty (0–100).
 */

import { Act, ActiveCondition } from './game-state';

// ============================================================
// COMPANION IDENTITY
// ============================================================

export enum CompanionId {
  EliasCoe = 'eliasCoe',
  LuisaVega = 'luisaVega',
  TomBlanchard = 'tomBlanchard',
}

export enum CompanionSkill {
  Navigation = 'navigation',
  Medicine = 'medicine',
  Hunting = 'hunting',
}

// ============================================================
// CHARACTER BIBLE
// ============================================================

/**
 * The Character Bible is included in every Narrator prompt when
 * the companion is in the active party. It constrains how the AI
 * writes dialogue and behavior for this character.
 *
 * These are static definitions. They do not change during gameplay.
 */
export interface CharacterBible {
  id: CompanionId;
  name: string;
  fullName: string;
  /** 1–2 sentence backstory for the Narrator */
  backstory: string;
  skill: CompanionSkill;
  /** Mechanical bonus description */
  skillEffect: string;

  // Voice constraints for McMurtry-register dialogue
  /** Speech pattern notes for the Narrator */
  speechPattern: string;
  /** How they address the player and others */
  addressStyle: string;
  /** What they talk about / avoid */
  topicBehavior: string;
  /** How they react under pressure */
  pressureBehavior: string;
  /** Humor style (if any) */
  humorStyle: string;

  /** How they interact with the camp pet (per GDD §3.8) */
  campPetInteraction: string;

  /** Act and location where they can be encountered */
  encounterAct: Act;
  encounterLocation: string;

  /** Scripted prose when this companion first joins. Adams register, ~100 words. */
  meetScene?: string;
}

/**
 * Pre-defined Character Bibles per GDD §5.2.
 */
export const CHARACTER_BIBLES: Record<CompanionId, CharacterBible> = {
  [CompanionId.EliasCoe]: {
    id: CompanionId.EliasCoe,
    name: 'Coe',
    fullName: 'Elias Coe',
    backstory: 'Union veteran. Fought at Vicksburg. Walking west because there is nothing east. Does not discuss the war unless pressed.',
    skill: CompanionSkill.Navigation,
    skillEffect: 'Reduced getting-lost chance, better route information, terrain awareness.',
    speechPattern: 'Short complete sentences. No contractions in orders. Military terms come naturally. Goes silent when emotional.',
    addressStyle: 'Last-name address. "Martin." Never first names unless trust is very high.',
    topicBehavior: 'Speaks about terrain, weather, practical matters. Does not discuss the war unless asked directly. Even then, terse.',
    pressureBehavior: 'Calm, methodical. Issues orders without raising voice. Silence means worst case.',
    humorStyle: 'Dry, rare. Usually at his own expense. A single sentence, then moves on.',
    campPetInteraction: 'Ignores the cat entirely. Occasionally moves it off his bedroll without comment.',
    encounterAct: Act.I,
    encounterLocation: 'Middle Concho, end of Act I',
    meetScene: 'We found him at the Middle Concho sitting on a rock with his rifle across his knees, watching the water. He did not look up when we approached. I said we were heading north and he said he knew. I asked if he wanted to ride along and he said he had been thinking about it. He stood and shouldered his pack and that was the whole conversation. He walked to his horse, a rawboned bay picketed in the willows, and mounted without a word. By the time we made camp that evening I understood two things about Elias Coe: he knew country, and he did not waste language on it.',
  },
  [CompanionId.LuisaVega]: {
    id: CompanionId.LuisaVega,
    name: 'Vega',
    fullName: 'Luisa Vega',
    backstory: 'Mexican-Apache heritage. Healer by trade and necessity. Arrived at Fort Sumner through circumstances she does not share until trust is earned.',
    skill: CompanionSkill.Medicine,
    skillEffect: 'Higher treatment success, plant identification, faster recovery times.',
    speechPattern: 'Occasional natural Spanish (untranslated). Precise practical observations. Direct.',
    addressStyle: 'First-name address. "Perry." Switches to formal when angry.',
    topicBehavior: 'Plants, medicine, weather signs. Past shared only at high trust (loyalty > 70).',
    pressureBehavior: 'Steady hands, sharp focus. Gives clear instructions. Frustrated by incompetence but works through it.',
    humorStyle: 'Wry humor at foolishness. A raised eyebrow conveyed through narration.',
    campPetInteraction: 'Feeds the cat scraps from meals. Talks to it in Spanish when she thinks no one is listening.',
    encounterAct: Act.III,
    encounterLocation: 'Fort Sumner, early Act III',
    meetScene: 'She was tending a man with a broken arm outside the sutler at Fort Sumner when I first saw her. She had set the bone and bound it with mesquite splints before the Army surgeon even arrived. I asked who she was and the sutler said her name was Vega and she had been at Bosque Redondo since the Navajo came. When I told her I was riding north she asked how many in the party and whether anyone knew plants. I said no and she said "Entonces, you need me" and went to gather her things. She traveled light. A medicine bag, a serape, a knife with a bone handle.',
  },
  [CompanionId.TomBlanchard]: {
    id: CompanionId.TomBlanchard,
    name: 'Blanchard',
    fullName: 'Tom Blanchard',
    backstory: 'Young cowhand from a collapsed outfit on the Pecos. Barely twenty. Good with animals, bad with silence.',
    skill: CompanionSkill.Hunting,
    skillEffect: 'Higher hunting success/yield, animal handling, reduced horse fatigue.',
    speechPattern: 'Talks too much when nervous. Run-on sentences, changes subject mid-thought. Questions constantly.',
    addressStyle: '"Mister" and "Miss" address. Overly formal from insecurity.',
    topicBehavior: 'Horses, food, the next town, rumors. Wrong but vivid metaphors. Avoids talking about his outfit.',
    pressureBehavior: 'Under pressure: rises sharply or freezes completely. Morale-dependent. High morale = capable. Low morale = paralyzed.',
    humorStyle: 'Unintentional. Says things that are funny because he means them seriously.',
    campPetInteraction: 'Names the cat immediately. Talks to it at length. Lets it sleep in his hat. Disproportionately devastated if it is lost.',
    encounterAct: Act.III,
    encounterLocation: 'Pecos, mid Act III',
    meetScene: 'The boy came out of the brush on the Pecos leading a spotted mare and talking to it like it was a person. His outfit had broken apart three weeks back — half went south, the boss went to Santa Fe with the money, and young Blanchard stayed with the horses because he could not think of what else to do. He asked if we could use a hand and when I said maybe he launched into a summary of every horse he had ever known by name and disposition. Coe looked at me. I looked at Coe. Blanchard was still talking when we broke camp the next morning.',
  },
};

// ============================================================
// RUNTIME COMPANION INSTANCE
// ============================================================

/**
 * A companion in the active party. Tracks mutable state.
 * The CharacterBible is looked up by id from the static table.
 */
export interface CompanionInstance {
  id: CompanionId;
  /** Health 0–100. 0 = death. */
  health: number;
  /** Morale 0–100. Independent of player morale. */
  morale: number;
  /** Loyalty 0–100. Drives desertion/betrayal thresholds. */
  loyalty: number;
  /** Active health conditions */
  conditions: ActiveCondition[];
  /** Day they joined the party */
  dayJoined: number;
  /** Whether they have deserted or died */
  status: 'active' | 'deserted' | 'dead';
}

/**
 * Creates a fresh CompanionInstance with starting values.
 */
export function createCompanionInstance(
  id: CompanionId,
  dayJoined: number,
): CompanionInstance {
  return {
    id,
    health: 85,
    morale: 60,
    loyalty: 50,
    conditions: [],
    dayJoined,
    status: 'active',
  };
}
