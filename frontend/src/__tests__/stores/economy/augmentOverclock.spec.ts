import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import { AUGMENTS } from '@/config/economy/augments'
import {
  AUGMENT_OVERCLOCK_DEFAULT_MS,
  AUGMENT_OVERCLOCK_DEFAULT_MULT,
} from '@/config/constants'
import { resetGameClock } from '@/utils/game/gameClock'

/**
 * „Overclock" ist ein Zeitbuff auf die Produktion, ausgelöst von jedem
 * Level-Up. Er legte früher bei JEDEM Auslösen eine weitere Kopie an, und
 * `temporaryCPSMultiplier` multipliziert alle gleichzeitig laufenden — womit
 * der Kreis geschlossen war: mehr CpS → schnellere Level → noch eine Kopie.
 * Im Messlauf ergab das 2,2e12 aus einundvierzig Überlappungen.
 *
 * Ein Zeitbuff mit fester Dauer muss sein Fenster ERNEUERN, nicht seine
 * Wirkung potenzieren — dasselbe Muster wie `bardAbilityStore._applyBuff`.
 */
const OVERCLOCK = 'rare_overclock'
const def = AUGMENTS.find((a) => a.id === OVERCLOCK)!
const DURATION = def.specialEffect?.params.duration ?? AUGMENT_OVERCLOCK_DEFAULT_MS
const MULT = def.specialEffect?.params.multiplier ?? AUGMENT_OVERCLOCK_DEFAULT_MULT

describe('Augment „Overclock"', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetGameClock()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    resetGameClock()
  })

  it('wirkt nach dem ersten Level-Up mit seinem vollen Faktor', () => {
    const store = useAugmentStore()
    store.onLevelUp([OVERCLOCK])
    expect(store.temporaryCPSMultiplier).toBeCloseTo(MULT)
  })

  it('stapelt sich bei vielen Level-Ups NICHT auf', () => {
    const store = useAugmentStore()
    for (let i = 0; i < 40; i++) store.onLevelUp([OVERCLOCK])
    // Gestapelt wären das MULT^40 — bei MULT = 2 über eine Billion.
    expect(store.temporaryCPSMultiplier).toBeCloseTo(MULT)
    expect(store.activeTimedBuffs.filter((b) => b.augmentId === OVERCLOCK)).toHaveLength(1)
  })

  it('verlängert stattdessen sein Fenster', () => {
    const store = useAugmentStore()
    store.onLevelUp([OVERCLOCK])
    const firstExpiry = store.activeTimedBuffs[0].expiresAt

    vi.setSystemTime(Date.now() + DURATION / 2)
    store.onLevelUp([OVERCLOCK])

    expect(store.activeTimedBuffs).toHaveLength(1)
    expect(store.activeTimedBuffs[0].expiresAt).toBeGreaterThan(firstExpiry)
  })

  it('läuft aus, wenn kein Level-Up mehr nachlegt', () => {
    const store = useAugmentStore()
    store.onLevelUp([OVERCLOCK])
    vi.setSystemTime(Date.now() + DURATION + 1000)
    expect(store.temporaryCPSMultiplier).toBe(1)
  })

  it('rührt sich nicht ohne das Augment', () => {
    const store = useAugmentStore()
    store.onLevelUp([])
    expect(store.activeTimedBuffs).toHaveLength(0)
    expect(store.temporaryCPSMultiplier).toBe(1)
  })
})
