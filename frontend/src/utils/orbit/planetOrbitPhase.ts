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
  BEHIND_SUN_SPEED_MULTIPLIER,
  ORBIT_TIERS,
  PLANET_ORBIT_FOREGROUND_DEPTH,
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

export interface OrbitArcs {
  /** Bogenlänge im Vordergrund, in Radiant. */
  foregroundArc: number
  /** Bogenlänge hinter der Sonne, in Radiant. */
  behindArc: number
  /** Phasenverschiebung der Bahn gegen den relY-Nulldurchgang. */
  phaseShift: number
  /** Winkel des Austritts aus der Verdeckung, in psi-Koordinaten. */
  psiExit: number
}

/**
 * Die zwei Bögen einer Bahn — vorn und verdeckt.
 *
 * relY(A) lässt sich als R·sin(A + φ) schreiben, der Vordergrundbogen liegt also
 * zwischen zwei festen Winkeln. `psi` dreht die Bahn so, dass sie unabhängig von
 * der Laufrichtung immer vorwärts durch denselben Bogen läuft, gemessen ab dem
 * Austrittspunkt — dadurch bleibt die Rechnung frei von Intervall-Sonderfällen,
 * auch wenn die Schwelle (wie hier) im positiven relY-Bereich liegt.
 *
 * Die Grenze ist bewusst die Vordergrund-Schwelle und nicht die Sonnenkante:
 * genau an ihr schaltet das Command Panel sein Eclipse-Medaillon.
 *
 * `null` bei entarteter Bahn — dann gibt es keinen verdeckten Bogen.
 */
export function orbitArcs(ratio: number, tiltRad: number): OrbitArcs | null {
  const ampX = ratio * Math.sin(tiltRad)
  const ampY = Math.cos(tiltRad)
  const amplitude = Math.hypot(ampX, ampY)
  if (amplitude < 1e-6) return null

  const foregroundRelY = 2 * PLANET_ORBIT_FOREGROUND_DEPTH - 1
  const ratioAtThreshold = Math.max(-1, Math.min(1, foregroundRelY / amplitude))
  // Vorzeichenbehaftet: verschiebt die Grenzen symmetrisch um den Halbkreis.
  const skew = Math.asin(ratioAtThreshold)

  const behindArc = Math.PI + 2 * skew
  return {
    behindArc,
    foregroundArc: TWO_PI - behindArc,
    phaseShift: Math.atan2(ampX, ampY),
    psiExit: TWO_PI + skew,
  }
}

/**
 * Bahnwinkel → Fortschritt (0 … 1) in den `ps-planet-orbit`-Keyframes.
 *
 * Stückweise linear: Vordergrundbogen auf 0 … 70 %, verdeckter Bogen auf
 * 70 … 100 % — passend zum z-index-Wechsel der Keyframes.
 */
export function orbitEclipsePhase(
  angle: number,
  direction: 1 | -1,
  ratio: number,
  tiltRad: number,
): number {
  const arcs = orbitArcs(ratio, tiltRad)
  if (!arcs) return 0
  const { behindArc, foregroundArc, phaseShift, psiExit } = arcs

  const psi = normalizeAngle(direction === 1 ? angle + phaseShift : Math.PI - (angle + phaseShift))
  // Zurückgelegter Weg seit dem Austritt aus der Verdeckung — wächst monoton
  // von 0 (Austritt) bis 2π und macht jede Intervall-Fallunterscheidung obsolet.
  const travelled = normalizeAngle(psi - psiExit)

  const fg = PLANET_TAB_ORBIT_FOREGROUND_PROGRESS
  if (travelled < foregroundArc) return fg * (travelled / foregroundArc)
  return fg + (1 - fg) * ((travelled - foregroundArc) / behindArc)
}

/** Keyframe-Phase → Fortschritt durch die Verdeckung: 0 beim Eintauchen, 1 beim Austritt. */
export function eclipseProgressOfPhase(phase: number): number {
  const fg = PLANET_TAB_ORBIT_FOREGROUND_PROGRESS
  return Math.max(0, Math.min(1, (phase - fg) / (1 - fg)))
}

/** Auflösung der Periodenintegration — 0,5° je Schritt. */
const TIMING_STEPS = 720

export interface PlanetOrbitTiming {
  /** Dauer eines vollen Umlaufs in Millisekunden Spielzeit. */
  periodMs: number
  /** Davon hinter der Sonne verbracht. */
  behindMs: number
  /** Anteil der Umlaufzeit, in dem der Planet erreichbar ist (0 … 1). */
  inReachFrac: number
}

/**
 * Umlaufzeit einer Planetenbahn, numerisch integriert.
 *
 * Eine geschlossene Formel gibt es nicht: die Winkelgeschwindigkeit ist über die
 * Bahn nicht konstant, und ein Mittelwert wäre falsch — Zeit ist das harmonische,
 * nicht das arithmetische Mittel der Geschwindigkeit. Zwei Modulationen wirken,
 * beide exakt wie in `PlanetOrbit.vue`: der Kepler-Boost an den Apexen und der
 * fünffach durchlaufene verdeckte Bogen.
 *
 * `ORBIT_BEHIND_SPEED_LERP` bleibt bewusst draussen — der Speedup ist geweicht und
 * erreicht seinen Sollwert nie ganz, die reale Periode liegt darum wenige Prozent
 * unter der gerechneten.
 *
 * NIE in einer Frame-Schleife aufrufen: das Ergebnis hängt allein an Slot und
 * Level und ändert sich nur beim Attunement.
 */
export function planetOrbitTiming(
  baseSpeed: number,
  levelMult: number,
  direction: 1 | -1,
  ratio: number,
  tiltRad: number,
): PlanetOrbitTiming {
  const arcs = orbitArcs(ratio, tiltRad)
  const omegaBase = baseSpeed * levelMult
  if (!arcs || omegaBase <= 0) {
    const periodMs = omegaBase > 0 ? TWO_PI / omegaBase : 0
    return { periodMs, behindMs: 0, inReachFrac: 1 }
  }

  const step = TWO_PI / TIMING_STEPS
  let periodMs = 0
  let behindMs = 0

  for (let i = 0; i < TIMING_STEPS; i++) {
    const travelled = (i + 0.5) * step
    const psi = travelled + arcs.psiExit
    // Rückrechnung auf den echten Bahnwinkel; |dpsi| = |dangle| in beide Richtungen.
    const angle = direction === 1 ? psi - arcs.phaseShift : Math.PI - psi - arcs.phaseShift
    const kepler = 1 + PLANET_ORBIT_KEPLER_BOOST * (1 - Math.abs(Math.cos(angle)))
    const behind = travelled >= arcs.foregroundArc
    const omega = omegaBase * kepler * (behind ? BEHIND_SUN_SPEED_MULTIPLIER : 1)
    const dt = step / omega
    periodMs += dt
    if (behind) behindMs += dt
  }

  return { periodMs, behindMs, inReachFrac: (periodMs - behindMs) / periodMs }
}

/**
 * Die Slots in Bahnreihenfolge. Filter und Reihenfolge bestimmen, auf welchem
 * Tier ein Slot läuft — sie müssen exakt denen in `PlanetOrbit.vue` entsprechen,
 * darum stehen sie hier einmal statt in jedem Aufrufer.
 */
export function orbitOrderedSlots<T extends { purchased: boolean; role: unknown }>(
  slots: readonly T[],
): T[] {
  return slots.filter((s) => s.purchased && s.role !== null)
}
