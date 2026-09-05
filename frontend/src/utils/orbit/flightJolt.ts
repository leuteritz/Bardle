// Der Ruck nach einem Treffer: eine gedämpfte Feder im Einheitsraum für den
// Fokus (2-D) und die Rolle (1-D), dazu ein abklingendes Beben. Je Frame die
// EXAKTE Lösung des Oszillators — framerate-unabhängig, dt = 0 ist Identität,
// keine Allokation, in Ruhe kein Trig.
import {
  JOLT_FOCUS_FRAC,
  JOLT_KICK_VEL,
  JOLT_OMEGA_RAD_S,
  JOLT_REST_EPS,
  JOLT_ROLL_DEG,
  JOLT_TREMOR_DECAY_SEC,
  JOLT_TREMOR_FRAC,
  JOLT_TREMOR_HZ,
  JOLT_TREMOR_HZ_RATIO,
  JOLT_UNIT_MAX,
  JOLT_ZETA,
} from '@/config/constants'

export interface JoltOut {
  /** Anteil der kurzen Kante bzw. Anteil/s. */
  focusX: number
  focusY: number
  focusVx: number
  focusVy: number
  /** rad, rad/s. */
  roll: number
  rollRate: number
  /** Einheiten −1,25..1,25 — der Schreiber multipliziert mit seiner px-Amplitude. */
  bodyX: number
  bodyY: number
  tremorX: number
  tremorY: number
  atRest: boolean
}

export interface JoltState {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  vr: number
  env: number
  phase: number
  kicks: number
  out: JoltOut
}

const DEG = Math.PI / 180
const GOLDEN = 2.399963
const OMEGA = JOLT_OMEGA_RAD_S
const A = JOLT_ZETA * OMEGA
const OMEGA_D = OMEGA * Math.sqrt(1 - JOLT_ZETA * JOLT_ZETA)
/** Geschwindigkeiten ruhen auf der Lageskala: |v|/ω < eps. */
const V_EPS = JOLT_REST_EPS * OMEGA

export function createJoltState(): JoltState {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 0,
    vr: 0,
    env: 0,
    phase: 0,
    kicks: 0,
    out: {
      focusX: 0,
      focusY: 0,
      focusVx: 0,
      focusVy: 0,
      roll: 0,
      rollRate: 0,
      bodyX: 0,
      bodyY: 0,
      tremorX: 0,
      tremorY: 0,
      atRest: true,
    },
  }
}

/** Nullt in place — `out` behält seine Identität, der Helm hält eine Referenz darauf. */
export function resetJolt(s: JoltState): void {
  s.x = s.y = s.vx = s.vy = s.r = s.vr = s.env = s.phase = 0
  zero(s.out)
}

export function joltAtRest(s: JoltState): boolean {
  return (
    Math.abs(s.x) < JOLT_REST_EPS &&
    Math.abs(s.y) < JOLT_REST_EPS &&
    Math.abs(s.vx) < V_EPS &&
    Math.abs(s.vy) < V_EPS &&
    Math.abs(s.r) < JOLT_REST_EPS &&
    Math.abs(s.vr) < V_EPS &&
    s.env < JOLT_REST_EPS
  )
}

/** Stoss in Richtung (dirX, dirY) — weg vom Angreifer; die Rolle kippt gegen die Stossrichtung. */
export function kickJolt(
  s: JoltState,
  dirX: number,
  dirY: number,
  strength: number,
  tremor: number,
): void {
  const len = Math.hypot(dirX, dirY) || 1
  const v = JOLT_KICK_VEL * strength
  s.vx += (dirX / len) * v
  s.vy += (dirY / len) * v
  const cap = JOLT_KICK_VEL * JOLT_UNIT_MAX
  const vl = Math.hypot(s.vx, s.vy)
  if (vl > cap) {
    s.vx *= cap / vl
    s.vy *= cap / vl
  }
  s.vr += -Math.sign(dirX || 1) * v
  s.vr = Math.max(-cap, Math.min(cap, s.vr))
  if (tremor > s.env) {
    s.env = tremor
    s.phase = s.kicks * GOLDEN
  }
  s.kicks++
}

function zero(out: JoltOut): void {
  out.focusX = 0
  out.focusY = 0
  out.focusVx = 0
  out.focusVy = 0
  out.roll = 0
  out.rollRate = 0
  out.bodyX = 0
  out.bodyY = 0
  out.tremorX = 0
  out.tremorY = 0
  out.atRest = true
}

export function stepJolt(s: JoltState, dt: number): JoltOut {
  const out = s.out
  if (joltAtRest(s)) {
    if (!out.atRest) {
      s.x = s.y = s.vx = s.vy = s.r = s.vr = s.env = 0
      zero(out)
    }
    return out
  }
  if (dt > 0) {
    const E = Math.exp(-A * dt)
    const C = Math.cos(OMEGA_D * dt)
    const S = Math.sin(OMEGA_D * dt)
    const k1 = C + (A / OMEGA_D) * S
    const k2 = S / OMEGA_D
    const k3 = C - (A / OMEGA_D) * S
    const k4 = ((OMEGA * OMEGA) / OMEGA_D) * S
    const x = E * (s.x * k1 + s.vx * k2)
    const vx = E * (s.vx * k3 - s.x * k4)
    const y = E * (s.y * k1 + s.vy * k2)
    const vy = E * (s.vy * k3 - s.y * k4)
    const r = E * (s.r * k1 + s.vr * k2)
    const vr = E * (s.vr * k3 - s.r * k4)
    s.x = Math.max(-JOLT_UNIT_MAX, Math.min(JOLT_UNIT_MAX, x))
    s.y = Math.max(-JOLT_UNIT_MAX, Math.min(JOLT_UNIT_MAX, y))
    s.r = Math.max(-JOLT_UNIT_MAX, Math.min(JOLT_UNIT_MAX, r))
    s.vx = vx
    s.vy = vy
    s.vr = vr
    s.env *= Math.exp(-dt / JOLT_TREMOR_DECAY_SEC)
    s.phase += Math.PI * 2 * JOLT_TREMOR_HZ * dt
  }
  out.focusX = s.x * JOLT_FOCUS_FRAC
  out.focusY = s.y * JOLT_FOCUS_FRAC
  out.focusVx = s.vx * JOLT_FOCUS_FRAC
  out.focusVy = s.vy * JOLT_FOCUS_FRAC
  out.roll = s.r * JOLT_ROLL_DEG * DEG
  out.rollRate = s.vr * JOLT_ROLL_DEG * DEG
  out.bodyX = s.x
  out.bodyY = s.y
  const amp = s.env * JOLT_TREMOR_FRAC
  out.tremorX = amp * Math.sin(s.phase)
  out.tremorY = amp * Math.cos(s.phase * JOLT_TREMOR_HZ_RATIO)
  out.atRest = false
  return out
}
