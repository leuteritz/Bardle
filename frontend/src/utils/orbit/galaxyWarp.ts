// Der Galaxien-Warp als reine Zustandsmaschine — der Flug zur nächsten Galaxie
// nach ihrer Rettung.
//
// Kein DOM, kein Store, keine Uhr: die Schleife in useStarBackground tickt mit
// ihrem rAF-Delta und liest je Frame `state.out`. Das Ausgabeobjekt wird in
// place beschrieben (Muster wie `stepHelm`), damit hier nichts je Frame
// alloziert. Die Phasengrenzen leiten sich aus der Gesamtzeit ab, nicht aus
// Zählern — ein großes Delta (Tab-Rückkehr, 100-ms-Deckel) springt sauber über
// mehrere Grenzen, und `launched`/`commit`/`done` feuern trotzdem genau einmal.
//
// Choreografie (Zeiten aus config/constants/progression.ts):
//   launch  0 … LAUNCH_MS        Atemzug (Sterne einwärts, Ringe auf den Körper zu), dann der
//                                Schlag: Punch, Ringe hinaus, Rückstoss, Blitz, Schub
//   accel   … + ACCEL_MS         Kurs und Überlicht setzen gemeinsam weich ein
//   cruise  … GALAXY_TRANS_WARP_MS   Wegpunkte A→B→C→D in ungleichen Etappen: Bank-Glocke,
//                                Roll des Feldes, Lehne mit Nachlauf, Körper kippt in die Kurve
//   commit  = GALAXY_TRANS_WARP_MS   Galaxiewechsel (Theme, Zähler), Blitz
//   decel   … + GALAXY_TRANS_DECEL_MS   Ausrollen, Fluchtpunkt kehrt zur Mitte
//   done    → idle
import {
  GALAXY_TRANS_DECEL_MS,
  GALAXY_TRANS_WARP_MS,
  GALAXY_WARP_ACCEL_MS,
  GALAXY_WARP_LAUNCH_INHALE_MS,
  GALAXY_WARP_LAUNCH_MS,
  WARP_BODY_ROLL_K,
  WARP_BANK_MAX_RAD,
  WARP_BOW_WAVE_HEADLIGHT_GAIN,
  WARP_BOW_WAVE_MS,
  WARP_COURSE_ARC_DEG,
  WARP_COURSE_LEGS,
  WARP_COURSE_TURN_MAX_DEG,
  WARP_COURSE_TURN_MIN_DEG,
  WARP_CRUISE_SHIMMER,
  WARP_CRUISE_SHIMMER_PERIOD_A_SEC,
  WARP_CRUISE_SHIMMER_PERIOD_B_SEC,
  WARP_FOCUS_FRAC_MAX,
  WARP_FOCUS_FRAC_MIN,
  WARP_INHALE_SPEED,
  WARP_LAUNCH_RING_MS,
  WARP_LAUNCH_SPEED,
  WARP_LEAN_K,
  WARP_LEAN_TAU_SEC,
  WARP_LEG_WEIGHT_MAX,
  WARP_LEG_WEIGHT_MIN,
  WARP_SPEED_PEAK,
  WARP_SURGE_FROM,
  WARP_SURGE_PEAK,
  WARP_TRAIL_FADE,
} from '@/config/constants'

export type GalaxyWarpPhase = 'idle' | 'launch' | 'accel' | 'cruise' | 'decel'

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
  /** 0 … 1 (kurz darüber in der Bugwelle): Aufhellung um den Fluchtpunkt. */
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
  /** Roll des Sternfelds um den Fluchtpunkt in rad/s: die Änderung der Kamera-Bank. */
  roll: number
  /** 0 … 1: wie weit die Gruppe (Sonne + Prozession) der Lehne des Spielers folgt. */
  groupLead: number
  /** Der Spieler im Bild, px gegen die Bildmitte — die Kamera fährt hinter ihm, er lehnt sich in die Kurve. */
  playerX: number
  playerY: number
  /** 0 … 1: Einblendung der Zusatzsterne des Flugs. */
  starSurge: number
  /** Bank des Spielerkörpers in rad — er kippt in die Kurve; der Sprung lässt sie 0. */
  bodyRoll: number
}

export interface GalaxyWarpOut extends WarpFlightOut {
  phase: GalaxyWarpPhase
  /** Schockringe vom Spielerkörper: −1 … 0 laufen sie im Atemzug auf ihn zu, 0 … 1 nach dem Schlag hinaus. */
  launchPulse: number
  /** 0 … 1: der eine Ring vom Fluchtpunkt beim Erreichen von Überlicht. */
  bowWave: number
  /** Flanken — je genau einen Frame lang wahr. */
  launched: boolean
  commit: boolean
  done: boolean
}

/** Ein Wegpunkt des Kurses: Azimut in rad, Radius als Anteil der kurzen Kante. */
export interface WarpWaypoint {
  az: number
  r: number
}

export interface GalaxyWarpState {
  phase: GalaxyWarpPhase
  elapsedMs: number
  /** A → B → C → D; bleibt bei Resize gültig. Dieselbe Liste über jeden Reset. */
  waypoints: WarpWaypoint[]
  /** Ende jeder Etappe in Flug-ms (aus dem Wurf gewichtet); die letzte endet am Schnitt. */
  legEndMs: number[]
  lastBank: number
  /** Nachlauf der Lehne — die Kamera holt den Spieler ein. */
  leanX: number
  leanY: number
  launched: boolean
  committed: boolean
  out: GalaxyWarpOut
}

const FLIGHT_MS = GALAXY_TRANS_WARP_MS
const LAUNCH_END_MS = GALAXY_WARP_LAUNCH_MS
export const GALAXY_WARP_ACCEL_END_MS = LAUNCH_END_MS + GALAXY_WARP_ACCEL_MS
const ACCEL_END_MS = GALAXY_WARP_ACCEL_END_MS
const INHALE_END_MS = GALAXY_WARP_LAUNCH_INHALE_MS
const CRUISE_MS = FLIGHT_MS - ACCEL_END_MS
/** Beginn des Crescendos — ein Anteil der Reiseflugstrecke, nicht der Gesamtzeit. */
const SURGE_START_MS = ACCEL_END_MS + CRUISE_MS * WARP_SURGE_FROM
const TOTAL_MS = GALAXY_TRANS_WARP_MS + GALAXY_TRANS_DECEL_MS
const DEG = Math.PI / 180
const ARC_LO = (-90 - WARP_COURSE_ARC_DEG / 2) * DEG
const ARC_HI = (-90 + WARP_COURSE_ARC_DEG / 2) * DEG

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
  const waypoints: WarpWaypoint[] = []
  for (let i = 0; i <= WARP_COURSE_LEGS; i++) waypoints.push({ az: 0, r: 0 })
  const legEndMs: number[] = []
  for (let i = 0; i < WARP_COURSE_LEGS; i++) legEndMs.push(0)
  return {
    phase: 'idle',
    elapsedMs: 0,
    waypoints,
    legEndMs,
    lastBank: 0,
    leanX: 0,
    leanY: 0,
    launched: false,
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
      roll: 0,
      groupLead: 0,
      playerX: 0,
      playerY: 0,
      starSurge: 0,
      bodyRoll: 0,
      launchPulse: 0,
      bowWave: 0,
      launched: false,
      commit: false,
      done: false,
    },
  }
}

/** Setzt in place zurück — `state.out` und `state.waypoints` bleiben dieselben Objekte (Leser halten sie). */
export function resetGalaxyWarp(state: GalaxyWarpState): void {
  const fresh = createGalaxyWarp()
  Object.assign(state.out, fresh.out)
  fresh.out = state.out
  for (const wp of state.waypoints) {
    wp.az = 0
    wp.r = 0
  }
  fresh.waypoints = state.waypoints
  state.legEndMs.fill(0)
  fresh.legEndMs = state.legEndMs
  Object.assign(state, fresh)
}

/**
 * Den Kurs würfeln. Der erste Azimut kommt aus dem Bogen um „oben" (Bildschirm-y
 * nach unten positiv): nie in die Bottom-Bar, nie hinter das HUD. Jeder weitere
 * springt um TURN_MIN…MAX weiter, abwechselnd links und rechts — eine S-Kurve;
 * fiele er aus dem Bogen, kippt die Richtung (MAX ≤ ARC/2 garantiert Platz).
 */
export function randomGalaxyWarpCourse(rand: () => number, out: WarpWaypoint[]): void {
  const span = WARP_FOCUS_FRAC_MAX - WARP_FOCUS_FRAC_MIN
  out[0].az = ARC_LO + rand() * WARP_COURSE_ARC_DEG * DEG
  out[0].r = WARP_FOCUS_FRAC_MIN + rand() * span
  let sign = rand() < 0.5 ? -1 : 1
  for (let i = 1; i < out.length; i++) {
    const turn =
      (WARP_COURSE_TURN_MIN_DEG + rand() * (WARP_COURSE_TURN_MAX_DEG - WARP_COURSE_TURN_MIN_DEG)) *
      DEG
    let az = out[i - 1].az + sign * turn
    if (az < ARC_LO || az > ARC_HI) {
      sign = -sign
      az = out[i - 1].az + sign * turn
    }
    out[i].az = az
    out[i].r = WARP_FOCUS_FRAC_MIN + rand() * span
    sign = -sign
  }
}

/** Etappenlängen aus dem Wurf: kurz und scharf, lang und weit — normiert auf die Reiseflugstrecke. */
export function randomGalaxyWarpLegs(rand: () => number, out: number[]): void {
  let sum = 0
  for (let i = 0; i < out.length; i++) {
    out[i] = WARP_LEG_WEIGHT_MIN + rand() * (WARP_LEG_WEIGHT_MAX - WARP_LEG_WEIGHT_MIN)
    sum += out[i]
  }
  let acc = ACCEL_END_MS
  for (let i = 0; i < out.length; i++) {
    acc += (out[i] / sum) * CRUISE_MS
    out[i] = acc
  }
  out[out.length - 1] = FLIGHT_MS
}

export function startGalaxyWarp(state: GalaxyWarpState, rand: () => number): void {
  resetGalaxyWarp(state)
  randomGalaxyWarpCourse(rand, state.waypoints)
  randomGalaxyWarpLegs(rand, state.legEndMs)
  state.phase = 'launch'
  state.out.phase = 'launch'
}

/** Fokus in px auf Etappe `leg` bei Anteil `t` — Winkel UND Radius laufen mit easeInOut: eine Kurve, keine Gerade. */
export function galaxyWarpFocusAt(
  state: GalaxyWarpState,
  leg: number,
  t: number,
  minEdge: number,
): [number, number] {
  const a = state.waypoints[leg]
  const b = state.waypoints[Math.min(leg + 1, state.waypoints.length - 1)]
  const k = easeInOutCubic(clamp01(t))
  const az = a.az + (b.az - a.az) * k
  const r = (a.r + (b.r - a.r) * k) * minEdge
  return [Math.cos(az) * r, Math.sin(az) * r]
}

/** Ein Frame. `minEdge` = kurze Kante des Canvas in px (für den Fokus-Versatz). */
export function stepGalaxyWarp(state: GalaxyWarpState, dtMs: number, minEdge: number): void {
  const o = state.out
  o.commit = false
  o.done = false
  o.launched = false
  if (state.phase === 'idle') return

  const dt = Math.max(0, dtMs)
  state.elapsedMs += dt
  const e = state.elapsedMs

  // Der Schlag kommt nach dem Atemzug — dort sitzen Ruck, Blitz und Schub.
  if (!state.launched && e >= INHALE_END_MS) {
    state.launched = true
    o.launched = true
  }
  if (!state.committed && e >= FLIGHT_MS) {
    state.committed = true
    o.commit = true
  }

  let phase: GalaxyWarpPhase
  if (e >= TOTAL_MS) phase = 'idle'
  else if (e >= FLIGHT_MS) phase = 'decel'
  else if (e >= ACCEL_END_MS) phase = 'cruise'
  else if (e >= LAUNCH_END_MS) phase = 'accel'
  else phase = 'launch'
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
    o.roll = 0
    o.groupLead = 0
    o.playerX = 0
    o.playerY = 0
    o.starSurge = 0
    o.bodyRoll = 0
    o.launchPulse = 0
    o.bowWave = 0
    state.lastBank = 0
    state.leanX = 0
    state.leanY = 0
    o.done = true
    return
  }

  const peakSpan = WARP_SPEED_PEAK - 1
  // Das Ausrollen setzt dort an, wo das Crescendo endete — nicht beim
  // Anlauf-Höchsttempo. Mit `peakSpan` fiele das Tempo im Frame des Schnitts um
  // ein Viertel ab, während die Persistenz-Spur noch drei Frames lang die
  // längeren Striche danebenzeigt: ein Ruck, kein Schnitt.
  const surgeSpan = WARP_SURGE_PEAK - 1
  o.launchPulse =
    e < INHALE_END_MS ? -(e / INHALE_END_MS) : clamp01((e - INHALE_END_MS) / WARP_LAUNCH_RING_MS)
  o.bowWave = clamp01((e - ACCEL_END_MS) / WARP_BOW_WAVE_MS)
  o.starGain = 1
  o.flightSec = e / 1000
  // Die Lehne folgt ihrem Ziel mit Nachlauf: die Kamera holt den Spieler ein.
  const leanEase = dt > 0 ? 1 - Math.exp(-dt / 1000 / WARP_LEAN_TAU_SEC) : 1
  const lean = (tx: number, ty: number): void => {
    state.leanX += (tx - state.leanX) * leanEase
    state.leanY += (ty - state.leanY) * leanEase
    o.playerX = state.leanX
    o.playerY = state.leanY
  }

  if (phase === 'launch') {
    if (e < INHALE_END_MS) {
      // Der Atemzug: alles zieht auf den Spieler zu, die Ringe laufen ein.
      const k = easeOutCubic(e / INHALE_END_MS)
      o.speed = 1 + (WARP_INHALE_SPEED - 1) * k
      o.streakGain = 0
      o.trailFade = 1 - (1 - WARP_TRAIL_FADE) * k
      o.ambientGain = 1 - k
      o.starSurge = 0
    } else {
      // Der Schlag: vom Sog in den Punch.
      const k = easeOutCubic((e - INHALE_END_MS) / (LAUNCH_END_MS - INHALE_END_MS))
      o.speed = WARP_INHALE_SPEED + (WARP_LAUNCH_SPEED - WARP_INHALE_SPEED) * k
      o.streakGain = k
      o.trailFade = WARP_TRAIL_FADE
      o.ambientGain = 0
      o.starSurge = k
    }
    o.focusX = 0
    o.focusY = 0
    o.tintGain = 0
    o.headlight = 0
    o.themeMix = 0
    o.procession = 0
    o.roll = 0
    o.groupLead = 0
    o.bodyRoll = 0
    lean(0, 0)
    state.lastBank = 0
  } else if (phase === 'accel') {
    const t = (e - LAUNCH_END_MS) / GALAXY_WARP_ACCEL_MS
    const k = easeInOutCubic(t)
    const [ax, ay] = galaxyWarpFocusAt(state, 0, 0, minEdge)
    o.speed = WARP_LAUNCH_SPEED + (WARP_SPEED_PEAK - WARP_LAUNCH_SPEED) * k
    o.focusX = ax * k
    o.focusY = ay * k
    o.streakGain = 1
    o.trailFade = WARP_TRAIL_FADE
    o.tintGain = t
    o.headlight = t * clamp01((o.speed - 1) / peakSpan)
    o.ambientGain = 0
    o.themeMix = 0
    // Prozession und Lehne fahren mit DEMSELBEN Easing wie Schub und Schwenk.
    o.procession = k
    o.roll = 0
    o.groupLead = k
    lean(o.focusX * WARP_LEAN_K, o.focusY * WARP_LEAN_K)
    o.bodyRoll = 0
    o.starSurge = 1
    state.lastBank = 0
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
    // Die Etappe: der Fokus wandert zum nächsten Wegpunkt, das Feld rollt in
    // die Bank (Glocke, an beiden Etappenenden 0 — keine Ecke), der Spieler
    // lehnt sich in die Kurve und kippt. Die letzte Etappe endet am Schnitt: Bank 0.
    let leg = 0
    while (leg < WARP_COURSE_LEGS - 1 && e >= state.legEndMs[leg]) leg++
    const legStart = leg === 0 ? ACCEL_END_MS : state.legEndMs[leg - 1]
    const t = clamp01((e - legStart) / (state.legEndMs[leg] - legStart))
    const [fx, fy] = galaxyWarpFocusAt(state, leg, t, minEdge)
    const dAz = state.waypoints[leg + 1].az - state.waypoints[leg].az
    const amp = WARP_BANK_MAX_RAD * Math.min(1, Math.abs(dAz) / (WARP_COURSE_TURN_MAX_DEG * DEG))
    const bell = Math.sin(Math.PI * t)
    const bank = Math.sign(dAz) * amp * bell * bell
    o.roll = dt > 0 ? (-(bank - state.lastBank) * 1000) / dt : 0
    state.lastBank = bank
    o.focusX = fx
    o.focusY = fy
    o.streakGain = 1
    o.trailFade = WARP_TRAIL_FADE
    o.tintGain = 1
    // Die Bugwelle: das Headlight schwillt einmal an und legt sich wieder.
    o.headlight = 1 + WARP_BOW_WAVE_HEADLIGHT_GAIN * Math.sin(Math.PI * o.bowWave)
    o.ambientGain = 0
    o.themeMix = surge
    o.procession = 1
    o.groupLead = 1
    lean(fx * WARP_LEAN_K, fy * WARP_LEAN_K)
    o.bodyRoll = bank * WARP_BODY_ROLL_K
    o.starSurge = 1
  } else {
    // decel
    const t = (e - FLIGHT_MS) / GALAXY_TRANS_DECEL_MS
    const [cxEnd, cyEnd] = galaxyWarpFocusAt(state, WARP_COURSE_LEGS - 1, 1, minEdge)
    o.speed = 1 + surgeSpan * Math.pow(1 - t, 3.5)
    const back = 1 - easeOutBack(t)
    o.focusX = cxEnd * back
    o.focusY = cyEnd * back
    o.streakGain = 1
    o.trailFade = 1 - (1 - WARP_TRAIL_FADE) * clamp01(1 - t / 0.5)
    o.tintGain = 1 - easeOutCubic(t)
    o.headlight = Math.pow(1 - t, 2)
    o.ambientGain = clamp01((t - 0.4) / 0.6)
    // Die neue Welt ist da und bleibt — im Ausrollen wird nicht zurückgeblendet.
    o.themeMix = 1
    // Bewusst NICHT die back-Kurve des Fluchtpunkts: die schwingt über ihr
    // Ziel hinaus, und ein Körper, der an seiner Bahn vorbeischießt und
    // zurückrutscht, liest sich als Fehler. Lehne und Schub legen sich genauso.
    const settle = 1 - easeOutCubic(t)
    o.procession = settle
    o.roll = 0
    o.groupLead = settle
    lean(cxEnd * WARP_LEAN_K, cyEnd * WARP_LEAN_K)
    o.bodyRoll = 0
    o.starSurge = settle
    o.flightSec = FLIGHT_MS / 1000
    state.lastBank = 0
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
