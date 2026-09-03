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
    expect(ui.pendingFirmamentGalaxy).toBe(3)

    ui.clearPendingFirmamentGalaxy()
    expect(ui.pendingFirmamentGalaxy).toBeNull()
  })

  it('gibt ohne Galaxie keinen Zeiger zurueck', () => {
    const ui = useUiStore()
    ui.requestOpenVoyagesFromFirmament(7)
    ui.returnToFirmamentTab(null)

    expect(ui.bardActiveTab).toBe('firmament')
    expect(ui.pendingFirmamentGalaxy).toBeNull()
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

/**
 * Der Sprung als Kamerafahrt. Den Reiter schaltet der Schleier SELBST, wenn er
 * deckt — die Fahrt darf ihn also nie vorwegnehmen, und wer von Hand
 * weiternavigiert oder das Profil schliesst, muss sie abraeumen: sonst
 * schaltete ihr Timer 380 ms spaeter ein geschlossenes Profil wieder auf.
 */
describe('Der Sprung als Kamerafahrt', () => {
  const req = { toward: 'atlas' as const, galaxy: 7, x: 120, y: 80, accent: 'rgb(1, 2, 3)' }

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('beginnt in Phase out und laesst den Reiter stehen', () => {
    const ui = useUiStore()
    ui.setBardTab('firmament')
    ui.requestFirmamentDive(req)

    expect(ui.firmamentDive).toEqual({ ...req, phase: 'out' })
    expect(ui.bardActiveTab).toBe('firmament')
    expect(ui.pendingVoyageTarget).toBeNull()
  })

  it('ankert nach, setzt sich und raeumt ab', () => {
    const ui = useUiStore()
    ui.requestFirmamentDive(req)
    ui.anchorFirmamentDive(5, 6)
    expect(ui.firmamentDive).toMatchObject({ x: 5, y: 6, phase: 'out' })

    ui.settleFirmamentDive()
    expect(ui.firmamentDive?.phase).toBe('in')

    ui.clearFirmamentDive()
    expect(ui.firmamentDive).toBeNull()
    ui.anchorFirmamentDive(1, 1)
    ui.settleFirmamentDive()
    expect(ui.firmamentDive).toBeNull()
  })

  it('ueberlebt den Reiterwechsel, den der Schleier selbst ausloest', () => {
    const ui = useUiStore()
    ui.requestFirmamentDive(req)
    ui.requestOpenVoyagesFromFirmament(7)
    expect(ui.firmamentDive).not.toBeNull()
    expect(ui.bardActiveTab).toBe('expedition')

    ui.requestFirmamentDive({ ...req, toward: 'firmament' })
    ui.returnToFirmamentTab(7)
    expect(ui.firmamentDive).not.toBeNull()
    expect(ui.bardActiveTab).toBe('firmament')
  })

  it.each([
    ['setBardTab', (ui: ReturnType<typeof useUiStore>) => ui.setBardTab('team')],
    ['closeBardModal', (ui: ReturnType<typeof useUiStore>) => ui.closeBardModal()],
    ['openBardModal (zuklappen)', (ui: ReturnType<typeof useUiStore>) => ui.openBardModal()],
  ])('endet, wenn der Spieler per %s weiternavigiert', (_name, navigate) => {
    const ui = useUiStore()
    ui.setBardTab('firmament')
    ui.requestFirmamentDive(req)
    navigate(ui)

    expect(ui.firmamentDive).toBeNull()
  })
})
