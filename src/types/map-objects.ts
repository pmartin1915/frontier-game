/**
 * Map object definitions — scenery sprites for TrailScene and CampScene.
 *
 * Each object is a static PNG (no animation) loaded as a Phaser image texture.
 * Objects are assigned to biomes so the trail shows appropriate scenery.
 *
 * Imports: nothing (types layer).
 */

// ============================================================
// MAP OBJECT CONFIG
// ============================================================

export type ObjectCategory = 'vegetation' | 'terrain' | 'structure';

export interface MapObjectDef {
  key: string;
  path: string;
  width: number;
  height: number;
  category: ObjectCategory;
}

/** All available map object assets. */
export const MAP_OBJECTS: Record<string, MapObjectDef> = {
  // Trail scenery — vegetation
  mesquite_tree:   { key: 'mesquite_tree',   path: 'assets/objects/mesquite_tree.png',   width: 48, height: 64, category: 'vegetation' },
  oak_tree:        { key: 'oak_tree',        path: 'assets/objects/oak_tree.png',        width: 48, height: 64, category: 'vegetation' },
  dead_tree:       { key: 'dead_tree',       path: 'assets/objects/dead_tree.png',       width: 32, height: 64, category: 'vegetation' },
  cactus_saguaro:  { key: 'cactus_saguaro',  path: 'assets/objects/cactus_saguaro.png',  width: 24, height: 48, category: 'vegetation' },
  cactus_prickly:  { key: 'cactus_prickly',  path: 'assets/objects/cactus_prickly.png',  width: 32, height: 32, category: 'vegetation' },
  prairie_grass:   { key: 'prairie_grass',   path: 'assets/objects/prairie_grass.png',   width: 32, height: 32, category: 'vegetation' },
  wildflowers:     { key: 'wildflowers',     path: 'assets/objects/wildflowers.png',     width: 32, height: 32, category: 'vegetation' },
  tumbleweed:      { key: 'tumbleweed',      path: 'assets/objects/tumbleweed.png',      width: 32, height: 32, category: 'vegetation' },

  // Trail scenery — terrain
  rock_formation:  { key: 'rock_formation',  path: 'assets/objects/rock_formation.png',  width: 48, height: 32, category: 'terrain' },
  rock_small:      { key: 'rock_small',      path: 'assets/objects/rock_small.png',      width: 32, height: 32, category: 'terrain' },
  wooden_bridge:   { key: 'wooden_bridge',   path: 'assets/objects/wooden_bridge.png',   width: 64, height: 32, category: 'terrain' },

  // Trail scenery — structures
  fence_posts:     { key: 'fence_posts',     path: 'assets/objects/fence_posts.png',     width: 48, height: 24, category: 'structure' },
  hitching_post:   { key: 'hitching_post',   path: 'assets/objects/hitching_post.png',   width: 32, height: 32, category: 'structure' },
  trail_marker:    { key: 'trail_marker',    path: 'assets/objects/trail_marker.png',    width: 32, height: 32, category: 'structure' },
  water_barrel:    { key: 'water_barrel',    path: 'assets/objects/water_barrel.png',    width: 32, height: 32, category: 'structure' },

  // Waypoint buildings
  fort_stockade:   { key: 'fort_stockade',   path: 'assets/objects/fort_stockade.png',   width: 96, height: 64, category: 'structure' },
  trading_post:    { key: 'trading_post',    path: 'assets/objects/trading_post.png',    width: 64, height: 48, category: 'structure' },
  general_store:   { key: 'general_store',   path: 'assets/objects/general_store.png',   width: 64, height: 48, category: 'structure' },
  saloon:          { key: 'saloon',          path: 'assets/objects/saloon.png',          width: 64, height: 48, category: 'structure' },
  adobe_dwelling:  { key: 'adobe_dwelling',  path: 'assets/objects/adobe_dwelling.png',  width: 48, height: 32, category: 'structure' },
  log_cabin:       { key: 'log_cabin',       path: 'assets/objects/log_cabin.png',       width: 48, height: 32, category: 'structure' },

  // Camp scene props
  campfire_lit:    { key: 'campfire_lit',    path: 'assets/objects/campfire_lit.png',    width: 32, height: 32, category: 'structure' },
  tent_canvas:     { key: 'tent_canvas',     path: 'assets/objects/tent_canvas.png',     width: 48, height: 32, category: 'structure' },
  bedroll:         { key: 'bedroll',         path: 'assets/objects/bedroll.png',         width: 32, height: 32, category: 'structure' },
  cooking_pot:     { key: 'cooking_pot',     path: 'assets/objects/cooking_pot.png',     width: 32, height: 32, category: 'structure' },
  lantern:         { key: 'lantern',         path: 'assets/objects/lantern.png',         width: 32, height: 32, category: 'structure' },
};

// ============================================================
// BIOME → SCENERY MAPPING
// ============================================================

/** Which objects appear in each biome's trail scenery (background layer). */
export const BIOME_SCENERY: Record<string, string[]> = {
  crossTimbers:    ['oak_tree', 'prairie_grass', 'wildflowers', 'rock_small', 'fence_posts', 'mesquite_tree', 'trail_marker', 'hitching_post'],
  stakedPlains:    ['prairie_grass', 'tumbleweed', 'wildflowers', 'trail_marker', 'rock_small', 'dead_tree', 'fence_posts', 'rock_formation'],
  desertApproach:  ['cactus_saguaro', 'cactus_prickly', 'dead_tree', 'rock_formation', 'tumbleweed', 'trail_marker', 'rock_small', 'prairie_grass'],
  pecosValley:     ['mesquite_tree', 'rock_formation', 'cactus_prickly', 'prairie_grass', 'water_barrel', 'dead_tree', 'fence_posts', 'tumbleweed'],
  highDesert:      ['cactus_saguaro', 'dead_tree', 'rock_formation', 'tumbleweed', 'rock_small', 'cactus_prickly', 'trail_marker', 'prairie_grass'],
  mountainPass:    ['dead_tree', 'rock_formation', 'rock_small', 'trail_marker', 'prairie_grass', 'fence_posts', 'water_barrel'],
  coloradoPlains:  ['oak_tree', 'prairie_grass', 'wildflowers', 'fence_posts', 'hitching_post', 'rock_small', 'mesquite_tree', 'trail_marker'],
};

/** Camp scene prop keys (always displayed). */
export const CAMP_PROPS = ['campfire_lit', 'tent_canvas', 'bedroll', 'cooking_pot', 'lantern'] as const;
