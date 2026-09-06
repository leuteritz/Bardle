import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { useOfflineCrossing } from '@/composables/ui/useOfflineCrossing'
import { CROSSING_MAX_OPEN, voidToll } from '@/utils/game/offlineCrossing'
import {
  OFFLINE_CROSSING_GATES,
  OFFLINE_CROSSING_SETTLE_DELAY_MS,
  OFFLINE_CROSSING_VOID_DELAY_MS,
} from '@/config/constants'

/**
 * Der Zustand des Offline-Fensters liegt im Composable, weil ihn ZWEI Ansichten
 * lesen: die grosse Ertragszahl im Kopf und die Tore darunter. Die Leiter selbst
 * prueft offlineCrossing.spec.ts — hier steht, dass der Automat sie richtig
 * abfaehrt und der Ertrag daran haengt.
 */

/** Der erste Griff platziert das Void-Tor: mit rng ≈ 1 landet es auf dem letzten
 *  Kandidaten, bei firstPick 0 also auf dem hoechsten Index. */
function voidOnLastGate() {
  vi.spyOn(Math, 'random').mockReturnValue(0.999)
  return OFFLINE_CROSSING_GATES - 1
}

describe('The Crossing — der Zustand hinter der Ertragszahl', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('zahlt ohne einen einzigen Griff den Rohertrag aus', () => {
    const g = useOfflineCrossing(ref(1000))
    expect(g.multiplier.value).toBe(1)
    expect(g.payout.value).toBe(1000)
    expect(g.basePayout.value).toBe(1000)
    expect(g.maxPayout.value).toBe(2000)
  })

  it('kennt jeden Betrag, auf dem die Zahl stehenbleibt', () => {
    const g = useOfflineCrossing(ref(1000))
    const stops = g.restingPayouts.value

    expect(stops).toContain(1000)
    expect(stops).toContain(2000)
    expect(stops).toContain(1350)
    // Der breiteste Text ist nicht der groesste Wert — genau dafuer ist die Liste da.
    expect(Math.max(...stops)).toBe(g.maxPayout.value)
  })

  it('hebt den Ertrag mit jedem Chime-Tor entlang der Leiter', () => {
    voidOnLastGate()
    const g = useOfflineCrossing(ref(1000))

    expect(g.openGate(0)).toBe(true)
    expect(g.multiplier.value).toBe(1.35)
    expect(g.payout.value).toBe(1350)
    expect(g.gainPct.value).toBe(35)

    g.openGate(1)
    expect(g.multiplier.value).toBe(1.65)
    expect(g.payout.value).toBe(1650)
  })

  it('schneidet den Ertrag ab, statt zu runden', () => {
    voidOnLastGate()
    const g = useOfflineCrossing(ref(777))
    g.openGate(0)
    expect(g.payout.value).toBe(Math.floor(777 * 1.35))
  })

  it('endet nach dem letzten Chime-Tor als perfekte Querung', () => {
    voidOnLastGate()
    const g = useOfflineCrossing(ref(1000))

    for (let i = 0; i < CROSSING_MAX_OPEN; i++) g.openGate(i)

    expect(g.opened.value).toBe(CROSSING_MAX_OPEN)
    expect(g.multiplier.value).toBe(2)
    expect(g.canOpen.value).toBe(false)
    // Der Nachlauf ist rein visuell — vorher steht das Ergebnis noch nicht.
    expect(g.settled.value).toBe(false)
    vi.advanceTimersByTime(OFFLINE_CROSSING_SETTLE_DELAY_MS)
    expect(g.settled.value).toBe(true)
    expect(g.outcome.value).toBe('perfect')
  })

  it('nimmt am Void-Tor die halbe Zulage und merkt sich den Stand davor', () => {
    const voidIndex = voidOnLastGate()
    const g = useOfflineCrossing(ref(1000))

    g.openGate(0)
    g.openGate(voidIndex)

    expect(g.gates.value[voidIndex]).toBe('void')
    expect(g.bankedBefore.value).toBe(1.35)
    expect(g.multiplier.value).toBe(voidToll(1.35))
    expect(g.payout.value).toBe(Math.floor(1000 * voidToll(1.35)))

    vi.advanceTimersByTime(OFFLINE_CROSSING_VOID_DELAY_MS)
    expect(g.outcome.value).toBe('void')
  })

  it('deckt beim Abschluss die ungeoeffneten Tore auf und laesst keinen Zug mehr zu', () => {
    const voidIndex = voidOnLastGate()
    const g = useOfflineCrossing(ref(1000))

    g.openGate(0)
    g.openGate(voidIndex)
    vi.advanceTimersByTime(OFFLINE_CROSSING_VOID_DELAY_MS)

    expect(g.revealed.value[1]).toBe(true)
    expect(g.revealed.value[0]).toBe(false)
    expect(g.openGate(1)).toBe(false)
    expect(g.gates.value[1]).toBe('hidden')
  })

  it('oeffnet kein Tor zweimal', () => {
    voidOnLastGate()
    const g = useOfflineCrossing(ref(1000))

    expect(g.openGate(0)).toBe(true)
    expect(g.openGate(0)).toBe(false)
    expect(g.opened.value).toBe(1)
  })

  it('fuehrt den Cursor nur ueber verdeckte Tore', () => {
    voidOnLastGate()
    const g = useOfflineCrossing(ref(1000))

    g.openGate(0)
    expect(g.stepCursor(1)).toBe(1)
    g.openGate(1)
    // Tor 1 ist jetzt offen — der naechste Schritt springt darueber hinweg.
    expect(g.stepCursor(1)).toBe(2)
    g.pickCursor(0)
    expect(g.cursor.value).toBe(2)
  })

  it('setzt einen zweiten Lauf vollstaendig zurueck', () => {
    const voidIndex = voidOnLastGate()
    const g = useOfflineCrossing(ref(1000))

    g.openGate(0)
    g.openGate(voidIndex)
    vi.advanceTimersByTime(OFFLINE_CROSSING_VOID_DELAY_MS)
    g.reset()

    expect(g.opened.value).toBe(0)
    expect(g.multiplier.value).toBe(1)
    expect(g.settled.value).toBe(false)
    expect(g.outcome.value).toBe(null)
    expect(g.gates.value.every((state) => state === 'hidden')).toBe(true)
    expect(g.revealed.value.every((seen) => !seen)).toBe(true)
    expect(g.payout.value).toBe(1000)
  })

  it('haelt den Nachlauf an, wenn das Fenster vorher schliesst', () => {
    const voidIndex = voidOnLastGate()
    const g = useOfflineCrossing(ref(1000))

    g.openGate(0)
    g.openGate(voidIndex)
    g.dispose()
    vi.advanceTimersByTime(OFFLINE_CROSSING_VOID_DELAY_MS * 2)

    expect(g.settled.value).toBe(false)
  })

  it('folgt einer Chime-Zahl, die sich noch aendert', () => {
    voidOnLastGate()
    const chimes = ref(1000)
    const g = useOfflineCrossing(chimes)

    g.openGate(0)
    chimes.value = 2000
    expect(g.payout.value).toBe(2700)
    expect(g.maxPayout.value).toBe(4000)
  })
})
