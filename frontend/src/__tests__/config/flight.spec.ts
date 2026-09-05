import { describe, it, expect } from 'vitest'
import {
  ENCOUNTER_EVADE_AT,
  ENCOUNTER_GAP_SEC_MAX,
  ENCOUNTER_GAP_SEC_MIN,
  ENCOUNTER_GIANT_PALETTES,
  ENCOUNTER_KIND_WEIGHTS,
  ENCOUNTER_LIFE_SEC,
  ENCOUNTER_MAJOR_COOLDOWN_SEC,
  ENCOUNTER_MAJOR_KINDS,
  ENCOUNTER_ROCK_SEEDS,
  ENCOUNTER_ROCK_TIERS,
  ENCOUNTER_ROCKS_MAX,
  ENCOUNTER_SHARD_SEEDS,
  ENCOUNTER_SHARD_TIERS,
  ENCOUNTER_SPRITE_CACHE_MAX,
  FLIGHT_DRIFT_AMPLITUDE,
  FLIGHT_DRIFT_EASE_SEC,
  HELM_BANK_ROLL_DEG_MAX,
  HELM_BANK_ROLL_DEG_MIN,
  HELM_CRUISE_GAP_SEC_MAX,
  HELM_CRUISE_GAP_SEC_MIN,
  HELM_EASE_OUT_SEC,
  HELM_EVADE_AMP_FRAC,
  HELM_EVADE_COOLDOWN_SEC,
  HELM_EVADE_HOLD_SEC,
  HELM_EVADE_ROLL_DEG,
  HELM_EVADE_TAU_SEC,
  HELM_FOCUS_MAX_FRAC,
  HELM_FOCUS_TAU_SEC,
  HELM_MODE_WEIGHTS,
  HELM_ROLL_MAX_DEG,
  HELM_SLIP_EPS_PX_S,
  HELM_SLIP_MAX_PX_S,
  HELM_SLIP_MIN_DIST_PX,
  HELM_TRAVEL_GAP_SCALE,
  HELM_WAKE_SHIFT_PCT,
  HELM_YAW_AMP_FRAC_MAX,
  HELM_YAW_AMP_FRAC_MIN,
  STAR_BG_BLOOM_SHARE,
  STAR_BG_FOG_TIERS,
} from '@/config/constants'

/**
 * Der Helm addiert auf das Drift-Wobbeln und klemmt die SUMME — die Klemme
 * muss also über Drift + grösstem Manöver liegen, sonst schneidet sie jedes
 * Ausweichen still ab.
 */
describe('Helm — Kurs', () => {
  it('die Fokus-Klemme trägt Drift plus das grösste Manöver', () => {
    const largest = Math.max(HELM_YAW_AMP_FRAC_MAX, HELM_EVADE_AMP_FRAC)
    expect(HELM_FOCUS_MAX_FRAC).toBeGreaterThanOrEqual(FLIGHT_DRIFT_AMPLITUDE + largest)
    expect(HELM_YAW_AMP_FRAC_MIN).toBeLessThan(HELM_YAW_AMP_FRAC_MAX)
  })

  it('keine Rolle übersteigt die Roll-Klemme', () => {
    expect(HELM_BANK_ROLL_DEG_MIN).toBeLessThan(HELM_BANK_ROLL_DEG_MAX)
    expect(HELM_BANK_ROLL_DEG_MAX).toBeLessThanOrEqual(HELM_ROLL_MAX_DEG)
    expect(HELM_EVADE_ROLL_DEG).toBeLessThanOrEqual(HELM_ROLL_MAX_DEG)
  })

  it('Ausweichen ist knackiger als Gieren und erholt sich vor dem nächsten', () => {
    expect(HELM_EVADE_TAU_SEC).toBeLessThan(HELM_FOCUS_TAU_SEC)
    expect(HELM_EVADE_COOLDOWN_SEC).toBeGreaterThan(HELM_EVADE_HOLD_SEC + 3 * HELM_FOCUS_TAU_SEC)
  })

  it('die Modusgewichte summieren sich zu eins', () => {
    const sum = Object.values(HELM_MODE_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 6)
  })

  it('Kurswechsel alle 20 bis 40 Sekunden, auf Reisen dichter', () => {
    expect(HELM_CRUISE_GAP_SEC_MIN).toBeGreaterThanOrEqual(15)
    expect(HELM_CRUISE_GAP_SEC_MAX).toBeLessThanOrEqual(40)
    expect(HELM_TRAVEL_GAP_SCALE).toBeGreaterThan(0)
    expect(HELM_TRAVEL_GAP_SCALE).toBeLessThan(1)
  })

  it('der Slip hat Klemme, Schwelle und Kernschutz', () => {
    expect(HELM_SLIP_EPS_PX_S).toBeLessThan(HELM_SLIP_MAX_PX_S)
    // Max-Slip je Frame (60 Hz) bleibt unter 2 px — dort ist der Schritt erster Ordnung exakt genug.
    expect(HELM_SLIP_MAX_PX_S / 60).toBeLessThanOrEqual(2)
    expect(HELM_SLIP_MIN_DIST_PX).toBeGreaterThan(0)
  })

  it('der Helm läuft so aus wie das Drift-Wobbeln', () => {
    expect(HELM_EASE_OUT_SEC).toBe(FLIGHT_DRIFT_EASE_SEC)
  })

  it('der Schweif versetzt sich um höchstens ein Zehntel', () => {
    expect(HELM_WAKE_SHIFT_PCT).toBeLessThanOrEqual(10)
  })
})

describe('Himmelsbegegnungen', () => {
  it('eine grosse Begegnung etwa alle 45 bis 90 Sekunden', () => {
    expect(ENCOUNTER_MAJOR_COOLDOWN_SEC + ENCOUNTER_GAP_SEC_MAX).toBeLessThanOrEqual(90)
    expect(ENCOUNTER_MAJOR_COOLDOWN_SEC).toBeGreaterThanOrEqual(ENCOUNTER_GAP_SEC_MIN)
  })

  it('das Ausweichen kommt in der ersten Hälfte, das Band ist gedeckelt', () => {
    expect(ENCOUNTER_EVADE_AT).toBeLessThan(0.5)
    expect(ENCOUNTER_ROCKS_MAX).toBeLessThanOrEqual(40)
  })

  it('der Sprite-Cache fasst alle Raster, die ein Himmel gleichzeitig braucht', () => {
    const rasters =
      ENCOUNTER_ROCK_SEEDS * ENCOUNTER_ROCK_TIERS.length +
      ENCOUNTER_SHARD_SEEDS * ENCOUNTER_SHARD_TIERS.length +
      ENCOUNTER_GIANT_PALETTES.length +
      3
    expect(ENCOUNTER_SPRITE_CACHE_MAX).toBeGreaterThanOrEqual(rasters)
  })

  it('jede Art hat Gewicht und Lebensspanne, die grossen sind gelistet', () => {
    for (const kind of Object.keys(ENCOUNTER_KIND_WEIGHTS) as (keyof typeof ENCOUNTER_KIND_WEIGHTS)[]) {
      expect(ENCOUNTER_KIND_WEIGHTS[kind]).toBeGreaterThan(0)
      const [lo, hi] = ENCOUNTER_LIFE_SEC[kind]
      expect(lo).toBeLessThan(hi)
    }
    for (const kind of ENCOUNTER_MAJOR_KINDS) expect(ENCOUNTER_KIND_WEIGHTS[kind]).toBeDefined()
  })

  it('die Grössenstufen wachsen streng', () => {
    for (const tiers of [ENCOUNTER_ROCK_TIERS, ENCOUNTER_SHARD_TIERS]) {
      for (let i = 1; i < tiers.length; i++) expect(tiers[i]).toBeGreaterThan(tiers[i - 1])
    }
  })
})

describe('Sternfeld — Tiefe', () => {
  it('die Nebelstufen enden bei 1 und werden nach vorn klarer', () => {
    expect(STAR_BG_FOG_TIERS[STAR_BG_FOG_TIERS.length - 1].maxNorm).toBe(1)
    for (let i = 1; i < STAR_BG_FOG_TIERS.length; i++) {
      expect(STAR_BG_FOG_TIERS[i].maxNorm).toBeGreaterThan(STAR_BG_FOG_TIERS[i - 1].maxNorm)
      expect(STAR_BG_FOG_TIERS[i].mix).toBeLessThan(STAR_BG_FOG_TIERS[i - 1].mix)
      expect(STAR_BG_FOG_TIERS[i].alpha).toBeGreaterThan(STAR_BG_FOG_TIERS[i - 1].alpha)
    }
  })

  it('Bloom bleibt selten', () => {
    expect(STAR_BG_BLOOM_SHARE).toBeLessThanOrEqual(0.08)
  })
})
