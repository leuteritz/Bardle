import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useShopStore } from '@/stores/economy/shopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { CHIMES_PER_CLICK_BASE, SOLAR_CPS_PER_LEVEL, SOLAR_CPC_PER_LEVEL } from '@/config/constants'

/**
 * Der Store rechnet, er besitzt nichts mehr.
 *
 * Hier standen bis zum Umbau die sechs Chime-Gebäude samt Preiskurve,
 * Stapelkauf und Meilenstein-Verdopplung. Sie hatten seit dem Star-Forge-Umbau
 * keine Oberfläche mehr — `buyUpgrade()` besass keinen einzigen Aufrufer, und
 * jede Stufe stand in jedem Spielstand auf 0. Der einzige Summand der
 * Wirtschaft ist seither der Solar Ray „Chimes/Sec", und genau das prüft diese
 * Datei nach.
 */
describe('shopStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('calculateTotalCPS', () => {
    it('ohne einen einzigen Strahl genau 0', () => {
      expect(useShopStore().calculateTotalCPS()).toBe(0)
    })

    it('der Chimes/Sec-Strahl ist der eine Summand', () => {
      const store = useShopStore()
      useSolarUpgradeStore().chimesPerSecondLevel = 5
      expect(store.calculateTotalCPS()).toBe(5 * SOLAR_CPS_PER_LEVEL)
    })

    it('wächst linear mit der Strahlenstufe', () => {
      const store = useShopStore()
      const solar = useSolarUpgradeStore()
      solar.chimesPerSecondLevel = 3
      const three = store.calculateTotalCPS()
      solar.chimesPerSecondLevel = 6
      expect(store.calculateTotalCPS()).toBe(three * 2)
    })
  })

  describe('calculateTotalCPC', () => {
    it('ohne Upgrades genau CHIMES_PER_CLICK_BASE', () => {
      // Aus der Konstante gelesen statt abgeschrieben: der Startwert ist eine
      // Balance-Groesse (zuletzt 20 -> 1, damit die erste Stufe eine
      // Verdopplung ist statt fuenf Prozent) und darf wandern.
      expect(useShopStore().calculateTotalCPC()).toBe(CHIMES_PER_CLICK_BASE)
    })

    it('der Chimes/Click-Strahl addiert seinen Betrag je Stufe', () => {
      const store = useShopStore()
      useSolarUpgradeStore().chimesPerClickLevel = 5
      expect(store.calculateTotalCPC()).toBe(CHIMES_PER_CLICK_BASE + 5 * SOLAR_CPC_PER_LEVEL)
    })

    it('die erste Stufe ist spuerbar, nicht kosmetisch', () => {
      // Der eigentliche Grund fuer die Absenkung des Startwerts: bei 20 war
      // Stufe 1 ein Zuwachs von fuenf Prozent und damit unsichtbar.
      const store = useShopStore()
      const before = store.calculateTotalCPC()
      useSolarUpgradeStore().chimesPerClickLevel = 1
      expect(store.calculateTotalCPC()).toBeGreaterThanOrEqual(before * 1.5)
    })
  })

  describe('refreshRates', () => {
    it('schreibt beide Raten in den gameStore und den CpS-Tracker', () => {
      const store = useShopStore()
      const solar = useSolarUpgradeStore()
      solar.chimesPerSecondLevel = 4
      solar.chimesPerClickLevel = 2
      store.refreshRates()
      // Die Rechnung ist dieselbe wie oben — geprueft wird, dass sie ANKOMMT.
      expect(store.calculateTotalCPS()).toBe(4 * SOLAR_CPS_PER_LEVEL)
      expect(store.calculateTotalCPC()).toBe(CHIMES_PER_CLICK_BASE + 2 * SOLAR_CPC_PER_LEVEL)
    })
  })
})
