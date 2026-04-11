import type { PlanetType } from '../../types'

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
