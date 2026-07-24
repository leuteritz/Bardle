// ── Geteilte Orbit-Phase der Spieler-Planeten ───────────────────────────────
// Idle-Orbit (PlanetOrbit.vue) und Planeten-Tab zeigen denselben Planeten auf
// derselben Bahn — der Tab nur stark verkleinert und auf einer eigenen
// Keyframe-Ellipse.
//
// Der Idle-Orbit ist die einzige Quelle der Bahnwinkel: Er simuliert auch dann
// weiter, wenn ein Bard-Tab ihn verdeckt (dann headless, ohne zu zeichnen), und
// schreibt seinen Winkel pro Frame nach `planetOrbitPhases`. Der Tab liest nur
// und übersetzt den Winkel in den Fortschritt seiner Keyframes — dadurch
// verschwindet der Planet dort exakt dann und so lange hinter der Sonne wie im
// Idle-Orbit.
import {
  ORBIT_TIERS,
  PLANET_ORBIT_BEHIND_REL_Y,
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

  const psi = normalizeAngle(direction === 1 ? angle + phaseShift : Math.PI - (angle + phaseShift))
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
