import { describe, it, expect } from 'vitest'
import {
  STAR_FIGHT_SYS_CENTER_X_PCT,
  STAR_FIGHT_SYS_CENTER_Y_PCT,
  STAR_FIGHT_SYS_MARGIN_X,
  STAR_FIGHT_SYS_MARGIN_TOP,
  STAR_FIGHT_SYS_MARGIN_BOTTOM,
  STAR_FIGHT_SYS_PLANET_D_PCT,
  STAR_FIGHT_ANCHOR_X_PCT,
  STAR_FIGHT_ANCHOR_Y_PCT,
  STAR_FIGHT_FIGHT_PLANET_D_PCT,
  STAR_FIGHT_BOSS_GROUND_Y_PCT,
  STAR_FIGHT_BOSS_H_PCT,
  STAR_FIGHT_BOSS_H_PCT_COMPACT,
  STAR_FIGHT_CAM_DEPART_MS,
  STAR_FIGHT_CAM_HOLD_MS,
  STAR_FIGHT_CAM_APPROACH_MS,
  STAR_FIGHT_CAM_OUTRO_MS,
  STAR_FIGHT_CAM_OUTRO_RM_MS,
  STAR_FIGHT_CAM_NET_MUL,
  STAR_FIGHT_HERO_FADE_FRAC,
  STAR_FIGHT_PLANET_SPRITE_MAX_PX,
  STAR_FIGHT_PLANET_SPRITE_SPAN_RINGED,
  STAR_FIGHT_PLANET_SPRITE_SPAN,
  STAR_FIGHT_TRAVEL_DIM,
  STAR_FIGHT_VANISH_SETTLE_MS,
  STRIKER_BOSS_ANCHOR_Y_PCT,
  STAR_REMOVAL_DELAY_MS,
  BOSS_REMOVAL_DELAY_MS,
} from '@/config/constants'

// Das Loot-Banner steht bei 51 % der Bühne (StarFightModal.vue, .sf-loot)
const LOOT_TOP_PCT = 51

describe('Star-Fight-Systembühne — Budget der Kampfansicht', () => {
  it('der Boss steht auf seiner Bodenlinie und endet vor dem Loot-Banner', () => {
    expect(STAR_FIGHT_BOSS_GROUND_Y_PCT).toBeLessThanOrEqual(LOOT_TOP_PCT)
    expect(STAR_FIGHT_BOSS_H_PCT_COMPACT).toBeLessThan(STAR_FIGHT_BOSS_H_PCT)
    expect(STAR_FIGHT_BOSS_GROUND_Y_PCT - STAR_FIGHT_BOSS_H_PCT).toBeGreaterThan(0)
  })

  it('der Projektil-Anker liegt zwischen Boss-Oberkante und Boden', () => {
    const top = STAR_FIGHT_BOSS_GROUND_Y_PCT - STAR_FIGHT_BOSS_H_PCT
    expect(STRIKER_BOSS_ANCHOR_Y_PCT).toBeGreaterThan(top)
    expect(STRIKER_BOSS_ANCHOR_Y_PCT).toBeLessThan(STAR_FIGHT_BOSS_GROUND_Y_PCT)
    const topCompact = STAR_FIGHT_BOSS_GROUND_Y_PCT - STAR_FIGHT_BOSS_H_PCT_COMPACT
    expect(STRIKER_BOSS_ANCHOR_Y_PCT).toBeGreaterThan(topCompact)
  })

  it('der Zielplanet passt samt Radius in die Bühne und trägt den Boss', () => {
    const r = STAR_FIGHT_FIGHT_PLANET_D_PCT / 2
    expect(STAR_FIGHT_ANCHOR_Y_PCT - r).toBeGreaterThanOrEqual(0)
    expect(STAR_FIGHT_ANCHOR_Y_PCT + r).toBeLessThanOrEqual(100)
    expect(STAR_FIGHT_ANCHOR_X_PCT).toBe(50)
    // Die Bodenlinie liegt IM Planeten, nicht darunter
    expect(STAR_FIGHT_BOSS_GROUND_Y_PCT).toBeGreaterThan(STAR_FIGHT_ANCHOR_Y_PCT - r)
    expect(STAR_FIGHT_BOSS_GROUND_Y_PCT).toBeLessThan(STAR_FIGHT_ANCHOR_Y_PCT + r)
  })

  it('der Kampf-Zoom ist ganzzahlig und die Systemansicht lässt Rand', () => {
    expect(STAR_FIGHT_FIGHT_PLANET_D_PCT % STAR_FIGHT_SYS_PLANET_D_PCT).toBe(0)
    expect(STAR_FIGHT_SYS_MARGIN_TOP + STAR_FIGHT_SYS_MARGIN_BOTTOM).toBeLessThan(0.6)
    expect(STAR_FIGHT_SYS_MARGIN_X).toBeLessThan(0.3)
    expect(STAR_FIGHT_SYS_CENTER_X_PCT).toBe(50)
    expect(STAR_FIGHT_SYS_CENTER_Y_PCT / 100).toBeGreaterThan(STAR_FIGHT_SYS_MARGIN_TOP)
    expect(STAR_FIGHT_SYS_CENTER_Y_PCT / 100).toBeLessThan(1 - STAR_FIGHT_SYS_MARGIN_BOTTOM)
  })
})

describe('Star-Fight-Systembühne — Zeiten', () => {
  it('ein Planetenwechsel bleibt unter 2,5 s und der Boss ist längst dran', () => {
    const flight = STAR_FIGHT_CAM_DEPART_MS + STAR_FIGHT_CAM_HOLD_MS + STAR_FIGHT_CAM_APPROACH_MS
    expect(flight).toBeLessThan(2500)
    expect(flight).toBeGreaterThan(BOSS_REMOVAL_DELAY_MS)
    expect(STAR_FIGHT_CAM_NET_MUL).toBeGreaterThanOrEqual(1.5)
  })

  it('der Abgang des Sterns wartet das Ausblenden des Modals ab und hat sein Fenster', () => {
    // .sf-entrance-leave-active blendet 160 ms aus, danach zwei Frames Wiedereinblende-Gate
    expect(STAR_FIGHT_VANISH_SETTLE_MS).toBeGreaterThan(160)
    expect(STAR_REMOVAL_DELAY_MS).toBeGreaterThan(STAR_FIGHT_VANISH_SETTLE_MS)
    expect(STAR_FIGHT_CAM_OUTRO_RM_MS).toBeLessThan(STAR_FIGHT_CAM_OUTRO_MS)
    expect(STAR_FIGHT_CAM_OUTRO_MS).toBeGreaterThan(STAR_FIGHT_CAM_DEPART_MS)
  })

  it('die Blende des Hero ist ein Anteil der Fahrt, nicht die Fahrt', () => {
    expect(STAR_FIGHT_HERO_FADE_FRAC).toBeGreaterThan(0)
    expect(STAR_FIGHT_HERO_FADE_FRAC).toBeLessThanOrEqual(0.5)
    expect(STAR_FIGHT_TRAVEL_DIM).toBeGreaterThan(0)
    expect(STAR_FIGHT_TRAVEL_DIM).toBeLessThan(1)
  })
})

describe('Star-Fight-Systembühne — Sprites', () => {
  it('Ringe brauchen die grosse Kante, der Deckel liegt auf der Kante', () => {
    expect(STAR_FIGHT_PLANET_SPRITE_SPAN_RINGED).toBeGreaterThanOrEqual(1.9)
    expect(STAR_FIGHT_PLANET_SPRITE_SPAN).toBeGreaterThanOrEqual(1)
    expect(STAR_FIGHT_PLANET_SPRITE_SPAN).toBeLessThan(STAR_FIGHT_PLANET_SPRITE_SPAN_RINGED)
    expect(STAR_FIGHT_PLANET_SPRITE_MAX_PX).toBeLessThanOrEqual(2048)
  })
})
