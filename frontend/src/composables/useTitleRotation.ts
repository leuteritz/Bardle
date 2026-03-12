import { ref, onMounted, onUnmounted } from 'vue'
import { titleMessages } from '../config/messages'
import { TITLE_MESSAGE_INTERVAL_MS } from '../config/constants'

export function useTitleRotation() {
  const currentMsg = ref('')
  let intervalId: ReturnType<typeof setInterval> | null = null

  function getRandomMessage(): void {
    if (titleMessages.length === 0) return
    currentMsg.value = titleMessages[Math.floor(Math.random() * titleMessages.length)]
  }

  onMounted(() => {
    getRandomMessage()
    intervalId = setInterval(getRandomMessage, TITLE_MESSAGE_INTERVAL_MS)
  })

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
  })

  return { currentMsg }
}
