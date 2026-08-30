import { describe, it, expect } from 'vitest'
import {
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_MAP_STATS_PAD_Y,
  VOYAGE_MAP_STATS_CHIP_MAX,
  VOYAGE_MAP_STATS_LABEL_MAX,
  VOYAGE_MAP_STATS_VALUE_MAX,
  VOYAGE_MAP_STATS_VALUE_MIN,
  VOYAGE_MAP_STATS_MIN_W,
  VOYAGE_MAP_STATS_WIDE_W,
  VOYAGE_MAP_STATS_NAME_MAX,
  VOYAGE_MAP_STATS_NO_MAX,
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
 * Die Faktoren unten sind GEMESSEN, nicht gerechnet: MedievalSharp überschiesst
 * seine Zeilenbox, eine Formel aus `font-size × line-height` läge daneben.
 * Aufgenommen mit dem Playwright-Treiber im Scratchpad an den vier
 * Referenzauflösungen, aus zwei Stützstellen aufgelöst:
 *
 *   Wert 37 / Label 11  →  54.3 px      Wert 42 / Label 15  →  65.0 px
 *
 * Seit das Band vertikal MITTIG steht, ist „passt hinein" zu wenig: es muss
 * oben WIE unten Luft bleiben, sonst ist die Zentrierung nur nominal. Die
 * bindende Zone ist dabei nicht mehr die Kartografie — sie ist gefallen, weil
 * `charted` von keiner Formel des Spiels gelesen wird —, sondern die grosse
 * Ablesung.
 */
const VALUE_FACTOR = 1.07
const LABEL_FACTOR = 1.34
/**
 * Die Identitätszone, ebenfalls GEMESSEN und nicht gerechnet.
 *
 * Ziffer und Name tragen `line-height: 1`, ihre Zeilenbox IST damit die
 * Schriftgrösse — gemessen 21,0 px bei 21 und 24,0 bei 24, der Faktor ist
 * exakt 1. Die Meta-Zeile darunter läuft auf `normal`, und dort überschiesst
 * MedievalSharp: 16,5 px bei 11. Sie teilt sich den Deckel mit den Labels,
 * NICHT deren Faktor.
 */
const TITLE_FACTOR = 1.0
const META_FACTOR = 1.5

const STACK_GAP = 3

/**
 * Luft über UND unter der höchsten Zone. Der Wert ist kein Geschmack: bei
 * weniger als vier Pixeln je Seite berührt die Zeile die Bandkanten, und dann
 * sieht die Zentrierung wieder aus wie das bündige Kleben, das sie ersetzt hat.
 */
const BREATH_MIN = 4

/**
 * Der `border-top` von `.egsb-row` gehört NICHT zur Content-Box und ist der
 * Grund, warum hier 63 und nicht 64 nutzbar sind. Er stand einmal nicht in
 * dieser Rechnung, und die Bilanz lag um genau ihn daneben — dieselbe Klasse
 * Fehler wie die 3 px `gap`, die als `STACK_GAP` daneben stehen: das CSS
 * bestimmt, die Spec spiegelt.
 */
const BORDER_T = 1

/** Was zwischen Ober- und Unterkante des Textblocks Platz hat. */
const usable = VOYAGE_MAP_STATS_BAND_H - 2 * VOYAGE_MAP_STATS_PAD_Y - BORDER_T

/** Die zweizeilige Grundform: grosse Zahl über ihrem Label. */
function twoLine(value: number, label = VOYAGE_MAP_STATS_LABEL_MAX): number {
  return VALUE_FACTOR * value + LABEL_FACTOR * label
}

/** Die höchste Zone: die grosse Ablesung, Zahl über Wort. */
function readColumn(value: number): number {
  return twoLine(value)
}

/** Ein Modifikator-Chip — dieselbe Form, eine Stufe kleiner. */
function modsColumn(): number {
  return (
    META_FACTOR * VOYAGE_MAP_STATS_CHIP_MAX +
    META_FACTOR * VOYAGE_MAP_STATS_LABEL_MAX +
    STACK_GAP
  )
}

/**
 * Die Identitätszone. Die Ziffer steht NEBEN dem Namensstapel, sitzt aber auf
 * dessen erster Grundlinie (`align-items: baseline`) — ist sie grösser als der
 * Name, ragt sie um genau die Differenz nach oben und addiert sie damit zum
 * Stapel. Deshalb bindet hier `max` und nicht der Name.
 *
 * Im Browser bestätigt: 24 + 16,5 + 3 = 43,5 px auf 2K, 41,4 auf Full HD (dort
 * greift der `clamp` und beide Schriften fallen gemeinsam).
 */
function idColumn(): number {
  return (
    TITLE_FACTOR * Math.max(VOYAGE_MAP_STATS_NAME_MAX, VOYAGE_MAP_STATS_NO_MAX) +
    META_FACTOR * VOYAGE_MAP_STATS_LABEL_MAX +
    STACK_GAP
  )
}

describe('voyage stats band fit', () => {
  it('lässt jede der drei Zonen in die Bandhöhe passen', () => {
    for (const h of [idColumn(), readColumn(VOYAGE_MAP_STATS_VALUE_MAX), modsColumn()]) {
      expect(h).toBeLessThanOrEqual(usable)
    }
  })

  it('lässt der höchsten Zone oben wie unten Luft', () => {
    expect(readColumn(VOYAGE_MAP_STATS_VALUE_MAX)).toBeLessThanOrEqual(usable - 2 * BREATH_MIN)
  })

  it('kippt schon bei EINEM Punkt mehr', () => {
    // Der eigentliche Zweck der Datei, und die Wand ist scharf: 37 ergibt 54,33
    // in 55 erlaubten, 38 schon 55,40. Der Deckel ist damit nicht gewählt,
    // sondern der grösstmögliche Wert — wer ihn anhebt, drückt die Zeile an die
    // Bandkanten, und weder ein Test noch ein Screenshot zeigt das von selbst.
    expect(readColumn(VOYAGE_MAP_STATS_VALUE_MAX + 1)).toBeGreaterThan(usable - 2 * BREATH_MIN)
  })

  it('lässt die grosse Ablesung die höchste Zone bleiben', () => {
    // Der Grund, aus dem der Wert-Deckel oben überhaupt gerechnet werden DARF:
    // es gibt genau eine höchste Zone. Wächst eine andere an ihr vorbei, ist der
    // Test darüber die falsche Wand und niemand merkt es.
    const read = readColumn(VOYAGE_MAP_STATS_VALUE_MAX)
    expect(read).toBeGreaterThan(idColumn())
    expect(read).toBeGreaterThan(modsColumn())
  })

  it('hält auch die Grundform am Boden mit Abstand', () => {
    // Auf der schmalsten Bühne greift der Boden; dort muss Luft bleiben, sonst
    // gäbe es keine Bühnengrösse, auf der das Band entspannt sitzt.
    expect(twoLine(VOYAGE_MAP_STATS_VALUE_MIN, 11)).toBeLessThan(usable - 15)
  })

  it('hat einen Boden unter dem Deckel und beide über der heutigen Größe', () => {
    expect(VOYAGE_MAP_STATS_VALUE_MIN).toBeLessThan(VOYAGE_MAP_STATS_VALUE_MAX)
    // 30.4 px war die feste Größe vor dem Umbau — das Band darf auf keiner
    // Auflösung dahinter zurückfallen.
    expect(VOYAGE_MAP_STATS_VALUE_MIN).toBeGreaterThan(30.4)
  })

  it('staffelt die Schwellen aufsteigend', () => {
    expect(VOYAGE_MAP_STATS_MIN_W).toBeLessThan(VOYAGE_MAP_STATS_WIDE_W)
  })
})
