import { ref, computed, readonly, watch } from 'vue'
import { useWindowFocus } from '@/composables/system/useWindowFocus'
import { useGameStore } from '@/stores/core/gameStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { IDLE_RESUME_DELAY_FRAMES } from '@/config/constants'

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
  const idleHiddenRaw = computed(
    () =>
      isRenderingPaused.value ||
      uiStore.bardActiveTab !== null ||
      // Bewusst erst hier geholt, nicht im Modul-Setup: starGroupStore hängt
      // über planetBossStore → foregroundGate wieder an diesem Modul. Im Getter
      // ist der Import-Zyklus längst aufgelöst.
      useStarGroupStore().starFightModalOpen,
  )

  /**
   * Dasselbe Signal, aber asymmetrisch getaktet: Anhalten sofort, Fortsetzen
   * erst `IDLE_RESUME_DELAY_FRAMES` Frames später.
   *
   * Der Grund steht an der Konstante — beide Vorgänge, Overlay-Abbau und erster
   * vollständiger Neuaufbau aller Canvas-Renderer, fielen sonst in denselben
   * Frame und ergaben zusammen den Ruckler beim Schließen des Bard-Profils.
   */
  const idleHiddenGated = ref(idleHiddenRaw.value)
  let resumeFrame = 0

  function cancelResume(): void {
    if (!resumeFrame) return
    cancelAnimationFrame(resumeFrame)
    resumeFrame = 0
  }

  watch(idleHiddenRaw, (hidden) => {
    cancelResume()
    if (hidden) {
      idleHiddenGated.value = true
      return
    }
    // Kein rAF (Tests, SSR) → ohne Umweg fortsetzen, sonst bliebe es für immer
    // pausiert.
    if (typeof requestAnimationFrame !== 'function') {
      idleHiddenGated.value = false
      return
    }
    let left = IDLE_RESUME_DELAY_FRAMES
    const step = () => {
      if (--left > 0) {
        resumeFrame = requestAnimationFrame(step)
        return
      }
      resumeFrame = 0
      idleHiddenGated.value = false
    }
    resumeFrame = requestAnimationFrame(step)
  })

  const isIdleRenderingPaused = computed(() => idleHiddenGated.value)

  /**
   * Dasselbe Signal als Klasse am <body>: `.idle-deco-paused` hält die
   * laufenden CSS-Animationen des Idle-Layers an (Regel dazu in main.css).
   *
   * Der Frame-Ausstieg oben stoppt nur, was JS zeichnet — CSS-Animationen
   * laufen unabhängig davon weiter und erklären pro Frame den Stil ihres
   * Elements für ungültig, auch unter einem deckenden Overlay. Am <body>,
   * weil die Orbit-Ebenen per <Teleport> dorthin hängen.
   */
  if (typeof document !== 'undefined') {
    watch(
      idleHiddenGated,
      (hidden) => {
        document.body.classList.toggle('idle-deco-paused', hidden)
      },
      { immediate: true },
    )
  }

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

  /**
   * Pause signal for the BOTTOM BAR — Minimap, Command Panel und Scoreboard.
   * Die Leiste liegt mit z-index 10000 ÜBER dem Pause-Overlay (9998) und bleibt
   * im pausierten Spiel voll sichtbar. Sie darf deshalb NICHT an
   * `isRenderingPaused` hängen: die Simulation (gameStore.tick, battleStore per
   * syncFromTimestamps) läuft während der Pause weiter, ein eingefrorenes HUD
   * würde also schlicht falsche Werte zeigen.
   *
   * Gestoppt wird nur beim echten Hintergrund-Tab: dort schaut niemand hin und
   * der Browser drosselt rAF ohnehin — die Frames wären reine Verschwendung.
   */
  const isHudPaused = computed(() => _isDocHidden.value)

  return {
    isRenderingPaused: readonly(isRenderingPaused),
    isIdleRenderingPaused: readonly(isIdleRenderingPaused),
    isIdleSimulationPaused: readonly(isIdleSimulationPaused),
    isHudPaused: readonly(isHudPaused),
  }
}

let _instance: ReturnType<typeof createInstance> | null = null

export function useRenderingPaused() {
  if (!_instance) _instance = createInstance()
  return _instance
}
