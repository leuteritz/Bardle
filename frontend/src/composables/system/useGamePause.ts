// composables/system/useGamePause.ts
// Ein Pause-Signal für das ganze Spiel.
//
// Bisher war „pausiert" gleichbedeutend mit „Fenster hat keinen Fokus": das
// PauseOverlay hing direkt an `windowFocused` und setzte daraus
// `gameStore.isGamePaused`, an dem wiederum jede Render-Schleife hängt. Mit dem
// Tastenkürzel gibt es eine zweite Quelle — der Spieler pausiert ausdrücklich,
// obwohl das Fenster den Fokus hat. Beide Quellen laufen hier zusammen, damit
// keine Stelle im Spiel die eine kennen muss und die andere nicht.
//
// Absichtlich NICHT im Save: eine Pause endet mit der Sitzung.

import { computed, readonly, ref } from 'vue'
import { useWindowFocus } from '@/composables/system/useWindowFocus'

/** Vom Spieler ausdrücklich gesetzte Pause (Taste oder Klick auf die Keycap). */
const manualPaused = ref(false)

function createInstance() {
  const { windowFocused } = useWindowFocus()

  /** Wahr, sobald IRGENDEINE Quelle das Spiel anhält. */
  const isPaused = computed(() => manualPaused.value || !windowFocused.value)

  function pauseGame() {
    manualPaused.value = true
  }

  /**
   * Beendet beide Pause-Quellen: das Flag hier und — falls die Pause vom
   * fehlenden Fensterfokus kam — den fehlenden Fokus selbst.
   */
  function resumeGame() {
    manualPaused.value = false
    if (!windowFocused.value && typeof window !== 'undefined') window.focus()
  }

  function togglePause() {
    if (isPaused.value) resumeGame()
    else pauseGame()
  }

  return {
    isPaused: readonly(isPaused),
    isManuallyPaused: readonly(manualPaused),
    pauseGame,
    resumeGame,
    togglePause,
  }
}

let _instance: ReturnType<typeof createInstance> | null = null

/**
 * App-lebenslanges Singleton — dieselbe Begründung wie bei
 * `useRenderingPaused`: der Aufruf steckt in Komponenten, die pro Frame neu
 * auswerten, und jede frische computed()-Instanz wäre reiner Garbage.
 */
export function useGamePause() {
  if (!_instance) _instance = createInstance()
  return _instance
}
