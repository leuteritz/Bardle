// ── Geteilte Orbit-Phase der Spieler-Planeten ───────────────────────────────
// Idle-Orbit (PlanetOrbit.vue) und Planeten-Tab zeigen denselben Planeten auf
// derselben Bahn. Der Idle-Layer pausiert aber, sobald ein Profil-Tab offen ist
// (useRenderingPaused) — ohne geteilten Zustand liefen beide Ansichten
// auseinander und der Planet stünde im Tab zu einem völlig anderen Zeitpunkt
// hinter der Sonne als im Orbit.
//
// Staffellauf: Der Idle-Orbit schreibt seinen Winkel pro Frame nach
// `planetOrbitPhases`. Öffnet sich der Tab, übernimmt er diese Winkel, dreht sie
// mit derselben Regel weiter und legt das Ergebnis beim Verlassen in
// `planetOrbitHandoff` ab — der Idle-Orbit übernimmt es beim nächsten Frame und
// setzt die Position hart, statt sie von der alten Stelle nachzuziehen.
import {
  BEHIND_SUN_SPEED_MULTIPLIER,
  ORBIT_TIERS,
  PLANET_ORBIT_BEHIND_REL_Y,
  PLANET_ORBIT_BEHIND_SPEED_LERP,
  PLANET_ORBIT_KEPLER_BOOST,
  PLANET_TAB_ORBIT_FOREGROUND_PROGRESS,
} from '@/config/constants'

const TWO_PI = Math.PI * 2

export interface PlanetOrbitPhaseEntry {
  /** Fortlaufender Bahnwinkel in Radiant (nicht normalisiert). */
  angle: number
  /** Aktueller Behind-the-Sun-Speedup, weich gelerpt zwischen 1 und 5. */
  speedMul: number
}

/** Live-Winkel je Slot — vom Idle-Orbit pro Frame geschrieben. */
export const planetOrbitPhases = new Map<string, PlanetOrbitPhaseEntry>()

/** Vom Planeten-Tab zurückgegebene Winkel — der Idle-Orbit springt darauf. */
export const planetOrbitHandoff = new Map<string, PlanetOrbitPhaseEntry>()

function normalizeAngle(angle: number): number {
  const wrapped = angle % TWO_PI
  return wrapped < 0 ? wrapped + TWO_PI : wrapped
}

/**
 * Bahn-Kennwerte des Tiers, auf dem der Slot mit diesem Index läuft. Nur das
 * Achsenverhältnis zählt, nicht die absolute Größe: rx und ry werden in
 * PlanetOrbit identisch skaliert, das Verhältnis bleibt also viewport-unabhängig.
 */
export function orbitTierForSlotIndex(index: number): { ratio: number; tiltRad: number } {
  const tiers = ORBIT_TIERS.planet
  const tier = tiers[index % tiers.length]
  return { ratio: tier.rx / tier.ry, tiltRad: tier.tiltRad }
}

/** Startwinkel eines Slots — identisch zur Erstbelegung im Idle-Orbit. */
export function initialOrbitAngle(index: number, count: number): number {
  return (index / Math.max(count, 1)) * TWO_PI
}

/** Ein Integrationsschritt des Bahnwinkels (Kepler-Anteil inklusive). */
export function advanceOrbitAngle(
  angle: number,
  direction: 1 | -1,
  baseSpeed: number,
  speedMul: number,
  dtMs: number,
): number {
  const keplerBoost = 1 + PLANET_ORBIT_KEPLER_BOOST * (1 - Math.abs(Math.cos(angle)))
  return angle + direction * baseSpeed * keplerBoost * speedMul * dtMs
}

/** Weiche Annäherung des Behind-the-Sun-Speedups an sein Ziel. */
export function approachBehindSpeedMul(current: number, isBehind: boolean): number {
  const target = isBehind ? BEHIND_SUN_SPEED_MULTIPLIER : 1
  return current + (target - current) * PLANET_ORBIT_BEHIND_SPEED_LERP
}

/**
 * Normierte Bildschirm-y-Lage (in ry-Einheiten) für einen Bahnwinkel — dieselbe
 * Größe, aus der der Idle-Orbit `isBehind` ableitet, nur direkt aus dem Winkel
 * statt aus der geglätteten Pixelposition.
 */
export function orbitRelY(angle: number, ratio: number, tiltRad: number): number {
  return ratio * Math.cos(angle) * Math.sin(tiltRad) + Math.sin(angle) * Math.cos(tiltRad)
}

/**
 * Bahnwinkel → Phase im Planeten-Tab.
 *
 * relY(A) lässt sich als R·sin(A + φ) schreiben, also liegt der Bogen hinter der
 * Sonne zwischen zwei festen Winkeln. `psi` dreht die Bahn so, dass sie
 * unabhängig von der Laufrichtung immer vorwärts durch denselben Bogen läuft.
 *
 * Das Ergebnis wird stückweise linear auf die `ps-planet-orbit`-Keyframes
 * abgebildet: der Vordergrundbogen auf 0 … 70 %, der Bogen hinter der Sonne auf
 * 70 … 100 %. Dadurch fallen Eintritt und Austritt im Tab exakt auf dieselben
 * Zeitpunkte wie im Idle-Orbit — und weil der Winkel dort wie hier mit derselben
 * Regel weitergedreht wird, stimmt auch die Dauer der Verdeckung.
 */
export function orbitEclipsePhase(
  angle: number,
  direction: 1 | -1,
  ratio: number,
  tiltRad: number,
): { progress: number; isBehind: boolean } {
  const ampX = ratio * Math.sin(tiltRad)
  const ampY = Math.cos(tiltRad)
  const amplitude = Math.hypot(ampX, ampY)
  const phaseShift = Math.atan2(ampX, ampY)

  // Sonderfall einer entarteten Bahn: dann gibt es keinen Bogen hinter der Sonne.
  if (amplitude < 1e-6) return { progress: 0, isBehind: false }

  const ratioAtThreshold = Math.max(-1, Math.min(1, PLANET_ORBIT_BEHIND_REL_Y / amplitude))
  // Halbe Winkelbreite, um die der verdeckte Bogen kürzer ist als ein Halbkreis.
  const trim = Math.abs(Math.asin(ratioAtThreshold))

  const psi = normalizeAngle(
    direction === 1 ? angle + phaseShift : Math.PI - (angle + phaseShift),
  )
  const psiEnter = Math.PI + trim
  const psiExit = TWO_PI - trim

  const fg = PLANET_TAB_ORBIT_FOREGROUND_PROGRESS
  if (psi >= psiEnter && psi < psiExit) {
    const behindArc = psiExit - psiEnter
    return { progress: fg + (1 - fg) * ((psi - psiEnter) / behindArc), isBehind: true }
  }

  const foregroundArc = TWO_PI - (psiExit - psiEnter)
  const travelled = normalizeAngle(psi - psiExit)
  return { progress: fg * (travelled / foregroundArc), isBehind: false }
}
