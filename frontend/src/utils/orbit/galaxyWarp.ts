// Der Galaxien-Warp als reine Zustandsmaschine — der Flug zur nächsten Galaxie
// nach ihrer Rettung.
//
// Kein DOM, kein Store, keine Uhr: die Schleife in useStarBackground tickt mit
// ihrem rAF-Delta und liest je Frame `state.out`. Das Ausgabeobjekt wird in
// place beschrieben (Muster wie `stepHelm`), damit hier nichts je Frame
// alloziert. Die Phasengrenzen leiten sich aus der Gesamtzeit ab, nicht aus
// Zählern — ein großes Delta (Tab-Rückkehr, 100-ms-Deckel) springt sauber über
// mehrere Grenzen, und `commit`/`done` feuern trotzdem genau einmal.
//
// Choreografie (Zeiten aus config/constants/progression.ts):
//   accel   0 … ACCEL_MS       Kurs und Schub setzen gemeinsam weich ein
//   cruise  … GALAXY_TRANS_WARP_MS   Reiseflug durch den Sterntunnel
//   commit  = GALAXY_TRANS_WARP_MS   Galaxiewechsel (Theme, Zähler), Blitz
//   decel   … + GALAXY_TRANS_DECEL_MS   Ausrollen, Fluchtpunkt kehrt zur Mitte
//   done    → idle
import {
  GALAXY_TRANS_DECEL_MS,
  GALAXY_TRANS_WARP_MS,
  GALAXY_WARP_ACCEL_MS,
  WARP_COURSE_ARC_DEG,
  WARP_CRUISE_SHIMMER,
  WARP_CRUISE_SHIMMER_PERIOD_A_SEC,
  WARP_CRUISE_SHIMMER_PERIOD_B_SEC,
  WARP_FOCUS_FRAC_MAX,
  WARP_FOCUS_FRAC_MIN,
  WARP_SPEED_PEAK,
  WARP_SURGE_FROM,
  WARP_SURGE_PEAK,
  WARP_TRAIL_FADE,
} from '@/config/constants'

export type GalaxyWarpPhase = 'idle' | 'accel' | 'cruise' | 'decel'

/** Was eine Flugmaschine der Sternschleife je Frame liefert — Warp und Universumssprung teilen die Leser. */
export interface WarpFlightOut {
  /** Strömungstempo als Vielfaches der Ruhe (1 … Spitze). */
  speed: number
  /** Versatz des Fluchtpunkts in px (Kursziel; im Decel zurück zur Mitte). */
  focusX: number
  focusY: number
  /** 0 … 1: Anteil der vollen Strichlänge. */
  streakGain: number
  /** Anteil des Vorbilds, der je Frame gelöscht wird; 1 = normales clearRect. */
  trailFade: number
  /** 0 … 1: Doppler-Tönung, Vignette. */
  tintGain: number
  /** 0 … 1: Aufhellung um den Fluchtpunkt. */
  headlight: number
  /** 0 … 1: Staub, Cluster, Flug-Linien — 0 im Flug, Rampe im Ausrollen. */
  ambientGain: number
  /**
   * 0 … 1: wie weit die Farbwelt der ZIELgalaxie schon übernommen hat. Sie fährt
   * in der zweiten Hälfte des Reiseflugs hoch und steht am Schnitt auf 1 — man
   * kommt nicht in einer neuen Farbe an, man fliegt in sie hinein. Derselbe Wert
   * trägt das Tempo-Crescendo: eine Bewegung, nicht zwei.
   *
   * Der Universumssprung lässt ihn auf 0 — er wechselt keine Galaxie.
   */
  themeMix: number
  /**
   * 0 … 1: wie weit die Bühne ihre Bahnen verlassen hat. 0 = Orbit wie immer,
   * 1 = volle Prozession. Fährt mit DEMSELBEN Easing wie Schub und Schwenk —
   * ein eigenes wäre ein zweiter Aufbruch im selben Bild.
   */
  procession: number
  /** Flugzeit in Sekunden (für die bestehenden Ausblend-Kurven der SVG-Ebenen). */
  flightSec: number
  /** 0 … 1: Deckkraft der Sterne im Flug — die Wormhole-Röhre dämpft sie, der Warp nicht. */
  starGain: number
}

export interface GalaxyWarpOut extends WarpFlightOut {
  phase: GalaxyWarpPhase
  /** Flanken — je genau einen Frame lang wahr. */
  commit: boolean
  done: boolean
}

export interface GalaxyWarpState {
  phase: GalaxyWarpPhase
  elapsedMs: number
  /** Kursziel als Anteil der kurzen Kante — bleibt bei Resize gültig. */
  courseFx: number
  courseFy: number
  committed: boolean
  out: GalaxyWarpOut
}

const FLIGHT_MS = GALAXY_TRANS_WARP_MS
const ACCEL_END_MS = GALAXY_WARP_ACCEL_MS
/** Beginn des Crescendos — ein Anteil der Reiseflugstrecke, nicht der Gesamtzeit. */
const SURGE_START_MS =
  GALAXY_WARP_ACCEL_MS + (GALAXY_TRANS_WARP_MS - GALAXY_WARP_ACCEL_MS) * WARP_SURGE_FROM
const TOTAL_MS = GALAXY_TRANS_WARP_MS + GALAXY_TRANS_DECEL_MS
const DEG = Math.PI / 180

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** Schwingt leicht über das Ziel hinaus und setzt sich — das „Anhalten". */
export function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function createGalaxyWarp(): GalaxyWarpState {
  return {
    phase: 'idle',
    elapsedMs: 0,
    courseFx: 0,
    courseFy: 0,
    committed: false,
    out: {
      phase: 'idle',
      speed: 1,
      focusX: 0,
      focusY: 0,
      streakGain: 0,
      trailFade: 1,
      tintGain: 0,
      headlight: 0,
      ambientGain: 1,
      themeMix: 0,
      procession: 0,
      flightSec: 0,
      starGain: 1,
      commit: false,
      done: false,
    },
  }
}

/** Setzt in place zurück — `state.out` bleibt dasselbe Objekt (Leser halten es). */
export function resetGalaxyWarp(state: GalaxyWarpState): void {
  const fresh = createGalaxyWarp()
  Object.assign(state.out, fresh.out)
  fresh.out = state.out
  Object.assign(state, fresh)
}

/**
 * Kurs setzen und den Flug beginnen. Der Azimut kommt aus dem Bogen um „oben"
 * (Bildschirm-y nach unten positiv): nie in die Bottom-Bar, nie hinter das HUD.
 */
export function randomGalaxyWarpCourse(
  rand: () => number,
): Pick<GalaxyWarpState, 'courseFx' | 'courseFy'> {
  const azimuth = (-90 - WARP_COURSE_ARC_DEG / 2 + rand() * WARP_COURSE_ARC_DEG) * DEG
  const radius = WARP_FOCUS_FRAC_MIN + rand() * (WARP_FOCUS_FRAC_MAX - WARP_FOCUS_FRAC_MIN)
  return {
    courseFx: Math.cos(azimuth) * radius,
    courseFy: Math.sin(azimuth) * radius,
  }
}

export function startGalaxyWarp(state: GalaxyWarpState, rand: () => number): void {
  resetGalaxyWarp(state)
  const course = randomGalaxyWarpCourse(rand)
  state.courseFx = course.courseFx
  state.courseFy = course.courseFy
  state.phase = 'accel'
  state.out.phase = 'accel'
}

/** Ein Frame. `minEdge` = kurze Kante des Canvas in px (für den Fokus-Versatz). */
export function stepGalaxyWarp(state: GalaxyWarpState, dtMs: number, minEdge: number): void {
  const o = state.out
  o.commit = false
  o.done = false
  if (state.phase === 'idle') return

  state.elapsedMs += Math.max(0, dtMs)
  const e = state.elapsedMs

  if (!state.committed && e >= FLIGHT_MS) {
    state.committed = true
    o.commit = true
  }

  let phase: GalaxyWarpPhase
  if (e >= TOTAL_MS) phase = 'idle'
  else if (e >= FLIGHT_MS) phase = 'decel'
  else if (e >= ACCEL_END_MS) phase = 'cruise'
  else phase = 'accel'
  state.phase = phase
  o.phase = phase

  if (phase === 'idle') {
    o.speed = 1
    o.focusX = 0
    o.focusY = 0
    o.streakGain = 0
    o.trailFade = 1
    o.tintGain = 0
    o.headlight = 0
    o.ambientGain = 1
    o.themeMix = 0
    o.procession = 0
    o.flightSec = 0
    o.done = true
    return
  }

  const fx = state.courseFx * minEdge
  const fy = state.courseFy * minEdge
  const peakSpan = WARP_SPEED_PEAK - 1
  // Das Ausrollen setzt dort an, wo das Crescendo endete — nicht beim
  // Anlauf-Höchsttempo. Mit `peakSpan` fiele das Tempo im Frame des Schnitts um
  // ein Viertel ab, während die Persistenz-Spur noch drei Frames lang die
  // längeren Striche danebenzeigt: ein Ruck, kein Schnitt. Der Blitz deckt ihn
  // nicht, er beginnt bei Deckkraft 0 und steht erst vier Frames später.
  const surgeSpan = WARP_SURGE_PEAK - 1

  if (phase === 'accel') {
    const t = e / GALAXY_WARP_ACCEL_MS
    const k = easeInOutCubic(t)
    o.speed = 1 + peakSpan * k
    o.focusX = fx * k
    o.focusY = fy * k
    o.streakGain = clamp01(t * 2)
    o.trailFade = 1 - (1 - WARP_TRAIL_FADE) * easeOutCubic(t)
    o.tintGain = t
    o.headlight = t * clamp01((o.speed - 1) / peakSpan)
    o.ambientGain = clamp01(1 - t / 0.4)
    o.themeMix = 0
    o.procession = k
    o.flightSec = e / 1000
  } else if (phase === 'cruise') {
    const sec = e / 1000
    // Das Atmen blendet über die erste halbe Sekunde ein — sonst stünde am
    // Ende des Schubs ein Knick im Tempo.
    const shimmerGain = clamp01((e - ACCEL_END_MS) / 500)
    const shimmer =
      1 +
      WARP_CRUISE_SHIMMER *
        shimmerGain *
        0.5 *
        (Math.sin((sec * Math.PI * 2) / WARP_CRUISE_SHIMMER_PERIOD_A_SEC) +
          Math.sin((sec * Math.PI * 2) / WARP_CRUISE_SHIMMER_PERIOD_B_SEC + 1.3))
    // Das Crescendo: ab SURGE_FROM der Reiseflugstrecke ziehen Schub und
    // Farbe gemeinsam an und stehen am Schnitt beide auf ihrem Gipfel.
    const surge = easeInOutCubic(clamp01((e - SURGE_START_MS) / (FLIGHT_MS - SURGE_START_MS)))
    o.speed = (WARP_SPEED_PEAK + (WARP_SURGE_PEAK - WARP_SPEED_PEAK) * surge) * shimmer
    o.focusX = fx
    o.focusY = fy
    o.streakGain = 1
    o.trailFade = WARP_TRAIL_FADE
    o.tintGain = 1
    o.headlight = 1
    o.ambientGain = 0
    o.themeMix = surge
    o.procession = 1
    o.flightSec = sec
  } else {
    // decel
    const t = (e - FLIGHT_MS) / GALAXY_TRANS_DECEL_MS
    o.speed = 1 + surgeSpan * Math.pow(1 - t, 3.5)
    const back = 1 - easeOutBack(t)
    o.focusX = fx * back
    o.focusY = fy * back
    o.streakGain = 1
    o.trailFade = 1 - (1 - WARP_TRAIL_FADE) * clamp01(1 - t / 0.5)
    o.tintGain = 1 - easeOutCubic(t)
    o.headlight = Math.pow(1 - t, 2)
    o.ambientGain = clamp01((t - 0.4) / 0.6)
    // Die neue Welt ist da und bleibt — im Ausrollen wird nicht zurückgeblendet.
    o.themeMix = 1
    // Bewusst NICHT die back-Kurve des Fluchtpunkts: die schwingt über ihr
    // Ziel hinaus, und ein Körper, der an seiner Bahn vorbeischießt und
    // zurückrutscht, liest sich als Fehler.
    o.procession = 1 - easeOutCubic(t)
    o.flightSec = FLIGHT_MS / 1000
  }
}

/**
 * Zeichen-Alpha für ein Element, das JEDEN Frame neu über einer Persistenz-
 * Spur liegt: unter `destination-out` mit Löschanteil `erase` konvergiert die
 * sichtbare Deckkraft nicht auf den gezeichneten Wert, sondern auf
 * g / (erase + g − erase·g). Hier die Umkehrung — gewünschter Sichtwert rein,
 * Zeichenwert raus.
 */
export function persistentDrawAlpha(visible: number, erase: number): number {
  if (erase >= 1) return visible
  const denom = 1 - visible + visible * erase
  return denom <= 0 ? visible : (visible * erase) / denom
}

/**
 * Dasselbe für eine ADDITIVE Fläche (`lighter`) über der Persistenz-Spur — und
 * das ist eine ANDERE Formel, kein Sonderfall der obigen.
 *
 * Unter `source-over` konvergiert die Deckkraft gegen 1 und die Umkehrung ist
 * ein Bruch; additiv summiert sich linear: `D = g + (1 − erase)·D`, stationär
 * also `D = g / erase`. Die Umkehrung ist damit eine Multiplikation.
 * `persistentDrawAlpha` liefert hier durchweg zu viel — bei 0,3 über einer Spur
 * von 0,35 sind es 0,112 statt 0,105.
 */
export function additiveDrawAlpha(visible: number, erase: number): number {
  return erase >= 1 ? visible : visible * erase
}
