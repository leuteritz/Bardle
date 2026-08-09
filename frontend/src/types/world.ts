// Welt: Planeten, Sterne, Boss-Events, Drifter, Planeten-Slots.

import type { TimedBuffEffects } from './core'

export type PlanetType =
  | 'rocky'
  | 'ice'
  | 'gas-giant'
  | 'lava'
  | 'ocean'
  | 'desert'
  | 'jungle'
  | 'ringed'
  | 'crystal'
  | 'toxic'
  | 'void'
  | 'aurora'
  | 'shattered'
  | 'storm'
  | 'bloom'
  | 'neon'
  | 'obsidian'
  | 'coral'

export type StarType = 'champion' | 'resource' | 'galaxy_boss' | 'boss_escort'

export interface PlanetBossRewardSlot {
  type: 'chimes' | 'material'
  amount?: number
  materialId?: string
}

export interface PlanetBossEvent {
  planetId: string
  planetType: PlanetType
  bossName: string
  startTime: number
  enrageTimerMs: number
  maxHP: number
  currentHP: number
  clickDamagePerHit: number
  passiveDPS: number
  totalDamageDealt: number
  rewardSlots: PlanetBossRewardSlot[]
  defeated: boolean
  expired: boolean
  noEnrage?: boolean
  homePlanetChampion?: string
  isGalaxyBoss?: boolean
  isBossEscort?: boolean
  isChampionPlanet?: boolean
  isChampionEscort?: boolean
  sectionId?: number
}

// ── Drifters — clickable objects passing through the orbit view ──────────────

/** Rarity band of a drifter — drives spawn weight and chip styling. */
export type DrifterRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

/** Every multiplier a drifter buff can put on the game. Each key has exactly
 *  one integration point; see `drifterStore`'s effect getters. */
/**
 * Die Achsen eines Drifter-Buffs. Namensgleich zu dem, was das Omen-System
 * ausschüttet — deshalb ein Alias auf den gemeinsamen Typ statt einer zweiten
 * Liste. Der Drifter-Name bleibt, weil er an jeder Fundstelle sagt, WESSEN Buff
 * gemeint ist.
 */
export type DrifterBuffEffects = TimedBuffEffects

/** Instant, one-shot payouts a drifter grants the moment it is clicked. */
export interface DrifterInstantReward {
  /** Chimes worth this many seconds of current production. */
  chimesFromCpsSeconds?: number
  /** Fill the meep progress bar and hand over this many meeps outright. */
  meeps?: number
  /** Roll this many random materials into the inventory. */
  materials?: number
  /** Backdate the star-phase dwell clock by this many seconds. */
  dwellSkipSeconds?: number
  /** Extend every active star's despawn timer by this many seconds. */
  starTimeSeconds?: number
  /** Strike EVERY living planet boss in the orbit at once for this fraction of
   *  its own maximum health. A share rather than a flat number on purpose: boss
   *  HP scales with level, production, team strength and galaxy, so a fixed
   *  amount would one-shot the early game and be a scratch later on. */
  orbitStrikeMaxHpPct?: number
}

/** Which CSS body `DrifterBody.vue` builds for a drifter in flight. Every type
 *  has its own silhouette — the flying object is drawn entirely in CSS, the
 *  icon/artwork only ever shows up in the HUD (info card, buff chip, herald). */
export type DrifterBodyKind =
  | 'chime'
  | 'shard'
  | 'meep'
  | 'probe'
  | 'surge'
  | 'vortex'
  | 'beacon'
  | 'pulse'
  | 'leviathan'

/** Static definition of a drifter type — pure data, no runtime state. */
export interface DrifterDef {
  id: string
  /** Player-facing name, shown in the toast and on the buff chip. */
  name: string
  rarity: DrifterRarity
  /** Relative spawn weight inside the whole pool. */
  weight: number
  /** Iconify `game-icons:*` name — the chip/card icon. NOT the flying body. */
  icon: string
  /** CSS silhouette drawn while the drifter crosses the orbit view. */
  body: DrifterBodyKind
  /** Optional image shown instead of the icon in the HUD (chime / meep art). */
  image?: string
  /** Signature color: aura, trail, edge ping and buff chip. */
  color: string
  /** Flight duration across the screen in ms — rare types linger longer. */
  flightMs: number
  /** Rendered size of the clickable body in px. */
  sizePx: number
  /** Clicks needed to collect it. >1 spreads the payout across the flight. */
  hits: number
  /** One-line effect summary for the collect toast. */
  effectLine: string
  reward?: DrifterInstantReward
  buff?: {
    durationMs: number
    effects: DrifterBuffEffects
  }
}

/** A drifter currently in flight. Position is derived from `spawnedAt`, so a
 *  paused/stuttering frame loop can never desync it from the game clock. */
export interface ActiveDrifter {
  /** Unique instance id — also the Vue render key. */
  uid: number
  defId: string
  /** Index into `DRIFTER_ROUTES`. */
  routeIndex: number
  /** Mirror the route horizontally — doubles the path variety. */
  mirrored: boolean
  spawnedAt: number
  flightMs: number
  /** Hits landed so far; the drifter is collected at `def.hits`. */
  hitsLanded: number
}

/** A drifter buff ticking down. `sourceId` is the defining `DrifterDef.id`. */
export interface DrifterActiveBuff {
  sourceId: string
  expiresAt: number
  durationMs: number
  effects: DrifterBuffEffects
}

/** The tally of the last orbit-wide strike. The store records it, the shockwave
 *  layer replays itself off `seq` — so an admin-forced collect looks exactly
 *  like a clicked one, and the same drifter caught twice still fires twice. */
export interface DrifterOrbitStrike {
  /** Bumped on every strike; `0` means none has happened yet. */
  seq: number
  at: number
  /** Which type fired it — the wave takes its color from that definition. */
  defId: string
  /** Living bosses that took the hit. `0` = the orbit was empty. */
  planetsHit: number
  /** Damage actually applied, after every boss-damage multiplier. */
  damage: number
  /** How many of those planets the wave killed outright. */
  kills: number
}

// ── Planeten-Slots ─────────────────────────────────────────────────────────
// Rollen der sechs Orbit-Slots. Die Tabellen dazu stehen in config/constants.ts,
// die Logik im planetShopStore — der Typ gehört keiner der beiden Seiten allein.
export type PlanetRoleType =
  | 'turret_planet'
  | 'harvest_node'
  | 'expedition_relay'
  | 'shield_barrier'
  | 'time_capsule'
  | 'resonance_tower'

export interface PlanetRole {
  id: PlanetRoleType
  name: string
  bonusType:
    | 'auto_attack_dps'
    | 'material_harvest_rate'
    | 'expedition_reward_multiplier'
    | 'boss_damage_reduction'
    | 'offline_boost'
    | 'building_cps_multiplier'
  bonusPerSlot: number
  icon: string
  color: string
  image: string
}

export interface JungleBuffDef {
  name: string
  multiplier: number
  durationMs: number
}
