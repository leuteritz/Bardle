import { describe, it, expect } from 'vitest'
import { starBodySize, starSystemScale } from '@/utils/orbit/geometry'
import {
  STAR_BODY_SIZE_BOSS_ESCORT_MIN,
  STAR_BODY_SIZE_GALAXY_BOSS_MIN,
  STAR_SYSTEM_MIN_SUN_SCALE,
} from '@/config/constants'

describe('starBodySize — der Boden des Sternsystems', () => {
  it('klemmt die Sonnenskala nur nach unten', () => {
    expect(starSystemScale(0.2)).toBe(STAR_SYSTEM_MIN_SUN_SCALE)
    expect(starSystemScale(STAR_SYSTEM_MIN_SUN_SCALE)).toBe(STAR_SYSTEM_MIN_SUN_SCALE)
    expect(starSystemScale(1.06)).toBe(1.06)
  })

  it('unter dem Boden ist der Stern so gross wie AM Boden — und darüber wächst er', () => {
    for (const type of ['champion', 'resource'] as const) {
      const floor = starBodySize(type, STAR_SYSTEM_MIN_SUN_SCALE)
      expect(starBodySize(type, 0.2), type).toBe(floor)
      expect(starBodySize(type, 0.05), type).toBe(floor)
      expect(starBodySize(type, 1), type).toBeGreaterThan(floor)
      expect(floor, type).toBeGreaterThanOrEqual(30)
    }
  })

  it('Boss und Eskorte unterschreiten ihre Mindestgrösse nie', () => {
    expect(starBodySize('galaxy_boss', 0.05)).toBeGreaterThanOrEqual(STAR_BODY_SIZE_GALAXY_BOSS_MIN)
    expect(starBodySize('boss_escort', 0.05)).toBeGreaterThanOrEqual(STAR_BODY_SIZE_BOSS_ESCORT_MIN)
    expect(starBodySize('galaxy_boss', 1)).toBeGreaterThan(starBodySize('boss_escort', 1))
  })
})
