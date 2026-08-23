import { describe, it, expect } from 'vitest'
import {
  VOYAGE_RAIL_WIDTH,
  VOYAGE_RAIL_COLLAPSED,
  VOYAGE_RAIL_AUTOFOLD_WIDTH,
  VOYAGE_DETAIL_MIN_WIDTH,
  VOYAGE_DETAIL_PCT,
  VOYAGE_DETAIL_MAX_WIDTH,
  VOYAGE_MAP_MIN_WIDTH,
  VOYAGE_MAP_GUTTER_PX,
  VOYAGE_SITE_HIT_PX,
  VOYAGE_BERTH_MIN_SEPARATION,
  BOTTOM_BAR_SIDE_W,
} from '@/config/constants'
import { galaxyFitBox } from '@/utils/fx/galaxyPlate'

/**
 * Der Voyages-Atlas teilt drei Zonen ein Budget: Leiste + Karte + Detail sind
 * der ganze Reiter. Nichts im CSS sagt, wie gross die Karte davon bleibt — wer
 * eine der beiden Ränder verbreitert, nimmt sie ihr still weg.
 *
 * Und anders als beim Shop ist der Boden hier keine Geschmacksfrage:
 * `voyageBerthsOf` garantiert zwischen zwei Ankerplätzen
 * VOYAGE_BERTH_MIN_SEPARATION im normalisierten Raum — in Pixeln also mal der
 * kürzeren Achse der Fit-Box. Bleibt das unter VOYAGE_SITE_HIT_PX, decken sich
 * die Klickflächen und die Karte hört auf zu funktionieren.
 *
 * Diese Spec ist die einzige Stelle, an der die LAYOUT-Zahlen aus
 * `constants/economy.ts` an die GEOMETRIE-Zusage aus `utils/game/voyageSites.ts`
 * gebunden sind (die ihrerseits `voyageSites.spec.ts` hält). Weder CSS noch der
 * Compiler können diese Kopplung ausdrücken.
 *
 * Die Zahlen unten spiegeln, was App.vue rechnet:
 *   Full HD  →  224px 648px 368px
 *   2K       →  224px 988px 448px
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

function zones(vw: number, vh: number, folded = false) {
  const atlas = atlasWidth(vw, vh)
  const rail = folded ? VOYAGE_RAIL_COLLAPSED : VOYAGE_RAIL_WIDTH
  const detail = clamp(
    VOYAGE_DETAIL_MIN_WIDTH,
    (atlas * VOYAGE_DETAIL_PCT) / 100,
    VOYAGE_DETAIL_MAX_WIDTH,
  )
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
 */
const STAGE_HEIGHT: Record<number, number> = {
  1080: 609.6,
  1200: 710.4,
  1440: 888,
  2160: 1597.2,
}

function stageHeight(vh: number): number {
  return STAGE_HEIGHT[vh]
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
    expect(Math.round(fhd.map)).toBe(648)
    expect(Math.round(fhd.detail)).toBe(368)

    const qhd = zones(2560, 1440)
    expect(Math.round(qhd.map)).toBe(988)
    expect(Math.round(qhd.detail)).toBe(448)
  })

  it.each(DESKTOPS)('%s: Einklappen gibt der Karte genau die Leistenbreite', (_l, vw, vh) => {
    const open = zones(vw, vh)
    const folded = zones(vw, vh, true)
    expect(folded.map - open.map).toBeCloseTo(VOYAGE_RAIL_WIDTH - VOYAGE_RAIL_COLLAPSED, 6)
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
    const box = galaxyFitBox(zones(vw, vh).map - VOYAGE_MAP_GUTTER_PX, stageHeight(vh))
    // Die Punkte streuen in beiden Achsen; die kürzere Achse bindet.
    const gap = VOYAGE_BERTH_MIN_SEPARATION * Math.min(box.w, box.h)
    expect(gap).toBeGreaterThanOrEqual(VOYAGE_SITE_HIT_PX)
  })

  it('bindet den Boden an die Klickfläche und nicht an eine runde Zahl', () => {
    // Fällt die Karte auf ihren Boden, muss der Abstand noch reichen — sonst
    // ist VOYAGE_MAP_MIN_WIDTH zu klein für VOYAGE_SITE_HIT_PX gewählt.
    const box = galaxyFitBox(VOYAGE_MAP_MIN_WIDTH - VOYAGE_MAP_GUTTER_PX, stageHeight(1080))
    expect(VOYAGE_BERTH_MIN_SEPARATION * Math.min(box.w, box.h)).toBeGreaterThanOrEqual(
      VOYAGE_SITE_HIT_PX,
    )
  })
})
