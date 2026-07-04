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
// Positions measured from the turret icons drawn on public/img/minimap.png
// (pixel-cluster centroids of the red icons, 0–100 map units). The blue side
// is the point mirror of the red side; the mirror also swaps top ↔ bot lane.

export type LaneStructureTier = Exclude<StructureTier, 'nexusTurret'>

/** Point mirror across the map center — maps red-side positions to blue-side ones. */
export function mirrorPoint(p: MapPoint): MapPoint {
  return { x: 100 - p.x, y: 100 - p.y }
}

export const RED_STRUCTURE_MAP_POSITIONS: Record<
  'top' | 'mid' | 'bot',
  Record<LaneStructureTier, MapPoint>
> = {
  top: {
    outer: { x: 31.3, y: 9.8 },
    inner: { x: 53.5, y: 12.0 },
    inhibTurret: { x: 69.2, y: 10.6 },
    inhibitor: { x: 74.0, y: 10.3 },
  },
  mid: {
    outer: { x: 59.9, y: 42.8 },
    inner: { x: 64.8, y: 32.4 },
    inhibTurret: { x: 73.2, y: 25.6 },
    inhibitor: { x: 75.9, y: 22.8 },
  },
  bot: {
    outer: { x: 90.3, y: 67.5 },
    inner: { x: 86.8, y: 44.1 },
    inhibTurret: { x: 88.7, y: 29.6 },
    inhibitor: { x: 88.5, y: 25.9 },
  },
}

export const RED_NEXUS_TURRET_POSITIONS: [MapPoint, MapPoint] = [
  { x: 82.4, y: 14.1 },
  { x: 85.2, y: 17.0 },
]

/** Nexus icon positions as drawn on minimap.png (measured; blue is the mirror). */
export const RED_NEXUS_MAP_POSITION: MapPoint = { x: 87.2, y: 12.9 }
export const BLUE_NEXUS_MAP_POSITION: MapPoint = mirrorPoint(RED_NEXUS_MAP_POSITION)

/** Minion wave cadence (game-seconds between waves) and their walk speed as path-fraction per game-second. */
export const MINION_WAVE_INTERVAL_T = 90
export const MINION_PATH_SPEED = 0.00045
export const MINION_WAVES_VISIBLE = 3
export const MINIONS_PER_WAVE = 3
