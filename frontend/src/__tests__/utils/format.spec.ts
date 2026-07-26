import { describe, it, expect } from 'vitest'
import { durationSegments } from '../../utils/format'

const S = 1000
const M = 60 * S
const H = 60 * M
const D = 24 * H

describe('durationSegments', () => {
  it('shows days / hours / minutes once a day is reached', () => {
    expect(durationSegments(3 * D + 4 * H + 7 * M + 9 * S)).toEqual([
      { value: '03', unit: 'days' },
      { value: '04', unit: 'hrs' },
      { value: '07', unit: 'min' },
    ])
  })

  it('shows hours / minutes / seconds below a day', () => {
    expect(durationSegments(5 * H + 2 * M + 40 * S)).toEqual([
      { value: '05', unit: 'hrs' },
      { value: '02', unit: 'min' },
      { value: '40', unit: 'sec' },
    ])
  })

  it('drops to minutes / seconds below an hour', () => {
    expect(durationSegments(9 * M + 5 * S)).toEqual([
      { value: '09', unit: 'min' },
      { value: '05', unit: 'sec' },
    ])
  })

  it('handles zero and negative input without breaking', () => {
    expect(durationSegments(0)).toEqual([
      { value: '00', unit: 'min' },
      { value: '00', unit: 'sec' },
    ])
    expect(durationSegments(-5000)).toEqual([
      { value: '00', unit: 'min' },
      { value: '00', unit: 'sec' },
    ])
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
    expect(days).toEqual({ value: '365', unit: 'days' })
  })
})
