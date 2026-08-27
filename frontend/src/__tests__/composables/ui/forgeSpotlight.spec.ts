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
    hoverId,
    listHoverId,
    treeHoverId,
    pinnedId,
    focusTick,
    listHovering,
    pinned,
    setListHover,
    setTreeHover,
    setPin,
    refocus,
    focusNode,
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
      setPin('pinned_node')
      expect(spotlightId.value).toBe('pinned_node')
      expect(pinned.value).toBe(true)
      expect(pinnedId.value).toBe('pinned_node')
    })

    it('lässt den Zeiger darunter weiterlaufen', () => {
      // Der Tooltip im Baum hängt an `treeHoverId`, NICHT am Spotlight — genau
      // das ist der Sinn des Fokus: der Zeiger wird frei, um die
      // Voraussetzungen abzufahren, und jede zeigt dabei ihre eigene Karte.
      setPin('pinned_node')
      setTreeHover('other_node')
      expect(spotlightId.value).toBe('pinned_node')
      expect(treeHoverId.value).toBe('other_node')
    })

    it('HÄLT, wenn derselbe Knoten noch einmal kommt', () => {
      // Die Umkehrung des alten `togglePin`. Seit ein Klick immer fokussiert,
      // verlöre der Spieler seine Auswahl sonst durch genau die Geste, mit der
      // er sie bestätigt — und im Baum ist der zweite Klick der KAUF.
      setListHover('list_node')
      setPin('pinned_node')
      setPin('pinned_node')
      expect(pinned.value).toBe(true)
      expect(spotlightId.value).toBe('pinned_node')
    })

    it('versetzt, wenn ein anderer Knoten kommt', () => {
      setPin('first')
      setPin('second')
      expect(spotlightId.value).toBe('second')
    })

    it('löst mit clearPin', () => {
      setPin('pinned_node')
      clearPin()
      expect(pinned.value).toBe(false)
      expect(spotlightId.value).toBeNull()
    })

    it('fällt mit resetForgeSpotlight zurück', () => {
      // DER Tabwechsel-Fall: der Shop-Tab bleibt gemountet, das
      // `onBeforeUnmount` des Baums feuert also gar nicht. Ohne diesen Weg
      // stünde der Fokus der letzten Sitzung beim nächsten Öffnen noch da.
      setPin('pinned_node')
      resetForgeSpotlight()
      expect(pinned.value).toBe(false)
      expect(pinnedId.value).toBeNull()
      expect(spotlightId.value).toBeNull()
    })

    it('meldet den Zustand über `pinned`', () => {
      // Daran hängt der Escape-Verbrauch im Shop-Tab — und damit die Frage, ob
      // dieselbe Taste das ganze Profil schliesst.
      expect(pinned.value).toBe(false)
      setPin('pinned_node')
      expect(pinned.value).toBe(true)
    })

    it('teilt den Fokus über getrennte Aufrufe hinweg', () => {
      const tree = useForgeSpotlight()
      const shop = useForgeSpotlight()
      tree.setPin('shared_pin')
      expect(shop.pinned.value).toBe(true)
      expect(shop.spotlightId.value).toBe('shared_pin')
    })
  })

  /**
   * Der IMPULS — „zeig ihn mir nochmal".
   *
   * Er trägt keinen Wert, nur ein Ereignis: Baum und Liste holen den
   * fokussierten Knoten ins Bild, wenn er sich meldet. Nötig, weil ein zweiter
   * Klick auf dieselbe Zeile den Fokus gerade NICHT ändert — ohne ihn bliebe
   * die Geste wirkungslos.
   */
  describe('focusTick', () => {
    it('zählt bei refocus hoch, ohne den Fokus anzufassen', () => {
      setPin('pinned_node')
      const before = focusTick.value
      refocus()
      expect(focusTick.value).toBe(before + 1)
      expect(pinnedId.value).toBe('pinned_node')
    })

    it('bleibt bei setPin unberührt — dort meldet sich schon `pinnedId`', () => {
      const before = focusTick.value
      setPin('pinned_node')
      expect(focusTick.value).toBe(before)
    })

    it('überlebt resetForgeSpotlight', () => {
      // Ihn zurückzusetzen zündete bei jedem Tabwechsel einen Impuls, auf den
      // beide Spalten mit einer Fahrt antworten würden.
      refocus()
      const before = focusTick.value
      resetForgeSpotlight()
      expect(focusTick.value).toBe(before)
    })
  })

  /**
   * Die Geste der beiden Zeilen: ein anderer versetzt, derselbe holt heran.
   */
  describe('focusNode', () => {
    it('setzt den Fokus auf einen neuen Knoten', () => {
      const before = focusTick.value
      focusNode('first')
      expect(pinnedId.value).toBe('first')
      expect(focusTick.value).toBe(before)
    })

    it('versetzt ihn auf einen anderen', () => {
      focusNode('first')
      focusNode('second')
      expect(pinnedId.value).toBe('second')
    })

    it('holt denselben heran, statt ihn zu lösen', () => {
      focusNode('first')
      const before = focusTick.value
      focusNode('first')
      expect(pinnedId.value).toBe('first')
      expect(focusTick.value).toBe(before + 1)
    })
  })

  /**
   * `hoverId` beantwortet, worauf der Zeiger GERADE zeigt — ohne den Fokus
   * davor. Daran hängen Hervorhebung und Dämpfung: liefen sie weiter über
   * `spotlightId`, schluckte ein stehender Fokus jede Rückmeldung auf allen
   * anderen Zeilen.
   */
  describe('hoverId', () => {
    it('ignoriert den Fokus', () => {
      setPin('pinned_node')
      setTreeHover('tree_node')
      expect(spotlightId.value).toBe('pinned_node')
      expect(hoverId.value).toBe('tree_node')
    })

    it('gibt der Liste denselben Vorrang wie `spotlightId`', () => {
      setTreeHover('tree_node')
      setListHover('list_node')
      expect(hoverId.value).toBe('list_node')
    })

    it('ist null, solange nur ein Fokus steht', () => {
      setPin('pinned_node')
      expect(hoverId.value).toBeNull()
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

/**
 * Die VERFOLGUNG — der zweite Zeiger, und der Grund, warum es zwei sind.
 *
 * Der Fokus wandert mit dem Blick; die Verfolgung bleibt, bis sie erledigt oder
 * abgeraeumt ist. Laege beides im selben Feld, loeschte die Verfolgungs-Karte
 * sich mit ihrem eigenen Knopf: ihre Hauptgeste ist ein Sprung auf eine ihrer
 * Bedingungen, und der setzt den Fokus.
 */
describe('useForgeSpotlight — die Verfolgung', () => {
  it('nimmt eine Id ohne Sitz im Netz an', () => {
    const { pursuitId, setPursuit } = useForgeSpotlight()
    setPursuit('risingArmada')
    expect(pursuitId.value).toBe('risingArmada')
  })

  it('ueberlebt einen Fokuswechsel', () => {
    // Genau der Fall: Klick auf eine Bedingung der Karte.
    const { pursuitId, pinnedId, setPursuit, focusNode } = useForgeSpotlight()
    setPursuit('risingArmada')
    focusNode('solarSails')
    expect(pinnedId.value).toBe('solarSails')
    expect(pursuitId.value).toBe('risingArmada')
  })

  it('faellt mit clearPursuit und mit dem Aufraeumen des Reiters', () => {
    const { pursuitId, setPursuit, clearPursuit, resetForgeSpotlight } = useForgeSpotlight()
    setPursuit('risingArmada')
    clearPursuit()
    expect(pursuitId.value).toBeNull()

    setPursuit('risingArmada')
    resetForgeSpotlight()
    expect(pursuitId.value).toBeNull()
  })
})
