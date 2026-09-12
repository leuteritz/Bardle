/**
 * Wo Bard in der laufenden Galaxie steht — die EINE Rechnung dafür.
 *
 * Sie stand als Closure in `MiniMapCanvas`. Seit die Live-Bühne des
 * Voyages-Reiters denselben Flug ein zweites Mal zeigt, liegt sie hier: zwei
 * Fassungen liefen sonst auseinander, sobald eine von beiden angefasst wird.
 *
 * Zeitfrei im Ergebnis, nicht im Argument: `now` kommt von aussen und ist immer
 * `gameNow()` — die Position wird NIE fortgeschrieben, sondern jedes Mal neu
 * gerechnet. Damit übersteht sie Zeitraffer, Reiterwechsel und Reload.
 */
import { seededRng, type DotPos } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  PLAYER_DRIFT_AMP,
  PLAYER_DRIFT_HEADING_STEP_MS,
  PLAYER_DRIFT_PERIOD_MS,
} from '@/config/constants'

/** Der Kern der Scheibe im normalisierten 0..1-Raum. */
const CORE: DotPos = { x: 0.5, y: 0.5 }

/** Genau die Felder des `galaxyStore`, die den Flug bestimmen. */
export interface PlayerFlightState {
  bossPhaseActive: boolean
  isComplete: boolean
  isRescueRotating: boolean
  travelingToGalaxyBoss: boolean
  championTravelState: string
  championTravelStartTime: number
  championTravelDurationMs: number
  /** Kurs offen: der Körper treibt um seinen Ort, statt zu stehen. */
  pendingRoleSelection?: boolean
  /** Seed der Drift — je Galaxie ein eigener Wanderweg. */
  mapSeed?: number
}

function clampDot(p: DotPos): DotPos {
  return { x: Math.min(0.94, Math.max(0.06, p.x)), y: Math.min(0.94, Math.max(0.06, p.y)) }
}

/**
 * Die Wanderung ohne Kurs: zwei überlagerte Sinus-Wellen mit seed-eigenen
 * Phasen und Frequenzen — eine Lissajous-Figur um den Ort, immer frisch aus
 * `now`, nie fortgeschrieben.
 */
export function driftOffset(seed: number, nowMs: number): DotPos {
  const rng = seededRng((seed ^ 0x9e3779b9) >>> 0)
  const p1 = rng() * Math.PI * 2
  const p2 = rng() * Math.PI * 2
  const f1 = 0.8 + rng() * 0.4
  const f2 = 0.5 + rng() * 0.3
  const t = (nowMs / PLAYER_DRIFT_PERIOD_MS) * Math.PI * 2
  return {
    x: PLAYER_DRIFT_AMP * (0.7 * Math.sin(t * f1 + p1) + 0.3 * Math.sin(t * f2 * 2.3 + p2)),
    y: PLAYER_DRIFT_AMP * (0.7 * Math.cos(t * f2 + p2) + 0.3 * Math.cos(t * f1 * 1.7 + p1)),
  }
}

/** Kurswinkel des treibenden Körpers aus finiter Differenz. */
export function driftHeading(seed: number, nowMs: number): number {
  const a = driftOffset(seed, nowMs)
  const b = driftOffset(seed, nowMs + PLAYER_DRIFT_HEADING_STEP_MS)
  return Math.atan2(b.y - a.y, b.x - a.x)
}

/** Die offene Etappe: woher, wohin. `target` ist null, wenn keine läuft. */
export function playerLeg(
  spawn: DotPos,
  dots: DotPos[],
  attempts: number,
  state: PlayerFlightState,
): { from: DotPos; target: DotPos | null } {
  const from = attempts > 0 && dots.length >= attempts ? dots[attempts - 1] : spawn
  if (state.isRescueRotating) return { from, target: null }
  const target = state.travelingToGalaxyBoss
    ? CORE
    : attempts < dots.length
      ? dots[attempts]
      : null
  return { from, target }
}

/** Anteil der geflogenen Etappe, 0..1. Ausserhalb des Flugs 0. */
export function playerTravelProgress(state: PlayerFlightState, now: number): number {
  if (state.championTravelState !== 'traveling') return 0
  const { championTravelStartTime: start, championTravelDurationMs: dur } = state
  if (start <= 0 || dur <= 0) return 0
  return Math.min(Math.max((now - start) / dur, 0), 1)
}

/**
 * Die Position im 0..1-Raum, GERADE zwischen den Enden der Etappe.
 *
 * Die Bottom-Bar zeichnet damit ihren Spielerkörper. Wer den Körper auf die
 * gebogene Flugbahn setzen will, nimmt `playerLeg` und wertet die Kurve selbst
 * aus — die Biegung steht in Pixeln senkrecht zur Sehne und lässt sich hier
 * nicht rechnen.
 */
export function playerGalaxyPos(
  spawn: DotPos,
  dots: DotPos[],
  attempts: number,
  state: PlayerFlightState,
  now: number,
): DotPos {
  // Am Bossstern im Kern angedockt.
  if (state.bossPhaseActive || state.isComplete) return CORE
  const { from, target } = playerLeg(spawn, dots, attempts, state)
  if (state.pendingRoleSelection && !state.isRescueRotating) {
    const d = driftOffset(state.mapSeed ?? 0, now)
    return clampDot({ x: from.x + d.x, y: from.y + d.y })
  }
  if (!target) return from
  if (state.championTravelState === 'traveling') {
    const p = playerTravelProgress(state, now)
    return { x: from.x + (target.x - from.x) * p, y: from.y + (target.y - from.y) * p }
  }
  const arrived =
    state.championTravelState === 'champion_available' ||
    state.championTravelState === 'champion_spawned'
  return arrived ? target : from
}
