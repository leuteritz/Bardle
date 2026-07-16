import { ref, computed, readonly } from 'vue'
import { useWindowFocus } from './useWindowFocus'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'

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
  const uiStore = useUiStore()
  const isRenderingPaused = computed(
    () => _isDocHidden.value || !windowFocused.value || gameStore.isGamePaused,
  )

  /**
   * Pause signal for the idle layer's render loops (star system, orbits, sun
   * canvas, galaxy minimap, …). While a bard-profile tab is open, the idle
   * layer sits invisible under the 80%-black overlay — rendering it at 60fps
   * only steals frame budget from the battle UI and causes app-wide jank.
   */
  const isIdleRenderingPaused = computed(
    () => isRenderingPaused.value || uiStore.bardActiveTab !== null,
  )

  return {
    isRenderingPaused: readonly(isRenderingPaused),
    isIdleRenderingPaused: readonly(isIdleRenderingPaused),
  }
}
