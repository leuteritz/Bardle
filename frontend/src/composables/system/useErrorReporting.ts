import { useEventLog, type GameEvent } from '@/composables/ui/useEventLog'
import { useEventLogPane } from '@/composables/ui/useEventLogPane'
import { useHerald } from '@/composables/ui/useHerald'
import { logRuntimeError, logRuntimeWarning } from '@/config/ui/eventLog'
import {
  ERROR_HERALD_EYEBROW,
  ERROR_HERALD_MERGE_KEY,
  ERROR_HERALD_SUBLINE,
  ERROR_REPORT_CAPPED_TEXT,
  ERROR_REPORT_DETAIL_MAX,
  ERROR_REPORT_HEADLINE_MAX,
  ERROR_REPORT_MERGE_WINDOW_MS,
  ERROR_REPORT_OPAQUE_TEXT,
  ERROR_REPORT_SESSION_MAX,
  ERROR_REPORT_TAG,
} from '@/config/constants'

/**
 * Laufzeitfehler in die Eventlog-Spur spiegeln.
 *
 * Was in der DevTools-Konsole steht, sieht niemand, der spielt — und es ist weg,
 * sobald es aus dem Konsolenpuffer rollt. Hier wird jeder Fehler zusaetzlich zu
 * einer Zeile im System-Tab, deckt die Spur auf und meldet sich ueber die
 * Quittungsspur des Herolds, die auch ueber einem offenen Profil-Reiter liegt.
 *
 * Modul-Singleton wie alles in diesem Ordner; Vorbild ist `useKeybindings`
 * (EIN Fenster-Listener, Modulzustand, Aufruf aus `main.ts`).
 *
 * KEIN Pinia-Import: der Reporter steht in `main.ts` vor `createApp`, damit ihm
 * moeglichst wenig entgeht.
 */
export type FaultSource = 'vue' | 'window' | 'promise' | 'resource' | 'console' | 'warn'

/** Was die Spur nicht aufreisst: ein fehlendes Bild ist kein Absturz. */
const QUIET: readonly FaultSource[] = ['resource', 'warn']

interface Fault {
  message: string
  detail?: string
}

interface Tracked {
  event: GameEvent
  at: number
}

/** Beim Installieren neu genommen — sonst haelt der Reporter nach einem HMR
 *  eine Konsole fest, die es nicht mehr gibt. */
let original = { error: console.error, warn: console.warn }

let installed = false
/**
 * Der EINE Riegel, und er loest zwei Probleme: die Endlosschleife (das Melden
 * wirft selbst) und die Doppelmeldung (Vues errorHandler ruft console.error).
 */
let reporting = false
let reported = 0
let capped = false
/** Signatur -> die Zeile, die sie geschrieben hat. Nach dem Fenster geraeumt. */
const recent = new Map<string, Tracked>()

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

// Vite haengt im Dev eine Abfrage an den Modulpfad (`spaceBody.ts?t=17…:310`);
// sie steht zwischen Dateinamen und Zeilennummer und muss mit uebersprungen
// werden, sonst faellt die Stelle aus.
const ORIGIN_RE = /([\w.$-]+\.(?:ts|tsx|js|mjs|vue))(?:\?[^\s:)]*)?:(\d+)/

/** `…/utils/fx/spaceBody.ts?t=1:310:17` → `spaceBody.ts:310`. */
export function originOfLine(text: string): string {
  const hit = text.match(ORIGIN_RE)
  return hit ? `${hit[1]}:${hit[2]}` : ''
}

/** Erste auswertbare Stelle eines Stacks; die Kopfzeile zaehlt nicht mit. */
export function shortOrigin(stack: string | undefined): string {
  if (!stack) return ''
  for (const line of stack.split('\n').slice(1)) {
    const found = originOfLine(line)
    if (found) return found
  }
  return ''
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return `${value.name}: ${value.message}`
  if (value === null || value === undefined) return String(value)
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value) ?? String(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

/**
 * Die Argumente eines Konsolenaufrufs zu EINER Zeile.
 *
 * Die Formatdirektiven muessen aufgeloest werden, weil `utils/logger.ts` mit
 * `console.warn('%c[Void]', 'color: …', msg)` schreibt — roh verkettet stuende
 * der CSS-String in der Spur.
 */
export function consoleArgsToText(args: readonly unknown[]): string {
  if (args.length === 0) return ''
  const [head, ...rest] = args
  if (typeof head !== 'string' || !head.includes('%')) {
    return args.map(stringify).join(' ').trim()
  }
  let next = 0
  const filled = head.replace(/%[csdifoOj%]/g, (token) => {
    if (token === '%%') return '%'
    if (next >= rest.length) return token
    const value = rest[next++]
    // %c traegt eine CSS-Regel, keinen Inhalt — sie faellt ersatzlos weg.
    return token === '%c' ? '' : stringify(value)
  })
  return [filled, ...rest.slice(next).map(stringify)].join(' ').trim()
}

function fromError(err: Error): Fault {
  const origin = shortOrigin(err.stack)
  const head = `${err.name}: ${err.message}`
  return {
    message: origin ? `${head} · ${origin}` : head,
    detail: err.stack ? clip(err.stack, ERROR_REPORT_DETAIL_MAX) : undefined,
  }
}

function fromResource(target: Element): Fault {
  const tag = target.tagName.toLowerCase()
  const src = target.getAttribute('src') ?? target.getAttribute('href') ?? '(no source)'
  return { message: `Failed to load <${tag}>: ${src}` }
}

function describeFault(source: FaultSource, value: unknown, info?: string): Fault {
  if (source === 'resource' && value instanceof Element) return fromResource(value)

  if (source === 'console' || source === 'warn') {
    const args = value as readonly unknown[]
    const carrier = args.find((a) => a instanceof Error) as Error | undefined
    const text = consoleArgsToText(args)
    return {
      message: text || 'Empty console message',
      detail: carrier?.stack ? clip(carrier.stack, ERROR_REPORT_DETAIL_MAX) : undefined,
    }
  }

  if (value instanceof Error) {
    const fault = fromError(value)
    return info ? { ...fault, message: `${fault.message} · ${info}` } : fault
  }

  if (value instanceof ErrorEvent) {
    // Fremde Herkunft: der Browser haelt alles zurueck, was zu sagen waere.
    if (!value.message || value.message === 'Script error.') {
      return { message: ERROR_REPORT_OPAQUE_TEXT }
    }
    const where = value.filename ? originOfLine(`${value.filename}:${value.lineno}`) : ''
    return { message: where ? `${value.message} · ${where}` : value.message }
  }

  const text = stringify(value)
  return { message: info ? `${text} · ${info}` : text }
}

function announce(message: string, signature: string) {
  const { announceReceipt } = useHerald()
  announceReceipt({
    kind: 'warning',
    eyebrow: ERROR_HERALD_EYEBROW,
    headline: message,
    subline: ERROR_HERALD_SUBLINE,
    mergeKey: `${ERROR_HERALD_MERGE_KEY}/${signature}`,
  })
}

/** Was aelter ist als das Fenster, ist keine Wiederholung mehr. */
function prune(now: number) {
  for (const [signature, tracked] of recent) {
    if (now - tracked.at >= ERROR_REPORT_MERGE_WINDOW_MS) recent.delete(signature)
  }
}

function ingest(source: FaultSource, value: unknown, info: string | undefined, echo: boolean) {
  if (reporting) return
  reporting = true
  try {
    // Zuerst die Konsole: schlaegt unser Melden fehl, hat DevTools es trotzdem.
    // `original` statt `console` — die Umhuellung wuerde hier im Kreis laufen.
    if (echo) original.error(ERROR_REPORT_TAG, info ?? source, value)
    if (capped) return

    const quiet = QUIET.includes(source)
    const fault = describeFault(source, value, info)
    const message = clip(fault.message, ERROR_REPORT_HEADLINE_MAX)

    // Wanduhr, wie der Zeitstempel der Zeile selbst — hier wird keine Frist
    // gegen die Spieluhr gerechnet, sondern gegen die des Menschen davor.
    const now = Date.now()
    prune(now)
    const hit = recent.get(message)
    if (hit) {
      hit.event.repeat = (hit.event.repeat ?? 1) + 1
      hit.at = now
      useEventLog().touchHistory()
      return
    }

    if (reported >= ERROR_REPORT_SESSION_MAX) {
      capped = true
      logRuntimeError(ERROR_REPORT_CAPPED_TEXT)
      return
    }
    reported++

    const event = quiet
      ? logRuntimeWarning(message, fault.detail)
      : logRuntimeError(message, fault.detail)
    recent.set(message, { event, at: now })

    if (!quiet) {
      useEventLogPane().revealSystemTab()
      announce(message, message)
    }
  } catch {
    // Das Melden selbst ist gescheitert. Die Konsole hat den Fehler bereits.
  } finally {
    reporting = false
  }
}

/** Der EINE Eintrittspunkt. Schreibt Zeile UND Konsole. */
export function reportFault(source: FaultSource, value: unknown, info?: string): void {
  ingest(source, value, info, true)
}

function onWindowError(event: Event) {
  const target = event.target
  if (target && target !== window && target instanceof Element) {
    ingest('resource', target, undefined, true)
    return
  }
  const fail = event as ErrorEvent
  ingest('window', fail.error ?? fail, undefined, true)
}

function onRejection(event: Event) {
  ingest('promise', (event as PromiseRejectionEvent).reason, undefined, true)
}

/**
 * Einmal je Sitzung, in `main.ts` VOR `createApp`. Gibt die Ruecknahme zurueck —
 * die brauchen nur die Specs, damit eine gepatchte Konsole nicht in die naechste
 * Datei laeuft.
 */
export function installErrorReporting(): () => void {
  if (installed) return () => {}
  installed = true
  original = { error: console.error, warn: console.warn }

  // Capture: Ressourcenfehler von <img>/<script> steigen nicht auf.
  window.addEventListener('error', onWindowError, true)
  window.addEventListener('unhandledrejection', onRejection)

  console.error = (...args: unknown[]) => {
    original.error(...args)
    ingest('console', args, undefined, false)
  }
  console.warn = (...args: unknown[]) => {
    original.warn(...args)
    ingest('warn', args, undefined, false)
  }

  return () => {
    window.removeEventListener('error', onWindowError, true)
    window.removeEventListener('unhandledrejection', onRejection)
    console.error = original.error
    console.warn = original.warn
    recent.clear()
    reported = 0
    capped = false
    installed = false
  }
}
