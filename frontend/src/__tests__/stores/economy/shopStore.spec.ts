import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useShopStore, buildingMilestoneMultiplier } from '@/stores/economy/shopStore'
import { BUILDING_MILESTONE_INTERVAL, BUILDING_MILESTONE_MULT } from '@/config/constants'

describe('shopStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ─── getUpgradeCost ───────────────────────────────────────────────────────────

  describe('getUpgradeCost (Glockenturm: baseCost=25, mul=1.15)', () => {
    it('level=0 → 25', () => {
      const store = useShopStore()
      const glockenturm = store.shopUpgrades.find((u) => u.id === 'glockenturm')!
      expect(store.getUpgradeCost(glockenturm)).toBe(25)
    })

    it('level=1 → 29 (ceil(25*1.15))', () => {
      const store = useShopStore()
      const glockenturm = store.shopUpgrades.find((u) => u.id === 'glockenturm')!
      glockenturm.level = 1
      expect(store.getUpgradeCost(glockenturm)).toBe(29)
    })

    it('level=10 → 102 (ceil(25*1.15^10))', () => {
      const store = useShopStore()
      const glockenturm = store.shopUpgrades.find((u) => u.id === 'glockenturm')!
      glockenturm.level = 10
      expect(store.getUpgradeCost(glockenturm)).toBe(102)
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

    it('buyAmount=3, level=0 → sum of levels 0+1+2 costs (25+29+34=88)', () => {
      const store = useShopStore()
      store.buyAmount = 3
      const glockenturm = store.shopUpgrades.find((u) => u.id === 'glockenturm')!
      // level 0: ceil(25 * 1.15^0) = 25
      // level 1: ceil(25 * 1.15^1) = 29
      // level 2: ceil(25 * 1.15^2) = ceil(33.0625) = 34
      expect(store.getTotalUpgradeCost(glockenturm)).toBe(88)
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
    it('no upgrades → 20 (baseChimesPerClick)', () => {
      const store = useShopStore()
      expect(store.calculateTotalCPC()).toBe(20)
    })

    it('Klicker level=5 → 25 (floor((20 + 1*5) * 1 * 1))', () => {
      const store = useShopStore()
      const klicker = store.shopUpgrades.find((u) => u.id === 'chimeClicker')!
      klicker.level = 5 // baseCPC=1
      expect(store.calculateTotalCPC()).toBe(25)
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
