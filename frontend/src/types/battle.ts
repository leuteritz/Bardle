// Auto-Battle: Phasen, Timeline, Objectives, Ergebnis, Statistik.

import type { DrakeTypeId } from '@/config/battle/drakes'

export type BattleRole = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

/**
 * The auto-battle runs as a fixed cycle of phases; every readout (battle tab,
 * bottom scoreboard) and the background driver in battleStore agree on exactly
 * one of these at a time. Order = the order they run in.
 */
export type BattlePhaseKey = 'landing' | 'searching' | 'loading' | 'battle' | 'honor'

/** One headline number under a champion tile on the loading screen. */
export interface LoadingScreenStat {
  label: string
  value: string
  color?: string
}

/**
 * A single champion tile of the pre-battle loading screen. Assembled in
 * BattleLoadingScreen from the roster plus static champion data, so the card
 * component itself stays purely presentational.
 */
export interface LoadingScreenCard {
  name: string
  role: BattleRole
  /** Ladder tier whose frame the card wears (own rank / scouted enemy rank) */
  frameTier: string
  /** Champion tier as a star level (★1…★12) */
  starLevel: number
  origin: string
  originColor: string
  traits: Array<{ id: string; name: string; icon: string; color: string }>
  stats: LoadingScreenStat[]
}

/** One entry of the BATTLE_PHASES registry — see config/constants.ts. */
export interface BattlePhaseConfig {
  key: BattlePhaseKey
  /** Player-facing name, used verbatim in the bottom bar */
  label: string
  /** game-icons id shown next to the label; null = the phase renders no icon */
  icon: string | null
  color: string
  /** Wall-clock length of the phase; null = open-ended (no timer) */
  durationMs: number | null
}

export interface MultikillCounts {
  double: number
  triple: number
  quadra: number
  penta: number
}

/** Which generated downscale of a champion splash/icon to load — see
 *  CHAMPION_ART_VARIANT_PX for the size thresholds. */
export type ChampionArtSize = 'sm' | 'md' | 'lg' | 'full'

/** How a champion portrait should be resolved: whose skin, and at what size. */
export interface ChampionArtOptions {
  /** Battle side — team 2 wears the skin rolled for the enemy roster. */
  team?: 1 | 2
  /** Downscale variant; defaults to the full-size source. */
  size?: ChampionArtSize
}

export interface ChampionState {
  name: string
  rank: string
  role: BattleRole
  /** Skin file basename this champion wears in the current battle. Only the
   *  enemy roster carries one (rolled per battle); own champions leave it
   *  undefined and follow the player's pick in skinStore. */
  skin?: string
  kills: number
  deaths: number
  assists: number
  cs: number
  gold: number
  damage: number
  healing: number
  damageTaken: number
  wardsPlaced: number
  wardsKilled: number
  controlWards: number
  level: number
  items: number
  multikills: MultikillCounts
  currentSpree: number
  largestSpree: number
  hpPercent: number
  respawnState: 'alive' | 'walking-back'
}

// Display-only snapshot of the running battle's own-team totals, mirroring the
// fields that accumulateBattleStats() folds into the career stats at battle end.
export interface LiveBattleStats {
  kills: number
  deaths: number
  assists: number
  cs: number
  gold: number
  damage: number
  healing: number
  damageTaken: number
  wardsPlaced: number
  wardsKilled: number
  controlWards: number
  multikills: MultikillCounts
  largestSpree: number
  firstBloods: number
  soloKills: number
  dragons: number
  barons: number
  turrets: number
  inhibitors: number
  battleSeconds: number
}

export type BattleEventType =
  | 'kill'
  | 'fightStart'
  | 'fightEnd'
  | 'objectiveSpawn'
  | 'objectiveResult'
  | 'turret'
  | 'inhibitor'
  | 'nexus'
  | 'buff'

export type StructureTier = 'outer' | 'inner' | 'inhibTurret' | 'inhibitor' | 'nexusTurret'

/** Lane slot a structure belongs to; nexus turrets sit outside the three lanes. */
export type StructureLaneKey = 'top' | 'mid' | 'bot' | 'nexus1' | 'nexus2'

/** `"ownerTeam:laneKey:tier"`, e.g. `"2:top:outer"` or `"1:nexus1:nexusTurret"`. */
export type StructureId = string

export interface BattleEvent {
  t: number
  type: BattleEventType
  team?: 1 | 2
  killerIdx?: number
  victimIdx?: number
  assistIdxs?: number[]
  multikillTier?: 2 | 3 | 4 | 5
  firstBlood?: boolean
  soloKill?: boolean
  location?: { x: number; y: number }
  lane?: 'top' | 'mid' | 'bot'
  objective?: 'drake' | 'baron'
  /** Set on drake objectiveSpawn/objectiveResult events (optional for save-compat). */
  drakeType?: DrakeTypeId
  participants?: { t1: number[]; t2: number[] }
  /** Set on turret/inhibitor events; `team` stays the attacker, the owner is encoded in the id. */
  structureId?: StructureId
  structureTier?: StructureTier
  /** Set on jungle 'buff' events — which buff camp the team's jungler cleared. */
  buffType?: 'blue' | 'red'
  winProbDelta: number
}

/** One cleared jungle buff in the live feed (derived from the timeline, never persisted). */
export interface BuffFeedEntry {
  team: 1 | 2
  buffType: 'blue' | 'red'
  /** Champion who slew the camp — carries the cosmetic buff aura afterwards. */
  championName: string
  championIdx: number
  t: number
}

/** One destroyed structure in the live feed (derived from the timeline, never persisted). */
export interface StructureFeedEntry {
  id: StructureId
  tier: StructureTier
  /** Attacking team that destroyed the structure. */
  team: 1 | 2
  lane?: 'top' | 'mid' | 'bot'
  t: number
}

export interface BattleTimeline {
  seed: number
  winner: 1 | 2
  events: BattleEvent[]
}

export interface ObjectiveOverride {
  t: number
  newSeed: number
  prob: number
}

/** One champion attacking (or lying dead at) the frozen-time objective pit. */
export interface ObjectiveFighter {
  /** Index into team1/team2 */
  idx: number
  name: string
  alive: boolean
  /** Normalized DPS share within the side (0 when dead) */
  weight: number
  /** Cumulative damage dealt to this objective */
  damage: number
  /** Cumulative fight-HP damage taken (boss AoE + taunt diversion; heals excluded) */
  damageTaken: number
  /** Battle role — drives the fighter's pit ability (idx order: top/jungle/mid/adc/support) */
  role: BattleRole
  /** Fight-local HP — every fighter alive at fight start enters at full role HP */
  fightHp: number
  fightMaxHp: number
  /** Dropped to 0 fight-HP mid-fight: contributes no DPS, ability stops */
  down: boolean
  /** End (ms timestamp) of the ability's active window; 0 = inactive */
  abilityActiveUntil: number
  /** Timestamp (ms) when the ability can cast again */
  abilityCooldownUntil: number
  /** Fight-HP restored to allies (Support's Mend) — the support's only visible output */
  healingDone: number
  /** Enemy damage pulled onto this fighter by its own Challenge (taunt), subset of damageTaken */
  damageDiverted: number
  /** Ability windows opened this fight */
  casts: number
}

/** One sample of the cumulative damage race, taken every OBJECTIVE_TRACK_SAMPLE_MS. */
export interface ObjectiveTrackSample {
  /** Milliseconds since fight start */
  t: number
  own: number
  enemy: number
}

export interface KillFeedEntry {
  killerName: string
  victimName: string
  killerTeam: 1 | 2
  multikillTier?: 2 | 3 | 4 | 5
  firstBlood?: boolean
  soloKill?: boolean
  assistNames?: string[]
  t: number
}

export interface AllTimeBattleStats {
  killParticipationSum: number
  killParticipationGames: number
  largestSpree: number
  firstBloods: number
  soloKills: number
  multikills: MultikillCounts
  mvpAwards: number
  cs: number
  gold: number
  damage: number
  healing: number
  damageTaken: number
  dragons: number
  barons: number
  turrets: number
  inhibitors: number
  wardsPlaced: number
  wardsKilled: number
  controlWards: number
  visionScoreSum: number
  longestGameSeconds: number
  honorsGiven: number
}

export interface ChampionCareerStats {
  battles: number
  kills: number
  deaths: number
  assists: number
  mvps: number
  damage: number
  gold: number
  cs: number
  healing: number
  damageTaken: number
  wardsPlaced: number
  honors: number
}

export interface Opponent {
  mmr: number
  power: number
  rank: { tier: string; division: string; minMMR: number }
}

export interface BattleResult {
  won: boolean
  opponent: Opponent
  winProbability: number
  lpChange?: number
  duration?: number
  teamKills?: number
  enemyKills?: number
  mvpName?: string
  /** Baron Nashor: chimes paid out at battle end for slaying the baron */
  baronBounty?: number
  /** Chimes paid out by the honor ceremony (3 honors, MVP pays double) */
  honorTribute?: number
  /** True when the match MVP was an own champion and the 2× chime buff was granted */
  mvpBuffGranted?: boolean
}
