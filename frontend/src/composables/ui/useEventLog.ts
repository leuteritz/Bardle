import { ref } from 'vue'
import { useRenderingPaused } from './useRenderingPaused'
import { EVENT_LOG_MAX_SIZE, EVENT_LOG_DISMISS_MS } from '../config/constants'

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
  | 'info'

export interface GameEvent {
  id: number
  message: string
  type: GameEventType
  timestamp: number
  timeString: string
}

const events = ref<GameEvent[]>([])
let nextId = 1

export function useEventLog() {
  const { isRenderingPaused } = useRenderingPaused()

  function addEvent(message: string, type: GameEventType = 'info') {
    if (isRenderingPaused.value) return

    const id = nextId++
    const d = new Date()
    const timeString = [d.getHours(), d.getMinutes()]
      .map((n) => String(n).padStart(2, '0'))
      .join(':')

    events.value.unshift({
      id,
      message,
      type,
      timestamp: Date.now(),
      timeString,
    })

    if (events.value.length > EVENT_LOG_MAX_SIZE) {
      events.value.length = EVENT_LOG_MAX_SIZE
    }

    window.setTimeout(() => {
      events.value = events.value.filter((event) => event.id !== id)
    }, EVENT_LOG_DISMISS_MS)
  }

  function clearEvents() {
    events.value = []
  }

  return {
    events,
    addEvent,
    clearEvents,
  }
}
