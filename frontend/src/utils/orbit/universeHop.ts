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
//   passage    … + PASSAGE_MS            Wormhole: 3D-Bahn mit 90°-Ecken, Verfolgerkamera (wormholePath.ts)
//   wash       = Ausgang − WASH_PEAK·WASH  DOM-Wash im Zielton
//   commit     = Ausgang                 Reset unter dem Peak des Wash
//   emerge     … + EMERGE_MS             Ausrollen im neuen Universum
//   hudIn      = emerge + HUD_IN_DELAY   HUD kehrt zurück
//   done       → idle
import {
  UNIVERSE_HOP_APPROACH_BANK_MAX_RAD,
  UNIVERSE_HOP_APPROACH_LEAN_K,
  UNIVERSE_HOP_APPROACH_MS,
  UNIVERSE_HOP_APPROACH_TRAIL_FADE,
  UNIVERSE_HOP_CAM_FOCAL_K,
  UNIVERSE_HOP_COURSE_ARC_DEG,
  UNIVERSE_HOP_COURSE_BANK_MAX_DEG,
  UNIVERSE_HOP_COURSE_BANK_MIN_DEG,
  UNIVERSE_HOP_DEPART_MS,
  UNIVERSE_HOP_EMERGE_MS,
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
  UNIVERSE_HOP_RIM_ARC_SPIN_MULT,
  UNIVERSE_HOP_RIPPLE_RATE_GAIN,
  UNIVERSE_HOP_RIPPLE_RATE_HZ,
  UNIVERSE_HOP_SPEED_PEAK,
  UNIVERSE_HOP_TUNNEL_HEADLIGHT_EXIT,
  UNIVERSE_HOP_TUNNEL_MAW_DROP,
  UNIVERSE_HOP_TUNNEL_STAR_GAIN,
  UNIVERSE_HOP_TUNNEL_STREAK_GAIN,
  UNIVERSE_HOP_TUNNEL_TRAIL_FADE,
  UNIVERSE_HOP_WALL_ALPHA,
  UNIVERSE_HOP_WASH_MS,
  UNIVERSE_HOP_WASH_PEAK,
  WARP_CRUISE_SHIMMER,
  WARP_CRUISE_SHIMMER_PERIOD_A_SEC,
  WARP_CRUISE_SHIMMER_PERIOD_B_SEC,
} from '@/config/constants'
import { easeInOutCubic, easeOutCubic, type WarpFlightOut } from './galaxyWarp'
import {
  buildWormholePath,
  createWormholeView,
  projectWormholeView,
  type WormholePath,
  type WormholeView,
} from './wormholePath'

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
  /** Sekunden seit Tunnelbeginn — der Fluss der Stränge läuft im festen Takt. */
  tunnelSec: number
  /** Bank der Kamera in rad — die Spirale der Wandfasern; ausserhalb des Tunnels 0. */
  twist: number
  /** 0 … 1: die Röhre blendet am Tunnelbeginn ein. */
  exitAlpha: number
  /** 0 … 1: das Ausgangslicht — erst hinter der letzten Ecke, das Ende zeigt sich am Ende. */
  exitLight: number
  /** Brennweite der Verfolgerkamera in px (× kurze Kante). */
  focal: number
  /** Takt der Sogwellen, kumuliert (1 = eine Welle); nur im Anflug > 0. */
  ripplePhase: number
  /** Winkel des Lichtbogens auf dem Ring in rad, kumuliert. */
  rimArc: number
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
  /** Richtung und Stärke (0 … 1) der Bank im Anflug — aus demselben Wurf wie der Kurs. */
  bankSign: number
  bankFrac: number
  /** Die Wormhole-Bahn, gewürfelt beim Aufbruch; die Kamera-Sicht darauf je Frame. */
  path: WormholePath | null
  view: WormholeView
  lastBank: number
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
/** Die Röhre blendet über diesen Anteil der Passage ein; Fokus und Gruppe fahren im selben Takt. */
export const UNIVERSE_HOP_TUBE_IN_FRAC = 0.15

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

export function createUniverseHop(): UniverseHopState {
  return {
    phase: 'idle',
    elapsedMs: 0,
    courseAz0: 0,
    courseR0: 0,
    courseAz1: 0,
    courseR1: 0,
    bankSign: 1,
    bankFrac: 0,
    path: null,
    view: createWormholeView(),
    lastBank: 0,
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
      exitAlpha: 0,
      exitLight: 0,
      groupLead: 0,
      playerX: 0,
      playerY: 0,
      focal: 0,
      starSurge: 0,
      ripplePhase: 0,
      rimArc: 0,
      wash: false,
      commit: false,
      hudIn: false,
      done: false,
    },
  }
}

/** Setzt in place zurück — `state.out` und `state.view` bleiben dieselben Objekte (Leser halten sie). */
export function resetUniverseHop(state: UniverseHopState): void {
  const fresh = createUniverseHop()
  Object.assign(state.out, fresh.out)
  fresh.out = state.out
  fresh.view = state.view
  Object.assign(state, fresh)
}

/**
 * Kurs und Bahn würfeln und den Flug beginnen. Volle 360° und ein zweiter Azimut
 * um BANK Grad versetzt: der Anflug ist eine KURVE, und jeder Sprung sieht anders
 * aus. Die Wormhole-Bahn dahinter würfelt ihre Ecken selbst.
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
  state.bankSign = bankSign
  state.bankFrac =
    (bank / DEG - UNIVERSE_HOP_COURSE_BANK_MIN_DEG) /
    (UNIVERSE_HOP_COURSE_BANK_MAX_DEG - UNIVERSE_HOP_COURSE_BANK_MIN_DEG)
  state.path = buildWormholePath(rand)
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
    o.exitAlpha = 0
    o.exitLight = 0
    o.groupLead = 0
    o.playerX = 0
    o.playerY = 0
    o.focal = 0
    o.starSurge = 0
    o.ripplePhase = 0
    o.rimArc = 0
    o.done = true
    return
  }

  const rPass = UNIVERSE_HOP_PORTAL_PASS_K * farCorner
  const focal = UNIVERSE_HOP_CAM_FOCAL_K * minEdge

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
    o.trailFade = 1 - (1 - UNIVERSE_HOP_APPROACH_TRAIL_FADE) * k
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
    o.exitAlpha = 0
    o.exitLight = 0
    o.groupLead = 0
    o.playerX = 0
    o.playerY = 0
    o.focal = 0
    o.starSurge = k
    o.ripplePhase = 0
    o.rimArc = 0
  } else if (phase === 'approach') {
    const t = (e - DEPART_END_MS) / UNIVERSE_HOP_APPROACH_MS
    const [fx, fy] = universeHopFocusAt(state, t, minEdge)
    o.speed = UNIVERSE_HOP_SPEED_PEAK * shimmerAt(e)
    o.focusX = fx
    o.focusY = fy
    o.streakGain = 1
    o.trailFade = UNIVERSE_HOP_APPROACH_TRAIL_FADE
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
    // Die Kurve: das Feld rollt in die Bank (Glocke, am Anflugende 0 — nahtlos in
    // die Röhre), der Spieler lehnt sich zum Tor. Die Kamera bleibt hinter ihm.
    const bell = Math.sin(Math.PI * t)
    const bank = state.bankSign * state.bankFrac * UNIVERSE_HOP_APPROACH_BANK_MAX_RAD * bell * bell
    o.roll = dt > 0 ? (-(bank - state.lastBank) * 1000) / dt : 0
    state.lastBank = bank
    o.twist = 0
    o.exitAlpha = 0
    o.exitLight = 0
    o.groupLead = clamp01(t / UNIVERSE_HOP_TUBE_IN_FRAC)
    o.playerX = fx * UNIVERSE_HOP_APPROACH_LEAN_K
    o.playerY = fy * UNIVERSE_HOP_APPROACH_LEAN_K
    o.focal = focal
    o.starSurge = 1
    o.ripplePhase +=
      (UNIVERSE_HOP_RIPPLE_RATE_HZ * (1 + UNIVERSE_HOP_RIPPLE_RATE_GAIN * t) * dt) / 1000
    o.rimArc += (UNIVERSE_HOP_PORTAL_SPIN_RAD_S * UNIVERSE_HOP_RIM_ARC_SPIN_MULT * dt) / 1000
  } else if (phase === 'passage') {
    const t = (e - APPROACH_END_MS) / UNIVERSE_HOP_PASSAGE_MS
    const path = state.path!
    const view = state.view
    projectWormholeView(path, t * path.length, view)
    o.speed = UNIVERSE_HOP_SPEED_PEAK * shimmerAt(e)
    // Die Röhre blendet ein; Striche und Kehlenlicht treten im selben Takt
    // zurück, der Fluchtpunkt fährt von B in die Bildmitte — im Tunnel IST die
    // Kamera der Fluchtpunkt.
    const tube = clamp01(t / UNIVERSE_HOP_TUBE_IN_FRAC)
    const [bx, by] = universeHopFocusAt(state, 1, minEdge)
    o.focusX = bx * (1 - tube)
    o.focusY = by * (1 - tube)
    o.focal = focal
    // Die Lehne wechselt im selben Takt vom Anflug (zum Tor) auf die Kamera-Sicht — kein Sprung der Sonne.
    o.playerX = bx * UNIVERSE_HOP_APPROACH_LEAN_K * (1 - tube) + view.playerX * focal * tube
    o.playerY = by * UNIVERSE_HOP_APPROACH_LEAN_K * (1 - tube) + view.playerY * focal * tube
    o.exitLight = easeInOutCubic(view.exitVis)
    o.starSurge = 1
    o.ripplePhase = 0
    o.rimArc += (UNIVERSE_HOP_PORTAL_SPIN_RAD_S * UNIVERSE_HOP_RIM_ARC_SPIN_MULT * dt) / 1000
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
    // Bank: die Kamera rollt in Yaw-Ecken; das Sternfeld dreht gegenläufig mit.
    const bank = view.bank * tube
    o.roll = dt > 0 ? (-(bank - state.lastBank) * 1000) / dt : 0
    state.lastBank = bank
    o.twist = bank
    // Kein Scheinwerfer im Tunnel — er las sich als Ende; mit dem Ausgang kehrt er zurück.
    o.headlight = 0.3 * (1 - tube) + UNIVERSE_HOP_TUNNEL_HEADLIGHT_EXIT * o.exitLight
    o.exitAlpha = tube
    // Schon im Anflug eingeblendet — fiele es hier auf `tube`, spränge die Sonne in die Mitte.
    o.groupLead = 1
  } else {
    // emerge — der Ausgang lag geradeaus: Fokus in der Mitte, der Spieler legt sich zurück.
    const t = (e - PASSAGE_END_MS) / UNIVERSE_HOP_EMERGE_MS
    const view = state.view
    o.speed = 1 + PEAK_SPAN * Math.pow(1 - t, 3.5)
    o.focusX = 0
    o.focusY = 0
    // Nicht easeOutBack: ein Körper, der über seine Bahn hinausschiesst, liest sich als Fehler.
    const back = 1 - easeOutCubic(t)
    o.playerX = view.playerX * focal * back
    o.playerY = view.playerY * focal * back
    o.focal = focal
    o.streakGain = 1
    o.trailFade = 1 - (1 - UNIVERSE_HOP_TUNNEL_TRAIL_FADE) * clamp01(1 - t / 0.5)
    o.tintGain = 1 - easeOutCubic(t)
    o.headlight = Math.pow(1 - t, 2)
    o.ambientGain = clamp01((t - 0.4) / 0.6)
    o.themeMix = 0
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
    state.lastBank = 0
    o.exitAlpha = 0
    o.exitLight = 0
    o.groupLead = o.procession
    o.starSurge = back
    o.ripplePhase = 0
    o.rimArc = 0
  }
}
