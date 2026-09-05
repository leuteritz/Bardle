// Flüchtiger Kurs-Zustand ausserhalb von Pinia (wie liveState.ts): pro Frame
// von der Sternfeld-Schleife geschrieben, vom Schweif und vom Sonnenkörper
// gelesen. Beide registrieren ihr Element hier; die Schleife schreibt die
// Transforms inline — kein zweiter rAF, keine Reaktivität je Frame. Der
// Treffer-Ruck lebt ebenfalls hier, damit Watcher in Komponenten ihn stossen
// können, ohne den Helm zu kennen.
import { shallowRef } from 'vue'
import {
  HELM_SLIP_MAX_PX_S,
  HELM_WAKE_ROLL_GAIN,
  HELM_WAKE_SHIFT_PCT,
  HELM_WAKE_STRETCH,
  JOLT_PROFILES,
  JOLT_VOID_PROFILES,
} from '@/config/constants'
import type { HelmMode } from '@/utils/orbit/flightHelm'
import { createJoltState, kickJolt, resetJolt, stepJolt, type JoltOut } from '@/utils/orbit/flightJolt'
import type { VoidRiftSeverity } from '@/types'

export const flightLive = {
  focusX: 0,
  focusY: 0,
  slipX: 0,
  slipY: 0,
  roll: 0,
  bank: 0,
  mode: 'cruise' as HelmMode,
  /** Zucken des Körpers in Einheiten (−1,25..1,25). */
  bodyX: 0,
  bodyY: 0,
}

/* ── Treffer-Ruck ───────────────────────────────────────────────────────────── */

export type JoltKind = 'strike' | 'nova' | 'void' | 'volley'

const jolt = createJoltState()
/** Zählt je wirksamem Treffer hoch — der Blitz am Körper hängt daran (selten, daher reaktiv). */
export const flightHitSeq = shallowRef(0)

export function joltOut(): JoltOut {
  return jolt.out
}

/** Ein Treffer aus Richtung `fromAngle` (Bildschirmwinkel des Angreifers) stösst den Kurs weg. */
export function kickFlightJolt(kind: JoltKind, fromAngle: number, severity?: VoidRiftSeverity): boolean {
  const profile =
    kind === 'void' ? JOLT_VOID_PROFILES[severity ?? 'lesser'] : JOLT_PROFILES[kind]
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

/** Prozent-Translate — braucht keine Grösse; der Kranz schwingt mit dem Feld nach aussen. */
export function wakeFollowerTransform(slipX: number, slipY: number, roll: number): string {
  const k = Math.min(1, Math.hypot(slipX, slipY) / HELM_SLIP_MAX_PX_S)
  const tx = ((slipX / HELM_SLIP_MAX_PX_S) * HELM_WAKE_SHIFT_PCT).toFixed(2)
  const ty = ((slipY / HELM_SLIP_MAX_PX_S) * HELM_WAKE_SHIFT_PCT).toFixed(2)
  const theta = ((Math.atan2(slipY, slipX) * 180) / Math.PI).toFixed(1)
  const stretch = k * HELM_WAKE_STRETCH
  const rollDeg = ((roll * HELM_WAKE_ROLL_GAIN * 180) / Math.PI).toFixed(2)
  return `translate(${tx}%,${ty}%) rotate(${rollDeg}deg) rotate(${theta}deg) scale(${(1 + stretch).toFixed(3)},${(1 - stretch / 2).toFixed(3)}) rotate(${-theta}deg)`
}

/** Die Zentrierung bleibt im Transform — der Körper springt um seine Mitte. */
export function bodyFollowerTransform(ux: number, uy: number, ampPx: number): string {
  return `translate(calc(-50% + ${(ux * ampPx).toFixed(1)}px),calc(-50% + ${(uy * ampPx).toFixed(1)}px))`
}

/** Ohne `wert !== zuletzt`-Wächter: Blink verwirft identische Zuweisungen selbst. */
export function writeFlightFollowers(): void {
  if (wakeFollowers.size > 0) {
    const t = wakeFollowerTransform(flightLive.slipX, flightLive.slipY, flightLive.roll)
    for (const el of wakeFollowers) el.style.transform = t
  }
  for (const [el, amp] of bodyFollowers) {
    el.style.transform = bodyFollowerTransform(flightLive.bodyX, flightLive.bodyY, amp)
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
  resetFlightJolt()
  for (const el of wakeFollowers) el.style.transform = ''
  for (const el of bodyFollowers.keys()) el.style.transform = ''
}

/** Griffe der Vollbild-Instanz für den Messtreiber (`__bardle.flight`). */
export interface SkyDebug {
  spawn: (kind: string) => void
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
