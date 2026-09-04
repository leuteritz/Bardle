/* ── Galaxie-Platte ───────────────────────────────────────────────────────────
   Eine Zeichenreihenfolge, zwei Aufrufer: das 320×200-Standbild des Archivs
   (`galaxySnapshot.ts`) und die grosse Karte des Voyages-Reiters.

   Vollständig deterministisch aus dem Datensatz — derselbe `mapSeed` ergibt
   dieselbe Spirale, dieselben Sternpositionen, dieselbe Route. Es wird nie
   Pixelmaterial gespeichert; der winzige `CompletedGalaxyRecord` im Spielstand
   reicht, um die Karte nachzuzeichnen.

   ALLE festen Grössen skalieren mit `box.w / GALAXY_PLATE_REF_W`. Bei 320 px ist
   der Faktor 1 — das ist der Bezugsmassstab, in dem die festen Zahlen hier
   gemeint sind; bei 950 sind Sterne und Route mitgewachsen statt Stecknadeln zu
   bleiben. */

import {
  seededRng,
  galaxyGeo,
  galaxyPlaneToWorld,
  getGalaxyParticles,
  GALAXY_PARTICLE_COLORS,
  minimapAccentForTheme,
  pathRouteArrowhead,
  generateGalaxyDots,
} from '@/components/bottom/minimap/minimapGalaxyGeometry'
import type { GalaxyGeo } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { drawLandmark, landmarkVariantFor, roundLandmarkRadius } from './galaxyLandmarks'
import { landfallMarks } from '@/utils/game/landfalls'
import { incidentMarkRadius, incidentMarks, incidentPaint } from '@/utils/game/galaxyIncidents'
import { LANDFALL_LANDMARK_KIND } from '@/config/world/landfalls'
import { buildDeepField, paintDeepField } from './galaxyDeepField'
import {
  CORE_GATE_HALO_R,
  CORE_GATE_MOUTH_R,
  CORE_GATE_CROWN_SPAN,
  VOYAGE_GATE_GAP_PX,
  LANDFALL_MARK_R,
  GALAXY_INCIDENT_MARK_R,
  LANDFALL_CORE_GAP_PX,
  GALAXY_AURA_ALPHA,
  GALAXY_AURA_SPAN,
  MINIMAP_TWINKLE_COUNT,
  MINIMAP_GALAXY_CORE_RADIUS,
  MINIMAP_GALAXY_RADIUS,
  SNAPSHOT_ROUTE_ARROW_SIZE,
  SNAPSHOT_ROUTE_ARROW_GAP,
  VOYAGE_MAP_ASPECT_MIN,
  VOYAGE_MAP_ASPECT_MAX,
  VOYAGE_MAP_INSET_PX,
  LANDMARK_PORTAL_MIN_R,
  LANDMARK_STAR_R_FREED,
  LANDMARK_STAR_R_LOST,
  ROUTE_TRAIL_ALPHA_MIN,
  ROUTE_TRAIL_WIDTH_MIN,
  ROUTE_SEAM_COLOR,
  ROUTE_TRAIL_COLOR,
  ROUTE_ARROW_COLOR,
  ROUTE_SEAM_ALPHA,
  ROUTE_SEAM_WIDTH_MULT,
  ROUTE_ARROW_ALPHA_GAIN,
  ROUTE_ARROW_ALPHA_MAX,
  ROUTE_ARROW_SEAM_W_MULT,
  LANDMARK_ROLE_CORE,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { StarManifest } from '@/types'

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
/**
 * Die Kernfarbe einer Sternmarke: die Rolle des Champions, den sie hergab.
 *
 * `undefined` — kein Manifest, keine Rolle — lässt `drawLandmark` auf
 * `LANDMARK_FREED_CORE` zurückfallen. Der verlorene Stern liest das nie.
 */
export function starCoreTint(manifest: StarManifest | undefined): string | undefined {
  return manifest?.role ? LANDMARK_ROLE_CORE[manifest.role] : undefined
}

/**
 * Der gemalte Radius einer Sternmarke — die EINE Quelle.
 *
 * Zwei Leser: `paintGalaxy` malt damit, und die Manifestreihe legt darauf ihren
 * Hervorhebungsring. Aus der Fangflaeche zurueckrechnen ginge zweimal daneben —
 * `starHit` rechnet fuer BEIDE Ausgaenge mit dem Radius des befreiten Sterns,
 * und ihr Boden (`GALAXY_STAR_MARK_HIT_MIN`) klemmt auf kleinen Buehnen.
 *
 * Halbe Pixel beim Runden: ganzzahlig fielen 7 und 8.5 in der Leistenminiatur
 * beide auf 4.
 */
export function starMarkRadius(lost: boolean, hk: number): number {
  return roundLandmarkRadius((lost ? LANDMARK_STAR_R_LOST : LANDMARK_STAR_R_FREED) * hk)
}

/**
 * Dasselbe für Ort und Ereignis, und aus demselben Grund: seit die Formlegende
 * eine Markenart auf der Karte ausleuchtet, hat jeder gemalte Radius einen
 * ZWEITEN Leser — den Ring, der sich darauf legt. Stand der Ausdruck nur inline
 * in `paintGalaxy`, säße der Ring nach der ersten Maßänderung neben seiner
 * Marke, und das sieht nach einem Zeichenfehler aus, nicht nach einer zweiten
 * Rechnung.
 *
 * Aus der Fangfläche zurückrechnen geht auch hier nicht: `landfallHit` und
 * `incidentHit` haben einen Boden (16) und einen eigenen Faktor.
 */
export function landfallMarkRadius(hk: number): number {
  return roundLandmarkRadius(LANDFALL_MARK_R * hk)
}

export function incidentMarkRadiusAt(rank: number, hk: number): number {
  return roundLandmarkRadius(incidentMarkRadius(rank, GALAXY_INCIDENT_MARK_R * hk))
}

/**
 * Fingerabdruck der Sternfarben eines Laufs — für die Cache-Schlüssel.
 *
 * Die drei Schlüssel (Snapshot, `paintKey` der Voyages-Karte, Markerebene der
 * Minimap) kennen sonst nur die LÄNGE von `attemptResults`. Manifeste werden
 * aber NACHTRÄGLICH gefüllt — vom Archiv-Nachtrag und beim Laden —, und dann
 * ändert sich die Farbe, ohne dass sich eine Länge rührt: die Karte bliebe für
 * immer in der alten Fassung stehen. Beim Thumb-Cache wäre das endgültig, der
 * läuft ohne Deckel.
 *
 * EINE Funktion für alle drei, damit sie nicht auseinanderlaufen.
 */
export function starRoleSignature(manifests: readonly StarManifest[] | undefined): string {
  if (!manifests?.length) return '-'
  let sig = manifests.length
  for (const m of manifests) {
    sig = (Math.imul(sig, 31) + (m.role ? m.role.charCodeAt(0) + m.role.length : 0)) >>> 0
  }
  return sig.toString(36)
}

export function galaxyFitBox(w: number, h: number, inset = VOYAGE_MAP_INSET_PX): FitBox {
  const aw = Math.max(1, w - inset * 2)
  const ah = Math.max(1, h - inset * 2)
  const aspect = Math.min(VOYAGE_MAP_ASPECT_MAX, Math.max(VOYAGE_MAP_ASPECT_MIN, aw / ah))
  const bw = Math.min(aw, ah * aspect)
  const bh = bw / aspect
  return { x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh }
}

/**
 * Die Aura der Scheibe: Mittelpunkt, Massstab und Neigung, unter denen ein
 * KREIS vom Radius `r` genau die Galaxienscheibe umschliesst.
 *
 * Die Kette ist Zeichen für Zeichen die von `galaxyPlaneToWorld` — erst der
 * anisotrope Bühnenmassstab, dann die Neigung, dann die Stauchung. Wer die
 * beiden Skalierungen vertauscht, bekommt eine Aura, die nur bei ungeneigten
 * Galaxien passt; im Bild fällt das erst bei starker Neigung auf, deshalb ist
 * die Rechnung hier herausgezogen und gebunden.
 */
export interface GalaxyAura {
  cx: number
  cy: number
  sx: number
  sy: number
  rot: number
  squash: number
  /** Radius in Scheiben-Ebeneneinheiten — 1/GALAXY_AURA_SPAN davon ist der Rand. */
  r: number
}

/**
 * Die Sperrzone des Caretaker's Gate, als normalisierte HALBKANTEN.
 *
 * Zwei Zahlen und kein Radius, weil der 0..1-Raum der Karte ANISOTROP ist: ein
 * Kreis darin ist in Pixeln eine Ellipse, und auf einer Fit-Box mit
 * `VOYAGE_MAP_ASPECT_MAX` ist sie senkrecht fast halb so breit wie waagerecht.
 * Gemessen verschwand eine Ortsmarke 58 px vom Kern noch unter einem Tor von
 * 124 px Kantenlänge, obwohl die runde Sperrzone „0,10" hiess.
 *
 * Maximumsnorm, wie bei `voyageGateSizeFor`, und aus demselben Grund: das Tor
 * ist ein achsenparalleles Quadrat.
 */
export function coreGateClearance(box: FitBox, hk: number): { x: number; y: number } {
  const k = box.w / GALAXY_PLATE_REF_W
  // Drei Terme, und jeder war einmal der fehlende:
  //   markR  — Aussenkante der gemalten Tor-Marke (Schlund plus Krone),
  //   GAP    — dieselbe Luft, die `voyageGateSizeFor` seiner Klickfläche gibt,
  //            denn DIE verdeckt, nicht die Zeichnung,
  //   Marke  — der eigene Radius des Ortes; ohne ihn rutscht seine Hälfte
  //            unter die Torkante.
  const markR = CORE_GATE_MOUTH_R * CORE_GATE_CROWN_SPAN * k
  const eigen = LANDFALL_MARK_R * hk
  const px = markR + VOYAGE_GATE_GAP_PX + eigen + LANDFALL_CORE_GAP_PX
  return { x: px / box.w, y: px / box.h }
}

export function galaxyAuraGeometry(geo: GalaxyGeo, box: FitBox): GalaxyAura {
  return {
    cx: box.x + 0.5 * box.w,
    cy: box.y + 0.5 * box.h,
    sx: box.w,
    sy: box.h,
    rot: geo.tilt,
    squash: geo.squash,
    r: MINIMAP_GALAXY_RADIUS * geo.radiusScale * GALAXY_AURA_SPAN,
  }
}

/** Basis-Strichstärke der Route bei Massstab 1. */
const ROUTE_BASE_WIDTH = 1.6

/**
 * Stil einer Route-Etappe. Die Spur wird zum Kern hin heller UND dicker — so
 * liest sich die Reiserichtung, ohne Chevrons zu zählen.
 *
 * `bands` quantisiert den Verlauf: die Live-Minimap malt die Route während der
 * Zoomfahrt in JEDEM Frame ungecacht, dort sind vier `stroke()` statt 37 der
 * Unterschied.
 */
export function routeLegStyle(
  i: number,
  legs: number,
  routeAlpha: number,
  hk: number,
  bands = 0,
): { alpha: number; width: number } {
  const span = Math.max(1, legs - 1)
  const raw = Math.min(1, Math.max(0, i / span))
  const t = bands > 1 ? Math.min(bands - 1, Math.floor(raw * bands)) / (bands - 1) : raw
  return {
    alpha: routeAlpha * (ROUTE_TRAIL_ALPHA_MIN + (1 - ROUTE_TRAIL_ALPHA_MIN) * t),
    width: ROUTE_BASE_WIDTH * hk * (ROUTE_TRAIL_WIDTH_MIN + (1 - ROUTE_TRAIL_WIDTH_MIN) * t),
  }
}

/** Punktzug der geflogenen Route in Canvas-Koordinaten. */
export type RoutePoints = readonly (readonly [number, number])[]

/**
 * Die geflogene Spur: EIN dunkler Saum über den ganzen Zug, darüber das Gold je
 * Etappe aus `routeLegStyle`.
 *
 * Der Saum ist der Grund, warum die Spur überhaupt lesbar ist — bei 0,10 bis
 * 0,16 Deckkraft verschwindet eine dünne Goldlinie über den hellen Armpartikeln.
 * Dasselbe Mittel trägt schon den Ring des befreiten Sterns und die Krone des
 * Tors. Er kommt VOLLSTÄNDIG vor dem Gold: paarweise gezogen deckte der Saum
 * der Etappe i+1 das Gold der Etappe i an ihrer Nahtstelle zu.
 *
 * Seine Breite ist fest, nicht der Rampe folgend — damit bekommt die blasse
 * erste Etappe relativ mehr Rand als die kräftige letzte, und der Zug kostet
 * EIN `stroke()` statt eines je Band.
 */
export function paintRouteTrail(
  ctx: CanvasRenderingContext2D,
  pts: RoutePoints,
  o: { alpha: number; hk: number; bands?: number },
): void {
  if (pts.length < 2) return
  const legs = pts.length - 1
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.strokeStyle = `rgba(${ROUTE_SEAM_COLOR}, ${ROUTE_SEAM_ALPHA})`
  ctx.lineWidth = ROUTE_BASE_WIDTH * o.hk * ROUTE_SEAM_WIDTH_MULT
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i <= legs; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.stroke()

  // Ein Zug je Helligkeitsband statt je Etappe: die Live-Minimap malt hier
  // während der Zoomfahrt in JEDEM Frame ungecacht.
  let band = -1
  for (let i = 0; i < legs; i++) {
    const leg = routeLegStyle(i, legs, o.alpha, o.hk, o.bands)
    const b = Math.round(leg.alpha * 1000)
    if (b !== band) {
      if (band >= 0) ctx.stroke()
      ctx.beginPath()
      ctx.strokeStyle = `rgba(${ROUTE_TRAIL_COLOR}, ${leg.alpha.toFixed(3)})`
      ctx.lineWidth = leg.width
      band = b
    }
    ctx.moveTo(pts[i][0], pts[i][1])
    ctx.lineTo(pts[i + 1][0], pts[i + 1][1])
  }
  if (band >= 0) ctx.stroke()
  ctx.restore()
}

/**
 * Ein Chevron je Etappe, kurz vor ihrem Ziel — die Spur wird als gerichteter
 * Weg lesbar, ohne dass die Linie heller werden muss.
 *
 * Gefüllt statt offener Strichwinkel: das Dreieck belegt bei gleicher
 * Kantenlänge weniger Fläche als die zwei Striche, die es ersetzt, und trägt
 * bei 6 px seine Form deutlicher. EIN Pfad, zwei Züge — dunkle Kontur, dann
 * Gold darüber.
 */
export function paintRouteChevrons(
  ctx: CanvasRenderingContext2D,
  pts: RoutePoints,
  o: {
    alpha: number
    hk: number
    gap: number
    size: number
    cull?: (x: number, y: number) => boolean
  },
): void {
  if (pts.length < 2) return
  const gold = Math.min(ROUTE_ARROW_ALPHA_MAX, o.alpha * ROUTE_ARROW_ALPHA_GAIN)
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [sx, sy] = pts[i + 1]
    if (o.cull && !o.cull(sx, sy)) continue
    pathRouteArrowhead(ctx, ax, ay, sx, sy, o.gap, o.size)
  }
  ctx.strokeStyle = `rgba(${ROUTE_SEAM_COLOR}, ${ROUTE_SEAM_ALPHA})`
  ctx.lineWidth = ROUTE_BASE_WIDTH * o.hk * ROUTE_ARROW_SEAM_W_MULT
  ctx.stroke()
  ctx.fillStyle = `rgba(${ROUTE_ARROW_COLOR}, ${gold.toFixed(3)})`
  ctx.fill()
  ctx.restore()
}

export interface GalaxyPaintOpts {
  /** Backing-Dichte des Ziels — der Sprite-Cache der Landmarken hängt daran.
   *  Pflicht, weil ein vergessener Wert nur als weiches Bild auffiele. */
  dpr: number
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
  /** Tiefenfeld statt flächenskaliertem Sternenteppich — nur die grosse Karte.
   *  Standbild und Miniatur behalten die alte Schleife: dort ist die Dichte
   *  unauffällig, und ihre Ziehreihenfolge teilen sie mit der Live-Minimap. */
  deepField?: boolean
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
  const dpr = opts.dpr
  const routeAlpha = opts.routeAlpha ?? 0.55
  const toC = (wx: number, wy: number): [number, number] => [box.x + wx * box.w, box.y + wy * box.h]

  // ── Tiefraum, darüber die Aura der Scheibe ──
  ctx.fillStyle = '#0b0806'
  ctx.fillRect(0, 0, w, h)
  const accent = minimapAccentForTheme(record.themeIndex)
  const geo = galaxyGeo(record.mapSeed)

  // Der Dunst war einmal ein bildschirmzentrierter Kreis. Er beschrieb die
  // Galaxie nicht — die Scheibe hatte damit keinen ablesbaren RAND, und draussen
  // sah aus wie drinnen. Jetzt folgt er der ECHTEN Scheibe; Canvas transformiert
  // den Verlauf mit der Matrix, aus dem Kreis wird von selbst die richtige,
  // geneigte Ellipse.
  const aura = galaxyAuraGeometry(geo, box)
  ctx.save()
  ctx.translate(aura.cx, aura.cy)
  ctx.scale(aura.sx, aura.sy)
  ctx.rotate(aura.rot)
  ctx.scale(1, aura.squash)
  const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, aura.r)
  haze.addColorStop(0, `rgba(${accent}, ${GALAXY_AURA_ALPHA})`)
  haze.addColorStop(0.62, `rgba(${accent}, ${(GALAXY_AURA_ALPHA * 0.55).toFixed(3)})`)
  haze.addColorStop(1, `rgba(${accent}, 0)`)
  ctx.beginPath()
  ctx.arc(0, 0, aura.r, 0, Math.PI * 2)
  ctx.fillStyle = haze
  ctx.fill()
  ctx.restore()

  const twScale = Math.max(1, k)

  // ── Sternenfeld ──
  if (opts.deepField) {
    paintDeepField(ctx, buildDeepField(w, h, k, record.galaxy, geo, box, accent), w, h)
  } else {
    // Funkelsterne, mitten im Funkeln eingefroren. Die Zahl wächst mit der
    // FLÄCHE, sonst stünden dreissig Punkte verloren auf einer Panelfläche. Bei
    // 320×200 ergibt das exakt MINIMAP_TWINKLE_COUNT.
    const twinkles = Math.round(
      (MINIMAP_TWINKLE_COUNT * (w * h)) / (GALAXY_PLATE_REF_W * GALAXY_PLATE_REF_H),
    )
    const twRng = seededRng(record.galaxy * 52361 + 7)
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
  }

  // ── Spiralgalaxie: Kernglut plus geseedete Partikel, additiv ──
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
  const [spx, spy] = toC(spawn.x, spawn.y)
  // Der Zug endet im Kern — anders als live, wo die Reise am letzten besuchten
  // Stern aufhört, weil es dort noch kein Tor gibt.
  const routePts: RoutePoints = [
    [spx, spy],
    ...dots.slice(0, attempts).map((d) => toC(d.x, d.y)),
    [gcx, gcy],
  ]
  paintRouteTrail(ctx, routePts, { alpha: routeAlpha, hk })
  paintRouteChevrons(ctx, routePts, {
    alpha: routeAlpha,
    hk,
    gap: SNAPSHOT_ROUTE_ARROW_GAP * hk,
    size: SNAPSHOT_ROUTE_ARROW_SIZE * hk,
  })

  // Landfalls — die Orte, an denen die Reise vorbeikam. VOR den Sternmarken,
  // damit ein Stern gewinnt, wenn beide eng beieinander liegen: der Ort ist
  // Beiwerk der Reise, der Stern ihr Ergebnis.
  //
  // Lage und Art sind ABGELEITET (`utils/game/landfalls.ts`), im Record steht
  // nur der Ausgang. Ein Spielstand von vor den Landfalls hat keine Reihe und
  // zeigt deshalb keine — das ist wahr, dort gab es keine.
  const marken = landfallMarks(
    record.mapSeed,
    record.galaxy,
    spawn,
    dots,
    attempts,
    record.landfallResults ?? [],
    coreGateClearance(box, hk),
  )
  marken.forEach((m, i) => {
    const [lx, ly] = toC(m.x, m.y)
    drawLandmark(
      ctx,
      LANDFALL_LANDMARK_KIND[m.kind],
      lx,
      ly,
      landfallMarkRadius(hk),
      {
        dpr,
        variant: landmarkVariantFor(i),
        faded: !m.cleared,
      },
    )
  })

  // Die Ereignis-Chronik: wo ein Void durchkam und wo ein seltener Drifter fiel.
  // Zwischen Orten und Sternen, aus demselben Grund — ein Stern gewinnt, wenn
  // beide eng liegen. Sie weicht Sternen und Orten aus, deshalb bekommt sie
  // beide als belegte Punkte mit.
  for (const m of incidentMarks(
    record.mapSeed,
    spawn,
    dots,
    attempts,
    record.incidentResults ?? [],
    [...dots.slice(0, attempts), ...marken],
    coreGateClearance(box, hk),
  )) {
    const [ix, iy] = toC(m.x, m.y)
    const wie = incidentPaint(m)
    drawLandmark(
      ctx,
      wie.kind,
      ix,
      iy,
      incidentMarkRadiusAt(m.rank, hk),
      { dpr, faded: wie.faded, coreTint: m.coreTint },
    )
  }

  // Abflugportal — der Ring steht quer zur ersten Etappe, man fliegt hindurch.
  const [fx, fy] = attempts > 0 ? toC(dots[0].x, dots[0].y) : [gcx, gcy]
  drawLandmark(ctx, 'departure-portal', spx, spy, Math.max(LANDMARK_PORTAL_MIN_R, 9 * hk), {
    heading: Math.atan2(fy - spy, fx - spx),
    dpr,
  })

  // Sternmarken — befreit / verloren, dieselben Positionen wie live. Halbe Pixel
  // beim Runden: ganzzahlig fielen in der Leistenminiatur beide auf 4.
  for (let i = 0; i < attempts; i++) {
    const [sx, sy] = toC(dots[i].x, dots[i].y)
    const failed = record.attemptResults[i] === 'failed'
    drawLandmark(ctx, failed ? 'star-lost' : 'star-freed', sx, sy, starMarkRadius(failed, hk), {
      dpr,
      variant: landmarkVariantFor(i),
      coreTint: starCoreTint(record.starManifests?.[i]),
    })
  }

  // Caretaker's Gate: der befreite Kern. Er ist mit Abstand die grösste Marke,
  // und seit der befreite Stern nur noch ein Ring ist, auch die einzige gefüllte
  // Form der Karte ausser dem verlorenen Stern.
  //
  // Der Schein ist ein RING, keine Füllung: eine in der Mitte helle Glut machte
  // aus dem Tor wieder eine Scheibe, und genau das sollte es nicht mehr sein.
  // Er trägt die Themenfarbe, dieselbe, die schon die Partikel färbt — das Gold
  // bleibt den Häfen.
  //
  // Der Block klammert sich selbst: er ist zwar der letzte, aber `paintCoreGate`
  // fasst `shadowBlur` und `lineWidth` an, und die Funktion gibt den Context an
  // ihren Aufrufer zurück.
  ctx.save()
  const coreGlowR = CORE_GATE_HALO_R * k
  const coreGlow = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, coreGlowR)
  coreGlow.addColorStop(0, `rgba(${accent}, 0)`)
  coreGlow.addColorStop(0.52, `rgba(${accent}, 0)`)
  coreGlow.addColorStop(0.8, `rgba(${accent}, 0.32)`)
  coreGlow.addColorStop(1, `rgba(${accent}, 0)`)
  ctx.beginPath()
  ctx.arc(gcx, gcy, coreGlowR, 0, Math.PI * 2)
  ctx.fillStyle = coreGlow
  ctx.fill()
  drawLandmark(ctx, 'core-gate', gcx, gcy, CORE_GATE_MOUTH_R * k, { dpr, tint: accent })
  ctx.restore()
}
