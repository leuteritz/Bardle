import { ref, computed, readonly } from 'vue'
import { useWindowFocus } from './useWindowFocus'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'
import { useStarGroupStore } from '@/stores/starGroupStore'

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
   * Pause signal for the idle layer's OUTPUT — DOM writes, canvas paints and
   * anything feeding Vue's render pipeline. Während ein Bard-Profil-Tab ODER
   * das Star-Fight-Modal offen ist, liegt der Idle-Layer unter einem nahezu
   * deckenden Overlay (das Modal-Backdrop hat 94–98 % Deckkraft): ihn dort mit
   * voller Framerate weiterzuzeichnen kostet nur Frame-Budget. Gemessen im
   * Star-Fight-Modal: ~+17 bis +20 fps, ohne sichtbaren Unterschied.
   *
   * ACHTUNG: Das ist ausdrücklich KEIN Stopp der Simulation — siehe
   * `isIdleSimulationPaused`. Die Vordergrund/Hintergrund-Mechanik (hinter der
   * Sonne = kein Kampf) bleibt live: Bahn-Mathematik und die Positions-Maps
   * (`activePlanetPositions`, `activePlayerPlanetPositions`,
   * `activeChampionBehindState`) werden VOR dem Ausstieg geschrieben, der
   * foregroundGate liest also weiter aktuelle Werte.
   */
  const isIdleRenderingPaused = computed(
    () =>
      isRenderingPaused.value ||
      uiStore.bardActiveTab !== null ||
      // Bewusst erst hier geholt, nicht im Modul-Setup: starGroupStore hängt
      // über planetBossStore → foregroundGate wieder an diesem Modul. Im Getter
      // ist der Import-Zyklus längst aufgelöst.
      useStarGroupStore().starFightModalOpen,
  )

  /**
   * Pause signal for the idle layer's SIMULATION — orbit angles, behind-the-sun
   * state and the screen positions the combat logic reads. Diese läuft weiter,
   * während ein Bard-Tab offen ist: Champions sollen ihre Fähigkeiten auch dann
   * zünden, Planeten und Champions weiter hinter die Sonne wandern und der
   * Eclipse-Status im Command Panel live bleiben. Kostet fast nichts, weil im
   * verdeckten Zustand nur noch Mathematik läuft und kein Pixel gezeichnet wird.
   *
   * Gestoppt wird nur bei echtem Stillstand: Tab im Hintergrund, Fenster ohne
   * Fokus oder pausiertes Spiel — dort friert absichtlich das ganze Spiel ein.
   */
  const isIdleSimulationPaused = computed(() => isRenderingPaused.value)

  return {
    isRenderingPaused: readonly(isRenderingPaused),
    isIdleRenderingPaused: readonly(isIdleRenderingPaused),
    isIdleSimulationPaused: readonly(isIdleSimulationPaused),
  }
}

let _instance: ReturnType<typeof createInstance> | null = null

export function useRenderingPaused() {
  if (!_instance) _instance = createInstance()
  return _instance
}
