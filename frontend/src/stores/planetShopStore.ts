// frontend/src/stores/planetShopStore.ts
import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useShopStore } from './shopStore'
import { useInventoryStore } from './inventoryStore'
import { logger } from '../utils/logger'
import { PLANET_SLOT_ORBITS, PLANET_HARVEST_INTERVAL_TICKS } from '@/config/constants'

export type PlanetRoleType =
  | 'materie_source'
  | 'relic_hoard'
  | 'meep_vessel'
  | 'aether_core'
  | 'time_capsule'
  | 'wanderer_shrine'
  | 'turret_planet'
  | 'harvest_node'
  | 'expedition_relay'
  | 'shield_barrier'
  | 'meep_amplifier'
  | 'champion_beacon'
  | 'loot_magnet'
  | 'resonance_tower'

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
    | 'auto_attack_dps'
    | 'material_harvest_rate'
    | 'expedition_reward_multiplier'
    | 'boss_damage_reduction'
    | 'meep_power_multiplier'
    | 'champion_damage_multiplier'
    | 'drop_chance_bonus'
    | 'building_cps_multiplier'
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
  slotConfig?: { materialId?: string; buildingId?: string }
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
  turret_planet: {
    id: 'turret_planet',
    name: 'Geschütz-Planet',
    description: 'Feuert automatisch auf den aktiven Boss.',
    flavorText: '„Bards Melodie hat die Materie selbst zur Waffe geformt."',
    bonusType: 'auto_attack_dps',
    bonusPerSlot: 2,
    icon: '🎯',
    color: '#cc4444',
  },
  harvest_node: {
    id: 'harvest_node',
    name: 'Ernte-Knoten',
    description: 'Farmt periodisch ein wählbares Material.',
    flavorText: '„Der Wanderer hinterließ Samen aus fernen Galaxien."',
    bonusType: 'material_harvest_rate',
    bonusPerSlot: 1,
    icon: '🌾',
    color: '#80c840',
  },
  expedition_relay: {
    id: 'expedition_relay',
    name: 'Expeditions-Relais',
    description: 'Erhöht den Belohnungs-Multiplikator aller Expeditionen.',
    flavorText: '„Durch diesen Knotenpunkt klingen Bards Signale weiter."',
    bonusType: 'expedition_reward_multiplier',
    bonusPerSlot: 0.3,
    icon: '🚀',
    color: '#40a0e0',
  },
  shield_barrier: {
    id: 'shield_barrier',
    name: 'Schild-Barriere',
    description: 'Reduziert eingehenden Orbit-Schaden durch Bosse.',
    flavorText: '„Ein kosmischer Klang bildet eine Mauer aus reiner Harmonie."',
    bonusType: 'boss_damage_reduction',
    bonusPerSlot: 0.15,
    icon: '🛡️',
    color: '#60a0ff',
  },
  meep_amplifier: {
    id: 'meep_amplifier',
    name: 'Meep-Verstärker',
    description: 'Erhöht die Kraft aller Meep-Zauber.',
    flavorText: '„Die Meeps klingen lauter — und gefährlicher."',
    bonusType: 'meep_power_multiplier',
    bonusPerSlot: 0.1,
    icon: '🔮',
    color: '#c040e0',
  },
  champion_beacon: {
    id: 'champion_beacon',
    name: 'Champion-Leuchtfeuer',
    description: 'Steigert die Kampfkraft aller Champions.',
    flavorText: '„Das Licht dieses Planeten ruft die Helden der Galaxie."',
    bonusType: 'champion_damage_multiplier',
    bonusPerSlot: 0.1,
    icon: '⚔️',
    color: '#e8a040',
  },
  loot_magnet: {
    id: 'loot_magnet',
    name: 'Beute-Magnet',
    description: 'Erhöht die Material-Drop-Chance bei Boss-Niederlagen.',
    flavorText: '„Was verloren geht, findet hier seinen Weg zurück."',
    bonusType: 'drop_chance_bonus',
    bonusPerSlot: 0.1,
    icon: '💎',
    color: '#c0c0ff',
  },
  resonance_tower: {
    id: 'resonance_tower',
    name: 'Resonanz-Turm',
    description: 'Verstärkt den CPS-Output eines gewählten Gebäudes.',
    flavorText: '„Bards Töne schwingen zwischen den Türmen der Zeit."',
    bonusType: 'building_cps_multiplier',
    bonusPerSlot: 0.25,
    icon: '🏗️',
    color: '#c09040',
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

    // ── Bestehende Getter ──────────────────────────────────────────────────────

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

    // ── Neue Getter ────────────────────────────────────────────────────────────

    // turret_planet: DPS-Wert pro Tick (Anzahl × bonusPerSlot)
    autoAttackDPS(state): number {
      return (
        state.slots.filter((s) => s.purchased && s.role === 'turret_planet').length *
        PLANET_ROLES.turret_planet.bonusPerSlot
      )
    },

    // harvest_node: Liste aktiver Harvest-Slots mit materialId
    activeHarvestSlots(state): { materialId: string }[] {
      return state.slots
        .filter((s) => s.purchased && s.role === 'harvest_node' && s.slotConfig?.materialId)
        .map((s) => ({ materialId: s.slotConfig!.materialId! }))
    },

    // expedition_relay: (1 + 0.3)^count
    planetExpeditionRewardMultiplier(state): number {
      const count = state.slots.filter((s) => s.purchased && s.role === 'expedition_relay').length
      return Math.pow(1 + PLANET_ROLES.expedition_relay.bonusPerSlot, count)
    },

    // shield_barrier: min(0.80, count × 0.15)
    planetBossDamageReduction(state): number {
      const count = state.slots.filter((s) => s.purchased && s.role === 'shield_barrier').length
      return Math.min(0.8, count * PLANET_ROLES.shield_barrier.bonusPerSlot)
    },

    // meep_amplifier: (1 + 0.1)^count
    planetMeepPowerMultiplier(state): number {
      const count = state.slots.filter((s) => s.purchased && s.role === 'meep_amplifier').length
      return Math.pow(1 + PLANET_ROLES.meep_amplifier.bonusPerSlot, count)
    },

    // champion_beacon: (1 + 0.1)^count
    planetChampionDamageMultiplier(state): number {
      const count = state.slots.filter((s) => s.purchased && s.role === 'champion_beacon').length
      return Math.pow(1 + PLANET_ROLES.champion_beacon.bonusPerSlot, count)
    },

    // loot_magnet: min(0.50, count × 0.1)
    planetDropChanceBonus(state): number {
      const count = state.slots.filter((s) => s.purchased && s.role === 'loot_magnet').length
      return Math.min(0.5, count * PLANET_ROLES.loot_magnet.bonusPerSlot)
    },

    // resonance_tower: { buildingId → Multiplikator } = (1 + 0.25)^slotCount per building
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
      // Konfiguration zurücksetzen wenn Rolle wechselt
      slot.slotConfig = undefined

      const gameStore = useGameStore()
      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()

      logger.info('Planet', `Rolle von ${slotId} geändert: ${prev ?? 'keine'} → ${role ?? 'keine'}`)

      // Konfigurierbare Rollen: Modal offen lassen für Config-Step
      if (role !== null && CONFIGURABLE_ROLES.includes(role)) return

      this.closeRoleModal()
    },

    setSlotConfig(
      slotId: string,
      config: { materialId?: string; buildingId?: string },
    ): void {
      const slot = this.getSlot(slotId)
      if (!slot || !slot.purchased) return

      slot.slotConfig = { ...config }

      // resonance_tower beeinflusst CPS → neu berechnen
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
  },
})
