/**
 * Die Kreuzfahrt ohne Kurs — Bard fliegt durch die Galaxie, bis ein Stern
 * gewählt ist: eine Richtung für eine Weile, dann eine Kurve, wieder geradeaus.
 *
 * Eine Kette von Segmenten mit fester Dauer und konstanter Drehrate, je
 * Segment ANALYTISCH (Gerade oder Kreisbogen) — nichts wird pro Frame
 * integriert, die Lage ist eine Funktion von Anker (`t0`, `from`) und `now`.
 * Segmentanfänge liegen je Anker in einem Cache, damit eine Stunde Leerlauf
 * nicht hunderte Segmente je Frame rechnet.
 */
import { seededRng, type DotPos } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  CRUISE_HOME_RADIUS,
  CRUISE_SEG_MAX_MS,
  CRUISE_SEG_MIN_MS,
  CRUISE_SPEED,
  CRUISE_STRAIGHT_CHANCE,
  CRUISE_TURN_MAX,
  CRUISE_TURN_MIN,
  CRUISE_TRACK_CYCLE_MS,
} from '@/config/constants'

const CORE: DotPos = { x: 0.5, y: 0.5 }
const MS = 1000

interface Segment {
  /** Beginn relativ zum Anker, ms. */
  t: number
  dur: number
  x: number
  y: number
  heading: number
  /** Drehrate rad/s; 0 = geradeaus. */
  turn: number
}

interface CruiseTrack {
  rng: () => number
  segs: Segment[]
}

export interface CruiseState {
  pos: DotPos
  heading: number
}

const tracks = new Map<string, CruiseTrack>()

function advance(s: Segment, tauMs: number): { x: number; y: number; heading: number } {
  const tau = tauMs / MS
  if (Math.abs(s.turn) < 1e-6) {
    return {
      x: s.x + CRUISE_SPEED * tau * Math.cos(s.heading),
      y: s.y + CRUISE_SPEED * tau * Math.sin(s.heading),
      heading: s.heading,
    }
  }
  const r = CRUISE_SPEED / s.turn
  const h = s.heading + s.turn * tau
  return {
    x: s.x + r * (Math.sin(h) - Math.sin(s.heading)),
    y: s.y - r * (Math.cos(h) - Math.cos(s.heading)),
    heading: h,
  }
}

function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a))
}

/** Zeit bis zum Heimatkreis auf gerader Bahn — begrenzt jedes Segment, das nach aussen zeigt. */
function msToHomeEdge(x: number, y: number, heading: number): number {
  const dx = x - CORE.x
  const dy = y - CORE.y
  const cx = Math.cos(heading)
  const cy = Math.sin(heading)
  const b = 2 * (dx * cx + dy * cy)
  const c = dx * dx + dy * dy - CRUISE_HOME_RADIUS * CRUISE_HOME_RADIUS
  const disc = b * b - 4 * c
  if (disc <= 0) return Infinity
  // Auf der Kante nach aussen zeigend ist die Zeit null, nicht unendlich.
  const t = (-b + Math.sqrt(disc)) / 2
  return t <= 0 ? 0 : (t / CRUISE_SPEED) * MS
}

function nextSegment(prev: Segment, rng: () => number): Segment {
  const end = advance(prev, prev.dur)
  return planSegment(prev.t + prev.dur, end.x, end.y, end.heading, rng)
}

function planSegment(t: number, x: number, y: number, heading: number, rng: () => number): Segment {
  let dur = CRUISE_SEG_MIN_MS + rng() * (CRUISE_SEG_MAX_MS - CRUISE_SEG_MIN_MS)
  let turn = 0
  const straight = rng() < CRUISE_STRAIGHT_CHANCE
  const sign = rng() < 0.5 ? -1 : 1
  const mag = CRUISE_TURN_MIN + rng() * (CRUISE_TURN_MAX - CRUISE_TURN_MIN)
  if (!straight) turn = sign * mag

  // Steuerung zur Mitte: ausserhalb des Heimatkreises wird auf den Kern
  // eingedreht (bis der Kurs dorthin zeigt), dann geradeaus hinein; innerhalb
  // begrenzt die Kante die Segmentdauer, damit kein Segment weit hinausläuft.
  const toCore = Math.atan2(CORE.y - y, CORE.x - x)
  const off = wrapAngle(toCore - heading)
  const dist = Math.hypot(x - CORE.x, y - CORE.y)
  const minDur = CRUISE_SEG_MIN_MS / 4
  if (dist >= CRUISE_HOME_RADIUS - 1e-3) {
    if (Math.abs(off) > Math.PI / 8) {
      turn = Math.sign(off || 1) * CRUISE_TURN_MAX
      dur = Math.max(minDur, (Math.abs(off) / CRUISE_TURN_MAX) * MS)
    } else {
      turn = 0
      dur = Math.max(minDur, Math.min(dur, (dist / CRUISE_SPEED) * MS * 0.8))
    }
  } else {
    const edge = msToHomeEdge(x, y, heading)
    if (edge < dur) dur = Math.max(edge, minDur)
  }
  return { t, dur, x, y, heading, turn }
}

/**
 * Lage und Kurs zur Zeit `now` — `t0` ist der Beginn der Kreuzfahrt, `from`
 * der Ort, an dem sie begann. Vor `t0` steht das Schiff am Anfang.
 */
export function cruiseState(seed: number, t0: number, from: DotPos, now: number): CruiseState {
  const key = `${seed}|${t0}|${from.x.toFixed(5)}|${from.y.toFixed(5)}`
  let track = tracks.get(key)
  if (!track) {
    const rng = seededRng((seed ^ (t0 & 0x7fffffff) ^ 0x2545f491) >>> 0)
    // Der Anker liegt meist am Rand (Spawn, Stern): der erste Kurs zeigt grob zur Mitte.
    const heading0 =
      Math.atan2(CORE.y - from.y, CORE.x - from.x) + (rng() * 2 - 1) * ((7 * Math.PI) / 18)
    track = { rng, segs: [planSegment(0, from.x, from.y, heading0, rng)] }
    if (tracks.size > 32) tracks.clear()
    tracks.set(key, track)
  }
  // Gefaltet: ein Tag Leerlauf hiesse sonst zehntausend Segmente im Speicher.
  const elapsed = Math.max(0, now - t0) % CRUISE_TRACK_CYCLE_MS
  const segs = track.segs
  let last = segs[segs.length - 1]
  while (last.t + last.dur <= elapsed) {
    last = nextSegment(last, track.rng)
    segs.push(last)
  }
  let i = segs.length - 1
  while (i > 0 && segs[i].t > elapsed) i--
  const s = segs[i]
  const p = advance(s, elapsed - s.t)
  return {
    pos: { x: Math.min(0.94, Math.max(0.06, p.x)), y: Math.min(0.94, Math.max(0.06, p.y)) },
    heading: p.heading,
  }
}

/** Nur für Specs: die geplanten Segmente eines Ankers. */
export function cruiseSegments(seed: number, t0: number, from: DotPos): readonly Segment[] {
  const key = `${seed}|${t0}|${from.x.toFixed(5)}|${from.y.toFixed(5)}`
  return tracks.get(key)?.segs ?? []
}

/** Nur für Specs: den Cache leeren. */
export function resetCruiseTracks(): void {
  tracks.clear()
}
