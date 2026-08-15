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
    listHoverId,
    treeHoverId,
    listHovering,
    setListHover,
    setTreeHover,
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
    expect(listHoverId.value).toBeNull()
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
    // Das schwebende Kärtchen der Liste hängt an DIESEM.
    expect(listHoverId.value).toBe('forge_branch')
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
    expect(listHoverId.value).toBeNull()
  })

  /**
   * Die Halte-Geste. Das Empfehlungs-Panel über der Liste hängt an einem Wert,
   * der auch ohne Zutun kippt — die Chimes ticken jede Sekunde. Erschiene es,
   * während der Zeiger in der Liste steht, schöbe es sie um dreihundert Pixel
   * unter ihm weg. Es fragt deshalb hier, ob es warten muss.
   */
  describe('listHovering', () => {
    it('ist im Ruhezustand falsch', () => {
      expect(listHovering.value).toBe(false)
    })

    it('meldet den gehaltenen Zeiger und sein Loslassen', () => {
      setListHover('list_node')
      expect(listHovering.value).toBe(true)

      setListHover(null)
      expect(listHovering.value).toBe(false)
    })

    /** Der Baum hält nicht — nur die Liste kann von einem Panel verschoben werden. */
    it('bleibt falsch, wenn nur der Baum zeigt', () => {
      setTreeHover('tree_node')
      expect(listHovering.value).toBe(false)
    })

    it('fällt mit resetForgeSpotlight zurück', () => {
      setListHover('list_node')
      resetForgeSpotlight()
      expect(listHovering.value).toBe(false)
    })
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
