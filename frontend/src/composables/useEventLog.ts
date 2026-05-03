import { ref } from 'vue'
import { useRenderingPaused } from './useRenderingPaused'

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

    if (events.value.length > 12) {
      events.value.length = 12
    }

    window.setTimeout(() => {
      events.value = events.value.filter((event) => event.id !== id)
    }, 7000)
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
