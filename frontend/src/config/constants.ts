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
  HONOR: { key: 'honor', icon: 'game-icons:trophy', label: 'Honor Phase', color: '#74d448' },
} as const

export type GameStateKey = (typeof GAME_STATE)[keyof typeof GAME_STATE]['key']
export const MMR_TO_POWER_MULTIPLIER = 1.5

// Star background (App.vue)
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

// Planet Boss Fight
export const BOSS_BASE_HP = 200
export const BOSS_HP_LEVEL_SCALE = 10
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

// Typical skirmish locations per lane (map-units on the 100x100 minimap)
export const LANE_FIGHT_POSITIONS: Record<'top' | 'mid' | 'bot', { x: number; y: number }> = {
  top: { x: 24, y: 22 },
  mid: { x: 50, y: 50 },
  bot: { x: 78, y: 80 },
}

// ── Objective Modal ────────────────────────────────────────────────────────
export const OBJECTIVE_DRAKE_SPAWN = 300 // game-seconds when drake appears on minimap
export const OBJECTIVE_BARON_SPAWN = 2000 // game-seconds when baron appears on minimap (early enough for a full lane push afterwards)
export const DRAKE_OBJECTIVE_HP = 3200
export const BARON_OBJECTIVE_HP = 4000
/** Objective DPS contributed by every living champion present at the pit (per team) */
export const OBJECTIVE_BASE_DPS_PER_CHAMP = 45
export const OBJECTIVE_CLICK_DAMAGE = 15
export const OBJECTIVE_DRAKE_WIN_BONUS = 0.08
export const OBJECTIVE_BARON_WIN_BONUS = 0.12
export const OBJECTIVE_DPS_TICK_MS = 200
/** Per-tick DPS wobble (±fraction) so the damage race stays dramatic */
export const OBJECTIVE_DPS_VARIANCE = 0.15
/** Per-fighter DPS weight spread (normalized per side, avg = 1 — team DPS unchanged) */
export const OBJECTIVE_FIGHTER_WEIGHT_MIN = 0.75
export const OBJECTIVE_FIGHTER_WEIGHT_MAX = 1.25
/** Hard cap on the frozen-time objective fight; resolves by damage lead */
export const OBJECTIVE_MAX_DURATION_MS = 20000
export const OBJECTIVE_RESULT_DELAY_MS = 2200
/** Bottom-bar game-state stat display during a frozen-time objective fight */
export const OBJECTIVE_FIGHT_STATUS = {
  drake: { label: 'Drake Fight', image: '/img/dragon.png' },
  baron: { label: 'Baron Fight', image: '/img/baron.png' },
  leadColor: '#74d448',
  behindColor: '#cc6050',
  securedText: 'SECURED',
  lostText: 'LOST',
} as const

// ── Battle Event Timeline ──────────────────────────────────────────────────
// Phase windows in game-seconds (total game = BATTLE_TOTAL_GAME_SECONDS = 3600)
// Match script: laning 0-900 → drakes 900-1450 → mid fights 1250-1890 →
// cracks 820-1920 → baron 2000-2120 (result ~2720-2900) → push ~2850-3300 → nexus 3550
export const TIMELINE_LANING_END = 900
export const TIMELINE_DRAKE_WINDOW_END = 1450
export const TIMELINE_MIDFIGHT_END = 1950
export const TIMELINE_BARON_END = 2650
/** Random extra delay on the baron spawn time */
export const TIMELINE_BARON_SPAWN_JITTER_T = 120
/** Game-second at which the losing nexus falls */
export const TIMELINE_NEXUS_FALL_T = 3550
export const TIMELINE_FIRST_BLOOD_MIN_T = 120
export const TIMELINE_FIRST_BLOOD_MAX_T = 300
export const TIMELINE_SOLO_KILL_CHANCE = 0.3
export const TIMELINE_LANE_FIGHTS_MIN = 4
export const TIMELINE_LANE_FIGHTS_MAX = 7
export const TIMELINE_DRAKE_COUNT_MIN = 1
export const TIMELINE_DRAKE_COUNT_MAX = 2
/** Minimum game-seconds between two drake spawns surviving a timeline reseed */
export const TIMELINE_DRAKE_RESPAWN_MIN_GAP_T = 300
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
export const TIMELINE_KILL_WINPROB_DELTA = 0.02
export const TIMELINE_DRAKE_WINPROB_DELTA = 0.06
export const TIMELINE_BARON_WINPROB_DELTA = 0.1
export const TIMELINE_TURRET_WINPROB_DELTA = 0.03
export const TIMELINE_INHIB_WINPROB_DELTA = 0.04
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
/** Nexus turrets fall this long after the baron resolves (min/max delay each) — paced so the winner visibly marches the cracked lane */
export const TIMELINE_NEXUS_TURRET_DELAY_MIN_T = 130
export const TIMELINE_NEXUS_TURRET_DELAY_MAX_T = 240
/** Both nexus turrets must be down this long before the nexus falls */
export const TIMELINE_NEXUS_TURRET_END_MARGIN_T = 60
/** Champions on the attacking side present at a structure fall (min/max) */
export const STRUCTURE_ATTACKERS_MIN = 1
export const STRUCTURE_ATTACKERS_MAX = 3
/** Objective pit participants per team (min/max champions) */
export const TIMELINE_OBJECTIVE_PARTICIPANTS_MIN = 3
export const TIMELINE_OBJECTIVE_PARTICIPANTS_MAX = 5
/** Game-seconds between objective spawn and its scripted result (720 game-s = 12 real-s, leaves room for the click modal) */
export const TIMELINE_OBJECTIVE_RESULT_DELAY_MIN_T = 720
export const TIMELINE_OBJECTIVE_RESULT_DELAY_MAX_T = 780

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
/** Champion levels 1→18 spread over the game: one level per this many game-seconds */
export const CHAMPION_LEVEL_SECONDS = 210
export const CHAMPION_MAX_LEVEL = 18
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
/** Winners leave the baron pit this long after the baron result */
export const MOVE_PUSH_START_DELAY_T = 40
/** Per-champion random stagger on the endgame push start */
export const MOVE_PUSH_STAGGER_T = 120
/** Game-seconds the endgame push/retreat march takes along the kill route */
export const MOVE_PUSH_TRAVEL_T = 420
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
export const PLANET_LEVEL_MAX_PHASE = 6 // cap aligned to starPhase max (0–6)
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
export const BEHIND_SUN_SPEED_MULTIPLIER = 3.5
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

/** Required sun phase (starPhase) to unlock each planet slot. Slot index 0 → phase 1, …, slot index 5 → phase 6. */
export const PLANET_SLOT_SUN_PHASE_REQUIREMENTS: number[] = [1, 2, 3, 4, 5, 6]

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
      color: '#12B8FF',
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

// Secondary champions follow the main on the same role orbit ring with these angular offsets
export const SECONDARY_ANGLE_OFFSET_1 = Math.PI / 7
export const SECONDARY_ANGLE_OFFSET_2 = -Math.PI / 7
export const SECONDARY_SIZE_SCALE = 0.6

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
export const BATTLE_KILL_LOG_THROTTLE_MS = 3000

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
  /** Unique Bardle name — the sun's life told as one piece of music */
  name: string
  /** Compact label for tight UI spots (e.g. Stellar Evolution timeline in BardStatsTab) */
  shortName: string
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
 *  to the next one — index = current starPhase (evolutions 0→1 … 5→6).
 *  Ramp: 10min, 30min, 1.5h, 4h, 10h, 24h. Future upgrades can shorten these via
 *  solarUpgradeStore.dwellTimeMultiplier. */
export const STAR_PHASE_MIN_DWELL_SECONDS = [600, 1_800, 5_400, 14_400, 36_000, 86_400]

/** Stellar-Evolution timeline (BardStatsTab): dot diameter = phase radius × this scale,
 *  so the timeline circles stay true to the in-game sun proportions (7.5px…35px). */
export const STATS_TAB_PHASE_DOT_SCALE = 0.25

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

// Tree zoom (wheel + buttons)
export const FORGE_TREE_ZOOM_MIN = 0.55
export const FORGE_TREE_ZOOM_MAX = 1.4
export const FORGE_TREE_ZOOM_STEP = 0.15
export const FORGE_TREE_ZOOM_DEFAULT = 0.92

// ── Battle Sigil (Team tab) ───────────────────────────────────────────────────
// Sigil geometry — the sigil lives on a square stage; the 5 role nodes sit on a
// pentagon (Top at 12 o'clock, ROLES order clockwise), each with 2 ally
// satellites placed outward beside the role node.
export const SIGIL_STAGE_SIZE = 900
export const SIGIL_PENTAGON_RADIUS = 300
export const SIGIL_ALLY_RADIUS = 395
/** Ally satellites sit at the role's pentagon angle ± this offset (degrees). */
export const SIGIL_ALLY_ANGLE_OFFSET = 16
export const SIGIL_NODE_SIZE = 94
export const SIGIL_ALLY_SIZE = 44
export const SIGIL_CREST_SIZE = 170
/** SVG ring radii (stage coordinates, center = SIGIL_STAGE_SIZE / 2). */
export const SIGIL_RING_OUTER_R = 430
export const SIGIL_RING_RUNE_R = 360
export const SIGIL_RING_INNER_R = 180
export const SIGIL_RING_CORE_R = 120

// Sigil zoom (wheel + buttons)
export const TEAM_SIGIL_ZOOM_MIN = 0.7
export const TEAM_SIGIL_ZOOM_MAX = 1.6
export const TEAM_SIGIL_ZOOM_STEP = 0.15
export const TEAM_SIGIL_ZOOM_DEFAULT = 1.0

// Sigil escalation — the sigil grows more epic with every filled slot:
// each main lights its pentagon vertex + spoke, each ally lights a rune tick,
// each full role (main + 2 allies) gains a spinning aura; global stages below
// escalate crest/rings/embers by total filled slots (0..15).
export const SIGIL_TOTAL_SLOTS = 15
export const SIGIL_POWER_PER_STAR = 100
export const SIGIL_ALLY_POWER_PER_STAR = 40
/** Pentagram overlay appears once all 5 mains are set. */
export const SIGIL_PENTAGRAM_AT_MAINS = 5
/** Full mandala (all decorations) at a complete 15/15 team. */
export const SIGIL_MANDALA_AT_FILLED = 15
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
    minFilled: 5,
    crestColor: '#e8c060',
    ringColor: '#7a4e20',
    pulseSec: 3.5,
    spinSec: 50,
    emberCount: 8,
    extraRings: 1,
  },
  {
    name: 'Radiant',
    minFilled: 10,
    crestColor: '#f0d870',
    ringColor: '#c89040',
    pulseSec: 2.5,
    spinSec: 35,
    emberCount: 12,
    extraRings: 2,
  },
  {
    name: 'Eternal',
    minFilled: 15,
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
    name: 'First Spark',
    shortName: 'Spark',
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
    name: 'Azure Prelude',
    shortName: 'Prelude',
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
    name: 'Golden Crescendo',
    shortName: 'Crescendo',
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
    name: 'Amber Swell',
    shortName: 'Swell',
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
    name: 'Crimson Requiem',
    shortName: 'Requiem',
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
    name: 'Fading Echo',
    shortName: 'Echo',
    astroName: 'White Dwarf',
    radius: 30,
    core: '#ffffff',
    mid: '#e8f4ff',
    edge: '#80b8e8',
    glow1: '#b3d9ff',
    glow2: '#80b0ee',
    glow3: '#4080cc',
    phasePrimary: '#e8f4ff',
    phaseGlow: '#b3d9ff',
    factor: 0.85,
    pulseSpeed: '2s',
  },
  {
    name: 'Grand Finale',
    shortName: 'Finale',
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

// ── Planet Tab stage sizing ───────────────────────────────────────────────────
/** Sun image diameter (px) in the Planet Tab at the smallest phase radius. */
export const PLANET_TAB_SUN_MIN_DIAMETER = 300
/** Sun image diameter (px) in the Planet Tab at the largest phase radius. */
export const PLANET_TAB_SUN_MAX_DIAMETER = 470
/** Fixed base diameter (px) of the orbiting planet image (kept small vs. the sun). */
export const PLANET_TAB_PLANET_DIAMETER = 96

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
  // Encyclopedia
  'game-icons:galaxy',
  'game-icons:scroll-quill',
  'game-icons:map',
  'game-icons:crystal-growth',
  'game-icons:sword-spade',
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
  'game-icons:barbute',
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
  // Encyclopedia categories (augments, battle, resources)
  'game-icons:katana', // Battle category icon
  'game-icons:star-key', // Augments category icon
  'game-icons:gem-chain', // Resources category icon
  // Role replacements (invalid → valid)
  'game-icons:wizard-staff', // Mid role icon (was magic-wand)
  'game-icons:hearts', // HP-Bars — Sonne (PlayerHPBar, PauseOverlay) + Bosse (PlanetRescueOverlay, StarFightModal)
  'game-icons:healing', // Support Heal/Tick stat (roleData)
  'game-icons:cuckoo-clock', // Support planet CD stat (was timer)
  // Mission icon replacements (invalid → valid)
  'game-icons:arrow-cursor', // Nimble Fingers reward (was finger-pointing)
  'game-icons:greek-temple', // Building Master mission (was temple)
  'game-icons:house', // Architectural Harmony reward (was building)
  'game-icons:globe', // Planet Song reward (was world-map)
  // Emoji → game-icons replacements
  'game-icons:plasma-bolt', // ⚡ Quickstart button (ExpeditionCreateComponent)
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
  'game-icons:plain-square', // ⚪ Common rarity (augmentsAndBattle.ts)
  'game-icons:ice-iris', // 🔵 Rare rarity (augmentsAndBattle.ts)
  'game-icons:crystal-eye', // 🟣 Epic/Legendary rarity (augmentsAndBattle.ts)
  'game-icons:spanner', // 🔧 Upgrades encyclopedia entry
  'game-icons:goblin', // 👹 Planet Boss encyclopedia category
  'game-icons:papyrus', // 🗺️ Expeditions encyclopedia category
  'game-icons:rank-3', // ⬆️ Leveling encyclopedia category
  'game-icons:sundial', // ⏳ Loading indicator in BattleStartScreenComponent
  'game-icons:hazard-sign', // ⚠ Warning label in ExpeditionCreateComponent
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
  // Champion Shop / Select Panel — tier collapse-all header button
  'game-icons:contract', // Collapse-all tiers (ChampionShopComponent & ChampionSelectPanel)
  'game-icons:expand', // Expand-all tiers (ChampionShopComponent & ChampionSelectPanel)
  // Galaxy Tier unlock gate (TierUnlockPanel)
  'game-icons:locked-fortress', // Locked-tier header icon
  // Champion Shop — galaxy-locked Champion Tier row header
  'game-icons:padlock', // Galaxy-locked tier header icon (ChampionShopComponent)
  // Champion Tiers — champion star-level classification (championTiers.ts, TierUnlockPanel, champion cards)
  'game-icons:walking-boot', // ★1 Lone Wanderer
  'game-icons:polar-star', // ★2 Star Drifter
  'game-icons:fairy', // ★3 Meep Guardian
  'game-icons:star-gate', // ★4 Rift Keeper
  'game-icons:burning-meteor', // ★5 Comet Rider
  'game-icons:star-prominences', // ★6 Nebula Sage
  'game-icons:spider-web', // ★7 Chime Weaver
  'game-icons:star-altar', // ★8 Astral Warden
  'game-icons:moon-orbit', // ★9 Eclipse Herald
  'game-icons:portal', // ★10 Void Sovereign
  'game-icons:cosmic-egg', // ★11 Galaxy Warden
  'game-icons:queen-crown', // ★12 Cosmic Sovereign
  'game-icons:teleport', // Admin Galaxy Jump — warp button
  'game-icons:sun-radiations', // Admin Star Phase panel — header icon
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
  'game-icons:bordered-shield', // Roster stat chip (SigilBoardComponent)
  'game-icons:laurels', // Avg Tier stat chip (SigilBoardComponent)
  'game-icons:linked-rings', // Synergies stat chip + details panel header (Team tab)
  'game-icons:cycle', // Swap champion button (SigilDetailsPanel)
  'game-icons:shopping-bag', // Shop action button (SigilDetailsPanel footer)
  'game-icons:switch-weapon', // Champion picker modal header (TeamTabComponent)
  'game-icons:round-star', // Sigil stage badge (SigilBoardComponent)
  // Battle tab redesign (landing / rift / honor)
  'game-icons:sword-clash', // COMBAT stat group header (BattleLandingScreen)
  'game-icons:crown-coin', // FARM & ECONOMY stat group header (BattleLandingScreen)
  'game-icons:stone-tower', // OBJECTIVES stat group header (BattleLandingScreen)
  'game-icons:semi-closed-eye', // VISION & TIME stat group header (BattleLandingScreen)
  'game-icons:laurels-trophy', // MVP awards card (MultikillCardsRow)
  'game-icons:medal', // Honor pips / grant honor header (HonorGrantPanel)
  'game-icons:watchtower', // Turret counter (ScoreTopBar)
  'game-icons:floating-crystal', // Inhibitor counter (ScoreTopBar)
  'game-icons:duel', // Alive-count versus strip (ObjectiveModalComponent)
  'game-icons:imperial-crown', // TEAM MVP badge (TeamRosterPanel)
  'game-icons:bloody-sword', // TOP KILLS badge (TeamRosterPanel)
  'game-icons:fire-punch', // TOP DAMAGE badge (TeamRosterPanel)
  'game-icons:gold-stack', // GOLD LEADER badge (TeamRosterPanel)
  'game-icons:sickle', // FARM LORD badge (TeamRosterPanel)
  'game-icons:health-normal', // GUARDIAN badge (TeamRosterPanel)
  'game-icons:arrows-shield', // FRONTLINE badge (TeamRosterPanel)
  'game-icons:surrounded-eye', // SENTINEL badge (TeamRosterPanel)
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
// element/role stands out. Single source for both TS logic and the
// --hover-dim-opacity CSS variable in the orbit components.
export const HOVER_DIM_OPACITY = 0.08

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
