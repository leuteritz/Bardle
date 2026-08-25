import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { gameTickPlan, resetGameClock, setGameSpeed } from '@/utils/game/gameClock'
import { SOLAR_CPS_PER_LEVEL } from '@/config/constants'

/**
 * Der tragende Test des Zeitraffers: „Speed 10 ist Speed 1, nur schneller."
 *
 * Er lässt dieselbe SPIELZEIT bei verschiedenen Faktoren verstreichen und
 * vergleicht die Endstände. Wichtig ist die Mischung der geprüften Werte — sie
 * kommen aus den beiden Zeitachsen, die auseinanderlaufen könnten:
 *
 * - `inGameTime` und `chimes` sind TICK-gezählt (Takt-Hebel),
 * - die Verweildauer der Sonnenphase kommt aus der UHR (Uhr-Hebel).
 *
 * Weicht eines davon ab, ist genau ein Hebel aus der Achse gefallen.
 */

const T0 = 1_700_000_000_000
/** Eine Spielminute — lang genug für Meep-Schwellen, kurz genug für 3000 Ticks. */
const GAME_MS = 60_000
const RAY_LEVEL = 5

type Snapshot = {
  inGameTime: number
  chimes: number
  dwellMs: number
  ticks: number
}

function runAtSpeed(speed: number): Snapshot {
  resetGameClock()
  setActivePinia(createPinia())
  vi.setSystemTime(T0)
  setGameSpeed(speed)

  const game = useGameStore()
  const shop = useShopStore()
  const solar = useSolarUpgradeStore()

  // Eine Produktionsquelle, damit `chimes` überhaupt wächst.
  solar.chimesPerSecondLevel = RAY_LEVEL
  shop.refreshRates()

  const { interval, catchUp } = gameTickPlan(speed)
  // Reale Millisekunden, in denen GAME_MS Spielzeit vergeht.
  const realMs = GAME_MS / speed
  const firings = Math.round(realMs / interval)

  let ticks = 0
  for (let f = 1; f <= firings; f++) {
    vi.setSystemTime(T0 + f * interval)
    for (let i = 0; i < catchUp; i++) {
      game.tick()
      ticks++
    }
  }

  return {
    inGameTime: game.inGameTime,
    chimes: game.chimes,
    dwellMs: solar.phaseDwellElapsedMs,
    ticks,
  }
}

describe('Zeitraffer-Invarianz', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    resetGameClock()
  })

  it('liefert bei 1× den erwarteten Ausgangsstand', () => {
    const live = runAtSpeed(1)
    expect(live.ticks).toBe(60)
    expect(live.inGameTime).toBe(60)
    expect(live.chimes).toBe(RAY_LEVEL * SOLAR_CPS_PER_LEVEL * 60)
    expect(live.dwellMs).toBe(GAME_MS)
  })

  it.each([2, 5, 10, 25, 50, 100])(
    'kommt bei %i× nach derselben Spielzeit auf denselben Stand',
    (speed) => {
      const live = runAtSpeed(1)
      const warped = runAtSpeed(speed)
      expect(warped).toEqual(live)
    },
  )

  it('läuft in der Zeitlupe langsamer, aber auf denselben Stand', () => {
    const live = runAtSpeed(1)
    const slow = runAtSpeed(0.5)
    expect(slow).toEqual(live)
  })
})
