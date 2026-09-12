import { describe, it, expect } from 'vitest'
import { buffAxisLabel, buffPeakMultiplier, buffShortLabel } from '@/utils/ui/buffAxis'
import { DRIFTER_BUFF_EFFECT_LABELS, DRIFTER_BUFF_LABEL_ALL } from '@/config/world/drifters'

describe('buffAxis', () => {
  it('names one axis, or ALL for several', () => {
    expect(buffAxisLabel({ cpcMult: 3 })).toBe(DRIFTER_BUFF_EFFECT_LABELS.cpcMult)
    expect(buffAxisLabel({ cpcMult: 3, cpsMult: 2 })).toBe(DRIFTER_BUFF_LABEL_ALL)
  })

  it('reports the peak factor', () => {
    expect(buffPeakMultiplier({ cpcMult: 3, cpsMult: 2 })).toBe(3)
    expect(buffPeakMultiplier({})).toBe(1)
  })

  it('shortens the long axis words for the effect token and leaves the rest', () => {
    expect(buffShortLabel('PER CLICK')).toBe('CLICK')
    expect(buffShortLabel('DAMAGE')).toBe('DMG')
    expect(buffShortLabel('CHIMES')).toBe('CHIMES')
    expect(buffShortLabel(DRIFTER_BUFF_LABEL_ALL)).toBe(DRIFTER_BUFF_LABEL_ALL)
  })
})
