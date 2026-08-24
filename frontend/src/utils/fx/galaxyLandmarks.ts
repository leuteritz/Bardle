/* ── Landmarken einer Galaxiekarte ────────────────────────────────────────────
   Vier Orte erzählen die Geschichte einer befreiten Galaxie: von wo aufgebrochen
   wurde, welche Sterne befreit wurden, welche verloren gingen, und wo der Boss
   im Kern fiel.

   Unterschieden werden sie über die FORM, nicht über Farbe oder Glyph — beides
   verschwindet als Erstes, wenn das Bild klein wird, und die Leistenminiatur
   zeigt einen befreiten Stern bei 4,5 px Radius. Hohler Ring · Scheibe mit Halo ·
   unrunde Hülle · Strahlenkranz halten dort noch auseinander.

   Zwei Aufrufer: `galaxyPlate.ts` (Voyages-Karte, Archivstandbild, Übersichts-
   karte, Leistenminiatur) und `MiniMapCanvas.vue` (Live-Minimap). */

import {
  LANDMARK_R_ORNAMENT,
  LANDMARK_R_DETAIL,
  LANDMARK_VARIANTS,
  LANDMARK_PAD_SPAN,
  LANDMARK_SPRITE_CACHE_MAX,
} from '@/config/constants'

export type LandmarkKind = 'departure-portal' | 'star-freed' | 'star-lost' | 'core-freed'

export interface LandmarkOpts {
  /** Backing-Dichte des Ziels — der Sprite-Cache ist danach geschlüsselt. */
  dpr?: number
  /** Aus dem INDEX, nicht geseedet: eine geseedete Palette sprengte den Cache. */
  variant?: number
  /** Nur `departure-portal`: Richtung der ersten Etappe in rad. */
  heading?: number
  /** Erzwungene Detailstufe — die Legendensonde malt immer die volle. */
  detail?: 0 | 1 | 2
}

/** Detailstufe aus dem Radius. Stufe 0 ist die blanke Silhouette. */
export function landmarkTier(r: number): 0 | 1 | 2 {
  if (r >= LANDMARK_R_DETAIL) return 2
  if (r >= LANDMARK_R_ORNAMENT) return 1
  return 0
}

/** Randzone um den Körper: weitester Zierrat plus Kontur-`shadowBlur`. */
export function landmarkPad(r: number): number {
  return Math.ceil(r * LANDMARK_PAD_SPAN + 12)
}

export function landmarkVariantFor(i: number): number {
  return ((i % LANDMARK_VARIANTS) + LANDMARK_VARIANTS) % LANDMARK_VARIANTS
}

/**
 * Auf HALBE Pixel, nicht auf ganze: in der Leistenminiatur fallen befreit (4,5)
 * und verloren (3,5) ganzzahlig gerundet beide auf 4 und wären gleich groß.
 */
export function roundLandmarkRadius(r: number): number {
  return Math.max(2, Math.round(r * 2) / 2)
}

export function landmarkSpriteKey(
  kind: LandmarkKind,
  r: number,
  dpr: number,
  variant: number,
): string {
  return `${kind}|${r}|${dpr}|${variant}`
}

/* ── Sprite-Cache ─────────────────────────────────────────────────────────────
   Gerettete und verlorene Sterne kommen bis zu ~50× je Karte vor und sind
   innerhalb einer Variante pixelgleich — einmal rastern, danach kostet einer ein
   `drawImage`. Genau das war der Grund, warum eine Galaxie voller gescheiterter
   Sterne die Framerate halbiert hat.

   Der Bruchkeil des verlorenen Sterns wird mit `destination-out` geschnitten.
   Auf dem Hauptcanvas risse das ein Loch in die Spirale dahinter — im Sprite ist
   es harmlos. Deshalb hat `star-lost` KEINEN Direktpfad.

   LRU statt unbegrenzt: halbe Radien, drei Varianten und mehrere dpr-Werte
   ergeben genug Schlüssel, dass ein Fensterziehen sonst beliebig viele Sprites
   nachzieht (bei r=9, dpr=3.1 rund 178 KB je Stück). */

const spriteCache = new Map<string, HTMLCanvasElement>()

function getSprite(
  kind: 'star-freed' | 'star-lost',
  r: number,
  dpr: number,
  variant: number,
  detail: 0 | 1 | 2,
): HTMLCanvasElement | null {
  const key = landmarkSpriteKey(kind, r, dpr, variant) + `|${detail}`
  const hit = spriteCache.get(key)
  if (hit) {
    spriteCache.delete(key)
    spriteCache.set(key, hit)
    return hit
  }

  const pad = landmarkPad(r)
  const size = pad * 2
  const sprite = document.createElement('canvas')
  sprite.width = Math.max(1, Math.round(size * dpr))
  sprite.height = Math.max(1, Math.round(size * dpr))
  const sctx = sprite.getContext('2d')
  if (!sctx) return null
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (kind === 'star-freed') paintFreedStar(sctx, pad, pad, r, variant, detail)
  else paintLostStar(sctx, pad, pad, r, variant, detail)

  spriteCache.set(key, sprite)
  if (spriteCache.size > LANDMARK_SPRITE_CACHE_MAX) {
    const oldest = spriteCache.keys().next().value
    if (oldest !== undefined) spriteCache.delete(oldest)
  }
  return sprite
}

/* ── Die vier Formen ──────────────────────────────────────────────────────── */

/** Abflugportal: hohler Ellipsenring QUER zur Flugrichtung — man fliegt hindurch. */
function paintDeparturePortal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  heading: number,
  detail: 0 | 1 | 2,
): void {
  const rx = r
  const ry = r * 0.42
  const tilt = heading + Math.PI / 2

  ctx.save()
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 1.9)
  glow.addColorStop(0, 'rgba(255, 214, 120, 0.34)')
  glow.addColorStop(1, 'rgba(255, 214, 120, 0)')
  ctx.beginPath()
  ctx.arc(x, y, r * 1.9, 0, Math.PI * 2)
  ctx.fillStyle = glow
  ctx.fill()

  // Dunkler Innenraum: erst dadurch liest sich der Ring als Durchgang und nicht
  // als Scheibe — gegen die helle Spirale dahinter reicht Umriss allein nicht.
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, tilt, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(11, 8, 6, 0.85)'
  ctx.fill()

  ctx.strokeStyle = '#e8c040'
  ctx.lineWidth = Math.max(1, r * 0.2)
  ctx.shadowColor = 'rgba(232, 192, 64, 0.8)'
  ctx.shadowBlur = Math.max(3, r * 0.9)
  ctx.stroke()
  ctx.shadowBlur = 0

  if (detail >= 2) {
    ctx.beginPath()
    ctx.ellipse(x, y, rx * 0.62, ry * 0.62, tilt, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 238, 180, 0.55)'
    ctx.lineWidth = Math.max(0.7, r * 0.1)
    ctx.stroke()

    const mote = Math.max(0.9, r * 0.13)
    for (const s of [-1, 1]) {
      const mx = x + Math.cos(tilt) * rx * s
      const my = y + Math.sin(tilt) * rx * s
      ctx.beginPath()
      ctx.arc(mx, my, mote, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 244, 200, 0.9)'
      ctx.fill()
    }
  }

  if (detail >= 1) {
    // Chevron in Flugrichtung — der Portalring allein sagt nicht, wohin.
    const gap = r * 1.5
    const wing = r * 0.72
    const tipX = x + Math.cos(heading) * gap
    const tipY = y + Math.sin(heading) * gap
    const spread = 0.52
    ctx.beginPath()
    ctx.moveTo(
      tipX - wing * Math.cos(heading - spread),
      tipY - wing * Math.sin(heading - spread),
    )
    ctx.lineTo(tipX, tipY)
    ctx.lineTo(
      tipX - wing * Math.cos(heading + spread),
      tipY - wing * Math.sin(heading + spread),
    )
    ctx.strokeStyle = 'rgba(240, 205, 96, 0.9)'
    ctx.lineWidth = Math.max(1, r * 0.18)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }
  ctx.restore()
}

/** Befreiter Stern: goldene Scheibe mit HALO-RING — der Ring ist die Identität. */
function paintFreedStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  variant: number,
  detail: 0 | 1 | 2,
): void {
  ctx.save()
  const atmo = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.9)
  atmo.addColorStop(0, 'rgba(255, 210, 50, 0.55)')
  atmo.addColorStop(0.55, 'rgba(255, 170, 20, 0.18)')
  atmo.addColorStop(1, 'rgba(255, 140, 0, 0)')
  ctx.beginPath()
  ctx.arc(x, y, r * 1.9, 0, Math.PI * 2)
  ctx.fillStyle = atmo
  ctx.fill()

  const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.32, r * 0.05, x, y, r)
  body.addColorStop(0, '#ffffc8')
  body.addColorStop(0.35, '#e8c040')
  body.addColorStop(0.72, '#8a5810')
  body.addColorStop(1, '#1e0e02')
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = body
  ctx.fill()

  if (detail >= 2) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, r - 0.5, 0, Math.PI * 2)
    ctx.clip()
    ctx.globalAlpha = 0.07
    ctx.beginPath()
    ctx.ellipse(x, y - r * 0.28, r * 0.88, r * 0.12, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.24, r * 0.82, r * 0.1, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fill()
    ctx.restore()
  }

  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.strokeStyle = '#fff8c0'
  ctx.lineWidth = Math.max(1, r * 0.16)
  ctx.shadowColor = 'rgba(255, 210, 60, 0.85)'
  ctx.shadowBlur = Math.max(4, r)
  ctx.stroke()
  ctx.shadowBlur = 0

  // Der Halo-Ring — er trägt die Form auch dort, wo die Scheibe nur vier Pixel
  // misst. Eng und leise gehalten: eine volle Galaxie bringt bis zu 36 davon,
  // und ein weiter, heller Ring deckte die Spirale zu.
  const halo = r * 1.28
  ctx.beginPath()
  ctx.arc(x, y, halo, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255, 232, 150, 0.34)'
  ctx.lineWidth = Math.max(0.8, r * 0.1)
  ctx.stroke()

  // Motes erst auf der vollen Stufe: im Archivstandbild (r 8.5) wären 36×3
  // Punkte Rauschen, auf der 2K-Karte tragen sie.
  if (detail >= 2) {
    const count = 4
    const mote = Math.max(0.9, r * 0.16)
    const phase = (variant / LANDMARK_VARIANTS) * Math.PI * 2
    for (let i = 0; i < count; i++) {
      const a = phase + (i / count) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(x + Math.cos(a) * halo, y + Math.sin(a) * halo, mote, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 248, 210, 0.92)'
      ctx.fill()
    }
  }
  ctx.restore()
}

/** Verlorener Stern: ausgebrannte Hülle mit BRUCHKEIL — eine unrunde Silhouette. */
function paintLostStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  variant: number,
  detail: 0 | 1 | 2,
): void {
  const dir = (variant / LANDMARK_VARIANTS) * Math.PI * 2 - 0.8
  const half = 0.48 // ~55° Keil

  ctx.save()
  const atmo = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.45)
  atmo.addColorStop(0, 'rgba(200, 60, 40, 0.28)')
  atmo.addColorStop(0.6, 'rgba(160, 40, 25, 0.1)')
  atmo.addColorStop(1, 'rgba(120, 30, 20, 0)')
  ctx.beginPath()
  ctx.arc(x, y, r * 1.45, 0, Math.PI * 2)
  ctx.fillStyle = atmo
  ctx.fill()

  const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.32, r * 0.05, x, y, r)
  body.addColorStop(0, '#7a5a50')
  body.addColorStop(0.45, '#4a2c24')
  body.addColorStop(1, '#140806')
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = body
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(220, 90, 60, 0.6)'
  ctx.lineWidth = Math.max(1, r * 0.14)
  ctx.stroke()

  if (detail >= 1) {
    const cracks = detail >= 2 ? 3 : 2
    ctx.strokeStyle = 'rgba(230, 120, 60, 0.5)'
    ctx.lineWidth = Math.max(0.7, r * 0.11)
    ctx.lineCap = 'round'
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.clip()
    for (let i = 0; i < cracks; i++) {
      const a = dir + Math.PI + (i - (cracks - 1) / 2) * 0.7
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9)
      ctx.lineTo(x + Math.cos(a + 0.5) * r * 0.28, y + Math.sin(a + 0.5) * r * 0.28)
      ctx.lineTo(x - Math.cos(a) * r * 0.75, y - Math.sin(a) * r * 0.75)
      ctx.stroke()
    }
    ctx.restore()
  }

  // Der Keil — erst er macht die Silhouette unrund und damit auf einen Blick
  // vom befreiten Stern unterscheidbar. Nur im Sprite ungefährlich.
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.moveTo(x + Math.cos(dir) * r * 0.18, y + Math.sin(dir) * r * 0.18)
  ctx.arc(x, y, r * 1.08, dir - half, dir + half)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.beginPath()
  ctx.moveTo(x + Math.cos(dir - half) * r * 1.02, y + Math.sin(dir - half) * r * 1.02)
  ctx.lineTo(x + Math.cos(dir) * r * 0.18, y + Math.sin(dir) * r * 0.18)
  ctx.lineTo(x + Math.cos(dir + half) * r * 1.02, y + Math.sin(dir + half) * r * 1.02)
  ctx.strokeStyle = 'rgba(220, 110, 70, 0.75)'
  ctx.lineWidth = Math.max(0.8, r * 0.12)
  ctx.lineJoin = 'round'
  ctx.stroke()

  if (detail >= 1) {
    const sparks = detail >= 2 ? 4 : 2
    for (let i = 0; i < sparks; i++) {
      const a = dir + (i / Math.max(1, sparks - 1) - 0.5) * half * 1.6
      const d = r * (1.5 + (i % 2) * 0.7)
      const s = Math.max(0.7, r * (0.13 - (i % 2) * 0.03))
      ctx.beginPath()
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 150, 90, ${(0.55 - (i % 2) * 0.2).toFixed(2)})`
      ctx.fill()
    }
  }
  ctx.restore()
}

/** Befreiter Kern: STRAHLENKRANZ plus zerbrochene Krone — der besiegte Bossstern. */
function paintFreedCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  detail: 0 | 1 | 2,
): void {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const drawRays = (count: number, from: number, longR: number, shortR: number, alpha: number) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2
      const len = i % 2 === 0 ? longR : shortR
      const w = r * 0.16
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
      ctx.lineTo(x + Math.cos(a - 0.5) * w + Math.cos(a) * from, y + Math.sin(a - 0.5) * w + Math.sin(a) * from)
      ctx.lineTo(x + Math.cos(a + 0.5) * w + Math.cos(a) * from, y + Math.sin(a + 0.5) * w + Math.sin(a) * from)
      ctx.closePath()
      ctx.fillStyle = `rgba(255, 224, 140, ${alpha})`
      ctx.fill()
    }
  }
  drawRays(8, r * 1.15, r * 2.4, r * 1.75, 0.5)
  if (detail >= 1) drawRays(4, r * 1.1, r * 1.5, r * 1.5, 0.26)
  ctx.restore()

  ctx.save()
  const body = ctx.createRadialGradient(x - r * 0.28, y - r * 0.3, r * 0.05, x, y, r)
  body.addColorStop(0, '#fffbe6')
  body.addColorStop(0.38, '#ffd968')
  body.addColorStop(0.74, '#a06818')
  body.addColorStop(1, '#1e0e02')
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = body
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.strokeStyle = '#fff8d0'
  ctx.lineWidth = Math.max(1, r * 0.12)
  ctx.shadowColor = 'rgba(255, 220, 90, 0.9)'
  ctx.shadowBlur = Math.max(5, r * 0.9)
  ctx.stroke()
  ctx.shadowBlur = 0

  if (detail >= 2) {
    ctx.beginPath()
    ctx.arc(x, y, r * 0.72, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 255, 235, 0.4)'
    ctx.lineWidth = Math.max(0.7, r * 0.07)
    ctx.stroke()
  }

  // Zerbrochene Krone: der gesprengte Ring, den der Boss getragen hat. Zwei
  // Bögen mit Lücken — ein geschlossener Ring läse sich als Planetenring.
  const gap = detail >= 1 ? 0.5 : 0.32
  const crown = (rx: number, ry: number, alpha: number, width: number) => {
    ctx.lineWidth = width
    ctx.strokeStyle = `rgba(255, 214, 120, ${alpha})`
    for (const base of [0, Math.PI]) {
      ctx.beginPath()
      ctx.ellipse(x, y, rx, ry, -0.32, base + gap / 2, base + Math.PI - gap / 2)
      ctx.stroke()
    }
  }
  crown(r * 1.5, r * 0.55, 0.7, Math.max(1, r * 0.1))
  if (detail >= 2) crown(r * 1.95, r * 0.7, 0.28, Math.max(0.7, r * 0.07))
  ctx.restore()
}

/* ── Einstieg ─────────────────────────────────────────────────────────────── */

export function drawLandmark(
  ctx: CanvasRenderingContext2D,
  kind: LandmarkKind,
  x: number,
  y: number,
  r: number,
  opts: LandmarkOpts = {},
): void {
  const detail = opts.detail ?? landmarkTier(r)
  const variant = landmarkVariantFor(opts.variant ?? 0)

  if (kind === 'departure-portal') {
    paintDeparturePortal(ctx, x, y, r, opts.heading ?? 0, detail)
    return
  }
  if (kind === 'core-freed') {
    paintFreedCore(ctx, x, y, r, detail)
    return
  }

  const dpr = opts.dpr ?? 1
  const sprite = getSprite(kind, r, dpr, variant, detail)
  if (!sprite) return
  const pad = landmarkPad(r)
  ctx.drawImage(sprite, x - pad, y - pad, pad * 2, pad * 2)
}
