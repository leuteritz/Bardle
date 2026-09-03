import { describe, it, expect } from 'vitest'
import {
  VOYAGE_MAP_LEGEND_ICONS_MIN_W,
  VOYAGE_MAP_LEGEND_ICON_MAX,
  VOYAGE_MAP_LEGEND_ICON_MIN,
  VOYAGE_MAP_LEGEND_LABEL_MAX,
  VOYAGE_MAP_LEGEND_LABEL_MIN,
  VOYAGE_MAP_LEGEND_MIN_W,
  VOYAGE_MAP_LEGEND_NEED_FULL,
  VOYAGE_MAP_LEGEND_NEED_ICONS,
  VOYAGE_MAP_LEGEND_R_RATIO,
  VOYAGE_MAP_LEGEND_SEAM_MIN,
  VOYAGE_MAP_LEGEND_ROWS,
  VOYAGE_MAP_STATS_ART_MAX,
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_MAP_STATS_CHIP_LABEL_MAX,
  VOYAGE_MAP_STATS_CHIP_MAX,
  VOYAGE_MAP_STATS_ICON_MAX,
  VOYAGE_MAP_STATS_LABEL_MAX,
  VOYAGE_MAP_STATS_MIN_W,
  VOYAGE_MAP_STATS_PAD_Y,
  VOYAGE_MAP_STATS_ROW_NEED_MIN,
  VOYAGE_MAP_STATS_VALUE_MAX,
  VOYAGE_MAP_STATS_VALUE_MIN,
} from '@/config/constants'

/**
 * Das Datenband darf seine Höhe nicht sprengen.
 *
 * `VOYAGE_MAP_STATS_BAND_H` ist über `voyagesAtlasLayout.spec.ts` an die
 * Klickflächengeometrie der Häfen gebunden und kann deshalb NICHT wachsen, wenn
 * jemand die Schrift anhebt. Was dann passiert, sieht man nicht: die Spalten
 * haben `overflow: visible`, also meldet kein `scrollHeight` einen Überlauf —
 * die Labels werden schlicht vom `overflow: hidden` der Bühne abgeschnitten.
 * Genau das ist beim Bau einmal passiert, auf 2K, unbemerkt von zwei
 * Browsermessungen.
 *
 * **Die Faktoren unten sind nicht mehr gemessene Überschüsse, sondern die
 * Zeilenhöhen aus dem CSS** — und das ist der eigentliche Gewinn des Umbaus.
 * Vorher liefen Wert und Label auf `line-height: normal`, wo MedievalSharp
 * seine Zeilenbox um die Hälfte überschiesst (16,5 px bei 11); die Bilanz
 * musste diesen Überschuss als gemessene Konstante mitschleppen. Jetzt tragen
 * beide eine gesetzte Zeilenhöhe, die Box hugt die Tinte, und die Spec spiegelt
 * schlicht das CSS. Im Browser gegengeprüft, gleich auf Full HD, 2K UND 4K:
 *
 *   Wert 37 → 34,77 (Faktor 0,9396)   ·   Label 11 → 11,00 (Faktor 1,0)
 *   Ablesungsspalte 48,77             ·   Chipspalte 30,92 (FHD) / 32,00 (2K+)
 *
 * Die Identitätszone (Ziffer, Name, Stufe) ist gefallen — sie stand vollständig
 * ein zweites Mal in der markierten Leistenzeile. Ihre Deckel
 * `VOYAGE_MAP_STATS_NAME_MAX` / `_NO_MAX` sind damit aus dieser Bilanz
 * verschwunden. Der PAYOUT ist an ihre Stelle getreten, aber als zweite
 * `readColumn` und nicht als eigene Form: er teilt die Wand der grossen
 * Ablesung, statt eine neue zu setzen.
 */

/** `line-height` von `.egsb-val`. Das CSS bestimmt, die Spec spiegelt. */
const VALUE_LINE = 0.94
/** `line-height` von `.egsb-lbl`. */
const LABEL_LINE = 1.0
/** `line-height` von `.egsb-mod-top`. */
const CHIP_LINE = 1.0
/**
 * `.egsb-lbl--chip` läuft als EINZIGE noch auf `normal` — mit `line-height: 1`
 * stand der Chip-Stapel im Browser gemessen 2,31 px zu tief. Der Faktor ist
 * dort gemessen: 12,0 px bei 10.
 */
const CHIP_LABEL_FACTOR = 1.2

/** `gap` der Stapel im CSS. */
const STACK_GAP = 3

/**
 * Der weiteste Ausschlag einer der fünf Legendenmarken, in Radien: der Saum des
 * verlorenen Sterns bei `r * 1.3`. NICHT `LANDMARK_PAD_SPAN` — das ist der
 * Sprite-Rand samt Blur, der beschnitten werden darf und auch immer wurde.
 */
const LEGEND_REACH = 1.3

/** Der `clamp`-Boden von `.egsb-lbl--chip` — die kleinste Schrift des Bandes. */
const BAND_LABEL_FLOOR = 8

/**
 * Was die ÜBRIGEN Zonen samt Zeilenpolster an der jeweiligen Schwelle belegen —
 * im Browser gemessen, hier gespiegelt. Keine Konstante über alle Breiten: die
 * `clamp` des Bandes wachsen mit.
 *
 * Sie stehen hier und nicht in `constants/`, weil sie nichts steuern — sie
 * belegen nur, dass beide Schwellen die Naht wirklich offen lassen.
 */
const ZONES_AT_FULL = 576
const ZONES_AT_ICONS = 528

/**
 * Luft über UND unter der höchsten Zone. Der Wert ist kein Geschmack: bei
 * weniger als vier Pixeln je Seite berührt die Zeile die Bandkanten, und dann
 * sieht die Zentrierung wieder aus wie das bündige Kleben, das sie ersetzt hat.
 */
const BREATH_MIN = 4

/**
 * Die Luft, die der Umbau tatsächlich gebracht hat und die gehalten werden
 * soll — im Browser gemessen 7,11 oben und 7,13 unten. Sie ist der Grund, aus
 * dem `VALUE_MAX` UNTER seiner Wand bleibt (siehe dort).
 */
const BREATH_TARGET = 7

/**
 * Der `border-top` von `.egsb-row` gehört NICHT zur Content-Box und ist der
 * Grund, warum hier 63 und nicht 64 nutzbar sind. Er stand einmal nicht in
 * dieser Rechnung, und die Bilanz lag um genau ihn daneben — dieselbe Klasse
 * Fehler wie die 3 px `gap`, die als `STACK_GAP` daneben stehen: das CSS
 * bestimmt, die Spec spiegelt.
 */
const BORDER_T = 1

/**
 * Waagerechtes Polster von `.egsb-row` — `clamp(12px, 1.5cqw, 30px)`; auf der
 * schmalsten gezeigten Zeile greift der BODEN.
 */
const ROW_PAD_X = 12

/** Was zwischen Ober- und Unterkante des Textblocks Platz hat. */
const usable = VOYAGE_MAP_STATS_BAND_H - 2 * VOYAGE_MAP_STATS_PAD_Y - BORDER_T

/**
 * Die höchste Zone: die grosse Ablesung, Zahl über Wort. Es gibt DREI davon —
 * Sterne, Fahrten und seit dem Fall der Identität auch der Payout. Alle drei
 * tragen `VOYAGE_MAP_STATS_VALUE_MAX`, also rechnet eine Formel für alle.
 */
function readColumn(value: number): number {
  return VALUE_LINE * value + STACK_GAP + LABEL_LINE * VOYAGE_MAP_STATS_LABEL_MAX
}

/**
 * Sonde und Wort stehen NEBENeinander, nicht übereinander — die Höhe ist
 * deshalb keine Summe, sondern das Maximum, und die Kachel gewinnt sie klar.
 */
const LEGEND_LABEL_LINE = 1.2
/** Gerechnet wird am DECKEL der Spanne: dort ist die Zone am höchsten. */
function legendColumn(): number {
  return Math.max(VOYAGE_MAP_LEGEND_ICON_MAX, LEGEND_LABEL_LINE * VOYAGE_MAP_LEGEND_LABEL_MAX)
}

/**
 * Ein Kosten-Chip. Seine erste Zeile ist NICHT die Zahl, sondern das HÖHERE von
 * Zahl und Glyph: das Icon misst 17 gegen 16 und bestimmt damit die Zeile — im
 * Browser gemessen 17,0. Wer das Glyph anhebt, hebt die ganze Zone.
 */
function modsColumn(): number {
  return (
    Math.max(CHIP_LINE * VOYAGE_MAP_STATS_CHIP_MAX, VOYAGE_MAP_STATS_ICON_MAX) +
    STACK_GAP +
    CHIP_LABEL_FACTOR * VOYAGE_MAP_STATS_CHIP_LABEL_MAX
  )
}

/**
 * Der grösstmögliche Wert-Deckel: `0,94 v + 14 <= 55`. Er lag vor dem Umbau bei
 * 37 und ist mit der gesetzten Zeilenhöhe der Beschriftung auf 43 gestiegen.
 * `VALUE_MAX` folgt ihm bewusst NICHT — die gewonnenen Pixel gehen an die Luft,
 * nicht an die Schrift, sonst wäre das Band wieder so eng wie zuvor.
 */
const VALUE_WALL = 43

describe('voyage stats band fit', () => {
  it('lässt jede Zone in die Bandhöhe passen', () => {
    for (const h of [readColumn(VOYAGE_MAP_STATS_VALUE_MAX), modsColumn(), legendColumn()]) {
      expect(h).toBeLessThanOrEqual(usable)
    }
  })

  it('lässt der höchsten Zone oben wie unten die zugesagte Luft', () => {
    // Nicht mehr nur BREATH_MIN: der Umbau hat 7,1 px je Seite gebracht, und
    // genau die sind der Grund, warum das Band nicht mehr klemmt. Wer sie
    // wieder verfrühstückt, nimmt dem Umbau seinen Zweck.
    expect(readColumn(VOYAGE_MAP_STATS_VALUE_MAX)).toBeLessThanOrEqual(usable - 2 * BREATH_TARGET)
  })

  it('nennt die Wand, und der Deckel bleibt darunter', () => {
    // Die Wand ist scharf und gerechnet, nicht gewählt: 43 ergibt 54,42 in 55
    // erlaubten, 44 schon 55,36. `VALUE_MAX` darf bis dorthin, muss aber nicht
    // — und solange es darunter bleibt, hält der Test darüber die grössere
    // Zusage.
    expect(readColumn(VALUE_WALL)).toBeLessThanOrEqual(usable - 2 * BREATH_MIN)
    expect(readColumn(VALUE_WALL + 1)).toBeGreaterThan(usable - 2 * BREATH_MIN)
    expect(VOYAGE_MAP_STATS_VALUE_MAX).toBeLessThanOrEqual(VALUE_WALL)
  })

  it('hält die Formlegende unter der höchsten Zone', () => {
    // Sie war einmal die flachste Zone; seit sie mitwächst, liegt `modsColumn`
    // (32) INNERHALB ihrer Spanne. Der Grund der Regel bleibt derselbe: es muss
    // genau EINE höchste Zone geben, sonst ist die Wand, gegen die alle
    // Schriftdeckel des Bandes gerechnet sind, die falsche — und das merkt
    // niemand. Wer den Kachel-Deckel anhebt, scheitert hier.
    expect(legendColumn()).toBeLessThan(readColumn(VOYAGE_MAP_STATS_VALUE_MAX))
  })

  it('lässt die Marke ihre Kachel füllen, an BEIDEN Enden der Spanne', () => {
    // Gemessen wird gegen den ZEICHENBEDARF der Marke, nicht gegen
    // `LANDMARK_PAD_SPAN`: das ist der Sprite-Rand samt `shadowBlur`, der schon
    // immer beschnitten wurde (bei 4,4 in 22 lag er mit 40 px weit darüber).
    // Maßgeblich ist, was die Marke selbst belegt.
    //
    // Beide Enden, weil der Radius der Kachel FOLGT: ein Verhältnis, das oben
    // passt, kann unten sprengen. Dazwischen ist nichts zu prüfen — die
    // Beziehung ist linear.
    for (const icon of [VOYAGE_MAP_LEGEND_ICON_MIN, VOYAGE_MAP_LEGEND_ICON_MAX]) {
      const reach = 2 * LEGEND_REACH * (icon / VOYAGE_MAP_LEGEND_R_RATIO)
      expect(reach).toBeLessThanOrEqual(icon)
      // Und sie soll die Kachel auch WIRKLICH füllen — der ganze Umbau war,
      // dass eine Marke bei 4,4 in 22 nur gut die Hälfte einnahm.
      expect(reach).toBeGreaterThan(0.7 * icon)
    }
  })

  it('hat eine Spanne, die nach oben zeigt', () => {
    expect(VOYAGE_MAP_LEGEND_ICON_MIN).toBeLessThan(VOYAGE_MAP_LEGEND_ICON_MAX)
    expect(VOYAGE_MAP_LEGEND_LABEL_MIN).toBeLessThan(VOYAGE_MAP_LEGEND_LABEL_MAX)
  })

  it('lässt das Wort der Legende mitwachsen, ohne die Zone zu heben', () => {
    // Es stand einmal fest auf 9 und war die leiseste Schrift des Bandes — eine
    // Lesehilfe, die man nicht lesen kann, ist keine. Der Deckel darf ÜBER
    // `VOYAGE_MAP_STATS_LABEL_MAX` liegen: dort ist 11 der Deckel einer Zone,
    // die selbst mitwächst. Die Rangordnung trägt die DECKKRAFT (0,42 gegen
    // 0,52), nicht die Grösse.
    //
    // Gebunden ist stattdessen, dass das Wort die Zonenhöhe nicht bestimmt —
    // sonst hinge die Höhenbilanz an einer Schrift statt an der Kachel.
    expect(LEGEND_LABEL_LINE * VOYAGE_MAP_LEGEND_LABEL_MAX).toBeLessThan(
      VOYAGE_MAP_LEGEND_ICON_MAX,
    )
    // Der Boden ist der des ganzen Bandes: `.egsb-lbl--chip` läuft auf
    // `clamp(8px, …)` und ist die kleinste Schrift im Fuss. Darunter zu gehen
    // hiesse, im Band eine Schrift zu führen, die es sonst nirgends erlaubt.
    expect(VOYAGE_MAP_LEGEND_LABEL_MIN).toBeGreaterThanOrEqual(BAND_LABEL_FLOOR)
  })

  it('zeigt die Legende erst, wo die Kosten schon stehen', () => {
    // Sie ist die NACHRANGIGE Auskunft. Andersherum erklärte das Band seine
    // Formen, bevor es seine Zahlen zeigt.
    expect(VOYAGE_MAP_LEGEND_ICONS_MIN_W).toBeGreaterThan(VOYAGE_MAP_STATS_MIN_W)
  })

  it('staffelt die zwei Stufen in der richtigen Reihenfolge', () => {
    expect(VOYAGE_MAP_LEGEND_NEED_ICONS).toBeLessThan(VOYAGE_MAP_LEGEND_NEED_FULL)
    expect(VOYAGE_MAP_LEGEND_ICONS_MIN_W).toBeLessThan(VOYAGE_MAP_LEGEND_MIN_W)
  })

  it('spiegelt Messwerte, die miteinander verträglich sind', () => {
    // Hier stand einmal `MIN_W - ICONS_MIN_W >= NEED_FULL - NEED_ICONS` — der
    // Gedanke, der Schwellenabstand müsse den Mehrbedarf der Wörter allein
    // tragen. Das ist falsch, und die Messung zeigt es: zwischen den beiden
    // Schwellen wachsen auch die ÜBRIGEN Zonen (528 → 576), die volle Stufe
    // bekommt ihren Platz also aus zwei Quellen. Die Zusage schlug fehl,
    // obwohl im Browser an beiden Schwellen der zugesagte Rest stand.
    //
    // Was den stillen Überlauf wirklich abfängt, ist die Naht-Rechnung darüber.
    // Hier bleibt die Plausibilität der gespiegelten Messwerte: die übrigen
    // Zonen wachsen mit der Bühne, wer das umdreht, hat sich vermessen.
    expect(ZONES_AT_ICONS).toBeLessThan(ZONES_AT_FULL)
    expect(VOYAGE_MAP_LEGEND_NEED_ICONS).toBeLessThan(VOYAGE_MAP_LEGEND_NEED_FULL)
  })

  it('hält an beiden Schwellen den Rest zum Payout', () => {
    // Gemessen, hier gespiegelt: an ihrer Schwelle lässt jede Stufe den
    // zugesagten Spalt zum Payout. Er war einmal die volle Bandhöhe — die Fuge
    // sollte so breit sein wie das Band hoch. Seit die Legende den freien Fuss
    // NUTZEN soll statt ihn freizuhalten, ist er ein Spalt, und die Trennung
    // trägt die kräftige Haarlinie der Payout-Spalte (0,62) allein.
    //
    // Das ist zugleich die Zusicherung gegen den stillen Überlauf: die Zeile
    // steht auf `nowrap`, und kein `scrollHeight` meldet, wenn sie
    // abgeschnitten wird.
    const seamFull = VOYAGE_MAP_LEGEND_MIN_W - VOYAGE_MAP_LEGEND_NEED_FULL - ZONES_AT_FULL
    const seamIcons = VOYAGE_MAP_LEGEND_ICONS_MIN_W - VOYAGE_MAP_LEGEND_NEED_ICONS - ZONES_AT_ICONS
    expect(seamFull).toBeGreaterThanOrEqual(VOYAGE_MAP_LEGEND_SEAM_MIN)
    expect(seamIcons).toBeGreaterThanOrEqual(VOYAGE_MAP_LEGEND_SEAM_MIN)
  })

  it('führt fünf Marken, und jede genau einmal', () => {
    // Tor und Ankunftsportal stehen bewusst nicht drin, Landfall steht als EINE
    // Zeile für alle sechs Orte. Ein sechster Eintrag kippt die Breitenbilanz
    // oben, ein doppelter wäre eine Silhouette, die zweimal etwas bedeutet.
    expect(VOYAGE_MAP_LEGEND_ROWS).toHaveLength(5)
    expect(new Set(VOYAGE_MAP_LEGEND_ROWS.map((r) => r.kind)).size).toBe(5)
    expect(new Set(VOYAGE_MAP_LEGEND_ROWS.map((r) => r.label)).size).toBe(5)
    // Seit dem Fall der Wörter ist der Satz die EINZIGE Textquelle der Reihe —
    // fehlt einer, sagt seine Kachel gar nichts mehr.
    expect(new Set(VOYAGE_MAP_LEGEND_ROWS.map((r) => r.tip)).size).toBe(5)
    for (const row of VOYAGE_MAP_LEGEND_ROWS) expect(row.tip.length).toBeGreaterThan(0)
  })

  it('lässt die grosse Ablesung die höchste Zone bleiben', () => {
    // Der Grund, aus dem der Wert-Deckel oben überhaupt gerechnet werden DARF:
    // es gibt genau eine höchste Form. Wächst eine andere an ihr vorbei, ist der
    // Test darüber die falsche Wand und niemand merkt es. Der Payout ist keine
    // andere — er IST eine `readColumn`, und genau das hält die Bilanz bei einer
    // einzigen Wand statt bei zweien.
    expect(readColumn(VOYAGE_MAP_STATS_VALUE_MAX)).toBeGreaterThan(modsColumn())
  })

  it('hält das Chime-Artwork unter der Zeilenbox seiner Zahl', () => {
    // Der Payout stellt ein Bild neben seine Zahl. Wird es höher als deren
    // Zeilenbox, bestimmt AB DANN das Bild die Spaltenhöhe — und die Rechnung
    // oben, die nur Schriftgrössen kennt, ginge still daneben. Dieselbe Falle
    // wie beim Chip-Glyph, nur dort ist sie schon eingetreten und steht in
    // `modsColumn` als `Math.max`.
    expect(VOYAGE_MAP_STATS_ART_MAX).toBeLessThan(VALUE_LINE * VOYAGE_MAP_STATS_VALUE_MAX)
  })

  it('hält auch die Grundform am Boden mit Abstand', () => {
    // Auf der schmalsten Bühne greift der Boden; dort muss Luft bleiben, sonst
    // gäbe es keine Bühnengrösse, auf der das Band entspannt sitzt.
    expect(readColumn(VOYAGE_MAP_STATS_VALUE_MIN)).toBeLessThan(usable - 15)
  })

  it('hat einen Boden unter dem Deckel und beide über der heutigen Größe', () => {
    expect(VOYAGE_MAP_STATS_VALUE_MIN).toBeLessThan(VOYAGE_MAP_STATS_VALUE_MAX)
    // 30.4 px war die feste Größe vor dem Umbau — das Band darf auf keiner
    // Auflösung dahinter zurückfallen.
    expect(VOYAGE_MAP_STATS_VALUE_MIN).toBeGreaterThan(30.4)
  })

  it('hält die Chip-Beschriftung unter der grossen', () => {
    // Eine Koste ist ein Merkmal des Ziels, keine Bilanz des Laufs — sie bleibt
    // auch im Wort kleiner. Gleich gross gesetzt wären die beiden Ebenen des
    // Bandes nicht mehr auseinanderzuhalten, und genau das war der Zustand,
    // bevor die Quellreihenfolge von `.egsb-lbl--chip` korrigiert wurde: der
    // Block stand VOR `.egsb-lbl`, bei gleicher Spezifität, und griff nie.
    expect(VOYAGE_MAP_STATS_CHIP_LABEL_MAX).toBeLessThan(VOYAGE_MAP_STATS_LABEL_MAX)
    expect(VOYAGE_MAP_STATS_CHIP_MAX).toBeLessThan(VOYAGE_MAP_STATS_VALUE_MIN)
  })

  it('laesst alle vier Kosten auf der schmalsten gezeigten Zeile stehen', () => {
    // Es gab hier einmal eine zweite Schwelle (`_WIDE_W`, 900), unter der
    // Hazards und Crew wegfielen — eine Folge der Identitätszone, deren rund
    // 195 px der Reihe fehlten. Ohne sie passen alle vier überall, wo die Zone
    // überhaupt steht (gemessen 494 px Bedarf in einer Zeile von 566), und eine
    // Schwelle, die nie greift, ist keine Zusicherung. Was bleibt, ist der
    // Deckel: die Reihe steht auf `nowrap`, ihr Überlauf wird STILL
    // abgeschnitten — hier bricht, wer einen fünften Chip anhängt.
    expect(VOYAGE_MAP_STATS_ROW_NEED_MIN).toBeLessThan(VOYAGE_MAP_STATS_MIN_W - 2 * ROW_PAD_X)
  })
})
