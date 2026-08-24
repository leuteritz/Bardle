import { describe, it, expect } from 'vitest'
import {
  VOYAGE_MAP_STATS_BAND_H,
  VOYAGE_MAP_STATS_PAD_Y,
  VOYAGE_MAP_STATS_LABEL_MAX,
  VOYAGE_MAP_STATS_TICK_H_MAX,
  VOYAGE_MAP_STATS_VALUE_MAX,
  VOYAGE_MAP_STATS_VALUE_MIN,
  VOYAGE_MAP_STATS_MIN_W,
  VOYAGE_MAP_STATS_WIDE_W,
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
 */
const VALUE_FACTOR = 1.07
const LABEL_FACTOR = 1.34

const STACK_GAP = 3

/** Was zwischen Ober- und Unterkante des Textblocks Platz hat. */
const usable = VOYAGE_MAP_STATS_BAND_H - 2 * VOYAGE_MAP_STATS_PAD_Y

/** Die zweizeilige Grundform: grosse Zahl über ihrem Label. */
function twoLine(value: number, label = VOYAGE_MAP_STATS_LABEL_MAX): number {
  return VALUE_FACTOR * value + LABEL_FACTOR * label
}

/** Die höchste Spalte des Bandes: Segmentleiste, Zahl, Label. */
function chartedColumn(value: number): number {
  return twoLine(value) + VOYAGE_MAP_STATS_TICK_H_MAX + STACK_GAP
}

describe('voyage stats band fit', () => {
  it('lässt die höchste Spalte in die Bandhöhe passen', () => {
    expect(chartedColumn(VOYAGE_MAP_STATS_VALUE_MAX)).toBeLessThanOrEqual(usable)
  })

  it('kippt, sobald der Wert-Deckel steigt', () => {
    // Der eigentliche Zweck der Datei. Der Deckel ist nicht gewählt, sondern
    // gerechnet — wer ihn anhebt, schneidet auf 2K die Labels ab, ohne dass
    // ein Test oder ein Screenshot es zeigt.
    expect(chartedColumn(VOYAGE_MAP_STATS_VALUE_MAX + 2)).toBeGreaterThan(usable)
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
