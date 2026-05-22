import type { UniverseConfig } from '../types'

export const universes: UniverseConfig[] = [
  {
    id: 1,
    name: 'Runeterra Prime',
    description: 'The original universe',
    modifier: null,
  },
  {
    id: 2,
    name: 'Void Nexus',
    description: 'Dimension of the Void',
    modifier: {
      id: 'void-hunger',
      name: 'Void Hunger',
      description: 'CPS x2, Building Costs x1.75',
      icon: '🕳️',
      effects: { cpsMultiplier: 2, buildingCostMultiplier: 1.75 },
    },
  },
  {
    id: 3,
    name: 'Celestial Realm',
    description: 'Celestial Realm',
    modifier: {
      id: 'celestial-harmony',
      name: 'Celestial Harmony',
      description: 'Level up faster (exponent 0.9), max Ability Level 3',
      icon: '✨',
      effects: { levelExponent: 0.9, maxAbilityLevel: 3 },
    },
  },
  {
    id: 4,
    name: 'Shadow Isles',
    description: 'Islands of Shadow',
    modifier: {
      id: 'shadow-harvest',
      name: 'Shadow Harvest',
      description: 'Meep Costs x0.01, Meep Power x0.4',
      icon: '👻',
      effects: { meepCostMultiplier: 0.01, meepPowerMultiplier: 0.4 },
    },
  },
  {
    id: 5,
    name: 'Freljord',
    description: 'Eternal Ice Wasteland',
    modifier: {
      id: 'frozen-resonance',
      name: 'Frozen Resonance',
      description: 'CPC x3, CPS x0.25',
      icon: '❄️',
      effects: { cpcMultiplier: 3, cpsMultiplier: 0.25 },
    },
  },
  {
    id: 6,
    name: 'Shurima',
    description: 'Ancient Desert Civilization',
    modifier: {
      id: 'sun-disc',
      name: 'Sun Disc',
      description: 'Time Echo x8, all other buildings x0.5',
      icon: '☀️',
      effects: {
        buildingMultipliers: {
          glockenturm: 0.5,
          klanggenerator: 0.5,
          harmoniewerk: 0.5,
          sphaerenMusik: 0.5,
          zeitEcho: 8,
        },
      },
    },
  },
  {
    id: 7,
    name: 'Ionia',
    description: 'Land of Harmony',
    modifier: {
      id: 'path-of-balance',
      name: 'Path of Balance',
      description: 'Skill point every level, Ability effects halved',
      icon: '☯️',
      effects: {
        skillPointInterval: 1,
        abilityCPSPerLevel: 0.075,
        abilityCPCPerLevel: 0.125,
        abilityPowerPerLevel: 150,
        abilityMeepCostPerLevel: 0.05,
      },
    },
  },
  {
    id: 8,
    name: 'Noxus',
    description: 'Empire of Strength',
    modifier: {
      id: 'might-is-right',
      name: 'Might Makes Right',
      description: 'Battle-Power x2.5, Expedition-Rewards x0.3',
      icon: '⚔️',
      effects: { eloPowerMultiplier: 2.5, expeditionRewardMultiplier: 0.3 },
    },
  },
  {
    id: 9,
    name: 'Demacia',
    description: 'Kingdom of Justice',
    modifier: {
      id: 'just-order',
      name: 'Just Order',
      description: 'Building Costs x0.6, CPS x0.6',
      icon: '/img/roles/top.png',
      effects: { buildingCostMultiplier: 0.6, cpsMultiplier: 0.6 },
    },
  },
  {
    id: 10,
    name: 'Piltover',
    description: 'City of Progress',
    modifier: {
      id: 'hextech-overdrive',
      name: 'Hextech Overdrive',
      description: 'CPS x3, CPC x3, Building Costs x3, Meep Costs x2',
      icon: '⚙️',
      effects: { cpsMultiplier: 3, cpcMultiplier: 3, buildingCostMultiplier: 3, meepCostMultiplier: 2 },
    },
  },
]
