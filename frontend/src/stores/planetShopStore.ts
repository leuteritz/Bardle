// frontend/src/stores/planetShopStore.ts
import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useShopStore } from './shopStore'
import { useInventoryStore } from './inventoryStore'
import { logger } from '../utils/logger'
import { PLANET_SLOT_ORBITS, PLANET_HARVEST_INTERVAL_TICKS } from '@/config/constants'

export type PlanetRoleType =
  | 'turret_planet'
  | 'harvest_node'
  | 'expedition_relay'
  | 'shield_barrier'
  | 'time_capsule'
  | 'resonance_tower'

export interface PlanetRole {
  id: PlanetRoleType
  name: string
  bonusType:
    | 'auto_attack_dps'
    | 'material_harvest_rate'
    | 'expedition_reward_multiplier'
    | 'boss_damage_reduction'
    | 'offline_boost'
    | 'building_cps_multiplier'
  bonusPerSlot: number
  icon: string
  color: string
  image: string // ← NEU
}

export interface PlanetSlot {
  id: string
  purchased: boolean
  role: PlanetRoleType | null
  orbitRadiusX: number
  orbitRadiusY: number
  tiltDeg: number
  baseSpeed: number
  direction: 1 | -1
  baseCost: number
  slotConfig?: { materialId?: string; buildingId?: string }
}

export const PLANET_ROLES: Record<PlanetRoleType, PlanetRole> = {
  turret_planet: {
    id: 'turret_planet',
    name: 'Geschütz-Planet',
    bonusType: 'auto_attack_dps',
    bonusPerSlot: 2,
    icon: '🎯',
    color: '#cc4444',
    image: '/img/planets/planet1.png', // ← NEU
  },
  harvest_node: {
    id: 'harvest_node',
    name: 'Ernte-Knoten',
    bonusType: 'material_harvest_rate',
    bonusPerSlot: 1,
    icon: '🌾',
    color: '#80c840',
    image: '/img/planets/planet2.png', // ← NEU
  },
  expedition_relay: {
    id: 'expedition_relay',
    name: 'Expeditions-Relais',
    bonusType: 'expedition_reward_multiplier',
    bonusPerSlot: 0.3,
    icon: '🚀',
    color: '#40a0e0',
    image: '/img/planets/planet3.png', // ← NEU
  },
  shield_barrier: {
    id: 'shield_barrier',
    name: 'Schild-Barriere',
    bonusType: 'boss_damage_reduction',
    bonusPerSlot: 0.15,
    icon: '🛡️',
    color: '#60a0ff',
    image: '/img/planets/planet4.png', // ← NEU
  },
  time_capsule: {
    id: 'time_capsule',
    name: 'Zeitkapsel',
    bonusType: 'offline_boost',
    bonusPerSlot: 0.25,
    icon: '⏳',
    color: '#40c080',
    image: '/img/planets/planet5.png', // ← NEU
  },
  resonance_tower: {
    id: 'resonance_tower',
    name: 'Resonanz-Turm',
    bonusType: 'building_cps_multiplier',
    bonusPerSlot: 0.25,
    icon: '🏗️',
    color: '#c09040',
    image: '/img/planets/planet6.png', // ← NEU
  },
}

export const PLANET_ROLES_LIST: PlanetRole[] = Object.values(PLANET_ROLES)

const SLOT_CONFIG = [
  { id: 'slot_1', direction: 1 as const, baseSpeed: 0.00018, baseCost: 500 },
  { id: 'slot_2', direction: -1 as const, baseSpeed: 0.00014, baseCost: 2000 },
  { id: 'slot_3', direction: 1 as const, baseSpeed: 0.0001, baseCost: 8000 },
  { id: 'slot_4', direction: -1 as const, baseSpeed: 0.00007, baseCost: 35000 },
  { id: 'slot_5', direction: 1 as const, baseSpeed: 0.00005, baseCost: 150000 },
  { id: 'slot_6', direction: -1 as const, baseSpeed: 0.000035, baseCost: 600000 },
] as const

const INITIAL_SLOTS: PlanetSlot[] = PLANET_SLOT_ORBITS.map((orbit, i) => ({
  ...SLOT_CONFIG[i],
  purchased: false,
  role: null,
  orbitRadiusX: orbit.rx,
  orbitRadiusY: orbit.ry,
  tiltDeg: orbit.tiltDeg,
}))

const CONFIGURABLE_ROLES: PlanetRoleType[] = ['harvest_node', 'resonance_tower']

export const usePlanetShopStore = defineStore('planetShop', {
  state: () => ({
    slots: INITIAL_SLOTS.map((s) => ({ ...s })) as PlanetSlot[],
    activeRoleModalSlotId: null as string | null,
  }),

  getters: {
    purchasedSlots(state): PlanetSlot[] {
      return state.slots.filter((s) => s.purchased)
    },

    activeSlots(state): PlanetSlot[] {
      return state.slots.filter((s) => s.purchased && s.role !== null)
    },

    autoAttackDPS(state): number {
      return (
        state.slots.filter((s) => s.purchased && s.role === 'turret_planet').length *
        PLANET_ROLES.turret_planet.bonusPerSlot
      )
    },

    activeHarvestSlots(state): { materialId: string }[] {
      return state.slots
        .filter((s) => s.purchased && s.role === 'harvest_node' && s.slotConfig?.materialId)
        .map((s) => ({ materialId: s.slotConfig!.materialId! }))
    },

    planetExpeditionRewardMultiplier(state): number {
      const count = state.slots.filter((s) => s.purchased && s.role === 'expedition_relay').length
      return Math.pow(1 + PLANET_ROLES.expedition_relay.bonusPerSlot, count)
    },

    planetBossDamageReduction(state): number {
      const count = state.slots.filter((s) => s.purchased && s.role === 'shield_barrier').length
      return Math.min(0.8, count * PLANET_ROLES.shield_barrier.bonusPerSlot)
    },

    planetOfflineBoostMultiplier(state): number {
      const count = state.slots.filter((s) => s.purchased && s.role === 'time_capsule').length
      return Math.pow(1 + PLANET_ROLES.time_capsule.bonusPerSlot, count)
    },

    resonanceTowerBuildingMultipliers(state): Record<string, number> {
      const result: Record<string, number> = {}
      for (const slot of state.slots) {
        if (slot.purchased && slot.role === 'resonance_tower' && slot.slotConfig?.buildingId) {
          const bId = slot.slotConfig.buildingId
          result[bId] = (result[bId] ?? 1) * (1 + PLANET_ROLES.resonance_tower.bonusPerSlot)
        }
      }
      return result
    },
  },

  actions: {
    getSlot(slotId: string): PlanetSlot | undefined {
      return this.slots.find((s) => s.id === slotId)
    },

    getSlotCost(slotId: string): number {
      const slot = this.getSlot(slotId)
      if (!slot) return Infinity
      const gameStore = useGameStore()
      const costMul = gameStore.activeModifier.buildingCostMultiplier ?? 1
      return Math.ceil(slot.baseCost * costMul)
    },

    canAffordSlot(slotId: string): boolean {
      const gameStore = useGameStore()
      return gameStore.chimes >= this.getSlotCost(slotId)
    },

    buySlot(slotId: string): boolean {
      const slot = this.getSlot(slotId)
      if (!slot || slot.purchased) return false

      const gameStore = useGameStore()
      const cost = this.getSlotCost(slotId)
      if (gameStore.chimes < cost) return false

      gameStore.chimes -= cost
      slot.purchased = true

      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()

      logger.info('Planet', `Orbit-Slot ${slotId} gekauft`, { cost })

      this.openRoleModal(slotId)
      return true
    },

    assignRole(slotId: string, role: PlanetRoleType | null): void {
      const slot = this.getSlot(slotId)
      if (!slot || !slot.purchased) return

      const prev = slot.role
      slot.role = role
      slot.slotConfig = undefined

      const gameStore = useGameStore()
      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()

      logger.info('Planet', `Rolle von ${slotId} geändert: ${prev ?? 'keine'} → ${role ?? 'keine'}`)

      if (role !== null && CONFIGURABLE_ROLES.includes(role)) return

      this.closeRoleModal()
    },

    setSlotConfig(slotId: string, config: { materialId?: string; buildingId?: string }): void {
      const slot = this.getSlot(slotId)
      if (!slot || !slot.purchased) return

      slot.slotConfig = { ...config }

      if (slot.role === 'resonance_tower') {
        const gameStore = useGameStore()
        const shopStore = useShopStore()
        gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      }

      logger.info('Planet', `Slot-Config für ${slotId} gesetzt`, config)
      this.closeRoleModal()
    },

    tickHarvest(inGameTime: number): void {
      if (inGameTime % PLANET_HARVEST_INTERVAL_TICKS !== 0) return
      const harvestSlots = this.activeHarvestSlots
      if (harvestSlots.length === 0) return

      const inventoryStore = useInventoryStore()
      for (const { materialId } of harvestSlots) {
        inventoryStore.addMaterial(materialId)
      }
      logger.info('Planet', `Harvest-Tick: ${harvestSlots.length} Materialien geerntet`)
    },

    openRoleModal(slotId: string): void {
      this.activeRoleModalSlotId = slotId
    },

    closeRoleModal(): void {
      this.activeRoleModalSlotId = null
    },

    adminFillRandomRoles(): void {
      const roleTypes = Object.keys(PLANET_ROLES) as PlanetRoleType[]
      for (const slot of this.slots) {
        slot.purchased = true
        slot.role = roleTypes[Math.floor(Math.random() * roleTypes.length)]
      }
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()
    },
  },
})
