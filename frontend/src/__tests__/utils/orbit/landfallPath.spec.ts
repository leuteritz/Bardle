import { describe, it, expect } from 'vitest'
import {
  landfallChordAt,
  landfallFlyPointAt,
  landfallLaneFor,
  landfallBodyPx,
} from '@/utils/orbit/landfallPath'
import { landfallOnLeg } from '@/utils/game/landfalls'
import { drifterField } from '@/utils/orbit/drifterPath'
import { hudFreeBandOver, type HudFieldMetrics } from '@/utils/ui/hudField'
import {
  LANDFALL_LANES,
  LANDFALL_FLYBY_THETA_MAX,
  LANDFALL_BODY_ALPHA_MIN,
  LANDFALL_CENTER_CLEARANCE,
  LANDFALL_BODY_BASE_PX,
  LANDFALL_BODY_SCALE_MAX,
} from '@/config/constants'

/**
 * Der Vorbeiflug an einem Ort. Geprüft wird zweierlei: dass die Bewegung
 * wirklich Parallaxe ist (Lage aus dem WINKEL, Grösse aus `cos`) und dass der
 * Körper dabei nie hinter das HUD gerät — er ist anklickbar, und was man nicht
 * sieht, kann man nicht greifen.
 */

const W = 1920
const H = 1000

/** Full-HD-Kontur, dieselbe Messung wie in `voidPath.spec.ts`. */
const METRICS: HudFieldMetrics = {
  viewportW: W,
  viewportH: H,
  hudScale: 0.694444,
  headerBottom: 86,
  headerLeft: 265,
  headerRight: W - 265,
  headerCenterBottom: 133,
  centerArc: { cx: 695, rx: 134, ry: 106, topOffset: 84 },
  keycapBar: 30,
  // Die Keycap-Leiste greift auf Full HD 511 px von der rechten Kante nach
  // innen — deutlich weiter als das Panel darunter. Genau dort fuhr der Körper
  // hinein, bevor die Kontur die Reichweite kannte.
  keycapBarReach: 511,
  abilityBarTop: H - 150,
  abilityBarHalfW: 230,
  wayfinderBottom: 0,
  wayfinderRight: 0,
  eventLogBottom: 0,
  eventLogLeft: 0,
}

const FIELD = drifterField(W, H)
const BODY = landfallBodyPx(W)

describe('landfallPath', () => {
  describe('Die Sehne ist Parallaxe, keine Kurve', () => {
    it('beginnt und endet exakt an den Enden, querab in der Mitte', () => {
      expect(landfallChordAt(0)).toBeCloseTo(0, 6)
      expect(landfallChordAt(1)).toBeCloseTo(1, 6)
      expect(landfallChordAt(0.5)).toBeCloseTo(0.5, 6)
    })

    it('läuft streng monoton durch', () => {
      let vorher = -Infinity
      for (let i = 0; i <= 100; i++) {
        const u = landfallChordAt(i / 100)
        expect(u).toBeGreaterThan(vorher)
        vorher = u
      }
    })

    it('ist in der Mitte am schnellsten — daran erkennt man den Vorbeiflug', () => {
      const mitte = landfallChordAt(0.52) - landfallChordAt(0.48)
      const rand = landfallChordAt(0.04) - landfallChordAt(0)
      expect(mitte).toBeGreaterThan(rand * 3)
    })
  })

  describe('Grösse und Deckkraft folgen der Nähe', () => {
    it('steht querab auf voller Grösse und an den Enden auf cos(THETA_MAX)', () => {
      const querab = landfallFlyPointAt(0, false, 0.5, FIELD, BODY)
      expect(querab.scale).toBeCloseTo(1, 6)
      expect(landfallFlyPointAt(0, false, 0, FIELD, BODY).scale).toBeCloseTo(
        Math.cos(LANDFALL_FLYBY_THETA_MAX),
        6,
      )
    })

    it('hat sein Maximum genau in der Fenstermitte', () => {
      let bestT = -1
      let best = -1
      for (let i = 0; i <= 200; i++) {
        const s = landfallFlyPointAt(0, false, i / 200, FIELD, BODY).scale
        if (s > best) {
          best = s
          bestT = i / 200
        }
      }
      expect(bestT).toBeCloseTo(0.5, 6)
    })

    it('verschwindet an den Enden nicht ganz — weit weg heisst nicht abwesend', () => {
      const rand = landfallFlyPointAt(0, false, 0, FIELD, BODY).alpha
      expect(rand).toBeGreaterThanOrEqual(LANDFALL_BODY_ALPHA_MIN)
      expect(rand).toBeLessThan(landfallFlyPointAt(0, false, 0.5, FIELD, BODY).alpha)
    })
  })

  describe('HUD-Freiraum', () => {
    /** Der GANZE Körper, nicht nur seine Mitte — er ist anklickbar, und eine
     *  halb hinter der Bar liegende Raute ist halb unerreichbar. */
    it('bleibt über den ganzen Vorbeiflug im freien Feld', () => {
      for (let lane = 0; lane < LANDFALL_LANES.length; lane++) {
        for (const mirrored of [false, true]) {
          for (let i = 0; i <= 120; i++) {
            const p = landfallFlyPointAt(lane, mirrored, i / 120, FIELD, BODY, METRICS)
            // Ein Punkt, der WIRKLICH aus dem Bild läuft, wird nicht
            // zurückgeholt — dort verlässt die Sehne die Bühne.
            if (p.y < 0 || p.y > H) continue
            const r = (BODY * p.scale) / 2
            const band = hudFreeBandOver(p.x, r, METRICS)
            expect(p.y - r).toBeGreaterThanOrEqual(band.top - 0.001)
            expect(p.y + r).toBeLessThanOrEqual(band.bottom + 0.001)
          }
        }
      }
    })

    it('hält Abstand zur Sonne — dort liegt die Chime-Klickfläche', () => {
      const grenze = Math.min(FIELD.width, FIELD.height) * LANDFALL_CENTER_CLEARANCE
      const cx = FIELD.left + FIELD.width / 2
      const cy = FIELD.top + FIELD.height / 2
      for (let lane = 0; lane < LANDFALL_LANES.length; lane++) {
        for (const mirrored of [false, true]) {
          for (let i = 0; i <= 120; i++) {
            const p = landfallFlyPointAt(lane, mirrored, i / 120, FIELD, BODY)
            expect(Math.hypot(p.x - cx, p.y - cy)).toBeGreaterThanOrEqual(grenze - 0.001)
          }
        }
      }
    })
  })

  describe('Die Spur', () => {
    it('ist für dieselbe Etappe immer dieselbe', () => {
      for (let leg = 0; leg < 12; leg++) {
        expect(landfallLaneFor(4711, leg)).toEqual(landfallLaneFor(4711, leg))
      }
    })

    it('nutzt alle vier Sehnen und beide Richtungen', () => {
      const gesehen = new Set<string>()
      for (let seed = 1; seed < 60; seed++) {
        for (let leg = 0; leg < 8; leg++) {
          const s = landfallLaneFor(seed, leg)
          gesehen.add(`${s.lane}|${s.mirrored}`)
        }
      }
      expect(gesehen.size).toBe(LANDFALL_LANES.length * 2)
    })

    /**
     * Der Kern: die Spur zieht aus einem EIGENEN Strom. Der Strom in
     * `landfallOnLeg` wird für jede archivierte Galaxie nachgespielt — ein
     * zusätzlicher Zug dort schriebe die ganze Chronik um.
     */
    it('rührt den Chronik-Strom nicht an', () => {
      const vorher = []
      for (let leg = 0; leg < 10; leg++) vorher.push(landfallOnLeg(9182, 6, leg, 8))
      for (let leg = 0; leg < 10; leg++) landfallLaneFor(9182, leg)
      const nachher = []
      for (let leg = 0; leg < 10; leg++) nachher.push(landfallOnLeg(9182, 6, leg, 8))
      expect(nachher).toEqual(vorher)
    })
  })

  describe('Grösse gegen den Viewport', () => {
    it('wächst mit dem Bild und deckelt', () => {
      expect(landfallBodyPx(1920)).toBeCloseTo(LANDFALL_BODY_BASE_PX, 6)
      expect(landfallBodyPx(2560)).toBeGreaterThan(landfallBodyPx(1920))
      expect(landfallBodyPx(3840)).toBeCloseTo(LANDFALL_BODY_BASE_PX * LANDFALL_BODY_SCALE_MAX, 6)
    })
  })
})
