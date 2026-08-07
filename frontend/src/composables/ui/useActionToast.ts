import { ref, computed, readonly } from 'vue'
import { TOAST_DURATION_MS, TOAST_KINDS } from '@/config/constants'
import type { ToastKind } from '@/types'

const message = ref('')
const kind = ref<ToastKind>('info')
const visible = ref(false)
/**
 * Zählt jede Meldung hoch. Der Renderer hängt daran seine Neustart-Keys: löst
 * eine zweite Meldung aus, während die erste noch steht, bleibt die Karte
 * stehen (kein Aus- und Einblenden), aber Sigil und Laufbalken fangen von vorn
 * an — sonst liefe der Balken der neuen Standzeit hinterher.
 */
const seq = ref(0)
let timer: ReturnType<typeof setTimeout> | null = null

export function useActionToast() {
  function showToast(msg: string, toastKind: ToastKind = 'info') {
    message.value = msg
    kind.value = toastKind
    seq.value++
    visible.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
    }, TOAST_DURATION_MS)
  }

  /** Kopfzeile, Sigil und Akzent der laufenden Meldung. */
  const kindDef = computed(() => TOAST_KINDS[kind.value])

  return {
    message: readonly(message),
    kind: readonly(kind),
    kindDef,
    seq: readonly(seq),
    visible: readonly(visible),
    showToast,
  }
}
