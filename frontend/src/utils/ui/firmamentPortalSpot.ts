/**
 * Wo das Abflugportal im schwarzen Raum steht.
 *
 * Reine Rechnung, kein DOM, kein Store — die Buehnenmasse kommen herein, eine
 * Stelle kommt heraus. Sie liegt bewusst NICHT in `firmamentLayout.ts`: die
 * Bahndatei traegt einen engen Vertrag (reine Bahngeometrie), hier braucht es
 * dagegen Wissen ueber die BEDIENFLAECHEN der Buehne. Der Import laeuft nur in
 * eine Richtung.
 *
 * **Weder Zoom noch Fahrt sind Argumente.** Das ist die Verriegelung, nicht
 * Bequemlichkeit: was diese Funktion nicht sehen kann, kann keinen Repaint
 * ausloesen. Das Portal steht fest im Bild, und die Karte schiebt sich beim
 * Hineinzoomen davor.
 */

import {
  FIRMAMENT_LEGEND_BOX_H,
  FIRMAMENT_LEGEND_MAX_SHARE,
  FIRMAMENT_PORTAL_ANGLE_TRIES,
  FIRMAMENT_PORTAL_DISC_CLEAR,
  FIRMAMENT_PORTAL_EDGE_KEEP,
  FIRMAMENT_PORTAL_KEEPOUT_PAD,
  FIRMAMENT_PORTAL_MIN_VISIBLE,
  FIRMAMENT_PORTAL_RING_H_RATIO,
  FIRMAMENT_PORTAL_RING_MAX_PX,
  FIRMAMENT_PORTAL_RING_MIN_PX,
  FIRMAMENT_PORTAL_VIS_SAMPLES,
  FIRMAMENT_SEL_BOX_H,
  FIRMAMENT_SEL_BOX_W,
  FIRMAMENT_TOOLS_BOX_H,
  FIRMAMENT_TOOLS_BOX_W,
} from '@/config/constants'
import { jitter } from '@/utils/fx/universeDisc'
import { firmamentFitBox } from '@/utils/ui/firmamentLayout'

export interface FirmamentPortalSpot {
  /** Mitte des RINGS in Buehnenkoordinaten. */
  x: number
  y: number
  /** Ringradius in px. Halo und Spur reichen darueber hinaus. */
  r: number
  /** Winkel Buehnenmitte zum Portal, rad. Die Spur laeuft auf ihm zurueck. */
  angle: number
}

export interface FirmamentRect {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** Der Ringradius haengt an der BUEHNENHOEHE, nicht am schwarzen Seitenband:
 *  das Band schwankt ueber die Zielaufloesungen um Faktor 4, die Hoehe nur um
 *  2,4. Am Band gemessen waere das Portal auf WUXGA halb so gross wie auf
 *  Full HD — bei derselben Bildschirmbreite. */
export function firmamentPortalRingR(h: number): number {
  return Math.min(
    FIRMAMENT_PORTAL_RING_MAX_PX,
    Math.max(FIRMAMENT_PORTAL_RING_MIN_PX, h * FIRMAMENT_PORTAL_RING_H_RATIO),
  )
}

/** Die Bedienflaechen der Buehne. Ihre Masse stehen in Konstanten, weil das CSS
 *  sie nicht hergibt und eine geschaetzte Zahl hier still danebenliegt. */
export function firmamentPortalKeepOuts(w: number, h: number): FirmamentRect[] {
  return [
    { x0: 0, y0: 0, x1: FIRMAMENT_TOOLS_BOX_W, y1: FIRMAMENT_TOOLS_BOX_H },
    {
      x0: 0,
      y0: h - FIRMAMENT_LEGEND_BOX_H,
      x1: w * FIRMAMENT_LEGEND_MAX_SHARE,
      y1: h,
    },
    { x0: w - FIRMAMENT_SEL_BOX_W, y0: h - FIRMAMENT_SEL_BOX_H, x1: w, y1: h },
  ]
}

/** Kreis gegen Rechteck — NICHT Bounding-Box gegen Rechteck. Der Unterschied
 *  traegt: ein Quadrat um einen 150-px-Ring schlaegt auf WUXGA fast jede Ecke
 *  aus, der Kreistest laesst die diagonalen Lagen stehen. */
function circleHitsRect(x: number, y: number, r: number, k: FirmamentRect): boolean {
  const dx = Math.max(k.x0 - x, 0, x - k.x1)
  const dy = Math.max(k.y0 - y, 0, y - k.y1)
  return Math.hypot(dx, dy) < r
}

/** Wie weit ein Strahl aus der Mitte reicht, bis er das eingerueckte Rechteck
 *  verlaesst. Slab-Clip, zwei Achsen. */
function rayToRect(cx: number, cy: number, a: number, inset: number, w: number, h: number): number {
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  let t = Infinity
  if (dx > 1e-9) t = Math.min(t, (w - inset - cx) / dx)
  else if (dx < -1e-9) t = Math.min(t, (inset - cx) / dx)
  if (dy > 1e-9) t = Math.min(t, (h - inset - cy) / dy)
  else if (dy < -1e-9) t = Math.min(t, (inset - cy) / dy)
  return Math.max(0, t)
}

/** Welcher Anteil der Ringscheibe im Bild liegt — Streifenintegration, weil ein
 *  Kreis-Rechteck-Schnitt an zwei Kanten keine geschlossene Formel hat. */
export function firmamentPortalVisibleShare(
  x: number,
  y: number,
  r: number,
  w: number,
  h: number,
): number {
  if (r <= 0) return 0
  const n = FIRMAMENT_PORTAL_VIS_SAMPLES
  const band = (2 * r) / n
  let inside = 0
  for (let i = 0; i < n; i++) {
    const yy = y - r + (i + 0.5) * band
    if (yy < 0 || yy > h) continue
    const half = Math.sqrt(Math.max(0, r * r - (yy - y) * (yy - y)))
    const lo = Math.max(0, x - half)
    const hi = Math.min(w, x + half)
    if (hi > lo) inside += hi - lo
  }
  return (inside * band) / (Math.PI * r * r)
}

/**
 * Die Stelle des Portals — deterministisch aus der Universumsnummer.
 *
 * Der Seed ist die BAHN, an deren Ende das Portal steht, nie ihr Ziel:
 * `toUniverse` faellt auf `currentUniverse` zurueck, sobald
 * `UNIVERSE_RUN_HISTORY_LIMIT` einen Lauf aus dem Archiv schiebt. Ein Portal,
 * das seinen Platz wechselt, weil ein alter Lauf verfiel, ist ein Fehler, den
 * niemand als Fehler erkennt — er sieht nur falsch aus. Die FARBE darf am Ziel
 * haengen, der Ort nicht.
 *
 * Gesucht wird im 15-Grad-Raster; der erste Winkel, der jenseits der Wolke
 * liegt, genug Flaeche im Bild laesst und keine Bedienflaeche trifft, gewinnt.
 */
export function firmamentPortalSpot(
  universe: number,
  w: number,
  h: number,
): FirmamentPortalSpot | null {
  if (w <= 0 || h <= 0) return null

  const fit = firmamentFitBox(w, h)
  const r = firmamentPortalRingR(h)
  const keep = firmamentPortalKeepOuts(w, h)
  const dMin = fit.r * FIRMAMENT_PORTAL_DISC_CLEAR + r
  const inset = r * FIRMAMENT_PORTAL_EDGE_KEEP

  // Eigene Primzahl je Aspekt, ab 131 aufwaerts — die Kanaele darunter gehoeren
  // der Galaxienwolke, und zwei Aspekte auf einem Kanal laufen im Gleichschritt.
  const base = jitter(universe, 131) * Math.PI * 2
  const frac = jitter(universe, 137)

  let fallback: FirmamentPortalSpot | null = null

  for (let i = 0; i < FIRMAMENT_PORTAL_ANGLE_TRIES; i++) {
    const angle = base + (i * Math.PI * 2) / FIRMAMENT_PORTAL_ANGLE_TRIES
    const dMax = rayToRect(fit.cx, fit.cy, angle, inset, w, h)
    if (dMax < dMin) continue

    const d = dMin + frac * (dMax - dMin)
    const x = fit.cx + Math.cos(angle) * d
    const y = fit.cy + Math.sin(angle) * d
    if (firmamentPortalVisibleShare(x, y, r, w, h) < FIRMAMENT_PORTAL_MIN_VISIBLE) continue

    const spot = { x, y, r, angle }
    // Geometrisch gueltig reicht als Fluchtweg: eine Buehne, auf der jede Lage
    // eine Bedienflaeche traefe, gibt es rechnerisch nicht — aber ein `null`
    // liesse das Portal still verschwinden und die Weiterreise unerreichbar.
    fallback ??= spot
    if (keep.some((k) => circleHitsRect(x, y, r + FIRMAMENT_PORTAL_KEEPOUT_PAD, k))) continue
    return spot
  }

  return fallback
}
