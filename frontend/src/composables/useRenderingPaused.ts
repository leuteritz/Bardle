import { ref, computed, readonly } from 'vue'
import { useWindowFocus } from './useWindowFocus'
import { useGameStore } from '@/stores/gameStore'

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
  const gameStore = useGameStore()
  const isRenderingPaused = computed(
    () => _isDocHidden.value || !windowFocused.value || gameStore.isGamePaused,
  )

  return { isRenderingPaused: readonly(isRenderingPaused) }
}
