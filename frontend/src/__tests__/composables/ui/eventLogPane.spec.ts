import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EVENT_LOG_FOLD_STORAGE_KEY } from '@/config/constants'

/**
 * Der Anzeigezustand der Spur — und die eine Zusage, die man im Code nicht
 * sieht: ein Fehler darf die Spur aufdecken, aber NICHT die gespeicherte
 * Vorliebe des Spielers überschreiben. Sonst stünde sie nach dem nächsten
 * Reload offen, weil vor einer Stunde etwas kaputtgegangen ist.
 *
 * Modul-Singleton: `folded` liest localStorage EINMAL beim Import, also braucht
 * jeder Fall ein frisches Modul.
 */
async function freshPane(stored: '0' | '1' | null) {
  vi.resetModules()
  localStorage.clear()
  if (stored !== null) localStorage.setItem(EVENT_LOG_FOLD_STORAGE_KEY, stored)
  const mod = await import('@/composables/ui/useEventLogPane')
  return mod.useEventLogPane()
}

describe('useEventLogPane', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('startet auf „All" und ohne Alarm', async () => {
    const pane = await freshPane(null)
    expect(pane.activeTab.value).toBe('all')
    expect(pane.errorAlert.value).toBe(false)
    expect(pane.folded.value).toBe(false)
  })

  it('übernimmt den gespeicherten Klappzustand', async () => {
    expect((await freshPane('1')).folded.value).toBe(true)
    expect((await freshPane('0')).folded.value).toBe(false)
  })

  it('schreibt den Klappzustand beim Umschalten', async () => {
    const pane = await freshPane('0')
    pane.toggleFold()
    expect(localStorage.getItem(EVENT_LOG_FOLD_STORAGE_KEY)).toBe('1')
    expect(pane.folded.value).toBe(true)
  })

  it('deckt bei einem Fehler auf und setzt die Marke', async () => {
    const pane = await freshPane('1')
    pane.revealSystemTab()

    expect(pane.activeTab.value).toBe('system')
    expect(pane.folded.value).toBe(false)
    expect(pane.errorAlert.value).toBe(true)
  })

  /** Die Zusage aus dem Kopfkommentar — hier bricht sie, wenn jemand sie aufhebt. */
  it('rührt den gespeicherten Klappzustand dabei NICHT an', async () => {
    const pane = await freshPane('1')
    const write = vi.spyOn(Storage.prototype, 'setItem')
    pane.revealSystemTab()

    expect(write).not.toHaveBeenCalled()
    expect(localStorage.getItem(EVENT_LOG_FOLD_STORAGE_KEY)).toBe('1')
  })

  /**
   * Der Tabwechsel ist gratis und laeuft immer; das AUFKLAPPEN kostet ein
   * Drittel der Buehne und laeuft nur, solange nichts Ungelesenes ansteht —
   * sonst risse eine Fehlerserie eine Spur wieder auf, die der Spieler gerade
   * zugezogen hat.
   */
  it('klappt bei ungelesener Marke nicht ein zweites Mal auf', async () => {
    const pane = await freshPane('0')
    pane.revealSystemTab()
    pane.toggleFold()
    expect(pane.folded.value).toBe(true)

    pane.selectTab('combat')
    pane.revealSystemTab()

    expect(pane.activeTab.value).toBe('system')
    expect(pane.folded.value).toBe(true)
  })

  it('klappt nach dem Lesen wieder auf', async () => {
    const pane = await freshPane('1')
    pane.revealSystemTab()
    pane.clearErrorAlert()
    pane.toggleFold()
    expect(pane.folded.value).toBe(true)

    pane.revealSystemTab()
    expect(pane.folded.value).toBe(false)
  })

  it('senkt die Marke nur auf Zuruf', async () => {
    const pane = await freshPane(null)
    pane.revealSystemTab()
    pane.selectTab('all')
    expect(pane.errorAlert.value).toBe(true)

    pane.clearErrorAlert()
    expect(pane.errorAlert.value).toBe(false)
  })
})
