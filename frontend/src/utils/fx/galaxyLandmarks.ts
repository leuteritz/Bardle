/* ── Landmarken einer Galaxiekarte ────────────────────────────────────────────
   Vier Orte erzählen die Geschichte einer befreiten Galaxie: wo Bard sie betrat,
   welche Sterne befreit wurden, welche verloren gingen, und was aus dem Kern
   geworden ist, in dem der Boss sass.

   Unterschieden werden sie über die FORM, nicht über Farbe oder Glyph — beides
   verschwindet als Erstes, wenn das Bild klein wird, und die Leistenminiatur
   zeigt einen befreiten Stern bei 4,5 px Radius. Hohle Ellipse · hohler Ring mit
   Kernfunke · massive unrunde Hülle · hohles Achteck halten dort noch
   auseinander.

   Befreit ist HOHL, verloren ist MASSIV — und nicht umgekehrt: der befreite
   Stern kommt bis zu dreißigmal je Karte vor, der verlorene siebenmal. Als
   gefüllte Goldkugel mit Schein deckte das häufige Ereignis die Spirale zu und
   trug die Betonung, die dem seltenen gehört.

   Zwei Aufrufer: `galaxyPlate.ts` (Voyages-Karte, Archivstandbild, Übersichts-
   karte, Leistenminiatur) und `MiniMapCanvas.vue` (Live-Minimap). */

import {
  CORE_GATE_CROWN_SPAN,
  CORE_GATE_FALLBACK_TINT,
  CORE_GATE_POOL_SPAN,
  LANDMARK_FREED_CORE,
  LANDMARK_FREED_RING,
  LANDMARK_R_ORNAMENT,
  LANDMARK_R_DETAIL,
  LANDMARK_VARIANTS,
  LANDMARK_PAD_SPAN,
  LANDMARK_SPRITE_CACHE_MAX,
} from '@/config/constants'

export type LandmarkKind = 'departure-portal' | 'star-freed' | 'star-lost' | 'core-gate'

export interface LandmarkOpts {
  /** Backing-Dichte des Ziels — der Sprite-Cache ist danach geschlüsselt. */
  dpr?: number
  /** Aus dem INDEX, nicht geseedet: eine geseedete Palette sprengte den Cache. */
  variant?: number
  /** Nur `departure-portal`: Richtung der ersten Etappe in rad. */
  heading?: number
  /** Erzwungene Detailstufe — die Legendensonde malt immer die volle. */
  detail?: 0 | 1 | 2
  /**
   * Themenakzent als `"r, g, b"` — NUR `core-gate`. Der Kern trägt die Farbe
   * SEINER Galaxie (`minimapAccentForTheme`), das Gold bleibt den Häfen.
   */
  tint?: string
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

/**
 * Der Schlüssel kennt `tint` NICHT — und darf es auch nicht müssen: alle Kinds
 * mit Sprite sind farblich fix. Wer `core-gate` je auf den Sprite-Pfad legt,
 * muss die Tönung hier aufnehmen, sonst zeigt eine Galaxie die Farbe einer
 * anderen und niemand sieht, warum.
 */
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
   nachzieht. Seit befreit ein Ring ist und die Funken des verlorenen Sterns
   gefallen sind, reicht die halbe Randzone (LANDMARK_PAD_SPAN 2.4 → 1.7) — das
   sind rund 40 % weniger Fläche je Sprite. */

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

/**
 * Befreiter Stern: hohler Ring mit Kernfunke — die Spirale läuft sichtbar
 * hindurch, statt unter einer Scheibe zu verschwinden.
 *
 * Der Ring ist UNBUNT und der Kern trägt die Bedeutung. Grund steht bei
 * `LANDMARK_FREED_RING`: die zwanzig Themen decken den Farbkreis ab, und Gold
 * gehört der Reise — Route, Portal und Häfen tragen es schon.
 */
function paintFreedStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  variant: number,
  detail: 0 | 1 | 2,
): void {
  const ring = r * 0.86

  ctx.save()

  // Zwei Züge, dunkel und breiter unter Hell — dieselbe Lösung wie bei der Krone
  // des Tors, und für einen weissen Ring nötiger als für einen goldenen: die
  // Armpartikel sind selbst weisslich. Der Grund ist ein RING, keine Füllung;
  // die Mitte muss durchsichtig bleiben, sonst ist die Marke wieder eine Scheibe.
  ctx.beginPath()
  ctx.arc(x, y, ring, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(11, 8, 6, 0.75)'
  ctx.lineWidth = Math.max(2, r * 0.34)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(x, y, ring, 0, Math.PI * 2)
  ctx.strokeStyle = LANDMARK_FREED_RING
  ctx.lineWidth = Math.max(1.2, r * 0.17)
  ctx.stroke()

  if (detail >= 2) {
    const spark = ctx.createRadialGradient(x, y, 0, x, y, r * 0.5)
    spark.addColorStop(0, 'rgba(92, 232, 180, 0.25)')
    spark.addColorStop(1, 'rgba(92, 232, 180, 0)')
    ctx.beginPath()
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = spark
    ctx.fill()
  }

  // Der Kernfunke trägt die Marke dort, wo der Ring auf zwei Pixel zusammenfällt
  // — und er trägt die Bedeutung: dieselbe Farbe wie „Crew zurück".
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0.9, r * 0.26), 0, Math.PI * 2)
  ctx.fillStyle = LANDMARK_FREED_CORE
  ctx.fill()

  // Ein Trabant auf der Ringlinie — ein wieder in Bewegung geratenes System.
  // Sein Winkel kommt aus dem INDEX, nicht aus dem Zufall: eine geseedete Lage
  // sprengte den Sprite-Cache. Nur auf der vollen Stufe; im Standbild wären
  // sechsunddreissig zusätzliche Punkte Rauschen.
  if (detail >= 2) {
    const a = (variant / LANDMARK_VARIANTS) * Math.PI * 2 - 0.6
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * ring, y + Math.sin(a) * ring, Math.max(1, r * 0.16), 0, Math.PI * 2)
    ctx.fillStyle = LANDMARK_FREED_RING
    ctx.fill()
  }

  ctx.restore()
}

/**
 * Verlorener Stern: massive ausgebrannte Hülle mit BRUCHKEIL — unrunde
 * Silhouette, dunkler Saum. Er ist der einzige gefüllte Körper der Geschichte:
 * die Narbe leuchtet nicht, sie verschluckt.
 */
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
  // Dunkler Saum statt rotem Hof: ein Leuchten um jede Narbe war wieder
  // Farbfläche im Bild, und es sagte das Gegenteil dessen, was hier steht.
  const seam = ctx.createRadialGradient(x, y, r * 0.85, x, y, r * 1.3)
  seam.addColorStop(0, 'rgba(11, 8, 6, 0.5)')
  seam.addColorStop(1, 'rgba(11, 8, 6, 0)')
  ctx.beginPath()
  ctx.arc(x, y, r * 1.3, 0, Math.PI * 2)
  ctx.fillStyle = seam
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

  ctx.restore()
}

/**
 * Achteckpfad mit einer FLACHEN Kante oben (Versatz um eine halbe Ecke). `r` ist
 * der Eckradius; die Kantenmitte liegt bei `r · cos(π/8)` ≈ 0,924 r.
 */
function octagonPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rot = 0,
): void {
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = rot + (i / 8) * Math.PI * 2 - Math.PI / 8
    const px = x + Math.cos(a) * r
    const py = y + Math.sin(a) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/**
 * Caretaker's Gate: der befreite Kern als ÖFFNUNG, nicht als Körper.
 *
 * Er war eine gefüllte Goldkugel mit Strahlenkranz und las sich damit als zweite
 * Sonne mitten in der Galaxie. Jetzt: dunkler Schlund, heller achteckiger Rand
 * in der Farbe SEINER Galaxie, darum die zersprungene Krone des Bosses.
 *
 * Der Schlund ist in Hintergrundfarbe GEFÜLLT, nicht mit `destination-out`
 * gestanzt — dieselbe Lösung wie beim Abflugportal und aus demselben Grund:
 * `core-gate` malt auf dem Direktpfad in die echte Karte, ein Stanzen risse dort
 * ein Loch in die Spirale dahinter.
 *
 * Er schluckt dabei die Kernglut des Galaxiekörpers, die an derselben Stelle
 * liegt — genau das macht aus der Scheibe ein Auge.
 */
function paintCoreGate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  detail: 0 | 1 | 2,
  tint?: string,
): void {
  const c = tint ?? CORE_GATE_FALLBACK_TINT
  ctx.save()

  // Schattenteich: die Kernglut des Galaxiekörpers liegt an derselben Stelle und
  // liesse das Tor sonst in einem hellen Fleck schwimmen — ein Loch in einem
  // Leuchten ist kein Loch. Er wird VOR der Krone gemalt, damit die auf dem
  // gedämpften Grund steht statt darin zu verschwinden.
  const pool = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * CORE_GATE_POOL_SPAN)
  pool.addColorStop(0, 'rgba(6, 5, 4, 0.62)')
  pool.addColorStop(0.55, 'rgba(6, 5, 4, 0.4)')
  pool.addColorStop(1, 'rgba(6, 5, 4, 0)')
  ctx.beginPath()
  ctx.arc(x, y, r * CORE_GATE_POOL_SPAN, 0, Math.PI * 2)
  ctx.fillStyle = pool
  ctx.fill()

  // Zerbrochene Krone: der gesprengte Ring, den der Boss getragen hat. Zwei
  // Bögen mit Lücken — ein geschlossener Ring läse sich als Planetenring.
  //
  // Zwei Züge je Bogen: erst dunkel und breiter, dann in der Themenfarbe. Ohne
  // die dunkle Unterlage verschwand die dünne Linie über der Spirale.
  const gap = detail >= 1 ? 0.5 : 0.32
  const crownArc = () => {
    for (const base of [0, Math.PI]) {
      ctx.beginPath()
      ctx.ellipse(
        x,
        y,
        r * CORE_GATE_CROWN_SPAN,
        r * 0.55,
        -0.32,
        base + gap / 2,
        base + Math.PI - gap / 2,
      )
      ctx.stroke()
    }
  }
  ctx.lineWidth = Math.max(2, r * 0.19)
  ctx.strokeStyle = 'rgba(6, 5, 4, 0.7)'
  crownArc()
  ctx.lineWidth = Math.max(1, r * 0.1)
  ctx.strokeStyle = `rgba(${c}, 0.85)`
  crownArc()

  // Der Schlund. Am Rand absichtlich durchlässiger als in der Mitte, sonst säße
  // eine harte Scheibe in der Spirale statt einer Tiefe.
  octagonPath(ctx, x, y, r)
  const maw = ctx.createRadialGradient(x, y, r * 0.05, x, y, r)
  maw.addColorStop(0, 'rgba(6, 5, 4, 0.92)')
  maw.addColorStop(0.62, 'rgba(6, 5, 4, 0.8)')
  maw.addColorStop(1, 'rgba(6, 5, 4, 0.3)')
  ctx.fillStyle = maw
  ctx.fill()

  // Derselbe Pfad als Kontur — der Rand IST die Marke.
  ctx.strokeStyle = `rgba(${c}, 0.95)`
  ctx.lineWidth = Math.max(1, r * 0.15)
  ctx.shadowColor = `rgba(${c}, 0.6)`
  ctx.shadowBlur = Math.max(3, r * 0.5)
  ctx.stroke()
  ctx.shadowBlur = 0

  // Iris, um eine halbe Ecke gedreht: ihre Ecken sitzen auf den Kanten des
  // äusseren Achtecks, sonst läge Linie auf Linie.
  if (detail >= 1) {
    octagonPath(ctx, x, y, r * 0.66, Math.PI / 8)
    ctx.strokeStyle = `rgba(${c}, 0.42)`
    ctx.lineWidth = Math.max(0.7, r * 0.07)
    ctx.stroke()
  }

  // Ein Funke in der Mitte — ohne ihn liest sich der Schlund als Loch im Bild.
  if (detail >= 2) {
    ctx.beginPath()
    ctx.arc(x, y, Math.max(0.9, r * 0.11), 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${c}, 0.9)`
    ctx.fill()
  }
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
  if (kind === 'core-gate') {
    paintCoreGate(ctx, x, y, r, detail, opts.tint)
    return
  }

  const dpr = opts.dpr ?? 1
  const sprite = getSprite(kind, r, dpr, variant, detail)
  if (!sprite) return
  const pad = landmarkPad(r)
  ctx.drawImage(sprite, x - pad, y - pad, pad * 2, pad * 2)
}
