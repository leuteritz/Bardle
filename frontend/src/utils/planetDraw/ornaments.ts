import type { PlanetType } from '@/utils/planetDraw/types'
import type { MoonSpec, RingSpec, ShardSpec } from '@/utils/planetDraw/svgHelpers'

/* ── Der Zierrat je Typ ──────────────────────────────────────────────────────
   Auf 24 px liest man Umriss und Helligkeit, keine Textur. Deshalb bekommt der
   Umriss die Arbeit: Trabant, Ringband, Splitter. Jede Reichweite hier braucht
   ihre Deckung in PLANET_SPRITE_SPANS.                                        */

export interface PlanetOrnaments {
  moons?: MoonSpec
  ring?: RingSpec
  shards?: ShardSpec
}

export const PLANET_ORNAMENTS: Partial<Record<PlanetType, PlanetOrnaments>> = {
  rocky: {
    moons: { min: 0, max: 2, fill: '#9a8878', shade: '#2c1e12' },
  },
  ocean: {
    moons: { min: 0, max: 1, fill: '#b8c8d8', shade: '#16283c' },
  },
  desert: {
    moons: { min: 0, max: 1, fill: '#d8c090', shade: '#3a2810' },
  },
  jungle: {
    moons: { min: 0, max: 1, fill: '#9ab090', shade: '#16240e' },
  },
  obsidian: {
    shards: { min: 2, max: 4, fill: '#2a2a32', rim: 'rgba(200,210,240,0.5)' },
  },
  ice: {
    ring: {
      inner: 1.18,
      outer: 1.44,
      color: 'rgba(190,230,255,0.5)',
      alpha: 0.75,
      flatMin: 0.16,
      flatMax: 0.3,
    },
  },
  'gas-giant': {
    ring: {
      inner: 1.22,
      outer: 1.52,
      color: 'rgba(226,190,140,0.45)',
      alpha: 0.8,
      flatMin: 0.14,
      flatMax: 0.28,
    },
  },
}
