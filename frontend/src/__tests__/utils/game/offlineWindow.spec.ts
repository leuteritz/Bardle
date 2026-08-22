import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  offlineWindowCapSeconds,
  offlineWindowEarnings,
  openOfflineWindow,
} from '@/utils/game/offlineWindow'
import { useGameStore } from '@/stores/core/gameStore'
import {
  OFFLINE_CPS_RATE,
  OFFLINE_MAX_HOURS,
  OFFLINE_MIN_SECONDS,
  SECONDS_PER_HOUR,
} from '@/config/constants'

const HOUR = SECONDS_PER_HOUR

describe('offlineWindowEarnings', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('rechnet CpS × Rate × Sekunden', () => {
    useGameStore().chimesPerSecond = 100
    const { seconds, chimes } = offlineWindowEarnings(HOUR)
    expect(seconds).toBe(HOUR)
    expect(chimes).toBe(Math.floor(100 * OFFLINE_CPS_RATE * HOUR))
  })

  it('deckelt die Dauer — 99 h ergeben dasselbe wie der Deckel', () => {
    useGameStore().chimesPerSecond = 100
    const cap = offlineWindowCapSeconds()
    expect(cap).toBe(OFFLINE_MAX_HOURS * HOUR)

    const long = offlineWindowEarnings(99 * HOUR)
    const atCap = offlineWindowEarnings(cap)
    expect(long.seconds).toBe(cap)
    expect(long.chimes).toBe(atCap.chimes)
  })

  it('liefert 0 Chimes ohne Produktion', () => {
    expect(offlineWindowEarnings(4 * HOUR).chimes).toBe(0)
  })
})

describe('openOfflineWindow', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('öffnet das Fenster und schreibt die Lebenszeitzähler fort', () => {
    const g = useGameStore()
    g.chimesPerSecond = 100
    const expected = Math.floor(100 * OFFLINE_CPS_RATE * 4 * HOUR)

    expect(openOfflineWindow(4 * HOUR)).toBe(true)
    expect(g.showOfflineModal).toBe(true)
    expect(g.offlineChimes).toBe(expected)
    expect(g.offlineSeconds).toBe(4 * HOUR)
    expect(g.totalOfflineChimes).toBe(expected)
    expect(g.totalOfflineSeconds).toBe(4 * HOUR)
  })

  it('bleibt unter OFFLINE_MIN_SECONDS wirkungslos', () => {
    const g = useGameStore()
    g.chimesPerSecond = 100

    expect(openOfflineWindow(OFFLINE_MIN_SECONDS - 1)).toBe(false)
    expect(g.showOfflineModal).toBe(false)
    expect(g.offlineChimes).toBe(0)
    expect(g.totalOfflineChimes).toBe(0)
  })

  it('der Notnagel greift nur, wenn die echte Rechnung darunter liegt', () => {
    const g = useGameStore()
    // Frischer Spielstand: ohne Notnagel stünde das Fenster auf 0 und zeigte
    // den Leerzustand statt der Tore.
    expect(openOfflineWindow(4 * HOUR, 50_000)).toBe(true)
    expect(g.offlineChimes).toBe(50_000)
    expect(g.totalOfflineChimes).toBe(50_000)
  })

  it('lässt den echten Wert stehen, wenn er höher ist', () => {
    const g = useGameStore()
    g.chimesPerSecond = 100
    const expected = Math.floor(100 * OFFLINE_CPS_RATE * 4 * HOUR)
    expect(expected).toBeGreaterThan(50_000)

    openOfflineWindow(4 * HOUR, 50_000)
    expect(g.offlineChimes).toBe(expected)
  })

  it('summiert die Lebenszeitzähler über mehrere Fenster', () => {
    const g = useGameStore()
    g.chimesPerSecond = 100
    openOfflineWindow(HOUR)
    const first = g.totalOfflineChimes
    openOfflineWindow(HOUR)
    expect(g.totalOfflineChimes).toBe(first * 2)
    expect(g.totalOfflineSeconds).toBe(2 * HOUR)
  })
})
