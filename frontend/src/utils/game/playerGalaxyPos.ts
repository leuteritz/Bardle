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
import type { DotPos } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { cruiseState } from '@/utils/game/driftCruise'

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
  /** Kurs offen: das Schiff kreuzt durch die Galaxie, statt zu stehen. */
  pendingRoleSelection?: boolean
  /** Seed der Kreuzfahrt — je Galaxie ein eigener Weg. */
  mapSeed?: number
  /** Beginn der Kreuzfahrt (gameNow). */
  courseAwaitSince?: number
  /** Wo das Schiff stand, als der Kurs gesetzt wurde — dort beginnt die Etappe. */
  departPos?: DotPos | null
}

function cruising(state: PlayerFlightState): boolean {
  return !!state.pendingRoleSelection && !state.isRescueRotating
}

/** Der letzte besuchte Ort — Anker der Kreuzfahrt, Rückfall der Etappe. */
function lastVisited(spawn: DotPos, dots: DotPos[], attempts: number): DotPos {
  return attempts > 0 && dots.length >= attempts ? dots[attempts - 1] : spawn
}

/** Die offene Etappe: woher, wohin. `target` ist null, wenn keine läuft. */
export function playerLeg(
  spawn: DotPos,
  dots: DotPos[],
  attempts: number,
  state: PlayerFlightState,
): { from: DotPos; target: DotPos | null } {
  const from = state.departPos ?? lastVisited(spawn, dots, attempts)
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

function cruise(spawn: DotPos, dots: DotPos[], attempts: number, state: PlayerFlightState, now: number) {
  return cruiseState(
    state.mapSeed ?? 0,
    state.courseAwaitSince ?? 0,
    lastVisited(spawn, dots, attempts),
    now,
  )
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
  if (cruising(state)) return cruise(spawn, dots, attempts, state, now).pos
  const { from, target } = playerLeg(spawn, dots, attempts, state)
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

/** Der Kurswinkel des Schiffs (rad, y nach unten) — auf der Kreuzfahrt der Segmentkurs. */
export function playerHeading(
  spawn: DotPos,
  dots: DotPos[],
  attempts: number,
  state: PlayerFlightState,
  now: number,
): number {
  if (state.bossPhaseActive || state.isComplete) return 0
  if (cruising(state)) return cruise(spawn, dots, attempts, state, now).heading
  const { from, target } = playerLeg(spawn, dots, attempts, state)
  if (!target) return 0
  return Math.atan2(target.y - from.y, target.x - from.x)
}
