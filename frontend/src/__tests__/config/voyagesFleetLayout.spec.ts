import { describe, it, expect } from 'vitest'
import {
  VOYAGE_RAIL_ZONE_W,
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
  VOYAGE_FLEET_PAY_H,
  VOYAGE_FLEET_READ_H,
  VOYAGE_FLEET_CARD_ROW_GAP,
  VOYAGE_FLEET_CARD_INSET_X,
  VOYAGE_FLEET_CARD_INSET_Y,
  VOYAGE_FLEET_CARD_BORDER_X,
  VOYAGE_FLEET_CARD_BORDER_Y,
  VOYAGE_FLEET_ODDS_W,
  VOYAGE_FLEET_TIME_W,
  VOYAGE_FLEET_DUR_W,
  VOYAGE_FLEET_CHIME_PX,
  VOYAGE_FLEET_LOOT_ICON,
  VOYAGE_FLEET_PAY_MAX_PX,
  VOYAGE_FLEET_LOOT_MAX_PX,
  VOYAGE_FLEET_EARN_GAP,
  VOYAGE_FLEET_EARN_TIGHT,
  VOYAGE_FLEET_SEAT_GAP,
  VOYAGE_FLEET_MARK_MAX_PX,
  EXPEDITION_TIERS,
  EXPEDITION_TIER_COLORS,
  EXPEDITION_TIER_SEGMENTS,
  VOYAGE_FLEET_RANK_W,
  VOYAGE_FLEET_ASIDE_W,
  VOYAGE_FLEET_BAND_PAD_X,
  VOYAGE_FLEET_BAND_GAP,
  VOYAGE_RANK_MEDAL_PX,
  VOYAGE_RANK_MEDAL_GAP,
  VOYAGE_RANK_PAD_R,
  VOYAGE_RANK_RING_R,
  VOYAGE_RANK_RING_STROKE,
  VOYAGE_RANK_RING_CIRCUMFERENCE,
  VOYAGE_RANK_CLOCK_W,
  VOYAGE_COMMAND_BAR_H,
  EXPEDITION_LEDGER_RANKS,
  BOTTOM_BAR_SIDE_W,
} from '@/config/constants'
import { galaxyFitBox } from '@/utils/fx/galaxyPlate'

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

/** Was einer Karte innen bleibt — dreimal dieselbe Rechnung wäre drei Quellen. */
const CARD_INNER_W =
  VOYAGE_FLEET_CARD_MIN_W - 2 * VOYAGE_FLEET_CARD_INSET_X - VOYAGE_FLEET_CARD_BORDER_X

/**
 * Die Loot-Zelle im schlimmsten Fall: Glyph, Beutezahl, Meep-Glyph, Meep-Zahl.
 * Die Meep-Eins misst gemessene 3,94 bei 12 px — 6 ist die aufgerundete Wand.
 */
const LOOT_W =
  VOYAGE_FLEET_LOOT_ICON +
  VOYAGE_FLEET_EARN_TIGHT +
  VOYAGE_FLEET_LOOT_MAX_PX +
  VOYAGE_FLEET_EARN_TIGHT +
  VOYAGE_FLEET_LOOT_ICON +
  VOYAGE_FLEET_EARN_TIGHT +
  6

const MODAL_GAP = 10
const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))
const hudScale = (w: number, h: number) => clamp(0.52, Math.min(w / 2560, h / 1440), 1)
const teamUiScale = (w: number, h: number) => clamp(0.62, Math.min(w / 1920, h / 1080), 1)

function atlasWidth(vw: number, vh: number): number {
  const panel = BOTTOM_BAR_SIDE_W * hudScale(vw, vh)
  return (vw - 2 * (panel + MODAL_GAP)) / teamUiScale(vw, vh)
}

function mapWidth(vw: number, vh: number): number {
  // Die ZONE, nicht die Liste: der Griff bleibt in beiden Zustaenden bezahlt.
  return atlasWidth(vw, vh) - VOYAGE_RAIL_ZONE_W
}

/**
 * Bühnenhöhe MIT dem Band — im Browser gemessen, nicht gerechnet: `.rp-wrapper`
 * hängt oben an `--level-badge-bottom`, das der Header zur Laufzeit aus einem
 * gerenderten Rechteck setzt. Dieselben Zahlen wie in `voyagesAtlasLayout.spec.ts`.
 *
 * Neu aufgenommen, seit die Kopfleiste mit dem Firmament-Band auf EINE Aussenhöhe
 * gebunden ist (126 → 112): je 14 px mehr Bühne, und die Galaxie hat sie geerbt.
 * Gegengeprüft ist dabei mehr als die Zahl — der Firmament-Reiter misst auf allen
 * vier Auflösungen DIESELBE Bühnenhöhe, was beide Bänder als gleich hoch belegt.
 * Im Browser gegengeprüft, dass die Atlashöhe NICHT am Spielstand hängt:
 * `--level-badge-bottom` misst 133,2 px bei Level 1 wie bei Level 100.
 *
 * Die Fit-Box verliert durch das Band NICHTS — `VOYAGE_MAP_STATS_BAND_H` ist um
 * dieselben 24 gefallen, die die Kopfleiste bekommen hat.
 */
const STAGE_HEIGHT: Record<number, number> = {
  1080: 670.6,
  1200: 771.4,
  1440: 949,
  2160: 1658.2,
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
    // Full HD bindet: 670,6 gegen den Boden 596 sind 74,6 px. Die Zahl steht
    // hier, damit sie jemand liest, BEVOR er der Kopfleiste Höhe gibt — ein
    // Zuschlag käme von der Galaxie.
    expect(STAGE_HEIGHT[1080] - VOYAGE_MAP_STATS_MIN_H).toBeGreaterThanOrEqual(30)
  })

  /**
   * Das Band bricht NICHT um — es hat feste Höhe, sonst änderte sich mit jedem
   * Spawn die Bühnenhöhe und die Galaxie würde neu gemalt. Anders als die Pillen
   * davor passen NICHT mehr alle Marken nebeneinander: eine Karte trägt fünf
   * Crew-Portraits UND ihre Ertragszeile und misst deshalb 210 statt 116.
   *
   * Der Boden ist mit dieser Breite von fünf auf VIER gefallen, und das ist der
   * ganze Preis des Umbaus: 4 x 210 + 3 x 6 = 858 in 874 px Bandbreite, 16 px
   * Reserve. Wer die Karte weiter verbreitert, nimmt hier die nächste — bei
   * drei sichtbaren Karten scrollt ein voller Ledger (bis zehn Marken) mehr, als
   * er zeigt. Weil die Reihenfolge nach Dringlichkeit ordnet, sind die
   * sichtbaren die, die etwas wollen; der Rest wird vom `+N`-Chip gemeldet.
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
   * `getBoundingClientRect()` misst ihn mit.
   *
   * Und die 112 gehören nicht diesem Reiter allein: `FIRMAMENT_CREST_BAND_H`
   * trägt dieselbe Zahl. Beide Reiter legen ein Band über eine grosse Bühne,
   * und bei 126 gegen 108 sprang deren Oberkante beim Wechsel um 18 px. Wer
   * eine der beiden anfasst, fasst beide an.
   *
   * Ändert jemand die Summe, sind beide Tabellen still falsch: die Suite bliebe
   * grün und das Datenband verschwände trotzdem im Browser. Wer hier vorbeikommt,
   * misst neu (`docs/playwright.md`) und führt beide Tabellen nach.
   */
  it('hält die Kopfleiste bei 112 — die Aussenhöhe steckt in STAGE_HEIGHT', () => {
    expect(VOYAGE_COMMAND_BAR_H + 3).toBe(112)
  })

  /**
   * Die Statussäule links: Siegel, Lücke und Uhrzelle teilen sich, was von den
   * 176 px nach Polster und Haarlinie bleibt. Wächst eines davon über die
   * Summe, ist der einzige verbleibende Platz die Kartenspur — und die hat auf
   * Full HD nur 16 px Reserve.
   */
  it('trägt Rangsiegel und Uhr nebeneinander in der Statussäule', () => {
    const inner = VOYAGE_FLEET_RANK_W - VOYAGE_RANK_PAD_R - 1
    const used = VOYAGE_RANK_MEDAL_PX + VOYAGE_RANK_MEDAL_GAP + VOYAGE_RANK_CLOCK_W
    expect(used).toBeLessThanOrEqual(inner)
  })

  /**
   * Ein geliehener Umfang füllt den Ring falsch — dieselbe Hausregel, die
   * `VOYAGE_NODE_RING_CIRCUMFERENCE` schon einmal nötig gemacht hat. Und der
   * Ring samt Strichbreite muss in das Siegel passen, sonst schneidet die
   * viewBox ihn an.
   */
  it('bindet den Ring des Siegels an seinen eigenen Radius', () => {
    expect(VOYAGE_RANK_RING_CIRCUMFERENCE).toBeCloseTo(2 * Math.PI * VOYAGE_RANK_RING_R, 6)
    expect(2 * VOYAGE_RANK_RING_R + VOYAGE_RANK_RING_STROKE).toBeLessThanOrEqual(
      VOYAGE_RANK_MEDAL_PX,
    )
  })

  /** Karten- und Bandhöhe sind gekoppelt: die Karte muss in das Band passen. */
  it('lässt die Karte samt Luft in das Band', () => {
    expect(VOYAGE_FLEET_CARD_H + 2 * VOYAGE_FLEET_CARD_PAD_Y).toBeLessThanOrEqual(
      VOYAGE_COMMAND_BAR_H,
    )
  })

  /**
   * DREI Zeilen, und keine vierte. Die Karte kann in der HÖHE nicht wachsen —
   * 110 bräche schon die Zusicherung darüber, und danach die Kopfleiste, danach
   * beide STAGE_HEIGHT-Tabellen. Wer eine Zeile ergänzt, bricht hier zuerst.
   *
   * Crew 34 + Lohn 28 + Ablesung 20 + 2 x 4 Lücke = 90 von 91 px. Vier waren es
   * einmal: die Kopfzeile (Glyph + Zielname) und die Fortschrittsschiene sind
   * gefallen und haben ihre 31 px an die Portraits und die beiden Zahlenzeilen
   * abgegeben.
   */
  it('trägt die drei Zeilen der Karte samt Lücken', () => {
    const rows = VOYAGE_FLEET_AVATAR_PX + VOYAGE_FLEET_PAY_H + VOYAGE_FLEET_READ_H
    const gaps = 2 * VOYAGE_FLEET_CARD_ROW_GAP
    const inner = VOYAGE_FLEET_CARD_H - 2 * VOYAGE_FLEET_CARD_INSET_Y - VOYAGE_FLEET_CARD_BORDER_Y
    expect(rows + gaps).toBeLessThanOrEqual(inner)
  })

  /**
   * Die LOHNZEILE: Chime-Artwork, der Lohn in 24 px, die Chancen-Pille rechts.
   * Der Lohn gibt nie nach — kürzte er sich weg, verschwände die eine Zahl,
   * wegen der die Zeile da ist.
   *
   * Alle Textbreiten sind im Browser GEMESSEN, nicht gerechnet (MedievalSharp
   * hat keine Tabellenziffern, `docs/playwright.md`): Lohn „999.99M" bei 24 px
   * fett, „100 %" bei 13 px, Uhr „12:00" bei 17 px, Beutezahl „2.6" bei 12 px,
   * Dauer „12m 30s" bei 11 px.
   */
  it('trägt die Lohnzeile samt Chancen-Pille', () => {
    const row =
      VOYAGE_FLEET_CHIME_PX +
      VOYAGE_FLEET_EARN_TIGHT +
      VOYAGE_FLEET_PAY_MAX_PX +
      VOYAGE_FLEET_EARN_TIGHT +
      VOYAGE_FLEET_ODDS_W
    expect(row).toBeLessThanOrEqual(CARD_INNER_W)
  })

  /**
   * Die ABLESEZEILE und ihr schlimmster Fall: ein epic-VERTRAG. Nur dort stehen
   * Reisedauer und Meep gleichzeitig — unterwegs fällt die Dauer weg (die Uhr
   * zählt sie herunter), heimgekehrt ebenso.
   *
   * ZWEI Zusicherungen, weil die Zellen NICHT gleich viel wert sind: Uhr und
   * Loot sind die Auskunft und geben nie nach, die Dauer ist Beiwerk und die
   * einzige Zelle der Karte, die schrumpfen darf.
   */
  it('trägt Uhr und Loot der Ablesezeile in jedem Fall', () => {
    expect(LOOT_W + VOYAGE_FLEET_TIME_W + VOYAGE_FLEET_EARN_GAP).toBeLessThanOrEqual(CARD_INNER_W)
    // Und die Dauer bekommt, was übrig bleibt — auch die längste passt hinein.
    expect(
      VOYAGE_FLEET_TIME_W +
        VOYAGE_FLEET_EARN_GAP +
        LOOT_W +
        VOYAGE_FLEET_EARN_GAP +
        VOYAGE_FLEET_DUR_W,
    ).toBeLessThanOrEqual(CARD_INNER_W)
  })

  /**
   * Die Plakette nimmt das Ende, das der Zustand frei lässt, und muss an BEIDEN
   * passen: heimgekehrt links statt der Uhr, blockiert rechts statt der Dauer.
   * Der zweite Fall ist der engere — dort steht die Uhr noch daneben.
   */
  it('trägt die Plakette an beiden Enden der Ablesezeile', () => {
    const home = VOYAGE_FLEET_MARK_MAX_PX + VOYAGE_FLEET_EARN_GAP + LOOT_W
    const blocked =
      VOYAGE_FLEET_TIME_W +
      VOYAGE_FLEET_EARN_GAP +
      LOOT_W +
      VOYAGE_FLEET_EARN_GAP +
      VOYAGE_FLEET_MARK_MAX_PX
    expect(home).toBeLessThanOrEqual(CARD_INNER_W)
    expect(blocked).toBeLessThanOrEqual(CARD_INNER_W)
  })

  /**
   * Die CREW-Zeile, seit die Portraits auf 34 px gewachsen sind. Der Boden ist
   * der volle Trupp: `EXPEDITION_TIERS.epic.maxRoles` Sitze nebeneinander.
   * Wächst dort jemals eine Stufe, bricht dieser Test — und das ist sein Zweck,
   * denn die Reihe hat weder Umbruch noch Scrollen.
   *
   * Die 34 sind gleich zweimal die Wand: mehr passt hier nicht, und darüber
   * trägt die 128er-Auflösungsstufe des Portraits nicht mehr.
   */
  it('trägt den vollen Trupp in einer Reihe', () => {
    const seats = Math.max(...Object.values(EXPEDITION_TIERS).map((t) => t.maxRoles))
    const row = seats * VOYAGE_FLEET_AVATAR_PX + (seats - 1) * VOYAGE_FLEET_SEAT_GAP
    expect(row).toBeLessThanOrEqual(CARD_INNER_W)
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
