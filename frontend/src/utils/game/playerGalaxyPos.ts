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
