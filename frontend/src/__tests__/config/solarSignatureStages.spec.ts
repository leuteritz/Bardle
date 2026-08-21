import { describe, it, expect } from 'vitest'
import {
  SOLAR_SIGNATURE_STAGES,
  SOLAR_SIGNATURE_BASE_STAGES,
  SOLAR_SIGNATURE_MIN_DIAMETER,
  SOLAR_SIGNATURE_SATURATION_K,
  SOLAR_SIGNATURE_BASE_SATURATION_K,
  SOLAR_SIGNATURE_PULSE_MS,
  COMET_STAGE_RADII,
  STAR_PHASE_DATA,
  SUN_BG_DISC_RADIUS_FACTOR,
  SHOP_SUN_MIN_DIAMETER,
  SHOP_SUN_MAX_DIAMETER,
  PLANET_TAB_SUN_MAX_DIAMETER,
} from '@/config/constants'

/**
 * Die Eskalationsleiter der Sonne.
 *
 * Wie `drifterFxStages.spec.ts` existiert diese Spec, weil ihre Eigenschaft im
 * Diff unsichtbar ist: die Steigerung liegt in einer Tabelle aus Zahlen, und
 * nichts im Typsystem haelt jemanden davon ab, beim Nachjustieren einer Zeile
 * eine spaetere leiser zu machen als eine fruehere.
 *
 * Der zweite Teil bindet die ZIERSCHWELLE. Sie ist der Grund, aus dem dieses
 * Feature ueberhaupt vertretbar ist (Performance-Regel 7), und sie sitzt in
 * einem engen Fenster: der groesste Komet muss darunter bleiben, die kleinste
 * Sternphase darueber, und der Shop-Tab darf an KEINEM Zoomschritt kippen.
 */

/** Alles, was mit dem Ausbau lauter werden muss. */
const RISING = [
  'sparkAlpha',
  'limbWidth',
  'limbAlpha',
  'coronaAlpha',
  'granuleAlpha',
  'prominenceArcs',
  'prominenceHeight',
  'prominenceAlpha',
  'wakeBonus',
] as const

describe('SOLAR_SIGNATURE_STAGES', () => {
  it('hat mehr als eine Stufe', () => {
    expect(SOLAR_SIGNATURE_STAGES.length).toBeGreaterThan(1)
  })

  it('beginnt bei der NACKTEN Sonne — ein frischer Spielstand sieht aus wie vorher', () => {
    const first = SOLAR_SIGNATURE_STAGES[0]
    expect(first.minLevels).toBe(0)
    for (const key of RISING) expect(first[key]).toBe(0)
    expect(first.granuleSizePct).toBe(0)
  })

  it('steigt in den Schwellen streng monoton', () => {
    for (let i = 1; i < SOLAR_SIGNATURE_STAGES.length; i++) {
      expect(SOLAR_SIGNATURE_STAGES[i].minLevels).toBeGreaterThan(
        SOLAR_SIGNATURE_STAGES[i - 1].minLevels,
      )
    }
  })

  it('wird in keiner Eigenschaft je wieder leiser', () => {
    for (let i = 1; i < SOLAR_SIGNATURE_STAGES.length; i++) {
      for (const key of RISING) {
        expect(
          SOLAR_SIGNATURE_STAGES[i][key],
          `${key} faellt von Stufe ${i - 1} auf ${i}`,
        ).toBeGreaterThanOrEqual(SOLAR_SIGNATURE_STAGES[i - 1][key])
      }
    }
  })

  it('verdichtet die Granulation mit jeder Stufe — kleineres Kachelmass heisst dichter', () => {
    // Stufe 0 ist mit 0 der Sonderfall „gar keine Zellen"; ab Stufe 1 faellt sie.
    const withCells = SOLAR_SIGNATURE_STAGES.slice(1)
    for (let i = 1; i < withCells.length; i++) {
      expect(withCells[i].granuleSizePct).toBeLessThan(withCells[i - 1].granuleSizePct)
    }
    expect(withCells[0].granuleSizePct).toBeGreaterThan(0)
  })

  it('endet echt lauter, als es begonnen hat', () => {
    const first = SOLAR_SIGNATURE_STAGES[0]
    const last = SOLAR_SIGNATURE_STAGES[SOLAR_SIGNATURE_STAGES.length - 1]
    for (const key of RISING) expect(last[key]).toBeGreaterThan(first[key])
  })

  it('bringt auf jeder Stufe mindestens einen neuen Wert', () => {
    for (let i = 1; i < SOLAR_SIGNATURE_STAGES.length; i++) {
      const changed = RISING.some(
        (key) => SOLAR_SIGNATURE_STAGES[i][key] !== SOLAR_SIGNATURE_STAGES[i - 1][key],
      )
      expect(changed, `Stufe ${i} liest sich wie Stufe ${i - 1}`).toBe(true)
    }
  })

  it('haelt jede Deckkraft im gueltigen Bereich', () => {
    for (const s of SOLAR_SIGNATURE_STAGES) {
      for (const key of ['sparkAlpha', 'limbAlpha', 'coronaAlpha', 'granuleAlpha', 'prominenceAlpha'] as const) {
        expect(s[key]).toBeGreaterThanOrEqual(0)
        expect(s[key]).toBeLessThanOrEqual(1)
      }
      expect(s.limbWidth).toBeLessThanOrEqual(1)
      expect(s.prominenceHeight).toBeLessThanOrEqual(1)
    }
  })

  it('nennt eine ganze Zahl von Boegen — es ist eine Wiederholung, kein Anteil', () => {
    for (const s of SOLAR_SIGNATURE_STAGES) {
      expect(Number.isInteger(s.prominenceArcs)).toBe(true)
    }
  })
})

describe('SOLAR_SIGNATURE_BASE_STAGES', () => {
  it('beginnt bei null und steigt monoton', () => {
    const first = SOLAR_SIGNATURE_BASE_STAGES[0]
    expect(first.minLevels).toBe(0)
    expect(first.coreLift).toBe(0)
    expect(first.coronaLift).toBe(0)
    expect(first.cometGoldLift).toBe(0)

    for (let i = 1; i < SOLAR_SIGNATURE_BASE_STAGES.length; i++) {
      const prev = SOLAR_SIGNATURE_BASE_STAGES[i - 1]
      const cur = SOLAR_SIGNATURE_BASE_STAGES[i]
      expect(cur.minLevels).toBeGreaterThan(prev.minLevels)
      expect(cur.coreLift).toBeGreaterThanOrEqual(prev.coreLift)
      expect(cur.coronaLift).toBeGreaterThanOrEqual(prev.coronaLift)
      expect(cur.cometGoldLift).toBeGreaterThanOrEqual(prev.cometGoldLift)
    }
  })

  it('bleibt ein ZUSCHLAG und uebernimmt die Sonne nicht', () => {
    // Sie hebt Werte, die es schon gibt (Kern-Hotspot, Korona, Kometengold).
    // Ein Zuschlag nahe 1 waere keine Signatur mehr, sondern eine zweite Quelle.
    for (const s of SOLAR_SIGNATURE_BASE_STAGES) {
      expect(s.coreLift).toBeLessThan(0.5)
      expect(s.coronaLift).toBeLessThan(0.5)
      expect(s.cometGoldLift).toBeLessThan(0.5)
    }
  })
})

describe('Zierschwelle', () => {
  const cometMax = Math.max(...COMET_STAGE_RADII) * SUN_BG_DISC_RADIUS_FACTOR
  const sparkDia = STAR_PHASE_DATA[0].radius * SUN_BG_DISC_RADIUS_FACTOR

  it('schliesst den Orbit-Kometen aus', () => {
    // 104px im groessten Kometenstadium — dort faellt keine Zierebene auf zwei
    // Pixel Breite, und vor der Zuendung gibt es auch nichts zu zeigen.
    expect(cometMax).toBeLessThan(SOLAR_SIGNATURE_MIN_DIAMETER)
  })

  it('schliesst die kleinste Sternphase ein', () => {
    expect(sparkDia).toBeGreaterThanOrEqual(SOLAR_SIGNATURE_MIN_DIAMETER)
  })

  it('laesst den Shop-Tab an KEINEM Zoomschritt kippen', () => {
    // Der Shop prueft gegen `bodyDiameter` (240…320), nie gegen die
    // Bildschirmgroesse. Liegt die Schwelle in diesem Band, baute ein Zug am
    // Zoomregler die Ebenen ab und wieder auf — ein Ruckler genau dort, wo der
    // Spieler ohnehin zieht.
    expect(SHOP_SUN_MIN_DIAMETER).toBeGreaterThan(SOLAR_SIGNATURE_MIN_DIAMETER)
    expect(SHOP_SUN_MAX_DIAMETER).toBeGreaterThan(SOLAR_SIGNATURE_MIN_DIAMETER)
  })

  it('schliesst den Planeten-Tab ein — dort steht die groesste Sonne', () => {
    expect(PLANET_TAB_SUN_MAX_DIAMETER).toBeGreaterThan(SOLAR_SIGNATURE_MIN_DIAMETER)
  })
})

describe('Saettigung', () => {
  it('ist auf die gedeckelte Tiefe einer Achse geeicht', () => {
    // Rund 90–105 Stufen traegt ein voll ausgebauter Ast. Bei dieser Konstante
    // muss er sichtbar oben ankommen, ohne dass die ersten Kaeufe nichts tun.
    const atFull = 1 - Math.exp(-90 / SOLAR_SIGNATURE_SATURATION_K)
    expect(atFull).toBeGreaterThan(0.9)

    const atFirstBuys = 1 - Math.exp(-3 / SOLAR_SIGNATURE_SATURATION_K)
    expect(atFirstBuys).toBeGreaterThan(0.05)
  })

  it('laesst die Grundsignatur schneller ankommen — sie hat weniger Ereignisse', () => {
    expect(SOLAR_SIGNATURE_BASE_SATURATION_K).toBeLessThan(SOLAR_SIGNATURE_SATURATION_K)
  })

  it('erreicht 1 nie', () => {
    for (const levels of [1, 100, 10_000, 1e9]) {
      expect(1 - Math.exp(-levels / SOLAR_SIGNATURE_SATURATION_K)).toBeLessThanOrEqual(1)
    }
  })
})

describe('Kaufblitz', () => {
  it('ist kurz genug, dass ein zweiter Kauf ihn neu anstoesst statt sich zu stauen', () => {
    expect(SOLAR_SIGNATURE_PULSE_MS).toBeGreaterThan(0)
    expect(SOLAR_SIGNATURE_PULSE_MS).toBeLessThanOrEqual(900)
  })
})
