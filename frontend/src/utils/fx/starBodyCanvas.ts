/* ── Der Sternkörper auf einem FREMDEN Canvas ─────────────────────────────────
   Die Minimap malt in ihre eigene Schleife; dort hängt kein DOM und also auch
   kein <img>. `buildStarSprite` liefert ein Canvas, das direkt `drawImage`-fähig
   ist — der `toBlob`-Umweg ist allein für das DOM nötig, wo jeder Host-Canvas
   eine Compositor-Ebene wäre. Die Achsdrehung rechnet dieselbe Formel wie das
   CSS: ein Streifen mit zwei Perioden, um genau eine Periode je Umlauf
   verschoben, unter einer weichen Kreismaske.                                 */

import type { StarLook } from '@/types'
import {
  STAR_BODY_BAND_MASK_EDGE,
  STAR_BODY_BAND_MASK_FULL,
  STAR_BODY_CANVAS_CACHE_MAX,
  STAR_BODY_CANVAS_SPRITE_PX,
  STAR_BODY_DISC_R,
  STAR_BODY_SPIN_SEC,
  STAR_BODY_SPRITE_SPAN,
} from '@/config/constants'
import { clampSpriteDpr, newSpriteCanvas, type Rgb } from '@/utils/fx/spaceBody'
import {
  buildStarSprite,
  starAxisStyle,
  starBandStrip,
  starBodyDetail,
  starSpinShown,
  type StarSpriteLayer,
} from '@/utils/fx/starBodySprite'

const TAU = Math.PI * 2

export interface CanvasStarBody {
  look: StarLook
  seed: number
  starColor: Rgb
  id: string
}

/* Eigener Halter: `STAR_BODY_SPRITE_CANVAS_MAX` ist 8, und der Orbit schiebt bei
   jedem Neuaufbau zwanzig Schlüssel durch. Ohne ihn rasterte die Minimap ihren
   Stern in JEDEM Frame neu. */
const sprites = new Map<string, HTMLCanvasElement | null>()

function spriteOf(
  layer: StarSpriteLayer,
  look: StarLook,
  rgb: Rgb,
  seed: number,
  px: number,
  dpr: number,
  detail: 0 | 1 | 2,
): HTMLCanvasElement | null {
  const key = `${layer}|${look}|${rgb[0]},${rgb[1]},${rgb[2]}|${seed}|${px}|${dpr}|${detail}`
  const hit = sprites.get(key)
  if (hit !== undefined) {
    sprites.delete(key)
    sprites.set(key, hit)
    return hit
  }
  const made = buildStarSprite(layer, look, rgb, seed, px, dpr, detail)
  sprites.set(key, made)
  while (sprites.size > STAR_BODY_CANVAS_CACHE_MAX) {
    const oldest = sprites.keys().next().value
    if (oldest === undefined) break
    sprites.delete(oldest)
  }
  return made
}

/** Die weiche Scheibenkante — dieselben Radien wie die CSS-Maske am Slot. Ein
 *  hartes `clip()` liesse die Oberfläche als Aufkleber enden. */
const masks = new Map<string, HTMLCanvasElement>()

function maskOf(size: number, discR: number, dpr: number): HTMLCanvasElement | null {
  const key = `${size}|${discR}|${dpr}`
  const hit = masks.get(key)
  if (hit) return hit
  const made = newSpriteCanvas(size, dpr)
  if (!made) return null
  const half = size / 2
  const g = made.ctx.createRadialGradient(
    half,
    half,
    half * discR * STAR_BODY_BAND_MASK_FULL,
    half,
    half,
    half * discR * STAR_BODY_BAND_MASK_EDGE,
  )
  g.addColorStop(0, 'rgba(0, 0, 0, 1)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0)')
  made.ctx.fillStyle = g
  made.ctx.fillRect(0, 0, size, size)
  masks.set(key, made.cv)
  while (masks.size > 4) {
    const oldest = masks.keys().next().value
    if (oldest === undefined) break
    masks.delete(oldest)
  }
  return made.cv
}

/** Ein Kratzblock je Grösse: dort wird der Streifen gedreht, verschoben und
 *  maskiert, bevor er als EIN Bild auf die Karte geht. */
const pads = new Map<string, { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D }>()

function padOf(size: number, dpr: number) {
  const key = `${size}|${dpr}`
  const hit = pads.get(key)
  if (hit) return hit
  const made = newSpriteCanvas(size, dpr)
  if (!made) return null
  pads.set(key, made)
  while (pads.size > 3) {
    const oldest = pads.keys().next().value
    if (oldest === undefined) break
    pads.delete(oldest)
  }
  return made
}

/** Phase der Achsdrehung, 0..1 — eine Periode je Umlauf, wie im CSS. */
export function starRollPhase(turnSec: number, dir: 'normal' | 'reverse', nowMs: number): number {
  const t = ((nowMs / 1000 / turnSec) % 1 + 1) % 1
  return dir === 'reverse' ? (1 - t) % 1 : t
}

export interface DrawStarBodyOpts {
  /** Grösse, in der die Ebenen gerastert werden. Fest, damit Zoom und Puls den
   *  Cache nicht bei jedem Frame neu füllen. */
  spritePx?: number
  alpha?: number
  /** Die Strahlenebene mitzeichnen (auf sehr kleinen Marken unnötig). */
  spin?: boolean
}

/**
 * Malt den Sternkörper des Idle-Orbits — Halo, Kern, rollende Oberfläche und
 * Strahlen — mittig auf (x, y) in der Kantenlänge `bodyPx`.
 */
export function drawStarBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bodyPx: number,
  star: CanvasStarBody,
  nowMs: number,
  dpr: number,
  opts: DrawStarBodyOpts = {},
): boolean {
  if (bodyPx <= 0) return false
  const d = clampSpriteDpr(dpr)
  const spritePx = opts.spritePx ?? STAR_BODY_CANVAS_SPRITE_PX
  const detail = starBodyDetail(spritePx)
  const rgb = star.starColor
  const halo = spriteOf('halo', star.look, rgb, star.seed, spritePx, d, detail)
  const core = spriteOf('core', star.look, rgb, star.seed, spritePx, d, detail)
  if (!core) return false

  const span = bodyPx * STAR_BODY_SPRITE_SPAN
  ctx.save()
  if (opts.alpha !== undefined) ctx.globalAlpha *= opts.alpha
  if (halo) ctx.drawImage(halo, x - span / 2, y - span / 2, span, span)
  ctx.drawImage(core, x - span / 2, y - span / 2, span, span)

  const band = spriteOf('band', star.look, rgb, star.seed, spritePx, d, detail)
  const size = Math.max(8, Math.round(bodyPx))
  const pad = band ? padOf(size, d) : null
  const mask = band ? maskOf(size, STAR_BODY_DISC_R[star.look], d) : null
  if (band && pad && mask) {
    const axis = starAxisStyle(star.look, star.seed, star.id)
    const strip = starBandStrip(0, 0, size / 2, star.look)
    const phase = starRollPhase(axis.turnSec, axis.dir, nowMs)
    pad.ctx.clearRect(0, 0, size, size)
    pad.ctx.save()
    pad.ctx.translate(size / 2, size / 2)
    pad.ctx.rotate((axis.tiltDeg * Math.PI) / 180)
    pad.ctx.drawImage(
      band,
      -strip.w * 0.75 + phase * strip.w * 0.5,
      -strip.h / 2,
      strip.w,
      strip.h,
    )
    pad.ctx.restore()
    pad.ctx.save()
    pad.ctx.globalCompositeOperation = 'destination-in'
    pad.ctx.drawImage(mask, 0, 0, size, size)
    pad.ctx.restore()
    ctx.drawImage(pad.cv, x - size / 2, y - size / 2, size, size)
  }

  if (opts.spin !== false) {
    const spin = spriteOf('spin', star.look, rgb, star.seed, spritePx, d, detail)
    if (spin) {
      if (starSpinShown(star.look)) {
        const turn = ((nowMs / 1000 / STAR_BODY_SPIN_SEC[star.look]) % 1) * TAU
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(turn)
        ctx.drawImage(spin, -span / 2, -span / 2, span, span)
        ctx.restore()
      } else {
        ctx.drawImage(spin, x - span / 2, y - span / 2, span, span)
      }
    }
  }
  ctx.restore()
  return true
}

export function clearStarBodyCanvasCache(): void {
  sprites.clear()
  masks.clear()
  pads.clear()
}
