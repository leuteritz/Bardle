import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  anchorGameClock,
  gameClockOffset,
  gameIntervalMs,
  gameNow,
  gameTickPlan,
  gameTimeout,
  getGameSpeed,
  isTimeWarped,
  onGameSpeedChange,
  resetGameClock,
  setGameSpeed,
} from '@/utils/game/gameClock'
import {
  GAME_SPEED_MAX,
  GAME_SPEED_MIN,
  GAME_TICK_INTERVAL_MS,
  GAME_TICK_MIN_INTERVAL_MS,
} from '@/config/constants'

/**
 * Die Spieluhr trägt den gesamten Zeitraffer. Geprüft wird hier nicht, dass sie
 * „ungefähr schneller läuft", sondern die drei Zusagen, ohne die das Spiel
 * auseinanderfällt: bei Speed 1 ist sie die Wanduhr, sie geht nie zurück, und
 * ein Tick ist bei JEDEM Faktor genau eine Spielsekunde.
 */

const T0 = 1_700_000_000_000

describe('gameClock', () => {
  beforeEach(() => {
    resetGameClock()
    vi.useFakeTimers()
    vi.setSystemTime(T0)
  })

  afterEach(() => {
    vi.useRealTimers()
    resetGameClock()
  })

  describe('Speed 1 ist das Live-Spiel', () => {
    it('gibt wörtlich die Wanduhr zurück', () => {
      expect(getGameSpeed()).toBe(1)
      expect(isTimeWarped()).toBe(false)
      expect(gameNow()).toBe(Date.now())
      vi.advanceTimersByTime(12_345)
      expect(gameNow()).toBe(Date.now())
      expect(gameClockOffset()).toBe(0)
    })

    it('lässt Takt und Timeout unverändert', () => {
      expect(gameTickPlan()).toEqual({ interval: GAME_TICK_INTERVAL_MS, catchUp: 1 })
      expect(gameIntervalMs(500)).toBe(500)

      const fn = vi.fn()
      gameTimeout(fn, 420)
      vi.advanceTimersByTime(419)
      expect(fn).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Zeitraffer', () => {
    it('lässt die Uhr um den Faktor schneller laufen', () => {
      setGameSpeed(10)
      const start = gameNow()
      vi.advanceTimersByTime(1000)
      expect(gameNow() - start).toBe(10_000)
    })

    it('zählt eine Zeitlupe genauso', () => {
      setGameSpeed(0.5)
      const start = gameNow()
      vi.advanceTimersByTime(1000)
      expect(gameNow() - start).toBe(500)
    })

    it('verkürzt Timeout und Intervall', () => {
      setGameSpeed(10)
      expect(gameIntervalMs(1000)).toBe(100)

      const fn = vi.fn()
      gameTimeout(fn, 500)
      vi.advanceTimersByTime(49)
      expect(fn).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('klemmt auf den erlaubten Bereich', () => {
      expect(setGameSpeed(9999)).toBe(GAME_SPEED_MAX)
      expect(setGameSpeed(0)).toBe(GAME_SPEED_MIN)
      expect(setGameSpeed(Number.NaN)).toBe(1)
    })
  })

  describe('Monotonie', () => {
    it('geht beim Zurückschalten nicht zurück', () => {
      setGameSpeed(10)
      vi.advanceTimersByTime(1000)
      const ahead = gameNow()
      expect(ahead).toBeGreaterThan(Date.now())

      setGameSpeed(1)
      expect(gameNow()).toBe(ahead)

      // Der angesammelte Vorlauf bleibt stehen und wird nicht abgebaut —
      // sonst läge jede offene Frist plötzlich in der Zukunft.
      vi.advanceTimersByTime(1000)
      expect(gameNow()).toBe(ahead + 1000)
      expect(gameClockOffset()).toBe(9000)
    })

    it('wächst über eine Kette von Wechseln durchgehend', () => {
      let previous = gameNow()
      for (const s of [5, 1, 25, 0.5, 100, 1]) {
        setGameSpeed(s)
        expect(gameNow()).toBeGreaterThanOrEqual(previous)
        vi.advanceTimersByTime(250)
        const next = gameNow()
        expect(next).toBeGreaterThan(previous)
        previous = next
      }
    })
  })

  describe('Verankerung im Spielstand', () => {
    it('stellt den Vorlauf exakt wieder her', () => {
      setGameSpeed(10)
      vi.advanceTimersByTime(4000)
      const offset = gameClockOffset()
      expect(offset).toBe(36_000)

      // Neue Sitzung: frische Uhr, dann verankern.
      resetGameClock()
      vi.advanceTimersByTime(60_000)
      anchorGameClock(offset)
      expect(gameClockOffset()).toBe(offset)
      expect(gameNow()).toBe(Date.now() + offset)
    })

    it('fällt bei Offset 0 in den Live-Zustand zurück', () => {
      anchorGameClock(0)
      expect(gameNow()).toBe(Date.now())
      vi.advanceTimersByTime(3000)
      expect(gameNow()).toBe(Date.now())
    })
  })

  describe('Rückrufe', () => {
    it('überlebt einen Rückruf, der sich selbst ab- und neu anmeldet', () => {
      // Genau das tut jeder, der seinen Timer neu stellt. Über den Satz selbst
      // iteriert, liefe die Schleife ewig.
      let calls = 0
      let off: () => void = () => {}
      const register = () => {
        off = onGameSpeedChange(() => {
          calls++
          off()
          register()
        })
      }
      register()

      setGameSpeed(10)
      expect(calls).toBe(1)
      setGameSpeed(1)
      expect(calls).toBe(2)
      off()
    })

    it('meldet nur bei echter Änderung', () => {
      let calls = 0
      const off = onGameSpeedChange(() => calls++)
      setGameSpeed(1)
      expect(calls).toBe(0)
      setGameSpeed(5)
      setGameSpeed(5)
      expect(calls).toBe(1)
      off()
    })
  })

  describe('Taktplan', () => {
    it('hält bei jedem Faktor genau `factor` Ticks je realer Sekunde', () => {
      for (const s of [0.5, 1, 2, 5, 10, 25, 50, 100]) {
        const { interval, catchUp } = gameTickPlan(s)
        expect(interval).toBeGreaterThanOrEqual(GAME_TICK_MIN_INTERVAL_MS)
        // Das ist die tragende Invariante: ein Tick = eine Spielsekunde.
        expect((catchUp / interval) * 1000).toBeCloseTo(s, 9)
      }
    })

    it('holt erst unterhalb der Timer-Untergrenze mehrfach nach', () => {
      expect(gameTickPlan(10).catchUp).toBe(1)
      expect(gameTickPlan(20).catchUp).toBe(1)
      expect(gameTickPlan(50).catchUp).toBeGreaterThan(1)
      expect(gameTickPlan(100).catchUp).toBeGreaterThan(1)
      expect(gameTickPlan(100).interval).toBeGreaterThanOrEqual(GAME_TICK_MIN_INTERVAL_MS)
    })
  })
})
