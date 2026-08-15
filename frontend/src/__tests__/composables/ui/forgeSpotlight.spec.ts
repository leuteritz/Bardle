import { describe, it, expect, beforeEach } from 'vitest'
import { useForgeSpotlight } from '@/composables/ui/useForgeSpotlight'

/**
 * `useForgeSpotlight` hält seinen Zustand auf MODULEBENE — er überlebt damit
 * jede Komponente, die ihn liest, und genau das ist hier zu prüfen: die
 * Vorrangregel zwischen den beiden Quellen und das Abräumen.
 *
 * Der Shop-Tab hängt an `v-show` und bleibt gemountet. Ein Zeiger, der beim
 * Tabwechsel auf einer Karte stand, ließe den Knoten im Sternbaum sonst
 * leuchten, bis der Spieler zufällig wieder über die Spalte fährt.
 */
describe('useForgeSpotlight', () => {
  const {
    spotlightId,
    detailId,
    pinnedId,
    treeHoverId,
    setListHover,
    setTreeHover,
    setPinned,
    togglePin,
    resetForgeSpotlight,
  } = useForgeSpotlight()

  // Zugleich der Beweis, dass die Abräumung wirkt: liefe sie nicht, trüge
  // jeder Test den Zeiger des vorigen mit.
  beforeEach(() => {
    resetForgeSpotlight()
  })

  it('zeigt im Ruhezustand auf nichts', () => {
    expect(spotlightId.value).toBeNull()
    expect(treeHoverId.value).toBeNull()
  })

  it('spotlightet, worauf der Baum zeigt', () => {
    setTreeHover('solar_ray')
    expect(spotlightId.value).toBe('solar_ray')
    expect(treeHoverId.value).toBe('solar_ray')
  })

  it('spotlightet, worauf die Liste zeigt', () => {
    setListHover('forge_branch')
    expect(spotlightId.value).toBe('forge_branch')
    // Der Tooltip im Baum hängt an DIESEM Wert und darf nicht mitziehen.
    expect(treeHoverId.value).toBeNull()
  })

  /**
   * Die Regel, auf der die ganze Zwei-Flächen-Illusion ruht: wandert der Zeiger
   * vom Baum auf eine Karte, gewinnt die Karte — sonst bliebe der Spotlight an
   * dem Knoten hängen, den der Zeiger gerade verlassen hat.
   */
  it('lässt die Liste den Gleichstand gewinnen', () => {
    setTreeHover('tree_node')
    setListHover('list_node')
    expect(spotlightId.value).toBe('list_node')

    // Und fällt zurück auf den Baum, sobald die Liste loslässt.
    setListHover(null)
    expect(spotlightId.value).toBe('tree_node')
  })

  it('räumt mit resetForgeSpotlight beide Seiten ab', () => {
    setTreeHover('tree_node')
    setListHover('list_node')
    resetForgeSpotlight()
    expect(spotlightId.value).toBeNull()
    expect(treeHoverId.value).toBeNull()
  })

  /**
   * Die Anheftung ist der Grund, warum der Detailkopf überhaupt bedienbar ist:
   * der Zeiger streift auf dem Weg zum Kaufknopf zwangsläufig andere Zeilen,
   * und ohne diese Regel risse jede davon das Detail wieder weg.
   */
  it('lässt das Angeheftete den Hover schlagen', () => {
    setPinned('pinned_node')
    setTreeHover('tree_node')
    setListHover('list_node')

    expect(detailId.value).toBe('pinned_node')
    // Die HERVORHEBUNG folgt weiter dem Zeiger — nur der Detailkopf steht still.
    expect(spotlightId.value).toBe('list_node')
  })

  it('fällt ohne Anheftung auf den Hover zurück', () => {
    setTreeHover('tree_node')
    expect(detailId.value).toBe('tree_node')

    setPinned('pinned_node')
    expect(detailId.value).toBe('pinned_node')

    setPinned(null)
    expect(detailId.value).toBe('tree_node')
  })

  it('löst mit togglePin denselben Knoten wieder', () => {
    togglePin('node_a')
    expect(pinnedId.value).toBe('node_a')

    // Ein anderer Knoten übernimmt, statt zu lösen.
    togglePin('node_b')
    expect(pinnedId.value).toBe('node_b')

    togglePin('node_b')
    expect(pinnedId.value).toBeNull()
  })

  /**
   * Der Nachhall: verlässt der Zeiger die Liste, bleibt der Detailkopf stehen.
   * Fiele er stattdessen auf null zurück, wechselte er Inhalt UND Höhe genau in
   * dem Moment, in dem niemand mehr hinzeigt — und der Spieler verlöre auf dem
   * Weg zum Kaufknopf, was er gerade gelesen hat.
   */
  it('behält den zuletzt gezeigten Knoten, wenn der Zeiger loslässt', () => {
    setListHover('list_node')
    setListHover(null)

    expect(detailId.value).toBe('list_node')
    // Die HERVORHEBUNG geht mit dem Zeiger aus — nur der Detailkopf hält.
    expect(spotlightId.value).toBeNull()
  })

  it('lässt den Nachhall vom nächsten Zeigen überschreiben', () => {
    setTreeHover('tree_node')
    setTreeHover(null)
    expect(detailId.value).toBe('tree_node')

    setListHover('list_node')
    setListHover(null)
    expect(detailId.value).toBe('list_node')
  })

  it('räumt auch die Anheftung ab', () => {
    setPinned('pinned_node')
    resetForgeSpotlight()
    expect(pinnedId.value).toBeNull()
    expect(detailId.value).toBeNull()
  })

  it('räumt auch den Nachhall ab', () => {
    setListHover('list_node')
    setListHover(null)
    resetForgeSpotlight()
    expect(detailId.value).toBeNull()
  })

  it('teilt den Zustand über getrennte Aufrufe hinweg', () => {
    // Baum und Liste rufen das Composable je einmal auf — sähen sie
    // verschiedene Refs, hübe der Zeiger auf einer Seite drüben nichts hervor.
    const tree = useForgeSpotlight()
    const list = useForgeSpotlight()
    tree.setTreeHover('shared_node')
    expect(list.spotlightId.value).toBe('shared_node')
  })
})
