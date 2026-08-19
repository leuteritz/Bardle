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
 * Muster trägt `useHerald` und `useEventLog`.
 *
 * Eine ANHEFTUNG gab es hier einmal: ein Klick hielt einen Knoten im Detailkopf
 * fest. Sie ist mit dem Detailkopf gegangen — und mit dem Bedingungs-Kranz
 * zurückgekommen, für eine andere Aufgabe (siehe `pinnedId`).
 */
const listHoverId = ref<string | null>(null)
const treeHoverId = ref<string | null>(null)

/**
 * Der ANGEHEFTETE Knoten — die dritte Quelle, und die stärkste.
 *
 * Ein Klick auf einen GESPERRTEN Knoten war im Baum bisher wirkungslos:
 * `buyUpgrade` gibt `false` zurück und nichts geschieht. Er hält jetzt die
 * Ansicht fest, damit der Zeiger die Voraussetzungen abfahren kann, ohne den
 * Fokus mitzunehmen — genau das, was ein Zeige-Fokus prinzipiell nicht kann.
 *
 * Aufgelöst wird sie ausdrücklich: derselbe Knoten noch einmal, ein anderer,
 * ein Kauf, ein Klick auf die leere Bühne, Escape, ein Tabwechsel.
 */
const pinnedId = ref<string | null>(null)

/**
 * Anheftung schlägt Liste schlägt Baum — von der absichtlichsten Geste zur
 * billigsten.
 *
 * Die Anheftung steht VOR beiden Zeigern und nicht zwischen ihnen: eine, die
 * der nächste Zeigerweg wieder abräumt, wäre keine — und der erste Weg nach dem
 * Anheften führt zwangsläufig auf einen anderen Knoten.
 *
 * Die mittlere Regel ist die alte, dieselbe wie `spotlightAlly` im Team-Tab:
 * die Liste ist die absichtlichere Geste und die, die noch steht, während der
 * Zeiger vom Baum auf eine Karte wandert.
 */
const spotlightId = computed(
  () => pinnedId.value ?? listHoverId.value ?? treeHoverId.value,
)

/**
 * Hängt die Ansicht fest?
 *
 * Der Baum zeichnet daran seine Anheftungs-Marke, und der Shop-Tab entscheidet
 * daran, ob er die Escape-Taste verbraucht — ohne diese Meldung schlösse
 * dieselbe Taste gleich das ganze Profil (`BardProfileMenu`).
 */
const pinned = computed(() => pinnedId.value !== null)

/**
 * Ob der Zeiger die LISTE gerade hält — die Halte-Geste.
 *
 * Reine Ableitung, kein zweiter Zustand. Wer sein Erscheinen an einen Wert
 * hängt, der auch ohne Zutun kippt (die Chimes ticken jede Sekunde), fragt
 * hier, ob er warten muss: was der Zeiger hält, darf nicht unter ihm
 * wegrutschen.
 *
 * Sie hatte genau einen Leser, das Empfehlungs-Panel, und das ist gestrichen.
 * Sie bleibt trotzdem: dieselbe Frage stellt sich in dieser Spalte an mehreren
 * Stellen (`frozenBuckets` und `frozenBulk` in `ForgeUpgradesSection` lösen sie
 * über ihr eigenes `mouseenter`, weil sie beim Betreten eine Momentaufnahme
 * brauchen und nicht nur ein Ja/Nein).
 */
const listHovering = computed(() => listHoverId.value !== null)

export function useForgeSpotlight(): {
  spotlightId: ComputedRef<string | null>
  listHoverId: Readonly<Ref<string | null>>
  treeHoverId: Readonly<Ref<string | null>>
  pinnedId: Readonly<Ref<string | null>>
  listHovering: ComputedRef<boolean>
  pinned: ComputedRef<boolean>
  setListHover: (id: string | null) => void
  setTreeHover: (id: string | null) => void
  togglePin: (id: string) => void
  clearPin: () => void
  resetForgeSpotlight: () => void
} {
  function setListHover(id: string | null): void {
    listHoverId.value = id
  }

  function setTreeHover(id: string | null): void {
    treeHoverId.value = id
  }

  /**
   * Derselbe Knoten löst, ein anderer versetzt.
   *
   * Ein reines `setPin` bräuchte den Vergleich an jeder Aufrufstelle — und es
   * gibt genau eine Geste, die hier ankommt.
   */
  function togglePin(id: string): void {
    pinnedId.value = pinnedId.value === id ? null : id
  }

  function clearPin(): void {
    pinnedId.value = null
  }

  /**
   * Alle drei Quellen löschen. Der Shop-Tab bleibt nach dem ersten Öffnen
   * GEMOUNTET (`BardProfileMenu` rendert ihn als `v-if="mountedTabs.has(…)"`
   * plus `v-show`, und `mountedTabs` wird nie geleert) — ohne diesen Weg
   * überlebte eine Anheftung den Tabwechsel garantiert. Ein Zeiger tut es heute
   * nur deshalb nicht, weil sein `mouseleave` ihn zufällig aufräumt.
   */
  function resetForgeSpotlight(): void {
    listHoverId.value = null
    treeHoverId.value = null
    pinnedId.value = null
  }

  return {
    spotlightId,
    listHoverId: readonly(listHoverId),
    treeHoverId: readonly(treeHoverId),
    pinnedId: readonly(pinnedId),
    listHovering,
    pinned,
    setListHover,
    setTreeHover,
    togglePin,
    clearPin,
    resetForgeSpotlight,
  }
}
