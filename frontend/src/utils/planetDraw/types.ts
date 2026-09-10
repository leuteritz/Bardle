import type { PlanetType } from '@/types'
import { jitter } from '@/utils/fx/spaceBody'
import {
  PLANET_SIZE_REF_PX,
  PLANET_SIZE_COMPRESSION,
  PLANET_SIZE_FACTOR_MIN,
  PLANET_SIZE_FACTOR_MAX,
} from '@/config/constants'

export type { PlanetType }

export interface PlanetTypeConfig {
  type: PlanetType
  sizeMin: number
  sizeMax: number
  speedMin: number
  speedMax: number
  lifetime: number
  weight: number
}

export const PLANET_TYPE_CONFIGS: PlanetTypeConfig[] = [
  {
    type: 'rocky',
    sizeMin: 40,
    sizeMax: 90,
    speedMin: 2.0,
    speedMax: 5.2,
    lifetime: 14_000,
    weight: 3,
  },
  {
    type: 'ice',
    sizeMin: 45,
    sizeMax: 95,
    speedMin: 1.6,
    speedMax: 4.6,
    lifetime: 16_000,
    weight: 2,
  },
  {
    type: 'gas-giant',
    sizeMin: 80,
    sizeMax: 140,
    speedMin: 0.7,
    speedMax: 2.4,
    lifetime: 20_000,
    weight: 2,
  },
  {
    type: 'lava',
    sizeMin: 40,
    sizeMax: 80,
    speedMin: 2.6,
    speedMax: 6.5,
    lifetime: 12_000,
    weight: 2,
  },
  {
    type: 'ocean',
    sizeMin: 50,
    sizeMax: 100,
    speedMin: 1.3,
    speedMax: 3.9,
    lifetime: 17_000,
    weight: 2,
  },
  {
    type: 'desert',
    sizeMin: 40,
    sizeMax: 85,
    speedMin: 1.3,
    speedMax: 3.3,
    lifetime: 15_000,
    weight: 2,
  },
  {
    type: 'jungle',
    sizeMin: 50,
    sizeMax: 100,
    speedMin: 1.3,
    speedMax: 3.3,
    lifetime: 16_000,
    weight: 2,
  },
  {
    type: 'ringed',
    sizeMin: 70,
    sizeMax: 130,
    speedMin: 0.7,
    speedMax: 2.3,
    lifetime: 18_000,
    weight: 1,
  },
  {
    type: 'crystal',
    sizeMin: 45,
    sizeMax: 90,
    speedMin: 1.5,
    speedMax: 4.0,
    lifetime: 15_000,
    weight: 1,
  },
  {
    type: 'toxic',
    sizeMin: 45,
    sizeMax: 90,
    speedMin: 1.8,
    speedMax: 4.5,
    lifetime: 14_000,
    weight: 2,
  },
  {
    type: 'void',
    sizeMin: 50,
    sizeMax: 100,
    speedMin: 1.0,
    speedMax: 3.0,
    lifetime: 16_000,
    weight: 1,
  },
  {
    type: 'aurora',
    sizeMin: 50,
    sizeMax: 100,
    speedMin: 1.2,
    speedMax: 3.5,
    lifetime: 16_000,
    weight: 2,
  },
  {
    type: 'shattered',
    sizeMin: 45,
    sizeMax: 95,
    speedMin: 1.6,
    speedMax: 4.2,
    lifetime: 14_000,
    weight: 1,
  },
  {
    type: 'storm',
    sizeMin: 70,
    sizeMax: 130,
    speedMin: 0.8,
    speedMax: 2.6,
    lifetime: 18_000,
    weight: 1,
  },
  {
    type: 'bloom',
    sizeMin: 45,
    sizeMax: 90,
    speedMin: 1.4,
    speedMax: 3.8,
    lifetime: 15_000,
    weight: 1,
  },
  {
    type: 'neon',
    sizeMin: 50,
    sizeMax: 95,
    speedMin: 1.2,
    speedMax: 3.4,
    lifetime: 16_000,
    weight: 1,
  },
  {
    type: 'obsidian',
    sizeMin: 40,
    sizeMax: 85,
    speedMin: 1.8,
    speedMax: 4.6,
    lifetime: 14_000,
    weight: 1,
  },
  {
    type: 'coral',
    sizeMin: 50,
    sizeMax: 100,
    speedMin: 1.3,
    speedMax: 3.6,
    lifetime: 16_000,
    weight: 2,
  },
]

export const GAS_GIANT_PALETTES = [
  {
    base: '#c87941',
    bands: ['#a85a2a', '#d4a060', '#7a4020', '#e0aa6a', '#b86030', '#cc9045'],
    storm: '#e08050',
    stormRim: '#ffd080',
    stormInner: '#fff4c0',
  },
  {
    base: '#6b8db0',
    bands: ['#4a6d90', '#8aaac8', '#3a5070', '#9bbce0', '#5a7da0', '#7a9ab8'],
    storm: '#a0c8e8',
    stormRim: '#d8f0ff',
    stormInner: '#ffffff',
  },
  {
    base: '#7a9e5a',
    bands: ['#5a7a3a', '#9ab87a', '#3a5a2a', '#aaca8a', '#6a8e4a', '#88a868'],
    storm: '#c0e880',
    stormRim: '#e8ffc0',
    stormInner: '#f8fff0',
  },
  {
    base: '#9a5a7a',
    bands: ['#7a3a5a', '#ba7a9a', '#5a2040', '#caa0b8', '#8a4a6a', '#aa6888'],
    storm: '#e890b8',
    stormRim: '#ffd0e8',
    stormInner: '#fff0f8',
  },
]

/* ── Groessenklasse ──────────────────────────────────────────────────────────
   Deterministisch aus Typ und Seed, NIE aus der Zeichengroesse: klein und Hero
   kreuzblenden und muessen deckungsgleich sein.                               */

const CONFIG_BY_TYPE = new Map(PLANET_TYPE_CONFIGS.map((c) => [c.type, c]))

export function planetSizeFactor(type: PlanetType, seed: number | undefined): number {
  const cfg = CONFIG_BY_TYPE.get(type)
  if (!cfg) return 1
  const t = seed === undefined ? 0.5 : jitter(seed, 101)
  const px = cfg.sizeMin + t * (cfg.sizeMax - cfg.sizeMin)
  const raw = Math.pow(px / PLANET_SIZE_REF_PX, PLANET_SIZE_COMPRESSION)
  return Math.min(PLANET_SIZE_FACTOR_MAX, Math.max(PLANET_SIZE_FACTOR_MIN, raw))
}

/* ── Leitfarben je Typ ───────────────────────────────────────────────────────
   Nur noch der Rueckfall: solange das Sprite eines Planeten nicht gerastert ist,
   malt die Minimap ihre Kugel in diesen Toenen. Steht hier statt in der Minimap,
   damit Farbe und Painter EINEN Ort teilen.                                    */
export interface PlanetTint {
  base: string
  shadow: string
  highlight: string
  atmo: string
  ring: boolean
}

export const PLANET_TYPE_TINT: Record<PlanetType, PlanetTint> = {
  rocky: { base: '#8a7060', shadow: '#2a1808', highlight: '#b8a090', atmo: 'rgba(130,100,80,0.4)', ring: false },
  ice: { base: '#90c8f0', shadow: '#104060', highlight: '#d0f0ff', atmo: 'rgba(80,160,240,0.4)', ring: true },
  'gas-giant': { base: '#c87941', shadow: '#4a2010', highlight: '#e8aa70', atmo: 'rgba(200,120,60,0.45)', ring: true },
  lava: { base: '#e05020', shadow: '#600800', highlight: '#ff8050', atmo: 'rgba(240,80,30,0.5)', ring: false },
  ocean: { base: '#3080c0', shadow: '#082040', highlight: '#60c0f0', atmo: 'rgba(40,120,200,0.4)', ring: false },
  desert: { base: '#c8a048', shadow: '#604010', highlight: '#f0d080', atmo: 'rgba(200,160,60,0.4)', ring: false },
  jungle: { base: '#50a840', shadow: '#102808', highlight: '#90e870', atmo: 'rgba(60,180,50,0.4)', ring: false },
  ringed: { base: '#9060c0', shadow: '#200840', highlight: '#c090f0', atmo: 'rgba(140,80,220,0.45)', ring: true },
  crystal: { base: '#40d0c0', shadow: '#083838', highlight: '#b0fff0', atmo: 'rgba(70,220,200,0.45)', ring: false },
  toxic: { base: '#94c428', shadow: '#243008', highlight: '#d8f070', atmo: 'rgba(160,220,50,0.45)', ring: false },
  void: { base: '#402060', shadow: '#0a0418', highlight: '#a860e8', atmo: 'rgba(150,60,240,0.5)', ring: false },
  aurora: { base: '#4878a0', shadow: '#0a1830', highlight: '#80ffd0', atmo: 'rgba(90,255,190,0.4)', ring: false },
  shattered: { base: '#786450', shadow: '#1c1006', highlight: '#ffb060', atmo: 'rgba(255,140,50,0.4)', ring: false },
  storm: { base: '#4a5a9a', shadow: '#0a0e28', highlight: '#aabcf0', atmo: 'rgba(110,150,255,0.45)', ring: false },
  bloom: { base: '#f0a8c4', shadow: '#4a1c38', highlight: '#ffe0ec', atmo: 'rgba(255,170,200,0.45)', ring: false },
  neon: { base: '#1e2630', shadow: '#04060a', highlight: '#8cf0ff', atmo: 'rgba(80,200,255,0.4)', ring: false },
  obsidian: { base: '#2a2a32', shadow: '#040406', highlight: '#c8d0e8', atmo: 'rgba(180,190,220,0.3)', ring: false },
  coral: { base: '#40c8c0', shadow: '#043045', highlight: '#a0f0e8', atmo: 'rgba(90,230,220,0.45)', ring: false },
}
