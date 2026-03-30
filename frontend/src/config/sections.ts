export interface SectionConfig {
  id: number
  name: string
  requiredRescues: number
  difficultyMultiplier: number
  enrageMultiplier: number
  rewardMultiplier: number
}

export const SECTIONS: SectionConfig[] = [
  {
    id: 1,
    name: 'Veloris Drift',
    requiredRescues: 5,
    difficultyMultiplier: 1.0,
    enrageMultiplier: 1.0,
    rewardMultiplier: 1.0,
  },
  {
    id: 2,
    name: 'Taryn Expanse',
    requiredRescues: 8,
    difficultyMultiplier: 1.3,
    enrageMultiplier: 0.97,
    rewardMultiplier: 1.25,
  },
  {
    id: 3,
    name: 'Sorveth Cluster',
    requiredRescues: 12,
    difficultyMultiplier: 1.7,
    enrageMultiplier: 0.93,
    rewardMultiplier: 1.55,
  },
  {
    id: 4,
    name: 'Kelvara Stream',
    requiredRescues: 16,
    difficultyMultiplier: 2.2,
    enrageMultiplier: 0.9,
    rewardMultiplier: 1.9,
  },
  {
    id: 5,
    name: 'Yndros Belt',
    requiredRescues: 21,
    difficultyMultiplier: 2.85,
    enrageMultiplier: 0.86,
    rewardMultiplier: 2.3,
  },
  {
    id: 6,
    name: 'Caelthar Reach',
    requiredRescues: 26,
    difficultyMultiplier: 3.6,
    enrageMultiplier: 0.82,
    rewardMultiplier: 2.8,
  },
  {
    id: 7,
    name: 'Marvex Hollow',
    requiredRescues: 31,
    difficultyMultiplier: 4.5,
    enrageMultiplier: 0.78,
    rewardMultiplier: 3.4,
  },
  {
    id: 8,
    name: 'Zynthari Deep',
    requiredRescues: 37,
    difficultyMultiplier: 5.6,
    enrageMultiplier: 0.73,
    rewardMultiplier: 4.1,
  },
  {
    id: 9,
    name: 'Orvandis Abyss',
    requiredRescues: 43,
    difficultyMultiplier: 7.0,
    enrageMultiplier: 0.68,
    rewardMultiplier: 5.0,
  },
  {
    id: 10,
    name: 'Etherion Rift',
    requiredRescues: 50,
    difficultyMultiplier: 9.0,
    enrageMultiplier: 0.62,
    rewardMultiplier: 6.5,
  },
]

export const SECTION_BOSS_HP_MULTIPLIER = 2.0
export const SECTION_BOSS_ENRAGE_MULTIPLIER = 0.75
