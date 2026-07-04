import type { BattleRole, StructureTier } from '../types'
import { BLUE_FOUNTAIN, RED_FOUNTAIN } from './constants'

export interface MapPoint {
  x: number
  y: number
}

// ── Geometry helpers (shared by movement + structure layout) ────────────────

export function segLength(a: MapPoint, b: MapPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function pathLength(path: MapPoint[]): number {
  let len = 0
  for (let i = 1; i < path.length; i++) len += segLength(path[i - 1], path[i])
  return len
}

/** Point at `fraction` (0..1) of the polyline's arc length. */
export function pointAlongPath(path: MapPoint[], fraction: number): MapPoint {
  if (path.length === 0) return { x: 50, y: 50 }
  if (path.length === 1 || fraction <= 0) return { ...path[0] }
  if (fraction >= 1) return { ...path[path.length - 1] }
  const total = pathLength(path)
  let remaining = total * fraction
  for (let i = 1; i < path.length; i++) {
    const len = segLength(path[i - 1], path[i])
    if (remaining <= len && len > 0) {
      const f = remaining / len
      return {
        x: path[i - 1].x + (path[i].x - path[i - 1].x) * f,
        y: path[i - 1].y + (path[i].y - path[i - 1].y) * f,
      }
    }
    remaining -= len
  }
  return { ...path[path.length - 1] }
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

// ── Structure layout ─────────────────────────────────────────────────────────
// Lane structures sit at fixed arc-length fractions along each lane path,
// measured from the blue fountain — blue structures near 0, red near 1.

export type LaneStructureTier = Exclude<StructureTier, 'nexusTurret'>

export const STRUCTURE_LANE_FRACTIONS_BLUE: Record<LaneStructureTier, number> = {
  outer: 0.3,
  inner: 0.21,
  inhibTurret: 0.13,
  inhibitor: 0.09,
}

export const STRUCTURE_LANE_FRACTIONS_RED: Record<LaneStructureTier, number> = {
  outer: 0.7,
  inner: 0.79,
  inhibTurret: 0.87,
  inhibitor: 0.91,
}

/** Offsets of the two nexus turrets relative to the blue nexus (mirrored for red). */
export const NEXUS_TURRET_OFFSETS: [MapPoint, MapPoint] = [
  { x: 4, y: -1.5 },
  { x: 1.5, y: -4 },
]

/** Minion wave cadence (game-seconds between waves) and their walk speed as path-fraction per game-second. */
export const MINION_WAVE_INTERVAL_T = 90
export const MINION_PATH_SPEED = 0.00045
export const MINION_WAVES_VISIBLE = 3
export const MINIONS_PER_WAVE = 3
