import { describe, it, expect } from 'vitest'
import {
  BOTTOM_BAR_SIDE_W,
  FIRMAMENT_CREST_BAND_H,
  FIRMAMENT_CREST_ID_W,
  FIRMAMENT_MAP_INSET_PX,
  FIRMAMENT_NODE_HIT_MIN,
  FIRMAMENT_PLATE_REF_R,
  FIRMAMENT_RAIL_AUTOFOLD_W,
  FIRMAMENT_RAIL_FOLDED_W,
  FIRMAMENT_RAIL_W,
  FIRMAMENT_STAGE_MIN_H,
  FIRMAMENT_STAGE_MIN_W,
  FIRMAMENT_UNLIT_AHEAD,
  FIRMAMENT_ZOOM_STEPS,
  UNIVERSE_RAIL_CARRY_H,
  UNIVERSE_RAIL_HEAD_H,
  UNIVERSE_RAIL_LIST_PAD,
  UNIVERSE_RAIL_ROW_GAP,
  UNIVERSE_RAIL_ROW_H,
  UNIVERSE_DISC_CREST_PX,
  UNIVERSE_DISC_HERO_MAX_PX,
  UNIVERSE_DISC_HERO_MIN_PX,
  UNIVERSE_DISC_HERO_QUANT_PX,
  UNIVERSE_DISC_HERO_R_RATIO,
  UNIVERSE_DISC_RAIL_PX,
  UNIVERSE_DISC_RIM_SPIN_RATIO,
  UNIVERSE_DISC_SPIN_SEC,
  FIRMAMENT_RIM_SPRITE_MARGIN,
  FIRMAMENT_MAX_DPR,
  FIRMAMENT_WALL_MAX_BACKING_PX,
} from '@/config/constants'
import { universes } from '@/config/progression/universes'
import { firmamentFitBox, firmamentPointAt } from '@/utils/ui/firmamentLayout'
import { universeDiscSpinSec } from '@/utils/fx/universeDisc'

/**
 * Der Firmament-Reiter teilt ZWEI Zonen ein Budget: Leiste + Buehne sind der
 * ganze Reiter unter dem Kopfband. Nichts im CSS sagt, wie viel der Karte davon
 * bleibt — wer die Leiste verbreitert oder das Band hoeher macht, nimmt es ihr
 * still weg.
 *
 * Und der Boden ist hier keine Geschmacksfrage: die Bahn ist eine Spirale mit
 * FESTEM Windungsvorrat. Je mehr Galaxien, desto enger stehen die Knoten — faellt
 * ihr Abstand unter `FIRMAMENT_NODE_HIT_MIN`, decken sich die Klickflaechen und
 * die Karte hoert auf zu funktionieren. Diese Spec sagt, bis zu welcher Zahl das
 * OHNE Zoom traegt, und bindet die Zahl an die Konstanten.
 */

/** `--bp-gap` von `.rp-wrapper`, beide Seiten. */
const MODAL_GAP = 10

const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** `--hud-scale` aus `App.vue`. */
const hudScale = (w: number, h: number) => clamp(0.52, Math.min(w / 2560, h / 1440), 1)

/** Breite des Reiters: das Profilmodal ist beidseitig um `--hud-panel-size`
 *  eingerueckt. Der Firmament-Reiter traegt — anders als Team und Voyages —
 *  KEIN `zoom`, sein Koordinatenraum ist also der des Modals. */
function tabWidth(vw: number, vh: number): number {
  return vw - 2 * (BOTTOM_BAR_SIDE_W * hudScale(vw, vh) + MODAL_GAP)
}

/**
 * Hoehe des Reiterinhalts je Aufloesung — GEMESSEN, nicht gerechnet.
 *
 * `.rp-wrapper` haengt oben an `--level-badge-bottom`, das der App-Header zur
 * Laufzeit aus einem gerenderten Rechteck setzt; eine Formel dafuer waere eine
 * zweite, stille Quelle. Dieselbe Entscheidung wie in `shopAtlasLayout.spec.ts`
 * und `voyagesAtlasLayout.spec.ts`.
 *
 * Aufgenommen mit dem Playwright-Treiber im Scratchpad, zwanzig befreite
 * Galaxien und drei archivierten Universums-Laeufen.
 */
const CONTENT_HEIGHT: Record<number, number> = {
  1080: 782.6,
  1200: 883.4,
  1440: 1061,
  2160: 1770.2,
}

function zones(vw: number, vh: number, folded = false) {
  const tab = tabWidth(vw, vh)
  const rail = folded ? FIRMAMENT_RAIL_FOLDED_W : FIRMAMENT_RAIL_W
  return {
    tab,
    rail,
    stageW: tab - rail,
    stageH: CONTENT_HEIGHT[vh] - FIRMAMENT_CREST_BAND_H,
  }
}

/** Kantenlaenge der Heldenscheibe — dieselbe Rechnung wie `FirmamentChart`. */
function heroPx(r: number): number {
  const stepped =
    Math.round((2 * r * UNIVERSE_DISC_HERO_R_RATIO) / UNIVERSE_DISC_HERO_QUANT_PX) *
    UNIVERSE_DISC_HERO_QUANT_PX
  return Math.min(UNIVERSE_DISC_HERO_MAX_PX, Math.max(UNIVERSE_DISC_HERO_MIN_PX, stepped))
}

/** Kantenlaenge des Wall-Sprites. */
function rimPx(r: number): number {
  return Math.max(1, Math.round(r * 2 * FIRMAMENT_RIM_SPRITE_MARGIN))
}

/** Der Bahnradius je Zielaufloesung. */
function radiusAt(vw: number, vh: number): number {
  const z = zones(vw, vh)
  return firmamentFitBox(z.stageW, z.stageH, FIRMAMENT_MAP_INSET_PX).r
}

/** Der engste Abstand zweier Knoten auf der Bahn, in Pixeln. */
function minSeparation(count: number, radius: number): number {
  const pts = Array.from({ length: count }, (_, i) =>
    firmamentPointAt(count > 1 ? i / (count - 1) : 0),
  )
  let min = Infinity
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      min = Math.min(min, Math.hypot(pts[i].nx - pts[j].nx, pts[i].ny - pts[j].ny) * radius)
    }
  }
  return min
}

describe('Firmament — das Zonenbudget', () => {
  it('laesst der Buehne auf jeder Zielaufloesung ihren Boden', () => {
    for (const [vw, vh] of [
      [1920, 1080],
      [1920, 1200],
      [2560, 1440],
      [3840, 2160],
    ]) {
      const z = zones(vw, vh)
      expect(z.stageW, `${vw}x${vh} Breite`).toBeGreaterThanOrEqual(FIRMAMENT_STAGE_MIN_W)
      expect(z.stageH, `${vw}x${vh} Hoehe`).toBeGreaterThanOrEqual(FIRMAMENT_STAGE_MIN_H)
    }
  })

  it('klappt die Leiste ein, bevor die Buehne unter ihren Boden faellt', () => {
    // Unterhalb der Klappschwelle darf die eingeklappte Leiste den Boden noch
    // halten — genau dafuer ist sie da.
    const stageW = FIRMAMENT_RAIL_AUTOFOLD_W - FIRMAMENT_RAIL_FOLDED_W
    expect(stageW).toBeGreaterThanOrEqual(FIRMAMENT_STAGE_MIN_W)
  })

  it('spart mit dem Einklappen mehr als die Haelfte der Leiste', () => {
    expect(FIRMAMENT_RAIL_FOLDED_W).toBeLessThan(FIRMAMENT_RAIL_W / 2)
  })

  it('haelt das Wappen im Kopfband schmaler als die halbe Breite', () => {
    // Sonst bliebe der Fortschrittsleiste daneben kein lesbarer Rest.
    expect(FIRMAMENT_CREST_ID_W).toBeLessThan(tabWidth(1920, 1080) / 2)
  })

  it('traegt alle zehn Universumsscheiben ohne zu rollen', () => {
    // Die Leiste ist so hoch wie die Buehne. Zehn Zeilen, Kopf und Fuss muessen
    // auf Full HD hineinpassen — wer die Scheibe groesser macht, laesst die
    // Leiste rollen, und genau das soll hier auffallen.
    const rows = universes.length
    const list = rows * UNIVERSE_RAIL_ROW_H + (rows - 1) * UNIVERSE_RAIL_ROW_GAP
    const needed = UNIVERSE_RAIL_HEAD_H + list + UNIVERSE_RAIL_LIST_PAD + UNIVERSE_RAIL_CARRY_H
    expect(needed).toBeLessThanOrEqual(zones(1920, 1080).stageH)
  })

  it('dreht Feld und Wall verschieden schnell', () => {
    // Das VERHAELTNIS ist die Entwurfsentscheidung, nicht die absolute Rate:
    // gleich schnell liest sich die Scheibe als Rad, verschieden schnell als
    // Raum mit Tiefe. Wer beide gleichzieht, nimmt ihr genau das.
    expect(UNIVERSE_DISC_RIM_SPIN_RATIO).toBeGreaterThan(1)
  })

  it('haelt die Rail-Scheibe als Basis der Wurzelregel', () => {
    // Hier stand einmal `> 90` unter der Ueberschrift „langsamer als alles
    // andere im Spiel". Das war die falsche Groesse: 210 s ergaben 0,51 px/s am
    // Scheibenrand, und der Nutzer meldete die Scheibe als stillstehend.
    // Gemessen gilt: 0,5 px/s sieht niemand, 1,78 px/s schon. Diese eine Zahl
    // ist die BASIS, aus der jede andere Groesse ableitet.
    expect(universeDiscSpinSec(UNIVERSE_DISC_RAIL_PX)).toBe(UNIVERSE_DISC_SPIN_SEC)
    const edge = (Math.PI * UNIVERSE_DISC_RAIL_PX) / UNIVERSE_DISC_SPIN_SEC
    expect(edge).toBeGreaterThan(1.5)
    expect(edge).toBeLessThan(2.2)
  })

  it('waechst unterlinear — nicht konstant und nicht proportional', () => {
    // Das IST die Wurzelregel, und beide reinen Formen sind falsch: konstante
    // Dauer laesst die 420-px-Scheibe mit 22 px/s kreiseln, proportionale laesst
    // sie mit 3 Grad in drei Sekunden stillstehen. Wer eine der beiden wieder
    // einsetzt, bricht genau diese Zusicherung.
    const a = universeDiscSpinSec(UNIVERSE_DISC_RAIL_PX)
    const b = universeDiscSpinSec(UNIVERSE_DISC_RAIL_PX * 4)
    expect(b).toBeGreaterThan(a) // nicht konstant
    expect(b).toBeLessThan(a * 4) // nicht proportional
    expect(b).toBeCloseTo(a * 2, 6) // Wurzel: viermal so gross ist zweimal so lang
  })

  it('dreht JEDE Ebene des Reiters sichtbar, aber keine als Kreisel', () => {
    // Gebunden werden BEIDE Enden, weil die Wurzelregel genau zwischen ihnen
    // liegt: unten die Randgeschwindigkeit (was das Auge auf der kleinen
    // Scheibe sieht), oben der Winkel (was es auf der grossen sieht). Ein
    // oberer Riegel auf die Randgeschwindigkeit waere hier der falsche
    // Waechter — bei 1715 px Durchmesser ist sie kein Mass fuer Unruhe mehr.
    const sizes = [UNIVERSE_DISC_RAIL_PX, UNIVERSE_DISC_CREST_PX]
    for (const [vw, vh] of [
      [1920, 1080],
      [2560, 1440],
      [3840, 2160],
    ]) {
      const r = radiusAt(vw, vh)
      sizes.push(heroPx(r), rimPx(r))
    }

    for (const px of sizes) {
      const sec = universeDiscSpinSec(px)
      const edge = (Math.PI * px) / sec
      const deg3 = (3 / sec) * 360
      expect(edge, `${px}px Randgeschwindigkeit`).toBeGreaterThan(1)
      expect(deg3, `${px}px Winkel in 3s`).toBeGreaterThan(2.4)
      expect(deg3, `${px}px Winkel in 3s`).toBeLessThan(25)
    }
  })

  it('deckelt die Wall-Ebene, ohne sie bei Zoom 1 zu treffen', () => {
    // Die Ebene ist quadratisch und waechst mit dem Zoom — ohne eigenen Deckel
    // waeren es bei 2,4 auf 2K 27 MB fuer ein Band aus Haarlinien. Bei Zoom 1
    // darf er auf keiner Zielaufloesung greifen: dort soll der Wall aussehen
    // wie zuvor.
    expect(FIRMAMENT_WALL_MAX_BACKING_PX ** 2 * 4).toBeLessThan(20 * 1024 * 1024)
    for (const [vw, vh] of [
      [1920, 1080],
      [2560, 1440],
    ]) {
      const side = rimPx(radiusAt(vw, vh))
      expect(FIRMAMENT_WALL_MAX_BACKING_PX / side, `${vw}x${vh}`).toBeGreaterThanOrEqual(
        FIRMAMENT_MAX_DPR,
      )
    }
  })

  it('deckt das Wall-Sprite seine ganze Tinte ab', () => {
    // Weiteste Tinte: der Ring bei 1,02 r plus die halbe 8k-Strichstaerke.
    const widest = 1.02 + 4 / FIRMAMENT_PLATE_REF_R
    expect(FIRMAMENT_RIM_SPRITE_MARGIN).toBeGreaterThan(widest)
    // Aber nicht mehr: jeder Prozent darueber ist Textur fuer nichts.
    expect(FIRMAMENT_RIM_SPRITE_MARGIN).toBeLessThan(1.15)
  })

  it('nennt die Wand, an der der Wall zu traege wird', () => {
    // Der Wall ist der groesste Koerper im Reiter, also der langsamste. Auf 4K
    // steht er bei 2,53 Grad in drei Sekunden — wer die Buehne weiter aufreisst
    // oder die Basis senkt, schiebt ihn unter die Sichtbarkeit und soll das
    // hier sehen statt im Spiel.
    const deg3At = (px: number) => (3 / universeDiscSpinSec(px)) * 360
    expect(deg3At(rimPx(radiusAt(3840, 2160)))).toBeGreaterThan(2.4)
    let wall = 0
    for (let side = 400; side <= 12000; side += 20) {
      if (deg3At(side) < 2.4) {
        wall = side
        break
      }
    }
    // Erst jenseits der doppelten 4K-Kante — dort ist keine Buehne mehr.
    expect(wall).toBeGreaterThan(rimPx(radiusAt(3840, 2160)) * 1.1)
  })

  it('laesst den Wall hinter dem Feld zurueck', () => {
    expect(UNIVERSE_DISC_SPIN_SEC * UNIVERSE_DISC_RIM_SPIN_RATIO).toBeGreaterThan(
      UNIVERSE_DISC_SPIN_SEC,
    )
  })
})

describe('Firmament — die Bahn bleibt bedienbar', () => {
  /** Die Fit-Box, in die die Bahn auf Full HD faellt. */
  const fullHd = () => {
    const z = zones(1920, 1080)
    return firmamentFitBox(z.stageW, z.stageH, FIRMAMENT_MAP_INSET_PX)
  }

  it('traegt auf Full HD mindestens vierzig Knoten ohne Zoom', () => {
    // Vierzig Knoten sind 35 befreite Galaxien plus die laufende plus die vier
    // unbeleuchteten davor — deutlich mehr, als ein Lauf je erreicht.
    const sep = minSeparation(40, fullHd().r)
    expect(sep).toBeGreaterThanOrEqual(FIRMAMENT_NODE_HIT_MIN)
  })

  it('nennt die Wand, an der der Zoom gebraucht wird', () => {
    // Bei welcher Knotenzahl der Abstand unter die Trefferflaeche faellt. Wer
    // Windungen, Innenradius oder Trefferflaeche aendert, verschiebt sie — und
    // soll das hier sehen, statt es im Spiel zu entdecken.
    const r = fullHd().r
    let wall = 0
    for (let n = 8; n <= 120; n++) {
      if (minSeparation(n, r) < FIRMAMENT_NODE_HIT_MIN) {
        wall = n
        break
      }
    }
    expect(wall).toBeGreaterThan(40)
    // Und der Zoom holt die Wand deutlich weiter hinaus.
    const zoomed = minSeparation(wall, r * FIRMAMENT_ZOOM_STEPS[FIRMAMENT_ZOOM_STEPS.length - 1])
    expect(zoomed).toBeGreaterThan(FIRMAMENT_NODE_HIT_MIN)
  })

  it('haelt den innersten Knoten von der Mitte frei', () => {
    // Frueher stand hier der gemalte Ursprung. Den gibt es nicht mehr — an
    // seiner Stelle steht der Kern der Heldenscheibe, und der ist dieselbe
    // Marke: ein Knoten darauf waere nicht mehr von ihm zu trennen.
    const r = fullHd().r
    expect(firmamentPointAt(0).radius * r).toBeGreaterThan(FIRMAMENT_NODE_HIT_MIN)
  })

  it('legt die Heldenscheibe UNTER die inneren Knoten, nicht neben sie', () => {
    // Das ist gewollt und wird festgeschrieben: die Scheibe ist das Herzstueck,
    // die innersten Knoten liegen auf ihr. Wer sie kleiner macht, bis sie in
    // den knotenfreien Kern passt, nimmt ihr genau das — und die Drehung waere
    // auf 75 px wieder unsichtbar.
    const r = fullHd().r
    const innermost = firmamentPointAt(0).radius * r
    expect(heroPx(r) / 2).toBeGreaterThan(innermost)
    // Aber sie bleibt deutlich innerhalb der Bahn: sie deckt die aeusseren
    // Windungen nicht mit ab.
    expect(heroPx(r) / 2).toBeLessThan(r * 0.4)
  })

  it('haengt vier unbeleuchtete Plaetze an, nicht null und nicht zehn', () => {
    // Null hiesse: die Bahn endet, wo der Spieler steht. Zehn hiesse: die
    // Haelfte der Karte ist Versprechen statt Weg.
    expect(FIRMAMENT_UNLIT_AHEAD).toBeGreaterThan(0)
    expect(FIRMAMENT_UNLIT_AHEAD).toBeLessThanOrEqual(6)
  })
})
