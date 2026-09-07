import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '@/stores/core/uiStore'

/**
 * Der Rundweg Universe → Voyages → Universe.
 *
 * Zwei Dinge laufen sonst still auseinander: das Angebot muss enden, sobald der
 * Spieler von HAND weiternavigiert (sonst steht die Pille in einem Reiter, aus
 * dem sie nichts erklaert), und der Rueckweg muss die Auswahl mitbringen — das
 * Universe raeumt seine eigene beim Verlassen ab.
 */
describe('Universe-Sprung in den Voyages-Atlas', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('setzt Reiter, Sprungziel und das Rueckweg-Angebot in EINEM Zug', () => {
    const ui = useUiStore()
    ui.requestOpenGalaxyFromUniverse(7)

    expect(ui.bardActiveTab).toBe('galaxy')
    expect(ui.pendingGalaxyTarget).toEqual({ galaxy: 7, pinKey: null })
    expect(ui.universeTabReturnPending).toBe(true)
  })

  it('laesst den Sprung der Minimap ohne Rueckweg-Angebot', () => {
    const ui = useUiStore()
    ui.requestOpenGalaxyTab(7, 'mark-1')

    expect(ui.bardActiveTab).toBe('galaxy')
    expect(ui.universeTabReturnPending).toBe(false)
  })

  it('bringt die GERADE gewaehlte Galaxie zurueck, nicht die, mit der man kam', () => {
    const ui = useUiStore()
    ui.requestOpenGalaxyFromUniverse(7)
    ui.returnToUniverseTab(3)

    expect(ui.bardActiveTab).toBe('universe')
    expect(ui.universeTabReturnPending).toBe(false)
    expect(ui.pendingUniverseGalaxy).toBe(3)

    ui.clearPendingUniverseGalaxy()
    expect(ui.pendingUniverseGalaxy).toBeNull()
  })

  it('gibt ohne Galaxie keinen Zeiger zurueck', () => {
    const ui = useUiStore()
    ui.requestOpenGalaxyFromUniverse(7)
    ui.returnToUniverseTab(null)

    expect(ui.bardActiveTab).toBe('universe')
    expect(ui.pendingUniverseGalaxy).toBeNull()
  })

  it.each([
    ['setBardTab', (ui: ReturnType<typeof useUiStore>) => ui.setBardTab('team')],
    ['closeBardModal', (ui: ReturnType<typeof useUiStore>) => ui.closeBardModal()],
    ['openBardModal (zuklappen)', (ui: ReturnType<typeof useUiStore>) => ui.openBardModal()],
  ])('beendet das Angebot, wenn der Spieler per %s weiternavigiert', (_name, navigate) => {
    const ui = useUiStore()
    ui.requestOpenGalaxyFromUniverse(7)
    navigate(ui)

    expect(ui.universeTabReturnPending).toBe(false)
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
    ui.setBardTab('universe')
    ui.requestUniverseDive(req)

    expect(ui.universeDive).toEqual({ ...req, phase: 'out' })
    expect(ui.bardActiveTab).toBe('universe')
    expect(ui.pendingGalaxyTarget).toBeNull()
  })

  it('ankert nach, setzt sich und raeumt ab', () => {
    const ui = useUiStore()
    ui.requestUniverseDive(req)
    ui.anchorUniverseDive(5, 6)
    expect(ui.universeDive).toMatchObject({ x: 5, y: 6, phase: 'out' })

    ui.settleUniverseDive()
    expect(ui.universeDive?.phase).toBe('in')

    ui.clearUniverseDive()
    expect(ui.universeDive).toBeNull()
    ui.anchorUniverseDive(1, 1)
    ui.settleUniverseDive()
    expect(ui.universeDive).toBeNull()
  })

  it('ueberlebt den Reiterwechsel, den der Schleier selbst ausloest', () => {
    const ui = useUiStore()
    ui.requestUniverseDive(req)
    ui.requestOpenGalaxyFromUniverse(7)
    expect(ui.universeDive).not.toBeNull()
    expect(ui.bardActiveTab).toBe('galaxy')

    ui.requestUniverseDive({ ...req, toward: 'universe' })
    ui.returnToUniverseTab(7)
    expect(ui.universeDive).not.toBeNull()
    expect(ui.bardActiveTab).toBe('universe')
  })

  it.each([
    ['setBardTab', (ui: ReturnType<typeof useUiStore>) => ui.setBardTab('team')],
    ['closeBardModal', (ui: ReturnType<typeof useUiStore>) => ui.closeBardModal()],
    ['openBardModal (zuklappen)', (ui: ReturnType<typeof useUiStore>) => ui.openBardModal()],
  ])('endet, wenn der Spieler per %s weiternavigiert', (_name, navigate) => {
    const ui = useUiStore()
    ui.setBardTab('universe')
    ui.requestUniverseDive(req)
    navigate(ui)

    expect(ui.universeDive).toBeNull()
  })
})
