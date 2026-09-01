/**
 * Wo das Abflugportal im schwarzen Raum steht.
 *
 * Reine Rechnung, kein DOM, kein Store — die Buehnenmasse kommen herein, eine
 * Stelle kommt heraus. Sie liegt bewusst NICHT in `firmamentLayout.ts`: die
 * Bahndatei traegt einen engen Vertrag (reine Bahngeometrie), hier kommen
 * Bildkante und Kartenscheibe dazu. Der Import laeuft nur in eine Richtung.
 *
 * Sperrzonen fuer Bedienflaechen gibt es KEINE mehr — die Buehne traegt seit dem
 * Fall von Werkzeugleiste, Legende und Auswahlkarte kein HUD, und das Portal ist
 * das einzige Bedienelement darauf.
 *
 * **Weder Zoom noch Fahrt sind Argumente.** Das ist die Verriegelung, nicht
 * Bequemlichkeit: was diese Funktion nicht sehen kann, kann keinen Repaint
 * ausloesen. Das Portal steht fest im Bild, und die Karte schiebt sich beim
 * Hineinzoomen davor.
 */

import {
  FIRMAMENT_OFFER_PORTAL_ANGLE_TRIES,
  FIRMAMENT_OFFER_PORTAL_GAP,
  FIRMAMENT_OFFER_PORTAL_RADIAL_STEPS,
  FIRMAMENT_OFFER_PORTAL_RING_K,
  FIRMAMENT_PORTAL_ANGLE_TRIES,
  FIRMAMENT_PORTAL_DISC_CLEAR,
  FIRMAMENT_PORTAL_EDGE_KEEP,
  FIRMAMENT_PORTAL_LABEL_CLEAR_STEPS,
  FIRMAMENT_PORTAL_LABEL_EDGE_PAD,
  FIRMAMENT_PORTAL_LABEL_GAP_EM,
  FIRMAMENT_PORTAL_LABEL_H_EM,
  FIRMAMENT_PORTAL_LABEL_MAX_PX,
  FIRMAMENT_PORTAL_LABEL_MIN_PX,
  FIRMAMENT_PORTAL_LABEL_R_RATIO,
  FIRMAMENT_PORTAL_LABEL_W_EM,
  FIRMAMENT_PORTAL_MIN_VISIBLE,
  FIRMAMENT_PORTAL_RING_H_RATIO,
  FIRMAMENT_PORTAL_RING_MAX_PX,
  FIRMAMENT_PORTAL_RING_MIN_PX,
  FIRMAMENT_PORTAL_SHRINK_STEPS,
  FIRMAMENT_PORTAL_VIS_SAMPLES,
} from '@/config/constants'
import { jitter } from '@/utils/fx/universeDisc'
import { firmamentFitBox } from '@/utils/ui/firmamentLayout'

export interface FirmamentPortalSpot {
  /** Mitte des RINGS in Buehnenkoordinaten. */
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
 * Gesucht wird im 15-Grad-Raster; der erste Winkel, der jenseits der KARTE liegt
 * und genug Flaeche im Bild laesst, gewinnt. Findet sich nichts, wird der Ring
 * kleiner statt zu verschwinden.
 */
export function firmamentPortalSpot(
  universe: number,
  w: number,
  h: number,
): FirmamentPortalSpot | null {
  if (w <= 0 || h <= 0) return null

  const fit = firmamentFitBox(w, h)
  const full = firmamentPortalRingR(h)
  const clear = fit.r * FIRMAMENT_PORTAL_DISC_CLEAR

  // Eigene Primzahl je Aspekt, ab 131 aufwaerts — die Kanaele darunter gehoeren
  // der Galaxienwolke, und zwei Aspekte auf einem Kanal laufen im Gleichschritt.
  const base = jitter(universe, 131) * Math.PI * 2
  const frac = jitter(universe, 137)

  // Aeussere Schleife ueber die GROESSE: passt die volle nirgends hin, wird der
  // Ring kleiner. Ein verschwundenes Portal waere die Weiterreise ohne Weg.
  for (const step of FIRMAMENT_PORTAL_SHRINK_STEPS) {
    const r = full * step
    const dMin = clear + r
    const inset = r * FIRMAMENT_PORTAL_EDGE_KEEP

    for (let i = 0; i < FIRMAMENT_PORTAL_ANGLE_TRIES; i++) {
      const angle = base + (i * Math.PI * 2) / FIRMAMENT_PORTAL_ANGLE_TRIES
      const dMax = rayToRect(fit.cx, fit.cy, angle, inset, w, h)
      if (dMax < dMin) continue

      const d = dMin + frac * (dMax - dMin)
      const x = fit.cx + Math.cos(angle) * d
      const y = fit.cy + Math.sin(angle) * d
      if (firmamentPortalVisibleShare(x, y, r, w, h) < FIRMAMENT_PORTAL_MIN_VISIBLE) continue

      return { x, y, r }
    }
  }

  return null
}

/**
 * Die Stellen der DREI Angebotsportale auf der LAUFENDEN Bahn.
 *
 * Sie erbt jede Regel der Einzelfassung — jenseits der Kartenkante, ueber
 * `MIN_VISIBLE`, kein Zoom und keine Fahrt als Argument, lieber kleiner als weg
 * — und legt drei Dinge dazu:
 *
 * **Eine GEMEINSAME Schrumpfstufe.** Drei verschieden grosse Portale
 * nebeneinander lesen sich als Rangfolge, die es nicht gibt.
 *
 * **GESPREIZTE Startwinkel.** Ziel `k` beginnt bei `base + k * 360/n` und weicht
 * von dort abwechselnd nach beiden Seiten aus. Das ist der Unterschied zwischen
 * "geht meistens" und "geht immer": mit drei unabhaengig gewuerfelten Winkeln —
 * der direkten Uebertragung der Einzelfassung — faellt WUXGA in zwei von zehn
 * Faellen bis auf die kleinste Stufe durch.
 *
 * **Ein gegenseitiger Abstandstest.** Er ist die Zusicherung, nicht der Treiber:
 * gemessen liegt der engste Fall bei 2,87 Radiensummen.
 *
 * Der Seed ist die laufende BAHN, nicht das Ziel — dieselbe Trennung wie beim
 * Abflugportal: der Ort haengt an der Bahn, Farbe und Feld am Ziel. Die Ziele
 * gehen nur in die Streuung ein, damit zwei Angebote am selben Ort verschiedene
 * Abstaende zur Mitte bekommen.
 */
export function firmamentOfferPortalSpots(
  seed: number,
  targets: readonly number[],
  w: number,
  h: number,
): FirmamentPortalSpot[] {
  if (w <= 0 || h <= 0 || targets.length === 0) return []

  const fit = firmamentFitBox(w, h)
  const full = firmamentPortalRingR(h) * FIRMAMENT_OFFER_PORTAL_RING_K
  const clear = fit.r * FIRMAMENT_PORTAL_DISC_CLEAR
  const tries = FIRMAMENT_OFFER_PORTAL_ANGLE_TRIES

  // Eigene Kanaele, ab 157 aufwaerts: 131/137 gehoeren dem Abflugportal, 149
  // dem Wirbel. Zwei Aspekte auf einem Kanal laufen im Gleichschritt.
  const base = jitter(seed, 157) * Math.PI * 2

  for (const step of FIRMAMENT_PORTAL_SHRINK_STEPS) {
    const r = full * step
    const dMin = clear + r
    const inset = r * FIRMAMENT_PORTAL_EDGE_KEEP
    const spots: FirmamentPortalSpot[] = []

    for (const target of targets) {
      const k = spots.length
      const start = base + (k * Math.PI * 2) / targets.length
      const frac = jitter(seed * 10 + target, 163)
      let found: FirmamentPortalSpot | null = null

      // Von der Sollrichtung aus abwechselnd nach beiden Seiten: der erste
      // Treffer liegt damit so nah wie moeglich an der gespreizten Lage.
      for (let i = 0; i < tries && !found; i++) {
        const off = ((i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI * 2) / tries
        const angle = start + off
        const dMax = rayToRect(fit.cx, fit.cy, angle, inset, w, h)
        if (dMax < dMin) continue

        // Die RADIALE Leiter — der zweite Freiheitsgrad, den die Einzelfassung
        // nicht braucht: eine Speiche, die beim gewuerfelten Anteil im
        // Abstandskreis des Nachbarn liegt, ist weiter draussen oder weiter
        // drinnen oft frei.
        for (const f of [frac, ...FIRMAMENT_OFFER_PORTAL_RADIAL_STEPS]) {
          const d = dMin + f * (dMax - dMin)
          const x = fit.cx + Math.cos(angle) * d
          const y = fit.cy + Math.sin(angle) * d
          if (firmamentPortalVisibleShare(x, y, r, w, h) < FIRMAMENT_PORTAL_MIN_VISIBLE) continue
          if (
            spots.some((p) => Math.hypot(p.x - x, p.y - y) < (p.r + r) * FIRMAMENT_OFFER_PORTAL_GAP)
          )
            continue

          found = { x, y, r }
          break
        }
      }

      if (!found) break
      spots.push(found)
    }

    if (spots.length === targets.length) return spots
  }

  // Kein Fluchtweg mit Ueberlappung: eher enger gestellt als eines verschwunden.
  // Die kleinste Stufe auf gleichmaessig verteilten Winkeln, ohne Abstandstest.
  const r = full * FIRMAMENT_PORTAL_SHRINK_STEPS[FIRMAMENT_PORTAL_SHRINK_STEPS.length - 1]
  return targets.map((_, k) => {
    const angle = base + (k * Math.PI * 2) / targets.length
    const d = Math.max(clear + r, rayToRect(fit.cx, fit.cy, angle, r * FIRMAMENT_PORTAL_EDGE_KEEP, w, h))
    return { x: fit.cx + Math.cos(angle) * d, y: fit.cy + Math.sin(angle) * d, r }
  })
}

// ── Die Beschriftung ────────────────────────────────────────────────────────

export type FirmamentPortalLabelSide = 'below' | 'above' | 'right' | 'left'

export interface FirmamentPortalLabelSpot {
  /** Mitte des Kaestchens in Buehnenkoordinaten. */
  cx: number
  cy: number
  /** Die Zeichenschicht baut GENAU dieses Kaestchen — deshalb steht es hier. */
  w: number
  h: number
  /** Schriftgrad der Namenszeile in px; alles andere haengt in `em` daran. */
  size: number
  side: FirmamentPortalLabelSide
}

/** Der Schriftgrad haengt am RING, nicht an der Buehne: die Beschriftung gehoert
 *  dem Portal, und auf WUXGA schrumpft der Ring als einziger Fall. */
export function firmamentPortalLabelSize(r: number): number {
  return Math.min(
    FIRMAMENT_PORTAL_LABEL_MAX_PX,
    Math.max(FIRMAMENT_PORTAL_LABEL_MIN_PX, r * FIRMAMENT_PORTAL_LABEL_R_RATIO),
  )
}

/** Ein Punkt auf einer Achse, moeglichst nah an `want`, innerhalb `[lo, hi]` und
 *  ausserhalb aller `blocked`-Spannen. Kandidaten sind `want` selbst und die
 *  Raender aller Spannen — dazwischen kann kein besserer liegen. */
function nearestFree(
  want: number,
  lo: number,
  hi: number,
  blocked: Array<[number, number]>,
): number | null {
  if (lo > hi) return null
  const free = (t: number) => blocked.every(([a, b]) => t <= a + 1e-6 || t >= b - 1e-6)
  let best: number | null = null
  for (const raw of [want, lo, hi, ...blocked.flat()]) {
    const t = Math.min(hi, Math.max(lo, raw))
    if (!free(t)) continue
    if (best === null || Math.abs(t - want) < Math.abs(best - want)) best = t
  }
  return best
}

/**
 * Wo die Beschriftung des Portals steht.
 *
 * Sie sucht sich die Seite, weil die Portalstelle je Universum eine andere ist:
 * `below` → `above` → auswaerts → einwaerts. Unter und ueber dem Ring liegt das
 * leere Sternfeld; die einwaertige Seite liegt ueber dem Schattenteich der
 * Platte und ist die schlechteste Leseflaeche, also zuletzt.
 *
 * Die GEBUNDENE Achse traegt den Abstand zum Ring und ruehrt sich nie — sonst
 * liefe die Beschriftung von dem weg, was sie benennt. Auf der FREIEN Achse ist
 * es dagegen eine Rechnung mit einer Unbekannten: Bildkante als Spanne,
 * Kartenscheibe als Sperre, gesucht ist der Punkt am naechsten an der Ringmitte.
 *
 * Sie gibt nie `null`: dieselbe Regel wie die Schrumpfleiter des Rings —
 * gedraengt ist besser als weg, eine verschwundene Beschriftung waere eine
 * Weiterreise ohne Ziel.
 */
export function firmamentPortalLabelSpot(
  spot: FirmamentPortalSpot,
  w: number,
  h: number,
  neighbours: readonly FirmamentPortalSpot[] = [],
): FirmamentPortalLabelSpot {
  const size = firmamentPortalLabelSize(spot.r)
  const bw = FIRMAMENT_PORTAL_LABEL_W_EM * size
  const bh = FIRMAMENT_PORTAL_LABEL_H_EM * size
  const gap = FIRMAMENT_PORTAL_LABEL_GAP_EM * size
  const pad = FIRMAMENT_PORTAL_LABEL_EDGE_PAD

  const fit = firmamentFitBox(w, h)

  const outward: FirmamentPortalLabelSide = spot.x >= fit.cx ? 'right' : 'left'
  const inward: FirmamentPortalLabelSide = outward === 'right' ? 'left' : 'right'
  const order: FirmamentPortalLabelSide[] = ['below', 'above', outward, inward]

  /** Die feste Achse einer Seite: Kastenmitte und ihr halbes Mass. */
  function bound(side: FirmamentPortalLabelSide): { mid: number; half: number } {
    const half = side === 'below' || side === 'above' ? bh / 2 : bw / 2
    const off = spot.r + gap + half
    if (side === 'below') return { mid: spot.y + off, half }
    if (side === 'above') return { mid: spot.y - off, half }
    if (side === 'right') return { mid: spot.x + off, half }
    return { mid: spot.x - off, half }
  }

  function place(side: FirmamentPortalLabelSide, clear: number): FirmamentPortalLabelSpot | null {
    const vertical = side === 'below' || side === 'above'
    const { mid, half: bHalf } = bound(side)
    const span = vertical ? w : h
    const fHalf = vertical ? bw / 2 : bh / 2
    // Die gebundene Achse kann nicht ausweichen — passt sie nicht, faellt die
    // Seite ganz.
    if (mid - bHalf < pad || mid + bHalf > (vertical ? h : w) - pad) return null

    const blocked: Array<[number, number]> = []

    /** Ein runder Koerper als Sperrspanne auf der freien Achse — wie weit er
     *  reicht, haengt davon ab, wie nah die feste Achse ihm schon kommt. */
    function block(cxBound: number, cxFree: number, radius: number) {
      const d = Math.max(mid - bHalf - cxBound, cxBound - (mid + bHalf), 0)
      if (d >= radius) return
      const need = Math.sqrt(radius * radius - d * d) + fHalf
      blocked.push([cxFree - need, cxFree + need])
    }

    // Die Kartenscheibe, und — sofern es welche gibt — die Nachbarportale. Die
    // Scheibe gibt ueber die Leiter nach, ein Nachbar nie: er ist ein Koerper,
    // keine Naehe.
    block(vertical ? fit.cy : fit.cx, vertical ? fit.cx : fit.cy, clear)
    for (const n of neighbours) block(vertical ? n.y : n.x, vertical ? n.x : n.y, n.r)

    const t = nearestFree(vertical ? spot.x : spot.y, pad + fHalf, span - pad - fHalf, blocked)
    if (t === null) return null
    return vertical
      ? { cx: t, cy: mid, w: bw, h: bh, size, side }
      : { cx: mid, cy: t, w: bw, h: bh, size, side }
  }

  // Aeussere Schleife ueber die NAEHE zur Karte, innere ueber die Seiten: eine
  // Seite in der schwarzen Flaeche schlaegt jede naehere, egal welche.
  for (const step of FIRMAMENT_PORTAL_LABEL_CLEAR_STEPS) {
    for (const side of order) {
      const cand = place(side, fit.r * step)
      if (cand) return cand
    }
  }

  // Fluchtweg: unter dem Ring, auf BEIDEN Achsen in die Buehne geklemmt.
  const { mid } = bound('below')
  const clampTo = (v: number, lo: number, hi: number) =>
    lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v))
  return {
    cx: clampTo(spot.x, pad + bw / 2, w - pad - bw / 2),
    cy: clampTo(mid, pad + bh / 2, h - pad - bh / 2),
    w: bw,
    h: bh,
    size,
    side: 'below',
  }
}

/**
 * Ring und Beschriftung als EIN Rechteck.
 *
 * Es ist die Trefferflaeche UND der Anker der Hover-Karte, und das ist der
 * Punkt: `RpgBadgeTooltip` misst das erste Kind seines Slots und legt die Karte
 * unter dessen Unterkante. Am runden Knopf allein ging sie genau dort auf, wo
 * die Beschriftung steht, und deckte sie zu.
 *
 * Geklemmt wird auf ALLEN vier Seiten: die Stelle ist je Universum eine andere,
 * jede Kante kann die angeschnittene sein. Was draussen liegt, ist ohnehin nicht
 * zu treffen — und ein Anker, der ueber den Rand hinausreicht, zoege die Karte
 * samt Pfeil aus dem Reiter heraus.
 */
export function firmamentPortalHitBox(
  spot: FirmamentPortalSpot,
  label: FirmamentPortalLabelSpot,
  w: number,
  h: number,
): FirmamentRect {
  return {
    x0: Math.max(0, Math.min(spot.x - spot.r, label.cx - label.w / 2)),
    y0: Math.max(0, Math.min(spot.y - spot.r, label.cy - label.h / 2)),
    x1: Math.min(w, Math.max(spot.x + spot.r, label.cx + label.w / 2)),
    y1: Math.min(h, Math.max(spot.y + spot.r, label.cy + label.h / 2)),
  }
}
