import { computed, readonly, ref, type ComputedRef, type Ref } from 'vue'

/**
 * Welcher Knoten des Sternbaums gerade gezeigt wird — gleich, über welcher der
 * beiden Shop-Spalten die Maus steht.
 *
 * Baum links und Liste rechts sind zwei Bilder DESSELBEN Bestands (siehe
 * `useForgeUpgrades`). Ein Zeiger auf einem von ihnen muss deshalb auf beiden
 * dasselbe bedeuten, sonst sucht der Spieler den Kreis zur Karte unter
 * fünfundzwanzig selbst.
 *
 * Warum Modulebene statt Props durch `ShopComponent`: die beiden Leser sind
 * keine Geschwister — dazwischen liegt `StarForgePanel` mit seinen vier
 * Reitern, das mit diesem Zustand nichts zu tun hat und ihn nur durchreichen
 * müsste. Ein Hover-Id ist reine Anzeige (kein Store, keine Balance-Zahl, kein
 * Spielstand) und damit genau das, was ein Composable halten darf; dasselbe
 * Muster trägt `useActionToast` und `useEventLog`.
 */
const listHoverId = ref<string | null>(null)
const treeHoverId = ref<string | null>(null)

/**
 * Die Liste gewinnt den Gleichstand — dieselbe Regel wie `spotlightAlly` im
 * Team-Tab: sie ist die absichtlichere Geste und die, die noch steht, während
 * der Zeiger vom Baum auf eine Karte wandert.
 */
const spotlightId = computed(() => listHoverId.value ?? treeHoverId.value)

export function useForgeSpotlight(): {
  spotlightId: ComputedRef<string | null>
  treeHoverId: Readonly<Ref<string | null>>
  setListHover: (id: string | null) => void
  setTreeHover: (id: string | null) => void
  resetForgeSpotlight: () => void
} {
  function setListHover(id: string | null): void {
    listHoverId.value = id
  }

  function setTreeHover(id: string | null): void {
    treeHoverId.value = id
  }

  /**
   * Beide Seiten löschen. Der Shop-Tab hängt an `v-show` und bleibt gemountet —
   * ohne diesen Weg überlebte ein Zeiger, der den Tab verlässt, den Wechsel.
   */
  function resetForgeSpotlight(): void {
    listHoverId.value = null
    treeHoverId.value = null
  }

  return {
    spotlightId,
    treeHoverId: readonly(treeHoverId),
    setListHover,
    setTreeHover,
    resetForgeSpotlight,
  }
}
