import { readonly, ref, type Ref } from 'vue'
import { EVENT_LOG_FOLD_STORAGE_KEY } from '@/config/constants'
import type { EventTabId } from '@/config/ui/eventLog'

/**
 * Wie die Eventlog-Spur oben rechts steht: zugeklappt, welcher Tab, Fehleralarm.
 *
 * Modulebene wie `useForgeDetailsPane`, aber MIT localStorage fuer den
 * Klappzustand: das Panel steht dauerhaft im Bild und deckt ausgeklappt rund ein
 * Zehntel der Bühne ab. Wer es zuzieht, will es nach dem Reload zu haben — sonst
 * wäre die Geste bei jedem Sitzungsstart neu fällig.
 *
 * Nicht in `usePersistence` und nicht in einem Store: ein Auf/Zu ist Anzeige,
 * keine Balance-Zahl. Vorbild für den Schlüssel ist
 * `ENCYCLOPEDIA_BOOKMARKS_STORAGE_KEY`.
 *
 * Der aktive Tab liegt hier und nicht in `EventLogPanel.vue`, weil ein
 * Laufzeitfehler ihn auch dann setzen können muss, wenn die Komponente gerade
 * verdeckt und damit gar nicht gemountet ist (Profil-Reiter, Star-Fight-Modal,
 * Enzyklopädie). Beim Schliessen des Overlays steht der System-Tab dann offen.
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
const activeTab = ref<EventTabId>('all')
const errorAlert = ref(false)

export function useEventLogPane(): {
  folded: Readonly<Ref<boolean>>
  activeTab: Readonly<Ref<EventTabId>>
  errorAlert: Readonly<Ref<boolean>>
  toggleFold: () => void
  selectTab: (id: EventTabId) => void
  revealSystemTab: () => void
  clearErrorAlert: () => void
} {
  function toggleFold(): void {
    folded.value = !folded.value
    try {
      localStorage.setItem(EVENT_LOG_FOLD_STORAGE_KEY, folded.value ? '1' : '0')
    } catch {
      /* nicht speicherbar — der Zustand gilt trotzdem für diese Sitzung */
    }
  }

  function selectTab(id: EventTabId): void {
    activeTab.value = id
  }

  /**
   * Ein Fehler deckt die Spur auf.
   *
   * Der Tabwechsel ist gratis und läuft bei jedem neuen Fehler. Das AUFKLAPPEN
   * kostet ein Drittel der Bühne und läuft nur, solange keine ungelesene Marke
   * steht — sonst risse eine Fehlerserie eine Spur wieder auf, die der Spieler
   * gerade zugezogen hat.
   *
   * Kein `setItem`: die gespeicherte Vorliebe gehört dem Spieler, nicht dem
   * Fehler. Sein nächster Klick auf das Chevron schreibt sie ohnehin wieder.
   */
  function revealSystemTab(): void {
    if (!errorAlert.value) folded.value = false
    activeTab.value = 'system'
    errorAlert.value = true
  }

  /** Gelöscht wird durch eine GESTE, nie durch einen Watcher auf den Zustand,
   *  den `revealSystemTab` selbst gerade gesetzt hat. */
  function clearErrorAlert(): void {
    errorAlert.value = false
  }

  return {
    folded: readonly(folded),
    activeTab: readonly(activeTab),
    errorAlert: readonly(errorAlert),
    toggleFold,
    selectTab,
    revealSystemTab,
    clearErrorAlert,
  }
}
