// composables/useWindowFocus.ts
// Globaler Fokus-Zustand — einmal erstellt, überall nutzbar.
// windowFocused = false wenn der Nutzer auf einen anderen Monitor/Fenster klickt.
// Die Spiellogik (gameStore.tick) läuft IMMER weiter.
// Nur Animationen und visuelle Effekte stoppen.

import { ref, readonly } from 'vue'

const windowFocused = ref(true)
const _listeners: Array<(focused: boolean) => void> = []

function handleFocus() {
  windowFocused.value = true
  _listeners.forEach((fn) => fn(true))
}

function handleBlur() {
  windowFocused.value = false
  _listeners.forEach((fn) => fn(false))
}

let initialized = false

export function useWindowFocus() {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true
    windowFocused.value = document.hasFocus()
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
  }

  function onFocusChange(fn: (focused: boolean) => void) {
    _listeners.push(fn)
    return () => {
      const idx = _listeners.indexOf(fn)
      if (idx !== -1) _listeners.splice(idx, 1)
    }
  }

  return {
    windowFocused: readonly(windowFocused),
    onFocusChange,
  }
}
