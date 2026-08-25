// Zeitformat und Copy-Text des Eventlogs. Vue-frei, damit die Formatierung
// ohne Mount pruefbar bleibt.
import type { GameEvent, GameEventType } from '@/composables/ui/useEventLog'
import { GROUP_OF_TYPE } from '@/config/ui/eventLog'

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

export function formatEventLine(event: GameEvent): string {
  const type = `[${event.type}]`.padEnd(TYPE_COLUMN_WIDTH + 2)
  return `[${formatEventClock(event.timestamp, true)}] ${type} ${event.message}`
}

export function formatEventLines(events: readonly GameEvent[]): string {
  return events.map(formatEventLine).join('\n')
}
