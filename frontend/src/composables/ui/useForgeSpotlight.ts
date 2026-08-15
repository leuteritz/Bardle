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

/**
 * Der Knoten, den der Detailkopf der rechten Spalte GROSS zeigt — angeheftet
 * per Klick, gleich ob auf den Kreis im Baum oder auf die Zeile in der Liste.
 */
const pinnedId = ref<string | null>(null)

/**
 * Der zuletzt gezeigte Knoten — der Nachhall, wenn der Zeiger nirgendwo mehr
 * steht.
 *
 * Ohne ihn fiele der Detailkopf in dem Moment auf null zurück, in dem der
 * Zeiger die Liste verlässt: der Spieler verlöre auf dem Weg zum Kaufknopf
 * genau das, was er gerade gelesen hat, und der Kopf wechselte seine Höhe
 * dabei mit. Er wird beim ZEIGEN geschrieben, nicht beim Loslassen — ein
 * `watch` auf `spotlightId` täte dasselbe, nur eine Tick-Grenze später.
 */
const lastShownId = ref<string | null>(null)

/**
 * Was der Detailkopf zeigt: das Angeheftete, sonst das, worauf gerade gezeigt
 * wird, sonst das zuletzt Gezeigte.
 *
 * Die Anheftung schlägt den Hover, und das ist der ganze Sinn der Geste. Ohne
 * sie risse der Zeiger auf dem Weg zum Kaufknopf das Detail wieder weg — er
 * streift dabei zwangsläufig andere Zeilen. `spotlightId` bleibt davon
 * unberührt: die HERVORHEBUNG in Baum und Liste folgt weiter dem Zeiger, nur
 * der Detailkopf steht still.
 */
const detailId = computed(() => pinnedId.value ?? spotlightId.value ?? lastShownId.value)

export function useForgeSpotlight(): {
  spotlightId: ComputedRef<string | null>
  detailId: ComputedRef<string | null>
  pinnedId: Readonly<Ref<string | null>>
  treeHoverId: Readonly<Ref<string | null>>
  setListHover: (id: string | null) => void
  setTreeHover: (id: string | null) => void
  setPinned: (id: string | null) => void
  togglePin: (id: string) => void
  resetForgeSpotlight: () => void
} {
  /** Jedes ZEIGEN hinterlässt seinen Nachhall; das Loslassen räumt ihn nicht ab. */
  function remember(id: string | null): void {
    if (id !== null) lastShownId.value = id
  }

  function setListHover(id: string | null): void {
    listHoverId.value = id
    remember(id)
  }

  function setTreeHover(id: string | null): void {
    treeHoverId.value = id
    remember(id)
  }

  function setPinned(id: string | null): void {
    pinnedId.value = id
    remember(id)
  }

  /** Zweiter Klick auf denselben Knoten löst die Anheftung wieder. */
  function togglePin(id: string): void {
    pinnedId.value = pinnedId.value === id ? null : id
    remember(id)
  }

  /**
   * Beide Seiten löschen. Der Shop-Tab hängt an `v-show` und bleibt gemountet —
   * ohne diesen Weg überlebte ein Zeiger, der den Tab verlässt, den Wechsel.
   * Die Anheftung geht mit, und der Nachhall ebenso: beides ist Ansichtszustand
   * DIESES Tabs und hätte beim nächsten Öffnen nichts mehr zu sagen.
   */
  function resetForgeSpotlight(): void {
    listHoverId.value = null
    treeHoverId.value = null
    pinnedId.value = null
    lastShownId.value = null
  }

  return {
    spotlightId,
    detailId,
    pinnedId: readonly(pinnedId),
    treeHoverId: readonly(treeHoverId),
    setListHover,
    setTreeHover,
    setPinned,
    togglePin,
    resetForgeSpotlight,
  }
}
