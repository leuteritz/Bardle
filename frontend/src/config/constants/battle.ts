// Der Rahmen des Auto-Battles: Phasenzyklus (landing → searching → loading →
// battle → honor), ELO/LP/MMR-Rechnung, Rang-Grenzen, die Champion-Statraten
// und die Anzeige von Verlauf und Ergebnis. Was WÄHREND des Kampfes passiert,
// steht nebenan in battleSim.ts.

import type { BattlePhaseConfig, BattlePhaseKey } from '@/types'

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
/** Wie viele vergangene Kämpfe der Spielstand aufhebt. */
export const BATTLE_HISTORY_SAVE_LIMIT = 20
export const BATTLE_POWER_RATING_SWING = 150
export const BATTLE_POWER_RATING_SOFTENING = 1500
export const BATTLE_ENEMY_WEAKEN_RATING_SWING = 150
export const ELO_LUCK_FACTOR = 0.15

// Auto-battle
export const AUTO_BATTLE_INTERVAL_MS = 45000
export const BATTLE_REAL_DURATION_SECONDS = 60
/** Total simulated game-seconds per battle (60 game-seconds per real second) */
export const BATTLE_TOTAL_GAME_SECONDS = BATTLE_REAL_DURATION_SECONDS * 60

// The phase registry (BATTLE_PHASES) lives further down, next to the phase
// durations it is built from.
export const MMR_TO_POWER_MULTIPLIER = 1.5

/**
 * Wie lange das Win/Lose-Badge den Titel-Slot der Bottom-Bar hält, bevor die
 * Honor-Anzeige mit Sekundenzähler übernimmt (Result-Pause insgesamt:
 * BATTLE_RESULT_PAUSE_MS).
 */
export const SCOREBOARD_RESULT_BADGE_MS = 3000

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

export const SKIP_DURATION_SECONDS = 5 // minimap skip-to-arrival shortcut

export const BATTLE_RETURN_TICK_MS = 250 // countdown refresh of the "Return to Battle" button

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

/**
 * Takt, in dem der Battle-Store seine Phasen aus den Zeitstempeln nachzieht.
 * Läuft getrennt vom Speichern weiter, damit ein gedrosselter Tab den Kampf
 * nicht anhält.
 */
export const BATTLE_SYNC_INTERVAL_MS = 1000

// ── Kill / objective announcement banners (rift board) ────────────────────
/** How long a single announcement banner stays on screen (ms) */
export const ANNOUNCE_DISPLAY_MS = 2600
/** Maximum queued announcements — older ones are dropped */
export const ANNOUNCE_QUEUE_MAX = 3
/** Kill-feed entries older than this (game-seconds vs. current battleTime) never announce */
export const ANNOUNCE_FRESHNESS_GAME_SECONDS = 240

/** Maximum retained jungle-buff-feed entries */
export const BUFF_FEED_MAX = 8

// LP thresholds
export const LP_NORMAL_PROMOTION_THRESHOLD = 100
export const LP_MASTER_PROMOTION_THRESHOLD = 500
export const LP_GRANDMASTER_PROMOTION_THRESHOLD = 1000
export const LP_DEMOTION_VALUE = 75
export const LP_MASTER_DEMOTION_VALUE = 400
export const LP_GRANDMASTER_DEMOTION_VALUE = 900
export const LP_BASE_CHANGE = 20

/** Zones the LP meter is divided into by its heavy scale strokes. Every zone
 *  burns a step brighter than the one to its left, so the climb from 0 LP to
 *  promotion reads as an escalation instead of one flat bar. Zones are equal
 *  fractions of whatever cap the tier has (100 / 500 / 1000). */
export const LP_METER_ZONES = 4
/** Light scale strokes inside a zone — with 4 zones over 100 LP that is one
 *  stroke every 5 LP, and a heavy one at every 25. */
export const LP_METER_TICKS_PER_ZONE = 5

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

// Star background — warp / galaxy animation
export const WARP_SPEED_MAX = 70

// Command Panel HP bar (CommandPanelComponent)
export const HP_COLOR_THRESHOLD_HIGH = 0.5 // above → green
export const HP_COLOR_THRESHOLD_LOW = 0.25 // above → gold, below → red
export const HP_BAR_SEGMENTS = 8

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
 * Auto-fit budget of the bottom scoreboard (see utils/ui/scoreboardFit.ts).
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

/**
 * Zusätzlicher Sicherheitsabstand, bevor die Simulation notfalls von selbst
 * startet. Greift nur, wenn die Suchanimation ihr Ende nicht gemeldet hat.
 */
export const BATTLE_SIM_START_SAFETY_MARGIN_MS = 1500
/** Wie lange eine Kampfmarkierung auf der Minimap steht, in Spielsekunden. */
export const BATTLE_FIGHT_MARKER_DURATION_T = 120
/**
 * Grenzen der Siegwahrscheinlichkeit. Kein Kampf ist je entschieden, bevor er
 * beginnt — auch das stärkste Team kann verlieren und umgekehrt.
 */
export const BATTLE_WIN_PROBABILITY_MIN = 0.1
export const BATTLE_WIN_PROBABILITY_MAX = 0.9
/**
 * Kosmetische HP der Champions im Broadcast. Kein Kampfwert — nur eine
 * deterministische Zahl, die je Champion und Zeitscheibe gleich bleibt, damit
 * die Leisten nicht bei jedem Frame zappeln. Die Faktoren sind teilerfremde
 * Mischwerte; sie tragen keine eigene Bedeutung.
 */
export const BATTLE_COSMETIC_HP_MIN = 35
export const BATTLE_COSMETIC_HP_RANGE = 66
/** Länge einer Zeitscheibe in Spielsekunden (~1,5 s Echtzeit). */
export const BATTLE_COSMETIC_HP_TIME_SLICE_T = 90
export const BATTLE_COSMETIC_HP_MIX_CHAMPION = 53
export const BATTLE_COSMETIC_HP_MIX_TIME = 31
export const BATTLE_COSMETIC_HP_MIX_TEAM = 17
export const BATTLE_COSMETIC_HP_MIX_SEED = 97
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

// Battle — initial state
export const BATTLE_INITIAL_MMR = 1000
export const BATTLE_DEFAULT_RANK_TIER = 'Silver'
