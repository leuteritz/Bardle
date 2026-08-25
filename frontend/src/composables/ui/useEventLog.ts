import { ref } from 'vue'
import { useUiStore } from '@/stores/core/uiStore'
import { useRenderingPaused } from '@/composables/system/useRenderingPaused'
import {
  EVENT_LOG_MAX_SIZE,
  EVENT_LOG_DISMISS_MS,
  EVENT_LOG_HISTORY_MAX,
} from '@/config/constants'

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

/** Die schwebende Spur: klein, tief reaktiv, vom Overlay direkt gerendert. */
const events = ref<GameEvent[]>([])

// Die Historie liegt in einem festen Ring und ist BEWUSST nicht reaktiv —
// 300 Proxies wuerden bei jedem Ereignis neu getrackt. Leser haengen sich
// stattdessen an historyVersion.
const ring = new Array<GameEvent | null>(EVENT_LOG_HISTORY_MAX).fill(null)
let ringHead = 0
/** Zaehlt bis EVENT_LOG_HISTORY_MAX und bleibt dann stehen. */
const historySize = ref(0)
/** Steigt bei JEDEM Ereignis — daran haengt, wer den Inhalt liest. */
const historyVersion = ref(0)

let nextId = 1

function pushHistory(event: GameEvent) {
  ring[ringHead] = event
  ringHead = (ringHead + 1) % EVENT_LOG_HISTORY_MAX
  if (historySize.value < EVENT_LOG_HISTORY_MAX) historySize.value++
  historyVersion.value++
}

/** Neueste zuerst, wie die Spur. Nur das offene Panel ruft das auf. */
function readHistory(): GameEvent[] {
  const out: GameEvent[] = []
  for (let i = 1; i <= historySize.value; i++) {
    const entry = ring[(ringHead - i + EVENT_LOG_HISTORY_MAX) % EVENT_LOG_HISTORY_MAX]
    if (entry) out.push(entry)
  }
  return out
}

export function useEventLog() {
  const { isRenderingPaused } = useRenderingPaused()

  function addEvent(message: string, type: GameEventType = 'info') {
    // Wanduhrzeit: der Zeitstempel wird als Datum gelesen, nicht gegen die
    // Spieluhr gerechnet.
     
    const event: GameEvent = { id: nextId++, message, type, timestamp: Date.now() }

    // Immer — ein Log, das im Hintergrund schweigt, ist als Log wertlos.
    pushHistory(event)

    // Keine Spur, wenn niemand hinsieht oder das Panel dieselbe Zeile zeigt.
    // Ohne Spur auch kein Dismiss-Timer: sonst liefen bei langer Abwesenheit
    // Tausende Waisen-Timer auf eine Liste, in der die id nie stand.
    if (isRenderingPaused.value || useUiStore().isEventLogOpen) return

    events.value.unshift(event)
    if (events.value.length > EVENT_LOG_MAX_SIZE) {
      events.value.length = EVENT_LOG_MAX_SIZE
    }

    window.setTimeout(() => {
      events.value = events.value.filter((e) => e.id !== event.id)
    }, EVENT_LOG_DISMISS_MS)
  }

  function clearEvents() {
    events.value = []
    ring.fill(null)
    ringHead = 0
    historySize.value = 0
    historyVersion.value++
  }

  return {
    events,
    historyVersion,
    historySize,
    readHistory,
    addEvent,
    clearEvents,
  }
}
