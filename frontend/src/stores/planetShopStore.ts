// frontend/src/stores/planetShopStore.ts
import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useShopStore } from './shopStore'
import { logger } from '../utils/logger'

export type PlanetBonus =
  | 'chimes_per_second'
  | 'chimes_per_click'
  | 'meep_cost_reduction'
  | 'cps_multiplier'

export interface ShopPlanet {
  id: string
  name: string
  description: string
  icon: string
  baseCost: number
  costMultiplier: number
  level: number
  bonusType: PlanetBonus
  bonusPerLevel: number

  orbitRadiusX: number
  orbitRadiusY: number
  tiltDeg: number
  baseSpeed: number
  direction: 1 | -1
  color: string
}

export const usePlanetShopStore = defineStore('planetShop', {
  state: (): { planets: ShopPlanet[] } => ({
    planets: [
      {
        id: 'terra',
        name: 'Terra',
        description: 'Ein kleiner felsiger Planet. Generiert konstant zusätzliche Chimes.',
        icon: '/img/planets/planet.png',
        baseCost: 500,
        costMultiplier: 1.35,
        level: 0,
        bonusType: 'chimes_per_second',
        bonusPerLevel: 2,
        orbitRadiusX: 220,
        orbitRadiusY: 60,
        tiltDeg: 18,
        baseSpeed: 0.00018,
        direction: 1,
        color: '#4a90d9',
      },
      {
        id: 'ignis',
        name: 'Ignis',
        description: 'Eine Lavawelt, die deine Klickkraft verstärkt.',
        icon: '/img/planets/planet.png',
        baseCost: 2000,
        costMultiplier: 1.4,
        level: 0,
        bonusType: 'chimes_per_click',
        bonusPerLevel: 5,
        orbitRadiusX: 290,
        orbitRadiusY: 70,
        tiltDeg: -12,
        baseSpeed: 0.00014,
        direction: -1,
        color: '#e06020',
      },
      {
        id: 'glacius',
        name: 'Glacius',
        description: 'Kristalliner Eisplanet, der Meep-Kosten reduziert.',
        icon: '/img/planets/planet.png',
        baseCost: 8000,
        costMultiplier: 1.45,
        level: 0,
        bonusType: 'meep_cost_reduction',
        bonusPerLevel: 0.03,
        orbitRadiusX: 370,
        orbitRadiusY: 85,
        tiltDeg: 28,
        baseSpeed: 0.0001,
        direction: 1,
        color: '#80d0ff',
      },
      {
        id: 'aether',
        name: 'Äther',
        description: 'Ein mystischer Gasriese, der deine gesamte Chime-Produktion skaliert.',
        icon: '/img/planets/planet.png',
        baseCost: 35000,
        costMultiplier: 1.5,
        level: 0,
        bonusType: 'cps_multiplier',
        bonusPerLevel: 0.05,
        orbitRadiusX: 460,
        orbitRadiusY: 100,
        tiltDeg: -8,
        baseSpeed: 0.00007,
        direction: -1,
        color: '#b060e0',
      },
    ],
  }),

  getters: {
    ownedPlanets(state): ShopPlanet[] {
      return state.planets.filter((p) => p.level > 0)
    },

    totalPlanetFlatCPS(state): number {
      return state.planets
        .filter((p) => p.bonusType === 'chimes_per_second' && p.level > 0)
        .reduce((sum, p) => sum + p.bonusPerLevel * p.level, 0)
    },

    totalPlanetFlatCPC(state): number {
      return state.planets
        .filter((p) => p.bonusType === 'chimes_per_click' && p.level > 0)
        .reduce((sum, p) => sum + p.bonusPerLevel * p.level, 0)
    },

    planetMeepCostMultiplier(state): number {
      return state.planets
        .filter((p) => p.bonusType === 'meep_cost_reduction' && p.level > 0)
        .reduce((mul, p) => mul * Math.max(0.1, 1 - p.bonusPerLevel * p.level), 1)
    },

    planetCPSMultiplier(state): number {
      return state.planets
        .filter((p) => p.bonusType === 'cps_multiplier' && p.level > 0)
        .reduce((mul, p) => mul * (1 + p.bonusPerLevel * p.level), 1)
    },
  },

  actions: {
    getPlanet(planetId: string): ShopPlanet | undefined {
      return this.planets.find((p) => p.id === planetId)
    },

    getCost(planetId: string): number {
      const planet = this.getPlanet(planetId)
      if (!planet) return Infinity

      const gameStore = useGameStore()
      const costMul = gameStore.activeModifier.buildingCostMultiplier ?? 1

      return Math.ceil(planet.baseCost * Math.pow(planet.costMultiplier, planet.level) * costMul)
    },

    canAfford(planetId: string): boolean {
      const gameStore = useGameStore()
      return gameStore.chimes >= this.getCost(planetId)
    },

    buyPlanet(planetId: string): boolean {
      const planet = this.getPlanet(planetId)
      if (!planet) return false

      const gameStore = useGameStore()
      const shopStore = useShopStore()
      const cost = this.getCost(planetId)

      if (gameStore.chimes < cost) return false

      gameStore.chimes -= cost
      planet.level += 1

      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()

      logger.info('Planet', `Bought ${planet.name} → Level ${planet.level}`, { cost, planetId })

      return true
    },
  },
})
