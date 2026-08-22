// Das Offline-Fenster: was eine Abwesenheit einbringt und wie es aufgeht.
//
// Die EINE Fassung dieser Rechnung. Sie hat zwei Aufrufer — den Ladevorgang
// (usePersistence) und den Admin-Knopf. Eine zweite Kopie würde Zahlen zeigen,
// die kein echter Offline-Zeitraum je ergibt.

import { useGameStore } from '@/stores/core/gameStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { usePlanetShopStore } from '@/stores/world/planetShopStore'
import {
  OFFLINE_CPS_RATE,
  OFFLINE_MAX_HOURS,
  OFFLINE_MIN_SECONDS,
  SECONDS_PER_HOUR,
} from '@/config/constants'

/** Obergrenze der Abwesenheit in Sekunden, inklusive Forge- und Baum-Bonus. */
export function offlineWindowCapSeconds(): number {
  const starForgeStore = useStarForgeStore()
  const meepTreeStore = useMeepTreeStore()
  const hours =
    OFFLINE_MAX_HOURS + starForgeStore.offlineMaxHoursBonus + meepTreeStore.fx.offlineMaxHoursBonus
  return hours * SECONDS_PER_HOUR
}

/** Was `rawSeconds` Abwesenheit einbringen — gedeckelte Dauer und Chimes. */
export function offlineWindowEarnings(rawSeconds: number): { seconds: number; chimes: number } {
  const gameStore = useGameStore()
  const starForgeStore = useStarForgeStore()
  const meepTreeStore = useMeepTreeStore()
  const planetShopStore = usePlanetShopStore()

  const seconds = Math.min(rawSeconds, offlineWindowCapSeconds())
  const offlineMul =
    planetShopStore.planetOfflineBoostMultiplier *
    starForgeStore.offlineEarningsMult *
    meepTreeStore.fx.offlineEarningsMult

  return {
    seconds,
    chimes: Math.floor(gameStore.chimesPerSecond * OFFLINE_CPS_RATE * offlineMul * seconds),
  }
}

/**
 * Schreibt das Fenster in den gameStore und öffnet es. `false`, wenn die
 * Abwesenheit unter `OFFLINE_MIN_SECONDS` liegt — dann bleibt alles unberührt.
 *
 * `minChimes` ist der Notnagel des Admin-Knopfs: auf einem frischen Spielstand
 * ist `chimesPerSecond` 0, und das Fenster zeigte dann den Leerzustand statt
 * der Tore. Im Ladeweg bleibt er 0.
 */
export function openOfflineWindow(rawSeconds: number, minChimes = 0): boolean {
  const { seconds, chimes } = offlineWindowEarnings(rawSeconds)
  if (seconds < OFFLINE_MIN_SECONDS) return false

  const gameStore = useGameStore()
  const earned = Math.max(chimes, minChimes)
  gameStore.offlineChimes = earned
  gameStore.offlineSeconds = seconds
  gameStore.totalOfflineChimes += earned
  gameStore.totalOfflineSeconds += seconds
  gameStore.showOfflineModal = true
  return true
}
