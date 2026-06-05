import type { ChampionRole } from '../types'

export interface ExpeditionConfig {
  id: string
  name: string
  description: string
  requiredRoles: ChampionRole[]
  minPowerThreshold: number
  durationSeconds: number
  baseReward: number
  icon: string
}

export const EXPEDITION_CONFIGS: ExpeditionConfig[] = [
  {
    id: 'solo-invade',
    name: 'Solo Invade',
    description: 'Send a champion deep into enemy jungle.',
    requiredRoles: ['jungle'],
    minPowerThreshold: 60,
    durationSeconds: 60,
    baseReward: 150,
    icon: 'game-icons:plain-dagger',
  },
  {
    id: 'bot-lane-push',
    name: 'Bot Lane Push',
    description: 'ADC and Support push the bot lane all the way to the inhibitor.',
    requiredRoles: ['adc', 'support'],
    minPowerThreshold: 120,
    durationSeconds: 120,
    baseReward: 400,
    icon: '/img/roles/adc.png',
  },
  {
    id: 'baron-steal',
    name: 'Baron Steal',
    description: 'A risky attempt to steal Baron Nashor.',
    requiredRoles: ['jungle', 'mid'],
    minPowerThreshold: 200,
    durationSeconds: 180,
    baseReward: 800,
    icon: 'game-icons:dragon-spiral',
  },
  {
    id: 'split-push',
    name: 'Split Push',
    description: 'A Top laner splitpushes a side lane.',
    requiredRoles: ['top'],
    minPowerThreshold: 80,
    durationSeconds: 90,
    baseReward: 250,
    icon: 'game-icons:sword-brandish',
  },
  {
    id: 'mid-roam',
    name: 'Mid Roam',
    description: 'The Mid laner roams to other lanes for ganks.',
    requiredRoles: ['mid'],
    minPowerThreshold: 70,
    durationSeconds: 75,
    baseReward: 200,
    icon: 'game-icons:tornado',
  },
  {
    id: 'dragon-fight',
    name: 'Dragon Fight',
    description: 'Secure the dragon with a coordinated team fight.',
    requiredRoles: ['jungle', 'adc', 'support'],
    minPowerThreshold: 250,
    durationSeconds: 150,
    baseReward: 600,
    icon: 'game-icons:fire-dash',
  },
  {
    id: 'full-team-siege',
    name: 'Full Team Siege',
    description: 'The full team besieges an enemy base.',
    requiredRoles: ['top', 'jungle', 'mid', 'adc', 'support'],
    minPowerThreshold: 500,
    durationSeconds: 300,
    baseReward: 2000,
    icon: 'game-icons:castle',
  },
  {
    id: 'ward-expedition',
    name: 'Ward Expedition',
    description: 'Support places deep wards in enemy territory.',
    requiredRoles: ['support'],
    minPowerThreshold: 50,
    durationSeconds: 45,
    baseReward: 100,
    icon: 'game-icons:eye-target',
  },
  {
    id: 'rift-herald',
    name: 'Rift Herald',
    description: 'Summon the Rift Herald for a tower push.',
    requiredRoles: ['jungle', 'top'],
    minPowerThreshold: 150,
    durationSeconds: 120,
    baseReward: 500,
    icon: 'game-icons:alien-stare',
  },
  {
    id: 'tower-dive',
    name: 'Tower Dive',
    description: 'A risky tower dive with perfect timing.',
    requiredRoles: ['top', 'jungle'],
    minPowerThreshold: 180,
    durationSeconds: 100,
    baseReward: 450,
    icon: 'game-icons:explosion-rays',
  },
]
