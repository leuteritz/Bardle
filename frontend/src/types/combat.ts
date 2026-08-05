// Orbit-Kampfsystem: Champion-Flug, Flüche, Schadenszahlen.

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
  /** Starfall perk landed a critical orbit hit — the float is highlighted. */
  crit?: boolean
}
