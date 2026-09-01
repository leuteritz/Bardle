/* ── Der Drifter-Körper als Offscreen-Sprite ──────────────────────────────────
   Ein Drifter ist ein KÖRPER IM LICHT DER SONNE, kein Zeichen am Himmel — mit
   derselben Werkzeugkiste gerastert wie Landfall und Void. Neun Motive, jedes
   etwas, das man so auch im Weltall fände; das Meep ist das Meep.

   Licht von LINKS (0 Grad), der Aufrufer dreht den Sprite auf den Lichtwinkel.
   Selbstleuchter (Protuberanz, Linse, Magnetar) und das Artwork tragen keinen
   Terminator. Leuchtlinien kommen NACH dem Terminator, sonst frässe er sie.

   Der Sprite wird GEBLITTET, nicht eingehängt: ein Drifter steht im Flug, auf
   der Infokarte und in neun Admin-Kacheln zugleich.                          */

import type { DrifterBodyKind } from '@/types'
import {
  DRIFTER_BODY_LIT,
  DRIFTER_BODY_PALETTE,
  DRIFTER_CHIME_FACETS,
  DRIFTER_LEVIATHAN_RIBS,
  DRIFTER_MEEP_ART,
  DRIFTER_MEEP_ART_SCALE,
  DRIFTER_PROBE_CELLS,
  DRIFTER_PROBE_CELL_HEX,
  DRIFTER_PROBE_FOIL_HEX,
  DRIFTER_SHARD_CRATERS,
  DRIFTER_SHARD_VEINS,
  DRIFTER_SILHOUETTE_WOBBLE,
  DRIFTER_SPRITE_CACHE_MAX,
  DRIFTER_SPRITE_SPAN,
  DRIFTER_SURGE_LOOPS,
  DRIFTER_VORTEX_ARCS,
} from '@/config/constants'
import { hexToRgbTriple } from '@/utils/ui/format'
import {
  bodyFill,
  clampSpriteDpr,
  crater,
  createSpriteCache,
  grain,
  jitter,
  lumpyPath,
  newSpriteCanvas,
  paintTerminator,
  sway,
  type BodyPalette,
} from '@/utils/fx/spaceBody'

export type DrifterPaint = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  pal: BodyPalette,
  color: string,
  detail: 0 | 1 | 2,
  art: HTMLImageElement | null,
) => void

function tint(hex: string, alpha: number): string {
  return `rgba(${hexToRgbTriple(hex)}, ${alpha})`
}

function hot(hex: string, t: number, alpha: number): string {
  const [r, g, b] = hexToRgbTriple(hex).split(',').map((v) => Number(v))
  const m = (v: number) => Math.round(v + (255 - v) * t)
  return `rgba(${m(r)}, ${m(g)}, ${m(b)}, ${alpha})`
}

/* ── Errant Chime — Resonanzkristall ─────────────────────────────────────── */

const CHIME_TILT = 0.35

export const paintChime: DrifterPaint = (ctx, x, y, r, pal, color, detail) => {
  const tip = r * 1.15
  const waist = r * 0.42
  const shoulder = r * 0.3
  const cos = Math.cos(CHIME_TILT)
  const sin = Math.sin(CHIME_TILT)
  const P = (px: number, py: number) => ({ x: x + px * cos - py * sin, y: y + px * sin + py * cos })
  const top = P(0, -tip)
  const bot = P(0, tip)
  const facets = DRIFTER_CHIME_FACETS + detail
  // Facetten als Keile um die Längsachse: jede mit eigener Helligkeit.
  for (let i = 0; i < facets; i++) {
    const a0 = -1 + (2 * i) / facets
    const a1 = -1 + (2 * (i + 1)) / facets
    const w0 = waist * a0
    const w1 = waist * a1
    const l0 = P(w0, -shoulder * (1 - Math.abs(a0)) - shoulder * 0.2)
    const l1 = P(w1, -shoulder * (1 - Math.abs(a1)) - shoulder * 0.2)
    const m0 = P(w0, shoulder * (1 - Math.abs(a0)) + shoulder * 0.2)
    const m1 = P(w1, shoulder * (1 - Math.abs(a1)) + shoulder * 0.2)
    const shade = 0.55 + jitter(i, 3) * 0.45
    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.lineTo(l1.x, l1.y)
    ctx.lineTo(m1.x, m1.y)
    ctx.lineTo(bot.x, bot.y)
    ctx.lineTo(m0.x, m0.y)
    ctx.lineTo(l0.x, l0.y)
    ctx.closePath()
    const g = ctx.createLinearGradient(l0.x, l0.y, m1.x, m1.y)
    g.addColorStop(0, i % 2 === 0 ? pal.hi : pal.mid)
    g.addColorStop(0.5, shade > 0.8 ? pal.hi : pal.mid)
    g.addColorStop(1, pal.low)
    ctx.fillStyle = g
    ctx.globalAlpha = 0.85 + shade * 0.15
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(20, 16, 8, 0.45)'
    ctx.lineWidth = Math.max(0.5, r * 0.025)
    ctx.stroke()
  }
  // Die Glut im Innern.
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const ember = ctx.createRadialGradient(x, y, 0, x, y, r * 0.5)
  ember.addColorStop(0, hot(color, 0.4, 0.75))
  ember.addColorStop(0.5, tint(color, 0.3))
  ember.addColorStop(1, tint(color, 0))
  ctx.fillStyle = ember
  ctx.beginPath()
  ctx.arc(x, y, r * 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  // Bruchlinien.
  if (detail >= 1) {
    ctx.strokeStyle = tint(pal.edge, 0.4)
    ctx.lineWidth = Math.max(0.5, r * 0.02)
    for (let i = 0; i < 1 + detail; i++) {
      const a = P(sway(i, 7) * waist * 0.6, -tip * 0.5 + jitter(i, 11) * tip * 0.6)
      const b = P(sway(i, 13) * waist * 0.5, a.y - y + jitter(i, 17) * r * 0.5)
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  }
}

/** Wo der Glanzpunkt des Kristalls sitzt — die Spitze zur Sonne. */
export function chimeGlintAt(r: number): { x: number; y: number; rad: number } {
  const tip = r * 1.05
  return { x: Math.sin(CHIME_TILT) * tip, y: -Math.cos(CHIME_TILT) * tip, rad: r * 0.16 }
}

/* ── Ember Shard — Chondrit ──────────────────────────────────────────────── */

export const paintShard: DrifterPaint = (ctx, x, y, r, pal, _color, detail) => {
  const br = r * 0.92
  lumpyPath(ctx, x, y, br, 3, DRIFTER_SILHOUETTE_WOBBLE)
  ctx.fillStyle = bodyFill(ctx, x, y, br, pal.hi, pal.mid, pal.low)
  ctx.fill()
  grain(ctx, x, y, br, 0.14)
  const craters = DRIFTER_SHARD_CRATERS + detail
  for (let i = 0; i < craters; i++) {
    const a = jitter(i, 41) * Math.PI * 2
    const d = br * (0.2 + jitter(i, 43) * 0.5)
    crater(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, br * (0.08 + jitter(i, 47) * 0.1), pal.edge)
  }
}

/** Die glühenden Risse — NACH dem Terminator, sonst frässe er sie. */
export const paintShardVeins: DrifterPaint = (ctx, x, y, r, _pal, color, detail) => {
  const br = r * 0.92
  const veins = DRIFTER_SHARD_VEINS + detail
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  for (let i = 0; i < veins; i++) {
    const a = jitter(i, 61) * Math.PI * 2
    const x0 = x + Math.cos(a) * br * 0.15
    const y0 = y + Math.sin(a) * br * 0.15
    const x1 = x + Math.cos(a + sway(i, 67) * 0.5) * br * 0.82
    const y1 = y + Math.sin(a + sway(i, 67) * 0.5) * br * 0.82
    const cx = (x0 + x1) / 2 + sway(i, 71) * br * 0.2
    const cy = (y0 + y1) / 2 + sway(i, 73) * br * 0.2
    for (const [w, al] of [
      [0.12, 0.22],
      [0.04, 0.9],
    ] as const) {
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo(cx, cy, x1, y1)
      ctx.strokeStyle = hot(color, w > 0.1 ? 0 : 0.35, al)
      ctx.lineWidth = Math.max(0.6, br * w)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/* ── Lost Meep — das Artwork in seiner Vakuumblase ───────────────────────── */

export const paintMeep: DrifterPaint = (ctx, x, y, r, pal, color, _detail, art) => {
  // Die Blase: hohl, mit brechendem Rand.
  const bubble = ctx.createRadialGradient(x, y, r * 0.55, x, y, r * 0.98)
  bubble.addColorStop(0, tint(pal.mid, 0))
  bubble.addColorStop(0.8, tint(pal.mid, 0.16))
  bubble.addColorStop(0.96, tint(pal.edge, 0.5))
  bubble.addColorStop(1, tint(pal.edge, 0))
  ctx.fillStyle = bubble
  ctx.beginPath()
  ctx.arc(x, y, r * 0.98, 0, Math.PI * 2)
  ctx.fill()

  if (art) {
    const s = r * 2 * DRIFTER_MEEP_ART_SCALE
    ctx.drawImage(art, x - s / 2, y - s / 2, s, s)
  } else {
    // Bis das Bild da ist: ein Körper mit Volumen und einem dunklen Auge.
    ctx.beginPath()
    ctx.arc(x, y, r * 0.62, 0, Math.PI * 2)
    ctx.fillStyle = bodyFill(ctx, x, y, r * 0.62, pal.hi, pal.mid, pal.low)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x - r * 0.12, y - r * 0.1, r * 0.13, 0, Math.PI * 2)
    ctx.fillStyle = '#141a22'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(x - r * 0.16, y - r * 0.15, r * 0.045, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  }

  // Glanzsichel oben links, Randlicht in der Signaturfarbe.
  ctx.beginPath()
  ctx.arc(x, y, r * 0.86, Math.PI * 1.05, Math.PI * 1.55)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.lineWidth = Math.max(0.8, r * 0.05)
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, r * 0.96, 0, Math.PI * 2)
  ctx.strokeStyle = tint(color, 0.45)
  ctx.lineWidth = Math.max(0.6, r * 0.025)
  ctx.stroke()
}

/* ── Salvage Probe — die eine Maschine ───────────────────────────────────── */

export const paintProbe: DrifterPaint = (ctx, x, y, r, pal, _color, detail) => {
  const bus = r * 0.34
  // Solarflügel: dunkle Zellen in silbernem Rahmen.
  for (const s of [-1, 1]) {
    const x0 = x + s * r * 0.4
    const x1 = x + s * r * 1.36
    const h = r * 0.34
    ctx.beginPath()
    ctx.rect(Math.min(x0, x1), y - h / 2, Math.abs(x1 - x0), h)
    ctx.fillStyle = DRIFTER_PROBE_CELL_HEX
    ctx.fill()
    ctx.strokeStyle = pal.hi
    ctx.lineWidth = Math.max(0.6, r * 0.03)
    ctx.stroke()
    const cells = DRIFTER_PROBE_CELLS + detail
    ctx.strokeStyle = tint(pal.edge, 0.4)
    ctx.lineWidth = Math.max(0.4, r * 0.015)
    for (let i = 1; i < cells; i++) {
      const cx = x0 + ((x1 - x0) * i) / cells
      ctx.beginPath()
      ctx.moveTo(cx, y - h / 2)
      ctx.lineTo(cx, y + h / 2)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(Math.min(x0, x1), y)
    ctx.lineTo(Math.max(x0, x1), y)
    ctx.stroke()
  }
  // Der Bus: ein Sechseck aus Metallplatten.
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6
    const px = x + Math.cos(a) * bus
    const py = y + Math.sin(a) * bus
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = bodyFill(ctx, x, y, bus, pal.hi, pal.mid, pal.low)
  ctx.fill()
  grain(ctx, x, y, bus, 0.08)
  ctx.strokeStyle = 'rgba(12, 14, 18, 0.7)'
  ctx.lineWidth = Math.max(0.6, r * 0.03)
  ctx.stroke()
  // Goldfolie auf einer Flanke.
  ctx.beginPath()
  ctx.rect(x - bus * 0.55, y + bus * 0.1, bus * 0.8, bus * 0.62)
  const foil = ctx.createLinearGradient(x - bus * 0.55, y, x + bus * 0.25, y + bus * 0.7)
  foil.addColorStop(0, hot(DRIFTER_PROBE_FOIL_HEX, 0.35, 1))
  foil.addColorStop(1, DRIFTER_PROBE_FOIL_HEX)
  ctx.fillStyle = foil
  ctx.fill()
  // Plattenfugen.
  if (detail >= 1) {
    ctx.strokeStyle = 'rgba(12, 14, 18, 0.5)'
    ctx.lineWidth = Math.max(0.4, r * 0.015)
    for (let i = 0; i < 1 + detail; i++) {
      ctx.beginPath()
      ctx.moveTo(x - bus * 0.9, y - bus * 0.5 + i * bus * 0.35)
      ctx.lineTo(x + bus * 0.9, y - bus * 0.5 + i * bus * 0.35)
      ctx.stroke()
    }
  }
  // Richtantenne oben, Ausleger dazwischen.
  ctx.beginPath()
  ctx.moveTo(x, y - bus)
  ctx.lineTo(x, y - r * 0.6)
  ctx.strokeStyle = pal.mid
  ctx.lineWidth = Math.max(0.6, r * 0.03)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(x, y - r * 0.72, r * 0.34, r * 0.16, 0, 0, Math.PI * 2)
  const dish = ctx.createLinearGradient(x - r * 0.34, y - r * 0.8, x + r * 0.34, y - r * 0.6)
  dish.addColorStop(0, pal.edge)
  dish.addColorStop(0.5, pal.hi)
  dish.addColorStop(1, pal.mid)
  ctx.fillStyle = dish
  ctx.fill()
  ctx.strokeStyle = 'rgba(12, 14, 18, 0.6)'
  ctx.lineWidth = Math.max(0.5, r * 0.02)
  ctx.stroke()
  // Mast nach unten — dort sitzt die Lampe.
  ctx.beginPath()
  ctx.moveTo(x, y + bus)
  ctx.lineTo(x, y + r * 0.78)
  ctx.strokeStyle = pal.mid
  ctx.lineWidth = Math.max(0.5, r * 0.025)
  ctx.stroke()
}

/** Wo der Nav-Strobe der Sonde sitzt — EINE Quelle für Sprite und Overlay. */
export function probeStrobeAt(r: number): { x: number; y: number; rad: number } {
  return { x: 0, y: r * 0.8, rad: Math.max(1.2, r * 0.06) }
}

/* ── Coronal Surge — abgelöste Protuberanz ───────────────────────────────── */

export const paintSurge: DrifterPaint = (ctx, x, y, r, _pal, color, detail) => {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  const loops = DRIFTER_SURGE_LOOPS + detail
  for (let i = 0; i < loops; i++) {
    const spread = 0.7 - i * 0.12
    const apex = -0.95 + i * 0.16
    const x0 = x - r * spread
    const x1 = x + r * spread
    const y0 = y + r * 0.45
    const draw = (w: number, al: number, whiten: number) => {
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.bezierCurveTo(x0 - r * 0.1, y + r * apex, x1 + r * 0.1, y + r * apex, x1, y0)
      ctx.strokeStyle = hot(color, whiten, al)
      ctx.lineWidth = Math.max(0.6, r * w)
      ctx.stroke()
    }
    draw(0.22, 0.2, 0)
    draw(0.1, 0.55, 0.2)
    draw(0.035, 0.9, 0.7)
  }
  // Fusspunkte glühen.
  for (const s of [-1, 1]) {
    const fx = x + s * r * 0.7
    const fy = y + r * 0.45
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 0.32)
    g.addColorStop(0, hot(color, 0.6, 0.8))
    g.addColorStop(1, tint(color, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(fx, fy, r * 0.32, 0, Math.PI * 2)
    ctx.fill()
  }
  // Spritzer über dem Bogen.
  for (let i = 0; i < 4 + detail * 2; i++) {
    const a = -Math.PI * (0.25 + jitter(i, 23) * 0.5)
    const d = r * (0.95 + jitter(i, 29) * 0.4)
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * d, y + r * 0.3 + Math.sin(a) * d, Math.max(0.6, r * 0.03), 0, Math.PI * 2)
    ctx.fillStyle = hot(color, 0.5, 0.7)
    ctx.fill()
  }
  ctx.restore()
}

/* ── Rift Echo — Gravitationslinse ───────────────────────────────────────── */

export const paintVortex: DrifterPaint = (ctx, x, y, r, pal, color, detail) => {
  // Der Schatten, der dunkler ist als der Himmel.
  const shadow = ctx.createRadialGradient(x, y, 0, x, y, r * 0.5)
  shadow.addColorStop(0, pal.low)
  shadow.addColorStop(0.7, pal.low)
  shadow.addColorStop(1, tint(pal.low, 0))
  ctx.fillStyle = shadow
  ctx.beginPath()
  ctx.arc(x, y, r * 0.5, 0, Math.PI * 2)
  ctx.fill()
  // Einsteinring: geschlossen, hell, mit violettem Saum.
  ctx.beginPath()
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2)
  ctx.strokeStyle = tint(pal.edge, 0.85)
  ctx.lineWidth = Math.max(0.8, r * 0.05)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, r * 0.78, 0, Math.PI * 2)
  ctx.strokeStyle = tint(color, 0.45)
  ctx.lineWidth = Math.max(0.6, r * 0.03)
  ctx.stroke()
  // Tangentiale Sternlichtbögen.
  const arcs = DRIFTER_VORTEX_ARCS + detail
  ctx.lineCap = 'round'
  for (let i = 0; i < arcs; i++) {
    const rr = r * (0.92 + (i / arcs) * 0.4)
    const mid = jitter(i, 59) * Math.PI * 2
    const half = 0.4 + jitter(i, 61) * 0.6
    const g = ctx.createLinearGradient(
      x + Math.cos(mid - half) * rr,
      y + Math.sin(mid - half) * rr,
      x + Math.cos(mid + half) * rr,
      y + Math.sin(mid + half) * rr,
    )
    g.addColorStop(0, tint(pal.hi, 0))
    g.addColorStop(0.5, pal.hi)
    g.addColorStop(1, tint(pal.hi, 0))
    ctx.beginPath()
    ctx.arc(x, y, rr, mid - half, mid + half)
    ctx.strokeStyle = g
    ctx.lineWidth = Math.max(0.6, r * (0.025 + jitter(i, 67) * 0.03))
    ctx.stroke()
  }
  // Die Verzerrung: leise konzentrische Ringe.
  if (detail >= 1) {
    ctx.strokeStyle = tint(color, 0.14)
    ctx.lineWidth = Math.max(0.4, r * 0.015)
    for (let i = 0; i < detail; i++) {
      ctx.beginPath()
      ctx.arc(x, y, r * (1.05 + i * 0.18), 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

/* ── Wayfarer's Beacon — Pulsar-Boje ─────────────────────────────────────── */

export const paintBeacon: DrifterPaint = (ctx, x, y, r, pal, color, detail) => {
  const hw = r * 0.26
  const top = y - r * 0.5
  const bot = y + r * 0.62
  // Kapsel.
  ctx.beginPath()
  ctx.moveTo(x - hw, top + hw)
  ctx.arc(x, top + hw, hw, Math.PI, 0)
  ctx.lineTo(x + hw, bot - hw * 0.6)
  ctx.lineTo(x - hw, bot - hw * 0.6)
  ctx.closePath()
  const g = ctx.createLinearGradient(x - hw, y, x + hw, y)
  g.addColorStop(0, pal.hi)
  g.addColorStop(0.55, pal.mid)
  g.addColorStop(1, pal.low)
  ctx.fillStyle = g
  ctx.fill()
  grain(ctx, x, y, r * 0.7, 0.08)
  // Warnstreifen, auf die Kapsel geclippt.
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x - hw, top + hw)
  ctx.arc(x, top + hw, hw, Math.PI, 0)
  ctx.lineTo(x + hw, bot - hw * 0.6)
  ctx.lineTo(x - hw, bot - hw * 0.6)
  ctx.closePath()
  ctx.clip()
  ctx.fillStyle = tint(color, 0.6)
  for (let i = 0; i < 2 + detail; i++) {
    const sy = y - r * 0.1 + i * r * 0.26
    ctx.beginPath()
    ctx.moveTo(x - hw, sy)
    ctx.lineTo(x + hw, sy - r * 0.12)
    ctx.lineTo(x + hw, sy - r * 0.02)
    ctx.lineTo(x - hw, sy + r * 0.1)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  ctx.strokeStyle = 'rgba(14, 12, 10, 0.7)'
  ctx.lineWidth = Math.max(0.6, r * 0.03)
  ctx.beginPath()
  ctx.moveTo(x - hw, top + hw)
  ctx.arc(x, top + hw, hw, Math.PI, 0)
  ctx.lineTo(x + hw, bot - hw * 0.6)
  ctx.lineTo(x - hw, bot - hw * 0.6)
  ctx.closePath()
  ctx.stroke()
  // Finnen unten.
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(x + s * hw, bot - r * 0.4)
    ctx.lineTo(x + s * r * 0.55, bot)
    ctx.lineTo(x + s * hw, bot - hw * 0.6)
    ctx.closePath()
    ctx.fillStyle = s < 0 ? pal.mid : pal.low
    ctx.fill()
    ctx.stroke()
  }
  // Mast und Lampenfassung.
  ctx.beginPath()
  ctx.moveTo(x, top)
  ctx.lineTo(x, y - r * 1.05)
  ctx.strokeStyle = pal.mid
  ctx.lineWidth = Math.max(0.6, r * 0.035)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y - r * 1.1, r * 0.11, 0, Math.PI * 2)
  ctx.fillStyle = pal.low
  ctx.fill()
}

/** Die Lampe leuchtet selbst — NACH dem Terminator. */
export const paintBeaconLamp: DrifterPaint = (ctx, x, y, r, _pal, color) => {
  const at = beaconLampAt(r)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(x + at.x, y + at.y, 0, x + at.x, y + at.y, at.rad * 3)
  g.addColorStop(0, hot(color, 0.7, 0.9))
  g.addColorStop(0.35, tint(color, 0.4))
  g.addColorStop(1, tint(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x + at.x, y + at.y, at.rad * 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Wo die Lampe der Boje sitzt — Sprite, Keulen und Puls treffen dieselbe Stelle. */
export function beaconLampAt(r: number): { x: number; y: number; rad: number } {
  return { x: 0, y: -r * 1.1, rad: Math.max(1.2, r * 0.08) }
}

/* ── Sundering Pulse — Magnetar ──────────────────────────────────────────── */

export const paintPulse: DrifterPaint = (ctx, x, y, r, pal, color, detail) => {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // Schockscheibe, gekippt.
  const tilt = -0.35
  for (let i = 0; i <= detail; i++) {
    const rx = r * (1.2 - i * 0.28)
    const ry = rx * 0.27
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, tilt, 0, Math.PI * 2)
    ctx.strokeStyle = hot(color, i === 0 ? 0.2 : 0.5, 0.55)
    ctx.lineWidth = Math.max(0.8, r * (0.06 - i * 0.015))
    ctx.stroke()
  }
  const disc = ctx.createRadialGradient(x, y, 0, x, y, r * 1.2)
  disc.addColorStop(0, tint(color, 0.25))
  disc.addColorStop(1, tint(color, 0))
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tilt)
  ctx.scale(1, 0.27)
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  // Polare Jets, senkrecht zur Scheibe.
  for (const s of [-1, 1]) {
    const len = r * 1.38
    const jx = Math.cos(tilt - Math.PI / 2) * s
    const jy = Math.sin(tilt - Math.PI / 2) * s
    const nx = -jy
    const ny = jx
    const w = r * 0.16
    ctx.beginPath()
    ctx.moveTo(x + nx * w, y + ny * w)
    ctx.lineTo(x + jx * len, y + jy * len)
    ctx.lineTo(x - nx * w, y - ny * w)
    ctx.closePath()
    const g = ctx.createLinearGradient(x, y, x + jx * len, y + jy * len)
    g.addColorStop(0, hot(color, 0.7, 0.9))
    g.addColorStop(0.5, tint(color, 0.45))
    g.addColorStop(1, tint(color, 0))
    ctx.fillStyle = g
    ctx.fill()
  }
  // Der Kern: weissheiss.
  const core = ctx.createRadialGradient(x, y, 0, x, y, r * 0.32)
  core.addColorStop(0, pal.edge)
  core.addColorStop(0.35, hot(color, 0.6, 0.95))
  core.addColorStop(1, tint(color, 0))
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(x, y, r * 0.32, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/* ── Star Leviathan — das Wesen ──────────────────────────────────────────── */

const LEVIATHAN_HULL: readonly (readonly [number, number])[] = [
  [-1.3, 0.02],
  [-1.12, -0.36],
  [-0.66, -0.54],
  [-0.1, -0.5],
  [0.5, -0.36],
  [1.0, -0.16],
  [1.38, -0.22],
  [1.42, 0.02],
  [1.38, 0.24],
  [1.0, 0.16],
  [0.5, 0.36],
  [-0.1, 0.5],
  [-0.66, 0.5],
  [-1.12, 0.34],
]

function hullPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath()
  LEVIATHAN_HULL.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(x + px * r, y + py * r)
    else ctx.lineTo(x + px * r, y + py * r)
  })
  ctx.closePath()
}

export const paintLeviathan: DrifterPaint = (ctx, x, y, r, pal, _color, detail) => {
  // Finnen zuerst — sie liegen hinter dem Rumpf.
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(x - r * 0.3, y + s * r * 0.3)
    ctx.lineTo(x + r * 0.55, y + s * r * 1.1)
    ctx.lineTo(x + r * 0.7, y + s * r * 0.3)
    ctx.closePath()
    ctx.fillStyle = s > 0 ? pal.low : pal.mid
    ctx.fill()
    ctx.strokeStyle = 'rgba(8, 12, 12, 0.6)'
    ctx.lineWidth = Math.max(0.6, r * 0.02)
    ctx.stroke()
  }
  // Rumpf.
  hullPath(ctx, x, y, r)
  ctx.fillStyle = bodyFill(ctx, x - r * 0.3, y, r * 1.3, pal.hi, pal.mid, pal.low)
  ctx.fill()
  grain(ctx, x, y, r * 1.5, 0.12)
  // Rückenschilde.
  const ribs = DRIFTER_LEVIATHAN_RIBS + detail * 2
  ctx.strokeStyle = 'rgba(8, 12, 12, 0.5)'
  ctx.lineWidth = Math.max(0.5, r * 0.025)
  for (let i = 0; i < ribs; i++) {
    const t = -0.75 + (i / (ribs - 1)) * 1.5
    const top = -0.5 + Math.abs(t) * 0.2
    ctx.beginPath()
    ctx.arc(x + t * r, y + (top + 0.12) * r, r * 0.12, Math.PI * 1.15, Math.PI * 1.85)
    ctx.stroke()
  }
  hullPath(ctx, x, y, r)
  ctx.strokeStyle = 'rgba(8, 12, 12, 0.65)'
  ctx.lineWidth = Math.max(0.6, r * 0.03)
  ctx.stroke()
  // Das Auge: dunkel, mit Glanzpunkt.
  ctx.beginPath()
  ctx.arc(x - r * 0.98, y - r * 0.08, r * 0.09, 0, Math.PI * 2)
  ctx.fillStyle = '#0a1210'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x - r * 1.01, y - r * 0.11, r * 0.03, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
}

/** Die Seitenlinie leuchtet selbst — NACH dem Terminator. */
export const paintLeviathanLine: DrifterPaint = (ctx, x, y, r, _pal, color, detail) => {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const dots = 6 + detail * 2
  for (let i = 0; i < dots; i++) {
    const px = x + (-0.7 + (i / (dots - 1)) * 1.8) * r
    const py = y + r * (0.06 + sway(i, 91) * 0.04)
    const rad = r * (0.03 + jitter(i, 97) * 0.02)
    const g = ctx.createRadialGradient(px, py, 0, px, py, rad * 3)
    g.addColorStop(0, hot(color, 0.8, 0.9))
    g.addColorStop(0.4, tint(color, 0.4))
    g.addColorStop(1, tint(color, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(px, py, rad * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/* ── Zuordnung ───────────────────────────────────────────────────────────── */

export function paintForBodyKind(kind: DrifterBodyKind): DrifterPaint {
  switch (kind) {
    case 'chime':
      return paintChime
    case 'shard':
      return paintShard
    case 'meep':
      return paintMeep
    case 'probe':
      return paintProbe
    case 'surge':
      return paintSurge
    case 'vortex':
      return paintVortex
    case 'beacon':
      return paintBeacon
    case 'pulse':
      return paintPulse
    case 'leviathan':
      return paintLeviathan
    default: {
      const rest: never = kind
      return rest
    }
  }
}

/** Was NACH dem Terminator kommt: alles, was selbst leuchtet. */
const EMISSIVE: Partial<Record<DrifterBodyKind, DrifterPaint>> = {
  shard: paintShardVeins,
  beacon: paintBeaconLamp,
  leviathan: paintLeviathanLine,
}

/** Der ganze Körper in ein Canvas von `span` Kante: Motiv, Terminator, Leuchten. */
export function paintDrifterBody(
  ctx: CanvasRenderingContext2D,
  kind: DrifterBodyKind,
  span: number,
  px: number,
  color: string,
  detail: 0 | 1 | 2,
  art: HTMLImageElement | null,
): void {
  const c = span / 2
  const r = px / 2
  const pal = DRIFTER_BODY_PALETTE[kind]
  paintForBodyKind(kind)(ctx, c, c, r, pal, color, detail, art)
  if (DRIFTER_BODY_LIT[kind]) paintTerminator(ctx, span, r)
  EMISSIVE[kind]?.(ctx, c, c, r, pal, color, detail, art)
}

/* ── Das Artwork des Meeps ───────────────────────────────────────────────── */

let meepArt: HTMLImageElement | null = null
const artListeners = new Set<() => void>()

/** Lädt das Meep-Bild einmal; die Sprites bauen sich nach dem Laden neu. */
export function prewarmDrifterArt(): void {
  if (meepArt || typeof Image === 'undefined') return
  const img = new Image()
  img.decoding = 'async'
  img.onload = () => {
    for (const cb of [...artListeners]) cb()
  }
  img.src = DRIFTER_MEEP_ART
  meepArt = img
}

function loadedArt(): HTMLImageElement | null {
  return meepArt && meepArt.complete && meepArt.naturalWidth > 0 ? meepArt : null
}

export function drifterArtReady(kind: DrifterBodyKind): boolean {
  return kind !== 'meep' || loadedArt() !== null
}

/** Meldet, sobald das Bild da ist. Gibt die Abmeldung zurück. */
export function onDrifterArtLoad(cb: () => void): () => void {
  artListeners.add(cb)
  return () => artListeners.delete(cb)
}

/* ── Bau und Cache ───────────────────────────────────────────────────────── */

const cache = createSpriteCache(DRIFTER_SPRITE_CACHE_MAX)

export function drifterSpriteKey(
  kind: DrifterBodyKind,
  color: string,
  px: number,
  dpr: number,
  detail: number,
  art: boolean,
): string {
  return `${kind}|${color}|${px}|${dpr}|${detail}|${art ? 1 : 0}`
}

/** Der Sprite eines Körpers in Kantenlänge `px`; das Canvas misst `px × SPAN`. */
export function buildDrifterSprite(
  kind: DrifterBodyKind,
  color: string,
  px: number,
  dpr: number,
  detail: 0 | 1 | 2,
): HTMLCanvasElement | null {
  const d = clampSpriteDpr(dpr)
  const art = kind === 'meep' ? loadedArt() : null
  const key = drifterSpriteKey(kind, color, px, d, detail, art !== null)
  const hit = cache.get(key)
  if (hit) return hit
  const span = Math.round(px * DRIFTER_SPRITE_SPAN)
  const made = newSpriteCanvas(span, d)
  if (!made) return null
  paintDrifterBody(made.ctx, kind, span, px, color, detail, art)
  cache.set(key, made.cv)
  return made.cv
}

export function clearDrifterSpriteCache(): void {
  cache.clear()
}
