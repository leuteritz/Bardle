import { describe, it, expect } from 'vitest'
import {
  COMET_STAGE_RADII,
  FLIGHT_DRIFT_PERIOD_X_SEC,
  FLIGHT_DRIFT_PERIOD_Y_SEC,
  FLIGHT_EXPOSURE_SEC,
  FLIGHT_STREAK_BANDS,
  SHOP_SUN_MAX_DIAMETER,
  SOLAR_SIGNATURE_MIN_DIAMETER,
  STAR_PHASE_FINAL_INDEX,
  SUN_BAND_MASK_EDGE,
  SUN_BAND_MASK_FULL,
  SUN_BAND_PERIOD_BR,
  SUN_BAND_STRIP_PERIODS,
  SUN_BANDS,
  SUN_BG_DISC_RADIUS_FACTOR,
  SUN_COMET_TURN_SEC,
  SUN_CORONA_STREAMERS_BY_PHASE,
  SUN_ORB_SPRITE_PX,
  SUN_SPRITE_BODY_FRACTION,
  SUN_SPRITE_CORE_MAX_BACKING_PX,
  SUN_SPRITE_DETAIL_PX_1,
  SUN_SPRITE_DETAIL_PX_2,
  SUN_SPRITE_SPAN,
  SUN_SPRITE_URL_MAX,
  SUN_TURN_SEC_BY_PHASE,
  SUN_WAKE_COPIES,
  SUN_WAKE_GUST_IDLE_FRACTION,
  SUN_WAKE_GUST_STAGGER,
  BLACK_HOLE_BODY_TO_BOX_FACTOR,
  BLACK_HOLE_DISC_INNER_SPIN_FRACTION,
} from '@/config/constants'

/**
 * Die Sprite-Tabelle des Spielerkörpers hängt an Schwellen, die anderswo
 * gemessen sind: die Zierschwelle der Signatur, die Orbit-Kometengrösse, die
 * Kanten der Profil-Tabs. Läuft eine davon weg, verliert eine Anzeigestelle
 * still ihre Ebenen.
 */
describe('Sprite-Schwellen des Spielerkörpers', () => {
  it('die zweite Detailstufe IST die Zierschwelle der Signatur', () => {
    expect(SUN_SPRITE_DETAIL_PX_2).toBe(SOLAR_SIGNATURE_MIN_DIAMETER)
  })

  it('Header-Orb und Tooltip-Kugeln liegen unter der ersten Schwelle', () => {
    expect(SUN_ORB_SPRITE_PX).toBeLessThan(SUN_SPRITE_DETAIL_PX_1)
  })

  it('der Orbit-Komet trägt Band, Schatten und Wake, aber keine Zierebenen', () => {
    const smallest = COMET_STAGE_RADII[0] * SUN_BG_DISC_RADIUS_FACTOR
    const largest = COMET_STAGE_RADII[COMET_STAGE_RADII.length - 1] * SUN_BG_DISC_RADIUS_FACTOR
    expect(smallest).toBeGreaterThanOrEqual(SUN_SPRITE_DETAIL_PX_1)
    expect(largest).toBeLessThan(SUN_SPRITE_DETAIL_PX_2)
  })

  it('der Körperanteil ist die Minimap-Brücke, nur andersherum gelesen', () => {
    expect(2 / SUN_SPRITE_BODY_FRACTION).toBeCloseTo(BLACK_HOLE_BODY_TO_BOX_FACTOR, 1)
  })

  it('der URL-Cache fasst das Doppelte der gleichzeitig gemounteten Ebenen', () => {
    // Orbit (11 Slots) + Header (1) + Tooltip (8) + ein Profil-Tab (9) + Pause (9)
    expect(SUN_SPRITE_URL_MAX).toBeGreaterThanOrEqual(2 * 38)
  })

  it('der Kern-Deckel trägt den grössten Profil-Tab bei dpr 2', () => {
    expect(SUN_SPRITE_CORE_MAX_BACKING_PX).toBeGreaterThanOrEqual(SHOP_SUN_MAX_DIAMETER * 2)
  })

  it('jede Ebene hat einen Span, der Halo den grössten', () => {
    for (const span of Object.values(SUN_SPRITE_SPAN)) expect(span).toBeGreaterThan(0)
    expect(Math.max(...Object.values(SUN_SPRITE_SPAN))).toBe(SUN_SPRITE_SPAN.halo)
  })
})

/**
 * Die Achsdrehung: Streifen, die unter einer Kreismaske rollen. Die Zahlen
 * tragen die Lesart — nahtlos, differentiell, ruhig.
 */
describe('Achsdrehung des Spielerkörpers', () => {
  it('der Streifen trägt zwei Perioden, die Scheibe ist eine halbe', () => {
    expect(SUN_BAND_STRIP_PERIODS).toBe(2)
    // Periode ≥ Scheibendurchmesser (2 br) + Rand, sonst zeigt die Scheibe die Naht
    expect(SUN_BAND_PERIOD_BR).toBeGreaterThanOrEqual(3)
  })

  it('N und S rollen langsamer als der Äquator, und ungleich', () => {
    expect(SUN_BANDS.bandE.speed).toBe(1)
    expect(SUN_BANDS.bandN.speed).toBeLessThan(1)
    expect(SUN_BANDS.bandS.speed).toBeLessThan(1)
    expect(SUN_BANDS.bandN.speed).not.toBe(SUN_BANDS.bandS.speed)
  })

  it('die Bänder decken die Scheibe und überlappen', () => {
    const top = SUN_BANDS.bandN.y - SUN_BANDS.bandN.h / 2
    const bottom = SUN_BANDS.bandS.y + SUN_BANDS.bandS.h / 2
    expect(top).toBeLessThanOrEqual(-0.96)
    expect(bottom).toBeGreaterThanOrEqual(0.96)
    expect(SUN_BANDS.bandN.y + SUN_BANDS.bandN.h / 2).toBeGreaterThan(-SUN_BANDS.bandE.h / 2)
    expect(SUN_BANDS.bandS.y - SUN_BANDS.bandS.h / 2).toBeLessThan(SUN_BANDS.bandE.h / 2)
  })

  it('die Maske läuft innerhalb des Körpers aus', () => {
    expect(SUN_BAND_MASK_FULL).toBeLessThan(SUN_BAND_MASK_EDGE)
    expect(SUN_BAND_MASK_EDGE).toBeLessThanOrEqual(1)
  })

  it('nichts kreiselt: jeder Umlauf ≥ 30 s, Riesen langsamer als die Hauptreihe', () => {
    expect(SUN_TURN_SEC_BY_PHASE).toHaveLength(STAR_PHASE_FINAL_INDEX)
    for (const sec of SUN_TURN_SEC_BY_PHASE) expect(sec).toBeGreaterThanOrEqual(30)
    for (let i = 3; i < SUN_TURN_SEC_BY_PHASE.length; i++)
      expect(SUN_TURN_SEC_BY_PHASE[i]).toBeGreaterThan(SUN_TURN_SEC_BY_PHASE[i - 1])
    expect(SUN_COMET_TURN_SEC).toBeGreaterThanOrEqual(15)
    expect(SUN_COMET_TURN_SEC).toBeLessThan(Math.min(...SUN_TURN_SEC_BY_PHASE))
  })

  it('der Innenring des Lochs läuft schneller, aber nicht als Kreisel', () => {
    expect(BLACK_HOLE_DISC_INNER_SPIN_FRACTION).toBeGreaterThanOrEqual(0.4)
    expect(BLACK_HOLE_DISC_INNER_SPIN_FRACTION).toBeLessThan(1)
  })
})

describe('Sonnenwind-Böen und Korona', () => {
  it('eine Böe ist ein Ereignis: mindestens die Hälfte des Zyklus ist still', () => {
    expect(SUN_WAKE_GUST_IDLE_FRACTION).toBeGreaterThanOrEqual(0.5)
  })

  it('drei Kränze mit inkommensurablen Dauern — Schwebung statt Takt', () => {
    expect(SUN_WAKE_COPIES).toBe(SUN_WAKE_GUST_STAGGER.length)
    expect(SUN_WAKE_GUST_STAGGER.length).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < SUN_WAKE_GUST_STAGGER.length; i++) {
      for (let k = i + 1; k < SUN_WAKE_GUST_STAGGER.length; k++) {
        const ratio = SUN_WAKE_GUST_STAGGER[k] / SUN_WAKE_GUST_STAGGER[i]
        expect(Math.abs(ratio - Math.round(ratio))).toBeGreaterThan(0.1)
        expect(Math.abs(ratio * 2 - Math.round(ratio * 2))).toBeGreaterThan(0.1)
      }
    }
  })

  it('die Korona ist leise: höchstens zehn Strahlen je Phase', () => {
    expect(SUN_CORONA_STREAMERS_BY_PHASE).toHaveLength(STAR_PHASE_FINAL_INDEX)
    for (const n of SUN_CORONA_STREAMERS_BY_PHASE) expect(n).toBeLessThanOrEqual(10)
  })
})

describe('Flug im Hintergrund', () => {
  it('die Tiefenbänder werden nach vorn schneller, heller und breiter', () => {
    for (let i = 1; i < FLIGHT_STREAK_BANDS.length; i++) {
      expect(FLIGHT_STREAK_BANDS[i].speed).toBeGreaterThan(FLIGHT_STREAK_BANDS[i - 1].speed)
      expect(FLIGHT_STREAK_BANDS[i].alpha).toBeGreaterThan(FLIGHT_STREAK_BANDS[i - 1].alpha)
      expect(FLIGHT_STREAK_BANDS[i].width).toBeGreaterThan(FLIGHT_STREAK_BANDS[i - 1].width)
    }
  })

  it('die Belichtungszeit liegt zwischen einem 144-Hz- und einem 30-Hz-Frame', () => {
    expect(FLIGHT_EXPOSURE_SEC).toBeGreaterThanOrEqual(1 / 144)
    expect(FLIGHT_EXPOSURE_SEC).toBeLessThanOrEqual(1 / 30)
  })

  it('die Drift-Perioden sind inkommensurabel genug, dass der Kurs nicht kreist', () => {
    expect(Math.abs(FLIGHT_DRIFT_PERIOD_X_SEC - FLIGHT_DRIFT_PERIOD_Y_SEC)).toBeGreaterThanOrEqual(10)
  })
})
