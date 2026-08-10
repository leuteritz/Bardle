// Wirtschaft: Shop, Items, Materialien, Augments, Expeditionen, Missionen.

import type { ChampionRole } from '@/types/core'
import type { ChampionStatKey } from '@/types/champions'
import type { IconPoolKey } from '@/types/ui'

// Expedition types
export type ExpeditionStatus = 'active' | 'success' | 'failure'

export type ExpeditionHazardId =
  | 'voidStatic'
  | 'crushingGravity'
  | 'hostileWardens'
  | 'sealedVault'
  | 'ancientSeals'
  | 'shiftingPaths'

/**
 * A condition on the mission that the crew either answers or pays for.
 *
 * `stat` hazards mitigate on a ramp against the crew's summed stat; `kinship`
 * wants two champions of one origin, `diversity` wants no two alike. The last
 * two are the reason a crew is more than the sum of its levels.
 */
export interface ExpeditionHazardDef {
  id: ExpeditionHazardId
  name: string
  icon: string
  kind: 'stat' | 'kinship' | 'diversity'
  /** Which champion stat answers this hazard — null for composition hazards. */
  counterStat: ChampionStatKey | null
  /**
   * What the crew must bring, in four or five words, shown ON the card.
   * The flavour line below is decoration; this is the part a player acts on, so
   * it may never live in a tooltip.
   */
  requirement: string
  desc: string
}

/** What a tier pays beyond chimes. A failed run pays none of it. */
export interface ExpeditionSpoilsDef {
  materialRolls: number
  materialChance: number
  meep: number
}

/** What a resolved mission actually handed over — kept for the result card. */
export interface ExpeditionSpoilsPayout {
  materials: { id: string; qty: number }[]
  meep: number
}

export interface ExpeditionLedgerRankDef {
  tier: number
  name: string
  icon: string
  /** Missions resolved before this rank applies. */
  required: number
  activeSlots: number
  offerSlots: number
  chanceBonus: number
}

/** One signed line of the success-chance sum, as shown on the contract card. */
export interface ExpeditionChanceEntry {
  id: string
  label: string
  icon: string
  /** Signed contribution in probability points (0.12 = +12 %). */
  value: number
  /** Extra note under the label — e.g. how far a hazard is mitigated. */
  detail?: string
}

export interface ExpeditionChanceBreakdown {
  base: number
  entries: ExpeditionChanceEntry[]
  /** Clamped final chance — what the dice actually use. */
  total: number
}

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
  hazards: ExpeditionHazardId[]
  /** Crew stat that fully answers a stat hazard on this mission. */
  hazardThreshold: number
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
  tier?: 'common' | 'rare' | 'epic'
  hazards?: ExpeditionHazardId[]
  /** Filled in on resolve — what the run brought home besides chimes. */
  spoils?: ExpeditionSpoilsPayout
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
  /**
   * Motivfamilie statt festem Glyph — das Icon wird bei jedem Roll neu gezogen
   * (`augmentIcon` in `utils/game/rolledIcons.ts`), damit dasselbe Augment beim
   * zwanzigsten Mal nicht wieder gleich aussieht.
   */
  iconPool: IconPoolKey
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

/** Where a unit of material entered the inventory. Labels: MATERIAL_SOURCE_LABELS. */
export type MaterialSourceId =
  | 'drop'
  | 'harvest'
  | 'boss'
  | 'drifter'
  | 'bargain'
  | 'expedition'
  | 'voidTide'

/** What a unit of material was spent on. Labels: MATERIAL_SINK_LABELS. */
export type MaterialSinkId =
  | 'recruit'
  | 'level'
  | 'equipment'
  | 'tier'
  | 'forge'
  | 'relic'
  | 'constellation'
  | 'bargain'
  | 'other'

/** One row of the source/sink breakdown in the header material tooltip. */
export interface MaterialFlowShare {
  id: string
  label: string
  icon: string
  amount: number
  /** 0–1, relative to the largest row — drives the bar width, not the label. */
  fraction: number
  /** 0–1, share of the whole tally — the percentage the player reads. */
  share: number
}

// ── Universe run (header universe tooltip) ───────────────────────────────────

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
