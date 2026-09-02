import { describe, it, expect } from 'vitest'
import { firmamentStarSeats } from '@/utils/ui/firmamentManifest'
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

describe('firmamentStarSeats — wer in einer Galaxie geflogen ist', () => {
  it('haelt die Flugreihenfolge und den Ausgang je Sitz', () => {
    const { seats, hidden } = firmamentStarSeats(
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
    expect(firmamentStarSeats(outcomes('rescued', 'failed'), undefined, 9).seats).toEqual([])
    expect(firmamentStarSeats(outcomes('rescued'), [], 9).seats).toEqual([])
    expect(firmamentStarSeats(undefined, [man('Ahri')], 9).seats).toEqual([])
  })

  it('verschluckt keinen Sitz, wenn das Manifest kuerzer ist', () => {
    const { seats } = firmamentStarSeats(outcomes('rescued', 'failed', 'failed'), [man('Ahri')], 9)
    expect(seats).toHaveLength(3)
    expect(seats[1].champion).toBeUndefined()
    expect(seats[2].lost).toBe(true)
  })

  it('laesst einen Sitz ohne Champion stehen — leergeraeumte Tiers sind kein Fehler', () => {
    const { seats } = firmamentStarSeats(outcomes('rescued', 'rescued'), [man('Ahri'), man()], 9)
    expect(seats).toHaveLength(2)
    expect(seats[1].champion).toBeUndefined()
    expect(seats[1].lost).toBe(false)
  })

  it('deckelt und meldet den Rest als Zahl', () => {
    const many = Array.from({ length: 20 }, (): StarAttemptResult => 'rescued')
    const { seats, hidden } = firmamentStarSeats(
      many,
      many.map((_, i) => man(`C${i}`)),
      FIRMAMENT_TIP_SEAT_MAX,
    )
    expect(seats).toHaveLength(FIRMAMENT_TIP_SEAT_MAX)
    expect(hidden).toBe(20 - FIRMAMENT_TIP_SEAT_MAX)
  })
})
