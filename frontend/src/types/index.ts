// Shared TypeScript interfaces

// Champion role types
export type ChampionRole = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

// Mission types
export type MissionStatus = 'active' | 'success' | 'failure'

export interface Mission {
  id: string
  configId: string
  name: string
  description: string
  requiredRoles: ChampionRole[]
  assignedChampions: { name: string; role: ChampionRole }[]
  durationSeconds: number
  startTime: number
  baseReward: number
  successChance: number
  status: MissionStatus
  reward: number
}

// Universe modifier types
export interface ModifierEffects {
  cpsMultiplier?: number
  cpcMultiplier?: number
  buildingCostMultiplier?: number
  meepCostMultiplier?: number
  meepPowerMultiplier?: number
  levelExponent?: number
  maxAbilityLevel?: number
  skillPointInterval?: number
  baseChimesPerClick?: number
  expeditionRewardMultiplier?: number
  eloPowerMultiplier?: number
  buildingMultipliers?: Record<string, number>
  abilityCPSPerLevel?: number
  abilityCPCPerLevel?: number
  abilityPowerPerLevel?: number
  abilityMeepCostPerLevel?: number
}

export interface UniverseModifier {
  id: string
  name: string
  description: string
  icon: string
  effects: ModifierEffects
}

export interface UniverseConfig {
  id: number
  name: string
  description: string
  modifier: UniverseModifier | null
}

// Shop types (extracted from shopStore.ts)
export interface ShopUpgrade {
  id: string
  name: string
  baseCost: number
  baseCPC?: number
  baseCPS?: number
  level: number
  costMultiplier: number
  icon: string
}

export interface BuildingStat {
  id: string
  name: string
  icon: string
  level: number
  currentCPS: number
  lifetimeProduction: number
  efficiency: number
  efficiencyStars: number
  productionPercentage: number
}

export interface TimePeriod {
  key: string
  label: string
  duration: number
  interval: number
  dataPoints: number
}

// Game store types (extracted from gameStore.ts)
export interface BuildingProduction {
  [key: string]: number[]
}

export interface TotalBuildingProduction {
  [key: string]: number
}

// Expedition types
export interface Expedition {
  universeId: number
  universeName: string
  meepsSent: number
  startTime: number
  durationMs: number
  reward: number
  collected: boolean
}

// Planet event types
export type PlanetType = 'rocky' | 'ice' | 'gas-giant' | 'lava' | 'ocean' | 'desert' | 'jungle' | 'ringed'

export interface PlanetItem {
  id: string
  el: SVGSVGElement
  x: number
  y: number
  vx: number
  vy: number
  type: PlanetType
  isRescueTarget: boolean
}

export interface PlanetRescueEvent {
  planetId: string
  planetType: PlanetType
  startTime: number
  durationMs: number
  reward: number
  clicksRequired: number
  clicksMade: number
  saved: boolean
  expired: boolean
  potentialMaterialId: string
  assignedDropChance: number
}

// Battle types
export interface ChampionState {
  name: string
  rank: string
  kills: number
  deaths: number
  assists: number
}

export interface ChatMessage {
  user: string
  text: string
  time: string
  team: number
}

export interface CurrentRank {
  tier: string
  division: string
  lp: number
}

export interface Opponent {
  mmr: number
  power: number
  rank: { tier: string; division: string; minMMR: number }
}

export interface BattleResult {
  won: boolean
  opponent: Opponent
  winProbability: number
}

// Material types
export type MaterialRarity = 'common' | 'uncommon' | 'rare' | 'epic'

export interface Material {
  id: string
  name: string
  icon: string
  description: string
  rarity: MaterialRarity
  dropChance: number
}
