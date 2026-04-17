import { ref, computed, readonly } from 'vue'
import { useWindowFocus } from './useWindowFocus'

const _isDocHidden = ref(typeof document !== 'undefined' ? document.hidden : false)
let _initialized = false

export function useRenderingPaused() {
  if (!_initialized && typeof document !== 'undefined') {
    _initialized = true
    document.addEventListener('visibilitychange', () => {
      _isDocHidden.value = document.hidden
    })
  }

  const { windowFocused } = useWindowFocus()
  const isRenderingPaused = computed(() => _isDocHidden.value || !windowFocused.value)

  return { isRenderingPaused: readonly(isRenderingPaused) }
}
