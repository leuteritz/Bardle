import { describe, it, expect } from 'vitest'
import { computeScoreboardFit } from '@/utils/scoreboardFit'
import {
  SCOREBOARD_FIT,
  SCOREBOARD_CREST,
  SCOREBOARD_VALUE_BUDGET,
  BOTTOM_BAR_SIDE_W,
} from '@/config/constants'
import { formatNumberCompact } from '@/config/numberFormat'
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

function cell(
  key: string,
  valueChars: number,
  labelText: string,
  shortText?: string,
): ScoreboardFitCell {
  return {
    key,
    em: digits(valueChars),
    labelEm: label(labelText),
    labelShortEm: label(shortText ?? labelText),
  }
}

/**
 * Geometrie des Scoreboards für eine Desktop-Auflösung — dieselbe Rechnung, die
 * App.vue (--hud-scale) und useScoreboardFit im Browser ergeben:
 * Streifenhöhe (443 − 364) × hud-scale, Hälften = Restbreite neben dem
 * KLEINSTMÖGLICHEN Crest (breiter wird der nur von dem, was die Zellen übrig
 * lassen — genau der Rechenweg des Composables).
 */
function geometryFor(vw: number, vh: number) {
  const hudScale = Math.min(1, Math.max(0.52, Math.min(vw / 2560, vh / 1440)))
  const stripWidth = vw - 2 * BOTTOM_BAR_SIDE_W * hudScale - 2 * SCOREBOARD_FIT.STRIP_PAD_X_PX
  const crestMin = Math.min(SCOREBOARD_CREST.MIN_PX, stripWidth * SCOREBOARD_CREST.MIN_SHARE)
  const crestMax = Math.max(
    crestMin,
    Math.min(SCOREBOARD_CREST.MAX_PX, stripWidth * SCOREBOARD_CREST.MAX_SHARE),
  )
  return {
    stripWidth,
    crestMin,
    crestMax,
    halfWidth: (stripWidth - crestMin) / 2,
    stripHeight: 79 * hudScale,
  }
}

/* Gemessene em-Breiten der beiden Crest-Zeilen — "BARDLE" in Versalien mit
   0.22em Sperrung, der längste Status ("Planet Search · 8:88") mit 0.1em. */
const CREST_TITLE = { em: 6 * (CAP_EM + 0.22), ornamentEm: 0 }
const CREST_STATUS = { em: 20 * (CAP_EM + 0.1), ornamentEm: 1 + 0.32 }

/** Typische Career-Stände: fünf Kampfwerte links, Rang/Bilanz/Objectives rechts. */
function inputFor(vw: number, vh: number, valueChars = 4): ScoreboardFitInput {
  const { halfWidth, stripHeight, crestMin, crestMax } = geometryFor(vw, vh)
  return {
    leftWidth: halfWidth,
    rightWidth: halfWidth,
    stripHeight,
    crestMin,
    crestMax,
    crestTitle: CREST_TITLE,
    crestStatus: CREST_STATUS,
    leftCells: [
      cell('kills', valueChars, 'Kills', 'K'),
      cell('deaths', valueChars, 'Deaths', 'D'),
      cell('assists', valueChars, 'Assists', 'A'),
      cell('gold', valueChars + 1, 'Gold'),
      cell('cs', valueChars, 'CS'),
    ],
    rightCells: [
      { key: 'rank', em: 6 * CAP_EM, labelEm: label('Rank'), labelShortEm: label('Rank') },
      {
        key: 'winLoss',
        em: digits(9),
        labelEm: label('Win / Loss'),
        labelShortEm: label('W / L'),
      },
      cell('turrets', valueChars, 'Turrets', 'Twr'),
      cell('dragons', valueChars, 'Dragons', 'Drg'),
      cell('barons', valueChars, 'Barons', 'Bar'),
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

/** Laptop-Viewports: der flachste Streifen, den --hud-scale zulässt. */
const LAPTOPS: Array<[string, number, number]> = [
  ['hud-scale-Boden 1280×720', 1280, 700],
  ['MacBook Air 13" 1440×900', 1440, 810],
  ['MacBook Pro 16" 1728×1117', 1728, 1030],
]

/** Höhe der Zellspalte: Label-Band + Abstand + höhere von Icon/Zahl. */
function columnHeight(fit: ReturnType<typeof computeScoreboardFit>): number {
  return (
    fit.labelSize * SCOREBOARD_FIT.LABEL_LINE_FACTOR +
    fit.rowGap +
    Math.max(fit.valueSize, fit.iconSize)
  )
}

/** Streifenhöhe abzüglich der Polster, die das Layout tatsächlich freihält. */
function usableHeight(stripHeight: number): number {
  return stripHeight - (SCOREBOARD_FIT.STRIP_PAD_TOP_PX + SCOREBOARD_FIT.STRIP_PAD_BOTTOM_PX)
}

describe('computeScoreboardFit', () => {
  describe.each(RESOLUTIONS)('%s', (_name, vw, vh) => {
    it('lässt beide Hälften nicht überlaufen — nichts wird abgeschnitten', () => {
      const input = inputFor(vw, vh)
      const fit = computeScoreboardFit(input)
      expect(neededWidth(input.leftCells, fit)).toBeLessThanOrEqual(input.leftWidth + 0.01)
      expect(neededWidth(input.rightCells, fit)).toBeLessThanOrEqual(input.rightWidth + 0.01)
    })

    it('hält Label- und Wertzeile innerhalb der nutzbaren Streifenhöhe', () => {
      const input = inputFor(vw, vh)
      const fit = computeScoreboardFit(input)
      expect(columnHeight(fit)).toBeLessThanOrEqual(usableHeight(input.stripHeight) + 0.01)
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

  it('lässt die Werte monoton mit der Breite wachsen — je Caption-Variante', () => {
    // Innerhalb einer Variante muss mehr Breite immer ≥ Größe bedeuten. Über den
    // Variantenwechsel hinweg darf die Zahl einmalig zurückspringen, aber nie
    // weiter als der Gewinn, für den die Kurzform überhaupt gewählt wird.
    for (const useShortLabels of [false, true]) {
      let previous = 0
      for (let width = 300; width <= 1600; width += 25) {
        const fit = computeScoreboardFit({
          ...inputFor(2560, 1310),
          leftWidth: width,
          rightWidth: width,
          useShortLabels,
        })
        expect(fit.valueSize).toBeGreaterThanOrEqual(previous - 0.01)
        previous = fit.valueSize
      }
    }
    let previous = 0
    for (let width = 300; width <= 1600; width += 25) {
      const fit = computeScoreboardFit({
        ...inputFor(2560, 1310),
        leftWidth: width,
        rightWidth: width,
      })
      expect(fit.valueSize).toBeGreaterThanOrEqual(
        previous / SCOREBOARD_FIT.SHORT_LABEL_VALUE_GAIN - 0.01,
      )
      previous = fit.valueSize
    }
  })

  describe.each(LAPTOPS)('%s', (_name, vw, vh) => {
    it('zeigt die Label-Zeile — auf dem flachsten Streifen genauso', () => {
      const fit = computeScoreboardFit(inputFor(vw, vh))
      expect(fit.labelSize).toBeGreaterThanOrEqual(SCOREBOARD_FIT.LABEL_HARD_MIN_PX)
      expect(fit.rowGap).toBeGreaterThan(0)
    })

    it('bleibt in Breite und Höhe im Rahmen', () => {
      const input = inputFor(vw, vh)
      const fit = computeScoreboardFit(input)
      expect(neededWidth(input.leftCells, fit)).toBeLessThanOrEqual(input.leftWidth + 0.01)
      expect(neededWidth(input.rightCells, fit)).toBeLessThanOrEqual(input.rightWidth + 0.01)
      expect(columnHeight(fit)).toBeLessThanOrEqual(usableHeight(input.stripHeight) + 0.01)
    })

    it('lässt Icon und Zahl lesbar — nichts fällt auf die Notgröße zurück', () => {
      const fit = computeScoreboardFit(inputFor(vw, vh))
      expect(fit.iconSize).toBeGreaterThanOrEqual(SCOREBOARD_FIT.ICON_MIN_PX)
      expect(fit.valueSize).toBeGreaterThan(SCOREBOARD_FIT.VALUE_MIN_PX)
    })
  })

  it('gibt jeder Zelle mindestens die Breite ihres eigenen Labels', () => {
    // "0 Drachen" braucht kaum Zahlenbreite, aber das Wort DRAGONS muss passen:
    // ohne label-bewusste Gewichte lief genau diese Zelle in ihre Nachbarn.
    const input = inputFor(1920, 950)
    const fit = computeScoreboardFit(input)
    const half = [...input.rightCells]
    const needSum = half.reduce((sum, c) => sum + fit.grow[c.key], 0)
    for (const c of half) {
      const cellWidth = (fit.grow[c.key] / needSum) * input.rightWidth
      const labelEm = fit.shortLabels ? (c.labelShortEm ?? c.labelEm) : c.labelEm
      expect(cellWidth - fit.cellPad * 2).toBeGreaterThanOrEqual(labelEm * fit.labelSize - 0.01)
    }
  })

  it('wechselt auf die Kurzform, statt das Label unter seine Lesbarkeit zu drücken', () => {
    const roomy = computeScoreboardFit(inputFor(2560, 1310))
    const cramped = computeScoreboardFit({
      ...inputFor(2560, 1310),
      leftWidth: 340,
      rightWidth: 340,
    })
    expect(roomy.shortLabels).toBe(false)
    expect(roomy.labelSize).toBeGreaterThanOrEqual(SCOREBOARD_FIT.LABEL_MIN_PX)
    expect(cramped.shortLabels).toBe(true)
    expect(cramped.labelSize).toBeGreaterThanOrEqual(SCOREBOARD_FIT.LABEL_HARD_MIN_PX)
    // und die Kurzform bezahlt sich: die Zahlen bleiben größer als mit den Wörtern
    const forcedFull = computeScoreboardFit({
      ...inputFor(2560, 1310),
      leftWidth: 300,
      rightWidth: 300,
      leftCells: inputFor(2560, 1310).leftCells.map((c) => ({ ...c, labelShortEm: c.labelEm })),
      rightCells: inputFor(2560, 1310).rightCells.map((c) => ({ ...c, labelShortEm: c.labelEm })),
    })
    expect(cramped.valueSize).toBeGreaterThan(forcedFull.valueSize)
  })

  it('wirft die Label-Zeile erst ab, wenn auch die Kurzform nicht mehr lesbar ist', () => {
    const fit = computeScoreboardFit({
      ...inputFor(2560, 1310),
      leftWidth: 90,
      rightWidth: 90,
    })
    expect(fit.labelSize).toBe(0)
    expect(fit.rowGap).toBe(0)
    // ohne Label-Zeile gehört die ganze Streifenhöhe der Wertzeile
    const withLabels = computeScoreboardFit({
      ...inputFor(2560, 1310),
      leftWidth: 90,
      rightWidth: 90,
      showLabels: true,
      leftCells: inputFor(2560, 1310).leftCells.map((c) => ({ ...c, labelEm: 0, labelShortEm: 0 })),
      rightCells: inputFor(2560, 1310).rightCells.map((c) => ({
        ...c,
        labelEm: 0,
        labelShortEm: 0,
      })),
    })
    expect(fit.valueSize).toBeGreaterThanOrEqual(withLabels.valueSize)
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

  describe('Crest in der Mitte', () => {
    /** Breite, die eine Crest-Zeile mit ihrem Ornament und ihrer Luft belegt. */
    function lineWidth(line: { em: number; ornamentEm: number }, size: number): number {
      return (line.em + line.ornamentEm + 2 * SCOREBOARD_CREST.PAD_EM) * size
    }

    it.each(RESOLUTIONS)('%s: beide Zeilen passen in die Crest-Box', (_name, vw, vh) => {
      const fit = computeScoreboardFit(inputFor(vw, vh))
      expect(lineWidth(CREST_TITLE, fit.crestTitleSize)).toBeLessThanOrEqual(fit.crestWidth + 0.01)
      expect(lineWidth(CREST_STATUS, fit.crestStatusSize)).toBeLessThanOrEqual(
        fit.crestWidth + 0.01,
      )
    })

    /** Was die drei Bänder des Crests zusammen an Höhe belegen. */
    function crestHeight(fit: ReturnType<typeof computeScoreboardFit>): number {
      return (
        fit.crestOrnamentSize +
        fit.crestRowGap +
        fit.crestBand +
        SCOREBOARD_CREST.PROGRESS_RESERVE_PX
      )
    }

    it.each([...RESOLUTIONS, ...LAPTOPS])('%s: keine Zeile ragt aus dem Streifen', (_n, vw, vh) => {
      const input = inputFor(vw, vh)
      const fit = computeScoreboardFit(input)
      // Ornamentreihe + Zeile + Fortschrittsband passen in die Streifenhöhe …
      expect(crestHeight(fit)).toBeLessThanOrEqual(usableHeight(input.stripHeight) + 0.01)
      // … und die Tinte beider Zeilen in das Band, das für sie reserviert ist.
      const ink = (size: number) => size * SCOREBOARD_CREST.INK_HEIGHT_EM
      expect(ink(fit.crestTitleSize)).toBeLessThanOrEqual(fit.crestBand + 0.01)
      expect(ink(fit.crestStatusSize)).toBeLessThanOrEqual(fit.crestBand + 0.01)
      expect(fit.crestTitleSize).toBeGreaterThan(SCOREBOARD_FIT.LABEL_MIN_PX)
    })

    it('hält die Ornamentreihe über beiden Zeilen gleich hoch', () => {
      // Titel und Status teilen sich EIN reserviertes Band — sonst wanderte die
      // Reihe darüber bei jedem Wechsel zwischen den beiden auf und ab.
      const fit = computeScoreboardFit(inputFor(1920, 950))
      expect(fit.crestOrnamentSize).toBeGreaterThanOrEqual(SCOREBOARD_CREST.ORNAMENT_MIN_PX)
      expect(fit.crestOrnamentSize).toBeLessThanOrEqual(SCOREBOARD_CREST.ORNAMENT_MAX_PX)
      expect(fit.crestBand).toBeGreaterThan(0)
    })

    it('nimmt den Hälften nur, was sie übrig lassen', () => {
      for (const [, vw, vh] of RESOLUTIONS) {
        const input = inputFor(vw, vh)
        const fit = computeScoreboardFit(input)
        // Was der Crest über sein Minimum hinaus bekommt, stand in keiner Zelle:
        // die Hälften müssen ihre Inhalte auch danach noch tragen.
        const taken = fit.crestWidth - (input.crestMin ?? 0)
        expect(neededWidth(input.leftCells, fit)).toBeLessThanOrEqual(
          input.leftWidth - taken / 2 + 0.01,
        )
        expect(neededWidth(input.rightCells, fit)).toBeLessThanOrEqual(
          input.rightWidth - taken / 2 + 0.01,
        )
      }
    })

    it('bleibt zwischen Mindest- und Höchstbreite', () => {
      for (const [, vw, vh] of [...RESOLUTIONS, ...LAPTOPS]) {
        const input = inputFor(vw, vh)
        const fit = computeScoreboardFit(input)
        expect(fit.crestWidth).toBeGreaterThanOrEqual((input.crestMin ?? 0) - 0.01)
        expect(fit.crestWidth).toBeLessThanOrEqual((input.crestMax ?? 0) + 0.01)
      }
    })

    it('wächst mit der Auflösung — 4K nie kleiner als Full HD', () => {
      const fhd = computeScoreboardFit(inputFor(1920, 950))
      const qhd = computeScoreboardFit(inputFor(2560, 1310))
      const uhd = computeScoreboardFit(inputFor(3840, 2030))
      expect(qhd.crestTitleSize).toBeGreaterThanOrEqual(fhd.crestTitleSize)
      expect(uhd.crestTitleSize).toBeGreaterThanOrEqual(qhd.crestTitleSize)
      expect(uhd.crestStatusSize).toBeGreaterThanOrEqual(fhd.crestStatusSize)
    })

    it('nutzt den Platz aus — deutlich größer als die alte 30px-Deckelung', () => {
      // Die feste clamp(16px, 2.5cqw, 30px) war der Grund, dass die Mitte auf
      // jeder Desktop-Auflösung kleiner blieb als die Zahlen daneben.
      for (const [, vw, vh] of RESOLUTIONS) {
        expect(computeScoreboardFit(inputFor(vw, vh)).crestTitleSize).toBeGreaterThan(30)
      }
    })

    it('lässt eine längere Zeile kleiner ausfallen, nie überlaufen', () => {
      const input = inputFor(1920, 950)
      const long = computeScoreboardFit({
        ...input,
        crestStatus: { em: CREST_STATUS.em * 2, ornamentEm: CREST_STATUS.ornamentEm },
      })
      expect(long.crestStatusSize).toBeLessThan(computeScoreboardFit(input).crestStatusSize)
      expect(
        lineWidth(
          { em: CREST_STATUS.em * 2, ornamentEm: CREST_STATUS.ornamentEm },
          long.crestStatusSize,
        ),
      ).toBeLessThanOrEqual(long.crestWidth + 0.01)
    })

    it('kommt ohne Crest-Angaben aus', () => {
      const withoutCrest = { ...inputFor(2560, 1310) }
      delete withoutCrest.crestTitle
      delete withoutCrest.crestStatus
      const fit = computeScoreboardFit(withoutCrest)
      expect(fit.crestTitleSize).toBe(0)
      expect(fit.crestStatusSize).toBe(0)
      expect(Number.isFinite(fit.crestWidth)).toBe(true)
    })
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

/**
 * Die festen Zellbreiten stehen und fallen mit dieser Annahme: keine Zahl, die
 * das Scoreboard je rendert, ist breiter als das Budget, für das der Fit die
 * Zelle bemessen hat. Wäre sie es, liefe sie über ihre Zellkante — genau der
 * Überlauf, den die feste Breite ausschließen soll.
 */
describe('SCOREBOARD_VALUE_BUDGET', () => {
  const longest = Math.max(...SCOREBOARD_VALUE_BUDGET.map((text) => text.length))

  it('ist so lang wie die längste Ausgabe von formatNumberCompact', () => {
    for (let exponent = 0; exponent < 33; exponent++) {
      // Werte kurz unter, auf und über jeder Einheitengrenze — dort wechselt
      // das Format Suffix und Nachkommastelle und wird am längsten.
      for (const factor of [1, 1.5, 4.44, 9.99]) {
        const value = factor * 10 ** exponent
        expect(formatNumberCompact(value).length).toBeLessThanOrEqual(longest)
      }
    }
  })

  it('endet an der Exponentialform — der eine Bereich, den es nicht deckt', () => {
    // Ab ~1e33 hat formatNumberCompact keine Einheit mehr und schreibt
    // "1.0e+33" — sieben Zeichen. Das Budget deckt das bewusst NICHT ab: kein
    // Battle-Stat wächst über eine Nonillion, und dafür jede Zelle dauerhaft um
    // 40 % zu verbreitern hieße, die Zahlen für einen unerreichbaren Fall zu
    // verkleinern. Der Test hält fest, wo die Annahme endet.
    expect(formatNumberCompact(1e33).length).toBeGreaterThan(longest)
    expect(formatNumberCompact(9.99e32).length).toBeLessThanOrEqual(longest)
  })

  it('deckt jedes Suffix ab, das der Fit messen muss', () => {
    // Der Fit nimmt den breitesten Kandidaten — fehlt ein Suffix in der Liste,
    // könnte genau dessen Buchstabenpaar breiter bauen als alle gemessenen.
    for (let exponent = 15; exponent <= 30; exponent += 3) {
      const suffix = formatNumberCompact(999 * 10 ** exponent).replace(/[\d.]/g, '')
      expect(SCOREBOARD_VALUE_BUDGET.some((text) => text.endsWith(suffix))).toBe(true)
    }
  })
})
