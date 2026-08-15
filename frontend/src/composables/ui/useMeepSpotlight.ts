import { computed, readonly, ref, type ComputedRef, type Ref } from 'vue'

/**
 * Welcher Knoten des Meep-Baums gerade gezeigt wird — gleich, über welcher der
 * beiden Spalten des Skill-Tabs die Maus steht.
 *
 * Orbit-Bühne links und Kaufliste rechts sind zwei Bilder DESSELBEN Bestands
 * (siehe `useMeepSkills`). Ein Zeiger auf einem von ihnen muss deshalb auf
 * beiden dasselbe bedeuten, sonst sucht der Spieler den Kreis zur Karte unter
 * dreißig selbst.
 *
 * Wörtliche Entsprechung zu `useForgeSpotlight` — bis auf die Namen ist es
 * dieselbe Mechanik, und sie ist bewusst nicht zu einer generischen Fassung
 * zusammengezogen: die beiden Reiter teilen keinen Zustand, und ein gemeinsames
 * Modul hielte den Hover des einen, während der andere offen ist.
 *
 * Warum Modulebene statt Props durch `SkillTreeComponent`: die beiden Leser
 * sind keine Geschwister — dazwischen liegt `MeepSkillDetails` mit Kopfband und
 * Empfehlungspanel, das mit diesem Zustand nichts zu tun hat und ihn nur
 * durchreichen müsste. Ein Hover-Id ist reine Anzeige (kein Store, keine
 * Balance-Zahl, kein Spielstand) und damit genau das, was ein Composable halten
 * darf; dasselbe Muster trägt `useActionToast` und `useEventLog`.
 */
const listHoverId = ref<string | null>(null)
const orbitHoverId = ref<string | null>(null)

/**
 * Die Liste gewinnt den Gleichstand — dieselbe Regel wie `spotlightId` im Shop
 * und `spotlightAlly` im Team-Tab: sie ist die absichtlichere Geste und die,
 * die noch steht, während der Zeiger von der Bühne auf eine Karte wandert.
 */
const spotlightId = computed(() => listHoverId.value ?? orbitHoverId.value)

/**
 * Ob der Zeiger die LISTE gerade hält — die Halte-Geste.
 *
 * Reine Ableitung, kein zweiter Zustand. Wer sein Erscheinen an einen Wert
 * hängt, der auch ohne Zutun kippt (der Meep-Bestand springt beim Aufbruch,
 * und `acknowledgeNode` wechselt den Topf einer Karte im Vorbeifahren), fragt
 * hier, ob er warten muss: was der Zeiger hält, darf nicht unter ihm
 * wegrutschen.
 */
const listHovering = computed(() => listHoverId.value !== null)

export function useMeepSpotlight(): {
  spotlightId: ComputedRef<string | null>
  listHoverId: Readonly<Ref<string | null>>
  orbitHoverId: Readonly<Ref<string | null>>
  listHovering: ComputedRef<boolean>
  setListHover: (id: string | null) => void
  setOrbitHover: (id: string | null) => void
  resetMeepSpotlight: () => void
} {
  function setListHover(id: string | null): void {
    listHoverId.value = id
  }

  function setOrbitHover(id: string | null): void {
    orbitHoverId.value = id
  }

  /**
   * Beide Seiten löschen. Der Skill-Tab hängt an `v-show` und bleibt gemountet
   * (`SkillTreeComponent`) — ohne diesen Weg überlebte ein Zeiger, der den Tab
   * verlässt, den Wechsel und hielte einen Knoten dauerhaft hervorgehoben.
   */
  function resetMeepSpotlight(): void {
    listHoverId.value = null
    orbitHoverId.value = null
  }

  return {
    spotlightId,
    listHoverId: readonly(listHoverId),
    orbitHoverId: readonly(orbitHoverId),
    listHovering,
    setListHover,
    setOrbitHover,
    resetMeepSpotlight,
  }
}
