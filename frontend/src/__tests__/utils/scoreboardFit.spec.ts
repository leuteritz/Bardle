import { describe, it, expect } from 'vitest'
import { computeScoreboardFit } from '@/utils/scoreboardFit'
import { SCOREBOARD_FIT, BOTTOM_BAR_SIDE_W } from '@/config/constants'
import type { ScoreboardFitCell, ScoreboardFitInput } from '@/types'

/* Gemessene em-Breiten der echten Schrift (MedievalSharp) in der Größenordnung,
   die die Probes im Browser liefern: Tabellenziffern ~0.52em, Versalien ~0.62em. */
const DIGIT_EM = 0.52
const CAP_EM = 0.62

function digits(count: number): number {
  return count * DIGIT_EM
}

/** Label-Breite in em — "WIN / LOSS" ist mit 10 Zeichen das längste. */
function label(text: string): number {
  return text.length * (CAP_EM + 0.16) // + letter-spacing: 0.16em
}

function cell(key: string, valueChars: number, labelText: string): ScoreboardFitCell {
  return { key, em: digits(valueChars), labelEm: label(labelText) }
}

/**
 * Geometrie des Scoreboards für eine Desktop-Auflösung — dieselbe Rechnung, die
 * App.vue (--hud-scale) und das Layout im Browser ergeben:
 * Streifenhöhe (443 − 367) × hud-scale, Hälften = Restbreite neben dem Crest.
 */
function geometryFor(vw: number, vh: number) {
  const hudScale = Math.min(1, Math.max(0.52, Math.min(vw / 2560, vh / 1440)))
  const boardW = vw - 2 * BOTTOM_BAR_SIDE_W * hudScale - 24
  const crestW = Math.min(300, Math.max(160, boardW * 0.24))
  return { halfWidth: (boardW - crestW) / 2, stripHeight: 76 * hudScale }
}

/** Typische Career-Stände: fünf Kampfwerte links, Rang/Bilanz/Objectives rechts. */
function inputFor(vw: number, vh: number, valueChars = 4): ScoreboardFitInput {
  const { halfWidth, stripHeight } = geometryFor(vw, vh)
  return {
    leftWidth: halfWidth,
    rightWidth: halfWidth,
    stripHeight,
    leftCells: [
      cell('kills', valueChars, 'Kills'),
      cell('deaths', valueChars, 'Deaths'),
      cell('assists', valueChars, 'Assists'),
      cell('gold', valueChars + 1, 'Gold'),
      cell('cs', valueChars, 'CS'),
    ],
    rightCells: [
      { key: 'rank', em: 6 * CAP_EM, labelEm: label('Rank') },
      { key: 'winLoss', em: digits(9), labelEm: label('Win / Loss') },
      cell('turrets', valueChars, 'Turrets'),
      cell('dragons', valueChars, 'Dragons'),
      cell('barons', valueChars, 'Barons'),
    ],
  }
}

/** Breite, die eine Zelle tatsächlich braucht — Icon + Gap + Paddings + Text. */
function neededWidth(
  cells: ScoreboardFitCell[],
  fit: ReturnType<typeof computeScoreboardFit>,
): number {
  const fixed = fit.iconSize + fit.iconGap + fit.cellPad * 2
  return (
    cells.reduce(
      (sum, c) => sum + fixed + c.em * (c.stacked ? fit.stackedValueSize : fit.valueSize),
      0,
    ) +
    (cells.length - 1) * SCOREBOARD_FIT.CELL_DIVIDER_PX
  )
}

/** Referenz-Auflösungen aus CLAUDE.md (Viewport nach Abzug des Browser-Chrome). */
const RESOLUTIONS: Array<[string, number, number]> = [
  ['Full HD 1920×1080', 1920, 950],
  ['WUXGA 1920×1200', 1920, 1070],
  ['2K/QHD 2560×1440', 2560, 1310],
  ['4K 3840×2160', 3840, 2030],
]

describe('computeScoreboardFit', () => {
  describe.each(RESOLUTIONS)('%s', (_name, vw, vh) => {
    it('lässt beide Hälften nicht überlaufen — nichts wird abgeschnitten', () => {
      const input = inputFor(vw, vh)
      const fit = computeScoreboardFit(input)
      expect(neededWidth(input.leftCells, fit)).toBeLessThanOrEqual(input.leftWidth + 0.01)
      expect(neededWidth(input.rightCells, fit)).toBeLessThanOrEqual(input.rightWidth + 0.01)
    })

    it('hält die Wertzeile innerhalb der Streifenhöhe', () => {
      const input = inputFor(vw, vh)
      const fit = computeScoreboardFit(input)
      const rows = fit.labelSize * 1.05 + fit.rowGap + Math.max(fit.valueSize, fit.iconSize)
      expect(rows).toBeLessThanOrEqual(input.stripHeight)
    })

    it('bleibt auch mit sehr langen Zahlen im Rahmen', () => {
      const input = inputFor(vw, vh, 7)
      const fit = computeScoreboardFit(input)
      expect(neededWidth(input.leftCells, fit)).toBeLessThanOrEqual(input.leftWidth + 0.01)
      expect(fit.valueSize).toBeGreaterThanOrEqual(SCOREBOARD_FIT.VALUE_MIN_PX)
    })

    it('nutzt den Platz aus — deutlich über der Notgröße', () => {
      const fit = computeScoreboardFit(inputFor(vw, vh))
      expect(fit.valueSize).toBeGreaterThan(SCOREBOARD_FIT.VALUE_MIN_PX * 1.5)
      expect(fit.valueSize).toBeLessThanOrEqual(SCOREBOARD_FIT.VALUE_MAX_PX)
    })
  })

  it('gibt jeder Zelle genau eine Größe — alle Werte sind gleich groß', () => {
    const fit = computeScoreboardFit(inputFor(2560, 1310))
    // Eine einzige valueSize für alle zehn Zellen; nur die gestapelte Bilanz
    // darf kleiner ausfallen, weil sie zwei Zeilen in eine Reihe legt.
    expect(fit.stackedValueSize).toBeLessThanOrEqual(fit.valueSize)
  })

  it('gewichtet breite Zellen stärker als schmale', () => {
    const input = inputFor(2560, 1310)
    const fit = computeScoreboardFit({
      ...input,
      leftCells: [
        cell('short', 1, 'Kills'),
        cell('long', 6, 'Gold'),
        cell('mid', 3, 'CS'),
        cell('mid2', 3, 'Deaths'),
        cell('mid3', 3, 'Assists'),
      ],
    })
    expect(fit.grow.long).toBeGreaterThan(fit.grow.mid)
    expect(fit.grow.mid).toBeGreaterThan(fit.grow.short)
  })

  it('wächst mit der Auflösung — 4K nie kleiner als Full HD', () => {
    const fhd = computeScoreboardFit(inputFor(1920, 950))
    const qhd = computeScoreboardFit(inputFor(2560, 1310))
    const uhd = computeScoreboardFit(inputFor(3840, 2030))
    expect(qhd.valueSize).toBeGreaterThanOrEqual(fhd.valueSize)
    expect(uhd.valueSize).toBeGreaterThanOrEqual(qhd.valueSize)
    expect(uhd.iconSize).toBeGreaterThanOrEqual(fhd.iconSize)
  })

  it('lässt die Werte monoton mit der Breite wachsen', () => {
    let previous = 0
    for (let width = 300; width <= 1600; width += 25) {
      const fit = computeScoreboardFit({ ...inputFor(2560, 1310), leftWidth: width, rightWidth: width })
      expect(fit.valueSize).toBeGreaterThanOrEqual(previous - 0.01)
      previous = fit.valueSize
    }
  })

  it('wirft die Label-Zeile ab, statt sie unlesbar klein zu setzen — und vergrößert dann die Zahlen', () => {
    const roomy = computeScoreboardFit(inputFor(2560, 1310))
    const cramped = computeScoreboardFit({
      ...inputFor(2560, 1310),
      leftWidth: 260,
      rightWidth: 260,
    })
    expect(roomy.labelSize).toBeGreaterThanOrEqual(SCOREBOARD_FIT.LABEL_MIN_PX)
    expect(cramped.labelSize).toBe(0)
    expect(cramped.rowGap).toBe(0)
    // ohne Label-Zeile gehört die ganze Streifenhöhe der Wertzeile
    const withLabels = computeScoreboardFit({
      ...inputFor(2560, 1310),
      leftWidth: 260,
      rightWidth: 260,
      showLabels: true,
      leftCells: inputFor(2560, 1310).leftCells.map((c) => ({ ...c, labelEm: 0 })),
      rightCells: inputFor(2560, 1310).rightCells.map((c) => ({ ...c, labelEm: 0 })),
    })
    expect(cramped.valueSize).toBeGreaterThanOrEqual(withLabels.valueSize)
  })

  it('lässt das Icon lieber weg, als es zum Fleck schrumpfen zu lassen', () => {
    const fit = computeScoreboardFit({
      ...inputFor(1920, 950),
      leftWidth: 150,
      rightWidth: 150,
    })
    expect(fit.iconSize).toBe(0)
    expect(fit.iconGap).toBe(0)
    expect(fit.valueSize).toBeGreaterThanOrEqual(SCOREBOARD_FIT.VALUE_MIN_PX)
  })

  it('hält Icons zwischen Lesbarkeitsgrenze und Maximum', () => {
    for (const [, vw, vh] of RESOLUTIONS) {
      const fit = computeScoreboardFit(inputFor(vw, vh))
      expect(fit.iconSize).toBeGreaterThanOrEqual(SCOREBOARD_FIT.ICON_MIN_PX)
      expect(fit.iconSize).toBeLessThanOrEqual(SCOREBOARD_FIT.ICON_MAX_PX)
    }
  })

  it('überlebt entartete Geometrie ohne NaN', () => {
    const fit = computeScoreboardFit({
      leftWidth: 0,
      rightWidth: 0,
      stripHeight: 0,
      leftCells: [],
      rightCells: [],
    })
    expect(Number.isFinite(fit.valueSize)).toBe(true)
    expect(Number.isFinite(fit.iconSize)).toBe(true)
    expect(fit.grow).toEqual({})
  })
})
