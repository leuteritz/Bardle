// frontend/src/stores/planetShopStore.ts
import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useShopStore } from './shopStore'
import { useInventoryStore } from './inventoryStore'
import { logger } from '../utils/logger'
import {
  PLANET_SLOT_ORBITS,
  PLANET_HARVEST_INTERVAL_TICKS,
  PLANET_SLOT_MAX_HP,
} from '@/config/constants'

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
  image: string
}

export interface JungleBuff {
  active: boolean
  buffType: string
  multiplier: number
  activeUntil: number
}

export interface JungleBuffDef {
  name: string
  multiplier: number
  durationMs: number
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
  currentHp: number
  maxHp: number
  healingUntilMs: number
  jungleBuff: JungleBuff | null
}

export const PLANET_ROLES: Record<PlanetRoleType, PlanetRole> = {
  turret_planet: {
    id: 'turret_planet',
    name: 'Turret',
    bonusType: 'auto_attack_dps',
    bonusPerSlot: 2,
    icon: '🎯',
    color: '#cc4444',
    image: '/img/planets/planet1.png',
  },
  harvest_node: {
    id: 'harvest_node',
    name: 'Harvester',
    bonusType: 'material_harvest_rate',
    bonusPerSlot: 1,
    icon: '🌾',
    color: '#80c840',
    image: '/img/planets/planet2.png',
  },
  expedition_relay: {
    id: 'expedition_relay',
    name: 'Relay',
    bonusType: 'expedition_reward_multiplier',
    bonusPerSlot: 0.3,
    icon: '🚀',
    color: '#40a0e0',
    image: '/img/planets/planet3.png',
  },
  shield_barrier: {
    id: 'shield_barrier',
    name: 'Aegis',
    bonusType: 'boss_damage_reduction',
    bonusPerSlot: 0.15,
    icon: '/img/roles/top.png',
    color: '#60a0ff',
    image: '/img/planets/planet4.png',
  },
  time_capsule: {
    id: 'time_capsule',
    name: 'Timewarp',
    bonusType: 'offline_boost',
    bonusPerSlot: 0.25,
    icon: '⏳',
    color: '#40c080',
    image: '/img/planets/planet5.png',
  },
  resonance_tower: {
    id: 'resonance_tower',
    name: 'Resonator',
    bonusType: 'building_cps_multiplier',
    bonusPerSlot: 0.25,
    icon: '🏗️',
    color: '#c09040',
    image: '/img/planets/planet6.png',
  },
}

export const PLANET_ROLES_LIST: PlanetRole[] = Object.values(PLANET_ROLES)

export const JUNGLE_BUFF_DEFS: Record<PlanetRoleType, JungleBuffDef> = {
  turret_planet:    { name: 'Mark of the Hunter',   multiplier: 2.5, durationMs: 15_000 },
  harvest_node:     { name: "Scavenger's Blessing",  multiplier: 3.0, durationMs: 12_000 },
  expedition_relay: { name: 'Warp Trail',            multiplier: 2.0, durationMs: 20_000 },
  shield_barrier:   { name: 'Aegis Pulse',           multiplier: 1.5, durationMs: 15_000 },
  time_capsule:     { name: 'Temporal Rift',         multiplier: 2.0, durationMs: 30_000 },
  resonance_tower:  { name: 'Resonant Smite',        multiplier: 2.0, durationMs: 18_000 },
}

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
  currentHp: PLANET_SLOT_MAX_HP,
  maxHp: PLANET_SLOT_MAX_HP,
  healingUntilMs: 0,
  jungleBuff: null,
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
      return state.slots
        .filter((s) => s.purchased && s.role === 'turret_planet')
        .reduce((sum, slot) => {
          const mul = slot.jungleBuff?.active ? slot.jungleBuff.multiplier : 1
          return sum + PLANET_ROLES.turret_planet.bonusPerSlot * mul
        }, 0)
    },

    activeHarvestSlots(state): { materialId: string }[] {
      return state.slots
        .filter((s) => s.purchased && s.role === 'harvest_node' && s.slotConfig?.materialId)
        .map((s) => ({ materialId: s.slotConfig!.materialId! }))
    },

    planetExpeditionRewardMultiplier(state): number {
      return state.slots
        .filter((s) => s.purchased && s.role === 'expedition_relay')
        .reduce((prod, slot) => {
          const mul = slot.jungleBuff?.active ? slot.jungleBuff.multiplier : 1
          return prod * (1 + PLANET_ROLES.expedition_relay.bonusPerSlot * mul)
        }, 1)
    },

    planetBossDamageReduction(state): number {
      const total = state.slots
        .filter((s) => s.purchased && s.role === 'shield_barrier')
        .reduce((sum, slot) => {
          const mul = slot.jungleBuff?.active ? slot.jungleBuff.multiplier : 1
          return sum + PLANET_ROLES.shield_barrier.bonusPerSlot * mul
        }, 0)
      return Math.min(0.8, total)
    },

    planetOfflineBoostMultiplier(state): number {
      return state.slots
        .filter((s) => s.purchased && s.role === 'time_capsule')
        .reduce((prod, slot) => {
          const mul = slot.jungleBuff?.active ? slot.jungleBuff.multiplier : 1
          return prod * (1 + PLANET_ROLES.time_capsule.bonusPerSlot * mul)
        }, 1)
    },

    resonanceTowerBuildingMultipliers(state): Record<string, number> {
      const result: Record<string, number> = {}
      for (const slot of state.slots) {
        if (slot.purchased && slot.role === 'resonance_tower' && slot.slotConfig?.buildingId) {
          const bId = slot.slotConfig.buildingId
          const mul = slot.jungleBuff?.active ? slot.jungleBuff.multiplier : 1
          result[bId] = (result[bId] ?? 1) * (1 + PLANET_ROLES.resonance_tower.bonusPerSlot * mul)
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

    takeDamage(slotId: string, amount: number): void {
      const slot = this.getSlot(slotId)
      if (!slot || !slot.purchased) return
      slot.currentHp = Math.max(0, slot.currentHp - amount)
    },

    healSlot(slotId: string, amount: number): void {
      const slot = this.getSlot(slotId)
      if (!slot || !slot.purchased) return
      slot.currentHp = Math.min(slot.maxHp, slot.currentHp + amount)
      slot.healingUntilMs = Date.now() + 1000
    },

    applyJungleBuff(slotId: string, def: JungleBuffDef): void {
      const slot = this.getSlot(slotId)
      if (!slot || !slot.purchased) return
      slot.jungleBuff = {
        active: true,
        buffType: def.name,
        multiplier: def.multiplier,
        activeUntil: Date.now() + def.durationMs,
      }
    },

    clearJungleBuff(slotId: string): void {
      const slot = this.getSlot(slotId)
      if (slot) slot.jungleBuff = null
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
