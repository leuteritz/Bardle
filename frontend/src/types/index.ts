import type { DrakeTypeId } from '../config/drakes'

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

export type StarType = 'champion' | 'resource' | 'galaxy_boss' | 'boss_escort'

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
  isBossEscort?: boolean
  isChampionPlanet?: boolean
  isChampionEscort?: boolean
  sectionId?: number
}

export interface SectionProgress {
  rescueCount: number
  completed: boolean
}

// ── Champion Tiers (Galaxy/Champion Tier redesign) ───────────────────────────
// A Champion Tier classifies a champion by its *star level* (1..MAX_STAR_LEVEL).
// 6 Champion Tiers, weakest → strongest. Tiers unlock cumulatively by galaxy and
// spawn together by weighted probability. Independent of (and additive to) the 15
// synergy traits in championTraits.ts.
export type ChampionTierId =
  | 'lone_wanderer' // ★1
  | 'rift_keeper' // ★2
  | 'nebula_sage' // ★3
  | 'astral_warden' // ★4
  | 'void_sovereign' // ★5
  | 'cosmic_sovereign' // ★6

export interface ChampionTierDef {
  id: ChampionTierId
  starLevel: number // 1..MAX_STAR_LEVEL — which galaxy star level this trait spawns at
  name: string
  icon: string // game-icons:* (registered in USED_GAME_ICONS)
  color: string
  description: string
}

// ── Battle Sigil (Team tab) ──────────────────────────────────────────────────
// Global escalation stage of the team sigil, selected by how many of the 15
// team slots (5 mains + 10 allies) are filled. Drives crest color, ring color,
// pulse/spin speed, ember particle count and extra decorative rings.
export interface SigilStageDef {
  name: string
  minFilled: number // 0..15 — stage applies from this many filled slots
  crestColor: string
  ringColor: string
  pulseSec: number // crest pulse duration; 0 = no pulse
  spinSec: number // outer ring rotation duration
  emberCount: number
  extraRings: number // 0..2 decorative rings added around the sigil
}

// A galaxy tier groups several galaxies and gates progression behind a cost.
export interface GalaxyTier {
  tier: number
  firstGalaxy: number
  lastGalaxy: number
}

export interface RecruitableChampion {
  name: string
  materialCost: Record<string, number>
  discoveredAt: number
  chimesPrice: number
}

export type BattleRole = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

export interface MultikillCounts {
  double: number
  triple: number
  quadra: number
  penta: number
}

export interface ChampionState {
  name: string
  rank: string
  role: BattleRole
  kills: number
  deaths: number
  assists: number
  cs: number
  gold: number
  damage: number
  healing: number
  damageTaken: number
  wardsPlaced: number
  wardsKilled: number
  controlWards: number
  level: number
  items: number
  multikills: MultikillCounts
  currentSpree: number
  largestSpree: number
  hpPercent: number
  respawnState: 'alive' | 'walking-back'
}

// Display-only snapshot of the running battle's own-team totals, mirroring the
// fields that accumulateBattleStats() folds into the career stats at battle end.
export interface LiveBattleStats {
  kills: number
  deaths: number
  assists: number
  cs: number
  gold: number
  damage: number
  healing: number
  damageTaken: number
  wardsPlaced: number
  wardsKilled: number
  controlWards: number
  multikills: MultikillCounts
  largestSpree: number
  firstBloods: number
  soloKills: number
  dragons: number
  barons: number
  turrets: number
  inhibitors: number
  battleSeconds: number
}

export type BattleEventType =
  | 'kill'
  | 'fightStart'
  | 'fightEnd'
  | 'objectiveSpawn'
  | 'objectiveResult'
  | 'turret'
  | 'inhibitor'
  | 'nexus'

export type StructureTier = 'outer' | 'inner' | 'inhibTurret' | 'inhibitor' | 'nexusTurret'

/** Lane slot a structure belongs to; nexus turrets sit outside the three lanes. */
export type StructureLaneKey = 'top' | 'mid' | 'bot' | 'nexus1' | 'nexus2'

/** `"ownerTeam:laneKey:tier"`, e.g. `"2:top:outer"` or `"1:nexus1:nexusTurret"`. */
export type StructureId = string

export interface BattleEvent {
  t: number
  type: BattleEventType
  team?: 1 | 2
  killerIdx?: number
  victimIdx?: number
  assistIdxs?: number[]
  multikillTier?: 2 | 3 | 4 | 5
  firstBlood?: boolean
  soloKill?: boolean
  location?: { x: number; y: number }
  lane?: 'top' | 'mid' | 'bot'
  objective?: 'drake' | 'baron'
  /** Set on drake objectiveSpawn/objectiveResult events (optional for save-compat). */
  drakeType?: DrakeTypeId
  participants?: { t1: number[]; t2: number[] }
  /** Set on turret/inhibitor events; `team` stays the attacker, the owner is encoded in the id. */
  structureId?: StructureId
  structureTier?: StructureTier
  winProbDelta: number
}

/** One destroyed structure in the live feed (derived from the timeline, never persisted). */
export interface StructureFeedEntry {
  id: StructureId
  tier: StructureTier
  /** Attacking team that destroyed the structure. */
  team: 1 | 2
  lane?: 'top' | 'mid' | 'bot'
  t: number
}

export interface BattleTimeline {
  seed: number
  winner: 1 | 2
  events: BattleEvent[]
}

export interface ObjectiveOverride {
  t: number
  newSeed: number
  prob: number
}

/** One champion attacking (or lying dead at) the frozen-time objective pit. */
export interface ObjectiveFighter {
  /** Index into team1/team2 */
  idx: number
  name: string
  alive: boolean
  /** Normalized DPS share within the side (0 when dead) */
  weight: number
  /** Cumulative damage dealt to this objective */
  damage: number
  /** Cumulative fight-HP damage taken (boss AoE + taunt diversion; heals excluded) */
  damageTaken: number
  /** Battle role — drives the fighter's pit ability (idx order: top/jungle/mid/adc/support) */
  role: BattleRole
  /** Fight-local HP — every fighter alive at fight start enters at full role HP */
  fightHp: number
  fightMaxHp: number
  /** Dropped to 0 fight-HP mid-fight: contributes no DPS, ability stops */
  down: boolean
  /** End (ms timestamp) of the ability's active window; 0 = inactive */
  abilityActiveUntil: number
  /** Timestamp (ms) when the ability can cast again */
  abilityCooldownUntil: number
}

export interface KillFeedEntry {
  killerName: string
  victimName: string
  killerTeam: 1 | 2
  multikillTier?: 2 | 3 | 4 | 5
  firstBlood?: boolean
  soloKill?: boolean
  assistNames?: string[]
  t: number
}

export interface AllTimeBattleStats {
  killParticipationSum: number
  killParticipationGames: number
  largestSpree: number
  firstBloods: number
  soloKills: number
  multikills: MultikillCounts
  mvpAwards: number
  cs: number
  gold: number
  damage: number
  healing: number
  damageTaken: number
  dragons: number
  barons: number
  turrets: number
  inhibitors: number
  wardsPlaced: number
  wardsKilled: number
  controlWards: number
  visionScoreSum: number
  longestGameSeconds: number
  honorsGiven: number
}

export interface ChampionCareerStats {
  battles: number
  kills: number
  deaths: number
  assists: number
  mvps: number
  damage: number
  gold: number
  cs: number
  healing: number
  damageTaken: number
  wardsPlaced: number
  honors: number
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
  lpChange?: number
  duration?: number
  teamKills?: number
  enemyKills?: number
  mvpName?: string
  /** Hand of Baron: chimes paid out at battle end for slaying the baron */
  baronBounty?: number
  /** Chimes paid out by the honor ceremony (3 honors, MVP pays double) */
  honorTribute?: number
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

// ── Star Forge (Shop tab) ────────────────────────────────────────────────────

export type ForgeNodeTier = 'branch' | 'leaf'

/** A purchasable node on the Forge Tree (rings 2 & 3 around the sun).
 *  Ring 1 (roots) stays in solarUpgradeStore. */
export interface ForgeNodeDef {
  id: string
  name: string
  /** Root SolarBranchId for branches; branch node id for leaves. */
  parentId: string
  tier: ForgeNodeTier
  /** Minimum starPhase at which the node becomes purchasable. */
  phase: number
  icon: string
  color: string
  /** Polar angle on the tree stage (degrees, 0 = right, clockwise). */
  angleDeg: number
  baseCost: number
  costMultiplier: number
  /** Materials required per purchase, quantities scale with the level bought. */
  materialCost: Record<string, number>
  /** Effect description template — `{v}` is replaced with the level value. */
  desc: string
  /** Branches: effect magnitude per level. Leaves: unused (uniform amplify). */
  effectPerLevel: number
}

export type ForgeRelicRarity = 'rare' | 'epic'

export interface ForgeRelicDef {
  id: string
  name: string
  rarity: ForgeRelicRarity
  icon: string
  color: string
  /** Branch node that must be grown before this relic can be forged. */
  requiresNode: string
  requiresLevel: number
  maxLevel: number
  goldCost: number
  goldMultiplier: number
  materialCost: Record<string, number>
  desc: string
  effectPerLevel: number
  /** Short provenance line, e.g. "Moon Orbit branch + Void Shards". */
  sourceLabel: string
}

export interface ForgeConstellationDef {
  id: string
  name: string
  icon: string
  color: string
  /** The two branch nodes fused by this constellation. */
  nodeA: string
  nodeB: string
  goldCost: number
  materialCost: Record<string, number>
  desc: string
  /** Compact pair line, e.g. "Flight + Chimes/Sec · +18% idle". */
  pairLabel: string
}

export type ForgeBargainKind = 'buff' | 'materials' | 'gold' | 'dwellSkip'

export interface ForgeBargainDef {
  id: string
  name: string
  icon: string
  desc: string
  basePrice: number
  /** 0–1 fraction knocked off basePrice. */
  discountPct: number
  kind: ForgeBargainKind
  buffId?: 'cpcX2' | 'cpsX2'
  durationMs?: number
  materials?: Record<string, number>
  goldReward?: number
  /** Fraction of the remaining phase dwell time skipped. */
  dwellSkipPct?: number
}

export interface ForgeActiveBuff {
  id: 'cpcX2' | 'cpsX2'
  expiresAt: number
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
  | 'Bandle'
  | 'Bilgewater'
  | 'Demacia'
  | 'Ionia'
  | 'Ixtal'
  | 'Noxus'
  | 'Piltover'
  | 'Isles'
  | 'Shurima'
  | 'Targon'
  | 'Freljord'
  | 'Void'
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
