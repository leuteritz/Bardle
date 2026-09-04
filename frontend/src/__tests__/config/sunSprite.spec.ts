import { describe, it, expect } from 'vitest'
import {
  COMET_STAGE_RADII,
  FLIGHT_DRIFT_PERIOD_X_SEC,
  FLIGHT_DRIFT_PERIOD_Y_SEC,
  FLIGHT_EXPOSURE_SEC,
  FLIGHT_STREAK_BANDS,
  SHOP_SUN_MAX_DIAMETER,
  SOLAR_SIGNATURE_MIN_DIAMETER,
  SUN_BG_DISC_RADIUS_FACTOR,
  SUN_CORONA_TURN_SEC,
  SUN_ORB_SPRITE_PX,
  SUN_SPRITE_BODY_FRACTION,
  SUN_SPRITE_CORE_MAX_BACKING_PX,
  SUN_SPRITE_DETAIL_PX_1,
  SUN_SPRITE_DETAIL_PX_2,
  SUN_SPRITE_SPAN,
  SUN_SPRITE_URL_MAX,
  SUN_SURFACE_TURN_SEC_A,
  SUN_SURFACE_TURN_SEC_B,
  SUN_WAKE_COPIES,
  SUN_WAKE_SEC,
  BLACK_HOLE_BODY_TO_BOX_FACTOR,
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

  it('der Orbit-Komet trägt Korona und Wake, aber keine Zierebenen', () => {
    const smallest = COMET_STAGE_RADII[0] * SUN_BG_DISC_RADIUS_FACTOR
    const largest = COMET_STAGE_RADII[COMET_STAGE_RADII.length - 1] * SUN_BG_DISC_RADIUS_FACTOR
    expect(smallest).toBeGreaterThanOrEqual(SUN_SPRITE_DETAIL_PX_1)
    expect(largest).toBeLessThan(SUN_SPRITE_DETAIL_PX_2)
  })

  it('der Körperanteil ist die Minimap-Brücke, nur andersherum gelesen', () => {
    expect(2 / SUN_SPRITE_BODY_FRACTION).toBeCloseTo(BLACK_HOLE_BODY_TO_BOX_FACTOR, 1)
  })

  it('der URL-Cache fasst das Doppelte der gleichzeitig gemounteten Ebenen', () => {
    // Orbit (9 Slots) + Header (1) + Tooltip (8) + ein Profil-Tab (7) + Pause (7)
    expect(SUN_SPRITE_URL_MAX).toBeGreaterThanOrEqual(2 * 16)
  })

  it('der Kern-Deckel trägt den grössten Profil-Tab bei dpr 2', () => {
    expect(SUN_SPRITE_CORE_MAX_BACKING_PX).toBeGreaterThanOrEqual(SHOP_SUN_MAX_DIAMETER * 2)
  })

  it('Umläufe: Oberfläche langsamer als Korona, Korona langsamer als der Wake', () => {
    expect(SUN_SURFACE_TURN_SEC_A).toBeGreaterThan(SUN_CORONA_TURN_SEC)
    expect(SUN_SURFACE_TURN_SEC_B).toBeGreaterThan(SUN_CORONA_TURN_SEC)
    expect(SUN_SURFACE_TURN_SEC_A).not.toBe(SUN_SURFACE_TURN_SEC_B)
    expect(SUN_CORONA_TURN_SEC).toBeGreaterThan(SUN_WAKE_SEC * SUN_WAKE_COPIES)
  })

  it('jede Ebene hat einen Span, der Halo den grössten', () => {
    for (const span of Object.values(SUN_SPRITE_SPAN)) expect(span).toBeGreaterThan(0)
    expect(Math.max(...Object.values(SUN_SPRITE_SPAN))).toBe(SUN_SPRITE_SPAN.halo)
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
