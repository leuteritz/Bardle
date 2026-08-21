import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { notifyBadgeCounters, useNotifyBadgeRows } from '@/composables/ui/useNotifyBadges'
import { NOTIFY_BADGES } from '@/config/ui/notifyBadges'

/*
 * Die Zählschicht ist die Naht zwischen Registry und Stores. Wer eine Marke
 * einträgt, aber ihren Getter vergisst, bekäme überall stumm eine 0 — im
 * Header, im Tooltip, im Herold und im Badge Lab zugleich.
 */

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('notifyBadgeCounters', () => {
  it('kennt jede Marke der Registry', () => {
    const counters = notifyBadgeCounters()
    for (const badge of NOTIFY_BADGES) {
      expect(typeof counters[badge.id], badge.id).toBe('function')
    }
  })

  it('liefert für jede Marke eine endliche Zahl auf frischem Spielstand', () => {
    const counters = notifyBadgeCounters()
    for (const badge of NOTIFY_BADGES) {
      const n = counters[badge.id]()
      expect(Number.isFinite(n), badge.id).toBe(true)
      expect(n, badge.id).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('useNotifyBadgeRows', () => {
  it('gibt jede Marke der Registry mit ihrer Zahl zurück', () => {
    const rows = useNotifyBadgeRows()
    expect(rows.value.map((r) => r.def.id)).toEqual(NOTIFY_BADGES.map((b) => b.id))
    for (const row of rows.value) expect(row.count).toBe(0)
  })
})
