import { describe, it, expect } from 'vitest'
import {
  BOTTOM_BAR_SIDE_W,
  FIRMAMENT_CREST_BAND_H,
  FIRMAMENT_CREST_ID_W,
  FIRMAMENT_MAP_INSET_PX,
  FIRMAMENT_NODE_HIT_MIN,
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
} from '@/config/constants'
import { universes } from '@/config/progression/universes'
import { firmamentFitBox, firmamentPointAt } from '@/utils/ui/firmamentLayout'

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

  it('haelt den innersten Knoten vom Ursprung frei', () => {
    // Der Ursprung ist eine Marke fuer sich; ein Knoten darauf waere nicht mehr
    // von ihm zu trennen.
    const r = fullHd().r
    expect(firmamentPointAt(0).radius * r).toBeGreaterThan(FIRMAMENT_NODE_HIT_MIN)
  })

  it('haengt vier unbeleuchtete Plaetze an, nicht null und nicht zehn', () => {
    // Null hiesse: die Bahn endet, wo der Spieler steht. Zehn hiesse: die
    // Haelfte der Karte ist Versprechen statt Weg.
    expect(FIRMAMENT_UNLIT_AHEAD).toBeGreaterThan(0)
    expect(FIRMAMENT_UNLIT_AHEAD).toBeLessThanOrEqual(6)
  })
})
