import type {
  BattlePhaseConfig,
  BattlePhaseKey,
  ChampionArtSize,
  ChampionRegaliaStage,
  ChampionRole,
  RoleStat,
  RoleAbilityDetail,
  SigilStageDef,
} from '../types'

// ELO rating system
export const ELO_K_FACTOR = 32
export const ELO_RATING_SCALE = 400
/**
 * Matchup tuning — how far team power may tilt a battle, expressed in MMR
 * points so it can be added straight onto the player's rating.
 *
 * SWING caps the tilt in both directions, SOFTENING damps the ratio at the low
 * end (an empty roster becomes an underdog, not a hopeless case), and
 * ENEMY_WEAKEN_SWING is what fully neutralizing the enemy via augments is worth.
 */
export const BATTLE_POWER_RATING_SWING = 150
export const BATTLE_POWER_RATING_SOFTENING = 1500
export const BATTLE_ENEMY_WEAKEN_RATING_SWING = 150
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

// The phase registry (BATTLE_PHASES) lives further down, next to the phase
// durations it is built from.

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

/**
 * Uniform short forms of the ladder tiers (BottomScoreboard rank cell).
 * Rule: the first four letters of the tier — the single exception is
 * Grandmaster, whose "GRAN" would read as a tier of its own, so it keeps the
 * ladder-standard "GM". Every label stays within RANK_LABEL_MAX_CHARS, which
 * is what lets the cell render Iron and Challenger at the very same size.
 */
export const RANK_TIER_SHORT: Record<string, string> = {
  Iron: 'IRON',
  Bronze: 'BRON',
  Silver: 'SILV',
  Gold: 'GOLD',
  Platinum: 'PLAT',
  Emerald: 'EMER',
  Diamond: 'DIAM',
  Master: 'MAST',
  Grandmaster: 'GM',
  Challenger: 'CHAL',
}

/** Apex tiers — one ladder rung each, so they carry no division. */
export const APEX_RANK_TIERS = ['Master', 'Grandmaster', 'Challenger'] as const

/** Roman division → digit, so "IRON 4" stays as narrow as "GOLD 1". */
export const RANK_DIVISION_DIGITS: Record<string, string> = {
  IV: '4',
  III: '3',
  II: '2',
  I: '1',
}

// Abilities
export const MAX_ABILITY_LEVEL = 5

// Skill Tree Meep costs (Q, W, E, R)
export const SKILL_MEEP_COSTS = [3, 8, 20, 45] as const

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
// Shown instead of a bare "0" for materials the player has none of.
export const MATERIAL_EMPTY_GLYPH = '–'

// Champion travel timing
export const CHAMPION_TRAVEL_BASE_MS = 60_000 // 60s base travel time
export const CHAMPION_TRAVEL_SCALE_MS = 30_000 // +30s per galaxy
export const RESCUE_ROTATION_DURATION_MS = 2_000 // camera spin after role selection
export const CHAMPION_TRAVEL_BASE_LY = 500 // 500 LY for Galaxy 1
export const CHAMPION_TRAVEL_LY_PER_GALAXY = 500 // +500 LY per Galaxy
export const SKIP_DURATION_SECONDS = 5 // minimap skip-to-arrival shortcut

// Resource star flyby — mehrere Sterne erscheinen zufällig gestaffelt während der Reise
export const RESOURCE_STAR_INTERVAL_MIN_MS = 12_000 // frühester Abstand bis zum nächsten Spawn
export const RESOURCE_STAR_INTERVAL_MAX_MS = 40_000 // spätester Abstand bis zum nächsten Spawn
export const RESOURCE_STAR_MAX_CONCURRENT = 3 // max. gleichzeitig aktive Resource-Stars
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
export const BOSS_CPS_PENALTY_FRACTION = 0.05
export const BOSS_CPS_PENALTY_DURATION_MS = 30_000
export { BOSS_NAMES } from './bossNames'

/**
 * Boss-Sprites in `public/img/Boss/`. Bewusst eine feste Liste: die frühere
 * Laufzeit-Erkennung lud `Boss1.png`, `Boss2.png`, … sequenziell per `new Image()`
 * bis zum ersten 404 — 11 Requests und ~10 MB PNG-Decode bei JEDEM Öffnen des
 * Star-Fight-Modals, mitten in der Einblende-Animation.
 *
 * Neue Sprites hier eintragen. Maßstab: die Sprites werden mit 400–700 px Höhe
 * dargestellt (Full HD bis 4K), mehr als ~1400 px Kantenlänge ist verschwendeter
 * Decode — Boss11/12 lagen ursprünglich bei 2760×1504 (4,15 Mpx) und wurden
 * deshalb auf 1408×767 gebracht, wie der restliche Satz.
 */
export const BOSS_IMAGE_PATHS = [
  '/img/Boss/Boss1.png',
  '/img/Boss/Boss2.png',
  '/img/Boss/Boss3.png',
  '/img/Boss/Boss4.png',
  '/img/Boss/Boss5.png',
  '/img/Boss/Boss6.png',
  '/img/Boss/Boss7.png',
  '/img/Boss/Boss8.png',
  '/img/Boss/Boss9.png',
  '/img/Boss/Boss10.png',
  '/img/Boss/Boss11.png',
  '/img/Boss/Boss12.png',
] as const

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

// ── Baron Nashor (battle-scoped buff for the team that slays the baron) ───
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
/** Role ability metadata for the objective fight panels (colors come from ROLE_BY_KEY) */
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

/** Role ability metadata for the orbit/universe combat (roleBehaviorStore) */
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
// Die Bilder stehen nur im Crest der Bottom-Bar, dort mit der Statuszeile
// mitwachsend bis ~40px (4K) — laut Auflösungsvarianten-Regel also -256.
export const OBJECTIVE_FIGHT_STATUS = {
  drake: { label: 'Drake Fight', image: '/img/dragon-256.png' },
  baron: { label: 'Baron Fight', image: '/img/baron-256.png' },
  // Team-Farben aus dem Autobattle-Board (side names/kills in ScoreTopBar):
  // Blau = eigenes Team vorn, Rot = Gegner-Team vorn
  leadColor: '#93c5fd',
  behindColor: '#fca5a5',
  securedText: 'SECURED',
  lostText: 'LOST',
} as const

/** Trophy artwork for the secured drake/baron buff rails in the rift board's
 *  top corners. Tiles render up to ~44px, the hover card up to ~46px — laut
 *  Auflösungsvarianten-Regel (35–110px) also die -256er Variante. */
export const BUFF_RAIL_IMAGES = {
  drake: '/img/dragon-256.png',
  baron: '/img/baron-256.png',
} as const

/** Eyebrow captions for the rift board's bottom-corner meta panels. Each side
 *  shows two numbers that appear NOWHERE else on the board — the score bar and
 *  the app's bottom bar already own kills, gold, CS, objectives and the live
 *  win momentum, so these stay strictly meta: where you stand, and who you drew. */
export const BATTLE_META_LABELS = {
  rank: 'RANK',
  lp: 'LP',
  mmr: 'MMR',
  odds: 'ODDS',
} as const

/** Generated opponents carry no LP in the ranking model — the board rolls a
 *  flavour value in [0, this) once per battle and keeps it for the match. */
export const OPPONENT_LP_ROLL_MAX = 100

/** Placeholder when a meta value has no meaningful reading yet */
export const BATTLE_META_EMPTY = '—'

/** Rank labels up to this many characters ("GOLD II", "MASTER I") still fit
 *  the meta panel's rank cell at full size; longer ones ("GRANDMASTER I") step
 *  down a size so they render whole instead of being clipped. */
export const BATTLE_META_RANK_COMPACT_LENGTH = 9
export const BUFF_RAIL_TEAM_LABELS = {
  own: 'Blue Team',
  enemy: 'Red Team',
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
/** Dominance tiers for the meter visuals: within ±band of 50% reads as neutral,
 * at/above the crushing threshold the strongest (pulsing) presentation kicks in */
export const MOMENTUM_NEUTRAL_BAND = 0.03
export const MOMENTUM_CRUSHING_THRESHOLD = 0.8
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

// Vorgerenderte Stern-Sprites (starBackground/starSprites.ts). Sterne werden per
// drawImage geblittet statt pro Frame als Pfad gefüllt — die Palette hat nur
// 10 Farben, also reichen 10 kleine Offscreen-Canvases.
export const STAR_SPRITE_CORE_R = 8 // Kernradius im Sprite; Zielgröße kommt von drawImage
export const STAR_SPRITE_HALO_SCALE = 2 // Halo-Radius = Kernradius × 2 (wie die alten Fills)
export const STAR_SPRITE_HALO_ALPHA = 0.12 // Halo-Alpha relativ zum Kern (wie die alten Fills)
export const STAR_SPRITE_SUPERSAMPLE = 2 // Sprite in 2× rendern, immer verkleinert zeichnen

// Star background — warp / galaxy animation
export const WARP_SPEED_MAX = 70
export const GALAXY_TRANS_WARP_MS = 8_400
export const GALAXY_TRANS_DECEL_MS = 3_600
export const GALAXY_SPAWN_INTERVAL_MIN = 5_000
export const GALAXY_SPAWN_INTERVAL_MAX = 12_000
export const GALAXY_MAX_COUNT = 4
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

/** Refresh rate of HUD countdown tickers (buff/respawn timers): the deadline
 *  timestamps are reactive, Date.now() is not — a ref ticks the comparison. */
export const HUD_COUNTDOWN_TICK_MS = 250

// Champion Combat System
/** Detection radius from screen center in px. Planet within this range → champions can hit it. Not sun-relative. */
export const CHAMPION_DETECT_RADIUS = 350
export const CHAMPION_ORBIT_HIT_RANGE = 220 // px: champion orbit position must be within this of planet to deal damage
export const CHAMPION_DPS_BASE = 40 // damage per champion per second
/** Ally slots per role (team = 5 mains + 5 × ALLIES_PER_ROLE allies). Single source of truth. */
export const ALLIES_PER_ROLE = 5

/**
 * Sworn allies — the first SWORN_ALLY_COUNT sub-slots of every role are not just
 * more bodies: each lends the role's main champion SWORN_STAT_SHARE of its OWN
 * four stats. That is what makes it matter WHO sits there and at what level,
 * where the remaining sub-slots stay a flat headcount bonus (ALLY_DPS_CONTRIBUTION).
 *
 * The share feeds championLevelStore.effectiveStatsOf, so it reaches everything
 * a main's stats already drive — orbit DPS, auto-battle power, role-ability
 * cooldowns and reward rolls — without a second code path per system.
 */
export const SWORN_ALLY_COUNT = 2
export const SWORN_STAT_SHARE = 0.25
/** Sub-slot labels; index 0/1 are sworn, the rest fall back to "Ally n". */
export const SWORN_ALLY_LABELS = ['Sworn I', 'Sworn II'] as const
/** The mark a sworn slot wears in the LISTS — details panel rows, roster entries.
 *  The sigil board marks them by silhouette instead, see SIGIL_SWORN_FACETS. */
export const SWORN_ICON = 'game-icons:bowen-knot'
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
export const ORBIT_RADIUS_SCALE = 1.8

// ── Geteilte Orbit-Phase der Spieler-Planeten (Idle-Orbit ↔ Planeten-Tab) ────
/**
 * Tiefen-Schwelle, ab der ein Orbit-Objekt als „im Vordergrund" gilt — also am
 * Kampf teilnimmt und kein Eclipse-Medaillon trägt. Einzige Quelle für diese
 * Grenze: PlanetOrbit leitet daraus `isForeground` ab, das Command Panel
 * schaltet daran sein Medaillon, und der Planeten-Tab richtet Verdeckung wie
 * Medaillon danach aus.
 *
 * `depth = (relY + 1) / 2`, die Schwelle entspricht also `relY > 0.3`.
 */
export const PLANET_ORBIT_FOREGROUND_DEPTH = 0.65
/**
 * Anteil des Umlaufs, den die Planeten-Tab-Keyframes (`ps-planet-orbit`) vor der
 * Sonne verbringen. Muss zum z-index-Wechsel bei 70 % / 71 % passen.
 */
export const PLANET_TAB_ORBIT_FOREGROUND_PROGRESS = 0.7
/** Dauer der `ps-planet-orbit`-Keyframes in Sekunden — Basis fürs Phasen-Scrubbing. */
export const PLANET_TAB_ORBIT_PERIOD_SEC = 26

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
// Der Windup zieht die Einheit "weg vom Boss" — der steht ÜBER der Row, der
// Rückzug geht also nach unten. Für den Mid-Striker ist das exakt senkrecht
// (er steht in der Boss-Spalte): er zöge sich mitsamt seiner Info-Plate 21 px
// in die Sonne zurück, auf der er steht, und über deren HP-Leiste. Nach unten
// ist der Rückzug deshalb gedeckelt — seitwärts bleibt er unbeschnitten, dort
// steht nichts im Weg.
export const STRIKER_WINDUP_MAX_DOWN_PX = 8
// Champion-Row am Sonnen-Horizont: Winkel in Grad (0° = rechts, 90° = unten)
// je Rolle — Top ganz links, Mid oben Mitte, Support rechts. Alle Maße in %
// der Arena, damit das Layout auf Full-HD wie auf 2K identisch sitzt.
// Winkel so gewählt, dass die fünf Striker HORIZONTAL gleichmäßig verteilt
// sind (x = 24 / 37 / 50 / 63 / 76 % — je 13 % Abstand); der schmalere Bogen
// hält die Außenrollen klar von den Turret-Battery-Spalten (13 % / 87 %) frei.
// Die Winkel liegen auf der OBEREN Ellipsenhälfte (sin < 0) — die Row wölbt
// sich damit wie der Sonnen-Horizont darunter: Mid am höchsten, Top/Support
// weiter außen und tiefer, exakt der Krümmung der Sonnenscheibe folgend.
export const STRIKER_ARC_ANGLES: Record<ChampionRole, number> = {
  top: 210,
  jungle: 244,
  mid: 270,
  adc: 296,
  support: 330,
}
export const STRIKER_ARC_RX_PCT = 30 // horizontal semi-axis of the striker arc (% arena width)
// Flach: die Champions stehen als Row auf dem Sonnen-Horizont, kein tiefer
// Halbkreis mehr — sonst tauchen die Info-Plates in die Sonnenscheibe ein
export const STRIKER_ARC_RY_PCT = 3 // vertical semi-axis of the striker arc (% arena height)
// 68 statt 71: die Info-Plates hängen unter den Portraits und sind mit der
// auflösungsabhängigen Skalierung (--sip-u) gewachsen — die MITTLERE Plate lief
// dadurch in den Kopf der Sonnen-HP-Anzeige (.sfsun-hp-head), die exakt darunter
// mittig sitzt. Gemessene Überlappung vorher: 13 px auf Full HD, 18 px auf
// WUXGA, 26 px auf 2K. Die 3 % Hebung sind das obere Ende dessen, was das
// Vertikal-Budget hergibt: über der Row liegt das Loot-Banner (Unterkante
// 55–59 %), danach bleiben 11 px Luft auf WUXGA — dem flachsten Fall mit dem
// größten Banner. Nicht weiter anheben, ohne das Banner mitzumessen.
export const STRIKER_ARC_CENTER_Y_PCT = 68 // arc center as % of arena height (between loot banner and sun horizon)
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
export const BOSS_NOVA_PLAYER_DAMAGE = 5 // base damage each nova deals to the sun (Bard) in the orbit center
// Boss-Fähigkeit "Strike" (Auto-Attack): kurzer Cooldown, trifft EIN zufällig
// gewähltes lebendes Ziel (Champion, Spieler-Planet ODER die Sonne) — Rage
// verdoppelt auch diesen Schaden, wodurch die Rage-Phase bedrohlicher wird
export const BOSS_AUTO_INTERVAL_MS = 3000 // cooldown between two boss auto-attacks
export const BOSS_AUTO_ATTACK_DAMAGE = 8 // base single-target damage per auto-attack
/**
 * Gewicht der Sonne im Zufalls-Zielpool des Strikes. Champions und
 * Spieler-Planeten zählen je 1 — 5 bedeutet also: die Sonne wird so häufig
 * anvisiert wie alle fünf Orbit-Champions zusammen. Bewusst hoch, damit der
 * Treffer auf den Spieler im Star-Fight-Modal wie im Idle-Orbit sichtbar
 * bleibt und nicht in 1-von-12-Fällen untergeht.
 */
export const BOSS_STRIKE_SUN_WEIGHT = 5
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

// ── Sonnen-Horizont im Star-Fight-Modal ──────────────────────────────────────
// Die eigene Sonne (= der Spieler) steht als Kreiskalotte am unteren Arena-Rand:
// die Silhouette ist immer ein echter KREISBOGEN, der Mittelpunkt der Scheibe
// liegt je nach Phase auf oder unter dem Arena-Boden. Der Comet ist eine kleine
// exakte Halbkreis-Kuppe, mit jeder Sonnenphase wächst die Breite, bis die
// Finale-Sonne die gesamte Arenabreite füllt und nur noch ihr oberster
// Horizontbogen sichtbar ist. Die Champion-Row sitzt darüber, HP-Leiste dazwischen.
/**
 * Sichtbare HÖHE der Kalotte über dem unteren Arena-Rand (Kammhöhe). Bewusst als
 * geklemmtes PX-Band statt in Prozent: die Info-Plates der Champion-Row sind
 * px-groß, ein prozentuales Band würde auf Full-HD in sie hineinlaufen und auf
 * 4K unnötig viel Platz verschenken. Die Höhe ist der knappe Wert — gewachsen
 * wird über die BREITE (SUN_HORIZON_WIDTH_*).
 */
export const SUN_HORIZON_BAND_MIN_PX = 84
export const SUN_HORIZON_BAND_PCT = 11.5
export const SUN_HORIZON_BAND_MAX_PX = 260
/**
 * Breite der Kalotte in % der Arena-BREITE: der Comet ist die schmalste Kuppe,
 * die Finale-Sonne füllt die volle Breite. Untergrenze ist zusätzlich
 * SUN_HORIZON_DOME_WIDTH_FACTOR × Höhe — schmaler als ein exakter Halbkreis
 * wird die Kuppel nie (sonst stünde eine hohe, spitze Kuppe am Boden).
 */
export const SUN_HORIZON_WIDTH_MIN_PCT = 13
export const SUN_HORIZON_WIDTH_MAX_PCT = 100
export const SUN_HORIZON_DOME_WIDTH_FACTOR = 2
/**
 * Sichtbare Höhe als Faktor auf SUN_HORIZON_BAND_*: der Comet bleibt flacher
 * und gibt der Champion-Row Luft, die Finale-Sonne füllt das ganze Band. Alle
 * Anker (HP-Leiste, Zielscheibe, Bolt-Ziel, Floats) hängen an dieser Höhe.
 */
export const SUN_HORIZON_CREST_MIN_FACTOR = 0.78
export const SUN_HORIZON_CREST_MAX_FACTOR = 1
/**
 * Glutsaum auf der Silhouette und Hotspot in der Kammmitte skalieren mit der
 * Kuppel. Feste px-Werte würden auf der arenabreiten Finale-Sonne wie ein
 * aufgelegter Draht bzw. ein verlorener Fleck wirken.
 */
export const SUN_HORIZON_RIM_FACTOR = 0.09
export const SUN_HORIZON_RIM_MIN_PX = 5
/**
 * Weicher Limbus. Ein geometrisch harter Schnitt ergibt auf der fast waagerechten
 * Silhouette der breiten Phasen zwangsläufig eine sichtbare Treppe: pro Pixelspalte
 * gibt es nur ~1 px Übergang, bei einem Helligkeitssprung von >200 Stufen fällt
 * jede Stufe ins Auge (gemessen: 40 % der Spalten ohne jeden Zwischenwert —
 * unabhängig davon, ob per mask, clip-path oder SVG geschnitten wird).
 *
 * Deshalb läuft die Maske über SUN_HORIZON_SOFT_FACTOR × Saumbreite aus, und die
 * Box ragt um SUN_HORIZON_PAD_FACTOR × Saumbreite über den Kamm hinaus, damit
 * dieser Auslauf auch am Scheitel Platz hat. Zusätzlich sitzt der helle Glutsaum
 * bewusst INNEN — direkt an der Schnittkante liegt die dunkle Saumfarbe, deren
 * Kontrast zum Arena-Hintergrund gering ist.
 */
export const SUN_HORIZON_SOFT_FACTOR = 0.45
export const SUN_HORIZON_SOFT_MIN_PX = 2.5
export const SUN_HORIZON_PAD_FACTOR = 1.4
export const SUN_HORIZON_PAD_MIN_PX = 10
/** Halbe Breite des Glut-Halos, der die Silhouette von außen überstrahlt. */
export const SUN_HORIZON_LIMB_GLOW_FACTOR = 1.8
export const SUN_HORIZON_LIMB_GLOW_MIN_PX = 8
/**
 * Waagerechte Ausdehnung der Kernschattierung, geklemmt auf
 * SUN_HORIZON_BODY_RX_FACTOR × Kammhöhe (nie mehr als die halbe Kuppelbreite).
 * Bei den schmalen Phasen liegt der Verlauf damit konzentrisch zur Kuppel und
 * die Sonne wirkt kugelig; bei den breiten Phasen bleibt der heiße Kern in der
 * Mitte, statt die ganze untere Hälfte flächig weiß auszuwaschen.
 */
export const SUN_HORIZON_BODY_RX_FACTOR = 2.2
export const SUN_HORIZON_HOTSPOT_WIDTH_FACTOR = 0.3
export const SUN_HORIZON_HOTSPOT_HEIGHT_FACTOR = 2.6
/**
 * Korona-Halo: der Schein reicht SUN_HORIZON_GLOW_SPREAD_FACTOR × Kammhöhe über
 * die Kuppelbreite hinaus und GLOW_HEIGHT_FACTOR × Kammhöhe in die Arena.
 * Bewusst an der Höhe statt an der Breite orientiert — sonst würde die
 * Finale-Sonne einen arenaweiten, flächigen Schleier legen.
 */
export const SUN_HORIZON_GLOW_SPREAD_FACTOR = 3.2
export const SUN_HORIZON_GLOW_HEIGHT_FACTOR = 2.2
/**
 * HP-Streifen: wächst mit der Kuppel, bleibt aber ein HUD-Element — bei der
 * arenabreiten Finale-Sonne darf er nicht mitskalieren.
 */
export const SUN_HORIZON_HP_WIDTH_FACTOR = 0.4
export const SUN_HORIZON_HP_MIN_WIDTH_PX = 160
export const SUN_HORIZON_HP_MAX_WIDTH_PX = 420
/** Abstand zwischen Kamm und HP-Streifen (px, auflösungsunabhängig). */
export const SUN_HORIZON_HP_GAP_PX = 10
/** Lebensdauer des Crest-Aufleuchtens, wenn die Sonne getroffen wird (ms). */
export const SUN_HORIZON_HIT_FLASH_MS = 420
/** Lebensdauer eines Schadens-Floats über dem Sonnen-Kamm (ms). */
export const SUN_HORIZON_FLOAT_MS = 1200

/** Visual radius of the sun in pixels. All ORBIT_TIERS dimensions scale relative to this value. */
export const SUN_RADIUS = 80

/**
 * Background idle-scene sun disc diameter as a multiple of the current sun radius.
 * Matches the visible core (~4r) and the chime click target (currentSunRadius * 4),
 * so the shared phase disc stays aligned with the chime button and champion orbits.
 */
export const SUN_BG_DISC_RADIUS_FACTOR = 4

/**
 * Zielscheiben-Durchmesser über der Idle-Orbit-Sonne, wenn der Boss den Spieler
 * mit "Strike" anvisiert — als Vielfaches des Sonnenradius. Bewusst etwas
 * größer als SUN_BG_DISC_RADIUS_FACTOR, damit das Reticle die Sonnenscheibe
 * sichtbar umschließt statt auf ihr zu liegen.
 */
export const SUN_AIM_LOCK_RADIUS_FACTOR = 4.8

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
  { stage: 6, chimesThreshold: 600000, radius: 144, label: 'Collapse' },
]

/** Required sun phase (starPhase) to unlock each planet slot. Every sun phase after
 *  the comet unlocks one slot: slot index 0 → Spark (phase 0), …,
 *  slot index 5 → Collapse (phase 5). */
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
        icon: 'game-icons:lightning-arc',
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
        icon: 'game-icons:medical-drip',
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

/** Role key → its slot index in ROLES / headerSlots / secondarySlots. */
export const ROLE_INDEX_BY_KEY = Object.fromEntries(ROLES.map((r, i) => [r.key, i])) as Record<
  ChampionRole,
  number
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

/**
 * Caption of every scoreboard cell: the full word, plus the compact form the
 * fit falls back to when the strip is too narrow to carry the full set.
 *
 * The fallback is all-or-nothing — either every cell shows its word or every
 * cell shows its short form — so the row always reads as one row. Both forms
 * render uppercase; the full name stays in the cell's tooltip either way.
 */
export const SCOREBOARD_CELL_LABELS = {
  kills: { full: 'Kills', short: 'K' },
  deaths: { full: 'Deaths', short: 'D' },
  assists: { full: 'Assists', short: 'A' },
  gold: { full: 'Gold', short: 'Gold' },
  cs: { full: 'CS', short: 'CS' },
  rank: { full: 'Rank', short: 'Rank' },
  winLoss: { full: 'Win / Loss', short: 'W / L' },
  turrets: { full: 'Turrets', short: 'Twr' },
  dragons: { full: 'Dragons', short: 'Drg' },
  barons: { full: 'Barons', short: 'Bar' },
} as const

/**
 * Breitenbudget einer Zahlenzelle im Bottom-Scoreboard.
 *
 * Der Fit misst NICHT den Wert, der gerade dasteht, sondern die breiteste Form,
 * die formatNumberCompact überhaupt ausgeben kann. Sonst wiegt jeder Tick die
 * Zelle neu ("1.2K" → "12K" → "123K"), schiebt ihre neun Nachbarn zur Seite und
 * zieht die gemeinsame Zifferngröße mit — genau das Wandern, das die Leiste
 * unruhig gemacht hat. Mit dem konstanten Budget steht jede Zellbreite für die
 * ganze Session fest; nur ein Viewport-Resize rechnet noch einmal neu.
 *
 * Alle Kandidaten sind fünf Zeichen lang (drei Ziffern + zweibuchstabige
 * Einheit) — die längste Form, die formatNumberCompact kennt. Mehrere davon,
 * weil die Suffixe in MedievalSharp unterschiedlich breit bauen und der Fit den
 * breitesten nimmt; die Ziffern sind tabular, also deckt "999" jede Ziffernfolge
 * ab. Erst jenseits von 1e33 wechselt das Format in die Exponentialform
 * ("1.0e+33") — ein Bereich, den kein Battle-Stat je erreicht.
 */
export const SCOREBOARD_VALUE_BUDGET = [
  '999Qa',
  '999Qi',
  '999Sx',
  '999Sp',
  '999Oc',
  '999No',
] as const

/**
 * Auto-fit budget of the bottom scoreboard (see utils/scoreboardFit.ts).
 *
 * The strip measures its real cells and its real glyph widths, then derives ONE
 * shared value size that is as large as the tightest cell allows — instead of
 * guessing an average glyph width. These are the only tuning knobs of that fit;
 * everything else follows from the measurement.
 */
export const SCOREBOARD_FIT = {
  /**
   * Breathing room inside the strip, in UNSCALED px — the bar's frame stroke is
   * drawn at a fixed width too (BOTTOM_FRAME_W_SHADOW = 7, half of it below the
   * path), so the clearance the caption needs at the top does not shrink with
   * --hud-scale. Scaling it was what let the frame bite into the label row on
   * laptop-sized viewports.
   */
  STRIP_PAD_TOP_PX: 7,
  STRIP_PAD_BOTTOM_PX: 3,
  /** Label row: share of the strip height, clamped to the min/max below. */
  LABEL_HEIGHT_FRACTION: 0.2,
  /** The caption row is reserved before anything else and never falls below this. */
  LABEL_MIN_PX: 9.5,
  LABEL_MAX_PX: 16,
  /**
   * Only a cell too narrow for its own caption may push below LABEL_MIN_PX —
   * and only down to here. Under it the row is dropped (the tooltips remain).
   * With label-aware cell weights this no longer happens on desktop widths.
   */
  LABEL_HARD_MIN_PX: 7,
  /** MedievalSharp paints above its em box — the caption band reserves for that. */
  LABEL_LINE_FACTOR: 1.15,
  /**
   * How much bigger the numbers must get before the strip gives up the full
   * words for the short captions. Below it the words stay: a 2 % gain is not
   * worth reading "TWR" instead of "TURRETS".
   */
  SHORT_LABEL_VALUE_GAIN: 1.08,
  /** The value row never drops below this share of the strip, whatever the caption wants. */
  MAIN_ROW_MIN_FRACTION: 0.55,
  /** Passes of the joint caption-width / value-width solve (converges in 2–3). */
  FIT_PASSES: 4,
  /** Gap between caption and value row, as a share of the strip height. */
  ROW_GAP_FRACTION: 0.05,
  ROW_GAP_MIN_PX: 2,
  ROW_GAP_MAX_PX: 7,
  /**
   * Icon height as a multiple of the value size. Icon and number compete for
   * the same cell width, so they are solved together instead of the icon
   * taking the whole row height and starving the number: at 1.6 the icon still
   * reads as the cell's emblem while the number keeps the room it needs.
   */
  ICON_TO_VALUE_RATIO: 1.6,
  /**
   * On a cramped strip (laptop viewports) the icon yields width to the number
   * instead of holding its full 1.6 — the number is the information, the icon
   * is its marker. Interpolated between the two ratios by how far the value
   * size lands below VALUE_COMFORT_PX.
   */
  ICON_TO_VALUE_RATIO_MIN: 1.15,
  VALUE_COMFORT_PX: 30,
  /** Below this the icon reads as a speck — the cell drops it and keeps the number. */
  ICON_MIN_PX: 15,
  ICON_MAX_PX: 72,
  /** Gap between icon and value, as a share of the icon size. */
  ICON_GAP_FRACTION: 0.2,
  ICON_GAP_MIN_PX: 3,
  ICON_GAP_MAX_PX: 14,
  /** Horizontal padding per cell side, as a share of the average cell width. */
  CELL_PAD_FRACTION: 0.04,
  CELL_PAD_MIN_PX: 2,
  CELL_PAD_MAX_PX: 14,
  /** 1px hairline divider between two neighbouring cells. */
  CELL_DIVIDER_PX: 1,
  /** Cap-height safety: MedievalSharp overshoots its em box slightly. */
  VALUE_HEIGHT_FRACTION: 0.94,
  VALUE_MIN_PX: 11,
  VALUE_MAX_PX: 52,
  /**
   * Two stacked lines (win/loss) plus their 1px gap fit into the main row. The
   * cell stacks ALWAYS, not just past a length threshold: a record that folds
   * itself the day it grows a digit is one more thing that moves the strip.
   */
  STACKED_LINE_DIVISOR: 2.1,
  /** Horizontal air at both ends of the strip (must match the CSS padding). */
  STRIP_PAD_X_PX: 12,
} as const

/**
 * Auto-fit budget of the crest in the middle of the scoreboard — the game title
 * and, while the auto-battle runs, the live phase status.
 *
 * Same principle as the stat cells: the strip measures the string it is about to
 * render and the crest text grows until either its box or the strip height stops
 * it — no clamp() guessing an average glyph width. Two things make the middle a
 * different problem from the cells:
 *
 *   · It carries ONE line, not caption + value, so the whole strip height is its
 *     text band (the ornament sits beside the text, never above it).
 *   · Its box competes with the stat halves for the same width. The crest takes
 *     the width the halves have SPARE — the numbers are height-bound on every
 *     desktop resolution, so on most of them that costs them nothing at all.
 */
export const SCOREBOARD_CREST = {
  /**
   * ── Wie hoch eine Zeile WIRKLICH baut ──
   * Gemessen an MedievalSharp bei line-height 1: die Tinte einer Versalzeile
   * (mit Ziffern und Mittelpunkt) reicht von 0.04em bis 0.83em der Zeilenbox —
   * die unteren 17 % sind leer, weil der Font seinen Descent kaum nutzt.
   * Deshalb rechnet der Fit NICHT mit der Box, sondern mit der Tinte: die Zeile
   * bekommt genau INK_HEIGHT_EM als Außenhöhe (negative Ränder ziehen den Rest
   * aus dem Layout), und dieselbe Streifenhöhe trägt eine spürbar größere
   * Schrift — hier kommt der Platz für die Ornamentreihe über dem Titel her.
   */
  INK_HEIGHT_EM: 0.82,
  INK_TOP_EM: 0.03,
  TEXT_MAX_PX: 64,
  /**
   * Placeholder size until the first measurement lands — NOT a floor of the
   * fit: a line that does not fit its box has to get smaller, not be cut off.
   */
  TEXT_FALLBACK_PX: 16,
  /** Air inside the crest box, per side, in em of the text size. */
  PAD_EM: 0.45,
  /** Phase glyph / objective icon leading the live status, in em. */
  GLYPH_EM: 1,
  /** Gap between an ornament and the text, in em. */
  GAP_EM: 0.32,
  /**
   * Ornament row above the line (rule · star · rule). Its height is a share of
   * the strip, NOT of the text — so it stays put when the title hands the slot
   * over to the live status.
   */
  ORNAMENT_FRACTION: 0.22,
  ORNAMENT_MIN_PX: 9,
  ORNAMENT_MAX_PX: 20,
  /**
   * Longest a flanking rule may run, as a multiple of the star's size. It fills
   * whatever the ornament row gives it up to here, so the bracket over the line
   * stays proportional to the star instead of stretching the whole crest.
   */
  RULE_TO_STAR: 8,
  /**
   * Band kept free at the bottom edge for the phase-progress hairline. Unscaled
   * px, like the strip's own padding: the line is a hairline at every
   * resolution, so its clearance must not shrink with --hud-scale either.
   */
  PROGRESS_RESERVE_PX: 3,
  /**
   * Widest clock the status line has to hold, per phase. The fit budgets for
   * this instead of for the current tick, so a running countdown never resizes
   * the line (tabular numerals — the digits themselves are all the same width).
   */
  CLOCK_BUDGET: '8:88',
  CLOCK_BUDGET_BATTLE: '88:88',
  /** Worst case of the objective readout ("Infernal · 100%"). */
  OBJECTIVE_BUDGET: '100%',
  /**
   * The crest box never falls below this — MIN_PX on a desktop strip, the share
   * on anything narrower, where a fixed 340px would starve the ten stat cells.
   * At 2K the halves have no spare width at all and the crest lands exactly
   * here: the numbers give up ~2px so the middle gains a quarter of its size.
   */
  MIN_PX: 340,
  MIN_SHARE: 0.22,
  /** …and never grows past this, however much width the halves leave over. */
  MAX_PX: 660,
  MAX_SHARE: 0.34,
  /**
   * How much of the halves' spare width the crest may claim. The rest stays with
   * the cells as breathing room — at 1.0 every number would sit exactly on its
   * cell edge.
   */
  SLACK_TAKE: 0.8,
} as const

/** What clicking any part of the bottom scoreboard does — shown in its tooltip. */
export const SCOREBOARD_OPEN_HINT = 'Open Battle Stats'

/** The game's name, as the crest of the bottom bar renders it. */
export const GAME_TITLE = 'BARDLE'
/** Star ornament flanking the title in the crest. */
export const CREST_STAR_IMAGE = '/img/star-128.png'
/** Separator between a status and its clock / percentage in the crest. */
export const CREST_SEPARATOR = ' · '

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
  gold: '/img/BardGold-128.png',
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

/** Win streak from which the ladder flank paints the streak "hot" (BattleLandingScreen) */
export const HOT_WIN_STREAK_THRESHOLD = 3

/** Standout badges a roster card shows before it truncates (TeamRosterPanel) */
export const ROSTER_CARD_MAX_BADGES = 4

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

/**
 * Frame a roster card wears for the player's current ladder tier
 * (TeamRosterPanel → ChampionRankFrame). One entry per RANK_TIERS value; every
 * field climbs monotonically so the ten frames read as a single escalation.
 * Modelled on the ladder borders: a thin tier-coloured line that fades toward
 * the bottom, blade brackets in the upper corners and a crown seated on the top
 * edge. Iron already wears a complete (if plain) border; Challenger a winged
 * crown with a breathing aura and an arc of light circling the card.
 * Pixel values are base sizes — the frame scales them by viewport height.
 */
export interface RankFrameStyle {
  /** thickness of the frame line in px */
  width: number
  /** outer glow radius on the card in px */
  glow: number
  /** outer glow strength, 0…1 */
  glowAlpha: number
  /** ornament stage of the crown standing on the top edge */
  crown: 'plain' | 'crown' | 'wings' | 'royal' | 'apex'
  /** crown width in px */
  crownW: number
  /** crown height in px — how far it rises above the card. Keep it at a quarter
   *  of crownW: the artwork's viewBox is 4:1, and the shorter side wins, so a
   *  flatter ratio would silently cut the crown's width down. */
  crownH: number
  /** arm length of the upper corner blades in px */
  blade: number
  /** line saturation — Iron reads as cold steel, Challenger blazes */
  saturate: number
  /** reflection travelling along the line */
  sweep: boolean
  /** breathing aura inside the line */
  pulse: boolean
  /** rotating arc of light running around the card */
  halo: boolean
}

/* prettier-ignore */
export const RANK_FRAME_STYLES: Record<string, RankFrameStyle> = {
  Iron:        { width: 2,    glow: 9,  glowAlpha: 0.18, crown: 'plain', crownW: 72,  crownH: 18, blade: 16, saturate: 0.5,  sweep: false, pulse: false, halo: false },
  Bronze:      { width: 2,    glow: 12, glowAlpha: 0.21, crown: 'plain', crownW: 80,  crownH: 20, blade: 19, saturate: 0.95, sweep: false, pulse: false, halo: false },
  Silver:      { width: 2,    glow: 15, glowAlpha: 0.24, crown: 'crown', crownW: 88,  crownH: 22, blade: 22, saturate: 0.7,  sweep: false, pulse: false, halo: false },
  Gold:        { width: 2.25, glow: 19, glowAlpha: 0.28, crown: 'crown', crownW: 96,  crownH: 24, blade: 25, saturate: 1,    sweep: false, pulse: false, halo: false },
  Platinum:    { width: 2.25, glow: 23, glowAlpha: 0.31, crown: 'wings', crownW: 104, crownH: 26, blade: 28, saturate: 1,    sweep: false, pulse: false, halo: false },
  Emerald:     { width: 2.5,  glow: 27, glowAlpha: 0.35, crown: 'wings', crownW: 112, crownH: 28, blade: 31, saturate: 1.05, sweep: false, pulse: false, halo: false },
  Diamond:     { width: 2.5,  glow: 31, glowAlpha: 0.39, crown: 'royal', crownW: 120, crownH: 30, blade: 34, saturate: 1.1,  sweep: true,  pulse: false, halo: false },
  Master:      { width: 3,    glow: 37, glowAlpha: 0.45, crown: 'royal', crownW: 128, crownH: 32, blade: 37, saturate: 1.15, sweep: true,  pulse: true,  halo: false },
  Grandmaster: { width: 3,    glow: 43, glowAlpha: 0.51, crown: 'apex',  crownW: 136, crownH: 34, blade: 40, saturate: 1.2,  sweep: true,  pulse: true,  halo: false },
  Challenger:  { width: 3.5,  glow: 50, glowAlpha: 0.58, crown: 'apex',  crownW: 144, crownH: 36, blade: 44, saturate: 1.3,  sweep: true,  pulse: true,  halo: true  },
}

/** Empty roster slots wear the same frame, dialled down to this share (TeamRosterPanel) */
export const RANK_FRAME_EMPTY_GLOW_FACTOR = 0.3
/** Hovering a filled card widens its rank glow by this factor (TeamRosterPanel) */
export const RANK_FRAME_HOVER_GLOW_FACTOR = 1.45
/** Room the card's content keeps clear of the frame line, in px on top of its width */
export const RANK_FRAME_CONTENT_INSET = 5
/** How far the crown's foot reaches down into the card in px — the rest rises above it */
export const RANK_FRAME_CROWN_FOOT = 5
/** Largest --frame-scale any viewport applies — the role stripe clears the line at every size */
export const RANK_FRAME_MAX_SCALE = 1.25

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

// Game Loop
export const GAME_TICK_INTERVAL_MS = 1000
export const MEEP_ADD_DELAY_MS = 100
export const AUGMENT_CHOICE_COUNT = 3
export const RARITY_WEIGHT_FALLBACK = 60
// ── FPS-Zähler (neben der Signatur unten links) ─────────────────────────────
/** Ab hier läuft es rund — der Zähler steht grün. */
export const FPS_GOOD_THRESHOLD = 55
/** Darunter wird es zäh: unter diesem Wert schlägt der Zähler auf Rot um. */
export const FPS_POOR_THRESHOLD = 30
/** Wie lange die Auto-Pick-Meldung stehen bleibt, bevor sie ausblendet. */
export const AUTO_PICK_TOAST_MS = 6500
/** Taktung der Restsekunden-Anzeige in dieser Meldung. */
export const AUTO_PICK_TICK_MS = 200
/** Ab dieser Restzeit färbt sich die Uhr warnend — „gleich ist sie weg". */
export const AUTO_PICK_URGENT_MS = 2000
/** Icon des Auto-Picks — Modal-Button, Panel-Zeile und Meldung teilen es sich. */
export const AUTO_PICK_ICON = 'game-icons:cycle'
/** Display names of the four augment rarities (level-up selection cards). */
export const AUGMENT_RARITY_LABEL: Record<string, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
}
export const BUILDING_HISTORY_BUFFER_SIZE = 60
export const HYPERSPACE_ANIM_START_MS = 2500
export const HYPERSPACE_ANIM_END_MS = 3500
export const UNIVERSE_RESCUE_INITIAL_COST = 100_000
export const UNIVERSE_RESCUE_COST_MULTIPLIER = 2

// Planet Shop Roles
export const PLANET_HARVEST_INTERVAL_TICKS = 30 // harvest_node: 1 Material every 30 ticks
export const JUNGLE_BUFF_RANGE = 120 // px, screen-space proximity radius for jungle buff trigger
export const JUNGLE_BUFF_COOLDOWN_MS = 30_000 // 30s cooldown between jungle buff triggers
/**
 * Ausfallzeit eines zerstörten Planeten. Während dieser Zeit trägt er keinen
 * Rollen-Bonus bei, ist kein Ziel und fliegt nicht im Orbit; danach kehrt er mit
 * vollen HP zurück. Deutlich länger als CHAMPION_REVIVE_MS (8s), weil Planeten
 * viel mehr HP haben und entsprechend selten fallen.
 */
export const PLANET_RESPAWN_MS = 30_000

// ── Jungle-Buff-Marke im Idle-Orbit ────────────────────────────────────────
// Der gebuffte Planet trägt seinen Zustand in derselben Grammatik wie ein
// verfluchter oder rasender Stern (siehe StarSystemComponent): Marke an einer
// Leine, Restdauer als abschmelzender Balken, farbige Aura am Körper.
/** Abstand zwischen oberem Planetenrand und Unterkante der Buff-Marke (px) */
export const PLANET_BUFF_MARK_GAP_PX = 18
/** Restsekunden, ab denen die Buff-Marke blinkt (bleibt grün — kein Alarm) */
export const PLANET_BUFF_URGENT_SECS = 3

// Material rarity colors (WoW-style tiers) — used by the harvest target picker in
// PlanetSelectTabComponent to color material medallions, names and rarity badges.
export const MATERIAL_RARITY_COLOR: Record<string, string> = {
  common: '#c8c8c8',
  uncommon: '#4dff35',
  rare: '#5aabff',
  epic: '#c37aff',
}

/**
 * Seltenheit von hoch nach niedrig — Sortierreihenfolge, wo Material-Listen
 * nach Wert geordnet werden (Pause-Overlay-Ernte).
 */
export const MATERIAL_RARITY_ORDER: string[] = ['epic', 'rare', 'uncommon', 'common']

// ── Pause-Overlay: Material-Raster in der Stat-Kachel ──────────────────────
// Die Kachel fasst 4 × 2 Karten; fällt ein neuntes Material, gibt die letzte
// Zelle den Rest als „+N" aus. Die Rasterhöhe ist fest reserviert: klappte die
// zweite Reihe erst beim fünften Material auf, änderte sich die Panelhöhe
// mitten in der Pause — und mit ihr der Fit-Scale des gesamten Overlays.
export const PAUSE_MATERIAL_COLUMNS = 5
export const PAUSE_MATERIAL_ROWS = 2

// ── Pause-Overlay: HP am Sonnenhero ────────────────────────────────────────
/** Radius des HP-Rings in viewBox-Einheiten (0–100) — knapp am Scheibenrand. */
export const PAUSE_HP_RING_RADIUS = 47
/** Ab diesem Anteil gilt die Sonne als unversehrt (grün). */
export const PAUSE_HP_HEALTHY_PERCENT = 50
/** Darunter wird der Ring rot und die Plakette pulst. */
export const PAUSE_HP_CRIT_PERCENT = 25

// Augment rarity colors — used by the augment list in BardStatsTab.
export const AUGMENT_RARITY_COLOR: Record<string, string> = {
  common: '#9d9d9d',
  rare: '#4a90e2',
  epic: '#a855f7',
  legendary: '#e8c040',
}

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
export const GALAXY_BOSS_SPAWN_ANIM_MS = 5_000

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
export const GALAXY_BOSS_PLANET_ORBIT_RX = 38
export const GALAXY_BOSS_PLANET_ORBIT_RY = 22
export const GALAXY_BOSS_PLANET_ORBIT_TILT = 0.1

// ── Sternkugel-Größen im Idle-Orbit (geometry.ts → starBodySize) ─────────────
// Champion- und Resource-Sterne kommen aus ORBIT_TIERS.star; die Endkampf-Sterne
// haben eigene Werte samt Mindestgröße.
export const STAR_BODY_SIZE_BOSS_ESCORT = 30
export const STAR_BODY_SIZE_BOSS_ESCORT_MIN = 20
export const STAR_BODY_SIZE_GALAXY_BOSS = 58
export const STAR_BODY_SIZE_GALAXY_BOSS_MIN = 46

/** Winkel-Schrittweite, mit der die Bahntangente eines Sterns abgetastet wird. */
export const STAR_FX_TANGENT_PROBE_RAD = 0.05

// ── Star despawn FX (utils/starVanishFx.ts) ──────────────────────────────────
// Ein einziges additiv gezeichnetes Canvas für ALLE Sternabgänge. Gezeichnet
// wird ausschliesslich ein pro Farbe gecachtes Glow-Sprite (drawImage) plus
// wenige arc()-Strokes — deshalb bleiben auch 30 gleichzeitige Effekte im
// Frame-Budget. Der RAF-Loop läuft nur, solange Effekte leben.
export const STAR_FX_Z_INDEX = 50
export const STAR_FX_DPR_MAX = 2
/** Ab so vielen gleichzeitigen Effekten wird die Partikeldichte gesenkt (LOD). */
export const STAR_FX_LOD_THRESHOLD = 8
/** Untergrenze der Partikeldichte bei sehr vielen gleichzeitigen Effekten. */
export const STAR_FX_LOD_MIN_DENSITY = 0.3
/** Hard-Cap gleichzeitiger Effekte — ältester Effekt weicht dem neuen. */
export const STAR_FX_MAX_CONCURRENT = 40
/** Kantenlänge des gecachten Glow-Sprites in px. */
export const STAR_FX_SPRITE_SIZE = 96
/**
 * Untergrenze der Effektgröße (px). Die Sternkugel schrumpft mit kleiner Sonne
 * bis unter 25 px — ein Abgang in dieser Größe geht im Sternenfeld unter, ohne
 * dass der Spieler erkennt, welcher der beiden Fälle eingetreten ist.
 */
export const STAR_FX_MIN_SIZE = 64
/** Zusätzlicher weicher Bloom über dem Kern: Größenfaktor und Deckkraftanteil. */
export const STAR_FX_BLOOM_SCALE = 2.2
export const STAR_FX_BLOOM_ALPHA = 0.4
/** Ringstärke als Anteil der Effektgröße. */
export const STAR_FX_RING_WIDTH_FRACTION = 0.055
/** Maximal gecachte Glow-Sprites (eines pro Sternfarbe). */
export const STAR_FX_SPRITE_CACHE_MAX = 24
/** Ersatzdauer bei `prefers-reduced-motion`: nur ein kurzer Ausblendpuls. */
export const STAR_FX_REDUCED_MOTION_MS = 320

// Rescue — „Nova Bloom": Stern implodiert zu einem Blitz, sein Licht strömt
// als Funkenschweif in die eigene Sonne und lässt sie kurz aufglühen.
export const STAR_RESCUE_FX_DURATION_MS = 1500
export const STAR_RESCUE_FX_FLASH_FRACTION = 0.24 // Anteil der Dauer für Implosion + Blitz
export const STAR_RESCUE_FX_IMPLODE_SCALE = 0.42
export const STAR_RESCUE_FX_FLASH_SCALE = 3.1
export const STAR_RESCUE_FX_RING_COUNT = 2
export const STAR_RESCUE_FX_RING_STAGGER = 0.09 // Anteil der Dauer zwischen den Ringen
export const STAR_RESCUE_FX_RING_LIFE = 0.55 // Anteil der Dauer, den ein Ring lebt
export const STAR_RESCUE_FX_RING_MAX_SCALE = 6.5
export const STAR_RESCUE_FX_MOTE_COUNT = 16
export const STAR_RESCUE_FX_MOTE_DELAY_MS = 130
export const STAR_RESCUE_FX_MOTE_STAGGER_MS = 300
export const STAR_RESCUE_FX_MOTE_TRAVEL_MS = 950
export const STAR_RESCUE_FX_MOTE_SWING = 0.34 // seitlicher Schwung der Flugbahn
export const STAR_RESCUE_FX_MOTE_BLOOM = 0.5 // Ausbeulung nach aussen vor dem Einflug
export const STAR_RESCUE_FX_MOTE_EASE = 1.6 // >1 = zuerst treiben, dann beschleunigen
export const STAR_RESCUE_FX_MOTE_STRETCH = 2.6 // Streckung des Funkens bei Vollgas
export const STAR_RESCUE_FX_MOTE_SIZE = 0.3 // Funkengröße als Anteil der Effektgröße
export const STAR_RESCUE_FX_SUN_GLOW_SCALE = 3.4
/** Warmer Ton, in den die Sternfarbe bei der Rettung gemischt wird. */
export const STAR_RESCUE_FX_WARM_TINT: [number, number, number] = [255, 216, 128]
export const STAR_RESCUE_FX_WARM_MIX = 0.55

// Expire — „Warp-out": der Stern lädt kurz auf und reisst aus der Bahn aus.
export const STAR_EXPIRE_FX_DURATION_MS = 1250
export const STAR_EXPIRE_FX_CHARGE_MS = 300
export const STAR_EXPIRE_FX_SHIVER_PX = 1.6
// Beschleunigung des Ausbruchs. Deutlich >2 wirkt nicht schneller, sondern
// lässt den Stern erst regungslos stehen und dann in wenigen Frames aus dem
// Bild springen — die Bewegung ist dann nicht mehr lesbar.
export const STAR_EXPIRE_FX_LAUNCH_EASE = 1.8
export const STAR_EXPIRE_FX_TRAVEL_FACTOR = 0.85 // Anteil der Bildschirmdiagonale
export const STAR_EXPIRE_FX_STRETCH_MAX = 8
export const STAR_EXPIRE_FX_GHOST_COUNT = 6
export const STAR_EXPIRE_FX_GHOST_SPACING = 0.035 // Zeitabstand der Nachzieher
export const STAR_EXPIRE_FX_TANGENT_MIX = 0.55 // Tangente vs. radial nach aussen
export const STAR_EXPIRE_FX_DUST_COUNT = 12
export const STAR_EXPIRE_FX_DUST_SPEED = 42 // px/s
export const STAR_EXPIRE_FX_DUST_LIFE = 0.8 // Anteil der Dauer
/** Kalter Ton, in den die Sternfarbe beim Ausbruch gemischt wird. */
export const STAR_EXPIRE_FX_COOL_TINT: [number, number, number] = [138, 170, 226]
export const STAR_EXPIRE_FX_COOL_MIX = 0.55

// ── Star-Timer-Bars (Header) — Planeten-Kugeln mit Boss-HP-Füllstand ──────
// Die Bars lesen die Boss-Daten NICHT reaktiv, sondern über einen Snapshot,
// der im Takt von STAR_TIMER_TICK_MS neu gebaut wird. Damit invalidiert das
// Bar-Computed höchstens 5×/s statt bei jedem einzelnen Schadensereignis —
// entscheidend, wenn viele Sterne gleichzeitig unter dem Header hängen.
export const STAR_TIMER_TICK_MS = 200
// HP-Ratio wird auf Stufen gerundet, damit sich der gebundene Style-Wert
// (und damit der DOM-Write) nur bei sichtbarer Änderung überhaupt ändert.
export const STAR_TIMER_HP_STEPS = 20
// Schwellen für den Farbwechsel der Kugelfüllung
export const STAR_TIMER_HP_LOW_RATIO = 0.35
export const STAR_TIMER_HP_CRITICAL_RATIO = 0.15
// Solange der Boss lebt, bleibt mindestens dieser Anteil der Kugel gefüllt —
// bei 2 % HP wäre der Farbstreifen in einer ~11 px großen Kugel sonst unsichtbar.
export const STAR_TIMER_HP_MIN_FILL = 0.2
// Die Prozentzahl neben der Kugel läuft feiner als die Füllung (100 statt 20
// Stufen): sie ist der exakte Wert, die Kugel nur die grobe Silhouette.
export const STAR_TIMER_HP_PCT_STEPS = 100
// Ein lebender Boss zeigt nie "0" — sonst liest sich die Zahl wie "besiegt",
// während der Stern noch steht.
export const STAR_TIMER_HP_MIN_PCT = 1
// Nur der aktiv bekämpfte Planet zeigt seine HP dauerhaft. Jeder andere blendet
// sie ein, sobald er getroffen wird, und nach dieser Zeit ohne weiteren Treffer
// wieder aus — die Bar bleibt ruhig, statt permanent Zahlen zu zeigen.
export const STAR_TIMER_HP_REVEAL_MS = 2000
// Jede Bar endet an der Bogenkante des Header-Ovals auf Höhe ihrer eigenen
// UNTERkante — dort ist das Oval am schmalsten, sodass die senkrechte
// Balkenkante über die restliche Zeilenhöhe hinter dem Oval verschwindet. Diese
// Überlappung schließt zusätzlich den Subpixel-Spalt, den das Antialiasing der
// Rundung genau an der Berührungslinie sonst aufblitzen lässt.
export const STAR_TIMER_CENTER_OVERLAP_PX = 1
// Balkenbreiten werden auf halbe Pixel gerundet: Ohne das schriebe schon das
// Subpixel-Rauschen einer Messung bei jedem Tick neue Grid-Spalten in 30 Zeilen.
export const STAR_TIMER_WIDTH_SNAP_PX = 0.5

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

// Expedition generation — thematic icon pool for procedurally named missions
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

// ── Champion loading screen (between planet search and the first game-second) ──
/** How long the champion loading screen is shown (ms) */
export const BATTLE_LOADING_PHASE_DURATION_MS = 5000
/**
 * Per-card fill speed of the loading bars, indexed by roster slot. Every card
 * finishes before the phase ends (lowest factor × duration ≥ duration), they
 * just get there at different moments — a lobby loads unevenly.
 */
export const LOADING_CARD_SPEED_FACTORS = {
  blue: [1.45, 1.12, 1.62, 1.28, 1.05],
  red: [1.2, 1.5, 1.08, 1.36, 1.55],
} as const
/** Poll interval of the loading-phase await loop in the battle tab (ms) */
export const LOADING_PHASE_POLL_MS = 120
/** Tick interval of the phase clock the loading screen reads (ms) */
export const LOADING_PHASE_TICK_MS = 100
/** A tile counts as summoned from this percentage on (frame lights up) */
export const LOADING_READY_PERCENT = 100
/** Star levels up to these bounds read as low / medium enemy threat */
export const LOADING_THREAT_STAR_BOUNDS = { low: 4, medium: 8 } as const
export const LOADING_THREAT_LABELS = { low: 'LOW', medium: 'MED', high: 'HIGH' } as const
/** Rank tier every scouted enemy champion falls back to when unranked */
export const LOADING_ENEMY_FALLBACK_TIER = 'Silver'

/**
 * ── Battle phase registry ──
 * Single source of truth for the auto-battle cycle. The store derives the
 * running phase from its timestamps (battleStore.currentBattlePhase), every
 * readout renders label/color/duration from here. A new phase = one entry, one
 * timestamp in the store and one screen — nothing else duplicates the ladder.
 */
export const BATTLE_PHASES: Record<BattlePhaseKey, BattlePhaseConfig> = {
  landing: {
    key: 'landing',
    label: 'Idle',
    icon: null,
    color: '#c89040',
    durationMs: null,
  },
  searching: {
    key: 'searching',
    label: 'Planet Search',
    icon: 'game-icons:telescope',
    color: '#9a6830',
    durationMs: PLANET_SEARCH_ANIM_DURATION_MS,
  },
  loading: {
    key: 'loading',
    label: 'Loading',
    icon: 'game-icons:spawn-node',
    color: '#5b8dd9',
    durationMs: BATTLE_LOADING_PHASE_DURATION_MS,
  },
  battle: {
    key: 'battle',
    label: 'Battle',
    icon: 'game-icons:broadsword',
    color: '#e8c040',
    durationMs: BATTLE_REAL_DURATION_SECONDS * 1000,
  },
  honor: {
    key: 'honor',
    label: 'Honor',
    icon: 'game-icons:trophy',
    color: '#74d448',
    durationMs: BATTLE_RESULT_PAUSE_MS,
  },
}

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

// Herald — large centered milestone announcements (HeraldOverlay / useHerald)
/** How long a single herald banner stays on screen (ms) */
export const HERALD_DISPLAY_MS = 2_000
/** Max queued heralds; oldest is dropped past this */
export const HERALD_QUEUE_MAX = 3
/** Grace period after mount before heralds arm — swallows the state jumps that
 *  loadGame() causes so a loaded save never fires a spurious warp/rank banner. */
export const HERALD_ARM_DELAY_MS = 1_500
/** Accent color (r,g,b) per herald kind; rank-ups pull from RANK_TIER_COLORS. */
export const HERALD_ACCENT_WARP = '150, 120, 255'
export const HERALD_ACCENT_CHAMPION = '232, 192, 64'

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

/** Bard Stats "Solar Evolution" — the live sun sits at the centre of the middle
 *  column and the seven phases ride an open orbit around it. Every value is in
 *  the SVG's 100×100 user units, which are also % of the square stage, so the
 *  whole dial scales with the resizable column instead of needing pixel sizes
 *  per resolution. Angles are measured from 12 o'clock, clockwise. */
export const STATS_TAB_ORBIT = {
  /** side of the square viewBox — reference frame for every value below */
  VIEW: 100,
  /** Vertical centre of the dial (% of the stage). Everything the dial says now
   *  lives INSIDE the ring — identity above the sun, the evolve gate on it — so
   *  the ring no longer has to leave a band free at the bottom and sits dead
   *  centre again. */
  CENTER_Y: 50,
  /** Radius of the phase orbit. With no caption block below the arc, the ring
   *  claims the stage — but every marker now carries a permanent tag, and the
   *  one at 12 o'clock puts its tag OUTSIDE the ring, so the ring has to leave
   *  a 10% band at the top for it. */
  RADIUS: 40,
  /** Clear air (% of the stage) between a marker's DISC and its permanent tag —
   *  measured from the disc's edge, not the orbit line, because the markers are
   *  sized to their phase and the collapse disc is nearly five times the width
   *  of the comet speck. Outward where the stage has room, inward on the
   *  flanks, where the stage's edge is right there. */
  TAG_OUT_PCT: 4.5,
  TAG_IN_PCT: 6,
  /** |sin(angle)| above this means the marker sits too far out to the side for
   *  an outward tag — it gets an inward one instead. */
  TAG_FLANK_SIN: 0.75,
  /** Width (% of the stage) of a tag. Fixed, so a long phase name never shifts
   *  the tag off its marker — and so the clearances above can be computed. */
  TAG_WIDTH_PCT: 19,
  /** orbit line thickness */
  STROKE: 1.6,
  /** angle of the first step (the comet), i.e. the lower-left end of the arc */
  START_DEG: -140,
  /** angular length of the open ring — the 80° gap at the bottom carries the
   *  phase caption and dwell clock, and an open arc reads as a progression
   *  instead of a cycle */
  SPAN_DEG: 280,
  /** Top edge (% of the stage) of the identity block above the sun. Sits below
   *  the ring's topmost marker (which reaches ~9.6%) and above the largest sun
   *  disc (whose top edge is at 29%) — the one band inside the ring that no
   *  body ever occupies, at any phase. */
  IDENT_TOP_PCT: 11.5,
  /** Width (% of the stage) of a marker's hover card. It carries four readouts
   *  in a row, so it is wide — which is why the card anchors to whichever edge
   *  keeps it on the stage instead of always centring on its marker. */
  TIP_WIDTH_PCT: 64,
  /** Markers further out than this (or than 100 − this) anchor their card by
   *  the near edge and let it grow toward the middle of the stage. */
  TIP_EDGE_PCT: 34,
  /** dot diameter (% of the stage) = phase radius × this — keeps the orbit dots
   *  true to the in-game sun proportions (1.9%…7%) */
  DOT_PCT_PER_RADIUS: 0.05,
  /** comet dot diameter (% of the stage) — a fixed speck, smaller than any sun */
  COMET_DOT_PCT: 1.5,
  /** sun disc diameter (% of the stage) at the smallest / largest phase radius */
  SUN_PCT_MIN: 26,
  SUN_PCT_MAX: 42,
  /** comet disc diameter (% of the stage) — the origin body, below every sun */
  COMET_SUN_PCT: 17,
  /** Largest rendered stage width (px). Deliberately generous: on 4K the column
   *  offers ~1400px of height, and a dial capped much lower leaves a band of
   *  dead space between the ring and the readouts below it. In practice the
   *  column's own width and height bind first — this is only a ceiling. */
  MAX_PX: 1200,
  /** Compact cap (px) on Full-HD-height viewports. Set above what those
   *  viewports can actually give the dial, so there the HEIGHT decides — the
   *  cap only guards very wide, very flat windows. */
  MAX_PX_COMPACT: 520,
} as const

/** Bard Stats panel deck — user-resizable column widths (px). The two side
 *  columns (Journey / Galaxy Archive) are drag-resized; the middle (Solar
 *  Evolution) flexes to fill the rest and is protected by MIN_MIDDLE. It also
 *  carries the sun dial, so the sides are kept just wide enough for their own
 *  content — on Full HD every pixel they give back widens the dial. */
export const STATS_TAB_DECK_RESIZE = {
  /** initial width of the left (Journey) column — starts fully expanded (= MAX_LEFT) */
  DEFAULT_LEFT: 360,
  /** initial width of the right (Galaxy Archive) column — starts fully expanded (= MAX_RIGHT) */
  DEFAULT_RIGHT: 440,
  /** smallest either side column may shrink to */
  MIN_SIDE: 200,
  /** largest the left column may grow to — measured: the Play-Time odometer
   *  needs ~344px, so this is the tightest the column can be without cutting it */
  MAX_LEFT: 360,
  /** largest the right column may grow to — the archive title needs the width
   *  at the 4K type scale, so this one does NOT give ground to the dial */
  MAX_RIGHT: 440,
  /** the middle (Augments) column never shrinks below this */
  MIN_MIDDLE: 260,
} as const

/** Magnifier size (px) of the shared search bar (`ui/RpgSearchBar.vue`), per
 *  size variant. The icon is an Iconify component, so the value has to come
 *  from script — it cannot live in the stylesheet with the rest of the sizing. */
export const SEARCH_BAR_ICON_PX = {
  /** default bar (46px tall) — Champion Shop, Champion Select, Synergies, … */
  md: 18,
  /** compact bar (34px tall) — Bard Stats column headers, Champion Picker */
  sm: 15,
} as const

/** Bard Stats "Journey" progress gauges (Level / Galaxy / Universe). The ring is
 *  drawn as SVG in a square viewBox, so every value below is in user units and
 *  scales automatically with whatever width the resizable column gives it. */
export const STATS_TAB_GAUGE = {
  /** side of the square viewBox — reference frame for all values below */
  VIEW: 100,
  /** ring radius; leaves room for the stroke plus its glow inside the box */
  RADIUS: 41,
  /** ring thickness */
  STROKE: 7,
  /** value font size per length bucket: 1–2 chars, 3, 4, 5+ — longer readouts
   *  (three-digit levels, roman "VIII") shrink so they never touch the ring */
  VALUE_FONT: [40, 32, 26, 21],
  /** largest rendered ring diameter (px); below this the ring scales with the column */
  MAX_PX: 96,
  /** compact ring diameter (px) on Full-HD-height viewports */
  MAX_PX_COMPACT: 78,
} as const

// ── Star Forge (Shop tab) ─────────────────────────────────────────────────────
// Tree geometry — the tree lives on a square stage, nodes placed on 3 polar rings.
export const FORGE_STAGE_SIZE = 820
export const FORGE_RING_ROOT_R = 165
export const FORGE_RING_BRANCH_R = 285
export const FORGE_RING_LEAF_R = 385

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
export const SIGIL_PENTAGON_RADIUS = 255
/** Pentagon angles: Top at 12 o'clock, the ROLES order running clockwise. */
export const SIGIL_PENTAGON_START_ANGLE = -90
export const SIGIL_PENTAGON_ANGLE_STEP = 360 / ROLES.length
/**
 * The role cluster is a fan, not a ring: the two sworn allies hug their role node
 * while the bench sits far out on the pentagon's own arc. The whole set below was
 * solved together against seven constraints — the node's regalia frame (63px), the
 * satellites against each other, the sworn pair, the inner rune ring, the
 * neighbouring cluster 72° away, and the stage box the board's fit-scale clips at
 * (SIGIL_STAGE_SIZE / 2). Verified in the browser at all four desktop reference
 * resolutions, with the five longest champion names seated and a role selected
 * (that node scales 1.12): zero overlaps, tightest pair 15.6px at Full HD and
 * 4.2px in the selected state. The bench ends up 1.46× further from the node than
 * the sworn pair — that ratio IS the hierarchy. Do not nudge one value alone.
 */
export const SIGIL_ALLY_RADIUS = 416
/** Total angular span (degrees) of the bench arc, centered on the role's pentagon angle. */
export const SIGIL_ALLY_ARC_DEG = 36
/**
 * Sworn allies are placed in the ROLE NODE's own frame, not on a global ring:
 * SIGIL_SWORN_GAP away from it, SIGIL_SWORN_SPREAD_DEG to either side of the
 * outward radial. That is what lets them sit right against the main while the
 * bench stays out on the arc.
 */
export const SIGIL_SWORN_GAP = 110
export const SIGIL_SWORN_SPREAD_DEG = 58
/** Sworn satellites are drawn larger than the bench ones. */
export const SIGIL_SWORN_SIZE = 42
/**
 * A sworn satellite is a CUT PLATE, the bench a disc — the silhouette alone is
 * what tells the two ranks apart on the board, at any camera scale and without a
 * badge, a second colour or a per-frame cost. It puts the sworn pair in the same
 * family of cut metal as the role node's own regalia plates, with the bench
 * orbiting round around them.
 *
 * `turn = 0.5` seats the hexagon flat-topped (vertices left and right). The
 * portraits are cropped `object-position: top`, so a flat top edge keeps the
 * champion's head intact where a pointed one would shear its corners off.
 *
 * The plate reaches SIGIL_SWORN_RIM_PX past the portrait box on every side, so
 * its widest radius is SIGIL_SWORN_SIZE / 2 + SIGIL_SWORN_RIM_PX = 24px.
 * LINK_GAP_SWORN in SigilSvgLayers.vue trims the connector lines against exactly
 * that radius — raising one without the other makes the lines touch the metal.
 */
export const SIGIL_SWORN_FACETS = 6
export const SIGIL_SWORN_FACET_TURN = 0.5
export const SIGIL_SWORN_RIM_PX = 3
/** Aura behind the plate: a radial fade clipped to a WIDER copy of the same
 *  polygon. Clipped rather than blurred, so it glows without a filter pass — and
 *  shaped rather than box-shadowed, so no circular halo betrays the hexagon. */
export const SIGIL_SWORN_GLOW_PX = 11
/**
 * A role node's own decorations, placed relative to the node's INWARD radial
 * (the direction pointing at the sigil's core). Every satellite of the role lies
 * outward or lateral — sworn sit ±SIGIL_SWORN_SPREAD_DEG off the OUTWARD radial —
 * so the inward half is the one region that can never collide with them,
 * whatever the role's angle or the champion's name length.
 *
 * The two decorations share ONE axis and sit at its two ends: the name plate at
 * SIGIL_NODE_NAME_OFFSET inward, the level medallion at SIGIL_NODE_BADGE_INSET
 * outward. Whatever angle the pentagon hands a role, the number always stands
 * directly across the portrait from the name and XP it belongs to.
 *
 * Outward is not the satellites' half in the one direction that matters here: the
 * sworn pair straddles the outward radial at ±SIGIL_SWORN_SPREAD_DEG, leaving the
 * radial itself open. 66 is where the 34px medallion clears the portrait: it starts
 * at 66 − 17 = 49, two pixels past the portrait's own 47px edge. That clearance is
 * what keeps it off the ★ tier bar — that bar sits along the portrait's bottom rim,
 * so for the two roles whose outward radial points downward a medallion seated ON
 * the rim would cut straight through it. Outward it reaches 83px, past the regalia
 * frame's 63 but still 52px clear of either sworn plate (they sit 110px out) and
 * 60px clear of the middle bench satellite on the same radial.
 * Distances are from the node's centre.
 */
export const SIGIL_NODE_BADGE_INSET = 66
/**
 * The name plate carries TWO lines — the champion's name and, under it, the XP
 * the arc around the portrait draws. They share one plate rather than sitting on
 * two anchors: for the four roles whose inward radial runs diagonally, a second
 * chip further down the same radial can never clear a 132px-wide plate (the step
 * along a diagonal buys far too little vertical separation), so the plate would
 * be overlapped for every role but Top.
 *
 * 80 is where the two-line plate (~31px tall) clears the node's regalia frame:
 * the frame reaches 63px from the node centre, the plate starts at 80 − 16 = 64.
 * Inward its far edge lands at pentagon radius 255 − 96 = 159, clear of the
 * centre crest (radius 85). Verified in the browser, idle and with a role
 * selected (that node scales 1.12), at Full HD and 2K.
 */
export const SIGIL_NODE_NAME_OFFSET = 80
/** Name plates truncate rather than sprawl — a long name must not reach a satellite. */
export const SIGIL_NODE_NAME_MAX_WIDTH = 132
export const SIGIL_NODE_SIZE = 94
export const SIGIL_ALLY_SIZE = 36
export const SIGIL_CREST_SIZE = 170
/**
 * XP arc traced around a role node, in a 0–100 viewBox so it scales with the
 * node. The circumference is precomputed because stroke-dasharray needs it to
 * turn an XP ratio into an arc length.
 */
export const SIGIL_XP_RING_RADIUS = 46
export const SIGIL_XP_RING_CIRCUMFERENCE = 2 * Math.PI * SIGIL_XP_RING_RADIUS
/** How far the XP ring sits outside the portrait circle, in % of node size. */
export const SIGIL_XP_RING_INSET = -9
/** SVG ring radii (stage coordinates, center = SIGIL_STAGE_SIZE / 2). */
export const SIGIL_RING_OUTER_R = 430
export const SIGIL_RING_RUNE_R = 360
export const SIGIL_RING_INNER_R = 180
export const SIGIL_RING_CORE_R = 120

/** Extra zoom multiplier while a role is focused (camera zoom-in on role + allies). */
export const TEAM_SIGIL_FOCUS_ZOOM = 1.6
/** Camera pan/zoom transition duration (ms) — mirrored in SigilBoardComponent CSS. */
export const TEAM_SIGIL_CAMERA_MS = 450
/**
 * Width (px) of the role details panel — the board's fit-scale subtracts it while
 * a role is selected so open/close resolves in a single camera move. The panel is
 * two-column and carries the whole champion progression (levels, perks, costs)
 * that used to live in a modal, so it is roughly twice the synergies panel.
 */
export const TEAM_SIGIL_DETAILS_PANEL_WIDTH = 900
/** Width (px) of the left (identity + progression) column inside that panel. */
export const TEAM_SIGIL_DETAILS_LEFT_WIDTH = 434
/**
 * Width (px) of the captain card in the details-page roster strip. To its right
 * sit two grow-flex rows — the sworn pair on top, the rest of the bench below —
 * so neither row depends on a column count that has to divide ALLIES_PER_ROLE.
 */
export const TEAM_SIGIL_MAIN_CHIP_WIDTH = 250
/** Width (px) of the captain card's edge-to-edge portrait column. */
export const TEAM_SIGIL_MAIN_PORTRAIT_WIDTH = 92
/** Width (px) of the team synergies panel — the other, narrower side panel. */
export const TEAM_SIGIL_SYNERGIES_PANEL_WIDTH = 460
/** Height (px) of the details-panel splash header (hero card: name + tier/origin/trait chips). */
export const TEAM_SIGIL_SPLASH_HEIGHT = 292
/**
 * Ceiling the splash may grow to, as a share (%) of the left column's height —
 * a share rather than a pixel cap, so the column fills out just as tightly at 4K
 * as at Full HD.
 *
 * Raised from 52 when the perk path moved to the right column. The old value
 * existed to stop a tall column from becoming one giant portrait over a squeezed
 * ladder; there is no ladder under the portrait any more, only the Level Up block
 * (fixed height) and the equipment row (its own per-tile floor). What the cap
 * still does is keep the crop from going absurdly tall and narrow in a 434px
 * column, and hold something back for the gear below.
 *
 * Never binding at Full HD — there the splash sits on its own
 * TEAM_SIGIL_SPLASH_HEIGHT_COMPACT floor and the column already overflows.
 */
export const TEAM_SIGIL_SPLASH_MAX_SHARE = 62
/** Max camera drag-pan as a fraction of the scaled stage size (rubber-band bound). */
export const TEAM_SIGIL_PAN_MAX_FRACTION = 0.15
/** Pointer travel (px) below which a pointer-down still counts as a click, not a drag. */
export const TEAM_SIGIL_DRAG_THRESHOLD_PX = 5

/**
 * Aufbaustufen des Team-Tabs. Der Tab bringt auf einen Schlag ein Sigil-Board,
 * fünf Rollenknoten, 25 Ally-Satelliten und eine zweispaltige Detailseite mit —
 * in einem einzigen Frame gerechnet, gelayoutet und gerastert ergibt das genau
 * den Ruckler, den man beim Öffnen sieht. Stattdessen wächst der Tab über drei
 * Frames: erst das Board mit den Rollen, dann die Satelliten, dann die
 * Detailseite (die ohnehin hereingleitet und einen Frame Verzug nicht verrät),
 * zuletzt die Regalia-Ornamente der Knoten. Dieselbe Gesamtarbeit, verteilt
 * statt am Stück.
 *
 * Die Ornamente kommen bewusst zum Schluss: Platten, Sweep, Nieten, Halo und
 * Corona sind je Knoten ein halbes Dutzend Ebenen aus clip-path, Kegelverläufen
 * und Masken — die teuersten Rasteroperationen, die es hier gibt, mal fünf
 * Knoten. Sie tragen keine Information, die man in den ersten drei Frames
 * braucht.
 */
export const TEAM_TAB_MOUNT_STAGE_BOARD = 0
export const TEAM_TAB_MOUNT_STAGE_SATELLITES = 1
export const TEAM_TAB_MOUNT_STAGE_PANEL = 2
export const TEAM_TAB_MOUNT_STAGE_ORNAMENTS = 3
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

/**
 * Downscaled art variants generated next to every splash
 * (`KDASkin.jpg` → `KDASkin-128.jpg` / `-256.jpg` / `-512.jpg`, longest edge in
 * px). Squeezing a 1280px splash into a 24px feed slot throws away 99% of the
 * pixels and shimmers — pick the variant by the LARGEST rendered edge of the
 * element, so the numbers still hold at DPR 2:
 *   ≤ 34px → 'sm' · 35–110px → 'md' · 111–220px → 'lg' · above → 'full'.
 * Jede Schwelle ist die Variantenkante geteilt durch vier: doppelte Pixeldichte
 * mal zwei Reserve, damit Skalierung nie sichtbar wird.
 * A path with no matching variant on disk simply keeps its source — die
 * Champion-Icons unter /img/champion sind mit 380px von Haus aus kleiner als
 * die 512er-Stufe und behalten dort ihr Original (siehe getChampionIconPath).
 */
export const CHAMPION_ART_VARIANT_PX = { sm: 128, md: 256, lg: 512, full: 0 } as const
/**
 * Dateisuffixe der Material-Icons (public/img). `Material.image` zeigt auf die
 * 128er-Stufe; das Loot-Banner des Star-Fight-Modals wächst mit der Auflösung
 * über deren Grenze hinaus und greift über `materialIconMd()` zur 256er.
 */
export const MATERIAL_ICON_SM_SUFFIX = '-128.png'
export const MATERIAL_ICON_MD_SUFFIX = '-256.png'
/** Bildlose Materialien tragen im Loot-Banner ein Monogramm ihrer Initialen. */
export const LOOT_MONOGRAM_MAX_CHARS = 2
/**
 * Mittlere Stufe der Rollen-Artworks (public/img/roles). `ROLES[].image` zeigt
 * bewusst aufs Original, weil dieselbe Konstante an anderer Stelle groß
 * gerendert wird; wer sie klein zeigt, leitet daraus diese Stufe ab.
 */
export const ROLE_ART_MD_SUFFIX = '-256.png'
/** Largest rendered edge each variant is still safe for (px, at DPR 2). */
export const CHAMPION_ART_SM_MAX_EDGE = 34
export const CHAMPION_ART_MD_MAX_EDGE = 110
export const CHAMPION_ART_LG_MAX_EDGE = 220
/**
 * Stufe der Rollenkarten im Command Panel (Bottom Bar, ~200 px hoch). Steht
 * hier, weil das Sigil-Board dieselben fünf Champions zeigt und sich an diese
 * Stufe anlehnt, statt eine zweite Datei desselben Motivs zu holen.
 */
export const COMMAND_PANEL_ART_SIZE: ChampionArtSize = 'lg'

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
    // The star does not keep burning — it collapses. Reached through a one-shot
    // supernova (see SUPERNOVA_* below), the sun spends this final phase as a
    // black hole: an opaque event-horizon shadow inside a tilted accretion disc.
    // core/mid/edge describe the DISC, not a plasma body — every renderer that
    // draws the final phase reads BLACK_HOLE_* for the geometry on top of them.
    name: 'Collapse',
    astroName: 'Black Hole',
    radius: 140,
    core: '#ffffff',
    mid: '#c8a2ff',
    edge: '#6a12b8',
    glow1: '#b45cff',
    glow2: '#7412c8',
    glow3: '#2c0655',
    phasePrimary: '#d9b6ff',
    phaseGlow: '#b45cff',
    factor: 1.6,
    pulseSpeed: '1.5s',
  },
]

/** Index of the final star phase — the collapsed one (Black Hole). Everything
 *  that needs to ask "is the sun a black hole?" compares against this instead of
 *  hard-coding 5, so adding a phase later cannot silently split the check. */
export const STAR_PHASE_FINAL_INDEX = STAR_PHASE_DATA.length - 1

// ── Collapse phase geometry (Black Hole) ─────────────────────────────────────
/**
 * The final phase is drawn by BlackHoleDisc.vue (CSS) and by drawBlackHole()
 * (minimap canvas). Both read the SAME fractions from here so the silhouette is
 * identical at 560 px in the idle orbit and at 9 px on the minimap.
 *
 * Every *_FRACTION is a fraction of the rendered box WIDTH (= the diameter the
 * old plasma disc would have had), so the black hole slots into the existing
 * `diameter` contract of PhaseSunDisc / CometDisc without touching any layout.
 *
 * Layer order, outside → in:
 *   jets · lensed halo arc · disc far half · shadow + photon ring · disc near half
 */
/** Opaque event-horizon shadow. Pure black — it is the only fully opaque part,
 *  and the reason a planet passing behind the sun still gets occluded. */
export const BLACK_HOLE_SHADOW_FRACTION = 0.36
/** Photon ring thickness — the light orbiting right at the horizon. Thin on
 *  purpose: it is the brightest thing on screen, a fat ring reads as a donut. */
export const BLACK_HOLE_PHOTON_RING_FRACTION = 0.014
/** Inner edge of the accretion disc. Sits just outside the photon ring so a
 *  sliver of black stays visible between horizon and disc. */
export const BLACK_HOLE_DISC_INNER_FRACTION = 0.46
/** Vertical squash of the disc plane (scaleY). 1 = face-on, 0 = edge-on.
 *  The near half's inner edge crosses the shadow at
 *  `DISC_INNER * TILT / SHADOW` of the shadow's radius — at these values ~74 %,
 *  so the disc sweeps across the lower quarter of the hole. Flatter than this
 *  and it slices the shadow in half instead of orbiting it. */
export const BLACK_HOLE_DISC_TILT = 0.58
/** Seconds for one revolution of the disc's plasma texture. */
export const BLACK_HOLE_DISC_SPIN_SEC = 16
/** Diameter of the lensed halo arc — the far side of the disc, bent up over the
 *  top of the hole (and under the bottom) by gravity. */
export const BLACK_HOLE_HALO_FRACTION = 0.72
/** Relativistic beaming: the disc side rotating TOWARDS the viewer is boosted,
 *  the receding side dimmed. 0 = symmetric, 1 = one side blacked out. */
export const BLACK_HOLE_DOPPLER_STRENGTH = 0.62
/** Polar jets — length measured from the centre, width at their base. */
export const BLACK_HOLE_JET_LENGTH_FRACTION = 0.92
export const BLACK_HOLE_JET_WIDTH_FRACTION = 0.16
export const BLACK_HOLE_JET_PULSE_SEC = 3.4
/** Debris spiralling in. Kept low — this runs in the always-visible idle orbit. */
export const BLACK_HOLE_INSPIRAL_COUNT = 4
export const BLACK_HOLE_INSPIRAL_SEC = 5.5
/**
 * Bridge for renderers that think in BODY RADIUS instead of box width — the
 * minimap draws the plasma sun as `arc(x, y, r)`, while every fraction above is
 * relative to the box the CSS disc lives in. In that CSS disc the opaque plasma
 * body reaches roughly 37 % of the box width, so a body of radius r corresponds
 * to a box of `r * this`. Multiply by it once, then the same fractions apply.
 */
export const BLACK_HOLE_BODY_TO_BOX_FACTOR = 2.7

// ── Supernova — the one-shot collapse of Requiem into the black hole ─────────
/** Total length of the transition overlay. Long enough to read as an event,
 *  short enough that nobody waits for it twice. */
export const SUPERNOVA_DURATION_MS = 3400
/** Blinding white flash at the very start, as a fraction of the total. */
export const SUPERNOVA_FLASH_FRACTION = 0.13
/** Expanding shock rings and the ejected shell. */
export const SUPERNOVA_RING_COUNT = 3
export const SUPERNOVA_SHARD_COUNT = 88
/** After the ejecta, everything falls back in — this fraction of the timeline is
 *  the implosion that hands over to the black hole. */
export const SUPERNOVA_COLLAPSE_START = 0.6
/** Ejecta palette: hot core → shocked shell → the violet of the Collapse phase. */
export const SUPERNOVA_CORE_COLOR = '#ffffff'
export const SUPERNOVA_SHELL_COLOR = '#8fd8ff'
export const SUPERNOVA_EJECTA_COLOR = '#b45cff'

// ── Sun phase display numbering ──────────────────────────────────────────────
// The Comet counts as display phase 1, so sun phases render as
// starPhase + SUN_PHASE_DISPLAY_OFFSET (Spark = 2 … Collapse = 7).
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

/* ── Cosmic-background comet variant ──────────────────────────────────────────
 * The flat cosmic backdrop (shop, planets, menus) gets a livelier sky than the
 * idle-orbit backdrop: comet sky events fire more often, start sooner and lean
 * toward bigger multi-comet bursts. Values above are the idle-orbit baseline;
 * these override interval / first-delay / count only for the 'cosmic' variant.
 * The behavior variants (crossing/partial/drifter/flash/arc) stay identical. */
/** Seconds between comet sky events in the cosmic backdrop (more frequent). */
export const COMET_BG_COSMIC_INTERVAL_MIN_SEC = 3
export const COMET_BG_COSMIC_INTERVAL_MAX_SEC = 9
/** First comet in the cosmic backdrop appears almost right away. */
export const COMET_BG_COSMIC_FIRST_DELAY_MIN_SEC = 1
export const COMET_BG_COSMIC_FIRST_DELAY_MAX_SEC = 4
/** More comets may share the sky at once than the idle-orbit cap of 5. */
export const COMET_BG_COSMIC_MAX_COUNT = 8
/** Per-event count weights (index = count-1) — biased toward multi-comet bursts
 *  so the cosmic backdrop regularly shows 2–5 comets, not mostly singles. */
export const COMET_BG_COSMIC_COUNT_WEIGHTS = [0.24, 0.26, 0.2, 0.14, 0.08, 0.05, 0.02, 0.01]

// ── Planet Tab stage sizing ───────────────────────────────────────────────────
/** Sun image diameter (px) in the Planet Tab at the smallest phase radius. */
export const PLANET_TAB_SUN_MIN_DIAMETER = 340
/** Sun image diameter (px) in the Planet Tab at the largest phase radius. */
export const PLANET_TAB_SUN_MAX_DIAMETER = 560
/** Fixed base diameter (px) of the orbiting planet image (kept small vs. the sun). */
export const PLANET_TAB_PLANET_DIAMETER = 112

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
export const CHIME_BURST_DIST_MIN_FACTOR = 1.1 // min travel distance (× sun radius)
export const CHIME_BURST_DIST_MAX_FACTOR = 2.0 // max travel distance (× sun radius)
export const CHIME_BURST_SIZE_FACTOR = 0.45 // mini-chime size (× sun radius)

// ── Admin / Debug ─────────────────────────────────────────────────────────────
export const ADMIN_QUICK_RESOURCE_AMOUNT = 100_000_000_000

/** Kantenlänge der Drifter-Silhouette auf den Spawn-Kacheln des Admin-Panels.
 *  Groß genug, dass Splitter, Sonde und Leviathan auseinanderzuhalten sind,
 *  klein genug für zwei Reihen à vier Kacheln neben den anderen Panels. */
export const ADMIN_DRIFTER_PREVIEW_PX = 34

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

// Header universe block — icon of the "Universe" stat tile (left of Galaxy).
export const HEADER_UNIVERSE_ICON = 'game-icons:over-infinity'

// Header universe block — meep counter count-up tween (steps × interval ≈ 320ms)
export const MEEP_COUNTUP_STEPS = 20
export const MEEP_COUNTUP_INTERVAL_MS = 16
// How long the meep counter keeps its "rising" highlight after the tween ends.
export const MEEP_RISING_HOLD_MS = 300
// Segment marks on the universe rescue bar (percent positions, every 10%).
export const UNIVERSE_BAR_TICK_PERCENTS = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const
// Inset the dark text layer of the universe bar is clipped by, so it ends
// exactly on the fill edge: the fill itself starts 2px inside the track.
export const UNIVERSE_BAR_FILL_INSET_PX = 2
// Milestone rail below the universe rescue bar: one pip per 10% chunk.
export const UNIVERSE_MILESTONE_COUNT = 10
export const UNIVERSE_MILESTONE_STEP_PERCENT = 100 / UNIVERSE_MILESTONE_COUNT
// How long a freshly reached pip keeps its burst highlight.
export const UNIVERSE_MILESTONE_FLASH_MS = 1600

// Champion Shop — Chimes cost badge icon
export const CHIMES_COST_ICON = 'game-icons:windchimes'

// ── Champion Levels ───────────────────────────────────────────────────────────
// Every champion earns XP from kills and can be levelled with chimes + materials.
// Levels grant four stats (config/championLevels.ts), an ascension star every 5
// levels and a perk choice every 10. Store: stores/championLevelStore.ts.

/** XP required to leave level N: BASE * N^EXPONENT. */
export const CHAMPION_XP_BASE = 120
export const CHAMPION_XP_EXPONENT = 1.55

/**
 * Level cap at galaxy 1; every further galaxy adds CHAMPION_LEVEL_CAP_PER_GALAXY,
 * clamped to CHAMPION_LEVEL_MAX_CAP.
 *
 * The start cap currently sits ON the maximum: champions can reach level 50 from
 * the first galaxy, so the whole regalia ladder — all eleven stages — is
 * reachable straight away instead of unlocking one stage per galaxy. That makes
 * the per-galaxy ramp inert; it is kept so the gate can be reintroduced by
 * lowering the start cap alone, without touching the store.
 */
export const CHAMPION_LEVEL_START_CAP = 50
export const CHAMPION_LEVEL_CAP_PER_GALAXY = 5
export const CHAMPION_LEVEL_MAX_CAP = 50

/** Allies of a role earn this share of the XP their main champion receives. */
export const CHAMPION_ALLY_XP_SHARE = 0.5

/** Planet boss kill — flat base plus a per-galaxy ramp so late bosses stay relevant. */
export const CHAMPION_XP_BOSS_BASE = 25
export const CHAMPION_XP_BOSS_PER_GALAXY = 8
/** Multipliers on the boss XP base, by boss kind. */
export const CHAMPION_XP_GALAXY_BOSS_MULT = 6
export const CHAMPION_XP_CHAMPION_PLANET_MULT = 3
export const CHAMPION_XP_BOSS_ESCORT_MULT = 2

/** Auto battle payouts — resolved once per match in accumulateBattleStats(). */
export const CHAMPION_XP_PER_BATTLE_KILL = 12
export const CHAMPION_XP_PER_BATTLE_ASSIST = 4
export const CHAMPION_XP_BATTLE_MVP = 60
export const CHAMPION_XP_BATTLE_WIN = 40

/** Expeditions pay per minute of mission duration; failures pay a consolation share. */
export const CHAMPION_XP_EXPEDITION_PER_MINUTE = 5
export const CHAMPION_XP_EXPEDITION_FAIL_SHARE = 0.35

/** Level-up chime price: BASE * level^EXPONENT, scaled by the champion's tier. */
export const CHAMPION_LEVEL_CHIME_BASE = 500
export const CHAMPION_LEVEL_CHIME_EXPONENT = 2.1
/** Extra chime cost per champion tier star (★1 = 1.0, ★6 = 1.0 + 5 * this). */
export const CHAMPION_LEVEL_TIER_COST_STEP = 0.18

/** An ascension star every N levels — these are also the levels that cost materials. */
export const CHAMPION_ASCENSION_INTERVAL = 5
/** Each ascension star lifts every stat by this fraction (multiplicative on the total). */
export const CHAMPION_ASCENSION_STAT_BONUS = 0.05
/** Material cost at an ascension level = recipe cost * ceil(level / interval). */
export const CHAMPION_ASCENSION_MATERIAL_STEP = 1

/** A perk milestone every N levels (10, 20, 30, …). */
export const CHAMPION_PERK_INTERVAL = 10

/** Base value of every stat at level 1 before tier and growth are applied. */
export const CHAMPION_STAT_BASE = 10
/** Stat multiplier added per champion tier star above ★1. */
export const CHAMPION_STAT_TIER_STEP = 0.1

// Stat → effect conversion. Each divisor answers "how many points for +100%?".
/** POWER: orbit DPS multiplier = 1 + power / this. */
export const CHAMPION_POWER_DPS_DIVISOR = 100
/** VITALITY: HP / battle-power multiplier = 1 + vitality / this. */
export const CHAMPION_VITALITY_DIVISOR = 120
/** FOCUS: cooldown multiplier = 1 / (1 + focus / this) — diminishing by construction. */
export const CHAMPION_FOCUS_CD_DIVISOR = 200
/** Cooldowns never drop below this share of their base duration. */
export const CHAMPION_FOCUS_CD_FLOOR = 0.45
/** FORTUNE: chime / drop multiplier = 1 + fortune / this. */
export const CHAMPION_FORTUNE_DIVISOR = 250

/** Execute perk: bonus damage applies below this share of boss max HP. */
export const CHAMPION_EXECUTE_HP_THRESHOLD = 0.3
/** Last Stand perk: bonus applies below this share of player max HP. */
export const CHAMPION_LAST_STAND_HP_THRESHOLD = 0.35
/** Crit perk: a critical orbit hit deals this multiple of normal damage. */
export const CHAMPION_CRIT_DAMAGE_MULT = 2

// Champion level UI
/**
 * Splash height in the role details panel on flat desktops (Full HD class).
 * The stat headline claims fixed space above the scrolling body, so the splash
 * gives some back rather than squeezing abilities, equipment and allies.
 */
export const TEAM_SIGIL_SPLASH_HEIGHT_COMPACT = 226
/** Height of the XP bar in the role panel, px. */
export const CHAMPION_XP_BAR_HEIGHT = 7
/** Step sizes offered by the team-tab admin level button — plus a MAX press
 *  that asks for CHAMPION_LEVEL_MAX_CAP steps and lands on the cap from any level. */
export const ADMIN_TEAM_LEVEL_STEPS = [1, 5, 10] as const

/**
 * Champion picker grid — the numbers useVirtualGrid needs to turn a scroll
 * position into a row range. They MUST match the CSS in ChampionSelectPanel.vue
 * (.csp-grid columns/gap and .csp-champ height); the windowing is only correct
 * while the grid really is uniform.
 */
export const CHAMPION_PICKER_CARD_MIN_WIDTH = 170
export const CHAMPION_PICKER_CARD_HEIGHT = 210
export const CHAMPION_PICKER_GRID_GAP = 10
/** Rows kept rendered beyond each edge so fast scrolling never shows a gap. */
export const CHAMPION_PICKER_OVERSCAN_ROWS = 2

// ── Level regalia ─────────────────────────────────────────────────────────────
/**
 * The medallion and portrait frame a champion wears, escalating with its level.
 * One stage per CHAMPION_ASCENSION_INTERVAL levels — the same rhythm that grants
 * an ascension star — so every star a champion earns is also visible on its slot
 * from across the board. The apex stage sits on CHAMPION_LEVEL_MAX_CAP: a
 * level-50 champion is the loudest thing on the sigil board.
 *
 * Every stage adds exactly one new element on top of the numbers that keep
 * climbing, alternating between the frame and the medallion so no step feels
 * like a repeat of the one before it:
 *
 *   5 plate · 10 studs + sheen · 15 sweep · 20 star plate · 25 orbit ·
 *   30 polished bevel + dual sheen · 35 halo · 40 crown · 45 rays · 50 apex spin
 *
 * Escalation is carried by metal, geometry, brightness and motion only. The
 * champion's identity colour is never joined by a second hue; `heat` mixes in
 * white, which is the colour's own highlight rather than a new one.
 *
 * Cost note: every animated layer is transform/opacity only, and the medallion
 * ornaments are dropped below CHAMPION_REGALIA_ORNAMENT_MIN_SIZE. Up to the
 * starting cap (20) a role node animates a single extra layer — the sweep;
 * halo and apex spin only join in at 35 and 50, and there are never more than
 * five role nodes on the board.
 */
/* prettier-ignore */
export const CHAMPION_REGALIA_STAGES: ChampionRegaliaStage[] = [
  { minLevel: 1,                      name: 'Initiate',  rim: 1.5,  glow: 6,  glowAlpha: 0.16, heat: 0,    facets: 0,  studs: 0,  sweep: false, plate2: false, bevel: false, halo: false, sheen: false, sheenDual: false, orbit: false, rays: false, crown: false, spin: false },
  { minLevel: 5,                      name: 'Tempered',  rim: 1.9,  glow: 9,  glowAlpha: 0.21, heat: 0.06, facets: 6,  studs: 0,  sweep: false, plate2: false, bevel: false, halo: false, sheen: false, sheenDual: false, orbit: false, rays: false, crown: false, spin: false },
  { minLevel: 10,                     name: 'Sigil',     rim: 2.15, glow: 12, glowAlpha: 0.26, heat: 0.12, facets: 6,  studs: 6,  sweep: false, plate2: false, bevel: false, halo: false, sheen: true,  sheenDual: false, orbit: false, rays: false, crown: false, spin: false },
  { minLevel: 15,                     name: 'Warden',    rim: 2.4,  glow: 15, glowAlpha: 0.31, heat: 0.17, facets: 8,  studs: 8,  sweep: true,  plate2: false, bevel: false, halo: false, sheen: true,  sheenDual: false, orbit: false, rays: false, crown: false, spin: false },
  { minLevel: 20,                     name: 'Radiant',   rim: 2.6,  glow: 18, glowAlpha: 0.36, heat: 0.22, facets: 8,  studs: 8,  sweep: true,  plate2: true,  bevel: false, halo: false, sheen: true,  sheenDual: false, orbit: false, rays: false, crown: false, spin: false },
  { minLevel: 25,                     name: 'Paragon',   rim: 2.8,  glow: 21, glowAlpha: 0.41, heat: 0.28, facets: 10, studs: 10, sweep: true,  plate2: true,  bevel: false, halo: false, sheen: true,  sheenDual: false, orbit: true,  rays: false, crown: false, spin: false },
  { minLevel: 30,                     name: 'Ascendant', rim: 2.95, glow: 24, glowAlpha: 0.45, heat: 0.34, facets: 10, studs: 10, sweep: true,  plate2: true,  bevel: true,  halo: false, sheen: true,  sheenDual: true,  orbit: true,  rays: false, crown: false, spin: false },
  { minLevel: 35,                     name: 'Exalted',   rim: 3.1,  glow: 27, glowAlpha: 0.49, heat: 0.40, facets: 10, studs: 10, sweep: true,  plate2: true,  bevel: true,  halo: true,  sheen: true,  sheenDual: true,  orbit: true,  rays: false, crown: false, spin: false },
  { minLevel: 40,                     name: 'Sovereign', rim: 3.25, glow: 29, glowAlpha: 0.53, heat: 0.45, facets: 10, studs: 10, sweep: true,  plate2: true,  bevel: true,  halo: true,  sheen: true,  sheenDual: true,  orbit: true,  rays: false, crown: true,  spin: false },
  { minLevel: 45,                     name: 'Empyrean',  rim: 3.4,  glow: 31, glowAlpha: 0.58, heat: 0.50, facets: 12, studs: 12, sweep: true,  plate2: true,  bevel: true,  halo: true,  sheen: true,  sheenDual: true,  orbit: true,  rays: true,  crown: true,  spin: false },
  { minLevel: CHAMPION_LEVEL_MAX_CAP, name: 'Eternal',   rim: 3.6,  glow: 34, glowAlpha: 0.63, heat: 0.56, facets: 12, studs: 12, sweep: true,  plate2: true,  bevel: true,  halo: true,  sheen: true,  sheenDual: true,  orbit: true,  rays: true,  crown: true,  spin: true  },
]

/** Badge diameter (px) the regalia px values above are authored against. */
export const CHAMPION_REGALIA_BASE_SIZE = 34
/**
 * Below this badge diameter the ornaments (crown, rays, orbit spark, second
 * sheen) are dropped — on an ally satellite they read as noise, not as rank.
 */
export const CHAMPION_REGALIA_ORNAMENT_MIN_SIZE = 28
/** Badge diameters used across the team tab. */
export const CHAMPION_REGALIA_SIZE_NODE = 34
export const CHAMPION_REGALIA_SIZE_ALLY = 21
/** Medallion on the details-page captain card — a step above the bench chips. */
export const CHAMPION_REGALIA_SIZE_CHIP_MAIN = 28
export const CHAMPION_REGALIA_SIZE_PANEL = 54
/** Rotation periods (ms) of the animated regalia layers. */
export const CHAMPION_REGALIA_SHEEN_MS = 7000
export const CHAMPION_REGALIA_ORBIT_MS = 4200
export const CHAMPION_REGALIA_RAYS_MS = 16000
/** Numeral size as a share of the badge diameter. */
export const CHAMPION_REGALIA_FONT_RATIO = 0.46
/** Portrait frame on the sigil board — ring width = stage rim * this + base. */
export const SIGIL_FRAME_RIM_BASE = 1.4
export const SIGIL_FRAME_RIM_STEP = 0.62
/** Rim opacity (%) = this base plus SIGIL_FRAME_RIM_ALPHA_STEP per stage, capped at 100. */
export const SIGIL_FRAME_RIM_ALPHA_BASE = 50
export const SIGIL_FRAME_RIM_ALPHA_STEP = 4.5
/** Portrait frame glow radius = stage glow * this. */
export const SIGIL_FRAME_GLOW_FACTOR = 0.85
/** Rotation period (ms) of the faceted crest plate behind an apex portrait. */
export const SIGIL_FRAME_PLATE_MS = 34000
/**
 * Half-turn of the second plate (deg per facet step) — offsetting it by half a
 * corner is what turns two overlapping polygons into a star silhouette.
 */
export const SIGIL_FRAME_PLATE2_OFFSET = 0.5
/** Angular width (deg) of a single stud on the frame's stud ring. */
export const SIGIL_FRAME_STUD_ARC_DEG = 3.6
/** Travel period (ms) of the highlight sweeping around the frame ring. */
export const SIGIL_FRAME_SWEEP_MS = 5600
/** Breathing period (ms) of the corona behind an Exalted-or-higher frame. */
export const SIGIL_FRAME_HALO_MS = 3800
/** XP arc stroke width = this base plus SIGIL_XP_STROKE_STEP per regalia stage. */
export const SIGIL_XP_STROKE_BASE = 3.2
export const SIGIL_XP_STROKE_STEP = 0.14

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

/** Dauer der Ein-/Ausblende der Hover-Fokus-Dimmung in ms.
 *  Die Blende läuft NICHT als CSS-Transition, sondern wird in der jeweiligen
 *  Frame-Schleife in die ohnehin pro Frame gesetzte Inline-Opacity gerechnet:
 *  Orbit-Objekte bewegen und skalieren sich jeden Frame, eine gleichzeitig
 *  laufende CSS-Transition zwingt den Browser dann für jedes Objekt zu einem
 *  eigenen Transparenz-Layer samt Neurasterung pro Frame. */
export const HOVER_DIM_FADE_MS = 150

/** Ab diesem Blenden-Wert gilt ein Orbit-Objekt als ausgeblendet: erst dann
 *  werden Rahmen, Badges und laufende Effekt-Animationen abgeschaltet, damit
 *  während der Blende nichts wegspringt. */
export const HOVER_DIM_HIDDEN_THRESHOLD = 0.02

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

// ── Drifters (klickbare Objekte im Idle-Orbit) ──────────────────────────────
// Ein Drifter zieht in ~10-18 s über den Bildschirm, wird beim Klick
// eingesammelt und zahlt sofort und/oder als zeitlich begrenzter Buff aus.
// Spawn/Flug leben im drifterStore; die Bahn kommt aus DRIFTER_ROUTES.

/** Jede Seltenheitsstufe hat ihre EIGENE Uhr — [min, max] Sekunden bis zum
 *  nächsten Erscheinen. Ein einzelner gewichteter Wurf würde den Leviathan mit
 *  2 % Chance auf ~75 Minuten Erwartungswert schieben; mit eigener Uhr ist er
 *  selten, aber planbar, und die häufigen Typen halten den Himmel lebendig. */
export const DRIFTER_SPAWN_INTERVAL_SEC: Record<string, [number, number]> = {
  common: [20, 30],
  uncommon: [70, 110],
  rare: [150, 240],
  legendary: [600, 900],
}

/** Vorlauf nach Spielstart bzw. nach dem Laden, je Stufe. Bewusst gestaffelt:
 *  sonst starten alle vier Uhren gemeinsam und die erste Minute ist ein Schwarm. */
export const DRIFTER_FIRST_DELAY_SEC: Record<string, [number, number]> = {
  common: [12, 25],
  uncommon: [50, 80],
  rare: [110, 170],
  legendary: [300, 520],
}

/** Ist das Feld belegt, wenn eine Uhr abläuft, wartet diese Stufe nur so lange
 *  und versucht es erneut — der fällige Drifter geht nicht verloren. */
export const DRIFTER_SPAWN_RETRY_SEC = 6

/** Reihenfolge bei gleichzeitig fälligen Stufen: das Seltenste zuerst. Sonst
 *  verdrängt ein Errant Chime regelmäßig den Leviathan, auf den man wartet. */
export const DRIFTER_RARITY_ORDER: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3,
}

/** Farbe der Seltenheitsstufe — nur für Text-Label und Rahmen der Infokarte.
 *  Der Akzent der Karte bleibt die Eigenfarbe des Drifters. */
export const DRIFTER_RARITY_COLOR: Record<string, string> = {
  common: '#9d9d9d',
  uncommon: '#52b830',
  rare: '#4a90e2',
  legendary: '#e8c040',
}

/** Höchstens so viele Drifter fliegen gleichzeitig — bewusst knapp: jedes
 *  Objekt ist ein eigener DOM-Knoten mit eigener Frame-Schleife, und zwei
 *  gleichzeitige Klickziele im vollen Orbit-Bild lesen sich als Unruhe. */
export const DRIFTER_MAX_CONCURRENT = 1

/** Deckel auf der Sofort-Auszahlung: so viele Sekunden Produktion maximal,
 *  unabhängig davon, was der Drifter-Typ verspricht. Verhindert, dass ein
 *  einzelner Klick bei extremer CPS die gesamte Progression überspringt. */
export const DRIFTER_CHIME_REWARD_CAP_SEC = 300

/** Mindest-Auszahlung eines Chime-Drifters, damit er in der Frühphase (CPS≈0)
 *  nicht als leerer Klick endet — Vielfaches des aktuellen Klickwerts. */
export const DRIFTER_CHIME_REWARD_MIN_CLICKS = 25

/** Randmarkierung: so viele ms vor dem Erscheinen pingt der Bildschirmrand in
 *  Flugrichtung, damit ein Drifter nicht unbemerkt durchrutscht. */
export const DRIFTER_EDGE_PING_LEAD_MS = 1400

/** Anteil der Flugzeit, über den der Drifter ein- bzw. ausblendet. */
export const DRIFTER_FADE_IN_FRAC = 0.08
export const DRIFTER_FADE_OUT_FRAC = 0.14

/** Nachlaufzeit der Einsammel-Animation, bevor der Knoten entfernt wird. */
export const DRIFTER_COLLECT_FX_MS = 620

/** Anzahl der Funken beim Einsammeln (Stern-Explosion am Klickpunkt). */
export const DRIFTER_BURST_PARTICLES = 10

/** Flugbahnen in normierten Feldkoordinaten (0..1 der Spielfläche zwischen
 *  Header und Bottom-Bar). Start- und Endpunkt liegen absichtlich außerhalb
 *  [0,1], damit der Drifter herein- und herausfliegt statt aufzupoppen.
 *  ALLE Bahnen halten Abstand zur Bildmitte — dort sitzt die Sonne samt
 *  Klickfläche, und ein Drifter darüber würde zwei Klickziele stapeln. */
export const DRIFTER_ROUTES: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>> = [
  // Oberer Bogen, links → rechts
  [
    { x: -0.12, y: 0.3 },
    { x: 0.28, y: 0.11 },
    { x: 0.7, y: 0.15 },
    { x: 1.12, y: 0.34 },
  ],
  // Unterer Bogen, rechts → links
  [
    { x: 1.12, y: 0.68 },
    { x: 0.7, y: 0.88 },
    { x: 0.3, y: 0.84 },
    { x: -0.12, y: 0.66 },
  ],
  // Linker Flankenbogen: herein und hinaus jeweils über die linke Kante.
  // Die Flanken treten NIE oben oder unten aus — unten stehen die erhobenen
  // HUD-Panels (Minimap links, Command rechts), oben der Header. Ein senkrechter
  // Ein- oder Austritt schöbe den größten Körper (Leviathan, 128px) zwangsläufig
  // dahinter, wo er weder sichtbar noch klickbar ist.
  [
    { x: -0.14, y: 0.2 },
    { x: 0.1, y: 0.36 },
    { x: 0.12, y: 0.6 },
    { x: -0.14, y: 0.74 },
  ],
  // Rechter Flankenbogen — Spiegelbild des linken
  [
    { x: 1.14, y: 0.74 },
    { x: 0.9, y: 0.6 },
    { x: 0.88, y: 0.34 },
    { x: 1.14, y: 0.18 },
  ],
  // Weiter Bogen links herum, oben → unten
  [
    { x: -0.12, y: 0.14 },
    { x: 0.2, y: 0.32 },
    { x: 0.26, y: 0.74 },
    { x: 0.58, y: 1.12 },
  ],
  // Flacher Durchzug ganz oben
  [
    { x: -0.12, y: 0.18 },
    { x: 0.34, y: 0.06 },
    { x: 0.66, y: 0.06 },
    { x: 1.12, y: 0.18 },
  ],
]

/** Sicherheitsradius um die Bildmitte in Anteilen der kleineren Feldkante.
 *  Wird nach dem Auswerten der Bahn angewandt: liegt ein Punkt trotz Routen-
 *  Wahl zu nah an der Sonne, wird er radial nach außen geschoben. Fängt
 *  extreme Seitenverhältnisse ab, bei denen 1 % Feldbreite ≠ 1 % Feldhöhe. */
export const DRIFTER_CENTER_CLEARANCE = 0.3

/** Feld-Ränder in px: oben unter dem Header, unten über der Bottom-Bar.
 *  Der Drifter fliegt nur dazwischen, sonst verschwände er unter dem HUD. */
export const DRIFTER_FIELD_TOP_PX = 120
export const DRIFTER_FIELD_BOTTOM_PX = 150

/** Klickfläche um den Drifter herum (px, allseitig) — der sichtbare Körper ist
 *  klein und fliegt, ohne Puffer wäre das Treffen reine Präzisionsarbeit. */
export const DRIFTER_HIT_PADDING_PX = 14

/** Buff-Chips: ab so vielen verbleibenden Sekunden blinkt der Chip warnend. */
export const DRIFTER_BUFF_EXPIRY_WARN_SEC = 5

/** Formfaktoren des Drifter-Körpers, alle relativ zu `DrifterDef.sizePx` —
 *  so bleibt ein 44px-Splitter proportional zum 128px-Leviathan. */
export const DRIFTER_AURA_SCALE = 2.1
export const DRIFTER_TRAIL_LENGTH_SCALE = 2.8
export const DRIFTER_TRAIL_WIDTH_SCALE = 0.14
/** Obergrenze der Schweifbreite: ohne sie zieht der Leviathan einen Balken
 *  statt einer Spur hinter sich her. */
export const DRIFTER_TRAIL_WIDTH_MAX_PX = 13
export const DRIFTER_TRAIL_WIDTH_MIN_PX = 3

/** Sicherheitsabstand zur Oberkante der erhobenen HUD-Panels (Minimap links,
 *  Command rechts). Ein Drifter dahinter wäre unsichtbar UND unklickbar. */
export const DRIFTER_HUD_PANEL_MARGIN_PX = 24

/** Infokarte oben links: wie lange die Meldung nach dem Einsammeln bzw. nach
 *  einem verpassten Drifter noch stehen bleibt, bevor sie ausblendet. */
export const DRIFTER_CARD_RESULT_MS = 3200

/** Taktrate des Countdowns auf der Infokarte. Bewusst gröber als ein Frame —
 *  die Karte zeigt Sekunden, ein 60-Hz-Update wäre reine Verschwendung. */
export const DRIFTER_CARD_TICK_MS = 100

/** Ab dieser Restflugzeit schlägt die Uhr der Infokarte auf Warnrot um. */
export const DRIFTER_CARD_URGENT_MS = 4000

/** Kopfzeilen-Icon der Infokarte (Peilung eines Signals). */
export const DRIFTER_CARD_ICON = 'game-icons:radar-sweep'
