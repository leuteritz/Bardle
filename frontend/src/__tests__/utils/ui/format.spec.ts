import { describe, it, expect } from 'vitest'
import { durationSegments } from '@/utils/ui/format'

const S = 1000
const M = 60 * S
const H = 60 * M
const D = 24 * H

describe('durationSegments', () => {
  it('always returns all four units, in order', () => {
    for (const ms of [0, 42 * S, 9 * M, 5 * H, 400 * D]) {
      expect(durationSegments(ms).map((s) => s.unit)).toEqual(['days', 'hrs', 'min', 'sec'])
    }
  })

  it('splits a multi-day duration correctly', () => {
    expect(durationSegments(3 * D + 4 * H + 7 * M + 9 * S)).toEqual([
      { value: '03', unit: 'days', leadingZero: false },
      { value: '04', unit: 'hrs', leadingZero: false },
      { value: '07', unit: 'min', leadingZero: false },
      { value: '09', unit: 'sec', leadingZero: false },
    ])
  })

  it('keeps days and hours visible on a fresh save', () => {
    expect(durationSegments(34 * M + 13 * S)).toEqual([
      { value: '00', unit: 'days', leadingZero: true },
      { value: '00', unit: 'hrs', leadingZero: true },
      { value: '34', unit: 'min', leadingZero: false },
      { value: '13', unit: 'sec', leadingZero: false },
    ])
  })

  it('marks only the leading zeros, never a zero after a real value', () => {
    // 1 day, 0 hours, 0 minutes, 5 seconds — the inner zeros are real values
    expect(durationSegments(1 * D + 5 * S).map((s) => s.leadingZero)).toEqual([
      false,
      false,
      false,
      false,
    ])
    expect(durationSegments(2 * H + 5 * S).map((s) => s.leadingZero)).toEqual([
      true,
      false,
      false,
      false,
    ])
  })

  it('handles zero and negative input without breaking', () => {
    const zero = durationSegments(0)
    expect(zero.map((s) => s.value)).toEqual(['00', '00', '00', '00'])
    expect(zero.every((s) => s.leadingZero)).toBe(true)
    expect(durationSegments(-5000).map((s) => s.value)).toEqual(['00', '00', '00', '00'])
  })

  it('pads every block to two digits so the readout never gains width', () => {
    for (const ms of [0, 42 * S, 9 * M, 5 * H, 1 * D, 9 * D + 9 * H + 9 * M]) {
      for (const seg of durationSegments(ms)) {
        expect(seg.value.length, `"${seg.value}" is not two digits`).toBe(2)
      }
    }
  })

  it('keeps counting past two digits instead of truncating', () => {
    const [days] = durationSegments(365 * D)
    expect(days).toEqual({ value: '365', unit: 'days', leadingZero: false })
  })
})
