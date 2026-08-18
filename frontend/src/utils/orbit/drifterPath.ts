import {
  DRIFTER_ROUTES,
  DRIFTER_CENTER_CLEARANCE,
  DRIFTER_FIELD_TOP_PX,
  DRIFTER_FIELD_BOTTOM_PX,
  DRIFTER_HUD_PANEL_MARGIN_PX,
  BOTTOM_BAR_HEIGHT,
  BOTTOM_BAR_SIDE_W,
  HUD_SCALE_REF_WIDTH_PX,
  HUD_SCALE_REF_HEIGHT_PX,
  DRIFTER_TANGENT_PROBE_STEP,
  DRIFTER_LIGHT_QUANTIZE_DEG,
} from '@/config/constants'
import { hudFreeBandOver, type HudFieldMetrics } from '@/utils/ui/hudField'

export interface DrifterFieldRect {
  left: number
  top: number
  width: number
  height: number
  /** Width of the raised HUD panel on each side (minimap left, command right). */
  sidePanelWidth: number
  /** Upper edge of those panels, absolute in viewport pixels. */
  sidePanelTop: number
}

export interface DrifterFieldInsets {
  /** Measured lower edge of the app header (`--header-total-height`). */
  headerBottomPx?: number
  /** Measured width of one raised side panel (`--hud-panel-size`). */
  sidePanelWidthPx?: number
  /** Measured full height of the bottom bar (BOTTOM_BAR_HEIGHT × --hud-scale). */
  bottomBarHeightPx?: number
  /**
   * Height of the keycap bar (`--kb-hud-h`), which sits ON TOP of the right
   * side panel and is opaque. It raises the side columns' upper edge — without
   * it a body dives into a strip that looks free but is not.
   */
  keycapBarHeightPx?: number
}

export interface DrifterPoint {
  x: number
  y: number
  /** Flight heading in degrees — the body banks into its direction of travel. */
  angleDeg: number
}

/**
 * The band a drifter may fly through: the full viewport minus the header strip
 * on top and the bottom bar below. Everything else in this module works in
 * normalized (0..1) coordinates of this rectangle, so the same route reads the
 * same on Full HD and on 4K.
 *
 * Every HUD edge is passed in measured rather than assumed: header height,
 * panel width and bar height all scale with the viewport, so insets that fit
 * Full HD would let the body slide under the chrome on 4K. Omitted values fall
 * back to the constants, which is what the tests rely on.
 */
export function drifterField(
  viewportW: number,
  viewportH: number,
  insets: DrifterFieldInsets = {},
): DrifterFieldRect {
  const w = Math.max(1, viewportW)
  const top = Math.max(DRIFTER_FIELD_TOP_PX, insets.headerBottomPx ?? 0)
  const height = Math.max(1, viewportH - top - DRIFTER_FIELD_BOTTOM_PX)
  // The bottom bar is low in the middle and raised at both ends. Only the
  // raised ends matter here — they are opaque and sit above the drifter layer.
  const hudScale = Math.min(1, w / HUD_SCALE_REF_WIDTH_PX, viewportH / HUD_SCALE_REF_HEIGHT_PX)
  const sidePanelWidth = insets.sidePanelWidthPx ?? BOTTOM_BAR_SIDE_W * hudScale
  const barHeight = insets.bottomBarHeightPx ?? BOTTOM_BAR_HEIGHT * hudScale
  // The keycap bar rides on top of the right panel and is just as opaque, so
  // the columns start above it. Measured on 2K, where the drifter clipped it in
  // 14.3 % of samples while Full HD showed none — the bar scales with the HUD,
  // the flight field did not.
  const keycap = insets.keycapBarHeightPx ?? 0
  const stackedBottom = keycap > 0 ? barHeight + keycap + DRIFTER_HUD_PANEL_MARGIN_PX : barHeight
  return {
    left: 0,
    top,
    width: w,
    height,
    sidePanelWidth,
    sidePanelTop: viewportH - stackedBottom,
  }
}

/** HUD edges as the DOM currently reports them, or an empty object outside a
 *  browser. Read once per frame in the flight loop — three computed-style reads
 *  are cheap, and the HUD resizes with the window. */
export function measuredFieldInsets(): DrifterFieldInsets {
  if (typeof document === 'undefined') return {}
  const style = getComputedStyle(document.documentElement)
  const read = (name: string): number | undefined => {
    const parsed = parseFloat(style.getPropertyValue(name))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
  }
  const panel = read('--hud-panel-size')
  const scale = read('--hud-scale')
  // The level badge hangs BELOW the header bar and is opaque — measured at 194px
  // on 4K against a header that ends at 115px. `--level-badge-bottom` already
  // covers header + badge + clearance, so it is the real lower edge of the
  // chrome; `--header-total-height` alone would let the body slide under it.
  const chromeBottom = read('--level-badge-bottom') ?? read('--header-total-height')
  return {
    headerBottomPx: chromeBottom,
    sidePanelWidthPx: panel,
    bottomBarHeightPx: scale ? BOTTOM_BAR_HEIGHT * scale : undefined,
    keycapBarHeightPx: read('--kb-hud-h'),
  }
}

/** Catmull-Rom through the four control points of a route — C1-continuous, so
 *  the drifter never kinks at a waypoint. Endpoints are duplicated, which makes
 *  the curve start and end exactly on the first/last point. */
function catmullRom(
  p: ReadonlyArray<{ x: number; y: number }>,
  t: number,
): { x: number; y: number } {
  const n = p.length
  if (n === 0) return { x: 0, y: 0 }
  if (n === 1) return { x: p[0].x, y: p[0].y }

  const segments = n - 1
  const scaled = Math.min(Math.max(t, 0), 1) * segments
  const i = Math.min(Math.floor(scaled), segments - 1)
  const local = scaled - i

  const p0 = p[Math.max(i - 1, 0)]
  const p1 = p[i]
  const p2 = p[i + 1]
  const p3 = p[Math.min(i + 2, n - 1)]

  const t2 = local * local
  const t3 = t2 * local
  const blend = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (2 * b + (c - a) * local + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)

  return { x: blend(p0.x, p1.x, p2.x, p3.x), y: blend(p0.y, p1.y, p2.y, p3.y) }
}

/**
 * Push a normalized point out of the forbidden disc around the field center.
 * The sun and its click target sit there; a drifter passing over it would
 * stack two click targets on the same pixels. Routes are already authored
 * clear of the middle — this is the guard for extreme aspect ratios, where a
 * percentage of the field width is a very different distance than the same
 * percentage of its height.
 */
function pushOutOfCenter(x: number, y: number, field: DrifterFieldRect): { x: number; y: number } {
  // Work in pixels: normalized distance is meaningless on a non-square field.
  const dxPx = (x - 0.5) * field.width
  const dyPx = (y - 0.5) * field.height
  const distPx = Math.hypot(dxPx, dyPx)
  const clearPx = Math.min(field.width, field.height) * DRIFTER_CENTER_CLEARANCE
  if (distPx >= clearPx) return { x, y }
  // Straight up when the point sits dead center — any direction is as good.
  if (distPx < 0.001) return { x, y: 0.5 - clearPx / field.height }
  const scale = clearPx / distPx
  return {
    x: 0.5 + (dxPx * scale) / field.width,
    y: 0.5 + (dyPx * scale) / field.height,
  }
}

/**
 * Lift a point above the raised HUD panels at the left and right ends of the
 * bottom bar. Those panels are opaque and sit above the drifter layer, so a
 * body that dives into that corner disappears — and takes its click target with
 * it — while the player still expects to be able to reach it.
 *
 * Applied in pixels after the curve is evaluated, because a Catmull-Rom spline
 * overshoots its control points: authoring routes that stay clear on paper is
 * not enough, the drawn curve has to.
 */
function pushAboveSidePanels(
  xPx: number,
  yPx: number,
  field: DrifterFieldRect,
  bodyRadiusPx: number,
): number {
  const rightEdge = field.left + field.width
  // The body has extent: a 128px leviathan clears the panel 64px earlier than
  // its path point does. Clearing the point alone would sink half the whale.
  const halfBody = bodyRadiusPx
  const inSideColumn =
    xPx < field.left + field.sidePanelWidth + halfBody ||
    xPx > rightEdge - field.sidePanelWidth - halfBody
  if (!inSideColumn) return yPx
  // Off-screen means entry or exit — nothing is drawn there, nothing to clear.
  if (xPx < field.left - halfBody || xPx > rightEdge + halfBody) return yPx
  return Math.min(yPx, field.sidePanelTop - DRIFTER_HUD_PANEL_MARGIN_PX - halfBody)
}

/**
 * Keep the body out from under the header. Only nudges a point that is inside
 * the band to begin with: a route that genuinely exits through the top edge
 * must keep going, and the body fading out behind the header there is exactly
 * how leaving the screen should look.
 */
function pushBelowHeader(yPx: number, field: DrifterFieldRect, bodyRadiusPx: number): number {
  if (yPx < field.top) return yPx
  return Math.max(yPx, field.top + bodyRadiusPx)
}

/**
 * Dieselbe Arbeit wie die beiden Funktionen darüber, aber gegen die KONTUR des
 * HUD statt gegen ein Rechteck: die Bottom-Bar fällt in der Mitte auf einen
 * schmalen Streifen ab (rund 250 px mehr Luft als ihre Rechteckhöhe hergibt)
 * und den Header gibt es an den äusseren Rändern gar nicht.
 *
 * Die Semantik von `pushBelowHeader` bleibt: Ein Punkt, der oben oder unten
 * WIRKLICH aus dem Bild läuft, wird nicht zurückgeholt — dort verlässt eine
 * Route die Bühne, und dass der Körper dabei hinter dem Chrome verschwindet,
 * ist genau richtig.
 */
function clampToHudContour(
  xPx: number,
  yPx: number,
  bodyRadiusPx: number,
  metrics: HudFieldMetrics,
): number {
  // Über die Breite des Körpers, nicht an seinem Mittelpunkt: in der Kehle
  // neben einem Seitenpanel springt die Kontur auf wenigen Pixeln.
  const band = hudFreeBandOver(xPx, bodyRadiusPx, metrics)
  if (yPx >= band.top && yPx <= band.bottom) return yPx
  if (yPx < band.top) return yPx < 0 ? yPx : band.top + bodyRadiusPx
  return yPx > metrics.viewportH ? yPx : band.bottom - bodyRadiusPx
}

/**
 * Position of a drifter at flight progress `t` (0 = spawn, 1 = gone), in
 * viewport pixels, plus the heading it is banking into.
 *
 * The heading comes from a short finite difference rather than an analytic
 * derivative: it is one extra curve evaluation and stays correct after the
 * center-clearance nudge, which no derivative of the raw curve would know about.
 */
export function drifterPointAt(
  routeIndex: number,
  mirrored: boolean,
  t: number,
  field: DrifterFieldRect,
  bodyRadiusPx = 0,
  metrics?: HudFieldMetrics,
): DrifterPoint {
  const route = DRIFTER_ROUTES[routeIndex % DRIFTER_ROUTES.length]
  const clamped = Math.min(Math.max(t, 0), 1)

  const sample = (u: number) => {
    const raw = catmullRom(route, Math.min(Math.max(u, 0), 1))
    const mx = mirrored ? 1 - raw.x : raw.x
    const safe = pushOutOfCenter(mx, raw.y, field)
    const x = field.left + safe.x * field.width
    let y = field.top + safe.y * field.height
    if (metrics) {
      // Die Kontur kennt Header UND Bar an genau dieser Spalte und ersetzt
      // damit beide Rechteck-Klemmungen darunter.
      y = clampToHudContour(x, y, bodyRadiusPx, metrics)
    } else {
      y = pushBelowHeader(y, field, bodyRadiusPx)
      y = pushAboveSidePanels(x, y, field, bodyRadiusPx)
    }
    return { x, y }
  }

  const here = sample(clamped)
  const step = DRIFTER_TANGENT_PROBE_STEP
  const ahead = sample(clamped + step)
  const behind = sample(clamped - step)
  const dx = ahead.x - behind.x
  const dy = ahead.y - behind.y
  const angleDeg =
    Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001 ? 0 : (Math.atan2(dy, dx) * 180) / Math.PI

  return { x: here.x, y: here.y, angleDeg }
}

/**
 * The angle, in degrees, at which sunlight strikes a body standing at (x, y).
 *
 * The sun sits at the centre of the stage — the same assumption `OrbitStrikeWave`
 * builds its whole shockwave on, and the reason every route in `DRIFTER_ROUTES`
 * keeps its distance from the middle. So the lit side of a drifter always faces
 * inward, and this one number drives both the terminator across its body and
 * the direction its wake is blown.
 *
 * Quantised to `DRIFTER_LIGHT_QUANTIZE_DEG`, for the same reason
 * `ORBIT_SCALE_QUANTIZE_STEPS` exists: the compositor moves an element for
 * free, but a CHANGED transform can cost a re-raster. A drifter crosses the
 * screen in 10–26 s and turns through well under half a revolution while doing
 * it, so 5° steps are invisible.
 *
 * At the exact centre there is no direction to speak of; the function returns 0
 * there rather than whatever `atan2(0, 0)` happens to be, so a body that drifts
 * across the middle cannot flip its lighting on a rounding error.
 */
export function drifterLightAngleDeg(
  x: number,
  y: number,
  viewportW: number,
  viewportH: number,
): number {
  const dx = x - viewportW / 2
  const dy = y - viewportH / 2
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return 0
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI
  const step = DRIFTER_LIGHT_QUANTIZE_DEG
  return Math.round(deg / step) * step
}

/** Which viewport edge the drifter enters from — drives the pre-spawn edge ping.
 *  Derived from where the route's first point lies outside [0,1]. */
export function drifterEntryEdge(
  routeIndex: number,
  mirrored: boolean,
): { side: 'left' | 'right' | 'top' | 'bottom'; alongPct: number } {
  const route = DRIFTER_ROUTES[routeIndex % DRIFTER_ROUTES.length]
  const first = route[0]
  const x = mirrored ? 1 - first.x : first.x
  const y = first.y

  if (x < 0) return { side: 'left', alongPct: clamp01(y) * 100 }
  if (x > 1) return { side: 'right', alongPct: clamp01(y) * 100 }
  if (y < 0) return { side: 'top', alongPct: clamp01(x) * 100 }
  return { side: 'bottom', alongPct: clamp01(x) * 100 }
}

function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1)
}
