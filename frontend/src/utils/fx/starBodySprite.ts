/* ── Der Sternkörper im Idle-Orbit als Offscreen-Sprite ───────────────────────
   Ein Stern ist ein SELBSTLEUCHTER: kein Terminator, dafür Halo, Photosphäre
   und eine Drehebene mit Strahlen. Drei Ebenen je Stern, jede ein gecachtes
   Canvas von px · SPAN Kante, in der Komponente per CSS gestapelt:

     halo  — statisch, ersetzt den dreifachen box-shadow
     core  — statisch, die Kugel selbst (samt Protuberanzen, Begleiter, Flecken)
     spin  — dreht per CSS-Keyframe; Strahlen, Arme, Staub

   Acht Gestalten (`StarLook`), Farbe kommt IMMER von aussen (Rolle, Spektral-
   palette, Boss). Alles streut über `seed`, nie über Math.random.            */

import type { StarLook, StarType } from '@/types'
import {
  STAR_BODY_BINARY_COMPANION_AT,
  STAR_BODY_BINARY_COMPANION_R,
  STAR_BODY_BINARY_MAIN_R,
  STAR_BODY_DETAIL_PX_1,
  STAR_BODY_DETAIL_PX_2,
  STAR_BODY_DWARF_RAYS,
  STAR_BODY_DWARF_SPOTS,
  STAR_BODY_GIANT_BANDS,
  STAR_BODY_GIANT_MOTES,
  STAR_BODY_GRAIN_ALPHA,
  STAR_BODY_HALO_ALPHA,
  STAR_BODY_HALO_ALPHA_MUL,
  STAR_BODY_HALO_REACH,
  STAR_BODY_HALO_SMALL_BOOST,
  STAR_BODY_LIMB_ALPHA,
  STAR_BODY_LOOK_POOL,
  STAR_BODY_LOOK_SEED_SALT,
  STAR_BODY_PULSAR_CORE_R,
  STAR_BODY_PULSAR_RAYS,
  STAR_BODY_FLARE_LOOPS,
  STAR_BODY_FLARE_LOOP_R,
  STAR_BODY_FLARE_TAIL_LEN,
  STAR_BODY_SEED_SALT,
  STAR_BODY_SEED_SLOTS,
  STAR_BODY_SPLINTER_RAYS,
  STAR_BODY_SPLINTER_WOBBLE,
  STAR_BODY_SPRITE_CACHE_MAX,
  STAR_BODY_SPRITE_CANVAS_MAX,
  STAR_BODY_SPRITE_SPAN,
  STAR_BODY_UMBRA_ARMS,
  STAR_BODY_VEIL_WISPS,
  STAR_BODY_WIND_ARMS,
  STAR_BODY_WIND_REACH,
  STAR_BODY_WIND_RESOURCE_EVERY,
  STAR_BODY_WIND_SALT,
  STAR_BODY_WIND_SEC_MIN,
  STAR_BODY_WIND_SEC_RANGE,
  STAR_BODY_WIND_TURN_SEC_MIN,
  STAR_BODY_WIND_TURN_SEC_RANGE,
} from '@/config/constants'
import {
  circle,
  clampSpriteDpr,
  createSpriteCache,
  flareLoop,
  grain,
  haloGlow,
  jitter,
  lumpyPath,
  mix,
  newSpriteCanvas,
  rayGradient,
  rgba,
  spike,
  sway,
  wisp,
  type Rgb,
} from '@/utils/fx/spaceBody'

const TAU = Math.PI * 2

export type StarRgb = Rgb
export type StarSpriteLayer = 'halo' | 'core' | 'spin' | 'wind'
export type StarDetail = 0 | 1 | 2

export interface StarPalette {
  rgb: StarRgb
  hi: string
  mid: string
  low: string
  edge: string
}

export type StarPaint = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  pal: StarPalette,
  seed: number,
  detail: StarDetail,
) => void

export function starPaletteFromRgb(rgb: StarRgb): StarPalette {
  return {
    rgb,
    hi: rgba(mix(rgb, 255, 0.78), 1),
    mid: rgba(rgb, 1),
    low: rgba(mix(rgb, 0, 0.55), 1),
    edge: rgba(mix(rgb, 0, 0.75), 1),
  }
}

export function starLookFor(type: StarType, roll: number): StarLook {
  if (type === 'galaxy_boss') return 'umbra'
  if (type === 'boss_escort') return 'splinter'
  const i = Math.floor(jitter(roll, STAR_BODY_LOOK_SEED_SALT) * STAR_BODY_LOOK_POOL.length)
  return STAR_BODY_LOOK_POOL[Math.min(i, STAR_BODY_LOOK_POOL.length - 1)]
}

export function starSeedFor(roll: number): number {
  return Math.min(
    STAR_BODY_SEED_SLOTS - 1,
    Math.floor(jitter(roll, STAR_BODY_SEED_SALT) * STAR_BODY_SEED_SLOTS),
  )
}

/** Wer eine Eruptionsfahne trägt: Champion und Boss immer, Eskorten nie,
 *  Resource-Sterne jeder dritte — je Fahne eine Compositor-Ebene. */
export function starWindShown(type: StarType, seed: number): boolean {
  if (type === 'boss_escort') return false
  if (type === 'resource') return seed % STAR_BODY_WIND_RESOURCE_EVERY === 0
  return true
}

/** Winkel, Zyklus und (negativer) Startversatz der Fahne — je Stern fest, damit
 *  nichts im Takt feuert. */
export function starWindStyle(seed: number): {
  angleDeg: number
  sec: number
  delaySec: number
  turnSec: number
} {
  const sec = STAR_BODY_WIND_SEC_MIN + jitter(seed, STAR_BODY_WIND_SALT + 1) * STAR_BODY_WIND_SEC_RANGE
  const turn =
    STAR_BODY_WIND_TURN_SEC_MIN + jitter(seed, STAR_BODY_WIND_SALT + 3) * STAR_BODY_WIND_TURN_SEC_RANGE
  return {
    angleDeg: Math.round(jitter(seed, STAR_BODY_WIND_SALT) * 360),
    sec: Math.round(sec * 10) / 10,
    delaySec: -Math.round(jitter(seed, STAR_BODY_WIND_SALT + 2) * sec * 10) / 10,
    turnSec: Math.round(turn * 10) / 10,
  }
}

export function starBodyDetail(px: number): StarDetail {
  if (px < STAR_BODY_DETAIL_PX_1) return 0
  if (px < STAR_BODY_DETAIL_PX_2) return 1
  return 2
}

export function starBodySpriteKey(
  layer: StarSpriteLayer | 'all',
  look: StarLook,
  rgb: StarRgb,
  seed: number,
  px: number,
  dpr: number,
  detail: number,
): string {
  return `${layer}|${look}|${rgb[0]},${rgb[1]},${rgb[2]}|${seed}|${px}|${dpr}|${detail}`
}

/* ── Bausteine ──────────────────────────────────────────────────────────────── */

interface PhotoOpts {
  hot: number
  limb: number
  grainAlpha: number
}

/** Die leuchtende Kugel: versetzter Hotspot, Randverdunkelung, Körnung. */
function photosphere(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  pal: StarPalette,
  detail: StarDetail,
  o: PhotoOpts,
): void {
  circle(ctx, x, y, r)
  const g = ctx.createRadialGradient(x - r * 0.34 * o.hot, y - r * 0.36 * o.hot, r * 0.05, x, y, r * 1.02)
  g.addColorStop(0, pal.hi)
  g.addColorStop(0.42, pal.mid)
  g.addColorStop(0.9, pal.low)
  g.addColorStop(1, pal.edge)
  ctx.fillStyle = g
  ctx.fill()
  if (detail >= 1 && o.grainAlpha > 0) grain(ctx, x, y, r, o.grainAlpha)
  if (o.limb > 0) {
    const limb = ctx.createRadialGradient(x, y, r * 0.62, x, y, r)
    limb.addColorStop(0, 'rgba(0, 0, 0, 0)')
    limb.addColorStop(1, rgba(mix(pal.rgb, 0, 0.85), STAR_BODY_LIMB_ALPHA * o.limb))
    circle(ctx, x, y, r)
    ctx.fillStyle = limb
    ctx.fill()
  }
}

function haloFor(look: StarLook, detail: StarDetail): { reach: number; alpha: number } {
  const boost = detail < 2 ? STAR_BODY_HALO_SMALL_BOOST : 1
  return {
    reach: STAR_BODY_HALO_REACH[look],
    alpha: Math.min(1, STAR_BODY_HALO_ALPHA * STAR_BODY_HALO_ALPHA_MUL[look] * boost),
  }
}

function binaryCompanionAt(r: number, seed: number): { x: number; y: number; cr: number } {
  const a = -0.95 + sway(seed, 11) * 0.5
  const d = r * STAR_BODY_BINARY_COMPANION_AT
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, cr: r * STAR_BODY_BINARY_COMPANION_R }
}

/** Schleifenwinkel: gestaffelt ab einem gewürfelten Start, nie zwei gegenüber —
 *  zwei Klammern an gegenüberliegenden Seiten lesen sich als Ring von der Kante. */
function flareLoopAngle(seed: number, i: number): number {
  return jitter(seed, 300) * TAU + i * 1.9 + sway(seed, 301 + i) * 0.35
}

/* ── Kern ───────────────────────────────────────────────────────────────────── */

export const paintDwarfCore: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const br = r * 0.92
  photosphere(ctx, x, y, br, pal, detail, { hot: 1.1, limb: 1, grainAlpha: STAR_BODY_GRAIN_ALPHA * 1.4 })
  if (detail === 0) return
  const spots = detail === 1 ? STAR_BODY_DWARF_SPOTS - 1 : STAR_BODY_DWARF_SPOTS
  ctx.save()
  circle(ctx, x, y, br)
  ctx.clip()
  for (let i = 0; i < spots; i++) {
    const a = jitter(seed, 20 + i) * TAU
    const d = br * (0.25 + jitter(seed, 30 + i) * 0.4)
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, br * 0.11, br * 0.07, a, 0, TAU)
    ctx.fillStyle = rgba(mix(pal.rgb, 0, 0.8), 0.6)
    ctx.fill()
  }
  ctx.restore()
}

export const paintGiantCore: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const br = r * 0.98
  photosphere(ctx, x, y, br, pal, detail, {
    hot: 0.6,
    limb: 1.3,
    grainAlpha: detail === 2 ? STAR_BODY_GRAIN_ALPHA * 0.5 : 0,
  })
  if (detail === 0) return
  ctx.save()
  circle(ctx, x, y, br)
  ctx.clip()
  ctx.strokeStyle = rgba(mix(pal.rgb, 0, 0.5), 0.2)
  ctx.lineWidth = br * 0.09
  for (let i = 0; i < STAR_BODY_GIANT_BANDS; i++) {
    const oy = sway(seed, 40 + i) * br * 0.55
    ctx.beginPath()
    ctx.ellipse(x, y + oy, br * 1.05, br * 0.16, 0, 0, TAU)
    ctx.stroke()
  }
  ctx.restore()
}

export const paintPulsarCore: StarPaint = (ctx, x, y, r, pal, _seed, detail) => {
  const br = r * STAR_BODY_PULSAR_CORE_R
  photosphere(ctx, x, y, br, pal, detail, { hot: 0.5, limb: 0.4, grainAlpha: 0 })
  const g = ctx.createRadialGradient(x, y, 0, x, y, br * 0.6)
  g.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
  g.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)')
  g.addColorStop(1, 'rgba(255, 255, 255, 0)')
  circle(ctx, x, y, br * 0.6)
  ctx.fillStyle = g
  ctx.fill()
  if (detail === 0) return
  circle(ctx, x, y, br * 0.86)
  ctx.strokeStyle = rgba(mix(pal.rgb, 255, 0.6), 0.45)
  ctx.lineWidth = Math.max(0.6, br * 0.05)
  ctx.stroke()
}

export const paintBinaryCore: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  photosphere(ctx, x - r * 0.12, y + r * 0.08, r * STAR_BODY_BINARY_MAIN_R, pal, detail, {
    hot: 0.9,
    limb: 1,
    grainAlpha: STAR_BODY_GRAIN_ALPHA,
  })
  const c = binaryCompanionAt(r, seed)
  const light = starPaletteFromRgb(mix(pal.rgb, 255, 0.35))
  if (detail >= 1) {
    ctx.strokeStyle = rgba(mix(pal.rgb, 255, 0.5), detail === 2 ? 0.3 : 0.2)
    ctx.lineWidth = r * 0.07
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x - r * 0.12 + c.x * 0.35, y + r * 0.08 + c.y * 0.35)
    ctx.lineTo(x + c.x * 0.8, y + c.y * 0.8)
    ctx.stroke()
  }
  photosphere(ctx, x + c.x, y + c.y, c.cr, light, detail, { hot: 1, limb: 0.7, grainAlpha: 0 })
}

export const paintFlareCore: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const br = r * 0.86
  photosphere(ctx, x, y, br, pal, detail, { hot: 1, limb: 1, grainAlpha: STAR_BODY_GRAIN_ALPHA * 0.9 })
  if (detail === 0) return
  // Protuberanzen: Schleifen, die am Rand aus der Kugel steigen — keine Ringe
  const loops = detail === 1 ? STAR_BODY_FLARE_LOOPS - 1 : STAR_BODY_FLARE_LOOPS
  ctx.lineCap = 'round'
  for (let i = 0; i < loops; i++) {
    const a = flareLoopAngle(seed, i)
    const spread = 0.22 + jitter(seed, 310 + i) * 0.16
    const rise = STAR_BODY_FLARE_LOOP_R * (0.8 + jitter(seed, 320 + i) * 0.5)
    // Plasma, kein Henkel: breiter weicher Unterschein, darauf eine dünne heisse Linie
    flareLoop(ctx, x, y, br, a, spread, rise)
    ctx.strokeStyle = rgba(pal.rgb, 0.28)
    ctx.lineWidth = Math.max(1, r * 0.13)
    ctx.stroke()
    flareLoop(ctx, x, y, br, a, spread, rise)
    ctx.strokeStyle = rgba(mix(pal.rgb, 255, 0.55), 0.7)
    ctx.lineWidth = Math.max(0.6, r * 0.045)
    ctx.stroke()
    if (detail < 2) continue
    flareLoop(ctx, x, y, br, a, spread * 0.7, rise * 0.62)
    ctx.strokeStyle = rgba(mix(pal.rgb, 255, 0.3), 0.4)
    ctx.lineWidth = Math.max(0.5, r * 0.03)
    ctx.stroke()
  }
}

export const paintVeilCore: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const br = r * 0.82
  photosphere(ctx, x, y, br, pal, detail, { hot: 0.8, limb: 0.9, grainAlpha: STAR_BODY_GRAIN_ALPHA * 0.7 })
  if (detail === 0) return
  ctx.save()
  circle(ctx, x, y, br)
  ctx.clip()
  for (let i = 0; i < 2; i++) {
    const a = jitter(seed, 50 + i) * TAU
    wisp(ctx, x + Math.cos(a) * br * 0.5, y + Math.sin(a) * br * 0.5, br * 0.5, seed * 3 + i, mix(pal.rgb, 255, 0.6), 0.22)
  }
  ctx.restore()
}

export const paintUmbraCore: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const br = r * 0.95
  circle(ctx, x, y, br)
  const g = ctx.createRadialGradient(x, y, 0, x, y, br)
  g.addColorStop(0, 'rgba(10, 6, 18, 1)')
  g.addColorStop(0.8, rgba(mix(pal.rgb, 0, 0.82), 1))
  g.addColorStop(0.95, pal.mid)
  g.addColorStop(1, pal.hi)
  ctx.fillStyle = g
  ctx.fill()
  circle(ctx, x, y, br * 0.97)
  ctx.strokeStyle = rgba(mix(pal.rgb, 255, 0.7), 0.85)
  ctx.lineWidth = Math.max(0.8, br * 0.06)
  ctx.stroke()
  if (detail === 0) return
  ctx.strokeStyle = rgba(pal.rgb, 0.5)
  ctx.lineWidth = Math.max(0.6, br * 0.04)
  ctx.lineCap = 'round'
  const cracks = detail === 1 ? 3 : 5
  for (let i = 0; i < cracks; i++) {
    const a = jitter(seed, 60 + i) * TAU
    const bend = sway(seed, 70 + i) * 0.35
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * br * 0.3, y + Math.sin(a) * br * 0.3)
    ctx.lineTo(x + Math.cos(a + bend) * br * 0.75, y + Math.sin(a + bend) * br * 0.75)
    ctx.stroke()
  }
  if (detail === 2) {
    const core = ctx.createRadialGradient(x, y, 0, x, y, br * 0.35)
    core.addColorStop(0, rgba(pal.rgb, 0.3))
    core.addColorStop(1, rgba(pal.rgb, 0))
    circle(ctx, x, y, br * 0.35)
    ctx.fillStyle = core
    ctx.fill()
  }
}

export const paintSplinterCore: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const br = r * 0.9
  lumpyPath(ctx, x, y, br, seed * 7 + 1, STAR_BODY_SPLINTER_WOBBLE)
  const g = ctx.createRadialGradient(x - br * 0.2, y - br * 0.2, br * 0.05, x, y, br)
  g.addColorStop(0, pal.hi)
  g.addColorStop(0.35, pal.mid)
  g.addColorStop(0.85, pal.low)
  g.addColorStop(1, pal.edge)
  ctx.fillStyle = g
  ctx.fill()
  if (detail >= 1) grain(ctx, x, y, br, STAR_BODY_GRAIN_ALPHA * 1.5)
  const glow = ctx.createRadialGradient(x, y, 0, x, y, br * 0.4)
  glow.addColorStop(0, rgba(mix(pal.rgb, 255, 0.8), 0.75))
  glow.addColorStop(1, rgba(pal.rgb, 0))
  circle(ctx, x, y, br * 0.4)
  ctx.fillStyle = glow
  ctx.fill()
  if (detail === 0) return
  ctx.strokeStyle = rgba(mix(pal.rgb, 255, 0.75), 0.8)
  ctx.lineWidth = Math.max(0.6, br * 0.05)
  ctx.lineCap = 'round'
  const cracks = detail === 1 ? 2 : 3
  for (let i = 0; i < cracks; i++) {
    const a = jitter(seed, 80 + i) * TAU
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * br * 0.8, y + Math.sin(a) * br * 0.8)
    ctx.stroke()
  }
}

/* ── Halo ───────────────────────────────────────────────────────────────────── */

export const paintDwarfHalo: StarPaint = (ctx, x, y, r, pal, _seed, detail) => {
  const h = haloFor('dwarf', detail)
  haloGlow(ctx, x, y, r, pal.rgb, h.reach, h.alpha)
}

export const paintGiantHalo: StarPaint = (ctx, x, y, r, pal, _seed, detail) => {
  const h = haloFor('giant', detail)
  haloGlow(ctx, x, y, r, pal.rgb, h.reach, h.alpha)
  const mantle = ctx.createRadialGradient(x, y, r * 1.05, x, y, r * 1.45)
  const tone = mix(pal.rgb, 255, 0.3)
  mantle.addColorStop(0, rgba(tone, 0))
  mantle.addColorStop(0.4, rgba(tone, 0.22))
  mantle.addColorStop(1, rgba(tone, 0))
  circle(ctx, x, y, r * 1.45)
  ctx.fillStyle = mantle
  ctx.fill()
}

export const paintPulsarHalo: StarPaint = (ctx, x, y, r, pal, _seed, detail) => {
  const h = haloFor('pulsar', detail)
  haloGlow(ctx, x, y, r, pal.rgb, h.reach, h.alpha)
  const bloom = ctx.createRadialGradient(x, y, 0, x, y, r * 1.05)
  bloom.addColorStop(0, 'rgba(255, 255, 255, 0.55)')
  bloom.addColorStop(0.5, 'rgba(255, 255, 255, 0.18)')
  bloom.addColorStop(1, 'rgba(255, 255, 255, 0)')
  circle(ctx, x, y, r * 1.05)
  ctx.fillStyle = bloom
  ctx.fill()
}

export const paintBinaryHalo: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const h = haloFor('binary', detail)
  haloGlow(ctx, x - r * 0.12, y + r * 0.08, r * STAR_BODY_BINARY_MAIN_R, pal.rgb, h.reach, h.alpha)
  const c = binaryCompanionAt(r, seed)
  haloGlow(ctx, x + c.x, y + c.y, c.cr, mix(pal.rgb, 255, 0.35), 2.4, h.alpha * 0.7)
}

export const paintFlareHalo: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const h = haloFor('flare', detail)
  haloGlow(ctx, x, y, r, pal.rgb, h.reach, h.alpha)
  // Aufhellung zur ersten Protuberanz hin — der Halo ist nicht rund
  const a = flareLoopAngle(seed, 0)
  const ox = x + Math.cos(a) * r * 0.3
  const oy = y + Math.sin(a) * r * 0.3
  const g = ctx.createRadialGradient(ox, oy, r * 0.5, ox, oy, r * 1.3)
  g.addColorStop(0, rgba(mix(pal.rgb, 255, 0.4), 0.28))
  g.addColorStop(1, rgba(pal.rgb, 0))
  circle(ctx, ox, oy, r * 1.3)
  ctx.fillStyle = g
  ctx.fill()
}

export const paintVeilHalo: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const h = haloFor('veil', detail)
  haloGlow(ctx, x, y, r, pal.rgb, h.reach, h.alpha)
  const wisps = STAR_BODY_VEIL_WISPS - (2 - detail)
  const tone = mix(pal.rgb, 255, 0.25)
  for (let i = 0; i < wisps; i++) {
    const a = (i / wisps) * TAU + sway(seed, 90 + i) * 0.5
    const d = r * (1.0 + jitter(seed, 100 + i) * 0.4)
    const wr = r * (0.4 + jitter(seed, 110 + i) * 0.25)
    wisp(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, wr, seed * 5 + i, tone, 0.2)
  }
}

export const paintUmbraHalo: StarPaint = (ctx, x, y, r, pal, _seed, detail) => {
  const h = haloFor('umbra', detail)
  haloGlow(ctx, x, y, r, pal.rgb, h.reach, h.alpha * 0.4)
  const ring = ctx.createRadialGradient(x, y, r * 0.98, x, y, r * 1.32)
  ring.addColorStop(0, rgba(pal.rgb, 0.55))
  ring.addColorStop(0.35, rgba(pal.rgb, 0.3))
  ring.addColorStop(1, rgba(pal.rgb, 0))
  circle(ctx, x, y, r * 1.32)
  ctx.fillStyle = ring
  ctx.fill()
  if (detail === 0) return
  circle(ctx, x, y, r * 1.45)
  ctx.strokeStyle = rgba(pal.rgb, 0.3)
  ctx.lineWidth = Math.max(0.6, r * 0.03)
  ctx.stroke()
}

export const paintSplinterHalo: StarPaint = (ctx, x, y, r, pal, _seed, detail) => {
  const h = haloFor('splinter', detail)
  haloGlow(ctx, x, y, r, pal.rgb, h.reach, h.alpha)
}

/* ── Drehebene ──────────────────────────────────────────────────────────────── */

export const paintDwarfSpin: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const rays = detail === 0 ? STAR_BODY_DWARF_RAYS / 2 : STAR_BODY_DWARF_RAYS
  ctx.fillStyle = rgba(mix(pal.rgb, 255, 0.6), 0.35)
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * TAU
    spike(ctx, x, y, a, r * 1.0, r * (1.2 + jitter(seed, 120 + i) * 0.2), r * 0.06)
    ctx.fill()
  }
  if (detail < 2) return
  ctx.fillStyle = rgba(mix(pal.rgb, 255, 0.6), 0.16)
  for (let i = 0; i < rays; i++) {
    const a = ((i + 0.5) / rays) * TAU
    spike(ctx, x, y, a, r * 1.0, r * 1.12, r * 0.04)
    ctx.fill()
  }
}

export const paintGiantSpin: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  ctx.beginPath()
  ctx.arc(x, y, r * 1.28, 0, Math.PI * 1.5)
  ctx.strokeStyle = rgba(mix(pal.rgb, 255, 0.3), 0.12)
  ctx.lineWidth = r * 0.1
  ctx.lineCap = 'round'
  ctx.stroke()
  if (detail < 2) return
  ctx.fillStyle = rgba(mix(pal.rgb, 255, 0.5), 0.3)
  for (let i = 0; i < STAR_BODY_GIANT_MOTES; i++) {
    const a = (i / STAR_BODY_GIANT_MOTES) * TAU + sway(seed, 130 + i) * 0.2
    const d = r * (1.2 + jitter(seed, 140 + i) * 0.4)
    circle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.025 + jitter(seed, 150 + i) * 0.03))
    ctx.fill()
  }
}

export const paintPulsarSpin: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const base = jitter(seed, 160) * (TAU / STAR_BODY_PULSAR_RAYS)
  const from = r * STAR_BODY_PULSAR_CORE_R * 0.9
  ctx.fillStyle = rayGradient(ctx, x, y, r, pal.rgb, STAR_BODY_PULSAR_CORE_R * 0.9, 2.1, 0.75)
  for (let i = 0; i < STAR_BODY_PULSAR_RAYS; i++) {
    spike(ctx, x, y, base + (i / STAR_BODY_PULSAR_RAYS) * TAU, from, r * 2.1, r * 0.045)
    ctx.fill()
  }
  if (detail === 0) return
  const shorts = detail === 1 ? 2 : 4
  ctx.fillStyle = rayGradient(ctx, x, y, r, pal.rgb, STAR_BODY_PULSAR_CORE_R * 0.9, 1.5, 0.45)
  for (let i = 0; i < shorts; i++) {
    const a = base + ((i + 0.5) / STAR_BODY_PULSAR_RAYS) * TAU
    spike(ctx, x, y, a, from, r * 1.5, r * 0.03)
    ctx.fill()
  }
  if (detail < 2) return
  circle(ctx, x, y, r * 1.3)
  ctx.strokeStyle = rgba(mix(pal.rgb, 255, 0.5), 0.15)
  ctx.lineWidth = Math.max(0.6, r * 0.03)
  ctx.stroke()
}

export const paintBinarySpin: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const start = jitter(seed, 170) * TAU
  const orbit = r * 1.45
  const g = ctx.createRadialGradient(x, y, orbit * 0.9, x, y, orbit * 1.1)
  g.addColorStop(0, rgba(mix(pal.rgb, 255, 0.4), 0))
  g.addColorStop(0.5, rgba(mix(pal.rgb, 255, 0.4), 0.22))
  g.addColorStop(1, rgba(mix(pal.rgb, 255, 0.4), 0))
  ctx.beginPath()
  ctx.arc(x, y, orbit, start, start + Math.PI * 1.4)
  ctx.strokeStyle = g
  ctx.lineWidth = r * 0.08
  ctx.lineCap = 'round'
  ctx.stroke()
  const ea = start + Math.PI * 1.4
  circle(ctx, x + Math.cos(ea) * orbit, y + Math.sin(ea) * orbit, r * 0.09)
  ctx.fillStyle = rgba(mix(pal.rgb, 255, 0.8), 0.9)
  ctx.fill()
  if (detail < 2) return
  ctx.beginPath()
  ctx.arc(x, y, r * 1.15, start + Math.PI, start + Math.PI * 1.8)
  ctx.strokeStyle = rgba(mix(pal.rgb, 255, 0.4), 0.1)
  ctx.lineWidth = r * 0.05
  ctx.stroke()
}

export const paintFlareSpin: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const a = flareLoopAngle(seed, 0)
  ctx.fillStyle = rayGradient(ctx, x, y, r, pal.rgb, 0.95, STAR_BODY_FLARE_TAIL_LEN, 0.6)
  spike(ctx, x, y, a, r * 0.95, r * STAR_BODY_FLARE_TAIL_LEN, r * 0.12)
  ctx.fill()
  if (detail === 0) return
  ctx.fillStyle = rayGradient(ctx, x, y, r, pal.rgb, 0.95, 1.4, 0.4)
  spike(ctx, x, y, a + Math.PI + sway(seed, 320) * 0.4, r * 0.95, r * 1.4, r * 0.08)
  ctx.fill()
  if (detail < 2) return
  ctx.fillStyle = rgba(mix(pal.rgb, 255, 0.8), 0.7)
  for (let i = 0; i < 3; i++) {
    const d = r * (1.15 + i * 0.25)
    const wa = a + sway(seed, 330 + i) * 0.12
    circle(ctx, x + Math.cos(wa) * d, y + Math.sin(wa) * d, r * 0.035)
    ctx.fill()
  }
}

export const paintVeilSpin: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const wisps = detail === 2 ? 3 : 2
  const tone = mix(pal.rgb, 255, 0.3)
  for (let i = 0; i < wisps; i++) {
    const a = (i / wisps) * TAU + jitter(seed, 200) * TAU
    wisp(ctx, x + Math.cos(a) * r * 1.15, y + Math.sin(a) * r * 1.15, r * 0.55, seed * 9 + i, tone, 0.18)
  }
}

export const paintUmbraSpin: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const arms = detail === 2 ? STAR_BODY_UMBRA_ARMS : STAR_BODY_UMBRA_ARMS - 2
  const base = jitter(seed, 210) * TAU
  for (let i = 0; i < arms; i++) {
    const a = base + (i / arms) * TAU + sway(seed, 220 + i) * 0.3
    const len = 1.5 + jitter(seed, 230 + i) * 0.6
    ctx.fillStyle = rayGradient(ctx, x, y, r, pal.rgb, 1.0, len, 0.5)
    spike(ctx, x, y, a, r * 1.0, r * len, r * (0.16 + jitter(seed, 240 + i) * 0.1))
    ctx.fill()
  }
  if (detail < 2) return
  ctx.beginPath()
  ctx.arc(x, y, r * 1.2, base, base + Math.PI * 1.3)
  ctx.strokeStyle = rgba(pal.rgb, 0.2)
  ctx.lineWidth = r * 0.05
  ctx.stroke()
}

export const paintSplinterSpin: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const base = jitter(seed, 250) * TAU
  ctx.fillStyle = rgba(mix(pal.rgb, 255, 0.7), 0.7)
  for (let i = 0; i < STAR_BODY_SPLINTER_RAYS; i++) {
    const a = base + (i / STAR_BODY_SPLINTER_RAYS) * TAU + sway(seed, 260 + i) * 0.25
    spike(ctx, x, y, a, r * 0.95, r * (1.3 + jitter(seed, 270 + i) * 0.25), r * 0.08)
    ctx.fill()
  }
  if (detail === 0) return
  ctx.fillStyle = rgba(mix(pal.rgb, 255, 0.7), 0.35)
  for (let i = 0; i < STAR_BODY_SPLINTER_RAYS; i++) {
    const a = base + ((i + 0.5) / STAR_BODY_SPLINTER_RAYS) * TAU
    spike(ctx, x, y, a, r * 0.95, r * 1.15, r * 0.05)
    ctx.fill()
  }
  if (detail < 2) return
  ctx.fillStyle = rgba(mix(pal.rgb, 255, 0.85), 0.8)
  for (let i = 0; i < STAR_BODY_SPLINTER_RAYS; i++) {
    const a = base + (i / STAR_BODY_SPLINTER_RAYS) * TAU + sway(seed, 260 + i) * 0.25
    const d = r * (1.3 + jitter(seed, 270 + i) * 0.25)
    circle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.035)
    ctx.fill()
  }
}

/* ── Sonnenwind ─────────────────────────────────────────────────────────────── */

/** Ein Strömungsarm: getapertes Band ab dem Rand (1,0 r) bei Winkel `a`, das
 *  sich gegen die Drehrichtung nach hinten krümmt — ein Spiralarm, der beim
 *  Drehen um den Stern zieht. */
function windArm(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  a: number,
  len: number,
  w0: number,
): void {
  const trail = 0.62
  const foot = r * 1.0
  const tip = a + trail
  const mid = a + trail * 0.42
  const fx = x + Math.cos(a) * foot
  const fy = y + Math.sin(a) * foot
  const nx = -Math.sin(a) * w0
  const ny = Math.cos(a) * w0
  const mx = x + Math.cos(mid) * len * 0.62
  const my = y + Math.sin(mid) * len * 0.62
  const tx = x + Math.cos(tip) * len
  const ty = y + Math.sin(tip) * len
  ctx.beginPath()
  ctx.moveTo(fx + nx, fy + ny)
  ctx.quadraticCurveTo(mx + nx * 0.45, my + ny * 0.45, tx, ty)
  ctx.quadraticCurveTo(mx - nx * 0.45, my - ny * 0.45, fx - nx, fy - ny)
  ctx.closePath()
}

function windArmAngle(seed: number, i: number, n: number): number {
  return (i / n) * TAU + sway(seed, 400 + i) * 0.35
}

function windArmLen(r: number, seed: number, i: number): number {
  return r * STAR_BODY_WIND_REACH * (0.8 + jitter(seed, 410 + i) * 0.2)
}

function windSparks(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = windArmAngle(seed, i, n)
    const len = windArmLen(r, seed, i)
    for (let k = 0; k < 2; k++) {
      const t = 0.55 + k * 0.25
      const wa = a + 0.62 * t * t
      circle(ctx, x + Math.cos(wa) * len * t, y + Math.sin(wa) * len * t, r * 0.03)
      ctx.fill()
    }
  }
}

function windArms(detail: StarDetail): number {
  return detail === 0 ? 1 : detail === 1 ? 2 : STAR_BODY_WIND_ARMS
}

export const paintStarWind: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const n = windArms(detail)
  for (let i = 0; i < n; i++) {
    windArm(ctx, x, y, r, windArmAngle(seed, i, n), windArmLen(r, seed, i), r * (0.2 - i * 0.03))
    ctx.fillStyle = rayGradient(ctx, x, y, r, pal.rgb, 0.95, STAR_BODY_WIND_REACH, 0.9 - i * 0.15)
    ctx.fill()
  }
  if (detail < 2) return
  ctx.fillStyle = rgba(mix(pal.rgb, 255, 0.8), 0.85)
  windSparks(ctx, x, y, r, seed, n)
}

/** Der Boss bricht dunkel aus — schwarz-violett mit hellem Saum, kein Glühen. */
export const paintUmbraWind: StarPaint = (ctx, x, y, r, pal, seed, detail) => {
  const n = windArms(detail)
  for (let i = 0; i < n; i++) {
    windArm(ctx, x, y, r, windArmAngle(seed, i, n), windArmLen(r, seed, i), r * (0.2 - i * 0.03))
    const g = ctx.createRadialGradient(x, y, r * 0.95, x, y, r * STAR_BODY_WIND_REACH)
    g.addColorStop(0, rgba(mix(pal.rgb, 0, 0.82), 0.9))
    g.addColorStop(0.6, rgba(mix(pal.rgb, 0, 0.6), 0.6))
    g.addColorStop(1, rgba(pal.rgb, 0))
    ctx.fillStyle = g
    ctx.fill()
    ctx.strokeStyle = rgba(mix(pal.rgb, 255, 0.5), 0.55 - i * 0.12)
    ctx.lineWidth = Math.max(0.5, r * 0.03)
    ctx.stroke()
  }
  if (detail < 2) return
  ctx.fillStyle = rgba(mix(pal.rgb, 255, 0.6), 0.7)
  windSparks(ctx, x, y, r, seed, n)
}

/* ── Tabelle, Bau, Cache, Blit ──────────────────────────────────────────────── */

export const STAR_LOOK_PAINTERS: Record<StarLook, Record<StarSpriteLayer, StarPaint>> = {
  dwarf: { halo: paintDwarfHalo, core: paintDwarfCore, spin: paintDwarfSpin, wind: paintStarWind },
  giant: { halo: paintGiantHalo, core: paintGiantCore, spin: paintGiantSpin, wind: paintStarWind },
  pulsar: { halo: paintPulsarHalo, core: paintPulsarCore, spin: paintPulsarSpin, wind: paintStarWind },
  binary: { halo: paintBinaryHalo, core: paintBinaryCore, spin: paintBinarySpin, wind: paintStarWind },
  flare: { halo: paintFlareHalo, core: paintFlareCore, spin: paintFlareSpin, wind: paintStarWind },
  veil: { halo: paintVeilHalo, core: paintVeilCore, spin: paintVeilSpin, wind: paintStarWind },
  umbra: { halo: paintUmbraHalo, core: paintUmbraCore, spin: paintUmbraSpin, wind: paintUmbraWind },
  splinter: { halo: paintSplinterHalo, core: paintSplinterCore, spin: paintSplinterSpin, wind: paintStarWind },
}

const cache = createSpriteCache(STAR_BODY_SPRITE_CANVAS_MAX)

export function buildStarSprite(
  layer: StarSpriteLayer,
  look: StarLook,
  rgb: StarRgb,
  seed: number,
  px: number,
  dpr: number,
  detail: StarDetail,
): HTMLCanvasElement | null {
  // Unter 22 px sieht man keine Fahne (Regel 7)
  if (layer === 'wind' && detail === 0) return null
  const d = clampSpriteDpr(dpr)
  const key = starBodySpriteKey(layer, look, rgb, seed, px, d, detail)
  const hit = cache.get(key)
  if (hit) return hit
  const span = Math.round(px * STAR_BODY_SPRITE_SPAN)
  const made = newSpriteCanvas(span, d)
  if (!made) return null
  STAR_LOOK_PAINTERS[look][layer](made.ctx, span / 2, span / 2, px / 2, starPaletteFromRgb(rgb), seed, detail)
  cache.set(key, made.cv)
  return made.cv
}

/* Im DOM hängt ein <img>, kein Canvas: jeder Host-Canvas wurde zur eigenen
   Compositor-Ebene (gemessen 9 → 92 „Canvas"-Ebenen bei 30 Sternen, auch mit
   willReadFrequently). Ein Bild wird in die Ebene des Vorfahren gemalt.
   Kodiert wird per toBlob im Hintergrund — toDataURL kostete synchron 3–8 ms
   je Ebene — und je Schlüssel genau einmal. */
const urlCache = new Map<string, string>()
const urlPending = new Map<string, Promise<string>>()

function rememberUrl(key: string, url: string): void {
  urlCache.set(key, url)
  while (urlCache.size > STAR_BODY_SPRITE_CACHE_MAX) {
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

function mountSpriteImage(slot: HTMLElement, layerKey: string, url: Promise<string>): void {
  slot.dataset.layerKey = layerKey
  void url.then((src) => {
    // Der Stern kann inzwischen umgeschlüsselt sein (Sonnenphase, Ebene)
    if (slot.dataset.layerKey !== layerKey) return
    if (!src) {
      slot.replaceChildren()
      return
    }
    let img = slot.firstElementChild as HTMLImageElement | null
    if (!img || img.tagName !== 'IMG') {
      img = document.createElement('img')
      img.alt = ''
      img.draggable = false
      slot.replaceChildren(img)
    }
    if (img.src !== src) img.src = src
  })
}

/** Hängt alle drei Ebenen in den Host — idempotent über `dataset.spriteKey`,
 *  denn eine Funktions-Ref feuert bei jedem Patch des VNodes. */
export function mountStarSprites(
  host: HTMLElement,
  look: StarLook,
  rgb: StarRgb,
  seed: number,
  px: number,
  dpr: number,
): void {
  const d = clampSpriteDpr(dpr)
  const detail = starBodyDetail(px)
  const rounded = Math.round(px * 10) / 10
  const key = starBodySpriteKey('all', look, rgb, seed, rounded, d, detail)
  if (host.dataset.spriteKey === key) return
  host.dataset.spriteKey = key
  for (const layer of ['halo', 'core', 'spin', 'wind'] as const) {
    const slot = host.querySelector<HTMLElement>(
      layer === 'wind' ? ':scope > .star-wind-anchor > .star-wind' : `:scope > .star-${layer}`,
    )
    if (!slot) continue
    const layerKey = starBodySpriteKey(layer, look, rgb, seed, rounded, d, detail)
    mountSpriteImage(slot, layerKey, spriteUrl(layerKey, buildStarSprite(layer, look, rgb, seed, px, d, detail)))
  }
}

export function warmStarSprites(
  look: StarLook,
  rgb: StarRgb,
  seed: number,
  px: number,
  dpr: number,
): Promise<void> {
  const d = clampSpriteDpr(dpr)
  const detail = starBodyDetail(px)
  const rounded = Math.round(px * 10) / 10
  const layers: StarSpriteLayer[] = ['halo', 'core', 'spin']
  return Promise.all(
    layers.map((layer) => {
      const key = starBodySpriteKey(layer, look, rgb, seed, rounded, d, detail)
      return spriteUrl(key, buildStarSprite(layer, look, rgb, seed, px, d, detail))
    }),
  ).then(() => undefined)
}

export function clearStarBodySpriteCache(): void {
  cache.clear()
  for (const url of urlCache.values()) URL.revokeObjectURL(url)
  urlCache.clear()
}
