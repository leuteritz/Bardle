import type { ChampionRole, RoleStat, RoleAbilityDetail } from '../types'

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
export const BATTLE_REAL_DURATION_SECONDS = 45

// Game State display phases (bottom stats bar)
export const GAME_STATE = {
  SEARCHING: { key: 'searching', icon: '🔍', label: 'Planet Search', color: '#9a6830' },
  BATTLE: { key: 'battle', icon: '⚔️', label: 'Battle', color: '#e8c040' },
  HONOR: { key: 'honor', icon: '🏆', label: 'Honor Phase', color: '#74d448' },
} as const

export type GameStateKey = (typeof GAME_STATE)[keyof typeof GAME_STATE]['key']
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
export const CHAMPION_TRAVEL_BASE_LY = 500 // 500 LY for Galaxy 1
export const CHAMPION_TRAVEL_LY_PER_GALAXY = 500 // +500 LY per Galaxy

// Resource star flyby
export const RESOURCE_STAR_INTERVAL_MS = 120_000 // every 2 min a flyby
export const RESOURCE_STAR_DURATION_MS = 45_000 // flyby lasts 45s
export const RESOURCE_STAR_PLANET_COUNT = 3 // max. planets per flyby

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

// Champion Combat System
/** Detection radius from screen center in px. Planet within this range → champions can hit it. Not sun-relative. */
export const CHAMPION_DETECT_RADIUS = 350
export const ATTACK_RANGE = 110 // px from planet center; kept for reference (unused in orbit mode)
export const CHAMPION_ORBIT_HIT_RANGE = 220 // px: champion orbit position must be within this of planet to deal damage
export const CHAMPION_DPS_BASE = 40 // damage per champion per second
export const PLAYER_MAX_HP_BASE = 100
export const PLAYER_HP_REGEN_PER_SEC = 1
export const PLAYER_HP_LOSS_ON_ENRAGE = 25

// Enemy planet attacks
export const PLANET_SLOT_MAX_HP = 100
export const ENEMY_PROJECTILE_DAMAGE = 8
export const STAR_BURST_DELAY_BETWEEN_SHOTS = 200 // ms between individual shots within a burst
export const STAR_BURST_COOLDOWN = 10_000 // ms cooldown after a full burst completes

// Champion Orbit
export const BEHIND_SUN_SPEED_MULTIPLIER = 3.5
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

/** Central role registry — single source of truth for key, label, icon, color and orbit parameters. */
export const ROLES = [
  {
    key: 'top' as ChampionRole,
    label: 'Top',
    short: 'TOP',
    icon: '🛡️',
    image: '/img/roles/top.png',
    color: '#e05050',
    stats: [
      { key: 'atk', icon: '⚔', label: 'Atk Interval', value: '4.0s' },
      {
        key: 'shield',
        icon: '🛡',
        label: 'Shield Rebuild',
        value: `${ROLE_TOP_SHIELD_REBUILD_MS / 1000}s`,
      },
      { key: 'type', icon: '💪', label: 'Style', value: 'Tank / Frontline' },
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
    icon: '🌿',
    image: '/img/roles/jungle.png',
    color: '#50c060',
    stats: [
      { key: 'style', icon: '🗡', label: 'Style', value: 'Assassin / Ganker' },
      { key: 'effect', icon: '🌀', label: 'Effect', value: 'Crowd Control' },
      { key: 'range', icon: '🔄', label: 'Orbit', value: 'Wide Patrol' },
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
    icon: '🔮',
    image: '/img/roles/mid.png',
    color: '#5090e8',
    stats: [
      {
        key: 'cursecd',
        icon: '💜',
        label: 'Curse CD',
        value: `${ROLE_MID_CURSE_INTERVAL_MS / 1000}s`,
      },
      {
        key: 'cursedur',
        icon: '⏱',
        label: 'Curse Duration',
        value: `${ROLE_MID_CURSE_DURATION_MS / 1000}s`,
      },
      { key: 'dot', icon: '☠', label: 'DoT DPS', value: `${ROLE_MID_CURSE_DOT_DPS} dmg/s` },
      { key: 'amp', icon: '⚡', label: 'Dmg Amplify', value: `×${ROLE_MID_CURSE_DAMAGE_AMP}` },
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
    icon: '🏹',
    image: '/img/roles/adc.png',
    color: '#e89840',
    stats: [
      { key: 'burst', icon: '🎯', label: 'Burst Damage', value: `${ROLE_ADC_BURST_DAMAGE}` },
      {
        key: 'burstcd',
        icon: '⏱',
        label: 'Burst CD',
        value: `${ROLE_ADC_BURST_INTERVAL_MS / 1000}s`,
      },
      { key: 'style', icon: '🏹', label: 'Style', value: 'Ranged / DPS' },
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
    icon: '💚',
    image: '/img/roles/supp.png',
    color: '#b8c8d8',
    stats: [
      { key: 'heal', icon: '💚', label: 'Heal / Tick', value: `${ROLE_SUPPORT_HEAL_AMOUNT} HP` },
      {
        key: 'healcd',
        icon: '⏰',
        label: 'Heal CD',
        value: `${ROLE_SUPPORT_HEAL_INTERVAL_MS / 1000}s`,
      },
      { key: 'pheal', icon: '🌍', label: 'Planet Heal', value: `${SUPPORT_PLANET_HEAL_AMOUNT} HP` },
      {
        key: 'pcd',
        icon: '⌛',
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
/** Earliest game-time (seconds) at which a kill event can fire */
export const KILL_EVENT_MIN_GAME_SECONDS = 120
/** Latest game-time (seconds) at which a kill event can be scheduled */
export const KILL_EVENT_MAX_GAME_SECONDS = 1800
/** Probability that a kill event grants an assist instead of a second assist */
export const BATTLE_ASSIST_CHANCE = 0.6
/** Probability that a kill event records a death for the victim */
export const BATTLE_DEATH_CHANCE = 0.85
/** Number of sequential chat messages displayed during a battle */
export const BATTLE_CHAT_MESSAGE_COUNT = 14
/** Game-time (seconds) threshold dividing early-game from mid-game chat pool */
export const BATTLE_EARLY_GAME_SECONDS = 600
/** Countdown shown on the result screen before auto-advance (seconds) */
export const BATTLE_RESULT_COUNTDOWN_SECONDS = 4
/** Pause duration on the result screen before proceeding (ms) */
export const BATTLE_RESULT_PAUSE_MS = 4000
/** Countdown tick interval for the pre-battle search-phase timer (ms) */
export const BATTLE_COUNTDOWN_INTERVAL_MS = 500
/** Reference duration multiplied by drain rate to reduce opponent power (seconds) */
export const BATTLE_DRAIN_REFERENCE_SECONDS = 30
/** Minimum effective opponent power as a fraction of its original value */
export const BATTLE_OPPONENT_POWER_MIN_FRACTION = 0.1
/** Player power multiplier applied when the Big Bang augment is consumed */
export const BATTLE_BIG_BANG_POWER_MULTIPLIER = 5

// Inventory
/** Default base probability for a material drop from a rescue planet */
export const MATERIAL_DROP_BASE_CHANCE = 0.30

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
