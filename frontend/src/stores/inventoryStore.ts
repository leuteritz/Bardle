import { defineStore } from 'pinia'
import { MATERIALS } from '../config/materials'
import type { Material } from '../types'
import { logger } from '../utils/logger'
import { MATERIAL_DROP_BASE_CHANCE } from '../config/constants'
import { useStarForgeStore } from './starForgeStore'

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    collectedMaterials: {} as Record<string, number>,
  }),

  actions: {
    addMaterial(materialId: string): void {
      this.collectedMaterials[materialId] = (this.collectedMaterials[materialId] ?? 0) + 1
      logger.debug('Inventory', `+1 ${materialId}`, { total: this.collectedMaterials[materialId] })
    },

    tryDropSpecificMaterial(materialId: string, dropChance: number): boolean {
      if (Math.random() > dropChance) return false
      this.addMaterial(materialId)
      return true
    },

    hasMaterials(costs: Record<string, number>): boolean {
      return Object.entries(costs).every(
        ([matId, qty]) => (this.collectedMaterials[matId] ?? 0) >= qty,
      )
    },

    removeMaterials(costs: Record<string, number>): boolean {
      if (!this.hasMaterials(costs)) return false
      for (const [matId, qty] of Object.entries(costs)) {
        this.collectedMaterials[matId] -= qty
      }
      logger.info('Inventory', 'Materials spent', costs)
      return true
    },

    tryDropMaterial(baseDropChance = MATERIAL_DROP_BASE_CHANCE): Material | null {
      // Comet Miner (Star Forge): boosts the drop chance
      const forge = useStarForgeStore()
      if (Math.random() > baseDropChance * forge.materialDropMult) return null

      const total = MATERIALS.reduce((sum, m) => sum + m.dropChance, 0)
      let roll = Math.random() * total
      let dropped: Material | null = null
      for (const material of MATERIALS) {
        roll -= material.dropChance
        if (roll <= 0) {
          dropped = material
          break
        }
      }
      // Fallback: last material
      if (!dropped) dropped = MATERIALS[MATERIALS.length - 1]
      // Prospector's Song (Star Forge): every drop grants extra materials
      for (let i = 0; i < 1 + forge.extraDropCount; i++) {
        this.addMaterial(dropped.id)
      }
      return dropped
    },
  },
})
