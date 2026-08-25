import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { EVENT_LOG_MAX_SIZE, EVENT_LOG_DISMISS_MS, EVENT_LOG_HISTORY_MAX } from '@/config/constants'

// Die echte Fassung zieht drei Stores und den Fensterfokus nach — hier zählt
// allein, ob das Gate steht.
const paused = ref(false)
vi.mock('@/composables/system/useRenderingPaused', () => ({
  useRenderingPaused: () => ({ isRenderingPaused: paused }),
}))

import { useEventLog } from '@/composables/ui/useEventLog'
import { useUiStore } from '@/stores/core/uiStore'

/**
 * Die Spur ist flüchtig, die Historie nicht — und genau daran hängt, ob das
 * Log als Log taugt. Ein Ereignis, das bei pausiertem Spiel auflief, muss
 * später noch abrufbar sein; ein Ereignis ohne Spur darf keinen Timer zurück-
 * lassen, sonst laufen nach einer Nacht Abwesenheit Tausende leer.
 */
describe('useEventLog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    paused.value = false
    vi.useFakeTimers()
    useEventLog().clearEvents()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('legt ein Ereignis in Spur und Historie', () => {
    const { events, addEvent, historySize, readHistory } = useEventLog()
    addEvent('Ashe slays boss.', 'adc')

    expect(events.value).toHaveLength(1)
    expect(historySize.value).toBe(1)
    expect(readHistory()[0].message).toBe('Ashe slays boss.')
  })

  it('stellt in beiden Speichern das Neueste nach vorn', () => {
    const { events, addEvent, readHistory } = useEventLog()
    addEvent('first')
    addEvent('second')

    expect(events.value[0].message).toBe('second')
    expect(readHistory()[0].message).toBe('second')
  })

  it('kappt die Spur bei EVENT_LOG_MAX_SIZE', () => {
    const { events, addEvent } = useEventLog()
    for (let i = 0; i < EVENT_LOG_MAX_SIZE + 5; i++) addEvent(`e${i}`)

    expect(events.value).toHaveLength(EVENT_LOG_MAX_SIZE)
  })

  it('kappt die Historie bei EVENT_LOG_HISTORY_MAX und wirft das Älteste weg', () => {
    const { addEvent, historySize, readHistory } = useEventLog()
    for (let i = 0; i < EVENT_LOG_HISTORY_MAX + 20; i++) addEvent(`e${i}`)

    const history = readHistory()
    expect(historySize.value).toBe(EVENT_LOG_HISTORY_MAX)
    expect(history).toHaveLength(EVENT_LOG_HISTORY_MAX)
    expect(history[0].message).toBe(`e${EVENT_LOG_HISTORY_MAX + 19}`)
    expect(history.at(-1)?.message).toBe('e20')
  })

  it('räumt den Eintrag nach EVENT_LOG_DISMISS_MS aus der Spur, nicht aus der Historie', () => {
    const { events, addEvent, readHistory } = useEventLog()
    addEvent('fades')
    vi.advanceTimersByTime(EVENT_LOG_DISMISS_MS + 1)

    expect(events.value).toHaveLength(0)
    expect(readHistory()[0].message).toBe('fades')
  })

  it('schreibt bei pausiertem Rendering nur die Historie — und setzt keinen Timer', () => {
    const { events, addEvent, readHistory } = useEventLog()
    paused.value = true
    addEvent('happened while away')

    expect(events.value).toHaveLength(0)
    expect(readHistory()[0].message).toBe('happened while away')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('lässt die Spur stumm, solange das Panel dieselben Zeilen zeigt', () => {
    const { events, addEvent, readHistory } = useEventLog()
    useUiStore().isEventLogOpen = true
    addEvent('shown in the panel')

    expect(events.value).toHaveLength(0)
    expect(readHistory()).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('zählt historyVersion je Ereignis um genau eins hoch', () => {
    const { addEvent, historyVersion } = useEventLog()
    const before = historyVersion.value
    addEvent('one')
    addEvent('two')

    expect(historyVersion.value).toBe(before + 2)
  })

  it('leert mit clearEvents beide Speicher', () => {
    const { events, addEvent, clearEvents, historySize, readHistory } = useEventLog()
    addEvent('gone')
    clearEvents()

    expect(events.value).toHaveLength(0)
    expect(historySize.value).toBe(0)
    expect(readHistory()).toHaveLength(0)
  })
})
