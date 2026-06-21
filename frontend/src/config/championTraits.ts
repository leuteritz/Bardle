import type { TraitDefinition, TraitId } from '../types'
import { CHAMPION_DATA } from './championData'

// 15 TFT-inspired trait definitions with 4 activation thresholds each
export const TRAIT_DEFINITIONS: TraitDefinition[] = [
  {
    id: 'celestial',
    name: 'Celestial',
    icon: 'game-icons:stars-stack',
    color: '#a0c8ff',
    thresholds: [
      { count: 2, bonus: 'CPS +8%', effects: [{ type: 'cps', multiplier: 1.08 }] },
      { count: 4, bonus: 'CPS +18%', effects: [{ type: 'cps', multiplier: 1.18 }] },
      { count: 6, bonus: 'CPS +30%', effects: [{ type: 'cps', multiplier: 1.3 }] },
      { count: 8, bonus: 'CPS +45%', effects: [{ type: 'cps', multiplier: 1.45 }] },
    ],
  },
  {
    id: 'arcanist',
    name: 'Arcanist',
    icon: 'game-icons:crystal-ball',
    color: '#b060e0',
    thresholds: [
      { count: 2, bonus: 'DPS +10%', effects: [{ type: 'dps', multiplier: 1.1 }] },
      { count: 4, bonus: 'DPS +22%', effects: [{ type: 'dps', multiplier: 1.22 }] },
      { count: 6, bonus: 'DPS +35%', effects: [{ type: 'dps', multiplier: 1.35 }] },
      { count: 8, bonus: 'DPS +50%', effects: [{ type: 'dps', multiplier: 1.5 }] },
    ],
  },
  {
    id: 'assassin',
    name: 'Assassin',
    icon: 'game-icons:stiletto',
    color: '#c83030',
    thresholds: [
      { count: 2, bonus: 'DPS +15%', effects: [{ type: 'dps', multiplier: 1.15 }] },
      { count: 4, bonus: 'DPS +28%', effects: [{ type: 'dps', multiplier: 1.28 }] },
      { count: 6, bonus: 'DPS +45%', effects: [{ type: 'dps', multiplier: 1.45 }] },
      { count: 8, bonus: 'DPS +65%', effects: [{ type: 'dps', multiplier: 1.65 }] },
    ],
  },
  {
    id: 'enchanter',
    name: 'Enchanter',
    icon: 'game-icons:fairy-wand',
    color: '#40d080',
    thresholds: [
      { count: 2, bonus: 'Power +10%', effects: [{ type: 'power', multiplier: 1.1 }] },
      { count: 4, bonus: 'Power +20%', effects: [{ type: 'power', multiplier: 1.2 }] },
      { count: 6, bonus: 'Power +35%', effects: [{ type: 'power', multiplier: 1.35 }] },
      { count: 8, bonus: 'Power +50%', effects: [{ type: 'power', multiplier: 1.5 }] },
    ],
  },
  {
    id: 'duelist',
    name: 'Duelist',
    icon: 'game-icons:crossed-swords',
    color: '#e8b040',
    thresholds: [
      { count: 2, bonus: 'DPS +12%', effects: [{ type: 'dps', multiplier: 1.12 }] },
      { count: 4, bonus: 'DPS +25%', effects: [{ type: 'dps', multiplier: 1.25 }] },
      { count: 6, bonus: 'DPS +40%', effects: [{ type: 'dps', multiplier: 1.4 }] },
      { count: 8, bonus: 'DPS +58%', effects: [{ type: 'dps', multiplier: 1.58 }] },
    ],
  },
  {
    id: 'guardian',
    name: 'Guardian',
    icon: 'game-icons:shield',
    color: '#5080d0',
    thresholds: [
      { count: 2, bonus: 'Power +8%', effects: [{ type: 'power', multiplier: 1.08 }] },
      { count: 4, bonus: 'Power +18%', effects: [{ type: 'power', multiplier: 1.18 }] },
      { count: 6, bonus: 'Power +30%', effects: [{ type: 'power', multiplier: 1.3 }] },
      { count: 8, bonus: 'Power +45%', effects: [{ type: 'power', multiplier: 1.45 }] },
    ],
  },
  {
    id: 'challenger',
    name: 'Challenger',
    icon: 'game-icons:trophy',
    color: '#ff8020',
    thresholds: [
      { count: 2, bonus: 'Power +10%', effects: [{ type: 'power', multiplier: 1.1 }] },
      { count: 4, bonus: 'Power +22%', effects: [{ type: 'power', multiplier: 1.22 }] },
      { count: 6, bonus: 'Power +38%', effects: [{ type: 'power', multiplier: 1.38 }] },
      { count: 8, bonus: 'Power +58%', effects: [{ type: 'power', multiplier: 1.58 }] },
    ],
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: 'game-icons:ghost',
    color: '#9060c0',
    thresholds: [
      { count: 2, bonus: 'CPS +10%', effects: [{ type: 'cps', multiplier: 1.1 }] },
      { count: 4, bonus: 'CPS +22%', effects: [{ type: 'cps', multiplier: 1.22 }] },
      { count: 6, bonus: 'CPS +35%', effects: [{ type: 'cps', multiplier: 1.35 }] },
      { count: 8, bonus: 'CPS +52%', effects: [{ type: 'cps', multiplier: 1.52 }] },
    ],
  },
  {
    id: 'moonlight',
    name: 'Moonlight',
    icon: 'game-icons:crescent-blade',
    color: '#7090d8',
    thresholds: [
      { count: 2, bonus: 'CPS +8%', effects: [{ type: 'cps', multiplier: 1.08 }] },
      { count: 4, bonus: 'CPS +16%', effects: [{ type: 'cps', multiplier: 1.16 }] },
      { count: 6, bonus: 'CPS +27%', effects: [{ type: 'cps', multiplier: 1.27 }] },
      { count: 8, bonus: 'CPS +42%', effects: [{ type: 'cps', multiplier: 1.42 }] },
    ],
  },
  {
    id: 'dark_star',
    name: 'Dark Star',
    icon: 'game-icons:magic-swirl',
    color: '#7040b0',
    thresholds: [
      { count: 2, bonus: 'Power +12%', effects: [{ type: 'power', multiplier: 1.12 }] },
      { count: 4, bonus: 'Power +25%', effects: [{ type: 'power', multiplier: 1.25 }] },
      { count: 6, bonus: 'Power +42%', effects: [{ type: 'power', multiplier: 1.42 }] },
      { count: 8, bonus: 'Power +62%', effects: [{ type: 'power', multiplier: 1.62 }] },
    ],
  },
  {
    id: 'elderwood',
    name: 'Elderwood',
    icon: 'game-icons:oak-leaf',
    color: '#508040',
    thresholds: [
      { count: 2, bonus: 'CPS +10%', effects: [{ type: 'cps', multiplier: 1.1 }] },
      { count: 4, bonus: 'CPS +20%', effects: [{ type: 'cps', multiplier: 1.2 }] },
      { count: 6, bonus: 'CPS +32%', effects: [{ type: 'cps', multiplier: 1.32 }] },
      { count: 8, bonus: 'CPS +48%', effects: [{ type: 'cps', multiplier: 1.48 }] },
    ],
  },
  {
    id: 'reaper',
    name: 'Reaper',
    icon: 'game-icons:scythe',
    color: '#806040',
    thresholds: [
      { count: 2, bonus: 'DPS +10%', effects: [{ type: 'dps', multiplier: 1.1 }] },
      { count: 4, bonus: 'DPS +22%', effects: [{ type: 'dps', multiplier: 1.22 }] },
      { count: 6, bonus: 'DPS +38%', effects: [{ type: 'dps', multiplier: 1.38 }] },
      { count: 8, bonus: 'DPS +58%', effects: [{ type: 'dps', multiplier: 1.58 }] },
    ],
  },
  {
    id: 'invoker',
    name: 'Invoker',
    icon: 'game-icons:scroll-unfurled',
    color: '#60c0c0',
    thresholds: [
      { count: 2, bonus: 'CPS +8%', effects: [{ type: 'cps', multiplier: 1.08 }] },
      { count: 4, bonus: 'CPS +8%, Power +12%', effects: [{ type: 'cps', multiplier: 1.08 }, { type: 'power', multiplier: 1.12 }] },
      { count: 6, bonus: 'CPS +20%, Power +18%', effects: [{ type: 'cps', multiplier: 1.2 }, { type: 'power', multiplier: 1.18 }] },
      { count: 8, bonus: 'CPS +30%, Power +30%', effects: [{ type: 'cps', multiplier: 1.3 }, { type: 'power', multiplier: 1.3 }] },
    ],
  },
  {
    id: 'jade',
    name: 'Jade',
    icon: 'game-icons:gems',
    color: '#30a060',
    thresholds: [
      { count: 2, bonus: 'CPS +8%', effects: [{ type: 'cps', multiplier: 1.08 }] },
      { count: 4, bonus: 'CPS +16%', effects: [{ type: 'cps', multiplier: 1.16 }] },
      { count: 6, bonus: 'CPS +28%', effects: [{ type: 'cps', multiplier: 1.28 }] },
      { count: 8, bonus: 'CPS +42%', effects: [{ type: 'cps', multiplier: 1.42 }] },
    ],
  },
  {
    id: 'astral',
    name: 'Astral',
    icon: 'game-icons:telescope',
    color: '#f0c040',
    thresholds: [
      { count: 2, bonus: 'Power +8%', effects: [{ type: 'power', multiplier: 1.08 }] },
      { count: 4, bonus: 'Power +16%', effects: [{ type: 'power', multiplier: 1.16 }] },
      { count: 6, bonus: 'Power +28%', effects: [{ type: 'power', multiplier: 1.28 }] },
      { count: 8, bonus: 'Power +42%', effects: [{ type: 'power', multiplier: 1.42 }] },
    ],
  },
]

// Fast lookup by id
export const TRAIT_BY_ID: Record<TraitId, TraitDefinition> = Object.fromEntries(
  TRAIT_DEFINITIONS.map((t) => [t.id, t]),
) as Record<TraitId, TraitDefinition>

// Champion → traits mapping (derived from CHAMPION_DATA, plus Bard as player character)
export const CHAMPION_TRAITS: Record<string, TraitId[]> = {
  ...Object.fromEntries(Object.entries(CHAMPION_DATA).map(([n, d]) => [n, d.traits])),
  Bard: ['celestial'],
}
