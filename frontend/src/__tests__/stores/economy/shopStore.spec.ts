import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useShopStore, buildingMilestoneMultiplier } from '@/stores/economy/shopStore'
import {
  BUILDING_MILESTONE_INTERVAL,
  BUILDING_MILESTONE_MULT,
  CHIMES_PER_CLICK_BASE,
} from '@/config/constants'

describe('shopStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ─── getUpgradeCost ───────────────────────────────────────────────────────────

  // Die Basispreise sind eine Balance-Groesse — sie wurden zuletzt zusammen mit
  // CHIMES_PER_CLICK_BASE (20 -> 1) um Faktor 5 gesenkt. Die Spec prueft deshalb
  // die FORMEL gegen den Katalog, nicht abgeschriebene Zahlen.
  describe('getUpgradeCost (geometrisch ueber baseCost)', () => {
    const tower = () => useShopStore().shopUpgrades.find((u) => u.id === 'glockenturm')!

    it('level=0 kostet genau baseCost', () => {
      const store = useShopStore()
      const g = tower()
      expect(store.getUpgradeCost(g)).toBe(g.baseCost)
    })

    it('jede Stufe kostet costMultiplier mal die vorige', () => {
      const store = useShopStore()
      const g = tower()
      for (const level of [1, 10]) {
        g.level = level
        expect(store.getUpgradeCost(g)).toBe(
          Math.ceil(g.baseCost * Math.pow(g.costMultiplier, level)),
        )
      }
    })

    it('waechst streng monoton', () => {
      const store = useShopStore()
      const g = tower()
      let prev = 0
      for (const level of [0, 1, 2, 5, 10]) {
        g.level = level
        const cost = store.getUpgradeCost(g)
        expect(cost).toBeGreaterThan(prev)
        prev = cost
      }
    })
  })

  // ─── getTotalUpgradeCost ─────────────────────────────────────────────────────

  describe('getTotalUpgradeCost', () => {
    it('buyAmount=1 equals getUpgradeCost', () => {
      const store = useShopStore()
      store.buyAmount = 1
      const glockenturm = store.shopUpgrades.find((u) => u.id === 'glockenturm')!
      expect(store.getTotalUpgradeCost(glockenturm)).toBe(store.getUpgradeCost(glockenturm))
    })

    it('buyAmount=3 summiert die drei naechsten Stufenpreise', () => {
      const store = useShopStore()
      store.buyAmount = 3
      const g = store.shopUpgrades.find((u) => u.id === 'glockenturm')!
      const expected = [0, 1, 2].reduce(
        (sum, step) => sum + Math.ceil(g.baseCost * Math.pow(g.costMultiplier, g.level + step)),
        0,
      )
      expect(store.getTotalUpgradeCost(g)).toBe(expected)
    })
  })

  // ─── calculateTotalCPS ───────────────────────────────────────────────────────

  describe('calculateTotalCPS', () => {
    it('all buildings level=0 → 0', () => {
      const store = useShopStore()
      expect(store.calculateTotalCPS()).toBe(0)
    })

    it('Glockenturm level=5 → 5 (baseCPS=1, no multipliers)', () => {
      const store = useShopStore()
      const glockenturm = store.shopUpgrades.find((u) => u.id === 'glockenturm')!
      glockenturm.level = 5
      expect(store.calculateTotalCPS()).toBe(5)
    })

    it('multiple buildings: Glockenturm lvl=5 + Klanggenerator lvl=2 → 11', () => {
      const store = useShopStore()
      const glockenturm = store.shopUpgrades.find((u) => u.id === 'glockenturm')!
      const klanggenerator = store.shopUpgrades.find((u) => u.id === 'klanggenerator')!
      glockenturm.level = 5 // baseCPS=1 → 1*5=5
      klanggenerator.level = 2 // baseCPS=3 → 3*2=6
      // total: floor((5+6) * 1 * 1) = 11
      expect(store.calculateTotalCPS()).toBe(11)
    })
  })

  // ─── calculateTotalCPC ───────────────────────────────────────────────────────

  describe('calculateTotalCPC', () => {
    it('ohne Upgrades genau CHIMES_PER_CLICK_BASE', () => {
      // Aus der Konstante gelesen statt abgeschrieben: der Startwert ist eine
      // Balance-Groesse (zuletzt 20 -> 1, damit die erste Klicker-Stufe eine
      // Verdopplung ist statt fuenf Prozent) und darf wandern.
      const store = useShopStore()
      expect(store.calculateTotalCPC()).toBe(CHIMES_PER_CLICK_BASE)
    })

    it('das Klicker-Gebaeude addiert seinen baseCPC je Stufe', () => {
      const store = useShopStore()
      const klicker = store.shopUpgrades.find((u) => u.id === 'chimeClicker')!
      klicker.level = 5
      expect(store.calculateTotalCPC()).toBe(CHIMES_PER_CLICK_BASE + 5 * (klicker.baseCPC ?? 0))
    })

    it('die erste Klicker-Stufe ist spuerbar, nicht kosmetisch', () => {
      // Der eigentliche Grund fuer die Absenkung des Startwerts: bei 20 war
      // Stufe 1 ein Zuwachs von fuenf Prozent und damit unsichtbar.
      const store = useShopStore()
      const before = store.calculateTotalCPC()
      const klicker = store.shopUpgrades.find((u) => u.id === 'chimeClicker')!
      klicker.level = 1
      expect(store.calculateTotalCPC()).toBeGreaterThanOrEqual(before * 1.5)
    })
  })

  // ─── Gebäude-Meilensteine ─────────────────────────────────────────────────
  // Der Ertrag war streng linear, die Kosten geometrisch — daraus folgt eine
  // CpS, die nur logarithmisch mit den Ausgaben wächst. Gemessen trugen alle
  // sechs Gebäude zusammen rund 1000 von 2,6e7 CpS bei; Gebäudekauf war im
  // Spätspiel keine Entscheidung mehr.
  describe('buildingMilestoneMultiplier', () => {
    it('lässt die Stufen vor dem ersten Meilenstein unangetastet', () => {
      for (let level = 0; level < BUILDING_MILESTONE_INTERVAL; level++) {
        expect(buildingMilestoneMultiplier(level)).toBe(1)
      }
    })

    it('verdoppelt an jedem Meilenstein', () => {
      expect(buildingMilestoneMultiplier(BUILDING_MILESTONE_INTERVAL)).toBe(BUILDING_MILESTONE_MULT)
      expect(buildingMilestoneMultiplier(BUILDING_MILESTONE_INTERVAL * 3)).toBe(
        BUILDING_MILESTONE_MULT ** 3,
      )
    })

    it('wächst langsamer als die Kosten — die Wand bleibt eine Wand', () => {
      // Der Punkt der Meilensteine ist NICHT mehr CpS, sondern ein Sparziel.
      // Wenn der Ertrag je Stufenblock schneller stiege als der Preis, wäre die
      // Wirtschaft offen und alles andere im Spiel bedeutungslos.
      const store = useShopStore()
      for (const upgrade of store.shopUpgrades) {
        const costFactor = upgrade.costMultiplier ** BUILDING_MILESTONE_INTERVAL
        const yieldFactor =
          ((BUILDING_MILESTONE_INTERVAL * 2) / BUILDING_MILESTONE_INTERVAL) *
          BUILDING_MILESTONE_MULT
        expect(costFactor).toBeGreaterThan(yieldFactor)
      }
    })

    it('greift in calculateTotalCPS', () => {
      const store = useShopStore()
      const tower = store.shopUpgrades.find((u) => u.id === 'glockenturm')!
      tower.level = BUILDING_MILESTONE_INTERVAL
      const withMilestone = store.calculateTotalCPS()

      tower.level = BUILDING_MILESTONE_INTERVAL - 1
      const without = store.calculateTotalCPS()

      // Eine Stufe mehr, aber der Sprung ist grösser als eine Stufe.
      expect(withMilestone).toBeGreaterThan(without * 1.5)
    })
  })
})
