import type { BattleRole } from '../types'
import { BLUE_FOUNTAIN, RED_FOUNTAIN } from './constants'

export interface MapPoint {
  x: number
  y: number
}

// All routes are polylines on the 100x100 minimap, authored from the blue
// side's perspective (blue fountain bottom-left → red fountain top-right).
// Red champions traverse the same polylines in reverse.

export const TOP_LANE_PATH: MapPoint[] = [
  { ...BLUE_FOUNTAIN },
  { x: 10, y: 62 },
  { x: 11, y: 34 },
  { x: 16, y: 14 },
  { x: 38, y: 10 },
  { x: 66, y: 9 },
  { ...RED_FOUNTAIN },
]

export const MID_LANE_PATH: MapPoint[] = [
  { ...BLUE_FOUNTAIN },
  { x: 26, y: 74 },
  { x: 42, y: 58 },
  { x: 50, y: 50 },
  { x: 58, y: 42 },
  { x: 74, y: 26 },
  { ...RED_FOUNTAIN },
]

export const BOT_LANE_PATH: MapPoint[] = [
  { ...BLUE_FOUNTAIN },
  { x: 36, y: 90 },
  { x: 64, y: 89 },
  { x: 86, y: 84 },
  { x: 90, y: 60 },
  { x: 91, y: 32 },
  { ...RED_FOUNTAIN },
]

/** Jungle roam circuit for the blue jungler (loops between camps + river). */
export const BLUE_JUNGLE_CIRCUIT: MapPoint[] = [
  { x: 22, y: 76 },
  { x: 32, y: 64 },
  { x: 26, y: 52 },
  { x: 38, y: 44 },
  { x: 46, y: 58 },
  { x: 34, y: 72 },
]

/** Jungle roam circuit for the red jungler (mirrored). */
export const RED_JUNGLE_CIRCUIT: MapPoint[] = [
  { x: 78, y: 24 },
  { x: 68, y: 36 },
  { x: 74, y: 48 },
  { x: 62, y: 56 },
  { x: 54, y: 42 },
  { x: 66, y: 28 },
]

/** Fraction along the lane path where each side holds during the laning phase. */
export const LANE_HOLD_FRACTION_BLUE = 0.42
export const LANE_HOLD_FRACTION_RED = 0.58

/** Which lane path each role walks out on. */
export const ROLE_LANE_PATH: Record<BattleRole, MapPoint[]> = {
  top: TOP_LANE_PATH,
  jungle: MID_LANE_PATH, // jungler leaves base via mid, then swings into the circuit
  mid: MID_LANE_PATH,
  adc: BOT_LANE_PATH,
  support: BOT_LANE_PATH,
}

/** Minion wave cadence (game-seconds between waves) and their walk speed as path-fraction per game-second. */
export const MINION_WAVE_INTERVAL_T = 90
export const MINION_PATH_SPEED = 0.00045
export const MINION_WAVES_VISIBLE = 3
export const MINIONS_PER_WAVE = 3
