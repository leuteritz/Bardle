// Flüchtiger Kurs-Zustand ausserhalb von Pinia (wie liveState.ts): pro Frame
// von der Sternfeld-Schleife geschrieben, vom Schweif gelesen. Der Schweif
// registriert sein Element hier; die Schleife schreibt den Transform inline —
// kein zweiter rAF, keine Reaktivität je Frame.
import { HELM_SLIP_MAX_PX_S, HELM_WAKE_ROLL_GAIN, HELM_WAKE_SHIFT_PCT, HELM_WAKE_STRETCH } from '@/config/constants'
import type { HelmMode } from '@/utils/orbit/flightHelm'

export const flightLive = {
  focusX: 0,
  focusY: 0,
  slipX: 0,
  slipY: 0,
  roll: 0,
  bank: 0,
  mode: 'cruise' as HelmMode,
}

const followers = new Set<HTMLElement>()

export function registerWakeFollower(el: HTMLElement): void {
  followers.add(el)
}

export function unregisterWakeFollower(el: HTMLElement): void {
  followers.delete(el)
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

/** Ohne `wert !== zuletzt`-Wächter: Blink verwirft identische Zuweisungen selbst. */
export function writeWakeFollowers(): void {
  if (followers.size === 0) return
  const t = wakeFollowerTransform(flightLive.slipX, flightLive.slipY, flightLive.roll)
  for (const el of followers) el.style.transform = t
}

export function resetFlightLive(): void {
  flightLive.focusX = 0
  flightLive.focusY = 0
  flightLive.slipX = 0
  flightLive.slipY = 0
  flightLive.roll = 0
  flightLive.bank = 0
  flightLive.mode = 'cruise'
  for (const el of followers) el.style.transform = ''
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
