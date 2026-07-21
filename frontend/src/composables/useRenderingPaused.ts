import { ref, computed, readonly } from 'vue'
import { useWindowFocus } from './useWindowFocus'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'

const _isDocHidden = ref(typeof document !== 'undefined' ? document.hidden : false)

// App-lebenslanges Singleton: useRenderingPaused() wird aus Per-Frame-Loops
// aufgerufen (foregroundGate → roleBehaviorStore, Minimap, Eclipse-Poll, …).
// Ohne Memoisierung würde JEDER Aufruf zwei frische computed()- und readonly()-
// Instanzen allozieren — 60fps-Garbage ohne Mehrwert. Lazy erstellt, damit
// Pinia beim ersten Aufruf bereits installiert ist.
function createInstance() {
  if (typeof document !== 'undefined') {
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
   * layer sits invisible under a near-opaque overlay — rendering it at 60fps
   * only steals frame budget. Das Star-Fight-Modal pausiert den Layer NICHT:
   * die Orbits laufen sichtbar weiter, damit die Vordergrund/Hintergrund-
   * Mechanik (hinter der Sonne = kein Kampf) live mit dem Modal synchron ist.
   */
  const isIdleRenderingPaused = computed(
    () => isRenderingPaused.value || uiStore.bardActiveTab !== null,
  )

  return {
    isRenderingPaused: readonly(isRenderingPaused),
    isIdleRenderingPaused: readonly(isIdleRenderingPaused),
  }
}

let _instance: ReturnType<typeof createInstance> | null = null

export function useRenderingPaused() {
  if (!_instance) _instance = createInstance()
  return _instance
}
