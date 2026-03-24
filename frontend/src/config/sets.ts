import type { ItemSetBonus } from '../types'

export const ITEM_SETS: ItemSetBonus[] = [
  {
    setId: 'arcane',
    setName: 'Arkan-Bund',
    icon: '🔮',
    description: '+15% CPS & +10% Kampfkraft',
    bonusEffect: { cpsMultiplier: 1.15, powerMultiplier: 1.1 },
  },
  {
    setId: 'cosmic',
    setName: 'Kosmische Macht',
    icon: '🌌',
    description: '+15% CPS & +20% Kampfkraft',
    bonusEffect: { cpsMultiplier: 1.15, powerMultiplier: 1.2 },
  },
  {
    setId: 'stellar',
    setName: 'Stellarer Ursprung',
    icon: '⭐',
    description: '+30% CPS & +25% Kampfkraft',
    bonusEffect: { cpsMultiplier: 1.3, powerMultiplier: 1.25 },
  },
]
