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
    pinnedId,
    listHovering,
    pinned,
    setListHover,
    setTreeHover,
    togglePin,
    clearPin,
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
   * Die Halte-Geste: hält der Zeiger die Liste gerade?
   *
   * Alles, was in dieser Spalte an einem Wert hängt, der auch ohne Zutun kippt
   * — die Chimes ticken jede Sekunde —, darf sich nicht bewegen, solange der
   * Zeiger darauf zielt. Die Reihenfolge und die Stapelzahl lösen das mit einer
   * eigenen Momentaufnahme; für ein blosses Ja/Nein steht diese Ableitung.
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

  /**
   * Die ANHEFTUNG — die dritte Quelle.
   *
   * Sie ist die einzige, die eine ABSICHT trägt: ein Klick, kein Vorbeifahren.
   * Genau deshalb steht sie vor beiden Zeigern, und genau deshalb muss sie sich
   * ausdrücklich lösen lassen — eine Anheftung, die der nächste Zeigerweg
   * abräumt, wäre keine.
   */
  describe('pinnedId', () => {
    it('schlägt beide Zeiger', () => {
      setTreeHover('tree_node')
      setListHover('list_node')
      togglePin('pinned_node')
      expect(spotlightId.value).toBe('pinned_node')
      expect(pinned.value).toBe(true)
      expect(pinnedId.value).toBe('pinned_node')
    })

    it('lässt den Zeiger darunter weiterlaufen', () => {
      // Der Tooltip im Baum hängt an `treeHoverId`, NICHT am Spotlight — genau
      // das ist der Sinn der Anheftung: der Zeiger wird frei, um die
      // Voraussetzungen abzufahren, und jede zeigt dabei ihre eigene Karte.
      togglePin('pinned_node')
      setTreeHover('other_node')
      expect(spotlightId.value).toBe('pinned_node')
      expect(treeHoverId.value).toBe('other_node')
    })

    it('löst, wenn derselbe Knoten noch einmal kommt', () => {
      setListHover('list_node')
      togglePin('pinned_node')
      togglePin('pinned_node')
      expect(pinned.value).toBe(false)
      // Und fällt auf die Quelle darunter zurück, statt ins Leere.
      expect(spotlightId.value).toBe('list_node')
    })

    it('versetzt, wenn ein anderer Knoten kommt', () => {
      togglePin('first')
      togglePin('second')
      expect(spotlightId.value).toBe('second')
    })

    it('löst mit clearPin', () => {
      togglePin('pinned_node')
      clearPin()
      expect(pinned.value).toBe(false)
      expect(spotlightId.value).toBeNull()
    })

    it('fällt mit resetForgeSpotlight zurück', () => {
      // DER Tabwechsel-Fall: der Shop-Tab bleibt gemountet, das
      // `onBeforeUnmount` des Baums feuert also gar nicht. Ohne diesen Weg
      // stünde die Anheftung der letzten Sitzung beim nächsten Öffnen noch da.
      togglePin('pinned_node')
      resetForgeSpotlight()
      expect(pinned.value).toBe(false)
      expect(pinnedId.value).toBeNull()
      expect(spotlightId.value).toBeNull()
    })

    it('meldet den Zustand über `pinned`', () => {
      // Daran hängt der Escape-Verbrauch im Shop-Tab — und damit die Frage, ob
      // dieselbe Taste das ganze Profil schliesst.
      expect(pinned.value).toBe(false)
      togglePin('pinned_node')
      expect(pinned.value).toBe(true)
    })

    it('teilt die Anheftung über getrennte Aufrufe hinweg', () => {
      const tree = useForgeSpotlight()
      const shop = useForgeSpotlight()
      tree.togglePin('shared_pin')
      expect(shop.pinned.value).toBe(true)
      expect(shop.spotlightId.value).toBe('shared_pin')
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
