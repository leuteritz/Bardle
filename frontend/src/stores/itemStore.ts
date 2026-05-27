import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'
import { useShopStore } from './shopStore'
import { SHOP_ITEMS, getItemById } from '../config/items'
import { ITEM_SETS } from '../config/sets'
import type { SlotEquipment, ItemCategory, ItemSetBonus } from '../types'

function emptySlotEquipment(): SlotEquipment {
  return { weapon: null, armor: null, artefact: null }
}

export const useItemStore = defineStore('item', {
  state: () => ({
    ownedItems: {} as Record<string, number>,
    slotEquipment: [
      emptySlotEquipment(),
      emptySlotEquipment(),
      emptySlotEquipment(),
      emptySlotEquipment(),
      emptySlotEquipment(),
    ] as [SlotEquipment, SlotEquipment, SlotEquipment, SlotEquipment, SlotEquipment],
  }),

  getters: {
    availableCount: (state) => {
      return (itemId: string): number => {
        const owned = state.ownedItems[itemId] ?? 0
        let equipped = 0
        for (const slot of state.slotEquipment) {
          if (slot.weapon === itemId) equipped++
          if (slot.armor === itemId) equipped++
          if (slot.artefact === itemId) equipped++
        }
        return owned - equipped
      }
    },

    activeSetBonuses: (state): ItemSetBonus[] => {
      const activeSetIds = new Set<string>()
      for (const slot of state.slotEquipment) {
        const wSetId = slot.weapon ? getItemById(slot.weapon)?.setId : undefined
        const aSetId = slot.armor ? getItemById(slot.armor)?.setId : undefined
        const mSetId = slot.artefact ? getItemById(slot.artefact)?.setId : undefined
        if (wSetId && wSetId === aSetId && aSetId === mSetId) {
          activeSetIds.add(wSetId)
        }
      }
      return ITEM_SETS.filter((s) => activeSetIds.has(s.setId))
    },

    totalCPSMultiplier(): number {
      let mul = 1
      for (const slot of this.slotEquipment) {
        for (const itemId of [slot.weapon, slot.armor, slot.artefact]) {
          if (!itemId) continue
          const item = getItemById(itemId)
          if (item?.effects.cpsMultiplier) mul *= item.effects.cpsMultiplier
        }
      }
      for (const bonus of this.activeSetBonuses) {
        if (bonus.bonusEffect.cpsMultiplier) mul *= bonus.bonusEffect.cpsMultiplier
      }
      return mul
    },

    totalPowerMultiplier(): number {
      let mul = 1
      for (const slot of this.slotEquipment) {
        for (const itemId of [slot.weapon, slot.armor, slot.artefact]) {
          if (!itemId) continue
          const item = getItemById(itemId)
          if (item?.effects.powerMultiplier) mul *= item.effects.powerMultiplier
        }
      }
      for (const bonus of this.activeSetBonuses) {
        if (bonus.bonusEffect.powerMultiplier) mul *= bonus.bonusEffect.powerMultiplier
      }
      return mul
    },
  },

  actions: {
    buyItem(itemId: string): boolean {
      const item = getItemById(itemId)
      if (!item) return false

      const gameStore = useGameStore()
      const inventoryStore = useInventoryStore()

      if (gameStore.chimes < item.price) return false
      if (item.materialCost && !inventoryStore.hasMaterials(item.materialCost)) return false

      gameStore.chimes -= item.price
      if (item.materialCost) inventoryStore.removeMaterials(item.materialCost)
      this.ownedItems[itemId] = (this.ownedItems[itemId] ?? 0) + 1
      return true
    },

    equipItem(slotIndex: number, itemId: string): boolean {
      if (slotIndex < 0 || slotIndex > 4) return false

      const item = getItemById(itemId)
      if (!item) return false

      if (this.availableCount(itemId) <= 0) return false

      const category = item.category as ItemCategory
      this.slotEquipment[slotIndex][category] = itemId
      this._recalculateCPS()
      return true
    },

    unequipItem(slotIndex: number, category: ItemCategory) {
      if (slotIndex < 0 || slotIndex > 4) return
      this.slotEquipment[slotIndex][category] = null
      this._recalculateCPS()
    },

    adminFillRandomEquipment(): void {
      const categories: ItemCategory[] = ['weapon', 'armor', 'artefact']
      for (let i = 0; i < 5; i++) {
        for (const cat of categories) {
          const pool = SHOP_ITEMS.filter((item) => item.category === cat)
          if (!pool.length) continue
          const pick = pool[Math.floor(Math.random() * pool.length)]
          this.slotEquipment[i][cat] = pick.id
        }
      }
      this._recalculateCPS()
    },

    _recalculateCPS() {
      const shopStore = useShopStore()
      const gameStore = useGameStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
    },
  },
})
