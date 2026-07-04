import type { BattleRole, BattleTimeline, MultikillCounts } from '../types'
import {
  BLUE_FOUNTAIN,
  RED_FOUNTAIN,
  BLUE_NEXUS,
  RED_NEXUS,
  BATTLE_TOTAL_GAME_SECONDS,
  TIMELINE_NEXUS_FALL_T,
  MOVE_WALKOUT_END_T,
  MOVE_RESPAWN_WALK_SECONDS,
  MOVE_FIGHT_GATHER_LEAD_T,
} from '../config/constants'
import {
  type MapPoint,
  ROLE_LANE_PATH,
  BLUE_JUNGLE_CIRCUIT,
  RED_JUNGLE_CIRCUIT,
  LANE_HOLD_FRACTION_BLUE,
  LANE_HOLD_FRACTION_RED,
  MID_LANE_PATH,
  MINION_WAVE_INTERVAL_T,
  MINION_PATH_SPEED,
  MINION_WAVES_VISIBLE,
  MINIONS_PER_WAVE,
  TOP_LANE_PATH,
  BOT_LANE_PATH,
} from '../config/battleRoutes'
import { createRng, BATTLE_ROLES } from './battleTimeline'

export interface MovementSegment {
  tStart: number
  tEnd: number
  path: MapPoint[]
  kind: 'walkout' | 'lane' | 'roam' | 'fight' | 'objective' | 'respawn-walk' | 'push' | 'retreat'
}

export type ChampionSchedule = MovementSegment[]

export interface ChampionPosition {
  x: number
  y: number
  kind: MovementSegment['kind'] | 'hold'
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

function segLength(a: MapPoint, b: MapPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function pathLength(path: MapPoint[]): number {
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

/** Sub-polyline between two arc-length fractions (start may exceed end → reversed walk). */
function subPath(path: MapPoint[], fromFrac: number, toFrac: number, steps = 6): MapPoint[] {
  const pts: MapPoint[] = []
  for (let i = 0; i <= steps; i++) {
    pts.push(pointAlongPath(path, fromFrac + ((toFrac - fromFrac) * i) / steps))
  }
  return pts
}

function jittered(p: MapPoint, rng: () => number, amount = 4): MapPoint {
  return {
    x: Math.max(3, Math.min(97, p.x + (rng() - 0.5) * amount * 2)),
    y: Math.max(3, Math.min(97, p.y + (rng() - 0.5) * amount * 2)),
  }
}

// ── Schedule building ────────────────────────────────────────────────────────

interface Order {
  t: number
  location: MapPoint
  holdUntil: number
  kind: MovementSegment['kind']
}

function fountainOf(team: 1 | 2): MapPoint {
  return team === 1 ? { ...BLUE_FOUNTAIN } : { ...RED_FOUNTAIN }
}

/**
 * Builds one deterministic movement schedule per champion from the battle
 * timeline. Positions become a pure function of game-time, so background
 * catch-up and tab re-opens need no snapping logic.
 */
export function buildMovementSchedules(
  timeline: BattleTimeline,
  seed: number,
): { t1: ChampionSchedule[]; t2: ChampionSchedule[] } {
  const build = (team: 1 | 2): ChampionSchedule[] =>
    BATTLE_ROLES.map((role, idx) => buildChampionSchedule(timeline, seed, team, idx, role))
  return { t1: build(1), t2: build(2) }
}

function laneHoldPoint(role: BattleRole, team: 1 | 2, rng: () => number): MapPoint {
  const path = ROLE_LANE_PATH[role]
  const frac = team === 1 ? LANE_HOLD_FRACTION_BLUE : LANE_HOLD_FRACTION_RED
  return jittered(pointAlongPath(path, frac), rng, 3)
}

function buildChampionSchedule(
  timeline: BattleTimeline,
  seed: number,
  team: 1 | 2,
  idx: number,
  role: BattleRole,
): ChampionSchedule {
  const rng = createRng((seed ^ Math.imul(team, 0x2545f491) ^ Math.imul(idx + 1, 0x9e3779b9)) >>> 0)
  const fountain = fountainOf(team)
  const lanePath = ROLE_LANE_PATH[role]
  const holdFrac = team === 1 ? LANE_HOLD_FRACTION_BLUE : LANE_HOLD_FRACTION_RED
  const circuit = team === 1 ? BLUE_JUNGLE_CIRCUIT : RED_JUNGLE_CIRCUIT

  // 1) Collect orders (places this champion must be) from the timeline
  const orders: Order[] = []
  for (const e of timeline.events) {
    const parts = e.participants
    const inFight =
      parts !== undefined && (team === 1 ? parts.t1.includes(idx) : parts.t2.includes(idx))
    if (e.type === 'fightStart' && e.location && inFight) {
      orders.push({
        t: Math.max(0, e.t - MOVE_FIGHT_GATHER_LEAD_T),
        location: jittered(e.location, rng, 3),
        holdUntil: e.t + 140,
        kind: 'fight',
      })
    }
    if (e.type === 'objectiveSpawn' && e.location && inFight) {
      orders.push({
        t: Math.max(0, e.t - MOVE_FIGHT_GATHER_LEAD_T),
        location: jittered(e.location, rng, 4),
        holdUntil: e.t + 600,
        kind: 'objective',
      })
    }
  }

  // jungler roams its circuit between orders
  if (role === 'jungle') {
    for (let t = MOVE_WALKOUT_END_T + 60; t < TIMELINE_NEXUS_FALL_T - 400; t += 260 + Math.floor(rng() * 200)) {
      orders.push({
        t,
        location: jittered(circuit[Math.floor(rng() * circuit.length)], rng, 2),
        holdUntil: t + 200,
        kind: 'roam',
      })
    }
  } else {
    // laners drift around their hold point now and then
    for (let t = MOVE_WALKOUT_END_T + 120; t < TIMELINE_NEXUS_FALL_T - 500; t += 320 + Math.floor(rng() * 260)) {
      orders.push({
        t,
        location: laneHoldPoint(role, team, rng),
        holdUntil: t + 260,
        kind: 'lane',
      })
    }
  }

  // 2) Endgame: winner pushes down mid to the enemy nexus, loser falls back
  const winnerTeam = timeline.winner
  const pushT = TIMELINE_NEXUS_FALL_T - 500 + Math.floor(rng() * 120)
  if (team === winnerTeam) {
    const enemyNexus = team === 1 ? RED_NEXUS : BLUE_NEXUS
    orders.push({
      t: pushT,
      location: jittered(enemyNexus, rng, 4),
      holdUntil: BATTLE_TOTAL_GAME_SECONDS,
      kind: 'push',
    })
  } else {
    const ownNexus = team === 1 ? BLUE_NEXUS : RED_NEXUS
    orders.push({
      t: pushT + 80,
      location: jittered(ownNexus, rng, 5),
      holdUntil: BATTLE_TOTAL_GAME_SECONDS,
      kind: 'retreat',
    })
  }

  orders.sort((a, b) => a.t - b.t)

  // 3) Deaths interrupt everything: snap to fountain, then walk back
  const deaths: number[] = []
  for (const e of timeline.events) {
    if (e.type === 'kill' && e.victimIdx === idx && e.team !== team) deaths.push(e.t)
  }

  // 4) Convert to segments
  const segments: MovementSegment[] = []
  // walkout: fountain → lane hold point along the real lane path
  const walkoutPath =
    role === 'jungle'
      ? [fountain, ...subPath(lanePath, team === 1 ? 0.06 : 0.94, team === 1 ? 0.2 : 0.8, 3).slice(1), { ...circuit[0] }]
      : team === 1
        ? subPath(lanePath, 0, holdFrac)
        : subPath(lanePath, 1, holdFrac)
  segments.push({ tStart: 0, tEnd: MOVE_WALKOUT_END_T, path: walkoutPath, kind: 'walkout' })

  let cursorPos = walkoutPath[walkoutPath.length - 1]
  let cursorT = MOVE_WALKOUT_END_T
  for (const order of orders) {
    if (order.t <= cursorT) continue
    const travelStart = Math.max(cursorT, order.t - 1)
    const isPush = order.kind === 'push' || order.kind === 'retreat'
    const path = isPush
      ? pushPath(cursorPos, order.location, team, rng)
      : [cursorPos, jittered(midpoint(cursorPos, order.location), rng, 5), order.location]
    const travelEnd = Math.min(order.holdUntil, travelStart + 120)
    segments.push({ tStart: travelStart, tEnd: travelEnd, path, kind: order.kind })
    cursorPos = order.location
    cursorT = Math.max(travelEnd, order.holdUntil)
  }

  // splice death interruptions in
  for (const deathT of deaths) {
    const returnTo = positionFromSegments(segments, deathT + MOVE_RESPAWN_WALK_SECONDS + 1) ?? cursorPos
    segments.push({
      tStart: deathT,
      tEnd: deathT + MOVE_RESPAWN_WALK_SECONDS,
      path: [fountain, jittered(midpoint(fountain, returnTo), rng, 4), returnTo],
      kind: 'respawn-walk',
    })
  }

  segments.sort((a, b) => a.tStart - b.tStart)
  return segments
}

function midpoint(a: MapPoint, b: MapPoint): MapPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** Endgame push follows the mid lane instead of a straight line. */
function pushPath(from: MapPoint, to: MapPoint, team: 1 | 2, rng: () => number): MapPoint[] {
  const laneFracs = team === 1 ? [0.55, 0.7, 0.85] : [0.45, 0.3, 0.15]
  const via = laneFracs.map((f) => jittered(pointAlongPath(MID_LANE_PATH, f), rng, 3))
  return [from, ...via, to]
}

function positionFromSegments(segments: MovementSegment[], t: number): MapPoint | null {
  let lastEnd: MapPoint | null = null
  for (const seg of segments) {
    if (t >= seg.tStart && t <= seg.tEnd) {
      const f = seg.tEnd > seg.tStart ? (t - seg.tStart) / (seg.tEnd - seg.tStart) : 1
      return pointAlongPath(seg.path, f)
    }
    if (seg.tEnd <= t) lastEnd = seg.path[seg.path.length - 1]
  }
  return lastEnd
}

/**
 * Position of a champion at a given game-time — pure function, respawn-walk
 * segments (added last, sorted in) win over overlapping regular segments.
 */
export function positionAt(schedule: ChampionSchedule, gameTime: number): ChampionPosition {
  // respawn-walk overrides anything overlapping
  for (const seg of schedule) {
    if (seg.kind === 'respawn-walk' && gameTime >= seg.tStart && gameTime <= seg.tEnd) {
      const f = (gameTime - seg.tStart) / (seg.tEnd - seg.tStart)
      const p = pointAlongPath(seg.path, f)
      return { x: p.x, y: p.y, kind: 'respawn-walk' }
    }
  }
  let last: { p: MapPoint; kind: MovementSegment['kind'] } | null = null
  for (const seg of schedule) {
    if (seg.kind === 'respawn-walk') continue
    if (gameTime >= seg.tStart && gameTime <= seg.tEnd) {
      const f = seg.tEnd > seg.tStart ? (gameTime - seg.tStart) / (seg.tEnd - seg.tStart) : 1
      const p = pointAlongPath(seg.path, f)
      return { x: p.x, y: p.y, kind: seg.kind }
    }
    if (seg.tEnd <= gameTime) last = { p: seg.path[seg.path.length - 1], kind: seg.kind }
  }
  if (last) return { x: last.p.x, y: last.p.y, kind: 'hold' }
  const start = schedule[0]?.path[0] ?? { x: 50, y: 50 }
  return { x: start.x, y: start.y, kind: 'hold' }
}

// ── Minions ──────────────────────────────────────────────────────────────────

export interface MinionDot {
  x: number
  y: number
  team: 1 | 2
  lane: 'top' | 'mid' | 'bot'
  key: string
}

const MINION_LANES: Array<{ lane: 'top' | 'mid' | 'bot'; path: MapPoint[] }> = [
  { lane: 'top', path: TOP_LANE_PATH },
  { lane: 'mid', path: MID_LANE_PATH },
  { lane: 'bot', path: BOT_LANE_PATH },
]

/** Marching minion dots as a pure function of game-time. */
export function minionsAt(gameTime: number): MinionDot[] {
  const out: MinionDot[] = []
  const currentWave = Math.floor(gameTime / MINION_WAVE_INTERVAL_T)
  for (const { lane, path } of MINION_LANES) {
    for (let w = Math.max(0, currentWave - MINION_WAVES_VISIBLE + 1); w <= currentWave; w++) {
      const spawnT = w * MINION_WAVE_INTERVAL_T
      const progress = (gameTime - spawnT) * MINION_PATH_SPEED
      if (progress <= 0.02 || progress >= 0.48) continue
      for (let m = 0; m < MINIONS_PER_WAVE; m++) {
        const offset = m * 0.012
        const blue = pointAlongPath(path, Math.min(0.5, progress - offset))
        const red = pointAlongPath(path, Math.max(0.5, 1 - progress + offset))
        if (progress - offset > 0.02) {
          out.push({ x: blue.x, y: blue.y, team: 1, lane, key: `b-${lane}-${w}-${m}` })
          out.push({ x: red.x, y: red.y, team: 2, lane, key: `r-${lane}-${w}-${m}` })
        }
      }
    }
  }
  return out
}

/** Multikill tier label helper shared by kill feed + banners. */
export function multikillLabel(tier: keyof MultikillCounts | 2 | 3 | 4 | 5): string {
  const map: Record<string, string> = {
    2: 'DOUBLE KILL',
    3: 'TRIPLE KILL',
    4: 'QUADRA KILL',
    5: 'PENTA KILL',
    double: 'DOUBLE KILL',
    triple: 'TRIPLE KILL',
    quadra: 'QUADRA KILL',
    penta: 'PENTA KILL',
  }
  return map[String(tier)] ?? ''
}
