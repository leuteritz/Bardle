import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EVENT_LOG_HISTORY_MAX } from '@/config/constants'
import { useEventLog } from '@/composables/ui/useEventLog'

/**
 * EIN Speicher, und er schweigt nie. Die flüchtige Spur ist mit dem dauerhaften
 * Panel entfallen; was bleibt, ist der Ring — plus eine rAF-Drossel, ohne die
 * die ganze Rechenkette des Panels je Ereignis statt je Frame liefe.
 */
describe('useEventLog', () => {
  let frames: FrameRequestCallback[] = []

  function runFrame() {
    const due = frames
    frames = []
    due.forEach((cb) => cb(0))
  }

  beforeEach(() => {
    frames = []
    // Reihenfolge zählt: useFakeTimers fakt rAF mit und überschriebe den Stub —
    // dann liefe der Flush als Timer und „setzt keinen Timer" prüfte nichts mehr.
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
    vi.stubGlobal('cancelAnimationFrame', () => {})
    useEventLog().clearEvents()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('legt ein Ereignis in die Historie', () => {
    const { addEvent, historySize, readHistory } = useEventLog()
    addEvent('Ashe slays boss.', 'adc')
    runFrame()

    expect(historySize.value).toBe(1)
    expect(readHistory()[0].message).toBe('Ashe slays boss.')
    expect(readHistory()[0].type).toBe('adc')
  })

  it('stellt das Neueste nach vorn', () => {
    const { addEvent, readHistory } = useEventLog()
    addEvent('first')
    addEvent('second')

    expect(readHistory()[0].message).toBe('second')
  })

  it('kappt bei EVENT_LOG_HISTORY_MAX und wirft das Älteste weg', () => {
    const { addEvent, historySize, readHistory } = useEventLog()
    for (let i = 0; i < EVENT_LOG_HISTORY_MAX + 20; i++) addEvent(`e${i}`)
    runFrame()

    const history = readHistory()
    expect(historySize.value).toBe(EVENT_LOG_HISTORY_MAX)
    expect(history).toHaveLength(EVENT_LOG_HISTORY_MAX)
    expect(history[0].message).toBe(`e${EVENT_LOG_HISTORY_MAX + 19}`)
    expect(history.at(-1)?.message).toBe('e20')
  })

  it('deckelt readHistory auf das Fenster, das das Panel rendert', () => {
    const { addEvent, readHistory } = useEventLog()
    for (let i = 0; i < 120; i++) addEvent(`e${i}`)

    expect(readHistory(60)).toHaveLength(60)
    expect(readHistory(60)[0].message).toBe('e119')
    expect(readHistory(500)).toHaveLength(120)
  })

  // Der Beleg, dass die Spur weg ist: sie war die einzige Timer-Quelle, und bei
  // langer Abwesenheit liefen davon Tausende auf eine Liste, in der die id nie stand.
  it('setzt keinen Timer', () => {
    const { addEvent } = useEventLog()
    for (let i = 0; i < 50; i++) addEvent(`e${i}`)

    expect(vi.getTimerCount()).toBe(0)
  })

  it('hebt historyVersion einmal je FRAME, nicht je Ereignis', () => {
    const { addEvent, historyVersion } = useEventLog()
    const before = historyVersion.value
    addEvent('one')
    addEvent('two')
    addEvent('three')

    expect(historyVersion.value).toBe(before)
    runFrame()
    expect(historyVersion.value).toBe(before + 1)
  })

  it('führt historySize im selben Takt nach', () => {
    const { addEvent, historySize } = useEventLog()
    addEvent('one')
    addEvent('two')

    expect(historySize.value).toBe(0)
    runFrame()
    expect(historySize.value).toBe(2)
  })

  it('läuft ohne requestAnimationFrame synchron weiter', () => {
    vi.stubGlobal('requestAnimationFrame', undefined)
    const { addEvent, historyVersion, historySize } = useEventLog()
    const before = historyVersion.value
    addEvent('no raf here')

    expect(historyVersion.value).toBe(before + 1)
    expect(historySize.value).toBe(1)
  })

  it('leert mit clearEvents sofort, ohne auf einen Frame zu warten', () => {
    const { addEvent, clearEvents, historySize, readHistory } = useEventLog()
    addEvent('gone')
    runFrame()
    clearEvents()

    expect(historySize.value).toBe(0)
    expect(readHistory()).toHaveLength(0)
  })
})
