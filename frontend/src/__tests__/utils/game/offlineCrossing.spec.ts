import { describe, it, expect } from 'vitest'
import {
  CROSSING_MAX_OPEN,
  crossingMultiplier,
  voidToll,
  placeVoidGate,
} from '@/utils/game/offlineCrossing'
import {
  OFFLINE_CROSSING_GATES,
  OFFLINE_CROSSING_STEPS,
  OFFLINE_CROSSING_MIN_MULT,
} from '@/config/constants'

describe('crossingMultiplier', () => {
  it('läuft die Leiter 1.00 → 1.35 → 1.65 → 1.85 → 2.00', () => {
    expect(crossingMultiplier(0)).toBe(1)
    expect(crossingMultiplier(1)).toBe(1.35)
    expect(crossingMultiplier(2)).toBe(1.65)
    expect(crossingMultiplier(3)).toBe(1.85)
    expect(crossingMultiplier(4)).toBe(2)
  })

  it('deckelt bei 2.0 — die Stufen summieren genau auf den Deckel', () => {
    const sum = OFFLINE_CROSSING_STEPS.reduce((a, b) => a + b, 0)
    expect(Math.round(sum * 1000) / 1000).toBe(1)
    expect(crossingMultiplier(99)).toBe(2)
    expect(crossingMultiplier(-3)).toBe(OFFLINE_CROSSING_MIN_MULT)
  })

  it('es gibt genau ein Tor mehr als Schritte — das letzte ist das Void-Tor', () => {
    expect(CROSSING_MAX_OPEN).toBe(OFFLINE_CROSSING_GATES - 1)
  })
})

describe('voidToll', () => {
  it('behält die Hälfte des Bonus, auf zwei Stellen wie die Anzeige', () => {
    expect(voidToll(1.35)).toBe(1.18)
    expect(voidToll(1.65)).toBe(1.33)
    expect(voidToll(1.85)).toBe(1.43)
    expect(voidToll(2)).toBe(1.5)
  })

  it('gibt nie mehr Stellen aus, als die UI zeigt', () => {
    for (const m of [1.35, 1.65, 1.85]) {
      const kept = voidToll(m)
      expect(kept).toBe(Number(kept.toFixed(2)))
    }
  })

  it('bodet bei 1.0 und fällt nie darunter', () => {
    expect(voidToll(1)).toBe(1)
    expect(voidToll(0.4)).toBe(1)
  })
})

describe('placeVoidGate — der Caretaker’s Ward', () => {
  it('setzt das Void-Tor nie auf den ersten Griff', () => {
    for (let firstPick = 0; firstPick < OFFLINE_CROSSING_GATES; firstPick++) {
      for (let i = 0; i < 100; i++) {
        const v = placeVoidGate(firstPick, OFFLINE_CROSSING_GATES)
        expect(v).not.toBe(firstPick)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(OFFLINE_CROSSING_GATES)
      }
    }
  })

  it('erreicht jedes der übrigen Tore', () => {
    const seen = new Set<number>()
    const steps = [0, 0.26, 0.51, 0.76, 0.999]
    for (const r of steps) seen.add(placeVoidGate(2, OFFLINE_CROSSING_GATES, () => r))
    expect([...seen].sort()).toEqual([0, 1, 3, 4])
  })

  it('bleibt im Bereich, wenn rng den Rand liefert', () => {
    expect(placeVoidGate(0, OFFLINE_CROSSING_GATES, () => 1)).toBe(OFFLINE_CROSSING_GATES - 1)
    expect(placeVoidGate(0, OFFLINE_CROSSING_GATES, () => 0)).toBe(1)
  })
})
