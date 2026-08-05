// Champions: Tiers, Level, Stats, Perks, Ascension, Regalia.

// ── Champion Tiers (Galaxy/Champion Tier redesign) ───────────────────────────
// A Champion Tier classifies a champion by its *star level* (1..MAX_STAR_LEVEL).
// 6 Champion Tiers, weakest → strongest. Tiers unlock cumulatively by galaxy and
// spawn together by weighted probability. Independent of (and additive to) the 15
// synergy traits in championTraits.ts.
export type ChampionTierId =
  | 'lone_wanderer' // ★1
  | 'rift_keeper' // ★2
  | 'nebula_sage' // ★3
  | 'astral_warden' // ★4
  | 'void_sovereign' // ★5
  | 'cosmic_sovereign' // ★6

export interface ChampionTierDef {
  id: ChampionTierId
  starLevel: number // 1..MAX_STAR_LEVEL — which galaxy star level this trait spawns at
  name: string
  icon: string // game-icons:* (must exist in config/gameicons.txt)
  color: string
  description: string
}

// ── Battle Sigil (Team tab) ──────────────────────────────────────────────────
// Global escalation stage of the team sigil, selected by how many of the 15
// team slots (5 mains + 10 allies) are filled. Drives crest color, ring color,
// pulse/spin speed, ember particle count and extra decorative rings.
export interface SigilStageDef {
  name: string
  minFilled: number // 0..15 — stage applies from this many filled slots
  crestColor: string
  ringColor: string
  pulseSec: number // crest pulse duration; 0 = no pulse
  spinSec: number // outer ring rotation duration
  emberCount: number
  extraRings: number // 0..2 decorative rings added around the sigil
}

export interface RecruitableChampion {
  name: string
  materialCost: Record<string, number>
  discoveredAt: number
  chimesPrice: number
}

/** The four champion stats. Each maps to exactly one gameplay multiplier. */
// ── Champion Levels ─────────────────────────────────────────────────────────
// Per-champion progression: XP earned from kills, levels bought with chimes +
// materials, four stats that scale by role, ascension stars every 5 levels and
// a milestone perk choice every 10. Data lives in config/champions/championLevels.ts,
// runtime state in stores/champions/championLevelStore.ts.

export type ChampionStatKey = 'power' | 'vitality' | 'focus' | 'fortune'

/** Resolved stat block of a single champion at its current level. */
export type ChampionStats = Record<ChampionStatKey, number>

export interface ChampionStatDef {
  key: ChampionStatKey
  label: string
  /** Short all-caps tag shown on the stat tile. */
  short: string
  icon: string
  color: string
  /** What the stat does, one line — shown in the stat tooltip. */
  desc: string
  /** Suffix appended to the derived multiplier readout (e.g. "DPS"). */
  effectLabel: string
}

/**
 * One cell of the stat rail a champion wears on its star-fight info plate.
 * Pre-formatted on purpose: the plate is redrawn inside a running fight, so it
 * only ever prints strings it is handed and never reaches into a store itself.
 */
export interface StrikerStatCell {
  /** All-caps tag, the stat's own `short` (PWR / VIT / FOC / FOR). */
  short: string
  /** Ready-made readout, e.g. "+24%" — from statEffectLabel, so the number is
   *  identical to the one the role details panel prints for the same stat. */
  value: string
  color: string
  /** Tooltip: what the stat does here. */
  title: string
}

/** Per-role stat growth per level — the reason roles feel different to level. */
export type ChampionRoleGrowth = Record<ChampionStatKey, number>

/** One rank band of the ascension ladder (driven by ascension stars). */
export interface AscensionRank {
  /** Lowest star count that still belongs to this band. */
  minStars: number
  name: string
  color: string
}

/**
 * One visual stage of the champion level regalia — the medallion a champion
 * wears and the frame around its portrait. Every field climbs monotonically, so
 * the stages read as a single escalation from recruit to level cap. The apex
 * stage sits on CHAMPION_LEVEL_MAX_CAP and is therefore the rarest thing on the
 * board. Table: CHAMPION_REGALIA_STAGES; lookup: regaliaStageFor().
 *
 * Nothing here introduces a second hue: a champion keeps its single identity
 * colour, and rank is told through metal, geometry, brightness and motion.
 */
export interface ChampionRegaliaStage {
  /** Lowest champion level that wears this stage. */
  minLevel: number
  /** Stage name — shown in the badge tooltip. */
  name: string
  /** Rim thickness of the medallion, px at CHAMPION_REGALIA_BASE_SIZE. */
  rim: number
  /** Outer glow radius, px at the base size. */
  glow: number
  /** Outer glow strength, 0…1. */
  glowAlpha: number
  /** White mixed into rim and numeral — the metal heats up with level, 0…1. */
  heat: number
  /** Corners of the faceted plate seated behind the disc; 0 leaves it round. */
  facets: number
  // ── Portrait frame only (sigil board node) ──
  // The medallion has no room for these; they are what makes a role node's
  // frame read as a rank from across the board.
  /** Metal studs seated around the frame ring; 0 leaves the ring bare. */
  studs: number
  /** Highlight sweeping around the frame ring — the first motion a frame gets. */
  sweep: boolean
  /** Second, counter-rotated plate — turns the hexagon into a star silhouette. */
  plate2: boolean
  /** Polished bevel on the plates — matte cast metal becomes lit, faceted metal. */
  bevel: boolean
  /** Breathing corona behind the whole frame. */
  halo: boolean
  /** Conic reflection rotating around the rim. */
  sheen: boolean
  /** Second reflection, running the other way. */
  sheenDual: boolean
  /** Spark orbiting the medallion. */
  orbit: boolean
  /** Rays radiating out behind the medallion. */
  rays: boolean
  /** Crown seated on the medallion's top edge. */
  crown: boolean
  /** The plates turn against each other — the apex stage's own increment. */
  spin: boolean
}

/** Which milestone pool a perk belongs to. */
export type ChampionPerkTier = 'adept' | 'master' | 'elite'

export interface ChampionPerkDef {
  id: string
  tier: ChampionPerkTier
  name: string
  icon: string
  color: string
  desc: string
  /** Flat stat bonuses granted while the perk is active. */
  stats?: Partial<ChampionStats>
  /** Special effect key read by the consuming store (see championLevelStore). */
  effect?: ChampionPerkEffect
  /** Magnitude of `effect` — meaning depends on the effect key. */
  value?: number
}

export type ChampionPerkEffect =
  | 'execute' // bonus orbit damage against low-HP bosses
  | 'abilityPower' // role ability effects scale up
  | 'fortuneSurge' // chime + material gains scale up
  | 'critChance' // orbit hits can crit
  | 'lastStand' // stat surge while the player is low on HP
  | 'cooldownRush' // extra cooldown reduction on top of FOCUS
  | 'allyEcho' // allies of this role contribute more

/** Persisted progression of one champion. */
export interface ChampionProgress {
  level: number
  /** XP accumulated toward the next level. */
  xp: number
  /** Lifetime XP — never reset, drives the Bard Stats catalog. */
  totalXp: number
  /** Chosen perk id per milestone level (e.g. { 10: 'overload' }). */
  perks: Record<number, string>
}

/** A milestone that is unlocked but still waiting for the player to pick. */
export interface PendingPerkChoice {
  champion: string
  level: number
  tier: ChampionPerkTier
}

/** Full level-up cost of one step. */
export interface ChampionLevelCost {
  chimes: number
  materials: Record<string, number>
}
