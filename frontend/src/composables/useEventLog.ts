// frontend/src/composables/useEventLog.ts
import { ref } from 'vue'

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
}

const events = ref<GameEvent[]>([])
let nextId = 1

export function useEventLog() {
  function addEvent(message: string, type: GameEventType = 'info') {
    const id = nextId++

    events.value.unshift({
      id,
      message,
      type,
      timestamp: Date.now(),
    })

    if (events.value.length > 12) {
      events.value.length = 12
    }

    window.setTimeout(() => {
      events.value = events.value.filter((event) => event.id !== id)
    }, 7000)
  }

  return {
    events,
    addEvent,
  }
}
