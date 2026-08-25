import { describe, it, expect } from 'vitest'
import {
  VOYAGE_RAIL_WIDTH,
  VOYAGE_DETAIL_COLLAPSED,
  VOYAGE_DETAIL_MIN_WIDTH,
  VOYAGE_DETAIL_PCT,
  VOYAGE_DETAIL_MAX_WIDTH,
  VOYAGE_MAP_GUTTER_PX,
  VOYAGE_MAP_INSET_PX,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_MAP_STATS_MIN_H,
  VOYAGE_BERTH_MIN_SEPARATION,
  VOYAGE_SITE_HIT_MIN,
  VOYAGE_FLEET_CARD_MIN_W,
  VOYAGE_FLEET_CARD_GAP,
  VOYAGE_FLEET_CARD_H,
  VOYAGE_FLEET_CARD_PAD_Y,
  VOYAGE_FLEET_CARD_MIN_VISIBLE,
  VOYAGE_FLEET_AVATAR_PX,
  VOYAGE_FLEET_HEAD_H,
  VOYAGE_FLEET_FOOT_H,
  VOYAGE_FLEET_RAIL_H,
  VOYAGE_FLEET_CARD_ROW_GAP,
  VOYAGE_FLEET_CARD_INSET_X,
  VOYAGE_FLEET_CARD_INSET_Y,
  VOYAGE_FLEET_CARD_BORDER_X,
  VOYAGE_FLEET_CARD_BORDER_Y,
  VOYAGE_FLEET_HEAD_ICON,
  VOYAGE_FLEET_HEAD_GAP,
  VOYAGE_FLEET_NAME_MAX_PX,
  EXPEDITION_TIERS,
  EXPEDITION_TIER_COLORS,
  EXPEDITION_TIER_SEGMENTS,
  VOYAGE_FLEET_RANK_W,
  VOYAGE_FLEET_ASIDE_W,
  VOYAGE_FLEET_BAND_PAD_X,
  VOYAGE_FLEET_BAND_GAP,
  VOYAGE_COMMAND_BAR_H,
  EXPEDITION_LEDGER_RANKS,
  BOTTOM_BAR_SIDE_W,
} from '@/config/constants'
import { galaxyFitBox } from '@/utils/fx/galaxyPlate'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'

/**
 * Das Fleet-Band ist die eine Zeile der Kopfleiste, und `.etc-bar` ist eine
 * `auto`-Grid-Zeile: was es an Höhe nimmt, nimmt es der BÜHNE. Und die
 * Bühnenhöhe ist keine Geschmacksfrage — die kürzere Achse der Fit-Box trägt die
 * Klickflächen zweier Nachbarhäfen (`VOYAGE_BERTH_MIN_SEPARATION`), und unter
 * `VOYAGE_MAP_STATS_MIN_H` fällt das Datenband weg.
 *
 * Diese Datei ist deshalb kein Zierrat: wer das Band höher macht, eine Zeile
 * hineinschreibt oder es umbrechen lässt, bricht hier — und das ist ihr Zweck.
 *
 * Die Zonenrechnung steht ein zweites Mal hier (wie in `shopAtlasLayout.spec.ts`
 * gegenüber `voyagesAtlasLayout.spec.ts`), damit die Kopplung Kartenbreite ↔
 * Hafenabstand dort ungestört bleibt.
 */

const MODAL_GAP = 10
const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))
const hudScale = (w: number, h: number) => clamp(0.52, Math.min(w / 2560, h / 1440), 1)
const teamUiScale = (w: number, h: number) => clamp(0.62, Math.min(w / 1920, h / 1080), 1)

function atlasWidth(vw: number, vh: number): number {
  const panel = BOTTOM_BAR_SIDE_W * hudScale(vw, vh)
  return (vw - 2 * (panel + MODAL_GAP)) / teamUiScale(vw, vh)
}

function mapWidth(vw: number, vh: number, detailFolded = false): number {
  const detail = detailFolded
    ? VOYAGE_DETAIL_COLLAPSED
    : clamp(
        VOYAGE_DETAIL_MIN_WIDTH,
        (atlasWidth(vw, vh) * VOYAGE_DETAIL_PCT) / 100,
        VOYAGE_DETAIL_MAX_WIDTH,
      )
  return atlasWidth(vw, vh) - VOYAGE_RAIL_WIDTH - detail
}

/**
 * Bühnenhöhe MIT dem Band — im Browser gemessen, nicht gerechnet: `.rp-wrapper`
 * hängt oben an `--level-badge-bottom`, das der Header zur Laufzeit aus einem
 * gerenderten Rechteck setzt. Dieselben Zahlen wie in `voyagesAtlasLayout.spec.ts`.
 *
 * Frisch aufgenommen mit dem Fleet-Band (Kopfleiste 126). Die Tabelle davor war
 * ihrerseits veraltet: sie nannte 657,6 für Full HD, gemessen wurde jetzt ein
 * Atlas von 779,56 — mit der alten 102er Leiste wären das 677,56 gewesen. Im
 * Browser gegengeprüft, dass die Atlashöhe NICHT am Spielstand hängt:
 * `--level-badge-bottom` misst 133,2 px bei Level 1 wie bei Level 100.
 *
 * Die Fit-Box verliert durch das Band NICHTS — `VOYAGE_MAP_STATS_BAND_H` ist um
 * dieselben 24 gefallen, die die Kopfleiste bekommen hat.
 */
const STAGE_HEIGHT: Record<number, number> = {
  1080: 653.6,
  1200: 754.4,
  1440: 932,
  2160: 1641.2,
}

const DESKTOPS: Array<[string, number, number]> = [
  ['Full HD 1920×1080', 1920, 1080],
  ['WUXGA 1920×1200', 1920, 1200],
  ['2K/QHD 2560×1440', 2560, 1440],
  ['4K 3840×2160', 3840, 2160],
]

describe('voyages fleet strip', () => {
  it.each(DESKTOPS)('%s: der Streifen lässt das Datenband stehen', (_l, _vw, vh) => {
    expect(STAGE_HEIGHT[vh]).toBeGreaterThanOrEqual(VOYAGE_MAP_STATS_MIN_H)
  })

  /**
   * Der eigentliche Grund für die Datei: die Höhe, die der Streifen nimmt, hängt
   * an der Klickfläche zweier Nachbarhäfen.
   */
  it.each(DESKTOPS)('%s: zwei Nachbarhäfen bleiben getrennt anklickbar', (_l, vw, vh) => {
    const box = galaxyFitBox(
      mapWidth(vw, vh) - VOYAGE_MAP_GUTTER_PX,
      STAGE_HEIGHT[vh] - VOYAGE_MAP_STATS_BAND_H,
      VOYAGE_MAP_INSET_PX,
    )
    expect(VOYAGE_BERTH_MIN_SEPARATION * Math.min(box.w, box.h)).toBeGreaterThanOrEqual(
      VOYAGE_SITE_HIT_MIN,
    )
  })

  it('behält auf Full HD Spielraum über dem Bandboden', () => {
    // Full HD bindet: 653,6 gegen den Boden 596 sind 57,6 px. Die Zahl steht
    // hier, damit sie jemand liest, BEVOR er der Kopfleiste Höhe gibt — Bühne
    // und Datenband sind für das Band um dieselben 24 gefallen, ein weiterer
    // Zuschlag käme von der Galaxie.
    expect(STAGE_HEIGHT[1080] - VOYAGE_MAP_STATS_MIN_H).toBeGreaterThanOrEqual(30)
  })

  /**
   * Das Band bricht NICHT um — es hat feste Höhe, sonst änderte sich mit jedem
   * Spawn die Bühnenhöhe und die Galaxie würde neu gemalt. Anders als die Pillen
   * davor passen NICHT mehr alle Marken nebeneinander: eine Karte trägt fünf
   * Crew-Portraits und misst deshalb 168 statt 116. Zugesagt ist der Boden —
   * so viele Karten stehen ohne Scrollen, und weil die Reihenfolge nach
   * Dringlichkeit ordnet, sind es die, die etwas wollen. Der Rest scrollt und
   * wird vom `+N`-Chip gemeldet; still verschwinden darf nichts.
   */
  it('trägt auf Full HD den zugesagten Boden an Karten ohne Scrollen', () => {
    const lane =
      atlasWidth(1920, 1080) -
      2 * VOYAGE_FLEET_BAND_PAD_X -
      VOYAGE_FLEET_RANK_W -
      VOYAGE_FLEET_ASIDE_W -
      2 * VOYAGE_FLEET_BAND_GAP
    const need =
      VOYAGE_FLEET_CARD_MIN_VISIBLE * VOYAGE_FLEET_CARD_MIN_W +
      (VOYAGE_FLEET_CARD_MIN_VISIBLE - 1) * VOYAGE_FLEET_CARD_GAP
    expect(need).toBeLessThanOrEqual(lane)
  })

  /** Und der Boden muss unter dem Deckel liegen, den der Rang überhaupt zulässt. */
  it('sagt nicht mehr Karten zu, als der Ledger-Rang Marken erlaubt', () => {
    const top = EXPEDITION_LEDGER_RANKS[EXPEDITION_LEDGER_RANKS.length - 1]
    expect(VOYAGE_FLEET_CARD_MIN_VISIBLE).toBeLessThanOrEqual(top.activeSlots + top.offerSlots)
  })

  /**
   * Der eigentliche Wächter dieser Datei. Die Kopfleiste darf INNEN umverteilen —
   * aus zwei Zeilen wurde eine, das Band trägt jetzt Karten statt Pillen —
   * aber ihre AUSSENHÖHE ist es, die in den STAGE_HEIGHT-Tabellen dieser Datei
   * und in `voyagesAtlasLayout.spec.ts` als gemessene Bühnenhöhe steckt.
   *
   * Die 3 gehören dazu: `.ecb` trägt einen `border-bottom: 3px`, und
   * `getBoundingClientRect()` misst ihn mit. Im Browser gegengeprüft — `.etc-bar`
   * misst vorher wie nachher 102.
   *
   * Ändert jemand die Summe, sind beide Tabellen still falsch: die Suite bliebe
   * grün und das Datenband verschwände trotzdem im Browser. Wer hier vorbeikommt,
   * misst neu (`docs/playwright.md`) und führt beide Tabellen nach.
   */
  it('hält die Kopfleiste bei 126 — die Aussenhöhe steckt in STAGE_HEIGHT', () => {
    expect(VOYAGE_COMMAND_BAR_H + 3).toBe(126)
  })

  /** Karten- und Bandhöhe sind gekoppelt: die Karte muss in das Band passen. */
  it('lässt die Karte samt Luft in das Band', () => {
    expect(VOYAGE_FLEET_CARD_H + 2 * VOYAGE_FLEET_CARD_PAD_Y).toBeLessThanOrEqual(
      VOYAGE_COMMAND_BAR_H,
    )
  })

  /**
   * VIER Zeilen, und keine fünfte. Die Karte kann nicht wachsen — 110 bräche
   * schon die Zusicherung darüber, und danach die Kopfleiste, danach beide
   * STAGE_HEIGHT-Tabellen. Wer eine Zeile ergänzt, bricht hier zuerst.
   *
   * Mit dem alten zweizeiligen Kopf (30) standen 88 von 91 px — 3 px Schlupf in
   * der ganzen Karte. Der einzeilige Kopf ist der einzige kostenlose Platz.
   */
  it('trägt die vier Zeilen der Karte samt Lücken', () => {
    const rows =
      VOYAGE_FLEET_HEAD_H + VOYAGE_FLEET_AVATAR_PX + VOYAGE_FLEET_FOOT_H + VOYAGE_FLEET_RAIL_H
    const gaps = 3 * VOYAGE_FLEET_CARD_ROW_GAP
    const inner = VOYAGE_FLEET_CARD_H - 2 * VOYAGE_FLEET_CARD_INSET_Y - VOYAGE_FLEET_CARD_BORDER_Y
    expect(rows + gaps).toBeLessThanOrEqual(inner)
  })

  /**
   * Die Kopfzeile trägt den ZIELNAMEN. „Crimson Expanse" misst bei 13 px im
   * Browser gemessene 101,72 px — das passt in die 125-px-Spalte NUR, weil die
   * Chancen-Pille im Fuss steht. Holte jemand sie in den Kopf zurück, blieben
   * dem Namen 89 px und der längste Name wäre beschnitten.
   */
  it('lässt den längsten Zielnamen ungekürzt in die Kopfzeile', () => {
    const column =
      VOYAGE_FLEET_CARD_MIN_W -
      2 * VOYAGE_FLEET_CARD_INSET_X -
      VOYAGE_FLEET_CARD_BORDER_X -
      VOYAGE_FLEET_HEAD_ICON -
      VOYAGE_FLEET_HEAD_GAP
    expect(VOYAGE_FLEET_NAME_MAX_PX).toBeLessThanOrEqual(column)
  })

  /** Und kein Themename darf wachsen, ohne dass jemand nachmisst. */
  it('kennt keinen Zielnamen jenseits der gemessenen Breite', () => {
    const longest = GALAXY_THEMES.reduce((a, t) => Math.max(a, t.name.length), 0)
    expect(longest, 'ein längerer Themename verlangt eine neue Messung').toBeLessThanOrEqual(15)
  })

  /**
   * Die Stufe steht auf der Karte als segmentierter Streifen. Eine neue Stufe
   * ohne Farbe wäre auf der Karte unsichtbar, eine ohne Segmentzahl gar nicht
   * gemalt — beide Tabellen müssen `EXPEDITION_TIERS` decken.
   */
  it('gibt jeder Stufe eine Farbe und eine Segmentzahl', () => {
    const tiers = Object.keys(EXPEDITION_TIERS)
    expect(Object.keys(EXPEDITION_TIER_COLORS).sort()).toEqual([...tiers].sort())
    expect(Object.keys(EXPEDITION_TIER_SEGMENTS).sort()).toEqual([...tiers].sort())
    for (const tier of tiers) {
      const lit = EXPEDITION_TIER_SEGMENTS[tier as keyof typeof EXPEDITION_TIER_SEGMENTS]
      expect(lit, `${tier} muss zwischen 1 und 3 Segmenten erleuchten`).toBeGreaterThanOrEqual(1)
      expect(lit).toBeLessThanOrEqual(3)
      expect(EXPEDITION_TIER_COLORS[tier as keyof typeof EXPEDITION_TIER_COLORS]).toMatch(
        /^#[0-9a-f]{6}$/i,
      )
    }
    // Die Segmentzahl muss die Stufen TRENNEN, sonst trägt die Länge nichts.
    expect(new Set(Object.values(EXPEDITION_TIER_SEGMENTS)).size).toBe(tiers.length)
    expect(new Set(Object.values(EXPEDITION_TIER_COLORS)).size).toBe(tiers.length)
  })
})
