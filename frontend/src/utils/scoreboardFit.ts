import { SCOREBOARD_FIT, SCOREBOARD_CREST } from '@/config/constants'
import type {
  ScoreboardCrestLine,
  ScoreboardFit,
  ScoreboardFitInput,
  ScoreboardFitCell,
} from '@/types'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Width one cell needs at a given value size: icon + gap + paddings + text. */
function cellNeed(cell: ScoreboardFitCell, fixed: number, valueSize: number): number {
  return fixed + cell.em * valueSize
}

/** Width the cell's caption alone needs: the label plus its paddings. */
function labelNeed(cell: ScoreboardFitCell, labelSize: number, cellPad: number): number {
  return cell.labelEm * labelSize + cellPad * 2
}

/** Text width of one half at font-size 1px. */
function emSumOf(cells: ScoreboardFitCell[]): number {
  return cells.reduce((sum, cell) => sum + cell.em, 0)
}

/** Width of one half that no text can use: dividers between the cells. */
function dividersOf(cells: ScoreboardFitCell[]): number {
  return Math.max(0, cells.length - 1) * SCOREBOARD_FIT.CELL_DIVIDER_PX
}

/**
 * Largest value size at which every cell of one half still fits its share of
 * `width`. Solves `Σ(fixed + em·f) = width` for f — the point where the half is
 * exactly full, so no horizontal pixel is left unused.
 */
function fitHalf(cells: ScoreboardFitCell[], width: number, fixed: number): number {
  const emSum = emSumOf(cells)
  if (cells.length === 0 || emSum <= 0) return Infinity
  return (width - cells.length * fixed - dividersOf(cells)) / emSum
}

/**
 * Same fit, but with the icon tied to the value size (icon = ratio · f) instead
 * of fixed. Substituting that into the equation above and solving for f gives
 * the split where icon and number grow together — neither starves the other:
 *
 *   Σ(ratio·f·(1 + gapShare) + 2·pad + em·f) + dividers = width
 *   f = (width − 2·n·pad − dividers) / (Σem + n·ratio·(1 + gapShare))
 */
function fitHalfCoupled(
  cells: ScoreboardFitCell[],
  width: number,
  cellPad: number,
  ratio: number,
): number {
  const emSum = emSumOf(cells)
  if (cells.length === 0 || emSum <= 0) return Infinity
  const iconWeight = cells.length * ratio * (1 + SCOREBOARD_FIT.ICON_GAP_FRACTION)
  return (width - 2 * cells.length * cellPad - dividersOf(cells)) / (emSum + iconWeight)
}

/**
 * Width of one half that its cells do NOT need at the sizes the fit settled on.
 * It exists because the numbers are height-bound on most desktop strips: they
 * stop growing at the strip's ceiling long before they have eaten the width.
 * That leftover is what the crest in the middle claims.
 */
function spareOf(cells: ScoreboardFitCell[], width: number, needs: number[]): number {
  const demanded = needs.reduce((sum, need) => sum + need, 0) + dividersOf(cells)
  return Math.max(0, width - demanded)
}

/**
 * Largest size one crest line can take: its box divided by everything the line
 * puts in it (text + ornament + air, all in em), never taller than the band.
 */
function fitCrestLine(line: ScoreboardCrestLine | undefined, width: number, heightCap: number) {
  const C = SCOREBOARD_CREST
  if (!line || line.em <= 0 || width <= 0) return 0
  const emTotal = line.em + line.ornamentEm + 2 * C.PAD_EM
  if (emTotal <= 0) return 0
  /* No lower bound: a floor would be a size the box does NOT have, and the line
     is one nowrap string — it would not shrink, it would be cut off. */
  return Math.max(0, Math.min(width / emTotal, heightCap, C.TEXT_MAX_PX))
}

/** What one half's cells demand, and what their resulting widths can hold. */
interface HalfWeights {
  /** flex-grow weight per cell — its share of the half's width. */
  needs: number[]
  /** Largest caption size every cell of this half still fits without ellipsis. */
  labelCap: number
  /** Largest value size every cell of this half still fits. */
  valueCap: number
}

/**
 * Weighs one half at a candidate (valueSize, labelSize) and reports back what
 * the resulting cell widths can actually hold.
 *
 * The decisive detail: a cell's demand is the MAX of what its number needs and
 * what its caption needs. Without that, a cell with a short number but a long
 * caption ("0" / "DRAGONS") is weighted narrow and then drags the shared
 * caption size — for the whole strip — down with it. That is what used to make
 * the caption row collapse on laptop-sized viewports.
 */
function weighHalf(
  cells: ScoreboardFitCell[],
  width: number,
  fixed: number,
  valueSize: number,
  stackedValueSize: number,
  labelSize: number,
  cellPad: number,
): HalfWeights {
  const needs = cells.map((cell) =>
    Math.max(
      cellNeed(cell, fixed, cell.stacked ? stackedValueSize : valueSize),
      labelSize > 0 ? labelNeed(cell, labelSize, cellPad) : 0,
    ),
  )
  const needSum = needs.reduce((sum, need) => sum + need, 0)
  let labelCap = Infinity
  let valueCap = Infinity
  if (needSum > 0) {
    cells.forEach((cell, i) => {
      const cellWidth = (needs[i] / needSum) * width
      if (labelSize > 0 && cell.labelEm > 0) {
        labelCap = Math.min(labelCap, (cellWidth - cellPad * 2) / cell.labelEm)
      }
      if (cell.em > 0) {
        valueCap = Math.min(valueCap, (cellWidth - fixed) / cell.em)
      }
    })
  }
  return { needs, labelCap, valueCap }
}

/**
 * Derives every size of the bottom scoreboard from measured geometry.
 *
 * The strip hands in its real half widths, its real height and the em width of
 * every string it is about to render (measured, not estimated from the glyph
 * count). Out comes ONE value size — the largest that every cell can hold — and
 * the flex-grow weights that hand each cell exactly the width its own text
 * needs. Because the weights follow the demand, a short cell ("3") no longer
 * hoards room a long one ("128.4K") is starving for, which is what lets the
 * shared size land far above a fixed five-equal-columns split.
 *
 * Vertical order of business:
 *   1. the caption band is reserved FIRST and kept (it is the only thing that
 *      says what a number means),
 *   2. what is left is the value row — icon and number solved together in it,
 *   3. on a cramped strip the icon yields part of its width ratio so the number
 *      stays as large as the geometry allows,
 *   4. the crest in the middle takes the width the cells did NOT need and fits
 *      its one line into the full strip height.
 *
 * Pure: same input → same output, no DOM. See useScoreboardFit for the measuring
 * side.
 */
export function computeScoreboardFit(input: ScoreboardFitInput): ScoreboardFit {
  const { leftWidth, rightWidth, stripHeight } = input
  const C = SCOREBOARD_FIT

  /* Caption variant in play. The short set is not a truncation — it is the
     cell's own compact name, and the strip switches to it as a whole (see the
     retry at the end) so the row never mixes words with abbreviations. */
  const shortLabels = input.useShortLabels === true
  const withVariant = (cells: ScoreboardFitCell[]): ScoreboardFitCell[] =>
    shortLabels
      ? cells.map((cell) => ({ ...cell, labelEm: cell.labelShortEm ?? cell.labelEm }))
      : cells
  const leftCells = withVariant(input.leftCells)
  const rightCells = withVariant(input.rightCells)
  /** true → at least one cell has a shorter caption still to fall back on. */
  const hasShorterLabels =
    !shortLabels &&
    [...input.leftCells, ...input.rightCells].some(
      (cell) => (cell.labelShortEm ?? cell.labelEm) < cell.labelEm,
    )

  const usableH = Math.max(0, stripHeight - (C.STRIP_PAD_TOP_PX + C.STRIP_PAD_BOTTOM_PX))
  const cellCount = Math.max(leftCells.length, rightCells.length, 1)
  const avgCell = Math.min(leftWidth, rightWidth) / cellCount
  const cellPad = clamp(avgCell * C.CELL_PAD_FRACTION, C.CELL_PAD_MIN_PX, C.CELL_PAD_MAX_PX)

  /* ── 1 · Caption band ──
     Reserved before the numbers are sized, and capped so the value row keeps
     its majority share of the strip. Only the width solve below may still take
     it away, and only when a cell is genuinely too narrow for its own word. */
  const wantsLabels = input.showLabels !== false
  const rowGap = wantsLabels
    ? clamp(usableH * C.ROW_GAP_FRACTION, C.ROW_GAP_MIN_PX, C.ROW_GAP_MAX_PX)
    : 0
  const labelBudget = usableH * (1 - C.MAIN_ROW_MIN_FRACTION) - rowGap
  const labelStart = wantsLabels
    ? Math.min(
        clamp(usableH * C.LABEL_HEIGHT_FRACTION, C.LABEL_MIN_PX, C.LABEL_MAX_PX),
        labelBudget / C.LABEL_LINE_FACTOR,
      )
    : 0
  if (wantsLabels && labelStart < C.LABEL_HARD_MIN_PX) {
    return computeScoreboardFit({ ...input, showLabels: false })
  }
  const mainH = usableH - (labelStart > 0 ? labelStart * C.LABEL_LINE_FACTOR + rowGap : 0)

  /* ── 2 · Icon and value, solved together ──
     Pass 1 couples the icon to the value size, so the half's width is split
     between them at a fixed visual ratio rather than the icon claiming the
     whole row height first. */
  function coupledAt(ratio: number): number {
    return Math.min(
      fitHalfCoupled(leftCells, leftWidth, cellPad, ratio),
      fitHalfCoupled(rightCells, rightWidth, cellPad, ratio),
      mainH * C.VALUE_HEIGHT_FRACTION,
      C.VALUE_MAX_PX,
    )
  }
  /* How roomy the strip turns out to be decides how much of its width the icon
     may keep: at VALUE_COMFORT_PX and above it holds the full ratio, on a
     laptop strip it steps back toward ICON_TO_VALUE_RATIO_MIN so the number —
     the actual information — grows instead. */
  const roominess = clamp(coupledAt(C.ICON_TO_VALUE_RATIO) / C.VALUE_COMFORT_PX, 0, 1)
  const iconRatio =
    C.ICON_TO_VALUE_RATIO_MIN + (C.ICON_TO_VALUE_RATIO - C.ICON_TO_VALUE_RATIO_MIN) * roominess
  const coupled = coupledAt(iconRatio)

  /* The icon may never outgrow its row, and below the legibility floor it is
     dropped altogether — the cell keeps its caption and its tooltip. */
  const iconRaw = Math.min(coupled * iconRatio, mainH, C.ICON_MAX_PX)
  const iconSize = iconRaw >= C.ICON_MIN_PX ? iconRaw : 0
  const iconGap =
    iconSize > 0 ? clamp(iconSize * C.ICON_GAP_FRACTION, C.ICON_GAP_MIN_PX, C.ICON_GAP_MAX_PX) : 0
  const fixed = iconSize + iconGap + cellPad * 2

  /* Pass 2 re-fits the text against the icon that actually resulted. Wherever
     the icon was capped (short strips, dropped icons) this hands the freed
     width back to the numbers — it can only ever raise the value size. */
  let valueSize = clamp(
    Math.min(
      fitHalf(leftCells, leftWidth, fixed),
      fitHalf(rightCells, rightWidth, fixed),
      mainH * C.VALUE_HEIGHT_FRACTION,
    ),
    C.VALUE_MIN_PX,
    C.VALUE_MAX_PX,
  )
  let labelSize = labelStart

  /* ── 3 · Joint width solve ──
     Caption size and value size share the same ten cell widths, and each one's
     demand shifts those widths. Two or three passes settle it: whatever a cell
     cannot hold is given back, never rendered over the edge. */
  const stackedOf = (value: number) => Math.min(value, mainH / C.STACKED_LINE_DIVISOR)
  let leftWeights = weighHalf(
    leftCells,
    leftWidth,
    fixed,
    valueSize,
    stackedOf(valueSize),
    labelSize,
    cellPad,
  )
  let rightWeights = weighHalf(
    rightCells,
    rightWidth,
    fixed,
    valueSize,
    stackedOf(valueSize),
    labelSize,
    cellPad,
  )
  for (let pass = 1; pass < C.FIT_PASSES; pass++) {
    const labelCap = Math.min(leftWeights.labelCap, rightWeights.labelCap)
    const valueCap = Math.min(leftWeights.valueCap, rightWeights.valueCap)
    const nextLabel = labelSize > 0 ? Math.min(labelSize, labelCap) : 0
    const nextValue = clamp(Math.min(valueSize, valueCap), C.VALUE_MIN_PX, C.VALUE_MAX_PX)
    if (nextLabel >= labelSize - 0.01 && nextValue >= valueSize - 0.01) break
    labelSize = nextLabel
    valueSize = nextValue
    leftWeights = weighHalf(
      leftCells,
      leftWidth,
      fixed,
      valueSize,
      stackedOf(valueSize),
      labelSize,
      cellPad,
    )
    rightWeights = weighHalf(
      rightCells,
      rightWidth,
      fixed,
      valueSize,
      stackedOf(valueSize),
      labelSize,
      cellPad,
    )
  }
  /* Words or short names? The strip trades the words for the cells' own short
     names when carrying them costs the captions their readable size — or when
     it costs the NUMBERS more than SHORT_LABEL_VALUE_GAIN. A few letters are
     the cheapest thing on this strip; the numbers are what it exists for. */
  if (labelSize > 0 && hasShorterLabels) {
    const short = computeScoreboardFit({ ...input, useShortLabels: true })
    if (labelSize < C.LABEL_MIN_PX || short.valueSize >= valueSize * C.SHORT_LABEL_VALUE_GAIN) {
      return short
    }
  }
  /* Even the short caption cannot be read — the row is dropped and the whole
     fit redone, because the freed band belongs to the icons and numbers. */
  if (labelSize > 0 && labelSize < C.LABEL_HARD_MIN_PX) {
    return computeScoreboardFit({ ...input, showLabels: false })
  }

  /* Two lines in one row: the win/loss cell is the one deliberate exception to
     "every number the same size" — stacking is what keeps a 6-digit record from
     dragging all nine other cells down with it. */
  const stackedValueSize = stackedOf(valueSize)

  /* ── 4 · The crest in the middle ──
     Its box starts at the minimum the strip guarantees it and grows by whatever
     the two halves left unused — so the middle gets bigger without ever taking
     a pixel the numbers were actually standing on. Inside that box the title
     and the status line are fitted exactly like a cell value: measured string,
     one solve, no clamp() guessing at glyph widths. */
  const crestMin = Math.max(0, input.crestMin ?? 0)
  const crestMax = Math.max(crestMin, input.crestMax ?? crestMin)
  /* The crest sits in the middle, so it takes the SAME width from both halves —
     the spare of the tighter half is what it may have, twice. Summing the two
     would let a roomy left half pay for a right half that has nothing to give. */
  const spare =
    2 *
    Math.min(
      spareOf(leftCells, leftWidth, leftWeights.needs),
      spareOf(rightCells, rightWidth, rightWeights.needs),
    )
  const crestWidth = Math.min(crestMax, crestMin + spare * SCOREBOARD_CREST.SLACK_TAKE)
  /* One line, no caption row above it: the whole strip height is the crest's
     text band — that is where most of its extra size comes from. */
  const crestHeightCap = usableH * SCOREBOARD_CREST.TEXT_HEIGHT_FRACTION
  const crestTitleSize = fitCrestLine(input.crestTitle, crestWidth, crestHeightCap)
  const crestStatusSize = fitCrestLine(input.crestStatus, crestWidth, crestHeightCap)

  const grow: Record<string, number> = {}
  const em: Record<string, number> = {}
  for (const [cells, weights] of [
    [leftCells, leftWeights],
    [rightCells, rightWeights],
  ] as const) {
    cells.forEach((cell, i) => {
      grow[cell.key] = weights.needs[i]
      em[cell.key] = cell.em
    })
  }

  return {
    valueSize,
    stackedValueSize,
    labelSize,
    shortLabels,
    rowGap: labelSize > 0 ? rowGap : 0,
    iconSize,
    iconGap,
    cellPad,
    grow,
    em,
    crestWidth,
    crestTitleSize,
    crestStatusSize,
  }
}
