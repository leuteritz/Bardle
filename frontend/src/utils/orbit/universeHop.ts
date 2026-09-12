// Der Universumssprung als reine Zustandsmaschine — „Through the Gate".
//
// Dasselbe Idiom wie galaxyWarp.ts: kein DOM, kein Store, keine Uhr. Die
// Schleife in useStarBackground tickt mit ihrem rAF-Delta, liest je Frame
// `state.out` und schaltet den Store auf den Flanken. Das Ausgabeobjekt wird
// in place beschrieben; die Phasengrenzen leiten sich aus der Gesamtzeit ab,
// jede Flanke feuert genau einmal, auch über ein einziges grosses Delta.
//
// Choreografie (Zeiten aus config/constants/fx.ts):
//   depart     0 … DEPART_MS             weicher Schub auf Überlicht, Fokus zum Startkurs
//   approach   … + APPROACH_MS           der Kurs KURVT (Bank), das Tor wächst
//   passage    … + PASSAGE_MS            Wormhole in S-Kurven: Wegpunkte je LEG, Roll legt sich in die Kurve
//   wash       = Ausgang − WASH_PEAK·WASH  DOM-Wash im Zielton
//   commit     = Ausgang                 Reset unter dem Peak des Wash
//   emerge     … + EMERGE_MS             Ausrollen im neuen Universum
//   hudIn      = emerge + HUD_IN_DELAY   HUD kehrt zurück
//   done       → idle
import {
  UNIVERSE_HOP_APPROACH_MS,
  UNIVERSE_HOP_COURSE_ARC_DEG,
  UNIVERSE_HOP_COURSE_BANK_MAX_DEG,
  UNIVERSE_HOP_COURSE_BANK_MIN_DEG,
  UNIVERSE_HOP_DEPART_MS,
  UNIVERSE_HOP_EMERGE_MS,
  UNIVERSE_HOP_EXIT_GROWTH_POW,
  UNIVERSE_HOP_EXIT_REVEAL_END,
  UNIVERSE_HOP_EXIT_REVEAL_T,
  UNIVERSE_HOP_EXIT_STRAIGHTEN,
  UNIVERSE_HOP_EXIT_R0_FRAC,
  UNIVERSE_HOP_EXIT_R1_FRAC,
  UNIVERSE_HOP_FIELD_PASS_FADE,
  UNIVERSE_HOP_FOCUS_FRAC_MAX,
  UNIVERSE_HOP_FOCUS_FRAC_MIN,
  UNIVERSE_HOP_HUD_IN_DELAY_MS,
  UNIVERSE_HOP_MAW_ALPHA,
  UNIVERSE_HOP_PASSAGE_MS,
  UNIVERSE_HOP_PORTAL_GROWTH_POW,
  UNIVERSE_HOP_PORTAL_PASS_K,
  UNIVERSE_HOP_PORTAL_R0_FRAC,
  UNIVERSE_HOP_PORTAL_SPIN_APPROACH_GAIN,
  UNIVERSE_HOP_PORTAL_SPIN_RAD_S,
  UNIVERSE_HOP_SPEED_PEAK,
  UNIVERSE_HOP_TUNNEL_BEND_MAX_DEG,
  UNIVERSE_HOP_TUNNEL_BEND_MIN_DEG,
  UNIVERSE_HOP_TUNNEL_FOCUS_FRAC_MAX,
  UNIVERSE_HOP_TUNNEL_FOCUS_FRAC_MIN,
  UNIVERSE_HOP_TUNNEL_HEADLIGHT_EXIT,
  UNIVERSE_HOP_TUNNEL_LEG_MS,
  UNIVERSE_HOP_TUNNEL_MAW_DROP,
  UNIVERSE_HOP_TUNNEL_ROLL_RAD_S,
  UNIVERSE_HOP_TUNNEL_STAR_GAIN,
  UNIVERSE_HOP_TUNNEL_STREAK_GAIN,
  UNIVERSE_HOP_TRAVEL_LEAD,
  UNIVERSE_HOP_TUNNEL_TRAIL_FADE,
  UNIVERSE_HOP_WALL_ALPHA,
  UNIVERSE_HOP_WASH_MS,
  UNIVERSE_HOP_WASH_PEAK,
  WARP_CRUISE_SHIMMER,
  WARP_CRUISE_SHIMMER_PERIOD_A_SEC,
  WARP_CRUISE_SHIMMER_PERIOD_B_SEC,
  WARP_TRAIL_FADE,
} from '@/config/constants'
import { easeInOutCubic, easeOutBack, easeOutCubic, type WarpFlightOut } from './galaxyWarp'

export type UniverseHopPhase = 'idle' | 'depart' | 'approach' | 'passage' | 'emerge'

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
  /** Die Wirbelarme als Tunnelwände — nur in der Tunnelreise. */
  wallAlpha: number
  /** Drehung des Wirbels in rad, kumuliert. */
  portalSpin: number
  /** 0 … 1: Fortschritt im Ringtunnel, sonst 0. */
  tunnelT: number
  /** Sekunden seit Tunnelbeginn — die Echo-Ringe laufen im festen Takt. */
  tunnelSec: number
  /** Roll des Sternfelds um den Fluchtpunkt in rad/s, nur im Tunnel; legt sich in jede Kurve. */
  roll: number
  /** ∫ roll·dt in rad — die Verdrillung der Stränge; ausserhalb des Tunnels 0. */
  twist: number
  /** Radius des Ausgangslichts in px, wächst über die Passage; sonst 0. */
  exitR: number
  /** 0 … 1: die Röhre blendet am Tunnelbeginn ein. */
  exitAlpha: number
  /** 0 … 1: das Ausgangslicht — erst ab EXIT_REVEAL_T, das Ende zeigt sich am Ende. */
  exitLight: number
  /** 0 … 1: wie weit die Gruppe (Sonne + Prozession) auf dem Anker der Röhrenachse reitet. */
  groupLead: number
  /** Kurvenpunkt in px gegen die Bildmitte: dorthin biegt sich die Röhre voraus; der Fokus ist nur ein Anteil davon. */
  bendX: number
  bendY: number
  /** Flanken — je genau einen Frame lang wahr. */
  wash: boolean
  commit: boolean
  hudIn: boolean
  done: boolean
}

export interface UniverseHopState {
  phase: UniverseHopPhase
  elapsedMs: number
  /** Kurs als Azimut (rad) und Radius (Anteil der kurzen Kante): Start A, Ende B der Kurve. */
  courseAz0: number
  courseR0: number
  courseAz1: number
  courseR1: number
  /** Wegpunkte der Tunnelreise, Punkt 0 = B; Azimut alterniert im Vorzeichen (S-Kurven). */
  tunnelAz: number[]
  tunnelR: number[]
  rollSign: number
  washed: boolean
  committed: boolean
  hudShown: boolean
  out: UniverseHopOut
}

const DEPART_END_MS = UNIVERSE_HOP_DEPART_MS
const APPROACH_END_MS = DEPART_END_MS + UNIVERSE_HOP_APPROACH_MS
const PASSAGE_END_MS = APPROACH_END_MS + UNIVERSE_HOP_PASSAGE_MS
/** Gesamtdauer des Flugs; das Netz im Schleier rechnet damit. */
export const UNIVERSE_HOP_TOTAL_MS = PASSAGE_END_MS + UNIVERSE_HOP_EMERGE_MS
/** Der Wash beginnt so, dass sein Peak GENAU am Tunnelausgang liegt. */
export const UNIVERSE_HOP_WASH_AT_MS =
  PASSAGE_END_MS - Math.round(UNIVERSE_HOP_WASH_PEAK * UNIVERSE_HOP_WASH_MS)
export const UNIVERSE_HOP_COMMIT_AT_MS = PASSAGE_END_MS
export const UNIVERSE_HOP_HUD_IN_AT_MS = PASSAGE_END_MS + UNIVERSE_HOP_HUD_IN_DELAY_MS
const DEG = Math.PI / 180
const PEAK_SPAN = UNIVERSE_HOP_SPEED_PEAK - 1
/** Zahl der Kurven im Tunnel — mindestens zwei, sonst wechselt der Roll nie das Vorzeichen. */
export const UNIVERSE_HOP_TUNNEL_LEGS = Math.max(
  2,
  Math.round(UNIVERSE_HOP_PASSAGE_MS / UNIVERSE_HOP_TUNNEL_LEG_MS),
)
/** Spitze der Ableitung von easeInOutCubic (bei 0,5) — normiert den Roll auf ROLL_RAD_S. */
const EASE_DERIV_PEAK = 3

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function easeInOutCubicDeriv(t: number): number {
  return t < 0.5 ? 12 * t * t : 3 * (2 - 2 * t) * (2 - 2 * t)
}

export function createUniverseHop(): UniverseHopState {
  return {
    phase: 'idle',
    elapsedMs: 0,
    courseAz0: 0,
    courseR0: 0,
    courseAz1: 0,
    courseR1: 0,
    tunnelAz: [],
    tunnelR: [],
    rollSign: 1,
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
      // Der Sprung wechselt das Universum, nicht die Galaxie — die Farbwelt
      // der Galaxie bleibt hier unberührt.
      themeMix: 0,
      procession: 0,
      flightSec: 0,
      starGain: 1,
      portalR: 0,
      portalAlpha: 0,
      mawAlpha: 0,
      fieldAlpha: 0,
      wallAlpha: 0,
      portalSpin: 0,
      tunnelT: 0,
      tunnelSec: 0,
      roll: 0,
      twist: 0,
      exitR: 0,
      exitAlpha: 0,
      exitLight: 0,
      groupLead: 0,
      bendX: 0,
      bendY: 0,
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

/**
 * Kurs würfeln und den Flug beginnen. Volle 360° und ein zweiter Azimut um
 * BANK Grad versetzt: der Anflug ist eine KURVE, und jeder Sprung sieht anders
 * aus. Auch das Roll-Vorzeichen des Tunnels kommt von hier.
 */
export function startUniverseHop(state: UniverseHopState, rand: () => number): void {
  resetUniverseHop(state)
  const span = UNIVERSE_HOP_FOCUS_FRAC_MAX - UNIVERSE_HOP_FOCUS_FRAC_MIN
  state.courseAz0 = rand() * UNIVERSE_HOP_COURSE_ARC_DEG * DEG
  state.courseR0 = UNIVERSE_HOP_FOCUS_FRAC_MIN + rand() * span
  const bank =
    (UNIVERSE_HOP_COURSE_BANK_MIN_DEG +
      rand() * (UNIVERSE_HOP_COURSE_BANK_MAX_DEG - UNIVERSE_HOP_COURSE_BANK_MIN_DEG)) *
    DEG
  const bankSign = rand() < 0.5 ? -1 : 1
  state.courseAz1 = state.courseAz0 + bankSign * bank
  state.courseR1 = UNIVERSE_HOP_FOCUS_FRAC_MIN + rand() * span
  state.rollSign = rand() < 0.5 ? -1 : 1
  // Der Tunnel: ab B alternierende Kurven im selben Radiusband — die Prozession
  // bleibt so immer im Bild. Die erste Kurve dreht in Roll-Richtung.
  const bendSpan = UNIVERSE_HOP_TUNNEL_BEND_MAX_DEG - UNIVERSE_HOP_TUNNEL_BEND_MIN_DEG
  const tunnelSpan = UNIVERSE_HOP_TUNNEL_FOCUS_FRAC_MAX - UNIVERSE_HOP_TUNNEL_FOCUS_FRAC_MIN
  state.tunnelAz = [state.courseAz1]
  state.tunnelR = [state.courseR1]
  let sign = state.rollSign
  for (let i = 0; i < UNIVERSE_HOP_TUNNEL_LEGS; i++) {
    const bend = (UNIVERSE_HOP_TUNNEL_BEND_MIN_DEG + rand() * bendSpan) * DEG
    state.tunnelAz.push(state.tunnelAz[i]! + sign * bend)
    state.tunnelR.push(UNIVERSE_HOP_TUNNEL_FOCUS_FRAC_MIN + rand() * tunnelSpan)
    sign = -sign
  }
  state.phase = 'depart'
  state.out.phase = 'depart'
}

/** Fokus auf der Kurve A → B (0 … 1), in px der kurzen Kante. */
export function universeHopFocusAt(
  state: UniverseHopState,
  t: number,
  minEdge: number,
): [number, number] {
  const k = easeInOutCubic(clamp01(t))
  const az = state.courseAz0 + (state.courseAz1 - state.courseAz0) * k
  const r = (state.courseR0 + (state.courseR1 - state.courseR0) * k) * minEdge
  return [Math.cos(az) * r, Math.sin(az) * r]
}

/** Kurve i und lokaler Anteil u der Tunnelreise (t 0 … 1). */
function tunnelLeg(state: UniverseHopState, t: number): [number, number] {
  const legs = state.tunnelAz.length - 1
  const s = clamp01(t) * legs
  const i = Math.min(legs - 1, Math.floor(s))
  return [i, s - i]
}

/** Fokus auf der Tunnelreise (0 … 1): startet bei B, je Kurve dasselbe Easing wie der Anflug. */
export function universeHopTunnelFocusAt(
  state: UniverseHopState,
  t: number,
  minEdge: number,
): [number, number] {
  if (state.tunnelAz.length < 2) return universeHopFocusAt(state, 1, minEdge)
  const [i, u] = tunnelLeg(state, t)
  const k = easeInOutCubic(u)
  const az = state.tunnelAz[i]! + (state.tunnelAz[i + 1]! - state.tunnelAz[i]!) * k
  const r = (state.tunnelR[i]! + (state.tunnelR[i + 1]! - state.tunnelR[i]!) * k) * minEdge
  return [Math.cos(az) * r, Math.sin(az) * r]
}

/** Roll-Rate in rad/s: das Vorzeichen der Kurve, die Stärke ihre Winkelgeschwindigkeit. */
function tunnelRollAt(state: UniverseHopState, t: number): number {
  if (state.tunnelAz.length < 2) return 0
  const [i, u] = tunnelLeg(state, t)
  const dir = Math.sign(state.tunnelAz[i + 1]! - state.tunnelAz[i]!)
  return (
    dir *
    UNIVERSE_HOP_TUNNEL_ROLL_RAD_S *
    (easeInOutCubicDeriv(u) / EASE_DERIV_PEAK) *
    rollEnvelope(t)
  )
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

/** Ein- und Ausblenden über je ein Viertel — der Roll setzt weich an und ab. */
function rollEnvelope(t: number): number {
  return clamp01(t / 0.25) * clamp01((1 - t) / 0.25)
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
  else if (e >= PASSAGE_END_MS) phase = 'emerge'
  else if (e >= APPROACH_END_MS) phase = 'passage'
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
    o.themeMix = 0
    o.procession = 0
    o.flightSec = 0
    o.starGain = 1
    o.portalR = 0
    o.portalAlpha = 0
    o.mawAlpha = 0
    o.fieldAlpha = 0
    o.wallAlpha = 0
    o.tunnelT = 0
    o.tunnelSec = 0
    o.roll = 0
    o.twist = 0
    o.exitR = 0
    o.exitAlpha = 0
    o.exitLight = 0
    o.groupLead = 0
    o.bendX = 0
    o.bendY = 0
    o.done = true
    return
  }

  const rPass = UNIVERSE_HOP_PORTAL_PASS_K * farCorner

  if (phase === 'depart') {
    // EIN Easing für Schub, Schwenk, Spur und Tönung — nichts knickt, nichts
    // springt: ein Ruck oder ein Sprung des Fluchtpunkts im ersten sichtbaren
    // Moment las sich als Kamerawechsel.
    const t = e / UNIVERSE_HOP_DEPART_MS
    const k = easeInOutCubic(t)
    const [fx, fy] = universeHopFocusAt(state, 0, minEdge)
    o.speed = 1 + PEAK_SPAN * k
    o.focusX = fx * k
    o.focusY = fy * k
    o.streakGain = k
    o.trailFade = 1 - (1 - WARP_TRAIL_FADE) * k
    o.tintGain = k
    o.headlight = k * k
    o.ambientGain = 1 - k
    o.themeMix = 0
    o.procession = k
    o.flightSec = e / 1000
    o.starGain = 1
    o.portalR = 0
    o.portalAlpha = 0
    o.mawAlpha = 0
    o.fieldAlpha = 0
    o.wallAlpha = 0
    o.tunnelT = 0
    o.tunnelSec = 0
    o.roll = 0
    o.twist = 0
    o.exitR = 0
    o.exitAlpha = 0
    o.exitLight = 0
    o.groupLead = 0
    o.bendX = 0
    o.bendY = 0
  } else if (phase === 'approach') {
    const t = (e - DEPART_END_MS) / UNIVERSE_HOP_APPROACH_MS
    const [fx, fy] = universeHopFocusAt(state, t, minEdge)
    o.speed = UNIVERSE_HOP_SPEED_PEAK * shimmerAt(e)
    o.focusX = fx
    o.focusY = fy
    o.streakGain = 1
    o.trailFade = WARP_TRAIL_FADE
    o.tintGain = 1
    o.ambientGain = 0
    o.themeMix = 0
    o.procession = 1
    o.flightSec = e / 1000
    o.starGain = 1
    const r0 = UNIVERSE_HOP_PORTAL_R0_FRAC * minEdge
    o.portalR = r0 + (rPass - r0) * Math.pow(t, UNIVERSE_HOP_PORTAL_GROWTH_POW)
    o.portalAlpha = clamp01(t * 4)
    o.mawAlpha = UNIVERSE_HOP_MAW_ALPHA * clamp01((t - 0.1) / 0.5)
    o.fieldAlpha = o.mawAlpha * (1 - UNIVERSE_HOP_FIELD_PASS_FADE * clamp01(o.portalR / farCorner))
    o.wallAlpha = 0
    // Der Schlund übernimmt das Licht vom Scheinwerfer.
    o.headlight = 1 - 0.7 * clamp01(o.portalR / farCorner)
    o.portalSpin +=
      (UNIVERSE_HOP_PORTAL_SPIN_RAD_S * (1 + UNIVERSE_HOP_PORTAL_SPIN_APPROACH_GAIN * t) * dt) /
      1000
    o.tunnelT = 0
    o.tunnelSec = 0
    o.roll = 0
    o.twist = 0
    o.exitR = 0
    o.exitAlpha = 0
    o.exitLight = 0
    o.groupLead = 0
    o.bendX = 0
    o.bendY = 0
  } else if (phase === 'passage') {
    const t = (e - APPROACH_END_MS) / UNIVERSE_HOP_PASSAGE_MS
    const [kx, ky] = universeHopTunnelFocusAt(state, t, minEdge)
    o.speed = UNIVERSE_HOP_SPEED_PEAK * shimmerAt(e)
    // Die Röhre blendet über die ersten 15 % ein; Striche und Kehlenlicht
    // treten im selben Takt zurück.
    const tube = clamp01(t / 0.15)
    // Das Ende zeigt sich erst am Ende: Licht und Wachstum ab dem Reveal.
    const reveal = clamp01(
      (t - UNIVERSE_HOP_EXIT_REVEAL_T) / (UNIVERSE_HOP_EXIT_REVEAL_END - UNIVERSE_HOP_EXIT_REVEAL_T),
    )
    o.exitLight = easeInOutCubic(reveal)
    // Kurvenpunkt und Fokus sind getrennt: die Röhre biegt sich zum Kurvenpunkt
    // voraus, der Fokus (Kamera hinter dem Spieler) folgt ihm nur zu einem
    // kleinen Anteil — wie der Helm im Orbit. Der Anteil fährt aus B (Anflug)
    // mit der Einblendung herunter; am Reveal richtet sich die Röhre auf.
    const bendGain = 1 - UNIVERSE_HOP_EXIT_STRAIGHTEN * o.exitLight
    o.bendX = kx * bendGain
    o.bendY = ky * bendGain
    const lead = UNIVERSE_HOP_TRAVEL_LEAD + (1 - UNIVERSE_HOP_TRAVEL_LEAD) * (1 - tube)
    o.focusX = o.bendX * lead
    o.focusY = o.bendY * lead
    o.streakGain = 1 - (1 - UNIVERSE_HOP_TUNNEL_STREAK_GAIN) * tube
    o.starGain = 1 - (1 - UNIVERSE_HOP_TUNNEL_STAR_GAIN) * tube
    o.trailFade = UNIVERSE_HOP_TUNNEL_TRAIL_FADE
    o.tintGain = 1
    o.ambientGain = 0
    o.themeMix = 0
    o.procession = 1
    o.flightSec = e / 1000
    // Der Ring ist im ersten Viertel vorbei; die Röhre übernimmt.
    o.portalR = rPass * (1 + 0.3 * t)
    o.portalAlpha = 1 - clamp01(t * 4)
    o.mawAlpha = UNIVERSE_HOP_MAW_ALPHA * (1 - UNIVERSE_HOP_TUNNEL_MAW_DROP * tube)
    o.fieldAlpha = 0
    o.wallAlpha = UNIVERSE_HOP_WALL_ALPHA
    o.portalSpin +=
      (UNIVERSE_HOP_PORTAL_SPIN_RAD_S * (1 + UNIVERSE_HOP_PORTAL_SPIN_APPROACH_GAIN) * dt) / 1000
    o.tunnelT = t
    o.tunnelSec = (e - APPROACH_END_MS) / 1000
    o.roll = tunnelRollAt(state, t)
    o.twist += (o.roll * dt) / 1000
    // Kein Scheinwerfer im Tunnel — er las sich als Ende; mit dem Reveal kehrt er zurück.
    o.headlight = 0.3 * (1 - tube) + UNIVERSE_HOP_TUNNEL_HEADLIGHT_EXIT * o.exitLight
    o.exitR =
      minEdge *
      (UNIVERSE_HOP_EXIT_R0_FRAC +
        (UNIVERSE_HOP_EXIT_R1_FRAC - UNIVERSE_HOP_EXIT_R0_FRAC) *
          Math.pow(reveal, UNIVERSE_HOP_EXIT_GROWTH_POW))
    o.exitAlpha = tube
    o.groupLead = tube
  } else {
    // emerge — vom (aufgerichteten, kleinen) Passage-Fokus zurück zur Mitte.
    const t = (e - PASSAGE_END_MS) / UNIVERSE_HOP_EMERGE_MS
    const [kx, ky] = universeHopTunnelFocusAt(state, 1, minEdge)
    const endLead = UNIVERSE_HOP_TRAVEL_LEAD * (1 - UNIVERSE_HOP_EXIT_STRAIGHTEN)
    o.speed = 1 + PEAK_SPAN * Math.pow(1 - t, 3.5)
    const back = 1 - easeOutBack(t)
    o.focusX = kx * endLead * back
    o.focusY = ky * endLead * back
    o.bendX = 0
    o.bendY = 0
    o.streakGain = 1
    o.trailFade = 1 - (1 - UNIVERSE_HOP_TUNNEL_TRAIL_FADE) * clamp01(1 - t / 0.5)
    o.tintGain = 1 - easeOutCubic(t)
    o.headlight = Math.pow(1 - t, 2)
    o.ambientGain = clamp01((t - 0.4) / 0.6)
    o.themeMix = 0
    // Nicht die back-Kurve des Fluchtpunkts: die schwingt über ihr Ziel hinaus,
    // und ein Körper, der an seiner Bahn vorbeischießt, liest sich als Fehler.
    o.procession = 1 - easeOutCubic(t)
    // Null, nicht eingefroren: die Körper der NEUEN Welt blenden über diese
    // Flugzeit ein, und die alte ist mit dem commit abgeräumt.
    o.flightSec = 0
    o.starGain = 1
    o.portalR = 0
    o.portalAlpha = 0
    o.mawAlpha = 0
    o.fieldAlpha = 0
    o.wallAlpha = 0
    o.tunnelT = 0
    o.tunnelSec = 0
    o.roll = 0
    o.twist = 0
    o.exitR = 0
    o.exitAlpha = 0
    o.exitLight = 0
    o.groupLead = o.procession
  }
}
