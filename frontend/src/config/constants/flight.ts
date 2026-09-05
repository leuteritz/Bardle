// Der Flug durchs Universum im Idle-Orbit: der Helm (Kurs, Schräglage,
// Ausweichen), die Himmelsbegegnungen auf dem Sternfeld-Canvas und der
// Tiefen-Look der Hintergrundsterne. Rein visuell — kein Spielzustand, keine
// Uhr; alle Zeiten sind rAF-Delta in Sekunden.

import type { Rgb } from '@/utils/fx/spaceBody'

// ── Helm — Kurs ───────────────────────────────────────────────────────────────
/** Geradeausflug zwischen zwei Manövern. */
export const HELM_CRUISE_GAP_SEC_MIN = 18
export const HELM_CRUISE_GAP_SEC_MAX = 38
/** Während einer Champion-Reise sind die Lücken kürzer — es geht irgendwohin. */
export const HELM_TRAVEL_GAP_SCALE = 0.45
/** flinch = spontanes Ausweichen ohne Anlass. */
export const HELM_MODE_WEIGHTS: Readonly<Record<'yaw' | 'bank' | 'flinch', number>> = {
  yaw: 0.5,
  bank: 0.35,
  flinch: 0.15,
}
/** Fokusziel eines Gierens als Anteil der kurzen Kante. */
export const HELM_YAW_AMP_FRAC_MIN = 0.04
export const HELM_YAW_AMP_FRAC_MAX = 0.09
export const HELM_YAW_HOLD_SEC_MIN = 6
export const HELM_YAW_HOLD_SEC_MAX = 14
/** Zeitkonstante des Fokus (Gieren, Schräglage) und der Rolle. */
export const HELM_FOCUS_TAU_SEC = 2.8
export const HELM_ROLL_TAU_SEC = 1.8
/** Schräglage = Gieren plus Rolle. */
export const HELM_BANK_ROLL_DEG_MIN = 3
export const HELM_BANK_ROLL_DEG_MAX = 6
/** Ausweichen: knackiger, kurz gehalten, mit Schub. */
export const HELM_EVADE_AMP_FRAC = 0.09
export const HELM_EVADE_ROLL_DEG = 8
export const HELM_EVADE_TAU_SEC = 0.9
export const HELM_EVADE_HOLD_SEC = 3.5
export const HELM_EVADE_THROTTLE = 1.15
export const HELM_EVADE_COOLDOWN_SEC = 25
/** Harte Klemmen über Drift + Helm. */
export const HELM_FOCUS_MAX_FRAC = 0.12
export const HELM_ROLL_MAX_DEG = 8
/** Seitenrutsch des nahen Feldes: gehaltene Kurve und Übergang, px/s. */
export const HELM_SLIP_HOLD_GAIN = 0.35
export const HELM_SLIP_RATE_GAIN = 1.2
export const HELM_SLIP_MAX_PX_S = 110
/** Darunter wird der Slip-Zweig ganz übersprungen. */
export const HELM_SLIP_EPS_PX_S = 0.5
/** Kernschutz des Polarschritts gegen die Division nahe null. */
export const HELM_SLIP_MIN_DIST_PX = 8
/** Anteil der Respawns, die stromaufwärts des Slips gesetzt werden. */
export const HELM_RESPAWN_BIAS = 0.6
/** Slip-Gewicht der fernen Galaxien-SVGs. */
export const HELM_GALAXY_DEPTH = 0.15
/** Auslaufen aller Werte, wenn der Helm inaktiv wird — wie FLIGHT_DRIFT_EASE_SEC. */
export const HELM_EASE_OUT_SEC = 1.5
/** Schweif-Kopplung: Versatz in Prozent des Kranzes, Streckung, Rollgewicht. */
export const HELM_WAKE_SHIFT_PCT = 7
export const HELM_WAKE_STRETCH = 0.08
export const HELM_WAKE_ROLL_GAIN = 1

// ── Himmelsbegegnungen ────────────────────────────────────────────────────────
export const ENCOUNTER_MAX_MAJOR = 1
export const ENCOUNTER_MAX_MINOR = 2
export const ENCOUNTER_GAP_SEC_MIN = 20
export const ENCOUNTER_GAP_SEC_MAX = 45
export const ENCOUNTER_MAJOR_COOLDOWN_SEC = 45
export const ENCOUNTER_FIRST_DELAY_SEC_MIN = 10
export const ENCOUNTER_FIRST_DELAY_SEC_MAX = 20
/** Einzelkörper spawnen ausserhalb dieses Anteils der kurzen Kante und laufen nur nach aussen. */
export const ENCOUNTER_CENTER_CLEARANCE_FRAC = 0.22
export const ENCOUNTER_SPRITE_CACHE_MAX = 48
/** Ab diesem Lebensanteil bittet ein Feld den Helm ums Ausweichen. */
export const ENCOUNTER_EVADE_AT = 0.22
export const ENCOUNTER_KIND_WEIGHTS: Readonly<
  Record<
    'asteroids' | 'giant' | 'shower' | 'pulsar' | 'nova' | 'shards' | 'dustlane' | 'binary',
    number
  >
> = {
  asteroids: 3,
  giant: 2,
  shower: 3,
  pulsar: 2,
  nova: 1.5,
  shards: 2,
  dustlane: 1.5,
  binary: 2,
}
export const ENCOUNTER_LIFE_SEC: Readonly<
  Record<keyof typeof ENCOUNTER_KIND_WEIGHTS, [number, number]>
> = {
  asteroids: [28, 40],
  giant: [30, 45],
  shower: [12, 18],
  pulsar: [20, 30],
  nova: [6, 9],
  shards: [20, 30],
  dustlane: [35, 50],
  binary: [25, 35],
}
export const ENCOUNTER_MAJOR_KINDS: readonly (keyof typeof ENCOUNTER_KIND_WEIGHTS)[] = [
  'asteroids',
  'giant',
  'shards',
  'dustlane',
]

// Asteroiden und Eissplitter — Bänder aus vielen kleinen Körpern
export const ENCOUNTER_ROCKS_MAX = 40
export const ENCOUNTER_ROCK_SPAWN_PER_SEC = 6
export const ENCOUNTER_BAND_HALF_SPREAD_RAD = 0.35
/** Die Bandmitte wandert über die Lebenszeit um bis zu diesen Winkel. */
export const ENCOUNTER_BAND_WANDER_RAD = 0.15
export const ENCOUNTER_ROCK_SEEDS = 6
export const ENCOUNTER_ROCK_TIERS: readonly number[] = [24, 48, 96]
export const ENCOUNTER_ROCK_WOBBLE = 0.22
/** Nahe Körper: starten weiter aussen als Sterne und laufen schneller — bei 0,05
 *  maxDist bräuchte ein Brocken mit der norm²-Perspektive Minuten bis zum Rand. */
export const ENCOUNTER_BAND_SPAWN_DIST: readonly [number, number] = [0.25, 0.4]
export const ENCOUNTER_ROCK_SPEED_MULT = 1.6
export const ENCOUNTER_ROCK_FADE_IN_SEC = 0.8
export const ENCOUNTER_ROCK_TUMBLE_RAD = 0.35
export const ENCOUNTER_ROCK_PALETTE = {
  hi: '#8c8378',
  mid: '#5a524a',
  low: '#2a2621',
  edge: '#a89c8c',
}
export const ENCOUNTER_SHARDS_MAX = 30
export const ENCOUNTER_SHARD_SPAWN_PER_SEC = 4
export const ENCOUNTER_SHARD_HALF_SPREAD_RAD = 0.6
export const ENCOUNTER_SHARD_SEEDS = 4
export const ENCOUNTER_SHARD_TIERS: readonly number[] = [20, 40, 80]
export const ENCOUNTER_SHARD_ASPECT = 2.5
export const ENCOUNTER_SHARD_PALETTE = {
  hi: '#eefaff',
  mid: '#9cd8ee',
  low: '#3c7a96',
  edge: '#ffffff',
}
export const ENCOUNTER_SHARD_ALPHA = 0.7
export const ENCOUNTER_SHARD_EVADE_STRENGTH = 0.5

// Gasriese
export const ENCOUNTER_GIANT_R_FRAC = 0.16
export const ENCOUNTER_GIANT_SPAN_K = 2.6
export const ENCOUNTER_GIANT_RING_CHANCE = 0.6
export const ENCOUNTER_GIANT_BANDS_MIN = 5
export const ENCOUNTER_GIANT_BANDS_MAX = 7
export const ENCOUNTER_GIANT_PALETTES: readonly {
  hi: string
  mid: string
  low: string
  band: string
  ring: string
}[] = [
  { hi: '#f2d9a8', mid: '#c8925a', low: '#5a3a22', band: '#8a5a34', ring: '#d9c39a' },
  { hi: '#cfe6ff', mid: '#6f9fd8', low: '#22355e', band: '#3f5f9a', ring: '#b8cbe6' },
  { hi: '#e8f0e0', mid: '#8fb68a', low: '#2f4a30', band: '#5a7d58', ring: '#c9d6c2' },
  { hi: '#f3c6b8', mid: '#c77a68', low: '#5a2a26', band: '#8f4a40', ring: '#d9b1a7' },
]
/** Sprite-Kante des Riesen in CSS-px — ein Raster je Begegnung. */
export const ENCOUNTER_GIANT_SPRITE_PX = 320

// Meteorschauer — Striche aus EINEM Radianten
export const ENCOUNTER_SHOWER_STREAKS_MAX = 14
export const ENCOUNTER_SHOWER_SPAWN_PER_SEC_MIN = 6
export const ENCOUNTER_SHOWER_SPAWN_PER_SEC_MAX = 10
export const ENCOUNTER_SHOWER_SPEED_MIN = 400
export const ENCOUNTER_SHOWER_SPEED_MAX = 900
export const ENCOUNTER_SHOWER_LIFE_SEC_MIN = 0.5
export const ENCOUNTER_SHOWER_LIFE_SEC_MAX = 1.1
export const ENCOUNTER_SHOWER_LEN_MIN = 40
export const ENCOUNTER_SHOWER_LEN_MAX = 120
export const ENCOUNTER_SHOWER_ALPHA = 0.85
export const ENCOUNTER_SHOWER_WIDTH = 2.2

// Pulsar — Leuchtfeuer
export const ENCOUNTER_PULSAR_SPRITE_PX = 64
export const ENCOUNTER_PULSAR_BEAM_FRAC = 0.25
export const ENCOUNTER_PULSAR_SPIN_RAD_S = 1.6
export const ENCOUNTER_PULSAR_BEAM_POW = 6
export const ENCOUNTER_PULSAR_BEAM_ALPHA = 0.5
export const ENCOUNTER_PULSAR_RGB: Rgb = [190, 220, 255]

// Nova — ferner Blitz
export const ENCOUNTER_NOVA_SPRITE_PX = 256
export const ENCOUNTER_NOVA_RISE_FRAC = 0.1
export const ENCOUNTER_NOVA_SCALE_MIN = 0.2
export const ENCOUNTER_NOVA_SCALE_MAX = 1.6
export const ENCOUNTER_NOVA_RING_ALPHA = 0.5
export const ENCOUNTER_NOVA_RGB: Rgb = [255, 236, 200]

// Dunkle Staubbahn
/** Deckend, nicht multiply: auf dem dunklen Grund verdeckt eine Bahn Sterne, sie tönt nichts. */
export const ENCOUNTER_DUSTLANE_ALPHA = 0.72
export const ENCOUNTER_DUSTLANE_RX_FRAC = 1.6
export const ENCOUNTER_DUSTLANE_RY_FRAC = 0.18
export const ENCOUNTER_DUSTLANE_STARS = 6
export const ENCOUNTER_DUSTLANE_RGB: Rgb = [14, 9, 8]
export const ENCOUNTER_DUSTLANE_STAR_RGB: Rgb = [230, 150, 110]
/** Der Glutsaum, vor dem die Bahn als Riss steht — dunkel auf dunkel wäre unsichtbar. */
export const ENCOUNTER_DUSTLANE_GLOW_RGB: Rgb = [150, 90, 60]
export const ENCOUNTER_DUSTLANE_GLOW_ALPHA = 0.16

// Doppelstern
export const ENCOUNTER_BINARY_PERIOD_SEC = 6
export const ENCOUNTER_BINARY_SEP_MIN = 10
export const ENCOUNTER_BINARY_SEP_MAX = 22
export const ENCOUNTER_BINARY_SPRITE_PX = 96
export const ENCOUNTER_BINARY_RGB_A: Rgb = [255, 214, 120]
export const ENCOUNTER_BINARY_RGB_B: Rgb = [190, 215, 255]
export const ENCOUNTER_BINARY_BRIDGE_ALPHA = 0.18

/** Spawn-Distanz der Anker als Anteil von maxDist, je Art. */
export const ENCOUNTER_ANCHOR_DIST: Readonly<
  Record<'giant' | 'shower' | 'pulsar' | 'nova' | 'binary', [number, number]>
> = {
  giant: [0.35, 0.5],
  shower: [0.25, 0.4],
  pulsar: [0.3, 0.6],
  nova: [0.45, 0.75],
  binary: [0.3, 0.55],
}
/** Radialtempo der Anker (baseSpeed wie bei den Sternen). */
export const ENCOUNTER_ANCHOR_SPEED: Readonly<
  Record<'giant' | 'shower' | 'pulsar' | 'nova' | 'binary' | 'dustlane', number>
> = {
  giant: 0.5,
  shower: 0.4,
  pulsar: 0.3,
  nova: 0.15,
  binary: 0.35,
  dustlane: 0.25,
}

// ── Sternfeld — Tiefe ─────────────────────────────────────────────────────────
/** Ferne Sterne kühler, leiser, kleiner; die nahe Stufe leicht warm. */
export const STAR_BG_FOG_TIERS: readonly {
  maxNorm: number
  mix: number
  alpha: number
  size: number
}[] = [
  { maxNorm: 0.3, mix: 0.55, alpha: 0.6, size: 0.9 },
  { maxNorm: 0.65, mix: 0.25, alpha: 0.85, size: 1 },
  { maxNorm: 1, mix: 0, alpha: 1, size: 1 },
]
export const STAR_BG_FOG_RGB: Rgb = [150, 175, 230]
export const STAR_BG_WARM_RGB: Rgb = [255, 225, 190]
export const STAR_BG_WARM_MIX = 0.15
/** Bloom auf den hellsten nahen Sternen — ein Sprite, kein shadowBlur. */
export const STAR_BG_BLOOM_SHARE = 0.05
export const STAR_BG_BLOOM_MIN_NORM = 0.55
export const STAR_BG_BLOOM_SCALE = 5
export const STAR_BG_BLOOM_ALPHA = 0.35
export const STAR_BG_BLOOM_SPRITE_PX = 64
