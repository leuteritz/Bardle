import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '@/stores/core/uiStore'

/**
 * Die zwei Wege der Minimap in den Voyages-Reiter.
 *
 * Sie beantworten verschiedene Fragen und duerfen sich nicht ueberlagern: steht
 * beim Betreten des Reiters BEIDES, wuerde der Reiter eine Galaxie waehlen und
 * im selben Flush wieder auf die Live-Buehne springen — oder umgekehrt, je
 * nachdem, welcher Watcher zuerst laeuft.
 */
describe('Voyages: Live-Sprung gegen Atlas-Sprung', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('oeffnet den Reiter ohne Sprungziel', () => {
    const ui = useUiStore()
    ui.requestOpenGalaxyLive()

    expect(ui.bardActiveTab).toBe('galaxy')
    expect(ui.pendingGalaxyLive).toBe(true)
    expect(ui.pendingGalaxyTarget).toBeNull()
  })

  it('loescht ein stehendes Sprungziel', () => {
    const ui = useUiStore()
    ui.requestOpenGalaxyTab(7, 'mark-1')
    ui.requestOpenGalaxyLive()

    expect(ui.pendingGalaxyTarget).toBeNull()
    expect(ui.pendingGalaxyLive).toBe(true)
  })

  it('loescht die Live-Ansage, sobald ein Sprungziel kommt', () => {
    const ui = useUiStore()
    ui.requestOpenGalaxyLive()
    ui.requestOpenGalaxyTab(7, 'mark-1')

    expect(ui.pendingGalaxyLive).toBe(false)
    expect(ui.pendingGalaxyTarget).toEqual({ galaxy: 7, pinKey: 'mark-1' })
  })

  it('oeffnet den Galaxy-Tab per Hand immer auf dem laufenden Lauf', () => {
    const ui = useUiStore()
    ui.requestOpenGalaxyTab(7, 'mark-1')
    ui.setBardTab('team')
    ui.setBardTab('galaxy')

    expect(ui.pendingGalaxyTarget).toBeNull()
    expect(ui.pendingGalaxyLive).toBe(true)
  })

  it('wird EINMAL verbraucht', () => {
    const ui = useUiStore()
    ui.requestOpenGalaxyLive()
    ui.clearPendingGalaxyLive()

    expect(ui.pendingGalaxyLive).toBe(false)
  })

  it('laesst das Rueckweg-Angebot des Universes unberuehrt', () => {
    const ui = useUiStore()
    ui.requestOpenGalaxyLive()

    expect(ui.universeTabReturnPending).toBe(false)
  })
})
