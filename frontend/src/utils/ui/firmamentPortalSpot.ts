/**
 * Wo das Abflugportal im schwarzen Raum steht.
 *
 * Reine Rechnung, kein DOM, kein Store — die Buehnenmasse kommen herein, eine
 * Stelle kommt heraus. Sie liegt bewusst NICHT in `firmamentLayout.ts`: die
 * Bahndatei traegt einen engen Vertrag (reine Bahngeometrie), hier braucht es
 * dagegen Wissen ueber die BEDIENFLAECHEN der Buehne. Der Import laeuft nur in
 * eine Richtung.
 *
 * **Die Stelle ist in jedem Universum DIESELBE**: Ringmitte auf der rechten
 * Buehnenkante, auf der Mittellinie der Scheibe. Sie war einmal je Universum
 * gewuerfelt, und das las sich als Unfall statt als Absicht — der Ring ist auf
 * JEDER Zielaufloesung breiter als die schwarze Gasse (Full HD 262 zu 186 px),
 * also blieb der Suche ohnehin nur ein duenner Kranz von Lagen dicht an der
 * Kante: gewuerfelt wurde faktisch die HOEHE des Anschnitts. Angeschnitten ist
 * das Portal weiterhin — aber jetzt exakt zur Haelfte und ueberall gleich.
 *
 * Verschieden bleibt, was verschieden sein SOLL: der Ton des Zieluniversums und
 * der Sprite-Wurf des Rings (`seed` in `FirmamentPortal.vue`).
 *
 * **Weder Zoom noch Fahrt sind Argumente.** Das ist die Verriegelung, nicht
 * Bequemlichkeit: was diese Funktion nicht sehen kann, kann keinen Repaint
 * ausloesen. Das Portal steht fest im Bild, und die Karte schiebt sich beim
 * Hineinzoomen davor.
 */

import {
  FIRMAMENT_LEGEND_BOX_H,
  FIRMAMENT_LEGEND_MAX_SHARE,
  FIRMAMENT_PORTAL_DISC_CLEAR,
  FIRMAMENT_PORTAL_KEEPOUT_PAD,
  FIRMAMENT_PORTAL_LABEL_EDGE_PAD,
  FIRMAMENT_PORTAL_LABEL_GAP_EM,
  FIRMAMENT_PORTAL_LABEL_H_EM,
  FIRMAMENT_PORTAL_LABEL_MAX_PX,
  FIRMAMENT_PORTAL_LABEL_MIN_PX,
  FIRMAMENT_PORTAL_LABEL_R_RATIO,
  FIRMAMENT_PORTAL_LABEL_W_EM,
  FIRMAMENT_PORTAL_RING_H_RATIO,
  FIRMAMENT_PORTAL_RING_MAX_PX,
  FIRMAMENT_PORTAL_RING_MIN_PX,
  FIRMAMENT_SEL_BOX_H,
  FIRMAMENT_SEL_BOX_W,
  FIRMAMENT_TOOLS_BOX_H,
  FIRMAMENT_TOOLS_BOX_W,
} from '@/config/constants'
import { firmamentFitBox } from '@/utils/ui/firmamentLayout'

export interface FirmamentPortalSpot {
  /** Mitte des RINGS in Buehnenkoordinaten. Sie liegt AUF der rechten Kante. */
  x: number
  y: number
  /** Ringradius in px. Der Halo reicht darueber hinaus. */
  r: number
}

export interface FirmamentRect {
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * Der Ringradius: Wunsch aus der BUEHNENHOEHE, gedeckelt an der schwarzen GASSE.
 *
 * Der Wunsch haengt an der Hoehe, nicht am Seitenband: das Band schwankt ueber
 * die Zielaufloesungen um Faktor 4, die Hoehe nur um 2,4 — am Band gemessen
 * waere das Portal auf WUXGA halb so gross wie auf Full HD bei derselben
 * Bildschirmbreite.
 *
 * Der DECKEL dagegen muss die Gasse kennen, sonst laeuft der Ring in die
 * Kartenplatte, die ueber ihm gemalt wird und seine Innenkante abdunkelt.
 * Gemessen greift er allein auf WUXGA (dem engen Fall, 150 auf 99): Full HD,
 * 2K, 4K und der Buehnenboden behalten den vollen Wunsch. Er loest die
 * Schrumpfleiter ab, die dasselbe in vier Stufen und mit einer Suche tat.
 */
export function firmamentPortalRingR(w: number, h: number): number {
  const wish = Math.min(
    FIRMAMENT_PORTAL_RING_MAX_PX,
    Math.max(FIRMAMENT_PORTAL_RING_MIN_PX, h * FIRMAMENT_PORTAL_RING_H_RATIO),
  )
  const lane = w / 2 - firmamentFitBox(w, h).r * FIRMAMENT_PORTAL_DISC_CLEAR
  return Math.max(FIRMAMENT_PORTAL_RING_MIN_PX, Math.min(wish, lane))
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

/**
 * Die Stelle des Portals — dieselbe fuer jedes Universum.
 *
 * `null` allein fuer eine Buehne ohne Mass: der Aufrufer haengt sein `v-if`
 * daran, und ein Portal auf einer 0x0-Buehne waere ein Knopf auf nichts.
 */
export function firmamentPortalSpot(w: number, h: number): FirmamentPortalSpot | null {
  if (w <= 0 || h <= 0) return null
  return { x: w, y: firmamentFitBox(w, h).cy, r: firmamentPortalRingR(w, h) }
}

// -- Die Beschriftung -------------------------------------------------------

export interface FirmamentPortalLabelSpot {
  /** Mitte des Kaestchens in Buehnenkoordinaten. */
  cx: number
  cy: number
  /** Die Zeichenschicht baut GENAU dieses Kaestchen — deshalb steht es hier. */
  w: number
  h: number
  /** Schriftgrad der Namenszeile in px; alles andere haengt in `em` daran. */
  size: number
}

/** Der Schriftgrad haengt am RING, nicht an der Buehne: die Beschriftung gehoert
 *  dem Portal, und auf WUXGA schrumpft der Ring als einziger Fall. */
export function firmamentPortalLabelSize(r: number): number {
  return Math.min(
    FIRMAMENT_PORTAL_LABEL_MAX_PX,
    Math.max(FIRMAMENT_PORTAL_LABEL_MIN_PX, r * FIRMAMENT_PORTAL_LABEL_R_RATIO),
  )
}

/** Kaestchen gegen Bedienflaeche, beide achsenparallel. */
function boxHitsRect(
  cx: number,
  cy: number,
  bw: number,
  bh: number,
  k: FirmamentRect,
  pad: number,
): boolean {
  return (
    cx - bw / 2 - pad < k.x1 &&
    cx + bw / 2 + pad > k.x0 &&
    cy - bh / 2 - pad < k.y1 &&
    cy + bh / 2 + pad > k.y0
  )
}

/**
 * Wo die Beschriftung des Portals steht.
 *
 * Seit der Ring fest steht, steht auch sie fest: UNTER ihm, rechtsbuendig auf
 * `w - FIRMAMENT_PORTAL_LABEL_EDGE_PAD` — derselben 10-px-Linie, an der auch
 * Auswahlkarte, Legende und Werkzeugkasten haengen. Das ist die ganze Harmonie:
 * EINE rechte Kante fuer alles, was auf der Buehne liegt.
 *
 * Die einzige Unbekannte ist ihr `y`, und die hat eine geschlossene Form statt
 * einer Leiter: das Kaestchen steht fest in `x`, die Scheibe ist ein Kreis,
 * also sagt Pythagoras, wie weit es hinunter muss, um an ihr vorbeizukommen.
 * Gemessen schiebt das nur auf WUXGA, und dort um 49 px.
 *
 * Bleibt es dabei der Auswahlkarte zu nahe, klappt es UEBER den Ring — das
 * tritt allein auf der Bodenbuehne ein. Sie gibt nie `null`: gedraengt ist
 * besser als weg, eine verschwundene Beschriftung waere eine Weiterreise ohne
 * Ziel.
 */
export function firmamentPortalLabelSpot(
  spot: FirmamentPortalSpot,
  w: number,
  h: number,
): FirmamentPortalLabelSpot {
  const size = firmamentPortalLabelSize(spot.r)
  const bw = FIRMAMENT_PORTAL_LABEL_W_EM * size
  const bh = FIRMAMENT_PORTAL_LABEL_H_EM * size
  const gap = FIRMAMENT_PORTAL_LABEL_GAP_EM * size
  const pad = FIRMAMENT_PORTAL_LABEL_EDGE_PAD

  const fit = firmamentFitBox(w, h)
  const clear = fit.r * FIRMAMENT_PORTAL_DISC_CLEAR
  const cx = w - pad - bw / 2

  // Wie weit die Scheibe auf der Zeile des Kaestchens reicht. Gemessen an
  // seiner LINKEN Kante — die ist der Scheibe am naechsten.
  const dx = cx - bw / 2 - fit.cx
  const push = dx >= clear ? 0 : Math.sqrt(Math.max(0, clear * clear - dx * dx))

  const below = Math.max(spot.y + spot.r + gap + bh / 2, fit.cy + push + bh / 2)
  const above = Math.min(spot.y - spot.r - gap - bh / 2, fit.cy - push - bh / 2)

  const keep = firmamentPortalKeepOuts(w, h)
  const free = (cy: number) =>
    cy - bh / 2 >= pad &&
    cy + bh / 2 <= h - pad &&
    !keep.some((k) => boxHitsRect(cx, cy, bw, bh, k, FIRMAMENT_PORTAL_KEEPOUT_PAD))

  const cy = free(below)
    ? below
    : free(above)
      ? above
      : Math.min(h - pad - bh / 2, Math.max(pad + bh / 2, below))

  return { cx, cy, w: bw, h: bh, size }
}

/**
 * Ring und Beschriftung als EIN Rechteck.
 *
 * Es ist die Trefferflaeche UND der Anker der Hover-Karte, und das ist der
 * Punkt: `RpgBadgeTooltip` misst das erste Kind seines Slots und legt die Karte
 * unter dessen Unterkante. Am runden Knopf allein ging sie genau dort auf, wo
 * die Beschriftung steht, und deckte sie zu.
 *
 * Rechts endet es an der Buehnenkante — die abgeschnittene Haelfte des Rings
 * ist nicht zu treffen, und ein Anker, der ueber den Rand hinausreicht, zoege
 * die Karte samt Pfeil aus dem Reiter heraus.
 */
export function firmamentPortalHitBox(
  spot: FirmamentPortalSpot,
  label: FirmamentPortalLabelSpot,
  w: number,
): FirmamentRect {
  return {
    x0: Math.min(spot.x - spot.r, label.cx - label.w / 2),
    y0: Math.min(spot.y - spot.r, label.cy - label.h / 2),
    x1: Math.min(w, spot.x + spot.r),
    y1: Math.max(spot.y + spot.r, label.cy + label.h / 2),
  }
}
