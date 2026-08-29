import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '@/stores/core/uiStore'

/**
 * Der Rundweg Firmament → Voyages → Firmament.
 *
 * Zwei Dinge laufen sonst still auseinander: das Angebot muss enden, sobald der
 * Spieler von HAND weiternavigiert (sonst steht die Pille in einem Reiter, aus
 * dem sie nichts erklaert), und der Rueckweg muss die Auswahl mitbringen — das
 * Firmament raeumt seine eigene beim Verlassen ab.
 */
describe('Firmament-Sprung in den Voyages-Atlas', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('setzt Reiter, Sprungziel und das Rueckweg-Angebot in EINEM Zug', () => {
    const ui = useUiStore()
    ui.requestOpenVoyagesFromFirmament(7)

    expect(ui.bardActiveTab).toBe('expedition')
    expect(ui.pendingVoyageTarget).toEqual({ galaxy: 7, pinKey: null })
    expect(ui.firmamentTabReturnPending).toBe(true)
  })

  it('laesst den Sprung der Minimap ohne Rueckweg-Angebot', () => {
    const ui = useUiStore()
    ui.requestOpenVoyagesTab(7, 'mark-1')

    expect(ui.bardActiveTab).toBe('expedition')
    expect(ui.firmamentTabReturnPending).toBe(false)
  })

  it('bringt die GERADE gewaehlte Galaxie zurueck, nicht die, mit der man kam', () => {
    const ui = useUiStore()
    ui.requestOpenVoyagesFromFirmament(7)
    ui.returnToFirmamentTab(3)

    expect(ui.bardActiveTab).toBe('firmament')
    expect(ui.firmamentTabReturnPending).toBe(false)
    expect(ui.pendingFirmamentSelection).toEqual({ kind: 'galaxy', galaxy: 3 })

    ui.clearPendingFirmamentSelection()
    expect(ui.pendingFirmamentSelection).toBeNull()
  })

  it('gibt ohne Galaxie keine Auswahl zurueck', () => {
    const ui = useUiStore()
    ui.requestOpenVoyagesFromFirmament(7)
    ui.returnToFirmamentTab(null)

    expect(ui.bardActiveTab).toBe('firmament')
    expect(ui.pendingFirmamentSelection).toBeNull()
  })

  it.each([
    ['setBardTab', (ui: ReturnType<typeof useUiStore>) => ui.setBardTab('team')],
    ['closeBardModal', (ui: ReturnType<typeof useUiStore>) => ui.closeBardModal()],
    ['openBardModal (zuklappen)', (ui: ReturnType<typeof useUiStore>) => ui.openBardModal()],
  ])('beendet das Angebot, wenn der Spieler per %s weiternavigiert', (_name, navigate) => {
    const ui = useUiStore()
    ui.requestOpenVoyagesFromFirmament(7)
    navigate(ui)

    expect(ui.firmamentTabReturnPending).toBe(false)
  })
})
