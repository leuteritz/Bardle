import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useShopStore } from '../../stores/shopStore'

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
})
