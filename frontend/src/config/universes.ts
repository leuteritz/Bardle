import type { UniverseConfig } from '../types'

export const universes: UniverseConfig[] = [
  {
    id: 1,
    name: 'Runeterra Prime',
    description: 'Das ursprüngliche Universum',
    modifier: null,
  },
  {
    id: 2,
    name: 'Void Nexus',
    description: 'Dimension der Leere',
    modifier: {
      id: 'void-hunger',
      name: 'Void Hunger',
      description: 'CPS x2, Gebäude-Kosten x1.75',
      icon: '🕳️',
      effects: { cpsMultiplier: 2, buildingCostMultiplier: 1.75 },
    },
  },
  {
    id: 3,
    name: 'Celestial Realm',
    description: 'Himmlisches Reich',
    modifier: {
      id: 'celestial-harmony',
      name: 'Himmlische Harmonie',
      description: 'Schneller leveln (Exponent 0.9), Max Ability Level 3',
      icon: '✨',
      effects: { levelExponent: 0.9, maxAbilityLevel: 3 },
    },
  },
  {
    id: 4,
    name: 'Shadow Isles',
    description: 'Inseln der Schatten',
    modifier: {
      id: 'shadow-harvest',
      name: 'Schattenernte',
      description: 'Meep-Kosten x0.01, Meep-Power x0.4',
      icon: '👻',
      effects: { meepCostMultiplier: 0.01, meepPowerMultiplier: 0.4 },
    },
  },
  {
    id: 5,
    name: 'Freljord',
    description: 'Ewige Eiswüste',
    modifier: {
      id: 'frozen-resonance',
      name: 'Gefrorene Resonanz',
      description: 'CPC x3, CPS x0.25',
      icon: '❄️',
      effects: { cpcMultiplier: 3, cpsMultiplier: 0.25 },
    },
  },
  {
    id: 6,
    name: 'Shurima',
    description: 'Antike Wüstenzivilisation',
    modifier: {
      id: 'sun-disc',
      name: 'Sonnenscheibe',
      description: 'Zeit Echo x8, alle anderen Gebäude x0.5',
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
    description: 'Land der Harmonie',
    modifier: {
      id: 'path-of-balance',
      name: 'Pfad der Balance',
      description: 'Skillpunkt jedes Level, Ability-Effekte halbiert',
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
    description: 'Imperium der Stärke',
    modifier: {
      id: 'might-is-right',
      name: 'Macht ist Recht',
      description: 'Battle-Power x2.5, Expedition-Rewards x0.3',
      icon: '⚔️',
      effects: { eloPowerMultiplier: 2.5, expeditionRewardMultiplier: 0.3 },
    },
  },
  {
    id: 9,
    name: 'Demacia',
    description: 'Königreich der Gerechtigkeit',
    modifier: {
      id: 'just-order',
      name: 'Gerechte Ordnung',
      description: 'Gebäude-Kosten x0.6, CPS x0.6',
      icon: '🛡️',
      effects: { buildingCostMultiplier: 0.6, cpsMultiplier: 0.6 },
    },
  },
  {
    id: 10,
    name: 'Piltover',
    description: 'Stadt des Fortschritts',
    modifier: {
      id: 'hextech-overdrive',
      name: 'Hextech Overdrive',
      description: 'CPS x3, CPC x3, Gebäude-Kosten x3, Meep-Kosten x2',
      icon: '⚙️',
      effects: { cpsMultiplier: 3, cpcMultiplier: 3, buildingCostMultiplier: 3, meepCostMultiplier: 2 },
    },
  },
]
