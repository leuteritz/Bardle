import type { ChampionRole, RoleStat, RoleAbilityDetail, SigilStageDef } from '../types'

// ELO rating system
export const ELO_K_FACTOR = 32
export const ELO_RATING_SCALE = 400
export const ELO_LUCK_FACTOR = 0.15

// Leveling formula: 2500 * level^2.2
export const LEVEL_BASE = 2500
export const LEVEL_EXPONENT = 2.2
// Above LEVEL_SCALING_THRESHOLD: cost *= LEVEL_SCALING_FACTOR^(level - threshold)
// Threshold at 30 (not 200) so exponential braking keeps up with multiplicative augment CPS stacking.
export const LEVEL_SCALING_THRESHOLD = 30
export const LEVEL_SCALING_FACTOR = 1.1

// Meep cost formula: 20 * meeps^1.2
export const MEEP_BASE_COST = 20
export const MEEP_COST_EXPONENT = 1.2

// Auto-battle
export const AUTO_BATTLE_INTERVAL_MS = 45000
export const BATTLE_REAL_DURATION_SECONDS = 60
/** Total simulated game-seconds per battle (60 game-seconds per real second) */
export const BATTLE_TOTAL_GAME_SECONDS = BATTLE_REAL_DURATION_SECONDS * 60

// Game State display phases (bottom stats bar)
export const GAME_STATE = {
  SEARCHING: {
    key: 'searching',
    icon: 'game-icons:telescope',
    label: 'Planet Search',
    color: '#9a6830',
  },
  BATTLE: { key: 'battle', icon: 'game-icons:broadsword', label: 'Battle', color: '#e8c040' },
  HONOR: { key: 'honor', icon: 'game-icons:trophy', label: 'Honor', color: '#74d448' },
} as const

export type GameStateKey = (typeof GAME_STATE)[keyof typeof GAME_STATE]['key']
export const MMR_TO_POWER_MULTIPLIER = 1.5

// Star background (App.vue)
/**
 * Polling interval for document.hasFocus() — fallback because Chrome does not
 * reliably fire window focus/blur events on multi-monitor setups. Used by
 * useWindowFocus (global) and useStarBackground (loop watchdog).
 */
export const FOCUS_POLL_INTERVAL_MS = 500
export const STAR_COUNT = 400
/** Floor for the area-scaled star count so a small contained instance (Shop) is never empty. */
export const STAR_BG_MIN_STARS = 60

// Rank system
export const RANK_DIVISIONS = ['IV', 'III', 'II', 'I'] as const
export const RANK_TIERS = [
  'Iron',
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Emerald',
  'Diamond',
  'Master',
  'Grandmaster',
  'Challenger',
] as const

// Abilities
export const MAX_ABILITY_LEVEL = 5

// Skill Tree Meep costs (Q, W, E, R)
export const SKILL_MEEP_COSTS = [3, 8, 20, 45] as const

// Planet events
export const PLANET_MAX_COUNT = 3
export const PLANET_SPAWN_INTERVAL_MIN = 6_000
export const PLANET_SPAWN_INTERVAL_MAX = 14_000
export const PLANET_EVENT_CHECK_INTERVAL = 30
export const PLANET_RESCUE_DURATION_MIN = 5_000
export const PLANET_RESCUE_DURATION_MAX = 10_000
export const PLANET_RESCUE_CLICKS_MIN = 5
export const PLANET_RESCUE_CLICKS_MAX = 15
export const PLANET_RESCUE_BASE_REWARD = 500
export const PLANET_EVENT_BASE_CHANCE = 0.6
export const PLANET_EVENT_PRESTIGE_BONUS = 0.35

// Planet material drop chance (probability that a rescue planet carries material)
export const PLANET_MATERIAL_CHANCE = 0.6

// Pre-scaled planet thumbnails (256px, HQ resampling) for small UI tiles —
// browsers blur when minifying the ~700px originals down to ~60px in one step
export const PLANET_IMAGE_DIR = '/img/planets/'
export const PLANET_IMAGE_THUMB_DIR = '/img/planets/thumb/'

// ── Material display (header materials grid) ────────────────────────────────
// Count color per material id.
export const MATERIAL_COLOR: Record<string, string> = {
  stardust: '#fde68a', // warm gold        – Stardust
  moon_crystal: '#bae6fd', // icy light blue   – Moon Crystal
  nebula_quartz: '#6ee7b7', // mint green       – Nebula Quartz
  solar_essence: '#fb923c', // glowing orange   – Solar Essence
  void_shard: '#a78bfa', // deep violet      – Void Shard
  dark_matter: '#f472b6', // pink magenta     – Dark Matter
  comet_ice: '#7dd3fc', // pale ice blue    – Comet Ice
  star_iron: '#cbd5e1', // steel grey       – Star Iron
  plasma_core: '#f0abfc', // hot fuchsia      – Plasma Core
  aether_dust: '#fcd34d', // shimmering amber – Aether Dust
}
// Initials shown in the placeholder box while a material has no artwork yet.
export const MATERIAL_PLACEHOLDER_LABELS: Record<string, string> = {
  comet_ice: 'CI',
  star_iron: 'SI',
  plasma_core: 'PC',
  aether_dust: 'AD',
}
// Header materials grid: fixed column count (2 rows × 5 columns = 10 materials).
export const HEADER_MATERIALS_GRID_COLUMNS = 5

// Champion home planet discovery chance
export const CHAMPION_HOME_PLANET_CHANCE = 0.5

// Champion travel timing
export const CHAMPION_TRAVEL_BASE_MS = 60_000 // 60s base travel time
export const CHAMPION_TRAVEL_SCALE_MS = 30_000 // +30s per galaxy
export const RESCUE_ROTATION_DURATION_MS = 2_000 // camera spin after role selection
export const CHAMPION_TRAVEL_BASE_LY = 500 // 500 LY for Galaxy 1
export const CHAMPION_TRAVEL_LY_PER_GALAXY = 500 // +500 LY per Galaxy
export const SKIP_DURATION_SECONDS = 5 // minimap skip-to-arrival shortcut

// Resource star flyby
export const RESOURCE_STAR_INTERVAL_MS = 120_000 // every 2 min a flyby
export const RESOURCE_STAR_DURATION_MS = 45_000 // flyby lasts 45s
export const RESOURCE_STAR_PLANET_COUNT = 3 // max. planets per flyby
export const CHAMPION_STAR_DURATION_MS = 60_000 // champion star window: 60s
export const STAR_FIGHT_TIMER_WARNING_S = 20 // star-fight timer turns amber below this
export const STAR_FIGHT_TIMER_CRITICAL_S = 10 // star-fight timer turns red + pulses below this
export const BATTLE_RETURN_TICK_MS = 250 // countdown refresh of the "Return to Battle" button

// Planet Boss Fight
export const BOSS_BASE_HP = 200
export const BOSS_HP_LEVEL_SCALE = 10
// Gegengewicht zu den vielen sichtbaren Schadensquellen im Star-Fight-Modal:
// jeder Champion-Stern im Team und jede erreichte Galaxie skalieren die HP mit
export const BOSS_HP_PER_CHAMPION_STAR = 0.1 // +10% HP per star level of each slotted champion
export const BOSS_HP_PER_GALAXY = 0.2 // +20% HP per galaxy beyond the first
export const BOSS_HP_CPS_SCALE = 50
export const BOSS_HP_POWER_SCALE = 5000
export const BOSS_ENRAGE_BASE_SECONDS = 30
export const BOSS_ENRAGE_LEVEL_STEP = 5
export const BOSS_ENRAGE_MAX_SECONDS = 60
export const BOSS_PASSIVE_DPS_FRACTION = 0.1
export const BOSS_BASE_REWARD = 500
export const BOSS_REWARD_DIFFICULTY_SCALE = 4
export const BOSS_CPS_PENALTY_FRACTION = 0.05
export const BOSS_CPS_PENALTY_DURATION_MS = 30_000
export { BOSS_NAMES } from '../utils/bossNames'

// Planet type display names
export const PLANET_TYPE_NAMES: Record<string, string> = {
  rocky: 'Rocky Planet',
  ice: 'Ice Planet',
  'gas-giant': 'Gas Giant',
  lava: 'Lava Planet',
  ocean: 'Ocean Planet',
  desert: 'Desert Planet',
  jungle: 'Jungle Planet',
  ringed: 'Ringed Planet',
  crystal: 'Crystal Planet',
  toxic: 'Toxic Planet',
  void: 'Void Planet',
  aurora: 'Aurora Planet',
  shattered: 'Shattered Planet',
  storm: 'Storm Planet',
  bloom: 'Bloom Planet',
  neon: 'Neon Planet',
  obsidian: 'Obsidian Planet',
  coral: 'Coral Planet',
}

// Title rotation
export const TITLE_MESSAGE_INTERVAL_MS = 5000

// Minimap phases (game-time seconds, 60 game-sec = 1 real-sec, total = 3600)
export const MINIMAP_PHASE_LANING_END = 930
export const MINIMAP_PHASE_DRAKE_END = 1600
export const MINIMAP_PHASE_MIDFIGHT_END = 2400
export const MINIMAP_PHASE_BARON_END = 2930
export const MINIMAP_PHASE_PUSH_END = 3600

export const BLUE_NEXUS = { x: 12, y: 88 }
export const RED_NEXUS = { x: 88, y: 12 }
export const BLUE_FOUNTAIN = { x: 8, y: 92 }
export const RED_FOUNTAIN = { x: 92, y: 8 }

// Objective positions (river pit bulges on minimap.png, point-symmetric across center)
export const DRAKE_POS = { x: 66, y: 70 }
export const BARON_POS = { x: 35, y: 32 }
export const MID_CENTER = { x: 50, y: 50 }
/** Spawn countdowns display in whole game-minutes — pulse during the last displayed minute */
export const OBJECTIVE_SPAWN_SOON_T = 60

// Typical skirmish locations per lane (map-units on the 100x100 minimap)
export const LANE_FIGHT_POSITIONS: Record<'top' | 'mid' | 'bot', { x: number; y: number }> = {
  top: { x: 24, y: 22 },
  mid: { x: 50, y: 50 },
  bot: { x: 78, y: 80 },
}

// ── Objective Modal ────────────────────────────────────────────────────────
export const OBJECTIVE_DRAKE_SPAWN = 300 // game-seconds when drake appears on minimap
export const OBJECTIVE_BARON_SPAWN = 2200 // game-seconds when baron appears on minimap — late enough that a 4-drake chain doesn't feel back-to-back, early enough for a full lane push afterwards
export const DRAKE_OBJECTIVE_HP = 3200
export const BARON_OBJECTIVE_HP = 4000
/** Objective DPS contributed by every living champion present at the pit (per team) */
export const OBJECTIVE_BASE_DPS_PER_CHAMP = 45
export const OBJECTIVE_CLICK_DAMAGE = 15
export const OBJECTIVE_BARON_WIN_BONUS = 0.12

// ── Drake Types (see src/config/drakes.ts for the full definitions) ────────
/** Win-chance swing for Infernal — the biggest basic swing, plus its burn */
export const DRAKE_WIN_BONUS_MAJOR = 0.1
/** Win-chance swing for basic drakes that carry a secondary battle effect */
export const DRAKE_WIN_BONUS_MINOR = 0.06
export const DRAKE_WIN_BONUS_ELDER = 0.12
/** Mountain: own team DPS multiplier in later objective fights */
export const DRAKE_MOUNTAIN_DPS_MULT = 1.2
/** Chemtech: enemy team DPS multiplier in later objective fights */
export const DRAKE_CHEMTECH_ENEMY_DPS_MULT = 0.85
/** Hextech: player click damage multiplier in later objective fights */
export const DRAKE_HEXTECH_CLICK_MULT = 2
/** Cloud: ally respawn time multiplier for the rest of the battle */
export const DRAKE_CLOUD_RESPAWN_MULT = 0.7
/** Ocean: losing a later objective fight only costs this fraction of win chance */
export const DRAKE_OCEAN_LOSS_PENALTY_MULT = 0.5
/** Elder: flat bonus LP when the battle is won */
export const DRAKE_ELDER_LP_BONUS = 15
/** Infernal: flat burn DPS the pit itself takes for the holder's team in later objective fights */
export const DRAKE_INFERNAL_BURN_DPS = 25

// ── Hand of Baron (battle-scoped buff for the team that slays the baron) ───
/** Baron's Aegis: a lost battle only costs this fraction of the usual LP */
export const BARON_LP_LOSS_SHIELD_MULT = 0.5
/** Baron's Bounty: chimes worth this many seconds of production, paid at battle end */
export const BARON_BOUNTY_PRODUCTION_SECONDS = 120
/** Baron's Bounty floor: never less than this many base clicks worth of chimes */
export const BARON_BOUNTY_MIN_CLICKS = 25
export const OBJECTIVE_DPS_TICK_MS = 200
/** Per-tick DPS wobble (±fraction) so the damage race stays dramatic */
export const OBJECTIVE_DPS_VARIANCE = 0.15
/** Per-fighter DPS weight spread (normalized per side, avg = 1 — team DPS unchanged) */
export const OBJECTIVE_FIGHTER_WEIGHT_MIN = 0.75
export const OBJECTIVE_FIGHTER_WEIGHT_MAX = 1.25
/** Lunge attack cycle of pit fighters in the objective modal — 1s so "X/s" is literal (drives CSS + float scheduler) */
export const OBJECTIVE_LUNGE_CYCLE_S = 1
/** Per-fighter stagger of the lunge animation (5 fighters spread across the 1s cycle) */
export const OBJECTIVE_LUNGE_STAGGER_S = 0.19
/** Extra lunge offset for the enemy column so both sides never strike in unison */
export const OBJECTIVE_LUNGE_ENEMY_OFFSET_S = 0.1
/** Point within the lunge cycle where the strike lands (matches the 70% keyframe) */
export const OBJECTIVE_LUNGE_STRIKE_FRACTION = 0.7
export const OBJECTIVE_FIGHTER_FLOAT_LIFETIME_MS = 900
/** Scheduler resolution for spawning fighter strike floats */
export const OBJECTIVE_FIGHTER_FLOAT_TICK_MS = 100
// ── Objective Fight 2.1: role HP pools, boss AoE, cooldown abilities ───────
/** Fight-local max HP per role — the tank soaks taunted damage, the ADC is fragile */
export const OBJECTIVE_ROLE_MAX_HP: Record<'top' | 'jungle' | 'mid' | 'adc' | 'support', number> = {
  top: 260,
  jungle: 190,
  mid: 150,
  adc: 130,
  support: 170,
}
/** Boss AoE damage per second on every standing fighter (both teams) */
export const OBJECTIVE_AOE_DPS_DRAKE = 5
export const OBJECTIVE_AOE_DPS_BARON = 7
/** Cadence of the AoE/down tick inside the fight */
export const OBJECTIVE_ABILITY_TICK_S = 1
/** Ability cooldown per role (seconds, measured from the end of the active window) */
export const OBJECTIVE_ABILITY_CD_S: Record<'top' | 'jungle' | 'mid' | 'adc' | 'support', number> =
  {
    top: 6,
    jungle: 5,
    mid: 3.5,
    adc: 5,
    support: 4,
  }
/** Ability active-window duration per role (support: visual cast window — the burst applies once at cast) */
export const OBJECTIVE_ABILITY_DURATION_S: Record<
  'top' | 'jungle' | 'mid' | 'adc' | 'support',
  number
> = {
  top: 1.5,
  jungle: 2.5,
  mid: 2,
  adc: 2,
  support: 0.8,
}
/** Staggered first casts so the pit doesn't fire everything at once */
export const OBJECTIVE_ABILITY_FIRST_CAST_OFFSET_S: Record<
  'top' | 'jungle' | 'mid' | 'adc' | 'support',
  number
> = {
  top: 2,
  jungle: 1.5,
  mid: 1,
  adc: 2.5,
  support: 3,
}
/** ADC "Deadeye": passive crit chance and multiplier; "Focus Fire" window crits always */
export const OBJECTIVE_ADC_CRIT_CHANCE = 0.25
export const OBJECTIVE_ADC_CRIT_MULT = 2
/** Mid "Hex Curse": DoT per stack while the mid stands — every cast adds a permanent stack */
export const OBJECTIVE_MID_CURSE_DPS = 6
/** Support "Mend": instant burst heal on the most wounded standing ally per cast */
export const OBJECTIVE_SUPPORT_MEND_HEAL = 24
/** Jungle "Wild Rally": DPS buff on a random standing ally while active */
export const OBJECTIVE_JUNGLE_BUFF_MULT = 1.4
/** Top "Challenge": taunted enemies pour their FULL objective DPS onto the top laner */
export const OBJECTIVE_TOP_TAUNT_TARGETS = 2
/** Role ability metadata for the objective fight panels (icons registered in USED_GAME_ICONS; colors come from ROLE_BY_KEY) */
export const OBJECTIVE_ROLE_ABILITIES = {
  top: {
    name: 'Challenge',
    icon: 'game-icons:enrage',
    desc: 'Roars a challenge — two enemies turn their full damage on the Top laner instead of the objective, buying the team free swings.',
  },
  jungle: {
    name: 'Wild Rally',
    icon: 'game-icons:uprising',
    desc: 'Rallies a random standing ally, sharpening their strikes by 40% for a short window.',
  },
  mid: {
    name: 'Hex Curse',
    icon: 'game-icons:cursed-star',
    desc: 'Stacks a permanent curse on the objective — each stack burns it for 6 damage per second for the rest of the fight, as long as the Mid stands.',
  },
  adc: {
    name: 'Focus Fire',
    icon: 'game-icons:dead-eye',
    desc: 'Every shot can crit for double damage — while Focus Fire burns, every shot does.',
  },
  support: {
    name: 'Mend',
    icon: 'game-icons:healing',
    desc: 'A burst of light that instantly mends the most wounded ally still standing.',
  },
} as const

/** Role ability metadata for the orbit/universe combat (roleBehaviorStore) — icons registered in USED_GAME_ICONS */
export const ORBIT_ROLE_ABILITIES = {
  top: {
    name: 'Aegis Wall',
    icon: 'game-icons:bordered-shield',
    desc: 'Raises a shield that swallows the next enemy shot — reforged every 5 seconds.',
  },
  jungle: {
    name: 'Wild Blessing',
    icon: 'game-icons:vine-whip',
    desc: 'Patrols the orbit and blesses nearby planets with potent jungle buffs.',
  },
  mid: {
    name: 'Chaos Curse',
    icon: 'game-icons:spell-book',
    desc: 'Every 15 seconds hurls a random curse at the boss — rot, weakness or instant doom.',
  },
  adc: {
    name: 'Piercing Volley',
    icon: 'game-icons:striking-arrows',
    desc: 'Looses a focused volley every 5 seconds, striking the boss for heavy bonus damage.',
  },
  support: {
    name: 'Guardian Light',
    icon: 'game-icons:glowing-hands',
    desc: 'Mends wounded planets nearby — and the Bard himself when all is calm.',
  },
} as const

/** Hard cap on the frozen-time objective fight; resolves by damage lead */
export const OBJECTIVE_MAX_DURATION_MS = 20000
/** Post-fight summary display time — dismissible early via the X button */
export const OBJECTIVE_RESULT_DELAY_MS = 6000
/** Bottom-bar game-state stat display during a frozen-time objective fight */
export const OBJECTIVE_FIGHT_STATUS = {
  drake: { label: 'Drake Fight', image: '/img/dragon.png' },
  baron: { label: 'Baron Fight', image: '/img/baron.png' },
  // Team-Farben aus dem Autobattle-Board (side names/kills in ScoreTopBar):
  // Blau = eigenes Team vorn, Rot = Gegner-Team vorn
  leadColor: '#93c5fd',
  behindColor: '#fca5a5',
  securedText: 'SECURED',
  lostText: 'LOST',
} as const

// ── Battle Event Timeline ──────────────────────────────────────────────────
// Phase windows in game-seconds (total game = BATTLE_TOTAL_GAME_SECONDS = 3600)
// Match script: laning 0-900 → drake chain 900-2080 (2-4 drakes, sequential,
// interleaved with mid fights 1100-1890 and cracks 820-2120) → baron 2200-2320
// (result ≤2940) → final push 3000 (50:00) → defense fight at the loser
// inhibitor ~3200 → nexus turrets ~3400-3490 → nexus 3550
export const TIMELINE_LANING_END = 900
export const TIMELINE_DRAKE_WINDOW_END = 2080
export const TIMELINE_MIDFIGHT_END = 1950
/** Random extra delay on the baron spawn time */
export const TIMELINE_BARON_SPAWN_JITTER_T = 120
/** Game-second at which the losing nexus falls */
export const TIMELINE_NEXUS_FALL_T = 3550
export const TIMELINE_FIRST_BLOOD_MIN_T = 120
export const TIMELINE_FIRST_BLOOD_MAX_T = 300
export const TIMELINE_SOLO_KILL_CHANCE = 0.3
export const TIMELINE_LANE_FIGHTS_MIN = 4
export const TIMELINE_LANE_FIGHTS_MAX = 7
export const TIMELINE_DRAKE_COUNT_MIN = 2
export const TIMELINE_DRAKE_COUNT_MAX = 4
/** Minimum game-seconds between two drake spawns surviving a timeline reseed */
export const TIMELINE_DRAKE_RESPAWN_MIN_GAP_T = 120
/** Game-seconds between a drake spawn and its scripted result — short enough that every drake in the chain resolves before the next one spawns */
export const TIMELINE_DRAKE_RESULT_DELAY_MIN_T = 150
export const TIMELINE_DRAKE_RESULT_DELAY_MAX_T = 210
export const TIMELINE_MID_FIGHTS_MIN = 2
export const TIMELINE_MID_FIGHTS_MAX = 3
export const TIMELINE_FIGHT_KILLS_MIN = 2
export const TIMELINE_FIGHT_KILLS_MAX = 4
export const TIMELINE_PUSH_KILLS_MIN = 3
export const TIMELINE_PUSH_KILLS_MAX = 6
/** Chance that a fight's top killer escalates to the next multikill tier */
export const TIMELINE_DOUBLE_CHANCE = 0.22
export const TIMELINE_TRIPLE_CHANCE = 0.3
export const TIMELINE_QUADRA_CHANCE = 0.18
export const TIMELINE_PENTA_CHANCE = 0.12
/** How strongly current momentum biases which team wins the next event */
export const TIMELINE_MOMENTUM_TEAM_BIAS = 0.35
/** Live win probability / momentum clamp bounds */
export const WINPROB_MIN = 0.05
export const WINPROB_MAX = 0.95
/** Every battle's momentum bar starts here; upgrades add startWinChanceBonus on top */
export const BATTLE_BASE_START_WIN_CHANCE = 0.5
/** Victory momentum meter: dominance glow thresholds + fill transition */
export const MOMENTUM_HIGH_THRESHOLD = 0.65
export const MOMENTUM_LOW_THRESHOLD = 0.35
/** Dominance tiers for the meter visuals: within ±band of 50% reads as neutral,
 * at/above the crushing threshold the strongest (pulsing) presentation kicks in */
export const MOMENTUM_NEUTRAL_BAND = 0.03
export const MOMENTUM_CRUSHING_THRESHOLD = 0.8
export const MOMENTUM_BAR_TRANSITION_MS = 800
/** Victory momentum meter: delta chip fade-out duration */
export const MOMENTUM_DELTA_CHIP_MS = 1200
export const TIMELINE_KILL_WINPROB_DELTA = 0.02
export const TIMELINE_DRAKE_WINPROB_DELTA = 0.06
export const TIMELINE_BARON_WINPROB_DELTA = 0.1
export const TIMELINE_TURRET_WINPROB_DELTA = 0.03
export const TIMELINE_INHIB_WINPROB_DELTA = 0.04
/** Momentum slam on the nexus explosion — oversized on purpose, the clamps pin the bar to its end */
export const TIMELINE_NEXUS_WINPROB_DELTA = 1
// ── Structure destruction schedule (all times in game-seconds) ─────────────
// Both teams fully crack one random enemy lane (up to the inhibitor) before
// baron spawns; other lanes only lose 1-2 turrets and never an inhibitor.
/** Structure falls start shortly after the laning phase */
export const TIMELINE_CRACK_WINDOW_START_T = 820
/** The crack phase must finish this long before baron spawns */
export const TIMELINE_CRACK_WINDOW_END_MARGIN_T = 80
/** Extra turrets each team takes outside its crack lane (min/max) */
export const TIMELINE_EXTRA_TURRETS_MIN = 1
export const TIMELINE_EXTRA_TURRETS_MAX = 2
/** Minimum spacing between consecutive structure falls */
export const TIMELINE_STRUCTURE_MIN_GAP_T = 40
/** Nexus turrets fall this long after the final defense fight ends (min/max delay each) — paced so the winner visibly breaks through */
export const TIMELINE_NEXUS_TURRET_DELAY_MIN_T = 60
export const TIMELINE_NEXUS_TURRET_DELAY_MAX_T = 110
/** Both nexus turrets must be down this long before the nexus falls */
export const TIMELINE_NEXUS_TURRET_END_MARGIN_T = 60
/** Champions on the attacking side present at a structure fall (min/max) */
export const STRUCTURE_ATTACKERS_MIN = 1
export const STRUCTURE_ATTACKERS_MAX = 3
/** Objective pit participants per team (min/max champions) */
export const TIMELINE_OBJECTIVE_PARTICIPANTS_MIN = 3
export const TIMELINE_OBJECTIVE_PARTICIPANTS_MAX = 5
/** Game-seconds between the baron spawn and its scripted result (~10 real-s; must resolve before FINAL_PUSH_START_T even with max spawn jitter); drakes use the shorter TIMELINE_DRAKE_RESULT_DELAY_* so the chain never overlaps */
export const TIMELINE_OBJECTIVE_RESULT_DELAY_MIN_T = 560
export const TIMELINE_OBJECTIVE_RESULT_DELAY_MAX_T = 620

// ── Per-champion continuous stat rates (per game-minute unless noted) ──────
export const CS_RATE_BY_ROLE: Record<string, number> = {
  top: 7.2,
  jungle: 5.8,
  mid: 7.8,
  adc: 8.4,
  support: 0.9,
}
export const DMG_RATE_BY_ROLE: Record<string, number> = {
  top: 560,
  jungle: 520,
  mid: 780,
  adc: 900,
  support: 260,
}
export const HEAL_RATE_BY_ROLE: Record<string, number> = {
  top: 120,
  jungle: 140,
  mid: 80,
  adc: 60,
  support: 350,
}
export const DMG_TAKEN_RATE_BY_ROLE: Record<string, number> = {
  top: 850,
  jungle: 700,
  mid: 500,
  adc: 420,
  support: 380,
}
export const WARDS_PLACED_RATE_BY_ROLE: Record<string, number> = {
  top: 0.4,
  jungle: 0.8,
  mid: 0.4,
  adc: 0.4,
  support: 1.4,
}
export const WARDS_KILLED_RATE_BY_ROLE: Record<string, number> = {
  top: 0.1,
  jungle: 0.3,
  mid: 0.1,
  adc: 0.1,
  support: 0.3,
}
export const CONTROL_WARDS_RATE_BY_ROLE: Record<string, number> = {
  top: 0.05,
  jungle: 0.15,
  mid: 0.05,
  adc: 0.05,
  support: 0.25,
}
export const GOLD_PASSIVE_PER_MIN = 210
export const GOLD_PER_CS = 21
export const GOLD_PER_KILL = 300
export const GOLD_PER_ASSIST = 150
export const CHAMPION_MAX_LEVEL = 18

// ── Champion XP model (per-champion levels, LoL-style) ─────────────────────
// Level thresholds mirror League: level 2 costs XP_LEVEL_BASE + XP_LEVEL_STEP,
// each further level costs XP_LEVEL_STEP more than the previous one
// (280, 380, 480 … 1880 — 18 360 XP total from 1 to 18).
export const XP_LEVEL_BASE = 180
export const XP_LEVEL_STEP = 100
/** Universal passive XP per game-minute — every living champion earns this
 *  identically each tick (LoL-style ambient XP), independent of role and noise. */
export const XP_PASSIVE_PER_MIN = 120
/** Farm/lane XP per game-minute on top of the passive tick income — solo lanes
 *  level fastest, the shared bot lane slower, support slowest (no farm). */
export const XP_RATE_BY_ROLE: Record<string, number> = {
  top: 170,
  jungle: 150,
  mid: 180,
  adc: 145,
  support: 100,
}
export const XP_PER_KILL = 300
export const XP_PER_ASSIST = 150
/** Each death costs this many game-minutes of passive XP (respawn + walk back). */
export const XP_DEATH_DOWNTIME_MINUTES = 2.5
/** How strongly the per-champion stat noise bleeds into XP gain (0 = none, 1 = full).
 *  Damped so level spread stays believable (~±10 %) while CS/damage spread stays wide. */
export const XP_NOISE_DAMPING = 0.4
/** Per-champion stat-rate noise range (multiplier drawn from the battle seed) */
export const STAT_NOISE_MIN = 0.75
export const STAT_NOISE_MAX = 1.3

// ── MVP score weights ──────────────────────────────────────────────────────
export const MVP_W_KILL = 3
export const MVP_W_ASSIST = 1.5
export const MVP_W_DEATH = -2
export const MVP_W_CS_DIV = 25
export const MVP_W_DAMAGE_DIV = 1500
export const MVP_W_GOLD_DIV = 2000
export const MVP_W_OBJECTIVE = 2

// ── Honor phase ────────────────────────────────────────────────────────────
export const HONOR_MAX_SELECTIONS = 3
/** Each honored OWN champion pays a chime tribute worth this many seconds of production… */
export const HONOR_TRIBUTE_PRODUCTION_SECONDS = 5
/** …or at least this many clicks, whichever is higher (early game floor) */
export const HONOR_TRIBUTE_MIN_CLICKS = 2
/** An honored match MVP pays a doubled tribute */
export const HONOR_MVP_TRIBUTE_MULT = 2
/** When the match MVP is an OWN champion: timed production buff instead of a flat payout */
export const HONOR_MVP_BUFF_DURATION_S = 10
/** Multiplier on chimes per second AND per click while the MVP buff runs */
export const HONOR_MVP_BUFF_MULT = 2
/** Tribute multiplier when the battle was lost (honors still happen, pay less) */
export const HONOR_LOSS_TRIBUTE_MULT = 0.5
// Honor score = mvpScore + the unsung-hero factors below; the ceremony then
// draws 3 of all 10 champions by weighted random (weight = score^EXP), so
// strong performances are likely but never guaranteed to be honored.
export const HONOR_SCORE_HEAL_DIV = 2000
export const HONOR_SCORE_TANK_DIV = 3000
export const HONOR_SCORE_WARD_WEIGHT = 0.4
export const HONOR_WEIGHT_EXP = 1.5
// Team bias on the honor draw. The rift favors the enemy team by default;
// future upgrades are meant to shift these multipliers toward the own team.
export const HONOR_OWN_TEAM_WEIGHT_MULT = 1.0
export const HONOR_ENEMY_TEAM_WEIGHT_MULT = 1.4
// Team bias on the MVP pick itself: enemy scores get a head start, so stats
// still decide, but the red team wins the award more often. Future upgrades
// are meant to shift these multipliers toward the own team.
export const MVP_OWN_TEAM_SCORE_MULT = 1.0
export const MVP_ENEMY_TEAM_SCORE_MULT = 1.4

// ── Warp HUD (planet search) ───────────────────────────────────────────────
export const WARP_DISTANCE_LY_MIN = 1.2
export const WARP_DISTANCE_LY_MAX = 8.5
export const WARP_VELOCITY_C_MIN = 0.82
export const WARP_VELOCITY_C_MAX = 0.99
export const WARP_STAR_COUNT = 460
export const WARP_STAR_SPEED = 22
export const WARP_HUD_UPDATE_MS = 100

// ── Champion movement (minimap waypoints, game-seconds / map-units) ────────
/** Game-seconds champions need to walk from base to their lane at game start */
export const MOVE_WALKOUT_END_T = 90
/** Game-seconds a respawned champion needs to walk back to its planned action */
export const MOVE_RESPAWN_WALK_SECONDS = 240
/** Champions start moving toward a fight this many game-seconds before it starts */
export const MOVE_FIGHT_GATHER_LEAD_T = 80
/** Game-seconds attackers keep sieging at a structure after it falls */
export const MOVE_SIEGE_HOLD_T = 120
/** Default travel duration of a movement order */
export const MOVE_ORDER_TRAVEL_T = 120
/** Game-seconds before a kill that its killer AND victim converge on the kill
 *  spot — guarantees an enemy dot is adjacent at the moment of every death. */
export const MOVE_KILL_CONVERGE_LEAD_T = 70
/** Game-seconds the killer lingers over the corpse after a kill (so the map
 *  clearly shows who scored it before both move on). */
export const MOVE_KILL_KILLER_HOLD_T = 55
/** Game-seconds a kill-spot marker stays on the minimap after a kill lands. */
export const KILL_MARK_WINDOW_T = 190
// ── Final push choreography (endgame at the 50:00 clock mark) ──────────────
/** Game-second the endgame push begins — 50:00 on the match clock */
export const FINAL_PUSH_START_T = 3000
/** Per-champion random stagger on the final push start */
export const FINAL_PUSH_STAGGER_T = 50
/** Defenders start moving this many game-seconds before the attackers (shorter way, they dig in first) */
export const FINAL_PUSH_DEFENDER_LEAD_T = 30
/** Game-seconds both teams need to march to the defense line (loser inhibitor) */
export const FINAL_PUSH_TO_INHIB_TRAVEL_T = 150
/** Game-second of the final defense fight at the loser's inhibitor */
export const FINAL_PUSH_FIGHT_T = 3200
/** Game-seconds both teams stand and fight at the inhibitor before the breakthrough */
export const FINAL_PUSH_FIGHT_HOLD_T = 140
/** Game-seconds the winner's breakthrough march takes (inhibitor → nexus gate → nexus) */
export const FINAL_PUSH_NEXUS_TRAVEL_T = 250
/** Game-seconds the loser survivors need to fall back from the inhibitor to their nexus */
export const FINAL_PUSH_LAST_STAND_TRAVEL_T = 120
/** Cosmetic position jitter in map-units applied by the UI ticker */
export const MOVE_JITTER_UNITS = 1.5
/** UI position sampling interval (ms) */
export const MOVE_TICK_INTERVAL_MS = 500
/** Movement-trail history length per champion (samples × tick interval ≈ trail duration) */
export const TRAIL_MAX_POINTS = 7
/** Minimum total walked distance (map-units) in the history before a trail is drawn */
export const TRAIL_MIN_DISTANCE_UNITS = 6
/** A single step longer than this (map-units) is a teleport (death→fountain) — trail resets */
export const TRAIL_TELEPORT_RESET_UNITS = 25

// ── Kill / objective announcement banners (rift board) ────────────────────
/** How long a single announcement banner stays on screen (ms) */
export const ANNOUNCE_DISPLAY_MS = 2600
/** Maximum queued announcements — older ones are dropped */
export const ANNOUNCE_QUEUE_MAX = 3
/** Kill-feed entries older than this (game-seconds vs. current battleTime) never announce */
export const ANNOUNCE_FRESHNESS_GAME_SECONDS = 240
/** How long the minimap plays the destruction burst after a structure falls (game-seconds) */
export const STRUCTURE_BURST_GAME_SECONDS = 90
/** Maximum retained structure-feed entries */
export const STRUCTURE_FEED_MAX = 10
/** Maximum retained kill-feed entries */
export const KILL_FEED_MAX = 30
/** Maximum retained jungle-buff-feed entries */
export const BUFF_FEED_MAX = 8

// ── Jungle buff route (early-game jungler script) ──────────────────────────
/** Earliest game-second the first buff camp falls (jungler arrives via walkout at 90) */
export const JUNGLE_FIRST_BUFF_CLEAR_MIN_T = 150
/** Latest game-second the first buff camp falls */
export const JUNGLE_FIRST_BUFF_CLEAR_MAX_T = 195
/** Minimum gap between first and second buff clear (gank window sits in between) */
export const JUNGLE_SECOND_BUFF_GAP_MIN_T = 150
/** Maximum gap between first and second buff clear */
export const JUNGLE_SECOND_BUFF_GAP_MAX_T = 280
/** Game-seconds the jungler stands at a camp before its clear event fires */
export const JUNGLE_BUFF_CLEAR_DURATION_T = 45
/** Game-seconds after the second buff clear before the regular jungle roam starts */
export const JUNGLE_ROAM_AFTER_BUFFS_T = 60
/** Game-seconds a slain buff camp needs to respawn (5:00, like on the Rift) */
export const JUNGLE_BUFF_RESPAWN_T = 300
/** Minimum game-seconds after a buff respawn until the jungler re-clears it */
export const JUNGLE_BUFF_RECLEAR_GAP_MIN_T = 60
/** Maximum game-seconds after a buff respawn until the jungler re-clears it */
export const JUNGLE_BUFF_RECLEAR_GAP_MAX_T = 240
/** No buff re-clears are scripted later than this margin before the nexus falls */
export const JUNGLE_BUFF_LATE_MARGIN_T = 600
/** Game-seconds the cosmetic buff aura stays on the jungler after a clear */
export const JUNGLE_BUFF_CARRY_DURATION_T = 150

// LP thresholds
export const LP_NORMAL_PROMOTION_THRESHOLD = 100
export const LP_MASTER_PROMOTION_THRESHOLD = 500
export const LP_GRANDMASTER_PROMOTION_THRESHOLD = 1000
export const LP_DEMOTION_VALUE = 75
export const LP_MASTER_DEMOTION_VALUE = 400
export const LP_GRANDMASTER_DEMOTION_VALUE = 900
export const LP_BASE_CHANGE = 20

// Battle constants
export const OPPONENT_MMR_VARIANCE = 200
export const BATTLE_TIME_MIN_SECONDS = 30
export const BATTLE_TIME_RANGE_SECONDS = 471

// Battle stat tick chances and max values
export const STAT_KILL_CHANCE = 0.5
export const STAT_DEATH_CHANCE = 0.3
export const STAT_ASSIST_CHANCE = 0.7
export const STAT_MAX_KILLS = 3
export const STAT_MAX_DEATHS = 2
export const STAT_MAX_ASSISTS = 7

// MMR rank thresholds
export const MMR_RANK_THRESHOLDS = [
  { tier: 'Iron', division: 'IV', minMMR: 0 },
  { tier: 'Bronze', division: 'IV', minMMR: 500 },
  { tier: 'Silver', division: 'IV', minMMR: 1000 },
  { tier: 'Gold', division: 'IV', minMMR: 1500 },
  { tier: 'Platinum', division: 'IV', minMMR: 2000 },
  { tier: 'Diamond', division: 'IV', minMMR: 2500 },
  { tier: 'Master', division: 'I', minMMR: 3000 },
  { tier: 'Grandmaster', division: 'I', minMMR: 3500 },
  { tier: 'Challenger', division: 'I', minMMR: 4000 },
] as const

// Expedition system
export const CHAMPION_BASE_POWER = 50

// Save / load
export const SAVE_KEY = 'bard-idle-save'
export const SAVE_VERSION = 1

// Star system — fly-in spawn animation
export const STAR_SPAWN_DURATION_MS = 8_000 // fly-in animation duration
export const STAR_SPAWN_FLY_EASING = 5 // cubic ease-out exponent (higher = more aggressive deceleration)

// Star system — foreground orbiting stars & planets
export const STAR_ORBIT_SPEED_RESOURCE = 0.000084 // resource star around sun
export const STAR_ORBIT_SPEED_CHAMPION = 0.000044 // champion star around sun
export const STAR_ORBIT_SPEED_GALAXY_BOSS = 0.000024 // galaxy boss star around sun
export const STAR_ORBIT_SPEED_BOSS_ESCORT = 0.00006 // boss escort stars around sun
export const PLANET_ORBIT_SPEED_MIN = 0.0019 // resource/extra planet min speed
export const PLANET_ORBIT_SPEED_RANGE = 0.001 // resource/extra planet random range
export const PLANET_ORBIT_SPEED_CHAMP_MIN = 0.0018 // champion planet min speed
export const PLANET_ORBIT_SPEED_CHAMP_RANGE = 0.0008 // champion planet random range
export const PLANET_ORBIT_SPEED_EXTRA_MIN = 0.002 // extra planets in champion star min
export const PLANET_ORBIT_SPEED_EXTRA_RANGE = 0.001 // extra planets in champion star range
export const PLANET_ORBIT_SPEED_BOSS = 0.0016 // galaxy boss planet speed

// Background canvas star speeds
export const STAR_BG_BASE_SPEED_MIN = 1.0 // base speed minimum (doubled from 0.5)
export const STAR_BG_BASE_SPEED_RANGE = 2.0 // base speed random range (doubled from 1.0)
// Probability that a background star gets blue-tinted (more realistic starfield)
export const BACKGROUND_STAR_BLUE_BIAS = 0.9

// Star background — warp / galaxy animation
export const WARP_SPEED_MAX = 70
export const GALAXY_TRANS_WARP_MS = 8_400
export const GALAXY_TRANS_DECEL_MS = 3_600
export const GALAXY_SPAWN_INTERVAL_MIN = 5_000
export const GALAXY_SPAWN_INTERVAL_MAX = 12_000
export const GALAXY_MAX_COUNT = 4
export const IDLE_CRUISE_MULTIPLIER = 20
export const CHAMPION_POWER_PER_LEVEL = 10
export const MAX_ACTIVE_EXPEDITIONS = 3
// Weighted tier roll (d100): r < epic → epic, r < rare → rare, else common
export const EXPEDITION_TIER_THRESHOLDS = { epic: 10, rare: 40 }
export const EXPEDITION_ID_RANDOM_MAX = 9999 // random suffix range for expedition slot IDs

// Item Equipment
export const ITEM_SLOT_COUNT = 5 // champion team slots that can hold weapon/armor/artefact

// Command Panel HP bar (CommandPanelComponent)
export const HP_COLOR_THRESHOLD_HIGH = 0.5 // above → green
export const HP_COLOR_THRESHOLD_LOW = 0.25 // above → gold, below → red
export const HP_BAR_SEGMENTS = 8

// Champion Combat System
/** Detection radius from screen center in px. Planet within this range → champions can hit it. Not sun-relative. */
export const CHAMPION_DETECT_RADIUS = 350
export const CHAMPION_ORBIT_HIT_RANGE = 220 // px: champion orbit position must be within this of planet to deal damage
export const CHAMPION_DPS_BASE = 40 // damage per champion per second
/** Ally slots per role (team = 5 mains + 5 × ALLIES_PER_ROLE allies). Single source of truth. */
export const ALLIES_PER_ROLE = 5
/** Passive DPS bonus per assigned ally of the attacking main's role.
 *  Full row (5 allies) → ×3.0 = the old ceiling where main + 2 orbiting allies attacked as 3 units. */
export const ALLY_DPS_CONTRIBUTION = 0.4
export const PLAYER_MAX_HP_BASE = 100
export const PLAYER_HP_REGEN_PER_SEC = 1
export const PLAYER_HP_LOSS_ON_ENRAGE = 25

// Enemy planet attacks
export const PLANET_SLOT_MAX_HP = 100
// Planet "Attunement" leveling — per-slot progression gated by Chimes + Sun Phase
export const PLANET_LEVEL_BONUS_PCT = 0.1 // +10% to the role's bonusPerSlot per level above 1
export const PLANET_LEVEL_HP_PCT = 0.2 // +20% of base max HP per level above 1
export const PLANET_LEVEL_COST_FACTOR = 0.5 // level-up base cost = slot.baseCost * factor
export const PLANET_LEVEL_COST_MULTIPLIER = 1.6 // geometric cost growth per level
export const PLANET_LEVELS_PER_PHASE = 5 // levels unlocked per Sun Phase
export const PLANET_LEVEL_MAX_PHASE = 5 // cap aligned to starPhase max (0–5)
export const PLANET_MILESTONE_INTERVAL = 5 // every Nth Attunement grants a perk spike
export const PLANET_MILESTONE_BONUS = 0.25 // +25% of base role bonus per milestone reached
export const PLANET_BULK_LEVEL_STEP = 10 // "Attune ×10" button step
export const PLANET_MAX_BULK_LEVELS = 1000 // safety cap for the "Max" simulation loop
// Attunement rank tiers — ordered bands; highest min <= level wins
export const PLANET_RANK_TIERS: { min: number; name: string; color: string }[] = [
  { min: 1, name: 'Nascent', color: '#9aa0a6' },
  { min: 5, name: 'Resonant', color: '#52b830' },
  { min: 10, name: 'Harmonic', color: '#40a0e0' },
  { min: 20, name: 'Celestial', color: '#c060e0' },
  { min: 35, name: 'Transcendent', color: '#e8c040' },
]
export const ENEMY_PROJECTILE_DAMAGE = 8
export const STAR_BURST_DELAY_BETWEEN_SHOTS = 200 // ms between individual shots within a burst
export const STAR_BURST_COOLDOWN = 10_000 // ms cooldown after a full burst completes

// Champion Orbit
export const BEHIND_SUN_SPEED_MULTIPLIER = 5
// Sterne (Star Fights) rasen hinter der Sonne noch schneller durch, damit die
// Eclipse-Phase (Boss unantastbar) möglichst kurz bleibt — gilt nur für Sterne
export const STAR_BEHIND_SUN_SPEED_MULTIPLIER = 10
export const HOVER_SPEED_MULTIPLIER = 0.3
export const AVATAR_SIZE_LARGE = 40
export const AVATAR_SIZE_SMALL = 32
export const ORBIT_RADIUS_SCALE = 1.8

// Role Behavior — orbit abilities per role
export const ROLE_SUPPORT_HEAL_INTERVAL_MS = 8000 // heal player every 8s
export const ROLE_SUPPORT_HEAL_AMOUNT = 5 // +5 HP per heal
export const SUPPORT_HEAL_RANGE = 1000 // px: max. distance Support Champion → Player Planet center
export const SUPPORT_PLANET_HEAL_AMOUNT = 20 // HP per heal tick on Player Planets
export const SUPPORT_PLANET_HEAL_INTERVAL_MS = 2000 // interval between two Planet heals in ms
export const SUPPORT_MAX_HEAL_TARGETS = 1 // max. planets healed simultaneously per heal tick
export const ROLE_TOP_SHIELD_REBUILD_MS = 5000 // seconds to rebuild shield after absorbing a shot
export const ROLE_MID_CURSE_INTERVAL_MS = 15000 // curse: 15s cooldown between casts
export const ROLE_MID_CURSE_DURATION_MS = 10000 // curse lasts 10s
export const ROLE_MID_CURSE_RANGE = 1500 // px screen-space range from midlaner to boss planet
export const ROLE_MID_CURSE_CAST_MS = 600 // cast flash animation duration
export const ROLE_MID_CURSE_DOT_DPS = 8 // Corruption: 8 dmg/s × 10 ticks = 80 total
export const ROLE_MID_CURSE_ATTACK_DEBUFF = 0.4 // Weakness: enemy deals only 40% damage
export const ROLE_MID_CURSE_DAMAGE_AMP = 1.8 // Hexblight: all player damage ×1.8
export const ROLE_MID_CURSE_ATTACK_SLOW = 3.0 // Petrify: enemy attack interval ×3
export const ROLE_MID_CURSE_DAMNATION_FRAC = 0.2 // Damnation: instant 20% of boss maxHP
export const ROLE_ADC_BURST_DAMAGE = 80 // bonus burst hit on boss
export const ROLE_ADC_BURST_INTERVAL_MS = 5000 // every 5s

// ── Role Star Attacks — every orbiting role fires an attack at the active
//    star/planet boss on its own cooldown, on top of its normal role ability
//    (roleBehaviorStore._tickRoleAttacks / RoleStrikerSquad.vue) ────────────
export const ROLE_STAR_ATTACKS: Record<ChampionRole, { damage: number; intervalMs: number }> = {
  top: { damage: 35, intervalMs: 7000 }, // heavy slow smash
  jungle: { damage: 20, intervalMs: 4000 }, // quick raking strikes
  mid: { damage: 25, intervalMs: 6000 }, // arcane bolt
  adc: { damage: 15, intervalMs: 3000 }, // rapid shots (burst stays separate)
  support: { damage: 12, intervalMs: 5000 }, // light chime blast
}

// ── Champion HP — every role champion has HP scaled by its champion tier;
//    the active star/planet boss strikes back at all orbiting champions
//    (roleBehaviorStore._syncChampionHp / _tickBossAttack) ──────────────────
export const CHAMPION_BASE_HP_BY_ROLE: Record<ChampionRole, number> = {
  top: 280, // tank frontline
  jungle: 210,
  mid: 170,
  adc: 150, // squishy carry
  support: 190,
}
export const CHAMPION_HP_PER_STAR = 0.35 // +35% max HP per champion star level above ★1
export const BOSS_CHAMPION_ATTACK_DPS = 6 // boss dmg/s dealt to each orbiting champion
export const BOSS_GALAXY_CHAMPION_DPS_MULT = 2 // galaxy bosses hit twice as hard
export const CHAMPION_REVIVE_MS = 8000 // downed champion revives at full HP after this
export const CHAMPION_HP_REGEN_FRAC = 0.04 // out-of-combat regen: fraction of max HP per second
export const CHAMPION_HIT_FLASH_MS = 450 // hit-flash animation window on champion portraits
export const BOSS_HIT_REACT_MS = 350 // boss flinch animation when a champion projectile lands

// ── Boss Rage — every boss periodically enrages and deals double damage;
//    interval and duration are rolled per boss (roleBehaviorStore._tickBossRage)
export const BOSS_RAGE_DMG_MULT = 2 // damage multiplier while raging
export const BOSS_RAGE_INTERVAL_MIN_MS = 9000 // min cooldown between rages
export const BOSS_RAGE_INTERVAL_MAX_MS = 16000 // max cooldown between rages
export const BOSS_RAGE_DURATION_MIN_MS = 5000 // min rage duration
export const BOSS_RAGE_DURATION_MAX_MS = 12000 // max rage duration

// ── Star Fight Modal — Role Striker Squad (RoleStrikerSquad.vue) ──────────
export const STRIKER_FLOAT_DURATION_MS = 1400 // floating dmg number lifetime above a striker
export const STRIKER_FLOAT_MAX = 8 // cap on simultaneous striker damage floats
export const STRIKER_PROJECTILE_FLIGHT_MS = 550 // projectile travel time
export const STRIKER_IMPACT_MS = 900 // impact burst + damage number lifetime
export const STRIKER_FIRE_FLASH_MS = 550 // snap phase of the attack (lunge → impact hold → settle)
export const STRIKER_ATTACK_WINDUP_MS = 1000 // windup phase: starts the moment the pill shows 0s (one store tick before fire)
export const STRIKER_MUZZLE_MS = 280 // muzzle flash lifetime (matches its CSS animation)
export const STRIKER_ATTACK_LUNGE_PX = 22 // how far the portrait lunges toward the boss on attack
// Halbkreis unterhalb des Boss-Bilds: Winkel in Grad (0° = rechts, 90° = unten)
// je Rolle — Top ganz links, Mid unten Mitte, Support rechts. Alle Maße in %
// der Arena, damit das Layout auf Full-HD wie auf 2K identisch sitzt.
// Winkel so gewählt, dass die fünf Striker HORIZONTAL gleichmäßig verteilt
// sind (x = 24 / 37 / 50 / 63 / 76 % — je 13 % Abstand), mid exakt unten
// mittig; der schmalere Bogen hält die Außenrollen klar von den
// Turret-Battery-Spalten (13 % / 87 %) frei
export const STRIKER_ARC_ANGLES: Record<ChampionRole, number> = {
  top: 150,
  jungle: 116,
  mid: 90,
  adc: 64,
  support: 30,
}
export const STRIKER_ARC_RX_PCT = 30 // horizontal semi-axis of the striker arc (% arena width)
export const STRIKER_ARC_RY_PCT = 10 // vertical semi-axis of the striker arc (% arena height)
export const STRIKER_ARC_CENTER_Y_PCT = 67 // arc center as % of arena height (below boss + loot banner)
export const STRIKER_BOSS_ANCHOR_X_PCT = 50 // projectile target: boss center X (% arena width)
export const STRIKER_BOSS_ANCHOR_Y_PCT = 41 // projectile target: boss center Y (% arena height)
export const STRIKER_PROJECTILE_IMPACT_FRAC = 0.7 // projectile stops at this fraction toward boss center

// Turret Battery — turret-planet volleys in the Star Fight Modal, synced with
// the idle-orbit turret shots via planetBossStore.turretVolleyCounter
export const TURRET_PROJECTILE_FLIGHT_MS = 420 // turret comet travel time to the boss
export const TURRET_DAMAGE_FLOAT_MS = 1000 // lifetime of the turret damage float at the boss
export const TURRET_ATTACK_LUNGE_PX = 16 // how far a turret planet snaps toward the boss on volley
export const TURRET_CD_TICK_MS = 100 // UI refresh of the turret cooldown pill (sub-second display)
export const BOSS_PLANET_ATTACK_DPS = 3 // boss dmg/s dealt to each player planet slot during the fight
// Boss-Schockwelle: der Ring läuft sichtbar bis über Champions + Turrets;
// Hit-Flash und Damage-Labels feuern erst, wenn der Ring die Ziele erreicht
export const BOSS_WAVE_TRAVEL_MS = 800 // full lifetime of the expanding boss shockwave ring
export const BOSS_WAVE_HIT_DELAY_MS = 500 // moment the ring reaches champions/turrets → hit flash + damage labels
// Boss-Fähigkeit "Shock Nova": die AoE-Welle ist eine Fähigkeit mit Cooldown —
// pro Auslösung trifft sie alle Champions, alle Turret-Planeten UND den Spieler.
// Schaden pro Welle = DPS × Intervall (balance-neutral zum alten Sekundentakt).
// Der Idle-Orbit-Stern des aktiven Bosses teilt sich exakt diesen Cooldown.
export const BOSS_NOVA_INTERVAL_MS = 5000 // cooldown between two Shock Nova waves
export const BOSS_NOVA_PLAYER_DAMAGE = 5 // damage each nova deals to the player (Bard) in the orbit center
// Boss-Fähigkeit "Strike" (Auto-Attack): kurzer Cooldown, trifft EIN zufällig
// gewähltes lebendes Ziel (Champion oder Turret-Planet) — Rage verdoppelt
// auch diesen Schaden, wodurch die Rage-Phase deutlich bedrohlicher wird
export const BOSS_AUTO_INTERVAL_MS = 3000 // cooldown between two boss auto-attacks
export const BOSS_AUTO_ATTACK_DAMAGE = 8 // base single-target damage per auto-attack
export const BOSS_AUTO_AIM_MS = 900 // telegraph: reticle locks onto the victim before the bolt fires (< 1 game tick → shot follows on the very next tick)
export const BOSS_AUTO_HIT_DELAY_MS = 450 // flight time of the strike bolt → impact flash + damage label
// 6 feste Anker auf einem Ellipsenbogen um den Boss (Gegenstück zum unteren
// Striker-Halbkreis): Slots 1–3 auf der linken Bogenhälfte, 4–6 rechts —
// jeder Turret sitzt immer an der Position seines Slots
export const TURRET_ARC_RX_PCT = 37 // horizontal semi-axis of the turret arc (% arena width)
export const TURRET_ARC_RY_PCT = 28 // vertical semi-axis of the turret arc (% arena height)
export const TURRET_ARC_CENTER_Y_PCT = 38 // arc center as % of arena height (boss level)
export const TURRET_ARC_ROW_ANGLE_DEG = 30 // angular spacing of the 3 rows from the horizontal axis
// Gestrichelte Guide-Linien (Turret-Bogen + Striker-Halbkreis) laufen über die
// äußersten Slots hinaus weiter, bis sie die zentrale Planeten-Silhouette
// erreichen — so wirkt es, als schlössen sie sich hinter dem Planeten
export const ARC_GUIDE_PLANET_RADIUS_FRAC = 0.42 // planet silhouette radius as fraction of min(arena w, h)
export const ARC_GUIDE_MAX_EXTEND_DEG = 80 // safety cap for extending a guide past its outermost slot
export const ARC_GUIDE_STEP_DEG = 1 // angular resolution of the planet-edge search

/** Visual radius of the sun in pixels. All ORBIT_TIERS dimensions scale relative to this value. */
export const SUN_RADIUS = 80

/** Axial tilt of the layered SunComponent. Default = angled/side view (planet tab). */
export const SUN_AXIAL_TILT = -0.42
/** Axial tilt for the top-down camera (shop tab) — looking straight down at the sun. */
export const SUN_TOPDOWN_AXIAL_TILT = 0

/**
 * Background idle-scene sun disc diameter as a multiple of the current sun radius.
 * Matches the visible core (~4r) and the chime click target (currentSunRadius * 4),
 * so the shared phase disc stays aligned with the chime button and champion orbits.
 */
export const SUN_BG_DISC_RADIUS_FACTOR = 4

/** Shop sun disc diameter band (px), mapped from the current phase radius (STAR_PHASE_DATA, 30…140).
 *  Mirrors the Planets-tab sun style but a smaller band so it stays inside the branch-icon ring
 *  (ICON_DIST = 285). Grows with phase. */
export const SHOP_SUN_MIN_DIAMETER = 170
export const SHOP_SUN_MAX_DIAMETER = 240

/** Pause overlay sun hero — disc diameter band (px) scaled by viewport height so the
 *  paused sun reads large on every desktop resolution without dwarfing the panel. */
export const PAUSE_SUN_MIN_DIAMETER = 160
export const PAUSE_SUN_MAX_DIAMETER = 300
export const PAUSE_SUN_VH_FACTOR = 0.24

/** Pause overlay panel — fixed design surface (px) that useFitScale shrinks on
 *  flat viewports (Full HD) and grows (up to max scale) on 2K/4K. */
export const PAUSE_PANEL_DESIGN_WIDTH = 560
export const PAUSE_PANEL_MAX_SCALE = 1.3
export const PAUSE_STAGE_MARGIN = 12

export interface SunGrowthStage {
  stage: number
  chimesThreshold: number
  radius: number
  label: string
}

/** Sun growth stages — thresholds match planet slot costs so stage N is met when slot N becomes affordable. */
export const SUN_GROWTH_STAGES: SunGrowthStage[] = [
  { stage: 0, chimesThreshold: 0, radius: 34, label: 'Nascent' },
  { stage: 1, chimesThreshold: 500, radius: 44, label: 'Kindling' },
  { stage: 2, chimesThreshold: 2000, radius: 56, label: 'Radiant' },
  { stage: 3, chimesThreshold: 8000, radius: 72, label: 'Blazing' },
  { stage: 4, chimesThreshold: 35000, radius: 92, label: 'Scorching' },
  { stage: 5, chimesThreshold: 150000, radius: 116, label: 'Stellar' },
  { stage: 6, chimesThreshold: 600000, radius: 144, label: 'Supernova' },
]

/** Required sun phase (starPhase) to unlock each planet slot. Every sun phase after
 *  the comet unlocks one slot: slot index 0 → Spark (phase 0), …,
 *  slot index 5 → Finale (phase 5). */
export const PLANET_SLOT_SUN_PHASE_REQUIREMENTS: number[] = [0, 1, 2, 3, 4, 5]

/** Central role registry — single source of truth for key, label, icon, color and orbit parameters. */
export const ROLES = [
  {
    key: 'top' as ChampionRole,
    label: 'Top',
    short: 'TOP',
    icon: 'game-icons:broadsword',
    image: '/img/roles/top.png',
    color: '#e05050',
    stats: [
      { key: 'atk', icon: 'game-icons:crossed-swords', label: 'Atk Interval', value: '4.0s' },
      {
        key: 'shield',
        icon: 'game-icons:shield',
        label: 'Shield Rebuild',
        value: `${ROLE_TOP_SHIELD_REBUILD_MS / 1000}s`,
      },
      { key: 'type', icon: 'game-icons:biceps', label: 'Style', value: 'Tank / Frontline' },
    ] satisfies RoleStat[],
    abilityCompact: `Shield – ${ROLE_TOP_SHIELD_REBUILD_MS / 1000}s Rebuild · Tank / Frontline`,
    abilityDetails: [
      { name: 'Atk Interval', desc: 'Hits boss every', value: '4.0s' },
      {
        name: 'Shield',
        desc: 'Absorbs 1 hit, then rebuilds after',
        value: `${ROLE_TOP_SHIELD_REBUILD_MS / 1000}s`,
      },
      { name: 'Style', desc: 'Tank / Frontline – fights on the inner orbit' },
    ] satisfies RoleAbilityDetail[],
    orbitDesc: `Shield: ${ROLE_TOP_SHIELD_REBUILD_MS / 1000}s rebuild`,
    orbit: {
      rx: SUN_RADIUS * 2.58,
      ry: SUN_RADIUS * 1.13,
      tiltDeg: 14,
      tiltRad: 0.2443,
      color: '#F34B49',
      speed: 0.00032,
      hitIntervalMs: 4000,
      hitDurationMs: 350,
      championSize: SUN_RADIUS * 1.0,
    },
  },
  {
    key: 'jungle' as ChampionRole,
    label: 'Jungle',
    short: 'JGL',
    icon: 'game-icons:thorny-vine',
    image: '/img/roles/jungle.png',
    color: '#50c060',
    stats: [
      { key: 'style', icon: 'game-icons:plain-dagger', label: 'Style', value: 'Assassin / Ganker' },
      { key: 'effect', icon: 'game-icons:tornado', label: 'Effect', value: 'Crowd Control' },
      { key: 'range', icon: 'game-icons:orbit', label: 'Orbit', value: 'Wide Patrol' },
    ] satisfies RoleStat[],
    abilityCompact: 'Jungle Buffs · Crowd Control · Wide Patrol',
    abilityDetails: [
      {
        name: 'Red Buff',
        desc: 'Burn DoT on hit, slow enemy movement',
        value: '10 dmg/s · −30% slow',
      },
      { name: 'Blue Buff', desc: 'Ability cooldown reduction & mana regen for nearby allies' },
      { name: 'Scuttle', desc: 'River vision + movement speed bonus in river zone' },
      {
        name: 'Crowd Control',
        desc: 'Applies CC debuffs to boss planets reducing their effectiveness',
      },
      { name: 'Style', desc: 'Assassin / Ganker – patrols wide outer orbit' },
    ] satisfies RoleAbilityDetail[],
    orbitDesc: 'Crowd Control',
    orbit: {
      rx: SUN_RADIUS * 7.8,
      ry: SUN_RADIUS * 3.35,
      tiltDeg: -15,
      tiltRad: -0.2618,
      color: '#5CE66A',
      speed: 0.00022,
      championSize: SUN_RADIUS * 1.0,
    },
  },
  {
    key: 'mid' as ChampionRole,
    label: 'Mid',
    short: 'MID',
    icon: 'game-icons:wizard-staff',
    image: '/img/roles/mid.png',
    color: '#5090e8',
    stats: [
      {
        key: 'cursecd',
        icon: 'game-icons:empty-hourglass',
        label: 'Curse CD',
        value: `${ROLE_MID_CURSE_INTERVAL_MS / 1000}s`,
      },
      {
        key: 'cursedur',
        icon: 'game-icons:hourglass',
        label: 'Curse Duration',
        value: `${ROLE_MID_CURSE_DURATION_MS / 1000}s`,
      },
      {
        key: 'dot',
        icon: 'game-icons:death-skull',
        label: 'DoT DPS',
        value: `${ROLE_MID_CURSE_DOT_DPS} dmg/s`,
      },
      {
        key: 'amp',
        icon: 'game-icons:lightning-bolt',
        label: 'Dmg Amplify',
        value: `×${ROLE_MID_CURSE_DAMAGE_AMP}`,
      },
    ] satisfies RoleStat[],
    abilityCompact: `Curse ${ROLE_MID_CURSE_INTERVAL_MS / 1000}s CD · 5 Curse Types · DoT ${ROLE_MID_CURSE_DOT_DPS} dmg/s`,
    abilityDetails: [
      {
        name: 'Corruption',
        desc: `DoT ${ROLE_MID_CURSE_DOT_DPS} dmg/s × ${ROLE_MID_CURSE_DURATION_MS / 1000}s`,
        value: `${ROLE_MID_CURSE_DOT_DPS * (ROLE_MID_CURSE_DURATION_MS / 1000)} total dmg`,
      },
      {
        name: 'Weakness',
        desc: 'Enemy attack reduced for curse duration',
        value: `×${ROLE_MID_CURSE_ATTACK_DEBUFF} (${Math.round((1 - ROLE_MID_CURSE_ATTACK_DEBUFF) * 100)}% less)`,
      },
      {
        name: 'Hexblight',
        desc: 'All player damage amplified for curse duration',
        value: `×${ROLE_MID_CURSE_DAMAGE_AMP}`,
      },
      {
        name: 'Petrify',
        desc: 'Enemy attack interval multiplied for curse duration',
        value: `×${ROLE_MID_CURSE_ATTACK_SLOW} slower`,
      },
      {
        name: 'Damnation',
        desc: 'Instant damage as fraction of boss max HP',
        value: `${Math.round(ROLE_MID_CURSE_DAMNATION_FRAC * 100)}% MaxHP`,
      },
      {
        name: 'Cooldown',
        desc: 'Time between curse casts',
        value: `${ROLE_MID_CURSE_INTERVAL_MS / 1000}s`,
      },
      {
        name: 'Duration',
        desc: 'Each curse lasts',
        value: `${ROLE_MID_CURSE_DURATION_MS / 1000}s`,
      },
      { name: 'Range', desc: 'Max distance to boss planet', value: `${ROLE_MID_CURSE_RANGE}px` },
    ] satisfies RoleAbilityDetail[],
    orbitDesc: `Curse every ${ROLE_MID_CURSE_INTERVAL_MS / 1000}s · DoT ${ROLE_MID_CURSE_DOT_DPS}/s`,
    orbit: {
      rx: SUN_RADIUS * 10.75,
      ry: SUN_RADIUS * 4.62,
      tiltDeg: 12,
      tiltRad: 0.2094,
      color: '#3694FF',
      speed: 0.00017,
      championSize: SUN_RADIUS * 1.0,
    },
  },
  {
    key: 'adc' as ChampionRole,
    label: 'ADC',
    short: 'ADC',
    icon: 'game-icons:bow-arrow',
    image: '/img/roles/adc.png',
    color: '#e89840',
    stats: [
      {
        key: 'burst',
        icon: 'game-icons:archery-target',
        label: 'Burst Damage',
        value: `${ROLE_ADC_BURST_DAMAGE}`,
      },
      {
        key: 'burstcd',
        icon: 'game-icons:stopwatch',
        label: 'Burst CD',
        value: `${ROLE_ADC_BURST_INTERVAL_MS / 1000}s`,
      },
      { key: 'style', icon: 'game-icons:arrow-scope', label: 'Style', value: 'Ranged / DPS' },
    ] satisfies RoleStat[],
    abilityCompact: `Burst ${ROLE_ADC_BURST_DAMAGE} dmg / ${ROLE_ADC_BURST_INTERVAL_MS / 1000}s · Ranged DPS`,
    abilityDetails: [
      {
        name: 'Burst Damage',
        desc: 'Bonus damage on direct hit every burst cycle',
        value: `${ROLE_ADC_BURST_DAMAGE} dmg`,
      },
      {
        name: 'Burst CD',
        desc: 'Time between burst shots',
        value: `${ROLE_ADC_BURST_INTERVAL_MS / 1000}s`,
      },
      { name: 'Style', desc: 'Ranged / DPS – fires from long outer orbit' },
    ] satisfies RoleAbilityDetail[],
    orbitDesc: `Burst ${ROLE_ADC_BURST_DAMAGE} dmg / ${ROLE_ADC_BURST_INTERVAL_MS / 1000}s`,
    orbit: {
      rx: SUN_RADIUS * 12.67,
      ry: SUN_RADIUS * 5.43,
      tiltDeg: -8,
      tiltRad: -0.1396,
      color: '#FF9300',
      speed: 0.00014,
      championSize: SUN_RADIUS * 1.0,
    },
  },
  {
    key: 'support' as ChampionRole,
    label: 'Supp',
    short: 'SUP',
    icon: 'game-icons:health-potion',
    image: '/img/roles/supp.png',
    color: '#b8c8d8',
    stats: [
      {
        key: 'heal',
        icon: 'game-icons:healing',
        label: 'Heal / Tick',
        value: `${ROLE_SUPPORT_HEAL_AMOUNT} HP`,
      },
      {
        key: 'healcd',
        icon: 'game-icons:pocket-watch',
        label: 'Heal CD',
        value: `${ROLE_SUPPORT_HEAL_INTERVAL_MS / 1000}s`,
      },
      {
        key: 'pheal',
        icon: 'game-icons:earth-spit',
        label: 'Planet Heal',
        value: `${SUPPORT_PLANET_HEAL_AMOUNT} HP`,
      },
      {
        key: 'pcd',
        icon: 'game-icons:cuckoo-clock',
        label: 'Planet CD',
        value: `${SUPPORT_PLANET_HEAL_INTERVAL_MS / 1000}s`,
      },
    ] satisfies RoleStat[],
    abilityCompact: `Heal ${ROLE_SUPPORT_HEAL_AMOUNT} HP / ${ROLE_SUPPORT_HEAL_INTERVAL_MS / 1000}s · Planet Heal ${SUPPORT_PLANET_HEAL_AMOUNT} HP / ${SUPPORT_PLANET_HEAL_INTERVAL_MS / 1000}s`,
    abilityDetails: [
      {
        name: 'Player Heal',
        desc: 'Restores HP to the player every cycle',
        value: `${ROLE_SUPPORT_HEAL_AMOUNT} HP / ${ROLE_SUPPORT_HEAL_INTERVAL_MS / 1000}s`,
      },
      {
        name: 'Planet Heal',
        desc: 'Heals up to 1 nearby ally planet per cycle',
        value: `${SUPPORT_PLANET_HEAL_AMOUNT} HP / ${SUPPORT_PLANET_HEAL_INTERVAL_MS / 1000}s`,
      },
      { name: 'Range', desc: 'Heal targets within distance', value: '1000px' },
      { name: 'Style', desc: 'Healer / Utility – follows ADC on outer orbit' },
    ] satisfies RoleAbilityDetail[],
    orbitDesc: `Heal ${ROLE_SUPPORT_HEAL_AMOUNT} HP / ${ROLE_SUPPORT_HEAL_INTERVAL_MS / 1000}s`,
    orbit: {
      rx: SUN_RADIUS * 12.67,
      ry: SUN_RADIUS * 5.43,
      tiltDeg: -8,
      tiltRad: -0.1396,
      // Helle Variante der Support-Rollenfarbe (#b8c8d8) — wie bei allen
      // anderen Rollen ist orbit.color nur die Neon-Version derselben Farbe
      // (vorher #12B8FF, kollidierte mit Mids Orbit-Blau #3694FF)
      color: '#E2ECF8',
      speed: 0.00014,
      championSize: SUN_RADIUS * 1.0,
    },
  },
] as const

/** O(1) lookup from ChampionRole key to the full role entry. */
export const ROLE_BY_KEY = Object.fromEntries(ROLES.map((r) => [r.key, r])) as Record<
  ChampionRole,
  (typeof ROLES)[number]
>

/** Empty ally grid: one row per role, ALLIES_PER_ROLE null slots each. */
export const createEmptyAllyRows = (): (string | null)[][] =>
  ROLES.map(() => Array<string | null>(ALLIES_PER_ROLE).fill(null))

// Canonical orbit tiers — 2 distinct orbit paths per category
export const ORBIT_TIERS = {
  planet: [
    {
      rx: SUN_RADIUS * 6.33,
      ry: SUN_RADIUS * 1.77,
      tiltDeg: 18,
      tiltRad: 0.3142,
      color: '#A346FF',
      size: SUN_RADIUS * 1.33,
    },
    {
      rx: SUN_RADIUS * 9.33,
      ry: SUN_RADIUS * 2.27,
      tiltDeg: -12,
      tiltRad: -0.2094,
      color: '#A346FF',
      size: SUN_RADIUS * 1.33,
    },
  ],
  star: [
    {
      rx: SUN_RADIUS * 14.0,
      ry: SUN_RADIUS * 5.5,
      tiltDeg: 16,
      tiltRad: 0.2793,
      color: '#FFD600',
      size: SUN_RADIUS * 0.85,
    },
    {
      rx: SUN_RADIUS * 16.5,
      ry: SUN_RADIUS * 6.2,
      tiltDeg: -14,
      tiltRad: -0.2443,
      color: '#FFD600',
      size: SUN_RADIUS * 0.85,
    },
  ],
} as const

// Support orbits the same path as ADC, offset by this angle (radians) behind
export const SUPPORT_ANGLE_OFFSET = Math.PI / 5

/** Pre-scale planet-slot orbit radii (× ORBIT_RADIUS_SCALE = effective radius in px).
 *  These orbit planets around *stars*, not the sun — not scaled via SUN_RADIUS. */
export const PLANET_SLOT_ORBITS = [
  { rx: 180, ry: 50, tiltDeg: 18 },
  { rx: 236, ry: 57, tiltDeg: -12 },
  { rx: 370, ry: 85, tiltDeg: 28 },
  { rx: 460, ry: 100, tiltDeg: -8 },
  { rx: 550, ry: 115, tiltDeg: 22 },
  { rx: 640, ry: 130, tiltDeg: -18 },
] as const

// HUD panel corner arc radius (shared by CommandPanel and MiniMap)
export const HUD_PANEL_ARC_R = 60
// Canonical border-radius for bardProfil cards, containers, and buttons
export const BARD_PROFILE_RADIUS = 4

// ── Bottom Bar Frame strokes ──────────────────────────────────────────────
export const BOTTOM_FRAME_STROKE_SHADOW = 'rgba(30,12,0,0.95)' // dark outer shadow
export const BOTTOM_FRAME_STROKE_WOOD = '#7a4e20' // wood brown — matches --rpg-wood / header border
export const BOTTOM_FRAME_STROKE_GRAIN = 'rgba(160,95,38,0.75)' // lighter wood grain
export const BOTTOM_FRAME_STROKE_SHEEN = 'rgba(190,115,46,0.14)' // subtle warm surface sheen

// ── Bottom Bar v2 (unified silhouette shell) ──────────────────────────────
// Reference geometry at hud-scale 1 (design mock is a 1920×443 layout).
export const BOTTOM_BAR_HEIGHT = 443 // total bar height
export const BOTTOM_BAR_SIDE_W = 440 // raised side panel width (minimap / command)
export const BOTTOM_BAR_CENTER_TOP_Y = 364 // top edge of the low center strip
export const BOTTOM_BAR_NOTCH_R = 26 // inner notch radius where panels meet the strip
export const BOTTOM_BAR_EDGE_INSET = 2 // stroke inset from the viewport edges
// Frame stroke widths (drawn shadow → wood → gold, top edge only)
export const BOTTOM_FRAME_W_SHADOW = 7
export const BOTTOM_FRAME_W_WOOD = 3.5
export const BOTTOM_FRAME_W_GOLD = 1.2
export const BOTTOM_FRAME_STROKE_GOLD = '#c89040' // thin gold highlight line
// Unified background fill: flat header brown — must stay identical across
// all three bottom panels (minimap / scoreboard / command), no deviations
export const BOTTOM_BAR_BG_TOP = '#1e1006'
export const BOTTOM_BAR_BG_MID = '#1e1006'
export const BOTTOM_BAR_BG_BOTTOM = '#1e1006'
export const BOTTOM_BAR_SEAM_COLOR = 'rgba(122,78,32,0.35)'

// Center scoreboard (5 combat | crest | 5 economy stats)
export const SCOREBOARD_STAT_COLORS = {
  kills: '#6ee7b7',
  deaths: '#fca5a5',
  assists: '#93c5fd',
  kda: '#e8c040',
  killPart: '#d8c48a',
  gold: '#e8c040',
  cs: '#52b830',
  dmg: '#f08850',
  dragons: '#6ee0a0',
  barons: '#c9a0f5',
  turrets: '#d8b878',
} as const
export const SCOREBOARD_LABEL_COLOR = '#7a6a44'

// ── Battle stat visuals — canonical mapping shared by BottomScoreboard,
//    ScoreTopBar and BattleLandingScreen: the same stat always carries the
//    same icon/image everywhere in the UI. ──────────────────────────────
export const BATTLE_STAT_GAME_ICONS = {
  kills: 'game-icons:piercing-sword',
  deaths: 'game-icons:dead-head',
  assists: 'game-icons:three-friends',
  cs: 'game-icons:minions',
  damage: 'game-icons:sabers-choc',
  turrets: 'game-icons:watchtower',
  inhibitors: 'game-icons:floating-crystal',
  winLoss: 'game-icons:podium-winner',
} as const

export const BATTLE_STAT_IMAGES = {
  gold: '/img/BardGold.png',
  dragons: '/img/dragon_icon.png',
  barons: '/img/baron_icon.png',
} as const

// Rank emblem art + tier accent colors (shared: RankBandPanel, BottomScoreboard)
export const RANK_EMBLEM_IMAGES: Record<string, string> = {
  Iron: '/img/RankBorder/RankIron.png',
  Bronze: '/img/RankBorder/RankBronze.png',
  Silver: '/img/RankBorder/RankSilver.png',
  Gold: '/img/RankBorder/RankGold.png',
  Platinum: '/img/RankBorder/RankPlatin.png',
  Emerald: '/img/RankBorder/RankEmerald.png',
  Diamond: '/img/RankBorder/RankDiamand.png',
  Master: '/img/RankBorder/RankMaster.png',
  Grandmaster: '/img/RankBorder/RankGrandMaster.png',
  Challenger: '/img/RankBorder/RankChallenger.png',
}

export const RANK_TIER_COLORS: Record<string, string> = {
  Iron: '#8a9098',
  Bronze: '#c87832',
  Silver: '#b0b8c4',
  Gold: '#d4a020',
  Platinum: '#4ab8c0',
  Emerald: '#3cbc78',
  Diamond: '#88d8f8',
  Master: '#b060f0',
  Grandmaster: '#f06028',
  Challenger: '#f0dc50',
}

// Minimap travel rendering (static galaxy map)
export const MINIMAP_FLIGHTPATH_BEND = 0.18 // quadratic ctrl-point offset (fraction of leg length)
export const MINIMAP_ROUTE_ARROW_SIZE = 5 // chevron wing length on flown-route segments (live map)
export const MINIMAP_ROUTE_ARROW_GAP = 14 // chevron tip distance before the segment endpoint (clears the star marker)
export const MINIMAP_ROUTE_ARROW_SPREAD = 0.48 // half-opening angle of the chevron in radians (~27°)
export const SNAPSHOT_ROUTE_ARROW_SIZE = 3.5 // chevron wing length in the archive snapshot (smaller canvas)
export const SNAPSHOT_ROUTE_ARROW_GAP = 12 // chevron tip distance before the endpoint in the snapshot
export const MINIMAP_COMET_HEAD_R = 4.5 // player comet head radius (× √zoom)
export const MINIMAP_COMET_TAIL_LEN = 46 // comet tail length in px along the flight curve
export const MINIMAP_COMET_TAIL_SEGMENTS = 14 // tail sample count
export const MINIMAP_IDLE_SUN_R = 11 // player-sun marker when not traveling
export const MINIMAP_TWINKLE_COUNT = 30 // seeded twinkling background stars
// Procedural spiral galaxy (canvas-drawn, replaces the old galaxy-far sprite)
export const MINIMAP_GALAXY_ARMS_MIN = 2 // min seeded spiral arm count
export const MINIMAP_GALAXY_ARMS_MAX = 3 // max seeded spiral arm count
export const MINIMAP_GALAXY_PARTICLES = 1200 // particles across bulge + arms + haze
export const MINIMAP_GALAXY_RADIUS = 0.5 // outer radius in world (0..1) coords
export const MINIMAP_GALAXY_INNER_RADIUS = 0.05 // arms start here (bulge edge)
export const MINIMAP_GALAXY_SWIRL_TURNS = 1.9 // base revolutions from core to rim
export const MINIMAP_GALAXY_SQUASH = 0.62 // base disk squash (inclination illusion)
export const MINIMAP_GALAXY_BULGE_R = 0.11 // gaussian bulge radius
export const MINIMAP_GALAXY_KNOTS = 18 // bright accent-colored knots on the arms
export const MINIMAP_GALAXY_BRIGHT_STARS = 70 // distinct single stars along the arms
export const MINIMAP_GALAXY_CORE_RADIUS = 0.15 // core glow radius in world coords
export const MINIMAP_ZOOM_TRIGGER_MS = 45_000 // zoom-in phase starts this long before arrival
export const MINIMAP_ZOOM_MAX = 5.4 // camera zoom at arrival (target star grows ≈ arrival sun)
export const MINIMAP_ZOOM_LERP = 0.06 // per-frame camera smoothing (zoom-in)
export const MINIMAP_ZOOM_OUT_LERP = 0.03 // slower zoom-out so the near field stays visible a while
export const MINIMAP_DEPARTURE_TRANSITION_MS = 900 // crossfade arrival view → galaxy map
// Zoom acts: galaxy overview → fly-through (arms spread, near field fades in) → arrival view
export const MINIMAP_GALAXY_FADE: readonly [number, number] = [3.4, 5.2] // zoom range: galaxy body fades out
export const MINIMAP_NEARFIELD_FADE: readonly [number, number] = [2.4, 4.2] // zoom range: local star field fades in
export const MINIMAP_NEARFIELD_STARS = 90 // seeded local stars around the destination
export const MINIMAP_NEARFIELD_SPREAD = 0.09 // near-field star spread in world coords
export const MINIMAP_TARGET_BASE_R = 6 // target star radius in the far overview (~1.7× comet head)
export const MINIMAP_TARGET_MAX_R = 12 // target star radius at full zoom (arrival crossfade bridges to the arrival sun)
export const MINIMAP_WAIT_SUN_R = 26 // centered player sun on the role-selection screen

// Command panel v2 (portrait cards + planet dock row)
export const CMD_PLANET_ROW_H = 118 // planet dock row height
export const CMD_READY_DOT_SIZE = 15 // ability-ready indicator dot
export const CMD_CARD_ROLE_BAR_H = 5 // role-colored top bar on champion cards
export const CMD_CARD_OUTER_ARC_R = 44 // outer corner radius following the silhouette arc

// Game Loop
export const GAME_TICK_INTERVAL_MS = 1000
export const MEEP_ADD_DELAY_MS = 100
export const AUGMENT_CHOICE_COUNT = 3
export const RARITY_WEIGHT_FALLBACK = 60
export const BUILDING_HISTORY_BUFFER_SIZE = 60
export const HYPERSPACE_ANIM_START_MS = 2500
export const HYPERSPACE_ANIM_END_MS = 3500
export const UNIVERSE_RESCUE_INITIAL_COST = 100_000
export const UNIVERSE_RESCUE_COST_MULTIPLIER = 2

// Planet Shop Roles
export const PLANET_HARVEST_INTERVAL_TICKS = 30 // harvest_node: 1 Material every 30 ticks
export const JUNGLE_BUFF_RANGE = 120 // px, screen-space proximity radius for jungle buff trigger
export const JUNGLE_BUFF_COOLDOWN_MS = 30_000 // 30s cooldown between jungle buff triggers

export const MEEP_POWER_MULTIPLIER = 100

// Ability defaults (??-operator fallbacks)
export const ABILITY_CPS_PER_LEVEL_DEFAULT = 0.15
export const ABILITY_POWER_PER_LEVEL_DEFAULT = 300
export const ABILITY_MEEP_COST_PER_LEVEL_DEFAULT = 0.1
export const ABILITY_MEEP_COST_MIN_MULTIPLIER = 0.5
export const ABILITY_CPC_PER_LEVEL_DEFAULT = 0.25

// Shop / Production efficiency
export const SECONDS_PER_HOUR = 3600
export const EFFICIENCY_STARS_DIVISOR = 20
export const EFFICIENCY_STARS_MAX = 5
export const EFFICIENCY_STARS_MIN = 0.5
export const MODIFIER_COST_FRACTION = 0.5
export const MODIFIER_ROLL_COUNT = 3

// Augments
export const AUGMENT_CLICK_HISTORY_SIZE = 5
export const AUGMENT_GRAVITY_FLIP_DURATION_MS = 3000

// Combat / Damage floats — orbit radii for visual damage effects, not sun-relative
export const COMBAT_ORBIT_RADIUS_X_MIN = 130
export const COMBAT_ORBIT_RADIUS_X_RANGE = 65
export const COMBAT_ORBIT_Y_SCALE_MIN = 0.28
export const COMBAT_ORBIT_Y_SCALE_RANGE = 0.62
export const COMBAT_ORBIT_TILT_MAX_DEG = 180
export const COMBAT_ORBIT_SPEED_MIN = 0.00015
export const COMBAT_ORBIT_SPEED_RANGE = 0.00038
export const COMBAT_ORBIT_SAFE_Y = 90
export const COMBAT_FLOAT_DURATION_MS = 1000
export const COMBAT_FLOAT_OFFSET_Y = 30
export const COMBAT_FLOAT_OFFSET_X_SPREAD = 10

// Galaxy boss search
export const GALAXY_STARS_BASE_REQUIRED = 3
export const GALAXY_CHAMPION_ARRIVAL_SIGNAL_MS = 4000
export const GALAXY_STAR_FAILED_SIGNAL_MS = 2600 // "Star Lost" flash on the minimap
export const GALAXY_BOSS_SEARCH_SEG_MIN_MS = 3500
export const GALAXY_BOSS_SEARCH_SEG_RANGE_MS = 4500
export const GALAXY_BOSS_SEARCH_STEP_MIN = 0.07
export const GALAXY_BOSS_SEARCH_STEP_RANGE = 0.09
export const GALAXY_BOSS_SEARCH_BOUNDARY_MIN = 0.15
export const GALAXY_BOSS_SEARCH_BOUNDARY_MAX = 0.85
export const GALAXY_BOSS_TOTAL_SEARCH_MIN_MS = 15_000
export const GALAXY_BOSS_TOTAL_SEARCH_RANGE_MS = 45_000
export const GALAXY_BOSS_SPAWN_ANIM_MS = 5_000
export const GALAXY_BOSS_SEARCH_ANGLE_MIN_DEG = 60
export const GALAXY_BOSS_SEARCH_ANGLE_RANGE_DEG = 240

// ── Galaxy Tier & Champion Star Level (Tier redesign) ───────────────────────
// Two axes both derived from galaxyStore.currentGalaxy:
//  • Tier  — groups galaxies (T1 = G1-2, T2 = G3-5, T3 = G6-8, …) and gates
//            progression behind a Chimes + Material unlock cost.
//  • Star level — picks which champion pool spawns in a galaxy (Galaxy N → ★N).
//
// There are exactly 6 Champion Tiers (championTiers.ts), the spawn-pool axis the
// Shop/Select panels group by — set per champion via championTier, driving grouping
// + recruit cost. MAX_STAR_LEVEL is that count: tiers run ★1 (weakest, most champions)
// → ★6 (strongest, fewest). Tiers unlock cumulatively by galaxy progression
// (CHAMPION_TIER_REQUIRED_GALAXY) and, once unlocked, spawn together by weighted
// probability (TIER_SPAWN_WEIGHTS) — no longer one exact star level per galaxy.
export const MAX_STAR_LEVEL = 6

// Champion Tier → galaxy at which that tier unlocks (cumulatively). Index 0 = Tier 1
// (Galaxy 1, always available) … index 5 = Tier 6 (Galaxy 21). Once a tier's galaxy is
// reached it joins the weighted spawn pool AND is revealed in the Shop. A tier also
// auto-unlocks once the player owns/has discovered any champion of that tier, so a
// champion found via spawning is never stranded behind a far-off lock.
export const CHAMPION_TIER_REQUIRED_GALAXY: number[] = [1, 3, 6, 10, 15, 21]

// Spawn probability per Champion Tier, indexed by how many tiers are currently
// unlocked (row N-1 = N unlocked tiers). Tier 1 always has the highest share; each
// row is descending and sums to 100. As a new tier unlocks, lower tiers' shares drop.
export const TIER_SPAWN_WEIGHTS: number[][] = [
  [100], // 1 tier unlocked
  [70, 30], // 2 tiers
  [55, 30, 15], // 3 tiers
  [45, 27, 18, 10], // 4 tiers
  [38, 25, 18, 12, 7], // 5 tiers
  [33, 24, 18, 13, 8, 4], // 6 tiers
]

// Tier-unlock cost. Tier 1 is owned for free; cost applies from tier 2 upward.
// Chimes grow geometrically so each tier feels like a real milestone:
//   chimes(tier) = ceil(BASE * GROWTH^(tier - 2))   → 50k, 160k, 512k, …
export const TIER_UNLOCK_CHIMES_BASE = 50_000
export const TIER_UNLOCK_CHIMES_GROWTH = 3.2

// Material cost scales the same way from a flat base set:
//   amount(tier) = ceil(baseAmount * MATERIAL_GROWTH^(tier - 2))
export const TIER_UNLOCK_MATERIAL_GROWTH = 2
export const TIER_UNLOCK_MATERIAL_BASE: Record<string, number> = {
  nebula_quartz: 5,
  stardust: 4,
}

// Planet boss (extended)
export const BOSS_ENRAGE_BONUS_SECONDS_PER_STEP = 5
export const BOSS_ENRAGE_MIN_SECONDS = 10
export const BOSS_REWARD_CHIMES_MAX = 5
export const BOSS_REWARD_MATERIAL_CHANCE = 0.5
export const BOSS_REMOVAL_DELAY_MS = 600
export const BOSS_REMOVAL_LONG_DELAY_MS = 900
export const BOSS_UNIVERSE_PROGRESS_FRACTION = 0.3

// Star group / orbit randomization
export const STAR_PLANET_ORBIT_RX_MIN = 60
export const STAR_PLANET_ORBIT_RX_RANGE = 80
export const STAR_PLANET_ORBIT_RY_MIN = 25
export const STAR_PLANET_ORBIT_RY_RANGE = 45
export const STAR_PLANET_ORBIT_TILT_MAX = 0.35
export const STAR_SPAWN_ANGLE_MIN_PI = 0.15
export const STAR_SPAWN_ANGLE_RANGE_PI = 0.7
export const STAR_FORCED_PLANET_MIN = 1
export const STAR_FORCED_PLANET_RANGE = 4
export const STAR_REMOVAL_DELAY_MS = 1500
export const STAR_DESPAWN_DELAY_MS = 600 // delay from timer expiry to simultaneous star+planet removal
export const STAR_EXTRA_PLANET_MIN = 2
export const STAR_EXTRA_PLANET_RANGE = 2
export const CHAMPION_STAR_FIXED_ANGLE_FRAC_PI = 0.6
export const CHAMP_PLANET_ORBIT_RX_MIN = 65
export const CHAMP_PLANET_ORBIT_RX_RANGE = 75
export const CHAMP_PLANET_ORBIT_RY_MIN = 28
export const CHAMP_PLANET_ORBIT_RY_RANGE = 42
export const CHAMP_PLANET_ORBIT_TILT_MAX = 0.3
export const EXTRA_PLANET_ORBIT_RX_MIN = 55
export const EXTRA_PLANET_ORBIT_RX_RANGE = 85
export const EXTRA_PLANET_ORBIT_RY_MIN = 24
export const EXTRA_PLANET_ORBIT_RY_RANGE = 45
export const EXTRA_PLANET_ORBIT_TILT_MAX = 0.35
export const GALAXY_BOSS_STAR_ORBIT_RX = 300
export const GALAXY_BOSS_STAR_ORBIT_RY = 129
export const GALAXY_BOSS_STAR_ORBIT_TILT = 0.14
export const GALAXY_BOSS_PLANET_ORBIT_RX = 38
export const GALAXY_BOSS_PLANET_ORBIT_RY = 22
export const GALAXY_BOSS_PLANET_ORBIT_TILT = 0.1

// ── Galaxy-Boss Eskorten-Wellen ───────────────────────────────────────────
// Gesamtzahl der Eskorten-Sterne pro Galaxie: BASE + (galaxy-1) * PER_GALAXY,
// gedeckelt bei MAX. Sie erscheinen in Wellen à WAVE_SIZE — es sind also nie
// mehr als WAVE_SIZE Eskorten + Boss gleichzeitig im DOM (FPS-Schutz).
export const GALAXY_BOSS_ESCORT_BASE = 2
export const GALAXY_BOSS_ESCORT_PER_GALAXY = 1
export const GALAXY_BOSS_ESCORT_MAX = 12
export const GALAXY_BOSS_WAVE_SIZE = 3
export const GALAXY_BOSS_ESCORT_PLANET_ORBIT_RX = 30
export const GALAXY_BOSS_ESCORT_PLANET_ORBIT_RY = 17
export const GALAXY_BOSS_ESCORT_PLANET_ORBIT_TILT = 0.12

// Planeten-Anzahl im Endkampf — wie bei normalen Sternen zufällig:
// Bossstern: 1 Boss-Planet + MIN..MIN+RANGE-1 Zusatzplaneten (3-4 Fights),
// Eskorten: MIN..MIN+RANGE-1 Planeten (1-3 Fights).
export const GALAXY_BOSS_EXTRA_PLANET_MIN = 2
export const GALAXY_BOSS_EXTRA_PLANET_RANGE = 2
export const GALAXY_BOSS_ESCORT_PLANET_MIN = 1
export const GALAXY_BOSS_ESCORT_PLANET_RANGE = 3

// Der Bossstern zieht aus einer eigenen, epischen Palette statt der normalen
// Spektralfarben — tiefes Magenta/Violett hebt ihn von allen anderen ab.
export const GALAXY_BOSS_STAR_COLORS: [number, number, number][] = [
  [255, 72, 190],
  [186, 85, 255],
  [255, 96, 96],
]
// Eskorten: bedrohliche Rot-/Glut-Töne
export const GALAXY_BOSS_ESCORT_COLORS: [number, number, number][] = [
  [255, 74, 58],
  [255, 122, 40],
  [214, 52, 132],
]

/** Role UI colors derived from ROLES[].color — for ChampionSelector, Event Log, etc. */
export const ROLE_COLORS = Object.fromEntries(ROLES.map((r) => [r.key, r.color])) as Record<
  ChampionRole,
  string
>

// Expedition color system
export interface ExpeditionColorDef {
  key: string
  primary: string
  dim: string
  glowRgb: string
}

export const EXPEDITION_COLORS: ExpeditionColorDef[] = [
  { key: 'gold', primary: '#e8c040', dim: '#c89040', glowRgb: '232,192,64' },
  { key: 'celestial', primary: '#60b0f0', dim: '#3a7ab8', glowRgb: '96,176,240' },
  { key: 'arcane', primary: '#c080e0', dim: '#8040a8', glowRgb: '192,128,224' },
  { key: 'emerald', primary: '#4dc870', dim: '#2a7840', glowRgb: '77,200,112' },
  { key: 'ember', primary: '#e08050', dim: '#a04828', glowRgb: '224,128,80' },
  { key: 'frost', primary: '#70d0e8', dim: '#3080a0', glowRgb: '112,208,232' },
]

/** How long (ms) a spawned expedition slot is visible/available */
export const EXPEDITION_AVAILABILITY_DURATION_MS = 5 * 60 * 1000
/** Minimum interval (ms) between consecutive slot spawns */
export const EXPEDITION_SPAWN_INTERVAL_MS = 2 * 60 * 1000
/** Maximum number of simultaneously visible expedition slots */
export const EXPEDITION_MAX_AVAILABLE = 3
/** Time threshold (ms) below which a slot enters the "expiring soon" warning state */
export const EXPEDITION_EXPIRY_WARNING_MS = 30_000

// Expedition generation — tiers
export const EXPEDITION_TIERS = {
  common: { rewardMin: 80, rewardMax: 280, durMin: 30, durMax: 100, maxRoles: 2, powerBase: 50 },
  rare: { rewardMin: 280, rewardMax: 750, durMin: 60, durMax: 220, maxRoles: 3, powerBase: 120 },
  epic: { rewardMin: 750, rewardMax: 2800, durMin: 120, durMax: 380, maxRoles: 5, powerBase: 280 },
} as const
export type ExpeditionTier = keyof typeof EXPEDITION_TIERS

// Expedition generation — name parts
export const EXPEDITION_NAME_ADJECTIVES = [
  'Mystical',
  'Ancient',
  'Forgotten',
  'Spectral',
  'Cosmic',
  'Twilight',
  'Arcane',
  'Wandering',
  'Timeless',
  'Hidden',
]
export const EXPEDITION_NAME_TARGETS = [
  'Rift',
  'Freljord',
  'Void',
  'Ionia',
  'Summit',
  'Shrine',
  'Nexus',
  'Jungle',
  'Abyss',
  'Ruins',
]
export const EXPEDITION_NAME_ACTIONS = [
  'Expedition',
  'Patrol',
  'Raid',
  'Trek',
  'Odyssey',
  'Pilgrimage',
]

// Expedition generation — icon pool (thematic, all registered in USED_GAME_ICONS below)
export const EXPEDITION_ICON_POOL: string[] = [
  'game-icons:journey',
  'game-icons:interstellar-path',
  'game-icons:castle-ruins',
  'game-icons:dungeon-gate',
  'game-icons:lantern-flame',
  'game-icons:caravan',
  'game-icons:cave-entrance',
  'game-icons:mountain-road',
  'game-icons:elven-castle',
  'game-icons:forest',
]

// Expedition mechanics
/** Full-role-match synergy bonus multiplier */
export const EXPEDITION_ROLE_SYNERGY_BONUS = 1.0
/** Partial/no-role-match synergy penalty multiplier */
export const EXPEDITION_ROLE_SYNERGY_PENALTY = 0.6
/** Max additive power bonus cap in success calculation */
export const EXPEDITION_POWER_BONUS_CAP = 0.4
/** Scales power ratio into a bonus (powerRatio - 1) * this = bonus */
export const EXPEDITION_POWER_BONUS_SCALE = 0.2
/** Base success probability before role/power modifiers */
export const EXPEDITION_BASE_SUCCESS_CHANCE = 0.5
/** Fraction of base reward granted on expedition failure */
export const EXPEDITION_FAILURE_REWARD_FRACTION = 0.1

// Player state
/** HP percentage below which the "low HP" warning state activates */
export const PLAYER_LOW_HP_THRESHOLD_PCT = 25
/** Damage float number visibility duration (ms) */
export const DAMAGE_FLOAT_DURATION_MS = 1400

// Section navigation
/** Total number of sections in the game */
export const TOTAL_SECTIONS = 10

// Augments — Quantum Luck
/** 50/50 probability split for the Quantum Luck double-or-nullify branch */
export const QUANTUM_LUCK_THRESHOLD = 0.5

// Planet shop — damage reduction
/** Maximum fraction of boss damage that can be absorbed by shield-barrier planets */
export const BOSS_DAMAGE_REDUCTION_CAP = 0.8

// Battle simulation
/** Countdown shown on the result screen before auto-advance (seconds) */
export const BATTLE_RESULT_COUNTDOWN_SECONDS = 8
/** Pause duration on the result screen before proceeding (ms) — honor phase window */
export const BATTLE_RESULT_PAUSE_MS = 8000
/** Countdown tick interval for the pre-battle search-phase timer (ms) */
export const BATTLE_COUNTDOWN_INTERVAL_MS = 500
/** Duration of the planet-search warp animation (ms) — must match ANIM_DURATION in PlanetSearchComponent */
export const PLANET_SEARCH_ANIM_DURATION_MS = 5000
/** Extra margin after the planet-search animation duration before the RAF-fallback setTimeout fires (ms) */
export const PLANET_SEARCH_ANIM_FALLBACK_MARGIN_MS = 200
/** Reference duration multiplied by drain rate to reduce opponent power (seconds) */
export const BATTLE_DRAIN_REFERENCE_SECONDS = 30
/** Minimum effective opponent power as a fraction of its original value */
export const BATTLE_OPPONENT_POWER_MIN_FRACTION = 0.1
/** Player power multiplier applied when the Big Bang augment is consumed */
export const BATTLE_BIG_BANG_POWER_MULTIPLIER = 5

// Inventory
/** Default base probability for a material drop from a rescue planet */
export const MATERIAL_DROP_BASE_CHANCE = 0.3

// Heal floats (Support role — visual feedback)
/** Duration a heal float number remains visible (ms) */
export const HEAL_FLOAT_DURATION_MS = 1200
/** Y-offset applied upward from the heal target position (px) */
export const HEAL_FLOAT_Y_OFFSET = 35
/** Horizontal spread of the random player heal float position (px) */
export const HEAL_FLOAT_X_SPREAD = 60
/** Y-offset from the player planet center for player heal floats (px) */
export const HEAL_FLOAT_PLAYER_Y_OFFSET = 80

// Role behavior — animation durations
/** Duration of the Top champion intercept/shield-broken flash animation (ms) */
export const INTERCEPT_SHIELD_ANIM_MS = 500
/** Duration of the Jungle champion buff-granted flash animation (ms) */
export const JUNGLE_BUFF_FLASH_ANIM_MS = 450

// Event log
/** Maximum number of events kept in the live event log before trimming */
export const EVENT_LOG_MAX_SIZE = 12
/** Milliseconds before an event auto-dismisses from the log */
export const EVENT_LOG_DISMISS_MS = 7_000

// Projectile system
/** Total travel duration of a projectile shot (ms) */
export const PROJECTILE_SHOT_DURATION_MS = 520

// Gameplay — click base
export const CHIMES_PER_CLICK_BASE = 20

// ── Champion Tier recruit cost ───────────────────────────────────────────────
// The single Champion-Tier economy: Chimes recruit cost per star level (★1..★6).
// Index 0 = ★1 … index 5 = ★6. Strictly ascending. Read via getChampionChimesPrice
// (championTiers.ts). Replaces the old 5-tier CHIMES_PRICE_TIERS.
export const CHAMPION_TIER_CHIMES_PRICE: number[] = [500, 1400, 2800, 4500, 6500, 9500]

// Offline progress
export const OFFLINE_CPS_RATE = 0.6
export const OFFLINE_MAX_HOURS = 10
export const OFFLINE_MIN_SECONDS = 60

// CPS tracking periods (seconds) and update intervals (ms)
export const CPS_PERIOD_1MIN_S = 60
export const CPS_PERIOD_10MIN_S = 600
export const CPS_PERIOD_1HOUR_S = 3600
export const CPS_INTERVAL_10MIN_MS = 10_000
export const CPS_INTERVAL_1HOUR_MS = 60_000

// Battle — initial state
export const BATTLE_INITIAL_MMR = 1000
export const BATTLE_DEFAULT_RANK_TIER = 'Silver'

// Solar Upgrade Tree
export const SOLAR_STAR_SPEED_BONUS = 0.35
export const SOLAR_FLIGHT_BASE_COST = 200
export const SOLAR_FLIGHT_MULTIPLIER = 1.6
export const SOLAR_HP_BASE_COST = 150
export const SOLAR_HP_MULTIPLIER = 1.5
export const SOLAR_CPC_BASE_COST = 50
export const SOLAR_CPC_MULTIPLIER = 1.5
export const SOLAR_CPS_BASE_COST = 50
export const SOLAR_CPS_MULTIPLIER = 1.5
export const SOLAR_DMG_BASE_COST = 200
export const SOLAR_DMG_MULTIPLIER = 1.6
export const SOLAR_MAX_LEVELS = 6
export const SOLAR_HP_PER_LEVEL = 25
export const SOLAR_CPS_PER_LEVEL = 20
export const SOLAR_CPC_PER_LEVEL = 2
export const SOLAR_CPS_FLIGHT_BONUS = 0.1
export const SOLAR_DMG_BONUS = 0.25

// Star Evolution Phases (replaces chimes-threshold radius system)
export interface StarPhaseData {
  /** Unique Bardle name — one word, so it always fits the header without truncation */
  name: string
  /** Scientific star-phase term, shown as secondary context (tooltips) */
  astroName: string
  radius: number
  core: string
  mid: string
  edge: string
  glow1: string
  glow2: string
  glow3: string
  phasePrimary: string
  phaseGlow: string
  factor: number
  pulseSpeed: string
}

/** Minimum time (seconds) the sun must spend in each phase before it may evolve
 *  to the next one — index = current starPhase (evolutions 0→1 … 4→5).
 *  Ramp: 10min, 30min, 1.5h, 4h, 24h. Future upgrades can shorten these via
 *  solarUpgradeStore.dwellTimeMultiplier. */
export const STAR_PHASE_MIN_DWELL_SECONDS = [600, 1_800, 5_400, 14_400, 86_400]

/** Stellar-Evolution timeline (BardStatsTab): dot diameter = phase radius × this scale,
 *  so the timeline circles stay true to the in-game sun proportions (7.5px…35px). */
export const STATS_TAB_PHASE_DOT_SCALE = 0.25
/** Comet dot diameter (px) on the Stellar-Evolution timeline (BardStatsTab) —
 *  fixed tiny size below every sun dot, true to the comet being a small rock. */
export const STATS_TAB_COMET_DOT_PX = 8

// ── Star Forge (Shop tab) ─────────────────────────────────────────────────────
// Tree geometry — the tree lives on a square stage, nodes placed on 3 polar rings.
export const FORGE_STAGE_SIZE = 820
export const FORGE_RING_ROOT_R = 165
export const FORGE_RING_BRANCH_R = 285
export const FORGE_RING_LEAF_R = 385
export const FORGE_NODE_SIZE_ROOT = 56
export const FORGE_NODE_SIZE_BRANCH = 46
export const FORGE_NODE_SIZE_LEAF = 38
/** Branch nodes sit at their root's angle ± this offset (degrees). */
export const FORGE_BRANCH_ANGLE_OFFSET = 24

// Ring unlock gating (starPhase index)
export const FORGE_BRANCH_UNLOCK_PHASE = 2
export const FORGE_LEAF_UNLOCK_PHASE = 4
/** Branch max level at unlock; +1 per phase past the unlock phase, up to the cap
 *  → "old upgrades gain new tiers" with every sun evolution. */
export const FORGE_BRANCH_BASE_MAX_LEVEL = 3
export const FORGE_BRANCH_MAX_LEVEL_CAP = 5
export const FORGE_LEAF_MAX_LEVEL = 3
/** Parent level required before a child node can be bought. */
export const FORGE_BRANCH_PARENT_MIN_LEVEL = 1
export const FORGE_LEAF_PARENT_MIN_LEVEL = 2
/** Each leaf level amplifies its parent branch's effect by this fraction. */
export const FORGE_LEAF_AMPLIFY_PER_LEVEL = 0.25

// Relics & constellations
export const FORGE_RELIC_REQUIRED_BRANCH_LEVEL = 3
export const FORGE_CONSTELLATION_REQUIRED_LEVEL = 3

// Cosmic Bargain
export const FORGE_BARGAIN_RESTOCK_MS = 8 * 3_600_000
export const FORGE_BARGAIN_REROLL_MATERIAL = 'dark_matter'
export const FORGE_BARGAIN_REROLL_COST = 1

// Tree zoom (wheel + buttons). The default starts zoomed-in on the sun and
// its five core rays; zooming out reveals the branch and leaf rings.
export const FORGE_TREE_ZOOM_MIN = 0.55
export const FORGE_TREE_ZOOM_MAX = 2.2
export const FORGE_TREE_ZOOM_STEP = 0.15
export const FORGE_TREE_ZOOM_DEFAULT = 1.7

// ── Battle Sigil (Team tab) ───────────────────────────────────────────────────
// Sigil geometry — the sigil lives on a square stage; the 5 role nodes sit on a
// pentagon (Top at 12 o'clock, ROLES order clockwise), each with a constellation
// arc of ALLIES_PER_ROLE ally satellites placed outward around the role node.
export const SIGIL_STAGE_SIZE = 900
export const SIGIL_PENTAGON_RADIUS = 300
export const SIGIL_ALLY_RADIUS = 395
/** Total angular span (degrees) of the ally constellation arc, centered on the role's pentagon angle. */
export const SIGIL_ALLY_ARC_DEG = 44
export const SIGIL_NODE_SIZE = 94
export const SIGIL_ALLY_SIZE = 44
export const SIGIL_CREST_SIZE = 170
/** SVG ring radii (stage coordinates, center = SIGIL_STAGE_SIZE / 2). */
export const SIGIL_RING_OUTER_R = 430
export const SIGIL_RING_RUNE_R = 360
export const SIGIL_RING_INNER_R = 180
export const SIGIL_RING_CORE_R = 120

/** Extra zoom multiplier while a role is focused (camera zoom-in on role + allies). */
export const TEAM_SIGIL_FOCUS_ZOOM = 1.6
/** Camera pan/zoom transition duration (ms) — mirrored in SigilBoardComponent CSS. */
export const TEAM_SIGIL_CAMERA_MS = 450
/** Width (px) of the role details panel — the board's fit-scale subtracts it while
 *  a role is selected so open/close resolves in a single camera move. */
export const TEAM_SIGIL_DETAILS_PANEL_WIDTH = 460
/** Height (px) of the details-panel splash header (hero card: name + tier/origin/trait chips). */
export const TEAM_SIGIL_SPLASH_HEIGHT = 292
/** Max camera drag-pan as a fraction of the scaled stage size (rubber-band bound). */
export const TEAM_SIGIL_PAN_MAX_FRACTION = 0.15
/** Pointer travel (px) below which a pointer-down still counts as a click, not a drag. */
export const TEAM_SIGIL_DRAG_THRESHOLD_PX = 5
/** Ally-hover spotlight — hovering an ally row in the details panel mirrors onto
 *  the board: the matching satellite scales up + pings once, its siblings dim. */
export const SIGIL_ALLY_HOVER_SCALE = 1.4
export const SIGIL_ALLY_HOVER_DIM_OPACITY = 0.45
export const SIGIL_ALLY_HOVER_PING_MS = 450

// ── Champion skins (Team tab) ─────────────────────────────────────────────────
/** Skin file basename of the default look. Selecting it (or having no entry in
 *  skinStore) renders the classic champion icon from /img/champion/. */
export const SKIN_ORIGINAL = 'OriginalSkin'
/** Aspect ratio of bundled splash arts (1280×~730) — skin gallery cards. */
export const SKIN_CARD_ASPECT_RATIO = '16 / 9'
/** Skin gallery grid — min card width (px); the grid auto-fills columns. */
export const SKIN_CARD_MIN_WIDTH = 300

// Sigil escalation — the sigil grows more epic with every filled slot:
// each main lights its pentagon vertex + spoke, each ally lights a rune tick,
// each full role (main + all allies) gains a spinning aura; global stages below
// escalate crest/rings/embers by total filled slots (0..SIGIL_TOTAL_SLOTS).
export const SIGIL_TOTAL_SLOTS = ROLES.length * (1 + ALLIES_PER_ROLE)
export const SIGIL_POWER_PER_STAR = 100
export const SIGIL_ALLY_POWER_PER_STAR = 25
/** Pentagram overlay appears once all 5 mains are set. */
export const SIGIL_PENTAGRAM_AT_MAINS = 5
/** Full mandala (all decorations) at a complete team. */
export const SIGIL_MANDALA_AT_FILLED = SIGIL_TOTAL_SLOTS
/** Unlit color for pentagon vertices, spokes and rune ticks. */
export const SIGIL_DIM_COLOR = '#3a2a12'
export const SIGIL_STAGES: SigilStageDef[] = [
  {
    name: 'Dormant',
    minFilled: 0,
    crestColor: '#8a7448',
    ringColor: '#3a2a12',
    pulseSec: 0,
    spinSec: 90,
    emberCount: 0,
    extraRings: 0,
  },
  {
    name: 'Kindled',
    minFilled: 1,
    crestColor: '#c89040',
    ringColor: '#5c3310',
    pulseSec: 4.5,
    spinSec: 70,
    emberCount: 4,
    extraRings: 0,
  },
  {
    name: 'Ascendant',
    minFilled: 5, // all 5 mains set
    crestColor: '#e8c060',
    ringColor: '#7a4e20',
    pulseSec: 3.5,
    spinSec: 50,
    emberCount: 8,
    extraRings: 1,
  },
  {
    name: 'Radiant',
    minFilled: 18,
    crestColor: '#f0d870',
    ringColor: '#c89040',
    pulseSec: 2.5,
    spinSec: 35,
    emberCount: 12,
    extraRings: 2,
  },
  {
    name: 'Eternal',
    minFilled: 30, // full 30/30 team
    crestColor: '#ffe9a0',
    ringColor: '#e8c060',
    pulseSec: 1.8,
    spinSec: 22,
    emberCount: 18,
    extraRings: 2,
  },
]
/** Ember particles orbit between these radii (deterministic golden-angle spread). */
export const SIGIL_EMBER_MIN_R = 130
export const SIGIL_EMBER_R_SPREAD = 190

export const STAR_PHASE_DATA: StarPhaseData[] = [
  {
    name: 'Spark',
    astroName: 'Protostar',
    radius: 38,
    core: '#fff0e0',
    mid: '#ffd4a3',
    edge: '#cc5500',
    glow1: '#ff8c42',
    glow2: '#cc5500',
    glow3: '#882200',
    phasePrimary: '#ffd4a3',
    phaseGlow: '#ff8c42',
    factor: 0.9,
    pulseSpeed: '4s',
  },
  {
    name: 'Prelude',
    astroName: 'Main Sequence (Young)',
    radius: 50,
    core: '#ffffff',
    mid: '#a8d8ff',
    edge: '#3a70c0',
    glow1: '#7bb8ff',
    glow2: '#4a90d9',
    glow3: '#2050a0',
    phasePrimary: '#a8d8ff',
    phaseGlow: '#7bb8ff',
    factor: 1.0,
    pulseSpeed: '5s',
  },
  {
    name: 'Crescendo',
    astroName: 'Main Sequence (Mature)',
    radius: 64,
    core: '#fffce0',
    mid: '#fff176',
    edge: '#d4a000',
    glow1: '#ffd600',
    glow2: '#cc9900',
    glow3: '#886600',
    phasePrimary: '#fff176',
    phaseGlow: '#ffd600',
    factor: 1.1,
    pulseSpeed: '5s',
  },
  {
    name: 'Swell',
    astroName: 'Subgiant',
    radius: 84,
    core: '#fff0c0',
    mid: '#ffb347',
    edge: '#cc5500',
    glow1: '#ff8c00',
    glow2: '#cc5500',
    glow3: '#882200',
    phasePrimary: '#ffb347',
    phaseGlow: '#ff8c00',
    factor: 1.2,
    pulseSpeed: '4s',
  },
  {
    name: 'Requiem',
    astroName: 'Red Giant',
    radius: 110,
    core: '#ffb0b0',
    mid: '#ff4d4d',
    edge: '#990000',
    glow1: '#cc0000',
    glow2: '#880000',
    glow3: '#440000',
    phasePrimary: '#ff4d4d',
    phaseGlow: '#cc0000',
    factor: 1.35,
    pulseSpeed: '3s',
  },
  {
    name: 'Finale',
    astroName: 'Supernova',
    radius: 140,
    core: '#ffffff',
    mid: '#e8b0ff',
    edge: '#8000cc',
    glow1: '#c060ff',
    glow2: '#8000cc',
    glow3: '#400066',
    phasePrimary: '#e8b0ff',
    phaseGlow: '#c060ff',
    factor: 1.6,
    pulseSpeed: '1.5s',
  },
]

// ── Sun phase display numbering ──────────────────────────────────────────────
// The Comet counts as display phase 1, so sun phases render as
// starPhase + SUN_PHASE_DISPLAY_OFFSET (Spark = 2 … Finale = 7).
export const SUN_PHASE_DISPLAY_OFFSET = 2
export const SUN_PHASE_DISPLAY_TOTAL = STAR_PHASE_DATA.length + 1 // comet + sun phases

// ── Comet Origin State (pre-phase before Spark) ──────────────────────────────
/** The player's celestial body BEFORE its first ignition: a wandering comet with
 *  Bard asleep inside. Not part of STAR_PHASE_DATA on purpose — prepending there
 *  would shift every saved starPhase index. solarUpgradeStore.isCometState flags
 *  this origin state instead; the first Star Forge evolve ("Ignition") clears it. */
export const COMET_PHASE_DATA = {
  name: 'Comet',
  astroName: 'Rogue Planetesimal',
  core: '#8a7a68',
  mid: '#6b5d4f',
  edge: '#4a4038',
  crater: '#3a322b',
  /** Accent golds match Bard's UI gold (titles/chimes in the header, #e8c040). */
  glow: '#e8c040',
  accent: '#f0d878',
  dust: '#8a6420',
  tumbleSec: '14s',
  pulseSpeed: '6s',
} as const

/** Minimum drift time (seconds) before the comet may ignite into Spark. */
/** Comet growth per Star Forge core ray at Lv 1+ (index 0..5 = rays kindled).
 *  Radius stays well below Spark's 38 — ignition must feel like a jump. */
export const COMET_STAGE_RADII = [16, 18, 20, 22, 24, 26]

/** Orbit visuals (planet/champion/star orbits, sprites, ring strokes) grow slower
 *  than the sun itself. Up to the anchor radius (largest comet stage) they track
 *  the sun 1:1; above it every extra sun pixel only contributes
 *  ORBIT_SUN_GROWTH_FACTOR pixels of effective orbit radius. Keeps late star
 *  phases from crowding the viewport while orbits still grow every phase. */
export const ORBIT_SUN_SCALE_ANCHOR_RADIUS = COMET_STAGE_RADII[COMET_STAGE_RADII.length - 1]
export const ORBIT_SUN_GROWTH_FACTOR = 0.7
/** Gold-accent intensity per stage (0 = bare grey rock, 1 = fully gilded). */
export const COMET_STAGE_GOLD = [0, 0.2, 0.4, 0.6, 0.8, 1]

export const COMET_MIN_DWELL_SECONDS = 180
/** Background star drift is boosted by this factor while in comet state, selling
 *  the impression that the comet races through space. */
export const COMET_DRIFT_SPEED_MULT = 2.5
/** Parallax debris rocks streaming past the player on the background canvas. */
export const COMET_DEBRIS_COUNT = 3
export const COMET_DEBRIS_MIN_R = 3
export const COMET_DEBRIS_MAX_R = 9
/** Debris moves this much faster than regular background stars. */
export const COMET_DEBRIS_SPEED_MULT = 1.6

// ── Flight Wake ───────────────────────────────────────────────────────────────
/** Camera perspective: the viewer sits BEHIND the player's celestial body,
 *  which flies straight INTO the screen (the background stars spawn at center
 *  and stream radially outward past the viewer). Shed material therefore comes
 *  AT the camera — on the 2D screen it reads as motes/streaks expanding
 *  radially outward, growing and fading, using the same motion language as
 *  the starfield. Active in EVERY phase (comet and all sun phases), tinted in
 *  the current phase color: the player is always in flight. */
/** Speed lines shooting radially off the disc toward the viewer (CSS). */
export const FLIGHT_LINE_COUNT = 8
/** Radial reach of the lines relative to the disc diameter — kept short: the
 *  lines form a tight wake ring around the player; the far-field motion is
 *  the job of the ambient/burst streaks on the background canvas. */
export const FLIGHT_LINE_REACH_FACTOR = 0.85
/** Line intensity gain per progression step (cometStage / starPhase). */
export const FLIGHT_LINE_STAGE_BONUS = 0.25
/** Base line length relative to the disc diameter. */
export const FLIGHT_LINE_BASE_LEN_FACTOR = 0.16
/** Line thickness in px. */
export const FLIGHT_LINE_THICKNESS = 2
/** End scaleX of a line — it stretches while flying out (parallax growth). */
export const FLIGHT_LINE_GROW_SCALE = 1.7
/** Radial phase-tinted streaks on the background canvas — they ride the same
 *  center-outward flow as the stars, reinforcing the parallax. */
export const FLIGHT_STREAK_COUNT = 10
/** Streaks run this much faster than regular background stars. */
export const FLIGHT_STREAK_SPEED_MULT = 1.4
/** Streak line length relative to per-frame travel (cf. warp streak 2.2). */
export const FLIGHT_STREAK_LEN_FACTOR = 2.6
/** Peak alpha of a streak — background accent, never foreground noise. */
export const FLIGHT_STREAK_ALPHA = 0.18
/** Streak bursts: every few seconds a gust of bright, long speed lines rushes
 *  past — a calm→gust→calm rhythm sells the motion far better than a constant
 *  glare would in a game that sits on screen for hours. */
export const FLIGHT_BURST_INTERVAL_MIN_SEC = 6
export const FLIGHT_BURST_INTERVAL_MAX_SEC = 12
/** Streaks per gust. */
export const FLIGHT_BURST_STREAK_MIN = 3
export const FLIGHT_BURST_STREAK_MAX = 6
/** Peak alpha of a burst streak — clearly visible, unlike the ambient ones. */
export const FLIGHT_BURST_ALPHA = 0.4
/** Burst streaks run this much faster than regular background stars. */
export const FLIGHT_BURST_SPEED_MULT = 2.4
/** Burst line length relative to per-frame travel (ambient uses 2.6). */
export const FLIGHT_BURST_LEN_FACTOR = 7
/** Outer stroke width of a burst streak; the hot white core is thinner. */
export const FLIGHT_BURST_WIDTH = 2.5

// ── Background comets ─────────────────────────────────────────────────────────
/** Rare ambient comets streaking diagonally across the star background canvas.
 *  Unlike the radial flight streaks (player motion), these are "environment":
 *  free cartesian flights, deliberately infrequent so they stay special in a
 *  game that idles on screen for hours. */
export const COMET_BG_MAX_COUNT = 5
/** Seconds between comet sky events (randomized within this range). */
export const COMET_BG_INTERVAL_MIN_SEC = 8
export const COMET_BG_INTERVAL_MAX_SEC = 20
/** Comets per sky event — index = count-1. Mostly 1, a 5-comet "meteor
 *  moment" is the rare jackpot. */
export const COMET_BG_COUNT_WEIGHTS = [0.62, 0.24, 0.09, 0.035, 0.015]
/** Extra cooldown per additional comet in an event, so multi-events don't
 *  raise the average comet rate — overall rarity stays constant. */
export const COMET_BG_EVENT_COOLDOWN_BONUS_SEC = 6
/** Max random entry delay (s) per comet in a multi-event — staggered arrivals
 *  read as "the sky comes alive", not a synchronized volley. */
export const COMET_BG_STAGGER_MAX_SEC = 1.8
/** First comet after load appears sooner, so the effect is discoverable. */
export const COMET_BG_FIRST_DELAY_MIN_SEC = 3
export const COMET_BG_FIRST_DELAY_MAX_SEC = 8
/** Head speed in px/s. */
export const COMET_BG_SPEED_MIN = 550
export const COMET_BG_SPEED_MAX = 1100
/** Tail length in px. */
export const COMET_BG_TAIL_MIN = 90
export const COMET_BG_TAIL_MAX = 260
/** Core stroke width of head/tail in px. */
export const COMET_BG_WIDTH_MIN = 1.5
export const COMET_BG_WIDTH_MAX = 3
/** Partial-burn comets live this long — fade in, burn out mid-screen. */
export const COMET_BG_PARTIAL_LIFE_MIN_SEC = 1.2
export const COMET_BG_PARTIAL_LIFE_MAX_SEC = 2.5
/** Behavior variant weights: crossing / partial burn / slow drifter /
 *  fast flash / arc comet. */
export const COMET_BG_VARIANT_WEIGHTS = {
  crossing: 0.4,
  partial: 0.3,
  drifter: 0.12,
  flash: 0.12,
  arc: 0.06,
} as const
/** Twin flourish odds — only on single-comet crossing events. */
export const COMET_BG_TWIN_CHANCE = 0.15
/** Slow drifter: majestic distant comet — slow, long dim tail. */
export const COMET_BG_DRIFTER_SPEED_MIN = 120
export const COMET_BG_DRIFTER_SPEED_MAX = 260
export const COMET_BG_DRIFTER_TAIL_MULT = 1.6
export const COMET_BG_DRIFTER_ALPHA_MULT = 0.7
/** Fast flash: blink-and-miss streak — very fast, thin, bright core. */
export const COMET_BG_FLASH_SPEED_MIN = 1500
export const COMET_BG_FLASH_SPEED_MAX = 2000
export const COMET_BG_FLASH_TAIL_MULT = 0.6
export const COMET_BG_FLASH_ALPHA_MULT = 1.3
/** Arc comet: velocity rotates by this rate (rad/s) → visibly curved path. */
export const COMET_BG_ARC_TURN_RATE_MIN = 0.15
export const COMET_BG_ARC_TURN_RATE_MAX = 0.45
/** Curved paths are longer — lifetime safety margin for arc comets. */
export const COMET_BG_ARC_LIFE_MARGIN = 1.25
/** Share of crossings heading top-left → bottom-right (the signature flight);
 *  the rest picks evenly from the remaining headings. */
export const COMET_BG_DIAGONAL_CHANCE = 0.45
/** Random per-comet deviation from the base heading (radians, ± ≈ 20°). */
export const COMET_BG_ANGLE_JITTER_RAD = 0.35
/** Alpha envelope of partial burns: fade-in / fade-out fractions of life. */
export const COMET_BG_FADE_IN_FRAC = 0.15
export const COMET_BG_FADE_OUT_FRAC = 0.3
/** Peak alpha of the tail's outer (tinted) stroke. */
export const COMET_BG_ALPHA = 0.55
/** Twin companion: perpendicular offset range (px) and size/speed ratio. */
export const COMET_BG_TWIN_OFFSET_MIN = 40
export const COMET_BG_TWIN_OFFSET_MAX = 80
export const COMET_BG_TWIN_SCALE = 0.6
/** White-mix applied to the dark galaxy nebula color → pastel comet tint. */
export const COMET_BG_TINT_WHITE_MIX = 0.55

// ── Planet Tab stage sizing ───────────────────────────────────────────────────
/** Sun image diameter (px) in the Planet Tab at the smallest phase radius. */
export const PLANET_TAB_SUN_MIN_DIAMETER = 340
/** Sun image diameter (px) in the Planet Tab at the largest phase radius. */
export const PLANET_TAB_SUN_MAX_DIAMETER = 560
/** Fixed base diameter (px) of the orbiting planet image (kept small vs. the sun). */
export const PLANET_TAB_PLANET_DIAMETER = 112

// ── Bard Stats Tab starfield ──────────────────────────────────────────────────
/** Generated backdrop starfield on the Star Forge stage (BardStatsTab).
 *  Seeded PRNG keeps the layout stable across renders — change SEED to reshuffle. */
export const STATS_TAB_STARFIELD = {
  /** total stars across all drift layers */
  COUNT: 130,
  /** fixed PRNG seed */
  SEED: 20260703,
  SIZE_MIN_PX: 1,
  SIZE_MAX_PX: 3.2,
  /** stars at least this big get a glow halo */
  BRIGHT_THRESHOLD_PX: 2.4,
  /** size cutoffs that split stars into slow/mid/fast drift layers (parallax by depth) */
  LAYER_SIZE_CUTOFFS_PX: [1.75, 2.5],
  OPACITY_MIN: 0.25,
  OPACITY_MAX: 0.9,
  TWINKLE_MIN_S: 3,
  TWINKLE_MAX_S: 9,
  /** share of stars tinted in the current phase color */
  PHASE_TINT_SHARE: 0.08,
  /** share of stars tinted cool blue */
  BLUE_TINT_SHARE: 0.06,
} as const

// ── Admin ─────────────────────────────────────────────────────────────────────
/** Max augment selections queued by a single admin level grant (keeps a "+500 levels" from queueing 500 modals) */
export const ADMIN_LEVEL_AUGMENT_QUEUE_MAX = 10

// ── UI Timing ─────────────────────────────────────────────────────────────────
export const TOAST_DURATION_MS = 800

// ── Unified shop quick-jump (ChampionShopComponent) ──────────────────────────
/** Gap kept above the items section after a jump scroll (px). */
export const SHOP_JUMP_SCROLL_OFFSET_PX = 8
/** Items count as "active" once their section top passes this viewport share. */
export const SHOP_JUMP_SPY_THRESHOLD = 0.4
/** Scroll-spy stays locked this long after a jump so smooth-scroll can settle. */
export const SHOP_JUMP_SPY_LOCK_MS = 700
/** Corrective scroll runs after the section expand animation (0.28s) settles. */
export const SHOP_JUMP_EXPAND_SETTLE_MS = 350

// ── Music ─────────────────────────────────────────────────────────────────────
export const MUSIC_DEFAULT_VOLUME = 0.1
export const MUSIC_FADE_DURATION_MS = 1500
export const MUSIC_STORAGE_KEY = 'bard-music-settings'
export const BOSS_MUSIC_PATH = '/audio/StarBossMusic.ogg'
export const BOSS_MUSIC_VOLUME = 0.05
export const BOSS_MUSIC_FADE_MS = 800

// ── SFX ───────────────────────────────────────────────────────────────────────
export const SFX_CHIME_GAIN = 0.1
export const SFX_CHIME_MAIN_FREQ = 130
export const SFX_CHIME_OVERTONE_FREQ = 261
export const SFX_CHIME_MOD_FREQ = 4
export const SFX_CHIME_MOD_DEPTH = 8
export const SFX_CHIME_ATTACK_S = 0.003
export const SFX_CHIME_DECAY_S = 0.4
export const SFX_CHIME_OVERTONE_DELAY_S = 0.01
export const SFX_CHIME_OVERTONE_DECAY_S = 0.32
export const SFX_CHIME_SUB_FREQ = 55
export const SFX_CHIME_SUB_GAIN = 0.18
export const SFX_CHIME_SUB_DECAY_S = 0.22

// ── Central Chime click feedback ──────────────────────────────────────────────
// Juicy click response for the central sun chime (IdleGameComponent). Distances
// and sizes are multipliers of planetShopStore.currentSunRadius so the effect
// scales with the sun.
export const CHIME_BURST_COUNT = 5 // mini chimes spawned per click
export const CHIME_BURST_DURATION_MS = 650 // burst fly-out + fade (also cleanup timeout)
export const CHIME_RIPPLE_DURATION_MS = 500 // ripple ring expand/fade
export const CHIME_BURST_DIST_MIN_FACTOR = 1.1 // min travel distance (× sun radius)
export const CHIME_BURST_DIST_MAX_FACTOR = 2.0 // max travel distance (× sun radius)
export const CHIME_BURST_SIZE_FACTOR = 0.45 // mini-chime size (× sun radius)

// ── Admin / Debug ─────────────────────────────────────────────────────────────
export const ADMIN_QUICK_RESOURCE_AMOUNT = 100_000_000_000

// Admin Galaxy Jump — warp-flash duration (ms) after teleporting to a galaxy
export const GALAXY_JUMP_WARP_MS = 420

// Champion badge tooltip — max visible entries before "+N more" overflow
export const CHAMP_TOOLTIP_MAX_VISIBLE = 5

// ── Notify-badge hover tooltips (RpgBadgeTooltip) ────────────────────────────
// Shared behaviour of every badge tooltip: gap between anchor and panel,
// minimum distance kept to the viewport edges (clamping), and the grace
// period before hiding so the pointer can travel into the panel.
export const BADGE_TOOLTIP_GAP_PX = 8
export const BADGE_TOOLTIP_VIEWPORT_MARGIN_PX = 8
// Short grace period so the pointer can travel from badge into the panel —
// kept tight so leaving a badge closes its tooltip without feeling laggy.
export const BADGE_TOOLTIP_HIDE_DELAY_MS = 80
// Caret is kept at least this far away from the panel's rounded corners.
export const BADGE_TOOLTIP_CARET_INSET_PX = 12
// Larger gap for the center-chimes level tooltip: the arc-level badge hangs
// below the chimes box and would otherwise be covered by the panel.
export const CENTER_CHIMES_TOOLTIP_GAP_PX = 40
// The new-champions tooltip colors names + role tags via ROLE_BY_KEY — the
// game-wide role palette (orbit, shop, roster).

// Header notification badges — placed along the center-arc ellipse with a
// UNIFORM edge-to-edge pixel gap between neighbours (level badge at the arc
// apex → forge → champion on the right, expedition mirrored left). Positions
// are solved numerically in AppHeaderComponent from the measured arc size, so
// the visible gap is identical between every pair at every desktop resolution.
// Badge diameter mirror of the .header-notif-badge CSS clamp(20px,1.8vw,36px):
export const HEADER_NOTIF_BADGE_MIN_PX = 20
export const HEADER_NOTIF_BADGE_VW = 0.018
export const HEADER_NOTIF_BADGE_MAX_PX = 36
// Edge gap between neighbouring badges as a fraction of the badge diameter.
export const HEADER_BADGE_EDGE_GAP_FRAC = 0.5

// Champion Shop — Chimes cost badge icon
export const CHIMES_COST_ICON = 'game-icons:windchimes'

// ── Icon Registry ─────────────────────────────────────────────────────────────
// All game-icons used in the project. Add new icons here before using them
// to ensure uniqueness across the codebase.
export const USED_GAME_ICONS = new Set<string>([
  // Traits
  'game-icons:stars-stack',
  'game-icons:crystal-ball',
  'game-icons:stiletto',
  'game-icons:fairy-wand',
  'game-icons:crossed-swords', // Traits & Combat DPS row (BardStatsTab Star Forge stage)
  'game-icons:shield',
  'game-icons:trophy',
  'game-icons:ghost',
  'game-icons:crescent-blade',
  'game-icons:magic-swirl',
  'game-icons:oak-leaf',
  'game-icons:scythe',
  'game-icons:scroll-unfurled',
  'game-icons:gems',
  'game-icons:telescope',
  // Origins
  'game-icons:mushroom',
  'game-icons:anchor',
  'game-icons:round-shield',
  'game-icons:lotus-flower',
  'game-icons:vine-leaf',
  'game-icons:battle-axe',
  'game-icons:cog',
  'game-icons:crowned-skull',
  'game-icons:great-pyramid',
  'game-icons:mountains',
  'game-icons:snowflake-1',
  'game-icons:suckered-tentacle',
  'game-icons:gas-mask',
  // Active Buffs Panel
  'game-icons:lyre',
  'game-icons:hand',
  'game-icons:empty-hourglass',
  'game-icons:treasure-map',
  'game-icons:stone-wall',
  'game-icons:turtle',
  // Synergies — Elemental
  'game-icons:frozen-ring',
  'game-icons:eclipse',
  'game-icons:fire-bomb',
  'game-icons:sparkles',
  'game-icons:water-drop',
  'game-icons:cliff-crossing',
  'game-icons:shooting-star',
  // Synergies — Lore Bonds
  'game-icons:lightning-bolt',
  'game-icons:sun',
  'game-icons:whirlwind',
  'game-icons:rose',
  'game-icons:pistol',
  'game-icons:chain',
  'game-icons:all-seeing-eye',
  'game-icons:scales',
  'game-icons:card-joker',
  'game-icons:crossbones',
  'game-icons:sword',
  'game-icons:fish',
  'game-icons:fox-head',
  'game-icons:bomb-explosion',
  // Synergies — Special
  'game-icons:orbit',
  'game-icons:star-formation',
  'game-icons:diamond',
  // Curses
  'game-icons:skull-crossed-bones',
  'game-icons:sword-wound',
  'game-icons:death-zone',
  'game-icons:ice-bolt',
  'game-icons:death-skull',
  // Battle Ranks
  'game-icons:nails',
  'game-icons:rusty-sword',
  'game-icons:sword-hilt',
  'game-icons:gold-bar',
  'game-icons:diamond-hard',
  'game-icons:leaf-skeleton',
  'game-icons:cube',
  'game-icons:crown',
  'game-icons:trident',
  'game-icons:lightning-shout',
  'game-icons:bullseye',
  // Battle stat visuals (BATTLE_STAT_GAME_ICONS — ScoreTopBar, BottomScoreboard, BattleLandingScreen)
  'game-icons:minions', // CS / team creep score
  'game-icons:sabers-choc', // damage dealt
  // RiftMinimap jungle buff camps
  'game-icons:golem-head', // Blue Buff sentinel marker
  'game-icons:lizardman', // Red Buff brambleback marker
  // Battle Result Modal
  'game-icons:trophy-cup',
  'game-icons:skull',
  // Hardcoded Icons (templates)
  'game-icons:fire-ray',
  'game-icons:broadsword',
  'game-icons:lightning-storm',
  // Items
  'game-icons:leather-armor',
  'game-icons:lamellar',
  'game-icons:chain-mail',
  'game-icons:checked-shield',
  'game-icons:dragon-head',
  'game-icons:ringed-planet',
  'game-icons:potion',
  'game-icons:necklace',
  'game-icons:crystal-shine',
  'game-icons:crystal-wand',
  'game-icons:stopwatch',
  'game-icons:black-hole-bolas',
  // Expeditions
  'game-icons:plain-dagger',
  'game-icons:dragon-spiral',
  'game-icons:sword-brandish',
  'game-icons:tornado',
  'game-icons:fire-dash',
  'game-icons:castle',
  'game-icons:eye-target',
  'game-icons:alien-stare',
  'game-icons:explosion-rays',
  // Sets
  'game-icons:crystal-cluster',
  'game-icons:nebula',
  // Universes
  'game-icons:vortex',
  'game-icons:star-swirl',
  'game-icons:spectre',
  'game-icons:icicles-aura',
  'game-icons:solar-system',
  'game-icons:yin-yang',
  'game-icons:sword-altar',
  'game-icons:gear-hammer',
  // Augments (rendered)
  'game-icons:harp',
  'game-icons:ringing-bell',
  'game-icons:sword-in-stone',
  'game-icons:ancient-columns',
  'game-icons:paw-print',
  'game-icons:path-distance',
  'game-icons:music-spell',
  'game-icons:biceps',
  'game-icons:hot-beverage',
  'game-icons:open-palm',
  'game-icons:gold-coin',
  'game-icons:wave-crest',
  'game-icons:lightning-arc',
  'game-icons:roman-shield',
  'game-icons:hammer',
  'game-icons:compass',
  'game-icons:drum',
  'game-icons:horseshoe',
  'game-icons:pocket-watch',
  'game-icons:bright-explosion',
  'game-icons:planet-conquest',
  'game-icons:royal-crown',
  'game-icons:fireworks',
  'game-icons:time-trap',
  'game-icons:void',
  'game-icons:falling-star',
  'game-icons:ancient-ruins',
  'game-icons:infinity',
  'game-icons:gravity',
  'game-icons:jester-hat',
  'game-icons:dice-six-faces-random',
  'game-icons:loudspeaker',
  'game-icons:keyboard',
  // Planet Roles
  'game-icons:archery-target',
  'game-icons:wheat',
  'game-icons:rocket-thruster',
  'game-icons:hourglass',
  'game-icons:tower',
  // Encyclopedia — category icons (config/encyclopedia/*)
  'game-icons:galaxy', // Galaxies category
  'game-icons:stone-path', // Sections entry (worldAndMeta.ts)
  'game-icons:sword-spade', // Items & Sets category
  'game-icons:solar-power', // Sun & Star Forge category
  'game-icons:tree-growth', // Meep Skill Tree category
  'game-icons:visored-helm', // Champions & Team category
  'game-icons:orbital-rays', // Orbit Combat category
  'game-icons:crossed-slashes', // Star Fights category
  'game-icons:orbital', // Planet Slots category
  'game-icons:divided-spiral', // Prestige & Universes category
  // Encyclopedia — entry icons (config/encyclopedia/*)
  'game-icons:life-support', // Sun HP entry
  'game-icons:progression', // Level System entry
  'game-icons:gift-of-knowledge', // Augments entry
  'game-icons:card-random', // Augment Pool entry
  'game-icons:village', // Chime Buildings entry
  'game-icons:meteor-impact', // Comet Origin entry
  'game-icons:sunset', // Sun Phases entry
  'game-icons:beam-wake', // Solar Rays entry
  'game-icons:tree-branch', // Forge Branches entry
  'game-icons:falling-leaf', // Forge Leaves entry
  'game-icons:anvil', // Relics entry
  'game-icons:north-star-shuriken', // Constellations entry
  'game-icons:trade', // Cosmic Bargain entry
  'game-icons:sprout', // Meep Skill Tree entry
  'game-icons:pan-flute', // Melody Branch entry
  'game-icons:drum-kit', // Resonance Branch entry
  'game-icons:ufo', // Cosmos Branch entry
  'game-icons:war-axe', // Battle Branch entry
  'game-icons:guards', // Warden Branch entry
  'game-icons:stone-sphere', // Orbit Slots entry
  'game-icons:gears', // Planet Roles entry
  'game-icons:ascending-block', // Attunement entry
  'game-icons:jungle', // Jungle Buffs entry
  'game-icons:tv', // Auto-Battle entry
  'game-icons:perspective-dice-six-faces-random', // Win Probability entry
  'game-icons:podium', // MMR & Ranks entry
  'game-icons:flying-flag', // League Points entry
  'game-icons:sea-dragon', // Drakes & Baron entry
  'game-icons:crowned-heart', // Honor & MVP entry
  'game-icons:knight-banner', // Recruitment entry
  'game-icons:rank-2', // Champion Tiers entry
  'game-icons:meeple-army', // Team Roster entry
  'game-icons:chain-lightning', // Traits & Origins entry
  'game-icons:sword-array', // Orbit Combat entry
  'game-icons:juggler', // Role Abilities entry
  'game-icons:life-bar', // Champion HP entry
  'game-icons:angry-eyes', // Boss Attacks entry
  'game-icons:star-struck', // Star Types entry
  'game-icons:crossed-axes', // Fight Flow entry
  'game-icons:missile-swarm', // Turret Salvos entry
  'game-icons:health-decrease', // Boss HP entry
  'game-icons:fire-breath', // Enrage entry
  'game-icons:present', // Boss Rewards entry
  'game-icons:stairs', // Galaxy Progression entry
  'game-icons:evil-comet', // Galaxy Boss entry
  'game-icons:ladder', // Galaxy Tiers entry
  'game-icons:direction-signs', // Expeditions entry
  'game-icons:money-stack', // Expedition Rewards entry
  'game-icons:shop', // Item Shop entry
  'game-icons:cut-diamond', // Item Rarities entry
  'game-icons:three-keys', // Set Bonuses entry
  'game-icons:spiky-explosion', // Prestige entry
  'game-icons:andromeda-chain', // Universes entry
  // Encyclopedia — panel UI (EncyclopediaPanel.vue)
  'game-icons:abacus', // Formula toggle button
  'game-icons:bookmark', // Bookmark (off state)
  'game-icons:bookmarklet', // Bookmark (on state) + Saved filter chip
  'game-icons:stack', // "All" filter chip
  'game-icons:tied-scroll', // Empty search state
  // Admin Panel
  'game-icons:alien-egg',
  'game-icons:star-medal',
  'game-icons:star-cycle',
  'game-icons:bells',
  'game-icons:settings-knobs',
  // Event Log
  'game-icons:spartan-helmet',
  'game-icons:arrow-scope',
  'game-icons:machete',
  'game-icons:power-ring',
  'game-icons:alien-bug',
  'game-icons:musical-notes',
  'game-icons:crossed-sabres',
  'game-icons:open-book',
  // Roles (rendered in BardProfileMenu, PlanetSelectTab)
  'game-icons:thorny-vine',
  'game-icons:orb-wand',
  'game-icons:bow-arrow',
  'game-icons:health-potion',
  // Team tab actions (Shop / Expedition / Items)
  'game-icons:barbute', // Champions shop main tab (TeamTabComponent)
  'game-icons:campfire',
  'game-icons:open-treasure-chest',
  // ChampionShop Filter Toggle
  'game-icons:plain-arrow',
  'game-icons:return-arrow',
  // Solar Upgrade Shop — branch icons
  'game-icons:feathered-wing', // Flight Speed
  'game-icons:health-increase', // Max HP
  'game-icons:gold-nuggets', // Chimes/Click
  'game-icons:metronome', // Chimes/Second
  'game-icons:fist', // DMG/Click
  // Missions (missionStore.ts)
  'game-icons:guitar', // Silver Strings reward
  'game-icons:microphone', // Street Performer mission
  'game-icons:earth-spit', // Planet Rescuer I mission + Support Planet Heal stat
  'game-icons:radar-dish', // Cosmic Frequency reward
  'game-icons:electric', // Synergy Master reward + Buildings encyclopedia
  'game-icons:laurel-crown', // Legendary Symphony reward
  // Encyclopedia categories (battle, resources)
  'game-icons:katana', // Battle Broadcast category icon
  'game-icons:gem-chain', // Resources category icon
  // Role replacements (invalid → valid)
  'game-icons:wizard-staff', // Mid role icon (was magic-wand)
  'game-icons:hearts', // HP-Bars — Sonne (PlayerHPBar, PauseOverlay) + Bosse (PlanetRescueOverlay, StarFightModal)
  'game-icons:battle-gear', // Auto-Battle-Pausenstatistik (PauseOverlay)
  'game-icons:healing', // Support Heal/Tick stat (roleData)
  'game-icons:cuckoo-clock', // Support planet CD stat (was timer)
  'game-icons:click', // Champion Shop detail panel — empty state (ChampionDetailPanel)
  // Mission icon replacements (invalid → valid)
  'game-icons:arrow-cursor', // Nimble Fingers reward (was finger-pointing)
  'game-icons:greek-temple', // Building Master mission (was temple)
  'game-icons:house', // Architectural Harmony reward (was building)
  'game-icons:globe', // Planet Song reward (was world-map)
  // Emoji → game-icons replacements
  'game-icons:plasma-bolt', // ⚡ Quickstart button (ExpeditionComponent)
  'game-icons:two-handed-sword', // ⚔ Champion damage display (BossArenaSection)
  'game-icons:shield-reflect', // 🛡 Shield damage float (ChampionOrbit)
  'game-icons:war-pick', // ⚔ Equipment empty state (EquipmentPickerPanel)
  'game-icons:magnifying-glass', // 🔍 Search inputs (ChampionPickerPanel, ChampionSelectPanel, ChampionShopComponent, EncyclopediaPanel)
  'game-icons:heart-bottle', // ❤/♥ HP icons (PlayerHPBar, CommandPanel, PlanetSelect, etc.)
  'game-icons:wrench', // ⚙ Admin Dashboard header icon
  'game-icons:heraldic-sun', // ⚜️ Honor shield (BattleResultModal)
  'game-icons:brick-wall', // 🏗️ Construction icon (PlanetSelectTab + Buildings encyclopedia)
  'game-icons:open-chest', // 📦 Expedition ready header (ExpeditionActiveComponent)
  'game-icons:wax-tablet', // 📖 Encyclopedia tab button (App.vue + EncyclopediaPanel)
  'game-icons:rolled-cloth', // 📜 Expedition icon fallback (ExpeditionActiveComponent)
  'game-icons:fingers-crossed', // ✌️ Double Tap augment icon
  'game-icons:goblin', // 👹 Planet Bosses encyclopedia category
  'game-icons:papyrus', // 🗺️ Expeditions encyclopedia category
  'game-icons:rank-3', // ⬆️ Leveling encyclopedia category
  'game-icons:sundial', // ⏳ Loading indicator in BattleStartScreenComponent
  'game-icons:hazard-sign', // ⚠ Warning label in ExpeditionComponent
  // Expedition action bar bulk buttons
  'game-icons:chest', // Accept All button (ExpeditionComponent action bar)
  'game-icons:camping-tent', // Send All button (ExpeditionComponent action bar)
  // Expedition icon pool (EXPEDITION_ICON_POOL — random generated expedition icons)
  'game-icons:journey',
  'game-icons:interstellar-path',
  'game-icons:castle-ruins',
  'game-icons:dungeon-gate',
  'game-icons:lantern-flame',
  'game-icons:caravan',
  'game-icons:cave-entrance',
  'game-icons:mountain-road',
  'game-icons:elven-castle',
  'game-icons:forest',
  // ChampionStarTimerComponent
  'game-icons:comet-spark',
  // Comet origin state — Star Forge phase banner (StarForgePanel)
  'game-icons:asteroid',
  // Minimap HUD stats
  'game-icons:sands-of-time', // Arrival time countdown
  'game-icons:winged-leg', // Travel speed
  'game-icons:radar-sweep', // Remaining distance
  // Battle Minimap overlays
  'game-icons:magic-portal', // Skip button on minimap (BattleMapComponent)
  'game-icons:chat-bubble', // Chat toggle button on minimap (BattleMapComponent)
  'game-icons:dragon-head', // Dragon spawn shortcut button (BattleMapComponent)
  'game-icons:hydra', // Baron spawn shortcut button (BattleMapComponent)
  // Music Control Widget
  'game-icons:trumpet', // MusicControlWidget toggle button
  // Champion Shop — Chimes cost badge
  'game-icons:windchimes', // Chimes cost display in ChampionShopComponent
  // Champion Shop — filter toggle panel button
  'game-icons:toggles', // Filter panel toggle button in ChampionShopComponent & ChampionSelectPanel
  // Admin — StarFightModal instant-kill button
  'game-icons:skull', // Admin kill button in StarFightModal
  'game-icons:planet-core', // Vacant planet slot ghost emblem (PlanetBatteryHUD)
  'game-icons:targeting', // Boss strike aim reticle over the target (RoleStrikerSquad, PlanetBatteryHUD)
  // Champion Shop / Select Panel — tier collapse-all header button
  'game-icons:contract', // Collapse-all tiers (ChampionShopComponent & ChampionSelectPanel)
  'game-icons:expand', // Expand-all tiers (ChampionShopComponent & ChampionSelectPanel)
  // Galaxy Tier unlock gate (TierUnlockPanel)
  'game-icons:locked-fortress', // Locked-tier header icon
  // Champion Shop — galaxy-locked Champion Tier row header
  'game-icons:padlock', // Galaxy-locked tier header icon (ChampionShopComponent)
  // Champion Tiers — champion star-level classification (championTiers.ts, TierUnlockPanel, champion cards)
  'game-icons:walking-boot', // ★1 Wanderer
  'game-icons:polar-star', // ★2 Star Drifter
  'game-icons:fairy', // ★3 Meep Guardian
  'game-icons:star-gate', // ★4 Keeper
  'game-icons:burning-meteor', // ★5 Comet Rider
  'game-icons:star-prominences', // ★6 Sage
  'game-icons:spider-web', // ★7 Chime Weaver
  'game-icons:star-altar', // ★8 Warden
  'game-icons:moon-orbit', // ★9 Eclipse Herald
  'game-icons:portal', // ★10 Sovereign
  'game-icons:cosmic-egg', // ★11 Galaxy Warden
  'game-icons:queen-crown', // ★12 Ascendant
  'game-icons:teleport', // Admin Galaxy Jump — warp button
  'game-icons:sun-radiations', // Admin Star Phase panel — header icon
  'game-icons:padlock-open', // Admin: Unlock-all button in the Skill Tree tab (SkillTreeComponent)
  'game-icons:broom', // Admin: Reset-all button in the Skill Tree tab (SkillTreeComponent)
  'game-icons:sand-clock', // Time-in-phase indicator (BardStatsTab Star Forge stage)
  'game-icons:cursor', // Click mission icon (missionStore)
  // Star Forge — tree branch nodes (config/starForge.ts)
  'game-icons:caravel', // Solar Sails (expedition speed)
  'game-icons:moon', // Moon Orbit (offline earnings)
  'game-icons:remedy', // Regeneration (HP regen)
  'game-icons:bolt-shield', // Aegis (damage reduction)
  'game-icons:two-coins', // Golden Echo (double-click chance)
  'game-icons:sound-waves', // Resonance (CpC from CpS)
  'game-icons:mining', // Comet Miner (material drop chance)
  'game-icons:extra-time', // Allegro (phase dwell reduction)
  'game-icons:sonic-shout', // Warcry (champion DPS)
  'game-icons:shattered-glass', // Shatter (boss damage)
  // Star Forge — tree leaf nodes (amplifiers)
  'game-icons:sunrise', // Aurora Wake (amplifies Solar Sails)
  'game-icons:night-sky', // Midnight Tide (amplifies Moon Orbit)
  'game-icons:heart-plus', // Vital Bloom (amplifies Regeneration)
  'game-icons:shield-echoes', // Echoing Bulwark (amplifies Aegis)
  'game-icons:coins-pile', // Coin Cascade (amplifies Golden Echo)
  'game-icons:echo-ripples', // Echo Chamber (amplifies Resonance)
  'game-icons:gold-mine', // Deep Vein (amplifies Comet Miner)
  'game-icons:clockwork', // Time Weaver (amplifies Allegro)
  'game-icons:swords-power', // Battle Chorus (amplifies Warcry)
  'game-icons:implosion', // Starquake (amplifies Shatter)
  // Star Forge — crafted relics
  'game-icons:evil-moon', // Echo of the Void relic
  'game-icons:musical-score', // Choir of Champions relic
  'game-icons:shining-heart', // Heart of the Star relic
  'game-icons:bell-shield', // Midas Bell relic
  // Star Forge — constellations
  'game-icons:wind-hole', // Stellar Wind constellation
  'game-icons:beams-aura', // Percussive Nova constellation
  'game-icons:temporary-shield', // Bulwark Choir constellation
  'game-icons:mine-wagon', // Prospector's Song constellation
  'game-icons:ouroboros', // Eternal Cadence constellation
  // Star Forge — cosmic bargain deals
  'game-icons:take-my-money', // Midas Cadence deal
  'game-icons:profit', // Tempo Surge deal
  'game-icons:swap-bag', // Stellar Cache deal
  'game-icons:time-synchronization', // Solar Winds deal (dwell skip)
  'game-icons:receive-money', // Gold Rush deal
  // Star Forge — panel section headers & controls (StarForgePanel.vue)
  'game-icons:anvil-impact', // CRAFTED RELICS section header
  'game-icons:barbed-star', // CONSTELLATIONS section header
  'game-icons:cash', // COSMIC BARGAIN section header
  'game-icons:card-exchange', // Bargain reroll button
  'game-icons:sunbeams', // Phase status banner icon
  // Battle Sigil (Team tab)
  'game-icons:crenel-crown', // Sigil center crest (SigilBoardComponent)
  'game-icons:linked-rings', // Sigil crest synergy pill + synergies side panel (SigilBoardComponent/TeamSynergiesPanel)
  'game-icons:sing', // Production buff chip (TeamSynergiesPanel)
  'game-icons:mailed-fist', // Power buff chip (TeamSynergiesPanel)
  'game-icons:deadly-strike', // Combat DPS buff chip (TeamSynergiesPanel)
  'game-icons:cycle', // Swap champion button (SigilDetailsPanel)
  'game-icons:shopping-bag', // Shop action button (SigilBoardComponent)
  'game-icons:switch-weapon', // Champion picker modal header (TeamTabComponent)
  'game-icons:knapsack', // Unified shop — item detail "Owned" row (ItemDetailPanel)
  'game-icons:crested-helmet', // Unified shop — Champions quick-jump button (ChampionShopComponent)
  'game-icons:light-backpack', // Unified shop — Items quick-jump button (ChampionShopComponent)
  'game-icons:cape', // Skins button (SigilDetailsPanel) + skin gallery modal (ChampionSkinsPanel)
  // Battle tab redesign (landing / rift / honor)
  'game-icons:power-button', // STOP AUTO-BATTLE bar → return to landing (AutoBattleStopBar)
  'game-icons:sword-clash', // COMBAT stat group header (BattleLandingScreen)
  'game-icons:crown-coin', // FARM & ECONOMY stat group header (BattleLandingScreen)
  'game-icons:stone-tower', // OBJECTIVES stat group header (BattleLandingScreen)
  'game-icons:semi-closed-eye', // VISION & TIME stat group header (BattleLandingScreen)
  'game-icons:laurels-trophy', // MVP awards card (MultikillCardsRow) + MVP band (HonorGrantPanel) + MVP showcase (VictorySplashPanel)
  'game-icons:medal', // Grant honor header + medal stamp (HonorGrantPanel)
  'game-icons:watchtower', // Turrets (BATTLE_STAT_GAME_ICONS — ScoreTopBar, BottomScoreboard, BattleLandingScreen)
  'game-icons:floating-crystal', // Inhibitors (BATTLE_STAT_GAME_ICONS — ScoreTopBar, BattleLandingScreen)
  'game-icons:sport-medal', // Top-3 damage rank badge (ObjectiveModalComponent)
  'game-icons:imperial-crown', // TEAM MVP badge (TeamRosterPanel)
  'game-icons:bloody-sword', // TOP KILLS badge (TeamRosterPanel)
  'game-icons:fire-punch', // TOP DAMAGE badge (TeamRosterPanel)
  'game-icons:gold-stack', // GOLD LEADER badge (TeamRosterPanel)
  'game-icons:sickle', // FARM LORD badge (TeamRosterPanel)
  'game-icons:health-normal', // GUARDIAN badge (TeamRosterPanel)
  'game-icons:arrows-shield', // FRONTLINE badge (TeamRosterPanel)
  'game-icons:surrounded-eye', // SENTINEL badge (TeamRosterPanel)
  'game-icons:saber-slash', // Kill marker between killer/victim (KillFeedTicker)
  'game-icons:quick-slash', // Damage marker on fighter strike floats (ObjectiveModalComponent)
  'game-icons:enrage', // Top "Challenge" taunt ability (ObjectiveModalComponent)
  'game-icons:uprising', // Jungle "Wild Rally" buff ability (ObjectiveModalComponent)
  'game-icons:cursed-star', // Mid "Hex Curse" ability (ObjectiveModalComponent)
  'game-icons:dead-eye', // ADC "Deadeye" crit ability (ObjectiveModalComponent)
  'game-icons:healing', // Support "Mend" heal ability (ObjectiveModalComponent)
  'game-icons:heart-shield', // MOST PUNISHED award badge (ObjectiveResultSummary)
  'game-icons:heart-beats', // SURVIVOR award badge (ObjectiveResultSummary)
  'game-icons:bordered-shield', // Top "Aegis Wall" orbit ability (SigilDetailsPanel)
  'game-icons:vine-whip', // Jungle "Wild Blessing" orbit ability (SigilDetailsPanel)
  'game-icons:spell-book', // Mid "Chaos Curse" orbit ability (SigilDetailsPanel)
  'game-icons:striking-arrows', // ADC "Piercing Volley" orbit ability (SigilDetailsPanel)
  'game-icons:glowing-hands', // Support "Guardian Light" orbit ability (SigilDetailsPanel)
  'game-icons:claw-slashes', // Boss AoE damage-per-second readout (ObjectiveModalComponent)
  'game-icons:burning-skull', // Hex Curse stack/damage badge on the boss (ObjectiveModalComponent)
  // Battle stat visuals (BATTLE_STAT_GAME_ICONS — BottomScoreboard, BattleLandingScreen)
  'game-icons:piercing-sword', // Kills stat
  'game-icons:dead-head', // Deaths stat
  'game-icons:three-friends', // Assists stat
  'game-icons:podium-winner', // Win/Loss stat (BottomScoreboard)
  'game-icons:sword-spin', // "Return to Battle" floating button (BattleReturnButton)
  // Eclipse state (champion/planet behind the sun)
  'game-icons:eclipse-flare', // Eclipse medallion (ChampionSelectorComponent, CommandPanelComponent, RoleStrikerSquad, PlanetBatteryHUD)
])

// ── Hover-effect colors per role (Command Panel slot hover) ───────────────
// Distinct from ROLES[].color — these drive the champion lift-glow and slot
// pulse on hover, giving each role a thematic creative accent.
export const ROLE_HOVER_COLORS: Record<string, string> = {
  top: '#c8a060', // Stone-gold — warrior's golden trim
  jungle: '#3dc850', // Poison-green — hunter's venom
  mid: '#c060f0', // Arcane-violet — mage's essence
  adc: '#50c8ff', // Sky-cyan — marksman's precision
  support: '#ffd060', // Warm-gold — healer's blessing
}

// ── Hover-Focus dim ──────────────────────────────────────────────────────────
// Opacity applied to non-relevant champions / planets / orbit rings while a
// champion slot or planet tile is hovered in the Command Panel, so the focused
// element/role stands out. 0 = fully hidden. Single source for both TS logic
// and the --hover-dim-opacity CSS variable in the orbit components.
export const HOVER_DIM_OPACITY = 0

// ── Encyclopedia (EncyclopediaPanel.vue) ────────────────────────────────────
/** localStorage key for bookmarked codex entries (UI preference, not game state). */
export const ENCYCLOPEDIA_BOOKMARKS_STORAGE_KEY = 'bardle-codex-bookmarks'
/** How long the "Copied ✓" feedback stays on a formula copy button. */
export const ENCYCLOPEDIA_COPY_FEEDBACK_MS = 1200
/** Flash-highlight duration after jumping to a related entry. */
export const ENCYCLOPEDIA_FLASH_MS = 1600

// ── Resource-Star Color Palette ────────────────────────────────────────────
// Six realistic stellar spectral colors for resource stars (no champion).
// None overlap with role colors (red/green/blue/orange/silver-blue).
// Stored as RGB tuples to match StarGroup.starColor directly.
export const RESOURCE_STAR_COLORS: [number, number, number][] = [
  [255, 248, 226], // F-type  — cream white    (Procyon-class)
  [255, 252, 192], // F5-type — pale lemon-white
  [255, 234, 86], // G-type  — golden yellow   (sun-like)
  [230, 240, 255], // A-type  — ice-blue white   (Vega-class)
  [204, 196, 255], // B-type  — pale violet-white (hot, Rigel-class)
  [255, 214, 162], // K-type  — warm buff        (subdued, not orange)
]
