import { setActivePinia, createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEventLog } from '@/composables/ui/useEventLog'
import { useEventLogPane } from '@/composables/ui/useEventLogPane'
import { usePersistence } from '@/composables/system/usePersistence'
import { useCpsStore } from '@/stores/core/cpsStore'
import { EVENT_LOG_FOLD_STORAGE_KEY, SAVE_KEY } from '@/config/constants'

function makeLocalStorageStub() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  }
}

describe('resetGame', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', makeLocalStorageStub())
    vi.useFakeTimers()
  })

  afterEach(() => {
    useCpsStore().stopProductionTracking()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('clears the event log without changing its fold state', () => {
    const pane = useEventLogPane()
    pane.toggleFold()
    useEventLog().addEvent('A forgotten trace.', 'info')
    localStorage.setItem(SAVE_KEY, 'old save')

    usePersistence().resetGame()

    expect(useEventLog().readHistory()).toHaveLength(0)
    expect(pane.folded.value).toBe(true)
    expect(localStorage.getItem(EVENT_LOG_FOLD_STORAGE_KEY)).toBe('1')
    expect(localStorage.getItem(SAVE_KEY)).toBeNull()
  })
})
