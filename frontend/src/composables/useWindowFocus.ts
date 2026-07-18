// composables/useWindowFocus.ts
// Globaler Fokus-Zustand — einmal erstellt, überall nutzbar.
// windowFocused = false wenn der Nutzer auf einen anderen Monitor/Fenster klickt.
// Die Spiellogik (gameStore.tick) läuft IMMER weiter.
// Nur Animationen und visuelle Effekte stoppen.

import { ref, readonly } from 'vue'
import { FOCUS_POLL_INTERVAL_MS } from '@/config/constants'

const windowFocused = ref(true)
const _listeners: Array<(focused: boolean) => void> = []

function setFocused(focused: boolean) {
  if (windowFocused.value === focused) return
  windowFocused.value = focused
  _listeners.forEach((fn) => fn(focused))
}

function handleFocus() {
  setFocused(true)
}

function handleBlur() {
  setFocused(false)
}

let initialized = false

export function useWindowFocus() {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true
    windowFocused.value = document.hasFocus()
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    // Polling-Fallback: Chrome feuert focus/blur auf Multi-Monitor-Setups nicht
    // zuverlässig. Ohne diesen Abgleich bliebe windowFocused nach einem
    // verpassten Event dauerhaft falsch → alle Render-Loops (Sterne, Sonne,
    // Orbits, Minimap, Nebula) blieben bis zum Reload eingefroren.
    setInterval(() => {
      setFocused(document.hasFocus())
    }, FOCUS_POLL_INTERVAL_MS)
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
