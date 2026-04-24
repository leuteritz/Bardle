// frontend/src/stores/planetShopStore.ts
import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useShopStore } from './shopStore'
import { logger } from '../utils/logger'

export type PlanetRoleType =
  | 'materie_source'
  | 'relic_hoard'
  | 'meep_vessel'
  | 'aether_core'
  | 'time_capsule'
  | 'wanderer_shrine'

export interface PlanetRole {
  id: PlanetRoleType
  name: string
  description: string
  flavorText: string
  bonusType:
    | 'chimes_per_second'
    | 'chimes_per_click'
    | 'meep_cost_reduction'
    | 'cps_multiplier'
    | 'offline_boost'
    | 'periodic_chimes'
  bonusPerSlot: number
  icon: string
  color: string
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
}

export const PLANET_ROLES: Record<PlanetRoleType, PlanetRole> = {
  materie_source: {
    id: 'materie_source',
    name: 'Materie-Quelle',
    description: 'Generiert konstant kosmische Chimes.',
    flavorText: '„Dieser Planet pulsiert mit kosmischer Materie."',
    bonusType: 'chimes_per_second',
    bonusPerSlot: 5,
    icon: '🎵',
    color: '#4a90d9',
  },
  relic_hoard: {
    id: 'relic_hoard',
    name: 'Relikt-Hort',
    description: 'Verstärkt deinen Klick-Ertrag erheblich.',
    flavorText: '„Alte Artefakte schlafen hier, bereit erweckt zu werden."',
    bonusType: 'chimes_per_click',
    bonusPerSlot: 10,
    icon: '👆',
    color: '#e06020',
  },
  meep_vessel: {
    id: 'meep_vessel',
    name: 'Meep-Gefäß',
    description: 'Reduziert die Kosten für Meep-Zauber.',
    flavorText: '„Die Meeps fühlen sich hier seltsam wohl."',
    bonusType: 'meep_cost_reduction',
    bonusPerSlot: 0.05,
    icon: '💰',
    color: '#80d0ff',
  },
  aether_core: {
    id: 'aether_core',
    name: 'Äther-Kern',
    description: 'Skaliert deine gesamte Chime-Produktion.',
    flavorText: '„Resonanz hallt durch das Gefüge der Galaxie."',
    bonusType: 'cps_multiplier',
    bonusPerSlot: 0.08,
    icon: '✨',
    color: '#b060e0',
  },
  time_capsule: {
    id: 'time_capsule',
    name: 'Zeitkapsel',
    description: 'Bewahrt Energie für deine Rückkehr.',
    flavorText: '„Bard hat hier einst innegehalten. Die Zeit hat sich eingefroren."',
    bonusType: 'offline_boost',
    bonusPerSlot: 0.25,
    icon: '⏳',
    color: '#40c080',
  },
  wanderer_shrine: {
    id: 'wanderer_shrine',
    name: 'Wanderer-Schrein',
    description: 'Gewährt periodisch zufällige Chimes-Schübe.',
    flavorText: '„Bard selbst hat hier gerastet. Die Magie bleibt."',
    bonusType: 'periodic_chimes',
    bonusPerSlot: 0.08,
    icon: '🎲',
    color: '#e0c040',
  },
}

export const PLANET_ROLES_LIST: PlanetRole[] = Object.values(PLANET_ROLES)

const INITIAL_SLOTS: PlanetSlot[] = [
  {
    id: 'slot_1',
    purchased: false,
    role: null,
    orbitRadiusX: 220,
    orbitRadiusY: 60,
    tiltDeg: 18,
    baseSpeed: 0.00018,
    direction: 1,
    baseCost: 500,
  },
  {
    id: 'slot_2',
    purchased: false,
    role: null,
    orbitRadiusX: 290,
    orbitRadiusY: 70,
    tiltDeg: -12,
    baseSpeed: 0.00014,
    direction: -1,
    baseCost: 2000,
  },
  {
    id: 'slot_3',
    purchased: false,
    role: null,
    orbitRadiusX: 370,
    orbitRadiusY: 85,
    tiltDeg: 28,
    baseSpeed: 0.0001,
    direction: 1,
    baseCost: 8000,
  },
  {
    id: 'slot_4',
    purchased: false,
    role: null,
    orbitRadiusX: 460,
    orbitRadiusY: 100,
    tiltDeg: -8,
    baseSpeed: 0.00007,
    direction: -1,
    baseCost: 35000,
  },
  {
    id: 'slot_5',
    purchased: false,
    role: null,
    orbitRadiusX: 550,
    orbitRadiusY: 115,
    tiltDeg: 22,
    baseSpeed: 0.00005,
    direction: 1,
    baseCost: 150000,
  },
  {
    id: 'slot_6',
    purchased: false,
    role: null,
    orbitRadiusX: 640,
    orbitRadiusY: 130,
    tiltDeg: -18,
    baseSpeed: 0.000035,
    direction: -1,
    baseCost: 600000,
  },
]

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

    totalPlanetFlatCPS(state): number {
      return state.slots.filter((s) => s.purchased && s.role === 'materie_source').length * 5
    },

    totalPlanetFlatCPC(state): number {
      return state.slots.filter((s) => s.purchased && s.role === 'relic_hoard').length * 10
    },

    planetMeepCostMultiplier(state): number {
      const count = state.slots.filter((s) => s.purchased && s.role === 'meep_vessel').length
      return Math.max(0.1, Math.pow(1 - 0.05, count))
    },

    planetCPSMultiplier(state): number {
      const count = state.slots.filter((s) => s.purchased && s.role === 'aether_core').length
      return Math.pow(1 + 0.08, count)
    },

    planetOfflineBoostMultiplier(state): number {
      const count = state.slots.filter((s) => s.purchased && s.role === 'time_capsule').length
      return Math.pow(1 + 0.25, count)
    },

    wandererShrineCount(state): number {
      return state.slots.filter((s) => s.purchased && s.role === 'wanderer_shrine').length
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

      const gameStore = useGameStore()
      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()

      logger.info('Planet', `Rolle von ${slotId} geändert: ${prev ?? 'keine'} → ${role ?? 'keine'}`)
      this.closeRoleModal()
    },

    openRoleModal(slotId: string): void {
      this.activeRoleModalSlotId = slotId
    },

    closeRoleModal(): void {
      this.activeRoleModalSlotId = null
    },
  },
})
