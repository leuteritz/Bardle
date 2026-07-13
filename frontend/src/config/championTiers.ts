import type { ChampionTierId, ChampionTierDef } from '../types'
import {
  CHAMPION_TIER_CHIMES_PRICE,
  CHAMPION_TIER_REQUIRED_GALAXY,
  MAX_STAR_LEVEL,
  TIER_SPAWN_WEIGHTS,
} from './constants'
import { CHAMPION_DATA } from './championData'

// ── Champion Tiers ────────────────────────────────────────────────────────────
// The spawn-pool axis: exactly 6 Champion Tiers, weakest (★1, most champions) →
// strongest (★6, fewest). Set explicitly per champion via `championTier` in
// championData.ts; also drives the recruit cost (getChampionChimesPrice). Tiers
// unlock cumulatively by galaxy (CHAMPION_TIER_REQUIRED_GALAXY) and, once unlocked,
// spawn together by weighted probability (TIER_SPAWN_WEIGHTS). Completely separate
// from the 15 synergy traits in championTraits.ts (which drive CPS/power/DPS bonuses).
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
  // ★2 — those who learned to walk between the stars through rifts.
  rift_keeper: {
    id: 'rift_keeper',
    starLevel: 2,
    name: 'Rift Keeper',
    icon: 'game-icons:star-gate',
    color: '#4e96e0',
    description: 'Warden of the star-rifts that thread the galaxies together.',
  },
  // ★3 — sages who read the swirling nebulae for hidden starlight.
  nebula_sage: {
    id: 'nebula_sage',
    starLevel: 3,
    name: 'Nebula Sage',
    icon: 'game-icons:star-prominences',
    color: '#5e86d4',
    description: 'A sage who reads the swirling nebulae for hidden starlight.',
  },
  // ★4 — guardians of the astral altar where star-fire is forged.
  astral_warden: {
    id: 'astral_warden',
    starLevel: 4,
    name: 'Astral Warden',
    icon: 'game-icons:star-altar',
    color: '#b75ed4',
    description: 'Guardian of the astral altar where star-fire is forged.',
  },
  // ★5 — sovereigns of the void-gates between dying galaxies.
  void_sovereign: {
    id: 'void_sovereign',
    starLevel: 5,
    name: 'Void Sovereign',
    icon: 'game-icons:portal',
    color: '#d45e7e',
    description: 'Sovereign of the void-gates between dying galaxies.',
  },
  // ★6 — the highest echelon, rulers of the deep cosmos.
  cosmic_sovereign: {
    id: 'cosmic_sovereign',
    starLevel: 6,
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

/** True when a Champion Tier (1..MAX_STAR_LEVEL) is currently unlocked for the
 *  player, given galaxy progression and the tiers already met. Single source of
 *  truth for the galaxy gate (the inverse of the Shop's isTierGalaxyLocked):
 *   • tiers up to the current galaxy's spawn level are already reachable;
 *   • a tier whose required galaxy has been reached is unlocked;
 *   • a tier whose champion was already met is revealed regardless. */
export function isChampionTierUnlocked(
  tier: number,
  currentGalaxy: number,
  requiredStarLevel: number,
  discoveredStars: Set<number>,
): boolean {
  if (tier <= requiredStarLevel) return true
  if (currentGalaxy >= requiredGalaxyForTier(tier)) return true
  return discoveredStars.has(tier)
}

// ── Weighted spawn odds (single source of truth for stores + UI) ───────────────

/** How many Champion Tiers are unlocked at a galaxy (cumulative, clamped 1..MAX). */
export function unlockedChampionTierCount(currentGalaxy: number): number {
  const count = CHAMPION_TIER_REQUIRED_GALAXY.filter((g) => currentGalaxy >= g).length
  return Math.min(MAX_STAR_LEVEL, Math.max(1, count))
}

/** Spawn-weight row for a given number of unlocked tiers (descending, sums to 100). */
export function tierSpawnWeights(unlockedCount: number): number[] {
  const idx = Math.min(TIER_SPAWN_WEIGHTS.length, Math.max(1, unlockedCount)) - 1
  return TIER_SPAWN_WEIGHTS[idx]
}

/** Current spawn chance (%) for a tier at a galaxy, or null when the tier is locked. */
export function championTierSpawnPercent(
  tierStarLevel: number,
  currentGalaxy: number,
): number | null {
  const unlocked = unlockedChampionTierCount(currentGalaxy)
  if (tierStarLevel < 1 || tierStarLevel > unlocked) return null
  return tierSpawnWeights(unlocked)[tierStarLevel - 1] ?? null
}

/** Per-champion spawn chance (%) inside an eligible pool, keyed by tier star level.
 *  Mirrors the pick in planetBossStore: tiers with no eligible champion are dropped
 *  and the remaining weights renormalized, then a tier's share splits uniformly among
 *  its champions. `tierCounts` maps star level → number of eligible champions of that
 *  tier in the pool (e.g. one role's still-obtainable roster). Tiers beyond the
 *  galaxy's unlocked count never spawn and get no entry. */
export function perChampionSpawnPercents(
  tierCounts: Map<number, number>,
  currentGalaxy: number,
): Map<number, number> {
  const unlocked = unlockedChampionTierCount(currentGalaxy)
  const weights = tierSpawnWeights(unlocked)
  const present = [...tierCounts.entries()].filter(
    ([star, count]) => star >= 1 && star <= unlocked && count > 0,
  )
  const total = present.reduce((sum, [star]) => sum + (weights[star - 1] ?? 0), 0)
  const result = new Map<number, number>()
  if (total <= 0) return result
  for (const [star, count] of present) {
    result.set(star, (((weights[star - 1] ?? 0) / total) * 100) / count)
  }
  return result
}
