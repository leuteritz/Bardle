// Flüchtiger Kurs-Zustand ausserhalb von Pinia (wie liveState.ts): pro Frame
// von der Sternfeld-Schleife geschrieben, vom Schweif und vom Sonnenkörper
// gelesen. Beide registrieren ihr Element hier; die Schleife schreibt die
// Transforms inline — kein zweiter rAF, keine Reaktivität je Frame. Der
// Treffer-Ruck lebt ebenfalls hier, damit Watcher in Komponenten ihn stossen
// können, ohne den Helm zu kennen.
import { shallowRef } from 'vue'
import {
  HELM_FOCUS_MAX_FRAC,
  HELM_SLIP_EPS_PX_S,
  HELM_SLIP_MAX_PX_S,
  HELM_WAKE_COURSE_EPS,
  HELM_WAKE_ROLL_GAIN,
  HELM_WAKE_SHIFT_PCT,
  HELM_WAKE_STRETCH,
  HELM_WAKE_TURN_TAU_SEC,
  JOLT_PROFILES,
  JOLT_VOID_PROFILES,
} from '@/config/constants'
import type { HelmMode } from '@/utils/orbit/flightHelm'
import {
  createJoltState,
  kickJolt,
  resetJolt,
  stepJolt,
  type JoltOut,
} from '@/utils/orbit/flightJolt'
import type { VoidRiftSeverity } from '@/types'

export const flightLive = {
  focusX: 0,
  focusY: 0,
  slipX: 0,
  slipY: 0,
  roll: 0,
  bank: 0,
  mode: 'cruise' as HelmMode,
  /** Kursversatz des Fluchtpunkts, auf −1..1 normiert — Drift, Helm UND Warp.
   *  `slipX/slipY` allein kennen den Warp nicht; dort stünde der Schweif still. */
  courseX: 0,
  courseY: 0,
  /** Schweifachse in rad, ENTWICKELT — ein roher atan2 sprang bei ±π um 360°. */
  wakeAngle: 0,
  /** Zucken des Körpers in Einheiten (−1,25..1,25). */
  bodyX: 0,
  /** Versatz der Gruppe in px (Wormhole-Anker) — additiv zum Jolt, nie in dessen Einheiten. */
  shiftX: 0,
  shiftY: 0,
  bodyY: 0,
}

const TAU = Math.PI * 2

function wrapPi(a: number): number {
  return a - TAU * Math.round(a / TAU)
}

/** Kurs des Frames aus dem Fluchtpunkt-Versatz in px — die EINE Quelle der
 *  Schweifrichtung. Der Schweif liegt ENTGEGEN der Nase, also nach aussen
 *  (Vorzeichenvertrag in `flightHelm.ts`). Ohne Kurs trägt der Slip die Achse,
 *  ohne beides hält der letzte Winkel: auf 0 zurückzuschnappen war ein Zucken. */
export function setFlightCourse(fx: number, fy: number, minEdge: number, dt: number): void {
  const max = HELM_FOCUS_MAX_FRAC * minEdge
  const cx = max > 0 ? Math.max(-1, Math.min(1, fx / max)) : 0
  const cy = max > 0 ? Math.max(-1, Math.min(1, fy / max)) : 0
  flightLive.courseX = cx
  flightLive.courseY = cy
  let target: number
  if (Math.hypot(cx, cy) >= HELM_WAKE_COURSE_EPS) target = Math.atan2(-cy, -cx)
  else if (Math.hypot(flightLive.slipX, flightLive.slipY) >= HELM_SLIP_EPS_PX_S)
    target = Math.atan2(flightLive.slipY, flightLive.slipX)
  else return
  // Gedämpft, nicht hart gesetzt: quert der Fokus die Mitte, kippt der rohe
  // Zielwinkel um 180° und der Kranz schlüge um.
  const ease = dt > 0 ? 1 - Math.exp(-dt / HELM_WAKE_TURN_TAU_SEC) : 1
  flightLive.wakeAngle += wrapPi(target - flightLive.wakeAngle) * ease
}

/** Wie weit der Kranz ausschlägt (0..1) — Kurs ODER Slip, je nachdem, was
 *  stärker trägt: der Warp erzeugt Kurs ohne Slip, ein Ruck Slip ohne Kurs. */
export function wakeStrength(): number {
  const course = Math.hypot(flightLive.courseX, flightLive.courseY)
  const slip = Math.hypot(flightLive.slipX, flightLive.slipY) / HELM_SLIP_MAX_PX_S
  return Math.min(1, Math.max(course, slip))
}

/* ── Treffer-Ruck ───────────────────────────────────────────────────────────── */

export type JoltKind = 'strike' | 'nova' | 'void' | 'volley' | 'hop' | 'launch'

const jolt = createJoltState()
/** Zählt je wirksamem Treffer hoch — der Blitz am Körper hängt daran (selten, daher reaktiv). */
export const flightHitSeq = shallowRef(0)

export function joltOut(): JoltOut {
  return jolt.out
}

/** Ein Treffer aus Richtung `fromAngle` (Bildschirmwinkel des Angreifers) stösst den Kurs weg. */
export function kickFlightJolt(
  kind: JoltKind,
  fromAngle: number,
  severity?: VoidRiftSeverity,
): boolean {
  const profile = kind === 'void' ? JOLT_VOID_PROFILES[severity ?? 'lesser'] : JOLT_PROFILES[kind]
  if (profile.strength <= 0 && profile.tremor <= 0) return false
  kickJolt(jolt, -Math.cos(fromAngle), -Math.sin(fromAngle), profile.strength, profile.tremor)
  flightHitSeq.value++
  return true
}

export function stepFlightJolt(dt: number): JoltOut {
  const o = stepJolt(jolt, dt)
  flightLive.bodyX = o.bodyX
  flightLive.bodyY = o.bodyY
  return o
}

export function resetFlightJolt(): void {
  resetJolt(jolt)
  flightLive.bodyX = 0
  flightLive.bodyY = 0
  flightLive.shiftX = 0
  flightLive.shiftY = 0
}

/* ── Follower ───────────────────────────────────────────────────────────────── */

const wakeFollowers = new Set<HTMLElement>()
const bodyFollowers = new Map<HTMLElement, number>()

export function registerWakeFollower(el: HTMLElement): void {
  wakeFollowers.add(el)
}

export function unregisterWakeFollower(el: HTMLElement): void {
  wakeFollowers.delete(el)
  el.style.transform = ''
}

export function registerBodyFollower(el: HTMLElement, ampPx: number): void {
  bodyFollowers.set(el, ampPx)
}

export function setBodyFollowerAmp(el: HTMLElement, ampPx: number): void {
  if (bodyFollowers.has(el)) bodyFollowers.set(el, ampPx)
}

export function unregisterBodyFollower(el: HTMLElement): void {
  bodyFollowers.delete(el)
  el.style.transform = ''
}

/** Prozent-Translate — braucht keine Grösse; der Kranz schwingt nach aussen.
 *  `rotate(angle)` legt seine kanonische +x-Keule (SUN_WAKE_TAIL_*) auf die
 *  Schweifachse; `scale` streckt danach entlang eben dieser Keule, die frühere
 *  Klammer `rotate(θ) … rotate(−θ)` entfällt damit. */
export function wakeFollowerTransform(strength: number, angle: number, roll: number): string {
  const k = Math.max(0, Math.min(1, strength))
  const shift = k * HELM_WAKE_SHIFT_PCT
  const tx = (Math.cos(angle) * shift).toFixed(2)
  const ty = (Math.sin(angle) * shift).toFixed(2)
  const deg = ((angle * 180) / Math.PI).toFixed(1)
  const stretch = k * HELM_WAKE_STRETCH
  const rollDeg = ((roll * HELM_WAKE_ROLL_GAIN * 180) / Math.PI).toFixed(2)
  return `translate(${tx}%,${ty}%) rotate(${rollDeg}deg) rotate(${deg}deg) scale(${(1 + stretch).toFixed(3)},${(1 - stretch / 2).toFixed(3)})`
}

/** Die Zentrierung bleibt im Transform — der Körper springt um seine Mitte. Der Shift (px)
 *  ist der Versatz der ganzen Gruppe im Wormhole, NICHT in Jolt-Einheiten. */
export function bodyFollowerTransform(
  ux: number,
  uy: number,
  ampPx: number,
  shiftX = 0,
  shiftY = 0,
): string {
  return `translate(calc(-50% + ${(ux * ampPx + shiftX).toFixed(1)}px),calc(-50% + ${(uy * ampPx + shiftY).toFixed(1)}px))`
}

/** Ohne `wert !== zuletzt`-Wächter: Blink verwirft identische Zuweisungen selbst. */
export function writeFlightFollowers(): void {
  if (wakeFollowers.size > 0) {
    const t = wakeFollowerTransform(wakeStrength(), flightLive.wakeAngle, flightLive.roll)
    for (const el of wakeFollowers) el.style.transform = t
  }
  for (const [el, amp] of bodyFollowers) {
    el.style.transform = bodyFollowerTransform(
      flightLive.bodyX,
      flightLive.bodyY,
      amp,
      flightLive.shiftX,
      flightLive.shiftY,
    )
  }
}

export function resetFlightLive(): void {
  flightLive.focusX = 0
  flightLive.focusY = 0
  flightLive.slipX = 0
  flightLive.slipY = 0
  flightLive.roll = 0
  flightLive.bank = 0
  flightLive.mode = 'cruise'
  flightLive.courseX = 0
  flightLive.courseY = 0
  flightLive.wakeAngle = 0
  resetFlightJolt()
  for (const el of wakeFollowers) el.style.transform = ''
  for (const el of bodyFollowers.keys()) el.style.transform = ''
}

/** Griffe der Vollbild-Instanz für den Messtreiber (`__bardle.flight`). */
export interface SkyDebug {
  spawn: (kind: string) => void
  cluster: (kind: string) => void
  clusters: () => unknown
  evade: (awayFromAngle: number, strength: number) => boolean
  helm: () => unknown
  sky: () => unknown
}
let skyDebug: SkyDebug | null = null
export function registerSkyDebug(d: SkyDebug | null): void {
  skyDebug = d
}
export function getSkyDebug(): SkyDebug | null {
  return skyDebug
}
