import { describe, it, expect, afterEach, vi } from 'vitest'
import { depthPassWeight, depthPassPointAt } from '@/utils/orbit/depthPass'
import { drifterField, drifterFlightPointAt, drifterPointAt } from '@/utils/orbit/drifterPath'
import { landfallBodyPx, landfallLaneFor, landfallFlightModeFor, landfallFlyPointAt } from '@/utils/orbit/landfallPath'
import { hudFreeBandOver, type HudFieldMetrics } from '@/utils/ui/hudField'
import { gameNow, resetGameClock, setGameSpeed } from '@/utils/game/gameClock'
import { landfallOnLeg } from '@/utils/game/landfalls'
import { DRIFTERS } from '@/config/world/drifters'
import { LANDFALLS } from '@/config/world/landfalls'
import {
  DEPTH_PASS_NEAR, DEPTH_PASS_HIT_MIN_PX, DEPTH_PASS_HOVER_SCALE,
  DRIFTER_DEPTH_CHANCE, DRIFTER_DEPTH_SCALE_MAX, DRIFTER_HIT_PADDING_PX,
  DRIFTER_CENTER_CLEARANCE, LANDFALL_CENTER_CLEARANCE, LANDFALL_THROUGH_SCALE_MAX,
  LANDFALL_BODY_HIT_PADDING_PX, LANDFALL_THROUGH_CHANCE,
} from '@/config/constants'

function fieldMetrics(w: number, h: number): HudFieldMetrics {
  const k = Math.min(w / 1920, h / 950)
  return {
    viewportW: w, viewportH: h, hudScale: Math.min(1, k * 0.7),
    headerBottom: 86 * k, headerLeft: 404 * k, headerRight: w - 404 * k,
    headerCenterBottom: 133 * k, centerArc: null,
    keycapBar: 30 * k, keycapBarReach: 511 * k,
    abilityBarTop: h - 150 * k, abilityBarHalfW: 230 * k,
    wayfinderBottom: 220 * k, wayfinderRight: 370 * k,
    eventLogBottom: 330 * k, eventLogLeft: w - 370 * k,
  }
}

afterEach(() => {
  resetGameClock()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('depth passes', () => {
  it('grows with reciprocal distance and accelerates towards the viewer', () => {
    expect(depthPassWeight(-1)).toBeCloseTo(DEPTH_PASS_NEAR)
    expect(depthPassWeight(2)).toBe(1)
    expect(1 / depthPassWeight(0.5)).toBeCloseTo((1 / depthPassWeight(0) + 1) / 2)
    expect(depthPassWeight(0.9) - depthPassWeight(0.8)).toBeGreaterThan(depthPassWeight(0.2) - depthPassWeight(0.1))
  })

  it.each([[1920, 950], [1920, 1070], [2560, 1310], [3840, 2030]])(
    'keeps bodies, hovered buttons and indicators free at %i × %i', (w, h) => {
      const metrics = fieldMetrics(w, h)
      const bodies = [
        ...DRIFTERS.filter(d => DRIFTER_DEPTH_CHANCE[d.id]).map(d => ({
          px: d.sizePx, pad: DRIFTER_HIT_PADDING_PX,
          max: DRIFTER_DEPTH_SCALE_MAX, clearance: DRIFTER_CENTER_CLEARANCE,
        })),
        { px: landfallBodyPx(w), pad: LANDFALL_BODY_HIT_PADDING_PX,
          max: LANDFALL_THROUGH_SCALE_MAX, clearance: LANDFALL_CENTER_CLEARANCE },
      ]
      for (const b of bodies) for (const mirrored of [false, true]) for (let lane = 0; lane < 6; lane++) {
        let previousX: number | undefined
        for (let i = 0; i <= 100; i++) {
          const p = depthPassPointAt(lane, mirrored, i / 100, b.px, b.pad, b.max, b.clearance, 140, metrics)
          const radius = Math.max(DEPTH_PASS_HIT_MIN_PX / 2, (b.px / 2 + b.pad) * p.scale) * DEPTH_PASS_HOVER_SCALE
          const band = hudFreeBandOver(p.x, radius, metrics)
          expect(p.y - radius).toBeGreaterThanOrEqual(band.top)
          expect(p.y + radius).toBeLessThanOrEqual(band.bottom)
          expect(p.x - radius).toBeGreaterThanOrEqual(0)
          expect(p.x + radius).toBeLessThanOrEqual(w)
          expect(Math.abs(p.x - w / 2) - radius).toBeGreaterThanOrEqual(280)
          expect(Number.isFinite(p.angleDeg)).toBe(true)
          if (previousX !== undefined) expect((p.x - previousX) * (mirrored ? -1 : 1)).toBeGreaterThan(0)
          previousX = p.x
        }
      }
    },
  )

  it('keeps the original drifter routes unchanged', () => {
    const metrics = fieldMetrics(1920, 950)
    const field = drifterField(1920, 950)
    for (let routeIndex = 0; routeIndex < 6; routeIndex++) for (const mirrored of [true, false]) {
      for (const t of [0, 0.2, 0.5, 0.9, 1]) {
        const old = drifterPointAt(routeIndex, mirrored, t, field, 64, metrics)
        expect(drifterFlightPointAt({ routeIndex, mirrored }, t, field, 128, metrics, 280)).toEqual({ ...old, scale: 1 })
      }
    }
  })

  it('recomputes its corridor when the HUD changes', () => {
    const m = fieldMetrics(1920, 950)
    const sample = (metrics: HudFieldMetrics) => depthPassPointAt(0, false, 0.8, 128, 14, 1.25, 0.3, 140, metrics)
    const a = sample(m)
    const raised = { ...m, eventLogBottom: 430, eventLogLeft: 1400 }
    expect(sample(raised).y).toBeGreaterThan(a.y)
    expect(sample(m)).toEqual(a)
  })

  it('has the same position after equal game time at every speed', () => {
    vi.useFakeTimers()
    const m = fieldMetrics(1920, 950)
    const samples = [0.5, 1, 10, 100].map(speed => {
      resetGameClock()
      vi.setSystemTime(1_000_000)
      setGameSpeed(speed)
      const start = gameNow()
      vi.advanceTimersByTime(6000 / speed)
      return drifterFlightPointAt({ routeIndex: 2, mirrored: false, flightMode: 'approach' },
        (gameNow() - start) / 12000, drifterField(1920, 950), 128, m, 280)
    })
    for (const sample of samples) expect(sample).toEqual(samples[0])
  })

  it('preserves lane draws and the archive while varying eligible landfalls', () => {
    for (const kind of LANDFALLS.map(d => d.id)) {
      const seen = new Set<string>()
      for (let seed = 1; seed <= 80; seed++) {
        const before = landfallOnLeg(seed, 30, 2, 8)
        const old = landfallLaneFor(seed, 2)
        const next = landfallLaneFor(seed, 2, kind)
        expect({ lane: next.lane, mirrored: next.mirrored }).toEqual({ lane: old.lane, mirrored: old.mirrored })
        expect(next).toEqual(landfallLaneFor(seed, 2, kind))
        expect(landfallOnLeg(seed, 30, 2, 8)).toEqual(before)
        seen.add(next.flightMode)
      }
      expect([...seen].sort()).toEqual(LANDFALL_THROUGH_CHANCE[kind] ? ['flyby', 'through'] : ['flyby'])
    }
  })

  it('keeps a through-landfall visible for the full interaction window', () => {
    const m = fieldMetrics(1920, 950)
    for (const t of [0, 0.5, 0.99, 1]) {
      const p = landfallFlyPointAt(0, false, t, drifterField(1920, 950), 116, m, 'through', 280)
      expect(p.alpha).toBeGreaterThanOrEqual(0.6)
      expect(p.scale).toBeGreaterThanOrEqual(LANDFALL_THROUGH_SCALE_MAX * DEPTH_PASS_NEAR)
    }
  })

  it('respects reduced motion and rejects through-flights for unselected landfalls', () => {
    expect(landfallFlightModeFor(1, 2, 'wayside_cairn', 'through')).toBe('flyby')
    expect(landfallFlightModeFor(1, 2, 'chime_reef', 'through')).toBe('through')
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    expect(landfallFlightModeFor(1, 2, 'chime_reef', 'through')).toBe('flyby')
  })
})
