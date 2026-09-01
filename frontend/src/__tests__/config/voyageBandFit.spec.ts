import { describe, it, expect } from 'vitest'
import {
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
    for (const h of [readColumn(VOYAGE_MAP_STATS_VALUE_MAX), modsColumn()]) {
      expect(h).toBeLessThanOrEqual(usable)
    }
  })

  it('lässt der höchsten Zone oben wie unten die zugesagte Luft', () => {
    // Nicht mehr nur BREATH_MIN: der Umbau hat 7,1 px je Seite gebracht, und
    // genau die sind der Grund, warum das Band nicht mehr klemmt. Wer sie
    // wieder verfrühstückt, nimmt dem Umbau seinen Zweck.
    expect(readColumn(VOYAGE_MAP_STATS_VALUE_MAX)).toBeLessThanOrEqual(
      usable - 2 * BREATH_TARGET,
    )
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
