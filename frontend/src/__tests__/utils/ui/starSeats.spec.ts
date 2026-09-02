import { describe, it, expect } from 'vitest'
import { starSeats, starSeatsFreedFirst } from '@/utils/ui/starSeats'
import { FIRMAMENT_TIP_SEAT_MAX } from '@/config/constants'
import type { StarAttemptResult } from '@/stores/world/galaxyStore'
import type { StarManifest } from '@/types'

/*
 * Die Sitze der Knotenkarte sind nichts als die gelesene Index-Gleichheit von
 * `attemptResults` und `starManifests`. Bricht sie, traegt jedes Portrait die
 * Geschichte eines anderen Sterns — und NICHTS saehe falsch aus. Genau deshalb
 * steht die Paarung in einer pruefbaren Funktion und nicht in einem Template.
 */

const man = (champion?: string): StarManifest => ({
  champion,
  role: 'mid',
  planets: 3,
  cleared: 3,
  chimes: 100,
  heldSec: 40,
  windowSec: 90,
})

const outcomes = (...o: StarAttemptResult[]) => o

describe('starSeats — wer in einer Galaxie geflogen ist', () => {
  it('haelt die Flugreihenfolge und den Ausgang je Sitz', () => {
    const { seats, hidden } = starSeats(
      outcomes('rescued', 'failed', 'rescued'),
      [man('Ahri'), man('Braum'), man('Kayn')],
      FIRMAMENT_TIP_SEAT_MAX,
    )
    expect(seats.map((s) => s.champion)).toEqual(['Ahri', 'Braum', 'Kayn'])
    expect(seats.map((s) => s.lost)).toEqual([false, true, false])
    expect(hidden).toBe(0)
  })

  it('zeigt gar nichts, wo nie ein Manifest gefuehrt wurde', () => {
    // Altbestand von vor dem Manifest: eine Reihe namenloser Kaesten
    // behauptete etwas, das der Spielstand nicht hergibt.
    expect(starSeats(outcomes('rescued', 'failed'), undefined, 9).seats).toEqual([])
    expect(starSeats(outcomes('rescued'), [], 9).seats).toEqual([])
    expect(starSeats(undefined, [man('Ahri')], 9).seats).toEqual([])
  })

  it('verschluckt keinen Sitz, wenn das Manifest kuerzer ist', () => {
    const { seats } = starSeats(outcomes('rescued', 'failed', 'failed'), [man('Ahri')], 9)
    expect(seats).toHaveLength(3)
    expect(seats[1].champion).toBeUndefined()
    expect(seats[2].lost).toBe(true)
  })

  it('laesst einen Sitz ohne Champion stehen — leergeraeumte Tiers sind kein Fehler', () => {
    const { seats } = starSeats(outcomes('rescued', 'rescued'), [man('Ahri'), man()], 9)
    expect(seats).toHaveLength(2)
    expect(seats[1].champion).toBeUndefined()
    expect(seats[1].lost).toBe(false)
  })

  it('deckelt und meldet den Rest als Zahl', () => {
    const many = Array.from({ length: 20 }, (): StarAttemptResult => 'rescued')
    const { seats, hidden } = starSeats(
      many,
      many.map((_, i) => man(`C${i}`)),
      FIRMAMENT_TIP_SEAT_MAX,
    )
    expect(seats).toHaveLength(FIRMAMENT_TIP_SEAT_MAX)
    expect(hidden).toBe(20 - FIRMAMENT_TIP_SEAT_MAX)
  })

  it('reicht die Rolle durch — sie faerbt Sternkern und Rollenwort', () => {
    const { seats } = starSeats(outcomes('rescued'), [man('Ahri')], 9)
    expect(seats[0].role).toBe('mid')
  })
})

/*
 * Die Manifestreihe des Voyages-Atlas deckelt enger als die Knotenkarte, und
 * ein Schnitt von vorn versteckte dort ausgerechnet die GERETTETEN hinter dem
 * „+N" — die Aussage, wegen der die Reihe da ist.
 */
describe('starSeatsFreedFirst — der Deckel wirft Verlorene zuerst weg', () => {
  it('behaelt die Geretteten, wenn der Deckel greift', () => {
    const { seats, hidden } = starSeatsFreedFirst(
      outcomes('rescued', 'failed', 'rescued', 'failed', 'rescued'),
      [man('Ahri'), man('Braum'), man('Kayn'), man('Sett'), man('Vi')],
      3,
    )
    expect(seats.map((s) => s.champion)).toEqual(['Ahri', 'Kayn', 'Vi'])
    expect(seats.every((s) => !s.lost)).toBe(true)
    expect(hidden).toBe(2)
  })

  it('haelt die Flugreihenfolge der uebrigen', () => {
    const { seats } = starSeatsFreedFirst(
      outcomes('rescued', 'failed', 'rescued', 'failed', 'rescued'),
      [man('Ahri'), man('Braum'), man('Kayn'), man('Sett'), man('Vi')],
      4,
    )
    // Der SPAETERE Verlust faellt, der fruehere bleibt an seinem Platz.
    expect(seats.map((s) => s.champion)).toEqual(['Ahri', 'Braum', 'Kayn', 'Vi'])
    expect(seats.map((s) => s.lost)).toEqual([false, true, false, false])
  })

  it('deckelt auch, wenn nichts verloren ging', () => {
    const many = Array.from({ length: 9 }, (): StarAttemptResult => 'rescued')
    const { seats, hidden } = starSeatsFreedFirst(
      many,
      many.map((_, i) => man(`C${i}`)),
      7,
    )
    expect(seats.map((s) => s.champion)).toEqual(['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'])
    expect(hidden).toBe(2)
  })

  it('zeigt gar nichts ohne Manifest', () => {
    expect(starSeatsFreedFirst(outcomes('rescued'), undefined, 7).seats).toEqual([])
  })
})
