import { describe, it, expect, beforeEach } from 'vitest'
import { useForgeDetailsPane } from '@/composables/ui/useForgeDetailsPane'

/**
 * `useForgeDetailsPane` hält seinen Zustand auf MODULEBENE — und genau das ist
 * hier zu prüfen: zwei Aufrufer sehen dasselbe Auf/Zu, und der Startwert ist
 * `false`, weil der Shop-Tab mit freiem Sternbaum aufgeht.
 *
 * Was hier NICHT stehen darf, ist ein Aufruf von `resetForgeSpotlight()`. Die
 * beiden Zustände sind bewusst getrennt (siehe Kopfkommentar dort): der eine
 * wird bei jedem Tabwechsel abgeräumt, der andere überlebt ihn.
 */
describe('useForgeDetailsPane', () => {
  const { detailsOpen, openDetails, closeDetails, toggleDetails } = useForgeDetailsPane()

  // Zugleich der Beweis, dass `closeDetails` wirkt: liefe es nicht, trüge jeder
  // Test den Zustand des vorigen mit.
  beforeEach(() => {
    closeDetails()
  })

  it('startet eingeklappt', () => {
    expect(detailsOpen.value).toBe(false)
  })

  it('fährt aus und wieder ein', () => {
    openDetails()
    expect(detailsOpen.value).toBe(true)
    closeDetails()
    expect(detailsOpen.value).toBe(false)
  })

  /**
   * Der Sternbaum ruft `openDetails()` bei jedem Klick auf einen Knoten,
   * solange die Spalte zu ist. Wäre das ein Umschalter, zöge der zweite Klick
   * sie wieder zu — und der Spieler sähe die Zeile nie, die er gerade anheftet.
   */
  it('öffnet zweimal hintereinander, ohne umzuschalten', () => {
    openDetails()
    openDetails()
    expect(detailsOpen.value).toBe(true)
  })

  it('schaltet über die Geste der Griffleiste in beide Richtungen', () => {
    toggleDetails()
    expect(detailsOpen.value).toBe(true)
    toggleDetails()
    expect(detailsOpen.value).toBe(false)
  })

  /**
   * Die Modulebene ist der ganze Zweck: Baum, Griffleiste und Escape-Kaskade
   * greifen aus drei verschiedenen Komponenten auf denselben Wert zu.
   */
  it('teilt den Zustand über getrennte Aufrufe hinweg', () => {
    const second = useForgeDetailsPane()
    openDetails()
    expect(second.detailsOpen.value).toBe(true)
    second.closeDetails()
    expect(detailsOpen.value).toBe(false)
  })
})
