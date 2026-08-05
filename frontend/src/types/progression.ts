// Fortschritt: Universen, Prestige-Läufe, Abschnitte.

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

export interface SectionProgress {
  rescueCount: number
  completed: boolean
}

/**
 * Stand der Lebenszeit-Zähler beim Betreten des aktuellen Universums.
 *
 * Jeder „in diesem Universum"-Wert ist eine Differenz gegen diesen Stand —
 * damit braucht kein Store einen zweiten, parallel gepflegten Zähler, der beim
 * Prestige mit zurückgesetzt werden müsste.
 */
export interface UniverseRunBaseline {
  /** `gameStore.inGameTime` (Sekunden) beim Betreten — wie im Galaxie-Archiv. */
  startedAtInGameTime: number
  starsRescued: number
  starsLost: number
  galaxiesFreed: number
  planetsCleared: number
  bossesFelled: number
  meepsEarned: number
  materialsGathered: number
  clicks: number
}

/** Die daraus abgeleiteten Werte des laufenden Durchlaufs. */
export interface UniverseRunStats {
  playedSeconds: number
  starsRescued: number
  starsLost: number
  galaxiesFreed: number
  planetsCleared: number
  bossesFelled: number
  meepsEarned: number
  materialsGathered: number
  clicks: number
}

/** Ein abgeschlossener Universums-Durchlauf, archiviert beim Prestige. */
export interface UniverseRunRecord {
  universe: number
  durationSeconds: number
  starsRescued: number
  galaxiesFreed: number
  /** Chimes, die die Rettung dieses Universums gekostet hat. */
  chimes: number
  completedAt: number
}
