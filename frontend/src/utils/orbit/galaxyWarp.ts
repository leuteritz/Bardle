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
//   course  0 … COURSE_MS      Nase dreht zum Kursziel, Fluchtpunkt fährt hin
//   accel   … + ACCEL_MS       kubischer Schub auf WARP_SPEED_PEAK
//   cruise  … GALAXY_TRANS_WARP_MS   Reiseflug, Zielgalaxie wächst voraus
//   commit  = GALAXY_TRANS_WARP_MS   Galaxiewechsel (Theme, Zähler), Blitz
//   decel   … + GALAXY_TRANS_DECEL_MS   Ausrollen, Fluchtpunkt kehrt zur Mitte
//   done    → idle
import {
  GALAXY_TRANS_DECEL_MS,
  GALAXY_TRANS_WARP_MS,
  GALAXY_WARP_ACCEL_MS,
  GALAXY_WARP_COURSE_MS,
  GALAXY_WARP_DEST_LEAD_MS,
  WARP_COURSE_ARC_DEG,
  WARP_COURSE_SPEED_END,
  WARP_CRUISE_SHIMMER,
  WARP_CRUISE_SHIMMER_PERIOD_A_SEC,
  WARP_CRUISE_SHIMMER_PERIOD_B_SEC,
  WARP_FOCUS_FRAC_MAX,
  WARP_FOCUS_FRAC_MIN,
  WARP_SPEED_PEAK,
  WARP_TRAIL_FADE,
} from '@/config/constants'

export type GalaxyWarpPhase = 'idle' | 'course' | 'accel' | 'cruise' | 'decel'

export interface GalaxyWarpOut {
  phase: GalaxyWarpPhase
  /** Strömungstempo als Vielfaches der Ruhe (1 … WARP_SPEED_PEAK). */
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
  /** Zielgalaxie am Fluchtpunkt (nur nach `destSpawn` gültig). */
  destGalaxyScale: number
  destGalaxyAlpha: number
  /** Flugzeit in Sekunden (für die bestehenden Ausblend-Kurven der SVG-Ebenen). */
  flightSec: number
  /** Flanken — je genau einen Frame lang wahr. */
  commit: boolean
  destSpawn: boolean
  done: boolean
}

export interface GalaxyWarpState {
  phase: GalaxyWarpPhase
  elapsedMs: number
  /** Kursziel als Anteil der kurzen Kante — bleibt bei Resize gültig. */
  courseFx: number
  courseFy: number
  committed: boolean
  destSpawned: boolean
  out: GalaxyWarpOut
}

const FLIGHT_MS = GALAXY_TRANS_WARP_MS
const ACCEL_END_MS = GALAXY_WARP_COURSE_MS + GALAXY_WARP_ACCEL_MS
const TOTAL_MS = GALAXY_TRANS_WARP_MS + GALAXY_TRANS_DECEL_MS
const DEST_SPAWN_MS = GALAXY_TRANS_WARP_MS - GALAXY_WARP_DEST_LEAD_MS
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
    destSpawned: false,
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
      destGalaxyScale: 0,
      destGalaxyAlpha: 0,
      flightSec: 0,
      commit: false,
      destSpawn: false,
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
export function startGalaxyWarp(state: GalaxyWarpState, rand: () => number): void {
  resetGalaxyWarp(state)
  const azimuth = (-90 - WARP_COURSE_ARC_DEG / 2 + rand() * WARP_COURSE_ARC_DEG) * DEG
  const radius = WARP_FOCUS_FRAC_MIN + rand() * (WARP_FOCUS_FRAC_MAX - WARP_FOCUS_FRAC_MIN)
  state.courseFx = Math.cos(azimuth) * radius
  state.courseFy = Math.sin(azimuth) * radius
  state.phase = 'course'
  state.out.phase = 'course'
}

/** Ein Frame. `minEdge` = kurze Kante des Canvas in px (für den Fokus-Versatz). */
export function stepGalaxyWarp(state: GalaxyWarpState, dtMs: number, minEdge: number): void {
  const o = state.out
  o.commit = false
  o.destSpawn = false
  o.done = false
  if (state.phase === 'idle') return

  state.elapsedMs += Math.max(0, dtMs)
  const e = state.elapsedMs

  if (!state.destSpawned && e >= DEST_SPAWN_MS) {
    state.destSpawned = true
    o.destSpawn = true
  }
  if (!state.committed && e >= FLIGHT_MS) {
    state.committed = true
    o.commit = true
  }

  let phase: GalaxyWarpPhase
  if (e >= TOTAL_MS) phase = 'idle'
  else if (e >= FLIGHT_MS) phase = 'decel'
  else if (e >= ACCEL_END_MS) phase = 'cruise'
  else if (e >= GALAXY_WARP_COURSE_MS) phase = 'accel'
  else phase = 'course'
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
    o.destGalaxyScale = 0
    o.destGalaxyAlpha = 0
    o.flightSec = 0
    o.done = true
    return
  }

  const fx = state.courseFx * minEdge
  const fy = state.courseFy * minEdge
  const peakSpan = WARP_SPEED_PEAK - 1

  if (phase === 'course') {
    const t = e / GALAXY_WARP_COURSE_MS
    const k = easeInOutCubic(t)
    o.speed = 1 + (WARP_COURSE_SPEED_END - 1) * k
    o.focusX = fx * k
    o.focusY = fy * k
    o.streakGain = 0
    o.trailFade = 1
    o.tintGain = 0
    o.headlight = 0
    o.ambientGain = 1
    o.flightSec = e / 1000
  } else if (phase === 'accel') {
    const t = (e - GALAXY_WARP_COURSE_MS) / GALAXY_WARP_ACCEL_MS
    o.speed = WARP_COURSE_SPEED_END + (WARP_SPEED_PEAK - WARP_COURSE_SPEED_END) * t * t * t
    o.focusX = fx
    o.focusY = fy
    o.streakGain = clamp01(t * 2)
    o.trailFade = 1 - (1 - WARP_TRAIL_FADE) * easeOutCubic(t)
    o.tintGain = t
    o.headlight = t * clamp01((o.speed - 1) / peakSpan)
    o.ambientGain = clamp01(1 - t / 0.4)
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
    o.speed = WARP_SPEED_PEAK * shimmer
    o.focusX = fx
    o.focusY = fy
    o.streakGain = 1
    o.trailFade = WARP_TRAIL_FADE
    o.tintGain = 1
    o.headlight = 1
    o.ambientGain = 0
    o.flightSec = sec
  } else {
    // decel
    const t = (e - FLIGHT_MS) / GALAXY_TRANS_DECEL_MS
    o.speed = 1 + peakSpan * Math.pow(1 - t, 3.5)
    const back = 1 - easeOutBack(t)
    o.focusX = fx * back
    o.focusY = fy * back
    o.streakGain = 1
    o.trailFade = 1 - (1 - WARP_TRAIL_FADE) * clamp01(1 - t / 0.5)
    o.tintGain = 1 - easeOutCubic(t)
    o.headlight = Math.pow(1 - t, 2)
    o.ambientGain = clamp01((t - 0.4) / 0.6)
    o.flightSec = FLIGHT_MS / 1000
  }

  // Zielgalaxie: wächst voraus heran, im Ausrollen füllt sie das Bild und
  // löst sich auf — wir sind angekommen, wir sind IN ihr.
  if (!state.destSpawned) {
    o.destGalaxyScale = 0
    o.destGalaxyAlpha = 0
  } else if (e < FLIGHT_MS) {
    const t = clamp01((e - DEST_SPAWN_MS) / GALAXY_WARP_DEST_LEAD_MS)
    o.destGalaxyScale = 0.05 + 0.45 * t * t
    o.destGalaxyAlpha = 0.85 * clamp01(t * 2)
  } else {
    const t = clamp01((e - FLIGHT_MS) / GALAXY_TRANS_DECEL_MS)
    o.destGalaxyScale = 0.5 + 2.0 * easeOutCubic(t)
    o.destGalaxyAlpha = 0.85 * (1 - t * t)
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
