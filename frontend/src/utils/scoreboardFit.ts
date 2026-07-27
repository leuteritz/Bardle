import { SCOREBOARD_FIT } from '@/config/constants'
import type { ScoreboardFit, ScoreboardFitInput, ScoreboardFitCell } from '@/types'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Width one cell needs at a given value size: icon + gap + paddings + text. */
function cellNeed(cell: ScoreboardFitCell, fixed: number, valueSize: number): number {
  return fixed + cell.em * valueSize
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
function fitHalfCoupled(cells: ScoreboardFitCell[], width: number, cellPad: number): number {
  const emSum = emSumOf(cells)
  if (cells.length === 0 || emSum <= 0) return Infinity
  const { ICON_TO_VALUE_RATIO, ICON_GAP_FRACTION } = SCOREBOARD_FIT
  const iconWeight = cells.length * ICON_TO_VALUE_RATIO * (1 + ICON_GAP_FRACTION)
  return (width - 2 * cells.length * cellPad - dividersOf(cells)) / (emSum + iconWeight)
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
 * Pure: same input → same output, no DOM. See useScoreboardFit for the measuring
 * side.
 */
export function computeScoreboardFit(input: ScoreboardFitInput): ScoreboardFit {
  const { leftWidth, rightWidth, stripHeight, leftCells, rightCells } = input
  const C = SCOREBOARD_FIT

  const usableH = Math.max(0, stripHeight - C.STRIP_PAD_Y)
  const cellCount = Math.max(leftCells.length, rightCells.length, 1)
  const avgCell = Math.min(leftWidth, rightWidth) / cellCount

  // ── Label row first: it is the only thing that eats into the main row's
  //    height, and its size depends on nothing else. ──
  const wantsLabels = input.showLabels !== false
  const labelFromHeight = clamp(usableH * C.LABEL_HEIGHT_FRACTION, C.LABEL_MIN_PX, C.LABEL_MAX_PX)
  const labelFits = wantsLabels && usableH * C.LABEL_HEIGHT_FRACTION >= C.LABEL_MIN_PX
  const rowGap = labelFits ? clamp(usableH * 0.05, 2, 7) : 0
  const mainH = usableH - (labelFits ? labelFromHeight * 1.05 + rowGap : 0)

  const cellPad = clamp(avgCell * C.CELL_PAD_FRACTION, C.CELL_PAD_MIN_PX, C.CELL_PAD_MAX_PX)

  /* ── Icon and value, solved together ──
     Pass 1 couples the icon to the value size, so the half's width is split
     between them at a fixed visual ratio rather than the icon claiming the
     whole row height first. */
  const coupled = Math.min(
    fitHalfCoupled(leftCells, leftWidth, cellPad),
    fitHalfCoupled(rightCells, rightWidth, cellPad),
    mainH * C.VALUE_HEIGHT_FRACTION,
    C.VALUE_MAX_PX,
  )
  /* The icon may never outgrow its row, and below the legibility floor it is
     dropped altogether — the cell keeps its label and its tooltip. */
  const iconRaw = Math.min(coupled * C.ICON_TO_VALUE_RATIO, mainH, C.ICON_MAX_PX)
  const iconSize = iconRaw >= C.ICON_MIN_PX ? iconRaw : 0
  const iconGap =
    iconSize > 0 ? clamp(iconSize * C.ICON_GAP_FRACTION, C.ICON_GAP_MIN_PX, C.ICON_GAP_MAX_PX) : 0
  const fixed = iconSize + iconGap + cellPad * 2

  /* Pass 2 re-fits the text against the icon that actually resulted. Wherever
     the icon was capped (short strips, dropped icons) this hands the freed
     width back to the numbers — it can only ever raise the value size. */
  const valueSize = clamp(
    Math.min(
      fitHalf(leftCells, leftWidth, fixed),
      fitHalf(rightCells, rightWidth, fixed),
      mainH * C.VALUE_HEIGHT_FRACTION,
    ),
    C.VALUE_MIN_PX,
    C.VALUE_MAX_PX,
  )
  /* Two lines in one row: the win/loss cell is the one deliberate exception to
     "every number the same size" — stacking is what keeps a 6-digit record from
     dragging all nine other cells down with it. */
  const stackedValueSize = Math.min(valueSize, mainH / C.STACKED_LINE_DIVISOR)

  // ── Per-cell width weights, and the label size that survives them ──
  const grow: Record<string, number> = {}
  const em: Record<string, number> = {}
  let labelSize = labelFits ? labelFromHeight : 0

  for (const [cells, width] of [
    [leftCells, leftWidth],
    [rightCells, rightWidth],
  ] as const) {
    const needs = cells.map((cell) =>
      cellNeed(cell, fixed, cell.stacked ? stackedValueSize : valueSize),
    )
    const needSum = needs.reduce((sum, n) => sum + n, 0)
    cells.forEach((cell, i) => {
      grow[cell.key] = needs[i]
      em[cell.key] = cell.em
      if (labelSize > 0 && cell.labelEm > 0 && needSum > 0) {
        // the cell's real width once the weights are applied — the label must
        // fit it without ellipsis on every resolution
        const cellWidth = (needs[i] / needSum) * width
        labelSize = Math.min(labelSize, (cellWidth - cellPad * 2) / cell.labelEm)
      }
    })
  }
  /* Labels that no longer fit are dropped entirely — and the whole fit is redone,
     because the freed label row belongs to the icons and numbers. The icon keeps
     its tooltip, so nothing is lost but the small-caps line. */
  if (labelFits && labelSize < C.LABEL_MIN_PX) {
    return computeScoreboardFit({ ...input, showLabels: false })
  }

  return {
    valueSize,
    stackedValueSize,
    labelSize,
    rowGap: labelSize > 0 ? rowGap : 0,
    iconSize,
    iconGap,
    cellPad,
    grow,
    em,
  }
}
