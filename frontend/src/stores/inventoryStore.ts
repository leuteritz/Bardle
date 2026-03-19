import { defineStore } from 'pinia'
import { MATERIALS } from '../config/materials'
import type { Material } from '../types'

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    collectedMaterials: {} as Record<string, number>,
  }),

  actions: {
    addMaterial(materialId: string): void {
      this.collectedMaterials[materialId] = (this.collectedMaterials[materialId] ?? 0) + 1
    },

    tryDropSpecificMaterial(materialId: string, dropChance: number): boolean {
      if (Math.random() > dropChance) return false
      this.addMaterial(materialId)
      return true
    },

    tryDropMaterial(baseDropChance = 0.30): Material | null {
      if (Math.random() > baseDropChance) return null

      const total = MATERIALS.reduce((sum, m) => sum + m.dropChance, 0)
      let roll = Math.random() * total
      for (const material of MATERIALS) {
        roll -= material.dropChance
        if (roll <= 0) {
          this.addMaterial(material.id)
          return material
        }
      }
      // Fallback: last material
      const last = MATERIALS[MATERIALS.length - 1]
      this.addMaterial(last.id)
      return last
    },
  },
})
