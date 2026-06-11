// Champion role types
export type ChampionRole = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

export interface RoleStat {
  key: string
  icon: string
  label: string
  value: string
}

// Expedition types
export type ExpeditionStatus = 'active' | 'success' | 'failure'

export interface AvailableExpeditionSlot {
  id: string
  colorKey: string
  availableUntil: number
  spawnedAt: number
  tier: 'common' | 'rare' | 'epic'
  name: string
  icon: string
  baseReward: number
  durationSeconds: number
  requiredRoles: ChampionRole[]
  minPowerThreshold: number
}

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
  colorKey?: string
}

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

export interface MissionReward {
  id: string
  name: string
  description: string
  icon: string
  cost: number
  effect: { type: string; value: number; buildingId?: string }
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

export interface BuildingProduction {
  [key: string]: number[]
}

export interface TotalBuildingProduction {
  [key: string]: number
}

export interface Expedition {
  universeId: number
  universeName: string
  meepsSent: number
  startTime: number
  durationMs: number
  reward: number
  collected: boolean
}

export type PlanetType =
  | 'rocky'
  | 'ice'
  | 'gas-giant'
  | 'lava'
  | 'ocean'
  | 'desert'
  | 'jungle'
  | 'ringed'

export type StarType = 'champion' | 'resource' | 'galaxy_boss'

export interface LabelData {
  planetId: string
  bossName: string
  currentHP: number
  maxHP: number
  reward: number | null
  chimesImage?: string
  materialImage?: string
  materialName?: string
  materialCount?: number
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

  orbitRadiusX?: number
  orbitRadiusY?: number
  tiltRad?: number
  baseSpeed?: number
  direction?: 1 | -1
  currentRadiusX?: number
  currentRadiusY?: number
  isBehind?: boolean

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
  // ── GEÄNDERT: 'champion_arriving' ergänzt ──────────────────────────────
  animState: 'normal' | 'exploding' | 'saved' | 'champion_arriving'
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

export interface PlanetBossRewardSlot {
  type: 'chimes' | 'material'
  amount?: number
  materialId?: string
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
  rewardSlots: PlanetBossRewardSlot[]
  defeated: boolean
  expired: boolean
  noEnrage?: boolean
  homePlanetChampion?: string
  isGalaxyBoss?: boolean
  isChampionPlanet?: boolean
  isChampionEscort?: boolean
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

export type ItemCategory = 'weapon' | 'armor' | 'artefact'
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
  artefact: string | null
}

export type MaterialRarity = 'common' | 'uncommon' | 'rare' | 'epic'

export interface RoleAbilityDetail {
  name: string
  desc: string
  value?: string
}

export interface Material {
  id: string
  name: string
  icon?: string
  image?: string
  description: string
  rarity: MaterialRarity
  dropChance: number
  dropCount?: number
}


export type MissionConditionType =
  | 'totalChimes'
  | 'totalClicks'
  | 'singleBuildingLevel'
  | 'totalBuildingLevels'
  | 'ownedBuildingTypes'

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
  rewardUpgrade: MissionReward
  claimed: boolean
}

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

export type MidCurseType = 'corruption' | 'weakness' | 'banishment' | 'glaciation' | 'damnation'

export interface ActiveCurse {
  type: MidCurseType
  activeUntil: number
}

export interface DamageFloat {
  id: number
  value: number
  x: number
  y: number
  expiresAt: number
  planetFloat?: boolean
  dotFloat?: boolean
  adcFloat?: boolean
  healFloat?: boolean
  shieldFloat?: boolean
  curseFloat?: boolean
}

export type SynergyEffectType = 'cps' | 'power' | 'dps'
export type SynergyType = 'elemental' | 'role_echo' | 'lore_bond' | 'full_orbit' | 'rarity'
export type SynergyTier = 'bronze' | 'silver' | 'gold'

export interface SynergyEffect {
  type: SynergyEffectType
  multiplier: number
}

export interface SynergyDefinition {
  id: string
  name: string
  description: string
  type: SynergyType
  icon: string
  color: string
  tier: SynergyTier
  effects: SynergyEffect[]
}

export interface ActiveSynergy extends SynergyDefinition {
  involvedChampions: string[]
  roleIndex?: number
}

export type ChampionOrigin =
  | 'Bandle City'
  | 'Bilgewater'
  | 'Demacia'
  | 'Ionia'
  | 'Ixtal'
  | 'Noxus'
  | 'Piltover'
  | 'Shadow Isles'
  | 'Shurima'
  | 'Targon'
  | 'The Freljord'
  | 'The Void'
  | 'Zaun'
  | 'Runeterra'

export interface OriginSynergyThreshold {
  count: number
  bonus: string
  effects: SynergyEffect[]
}

export interface OriginSynergyDef {
  origin: ChampionOrigin
  name: string
  color: string
  icon: string
  thresholds: OriginSynergyThreshold[]
}

export interface ActiveOriginSynergy {
  origin: ChampionOrigin
  def: OriginSynergyDef
  count: number
  activeThreshold: OriginSynergyThreshold | null
  nextThreshold: OriginSynergyThreshold | null
  involvedChampions: string[]
}

// Trait system (15 TFT-inspired traits)
export type TraitId =
  | 'celestial'
  | 'arcanist'
  | 'assassin'
  | 'enchanter'
  | 'duelist'
  | 'guardian'
  | 'challenger'
  | 'phantom'
  | 'moonlight'
  | 'dark_star'
  | 'elderwood'
  | 'reaper'
  | 'invoker'
  | 'jade'
  | 'astral'

export interface TraitThreshold {
  count: number
  bonus: string
  effects: SynergyEffect[]
}

export interface TraitDefinition {
  id: TraitId
  name: string
  icon: string
  color: string
  thresholds: TraitThreshold[]
}

export interface ActiveTrait {
  trait: TraitDefinition
  count: number
  activeThreshold: TraitThreshold | null
  nextThreshold: TraitThreshold | null
  involvedChampions: string[]
}

export interface RoleBehaviorState {
  // Support
  supportHealCooldownMs: number
  // Top Laner
  tankShieldActive: boolean
  tankShieldBrokenMs: number
  // Mid Laner
  dotCooldownMs: number
  dotRemainingMs: number
  midNovaActive: boolean
  midCurseCooldownMs: number
  midCurseFlashActive: boolean
  activeCurse: ActiveCurse | null
  // ADC
  adcBurstCooldownMs: number
}
