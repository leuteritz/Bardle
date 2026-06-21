import type { ChampionOrigin, OriginSynergyDef } from '../types'
import { CHAMPION_DATA } from './championData'

export const ORIGIN_COLORS: Record<ChampionOrigin, string> = {
  'Bandle City': '#f5c842',
  'Bilgewater': '#2e8b72',
  'Demacia': '#3a6db5',
  'Ionia': '#c084c0',
  'Ixtal': '#3a8a3a',
  'Noxus': '#a82020',
  'Piltover': '#c07c30',
  'Shadow Isles': '#1a7a5e',
  'Shurima': '#c8a020',
  'Targon': '#c0c8e0',
  'The Freljord': '#4a90c0',
  'The Void': '#8040c0',
  'Zaun': '#4a9a20',
  'Runeterra': '#8a8a6a',
}

export const ORIGIN_SYNERGIES: Partial<Record<ChampionOrigin, OriginSynergyDef>> = {
  'Bandle City': {
    origin: 'Bandle City',
    name: 'Yordle Trickery',
    color: '#f5c842',
    icon: 'game-icons:mushroom',
    thresholds: [
      { count: 2, bonus: 'Yordle Trickery: CPS +8%', effects: [{ type: 'cps', multiplier: 1.08 }] },
      { count: 4, bonus: 'Yordle Trickery: CPS +15%', effects: [{ type: 'cps', multiplier: 1.15 }] },
    ],
  },
  'Bilgewater': {
    origin: 'Bilgewater',
    name: "Sea Dogs' Edge",
    color: '#2e8b72',
    icon: 'game-icons:anchor',
    thresholds: [
      { count: 2, bonus: "Sea Dogs' Edge: DPS +10%", effects: [{ type: 'dps', multiplier: 1.10 }] },
      { count: 3, bonus: "Sea Dogs' Edge: DPS +18%", effects: [{ type: 'dps', multiplier: 1.18 }] },
    ],
  },
  'Demacia': {
    origin: 'Demacia',
    name: "Justice's Shield",
    color: '#3a6db5',
    icon: 'game-icons:round-shield',
    thresholds: [
      { count: 2, bonus: "Justice's Shield: Power +8%", effects: [{ type: 'power', multiplier: 1.08 }] },
      { count: 4, bonus: "Justice's Shield: Power +15%", effects: [{ type: 'power', multiplier: 1.15 }] },
    ],
  },
  'Ionia': {
    origin: 'Ionia',
    name: 'Way of the Blade',
    color: '#c084c0',
    icon: 'game-icons:lotus-flower',
    thresholds: [
      { count: 2, bonus: 'Way of the Blade: CPS +10%', effects: [{ type: 'cps', multiplier: 1.10 }] },
      { count: 4, bonus: 'Way of the Blade: CPS +20%', effects: [{ type: 'cps', multiplier: 1.20 }] },
    ],
  },
  'Ixtal': {
    origin: 'Ixtal',
    name: 'Jungle Dominance',
    color: '#3a8a3a',
    icon: 'game-icons:vine-leaf',
    thresholds: [
      { count: 2, bonus: 'Jungle Dominance: DPS +8%', effects: [{ type: 'dps', multiplier: 1.08 }] },
      { count: 3, bonus: 'Jungle Dominance: DPS +15%', effects: [{ type: 'dps', multiplier: 1.15 }] },
    ],
  },
  'Noxus': {
    origin: 'Noxus',
    name: 'Blood and Conquest',
    color: '#a82020',
    icon: 'game-icons:battle-axe',
    thresholds: [
      { count: 2, bonus: 'Blood and Conquest: DPS +12%', effects: [{ type: 'dps', multiplier: 1.12 }] },
      { count: 4, bonus: 'Blood and Conquest: DPS +22%', effects: [{ type: 'dps', multiplier: 1.22 }] },
    ],
  },
  'Piltover': {
    origin: 'Piltover',
    name: 'Progress and Science',
    color: '#c07c30',
    icon: 'game-icons:cog',
    thresholds: [
      { count: 2, bonus: 'Progress and Science: CPS +10%', effects: [{ type: 'cps', multiplier: 1.10 }] },
      { count: 3, bonus: 'Progress and Science: CPS +18%', effects: [{ type: 'cps', multiplier: 1.18 }] },
    ],
  },
  'Shadow Isles': {
    origin: 'Shadow Isles',
    name: "Ruination's Grasp",
    color: '#1a7a5e',
    icon: 'game-icons:crowned-skull',
    thresholds: [
      { count: 2, bonus: "Ruination's Grasp: Power +10%", effects: [{ type: 'power', multiplier: 1.10 }] },
      { count: 4, bonus: "Ruination's Grasp: Power +18%", effects: [{ type: 'power', multiplier: 1.18 }] },
    ],
  },
  'Shurima': {
    origin: 'Shurima',
    name: "Ascension's Call",
    color: '#c8a020',
    icon: 'game-icons:great-pyramid',
    thresholds: [
      { count: 2, bonus: "Ascension's Call: CPS +8%", effects: [{ type: 'cps', multiplier: 1.08 }] },
      { count: 4, bonus: "Ascension's Call: CPS +15%", effects: [{ type: 'cps', multiplier: 1.15 }] },
      { count: 6, bonus: "Ascension's Call: CPS +25%", effects: [{ type: 'cps', multiplier: 1.25 }] },
    ],
  },
  'Targon': {
    origin: 'Targon',
    name: 'Celestial Chosen',
    color: '#c0c8e0',
    icon: 'game-icons:mountains',
    thresholds: [
      { count: 2, bonus: 'Celestial Chosen: Power +12%', effects: [{ type: 'power', multiplier: 1.12 }] },
      { count: 4, bonus: 'Celestial Chosen: Power +20%', effects: [{ type: 'power', multiplier: 1.20 }] },
    ],
  },
  'The Freljord': {
    origin: 'The Freljord',
    name: "Winter's Embrace",
    color: '#4a90c0',
    icon: 'game-icons:snowflake-1',
    thresholds: [
      { count: 2, bonus: "Winter's Embrace: Power +8%", effects: [{ type: 'power', multiplier: 1.08 }] },
      { count: 4, bonus: "Winter's Embrace: Power +15%", effects: [{ type: 'power', multiplier: 1.15 }] },
    ],
  },
  'The Void': {
    origin: 'The Void',
    name: 'Void Corruption',
    color: '#8040c0',
    icon: 'game-icons:suckered-tentacle',
    thresholds: [
      { count: 2, bonus: 'Void Corruption: DPS +12%', effects: [{ type: 'dps', multiplier: 1.12 }] },
      { count: 4, bonus: 'Void Corruption: DPS +20%', effects: [{ type: 'dps', multiplier: 1.20 }] },
      { count: 6, bonus: 'Void Corruption: DPS +35%', effects: [{ type: 'dps', multiplier: 1.35 }] },
    ],
  },
  'Zaun': {
    origin: 'Zaun',
    name: 'Chem-Tech Surge',
    color: '#4a9a20',
    icon: 'game-icons:gas-mask',
    thresholds: [
      { count: 2, bonus: 'Chem-Tech Surge: CPS +8%', effects: [{ type: 'cps', multiplier: 1.08 }] },
      { count: 3, bonus: 'Chem-Tech Surge: CPS +15%', effects: [{ type: 'cps', multiplier: 1.15 }] },
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
