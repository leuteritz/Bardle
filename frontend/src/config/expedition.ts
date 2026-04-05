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
    description: 'Schicke einen Champion tief in den feindlichen Jungle.',
    requiredRoles: ['jungle'],
    minPowerThreshold: 60,
    durationSeconds: 60,
    baseReward: 150,
    icon: '🗡️',
  },
  {
    id: 'bot-lane-push',
    name: 'Bot Lane Push',
    description: 'ADC und Support drücken die Bot Lane bis zum Inhibitor.',
    requiredRoles: ['adc', 'support'],
    minPowerThreshold: 120,
    durationSeconds: 120,
    baseReward: 400,
    icon: '🏹',
  },
  {
    id: 'baron-steal',
    name: 'Baron Steal',
    description: 'Ein riskanter Versuch, Baron Nashor zu stehlen.',
    requiredRoles: ['jungle', 'mid'],
    minPowerThreshold: 200,
    durationSeconds: 180,
    baseReward: 800,
    icon: '🐉',
  },
  {
    id: 'split-push',
    name: 'Split Push',
    description: 'Ein Top Laner splitpusht eine Sidelane.',
    requiredRoles: ['top'],
    minPowerThreshold: 80,
    durationSeconds: 90,
    baseReward: 250,
    icon: '⚔️',
  },
  {
    id: 'mid-roam',
    name: 'Mid Roam',
    description: 'Der Mid Laner roamt zu anderen Lanes für Ganks.',
    requiredRoles: ['mid'],
    minPowerThreshold: 70,
    durationSeconds: 75,
    baseReward: 200,
    icon: '🌀',
  },
  {
    id: 'dragon-fight',
    name: 'Dragon Fight',
    description: 'Sichere den Drachen mit einem koordinierten Teamkampf.',
    requiredRoles: ['jungle', 'adc', 'support'],
    minPowerThreshold: 250,
    durationSeconds: 150,
    baseReward: 600,
    icon: '🔥',
  },
  {
    id: 'full-team-siege',
    name: 'Full Team Siege',
    description: 'Das komplette Team belagert eine feindliche Basis.',
    requiredRoles: ['top', 'jungle', 'mid', 'adc', 'support'],
    minPowerThreshold: 500,
    durationSeconds: 300,
    baseReward: 2000,
    icon: '🏰',
  },
  {
    id: 'ward-expedition',
    name: 'Ward Expedition',
    description: 'Support platziert tiefe Wards im feindlichen Gebiet.',
    requiredRoles: ['support'],
    minPowerThreshold: 50,
    durationSeconds: 45,
    baseReward: 100,
    icon: '👁️',
  },
  {
    id: 'rift-herald',
    name: 'Rift Herald',
    description: 'Beschwöre den Rift Herald für einen Turm-Push.',
    requiredRoles: ['jungle', 'top'],
    minPowerThreshold: 150,
    durationSeconds: 120,
    baseReward: 500,
    icon: '👾',
  },
  {
    id: 'tower-dive',
    name: 'Tower Dive',
    description: 'Ein riskanter Tower-Dive mit perfektem Timing.',
    requiredRoles: ['top', 'jungle'],
    minPowerThreshold: 180,
    durationSeconds: 100,
    baseReward: 450,
    icon: '💥',
  },
]
