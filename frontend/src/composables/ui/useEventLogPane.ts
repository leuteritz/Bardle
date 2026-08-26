import { readonly, ref, type Ref } from 'vue'
import { EVENT_LOG_FOLD_STORAGE_KEY } from '@/config/constants'

/**
 * Ist das Eventlog-Panel oben rechts eingeklappt?
 *
 * Modulebene wie `useForgeDetailsPane`, aber MIT localStorage: das Panel steht
 * dauerhaft im Bild und deckt ausgeklappt rund ein Zehntel der Bühne ab. Wer es
 * zuzieht, will es nach dem Reload zu haben — sonst wäre die Geste bei jedem
 * Sitzungsstart neu fällig.
 *
 * Nicht in `usePersistence` und nicht in einem Store: ein Auf/Zu ist Anzeige,
 * keine Balance-Zahl, und seit `isEventLogOpen` entfallen ist gibt es genau
 * EINEN Leser. Vorbild für den Schlüssel ist
 * `ENCYCLOPEDIA_BOOKMARKS_STORAGE_KEY`.
 */
function readStored(): boolean {
  try {
    return localStorage.getItem(EVENT_LOG_FOLD_STORAGE_KEY) === '1'
  } catch {
    // Privater Modus, gesperrte Site-Daten — offen ist der brauchbare Zustand.
    return false
  }
}

const folded = ref(readStored())

export function useEventLogPane(): {
  folded: Readonly<Ref<boolean>>
  toggleFold: () => void
} {
  function toggleFold(): void {
    folded.value = !folded.value
    try {
      localStorage.setItem(EVENT_LOG_FOLD_STORAGE_KEY, folded.value ? '1' : '0')
    } catch {
      /* nicht speicherbar — der Zustand gilt trotzdem für diese Sitzung */
    }
  }

  return { folded: readonly(folded), toggleFold }
}
