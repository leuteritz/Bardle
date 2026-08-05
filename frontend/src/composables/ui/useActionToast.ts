import { ref, readonly } from 'vue'
import { TOAST_DURATION_MS } from '@/config/constants'

const message = ref('')
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

export function useActionToast() {
  function showToast(msg: string) {
    message.value = msg
    visible.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
    }, TOAST_DURATION_MS)
  }

  return { message: readonly(message), visible: readonly(visible), showToast }
}
