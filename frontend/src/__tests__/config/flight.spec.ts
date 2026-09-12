import { describe, it, expect } from 'vitest'
import {
  ENCOUNTER_EVADE_AT,
  ENCOUNTER_GAP_SEC_MAX,
  ENCOUNTER_GAP_SEC_MIN,
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
  HELM_WAKE_STRETCH,
  HELM_WAKE_TURN_TAU_SEC,
  HELM_YAW_AMP_FRAC_MAX,
  HELM_YAW_AMP_FRAC_MIN,
  JOLT_FOCUS_FRAC,
  JOLT_PROFILES,
  JOLT_ROLL_DEG,
  JOLT_TREMOR_HZ,
  JOLT_UNIT_MAX,
  JOLT_VOID_PROFILES,
  JOLT_ZETA,
  STAR_BG_BLOOM_SHARE,
  STAR_BG_FOG_TIERS,
  GALAXY_TRANS_DECEL_MS,
  GALAXY_TRANS_WARP_MS,
  GALAXY_WARP_ACCEL_MS,
  PROCESSION_BAND_CHAMPION,
  PROCESSION_BAND_PLANET,
  PROCESSION_DEPTH_FAR,
  PROCESSION_DEPTH_NEAR,
  PROCESSION_ENTER_T,
  PROCESSION_EXIT_T,
  PROCESSION_SCALE_K,
  PROCESSION_SCALE_MAX,
  PROCESSION_SCALE_MIN,
  PROCESSION_SPREAD_MAX,
  PROCESSION_SPREAD_MIN,
  PROCESSION_SUN_TRAIL_ALPHA,
  PROCESSION_SWELL_SEC_MAX,
  PROCESSION_SWELL_SEC_MIN,
  PROCESSION_TRAIL_ALPHA,
  PROCESSION_TRAIL_LEN_K_MAX,
  PROCESSION_TRAIL_LEN_K_MIN,
  PROCESSION_REACH_MAX_FRAC,
  WARP_SPEED_PEAK,
  WARP_SURGE_FROM,
  WARP_SURGE_PEAK,
  WARP_TINT_ALPHA,
  WARP_HEADLIGHT_TINT_CORE,
  WARP_HEADLIGHT_TINT_MID,
  WARP_STREAK_LEN_MAX_FRAC,
  UNIVERSE_HOP_SPEED_PEAK,
  GALAXY_WARP_LAUNCH_MS,
  GALAXY_WARP_LAUNCH_INHALE_MS,
  WARP_LAUNCH_SPEED,
  WARP_INHALE_SPEED,
  WARP_LEG_WEIGHT_MIN,
  WARP_LEG_WEIGHT_MAX,
  WARP_SURGE_RESPAWN_FRAC,
  WARP_BODY_ROLL_K,
  WARP_LEAN_TAU_SEC,
  WARP_COURSE_ARC_DEG,
  WARP_COURSE_LEGS,
  WARP_COURSE_TURN_MIN_DEG,
  WARP_COURSE_TURN_MAX_DEG,
  WARP_BANK_MAX_RAD,
  WARP_LEAN_K,
  WARP_STAR_SURGE_COUNT,
  WARP_BOW_WAVE_MS,
  WARP_TRAIL_FADE,
  UNIVERSE_HOP_APPROACH_BANK_MAX_RAD,
  UNIVERSE_HOP_APPROACH_TRAIL_FADE,
  UNIVERSE_HOP_STAR_SURGE_COUNT,
} from '@/config/constants'

/**
 * Der Helm addiert auf das Drift-Wobbeln und klemmt die SUMME — die Klemme
 * muss also über Drift + grösstem Manöver liegen, sonst schneidet sie jedes
 * Ausweichen still ab.
 */
describe('Helm — Kurs', () => {
  it('die Fokus-Klemme trägt Drift plus das grösste Manöver plus den vollen Ruck', () => {
    const largest = Math.max(HELM_YAW_AMP_FRAC_MAX, HELM_EVADE_AMP_FRAC)
    expect(HELM_FOCUS_MAX_FRAC).toBeGreaterThanOrEqual(
      FLIGHT_DRIFT_AMPLITUDE + largest + JOLT_FOCUS_FRAC * JOLT_UNIT_MAX,
    )
    expect(HELM_YAW_AMP_FRAC_MIN).toBeLessThan(HELM_YAW_AMP_FRAC_MAX)
  })

  it('keine Rolle übersteigt die Roll-Klemme', () => {
    expect(HELM_BANK_ROLL_DEG_MIN).toBeLessThan(HELM_BANK_ROLL_DEG_MAX)
    expect(HELM_BANK_ROLL_DEG_MAX + JOLT_ROLL_DEG).toBeLessThanOrEqual(HELM_ROLL_MAX_DEG)
    expect(HELM_EVADE_ROLL_DEG + JOLT_ROLL_DEG).toBeLessThanOrEqual(HELM_ROLL_MAX_DEG)
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

  it('die Streckung bleibt ein Zug, keine Verzerrung', () => {
    expect(HELM_WAKE_STRETCH).toBeLessThanOrEqual(0.25)
  })

  // Die Achse muss im Manöver sichtbar drehen: träger als der Helm selbst
  // (HELM_FOCUS_TAU_SEC) käme sie erst an, wenn die Kurve vorbei ist.
  it('die Schweifachse schwingt schneller ein als der Kurs', () => {
    expect(HELM_WAKE_TURN_TAU_SEC).toBeLessThan(HELM_FOCUS_TAU_SEC)
    expect(HELM_WAKE_TURN_TAU_SEC).toBeGreaterThan(0)
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
      3
    expect(ENCOUNTER_SPRITE_CACHE_MAX).toBeGreaterThanOrEqual(rasters)
  })

  it('jede Art hat Gewicht und Lebensspanne, die grossen sind gelistet', () => {
    for (const kind of Object.keys(
      ENCOUNTER_KIND_WEIGHTS,
    ) as (keyof typeof ENCOUNTER_KIND_WEIGHTS)[]) {
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

describe('Treffer — Jolt', () => {
  it('die Feder ist unterkritisch gedämpft und das Beben unter Nyquist bei 60 Hz', () => {
    expect(JOLT_ZETA).toBeGreaterThan(0)
    expect(JOLT_ZETA).toBeLessThan(1)
    expect(JOLT_TREMOR_HZ / 60).toBeLessThanOrEqual(0.5)
  })

  it('Void-Profile steigen mit der Schwere und bleiben unter dem Strike; Volleys stossen nicht', () => {
    const { lesser, greater, abyssal } = JOLT_VOID_PROFILES
    expect(lesser.strength).toBeLessThan(greater.strength)
    expect(greater.strength).toBeLessThan(abyssal.strength)
    expect(abyssal.strength).toBeLessThanOrEqual(JOLT_PROFILES.strike.strength)
    expect(JOLT_PROFILES.volley.strength).toBe(0)
    expect(JOLT_PROFILES.volley.tremor).toBe(0)
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

describe('Prozession — die Zahlen', () => {
  it('trennt die zwei Bänder, damit die Ebenen-Wand die Tiefe tragen kann', () => {
    // `.planet-orbit-front` (z 7) liegt hart über `.champion-orbit-front` (6).
    // Überlappten die Bänder, stünde irgendwann ein ferner Planet vor einem
    // nahen Champion — und das wäre per z-index am Körper nicht zu heilen.
    expect(PROCESSION_BAND_PLANET[0]).toBeLessThan(PROCESSION_BAND_PLANET[1])
    expect(PROCESSION_BAND_CHAMPION[0]).toBeLessThan(PROCESSION_BAND_CHAMPION[1])
    expect(PROCESSION_BAND_PLANET[1]).toBeLessThanOrEqual(PROCESSION_BAND_CHAMPION[0])
    expect(PROCESSION_BAND_CHAMPION[1]).toBeLessThanOrEqual(1)
    expect(PROCESSION_DEPTH_NEAR).toBeGreaterThan(0)
    expect(PROCESSION_DEPTH_FAR).toBeGreaterThan(PROCESSION_DEPTH_NEAR)
  })

  it('hat eine Hysterese am Ebenenwechsel', () => {
    // An EINER Schwelle zitterte der Wechsel auf der easeInOutCubic-Flanke und
    // riss pro Frame einen vollen Vue-Render auf (isBehind steht im structureKey).
    expect(PROCESSION_EXIT_T).toBeLessThan(PROCESSION_ENTER_T)
    expect(PROCESSION_EXIT_T).toBeGreaterThan(0)
  })

  it('klemmt die Perspektivskala um ihren eigenen Nennwert', () => {
    expect(PROCESSION_SCALE_MIN).toBeLessThan(PROCESSION_SCALE_MAX)
    expect(PROCESSION_SCALE_K / PROCESSION_DEPTH_FAR).toBeLessThanOrEqual(PROCESSION_SCALE_MAX)
    expect(PROCESSION_SCALE_K / PROCESSION_DEPTH_NEAR).toBeGreaterThanOrEqual(PROCESSION_SCALE_MIN)
  })

  it('hält den weitesten Platz innerhalb des Netzes', () => {
    // Ohne das verließe der naheste Körper bei kleiner Tiefe das Bild.
    expect(PROCESSION_SPREAD_MIN).toBeLessThan(PROCESSION_SPREAD_MAX)
    expect(PROCESSION_REACH_MAX_FRAC).toBeLessThan(0.5)
  })

  it('streut die Wogen-Perioden, sonst atmen alle im Takt', () => {
    expect(PROCESSION_SWELL_SEC_MIN).toBeLessThan(PROCESSION_SWELL_SEC_MAX)
  })

  it('lässt den Schweif des Spielerkörpers leiser sein als die der Begleiter', () => {
    expect(PROCESSION_TRAIL_LEN_K_MIN).toBeLessThan(PROCESSION_TRAIL_LEN_K_MAX)
    expect(PROCESSION_SUN_TRAIL_ALPHA).toBeLessThan(PROCESSION_TRAIL_ALPHA)
  })

  it('lässt die Rampe der Prozession in den Flug passen', () => {
    // Der Aufbruch teilt sich sein Easing mit dem Schub — er muss vor dem
    // Schnitt fertig sein, sonst bräche die Aufstellung mitten im Hochfahren ab.
    expect(GALAXY_WARP_LAUNCH_MS + GALAXY_WARP_ACCEL_MS).toBeLessThan(GALAXY_TRANS_WARP_MS)
    expect(GALAXY_TRANS_DECEL_MS).toBeGreaterThan(0)
  })
})

describe('Warp — Aufbruch und Kurs', () => {
  it('punscht vor dem Anlauf, aber unter das Höchsttempo', () => {
    expect(GALAXY_WARP_LAUNCH_MS).toBeGreaterThan(0)
    // Der Atemzug liegt IM Aufbruch und zieht einwärts, der Schlag wirft hinaus.
    expect(GALAXY_WARP_LAUNCH_INHALE_MS).toBeGreaterThan(0)
    expect(GALAXY_WARP_LAUNCH_INHALE_MS).toBeLessThan(GALAXY_WARP_LAUNCH_MS)
    expect(WARP_INHALE_SPEED).toBeLessThan(0)
    expect(WARP_LAUNCH_SPEED).toBeGreaterThan(1)
    expect(WARP_LAUNCH_SPEED).toBeLessThan(WARP_SPEED_PEAK)
    expect(JOLT_PROFILES.launch.strength).toBeLessThan(JOLT_PROFILES.strike.strength)
    expect(WARP_BOW_WAVE_MS).toBeLessThan(
      GALAXY_TRANS_WARP_MS - GALAXY_WARP_LAUNCH_MS - GALAXY_WARP_ACCEL_MS,
    )
  })

  it('lässt die Kurve im Bogen Platz finden und bleibt unter dem Sprung', () => {
    expect(WARP_COURSE_LEGS).toBeGreaterThanOrEqual(2)
    expect(WARP_COURSE_TURN_MIN_DEG).toBeGreaterThan(0)
    expect(WARP_COURSE_TURN_MIN_DEG).toBeLessThan(WARP_COURSE_TURN_MAX_DEG)
    // MAX ≤ ARC/2: von jedem Punkt im Bogen passt mindestens eine Richtung.
    expect(WARP_COURSE_TURN_MAX_DEG).toBeLessThanOrEqual(WARP_COURSE_ARC_DEG / 2)
    expect(WARP_BANK_MAX_RAD).toBeGreaterThan(0)
    expect(WARP_BANK_MAX_RAD).toBeLessThan(UNIVERSE_HOP_APPROACH_BANK_MAX_RAD)
    expect(WARP_LEAN_K).toBeGreaterThan(0)
    expect(WARP_LEAN_K).toBeLessThan(1)
    expect(WARP_STAR_SURGE_COUNT).toBeLessThanOrEqual(UNIVERSE_HOP_STAR_SURGE_COUNT)
    expect(WARP_TRAIL_FADE).toBeGreaterThan(UNIVERSE_HOP_APPROACH_TRAIL_FADE)
    // Etappen ungleich, aber keine verschwindet; Schub-Sterne im Mittelring; Körper-Bank gedeckelt.
    expect(WARP_LEG_WEIGHT_MIN).toBeGreaterThan(0.3)
    expect(WARP_LEG_WEIGHT_MIN).toBeLessThan(WARP_LEG_WEIGHT_MAX)
    expect(WARP_SURGE_RESPAWN_FRAC[0]).toBeGreaterThan(0.1)
    expect(WARP_SURGE_RESPAWN_FRAC[0]).toBeLessThan(WARP_SURGE_RESPAWN_FRAC[1])
    expect(WARP_SURGE_RESPAWN_FRAC[1]).toBeLessThan(1)
    expect(WARP_BODY_ROLL_K * WARP_BANK_MAX_RAD).toBeLessThan(0.2)
    expect(WARP_LEAN_TAU_SEC).toBeGreaterThan(0)
    expect(WARP_LEAN_TAU_SEC).toBeLessThan(1)
  })
})

describe('Warp — Crescendo und Farbwelt', () => {
  it('setzt das Crescendo mitten in den Reiseflug, nicht an seine Ränder', () => {
    // An 0 wäre es kein Crescendo, sondern ein zweiter Anlauf; an 1 gäbe es
    // keine Strecke mehr, über die es steigen könnte.
    expect(WARP_SURGE_FROM).toBeGreaterThan(0.1)
    expect(WARP_SURGE_FROM).toBeLessThan(0.9)
  })

  it('lässt das Tempo im Schub über das Höchsttempo des Anlaufs steigen', () => {
    expect(WARP_SURGE_PEAK).toBeGreaterThan(WARP_SPEED_PEAK)
    // Der Anlauf muss vor dem Schub fertig sein, sonst überlagern sich zwei Kurven.
    expect(GALAXY_WARP_ACCEL_MS).toBeGreaterThan(0)
  })

  it('hält die Tunnel-Tönung als Hauch, nicht als Farbfilter', () => {
    expect(WARP_TINT_ALPHA).toBeGreaterThan(0)
    expect(WARP_TINT_ALPHA).toBeLessThan(0.5)
    // Kern und Saum des Headlights bleiben hell: sie TRAGEN die Weltfarbe.
    // Der Kern heller als der Saum — sonst wäre es eine farbige Taschenlampe.
    expect(WARP_HEADLIGHT_TINT_CORE).toBeGreaterThan(WARP_HEADLIGHT_TINT_MID)
    expect(WARP_HEADLIGHT_TINT_CORE).toBeLessThan(1)
    expect(WARP_HEADLIGHT_TINT_MID).toBeGreaterThan(0)
  })

  it('deckelt den Sternstrich, bevor er den Fluchtpunkt quert', () => {
    // Ohne Deckel überschösse beim Crescendo fast jeder zweite Randstrich den
    // Fluchtpunkt und der Tunnel läse sich als Explosion.
    expect(WARP_STREAK_LEN_MAX_FRAC).toBeGreaterThan(0)
    expect(WARP_STREAK_LEN_MAX_FRAC).toBeLessThan(1)
  })

  it('lässt den Universumssprung der schnellste Flug bleiben', () => {
    // Auch am Gipfel des Crescendos — ein Weg zur Nachbargalaxie darf nicht
    // schneller sein als der durch ein ganzes Universum.
    expect(UNIVERSE_HOP_SPEED_PEAK).toBeGreaterThan(WARP_SURGE_PEAK)
  })
})
