import { describe, expect, it } from 'vitest'
import {
  CLUSTER_COLOR_WEIGHTS,
  SPECTRAL_STAR_PALETTE,
  STAR_BG_COLOR_WEIGHTS,
} from '@/config/constants'
import {
  STAR_CLASS_WHITE,
  isPaletteColor,
  pickClusterStarColor,
  pickFieldStarColor,
  pickStarClass,
} from '@/composables/starBackground/starPalette'

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function classShare(weights: readonly number[], seed: number, draws = 20_000): number[] {
  const rand = seeded(seed)
  const hits = new Array(weights.length).fill(0)
  for (let i = 0; i < draws; i++) hits[pickStarClass(weights, rand)]++
  return hits.map((h) => h / draws)
}

describe('Sternpalette — Gewichte', () => {
  it('das freie Feld ist zu 15 % farbig, der Rest weiß', () => {
    const share = classShare(STAR_BG_COLOR_WEIGHTS, 7)
    expect(share[STAR_CLASS_WHITE]).toBeGreaterThan(0.82)
    expect(share[STAR_CLASS_WHITE]).toBeLessThan(0.88)
    const colored = share.reduce((s, v, i) => (i === STAR_CLASS_WHITE ? s : s + v), 0)
    expect(colored).toBeGreaterThan(0.12)
    expect(colored).toBeLessThan(0.18)
  })

  it('Rot ist der seltenste Ton — es ist der lauteste', () => {
    const share = classShare(STAR_BG_COLOR_WEIGHTS, 11)
    for (let i = 1; i < share.length; i++) expect(share[0]).toBeLessThan(share[i])
  })

  it('dense zieht wärmer als loose, loose blauer als dense', () => {
    const dense = classShare(CLUSTER_COLOR_WEIGHTS.dense, 3)
    const loose = classShare(CLUSTER_COLOR_WEIGHTS.loose, 3)
    const warm = (s: number[]) => s[0] + s[1] + s[2]
    expect(warm(dense)).toBeGreaterThan(warm(loose))
    expect(loose[4]).toBeGreaterThan(dense[4])
  })

  it('jede Gewichtstabelle hat einen Eintrag je Spektralklasse', () => {
    expect(STAR_BG_COLOR_WEIGHTS).toHaveLength(SPECTRAL_STAR_PALETTE.length)
    for (const w of Object.values(CLUSTER_COLOR_WEIGHTS)) {
      expect(w).toHaveLength(SPECTRAL_STAR_PALETTE.length)
    }
  })
})

describe('Sternpalette — Sprite-Cache-Wächter', () => {
  it('jede gezogene Farbe stammt aus der Palette', () => {
    const rand = seeded(23)
    for (let i = 0; i < 5000; i++) {
      expect(isPaletteColor(pickFieldStarColor(rand))).toBe(true)
    }
    for (const kind of Object.keys(CLUSTER_COLOR_WEIGHTS) as (keyof typeof CLUSTER_COLOR_WEIGHTS)[]) {
      for (let i = 0; i < 1000; i++) {
        expect(isPaletteColor(pickClusterStarColor(kind, rand))).toBe(true)
      }
    }
  })

  it('die Palette bleibt bei zehn Farben — eine elfte wäre ein Offscreen-Canvas je Tiefenstufe', () => {
    const seen = new Set<string>()
    for (const tones of SPECTRAL_STAR_PALETTE) for (const t of tones) seen.add(t.join(','))
    expect(seen.size).toBe(10)
  })
})
