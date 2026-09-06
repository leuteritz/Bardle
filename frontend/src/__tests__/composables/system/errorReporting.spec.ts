import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  consoleArgsToText,
  installErrorReporting,
  originOfLine,
  reportFault,
  shortOrigin,
} from '@/composables/system/useErrorReporting'
import { useEventLog, type GameEvent } from '@/composables/ui/useEventLog'
import { useEventLogPane } from '@/composables/ui/useEventLogPane'
import { useHerald } from '@/composables/ui/useHerald'
import {
  ERROR_REPORT_CAPPED_TEXT,
  ERROR_REPORT_MERGE_WINDOW_MS,
  ERROR_REPORT_OPAQUE_TEXT,
  ERROR_REPORT_SESSION_MAX,
} from '@/config/constants'

/**
 * Der Vertrag des Reporters. Er hat zwei Zusagen, die man im Code nicht sieht:
 * eine Meldung steht GENAU EINMAL in der Spur (Vues errorHandler ruft selbst
 * console.error — ohne Riegel meldete derselbe Fehler doppelt), und eine
 * Wiederholung baut KEINE zweite Zeile (ein Fehler in einer Frame-Schleife
 * spuelte sonst die 300er-Historie in Sekunden aus).
 */
describe('useErrorReporting', () => {
  let teardown: () => void
  let sink: ReturnType<typeof vi.fn>

  const faults = (): GameEvent[] =>
    useEventLog()
      .readHistory()
      .filter((e) => e.type === 'error' || e.type === 'warning')

  beforeEach(() => {
    useEventLog().clearEvents()
    useHerald().reset()
    useEventLogPane().selectTab('all')
    useEventLogPane().clearErrorAlert()
    // Vor dem Installieren gesetzt: der Reporter nimmt sich seine Originale
    // dort, also ist das hier die Konsole, die er weiterreicht.
    sink = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(sink)
    vi.spyOn(console, 'warn').mockImplementation(sink)
    teardown = installErrorReporting()
  })

  afterEach(() => {
    teardown()
    vi.restoreAllMocks()
    vi.useRealTimers()
    useHerald().reset()
    useEventLog().clearEvents()
  })

  it('macht aus einem Fensterfehler eine Zeile im System-Tab', () => {
    window.dispatchEvent(
      new ErrorEvent('error', { error: new TypeError('bad value'), message: 'bad value' }),
    )

    const rows = faults()
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('error')
    expect(rows[0].message).toContain('TypeError: bad value')
  })

  it('fängt eine abgewiesene Promise', () => {
    window.dispatchEvent(
      Object.assign(new Event('unhandledrejection'), { reason: new Error('nope') }),
    )

    expect(faults()).toHaveLength(1)
    expect(faults()[0].message).toContain('nope')
  })

  it('nimmt auch einen reason, der kein Error ist', () => {
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'plain string' }))

    expect(faults()[0].message).toContain('plain string')
  })

  it('spiegelt console.error und lässt die Konsole vollständig', () => {
    console.error('something broke')

    expect(sink).toHaveBeenCalledTimes(1)
    expect(faults()).toHaveLength(1)
  })

  /** Der Beleg fuer den Riegel: Vues Handler meldet, der Reporter schreibt in
   *  die Konsole, und die Umhuellung darf daraus keine zweite Zeile machen. */
  it('meldet einen Vue-Fehler genau einmal', () => {
    reportFault('vue', new Error('render failed'), 'render function')

    expect(faults()).toHaveLength(1)
    expect(sink).toHaveBeenCalledTimes(1)
  })

  it('verdichtet Wiederholungen zu einer Zeile mit Zähler', () => {
    for (let i = 0; i < 5; i++) reportFault('window', new Error('same boom'))

    const rows = faults()
    expect(rows).toHaveLength(1)
    expect(rows[0].repeat).toBe(5)
  })

  it('macht nach dem Verdichtungsfenster eine neue Zeile auf', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 9, 0, 0))
    reportFault('window', new Error('same boom'))
    vi.setSystemTime(Date.now() + ERROR_REPORT_MERGE_WINDOW_MS + 1)
    reportFault('window', new Error('same boom'))

    expect(faults()).toHaveLength(2)
  })

  it('verstummt nach dem Sitzungsdeckel mit einer letzten Zeile', () => {
    for (let i = 0; i < ERROR_REPORT_SESSION_MAX + 5; i++) {
      reportFault('window', new Error(`boom ${i}`))
    }

    const rows = faults()
    expect(rows).toHaveLength(ERROR_REPORT_SESSION_MAX + 1)
    expect(rows[0].message).toBe(ERROR_REPORT_CAPPED_TEXT)
  })

  it('behandelt einen Ladefehler als Warnung und reisst die Spur nicht auf', () => {
    const img = document.createElement('img')
    img.setAttribute('src', '/img/missing.png')
    document.body.appendChild(img)
    img.dispatchEvent(new Event('error'))
    img.remove()

    const rows = faults()
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('warning')
    expect(rows[0].message).toContain('/img/missing.png')
    expect(useEventLogPane().activeTab.value).toBe('all')
    expect(useEventLogPane().errorAlert.value).toBe(false)
  })

  it('hält console.warn still — sie schaltet den Reiter nicht um', () => {
    console.warn('%c[Void]', 'color: #e0409f', 'rift is drifting')

    const rows = faults()
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('warning')
    expect(useEventLogPane().activeTab.value).toBe('all')
  })

  it('schaltet bei einem Fehler auf den System-Tab', () => {
    reportFault('window', new Error('boom'))

    expect(useEventLogPane().activeTab.value).toBe('system')
    expect(useEventLogPane().errorAlert.value).toBe(true)
  })

  it('meldet sich zusätzlich über die Quittungsspur des Herolds', () => {
    reportFault('window', new Error('boom'))

    const { receipts } = useHerald()
    expect(receipts.value).toHaveLength(1)
    expect(receipts.value[0].kind).toBe('warning')
  })

  /** Fremde Herkunft: der Browser haelt alles zurueck, was zu sagen waere. */
  it('sagt beim undurchsichtigen Fehler wenigstens, wo nachzusehen ist', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }))

    expect(faults()[0].message).toBe(ERROR_REPORT_OPAQUE_TEXT)
  })

  it('installiert nur einmal', () => {
    const second = installErrorReporting()
    console.error('once')
    second()

    expect(faults()).toHaveLength(1)
  })

  it('stellt die Konsole beim Zurücknehmen wieder her', () => {
    const patched = console.error
    teardown()
    expect(console.error).not.toBe(patched)
    teardown = installErrorReporting()
  })
})

describe('Fehlertext aufbereiten', () => {
  it('holt die Stelle aus einer Vite-Modulzeile', () => {
    expect(originOfLine('at wisp (http://localhost:5173/src/utils/fx/spaceBody.ts?t=17:310:9)')).toBe(
      'spaceBody.ts:310',
    )
  })

  it('überspringt die Kopfzeile eines Stacks', () => {
    const stack = 'TypeError: bad\n    at wisp (/src/utils/fx/spaceBody.ts:310:17)'
    expect(shortOrigin(stack)).toBe('spaceBody.ts:310')
    expect(shortOrigin(undefined)).toBe('')
  })

  /* utils/logger.ts schreibt `console.warn('%c[Void]', 'color: …', msg)` — roh
     verkettet stuende der CSS-String in der Spur. */
  it('löst %c auf und wirft die Stilregel weg', () => {
    expect(consoleArgsToText(['%c[Void]', 'color: #e0409f', 'rift drifting'])).toBe(
      '[Void] rift drifting',
    )
  })

  it('füllt %s und %d und hängt den Rest an', () => {
    expect(consoleArgsToText(['got %s after %d tries', 'boom', 3, 'extra'])).toBe(
      'got boom after 3 tries extra',
    )
  })

  it('verkettet ohne Direktiven schlicht', () => {
    expect(consoleArgsToText(['plain', 7])).toBe('plain 7')
    expect(consoleArgsToText([])).toBe('')
  })
})
