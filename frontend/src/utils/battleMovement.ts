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
  MOVE_SIEGE_HOLD_T,
  MOVE_ORDER_TRAVEL_T,
  MOVE_KILL_CONVERGE_LEAD_T,
  MOVE_KILL_KILLER_HOLD_T,
  FINAL_PUSH_START_T,
  FINAL_PUSH_STAGGER_T,
  FINAL_PUSH_DEFENDER_LEAD_T,
  FINAL_PUSH_TO_INHIB_TRAVEL_T,
  FINAL_PUSH_FIGHT_T,
  FINAL_PUSH_FIGHT_HOLD_T,
  FINAL_PUSH_NEXUS_TRAVEL_T,
  FINAL_PUSH_LAST_STAND_TRAVEL_T,
  JUNGLE_BUFF_CLEAR_DURATION_T,
  JUNGLE_ROAM_AFTER_BUFFS_T,
} from '../config/constants'
import {
  type MapPoint,
  pointAlongPath,
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
import { parseStructureId, killRoutePoints, LANE_TIER_ORDER } from './battleStructures'

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

// ── Geometry helpers (moved to config/battleRoutes, re-exported for consumers) ──

export { pointAlongPath }

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
  /** Preempts whatever the champion is holding — used for structure sieges, where an attacker MUST be present. */
  priority?: boolean
  /** Travel duration override in game-seconds (default: MOVE_ORDER_TRAVEL_T). */
  travelT?: number
  /** Waypoints walked between the current position and the order location (default: a jittered midpoint). */
  via?: MapPoint[]
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
  const endgameRoute = winnerKillRoute(timeline)
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
      // drakes chain back to back, so their pit hold is shorter than the baron's
      orders.push({
        t: Math.max(0, e.t - MOVE_FIGHT_GATHER_LEAD_T),
        location: jittered(e.location, rng, 4),
        holdUntil: e.t + (e.objective === 'baron' ? 600 : 300),
        kind: 'objective',
      })
    }
    // attackers siege the structure they are about to destroy (direct path, like a fight)
    if (
      (e.type === 'turret' || e.type === 'inhibitor') &&
      e.location &&
      inFight &&
      e.team === team
    ) {
      orders.push({
        t: Math.max(0, e.t - MOVE_FIGHT_GATHER_LEAD_T),
        location: jittered(e.location, rng, 2),
        holdUntil: e.t + MOVE_SIEGE_HOLD_T,
        kind: 'fight',
        priority: true,
      })
    }
    // Every kill drags its killer AND its victim onto the kill spot just before
    // it lands, so a death is never drawn with no enemy nearby. Group fights
    // resolve naturally: several kills share one location, gathering everyone
    // involved at that point. Priority so it preempts any lane/roam drift.
    if (e.type === 'kill' && e.location) {
      const isKiller = e.team === team && e.killerIdx === idx
      const isVictim = e.team !== team && e.victimIdx === idx
      if (isKiller || isVictim) {
        orders.push({
          t: Math.max(0, e.t - MOVE_KILL_CONVERGE_LEAD_T),
          location: jittered(e.location, rng, isKiller ? 2.5 : 1.5),
          // killer lingers over the corpse; the victim only needs to be there at death
          holdUntil: isKiller ? e.t + MOVE_KILL_KILLER_HOLD_T : e.t,
          kind: 'fight',
          priority: true,
          travelT: MOVE_KILL_CONVERGE_LEAD_T,
        })
      }
    }
  }

  // Buff-camp clears: whoever the timeline scripted as the killer walks to the
  // camp and MUST be there for the clear (priority order, arrival before the
  // event). The first two clears per team are the jungler's; re-clears can
  // belong to any champion.
  const teamBuffEvents = timeline.events
    .filter((e) => e.type === 'buff' && e.team === team && e.location)
    .sort((a, b) => a.t - b.t)
  for (const e of teamBuffEvents) {
    if ((e.killerIdx ?? 1) !== idx) continue
    orders.push({
      t: Math.max(MOVE_WALKOUT_END_T, e.t - JUNGLE_BUFF_CLEAR_DURATION_T),
      location: jittered(e.location!, rng, 1.5),
      holdUntil: e.t + 15,
      kind: 'roam',
      priority: true,
      travelT: JUNGLE_BUFF_CLEAR_DURATION_T - 10,
    })
  }

  if (role === 'jungle') {
    // circuit roam starts after the early two-buff script; later re-clear
    // orders simply interleave with the roam
    const roamStart =
      teamBuffEvents.length > 1
        ? teamBuffEvents[1].t + JUNGLE_ROAM_AFTER_BUFFS_T
        : MOVE_WALKOUT_END_T + 60
    for (let t = roamStart; t < TIMELINE_NEXUS_FALL_T - 400; t += 260 + Math.floor(rng() * 200)) {
      orders.push({
        t,
        location: jittered(circuit[Math.floor(rng() * circuit.length)], rng, 2),
        holdUntil: t + 200,
        kind: 'roam',
      })
    }
  } else {
    // laners drift around their hold point now and then
    for (
      let t = MOVE_WALKOUT_END_T + 120;
      t < TIMELINE_NEXUS_FALL_T - 500;
      t += 320 + Math.floor(rng() * 260)
    ) {
      orders.push({
        t,
        location: laneHoldPoint(role, team, rng),
        holdUntil: t + 260,
        kind: 'lane',
      })
    }
  }

  // 2) Endgame: at the 50:00 mark the winner marches the cracked lane down
  // while the loser digs in at its fallen inhibitor — the scripted final
  // fight happens right there, then the winner breaks through to the nexus
  const winnerTeam = timeline.winner
  const pushT = FINAL_PUSH_START_T + Math.floor(rng() * FINAL_PUSH_STAGGER_T)
  const breakthroughT = FINAL_PUSH_FIGHT_T + FINAL_PUSH_FIGHT_HOLD_T
  // kill route: [outer, inner, inhibTurret, inhibitor, nexusGate, nexus]
  const inhibIdx = LANE_TIER_ORDER.length - 1
  const defensePoint = endgameRoute[inhibIdx]
  if (team === winnerTeam) {
    const enemyNexus = team === 1 ? RED_NEXUS : BLUE_NEXUS
    orders.push({
      t: pushT,
      location: jittered(defensePoint, rng, 2.5),
      holdUntil: breakthroughT,
      kind: 'push',
      // must preempt any lingering lane-drift hold, or the march never starts
      priority: true,
      travelT: FINAL_PUSH_TO_INHIB_TRAVEL_T,
      // march visibly tower to tower down the cracked lane to the defense line
      via: endgameRoute.slice(0, inhibIdx),
    })
    orders.push({
      t: breakthroughT,
      location: jittered(enemyNexus, rng, 3),
      holdUntil: BATTLE_TOTAL_GAME_SECONDS,
      kind: 'push',
      priority: true,
      travelT: FINAL_PUSH_NEXUS_TRAVEL_T,
      // breakthrough: inhibitor → nexus gate → nexus
      via: endgameRoute.slice(inhibIdx + 1, -1),
    })
  } else {
    const ownNexus = team === 1 ? BLUE_NEXUS : RED_NEXUS
    orders.push({
      // defenders have the shorter way — they stand first
      t: pushT - FINAL_PUSH_DEFENDER_LEAD_T,
      location: jittered(defensePoint, rng, 3.5),
      holdUntil: breakthroughT,
      kind: 'retreat',
      priority: true,
      travelT: FINAL_PUSH_TO_INHIB_TRAVEL_T,
    })
    // last stand: survivors fall back to their nexus once the line breaks
    orders.push({
      t: breakthroughT,
      location: jittered(ownNexus, rng, 4),
      holdUntil: BATTLE_TOTAL_GAME_SECONDS,
      kind: 'retreat',
      priority: true,
      travelT: FINAL_PUSH_LAST_STAND_TRAVEL_T,
    })
  }

  orders.sort((a, b) => a.t - b.t)

  // 3) Deaths interrupt everything: fall where killed, then trek back
  const deaths: { t: number; location?: MapPoint }[] = []
  for (const e of timeline.events) {
    if (e.type === 'kill' && e.victimIdx === idx && e.team !== team) {
      deaths.push({ t: e.t, location: e.location })
    }
  }

  // 4) Convert to segments
  const segments: MovementSegment[] = []
  // walkout: fountain → lane hold point along the real lane path;
  // the jungler heads straight to its scripted first buff camp instead
  const jungleWalkoutTarget = teamBuffEvents[0]?.location ?? circuit[0]
  const walkoutPath =
    role === 'jungle'
      ? [
          fountain,
          ...subPath(lanePath, team === 1 ? 0.06 : 0.94, team === 1 ? 0.2 : 0.8, 3).slice(1),
          { ...jungleWalkoutTarget },
        ]
      : team === 1
        ? subPath(lanePath, 0, holdFrac)
        : subPath(lanePath, 1, holdFrac)
  segments.push({ tStart: 0, tEnd: MOVE_WALKOUT_END_T, path: walkoutPath, kind: 'walkout' })

  let cursorPos = walkoutPath[walkoutPath.length - 1]
  let cursorT = MOVE_WALKOUT_END_T
  for (const order of orders) {
    if (order.t <= cursorT && !order.priority) continue
    const travelStart = order.priority ? order.t - 1 : Math.max(cursorT, order.t - 1)
    const path = order.via
      ? [cursorPos, ...order.via.map((p) => jittered(p, rng, 1.5)), order.location]
      : [cursorPos, jittered(midpoint(cursorPos, order.location), rng, 5), order.location]
    const travelEnd = Math.min(
      order.holdUntil,
      travelStart + (order.travelT ?? MOVE_ORDER_TRAVEL_T),
    )
    segments.push({ tStart: travelStart, tEnd: travelEnd, path, kind: order.kind })
    cursorPos = order.location
    cursorT = Math.max(travelEnd, order.holdUntil)
  }

  // splice death interruptions in
  for (const { t: deathT, location } of deaths) {
    const returnTo =
      positionFromSegments(segments, deathT + MOVE_RESPAWN_WALK_SECONDS + 1) ?? cursorPos
    // Die AT the kill spot (the converge order put both fighters there), then
    // fall back through the fountain and walk out again — the death reads at
    // the skirmish, not teleported to base.
    const deathSpot = location ? jittered(location, rng, 1.5) : fountain
    segments.push({
      tStart: deathT,
      tEnd: deathT + MOVE_RESPAWN_WALK_SECONDS,
      path: [deathSpot, fountain, jittered(midpoint(fountain, returnTo), rng, 4), returnTo],
      kind: 'respawn-walk',
    })
  }

  segments.sort((a, b) => a.tStart - b.tStart)
  return segments
}

function midpoint(a: MapPoint, b: MapPoint): MapPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * The kill route the winner marches at the end — through the structures of the
 * lane whose loser inhibitor fell: outer → inner → inhib turret → inhibitor →
 * between the nexus turrets → nexus (mirrors the minimap lane highlight).
 */
function winnerKillRoute(timeline: BattleTimeline): MapPoint[] {
  const loser = (3 - timeline.winner) as 1 | 2
  for (const e of timeline.events) {
    if (e.type !== 'inhibitor' || !e.structureId) continue
    const { ownerTeam, laneKey } = parseStructureId(e.structureId)
    if (ownerTeam === loser && (laneKey === 'top' || laneKey === 'mid' || laneKey === 'bot')) {
      return killRoutePoints(loser, laneKey)
    }
  }
  return killRoutePoints(loser, 'mid')
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
