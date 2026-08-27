import { describe, it, expect } from 'vitest'
import {
  VOYAGE_RAIL_WIDTH,
  VOYAGE_RAIL_COLLAPSED,
  VOYAGE_RAIL_AUTOFOLD_WIDTH,
  VOYAGE_DETAIL_COLLAPSED,
  VOYAGE_DETAIL_MIN_WIDTH,
  VOYAGE_DETAIL_PCT,
  VOYAGE_DETAIL_MAX_WIDTH,
  VOYAGE_MAP_MIN_WIDTH,
  VOYAGE_MAP_GUTTER_PX,
  VOYAGE_SITE_HIT_MIN,
  VOYAGE_BERTH_MIN_SEPARATION,
  CORE_GATE_CROWN_SPAN,
  CORE_GATE_MOUTH_R,
  LANDMARK_PAD_SPAN,
  VOYAGE_GATE_GAP_PX,
  VOYAGE_GATE_MIN_PX,
  VOYAGE_MAP_LEGEND_ICON_PX,
  VOYAGE_MAP_LEGEND_R,
  VOYAGE_SITE_HIT_GAP,
  VOYAGE_SITE_HIT_MAX,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_MAP_STATS_MIN_H,
  VOYAGE_MAP_INSET_PX,
  BOTTOM_BAR_SIDE_W,
} from '@/config/constants'
import { galaxyFitBox, GALAXY_PLATE_REF_W } from '@/utils/fx/galaxyPlate'
import { voyageGateSizeFor, voyageMarkerSizeFor } from '@/utils/game/voyageSites'

/**
 * Der Voyages-Atlas teilt drei Zonen ein Budget: Leiste + Karte + Detail sind
 * der ganze Reiter. Nichts im CSS sagt, wie gross die Karte davon bleibt — wer
 * eine der beiden Ränder verbreitert, nimmt sie ihr still weg.
 *
 * Und anders als beim Shop ist der Boden hier keine Geschmacksfrage:
 * `voyageBerthsOf` garantiert zwischen zwei Ankerplätzen
 * VOYAGE_BERTH_MIN_SEPARATION im normalisierten Raum — in Pixeln also mal der
 * kürzeren Achse der Fit-Box. Bleibt das unter VOYAGE_SITE_HIT_MIN, decken sich
 * die Klickflächen und die Karte hört auf zu funktionieren.
 *
 * Diese Spec ist die einzige Stelle, an der die LAYOUT-Zahlen aus
 * `constants/economy.ts` an die GEOMETRIE-Zusage aus `utils/game/voyageSites.ts`
 * gebunden sind (die ihrerseits `voyageSites.spec.ts` hält). Weder CSS noch der
 * Compiler können diese Kopplung ausdrücken.
 *
 * Die Zahlen unten spiegeln, was App.vue rechnet:
 *   Full HD  →  224px 628px 388px
 *   2K       →  224px 955px 481px
 */

/** `--bp-gap` von .rp-wrapper, beide Seiten. */
const MODAL_GAP = 10

const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** `--hud-scale` / `--team-ui-scale` aus App.vue. */
const hudScale = (w: number, h: number) => clamp(0.52, Math.min(w / 2560, h / 1440), 1)
const teamUiScale = (w: number, h: number) => clamp(0.62, Math.min(w / 1920, h / 1080), 1)

/**
 * Breite des Atlas in seinem eigenen Koordinatenraum. Das Profilmodal ist
 * beidseitig um `--hud-panel-size` eingerückt — das erhobene Seitenpanel der
 * Bottom-Bar, skaliert mit `--hud-scale`.
 */
function atlasWidth(vw: number, vh: number): number {
  const panel = BOTTOM_BAR_SIDE_W * hudScale(vw, vh)
  const modal = vw - 2 * (panel + MODAL_GAP)
  return modal / teamUiScale(vw, vh)
}

function zones(vw: number, vh: number, folded = false, detailFolded = false) {
  const atlas = atlasWidth(vw, vh)
  const rail = folded ? VOYAGE_RAIL_COLLAPSED : VOYAGE_RAIL_WIDTH
  const detail = detailFolded
    ? VOYAGE_DETAIL_COLLAPSED
    : clamp(VOYAGE_DETAIL_MIN_WIDTH, (atlas * VOYAGE_DETAIL_PCT) / 100, VOYAGE_DETAIL_MAX_WIDTH)
  return { atlas, rail, detail, map: atlas - rail - detail }
}

/**
 * Höhe der Bühne je Auflösung — GEMESSEN, nicht gerechnet.
 *
 * `.rp-wrapper` hängt oben an `--level-badge-bottom`, das `AppHeaderComponent`
 * zur Laufzeit aus einem gerenderten Rechteck setzt; eine Formel dafür wäre
 * eine zweite, stille Quelle. Dieselbe Entscheidung wie `GRID_PADDING` in
 * `shopAtlasLayout.spec.ts`: was nur der Browser weiss, kommt als gemessene
 * Zahl herein, mit dem Lauf daneben.
 *
 * Aufgenommen mit dem Playwright-Treiber im Scratchpad, acht befreite Galaxien,
 * zwölf Verträge auf EINER von ihnen — der dichteste Fall, den der Rang-Deckel
 * (5 Angebote + 5 Missionen) zulässt, und darüber hinaus.
 *
 * Je 92 px höher als in der Fassung vor dem Datenband: das war der Crew-Streifen,
 * den der Reiter nicht mehr trägt. Die Bühne hat ihn geerbt und gibt einen Teil
 * davon als Datenband wieder aus.
 *
 * Mit dem Fleet-Band neu aufgenommen (Kopfleiste 126). Die Zahlen davor waren
 * unabhängig davon veraltet — siehe die Herleitung in
 * `voyagesFleetLayout.spec.ts`. Die Fit-Box verliert durch das Band NICHTS:
 * `VOYAGE_MAP_STATS_BAND_H` ist um dieselben 24 gefallen (96 → 72). *
 * Je 3 px hoeher, seit die Goldlinie des Profilmodals gefallen ist: `.rp-accent-bar`
 * war ein Flex-Kind im Fluss, kein Pseudoelement — was sie belegte, hat die Buehne
 * geerbt. Nachgemessen auf allen vier Aufloesungen, die Kopfleiste steht unveraendert
 * bei 126.
 */
const STAGE_HEIGHT: Record<number, number> = {
  1080: 656.6,
  1200: 757.4,
  1440: 935,
  2160: 1644.2,
}

function stageHeight(vh: number): number {
  return STAGE_HEIGHT[vh]
}

/**
 * Die Höhe, in die die Galaxie wirklich fällt. Das Datenband an der Unterkante
 * legt sich NICHT über die Karte, es nimmt der Fit-Box Höhe — sonst geriete ein
 * Hafen darunter, und der ist anklickbar.
 */
function fitHeight(vh: number): number {
  return stageHeight(vh) - VOYAGE_MAP_STATS_BAND_H
}

const DESKTOPS: Array<[string, number, number]> = [
  ['Full HD 1920×1080', 1920, 1080],
  ['WUXGA 1920×1200', 1920, 1200],
  ['2K/QHD 2560×1440', 2560, 1440],
  ['4K 3840×2160', 3840, 2160],
]

describe('voyages atlas layout', () => {
  it.each(DESKTOPS)('%s lässt jeder Zone eine positive Breite', (_label, vw, vh) => {
    const z = zones(vw, vh)
    expect(z.rail).toBeGreaterThan(0)
    expect(z.detail).toBeGreaterThan(0)
    expect(z.map).toBeGreaterThan(0)
    expect(z.rail + z.detail + z.map).toBeCloseTo(z.atlas, 6)
  })

  it.each(DESKTOPS)('%s hält den Kartenboden', (_label, vw, vh) => {
    expect(zones(vw, vh).map).toBeGreaterThanOrEqual(VOYAGE_MAP_MIN_WIDTH)
  })

  it('trifft die im Browser gemessenen Breiten', () => {
    const fhd = zones(1920, 1080)
    expect(Math.round(fhd.rail)).toBe(224)
    expect(Math.round(fhd.map)).toBe(628)
    expect(Math.round(fhd.detail)).toBe(388)

    const qhd = zones(2560, 1440)
    expect(Math.round(qhd.map)).toBe(955)
    expect(Math.round(qhd.detail)).toBe(481)
  })

  it.each(DESKTOPS)('%s: Einklappen gibt der Karte genau die Leistenbreite', (_l, vw, vh) => {
    const open = zones(vw, vh)
    const folded = zones(vw, vh, true)
    expect(folded.map - open.map).toBeCloseTo(VOYAGE_RAIL_WIDTH - VOYAGE_RAIL_COLLAPSED, 6)
  })

  it.each(DESKTOPS)('%s: Falten gibt der Karte immer nur Breite dazu, nie weg', (_l, vw, vh) => {
    const open = zones(vw, vh)
    const focus = zones(vw, vh, true, true)
    expect(focus.map).toBeGreaterThan(open.map)
    expect(focus.map).toBeGreaterThanOrEqual(VOYAGE_MAP_MIN_WIDTH)
    expect(focus.rail + focus.detail + focus.map).toBeCloseTo(focus.atlas, 6)
  })

  it('macht die Karte im Fokus auf Full HD um drei Fünftel grösser', () => {
    // Der Grund, aus dem beide Ränder falten dürfen. Gemessen an der Fit-Box,
    // nicht an der Zone: was zählt, ist die Fläche, auf der die Galaxie steht.
    //
    // 1.61 und nicht mehr, weil das geöffnete Seitenverhältnis-Band einen Teil
    // des Gewinns schon im OFFENEN Zustand ausschüttet. Vor dem Fleet-Streifen
    // waren es 1.70; die 44 px, die er der Bühne nahm, fehlen im Fokus auf
    // BEIDEN Seiten der Rechnung, gehen aber nur der Höhe ab — deshalb sank der
    // Faktor, statt gleich zu bleiben.
    //
    // Das Fleet-BAND hat ihn nicht weiter gedrückt: seine 24 px kamen aus dem
    // Datenband, nicht aus der Fit-Box. Wer der Kopfleiste Höhe gibt, ohne sie
    // dort zu holen, drückt hier weiter.
    const area = (z: { map: number }) => {
      const box = galaxyFitBox(z.map - VOYAGE_MAP_GUTTER_PX, fitHeight(1080))
      return box.w * box.h
    }
    expect(area(zones(1920, 1080, true, true)) / area(zones(1920, 1080))).toBeGreaterThan(1.55)
  })

  it('klappt keine Referenzauflösung von selbst ein', () => {
    // Die Schwelle ist für schmale Fenster da, nicht für die Referenzen — dort
    // versteckte sie die Navigation auf einem Schirm, der sie trägt.
    for (const [, vw, vh] of DESKTOPS) {
      expect(atlasWidth(vw, vh)).toBeGreaterThan(VOYAGE_RAIL_AUTOFOLD_WIDTH)
    }
  })

  /**
   * Der eigentliche Grund für diese Datei. Alles darüber ist Buchhaltung;
   * das hier bindet die Layoutbreite an die geseedete Sterngeometrie.
   */
  it.each(DESKTOPS)('%s: zwei Nachbarhäfen bleiben getrennt anklickbar', (_l, vw, vh) => {
    const box = galaxyFitBox(zones(vw, vh).map - VOYAGE_MAP_GUTTER_PX, fitHeight(vh))
    // Die Punkte streuen in beiden Achsen; die kürzere Achse bindet.
    const gap = VOYAGE_BERTH_MIN_SEPARATION * Math.min(box.w, box.h)
    expect(gap).toBeGreaterThanOrEqual(VOYAGE_SITE_HIT_MIN)
  })

  /**
   * Der Deckel des Datenbandes. Es nimmt der Fit-Box Höhe, und die kürzere
   * Achse der Box trägt die Klickfläche zweier Nachbarhäfen — die Bandhöhe ist
   * damit keine Geschmacksfrage. Full HD bindet: bei 108 kippt der Fokus-Test
   * darüber, bei 200 dieser hier.
   */
  it.each(DESKTOPS)('%s: das Datenband lässt zwei Häfen getrennt anklickbar', (_l, vw, vh) => {
    const box = galaxyFitBox(zones(vw, vh).map - VOYAGE_MAP_GUTTER_PX, fitHeight(vh))
    expect(VOYAGE_BERTH_MIN_SEPARATION * Math.min(box.w, box.h)).toBeGreaterThanOrEqual(
      VOYAGE_SITE_HIT_MIN,
    )
  })

  it('leitet die Band-Schwelle her, statt sie zu wählen', () => {
    // Unter VOYAGE_MAP_STATS_MIN_H verschwindet das Band. Die Schwelle muss so
    // liegen, dass die Box GENAU DARÜBER noch trägt — sonst gäbe es eine
    // Bühnenhöhe, auf der das Band steht und die Häfen sich decken.
    const box = galaxyFitBox(
      VOYAGE_MAP_MIN_WIDTH - VOYAGE_MAP_GUTTER_PX,
      VOYAGE_MAP_STATS_MIN_H - VOYAGE_MAP_STATS_BAND_H,
      VOYAGE_MAP_INSET_PX,
    )
    expect(VOYAGE_BERTH_MIN_SEPARATION * Math.min(box.w, box.h)).toBeGreaterThanOrEqual(
      VOYAGE_SITE_HIT_MIN,
    )
  })

  it('bindet den Boden an die Klickfläche und nicht an eine runde Zahl', () => {
    // Fällt die Karte auf ihren Boden, muss der Abstand noch reichen — sonst
    // ist VOYAGE_MAP_MIN_WIDTH zu klein für VOYAGE_SITE_HIT_MIN gewählt.
    const box = galaxyFitBox(VOYAGE_MAP_MIN_WIDTH - VOYAGE_MAP_GUTTER_PX, fitHeight(1080))
    expect(VOYAGE_BERTH_MIN_SEPARATION * Math.min(box.w, box.h)).toBeGreaterThanOrEqual(
      VOYAGE_SITE_HIT_MIN,
    )
  })

  /**
   * Das Caretaker's Gate steht im Kern und ist die einzige Marke ohne
   * Ankerplatz. Seine SICHTBARE Form malt das Canvas (`core-gate`); das DOM legt
   * nur den Zustand darauf und muss die gemalte Marke deshalb umschliessen.
   * `voyageGateSizeFor` deckelt es trotzdem am nächsten Hafen — ausser auf
   * seinem BODEN, den kein Deckel unterschreitet.
   */
  it('bindet Boden und Deckel des Tores an die Hafenmarke', () => {
    // Boden: enger als eine Hafenmarke wird das Tor nicht. Dort, wo der Deckel
    // greift, ist es damit nie das Grösste im Kern.
    expect(VOYAGE_GATE_MIN_PX).toBeLessThanOrEqual(VOYAGE_SITE_HIT_MIN)
    // Der Boden darf die kleinste Hafenmarke nicht überragen, sonst wäre er
    // selbst der Grund, aus dem sich zwei Flächen decken.
    expect(VOYAGE_GATE_MIN_PX).toBeLessThan(VOYAGE_SITE_HIT_MAX)
    // Und die Luft, die das Tor lässt, ist dieselbe, die zwei Häfen sich lassen.
    expect(VOYAGE_GATE_GAP_PX).toBeGreaterThanOrEqual(VOYAGE_SITE_HIT_GAP)
  })

  /**
   * Die Legendensonde ist der engste Ort der ganzen Karte: sie malt mit
   * `VOYAGE_MAP_LEGEND_R` und ERZWUNGENER voller Detailstufe in eine Kachel von
   * `VOYAGE_MAP_LEGEND_ICON_PX`. Wer an einem Landmarken-Radius dreht, merkt es
   * sonst erst im Browser — und dort ist die Marke dann beschnitten.
   */
  it('hält die weiteste Landmarke in der Legendenkachel', () => {
    const cell = VOYAGE_MAP_LEGEND_ICON_PX
    // Der allgemeine Rand deckt alle Kinds mit Sprite ab …
    expect(VOYAGE_MAP_LEGEND_R * LANDMARK_PAD_SPAN * 2).toBeLessThanOrEqual(cell * 2)
    // … und die Krone des Tores, die weiteste Zier des Kerns, passt hinein.
    expect(VOYAGE_MAP_LEGEND_R * CORE_GATE_CROWN_SPAN * 2).toBeLessThanOrEqual(cell)
  })

  /**
   * Der Routenanfang liegt IMMER ausserhalb der gemalten Krone — auch dort, wo
   * ein Vertrag dicht am Kern den Deckel des Tores gedrückt hat. `exit` hängt
   * deshalb am Massstab der Platte und nicht an der Klickfläche.
   */
  it('leitet den Routenanfang aus der gemalten Marke ab, nicht aus der Klickfläche', () => {
    const box = galaxyFitBox(VOYAGE_MAP_MIN_WIDTH - VOYAGE_MAP_GUTTER_PX, fitHeight(1080))
    const k = box.w / GALAXY_PLATE_REF_W
    const markR = CORE_GATE_MOUTH_R * CORE_GATE_CROWN_SPAN * k
    const gate = voyageGateSizeFor([], box, voyageMarkerSizeFor([], box))
    expect(gate.exit).toBeCloseTo(markR + VOYAGE_GATE_GAP_PX, 9)
    expect(gate.exit).toBeGreaterThan(markR)
  })

})
