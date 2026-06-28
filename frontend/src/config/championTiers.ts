import type { ChampionTierId, ChampionTierDef } from '../types'
import { CHAMPION_TIER_CHIMES_PRICE, CHAMPION_TIER_REQUIRED_GALAXY } from './constants'
import { CHAMPION_DATA } from './championData'

// ── Champion Tiers ────────────────────────────────────────────────────────────
// Part of the Galaxy/Champion Tier system. Each Champion Tier represents one
// *star level* (1..MAX_STAR_LEVEL). A galaxy at star level N spawns champions
// whose Champion Tier is level N, and the Shop / Select panels group champions
// into these 12 tiers (weak→strong). This is the single Champion-Tier axis: set
// explicitly per champion via `championTier` in championData.ts, it also drives the
// recruit cost (getChampionChimesPrice). Completely separate from the 15 synergy
// traits in championTraits.ts (which drive CPS/power/DPS bonuses).
//
// Icons are registered in USED_GAME_ICONS (constants.ts) before use.
export const CHAMPION_TIERS: Record<ChampionTierId, ChampionTierDef> = {
  // ★1 — the newest recruits, drifting alone through the first galaxies.
  lone_wanderer: {
    id: 'lone_wanderer',
    starLevel: 1,
    name: 'Lone Wanderer',
    icon: 'game-icons:walking-boot',
    color: '#a08c72',
    description: 'A solitary traveler taking the first steps across the cosmos.',
  },
  // ★2 — those who chase the north star between the first galaxies.
  star_drifter: {
    id: 'star_drifter',
    starLevel: 2,
    name: 'Star Drifter',
    icon: 'game-icons:polar-star',
    color: '#8ba36a',
    description: 'A drifter following the north star between the early galaxies.',
  },
  // ★3 — champions sworn to protect Bard's meeps.
  meep_guardian: {
    id: 'meep_guardian',
    starLevel: 3,
    name: 'Meep Guardian',
    icon: 'game-icons:fairy',
    color: '#62b84e',
    description: "Keeper of the meeps, shepherding Bard's tiny companions.",
  },
  // ★4 — those who learned to walk between the stars through rifts.
  rift_keeper: {
    id: 'rift_keeper',
    starLevel: 4,
    name: 'Rift Keeper',
    icon: 'game-icons:star-gate',
    color: '#4e96e0',
    description: 'Warden of the star-rifts that thread the galaxies together.',
  },
  // ★5 — daredevils who ride comets through the burning dark.
  comet_rider: {
    id: 'comet_rider',
    starLevel: 5,
    name: 'Comet Rider',
    icon: 'game-icons:burning-meteor',
    color: '#4ec6c0',
    description: 'A daredevil who rides comets through the burning dark.',
  },
  // ★6 — sages who read the swirling nebulae for hidden starlight.
  nebula_sage: {
    id: 'nebula_sage',
    starLevel: 6,
    name: 'Nebula Sage',
    icon: 'game-icons:star-prominences',
    color: '#5e86d4',
    description: 'A sage who reads the swirling nebulae for hidden starlight.',
  },
  // ★7 — masters who weave the chimes of the cosmos.
  chime_weaver: {
    id: 'chime_weaver',
    starLevel: 7,
    name: 'Chime Weaver',
    icon: 'game-icons:spider-web',
    color: '#9c5ed4',
    description: 'Weaver of cosmic chimes, bending sound and starlight alike.',
  },
  // ★8 — guardians of the astral altar where star-fire is forged.
  astral_warden: {
    id: 'astral_warden',
    starLevel: 8,
    name: 'Astral Warden',
    icon: 'game-icons:star-altar',
    color: '#b75ed4',
    description: 'Guardian of the astral altar where star-fire is forged.',
  },
  // ★9 — heralds of the eclipse, moving worlds across the sun.
  eclipse_herald: {
    id: 'eclipse_herald',
    starLevel: 9,
    name: 'Eclipse Herald',
    icon: 'game-icons:moon-orbit',
    color: '#d45eb0',
    description: 'Herald of the eclipse, moving worlds across the sun.',
  },
  // ★10 — sovereigns of the void-gates between dying galaxies.
  void_sovereign: {
    id: 'void_sovereign',
    starLevel: 10,
    name: 'Void Sovereign',
    icon: 'game-icons:portal',
    color: '#d45e7e',
    description: 'Sovereign of the void-gates between dying galaxies.',
  },
  // ★11 — wardens of whole galaxies, cradling stars yet unborn.
  galaxy_warden: {
    id: 'galaxy_warden',
    starLevel: 11,
    name: 'Galaxy Warden',
    icon: 'game-icons:cosmic-egg',
    color: '#e0883a',
    description: 'Warden of whole galaxies, cradling new stars yet unborn.',
  },
  // ★12 — the highest echelon, rulers of the deep cosmos.
  cosmic_sovereign: {
    id: 'cosmic_sovereign',
    starLevel: 12,
    name: 'Cosmic Sovereign',
    icon: 'game-icons:queen-crown',
    color: '#d85030',
    description: 'Sovereign of the deepest galaxies, born of pure starlight.',
  },
}

// Fast lookup: star level → Champion Tier definition.
export const CHAMPION_TIER_BY_STAR: Record<number, ChampionTierDef> = Object.fromEntries(
  Object.values(CHAMPION_TIERS).map((t) => [t.starLevel, t]),
)

// All champion tiers ordered by star level (1..MAX_STAR_LEVEL) — used by the
// Shop / Select panels to render every tier section (incl. locked teasers).
export const CHAMPION_TIERS_BY_STAR: ChampionTierDef[] = Object.values(CHAMPION_TIERS).sort(
  (a, b) => a.starLevel - b.starLevel,
)

/** Resolve a champion's Champion Tier star level (1..MAX_STAR_LEVEL) from its `championTier`. */
export function getChampionStarLevel(name: string): number {
  const def = CHAMPION_DATA[name]
  return def?.championTier ? CHAMPION_TIERS[def.championTier].starLevel : 1
}

/** Resolve a champion's Champion Tier definition from its explicit `championTier`. */
export function getChampionTier(name: string): ChampionTierDef {
  const def = CHAMPION_DATA[name]
  if (def?.championTier) return CHAMPION_TIERS[def.championTier]
  return CHAMPION_TIER_BY_STAR[1] ?? CHAMPION_TIERS.lone_wanderer
}

/** Recruit cost (Chimes) for a champion, by its Champion Tier — the single tier economy. */
export function getChampionChimesPrice(name: string): number {
  const star = getChampionStarLevel(name)
  return CHAMPION_TIER_CHIMES_PRICE[star - 1] ?? CHAMPION_TIER_CHIMES_PRICE[0]
}

/** Galaxy at which the Shop reveals/expands a given Champion Tier (1..MAX_STAR_LEVEL). */
export function requiredGalaxyForTier(tier: number): number {
  return CHAMPION_TIER_REQUIRED_GALAXY[tier - 1] ?? CHAMPION_TIER_REQUIRED_GALAXY[CHAMPION_TIER_REQUIRED_GALAXY.length - 1]
}
