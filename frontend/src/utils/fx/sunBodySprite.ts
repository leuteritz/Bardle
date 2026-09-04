/* ── Der Spielerkörper als Sprite-Ebenen ────────────────────────────────────
   Komet, Plasmasonne und Schwarzes Loch werden EINMAL je Schlüssel in
   Offscreen-Canvas gerastert und als <img> gestapelt; animiert wird nur
   transform/opacity der Slots. Dasselbe Idiom wie starBodySprite.ts — Realismus
   aus dem Raster, Bewegung aus dem Compositor, keine Frame-Schleife.

   `r` ist in jedem Painter die HALBE BOX (diameter / 2); der sichtbare Körper
   liegt bei r · SUN_SPRITE_BODY_FRACTION, der Kometenfels bei r · COMET_DISC_FILL.
   Alles streut über `stage` und feste Salze, nie über Math.random.            */

import type { ForgeAxisId, SolarSignature, SunBody, SunBodyKind, SunSpriteLayer } from '@/types'
import {
  BLACK_HOLE_DISC_INNER_FRACTION,
  BLACK_HOLE_HALO_FRACTION,
  BLACK_HOLE_JET_LENGTH_FRACTION,
  BLACK_HOLE_JET_WIDTH_FRACTION,
  BLACK_HOLE_PHOTON_RING_FRACTION,
  BLACK_HOLE_SHADOW_FRACTION,
  BLACK_HOLE_DOPPLER_STRENGTH,
  COMET_DISC_FILL,
  COMET_GOLD_VEINS_BY_STAGE,
  COMET_JET_MIN_STAGE,
  COMET_PHASE_DATA,
  COMET_STAGE_GOLD,
  SOLAR_BRANCHES,
  SOLAR_SIGNATURE_BASE_STAGES,
  SOLAR_SIGNATURE_BH_DOPPLER_GAIN,
  SOLAR_SIGNATURE_BH_HALO_GAIN,
  SOLAR_SIGNATURE_BH_INNER_GAIN,
  SOLAR_SIGNATURE_BH_JET_GAIN,
  SOLAR_SIGNATURE_BH_RING_GAIN,
  SOLAR_SIGNATURE_STAGES,
  STAR_PHASE_DATA,
  STAR_PHASE_FINAL_INDEX,
  SUN_COMET_ION_RGB,
  SUN_CORONA_STREAMERS_BY_PHASE,
  SUN_FLARE_PLUMES,
  SUN_GRANULE_SIZE_BY_PHASE,
  SUN_SPOT_GROUPS_BY_PHASE,
  SUN_SPRITE_BODY_FRACTION,
  SUN_SPRITE_CANVAS_MAX,
  SUN_SPRITE_CORE_MAX_BACKING_PX,
  SUN_SPRITE_CROSSFADE_MS,
  SUN_SPRITE_DETAIL_PX_1,
  SUN_SPRITE_DETAIL_PX_2,
  SUN_SPRITE_MAX_BACKING_PX,
  SUN_SPRITE_SPAN,
  SUN_SPRITE_URL_MAX,
  SUN_WAKE_PHASE_GAIN,
  SUN_WAKE_STREAKS_MIN,
  SUN_WAKE_STREAKS_RANGE,
} from '@/config/constants'
import {
  bodyFill,
  circle,
  clampSpriteDpr,
  crater,
  createSpriteCache,
  flareLoop,
  grain,
  haloGlow,
  jitter,
  lumpyPath,
  mix,
  newSpriteCanvas,
  paintTerminator,
  rgba,
  spike,
  sway,
  wisp,
  type Rgb,
} from '@/utils/fx/spaceBody'
import { solarSignatureStages, sunSignatureKey } from '@/utils/game/solarSignature'
import { hexToRgb } from '@/utils/ui/format'

const TAU = Math.PI * 2
const GOLDEN = 2.399963

/** Zwei Farben mischen — `mix()` aus spaceBody kennt nur Weiss/Schwarz als Ziel. */
function blend(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

export type SunDetail = 0 | 1 | 2

export interface SunPalette {
  core: Rgb
  mid: Rgb
  edge: Rgb
  glow: Rgb
  axis: Record<ForgeAxisId, Rgb>
}

export type SunPaint = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  pal: SunPalette,
  body: SunBody,
  detail: SunDetail,
) => void

/* ── Körper, Palette, Schlüssel ─────────────────────────────────────────────── */

const AXIS_RGB = Object.fromEntries(
  SOLAR_BRANCHES.map((ray) => [ray.id, hexToRgb(ray.color)]),
) as unknown as Record<ForgeAxisId, Rgb>

export function sunPaletteFor(body: SunBody): SunPalette {
  if (body.kind === 'comet') {
    const c = COMET_PHASE_DATA
    return {
      core: hexToRgb(c.core),
      mid: hexToRgb(c.mid),
      edge: hexToRgb(c.edge),
      glow: hexToRgb(c.glow),
      axis: AXIS_RGB,
    }
  }
  const p = STAR_PHASE_DATA[body.kind === 'blackHole' ? STAR_PHASE_FINAL_INDEX : body.stage] ?? STAR_PHASE_DATA[0]
  return {
    core: hexToRgb(p.core),
    mid: hexToRgb(p.mid),
    edge: hexToRgb(p.edge),
    glow: hexToRgb(p.phaseGlow),
    axis: AXIS_RGB,
  }
}

export function sunBodyFor(
  solar: { isCometState: boolean; cometStage: number; starPhase: number },
  sig: SolarSignature,
): SunBody {
  const stages = solarSignatureStages(sig)
  if (solar.isCometState) return { kind: 'comet', stage: solar.cometStage, sig: stages }
  if (solar.starPhase >= STAR_PHASE_FINAL_INDEX)
    return { kind: 'blackHole', stage: STAR_PHASE_FINAL_INDEX, sig: stages }
  return { kind: 'star', stage: solar.starPhase, sig: stages }
}

export function sunSpriteDetail(px: number): SunDetail {
  if (px < SUN_SPRITE_DETAIL_PX_1) return 0
  if (px < SUN_SPRITE_DETAIL_PX_2) return 1
  return 2
}

/** Welche Ebenen ein Körper auf einer Detailstufe trägt — in DOM-Reihenfolge. */
export function sunSpriteLayers(body: SunBody, detail: SunDetail, wake: boolean): SunSpriteLayer[] {
  const out: SunSpriteLayer[] = []
  if (body.kind === 'star') {
    out.push('halo', 'core')
    if (detail >= 2) out.push('surfaceA', 'surfaceB')
    if (detail >= 1) out.push('corona')
    if (detail >= 2) out.push('flare')
  } else if (body.kind === 'comet') {
    out.push('coma', 'core')
    if (detail >= 2 && body.stage >= COMET_JET_MIN_STAGE) out.push('jets')
  } else {
    if (detail >= 1) out.push('bhJets')
    out.push('bhHalo', 'bhDisc', 'bhShadow')
    if (detail >= 1) out.push('bhRing', 'bhGlaze')
  }
  if (wake && detail >= 1) out.push('wake')
  return out
}

export function sunSpriteKey(
  layer: SunSpriteLayer | 'all',
  body: SunBody,
  px: number,
  dpr: number,
  detail: SunDetail,
): string {
  return `${layer}|${body.kind}|${body.stage}|${sunSignatureKey(body.sig)}|${Math.round(px)}|${dpr}|${detail}`
}

const CORE_BACKED: ReadonlySet<SunSpriteLayer> = new Set([
  'core',
  'surfaceA',
  'surfaceB',
  'bhDisc',
  'bhGlaze',
  'bhShadow',
])

/** Kante in CSS-px und der effektive dpr unter dem Backing-Deckel. */
export function sunSpriteBacking(
  px: number,
  layer: SunSpriteLayer,
  dpr: number,
): { span: number; dpr: number } {
  const span = Math.round(px * SUN_SPRITE_SPAN[layer])
  const cap = CORE_BACKED.has(layer) ? SUN_SPRITE_CORE_MAX_BACKING_PX : SUN_SPRITE_MAX_BACKING_PX
  const d = Math.min(clampSpriteDpr(dpr), cap / Math.max(1, span))
  return { span, dpr: Math.max(0.25, Math.round(d * 100) / 100) }
}

/* ── Gemeinsame Bausteine ───────────────────────────────────────────────────── */

function stageRow(body: SunBody, key: keyof SunBody['sig']) {
  const i = body.sig[key]
  return SOLAR_SIGNATURE_STAGES[Math.min(i, SOLAR_SIGNATURE_STAGES.length - 1)] ?? SOLAR_SIGNATURE_STAGES[0]
}

function baseRow(body: SunBody) {
  const i = body.sig.base
  return SOLAR_SIGNATURE_BASE_STAGES[Math.min(i, SOLAR_SIGNATURE_BASE_STAGES.length - 1)] ?? SOLAR_SIGNATURE_BASE_STAGES[0]
}

function stageT(body: SunBody, key: keyof SunBody['sig']): number {
  return body.sig[key] / (SOLAR_SIGNATURE_STAGES.length - 1)
}

/** Eine Konvektionszelle: heller Kern, dunkler Saum. */
function granule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cr: number,
  hi: Rgb,
  lo: Rgb,
  alpha: number,
  rim = 0.7,
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, cr)
  g.addColorStop(0, rgba(hi, alpha))
  g.addColorStop(0.55, rgba(hi, 0))
  g.addColorStop(0.82, rgba(lo, alpha * rim))
  g.addColorStop(1, rgba(lo, 0))
  circle(ctx, x, y, cr)
  ctx.fillStyle = g
  ctx.fill()
}

/** Zellen in einem versetzten Raster innerhalb `reach`, je Zelle leicht verschoben. */
function granulation(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  reach: number,
  cell: number,
  seed: number,
  hi: Rgb,
  lo: Rgb,
  alpha: number,
  cap: number,
  rim = 0.7,
): void {
  const step = cell * 1.7
  const rows = Math.ceil(reach / step)
  let n = 0
  for (let gy = -rows; gy <= rows && n < cap; gy++) {
    const off = (gy & 1) * step * 0.5
    for (let gx = -rows; gx <= rows && n < cap; gx++) {
      const cx = gx * step + off + sway(seed, gx * 31 + gy) * step * 0.35
      const cy = gy * step * 0.88 + sway(seed, gx + gy * 47) * step * 0.35
      const d = Math.hypot(cx, cy)
      if (d > reach) continue
      const cr = cell * (0.7 + jitter(seed, gx * 7 + gy * 13) * 0.6)
      granule(ctx, x + cx, y + cy, cr, hi, lo, alpha * (1 - (d / reach) * 0.35), rim)
      n++
    }
  }
}

/** Randweiche Kreismaske: voll bis `from`, aus bei `to`. */
function fadeMask(ctx: CanvasRenderingContext2D, x: number, y: number, from: number, to: number): void {
  const g = ctx.createRadialGradient(x, y, from, x, y, to)
  g.addColorStop(0, 'rgba(0, 0, 0, 1)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = g
  ctx.fillRect(x - to, y - to, to * 2, to * 2)
  ctx.restore()
}

/** Ein Streifen entlang `a` von `from` bis `to` mit Höhepunkt der Deckkraft bei 70 %. */
function streak(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  a: number,
  from: number,
  to: number,
  w: number,
  rgb: Rgb,
  alpha: number,
): void {
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const g = ctx.createLinearGradient(x + ca * from, y + sa * from, x + ca * to, y + sa * to)
  g.addColorStop(0, rgba(rgb, 0))
  g.addColorStop(0.7, rgba(rgb, alpha))
  g.addColorStop(1, rgba(rgb, 0))
  ctx.strokeStyle = g
  ctx.lineWidth = w
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x + ca * from, y + sa * from)
  ctx.lineTo(x + ca * to, y + sa * to)
  ctx.stroke()
}

/** Ein Ring [r0, r1] mit radialem Verlauf. */
function annulus(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r0: number,
  r1: number,
  stops: readonly [number, string][],
): void {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1)
  for (const [t, c] of stops) g.addColorStop(t, c)
  ctx.beginPath()
  ctx.arc(x, y, r1, 0, TAU)
  ctx.arc(x, y, r0, 0, TAU, true)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
}

/* ── Plasmasonne ────────────────────────────────────────────────────────────── */

/** Je Phase: Hotspot-Versatz, Limbus-Stärke, Randweichheit (Riesen haben eine
 *  ausgedehnte Atmosphäre), Staubkokon (Protostern). */
const STAR_TUNING = [
  { hot: 0.55, limb: 0.75, soft: 0.06, dusty: true, giant: false },
  { hot: 0.95, limb: 1.15, soft: 0.02, dusty: false, giant: false },
  { hot: 0.85, limb: 1.0, soft: 0.025, dusty: false, giant: false },
  { hot: 0.6, limb: 0.85, soft: 0.05, dusty: false, giant: true },
  { hot: 0.4, limb: 0.6, soft: 0.1, dusty: false, giant: true },
] as const

function tuning(stage: number) {
  return STAR_TUNING[Math.min(Math.max(0, stage), STAR_TUNING.length - 1)]
}

const paintStarHalo: SunPaint = (ctx, x, y, r, pal, body, detail) => {
  const br = r * SUN_SPRITE_BODY_FRACTION
  const t = tuning(body.stage)
  const corona = stageRow(body, 'corona').coronaAlpha + baseRow(body).coronaLift
  const reach = (t.giant ? 2.4 : 2.1) + corona * 1.2
  haloGlow(ctx, x, y, br, pal.glow, Math.min(reach, 3.4), 0.42 + corona * 0.5)
  // Innerer Schein: die Chromosphäre strahlt über den Rand
  annulus(ctx, x, y, br * 0.92, br * 1.42, [
    [0, rgba(mix(pal.glow, 255, 0.5), 0.55)],
    [0.5, rgba(pal.glow, 0.18)],
    [1, rgba(pal.glow, 0)],
  ])
  if (t.dusty && detail >= 1) {
    // Protostern: der Kokon aus Staub, in dem er sitzt
    const dust = mix(pal.edge, 0, 0.35)
    const n = detail === 2 ? 7 : 4
    for (let i = 0; i < n; i++) {
      const a = i * GOLDEN + sway(body.stage + 1, 500 + i) * 0.6
      const d = br * (1.35 + jitter(3, 510 + i) * 0.7)
      wisp(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, br * (0.5 + jitter(3, 520 + i) * 0.4), 60 + i, dust, 0.22)
    }
  }
  if (t.giant && detail >= 1) {
    // Roter Riese: die abgeworfene Staubschale
    annulus(ctx, x, y, br * 1.5, br * 2.3, [
      [0, rgba(mix(pal.edge, 0, 0.2), 0)],
      [0.4, rgba(mix(pal.edge, 0, 0.2), 0.16)],
      [1, rgba(pal.edge, 0)],
    ])
  }
}

/** Sonnenflecken: Umbra plus Penumbra, perspektivisch zum Rand hin gestaucht. */
function sunspots(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  br: number,
  seed: number,
  groups: number,
  dark: Rgb,
): void {
  for (let g = 0; g < groups; g++) {
    const lat = (jitter(seed, 700 + g) - 0.5) * 1.1
    const lon = sway(seed, 710 + g) * 0.72
    const spots = 1 + Math.floor(jitter(seed, 720 + g) * 3)
    for (let s = 0; s < spots; s++) {
      const px = lon + sway(seed, 730 + g * 5 + s) * 0.12
      const py = lat + sway(seed, 740 + g * 5 + s) * 0.06
      const d = Math.hypot(px, py)
      if (d > 0.82) continue
      const squash = Math.sqrt(Math.max(0.15, 1 - d * d))
      const size = br * 0.05 * (0.6 + jitter(seed, 750 + g * 5 + s) * 0.8)
      const ang = Math.atan2(py, px)
      const cx = x + px * br
      const cy = y + py * br
      ctx.beginPath()
      ctx.ellipse(cx, cy, size * 2.1, size * 2.1 * squash, ang, 0, TAU)
      ctx.fillStyle = rgba(dark, 0.32)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(cx, cy, size, size * squash, ang, 0, TAU)
      ctx.fillStyle = rgba(mix(dark, 0, 0.5), 0.88)
      ctx.fill()
    }
  }
}

/** Die sieben festen Funkenorte (chimesPerClick) — gewürfelt sässen sie bei
 *  jedem Re-Render woanders. */
const SPARK_SPOTS: readonly [number, number, number][] = [
  [0.24, -0.38, 1],
  [-0.32, 0.16, 0.8],
  [0.42, 0.28, 0.7],
  [-0.1, -0.22, 0.6],
  [0.1, 0.5, 0.75],
  [-0.44, -0.16, 0.55],
  [0.32, 0, 0.65],
]

const paintStarCore: SunPaint = (ctx, x, y, r, pal, body, detail) => {
  const br = r * SUN_SPRITE_BODY_FRACTION
  const t = tuning(body.stage)
  const base = baseRow(body)
  const hi = mix(pal.core, 255, Math.min(1, 0.4 + base.coreLift * 2))
  // Photosphäre: hell in der Mitte, Randverdunkelung, weicher Rand je Atmosphäre
  circle(ctx, x, y, br)
  const g = ctx.createRadialGradient(x - br * 0.08 * t.hot, y - br * 0.1 * t.hot, br * 0.04, x, y, br)
  g.addColorStop(0, rgba(hi, 1))
  g.addColorStop(0.32, rgba(pal.core, 1))
  g.addColorStop(0.66, rgba(pal.mid, 1))
  g.addColorStop(0.9, rgba(pal.edge, 1))
  g.addColorStop(1 - t.soft, rgba(mix(pal.edge, 0, 0.25), 1))
  g.addColorStop(1, rgba(mix(pal.edge, 0, 0.35), 0.35))
  ctx.fillStyle = g
  ctx.fill()

  if (detail >= 1) {
    grain(ctx, x, y, br, t.giant ? 0.08 : 0.14)
    const cell = br * SUN_GRANULE_SIZE_BY_PHASE[Math.min(body.stage, SUN_GRANULE_SIZE_BY_PHASE.length - 1)]
    const gran = stageRow(body, 'granule')
    const cellScale = gran.granuleSizePct > 0 ? 0.55 + (gran.granuleSizePct / 30) * 0.45 : 1
    ctx.save()
    circle(ctx, x, y, br * 0.985)
    ctx.clip()
    granulation(
      ctx,
      x,
      y,
      br * 0.94,
      cell * cellScale,
      11 + body.stage,
      mix(pal.core, 255, 0.35),
      mix(pal.edge, 0, 0.3),
      (t.giant ? 0.26 : 0.16) + gran.granuleAlpha * 0.9,
      detail === 2 ? 420 : 160,
      // Riesenzellen ohne dunklen Saum — mit Saum lasen sie sich als Blasen
      t.giant ? 0.22 : 0.7,
    )
    if (t.dusty) {
      // Protostern: dunkle Staubfetzen auf der noch kühlen Oberfläche
      const dust = mix(pal.edge, 0, 0.55)
      for (let i = 0; i < 4; i++) {
        const a = i * GOLDEN + sway(5, 800 + i) * 0.6
        const d = br * (0.2 + jitter(5, 810 + i) * 0.55)
        wisp(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, br * (0.28 + jitter(5, 820 + i) * 0.2), 90 + i, dust, 0.3)
      }
    }
    // Riesen tragen keine Flecken — ihre Oberfläche sind wenige riesige Zellen
    if (!t.giant) {
      sunspots(
        ctx,
        x,
        y,
        br,
        21 + body.stage * 3,
        SUN_SPOT_GROUPS_BY_PHASE[Math.min(body.stage, SUN_SPOT_GROUPS_BY_PHASE.length - 1)],
        mix(pal.edge, 0, 0.55),
      )
    }
    ctx.restore()
  }

  // Randverdunkelung als eigener Pass — sie liegt ÜBER Flecken und Zellen
  annulus(ctx, x, y, br * 0.6, br, [
    [0, 'rgba(0, 0, 0, 0)'],
    [0.7, rgba(mix(pal.edge, 0, 0.5), 0.22 * t.limb)],
    [1, rgba(mix(pal.edge, 0, 0.6), 0.5 * t.limb)],
  ])

  // Kernfunken (chimesPerClick): Fackeln an festen Orten
  const spark = stageRow(body, 'spark')
  if (spark.sparkAlpha > 0) {
    const tone = mix(pal.axis.chimesPerClick, 255, 0.74)
    for (const [sx, sy, w] of SPARK_SPOTS) {
      const fr = br * 0.07 * w
      const fx = x + sx * br
      const fy = y + sy * br
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr)
      fg.addColorStop(0, rgba(tone, spark.sparkAlpha * 1.4))
      fg.addColorStop(1, rgba(tone, 0))
      circle(ctx, fx, fy, fr)
      ctx.fillStyle = fg
      ctx.fill()
    }
  }

  // Chromosphäre: der dünne helle Saum, immer da — der Schutzsaum (maxHp) verbreitert ihn
  const limb = stageRow(body, 'limb')
  const limbTone = mix(blend(pal.axis.maxHp, pal.edge, 0.62), 255, 0.25)
  annulus(ctx, x, y, br * (0.94 - limb.limbWidth * 2), br * (1.04 + limb.limbWidth * 1.5), [
    [0, rgba(limbTone, 0)],
    [0.55, rgba(mix(pal.mid, 255, 0.3), 0.22 + limb.limbAlpha * 0.45)],
    [1, rgba(limbTone, 0)],
  ])
}

function paintSurface(seedSalt: number, cellMul: number): SunPaint {
  return (ctx, x, y, r, pal, body) => {
    const br = r * SUN_SPRITE_BODY_FRACTION
    const gran = stageRow(body, 'granule')
    const cell = br * SUN_GRANULE_SIZE_BY_PHASE[Math.min(body.stage, SUN_GRANULE_SIZE_BY_PHASE.length - 1)] * cellMul
    granulation(
      ctx,
      x,
      y,
      br * 0.9,
      cell,
      seedSalt + body.stage * 5,
      mix(pal.core, 255, 0.4),
      mix(pal.edge, 0, 0.35),
      0.1 + gran.granuleAlpha * 0.6,
      360,
      tuning(body.stage).giant ? 0.22 : 0.7,
    )
    // Zum Rand hin auslaufen — sonst dreht sich eine sichtbare Kante
    fadeMask(ctx, x, y, br * 0.6, br * 0.88)
  }
}

const paintStarCorona: SunPaint = (ctx, x, y, r, pal, body, detail) => {
  const br = r * SUN_SPRITE_BODY_FRACTION
  const t = tuning(body.stage)
  const seed = 31 + body.stage * 7
  const n = SUN_CORONA_STREAMERS_BY_PHASE[Math.min(body.stage, SUN_CORONA_STREAMERS_BY_PHASE.length - 1)]
  const corona = stageRow(body, 'corona')
  const streamerAlpha = (t.giant ? 0.14 : 0.2) + corona.coronaAlpha * 0.5
  const tone = mix(pal.glow, 255, 0.35)
  // Streamer: getaperte Fächer, gegen die Drehrichtung leicht gekippt
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + sway(seed, 900 + i) * 0.28
    const len = br * (1.7 + jitter(seed, 910 + i) * 0.9 + corona.coronaAlpha * 1.2)
    const w = br * (0.09 + jitter(seed, 920 + i) * 0.12)
    spike(ctx, x, y, a + 0.06, br * 0.98, Math.min(len, r * 2.3), w)
    const g = ctx.createRadialGradient(x, y, br, x, y, len)
    g.addColorStop(0, rgba(tone, streamerAlpha))
    g.addColorStop(0.5, rgba(pal.glow, streamerAlpha * 0.5))
    g.addColorStop(1, rgba(pal.glow, 0))
    ctx.fillStyle = g
    ctx.fill()
    if (detail < 2) continue
    spike(ctx, x, y, a + 0.06, br * 0.98, Math.min(len * 0.62, r * 2.2), w * 0.3)
    ctx.fillStyle = rgba(mix(pal.glow, 255, 0.6), streamerAlpha * 0.55)
    ctx.fill()
  }
  if (detail === 2) {
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * TAU
      const d = br * (1.25 + jitter(seed, 930 + i) * 0.35)
      wisp(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, br * 0.32, seed * 3 + i, pal.glow, 0.09)
    }
  }
  // Protuberanzen: natürliche je Phase plus die der Schadensachse
  const prom = stageRow(body, 'prom')
  const natural = [1, 1, 2, 3, 3][Math.min(body.stage, 4)]
  const loops = natural + prom.prominenceArcs
  const promTone = mix(blend(pal.axis.dmgPerClick, pal.mid, 0.72), 255, 0.2)
  ctx.lineCap = 'round'
  for (let i = 0; i < loops; i++) {
    const a = jitter(seed, 940) * TAU + i * GOLDEN + sway(seed, 950 + i) * 0.3
    // Breite und Höhe streuen stark — gleich grosse Bögen wären ein Zahnkranz
    const spread = 0.08 + jitter(seed, 960 + i) * 0.22
    const rise = 0.06 + jitter(seed, 970 + i) * 0.3 + prom.prominenceHeight * 2.2
    flareLoop(ctx, x, y, br, a, spread, rise)
    ctx.strokeStyle = rgba(promTone, 0.16 + prom.prominenceAlpha * 0.3)
    ctx.lineWidth = Math.max(1, br * 0.11)
    ctx.stroke()
    flareLoop(ctx, x, y, br, a, spread * 0.92, rise * 0.96)
    ctx.strokeStyle = rgba(promTone, 0.28 + prom.prominenceAlpha * 0.3)
    ctx.lineWidth = Math.max(0.8, br * 0.05)
    ctx.stroke()
    flareLoop(ctx, x, y, br, a, spread * 0.8, rise * 0.9)
    ctx.strokeStyle = rgba(mix(promTone, 255, 0.45), 0.36 + prom.prominenceAlpha * 0.35)
    ctx.lineWidth = Math.max(0.5, br * 0.018)
    ctx.stroke()
  }
}

const paintStarFlare: SunPaint = (ctx, x, y, r, pal, body) => {
  const br = r * SUN_SPRITE_BODY_FRACTION
  const seed = 41 + body.stage * 3
  const tone = mix(pal.core, 255, 0.5)
  ctx.lineCap = 'round'
  for (let i = 0; i < SUN_FLARE_PLUMES; i++) {
    const a = jitter(seed, 1000 + i) * TAU
    const spread = 0.1 + jitter(seed, 1010 + i) * 0.08
    const rise = 0.45 + jitter(seed, 1020 + i) * 0.4
    flareLoop(ctx, x, y, br, a, spread, rise)
    ctx.strokeStyle = rgba(pal.glow, 0.35)
    ctx.lineWidth = Math.max(1.2, br * 0.1)
    ctx.stroke()
    flareLoop(ctx, x, y, br, a, spread, rise)
    ctx.strokeStyle = rgba(tone, 0.9)
    ctx.lineWidth = Math.max(0.7, br * 0.03)
    ctx.stroke()
    // Auswurf: Funken entlang der Plume-Achse
    ctx.fillStyle = rgba(tone, 0.85)
    for (let k = 0; k < 5; k++) {
      const d = br * (1.15 + rise * (0.3 + k * 0.18))
      const wa = a + sway(seed, 1030 + i * 9 + k) * spread * 1.6
      circle(ctx, x + Math.cos(wa) * d, y + Math.sin(wa) * d, br * (0.02 + jitter(seed, 1040 + k) * 0.015))
      ctx.fill()
    }
  }
}

/* ── Wake — der Schweif, der auf die Kamera zukommt ─────────────────────────── */

function wakeCount(body: SunBody): number {
  const wake = stageRow(body, 'wake').wakeBonus
  const stage = body.kind === 'blackHole' ? 5 : body.stage
  const t = Math.min(1, wake + stage * SUN_WAKE_PHASE_GAIN)
  return Math.round(SUN_WAKE_STREAKS_MIN + SUN_WAKE_STREAKS_RANGE * t)
}

const paintWake: SunPaint = (ctx, x, y, r, pal, body) => {
  const inner = body.kind === 'comet' ? r * COMET_DISC_FILL : r * SUN_SPRITE_BODY_FRACTION
  const n = wakeCount(body)
  const seed = 51 + body.stage
  const comet = body.kind === 'comet'
  const dust = comet ? pal.glow : mix(pal.glow, 255, 0.3)
  const gold = comet ? Math.min(1, COMET_STAGE_GOLD[Math.min(body.stage, COMET_STAGE_GOLD.length - 1)] + baseRow(body).cometGoldLift) : 1
  const dustTone = comet ? blend(mix(pal.core, 255, 0.45), dust, gold) : dust
  for (let i = 0; i < n; i++) {
    const a = i * GOLDEN + sway(seed, 1100 + i) * 0.12
    const ion = comet && i % 3 === 0
    const from = inner * (1.05 + jitter(seed, 1110 + i) * 0.45)
    const len = r * (ion ? 0.7 + jitter(seed, 1120 + i) * 0.9 : 0.3 + jitter(seed, 1120 + i) * 0.75)
    const to = Math.min(from + len, r * 1.96)
    const w = Math.max(0.5, r * (ion ? 0.004 : 0.006 + jitter(seed, 1130 + i) * 0.012))
    const alpha = (ion ? 0.3 : 0.28) + jitter(seed, 1140 + i) * 0.4
    streak(ctx, x, y, a, from, to, w, ion ? SUN_COMET_ION_RGB : dustTone, alpha)
  }
}

/* ── Komet ──────────────────────────────────────────────────────────────────── */

const COMET_SEED = 7

function cometGold(body: SunBody): number {
  return Math.min(
    1,
    COMET_STAGE_GOLD[Math.min(body.stage, COMET_STAGE_GOLD.length - 1)] + baseRow(body).cometGoldLift,
  )
}

const paintComa: SunPaint = (ctx, x, y, r, pal, body, detail) => {
  const nr = r * COMET_DISC_FILL
  const gold = cometGold(body)
  const st = body.stage / (COMET_STAGE_GOLD.length - 1)
  const gas = mix(SUN_COMET_ION_RGB, 255, 0.45)
  const tone = blend(gas, pal.glow, gold * 0.6)
  const reach = nr * (1.25 + st * 0.55)
  const ox = x - nr * 0.12
  const oy = y - nr * 0.12
  const g = ctx.createRadialGradient(ox, oy, nr * 0.55, ox, oy, reach)
  g.addColorStop(0, rgba(tone, 0.34 + st * 0.16))
  g.addColorStop(0.45, rgba(tone, 0.14 + st * 0.08))
  g.addColorStop(1, rgba(tone, 0))
  circle(ctx, ox, oy, reach)
  ctx.fillStyle = g
  ctx.fill()
  if (detail === 0) return
  const n = detail === 2 ? 5 : 3
  for (let i = 0; i < n; i++) {
    const a = i * GOLDEN + sway(COMET_SEED, 1200 + i) * 0.5
    const d = nr * (0.9 + jitter(COMET_SEED, 1210 + i) * 0.5)
    wisp(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, nr * (0.35 + jitter(COMET_SEED, 1220 + i) * 0.3), 80 + i, tone, 0.12 + st * 0.08)
  }
}

const paintCometCore: SunPaint = (ctx, x, y, r, pal, body, detail) => {
  const nr = r * COMET_DISC_FILL
  const gold = cometGold(body)
  lumpyPath(ctx, x, y, nr, COMET_SEED, 0.09)
  ctx.fillStyle = bodyFill(
    ctx,
    x,
    y,
    nr,
    rgba(mix(pal.core, 255, 0.12), 1),
    rgba(pal.mid, 1),
    rgba(pal.edge, 1),
  )
  ctx.fill()
  if (detail >= 1) grain(ctx, x, y, nr, 0.42)
  ctx.save()
  lumpyPath(ctx, x, y, nr, COMET_SEED, 0.09)
  ctx.clip()
  const craters = detail === 0 ? 3 : detail === 1 ? 6 : 9
  const rim = rgba(mix(pal.core, 255, 0.45), 1)
  for (let i = 0; i < craters; i++) {
    const a = jitter(COMET_SEED, 1300 + i) * TAU
    const d = nr * (0.15 + jitter(COMET_SEED, 1310 + i) * 0.7)
    const cr = nr * (0.05 + jitter(COMET_SEED, 1320 + i) * 0.1)
    crater(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, cr, rim)
  }
  // Goldadern: der Stern, der im Fels erwacht
  const veins = COMET_GOLD_VEINS_BY_STAGE[Math.min(body.stage, COMET_GOLD_VEINS_BY_STAGE.length - 1)]
  if (veins > 0 && gold > 0) {
    ctx.lineCap = 'round'
    for (let i = 0; i < veins; i++) {
      const a = jitter(COMET_SEED, 1400 + i) * TAU
      const bend = sway(COMET_SEED, 1410 + i) * 0.5
      const d0 = nr * (0.1 + jitter(COMET_SEED, 1420 + i) * 0.25)
      const d1 = nr * (0.55 + jitter(COMET_SEED, 1430 + i) * 0.4)
      const mid = (d0 + d1) / 2
      const path = () => {
        ctx.beginPath()
        ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0)
        ctx.quadraticCurveTo(
          x + Math.cos(a + bend) * mid,
          y + Math.sin(a + bend) * mid,
          x + Math.cos(a + bend * 0.4) * d1,
          y + Math.sin(a + bend * 0.4) * d1,
        )
      }
      path()
      ctx.strokeStyle = rgba(pal.glow, 0.32 * gold)
      ctx.lineWidth = Math.max(1, nr * 0.06)
      ctx.stroke()
      path()
      ctx.strokeStyle = rgba(mix(pal.glow, 255, 0.5), 0.95 * gold)
      ctx.lineWidth = Math.max(0.5, nr * 0.018)
      ctx.stroke()
    }
    const glow = ctx.createRadialGradient(x, y, 0, x, y, nr * 0.8)
    glow.addColorStop(0, rgba(pal.glow, 0.22 * gold))
    glow.addColorStop(1, rgba(pal.glow, 0))
    circle(ctx, x, y, nr * 0.8)
    ctx.fillStyle = glow
    ctx.fill()
  }
  ctx.restore()
  // Sonnenseite oben links — der Terminator läuft als letzter Pass über alles
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.PI / 4)
  ctx.translate(-x, -y)
  paintTerminator(ctx, x * 2, nr)
  ctx.restore()
}

const paintCometJets: SunPaint = (ctx, x, y, r, pal, body) => {
  const nr = r * COMET_DISC_FILL
  const n = 2 + Math.min(2, body.stage - COMET_JET_MIN_STAGE)
  const tone = mix(SUN_COMET_ION_RGB, 255, 0.6)
  for (let i = 0; i < n; i++) {
    // Ausgasung von der Lichtseite (oben links)
    const a = -Math.PI * 0.75 + sway(COMET_SEED, 1500 + i) * 0.9
    const len = nr * (1.5 + jitter(COMET_SEED, 1510 + i) * 0.5)
    spike(ctx, x, y, a, nr * 0.9, len, nr * 0.1)
    const g = ctx.createRadialGradient(x, y, nr * 0.85, x, y, len)
    g.addColorStop(0, rgba(tone, 0.55))
    g.addColorStop(1, rgba(tone, 0))
    ctx.fillStyle = g
    ctx.fill()
    circle(ctx, x + Math.cos(a) * nr * 0.95, y + Math.sin(a) * nr * 0.95, nr * 0.04)
    ctx.fillStyle = rgba(mix(pal.glow, 255, 0.6), 0.9)
    ctx.fill()
  }
}

/* ── Schwarzes Loch — thermisch ─────────────────────────────────────────────── */

function bhGeom(r: number, body: SunBody) {
  const px = r * 2
  const gainT = (key: keyof SunBody['sig']) => stageT(body, key)
  return {
    shadow: (px * BLACK_HOLE_SHADOW_FRACTION) / 2,
    ring: px * BLACK_HOLE_PHOTON_RING_FRACTION * (1 + gainT('limb') * SOLAR_SIGNATURE_BH_RING_GAIN),
    inner: ((px * BLACK_HOLE_DISC_INNER_FRACTION) / 2) * (1 - gainT('granule') * SOLAR_SIGNATURE_BH_INNER_GAIN),
    outer: r * 0.96,
    halo: ((px * BLACK_HOLE_HALO_FRACTION) / 2) * (1 + gainT('limb') * SOLAR_SIGNATURE_BH_HALO_GAIN),
    dop: Math.min(0.95, BLACK_HOLE_DOPPLER_STRENGTH * (1 + gainT('prom') * SOLAR_SIGNATURE_BH_DOPPLER_GAIN)),
    jet: 1 + gainT('wake') * SOLAR_SIGNATURE_BH_JET_GAIN,
  }
}

const paintBhDisc: SunPaint = (ctx, x, y, r, pal, body, detail) => {
  const g = bhGeom(r, body)
  const white: Rgb = [255, 255, 255]
  annulus(ctx, x, y, g.inner, g.outer, [
    [0, rgba(white, 1)],
    [0.12, rgba(mix(pal.mid, 255, 0.35), 1)],
    [0.35, rgba(pal.mid, 1)],
    [0.62, rgba(pal.edge, 0.95)],
    [0.86, rgba(mix(pal.edge, 0, 0.45), 0.6)],
    [1, rgba(mix(pal.edge, 0, 0.6), 0)],
  ])
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, g.outer, 0, TAU)
  ctx.arc(x, y, g.inner, 0, TAU, true)
  ctx.clip()
  // Turbulenz: Bahnstreifen, hell und dunkel
  const seed = 61
  const arcs = detail === 0 ? 40 : detail === 1 ? 90 : 160
  for (let i = 0; i < arcs; i++) {
    const rr = g.inner + jitter(seed, 1600 + i) * (g.outer - g.inner)
    const a0 = jitter(seed, 1610 + i) * TAU
    const sweep = 0.25 + jitter(seed, 1620 + i) * 1.4
    const bright = jitter(seed, 1630 + i) > 0.5
    ctx.beginPath()
    ctx.arc(x, y, rr, a0, a0 + sweep)
    ctx.strokeStyle = bright ? rgba(white, 0.16 + jitter(seed, 1640 + i) * 0.2) : rgba(mix(pal.edge, 0, 0.7), 0.18 + jitter(seed, 1640 + i) * 0.22)
    ctx.lineWidth = Math.max(0.6, r * (0.004 + jitter(seed, 1650 + i) * 0.012))
    ctx.stroke()
  }
  if (detail >= 1) {
    circle(ctx, x, y, g.outer)
    grain(ctx, x, y, g.outer, 0.22)
  }
  // Keil-Lücken: ohne sie mittelt sich die Scheibe zu einem Band und die Drehung ist unsichtbar
  const gaps = 4
  for (let i = 0; i < gaps; i++) {
    const a = (i / gaps) * TAU + jitter(seed, 1700 + i) * 0.9
    const w = 0.16 + jitter(seed, 1710 + i) * 0.14
    for (let k = 0; k < 3; k++) {
      const ww = w * (1 - k * 0.3)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.arc(x, y, g.outer * 1.02, a - ww, a + ww)
      ctx.closePath()
      ctx.fillStyle = rgba(mix(pal.edge, 0, 0.8), 0.16)
      ctx.fill()
    }
  }
  ctx.restore()
  // Innenrand: das Heisseste der Scheibe
  annulus(ctx, x, y, g.inner * 0.97, g.inner + r * 0.07, [
    [0, rgba(white, 0.95)],
    [0.5, rgba(mix(pal.mid, 255, 0.5), 0.4)],
    [1, rgba(pal.mid, 0)],
  ])
}

const paintBhGlaze: SunPaint = (ctx, x, y, r, _pal, body) => {
  const g = bhGeom(r, body)
  const grad = ctx.createLinearGradient(x - g.outer, y, x + g.outer, y)
  grad.addColorStop(0, `rgba(255, 255, 255, ${g.dop})`)
  grad.addColorStop(0.42, 'rgba(255, 255, 255, 0)')
  grad.addColorStop(0.58, 'rgba(0, 0, 0, 0.12)')
  grad.addColorStop(1, `rgba(0, 0, 0, ${g.dop * 0.95})`)
  ctx.beginPath()
  ctx.arc(x, y, g.outer, 0, TAU)
  ctx.arc(x, y, g.inner, 0, TAU, true)
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()
}

const paintBhHalo: SunPaint = (ctx, x, y, r, pal, body) => {
  const g = bhGeom(r, body)
  const white: Rgb = [255, 255, 255]
  annulus(ctx, x, y, g.halo * 0.8, g.halo * 1.12, [
    [0, rgba(pal.edge, 0)],
    [0.42, rgba(pal.mid, 0.55)],
    [0.62, rgba(mix(pal.mid, 255, 0.6), 0.95)],
    [0.75, rgba(pal.mid, 0.5)],
    [1, rgba(pal.edge, 0)],
  ])
  // Die dünne heisse Linie des Einstein-Rings, links vom Doppler gehoben
  ctx.beginPath()
  ctx.arc(x, y, g.halo * 0.94, 0, TAU)
  ctx.strokeStyle = rgba(white, 0.7)
  ctx.lineWidth = Math.max(0.6, r * 0.012)
  ctx.stroke()
  const boost = ctx.createLinearGradient(x - g.halo, y, x + g.halo, y)
  boost.addColorStop(0, rgba(white, 0.3))
  boost.addColorStop(0.5, rgba(white, 0))
  boost.addColorStop(1, 'rgba(0, 0, 0, 0.3)')
  ctx.beginPath()
  ctx.arc(x, y, g.halo * 1.12, 0, TAU)
  ctx.fillStyle = boost
  ctx.fill()
  // Nur oberer und unterer Bogen bleiben — seitlich übernimmt die echte Scheibe
  const mask = ctx.createLinearGradient(x, y - g.halo * 1.12, x, y + g.halo * 1.12)
  mask.addColorStop(0, 'rgba(0, 0, 0, 1)')
  mask.addColorStop(0.18, 'rgba(0, 0, 0, 1)')
  mask.addColorStop(0.4, 'rgba(0, 0, 0, 0)')
  mask.addColorStop(0.6, 'rgba(0, 0, 0, 0)')
  mask.addColorStop(0.82, 'rgba(0, 0, 0, 1)')
  mask.addColorStop(1, 'rgba(0, 0, 0, 1)')
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = mask
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.restore()
}

const paintBhShadow: SunPaint = (ctx, x, y, r, pal, body) => {
  const g = bhGeom(r, body)
  const white: Rgb = [255, 255, 255]
  annulus(ctx, x, y, g.shadow, g.shadow + r * 0.32, [
    [0, rgba(pal.glow, 0.7)],
    [0.3, rgba(pal.glow, 0.25)],
    [1, rgba(pal.glow, 0)],
  ])
  circle(ctx, x, y, g.shadow)
  ctx.strokeStyle = rgba(mix(pal.glow, 255, 0.5), 0.6)
  ctx.lineWidth = g.ring * 3
  ctx.stroke()
  circle(ctx, x, y, g.shadow)
  ctx.strokeStyle = rgba(white, 1)
  ctx.lineWidth = g.ring
  ctx.stroke()
  circle(ctx, x, y, g.shadow - g.ring * 0.5)
  ctx.fillStyle = '#000'
  ctx.fill()
}

const paintBhRing: SunPaint = (ctx, x, y, r, _pal, body) => {
  const g = bhGeom(r, body)
  circle(ctx, x, y, g.shadow + g.ring * 2.4)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.lineWidth = g.ring
  ctx.stroke()
}

const paintBhJets: SunPaint = (ctx, x, y, r, pal, body) => {
  const g = bhGeom(r, body)
  const len = r * BLACK_HOLE_JET_LENGTH_FRACTION * g.jet
  const w = r * BLACK_HOLE_JET_WIDTH_FRACTION * g.jet
  const white: Rgb = [255, 255, 255]
  for (const dir of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const ww = w * (1 + k * 0.5)
      const a = k === 0 ? 0.85 : k === 1 ? 0.4 : 0.18
      const grad = ctx.createLinearGradient(x, y + dir * g.shadow * 0.6, x, y + dir * len)
      grad.addColorStop(0, rgba(white, a))
      grad.addColorStop(0.18, rgba(mix(pal.glow, 255, 0.6), a * 0.85))
      grad.addColorStop(0.44, rgba(pal.glow, a * 0.6))
      grad.addColorStop(0.74, rgba(pal.edge, a * 0.3))
      grad.addColorStop(1, rgba(pal.edge, 0))
      ctx.beginPath()
      ctx.moveTo(x - ww * 0.12, y + dir * g.shadow * 0.6)
      ctx.lineTo(x - ww * 0.5, y + dir * len)
      ctx.lineTo(x + ww * 0.5, y + dir * len)
      ctx.lineTo(x + ww * 0.12, y + dir * g.shadow * 0.6)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()
    }
  }
}

/* ── Tabelle ────────────────────────────────────────────────────────────────── */

export const SUN_BODY_PAINTERS: Record<SunBodyKind, Partial<Record<SunSpriteLayer, SunPaint>>> = {
  star: {
    halo: paintStarHalo,
    core: paintStarCore,
    surfaceA: paintSurface(71, 1),
    surfaceB: paintSurface(83, 1.35),
    corona: paintStarCorona,
    flare: paintStarFlare,
    wake: paintWake,
  },
  comet: {
    coma: paintComa,
    core: paintCometCore,
    jets: paintCometJets,
    wake: paintWake,
  },
  blackHole: {
    bhJets: paintBhJets,
    bhHalo: paintBhHalo,
    bhDisc: paintBhDisc,
    bhShadow: paintBhShadow,
    bhRing: paintBhRing,
    bhGlaze: paintBhGlaze,
    wake: paintWake,
  },
}

/* ── Bau, Cache, Mount ──────────────────────────────────────────────────────── */

const cache = createSpriteCache(SUN_SPRITE_CANVAS_MAX)

export function buildSunSprite(
  layer: SunSpriteLayer,
  body: SunBody,
  px: number,
  dpr: number,
  detail: SunDetail,
): HTMLCanvasElement | null {
  const paint = SUN_BODY_PAINTERS[body.kind][layer]
  if (!paint) return null
  const backing = sunSpriteBacking(px, layer, dpr)
  const key = sunSpriteKey(layer, body, px, backing.dpr, detail)
  const hit = cache.get(key)
  if (hit) return hit
  const made = newSpriteCanvas(backing.span, backing.dpr)
  if (!made) return null
  paint(made.ctx, backing.span / 2, backing.span / 2, px / 2, sunPaletteFor(body), body, detail)
  cache.set(key, made.cv)
  return made.cv
}

/** Für Canvas-Leser (Minimap): die Ebene zentriert auf (x, y) mit Box `px` malen. */
export function drawSunLayer(
  ctx: CanvasRenderingContext2D,
  layer: SunSpriteLayer,
  body: SunBody,
  px: number,
  dpr: number,
  x: number,
  y: number,
): void {
  const detail = sunSpriteDetail(px)
  const sprite = buildSunSprite(layer, body, px, dpr, detail)
  if (!sprite) return
  const span = px * SUN_SPRITE_SPAN[layer]
  ctx.drawImage(sprite, x - span / 2, y - span / 2, span, span)
}

const urlCache = new Map<string, string>()
const urlPending = new Map<string, Promise<string>>()

function rememberUrl(key: string, url: string): void {
  urlCache.set(key, url)
  while (urlCache.size > SUN_SPRITE_URL_MAX) {
    const oldest = urlCache.keys().next().value
    if (oldest === undefined) break
    const gone = urlCache.get(oldest)
    urlCache.delete(oldest)
    if (gone) URL.revokeObjectURL(gone)
  }
}

function spriteUrl(key: string, sprite: HTMLCanvasElement | null): Promise<string> {
  if (!sprite) return Promise.resolve('')
  const hit = urlCache.get(key)
  if (hit) {
    urlCache.delete(key)
    urlCache.set(key, hit)
    return Promise.resolve(hit)
  }
  const pending = urlPending.get(key)
  if (pending) return pending
  const job = new Promise<string>((resolve) => {
    sprite.toBlob((blob) => {
      urlPending.delete(key)
      if (!blob) {
        resolve('')
        return
      }
      const url = URL.createObjectURL(blob)
      rememberUrl(key, url)
      resolve(url)
    })
  })
  urlPending.set(key, job)
  return job
}

/** Neues Bild dekodieren, dann einblenden; das alte bleibt bis zum Ende der
 *  Blende stehen — sonst flackert der Evolve. */
function swapSlotImage(slot: HTMLElement, layerKey: string, url: Promise<string>, fadeMs: number): void {
  slot.dataset.layerKey = layerKey
  void url.then((src) => {
    if (slot.dataset.layerKey !== layerKey) return
    if (!src) {
      slot.replaceChildren()
      return
    }
    const current = slot.querySelector<HTMLImageElement>('img.is-in')
    if (current && current.src === src) return
    const img = document.createElement('img')
    img.alt = ''
    img.draggable = false
    img.decoding = 'async'
    const show = () => {
      if (slot.dataset.layerKey !== layerKey) return
      const old = Array.from(slot.querySelectorAll<HTMLImageElement>('img'))
      slot.appendChild(img)
      requestAnimationFrame(() => {
        img.classList.add('is-in')
        for (const o of old) o.classList.remove('is-in')
      })
      // Rein visuelle Frist — bleibt Wanduhr
      setTimeout(() => {
        for (const o of old) if (o.parentElement === slot) o.remove()
      }, fadeMs + 50)
    }
    img.src = src
    const decode = typeof img.decode === 'function' ? img.decode() : Promise.resolve()
    decode.then(show, show)
  })
}

export interface MountSunOptions {
  px: number
  dpr: number
  wake?: boolean
  layers?: SunSpriteLayer[]
  crossfadeMs?: number
}

/** Hängt alle Ebenen in die `.sun-slot[data-layer]` des Hosts — idempotent
 *  über `dataset.spriteKey`. Slots ohne Ebene werden geleert. */
export function mountSunSprites(host: HTMLElement, body: SunBody, opts: MountSunOptions): void {
  const detail = sunSpriteDetail(opts.px)
  const layers = opts.layers ?? sunSpriteLayers(body, detail, opts.wake ?? false)
  const key = `${sunSpriteKey('all', body, opts.px, clampSpriteDpr(opts.dpr), detail)}|${layers.join(',')}`
  if (host.dataset.spriteKey === key) return
  host.dataset.spriteKey = key
  const fade = opts.crossfadeMs ?? SUN_SPRITE_CROSSFADE_MS
  const slots = host.querySelectorAll<HTMLElement>('.sun-slot[data-layer]')
  for (const slot of slots) {
    const layer = slot.dataset.layer as SunSpriteLayer
    if (!layers.includes(layer)) {
      slot.dataset.layerKey = ''
      slot.replaceChildren()
      continue
    }
    const backing = sunSpriteBacking(opts.px, layer, opts.dpr)
    const layerKey = sunSpriteKey(layer, body, opts.px, backing.dpr, detail)
    if (slot.dataset.layerKey === layerKey) continue
    swapSlotImage(slot, layerKey, spriteUrl(layerKey, buildSunSprite(layer, body, opts.px, opts.dpr, detail)), fade)
  }
}

/** Rastern und kodieren, ohne zu mounten — vor einem Phasenwechsel. */
export function warmSunSprites(body: SunBody, px: number, dpr: number, wake: boolean): void {
  const detail = sunSpriteDetail(px)
  for (const layer of sunSpriteLayers(body, detail, wake)) {
    const backing = sunSpriteBacking(px, layer, dpr)
    const layerKey = sunSpriteKey(layer, body, px, backing.dpr, detail)
    void spriteUrl(layerKey, buildSunSprite(layer, body, px, dpr, detail))
  }
}

export function clearSunSpriteCache(): void {
  cache.clear()
  for (const url of urlCache.values()) URL.revokeObjectURL(url)
  urlCache.clear()
}
