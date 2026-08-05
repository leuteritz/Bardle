import type { ChampionOrigin, OriginSynergyDef } from '../types'
import { CHAMPION_DATA } from './championData'

export const ORIGIN_COLORS: Record<ChampionOrigin, string> = {
  'Bandle': '#f5c842',
  'Bilgewater': '#2e8b72',
  'Demacia': '#3a6db5',
  'Ionia': '#c084c0',
  'Ixtal': '#3a8a3a',
  'Noxus': '#a82020',
  'Piltover': '#c07c30',
  'Isles': '#1a7a5e',
  'Shurima': '#c8a020',
  'Targon': '#c0c8e0',
  'Freljord': '#4a90c0',
  'Void': '#8040c0',
  'Zaun': '#4a9a20',
  'Runeterra': '#8a8a6a',
}

export const ORIGIN_SYNERGIES: Partial<Record<ChampionOrigin, OriginSynergyDef>> = {
  'Bandle': {
    origin: 'Bandle',
    name: 'Trickery',
    color: '#f5c842',
    icon: 'game-icons:mushroom',
    thresholds: [
      { count: 2, bonus: 'Trickery: CPS +8%', effects: [{ type: 'cps', multiplier: 1.08 }] },
      { count: 4, bonus: 'Trickery: CPS +15%', effects: [{ type: 'cps', multiplier: 1.15 }] },
    ],
  },
  'Bilgewater': {
    origin: 'Bilgewater',
    name: 'Plunder',
    color: '#2e8b72',
    icon: 'game-icons:anchor',
    thresholds: [
      { count: 2, bonus: 'Plunder: DPS +10%', effects: [{ type: 'dps', multiplier: 1.10 }] },
      { count: 3, bonus: 'Plunder: DPS +18%', effects: [{ type: 'dps', multiplier: 1.18 }] },
    ],
  },
  'Demacia': {
    origin: 'Demacia',
    name: 'Justice',
    color: '#3a6db5',
    icon: 'game-icons:round-shield',
    thresholds: [
      { count: 2, bonus: 'Justice: Power +8%', effects: [{ type: 'power', multiplier: 1.08 }] },
      { count: 4, bonus: 'Justice: Power +15%', effects: [{ type: 'power', multiplier: 1.15 }] },
    ],
  },
  'Ionia': {
    origin: 'Ionia',
    name: 'Bladework',
    color: '#c084c0',
    icon: 'game-icons:lotus-flower',
    thresholds: [
      { count: 2, bonus: 'Bladework: CPS +10%', effects: [{ type: 'cps', multiplier: 1.10 }] },
      { count: 4, bonus: 'Bladework: CPS +20%', effects: [{ type: 'cps', multiplier: 1.20 }] },
    ],
  },
  'Ixtal': {
    origin: 'Ixtal',
    name: 'Dominance',
    color: '#3a8a3a',
    icon: 'game-icons:vine-leaf',
    thresholds: [
      { count: 2, bonus: 'Dominance: DPS +8%', effects: [{ type: 'dps', multiplier: 1.08 }] },
      { count: 3, bonus: 'Dominance: DPS +15%', effects: [{ type: 'dps', multiplier: 1.15 }] },
    ],
  },
  'Noxus': {
    origin: 'Noxus',
    name: 'Conquest',
    color: '#a82020',
    icon: 'game-icons:battle-axe',
    thresholds: [
      { count: 2, bonus: 'Conquest: DPS +12%', effects: [{ type: 'dps', multiplier: 1.12 }] },
      { count: 4, bonus: 'Conquest: DPS +22%', effects: [{ type: 'dps', multiplier: 1.22 }] },
    ],
  },
  'Piltover': {
    origin: 'Piltover',
    name: 'Progress',
    color: '#c07c30',
    icon: 'game-icons:cog',
    thresholds: [
      { count: 2, bonus: 'Progress: CPS +10%', effects: [{ type: 'cps', multiplier: 1.10 }] },
      { count: 3, bonus: 'Progress: CPS +18%', effects: [{ type: 'cps', multiplier: 1.18 }] },
    ],
  },
  'Isles': {
    origin: 'Isles',
    name: 'Ruination',
    color: '#1a7a5e',
    icon: 'game-icons:crowned-skull',
    thresholds: [
      { count: 2, bonus: 'Ruination: Power +10%', effects: [{ type: 'power', multiplier: 1.10 }] },
      { count: 4, bonus: 'Ruination: Power +18%', effects: [{ type: 'power', multiplier: 1.18 }] },
    ],
  },
  'Shurima': {
    origin: 'Shurima',
    name: 'Ascension',
    color: '#c8a020',
    icon: 'game-icons:great-pyramid',
    thresholds: [
      { count: 2, bonus: 'Ascension: CPS +8%', effects: [{ type: 'cps', multiplier: 1.08 }] },
      { count: 4, bonus: 'Ascension: CPS +15%', effects: [{ type: 'cps', multiplier: 1.15 }] },
      { count: 6, bonus: 'Ascension: CPS +25%', effects: [{ type: 'cps', multiplier: 1.25 }] },
    ],
  },
  'Targon': {
    origin: 'Targon',
    name: 'Chosen',
    color: '#c0c8e0',
    icon: 'game-icons:mountains',
    thresholds: [
      { count: 2, bonus: 'Chosen: Power +12%', effects: [{ type: 'power', multiplier: 1.12 }] },
      { count: 4, bonus: 'Chosen: Power +20%', effects: [{ type: 'power', multiplier: 1.20 }] },
    ],
  },
  'Freljord': {
    origin: 'Freljord',
    name: 'Winter',
    color: '#4a90c0',
    icon: 'game-icons:snowflake-1',
    thresholds: [
      { count: 2, bonus: 'Winter: Power +8%', effects: [{ type: 'power', multiplier: 1.08 }] },
      { count: 4, bonus: 'Winter: Power +15%', effects: [{ type: 'power', multiplier: 1.15 }] },
    ],
  },
  'Void': {
    origin: 'Void',
    name: 'Corruption',
    color: '#8040c0',
    icon: 'game-icons:suckered-tentacle',
    thresholds: [
      { count: 2, bonus: 'Corruption: DPS +12%', effects: [{ type: 'dps', multiplier: 1.12 }] },
      { count: 4, bonus: 'Corruption: DPS +20%', effects: [{ type: 'dps', multiplier: 1.20 }] },
      { count: 6, bonus: 'Corruption: DPS +35%', effects: [{ type: 'dps', multiplier: 1.35 }] },
    ],
  },
  'Zaun': {
    origin: 'Zaun',
    name: 'Chemtech',
    color: '#4a9a20',
    icon: 'game-icons:gas-mask',
    thresholds: [
      { count: 2, bonus: 'Chemtech: CPS +8%', effects: [{ type: 'cps', multiplier: 1.08 }] },
      { count: 3, bonus: 'Chemtech: CPS +15%', effects: [{ type: 'cps', multiplier: 1.15 }] },
    ],
  },
}

export const CHAMPION_ORIGINS: Record<string, ChampionOrigin> = {
  ...Object.fromEntries(Object.entries(CHAMPION_DATA).map(([n, d]) => [n, d.origin])),
  Bard: 'Runeterra',
}

export function getChampionOrigin(name: string): ChampionOrigin | null {
  return CHAMPION_ORIGINS[name] ?? null
}

export function getOriginColor(name: string | null | undefined): string {
  if (!name) return '#e8c040'
  const origin = CHAMPION_ORIGINS[name]
  if (!origin) return '#e8c040'
  return ORIGIN_COLORS[origin]
}
