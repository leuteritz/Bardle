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

// ── Objective Modal ────────────────────────────────────────────────────────
export const OBJECTIVE_DRAKE_SPAWN = 300 // game-seconds when drake appears on minimap
export const OBJECTIVE_BARON_SPAWN = 1200 // game-seconds when baron appears on minimap
export const DRAKE_OBJECTIVE_HP = 3000
export const BARON_OBJECTIVE_HP = 5000
export const OBJECTIVE_OWN_TEAM_DPS = 150
export const OBJECTIVE_ENEMY_TEAM_DPS = 100
export const OBJECTIVE_CLICK_DAMAGE = 80
export const OBJECTIVE_DRAKE_WIN_BONUS = 0.08
export const OBJECTIVE_BARON_WIN_BONUS = 0.12
export const OBJECTIVE_DPS_TICK_MS = 200
export const OBJECTIVE_TIMEOUT_MS = 12000
export const OBJECTIVE_RESULT_DELAY_MS = 1800

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
export const CHAMPION_TIER_CHIMES_PRICE: number[] = [
  500, 1400, 2800, 4500, 6500, 9500,
]

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
  name: string
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

export const STAR_PHASE_DATA: StarPhaseData[] = [
  {
    name: 'Protostar',
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
    name: 'Main Sequence (Young)',
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
    name: 'Main Sequence (Mature)',
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
    name: 'Subgiant',
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
    name: 'Red Giant',
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
    name: 'White Dwarf',
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
    name: 'Supernova',
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

// ── UI Timing ─────────────────────────────────────────────────────────────────
export const TOAST_DURATION_MS = 800
/** Milliseconds the cinematic kill-announcement banner stays visible before fading */
export const KILL_BANNER_DISPLAY_MS = 3_500

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
  'game-icons:crossed-swords',
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
  // ChampionSplashPanel Action Bar
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
