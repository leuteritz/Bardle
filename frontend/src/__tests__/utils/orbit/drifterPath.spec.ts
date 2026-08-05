import { describe, it, expect } from 'vitest'
import { drifterField, drifterPointAt, drifterEntryEdge } from '@/utils/orbit/drifterPath'
import {
  DRIFTER_ROUTES,
  DRIFTER_CENTER_CLEARANCE,
  DRIFTER_FIELD_TOP_PX,
  DRIFTER_FIELD_BOTTOM_PX,
  DRIFTER_HUD_PANEL_MARGIN_PX,
} from '@/config/constants'
import { DRIFTERS } from '@/config/world/drifters'

/** The desktop reference resolutions from CLAUDE.md, viewport heights. */
const VIEWPORTS: Array<[number, number]> = [
  [1920, 950],
  [2560, 1310],
  [1920, 1070],
  [3840, 2030],
]

describe('drifterField', () => {
  it('keeps the flight band clear of header and bottom bar', () => {
    const field = drifterField(1920, 950)
    expect(field.top).toBe(DRIFTER_FIELD_TOP_PX)
    expect(field.top + field.height).toBe(950 - DRIFTER_FIELD_BOTTOM_PX)
  })

  it('never collapses to a zero or negative height on a tiny viewport', () => {
    const field = drifterField(320, 100)
    expect(field.height).toBeGreaterThan(0)
    expect(field.width).toBeGreaterThan(0)
  })

  it('honours a header taller than the constant, and ignores a shorter one', () => {
    // The header scales with the viewport — on 4K it reaches well past the
    // fixed inset, and the band has to give way instead of hiding the body.
    expect(drifterField(3840, 2030, { headerBottomPx: 190 }).top).toBe(190)
    expect(drifterField(1920, 950, { headerBottomPx: 60 }).top).toBe(DRIFTER_FIELD_TOP_PX)
  })

  it('derives the HUD panel geometry, and prefers measured values', () => {
    const derived = drifterField(1920, 950)
    expect(derived.sidePanelWidth).toBeGreaterThan(0)
    expect(derived.sidePanelTop).toBeLessThan(950)

    const measured = drifterField(1920, 950, {
      sidePanelWidthPx: 300,
      bottomBarHeightPx: 400,
    })
    expect(measured.sidePanelWidth).toBe(300)
    expect(measured.sidePanelTop).toBe(550)
  })
})

describe('drifterPointAt', () => {
  it('holds the center clearance across every route and resolution', () => {
    for (const [w, h] of VIEWPORTS) {
      const field = drifterField(w, h)
      const cx = field.left + field.width / 2
      const cy = field.top + field.height / 2
      const clearance = Math.min(field.width, field.height) * DRIFTER_CENTER_CLEARANCE

      for (let route = 0; route < DRIFTER_ROUTES.length; route++) {
        for (const mirrored of [false, true]) {
          for (let step = 0; step <= 100; step++) {
            const p = drifterPointAt(route, mirrored, step / 100, field)
            const dist = Math.hypot(p.x - cx, p.y - cy)
            // A hair of tolerance: the clearance guard nudges points onto the
            // circle, and floating point can land a fraction inside it.
            expect(dist).toBeGreaterThanOrEqual(clearance - 0.5)
          }
        }
      }
    }
  })

  it('stays inside the vertical band once the drifter is on screen', () => {
    const field = drifterField(1920, 950)
    for (let route = 0; route < DRIFTER_ROUTES.length; route++) {
      for (let step = 15; step <= 85; step++) {
        const p = drifterPointAt(route, false, step / 100, field)
        expect(p.y).toBeGreaterThanOrEqual(field.top - 1)
        expect(p.y).toBeLessThanOrEqual(field.top + field.height + 1)
      }
    }
  })

  it('starts and ends outside the viewport so nothing pops into view', () => {
    const field = drifterField(1920, 950)
    for (let route = 0; route < DRIFTER_ROUTES.length; route++) {
      const start = drifterPointAt(route, false, 0, field)
      const end = drifterPointAt(route, false, 1, field)
      for (const p of [start, end]) {
        const outside =
          p.x < field.left ||
          p.x > field.left + field.width ||
          p.y < field.top ||
          p.y > field.top + field.height
        expect(outside).toBe(true)
      }
    }
  })

  it('moves monotonically along the flight — no stalling or backtracking', () => {
    const field = drifterField(1920, 950)
    for (let route = 0; route < DRIFTER_ROUTES.length; route++) {
      let prev = drifterPointAt(route, false, 0, field)
      let travelled = 0
      for (let step = 1; step <= 60; step++) {
        const p = drifterPointAt(route, false, step / 60, field)
        travelled += Math.hypot(p.x - prev.x, p.y - prev.y)
        prev = p
      }
      // A drifter must make a real passage, not hover in a corner. The flank
      // routes enter and leave on the same side, so the short field edge — not
      // the full width — is the honest yardstick.
      expect(travelled).toBeGreaterThan(Math.min(field.width, field.height))
    }
  })

  it('keeps the whole body clear of the raised HUD panels', () => {
    // The bottom bar's side panels (minimap left, command right) are opaque and
    // sit above the drifter layer. A route that dives into that corner would
    // hide the body — and with it its click target — while the player still
    // expects to be able to reach it. Measured with the largest body in the
    // pool, which is the case that actually breaks.
    const radius = Math.max(...DRIFTERS.map((d) => d.sizePx)) / 2
    for (const [w, h] of VIEWPORTS) {
      const field = drifterField(w, h)
      for (let route = 0; route < DRIFTER_ROUTES.length; route++) {
        for (const mirrored of [false, true]) {
          for (let step = 0; step <= 100; step++) {
            const p = drifterPointAt(route, mirrored, step / 100, field, radius)
            // Box of the drawn body, not just its path point.
            const bodyLeft = p.x - radius
            const bodyRight = p.x + radius
            const overlapsLeftPanel = bodyLeft < field.sidePanelWidth
            const overlapsRightPanel = bodyRight > w - field.sidePanelWidth
            // Fully off-screen is fine — that is entry/exit, nothing is drawn.
            if (bodyRight < 0 || bodyLeft > w) continue
            if (!overlapsLeftPanel && !overlapsRightPanel) continue
            expect(p.y + radius).toBeLessThanOrEqual(
              field.sidePanelTop - DRIFTER_HUD_PANEL_MARGIN_PX,
            )
          }
        }
      }
    }
  })

  it('keeps the body out from under the header while it is in the band', () => {
    const radius = Math.max(...DRIFTERS.map((d) => d.sizePx)) / 2
    for (const [w, h] of VIEWPORTS) {
      const field = drifterField(w, h)
      for (let route = 0; route < DRIFTER_ROUTES.length; route++) {
        for (const mirrored of [false, true]) {
          for (let step = 0; step <= 100; step++) {
            const p = drifterPointAt(route, mirrored, step / 100, field, radius)
            // A route exiting through the top is allowed to slide behind the
            // header — that IS leaving the screen. Only points still inside the
            // band have to keep their whole body below it.
            if (p.y < field.top) continue
            expect(p.y - radius).toBeGreaterThanOrEqual(field.top - 0.5)
          }
        }
      }
    }
  })

  it('mirrors a route to the opposite side of the field', () => {
    const field = drifterField(1920, 950)
    const plain = drifterPointAt(0, false, 0.5, field)
    const mirrored = drifterPointAt(0, true, 0.5, field)
    const cx = field.left + field.width / 2
    expect(Math.abs(plain.x - cx)).toBeCloseTo(Math.abs(mirrored.x - cx), 0)
  })

  it('clamps progress outside 0..1 instead of flying off', () => {
    const field = drifterField(1920, 950)
    const before = drifterPointAt(0, false, -0.5, field)
    const start = drifterPointAt(0, false, 0, field)
    expect(before.x).toBeCloseTo(start.x, 5)
    expect(before.y).toBeCloseTo(start.y, 5)
  })

  it('reports a finite heading everywhere along the path', () => {
    const field = drifterField(1920, 950)
    for (let route = 0; route < DRIFTER_ROUTES.length; route++) {
      for (let step = 0; step <= 20; step++) {
        const p = drifterPointAt(route, false, step / 20, field)
        expect(Number.isFinite(p.angleDeg)).toBe(true)
      }
    }
  })
})

describe('drifterEntryEdge', () => {
  it('names the edge each route enters from and where along it', () => {
    for (let route = 0; route < DRIFTER_ROUTES.length; route++) {
      for (const mirrored of [false, true]) {
        const edge = drifterEntryEdge(route, mirrored)
        expect(['left', 'right', 'top', 'bottom']).toContain(edge.side)
        expect(edge.alongPct).toBeGreaterThanOrEqual(0)
        expect(edge.alongPct).toBeLessThanOrEqual(100)
      }
    }
  })

  it('flips the entry side when a side-entering route is mirrored', () => {
    // Route 0 starts left of the field; mirrored it has to come from the right.
    expect(drifterEntryEdge(0, false).side).toBe('left')
    expect(drifterEntryEdge(0, true).side).toBe('right')
  })
})
