// Der Universumssprung als reine Zustandsmaschine — „Through the Gate".
//
// Dasselbe Idiom wie galaxyWarp.ts: kein DOM, kein Store, keine Uhr. Die
// Schleife in useStarBackground tickt mit ihrem rAF-Delta, liest je Frame
// `state.out` und schaltet den Store auf den Flanken. Das Ausgabeobjekt wird
// in place beschrieben; die Phasengrenzen leiten sich aus der Gesamtzeit ab,
// jede Flanke feuert genau einmal, auch über ein einziges grosses Delta.
//
// Choreografie (Zeiten aus config/constants/fx.ts):
//   depart     0 … DEPART_MS            Schub, Fluchtpunkt fährt zum Kurs
//   approach   … + APPROACH_MS          das Tor wächst aus dem Fluchtpunkt
//   wash       = Beginn der Schwelle    DOM-Wash im Zielton
//   commit     = wash + WASH_PEAK·WASH  Reset unter dem Peak des Wash
//   threshold  … + THRESHOLD_MS         der Ring passiert die Kamera
//   emerge     … + EMERGE_MS            Ausrollen im neuen Universum
//   hudIn      = emerge + HUD_IN_DELAY  HUD kehrt zurück
//   done       → idle
import {
  UNIVERSE_HOP_APPROACH_MS,
  UNIVERSE_HOP_DEPART_MS,
  UNIVERSE_HOP_EMERGE_MS,
  UNIVERSE_HOP_FIELD_PASS_FADE,
  UNIVERSE_HOP_FOCUS_FRAC_MAX,
  UNIVERSE_HOP_FOCUS_FRAC_MIN,
  UNIVERSE_HOP_HUD_IN_DELAY_MS,
  UNIVERSE_HOP_MAW_ALPHA,
  UNIVERSE_HOP_PORTAL_PASS_K,
  UNIVERSE_HOP_PORTAL_R0_FRAC,
  UNIVERSE_HOP_PORTAL_SPIN_RAD_S,
  UNIVERSE_HOP_SPEED_DEPART,
  UNIVERSE_HOP_SPEED_PEAK,
  UNIVERSE_HOP_THRESHOLD_MS,
  UNIVERSE_HOP_WASH_MS,
  UNIVERSE_HOP_WASH_PEAK,
  WARP_COURSE_ARC_DEG,
  WARP_CRUISE_SHIMMER,
  WARP_CRUISE_SHIMMER_PERIOD_A_SEC,
  WARP_CRUISE_SHIMMER_PERIOD_B_SEC,
  WARP_TRAIL_FADE,
} from '@/config/constants'
import { easeInOutCubic, easeOutBack, easeOutCubic, type WarpFlightOut } from './galaxyWarp'

export type UniverseHopPhase = 'idle' | 'depart' | 'approach' | 'threshold' | 'emerge'

export interface UniverseHopOut extends WarpFlightOut {
  phase: UniverseHopPhase
  /** Ringradius des Tors in px; 0 = nicht gezeichnet. */
  portalR: number
  /** 0 … 1: Ring, Wirbel, Halo. */
  portalAlpha: number
  /** 0 … MAW_ALPHA: das Kehlenlicht im Schlund. */
  mawAlpha: number
  /** ≤ mawAlpha: das gebackene Zielfeld, blendet mit dem Passieren aus. */
  fieldAlpha: number
  /** Drehung des Wirbels in rad, kumuliert. */
  portalSpin: number
  /** Flanken — je genau einen Frame lang wahr. */
  wash: boolean
  commit: boolean
  hudIn: boolean
  done: boolean
}

export interface UniverseHopState {
  phase: UniverseHopPhase
  elapsedMs: number
  /** Kursziel als Anteil der kurzen Kante — bleibt bei Resize gültig. */
  courseFx: number
  courseFy: number
  washed: boolean
  committed: boolean
  hudShown: boolean
  out: UniverseHopOut
}

const DEPART_END_MS = UNIVERSE_HOP_DEPART_MS
const APPROACH_END_MS = DEPART_END_MS + UNIVERSE_HOP_APPROACH_MS
const THRESHOLD_END_MS = APPROACH_END_MS + UNIVERSE_HOP_THRESHOLD_MS
/** Gesamtdauer des Flugs; das Netz im Schleier rechnet damit. */
export const UNIVERSE_HOP_TOTAL_MS = THRESHOLD_END_MS + UNIVERSE_HOP_EMERGE_MS
export const UNIVERSE_HOP_WASH_AT_MS = APPROACH_END_MS
export const UNIVERSE_HOP_COMMIT_AT_MS =
  APPROACH_END_MS + Math.round(UNIVERSE_HOP_WASH_PEAK * UNIVERSE_HOP_WASH_MS)
export const UNIVERSE_HOP_HUD_IN_AT_MS = THRESHOLD_END_MS + UNIVERSE_HOP_HUD_IN_DELAY_MS
const DEG = Math.PI / 180
const PEAK_SPAN = UNIVERSE_HOP_SPEED_PEAK - 1

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function createUniverseHop(): UniverseHopState {
  return {
    phase: 'idle',
    elapsedMs: 0,
    courseFx: 0,
    courseFy: 0,
    washed: false,
    committed: false,
    hudShown: false,
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
      flightSec: 0,
      portalR: 0,
      portalAlpha: 0,
      mawAlpha: 0,
      fieldAlpha: 0,
      portalSpin: 0,
      wash: false,
      commit: false,
      hudIn: false,
      done: false,
    },
  }
}

/** Setzt in place zurück — `state.out` bleibt dasselbe Objekt (Leser halten es). */
export function resetUniverseHop(state: UniverseHopState): void {
  const fresh = createUniverseHop()
  Object.assign(state.out, fresh.out)
  fresh.out = state.out
  Object.assign(state, fresh)
}

/** Kurs setzen und den Flug beginnen — derselbe Bogen um „oben" wie der Warp, engerer Radius. */
export function startUniverseHop(state: UniverseHopState, rand: () => number): void {
  resetUniverseHop(state)
  const azimuth = (-90 - WARP_COURSE_ARC_DEG / 2 + rand() * WARP_COURSE_ARC_DEG) * DEG
  const radius =
    UNIVERSE_HOP_FOCUS_FRAC_MIN +
    rand() * (UNIVERSE_HOP_FOCUS_FRAC_MAX - UNIVERSE_HOP_FOCUS_FRAC_MIN)
  state.courseFx = Math.cos(azimuth) * radius
  state.courseFy = Math.sin(azimuth) * radius
  state.phase = 'depart'
  state.out.phase = 'depart'
}

function shimmerAt(elapsedMs: number): number {
  const sec = elapsedMs / 1000
  // Blendet über die erste halbe Sekunde des Anflugs ein — sonst stünde am
  // Ende des Schubs ein Knick im Tempo.
  const gain = clamp01((elapsedMs - DEPART_END_MS) / 500)
  return (
    1 +
    WARP_CRUISE_SHIMMER *
      gain *
      0.5 *
      (Math.sin((sec * Math.PI * 2) / WARP_CRUISE_SHIMMER_PERIOD_A_SEC) +
        Math.sin((sec * Math.PI * 2) / WARP_CRUISE_SHIMMER_PERIOD_B_SEC + 1.3))
  )
}

/**
 * Ein Frame. `minEdge` = kurze Kante des Canvas, `farCorner` = Abstand vom
 * Fluchtpunkt zur fernsten Ecke — der Ring muss darüber hinauswachsen, sonst
 * passiert er die Kamera nie.
 */
export function stepUniverseHop(
  state: UniverseHopState,
  dtMs: number,
  minEdge: number,
  farCorner: number,
): void {
  const o = state.out
  o.wash = false
  o.commit = false
  o.hudIn = false
  o.done = false
  if (state.phase === 'idle') return

  const dt = Math.max(0, dtMs)
  state.elapsedMs += dt
  const e = state.elapsedMs

  if (!state.washed && e >= UNIVERSE_HOP_WASH_AT_MS) {
    state.washed = true
    o.wash = true
  }
  if (!state.committed && e >= UNIVERSE_HOP_COMMIT_AT_MS) {
    state.committed = true
    o.commit = true
  }
  if (!state.hudShown && e >= UNIVERSE_HOP_HUD_IN_AT_MS) {
    state.hudShown = true
    o.hudIn = true
  }

  let phase: UniverseHopPhase
  if (e >= UNIVERSE_HOP_TOTAL_MS) phase = 'idle'
  else if (e >= THRESHOLD_END_MS) phase = 'emerge'
  else if (e >= APPROACH_END_MS) phase = 'threshold'
  else if (e >= DEPART_END_MS) phase = 'approach'
  else phase = 'depart'
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
    o.flightSec = 0
    o.portalR = 0
    o.portalAlpha = 0
    o.mawAlpha = 0
    o.fieldAlpha = 0
    o.done = true
    return
  }

  const fx = state.courseFx * minEdge
  const fy = state.courseFy * minEdge

  if (phase === 'depart') {
    const t = e / UNIVERSE_HOP_DEPART_MS
    const k = easeInOutCubic(clamp01(t / 0.6))
    o.speed = 1 + (UNIVERSE_HOP_SPEED_DEPART - 1) * t * t * t
    o.focusX = fx * k
    o.focusY = fy * k
    o.streakGain = clamp01(t * 2)
    o.trailFade = 1 - (1 - WARP_TRAIL_FADE) * easeOutCubic(t)
    o.tintGain = t
    o.headlight = t * clamp01((o.speed - 1) / PEAK_SPAN)
    o.ambientGain = clamp01(1 - t / 0.4)
    o.flightSec = e / 1000
    o.portalR = 0
    o.portalAlpha = 0
    o.mawAlpha = 0
    o.fieldAlpha = 0
  } else if (phase === 'approach') {
    const t = (e - DEPART_END_MS) / UNIVERSE_HOP_APPROACH_MS
    const envelope =
      UNIVERSE_HOP_SPEED_DEPART + (UNIVERSE_HOP_SPEED_PEAK - UNIVERSE_HOP_SPEED_DEPART) * easeOutCubic(t)
    o.speed = envelope * shimmerAt(e)
    o.focusX = fx
    o.focusY = fy
    o.streakGain = 1
    o.trailFade = WARP_TRAIL_FADE
    o.tintGain = 1
    o.ambientGain = 0
    o.flightSec = e / 1000
    // Echte Perspektive: ein Ring fester Grösse, dem man sich mit konstantem
    // Tempo nähert, wächst als Hyperbel — bei t = 1 steht er beim Passradius.
    const r0 = UNIVERSE_HOP_PORTAL_R0_FRAC * minEdge
    const rPass = UNIVERSE_HOP_PORTAL_PASS_K * farCorner
    const k = 1 - r0 / rPass
    o.portalR = r0 / (1 - k * t)
    o.portalAlpha = clamp01(t * 4)
    o.mawAlpha = UNIVERSE_HOP_MAW_ALPHA * clamp01((t - 0.1) / 0.5)
    o.fieldAlpha = o.mawAlpha * (1 - UNIVERSE_HOP_FIELD_PASS_FADE * clamp01(o.portalR / farCorner))
    // Der Schlund übernimmt das Licht vom Scheinwerfer.
    o.headlight = 1 - 0.7 * clamp01(o.portalR / farCorner)
    o.portalSpin += (UNIVERSE_HOP_PORTAL_SPIN_RAD_S * dt) / 1000
  } else if (phase === 'threshold') {
    const t = (e - APPROACH_END_MS) / UNIVERSE_HOP_THRESHOLD_MS
    o.speed = UNIVERSE_HOP_SPEED_PEAK * shimmerAt(e)
    o.focusX = fx
    o.focusY = fy
    o.streakGain = 1
    o.trailFade = WARP_TRAIL_FADE
    o.tintGain = 1
    o.ambientGain = 0
    o.flightSec = e / 1000
    o.portalR = UNIVERSE_HOP_PORTAL_PASS_K * farCorner * (1 + 0.3 * t)
    o.portalAlpha = 1 - t
    o.mawAlpha = UNIVERSE_HOP_MAW_ALPHA
    o.fieldAlpha = o.mawAlpha * (1 - UNIVERSE_HOP_FIELD_PASS_FADE)
    o.headlight = 0.3
    o.portalSpin += (UNIVERSE_HOP_PORTAL_SPIN_RAD_S * dt) / 1000
  } else {
    // emerge
    const t = (e - THRESHOLD_END_MS) / UNIVERSE_HOP_EMERGE_MS
    o.speed = 1 + PEAK_SPAN * Math.pow(1 - t, 3.5)
    const back = 1 - easeOutBack(t)
    o.focusX = fx * back
    o.focusY = fy * back
    o.streakGain = 1
    o.trailFade = 1 - (1 - WARP_TRAIL_FADE) * clamp01(1 - t / 0.5)
    o.tintGain = 1 - easeOutCubic(t)
    o.headlight = Math.pow(1 - t, 2)
    o.ambientGain = clamp01((t - 0.4) / 0.6)
    o.flightSec = THRESHOLD_END_MS / 1000
    o.portalR = 0
    o.portalAlpha = 0
    o.mawAlpha = 0
    o.fieldAlpha = 0
  }
}
