// Zeitformat und Copy-Text des Eventlogs. Vue-frei, damit die Formatierung
// ohne Mount pruefbar bleibt.
import type { GameEvent, GameEventType } from '@/composables/ui/useEventLog'
import { GROUP_OF_TYPE } from '@/config/ui/eventLog'
import { HERALD_RECEIPT_COUNT_PREFIX } from '@/config/constants'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Wanduhrzeit fuer einen Menschen — deshalb Date und nicht die Spieluhr. */
export function formatEventClock(timestamp: number, withSeconds = false): string {
  const d = new Date(timestamp)
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return withSeconds ? `${hm}:${pad(d.getSeconds())}` : hm
}

// Aus der Registry abgeleitet statt als Konstante: ein neuer Ereignistyp
// verschoebe sonst die Spalte, ohne dass es jemand merkt.
const TYPE_COLUMN_WIDTH = Math.max(
  ...(Object.keys(GROUP_OF_TYPE) as GameEventType[]).map((t) => t.length),
)

/** Der Stack rueckt unter die Nachrichtenspalte — aus derselben Breite gerechnet. */
const DETAIL_INDENT = ' '.repeat('[00:00:00] '.length + TYPE_COLUMN_WIDTH + 3)

/**
 * Der Stack einer Fehlerzeile haengt EINGERUECKT darunter — Copy ist der Ersatz
 * fuer F12: was hier fehlt, muss der Spieler doch wieder in den DevTools holen.
 * Eine Zeile ohne `repeat` und ohne `detail` bleibt zeichengleich zu frueher.
 */
export function formatEventLine(event: GameEvent): string {
  const type = `[${event.type}]`.padEnd(TYPE_COLUMN_WIDTH + 2)
  const count =
    event.repeat && event.repeat > 1 ? ` (${HERALD_RECEIPT_COUNT_PREFIX}${event.repeat})` : ''
  const head = `[${formatEventClock(event.timestamp, true)}] ${type} ${event.message}${count}`
  if (!event.detail) return head
  const body = event.detail
    .split('\n')
    .map((line) => `${DETAIL_INDENT}${line}`)
    .join('\n')
  return `${head}\n${body}`
}

export function formatEventLines(events: readonly GameEvent[]): string {
  return events.map(formatEventLine).join('\n')
}
