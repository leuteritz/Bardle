import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  BOTTOM_BAR_SIDE_W,
  FIRMAMENT_CREST_BAND_H,
  FIRMAMENT_CREST_ID_W,
  FIRMAMENT_MAP_INSET_PX,
  FIRMAMENT_NODE_HIT_MIN,
  FIRMAMENT_PATH_MIN_SPAN,
  FIRMAMENT_PLATE_REF_R,
  FIRMAMENT_PORTAL_AURA_SPAN,
  FIRMAMENT_PORTAL_HOVER_BOOST_RATIO,
  FIRMAMENT_PORTAL_HOVER_HALO_K,
  FIRMAMENT_PORTAL_HOVER_MAW_K,
  FIRMAMENT_PORTAL_HOVER_RIM_K,
  FIRMAMENT_PORTAL_HOVER_SWIRL_K,
  FIRMAMENT_PORTAL_RING_MIN_PX,
  FIRMAMENT_PORTAL_RIPPLE_FROM,
  FIRMAMENT_PORTAL_RIPPLE_TO,
  FIRMAMENT_PORTAL_SHRINK_STEPS,
  FIRMAMENT_RAIL_AUTOFOLD_W,
  FIRMAMENT_RAIL_HANDLE_PX,
  FIRMAMENT_RAIL_PANEL_W,
  FIRMAMENT_RAIL_ZONE_W,
  FIRMAMENT_STAGE_MIN_H,
  FIRMAMENT_STAGE_MIN_W,
  FIRMAMENT_UNLIT_AHEAD,
  FIRMAMENT_ZOOM_STEPS,
  UNIVERSE_RAIL_COMPACT_MAX_VH,
  UNIVERSE_RAIL_COMPACT_STAGE_H,
  UNIVERSE_RAIL_LIST_PAD,
  UNIVERSE_RAIL_LIST_PAD_COMPACT,
  UNIVERSE_RAIL_ROW_GAP,
  UNIVERSE_RAIL_ROW_GAP_COMPACT,
  UNIVERSE_RAIL_ROW_H,
  UNIVERSE_RAIL_ROW_H_COMPACT,
  UNIVERSE_DISC_CREST_PX,
  UNIVERSE_DISC_CLOUD_MAX_BACKING_PX,
  UNIVERSE_DISC_CLOUD_REACH,
  UNIVERSE_DISC_CLOUD_HALO_R,
  UNIVERSE_DISC_MAX_DPR,
  UNIVERSE_DISC_HERO_MIN_PX,
  UNIVERSE_DISC_HERO_QUANT_PX,
  UNIVERSE_DISC_HERO_R_RATIO,
  UNIVERSE_DISC_RAIL_PX,
  UNIVERSE_DISC_SPIN_BASE_PX,
  UNIVERSE_DISC_RIM_SPIN_RATIO,
  UNIVERSE_DISC_SPIN_SEC,
  FIRMAMENT_RIM_SPRITE_MARGIN,
  FIRMAMENT_MAX_DPR,
  FIRMAMENT_SPIRAL_R1,
  FIRMAMENT_SPIRAL_STEP_TURNS,
  FIRMAMENT_SPIRAL_TURNS,
  FIRMAMENT_WALL_MAX_BACKING_PX,
} from '@/config/constants'
import { universes } from '@/config/progression/universes'
import { firmamentFitBox, firmamentPointAt, firmamentSpiralTurns } from '@/utils/ui/firmamentLayout'
import { firmamentPortalRingR } from '@/utils/ui/firmamentPortalSpot'
import { universeDiscSpinSec } from '@/utils/fx/universeDisc'

/**
 * Der Firmament-Reiter teilt ZWEI Zonen ein Budget: Leiste + Buehne sind der
 * ganze Reiter unter dem Kopfband. Nichts im CSS sagt, wie viel der Karte davon
 * bleibt — wer die Leiste verbreitert oder das Band hoeher macht, nimmt es ihr
 * still weg.
 *
 * Und der Boden ist hier keine Geschmacksfrage: die Bahn waechst mit festem
 * WINKELSCHRITT, bis `FIRMAMENT_SPIRAL_TURNS` sie deckelt. Ab dort stehen die
 * Knoten mit jeder Galaxie enger — faellt ihr Abstand unter
 * `FIRMAMENT_NODE_HIT_MIN`, decken sich die Klickflaechen und die Karte hoert
 * auf zu funktionieren. Diese Spec sagt, bis zu welcher Zahl das OHNE Zoom
 * traegt, und bindet die Zahl an die Konstanten.
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
  const rail = folded ? FIRMAMENT_RAIL_HANDLE_PX : FIRMAMENT_RAIL_ZONE_W
  return {
    tab,
    rail,
    stageW: tab - rail,
    stageH: CONTENT_HEIGHT[vh] - FIRMAMENT_CREST_BAND_H,
  }
}

/** Kantenlaenge der Wolke — dieselbe Rechnung wie `FirmamentChart`. */
function heroPx(r: number): number {
  const stepped =
    Math.round((2 * r * UNIVERSE_DISC_HERO_R_RATIO) / UNIVERSE_DISC_HERO_QUANT_PX) *
    UNIVERSE_DISC_HERO_QUANT_PX
  return Math.max(UNIVERSE_DISC_HERO_MIN_PX, stepped)
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
  // MIT dem Windungsvorrat, den eine Bahn dieser Laenge wirklich bekommt — der
  // ist nicht mehr fest, und mit dem Default gemessen loege die Wand.
  const turns = firmamentSpiralTurns(count)
  const pts = Array.from({ length: count }, (_, i) =>
    firmamentPointAt(count > 1 ? i / (count - 1) : 0, turns),
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
    const stageW = FIRMAMENT_RAIL_AUTOFOLD_W - FIRMAMENT_RAIL_HANDLE_PX
    expect(stageW).toBeGreaterThanOrEqual(FIRMAMENT_STAGE_MIN_W)
  })

  it('spart mit dem Einklappen mehr als die Haelfte der Leiste', () => {
    expect(FIRMAMENT_RAIL_HANDLE_PX).toBeLessThan(FIRMAMENT_RAIL_ZONE_W / 2)
  })

  it('haelt das Wappen im Kopfband schmaler als die halbe Breite', () => {
    // Sonst bliebe der Fortschrittsleiste daneben kein lesbarer Rest.
    expect(FIRMAMENT_CREST_ID_W).toBeLessThan(tabWidth(1920, 1080) / 2)
  })

  it('ist die Zone der Leiste Liste PLUS Griff', () => {
    // Die Griffleiste bleibt stehen, wenn die Liste weggefahren ist — sie gehoert
    // deshalb in dieselbe Spalte. Wer nur die Liste in die Spaltenbreite
    // schriebe, saehe den Griff ueber der Karte liegen.
    expect(FIRMAMENT_RAIL_ZONE_W).toBe(FIRMAMENT_RAIL_PANEL_W + FIRMAMENT_RAIL_HANDLE_PX)
  })

  it('traegt alle zehn Universumsscheiben ohne zu rollen', () => {
    // Die Leiste ist so hoch wie die Buehne. Zehn Zeilen und die Polsterung
    // muessen auf Full HD hineinpassen — wer die Scheibe groesser macht, laesst
    // die Leiste rollen, und genau das soll hier auffallen. Kopfzeile und
    // Carry-over-Fuss sind gefallen; ihre 178 px stecken in der Zeilenhoehe.
    const rows = universes.length
    const list = rows * UNIVERSE_RAIL_ROW_H + (rows - 1) * UNIVERSE_RAIL_ROW_GAP
    expect(list + UNIVERSE_RAIL_LIST_PAD).toBeLessThanOrEqual(zones(1920, 1080).stageH)
  })

  /*
   * Und derselbe Haushalt im FLACHEN Fenster.
   *
   * Die Tabelle oben rechnet mit „Viewport == Bildschirmhoehe", wie jede
   * Layout-Spec des Projekts; real nimmt der Browser rund 130 px. GEMESSEN
   * bleiben dem Reiter auf Full HD im Fenster 569,1 statt 690,6 px — die grosse
   * Stufe rollte dort um genau 100. Wer die kompakte Stufe anfasst, sieht es
   * hier statt im Spiel.
   */
  it('traegt sie auch im flachsten Fenster, dann kompakt', () => {
    const rows = universes.length
    const list = rows * UNIVERSE_RAIL_ROW_H_COMPACT + (rows - 1) * UNIVERSE_RAIL_ROW_GAP_COMPACT
    expect(list + UNIVERSE_RAIL_LIST_PAD_COMPACT).toBeLessThanOrEqual(UNIVERSE_RAIL_COMPACT_STAGE_H)
    // Und die grosse Stufe passt dort NICHT — sonst waere die kompakte umsonst.
    const big = rows * UNIVERSE_RAIL_ROW_H + (rows - 1) * UNIVERSE_RAIL_ROW_GAP
    expect(big + UNIVERSE_RAIL_LIST_PAD).toBeGreaterThan(UNIVERSE_RAIL_COMPACT_STAGE_H)
  })

  it('schaltet die kompakte Stufe genau dort, wo die grosse aufhoert zu passen', () => {
    // Hier stand einmal `Viewport − 388`. Der Abstand ist keine Konstante: der
    // App-Header haengt an `--hud-scale`, und die skaliert mit der HOEHE — von
    // 950 auf 1080 waechst die Buehne nur um 0,93 px je Viewport-Pixel. Und die
    // 388 waren an das 92-px-Kopfband gebunden, also still falsch, sobald es
    // wuchs. Interpoliert wird jetzt zwischen den ZWEI gemessenen Staenden.
    const rows = universes.length
    const big = rows * UNIVERSE_RAIL_ROW_H + (rows - 1) * UNIVERSE_RAIL_ROW_GAP + UNIVERSE_RAIL_LIST_PAD
    const loVh = 950
    const hiVh = 1080
    const loH = UNIVERSE_RAIL_COMPACT_STAGE_H
    const hiH = CONTENT_HEIGHT[1080] - FIRMAMENT_CREST_BAND_H
    const kippt = loVh + ((big - loH) * (hiVh - loVh)) / (hiH - loH)
    // Die Schwelle muss ueber der Viewport-Hoehe liegen, bei der die grosse
    // Stufe kippt — sonst gibt es ein Fenster dazwischen, in dem gerollt wird
    // und die Media Query noch nicht greift.
    expect(UNIVERSE_RAIL_COMPACT_MAX_VH).toBeGreaterThanOrEqual(Math.ceil(kippt))
    // Aber nicht so hoch, dass sie im Vollbild-Referenzfall schon greift.
    expect(UNIVERSE_RAIL_COMPACT_MAX_VH).toBeLessThan(1080)
  })

  it('dreht Feld und Wall verschieden schnell', () => {
    // Das VERHAELTNIS ist die Entwurfsentscheidung, nicht die absolute Rate:
    // gleich schnell liest sich die Scheibe als Rad, verschieden schnell als
    // Raum mit Tiefe. Wer beide gleichzieht, nimmt ihr genau das.
    expect(UNIVERSE_DISC_RIM_SPIN_RATIO).toBeGreaterThan(1)
  })

  it('haelt die gemessene Basis der Wurzelregel', () => {
    // Hier stand einmal `> 90` unter der Ueberschrift „langsamer als alles
    // andere im Spiel". Das war die falsche Groesse: 210 s ergaben 0,51 px/s am
    // Scheibenrand, und der Nutzer meldete die Scheibe als stillstehend.
    // Gemessen gilt: 0,5 px/s sieht niemand, 1,78 px/s schon. Diese eine Zahl
    // ist die BASIS, aus der jede andere Groesse ableitet — und sie haengt an
    // KEINER Anzeigegroesse: als die Rail-Kachel auf 46 px wuchs, waere sonst
    // die Drehdauer jeder Scheibe im Spiel mitgewandert.
    expect(universeDiscSpinSec(UNIVERSE_DISC_SPIN_BASE_PX)).toBe(UNIVERSE_DISC_SPIN_SEC)
    const edge = (Math.PI * UNIVERSE_DISC_SPIN_BASE_PX) / UNIVERSE_DISC_SPIN_SEC
    expect(edge).toBeGreaterThan(1.5)
    expect(edge).toBeLessThan(2.2)
  })

  it('waechst unterlinear — nicht konstant und nicht proportional', () => {
    // Das IST die Wurzelregel, und beide reinen Formen sind falsch: konstante
    // Dauer laesst die 420-px-Scheibe mit 22 px/s kreiseln, proportionale laesst
    // sie mit 3 Grad in drei Sekunden stillstehen. Wer eine der beiden wieder
    // einsetzt, bricht genau diese Zusicherung.
    const a = universeDiscSpinSec(UNIVERSE_DISC_SPIN_BASE_PX)
    const b = universeDiscSpinSec(UNIVERSE_DISC_SPIN_BASE_PX * 4)
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

  it('laesst das Universum die GANZE Kartenscheibe fuellen', () => {
    // Hier stand einmal, die Scheibe muesse „deutlich innerhalb der Bahn"
    // bleiben — sie lag bei 0,286 r und las sich als Fleck in der Mitte,
    // waehrend die Flaeche, auf der die Bahn liegt, leer blieb. Die Bahn soll IM
    // Universum liegen. Gebunden wird deshalb das Gegenteil: die Koerper reichen
    // bis an den Wall, aber nicht darueber.
    for (const [vw, vh] of [
      [1920, 1080],
      [2560, 1440],
      [3840, 2160],
    ]) {
      const r = radiusAt(vw, vh)
      const reach = (heroPx(r) / 2) * UNIVERSE_DISC_CLOUD_REACH
      // Der Wall der KARTE beginnt bei 0,9 r — bis dahin, nicht darueber.
      expect(reach / r, `${vw}x${vh} zu klein`).toBeGreaterThan(0.85)
      expect(reach / r, `${vw}x${vh} unter dem Wall hervor`).toBeLessThan(0.93)
      // Und jeder Knoten der Bahn liegt darin, nicht nur die innersten.
      expect(firmamentPointAt(1).radius * r, `${vw}x${vh} aeusserster Knoten`).toBeLessThan(
        (heroPx(r) / 2) * 1.02,
      )
    }
  })

  it('deckelt die Wolke ueber die RASTERFLAECHE, nicht die Kante', () => {
    // Ein Kantendeckel machte sie auf grossen Buehnen wieder zum Fleck. Gedeckelt
    // gehoert der Speicher — und bei Zoom 1 darf er auf Full HD und 2K NICHT
    // greifen, dort soll sie so scharf sein wie jede andere Scheibe.
    const mb = (px: number, dpr: number) => ((px * dpr) ** 2 * 4 * 2) / 1024 / 1024
    for (const [vw, vh] of [
      [1920, 1080],
      [2560, 1440],
    ]) {
      const px = heroPx(radiusAt(vw, vh))
      expect(UNIVERSE_DISC_CLOUD_MAX_BACKING_PX / px, `${vw}x${vh}`).toBeGreaterThanOrEqual(
        UNIVERSE_DISC_MAX_DPR,
      )
    }
    // Auf 4K und im Zoom greift er und haelt beide Ebenen zusammen unter 40 MB.
    const px4k = heroPx(radiusAt(3840, 2160))
    const dpr = Math.min(UNIVERSE_DISC_MAX_DPR, UNIVERSE_DISC_CLOUD_MAX_BACKING_PX / px4k)
    expect(mb(px4k, dpr)).toBeLessThan(40)
  })

  it('laesst den Kern der Wolke NICHT mitwachsen', () => {
    // Er markiert „du bist hier" und ist der Nachfolger des entfallenen
    // `paintOrigin`. Mit `UNIVERSE_DISC_CORE_R` mitgewachsen deckte sein Halo auf
    // 4K 237 px — eine Sonne ueber einem Sechstel der Buehne. Die Zahl
    // reproduziert den alten Ursprung: 26 k bei k = box.r / 300.
    for (const [vw, vh] of [
      [1920, 1080],
      [2560, 1440],
      [3840, 2160],
    ]) {
      const r = radiusAt(vw, vh)
      const halo = heroPx(r) * UNIVERSE_DISC_CLOUD_HALO_R
      const origin = 26 * (r / 300)
      expect(halo, `${vw}x${vh}`).toBeGreaterThan(origin * 0.9)
      expect(halo, `${vw}x${vh}`).toBeLessThan(origin * 1.1)
    }
  })

  it('haengt vier unbeleuchtete Plaetze an, nicht null und nicht zehn', () => {
    // Null hiesse: die Bahn endet, wo der Spieler steht. Zehn hiesse: die
    // Haelfte der Karte ist Versprechen statt Weg.
    expect(FIRMAMENT_UNLIT_AHEAD).toBeGreaterThan(0)
    expect(FIRMAMENT_UNLIT_AHEAD).toBeLessThanOrEqual(6)
  })

  /*
   * Seit die Bahn je Universum schneidet, rechnen ALLE gegen denselben Nenner —
   * geteilt wird der Zaehler, nicht die Spirale. Die Wand oben gilt damit
   * unveraendert weiter: eine Teilbahn hat hoechstens so viele Knoten wie der
   * Nenner, also nie einen engeren Abstand.
   */
  /*
   * Der Winkelschritt ist die FESTE Groesse, nicht die Windungszahl. Fest
   * gesetzt waren zwei Windungen auf fuenf Knoten 180 Grad je Schritt: die Bahn
   * sprang quer ueber die Scheibe und las sich als Zickzack. Gedeckelt bleibt
   * sie trotzdem — jenseits davon ruecken die Knoten wieder zusammen, und die
   * Wand oben gilt.
   */
  it('haelt den Winkelschritt konstant, bis der Deckel greift', () => {
    const stepDeg = (span: number) => {
      const turns = firmamentSpiralTurns(span)
      return ((turns * 360) / (span - 1)) | 0
    }
    expect(stepDeg(6)).toBe(FIRMAMENT_SPIRAL_STEP_TURNS * 360)
    expect(stepDeg(20)).toBe(FIRMAMENT_SPIRAL_STEP_TURNS * 360)
    // Ab dem Deckel wird er kleiner, nie groesser.
    expect(stepDeg(80)).toBeLessThan(FIRMAMENT_SPIRAL_STEP_TURNS * 360)
    expect(firmamentSpiralTurns(200)).toBe(FIRMAMENT_SPIRAL_TURNS)
  })

  it('haelt die Trefferflaeche auf jeder Bahnlaenge', () => {
    const r = fullHd().r
    // Der Abstand haengt am NENNER, nicht an der Zahl der gezeigten Knoten —
    // eine kurze Bahn nimmt nur die inneren Plaetze desselben Rasters.
    for (const span of [FIRMAMENT_PATH_MIN_SPAN, 20, 40]) {
      expect(minSeparation(span, r), `${span} Plaetze`).toBeGreaterThanOrEqual(
        FIRMAMENT_NODE_HIT_MIN,
      )
    }
  })

  it('setzt den Bahnboden zwischen eine Marke und die Wand', () => {
    // Darunter saesse eine Zwei-Galaxien-Bahn am Wall, darueber verschenkte die
    // laengste Bahn ihre Reichweite.
    expect(FIRMAMENT_PATH_MIN_SPAN).toBeGreaterThan(1)
    expect(minSeparation(FIRMAMENT_PATH_MIN_SPAN, fullHd().r)).toBeGreaterThanOrEqual(
      FIRMAMENT_NODE_HIT_MIN,
    )
  })
})

/**
 * Die Bahn liegt IN der Galaxienwolke, nicht darauf.
 *
 * Stillstehende Knoten auf einem drehenden Feld lasen sich als Aufkleber. Die
 * Karte dreht deshalb im GLEICHTAKT mit der nahen Ebene der Wolke — und beide
 * Zahlen kommen aus derselben Funktion mit demselben Argument. Wer der Karte
 * eine eigene Dauer gibt, laesst die Bahn aus dem Universum wandern, in dem sie
 * liegt, und niemand sieht es sofort.
 */
describe('Firmament — die Bahn dreht mit der Wolke', () => {
  const SCREENS: [number, number][] = [
    [1920, 1080],
    [1920, 1200],
    [2560, 1440],
    [3840, 2160],
  ]

  it('bleibt in der Dauer der NAHEN Wolkenebene sichtbar, ohne zu kreiseln', () => {
    // `FirmamentChart` reicht `universeDiscSpinSec(heroPx)` an beide weiter —
    // an die drehende Gruppe und an `UniverseDisc`, das intern dasselbe
    // rechnet. Gebunden wird hier, dass diese EINE Dauer auf jeder
    // Zielaufloesung im sichtbaren Band liegt: dieselbe Ablesung wie beim Wall,
    // Grad in drei Sekunden Hinsehen.
    for (const [vw, vh] of SCREENS) {
      const deg3 = (3 / universeDiscSpinSec(heroPx(radiusAt(vw, vh)))) * 360
      expect(deg3, `${vw}x${vh}`).toBeGreaterThan(2.4)
      expect(deg3, `${vw}x${vh}`).toBeLessThan(18)
    }
  })

  it('laeuft nicht im Gleichschritt mit dem Wall', () => {
    // Der Wall dreht gegen die Karte UND langsamer. Gleich schnell verschmoelzen
    // beide optisch zu einem Rad, und die Tiefe des Reiters waere weg.
    for (const [vw, vh] of SCREENS) {
      const r = radiusAt(vw, vh)
      expect(universeDiscSpinSec(rimPx(r)), `${vw}x${vh}`).toBeGreaterThan(
        universeDiscSpinSec(heroPx(r)),
      )
    }
  })

  it('nennt die Wand, wegen der beim Ueberfahren alles anhaelt', () => {
    // Der aeusserste Knoten sitzt auf `FIRMAMENT_SPIRAL_R1`. Verlaesst er seine
    // halbe Trefferflaeche in wenigen Sekunden, reisst die Hover-Karte mitten
    // im Lesen ab — deshalb pausiert `:has(.fm-node:hover)` Bahn, Wolke und
    // Wall gemeinsam. Wer die Pause herausnimmt, bricht das hier.
    for (const [vw, vh] of SCREENS) {
      const r = radiusAt(vw, vh)
      const omega = (Math.PI * 2) / universeDiscSpinSec(heroPx(r))
      const edgePxPerSec = omega * r * FIRMAMENT_SPIRAL_R1
      const secondsToLeave = FIRMAMENT_NODE_HIT_MIN / 2 / edgePxPerSec
      expect(secondsToLeave, `${vw}x${vh}`).toBeLessThan(4)
      // Und sie kriecht auch nicht: unter 0,5 px/s saehe niemand die Drehung.
      expect(edgePxPerSec, `${vw}x${vh}`).toBeGreaterThan(0.5)
    }
  })
})

/**
 * Das Abflugportal steht im schwarzen Raum ausserhalb der Scheibe. Zwei Dinge
 * daran gehoeren gebunden, weil man beide im Code nicht sieht: dass es auf jeder
 * Zielaufloesung eine brauchbare Groesse bekommt, und dass es keine
 * Frame-Schleife mitbringt.
 */
describe('Firmament — das Abflugportal', () => {
  /* Gemessen wie `CONTENT_HEIGHT`: wer `_RING_H_RATIO` anfasst, sieht hier
     sofort, was er allen vier Aufloesungen antut — und wer das KOPFBAND hoeher
     macht ebenso, denn der Ring haengt an der Buehnenhoehe. Die Tabelle stand
     einmal auf 131/150/184/260; die 20 px, die das Band von 92 auf 112 gewachsen
     ist, kosten sie diese vier. Auf 4K greift ohnehin der Deckel. */
  it('haelt die Ringgroesse je Zielaufloesung', () => {
    const table: Array<[string, number, number]> = [
      ['Full HD', 1080, 127],
      ['WUXGA', 1200, 147],
      ['2K', 1440, 180],
      ['4K', 2160, 260],
    ]
    for (const [name, vh, want] of table) {
      const r = firmamentPortalRingR(
        zones(vh === 2160 ? 3840 : vh === 1440 ? 2560 : 1920, vh).stageH,
      )
      expect(Math.round(r), name).toBe(want)
    }
  })

  /* WUXGA ist der ENGE Fall, nicht Full HD: gleiche Breite, 100 px mehr Hoehe —
     die Bahn waechst mit der Hoehe, und das schwarze Seitenband schrumpft von
     186 auf 135 px. Wer das naechste Mal gegen Full HD rechnet, sieht es hier. */
  it('nennt WUXGA als den engen Fall', () => {
    const band = (vw: number, vh: number) => {
      const z = zones(vw, vh)
      return (z.stageW - firmamentFitBox(z.stageW, z.stageH, FIRMAMENT_MAP_INSET_PX).r * 2) / 2
    }
    expect(band(1920, 1200)).toBeLessThan(band(1920, 1080))
    expect(band(1920, 1200)).toBeGreaterThan(FIRMAMENT_PORTAL_RING_MIN_PX / 2)
  })

  /* Die Leiter greift, wenn die volle Groesse nirgends jenseits der Kartenkante
     passt. Sie muss bei der vollen Groesse beginnen und fallen — eine Stufe
     ueber 1 vergroesserte das Portal heimlich, eine steigende Folge liesse die
     Suche die kleinste zuerst nehmen. */
  it('faengt die Schrumpfleiter bei voller Groesse an und laesst sie fallen', () => {
    expect(FIRMAMENT_PORTAL_SHRINK_STEPS[0]).toBe(1)
    for (let i = 1; i < FIRMAMENT_PORTAL_SHRINK_STEPS.length; i++) {
      expect(FIRMAMENT_PORTAL_SHRINK_STEPS[i]).toBeLessThan(FIRMAMENT_PORTAL_SHRINK_STEPS[i - 1])
    }
    // Auch die kleinste Stufe bleibt ein Portal und wird keine Marke.
    const smallest = FIRMAMENT_PORTAL_RING_MIN_PX * FIRMAMENT_PORTAL_SHRINK_STEPS.at(-1)!
    expect(smallest).toBeGreaterThan(FIRMAMENT_NODE_HIT_MIN)
  })

  /* Der Reiter steht auf Grundlast: bewegt wird per CSS an fertigen Sprites,
     nie in einer Schleife. Das faengt genau den Rueckfall, der hier naheliegt —
     ein „nur ganz kurz" pulsendes `box-shadow` oder ein rAF fuer den Wirbel. */
  it('bringt keine Frame-Schleife und keine verbotene Animation mit', () => {
    const src = readFileSync(
      resolve(__dirname, '../../components/bardProfil/firmament/FirmamentPortal.vue'),
      'utf8',
    )
    for (const forbidden of ['requestAnimationFrame', 'setInterval', 'setTimeout', 'Date.now']) {
      expect(src.includes(forbidden), forbidden).toBe(false)
    }
    // Jeder Keyframe bewegt ausschliesslich `transform` oder `opacity`.
    for (const body of src.matchAll(/@keyframes[^{]+\{([\s\S]*?)\n\}/g)) {
      const props = [...body[1].matchAll(/^\s{4}([a-z-]+):/gm)].map((m) => m[1])
      expect(props.length).toBeGreaterThan(0)
      for (const p of props) expect(['transform', 'opacity'], `${p} im Keyframe`).toContain(p)
    }
  })

  /* Die Tiefenstaffelung des Hovers. Gebunden ist die ORDNUNG, nicht der
     Betrag: Fassung vor, Schlund zurueck, Wirbel hinein — daraus entsteht der
     Blick IN den Durchgang. Zieht jemand den Schlund nach vorn oder den Wirbel
     hinaus, wird das Portal beim Ueberfahren nur groesser. */
  it('staffelt die Hover-Ebenen in die Tiefe', () => {
    expect(FIRMAMENT_PORTAL_HOVER_SWIRL_K).toBeLessThan(FIRMAMENT_PORTAL_HOVER_MAW_K)
    expect(FIRMAMENT_PORTAL_HOVER_MAW_K).toBeLessThan(1)
    expect(FIRMAMENT_PORTAL_HOVER_RIM_K).toBeGreaterThan(1)
    expect(FIRMAMENT_PORTAL_HOVER_HALO_K).toBeGreaterThan(FIRMAMENT_PORTAL_HOVER_RIM_K)
  })

  /* Die Zusatzdrehung ADDIERT sich, also zieht jeder positive Teiler an. Sie
     darf den Wirbel aber nicht zum Kreisel machen — bei doppelter Grundrate
     waere die Anzeige eine Maschine im Leerlauf, kein Sog. */
  it('laesst den Wirbel anziehen, ohne ihn zum Kreisel zu machen', () => {
    expect(FIRMAMENT_PORTAL_HOVER_BOOST_RATIO).toBeGreaterThan(0)
    expect(FIRMAMENT_PORTAL_HOVER_BOOST_RATIO).toBeLessThanOrEqual(2)
  })

  /* Die Welle beginnt INNEN am Ring und stirbt innerhalb des Halos. Ein Start
     ausserhalb machte sie zum zweiten Ring, ein Ende jenseits der Aura zu einem
     Reif, der ueber die Karte laeuft. Spannen sind zugleich die Reichweite in
     Ringradien, deshalb ist der Vergleich mit `_AURA_SPAN` einer. */
  it('laesst die Ringwelle innen beginnen und im Halo sterben', () => {
    expect(FIRMAMENT_PORTAL_RIPPLE_FROM).toBeLessThan(1)
    expect(FIRMAMENT_PORTAL_RIPPLE_TO).toBeGreaterThan(1)
    expect(FIRMAMENT_PORTAL_RIPPLE_TO).toBeLessThan(FIRMAMENT_PORTAL_AURA_SPAN)
  })

  /* `will-change` legt die Ebene schon beim Mount an — im teuersten Frame des
     Reiters — und Chrome promotet eine laufende Animation ohnehin. Dieselbe
     Begruendung wie am Wall und an der Universumsscheibe. */
  it('promotet keine Portal-Ebene von Hand', () => {
    const src = readFileSync(
      resolve(__dirname, '../../components/bardProfil/firmament/FirmamentPortal.vue'),
      'utf8',
    )
    expect(src.includes('will-change')).toBe(false)
    // Der Hover LEBT: der Zusatzdrehrahmen laeuft an, statt zu pausieren.
    expect(src.includes('animation-play-state: running')).toBe(true)
  })

  /* Ueber dem PORTAL haelt es selbst NICHT an — es steht fest, dem Zeiger kann
     es nicht aus der Trefferflaeche laufen, und ein Durchgang, der auf den Blick
     hin anzieht, ist die Auskunft. Genau diese Entscheidung wird beim naechsten
     Anfassen still zurueckgedreht, indem jemand den Ausloeser wieder in die eine
     grosse Pause-Regel schreibt. */
  it('nimmt das Portal von seiner eigenen Hover-Pause aus', () => {
    const src = readFileSync(
      resolve(__dirname, '../../components/bardProfil/firmament/FirmamentChart.vue'),
      'utf8',
    )
    const rules = [...src.matchAll(/([^{}]*)\{\s*animation-play-state:\s*paused;\s*\}/g)].map(
      (m) => m[1],
    )
    expect(rules.length).toBeGreaterThan(0)
    for (const sel of rules) {
      if (sel.includes('.fm-portal-l')) expect(sel.includes('.fm-portal-hit')).toBe(false)
    }
    // Die Wolke haelt weiterhin an — der Ausloeser ist also nicht bloss entfallen.
    expect(rules.some((sel) => sel.includes('.fm-portal-hit'))).toBe(true)
  })
})
