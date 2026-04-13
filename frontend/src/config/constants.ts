// ELO rating system
export const ELO_K_FACTOR = 32
export const ELO_RATING_SCALE = 400
export const ELO_LUCK_FACTOR = 0.15

// Leveling formula: 2000 * level^2.2
export const LEVEL_BASE = 2000
export const LEVEL_EXPONENT = 2.2

// Meep cost formula: 20 * meeps^1.2
export const MEEP_BASE_COST = 20
export const MEEP_COST_EXPONENT = 1.2

// Auto-battle
export const AUTO_BATTLE_INTERVAL_MS = 45000
export const BATTLE_REAL_DURATION_SECONDS = 45
export const KILL_EVENTS_PER_TEAM_MIN = 20
export const KILL_EVENTS_PER_TEAM_MAX = 40
export const MMR_TO_POWER_MULTIPLIER = 1.5

// Star background (App.vue)
export const STAR_COUNT = 400

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

// Planet type display names (German)
export const PLANET_TYPE_NAMES: Record<string, string> = {
  rocky: 'Felsplanet',
  ice: 'Eisplanet',
  'gas-giant': 'Gasriese',
  lava: 'Lavaplanet',
  ocean: 'Ozeanplanet',
  desert: 'Wüstenplanet',
  jungle: 'Dschungelplanet',
  ringed: 'Ringplanet',
}

// Title rotation
export const TITLE_MESSAGE_INTERVAL_MS = 5000

// LP thresholds
export const LP_NORMAL_PROMOTION_THRESHOLD = 100
export const LP_MASTER_PROMOTION_THRESHOLD = 500
export const LP_GRANDMASTER_PROMOTION_THRESHOLD = 1000
export const LP_DEMOTION_VALUE = 75
export const LP_MASTER_DEMOTION_VALUE = 400
export const LP_GRANDMASTER_DEMOTION_VALUE = 900
export const LP_BASE_CHANGE = 20

// Minimap phases (game-time seconds, 60 game-sec = 1 real-sec, total = 1800)
export const MINIMAP_PHASE_LANING_END = 700
export const MINIMAP_PHASE_DRAKE_END = 1200
export const MINIMAP_PHASE_MIDFIGHT_END = 1500
export const MINIMAP_PHASE_BARON_END = 2200
export const MINIMAP_PHASE_PUSH_END = 2700

export const BLUE_NEXUS = { x: 12, y: 88 }
export const RED_NEXUS = { x: 88, y: 12 }
export const BLUE_FOUNTAIN = { x: 8, y: 92 }
export const RED_FOUNTAIN = { x: 92, y: 8 }

// Objective positions
export const DRAKE_POS = { x: 72, y: 72 }
export const BARON_POS = { x: 28, y: 28 }
export const MID_CENTER = { x: 50, y: 50 }

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

// Battle shop
export const REROLL_COST = 3

// Save / load
export const SAVE_KEY = 'bard-idle-save'
export const SAVE_VERSION = 1

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

// Champion Combat System
export const CHAMPION_DETECT_RADIUS = 350 // px from screen center; planet within this range → champions can hit it
export const ATTACK_RANGE = 110 // px from planet center; kept for reference (unused in orbit mode)
export const CHAMPION_ORBIT_HIT_RANGE = 220 // px: champion orbit position must be within this of planet to deal damage
export const CHAMPION_DPS_BASE = 40 // damage per champion per second
export const PLAYER_MAX_HP_BASE = 100
export const PLAYER_HP_REGEN_PER_SEC = 1
export const PLAYER_HP_LOSS_ON_ENRAGE = 25

// Champion Orbit
export const AVATAR_SIZE_LARGE = 40
export const AVATAR_SIZE_SMALL = 32
export const ORBIT_RADIUS_SCALE = 1.8
