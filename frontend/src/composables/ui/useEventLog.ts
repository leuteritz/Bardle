import { ref } from 'vue'
import { EVENT_LOG_HISTORY_MAX } from '@/config/constants'

export type GameEventType =
  | 'support'
  | 'top'
  | 'mid'
  | 'adc'
  | 'jungle'
  | 'planet'
  | 'augment'
  | 'meep'
  | 'chime'
  | 'combat'
  | 'prestige'
  | 'chronicle'
  | 'omen'
  | 'mission'
  | 'void'
  | 'info'

export interface GameEvent {
  id: number
  message: string
  type: GameEventType
  timestamp: number
}

// Die Historie liegt in einem festen Ring und ist BEWUSST nicht reaktiv —
// 300 Proxies wuerden bei jedem Ereignis neu getrackt. Leser haengen sich
// stattdessen an historyVersion.
const ring = new Array<GameEvent | null>(EVENT_LOG_HISTORY_MAX).fill(null)
let ringHead = 0
let ringCount = 0
/** Zaehlt bis EVENT_LOG_HISTORY_MAX und bleibt dann stehen. */
const historySize = ref(0)
/** Steigt einmal je FRAME, nicht je Ereignis — daran haengt, wer den Inhalt liest. */
const historyVersion = ref(0)
/** Ids seit dem letzten Flush; das Panel laesst genau die aufblitzen. */
let pending: number[] = []
const freshIds = ref<readonly number[]>([])

let nextId = 1
let flushHandle = 0

function flush() {
  flushHandle = 0
  freshIds.value = pending
  pending = []
  historySize.value = ringCount
  historyVersion.value++
}

// Das Panel steht dauerhaft, also laeuft seine ganze Rechenkette sonst je
// EREIGNIS statt je Frame — im Kampf mehrmals pro Sekunde ueber 300 Eintraege.
// Im Hintergrundtab feuert rAF gar nicht: das Pausenverhalten kommt gratis.
function scheduleFlush() {
  if (flushHandle) return
  if (typeof requestAnimationFrame !== 'function') {
    flush()
    return
  }
  flushHandle = requestAnimationFrame(flush)
}

function pushHistory(event: GameEvent) {
  ring[ringHead] = event
  ringHead = (ringHead + 1) % EVENT_LOG_HISTORY_MAX
  if (ringCount < EVENT_LOG_HISTORY_MAX) ringCount++
  pending.push(event.id)
  scheduleFlush()
}

/** Neueste zuerst. `limit` deckelt, was das Panel wirklich rendert. */
function readHistory(limit = EVENT_LOG_HISTORY_MAX): GameEvent[] {
  const out: GameEvent[] = []
  const take = Math.min(limit, ringCount)
  for (let i = 1; i <= take; i++) {
    const entry = ring[(ringHead - i + EVENT_LOG_HISTORY_MAX) % EVENT_LOG_HISTORY_MAX]
    if (entry) out.push(entry)
  }
  return out
}

export function useEventLog() {
  function addEvent(message: string, type: GameEventType = 'info') {
    // Wanduhrzeit: der Zeitstempel wird als Datum gelesen, nicht gegen die
    // Spieluhr gerechnet.

    pushHistory({ id: nextId++, message, type, timestamp: Date.now() })
  }

  function clearEvents() {
    if (flushHandle && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(flushHandle)
    }
    flushHandle = 0
    ring.fill(null)
    ringHead = 0
    ringCount = 0
    pending = []
    freshIds.value = []
    historySize.value = 0
    historyVersion.value++
  }

  return {
    historyVersion,
    historySize,
    freshIds,
    readHistory,
    addEvent,
    clearEvents,
  }
}
