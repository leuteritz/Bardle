import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  BOTTOM_BAR_SIDE_W,
  CHAMPION_ART_MD_MAX_EDGE,
  CHAMPION_ART_SM_MAX_EDGE,
  UNIVERSE_MAP_CREST_BAND_H,
  UNIVERSE_MAP_INSET_PX,
  UNIVERSE_MAP_NODE_HIT_MIN,
  UNIVERSE_MAP_PATH_MIN_SPAN,
  UNIVERSE_MAP_PLATE_REF_R,
  UNIVERSE_MAP_PORTAL_AURA_SPAN,
  UNIVERSE_MAP_PORTAL_HOVER_BOOST_RATIO,
  UNIVERSE_MAP_PORTAL_HOVER_HALO_K,
  UNIVERSE_MAP_PORTAL_HOVER_MAW_K,
  UNIVERSE_MAP_PORTAL_HOVER_RIM_K,
  UNIVERSE_MAP_PORTAL_HOVER_SWIRL_K,
  UNIVERSE_MAP_PORTAL_RING_MIN_PX,
  UNIVERSE_MAP_PORTAL_RIPPLE_FROM,
  UNIVERSE_MAP_PORTAL_RIPPLE_TO,
  UNIVERSE_MAP_PORTAL_SHRINK_STEPS,
  UNIVERSE_MAP_RAIL_AUTOFOLD_W,
  UNIVERSE_MAP_RAIL_HANDLE_PX,
  UNIVERSE_MAP_RAIL_PANEL_W,
  UNIVERSE_MAP_RAIL_ZONE_W,
  UNIVERSE_MAP_STAGE_MIN_H,
  UNIVERSE_MAP_STAGE_MIN_W,
  UNIVERSE_MAP_TIP_SEAT_COLS,
  UNIVERSE_MAP_TIP_SEAT_EM,
  UNIVERSE_MAP_TIP_SEAT_GAP_EM,
  UNIVERSE_MAP_TIP_SEAT_MAX,
  UNIVERSE_MAP_UNLIT_AHEAD,
  UNIVERSE_MAP_ZOOM_STEPS,
  STAR_MANIFEST_ART_SIZE,
  UNIVERSE_RAIL_CARD_MAX_H,
  UNIVERSE_RAIL_COMPACT_MAX_VH,
  UNIVERSE_RAIL_COMPACT_STAGE_H,
  UNIVERSE_RAIL_MIN_VISIBLE,
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
  UNIVERSE_MAP_RIM_SPRITE_MARGIN,
  UNIVERSE_MAP_MAX_DPR,
  GALAXY_STARS_MAX,
  UNIVERSE_MAP_NODE_HIT_BODY_K,
  UNIVERSE_MAP_NODE_R_BASE,
  UNIVERSE_MAP_NODE_R_PER_STAR,
  UNIVERSE_MAP_PATH_R1,
  UNIVERSE_MAP_SCATTER_STEP_MAX,
  UNIVERSE_MAP_SCATTER_STEP_MIN,
  UNIVERSE_MAP_START_CLEAR_X,
  UNIVERSE_MAP_START_CLEAR_Y0,
  UNIVERSE_MAP_START_CLEAR_Y1,
  UNIVERSE_MAP_START_LABEL_OFFSET,
  UNIVERSE_MAP_WALL_MAX_BACKING_PX,
} from '@/config/constants'
import { championArtSizeFor } from '@/utils/game/champions'
import { universes } from '@/config/progression/universes'
import { universeFitBox, universeSpots } from '@/utils/ui/universeLayout'
import { universePortalRingR } from '@/utils/ui/universePortalSpot'
import { universeDiscSpinSec } from '@/utils/fx/universeDisc'

/**
 * Der Universe-Reiter teilt ZWEI Zonen ein Budget: Leiste + Buehne sind der
 * ganze Reiter unter dem Kopfband. Nichts im CSS sagt, wie viel der Karte davon
 * bleibt — wer die Leiste verbreitert oder das Band hoeher macht, nimmt es ihr
 * still weg.
 *
 * Und der Boden ist hier keine Geschmacksfrage: die Knoten liegen GESTREUT,
 * ihr Mindestabstand ist erzwungen. Faellt er unter `UNIVERSE_MAP_NODE_HIT_MIN`,
 * decken sich die Klickflaechen und die Karte hoert auf zu funktionieren.
 * Diese Spec bindet den Boden an den Bahnradius jeder Zielaufloesung.
 */

/** `--bp-gap` von `.rp-wrapper`, beide Seiten. */
const MODAL_GAP = 10

const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** `--hud-scale` aus `App.vue`. */
const hudScale = (w: number, h: number) => clamp(0.52, Math.min(w / 2560, h / 1440), 1)

/** Breite des Reiters: das Profilmodal ist beidseitig um `--hud-panel-size`
 *  eingerueckt. Der Universe-Reiter traegt — anders als Team und Voyages —
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
  const rail = folded ? UNIVERSE_MAP_RAIL_HANDLE_PX : UNIVERSE_MAP_RAIL_ZONE_W
  return {
    tab,
    rail,
    stageW: tab - rail,
    stageH: CONTENT_HEIGHT[vh] - UNIVERSE_MAP_CREST_BAND_H,
  }
}

/** Wie viele Karten in eine Leiste dieser Hoehe passen, ohne zu rollen. */
function fits(h: number, rowH: number, gap: number, pad: number): number {
  return Math.floor((h - pad + gap) / (rowH + gap))
}

/** Kantenlaenge der Wolke — dieselbe Rechnung wie `UniverseChart`. */
function heroPx(r: number): number {
  const stepped =
    Math.round((2 * r * UNIVERSE_DISC_HERO_R_RATIO) / UNIVERSE_DISC_HERO_QUANT_PX) *
    UNIVERSE_DISC_HERO_QUANT_PX
  return Math.max(UNIVERSE_DISC_HERO_MIN_PX, stepped)
}

/** Kantenlaenge des Wall-Sprites. */
function rimPx(r: number): number {
  return Math.max(1, Math.round(r * 2 * UNIVERSE_MAP_RIM_SPRITE_MARGIN))
}

/** Der Bahnradius je Zielaufloesung. */
function radiusAt(vw: number, vh: number): number {
  const z = zones(vw, vh)
  return universeFitBox(z.stageW, z.stageH, UNIVERSE_MAP_INSET_PX).r
}

/** Der engste Abstand zweier Knoten auf der Bahn, in Pixeln — genommen ueber
 *  ALLE Universen, denn seit die Streuung je Bahn wuerfelt, gibt es zehn davon
 *  und der Spieler sieht die unguenstigste. */
function minSeparation(count: number, radius: number): number {
  let min = Infinity
  for (const u of universes) {
    const pts = universeSpots(count, u.id)
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        min = Math.min(min, Math.hypot(pts[i].nx - pts[j].nx, pts[i].ny - pts[j].ny) * radius)
      }
    }
  }
  return min
}

describe('Universe — das Zonenbudget', () => {
  it('laesst der Buehne auf jeder Zielaufloesung ihren Boden', () => {
    for (const [vw, vh] of [
      [1920, 1080],
      [1920, 1200],
      [2560, 1440],
      [3840, 2160],
    ]) {
      const z = zones(vw, vh)
      expect(z.stageW, `${vw}x${vh} Breite`).toBeGreaterThanOrEqual(UNIVERSE_MAP_STAGE_MIN_W)
      expect(z.stageH, `${vw}x${vh} Hoehe`).toBeGreaterThanOrEqual(UNIVERSE_MAP_STAGE_MIN_H)
    }
  })

  it('klappt die Leiste ein, bevor die Buehne unter ihren Boden faellt', () => {
    // Unterhalb der Klappschwelle darf die eingeklappte Leiste den Boden noch
    // halten — genau dafuer ist sie da.
    const stageW = UNIVERSE_MAP_RAIL_AUTOFOLD_W - UNIVERSE_MAP_RAIL_HANDLE_PX
    expect(stageW).toBeGreaterThanOrEqual(UNIVERSE_MAP_STAGE_MIN_W)
  })

  it('spart mit dem Einklappen mehr als die Haelfte der Leiste', () => {
    expect(UNIVERSE_MAP_RAIL_HANDLE_PX).toBeLessThan(UNIVERSE_MAP_RAIL_ZONE_W / 2)
  })

  it('ist die Zone der Leiste Liste PLUS Griff', () => {
    // Die Griffleiste bleibt stehen, wenn die Liste weggefahren ist — sie gehoert
    // deshalb in dieselbe Spalte. Wer nur die Liste in die Spaltenbreite
    // schriebe, saehe den Griff ueber der Karte liegen.
    expect(UNIVERSE_MAP_RAIL_ZONE_W).toBe(UNIVERSE_MAP_RAIL_PANEL_W + UNIVERSE_MAP_RAIL_HANDLE_PX)
  })

  it('traegt auf jeder Zielaufloesung ihren Boden an Karten, ohne zu rollen', () => {
    // Hier stand „alle zehn ohne zu rollen". Das ist ABSICHTLICH gefallen: die
    // Zeile ist eine Karte geworden — Scheibe, Zustand, Ablesungen und
    // Fortschrittsbalken — und zehn davon passen unter 4K nirgends mehr.
    // Gebunden ist deshalb der BODEN. Faellt er, sieht der Spieler nicht mehr,
    // wie viele Bahnen es ueberhaupt gibt, ohne zu rollen.
    const table: Array<[string, number, number, number]> = [
      ['Full HD', 1920, 1080, UNIVERSE_RAIL_MIN_VISIBLE],
      ['WUXGA', 1920, 1200, 7],
      ['2K', 2560, 1440, 9],
      ['4K', 3840, 2160, universes.length],
    ]
    for (const [name, vw, vh, want] of table) {
      const n = fits(
        zones(vw, vh).stageH,
        UNIVERSE_RAIL_ROW_H,
        UNIVERSE_RAIL_ROW_GAP,
        UNIVERSE_RAIL_LIST_PAD,
      )
      expect(n, name).toBeGreaterThanOrEqual(want)
    }
  })

  it('haelt den Boden zwischen einer Handvoll und der Vollzahl', () => {
    // Unter fuenf ist die Leiste ein Guckloch; bei zehn waere sie wieder die
    // alte Liste, und die Karte haette keinen Platz.
    expect(UNIVERSE_RAIL_MIN_VISIBLE).toBeGreaterThanOrEqual(5)
    expect(UNIVERSE_RAIL_MIN_VISIBLE).toBeLessThan(universes.length)
  })

  it('laesst die Karte auf hohen Schirmen wachsen, aber nicht ins Leere', () => {
    // Sie waechst per `flex-grow` in den freien Rest — auf 4K sonst 160 px, von
    // denen 68 Luft waeren. Die SCHEIBE waechst nicht mit.
    expect(UNIVERSE_RAIL_CARD_MAX_H).toBeGreaterThan(UNIVERSE_RAIL_ROW_H)
    expect(UNIVERSE_RAIL_CARD_MAX_H).toBeLessThanOrEqual(UNIVERSE_RAIL_ROW_H * 1.5)
    // Und in voller Groesse rollt sie auf 4K immer noch nicht.
    const rows = universes.length
    const full =
      rows * UNIVERSE_RAIL_CARD_MAX_H + (rows - 1) * UNIVERSE_RAIL_ROW_GAP + UNIVERSE_RAIL_LIST_PAD
    expect(full).toBeLessThanOrEqual(zones(3840, 2160).stageH)
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
  it('kauft die kompakte Stufe im flachsten Fenster WIRKLICH Karten zurueck', () => {
    // Hier stand „zehn Zeilen passen, die grosse Stufe nicht". Beide Haelften
    // sind hinfaellig, weil zehn Karten nirgends passen. Was bleibt, ist der
    // GRUND der Stufe: sie muss mehr Karten zeigen als die grosse, sonst ist sie
    // eine zweite Schriftgroesse fuer nichts.
    const big = fits(
      UNIVERSE_RAIL_COMPACT_STAGE_H,
      UNIVERSE_RAIL_ROW_H,
      UNIVERSE_RAIL_ROW_GAP,
      UNIVERSE_RAIL_LIST_PAD,
    )
    const small = fits(
      UNIVERSE_RAIL_COMPACT_STAGE_H,
      UNIVERSE_RAIL_ROW_H_COMPACT,
      UNIVERSE_RAIL_ROW_GAP_COMPACT,
      UNIVERSE_RAIL_LIST_PAD_COMPACT,
    )
    expect(UNIVERSE_RAIL_ROW_H_COMPACT).toBeLessThan(UNIVERSE_RAIL_ROW_H)
    expect(small).toBeGreaterThan(big)
    // Und sie haelt dort den Boden, den die grosse Stufe verliert.
    expect(small).toBeGreaterThanOrEqual(UNIVERSE_RAIL_MIN_VISIBLE)
  })

  it('schaltet die kompakte Stufe, BEVOR der Boden faellt', () => {
    // Hier stand einmal `Viewport − 388`. Der Abstand ist keine Konstante: der
    // App-Header haengt an `--hud-scale`, und die skaliert mit der HOEHE — von
    // 950 auf 1080 waechst die Buehne nur um 0,93 px je Viewport-Pixel. Und die
    // 388 waren an das 92-px-Kopfband gebunden, also still falsch, sobald es
    // wuchs. Interpoliert wird zwischen den ZWEI gemessenen Staenden.
    //
    // Die Wand ist eine andere geworden: nicht mehr die Hoehe, ab der zehn
    // Zeilen nicht mehr passen, sondern die, ab der der BODEN nicht mehr steht.
    const big =
      UNIVERSE_RAIL_MIN_VISIBLE * UNIVERSE_RAIL_ROW_H +
      (UNIVERSE_RAIL_MIN_VISIBLE - 1) * UNIVERSE_RAIL_ROW_GAP +
      UNIVERSE_RAIL_LIST_PAD
    const loVh = 950
    const hiVh = 1080
    const loH = UNIVERSE_RAIL_COMPACT_STAGE_H
    const hiH = CONTENT_HEIGHT[1080] - UNIVERSE_MAP_CREST_BAND_H
    const kippt = loVh + ((big - loH) * (hiVh - loVh)) / (hiH - loH)
    // Die Schwelle muss ueber der Viewport-Hoehe liegen, bei der die grosse
    // Stufe kippt — sonst gibt es ein Fenster dazwischen, in dem gerollt wird
    // und die Media Query noch nicht greift.
    expect(UNIVERSE_RAIL_COMPACT_MAX_VH).toBeGreaterThanOrEqual(Math.ceil(kippt))
    // Aber nicht so hoch, dass sie im Vollbild-Referenzfall schon greift.
    expect(UNIVERSE_RAIL_COMPACT_MAX_VH).toBeLessThan(1080)
  })

  /* Zehn Karten, die je Einkommens-Tick neu rechnen, sind etwas anderes als ein
     Kopfband. Die laufende Uhr gehoert dorthin, nicht hierher. */
  it('haelt die Zeilenrechnung der Leiste zeitfrei', () => {
    const src = readFileSync(resolve(__dirname, '../../utils/ui/universeRail.ts'), 'utf8')
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const forbidden of ['Date.now', 'gameNow', 'performance.now']) {
      expect(code.includes(forbidden), forbidden).toBe(false)
    }
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
    expect(UNIVERSE_MAP_WALL_MAX_BACKING_PX ** 2 * 4).toBeLessThan(20 * 1024 * 1024)
    for (const [vw, vh] of [
      [1920, 1080],
      [2560, 1440],
    ]) {
      const side = rimPx(radiusAt(vw, vh))
      expect(UNIVERSE_MAP_WALL_MAX_BACKING_PX / side, `${vw}x${vh}`).toBeGreaterThanOrEqual(
        UNIVERSE_MAP_MAX_DPR,
      )
    }
  })

  it('deckt das Wall-Sprite seine ganze Tinte ab', () => {
    // Weiteste Tinte: der Ring bei 1,02 r plus die halbe 8k-Strichstaerke.
    const widest = 1.02 + 4 / UNIVERSE_MAP_PLATE_REF_R
    expect(UNIVERSE_MAP_RIM_SPRITE_MARGIN).toBeGreaterThan(widest)
    // Aber nicht mehr: jeder Prozent darueber ist Textur fuer nichts.
    expect(UNIVERSE_MAP_RIM_SPRITE_MARGIN).toBeLessThan(1.15)
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

describe('Universe — die Bahn bleibt bedienbar', () => {
  /** Die Fit-Box, in die die Bahn auf Full HD faellt. */
  const fullHd = () => {
    const z = zones(1920, 1080)
    return universeFitBox(z.stageW, z.stageH, UNIVERSE_MAP_INSET_PX)
  }

  it('traegt auf Full HD mindestens vierzig Knoten ohne Zoom', () => {
    // Vierzig Knoten sind 35 befreite Galaxien plus die laufende plus die vier
    // unbeleuchteten davor — deutlich mehr, als ein Lauf je erreicht.
    const sep = minSeparation(40, fullHd().r)
    expect(sep).toBeGreaterThanOrEqual(UNIVERSE_MAP_NODE_HIT_MIN)
  })

  /* Die 26 sind nur der BODEN der Trefferflaeche. Ein Sieben-Sterne-Knoten
     traegt 32,4 px, und zwei davon nebeneinander sind der Fall, den der Spieler
     sieht — gemessen im Browser, als der Abstand bei 29 px lag. Gebunden wird
     die Spanne, die ein Lauf wirklich erreicht. */
  it('haelt den Abstand ueber der ECHTEN Trefferflaeche einer vollen Galaxie', () => {
    const r = fullHd().r
    const hit = Math.max(
      UNIVERSE_MAP_NODE_HIT_MIN,
      (UNIVERSE_MAP_NODE_R_BASE + GALAXY_STARS_MAX * UNIVERSE_MAP_NODE_R_PER_STAR) *
        (r / UNIVERSE_MAP_PLATE_REF_R) *
        UNIVERSE_MAP_NODE_HIT_BODY_K,
    )
    for (let n = UNIVERSE_MAP_PATH_MIN_SPAN; n <= 44; n++) {
      expect(minSeparation(n, r), `${n} Plaetze`).toBeGreaterThanOrEqual(hit)
    }
  })

  it('haelt den Boden ohne Wand — auch bei 120 Knoten', () => {
    // Die Spirale hatte eine Wand: ab 44 Knoten deckten sich die Klickflaechen.
    // Bei der Streuung ist der Abstand ERZWUNGEN, nicht mehr eine Folge der
    // Regelmaessigkeit. Wer den Ablehnungspass ausbaut, sieht es hier.
    const r = fullHd().r
    let worst = Infinity
    let worstAt = 0
    for (let n = 8; n <= 120; n++) {
      const sep = minSeparation(n, r)
      if (sep < worst) {
        worst = sep
        worstAt = n
      }
    }
    expect(worst, `engster Fall bei ${worstAt} Knoten`).toBeGreaterThanOrEqual(
      UNIVERSE_MAP_NODE_HIT_MIN,
    )
    // Und der Zoom haelt ihn erst recht.
    expect(
      minSeparation(worstAt, r * UNIVERSE_MAP_ZOOM_STEPS[UNIVERSE_MAP_ZOOM_STEPS.length - 1]),
    ).toBeGreaterThan(UNIVERSE_MAP_NODE_HIT_MIN)
  })

  it('haelt den innersten Knoten von der Mitte frei', () => {
    // Frueher stand hier der gemalte Ursprung. Den gibt es nicht mehr — an
    // seiner Stelle steht der Kern der Heldenscheibe, und der ist dieselbe
    // Marke: ein Knoten darauf waere nicht mehr von ihm zu trennen.
    const r = fullHd().r
    for (const u of universes) {
      expect(
        universeSpots(UNIVERSE_MAP_PATH_MIN_SPAN, u.id)[0].radius * r,
        `Universum ${u.id}`,
      ).toBeGreaterThan(UNIVERSE_MAP_NODE_HIT_MIN)
    }
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
      const outer = Math.max(
        ...universes.flatMap((u) => universeSpots(40, u.id).map((p) => p.radius)),
      )
      expect(outer * r, `${vw}x${vh} aeusserster Knoten`).toBeLessThan((heroPx(r) / 2) * 1.02)
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
    expect(UNIVERSE_MAP_UNLIT_AHEAD).toBeGreaterThan(0)
    expect(UNIVERSE_MAP_UNLIT_AHEAD).toBeLessThanOrEqual(6)
  })

  /*
   * Seit die Bahn je Universum schneidet, rechnen ALLE gegen denselben Nenner —
   * geteilt wird der Zaehler, nicht die Spirale. Die Wand oben gilt damit
   * unveraendert weiter: eine Teilbahn hat hoechstens so viele Knoten wie der
   * Nenner, also nie einen engeren Abstand.
   */
  /*
   * Der Winkelschritt ist gewuerfelt, aber nicht frei: der Boden haelt den Weg
   * davor, auf der Stelle zu treten, der Deckel davor, quer ueber die Scheibe
   * zu springen — das war die verworfene Zickzack-Fassung.
   */
  it('haelt den Winkelschritt zwischen Boden und Deckel', () => {
    expect(UNIVERSE_MAP_SCATTER_STEP_MIN).toBeGreaterThan(0)
    expect(UNIVERSE_MAP_SCATTER_STEP_MIN).toBeLessThan(UNIVERSE_MAP_SCATTER_STEP_MAX)
    // Kein voller Umlauf in einem Schritt, und keine halbe Kehrtwende.
    expect(UNIVERSE_MAP_SCATTER_STEP_MAX).toBeLessThan(Math.PI * 2)
    expect(UNIVERSE_MAP_SCATTER_STEP_MAX).toBeGreaterThan(Math.PI / 2)
  })

  /* Das Feld, das dem START-Label gehoert, muss das Label auch WIRKLICH
     enthalten — sonst haelt der Ablehnungspass etwas frei, wo nichts steht. */
  it('legt das freie Feld um das START-Label', () => {
    expect(UNIVERSE_MAP_START_CLEAR_Y0).toBeLessThan(UNIVERSE_MAP_START_LABEL_OFFSET)
    expect(UNIVERSE_MAP_START_CLEAR_Y1).toBeGreaterThan(UNIVERSE_MAP_START_LABEL_OFFSET)
    // Breit genug fuer das Wort samt halber Trefferflaeche.
    expect(UNIVERSE_MAP_START_CLEAR_X * fullHd().r).toBeGreaterThan(UNIVERSE_MAP_NODE_HIT_MIN)
  })

  it('haelt die Trefferflaeche auf jeder Bahnlaenge', () => {
    const r = fullHd().r
    // Der Abstand haengt am NENNER, nicht an der Zahl der gezeigten Knoten —
    // eine kurze Bahn nimmt nur die inneren Plaetze desselben Rasters.
    for (const span of [UNIVERSE_MAP_PATH_MIN_SPAN, 20, 40]) {
      expect(minSeparation(span, r), `${span} Plaetze`).toBeGreaterThanOrEqual(
        UNIVERSE_MAP_NODE_HIT_MIN,
      )
    }
  })

  it('setzt den Bahnboden zwischen eine Marke und die Wand', () => {
    // Darunter saesse eine Zwei-Galaxien-Bahn am Wall, darueber verschenkte die
    // laengste Bahn ihre Reichweite.
    expect(UNIVERSE_MAP_PATH_MIN_SPAN).toBeGreaterThan(1)
    expect(minSeparation(UNIVERSE_MAP_PATH_MIN_SPAN, fullHd().r)).toBeGreaterThanOrEqual(
      UNIVERSE_MAP_NODE_HIT_MIN,
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
describe('Universe — die Bahn dreht mit der Wolke', () => {
  const SCREENS: [number, number][] = [
    [1920, 1080],
    [1920, 1200],
    [2560, 1440],
    [3840, 2160],
  ]

  it('bleibt in der Dauer der NAHEN Wolkenebene sichtbar, ohne zu kreiseln', () => {
    // `UniverseChart` reicht `universeDiscSpinSec(heroPx)` an beide weiter —
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
    // Der aeusserste Knoten sitzt auf `UNIVERSE_MAP_PATH_R1`. Verlaesst er seine
    // halbe Trefferflaeche in wenigen Sekunden, reisst die Hover-Karte mitten
    // im Lesen ab — deshalb pausiert `:has(.un-node:hover)` Bahn, Wolke und
    // Wall gemeinsam. Wer die Pause herausnimmt, bricht das hier.
    for (const [vw, vh] of SCREENS) {
      const r = radiusAt(vw, vh)
      const omega = (Math.PI * 2) / universeDiscSpinSec(heroPx(r))
      const edgePxPerSec = omega * r * UNIVERSE_MAP_PATH_R1
      const secondsToLeave = UNIVERSE_MAP_NODE_HIT_MIN / 2 / edgePxPerSec
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
describe('Universe — das Abflugportal', () => {
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
      const r = universePortalRingR(
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
      return (z.stageW - universeFitBox(z.stageW, z.stageH, UNIVERSE_MAP_INSET_PX).r * 2) / 2
    }
    expect(band(1920, 1200)).toBeLessThan(band(1920, 1080))
    expect(band(1920, 1200)).toBeGreaterThan(UNIVERSE_MAP_PORTAL_RING_MIN_PX / 2)
  })

  /* Die Leiter greift, wenn die volle Groesse nirgends jenseits der Kartenkante
     passt. Sie muss bei der vollen Groesse beginnen und fallen — eine Stufe
     ueber 1 vergroesserte das Portal heimlich, eine steigende Folge liesse die
     Suche die kleinste zuerst nehmen. */
  it('faengt die Schrumpfleiter bei voller Groesse an und laesst sie fallen', () => {
    expect(UNIVERSE_MAP_PORTAL_SHRINK_STEPS[0]).toBe(1)
    for (let i = 1; i < UNIVERSE_MAP_PORTAL_SHRINK_STEPS.length; i++) {
      expect(UNIVERSE_MAP_PORTAL_SHRINK_STEPS[i]).toBeLessThan(
        UNIVERSE_MAP_PORTAL_SHRINK_STEPS[i - 1],
      )
    }
    // Auch die kleinste Stufe bleibt ein Portal und wird keine Marke.
    const smallest = UNIVERSE_MAP_PORTAL_RING_MIN_PX * UNIVERSE_MAP_PORTAL_SHRINK_STEPS.at(-1)!
    expect(smallest).toBeGreaterThan(UNIVERSE_MAP_NODE_HIT_MIN)
  })

  /* Der Reiter steht auf Grundlast: bewegt wird per CSS an fertigen Sprites,
     nie in einer Schleife. Das faengt genau den Rueckfall, der hier naheliegt —
     ein „nur ganz kurz" pulsendes `box-shadow` oder ein rAF fuer den Wirbel. */
  it('bringt keine Frame-Schleife und keine verbotene Animation mit', () => {
    const src = readFileSync(
      resolve(__dirname, '../../components/bardProfil/universe/UniversePortal.vue'),
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
    expect(UNIVERSE_MAP_PORTAL_HOVER_SWIRL_K).toBeLessThan(UNIVERSE_MAP_PORTAL_HOVER_MAW_K)
    expect(UNIVERSE_MAP_PORTAL_HOVER_MAW_K).toBeLessThan(1)
    expect(UNIVERSE_MAP_PORTAL_HOVER_RIM_K).toBeGreaterThan(1)
    expect(UNIVERSE_MAP_PORTAL_HOVER_HALO_K).toBeGreaterThan(UNIVERSE_MAP_PORTAL_HOVER_RIM_K)
  })

  /* Die Zusatzdrehung ADDIERT sich, also zieht jeder positive Teiler an. Sie
     darf den Wirbel aber nicht zum Kreisel machen — bei doppelter Grundrate
     waere die Anzeige eine Maschine im Leerlauf, kein Sog. */
  it('laesst den Wirbel anziehen, ohne ihn zum Kreisel zu machen', () => {
    expect(UNIVERSE_MAP_PORTAL_HOVER_BOOST_RATIO).toBeGreaterThan(0)
    expect(UNIVERSE_MAP_PORTAL_HOVER_BOOST_RATIO).toBeLessThanOrEqual(2)
  })

  /* Die Welle beginnt INNEN am Ring und stirbt innerhalb des Halos. Ein Start
     ausserhalb machte sie zum zweiten Ring, ein Ende jenseits der Aura zu einem
     Reif, der ueber die Karte laeuft. Spannen sind zugleich die Reichweite in
     Ringradien, deshalb ist der Vergleich mit `_AURA_SPAN` einer. */
  it('laesst die Ringwelle innen beginnen und im Halo sterben', () => {
    expect(UNIVERSE_MAP_PORTAL_RIPPLE_FROM).toBeLessThan(1)
    expect(UNIVERSE_MAP_PORTAL_RIPPLE_TO).toBeGreaterThan(1)
    expect(UNIVERSE_MAP_PORTAL_RIPPLE_TO).toBeLessThan(UNIVERSE_MAP_PORTAL_AURA_SPAN)
  })

  /* `will-change` legt die Ebene schon beim Mount an — im teuersten Frame des
     Reiters — und Chrome promotet eine laufende Animation ohnehin. Dieselbe
     Begruendung wie am Wall und an der Universumsscheibe. */
  it('promotet keine Portal-Ebene von Hand', () => {
    const src = readFileSync(
      resolve(__dirname, '../../components/bardProfil/universe/UniversePortal.vue'),
      'utf8',
    )
    expect(src.includes('will-change')).toBe(false)
    // Der Hover LEBT: der Zusatzdrehrahmen laeuft an, statt zu pausieren.
    expect(src.includes('animation-play-state: running')).toBe(true)
  })

  /* Ueber dem PORTAL haelt es SELBST nicht an — es steht fest, dem Zeiger kann
     es nicht aus der Trefferflaeche laufen, und ein Durchgang, der auf den Blick
     hin anzieht, ist die Auskunft. Genau diese Entscheidung wird beim naechsten
     Anfassen still zurueckgedreht, indem jemand den Ausloeser in die eine grosse
     Pause-Regel schreibt.

     Seit auf der laufenden Bahn DREI Portale stehen, ist „es selbst" nicht mehr
     dasselbe wie „alle": die NACHBARN halten sehr wohl an — zwei weiterdrehende
     neben einem aufgewachten waeren dieselbe Inkonsistenz wie ein einzeln
     drehendes Portal ueber einem gehoverten Knoten. Gebunden ist deshalb nicht
     mehr die Abwesenheit der Regel, sondern ihre AUSNAHME: wer `.un-portal-l`
     per `.un-portal-hit` pausiert, muss das aufgewachte ausnehmen. */
  it('nimmt das aufgewachte Portal von seiner eigenen Hover-Pause aus', () => {
    const src = readFileSync(
      resolve(__dirname, '../../components/bardProfil/universe/UniverseChart.vue'),
      'utf8',
    )
    const rules = [...src.matchAll(/([^{}]*)\{\s*animation-play-state:\s*paused;\s*\}/g)].map(
      (m) => m[1],
    )
    expect(rules.length).toBeGreaterThan(0)
    for (const sel of rules) {
      if (sel.includes('.un-portal-l') && sel.includes('.un-portal-hit')) {
        expect(sel.includes(':not(.is-awake)')).toBe(true)
      }
    }
    // Die Wolke haelt weiterhin an — der Ausloeser ist also nicht bloss entfallen.
    expect(rules.some((sel) => sel.includes('.un-portal-hit'))).toBe(true)
  })

  /* Das Aufwachen selbst haengt NICHT mehr an `.un-stage:has(...)`: der fremde
     Vorfahre war buehnenweit und weckte alle drei Portale zugleich. Es kommt als
     Prop herein und schaltet eine Klasse an der eigenen Wurzel. */
  it('weckt ein Portal ueber seine eigene Klasse, nicht ueber die Buehne', () => {
    const src = readFileSync(
      resolve(__dirname, '../../components/bardProfil/universe/UniversePortal.vue'),
      'utf8',
    )
    const style = src.slice(src.indexOf('<style'))
    expect(style.includes('.un-stage:has')).toBe(false)
    expect(style.includes('.un-portal.is-awake')).toBe(true)
  })
})

/*
 * Die Portraitreihe der Knotenkarte.
 *
 * Sie ist der einzige Block der Karte, dessen Breite am INHALT haengt: sieben
 * Gesichter nebeneinander sind eine volle Galaxie. Passt die Zeile nicht mehr
 * in die Karte, bricht sie still um und die Reihe steht drei Zeilen hoch ueber
 * einer Bahn, die sich weiterdreht.
 *
 * Die zweite Zusicherung ist die BILDSCHAERFE: die Kante entscheidet ueber die
 * Aufloesungsvariante, und sie ist so gewaehlt, dass sie im selben Band liegt
 * wie das Sternmanifest im Voyages-Atlas — dieselben Gesichter, dieselbe Datei,
 * ein Cache-Treffer statt eines zweiten Downloads.
 */
describe('Universe — die Portraitreihe der Knotenkarte', () => {
  const TIP = readFileSync(resolve(__dirname, '../../components/ui/RpgBadgeTooltip.vue'), 'utf8')
  const THEME = readFileSync(resolve(__dirname, '../../assets/rpg-theme.css'), 'utf8')
  const CARD = readFileSync(
    resolve(__dirname, '../../components/bardProfil/universe/UniverseGalaxyTip.vue'),
    'utf8',
  )

  /** `max-width: min(26.4em, …)` an `.tip` — die Wand, gegen die gerechnet wird. */
  const cardMaxEm = Number(/max-width:\s*min\(([\d.]+)em/.exec(TIP)![1])
  /** Die Obergrenze der EINEN Schriftskala: `--tip-u: clamp(12px, 0.63vw, 16px)`. */
  const tipUMaxPx = Number(/--tip-u:\s*clamp\([^,]+,[^,]+,\s*([\d.]+)px/.exec(THEME)![1])
  /** Das Polster von `.fgt`, beide Seiten. */
  const padEm = 2 * Number(/\.fgt \{[^}]*padding: 0 ([\d.]+)em/.exec(CARD)![1])

  const rowEm =
    UNIVERSE_MAP_TIP_SEAT_COLS * UNIVERSE_MAP_TIP_SEAT_EM +
    (UNIVERSE_MAP_TIP_SEAT_COLS - 1) * UNIVERSE_MAP_TIP_SEAT_GAP_EM

  it('eine volle Galaxie steht in EINER Zeile', () => {
    expect(rowEm + padEm).toBeLessThanOrEqual(cardMaxEm)
    // Der Deckel sind ganze Zeilen — eine halbe letzte Reihe liest sich als
    // Fehler statt als Deckel. Zwei Baender, je eine Zeile.
    expect(UNIVERSE_MAP_TIP_SEAT_MAX % UNIVERSE_MAP_TIP_SEAT_COLS).toBe(0)
    expect(UNIVERSE_MAP_TIP_SEAT_MAX / UNIVERSE_MAP_TIP_SEAT_COLS).toBe(2)
  })

  // Der Sternbogen am Knoten gruppiert seit jeher (gold ab oben, rot
  // anschliessend). In Flugreihenfolge fiel der Umbruch dorthin, wo die Zeile
  // voll ist, statt dorthin, wo der Ausgang wechselt — eine rote Kachel
  // zwischen goldenen ist nicht zu zaehlen.
  it('die Reihen sind nach dem AUSGANG getrennt', () => {
    expect(CARD).toContain('starSeatsSplit(')
    expect(CARD).not.toMatch(/\bstarSeats\(/)
    // Der Deckel ist EINE Zeile je Band, nicht der Gesamtdeckel.
    expect(CARD).toContain('UNIVERSE_MAP_TIP_SEAT_COLS,')
  })

  it('die Portraitkante liegt im Band der gewaehlten Kunststufe', () => {
    // Gemessen wird die GROESSTE Anzeige: die clamp-Obergrenze von `--tip-u`.
    const edgePx = UNIVERSE_MAP_TIP_SEAT_EM * tipUMaxPx
    expect(championArtSizeFor(edgePx)).toBe(STAR_MANIFEST_ART_SIZE)
    expect(edgePx).toBeGreaterThan(CHAMPION_ART_SM_MAX_EDGE)
    expect(edgePx).toBeLessThanOrEqual(CHAMPION_ART_MD_MAX_EDGE)
  })

  it('die Karte laedt die Gesichter auf genau dieser Stufe', () => {
    expect(CARD).toContain('getChampionIconPath(champion, STAR_MANIFEST_ART_SIZE)')
    // Bardle hat keine Pixel-Art — eine „Schaerfe"-Regel waere der Rueckfall.
    expect(CARD).not.toMatch(/image-rendering/)
  })

  // `tierOf(g)` ist eine reine Funktion der Galaxienummer, und die steht als
  // roemische Ziffer im Titel derselben Karte.
  it('die Karte nennt keinen Rang', () => {
    expect(CARD).not.toMatch(/tierOf/)
  })

  // Datum und Klickhinweis sind gefallen, der Ueberlaufzaehler steht als Kachel
  // IM Band. Damit traegt die Karte keinen einzigen Trennstrich mehr.
  it('die Karte traegt keine Fusszeile', () => {
    expect(CARD).not.toMatch(/tip-hint/)
  })
})
