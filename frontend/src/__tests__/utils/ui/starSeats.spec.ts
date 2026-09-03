import { describe, it, expect } from 'vitest'
import { starSeats, starSeatsSplit } from '@/utils/ui/starSeats'
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
 * Die Manifestreihe des Voyages-Atlas zeigt ZWEI Baender: die Geretteten und
 * die Verlorenen. Jedes traegt sein eigenes Kopfwort und seinen eigenen Deckel
 * — ein gemeinsamer schob hier einmal die Geretteten hinter das „+N".
 */
describe('starSeatsSplit — zwei Baender, getrennt nach Ausgang', () => {
  it('trennt nach Ausgang und haelt je Gruppe die Flugreihenfolge', () => {
    const { freed, lost } = starSeatsSplit(
      outcomes('rescued', 'failed', 'rescued', 'failed', 'rescued'),
      [man('Ahri'), man('Braum'), man('Kayn'), man('Sett'), man('Vi')],
      9,
    )
    expect(freed.seats.map((s) => s.champion)).toEqual(['Ahri', 'Kayn', 'Vi'])
    expect(lost.seats.map((s) => s.champion)).toEqual(['Braum', 'Sett'])
    expect(freed.seats.every((s) => !s.lost)).toBe(true)
    expect(lost.seats.every((s) => s.lost)).toBe(true)
  })

  it('behaelt den FLUGINDEX — er koppelt Kachel und Marke', () => {
    // Der Listenindex taugt nicht: die Trennung reisst Luecken hinein.
    const { lost } = starSeatsSplit(
      outcomes('rescued', 'rescued', 'failed'),
      [man('Ahri'), man('Braum'), man('Kayn')],
      9,
    )
    expect(lost.seats.map((s) => s.index)).toEqual([2])
  })

  it('deckelt jedes Band fuer sich und meldet den Rest als Zahl', () => {
    const o = Array.from({ length: 10 }, (_, i): StarAttemptResult =>
      i % 2 ? 'failed' : 'rescued',
    )
    const { freed, lost } = starSeatsSplit(
      o,
      o.map((_, i) => man(`C${i}`)),
      3,
      2,
    )
    expect(freed.seats).toHaveLength(3)
    expect(freed.hidden).toBe(2)
    expect(lost.seats).toHaveLength(2)
    expect(lost.hidden).toBe(3)
  })

  it('faellt ohne zweiten Deckel auf den ersten zurueck', () => {
    const o = Array.from({ length: 8 }, (): StarAttemptResult => 'failed')
    const { lost } = starSeatsSplit(
      o,
      o.map((_, i) => man(`C${i}`)),
      5,
    )
    expect(lost.seats).toHaveLength(5)
    expect(lost.hidden).toBe(3)
  })

  it('laesst ein Band leer, wenn es dort niemanden gibt', () => {
    const { freed, lost } = starSeatsSplit(
      outcomes('rescued', 'rescued'),
      [man('Ahri'), man('Braum')],
      9,
    )
    expect(freed.seats).toHaveLength(2)
    expect(lost.seats).toEqual([])
    expect(lost.hidden).toBe(0)
  })

  it('zeigt gar nichts ohne Manifest', () => {
    const { freed, lost } = starSeatsSplit(outcomes('rescued', 'failed'), undefined, 7)
    expect(freed.seats).toEqual([])
    expect(lost.seats).toEqual([])
  })
})
