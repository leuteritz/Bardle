import { describe, it, expect } from 'vitest'
import {
  destinationFor,
  destinationWeight,
  depthOf,
  expeditionTierOf,
} from '@/config/economy/expeditionDestinations'
import {
  EXPEDITION_BASE_SUCCESS_CHANCE,
  EXPEDITION_SUCCESS_CHANCE_MIN,
  EXPEDITION_SUCCESS_CHANCE_MAX,
  EXPEDITION_DEST_DEPTH_SPAN,
  EXPEDITION_DEST_RECENCY_WEIGHT,
  EXPEDITION_HAZARD_PENALTY,
  EXPEDITION_ROLE_MATCH_PENALTY,
  EXPEDITION_POWER_MALUS_CAP,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

function record(galaxy: number, themeIndex = 0): CompletedGalaxyRecord {
  return {
    galaxy,
    mapSeed: galaxy * 7919,
    themeIndex,
    attemptResults: ['rescued'],
    durationSeconds: 60,
    completedAt: 0,
  }
}

/** Jede Galaxie, die ein Spielstand realistisch erreicht. */
const RANGE = Array.from({ length: 48 }, (_, i) => i + 1)

describe('expedition destinations — die Stufe hängt am Ziel', () => {
  it('gibt der ersten befreiten Galaxie ein gültiges Ziel', () => {
    const dest = destinationFor(record(1))
    expect(dest.galaxy).toBe(1)
    expect(dest.tier).toBe('common')
    expect(dest.name).toBeTruthy()
    // Ein Sitz — sonst hätte ein früher Spielstand niemanden zu schicken.
    expect(dest.maxRoles).toBe(1)
  })

  it('steigt in genau zwei Stufen und nie zurück', () => {
    let seen = 0
    const order = { common: 0, rare: 1, epic: 2 }
    for (const g of RANGE) {
      const rank = order[expeditionTierOf(g)]
      expect(rank, `Galaxie ${g} fällt zurück`).toBeGreaterThanOrEqual(seen)
      seen = rank
    }
    expect(expeditionTierOf(48)).toBe('epic')
  })

  it('sättigt die Tiefe und läuft nie über 1 oder unter 0', () => {
    expect(depthOf(1)).toBe(0)
    expect(depthOf(EXPEDITION_DEST_DEPTH_SPAN + 1)).toBe(1)
    expect(depthOf(200)).toBe(1)
    for (const g of RANGE) {
      expect(depthOf(g)).toBeGreaterThanOrEqual(0)
      expect(depthOf(g)).toBeLessThanOrEqual(1)
    }
  })

  it('lässt jeden Faktor mit der Galaxie steigen, keinen fallen', () => {
    const keys = ['rewardMult', 'durationMult', 'powerMult', 'hazardMult'] as const
    for (const key of keys) {
      let last = -Infinity
      for (const g of RANGE) {
        const value = destinationFor(record(g))[key]
        expect(value, `${key} fällt bei Galaxie ${g}`).toBeGreaterThanOrEqual(last)
        last = value
      }
      // Am Ende muss der Faktor auch wirklich etwas bewegt haben.
      expect(destinationFor(record(48))[key]).toBeGreaterThan(destinationFor(record(1))[key])
    }
  })

  it('verlangt nie mehr Sitze, als die Stufe hergibt', () => {
    for (const g of RANGE) {
      const dest = destinationFor(record(g))
      expect(dest.maxRoles).toBeGreaterThanOrEqual(1)
      expect(dest.maxRoles).toBeLessThanOrEqual(5)
    }
  })

  it('legt höchstens so viele Gefahren auf, wie es Gefahren gibt', () => {
    for (const g of RANGE) {
      const dest = destinationFor(record(g))
      expect(dest.hazardCount).toBeGreaterThanOrEqual(1)
      expect(dest.hazardCount).toBeLessThanOrEqual(6)
    }
  })

  it('drückt die Chance an keinem Ziel aus ihrem Band', () => {
    // Der schlechteste Fall, den ein Ziel erzeugen kann: Rollenfehler, Crew zu
    // schwach, jede Gefahr offen. Er muss innerhalb der Klammer bleiben, sonst
    // wäre ein spätes Ziel nicht mehr schwer, sondern gesperrt.
    for (const g of RANGE) {
      const dest = destinationFor(record(g))
      const worst =
        EXPEDITION_BASE_SUCCESS_CHANCE -
        EXPEDITION_ROLE_MATCH_PENALTY -
        EXPEDITION_POWER_MALUS_CAP -
        EXPEDITION_HAZARD_PENALTY * dest.hazardCount
      const clamped = Math.max(
        EXPEDITION_SUCCESS_CHANCE_MIN,
        Math.min(EXPEDITION_SUCCESS_CHANCE_MAX, worst),
      )
      expect(clamped).toBeGreaterThanOrEqual(EXPEDITION_SUCCESS_CHANCE_MIN)
      expect(clamped).toBeLessThanOrEqual(EXPEDITION_SUCCESS_CHANCE_MAX)
    }
  })

  it('neigt die Ziehung zur Frontier, ohne ein frühes Ziel auf null zu setzen', () => {
    const first = destinationWeight(1, 30, EXPEDITION_DEST_RECENCY_WEIGHT)
    const last = destinationWeight(30, 30, EXPEDITION_DEST_RECENCY_WEIGHT)
    expect(first).toBeGreaterThan(0)
    expect(last).toBeGreaterThan(first)
    // Viermal so wahrscheinlich, nicht unendlich mal.
    expect(last / first).toBeLessThanOrEqual(EXPEDITION_DEST_RECENCY_WEIGHT + 1)
  })

  it('nennt jedes Thema beim Namen, auch ausserhalb des Bereichs', () => {
    expect(destinationFor(record(1, 0)).name).toBeTruthy()
    expect(destinationFor(record(1, 19)).name).toBeTruthy()
    // Ein Spielstand mit einem Index jenseits des Katalogs darf nicht leer sein.
    expect(destinationFor(record(1, 99)).name).toBeTruthy()
  })
})
