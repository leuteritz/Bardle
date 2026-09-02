import { describe, it, expect } from 'vitest'
import { starMarkRadius } from '@/utils/fx/galaxyPlate'
import { roundLandmarkRadius } from '@/utils/fx/galaxyLandmarks'
import {
  GALAXY_STAR_MARK_HIT_MIN,
  GALAXY_STAR_MARK_HIT_SCALE,
  LANDMARK_STAR_R_FREED,
  LANDMARK_STAR_R_LOST,
} from '@/config/constants'

/**
 * Der gemalte Radius einer Sternmarke hat seit der Manifestreihe ZWEI Leser:
 * `paintGalaxy` malt die Marke, und der Hervorhebungsring des Sternknotens legt
 * sich darauf. Laufen die beiden auseinander, sitzt der Ring neben seinem Stern
 * — und das sieht nach einem Zeichenfehler aus, nicht nach einer zweiten
 * Rechnung.
 *
 * Die naheliegende Rueckrechnung aus der FANGFLAECHE geht zweimal daneben, und
 * genau das haelt diese Datei fest.
 */
describe('starMarkRadius — die eine Quelle des gemalten Sternradius', () => {
  it('unterscheidet befreit von verloren', () => {
    const hk = 1.6
    expect(starMarkRadius(false, hk)).toBe(roundLandmarkRadius(LANDMARK_STAR_R_FREED * hk))
    expect(starMarkRadius(true, hk)).toBe(roundLandmarkRadius(LANDMARK_STAR_R_LOST * hk))
    expect(starMarkRadius(true, hk)).toBeLessThan(starMarkRadius(false, hk))
  })

  it('rastet auf halbe Pixel — ganzzahlig fielen beide in der Miniatur auf 4', () => {
    for (const hk of [0.3, 0.55, 0.9, 1.0, 1.547, 2.4]) {
      for (const lost of [false, true]) {
        const r = starMarkRadius(lost, hk)
        expect(r * 2).toBe(Math.round(r * 2))
      }
    }
  })

  it('haelt den Boden 2, damit die Marke in der Miniatur eine Marke bleibt', () => {
    expect(starMarkRadius(true, 0.01)).toBe(2)
    expect(starMarkRadius(false, 0.01)).toBe(2)
  })

  /**
   * Der Grund, warum der Ring seinen Radius als eigenen Wert bekommt statt ihn
   * aus `--stn-hit` zurueckzurechnen. Beide Zusicherungen unten sind der Beleg.
   */
  it('laesst sich NICHT aus der Fangflaeche zurueckrechnen', () => {
    const hk = 1.547

    // (a) Die Fangflaeche nimmt fuer BEIDE Ausgaenge den Radius des befreiten
    //     Sterns. Wer aus ihr zurueckrechnet, gibt dem verlorenen Stern einen
    //     um ein Fuenftel zu weiten Ring.
    const hit = Math.max(
      GALAXY_STAR_MARK_HIT_MIN,
      Math.round(LANDMARK_STAR_R_FREED * hk * GALAXY_STAR_MARK_HIT_SCALE),
    )
    const guessed = hit / GALAXY_STAR_MARK_HIT_SCALE
    expect(guessed).toBeCloseTo(starMarkRadius(false, hk), 0)
    expect(guessed / starMarkRadius(true, hk)).toBeGreaterThan(1.15)

    // (b) Auf kleinen Buehnen klemmt der Boden der Fangflaeche, und das
    //     Verhaeltnis bricht ganz.
    const small = 0.5
    const smallHit = Math.max(
      GALAXY_STAR_MARK_HIT_MIN,
      Math.round(LANDMARK_STAR_R_FREED * small * GALAXY_STAR_MARK_HIT_SCALE),
    )
    expect(smallHit).toBe(GALAXY_STAR_MARK_HIT_MIN)
    expect(smallHit / GALAXY_STAR_MARK_HIT_SCALE).toBeGreaterThan(starMarkRadius(false, small))
  })
})
