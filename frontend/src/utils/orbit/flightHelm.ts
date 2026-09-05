// Der Helm — der Kurs des Spielerkörpers als reine Zustandsmaschine.
//
// Vorzeichenvertrag: die Nase dreht ZUM Fokus-Versatz; das nahe Feld rutscht
// ENTGEGEN; die Rolle kippt in die Kurve; der Schweif schwingt mit dem Feld,
// also nach aussen. Ausweichen weg von Winkel θ: Fokusziel = −dir(θ)·amp.
//
// Alle Zeiten sind rAF-Delta. Keine Uhr, kein Spielzustand, keine Allokation
// je Frame — `stepHelm` gibt immer dasselbe Ausgabeobjekt zurück.
import {
  HELM_BANK_ROLL_DEG_MAX,
  HELM_BANK_ROLL_DEG_MIN,
  HELM_CRUISE_GAP_SEC_MAX,
  HELM_CRUISE_GAP_SEC_MIN,
  HELM_EASE_OUT_SEC,
  HELM_EVADE_AMP_FRAC,
  HELM_EVADE_COOLDOWN_SEC,
  HELM_EVADE_HOLD_SEC,
  HELM_EVADE_ROLL_DEG,
  HELM_EVADE_TAU_SEC,
  HELM_EVADE_THROTTLE,
  HELM_FOCUS_MAX_FRAC,
  HELM_FOCUS_TAU_SEC,
  HELM_MODE_WEIGHTS,
  HELM_ROLL_MAX_DEG,
  HELM_ROLL_TAU_SEC,
  HELM_SLIP_HOLD_GAIN,
  HELM_SLIP_MAX_PX_S,
  HELM_SLIP_RATE_GAIN,
  HELM_TRAVEL_GAP_SCALE,
  HELM_YAW_AMP_FRAC_MAX,
  HELM_YAW_AMP_FRAC_MIN,
  HELM_YAW_HOLD_SEC_MAX,
  HELM_YAW_HOLD_SEC_MIN,
  JOLT_SLIP_GAIN,
} from '@/config/constants'
import type { JoltOut } from '@/utils/orbit/flightJolt'

export type HelmMode = 'cruise' | 'yaw' | 'bank' | 'evade'

export interface HelmInputs {
  /** Sekunden; 0 während starsBackgroundPaused. */
  dt: number
  active: boolean
  traveling: boolean
  minEdge: number
  /** Das Drift-Wobbeln des Fluchtpunkts — der Helm addiert darauf. */
  baseFocusX: number
  baseFocusY: number
  rand: () => number
  /** Der Treffer-Ruck — geht IMMER ein, auch inaktiv und bei dt = 0. */
  jolt: JoltOut | null
}

export interface HelmOutput {
  /** Gesamter Fluchtpunkt-Versatz (Drift + Helm), geklemmt. */
  focusX: number
  focusY: number
  /** Seitenrutsch des nahen Feldes, px/s (Gewicht 1 bei norm = 1). */
  slipX: number
  slipY: number
  /** rad/s auf jeden Polarwinkel; `roll` ist der Stand in rad. */
  rollRate: number
  roll: number
  /** −1..1, Anteil der Schräglage. */
  bank: number
  throttle: number
  mode: HelmMode
}

export interface HelmState {
  mode: HelmMode
  timer: number
  evadeCooldown: number
  /** Zielwerte als Anteil von minEdge bzw. rad. */
  targetFx: number
  targetFy: number
  targetRoll: number
  /** Istwerte des Helms (ohne Drift), Anteil von minEdge. */
  fx: number
  fy: number
  roll: number
  throttle: number
  tau: number
  out: HelmOutput
}

const DEG = Math.PI / 180

export function createHelmState(): HelmState {
  return {
    mode: 'cruise',
    timer: 0,
    evadeCooldown: 0,
    targetFx: 0,
    targetFy: 0,
    targetRoll: 0,
    fx: 0,
    fy: 0,
    roll: 0,
    throttle: 1,
    tau: HELM_FOCUS_TAU_SEC,
    out: {
      focusX: 0,
      focusY: 0,
      slipX: 0,
      slipY: 0,
      rollRate: 0,
      roll: 0,
      bank: 0,
      throttle: 1,
      mode: 'cruise',
    },
  }
}

export function resetHelm(state: HelmState): void {
  Object.assign(state, createHelmState())
}

function lerpRange(lo: number, hi: number, rand: () => number): number {
  return lo + rand() * (hi - lo)
}

function approach(v: number, target: number, dt: number, tau: number): number {
  return v + (target - v) * (1 - Math.exp(-dt / tau))
}

function pickMode(rand: () => number): 'yaw' | 'bank' | 'flinch' {
  const r = rand() * (HELM_MODE_WEIGHTS.yaw + HELM_MODE_WEIGHTS.bank + HELM_MODE_WEIGHTS.flinch)
  if (r < HELM_MODE_WEIGHTS.yaw) return 'yaw'
  if (r < HELM_MODE_WEIGHTS.yaw + HELM_MODE_WEIGHTS.bank) return 'bank'
  return 'flinch'
}

function cruiseGap(traveling: boolean, rand: () => number): number {
  const gap = lerpRange(HELM_CRUISE_GAP_SEC_MIN, HELM_CRUISE_GAP_SEC_MAX, rand)
  return traveling ? gap * HELM_TRAVEL_GAP_SCALE : gap
}

function beginEvade(state: HelmState, awayFromAngle: number, strength: number): void {
  const amp = HELM_EVADE_AMP_FRAC * strength
  state.targetFx = -Math.cos(awayFromAngle) * amp
  state.targetFy = -Math.sin(awayFromAngle) * amp
  state.targetRoll = -Math.sign(state.targetFx || 1) * HELM_EVADE_ROLL_DEG * DEG * strength
  state.mode = 'evade'
  state.timer = HELM_EVADE_HOLD_SEC
  state.tau = HELM_EVADE_TAU_SEC
  state.evadeCooldown = HELM_EVADE_COOLDOWN_SEC
}

/** Eine Begegnung bittet um eine Kurve weg von `awayFromAngle`. */
export function requestEvade(state: HelmState, awayFromAngle: number, strength: number): boolean {
  if (state.mode === 'evade' || state.evadeCooldown > 0) return false
  beginEvade(state, awayFromAngle, strength)
  return true
}

function beginManoeuvre(state: HelmState, inp: HelmInputs): void {
  const kind = pickMode(inp.rand)
  if (kind === 'flinch') {
    beginEvade(state, inp.rand() * Math.PI * 2, 0.6 + inp.rand() * 0.4)
    return
  }
  const amp = lerpRange(HELM_YAW_AMP_FRAC_MIN, HELM_YAW_AMP_FRAC_MAX, inp.rand)
  const a = inp.rand() * Math.PI * 2
  state.targetFx = Math.cos(a) * amp
  state.targetFy = Math.sin(a) * amp
  state.targetRoll =
    kind === 'bank'
      ? -Math.sign(state.targetFx || 1) *
        lerpRange(HELM_BANK_ROLL_DEG_MIN, HELM_BANK_ROLL_DEG_MAX, inp.rand) *
        DEG
      : 0
  state.mode = kind
  state.timer = lerpRange(HELM_YAW_HOLD_SEC_MIN, HELM_YAW_HOLD_SEC_MAX, inp.rand)
  state.tau = HELM_FOCUS_TAU_SEC
}

function endManoeuvre(state: HelmState, inp: HelmInputs): void {
  state.targetFx = 0
  state.targetFy = 0
  state.targetRoll = 0
  state.mode = 'cruise'
  state.timer = cruiseGap(inp.traveling, inp.rand)
  state.tau = HELM_FOCUS_TAU_SEC
}

export function stepHelm(state: HelmState, inp: HelmInputs): HelmOutput {
  const dt = inp.dt
  const out = state.out
  if (state.evadeCooldown > 0) state.evadeCooldown = Math.max(0, state.evadeCooldown - dt)

  if (!inp.active) {
    if (state.mode !== 'cruise') endManoeuvre(state, inp)
    state.tau = HELM_EASE_OUT_SEC
  } else if (dt > 0) {
    state.timer -= dt
    if (state.timer <= 0) {
      if (state.mode === 'cruise') beginManoeuvre(state, inp)
      else endManoeuvre(state, inp)
    }
  }

  const prevFx = state.fx
  const prevFy = state.fy
  const prevRoll = state.roll
  if (dt > 0) {
    state.fx = approach(state.fx, state.targetFx, dt, state.tau)
    state.fy = approach(state.fy, state.targetFy, dt, state.tau)
    state.roll = approach(state.roll, state.targetRoll, dt, HELM_ROLL_TAU_SEC)
    state.throttle = approach(
      state.throttle,
      state.mode === 'evade' ? HELM_EVADE_THROTTLE : 1,
      dt,
      HELM_EVADE_TAU_SEC,
    )
  }

  const edge = inp.minEdge
  const j = inp.jolt
  const helmX = (state.fx + (j ? j.focusX : 0)) * edge
  const helmY = (state.fy + (j ? j.focusY : 0)) * edge
  const rateX = (dt > 0 ? ((state.fx - prevFx) * edge) / dt : 0) + (j ? j.focusVx * JOLT_SLIP_GAIN * edge : 0)
  const rateY = (dt > 0 ? ((state.fy - prevFy) * edge) / dt : 0) + (j ? j.focusVy * JOLT_SLIP_GAIN * edge : 0)
  let slipX = -(HELM_SLIP_HOLD_GAIN * helmX + HELM_SLIP_RATE_GAIN * rateX)
  let slipY = -(HELM_SLIP_HOLD_GAIN * helmY + HELM_SLIP_RATE_GAIN * rateY)
  const slipLen = Math.hypot(slipX, slipY)
  if (slipLen > HELM_SLIP_MAX_PX_S) {
    slipX *= HELM_SLIP_MAX_PX_S / slipLen
    slipY *= HELM_SLIP_MAX_PX_S / slipLen
  }

  let focusX = inp.baseFocusX + helmX + (j ? j.tremorX * edge : 0)
  let focusY = inp.baseFocusY + helmY + (j ? j.tremorY * edge : 0)
  const focusMax = HELM_FOCUS_MAX_FRAC * edge
  const focusLen = Math.hypot(focusX, focusY)
  if (focusLen > focusMax) {
    focusX *= focusMax / focusLen
    focusY *= focusMax / focusLen
  }

  const rollMax = HELM_ROLL_MAX_DEG * DEG
  const roll = Math.max(-rollMax, Math.min(rollMax, state.roll + (j ? j.roll : 0)))

  out.focusX = focusX
  out.focusY = focusY
  out.slipX = slipX
  out.slipY = slipY
  out.roll = roll
  out.rollRate =
    (dt > 0 ? (state.roll - prevRoll) / dt : 0) + (j ? j.rollRate : 0)
  out.bank = roll / rollMax
  out.throttle = state.throttle
  out.mode = state.mode
  return out
}
