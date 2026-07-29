import type {
  ChampionRole,
  ChampionStatKey,
  ChampionStatDef,
  ChampionStats,
  ChampionRoleGrowth,
  AscensionRank,
  ChampionPerkDef,
  ChampionPerkTier,
  ChampionLevelCost,
} from '../types'
import {
  CHAMPION_XP_BASE,
  CHAMPION_XP_EXPONENT,
  CHAMPION_STAT_BASE,
  CHAMPION_STAT_TIER_STEP,
  CHAMPION_ASCENSION_INTERVAL,
  CHAMPION_ASCENSION_STAT_BONUS,
  CHAMPION_ASCENSION_MATERIAL_STEP,
  CHAMPION_PERK_INTERVAL,
  CHAMPION_LEVEL_CHIME_BASE,
  CHAMPION_LEVEL_CHIME_EXPONENT,
  CHAMPION_LEVEL_TIER_COST_STEP,
  CHAMPION_POWER_DPS_DIVISOR,
  CHAMPION_VITALITY_DIVISOR,
  CHAMPION_FOCUS_CD_DIVISOR,
  CHAMPION_FOCUS_CD_FLOOR,
  CHAMPION_FORTUNE_DIVISOR,
} from './constants'
import { CHAMPION_DATA } from './championData'
import { CHAMPION_TIERS } from './championTiers'

// ── Stats ─────────────────────────────────────────────────────────────────────
// Four stats, one gameplay effect each — no stat is decorative. Their icons are
// registered in USED_GAME_ICONS.

export const CHAMPION_STATS: ChampionStatDef[] = [
  {
    key: 'power',
    label: 'Power',
    short: 'PWR',
    icon: 'game-icons:mighty-force',
    color: '#e05050',
    desc: 'Raises the damage this champion deals to planet bosses while orbiting.',
    effectLabel: 'Orbit DPS',
  },
  {
    key: 'vitality',
    label: 'Vitality',
    short: 'VIT',
    icon: 'game-icons:heart-armor',
    color: '#52b830',
    desc: 'Hardens the champion — more effective HP in star fights and more battle power.',
    effectLabel: 'Battle Power',
  },
  {
    key: 'focus',
    label: 'Focus',
    short: 'FOC',
    icon: 'game-icons:meditation',
    color: '#4e96e0',
    desc: 'Sharpens the role ability — shields rebuild, curses land and bursts fire sooner.',
    effectLabel: 'Cooldown',
  },
  {
    key: 'fortune',
    label: 'Fortune',
    short: 'FOR',
    icon: 'game-icons:coinflip',
    color: '#e8c040',
    desc: 'Boss kills pay out more chimes and drop materials more often.',
    effectLabel: 'Rewards',
  },
]

export const STAT_BY_KEY = Object.fromEntries(CHAMPION_STATS.map((s) => [s.key, s])) as Record<
  ChampionStatKey,
  ChampionStatDef
>

/**
 * Stat gained per level, per role. This table is the reason a Support levels
 * differently from an ADC: every role sums to 7.2 per level, but spends it
 * along its own axis, so no role is strictly better — only better at something.
 */
export const ROLE_GROWTH: Record<ChampionRole, ChampionRoleGrowth> = {
  top: { power: 1.6, vitality: 3.2, focus: 1.4, fortune: 1.0 },
  jungle: { power: 2.4, vitality: 2.2, focus: 1.0, fortune: 1.6 },
  mid: { power: 3.0, vitality: 1.4, focus: 2.0, fortune: 0.8 },
  adc: { power: 3.4, vitality: 1.2, focus: 1.4, fortune: 1.2 },
  support: { power: 1.0, vitality: 2.0, focus: 3.2, fortune: 1.0 },
}

// ── Ascension ─────────────────────────────────────────────────────────────────
// One star every CHAMPION_ASCENSION_INTERVAL levels. Stars drive both the stat
// bonus and the rank band shown on the champion card.

export const ASCENSION_RANKS: AscensionRank[] = [
  { minStars: 0, name: 'Recruit', color: '#a08c72' },
  { minStars: 1, name: 'Bronze', color: '#c87a3a' },
  { minStars: 3, name: 'Silver', color: '#b8c0cc' },
  { minStars: 5, name: 'Gold', color: '#e8c040' },
  { minStars: 8, name: 'Prismatic', color: '#b070e0' },
]

/** Ascension stars earned at `level` (level 5 → 1 star, level 50 → 10). */
export function ascensionStars(level: number): number {
  return Math.floor(level / CHAMPION_ASCENSION_INTERVAL)
}

export function ascensionRank(level: number): AscensionRank {
  const stars = ascensionStars(level)
  let rank = ASCENSION_RANKS[0]
  for (const r of ASCENSION_RANKS) {
    if (stars >= r.minStars) rank = r
  }
  return rank
}

/** True when reaching `level` grants an ascension star (and charges materials). */
export function isAscensionLevel(level: number): boolean {
  return level > 0 && level % CHAMPION_ASCENSION_INTERVAL === 0
}

/** True when reaching `level` opens a perk choice. */
export function isPerkLevel(level: number): boolean {
  return level > 0 && level % CHAMPION_PERK_INTERVAL === 0
}

// ── Perks ─────────────────────────────────────────────────────────────────────
// Every 10th level opens a choice out of one pool. Pools escalate: `adept` is a
// pure stat pick, `master` adds a mechanic, `elite` repeats at 30/40/50 but each
// perk can only be taken once per champion, so the last picks are forced choices.

export const CHAMPION_PERKS: ChampionPerkDef[] = [
  // ── Adept (level 10) — commit to one axis ──
  {
    id: 'overload',
    tier: 'adept',
    name: 'Overload',
    icon: 'game-icons:energy-sword',
    color: '#e05050',
    desc: 'Channels raw force into every orbit strike.',
    stats: { power: 20 },
  },
  {
    id: 'bulwark',
    tier: 'adept',
    name: 'Bulwark',
    icon: 'game-icons:crenulated-shield',
    color: '#52b830',
    desc: 'Braces against everything the void throws back.',
    stats: { vitality: 20 },
  },
  {
    id: 'attunement',
    tier: 'adept',
    name: 'Attunement',
    icon: 'game-icons:concentration-orb',
    color: '#4e96e0',
    desc: 'Tunes the role ability to a faster rhythm.',
    stats: { focus: 20 },
  },
  // ── Master (level 20) — a mechanic on top of the stats ──
  {
    id: 'executioner',
    tier: 'master',
    name: 'Executioner',
    icon: 'game-icons:executioner-hood',
    color: '#cc6050',
    desc: 'Deals 45% bonus orbit damage to bosses below 30% HP.',
    stats: { power: 15 },
    effect: 'execute',
    value: 0.45,
  },
  {
    id: 'aegis-echo',
    tier: 'master',
    name: 'Aegis Echo',
    icon: 'game-icons:energy-shield',
    color: '#4e96e0',
    desc: 'The role ability hits 35% harder — shields, heals, bursts and curses alike.',
    stats: { focus: 12 },
    effect: 'abilityPower',
    value: 0.35,
  },
  {
    id: 'prospector',
    tier: 'master',
    name: 'Prospector',
    icon: 'game-icons:tarot-10-wheel-of-fortune',
    color: '#e8c040',
    desc: 'Boss payouts and material drops rise by a further 25%.',
    stats: { fortune: 25 },
    effect: 'fortuneSurge',
    value: 0.25,
  },
  // ── Elite (levels 30 / 40 / 50) — one pick each, never repeated ──
  {
    id: 'starfall',
    tier: 'elite',
    name: 'Starfall',
    icon: 'game-icons:shining-sword',
    color: '#e8c040',
    desc: '18% of orbit hits land as critical strikes for double damage.',
    stats: { power: 25 },
    effect: 'critChance',
    value: 0.18,
  },
  {
    id: 'last-stand',
    tier: 'elite',
    name: 'Last Stand',
    icon: 'game-icons:chained-heart',
    color: '#cc6050',
    desc: 'Below 35% player HP every stat of this champion surges by 30%.',
    stats: { vitality: 30 },
    effect: 'lastStand',
    value: 0.3,
  },
  {
    id: 'warp-cadence',
    tier: 'elite',
    name: 'Warp Cadence',
    icon: 'game-icons:triorb',
    color: '#b070e0',
    desc: 'Shaves a further 15% off the role ability cooldown.',
    stats: { focus: 25 },
    effect: 'cooldownRush',
    value: 0.15,
  },
  {
    id: 'ascendant-aura',
    tier: 'elite',
    name: 'Ascendant Aura',
    icon: 'game-icons:spiked-halo',
    color: '#d45e7e',
    desc: 'Allies assigned to this role contribute 40% more orbit damage.',
    stats: { vitality: 15, fortune: 15 },
    effect: 'allyEcho',
    value: 0.4,
  },
]

export const PERK_BY_ID = Object.fromEntries(CHAMPION_PERKS.map((p) => [p.id, p])) as Record<
  string,
  ChampionPerkDef
>

/** Which pool a milestone level draws from — 10 adept, 20 master, 30+ elite. */
export function perkTierForLevel(level: number): ChampionPerkTier {
  if (level <= CHAMPION_PERK_INTERVAL) return 'adept'
  if (level <= CHAMPION_PERK_INTERVAL * 2) return 'master'
  return 'elite'
}

/** Perks selectable at `level`, minus everything this champion already owns. */
export function perkChoicesFor(level: number, ownedPerkIds: string[]): ChampionPerkDef[] {
  const tier = perkTierForLevel(level)
  const owned = new Set(ownedPerkIds)
  return CHAMPION_PERKS.filter((p) => p.tier === tier && !owned.has(p.id))
}

// ── XP curve ──────────────────────────────────────────────────────────────────

/** XP needed to advance from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  return Math.ceil(CHAMPION_XP_BASE * Math.pow(Math.max(1, level), CHAMPION_XP_EXPONENT))
}

// ── Stat resolution ───────────────────────────────────────────────────────────

/** Champion tier star level (★1..★6); unknown champions fall back to ★1. */
export function tierStarsOf(champion: string): number {
  const def = CHAMPION_DATA[champion]
  if (!def) return 1
  return CHAMPION_TIERS[def.championTier]?.starLevel ?? 1
}

/**
 * Resolves the stat block of a champion. Base + role growth, lifted by the
 * champion's tier and its ascension stars, plus flat perk bonuses.
 *
 * Pure by design — the store passes in the perks so this stays testable.
 */
export function resolveChampionStats(
  champion: string,
  level: number,
  role: ChampionRole,
  perkIds: string[] = [],
): ChampionStats {
  const growth = ROLE_GROWTH[role] ?? ROLE_GROWTH.mid
  const tierMult = 1 + (tierStarsOf(champion) - 1) * CHAMPION_STAT_TIER_STEP
  const ascensionMult = 1 + ascensionStars(level) * CHAMPION_ASCENSION_STAT_BONUS
  const levelsGained = Math.max(0, level - 1)

  const out = {} as ChampionStats
  for (const stat of CHAMPION_STATS) {
    const raw = (CHAMPION_STAT_BASE + growth[stat.key] * levelsGained) * tierMult * ascensionMult
    let flat = 0
    for (const id of perkIds) {
      flat += PERK_BY_ID[id]?.stats?.[stat.key] ?? 0
    }
    out[stat.key] = Math.round((raw + flat) * 10) / 10
  }
  return out
}

// ── Stat → effect conversion ──────────────────────────────────────────────────
// One function per stat so every consumer reads the same curve.
//
// All four measure the gain OVER a level-1 ★1 champion, which is why they
// subtract CHAMPION_STAT_BASE first: a freshly recruited champion must behave
// exactly as it did before champion levels existed. Levels, tiers and perks are
// what move the needle.

/** Stat points above the level-1 baseline — never negative. */
function above(stat: number): number {
  return Math.max(0, stat - CHAMPION_STAT_BASE)
}

/** POWER → orbit damage multiplier (1.0 for an unlevelled champion). */
export function powerDpsMult(power: number): number {
  return 1 + above(power) / CHAMPION_POWER_DPS_DIVISOR
}

/** VITALITY → HP / battle-power multiplier. */
export function vitalityMult(vitality: number): number {
  return 1 + above(vitality) / CHAMPION_VITALITY_DIVISOR
}

/**
 * FOCUS → cooldown multiplier, clamped so abilities never trivialise.
 * Returns a factor to multiply a base cooldown with (lower is faster).
 */
export function focusCooldownMult(focus: number, extraReduction = 0): number {
  const base = 1 / (1 + above(focus) / CHAMPION_FOCUS_CD_DIVISOR)
  return Math.max(CHAMPION_FOCUS_CD_FLOOR, base * (1 - extraReduction))
}

/** FORTUNE → chime / drop multiplier. */
export function fortuneMult(fortune: number): number {
  return 1 + above(fortune) / CHAMPION_FORTUNE_DIVISOR
}

// ── Level-up cost ─────────────────────────────────────────────────────────────

/**
 * Cost of the step from `level` to `level + 1`. Chimes scale with the target
 * level and the champion's tier; materials are only charged on ascension levels,
 * which turns every 5th level into a deliberate stop rather than a grind tick.
 */
export function levelUpCost(champion: string, level: number): ChampionLevelCost {
  const target = level + 1
  const tierMult = 1 + (tierStarsOf(champion) - 1) * CHAMPION_LEVEL_TIER_COST_STEP
  const chimes = Math.ceil(
    CHAMPION_LEVEL_CHIME_BASE * Math.pow(target, CHAMPION_LEVEL_CHIME_EXPONENT) * tierMult,
  )

  const materials: Record<string, number> = {}
  if (isAscensionLevel(target)) {
    const recipe = CHAMPION_DATA[champion]?.materialCost ?? {}
    const step = Math.ceil(target / CHAMPION_ASCENSION_INTERVAL) * CHAMPION_ASCENSION_MATERIAL_STEP
    for (const [id, qty] of Object.entries(recipe)) {
      materials[id] = qty * step
    }
  }
  return { chimes, materials }
}
