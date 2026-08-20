import { readonly, ref, type Ref } from 'vue'

/**
 * Ist die Detailspalte des Shop-Tabs ausgefahren?
 *
 * Sie startet EINGEKLAPPT. Der Sternbaum ist das, weshalb der Tab geöffnet
 * wird — die Spalte daneben ist Nachschlagewerk und Kasse, kein Dauerzustand,
 * und auf Full HD nahm sie dem Baum rund fünfhundert Pixel ab, auch wenn
 * niemand sie ansah.
 *
 * Modulebene und NICHT im Spielstand, dieselbe Begründung wie in
 * `useForgeSpotlight`: ein Auf/Zu ist reine Anzeige, keine Balance-Zahl und
 * kein Inhalts-Vertrag. Gemerkt wird er für die SITZUNG — wer die Spalte
 * aufmacht, findet sie nach einem Tabwechsel wieder offen; nach einem Reload
 * steht der Baum wieder allein da.
 *
 * Ausdrücklich NICHT in `useForgeSpotlight` untergebracht, obwohl beide
 * denselben Tab bedienen und beide auf Modulebene liegen. Dessen
 * `resetForgeSpotlight()` läuft bei JEDEM Tabwechsel (`ShopComponent`), und ein
 * dort mitgeräumtes `detailsOpen` klappte die Spalte bei jedem Öffnen wieder
 * zu. Der Fehler wäre still: niemand sieht einer Abräum-Funktion an, dass ein
 * Feld darin nichts verloren hat.
 */
const detailsOpen = ref(false)

export function useForgeDetailsPane(): {
  detailsOpen: Readonly<Ref<boolean>>
  openDetails: () => void
  closeDetails: () => void
  toggleDetails: () => void
} {
  /**
   * Ausfahren — ohne Gegenstück im selben Aufruf.
   *
   * Der Sternbaum ruft das beim Klick auf einen Knoten, und dort darf ein
   * zweiter Klick die Spalte nicht wieder zuziehen: sie ist dann gerade der
   * Grund, warum der Spieler überhaupt hinsieht.
   */
  function openDetails(): void {
    detailsOpen.value = true
  }

  function closeDetails(): void {
    detailsOpen.value = false
  }

  /** Die Geste der Griffleiste — die einzige Stelle, die beide Richtungen kennt. */
  function toggleDetails(): void {
    detailsOpen.value = !detailsOpen.value
  }

  return {
    detailsOpen: readonly(detailsOpen),
    openDetails,
    closeDetails,
    toggleDetails,
  }
}
