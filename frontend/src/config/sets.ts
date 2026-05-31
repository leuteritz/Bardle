import type { ItemSetBonus } from '../types'

export const ITEM_SETS: ItemSetBonus[] = [
  {
    setId: 'arcane',
    setName: 'Arcane Bond',
    icon: 'game-icons:crystal-cluster',
    description: '+15% CPS & +10% Combat Power',
    bonusEffect: { cpsMultiplier: 1.15, powerMultiplier: 1.1 },
  },
  {
    setId: 'cosmic',
    setName: 'Cosmic Power',
    icon: 'game-icons:nebula',
    description: '+15% CPS & +20% Combat Power',
    bonusEffect: { cpsMultiplier: 1.15, powerMultiplier: 1.2 },
  },
  {
    setId: 'stellar',
    setName: 'Stellar Origin',
    icon: '/img/star.png',
    description: '+30% CPS & +25% Combat Power',
    bonusEffect: { cpsMultiplier: 1.3, powerMultiplier: 1.25 },
  },
]
