// Champions als Spielfiguren: Level- und XP-Modell, Perks, Ascension-Sterne,
// Regalia-Stufen, Tiers und Rekrutierungskosten, Skins und Bildgrößen sowie
// die verbündeten Slots (Sworn Allies + Bank).

import type { ChampionRegaliaStage, ChampionRole } from '../../types'
import { ROLES } from './roles'

// Champion travel timing
export const CHAMPION_TRAVEL_BASE_MS = 60_000 // 60s base travel time
export const CHAMPION_TRAVEL_SCALE_MS = 30_000 // +30s per galaxy

export const CHAMPION_TRAVEL_BASE_LY = 500 // 500 LY for Galaxy 1
export const CHAMPION_TRAVEL_LY_PER_GALAXY = 500 // +500 LY per Galaxy

export const CHAMPION_STAR_DURATION_MS = 60_000 // champion star window: 60s

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

/** Verweilzeit, bevor die „Neu"-Markierung eines Champions verschwindet. */
export const CHAMPION_NEW_BADGE_DISMISS_MS = 75

// Expedition system
export const CHAMPION_BASE_POWER = 50

export const CHAMPION_POWER_PER_LEVEL = 10

// Champion Combat System
/** Detection radius from screen center in px. Planet within this range → champions can hit it. Not sun-relative. */
export const CHAMPION_DETECT_RADIUS = 350

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

export const CHAMPION_REVIVE_MS = 8000 // downed champion revives at full HP after this
export const CHAMPION_HP_REGEN_FRAC = 0.04 // out-of-combat regen: fraction of max HP per second
export const CHAMPION_HIT_FLASH_MS = 450 // hit-flash animation window on champion portraits

/** Empty ally grid: one row per role, ALLIES_PER_ROLE null slots each. */
export const createEmptyAllyRows = (): (string | null)[][] =>
  ROLES.map(() => Array<string | null>(ALLIES_PER_ROLE).fill(null))

export const RARITY_WEIGHT_FALLBACK = 60

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

export const CHAMPION_STAR_FIXED_ANGLE_FRAC_PI = 0.6
export const CHAMP_PLANET_ORBIT_RX_MIN = 65
export const CHAMP_PLANET_ORBIT_RX_RANGE = 75
export const CHAMP_PLANET_ORBIT_RY_MIN = 28
export const CHAMP_PLANET_ORBIT_RY_RANGE = 42
export const CHAMP_PLANET_ORBIT_TILT_MAX = 0.3

// ── Schadenszahlen der Rollen-Fähigkeiten ─────────────────────────────────
// Jede Fähigkeit wirft ihre Zahl mit eigener Streuung, Höhe und Standzeit aus,
// damit sich gleichzeitige Treffer nicht zu einem Klumpen stapeln.
/** Champion trifft ein Gegner-Geschoss ab. */
export const CHAMPION_DAMAGE_FLOAT_X_SPREAD = 24
export const CHAMPION_DAMAGE_FLOAT_Y_OFFSET = 34
export const CHAMPION_DAMAGE_FLOAT_MS = 900

// ── Champion Tier recruit cost ───────────────────────────────────────────────
// The single Champion-Tier economy: Chimes recruit cost per star level (★1..★6).
// Index 0 = ★1 … index 5 = ★6. Strictly ascending. Read via getChampionChimesPrice
// (championTiers.ts). Replaces the old 5-tier CHIMES_PRICE_TIERS.
export const CHAMPION_TIER_CHIMES_PRICE: number[] = [500, 1400, 2800, 4500, 6500, 9500]

// ── Champion skins (Team tab) ─────────────────────────────────────────────────
/** Skin file basename of the default look. Selecting it (or having no entry in
 *  skinStore) renders the classic champion icon from /img/champion/. */
export const SKIN_ORIGINAL = 'OriginalSkin'
/** Aspect ratio of bundled splash arts (1280×~730) — skin gallery cards. */
export const SKIN_CARD_ASPECT_RATIO = '16 / 9'
/** Skin gallery grid — min card width (px); the grid auto-fills columns. */
export const SKIN_CARD_MIN_WIDTH = 300
/**
 * Inline skin gallery in the details page.
 *
 * MIN_WIDTH is the smallest a card may get before the grid drops a column — the
 * right column fits three, and the splash is legible at that size rather than
 * being a thumbnail you have to squint at. It sits in the 111–220px band of the
 * art table, so the cards load the 512px variant ('lg').
 *
 * MAX_HEIGHT holds two full rows plus the gap; anything beyond that scrolls, so
 * a champion with a dozen skins cannot push Stats off the page.
 */
export const SKIN_THUMB_MIN_WIDTH = 132
/**
 * Card height, explicit rather than an `aspect-ratio`. A ratio on a grid item
 * whose width comes from `1fr` is circular — the row needs the item's height,
 * the item's height needs its width, and the width is only known once the row
 * is laid out. Chrome resolves that by collapsing the row (measured: 37px rows
 * under 78px cards, every card overlapping the one below). A fixed height
 * breaks the cycle. 78 is 16:9 at the ~139px the right column actually gives a
 * card, and `object-fit: cover` absorbs any drift if that width ever changes.
 */
export const SKIN_THUMB_HEIGHT = 78
/** Exactly two rows plus the gap between them — beyond that the grid scrolls. */
export const SKIN_GRID_MAX_HEIGHT = 164

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

/** Largest rendered edge each variant is still safe for (px, at DPR 2). */
export const CHAMPION_ART_SM_MAX_EDGE = 34
export const CHAMPION_ART_MD_MAX_EDGE = 110
export const CHAMPION_ART_LG_MAX_EDGE = 220

// Champion badge tooltip — max visible entries before "+N more" overflow
export const CHAMP_TOOLTIP_MAX_VISIBLE = 5

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

/**
 * Auto level-up backstop: how many levels the whole roster may gain in one game
 * tick. Never reached in normal play — a level costs chimes that take far longer
 * than a second to earn. It only bounds the one case that can produce a burst:
 * returning to a save with a full XP bank and a huge chime pile, where the loop
 * would otherwise walk every champion to the cap inside a single tick.
 */
export const CHAMPION_AUTO_LEVEL_MAX_PER_TICK = 25

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

/** Height of the XP bar in the role panel, px. */
export const CHAMPION_XP_BAR_HEIGHT = 7

/**
 * Champion picker grid — the numbers useVirtualGrid needs to turn a scroll
 * position into a row range. They MUST match the CSS in ChampionSwapGrid.vue
 * (.csg-grid columns/gap and .csg-card height); the windowing is only correct
 * while the grid really is uniform. The grid binds all three straight out of
 * here via v-bind, so the two cannot drift apart.
 *
 * Smaller than the modal they replaced: the picker now lives in the right
 * column of the role details page (~440px of usable width), where 138px minimum
 * columns lay out as three cards per row with room to spare.
 */
export const CHAMPION_PICKER_CARD_MIN_WIDTH = 138
export const CHAMPION_PICKER_CARD_HEIGHT = 176
export const CHAMPION_PICKER_GRID_GAP = 8
/** Rows kept rendered beyond each edge so fast scrolling never shows a gap. */
export const CHAMPION_PICKER_OVERSCAN_ROWS = 2

/**
 * Inline champion swap — the compare column that fills the LEFT half of the
 * details page while the picker is open. Two portrait wells stacked over the
 * stat comparison; the wells share whatever height the column has spare, and
 * these are the floor and ceiling of that share.
 */
export const CHAMPION_SWAP_PORTRAIT_MIN_HEIGHT = 118
export const CHAMPION_SWAP_PORTRAIT_MAX_HEIGHT = 260
/**
 * The origin that never forms a synergy — too many champions carry it for a
 * threshold to mean anything, so it is skipped when counting lineups.
 */
export const SYNERGY_NEUTRAL_ORIGIN = 'Runeterra'

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
/** Badge diameter on an ally satellite — the role node wears no medallion; its
 *  level is the numeral across the portrait's foot (see SigilRoleNode). */
export const CHAMPION_REGALIA_SIZE_ALLY = 21
/** Medallion on the details-page captain card — a step above the bench chips. */
export const CHAMPION_REGALIA_SIZE_CHIP_MAIN = 28
export const CHAMPION_REGALIA_SIZE_PANEL = 54
/**
 * Medallion standing alone in the top-right corner of the details-page splash.
 * Larger than SIZE_PANEL because it no longer shares a line with a "Level x/y"
 * readout — it IS the readout now, so the number on it has to carry at a glance
 * from across the panel.
 */
/**
 * Medallion on the details-page splash, sized from the splash's own height
 * rather than fixed.
 *
 * The panel itself does not grow past 1920×1080 (--team-ui-scale caps at 1), but
 * the splash does: it takes the left column's spare height, so it measures ~375px
 * at Full HD and ~538px at 2K. A fixed badge therefore shrank in relation to the
 * art it sits on as the screen got bigger.
 *
 * RATIO puts it at ~60px on a Full HD splash — a marker on the portrait rather
 * than a second subject competing with it — and scales from there. MIN and MAX
 * keep it sane on a squeezed desktop and on 4K, where the splash hits its share
 * cap anyway.
 */
export const CHAMPION_REGALIA_SPLASH_HEIGHT_RATIO = 0.16
export const CHAMPION_REGALIA_SIZE_SPLASH_MIN = 48
export const CHAMPION_REGALIA_SIZE_SPLASH_MAX = 96
/** Fallback until the splash has been measured once (Full HD reference). */
export const CHAMPION_REGALIA_SIZE_SPLASH = 60
/**
 * Corner inset for that medallion, as a share of its diameter.
 *
 * The regalia layers reach well past the badge's own box, and the splash clips
 * with overflow:hidden — at the level cap a 12px inset sliced the outer plate
 * and the crown clean off. Measured overhang at 76px, per layer:
 *
 *   rays 59.2 · sheen 42.8 · orbit spark 31.4 · plate 22.1 · crown 21.3 (top)
 *
 * This covers every OPAQUE layer with room to spare: the furthest is the orbit
 * ring, whose rotating box reaches 0.41 of the diameter, and rounding at some
 * sizes put that within a tenth of a pixel of the edge — hence 0.44 rather than
 * a tight 0.42. Rays and sheen are radial gradients that fade to nothing well
 * before their box ends, so letting them run off the edge costs nothing visible;
 * reserving for them instead would push the badge 59px inward and it would no
 * longer read as sitting in the corner.
 */
export const CHAMPION_REGALIA_SPLASH_INSET_RATIO = 0.44
/** Rotation periods (ms) of the animated regalia layers. */
export const CHAMPION_REGALIA_SHEEN_MS = 7000
export const CHAMPION_REGALIA_ORBIT_MS = 4200
export const CHAMPION_REGALIA_RAYS_MS = 16000
/** Numeral size as a share of the badge diameter. */
export const CHAMPION_REGALIA_FONT_RATIO = 0.46
