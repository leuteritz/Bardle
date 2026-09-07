import { describe, it, expect } from 'vitest'
import { RANK_TIERS, RANK_TIER_COLOR_FALLBACK, RANK_EMBLEM_IMAGES } from '@/config/constants'
import { rankEmblemImage, rankTierColor } from '@/utils/game/rankEmblem'

describe('rankEmblem — one source for emblem and tier colour', () => {
  it('resolves every ladder tier', () => {
    for (const tier of RANK_TIERS) {
      expect(rankEmblemImage(tier), tier).toMatch(/^\/img\/RankBorder\/.+\.png$/)
      expect(rankTierColor(tier), tier).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('falls back for a tier the tables do not know', () => {
    expect(rankEmblemImage('Wood')).toBe(RANK_EMBLEM_IMAGES.Iron)
    expect(rankTierColor('Wood')).toBe(RANK_TIER_COLOR_FALLBACK)
  })
})
