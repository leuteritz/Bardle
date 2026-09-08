import { describe, it, expect } from 'vitest'
import {
  buildChampionCrestSprite,
  championCrestDetail,
  championCrestPx,
  championCrestSpriteKey,
  paintChampionCrest,
} from '@/utils/fx/championCrestSprite'
import {
  CHAMPION_CREST_BASE_SIZE,
  CHAMPION_CREST_MIN_SIZE,
  CHAMPION_CREST_ORNAMENT_MIN_SIZE,
  CHAMPION_CREST_PX_STEP,
  CHAMPION_CREST_STAGES,
} from '@/config/constants'
import { recordingCtx } from '../../helpers/recordingCtx'

const RGB = [80, 144, 232] as const
const R = 28
const U = (R * 2) / CHAMPION_CREST_BASE_SIZE

function opsFor(stage: number, detail: 0 | 1 = 1): string[] {
  const { ctx, ops } = recordingCtx()
  paintChampionCrest(ctx, 60, 60, R, RGB, stage, U, detail)
  return ops
}

describe('champion crest painter', () => {
  it('paints nothing at all on the bare stage', () => {
    expect(opsFor(0)).toHaveLength(0)
  })

  it('paints more with every stage', () => {
    let last = 0
    for (let i = 1; i < CHAMPION_CREST_STAGES.length; i++) {
      const n = opsFor(i).length
      expect(n, `stage ${CHAMPION_CREST_STAGES[i].name} is not richer`).toBeGreaterThan(last)
      last = n
    }
  })

  it('leaves the ornaments out below the ornament size', () => {
    const apex = CHAMPION_CREST_STAGES.length - 1
    const plain = opsFor(apex, 0)
    const full = opsFor(apex, 1)
    expect(plain.length).toBeGreaterThan(0)
    expect(plain.length).toBeLessThan(full.length)
    // Krone und Sweep sind die einzigen Bögen, die keinen vollen Kreis ziehen.
    expect(plain.some((o) => o.startsWith('arc(') && !o.includes('6.28'))).toBe(false)
    expect(full.some((o) => o.startsWith('arc(') && !o.includes('6.28'))).toBe(true)
  })

  it('keeps every mark outside the portrait — nothing is painted over the face', () => {
    const { ctx, ops } = recordingCtx()
    paintChampionCrest(ctx, 60, 60, R, RGB, CHAMPION_CREST_STAGES.length - 1, U, 1)
    const rings = ops
      .filter((o) => o.startsWith('arc(60,60,'))
      .map((o) => Number(o.split(',')[2]))
    expect(rings.length).toBeGreaterThan(0)
    for (const radius of rings) expect(radius).toBeGreaterThan(R)
  })
})

describe('champion crest keys and sizing', () => {
  it('drops ornaments below the ornament threshold', () => {
    expect(championCrestDetail(CHAMPION_CREST_ORNAMENT_MIN_SIZE)).toBe(1)
    expect(championCrestDetail(CHAMPION_CREST_ORNAMENT_MIN_SIZE - 1)).toBe(0)
  })

  it('snaps the sprite edge to the quantisation step', () => {
    for (const px of [24, 27, 41, 63, 77]) {
      expect(championCrestPx(px) % CHAMPION_CREST_PX_STEP).toBe(0)
      expect(Math.abs(championCrestPx(px) - px)).toBeLessThanOrEqual(CHAMPION_CREST_PX_STEP / 2)
    }
  })

  it('separates every field of the key', () => {
    const base = championCrestSpriteKey(3, RGB, 56, 2, 1)
    expect(championCrestSpriteKey(4, RGB, 56, 2, 1)).not.toBe(base)
    expect(championCrestSpriteKey(3, [232, 152, 64], 56, 2, 1)).not.toBe(base)
    expect(championCrestSpriteKey(3, RGB, 60, 2, 1)).not.toBe(base)
    expect(championCrestSpriteKey(3, RGB, 56, 1, 1)).not.toBe(base)
    expect(championCrestSpriteKey(3, RGB, 56, 2, 0)).not.toBe(base)
    expect(championCrestSpriteKey(3, RGB, 56, 2, 1)).toBe(base)
  })

  it('builds no sprite for the bare stage or for a body below the minimum', () => {
    expect(buildChampionCrestSprite(0, RGB, 56, 2, 1)).toBeNull()
    expect(buildChampionCrestSprite(3, RGB, CHAMPION_CREST_MIN_SIZE - 1, 2, 1)).toBeNull()
  })
})
