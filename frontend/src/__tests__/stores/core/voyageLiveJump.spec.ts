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
    ui.requestOpenVoyagesLive()

    expect(ui.bardActiveTab).toBe('expedition')
    expect(ui.pendingVoyageLive).toBe(true)
    expect(ui.pendingVoyageTarget).toBeNull()
  })

  it('loescht ein stehendes Sprungziel', () => {
    const ui = useUiStore()
    ui.requestOpenVoyagesTab(7, 'mark-1')
    ui.requestOpenVoyagesLive()

    expect(ui.pendingVoyageTarget).toBeNull()
    expect(ui.pendingVoyageLive).toBe(true)
  })

  it('loescht die Live-Ansage, sobald ein Sprungziel kommt', () => {
    const ui = useUiStore()
    ui.requestOpenVoyagesLive()
    ui.requestOpenVoyagesTab(7, 'mark-1')

    expect(ui.pendingVoyageLive).toBe(false)
    expect(ui.pendingVoyageTarget).toEqual({ galaxy: 7, pinKey: 'mark-1' })
  })

  it('wird EINMAL verbraucht', () => {
    const ui = useUiStore()
    ui.requestOpenVoyagesLive()
    ui.clearPendingVoyageLive()

    expect(ui.pendingVoyageLive).toBe(false)
  })

  it('laesst das Rueckweg-Angebot des Firmaments unberuehrt', () => {
    const ui = useUiStore()
    ui.requestOpenVoyagesLive()

    expect(ui.firmamentTabReturnPending).toBe(false)
  })
})
