import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { SHOP_ITEMS, getItemById } from '../config/items'
import type { SlotEquipment, ItemCategory } from '../types'

function emptySlotEquipment(): SlotEquipment {
  return { weapon: null, armor: null, misc: null }
}

export const useItemStore = defineStore('item', {
  state: () => ({
    ownedItems: {} as Record<string, number>,
    slotEquipment: [
      emptySlotEquipment(),
      emptySlotEquipment(),
      emptySlotEquipment(),
      emptySlotEquipment(),
    ] as [SlotEquipment, SlotEquipment, SlotEquipment, SlotEquipment],
  }),

  getters: {
    availableCount: (state) => {
      return (itemId: string): number => {
        const owned = state.ownedItems[itemId] ?? 0
        let equipped = 0
        for (const slot of state.slotEquipment) {
          if (slot.weapon === itemId) equipped++
          if (slot.armor === itemId) equipped++
          if (slot.misc === itemId) equipped++
        }
        return owned - equipped
      }
    },
  },

  actions: {
    buyItem(itemId: string): boolean {
      const item = getItemById(itemId)
      if (!item) return false

      const gameStore = useGameStore()
      if (gameStore.chimes < item.price) return false

      gameStore.chimes -= item.price
      this.ownedItems[itemId] = (this.ownedItems[itemId] ?? 0) + 1
      return true
    },

    equipItem(slotIndex: number, itemId: string): boolean {
      if (slotIndex < 0 || slotIndex > 3) return false

      const item = getItemById(itemId)
      if (!item) return false

      if (this.availableCount(itemId) <= 0) return false

      const category = item.category as ItemCategory
      this.slotEquipment[slotIndex][category] = itemId
      return true
    },

    unequipItem(slotIndex: number, category: ItemCategory) {
      if (slotIndex < 0 || slotIndex > 3) return
      this.slotEquipment[slotIndex][category] = null
    },

    getEquippedItems(slotIndex: number) {
      if (slotIndex < 0 || slotIndex > 3) return emptySlotEquipment()
      return this.slotEquipment[slotIndex]
    },
  },
})
