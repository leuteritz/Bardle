// Fortschritt über ein ganzes Spiel hinweg: Bard-Level und dessen Kostenkurve,
// Meeps, Fähigkeiten-Stufen, Universen (Prestige), Galaxien und die
// Abschnitts-Freischaltung.

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

// Abilities
export const MAX_ABILITY_LEVEL = 5

// Skill Tree Meep costs (Q, W, E, R)
export const SKILL_MEEP_COSTS = [3, 8, 20, 45] as const

export const RESCUE_ROTATION_DURATION_MS = 2_000 // camera spin after role selection

export const GALAXY_TRANS_WARP_MS = 8_400
export const GALAXY_TRANS_DECEL_MS = 3_600
export const GALAXY_SPAWN_INTERVAL_MIN = 5_000
export const GALAXY_SPAWN_INTERVAL_MAX = 12_000
export const GALAXY_MAX_COUNT = 4

export const UNIVERSE_RESCUE_INITIAL_COST = 100_000
export const UNIVERSE_RESCUE_COST_MULTIPLIER = 2

// Ability defaults (??-operator fallbacks)
/**
 * Neutrale Universums-Effekte — der Zustand ohne jeden Modifikator. Das
 * Auswahl-Modal vergleicht die Effekte eines Universums gegen diese Werte, um
 * Verbesserung von Verschlechterung zu unterscheiden.
 */
export const UNIVERSE_NEUTRAL_MULTIPLIER = 1
export const UNIVERSE_NEUTRAL_LEVEL_EXPONENT = 1.2
export const UNIVERSE_NEUTRAL_MAX_ABILITY_LEVEL = 5
export const UNIVERSE_NEUTRAL_SKILL_POINT_INTERVAL = 2
export const UNIVERSE_NEUTRAL_HP_DRAIN = 0

export const ABILITY_CPS_PER_LEVEL_DEFAULT = 0.15
export const ABILITY_POWER_PER_LEVEL_DEFAULT = 300
export const ABILITY_MEEP_COST_PER_LEVEL_DEFAULT = 0.1
export const ABILITY_MEEP_COST_MIN_MULTIPLIER = 0.5
export const ABILITY_CPC_PER_LEVEL_DEFAULT = 0.25

// Galaxy boss search
export const GALAXY_STARS_BASE_REQUIRED = 3
export const GALAXY_CHAMPION_ARRIVAL_SIGNAL_MS = 4000
export const GALAXY_STAR_FAILED_SIGNAL_MS = 2600 // "Star Lost" flash on the minimap
export const GALAXY_BOSS_SPAWN_ANIM_MS = 5_000

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
/** Fächerung der Eskorten-Planetenbahnen: der äußerste liegt um diesen Anteil weiter außen. */
export const GALAXY_BOSS_ESCORT_ORBIT_SPREAD = 0.6
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

// Augments — Quantum Luck
/** 50/50 probability split for the Quantum Luck double-or-nullify branch */
export const QUANTUM_LUCK_THRESHOLD = 0.5

/**
 * Restzeit, unterhalb derer die Universums-Animation gar nicht mehr anläuft —
 * ein Aufblitzen von einem Sekundenbruchteil wirkt wie ein Darstellungsfehler.
 */
export const UNIVERSE_ANIM_MIN_REMAINING_MS = 150

// Admin Galaxy Jump — warp-flash duration (ms) after teleporting to a galaxy
export const GALAXY_JUMP_WARP_MS = 420

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

// ── Header universe tooltip ────────────────────────────────────────────────
// Wider than the material panel: this one carries two stat blocks side by side,
// and a narrower panel would break them back into one very tall column.
export const UNIVERSE_TOOLTIP_WIDTH = 'clamp(380px, 23vw, 540px)'
export const UNIVERSE_TOOLTIP_GAP_PX = 12
/**
 * Zeilen-Icons des Universums-Tooltips. Jedes Glyph steht im Panel genau
 * einmal — die beiden Blöcke liegen nebeneinander, ein zweimal verwendetes
 * Motiv wäre dort nicht mehr unterscheidbar. Bewusst dieselben Icons wie im
 * Bard-Stats-Katalog, wo die Kategorie dieselbe Sache zählt.
 */
export const UNIVERSE_TOOLTIP_ICONS = {
  timeHere: 'game-icons:sands-of-time',
  starsRescued: 'game-icons:star-satellites',
  galaxiesFreed: 'game-icons:galaxy',
  planetsCleared: 'game-icons:globe-ring',
  bossesFelled: 'game-icons:star-skull',
  starsLost: 'game-icons:falling-star',
  materials: 'game-icons:ore',
  clicks: 'game-icons:click',
  universesRescued: 'game-icons:portal',
  fastestRun: 'game-icons:stopwatch',
  lastRun: 'game-icons:backward-time',
  galaxyCores: 'game-icons:black-hole-bolas',
  playTime: 'game-icons:hourglass',
} as const

/**
 * Meeps und Chimes haben im Spiel ein eigenes Artwork — im Tooltip dasselbe
 * wie in der Kachelzeile darüber und in jeder Kostenangabe, statt eines
 * Iconify-Ersatzes, der dieselbe Sache anders aussehen ließe.
 *
 * Die 128er-Stufe, weil die Zeilen-Glyphen bei 1,3em auch auf 4K unter 34px
 * bleiben (siehe „Auflösungsvarianten" in CLAUDE.md).
 */
export const UNIVERSE_TOOLTIP_IMAGES = {
  meeps: '/img/BardAbilities/BardMeep-128.png',
  chimes: '/img/BardAbilities/BardChime-128.png',
} as const

/**
 * Das Meep-Sprite ist hochformatig und trägt oben wie unten einen breiten
 * Alpha-Rand — in derselben Box wie Chime und Glyph füllt es nur rund drei
 * Viertel der Höhe und wirkt daneben klein. Vergrößert wird per `scale`, nicht
 * über die Box: die Zeilenspalte ist Teil eines Rasters, das für alle Zeilen
 * gleich breit bleiben muss. Dieselbe Korrektur trägt die Meep-Kachel im
 * Header (`.meep-icon` in UniverseStatsRow.vue).
 */
export const UNIVERSE_TOOLTIP_MEEP_SCALE = 1.3
// Archived universe runs kept in the save. Only the fastest and the latest are
// read back, so the list exists as history, not as a growing ledger.
export const UNIVERSE_RUN_HISTORY_LIMIT = 12
