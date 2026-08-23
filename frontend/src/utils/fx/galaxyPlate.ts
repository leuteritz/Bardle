/* ── Galaxie-Platte ───────────────────────────────────────────────────────────
   Eine Zeichenreihenfolge, zwei Aufrufer: das 320×200-Standbild des Archivs
   (`galaxySnapshot.ts`) und die grosse Karte des Voyages-Reiters.

   Vollständig deterministisch aus dem Datensatz — derselbe `mapSeed` ergibt
   dieselbe Spirale, dieselben Sternpositionen, dieselbe Route. Es wird nie
   Pixelmaterial gespeichert; der winzige `CompletedGalaxyRecord` im Spielstand
   reicht, um die Karte nachzuzeichnen.

   ALLE festen Grössen skalieren mit `box.w / GALAXY_PLATE_REF_W`. Bei 320 px
   ist der Faktor 1 und das Archivbild bleibt Pixel für Pixel das alte; bei 950
   sind Sterne und Route mitgewachsen statt Stecknadeln zu bleiben. */

import {
  seededRng,
  galaxyGeo,
  galaxyPlaneToWorld,
  getGalaxyParticles,
  GALAXY_PARTICLE_COLORS,
  minimapAccentForTheme,
  drawPlanet,
  drawVisitedStar,
  drawRouteArrowhead,
  generateGalaxyDots,
} from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  MINIMAP_TWINKLE_COUNT,
  MINIMAP_GALAXY_CORE_RADIUS,
  SNAPSHOT_ROUTE_ARROW_SIZE,
  SNAPSHOT_ROUTE_ARROW_GAP,
  VOYAGE_MAP_ASPECT_MIN,
  VOYAGE_MAP_ASPECT_MAX,
  VOYAGE_MAP_INSET_PX,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

/** Bezugsgrösse aller festen Pixelwerte hier — die Grösse des Archivstandbilds. */
export const GALAXY_PLATE_REF_W = 320
export const GALAXY_PLATE_REF_H = 200

export interface FitBox {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Der Kasten, in den der normalisierte 0..1-Raum der Galaxie fällt, zentriert
 * in w×h.
 *
 * Ein Seitenverhältnis-BAND statt eines festen Werts: über
 * `VOYAGE_MAP_ASPECT_MAX` schmiert die Scheibe zum Streifen, unter
 * `VOYAGE_MAP_ASPECT_MIN` falten sich die Arme übereinander. Dazwischen nimmt
 * der Kasten die ganze eingerückte Fläche.
 *
 * Hintergrund, Dunst und Funkelsterne malt `paintGalaxy` über die VOLLE Fläche,
 * die Letterbox zeigt sich also nie als Balken, sondern als Tiefraum.
 */
export function galaxyFitBox(w: number, h: number, inset = VOYAGE_MAP_INSET_PX): FitBox {
  const aw = Math.max(1, w - inset * 2)
  const ah = Math.max(1, h - inset * 2)
  const aspect = Math.min(VOYAGE_MAP_ASPECT_MAX, Math.max(VOYAGE_MAP_ASPECT_MIN, aw / ah))
  const bw = Math.min(aw, ah * aspect)
  const bh = bw / aspect
  return { x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh }
}

export interface GalaxyPaintOpts {
  /**
   * `full` — `drawPlanet` je Versuch: das Archivstandbild, unveränderte Bytes.
   * `bodies` — `drawVisitedStar` aus dem Sprite-Cache: bei bis zu ~50 Häfen auf
   * der grossen Karte ein `drawImage` statt zweier Radialverläufe je Körper.
   * Optisch identisch, weil `drawPlanet` für `rescued`/`failed` feste Verläufe
   * nimmt und die geseedete Palette dort ohnehin ignoriert.
   */
  markers: 'full' | 'bodies'
  /** Nur für `bodies` — der Sprite-Cache ist danach geschlüsselt. */
  dpr?: number
  /** Die grosse Karte dämpft die Route, damit die DOM-Marken darüber das
   *  Lauteste auf der Platte bleiben. */
  routeAlpha?: number
  /**
   * Zusatzfaktor auf die GESCHICHTE — Route, Startmarke und die Körper der
   * besuchten Sterne. Das Standbild lässt ihn auf 1; die grosse Karte drückt
   * ihn auf VOYAGE_MAP_HISTORY_SCALE, weil 36 linear hochgezogene Sterne die
   * Spirale zudecken und mit den anklickbaren Marken konkurrieren.
   * Kern und Kernglut bleiben ausgenommen: sie sind der Anker der Karte.
   */
  historyScale?: number
}

export function paintGalaxy(
  ctx: CanvasRenderingContext2D,
  record: CompletedGalaxyRecord,
  w: number,
  h: number,
  box: FitBox,
  opts: GalaxyPaintOpts,
): void {
  const k = box.w / GALAXY_PLATE_REF_W
  /** Massstab der Geschichte — siehe `historyScale`. */
  const hk = k * (opts.historyScale ?? 1)
  const dpr = opts.dpr ?? 1
  const routeAlpha = opts.routeAlpha ?? 0.55
  const toC = (wx: number, wy: number): [number, number] => [
    box.x + wx * box.w,
    box.y + wy * box.h,
  ]

  // ── Tiefraum mit einem Hauch Theme-Dunst ──
  ctx.fillStyle = '#0b0806'
  ctx.fillRect(0, 0, w, h)
  const accent = minimapAccentForTheme(record.themeIndex)
  const haze = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6)
  haze.addColorStop(0, `rgba(${accent}, 0.06)`)
  haze.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = haze
  ctx.fillRect(0, 0, w, h)

  // ── Funkelsterne, mitten im Funkeln eingefroren ──
  // Die Zahl wächst mit der FLÄCHE, sonst stünden dreissig Punkte verloren auf
  // einer Panelfläche. Bei 320×200 ergibt das exakt MINIMAP_TWINKLE_COUNT.
  const twinkles = Math.round(
    (MINIMAP_TWINKLE_COUNT * (w * h)) / (GALAXY_PLATE_REF_W * GALAXY_PLATE_REF_H),
  )
  const twRng = seededRng(record.galaxy * 52361 + 7)
  const twScale = Math.max(1, k)
  for (let i = 0; i < twinkles; i++) {
    const tx = twRng() * w
    const ty = twRng() * h
    twRng() // Phase — im Standbild ungenutzt, die Ziehreihenfolge bleibt gleich
    twRng() // Periode
    const size = (0.8 + twRng() * 1.0) * twScale
    const tint = twRng()
    const a = 0.2 + 0.55 * 0.5
    ctx.beginPath()
    ctx.arc(tx, ty, size, 0, Math.PI * 2)
    ctx.fillStyle =
      tint < 0.33
        ? `rgba(255, 233, 176, ${a.toFixed(3)})`
        : tint < 0.66
          ? `rgba(207, 224, 255, ${a.toFixed(3)})`
          : `rgba(255, 255, 255, ${a.toFixed(3)})`
    ctx.fill()
  }

  // ── Spiralgalaxie: Kernglut plus geseedete Partikel, additiv ──
  const geo = galaxyGeo(record.mapSeed)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const [gcx, gcy] = toC(0.5, 0.5)
  const coreR = MINIMAP_GALAXY_CORE_RADIUS * box.w
  const coreBright = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, coreR * 0.55)
  coreBright.addColorStop(0, 'rgba(255, 240, 200, 0.35)')
  coreBright.addColorStop(1, 'rgba(255, 240, 200, 0)')
  ctx.fillStyle = coreBright
  ctx.fillRect(gcx - coreR, gcy - coreR, coreR * 2, coreR * 2)
  const halo = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, coreR * 1.9)
  halo.addColorStop(0, 'rgba(240, 205, 140, 0.1)')
  halo.addColorStop(1, 'rgba(240, 205, 140, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(gcx - coreR * 2, gcy - coreR * 2, coreR * 4, coreR * 4)
  for (const p of getGalaxyParticles(record.mapSeed)) {
    const wp = galaxyPlaneToWorld(geo, p.angle, p.r)
    const [px, py] = toC(wp.x, wp.y)
    const rgb = p.color === 2 ? accent : GALAXY_PARTICLE_COLORS[p.color]
    ctx.beginPath()
    ctx.arc(px, py, p.size * twScale, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${rgb}, ${p.alpha.toFixed(3)})`
    ctx.fill()
  }
  ctx.restore()

  // ── Die Reise: Start → jeder versuchte Stern → der befreite Kern ──
  const attempts = record.attemptResults.length
  const { spawn, dots } = generateGalaxyDots(record.mapSeed, attempts + 1)
  ctx.beginPath()
  ctx.strokeStyle = `rgba(232, 192, 64, ${routeAlpha.toFixed(3)})`
  ctx.lineWidth = 1.6 * hk
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const [spx, spy] = toC(spawn.x, spawn.y)
  ctx.moveTo(spx, spy)
  for (let i = 0; i < attempts; i++) {
    const [sx, sy] = toC(dots[i].x, dots[i].y)
    ctx.lineTo(sx, sy)
  }
  ctx.lineTo(gcx, gcy)
  ctx.stroke()

  // Ein Chevron je geflogener Etappe (inklusive des letzten Anflugs auf den
  // befreiten Kern), damit die Reise als gerichtete Spur lesbar bleibt.
  const arrowAlpha = Math.min(1, routeAlpha * 1.545)
  let ax = spx
  let ay = spy
  for (let i = 0; i <= attempts; i++) {
    const [sx, sy] = i < attempts ? toC(dots[i].x, dots[i].y) : [gcx, gcy]
    drawRouteArrowhead(
      ctx,
      ax,
      ay,
      sx,
      sy,
      SNAPSHOT_ROUTE_ARROW_GAP * hk,
      SNAPSHOT_ROUTE_ARROW_SIZE * hk,
      `rgba(240, 205, 96, ${arrowAlpha.toFixed(3)})`,
      1.6 * hk,
    )
    ax = sx
    ay = sy
  }

  // Startmarke: warmer Abflugpunkt mit Goldring
  const spawnGlow = ctx.createRadialGradient(spx, spy, 0, spx, spy, 8 * hk)
  spawnGlow.addColorStop(0, 'rgba(255, 214, 120, 0.6)')
  spawnGlow.addColorStop(1, 'rgba(255, 214, 120, 0)')
  ctx.beginPath()
  ctx.arc(spx, spy, 8 * hk, 0, Math.PI * 2)
  ctx.fillStyle = spawnGlow
  ctx.fill()
  ctx.beginPath()
  ctx.arc(spx, spy, 2.4 * hk, 0, Math.PI * 2)
  ctx.fillStyle = '#fff2c8'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(spx, spy, 4.6 * hk, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(232, 192, 64, 0.7)'
  ctx.lineWidth = 1 * hk
  ctx.stroke()

  // Sternmarken — gerettet / verloren, dieselben Seeds und Radien wie live.
  // Für `bodies` werden die Radien auf ganze Pixel gerundet: `drawVisitedStar`
  // schlüsselt seinen Sprite-Cache nach Radius, ein Zieh-Resize legte sonst je
  // Zwischengrösse ein eigenes Sprite an.
  const galaxySeed = record.galaxy * 10007
  const rFailed = Math.max(2, Math.round(7 * hk))
  const rRescued = Math.max(2, Math.round(8.5 * hk))
  for (let i = 0; i < attempts; i++) {
    const [sx, sy] = toC(dots[i].x, dots[i].y)
    const failed = record.attemptResults[i] === 'failed'
    if (opts.markers === 'bodies') {
      drawVisitedStar(ctx, sx, sy, failed ? rFailed : rRescued, failed ? 'failed' : 'rescued', dpr)
    } else if (failed) {
      drawPlanet(ctx, sx, sy, 7 * hk, galaxySeed + i, 'failed')
    } else {
      drawPlanet(ctx, sx, sy, 8.5 * hk, galaxySeed + i, 'rescued')
    }
  }

  // Befreiter Kern: der besiegte Bossstern, golden und zur Ruhe gekommen
  const coreGlowR = 22 * k
  const coreGlow = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, coreGlowR)
  coreGlow.addColorStop(0, 'rgba(255, 220, 90, 0.55)')
  coreGlow.addColorStop(0.6, 'rgba(255, 180, 40, 0.16)')
  coreGlow.addColorStop(1, 'rgba(255, 160, 20, 0)')
  ctx.beginPath()
  ctx.arc(gcx, gcy, coreGlowR, 0, Math.PI * 2)
  ctx.fillStyle = coreGlow
  ctx.fill()
  drawPlanet(ctx, gcx, gcy, 10 * k, galaxySeed + 991, 'rescued')
}
