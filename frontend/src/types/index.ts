// Shared TypeScript interfaces

// Champion role types
export type ChampionRole = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

// Expedition types
export type ExpeditionStatus = 'active' | 'success' | 'failure'

export interface ExpeditionMission {
  id: string
  configId: string
  name: string
  description: string
  icon: string
  requiredRoles: ChampionRole[]
  assignedChampions: { name: string; role: ChampionRole }[]
  durationSeconds: number
  startTime: number
  baseReward: number
  successChance: number
  status: ExpeditionStatus
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
  cooldownMultiplier?: number
  enemySpeedMultiplier?: number
  enemyMaxHPDrainPerSecond?: number
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

export interface PermanentUpgradeEffect {
  type: 'cpsMultiplier' | 'cpcMultiplier' | 'buildingBoost'
  value: number
  buildingId?: string
}

export interface PermanentUpgradeRequirement {
  buildingId: string
  minLevel: number
}

export type ModifierType =
  | 'resonanceBoost'
  | 'chimeEcho'
  | 'synergyLink'
  | 'cascadeEffect'
  | 'adaptiveScaling'
  | 'timeCrystal'

export interface UpgradeModifier {
  id: string
  name: string
  description: string
  icon: string
  type: ModifierType
  params: Record<string, number | string>
}

export interface PermanentUpgrade {
  id: string
  name: string
  description: string
  icon: string
  cost: number
  purchased: boolean
  effect: PermanentUpgradeEffect
  requirement?: PermanentUpgradeRequirement
  appliedModifier?: UpgradeModifier
  modifierSlotUnlocked?: boolean
  modifierCost?: number
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
export type PlanetType =
  | 'rocky'
  | 'ice'
  | 'gas-giant'
  | 'lava'
  | 'ocean'
  | 'desert'
  | 'jungle'
  | 'ringed'

export interface LabelData {
  planetId: string
  bossName: string
  currentHP: number
  maxHP: number
  reward: number | null
  materialImage?: string
  materialName?: string
  championImage?: string
  championName?: string
  isGalaxyBoss: boolean
  transform: string
}

export interface PlanetItem {
  id: string
  type: PlanetType
  size: number
  x: number
  y: number
  scale: number
  scaleEnd: number
  opacity: number
  transform: string
  lifetime: number
  elapsed: number
  removeTimeout: ReturnType<typeof setTimeout> | null

  // Orbit state
  orbiting?: boolean
  approaching?: boolean
  orbitAngle?: number
  orbitCx?: number
  orbitCy?: number

  // ── NEU: 3D-Ellipsen-Orbit (ersetzt orbitRadius + orbitSpeed) ──
  orbitRadiusX?: number
  orbitRadiusY?: number
  tiltRad?: number
  baseSpeed?: number
  direction?: 1 | -1
  currentRadiusX?: number // für Fly-in-Spirale
  currentRadiusY?: number
  isBehind?: boolean // für Back/Front-Layer-Aufteilung

  // Alte Felder die nicht mehr gebraucht werden – optional behalten
  orbitRadius?: number
  orbitSpeed?: number
  approachFromX?: number
  approachFromY?: number
  approachToX?: number
  approachToY?: number
  approachDuration?: number
  approachElapsed?: number

  name?: string
  isRescue: boolean
  isGalaxyBoss: boolean
  labelData: LabelData | null
  animState: 'normal' | 'exploding' | 'saved'
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
  potentialMaterialId?: string
  assignedDropChance?: number
  homePlanetChampion?: string
}

export interface PlanetBossEvent {
  planetId: string
  planetType: PlanetType
  bossName: string
  startTime: number
  enrageTimerMs: number
  maxHP: number
  currentHP: number
  clickDamagePerHit: number
  passiveDPS: number
  totalDamageDealt: number
  reward: number
  defeated: boolean
  expired: boolean
  potentialMaterialId?: string
  assignedDropChance?: number
  homePlanetChampion?: string
  isGalaxyBoss?: boolean
  isChampionPlanet?: boolean
  sectionId?: number
}

export interface SectionProgress {
  rescueCount: number
  completed: boolean
}

export interface RecruitableChampion {
  name: string
  materialCost: Record<string, number>
  discoveredAt: number
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
  type?: 'system' | 'player'
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

// Augment types
export type AugmentRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface AugmentEffects {
  cpsMultiplier?: number
  cpcMultiplier?: number
  buildingCostMultiplier?: number
  meepCostMultiplier?: number
  meepPowerMultiplier?: number
  expeditionRewardMultiplier?: number
  abilityPowerPerLevel?: number
  cooldownMultiplier?: number
  enemySpeedMultiplier?: number
  enemyMaxHPDrainPerSecond?: number
}

export type AugmentSpecialEffectType =
  | 'doubleTap'
  | 'chainReaction'
  | 'overclock'
  | 'bigBang'
  | 'infiniteLoop'
  | 'gravityFlip'
  | 'bardsCurse'
  | 'quantumLuck'
  | 'echoChamber'
  | 'keyboardSmash'

export interface AugmentSpecialEffect {
  type: AugmentSpecialEffectType
  params: Record<string, number>
}

export interface AugmentDefinition {
  id: string
  name: string
  description: string
  effectLine: string
  icon: string
  image?: string
  rarity: AugmentRarity
  effects: AugmentEffects
  specialEffect?: AugmentSpecialEffect
}

export interface TimedBuff {
  augmentId: string
  effectKey: string
  multiplier: number
  expiresAt: number
}

// Item types
export type ItemCategory = 'weapon' | 'armor' | 'misc'
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface ItemEffect {
  cpsMultiplier?: number
  powerMultiplier?: number
}

export interface ItemSetBonus {
  setId: string
  setName: string
  icon: string
  description: string
  bonusEffect: ItemEffect
}

export interface ShopItem {
  id: string
  name: string
  description: string
  icon: string
  price: number
  materialCost?: Record<string, number>
  rarity: ItemRarity
  category: ItemCategory
  effects: ItemEffect
  setId?: string
}

export interface SlotEquipment {
  weapon: string | null
  armor: string | null
  misc: string | null
}

// Material types
export type MaterialRarity = 'common' | 'uncommon' | 'rare' | 'epic'

export interface Material {
  id: string
  name: string
  icon?: string
  image?: string
  description: string
  rarity: MaterialRarity
  dropChance: number
}

// ── Battle Shop System ───────────────────────────────────
export interface ShopItemEffect {
  type:
    | 'winChanceBonus'
    | 'doubleLpOnWin'
    | 'synergyPower'
    | 'scoutOpponent'
    | 'bardBasePower'
    | 'coinDropBonus'
  value: number
}

export interface BattleShopItem {
  id: string
  name: string
  description: string
  cost: number
  category: 'temp_buff' | 'team_upgrade' | 'permanent'
  rarity: 'common' | 'rare' | 'epic'
  maxStacks?: number
  effect: ShopItemEffect
}

export interface ActiveBuff {
  id: string
  remainingBattles: number
  effect: ShopItemEffect
}

// ── Idle-Game Mission-System ─────────────────────────────
export type MissionConditionType =
  | 'totalChimes'
  | 'totalClicks'
  | 'singleBuildingLevel'
  | 'totalBuildingLevels'
  | 'ownedBuildingTypes'
  | 'permanentUpgradeCount'

export interface MissionCondition {
  type: MissionConditionType
  target: number
  buildingId?: string
}

export interface Mission {
  id: string
  name: string
  icon: string
  description: string
  condition: MissionCondition
  rewardUpgrade: Omit<PermanentUpgrade, 'purchased'>
  claimed: boolean
}

// ── Champion Combat System ───────────────────────────────────────────────────
export type ChampionCombatPhase = 'orbit' | 'approach' | 'attack' | 'retreat'

export interface ChampionOrbitParams {
  name: string
  angle: number
  baseSpeed: number
  direction: number
  orbitRadiusX: number
  orbitRadiusY: number
  tiltDeg: number
  tiltRad: number
  isBurst: boolean
  burstTimer: number
}

export interface ChampionCombatState extends ChampionOrbitParams {
  phase: ChampionCombatPhase
  screenX: number
  screenY: number
  targetX: number
  targetY: number
  isAttacking: boolean
}

export interface DamageFloat {
  id: number
  value: number
  x: number
  y: number
  expiresAt: number
  planetFloat?: boolean
}
