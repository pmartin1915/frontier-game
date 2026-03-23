/**
 * Frontier — Fallback Ledger
 *
 * Per GDD §9.5: 30–50 hard-coded Adams-register entries for API timeout scenarios.
 * Tagged by biome and morale band. Period-accurate, tonally neutral,
 * vague enough to fit any trail segment.
 *
 * These entries are pre-authored. They are NOT AI-generated at runtime.
 */

import type { FallbackEntry } from '@/types/narrative';
import { Biome, MoraleState } from '@/types/game-state';

export const FALLBACK_ENTRIES: FallbackEntry[] = [
  // === CROSS TIMBERS ===
  { id: 'ct-01', biome: Biome.CrossTimbers, moraleBand: 'any',
    text: 'We made fair distance through the timber before noon and watered the horse at a clear branch. The afternoon passed without event. I made camp where the oaks thinned and a good grass flat opened south.' },
  { id: 'ct-02', biome: Biome.CrossTimbers, moraleBand: MoraleState.HighSpirits,
    text: 'The morning broke cool and the riding was easy through post-oak country. A covey of quail flushed at the trail edge and the horse barely noticed. By evening I had covered good ground and the provisions held.' },
  { id: 'ct-03', biome: Biome.CrossTimbers, moraleBand: MoraleState.Wavering,
    text: 'The timber grew thick and the trail narrowed to where I had to lead the horse on foot through the worst of it. Made poor distance. Camped early and cooked what there was.' },
  { id: 'ct-04', biome: Biome.CrossTimbers, moraleBand: MoraleState.Desperate,
    text: 'The timber closed in and the trail was hard to follow in the undergrowth. Thorns tore at the saddlebags and the horse was reluctant. I had started this journey with more than I had now and less distance behind me than ahead.' },

  // === STAKED PLAINS ===
  { id: 'sp-01', biome: Biome.StakedPlains, moraleBand: 'any',
    text: 'The plain stretched out flat and featureless in every direction. We held course by the sun and made steady if uninteresting miles. The water held but just.' },
  { id: 'sp-02', biome: Biome.StakedPlains, moraleBand: MoraleState.Desperate,
    text: 'Another day of nothing but grass and wind and the smell of dust. The horse kept on but without enthusiasm. I rationed the water carefully and tried not to think about how far the next creek might be.' },
  { id: 'sp-03', biome: Biome.StakedPlains, moraleBand: MoraleState.Steady,
    text: 'We pushed on across the flat. A dust devil spun up to the west and spent itself before reaching us. The riding was monotonous but the ground was firm and the pace held.' },
  { id: 'sp-04', biome: Biome.StakedPlains, moraleBand: MoraleState.HighSpirits,
    text: 'A good day on the flats. The grass was tall enough to brush the stirrups and a pair of antelope kept pace with us for half a mile before cutting east. The water held and the distance came easy.' },
  { id: 'sp-05', biome: Biome.StakedPlains, moraleBand: MoraleState.Wavering,
    text: 'The sameness of the plains wears on a man worse than hardship. Mile after mile of flat country with nothing to fix the eye on. The horse walked and I sat and the sun moved and that was the whole of it.' },

  // === DESERT APPROACH ===
  { id: 'da-01', biome: Biome.DesertApproach, moraleBand: 'any',
    text: 'The country turned dry and broken. Mesas rose to the south and the vegetation thinned to creosote and prickly pear. We found shade at midday and pressed on in the cooler hours.' },
  { id: 'da-02', biome: Biome.DesertApproach, moraleBand: MoraleState.Desperate,
    text: 'The heat bore down without mercy. I led the horse through a dry arroyo looking for seep water and found none. We pushed on with what we had and did not talk about what we did not have.' },
  { id: 'da-03', biome: Biome.DesertApproach, moraleBand: MoraleState.Steady,
    text: 'Dry country but manageable. The mesas gave shade in the afternoon and the horse picked its way around the prickly pear without being told. We found a seep near sundown and made camp in a sandy draw out of the wind.' },

  // === PECOS VALLEY ===
  { id: 'pv-01', biome: Biome.PecosValley, moraleBand: 'any',
    text: 'The Pecos ran muddy and alkaline but it was water and we were glad of it. The valley bottoms were flat and the riding straightforward. We camped on a gravel bar above the flood line.' },
  { id: 'pv-02', biome: Biome.PecosValley, moraleBand: MoraleState.HighSpirits,
    text: 'Good day along the river. Found a ford that was shallow enough to cross without soaking the provisions. The horse drank well and we made camp in a cottonwood grove with good grass.' },
  { id: 'pv-03', biome: Biome.PecosValley, moraleBand: MoraleState.Wavering,
    text: 'The valley narrowed and the bluffs closed in on both sides. The trail hugged the river where it could and climbed where it had to. Slow going. The horse was tired by evening and so was I.' },
  { id: 'pv-04', biome: Biome.PecosValley, moraleBand: MoraleState.Desperate,
    text: 'The Pecos ran low and thick with alkali. The horse would not drink it and I could not blame it. We pushed on along the bluffs looking for a tributary that ran clean and finding none. Made dry camp and rationed what was left.' },

  // === HIGH DESERT ===
  { id: 'hd-01', biome: Biome.HighDesert, moraleBand: 'any',
    text: 'High dry country with juniper and sage. The air was clear enough to see mountains to the north that were still two days distant. We made good time on hard ground.' },
  { id: 'hd-02', biome: Biome.HighDesert, moraleBand: MoraleState.Steady,
    text: 'The trail climbed gradually through mesa country. We passed a ruined jacal that had been abandoned some time and did not stop. By evening the temperature had dropped and the stars came out hard and bright.' },
  { id: 'hd-03', biome: Biome.HighDesert, moraleBand: MoraleState.Wavering,
    text: 'The juniper country stretched on without change. The trail was faint and I was not certain we were still on it. The horse drank the last of the spare water at noon and by evening we were both watching the horizon for any sign of green.' },
  { id: 'hd-04', biome: Biome.HighDesert, moraleBand: MoraleState.Desperate,
    text: 'Nothing out here wants you alive. The sun and the rock and the dry wind all say the same thing. Go back. But there is no going back and so you keep on through country that has no use for you and never did.' },

  // === MOUNTAIN PASS ===
  { id: 'mp-01', biome: Biome.MountainPass, moraleBand: 'any',
    text: 'The grade steepened after midday and the horse labored on the switchbacks. Pines closed in and the air turned sharp. We made camp below the summit in a sheltered draw.' },
  { id: 'mp-02', biome: Biome.MountainPass, moraleBand: MoraleState.Desperate,
    text: 'Cold night. The wind came down off the peaks and found every gap in the bedroll. The horse stood with its back to it and did not eat. We would need to be through the pass before the weather turned worse.' },
  { id: 'mp-03', biome: Biome.MountainPass, moraleBand: MoraleState.HighSpirits,
    text: 'Clear day in the mountains. The view from the ridge opened up to show green valleys below and snow on the far peaks. The descent was easier than the climb and we made good distance before dark.' },
  { id: 'mp-04', biome: Biome.MountainPass, moraleBand: MoraleState.Steady,
    text: 'The climb was steady and the horse found good footing on the granite shelves. Pines grew thick on both sides and the air was thin and clean. We crossed a snowmelt creek at noon and filled the canteens with water cold enough to ache the teeth.' },
  { id: 'mp-05', biome: Biome.MountainPass, moraleBand: MoraleState.Wavering,
    text: 'The trail switchbacked through loose shale and the horse slipped twice before I dismounted and led it by hand. My legs burned on the grade. The summit was still nowhere in sight and the clouds were building from the west.' },

  // === COLORADO PLAINS ===
  { id: 'cp-01', biome: Biome.ColoradoPlains, moraleBand: 'any',
    text: 'The front range fell behind us and the country opened into green rolling plains. Water was plentiful and the grass tall. The horse grazed well and we pushed north.' },
  { id: 'cp-02', biome: Biome.ColoradoPlains, moraleBand: MoraleState.HighSpirits,
    text: 'Fine country. The best we had seen since the Cross Timbers. A creek ran clear and cold and the horse stood in it up to its knees. I refilled everything and let the afternoon pass easy.' },
  { id: 'cp-03', biome: Biome.ColoradoPlains, moraleBand: MoraleState.Steady,
    text: 'Good rolling grassland with creeks running clear from the mountains. The horse grazed well at midday and we made steady distance north. The front range stood blue and white against the sky ahead.' },
  { id: 'cp-04', biome: Biome.ColoradoPlains, moraleBand: MoraleState.Desperate,
    text: 'Even in this green country the trail can break you. The provisions were low and Denver was still days ahead and the distance between those facts was all I could think about. But the mountains were closer now and that had to count for something.' },

  // === ANY BIOME ===
  { id: 'any-01', biome: 'any', moraleBand: 'any',
    text: 'We made fair distance before the light gave out and camped where the ground was level and the water close. The provisions held and the horse was sound. A quiet day on the trail and I was grateful for it.' },
  { id: 'any-02', biome: 'any', moraleBand: MoraleState.Steady,
    text: 'An ordinary day. We kept the pace and covered the miles and nothing happened worth noting except that nothing bad happened either, which on this trail counts for something.' },
  { id: 'any-03', biome: 'any', moraleBand: MoraleState.Wavering,
    text: 'Hard going. The trail offered no favors and we took none. Made camp tired and ate without conversation. Tomorrow would be another day of the same.' },
  { id: 'any-04', biome: 'any', moraleBand: MoraleState.Desperate,
    text: 'We kept on because there was nothing else to do. The supplies were thin and the trail was long and between those two facts there was not much room for comfort. But we kept on.' },
  { id: 'any-05', biome: 'any', moraleBand: MoraleState.Broken,
    text: 'I do not know how far we traveled. The horse moved and I sat on it and the country passed. That is all I can say of the day.' },
  { id: 'any-06', biome: 'any', moraleBand: MoraleState.HighSpirits,
    text: 'A fine day on the trail and I will mark it as such. The weather held, the horse was willing, and the miles passed without incident. There are days that test you and days that carry you and this was the latter. I would take as many as the trail would give.' },
];

/**
 * Select the most contextually appropriate fallback entry.
 * Prefers exact biome + morale match, falls back to biome-any, then any-any.
 */
export function selectFallbackEntry(biome: Biome, moraleState: MoraleState): FallbackEntry {
  // Try exact match
  const exact = FALLBACK_ENTRIES.filter(
    (e) => e.biome === biome && e.moraleBand === moraleState,
  );
  if (exact.length > 0) return exact[Math.floor(Math.random() * exact.length)];

  // Try biome match with any morale
  const biomeAny = FALLBACK_ENTRIES.filter(
    (e) => e.biome === biome && e.moraleBand === 'any',
  );
  if (biomeAny.length > 0) return biomeAny[Math.floor(Math.random() * biomeAny.length)];

  // Try any biome with morale match
  const anyBiome = FALLBACK_ENTRIES.filter(
    (e) => e.biome === 'any' && e.moraleBand === moraleState,
  );
  if (anyBiome.length > 0) return anyBiome[Math.floor(Math.random() * anyBiome.length)];

  // Final fallback: any-any
  const anyAny = FALLBACK_ENTRIES.filter(
    (e) => e.biome === 'any' && e.moraleBand === 'any',
  );
  return anyAny[Math.floor(Math.random() * anyAny.length)];
}
