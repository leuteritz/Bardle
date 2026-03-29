export interface SectionConfig {
  id: number
  name: string
  requiredRescues: number
  difficultyMultiplier: number
  enrageMultiplier: number
  rewardMultiplier: number
}

export const SECTIONS: SectionConfig[] = [
  { id: 1,  name: 'Fringe Space',      requiredRescues: 5,  difficultyMultiplier: 1.00, enrageMultiplier: 1.00, rewardMultiplier: 1.00 },
  { id: 2,  name: 'Outer Rim',         requiredRescues: 8,  difficultyMultiplier: 1.30, enrageMultiplier: 0.97, rewardMultiplier: 1.25 },
  { id: 3,  name: 'Contested Expanse', requiredRescues: 12, difficultyMultiplier: 1.70, enrageMultiplier: 0.93, rewardMultiplier: 1.55 },
  { id: 4,  name: 'Warp Corridor',     requiredRescues: 16, difficultyMultiplier: 2.20, enrageMultiplier: 0.90, rewardMultiplier: 1.90 },
  { id: 5,  name: 'Void Threshold',    requiredRescues: 21, difficultyMultiplier: 2.85, enrageMultiplier: 0.86, rewardMultiplier: 2.30 },
  { id: 6,  name: 'Nebula Heart',      requiredRescues: 26, difficultyMultiplier: 3.60, enrageMultiplier: 0.82, rewardMultiplier: 2.80 },
  { id: 7,  name: 'Singularity Edge',  requiredRescues: 31, difficultyMultiplier: 4.50, enrageMultiplier: 0.78, rewardMultiplier: 3.40 },
  { id: 8,  name: 'Dark Flux Sea',     requiredRescues: 37, difficultyMultiplier: 5.60, enrageMultiplier: 0.73, rewardMultiplier: 4.10 },
  { id: 9,  name: 'Abyssal Core',      requiredRescues: 43, difficultyMultiplier: 7.00, enrageMultiplier: 0.68, rewardMultiplier: 5.00 },
  { id: 10, name: 'The Omega Rift',    requiredRescues: 50, difficultyMultiplier: 9.00, enrageMultiplier: 0.62, rewardMultiplier: 6.50 },
]

export const SECTION_BOSS_HP_MULTIPLIER = 2.0
export const SECTION_BOSS_ENRAGE_MULTIPLIER = 0.75
