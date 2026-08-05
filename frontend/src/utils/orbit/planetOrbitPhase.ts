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
  PLANET_ORBIT_FOREGROUND_DEPTH,
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
 * Bahnwinkel → Fortschritt (0 … 1) in den `ps-planet-orbit`-Keyframes.
 *
 * relY(A) lässt sich als R·sin(A + φ) schreiben, der Vordergrundbogen liegt also
 * zwischen zwei festen Winkeln. `psi` dreht die Bahn so, dass sie unabhängig von
 * der Laufrichtung immer vorwärts durch denselben Bogen läuft, gemessen ab dem
 * Austrittspunkt — dadurch bleibt die Rechnung frei von Intervall-Sonderfällen,
 * auch wenn die Schwelle (wie hier) im positiven relY-Bereich liegt.
 *
 * Die Grenze ist bewusst die Vordergrund-Schwelle und nicht die Sonnenkante:
 * genau an ihr schaltet das Command Panel sein Eclipse-Medaillon. Verdeckung im
 * Tab und Medaillon dort gehen damit gemeinsam an und aus.
 *
 * Das Ergebnis wird stückweise linear abgebildet: Vordergrundbogen auf 0 … 70 %,
 * verdeckter Bogen auf 70 … 100 % — passend zum z-index-Wechsel der Keyframes.
 */
export function orbitEclipsePhase(
  angle: number,
  direction: 1 | -1,
  ratio: number,
  tiltRad: number,
): number {
  const ampX = ratio * Math.sin(tiltRad)
  const ampY = Math.cos(tiltRad)
  const amplitude = Math.hypot(ampX, ampY)
  const phaseShift = Math.atan2(ampX, ampY)

  // Sonderfall einer entarteten Bahn: dann gibt es keinen verdeckten Bogen.
  if (amplitude < 1e-6) return 0

  const foregroundRelY = 2 * PLANET_ORBIT_FOREGROUND_DEPTH - 1
  const ratioAtThreshold = Math.max(-1, Math.min(1, foregroundRelY / amplitude))
  // Vorzeichenbehaftet: verschiebt die Grenzen symmetrisch um den Halbkreis.
  const skew = Math.asin(ratioAtThreshold)

  // Bogenlängen: psiEnter = π − skew, psiExit = 2π + skew.
  const behindArc = Math.PI + 2 * skew
  const foregroundArc = TWO_PI - behindArc
  const psiExit = TWO_PI + skew

  const psi = normalizeAngle(direction === 1 ? angle + phaseShift : Math.PI - (angle + phaseShift))
  // Zurückgelegter Weg seit dem Austritt aus der Verdeckung — wächst monoton
  // von 0 (Austritt) bis 2π und macht jede Intervall-Fallunterscheidung obsolet.
  const travelled = normalizeAngle(psi - psiExit)

  const fg = PLANET_TAB_ORBIT_FOREGROUND_PROGRESS
  if (travelled < foregroundArc) return fg * (travelled / foregroundArc)
  return fg + (1 - fg) * ((travelled - foregroundArc) / behindArc)
}
