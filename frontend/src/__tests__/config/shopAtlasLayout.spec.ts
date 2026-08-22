import { describe, it, expect } from 'vitest'
import {
  TEAM_SHOP_FACET_RAIL_WIDTH,
  TEAM_SHOP_FACET_RAIL_COLLAPSED,
  TEAM_SHOP_FACET_AUTOFOLD_WIDTH,
  TEAM_SHOP_DETAIL_MIN_WIDTH,
  TEAM_SHOP_DETAIL_PCT,
  TEAM_SHOP_DETAIL_MAX_WIDTH,
  TEAM_SHOP_CARD_MIN_WIDTH,
  TEAM_SHOP_GRID_GAP,
  BOTTOM_BAR_SIDE_W,
} from '@/config/constants'

/**
 * The shop's three zones share one budget: facets + grid + detail = the whole
 * tab. Nothing in the CSS says how many card columns that leaves, so raising one
 * width silently takes columns off the grid — and the floor that matters is
 * four, which is what the old 900px rail showed. A layout that buys its detail
 * column by showing fewer champions is not the trade this was made for.
 *
 * The numbers below mirror what App.vue computes and what the browser was
 * measured at (see the worked example in constants/sigil.ts):
 *   Full HD  →  196px 672px 372px   4 columns
 *   2K       →  196px 966px 498px   5 columns
 */

/** Horizontal padding of .cs-atlas-grid, both sides. */
const GRID_PADDING = 28
/** .rp-wrapper's --bp-gap, both sides. */
const MODAL_GAP = 10

const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** `--hud-scale` / `--team-ui-scale` from App.vue. */
const hudScale = (w: number, h: number) => clamp(0.52, Math.min(w / 2560, h / 1440), 1)
const teamUiScale = (w: number, h: number) => clamp(0.62, Math.min(w / 1920, h / 1080), 1)

/**
 * Width of .cs-atlas in its own (zoomed) coordinate space. The profile modal is
 * inset by `--hud-panel-size` on both sides, which is the raised side panel of
 * the bottom bar scaled by `--hud-scale` (App.vue).
 */
function atlasWidth(vw: number, vh: number): number {
  const panel = BOTTOM_BAR_SIDE_W * hudScale(vw, vh)
  const modal = vw - 2 * (panel + MODAL_GAP)
  return modal / teamUiScale(vw, vh)
}

function zones(vw: number, vh: number, folded = false) {
  const atlas = atlasWidth(vw, vh)
  const facets = folded ? TEAM_SHOP_FACET_RAIL_COLLAPSED : TEAM_SHOP_FACET_RAIL_WIDTH
  const detail = clamp(
    TEAM_SHOP_DETAIL_MIN_WIDTH,
    (atlas * TEAM_SHOP_DETAIL_PCT) / 100,
    TEAM_SHOP_DETAIL_MAX_WIDTH,
  )
  const grid = atlas - facets - detail
  return { atlas, facets, detail, grid }
}

/** What `repeat(auto-fill, minmax(CARD_MIN, 1fr))` resolves to. */
function columns(gridWidth: number): number {
  const usable = gridWidth - GRID_PADDING
  return Math.floor((usable + TEAM_SHOP_GRID_GAP) / (TEAM_SHOP_CARD_MIN_WIDTH + TEAM_SHOP_GRID_GAP))
}

const DESKTOPS: Array<[string, number, number]> = [
  ['Full HD 1920×1080', 1920, 1080],
  ['WUXGA 1920×1200', 1920, 1200],
  ['2K/QHD 2560×1440', 2560, 1440],
  ['4K 3840×2160', 3840, 2160],
]

describe('shop atlas layout', () => {
  it.each(DESKTOPS)('%s keeps at least four card columns', (_label, vw, vh) => {
    expect(columns(zones(vw, vh).grid)).toBeGreaterThanOrEqual(4)
  })

  it.each(DESKTOPS)('%s leaves every zone a positive width', (_label, vw, vh) => {
    const z = zones(vw, vh)
    expect(z.facets).toBeGreaterThan(0)
    expect(z.detail).toBeGreaterThan(0)
    expect(z.grid).toBeGreaterThan(0)
    expect(z.facets + z.detail + z.grid).toBeCloseTo(z.atlas, 6)
  })

  it('matches the two widths measured in the browser', () => {
    const fhd = zones(1920, 1080)
    expect(Math.round(fhd.grid)).toBe(672)
    expect(Math.round(fhd.detail)).toBe(372)
    expect(columns(fhd.grid)).toBe(4)

    const qhd = zones(2560, 1440)
    expect(Math.round(qhd.grid)).toBe(966)
    expect(Math.round(qhd.detail)).toBe(498)
    expect(columns(qhd.grid)).toBe(5)
  })

  it.each(DESKTOPS)('%s: folding the facet rail never costs the grid a column', (_l, vw, vh) => {
    const open = zones(vw, vh)
    const folded = zones(vw, vh, true)
    expect(folded.grid - open.grid).toBe(
      TEAM_SHOP_FACET_RAIL_WIDTH - TEAM_SHOP_FACET_RAIL_COLLAPSED,
    )
    expect(columns(folded.grid)).toBeGreaterThanOrEqual(columns(open.grid))
  })

  it('turns the folded rail into a whole extra column from 2K up', () => {
    // At Full HD the 144px it frees go into wider cards rather than a fifth
    // column — the fold is worth pressing there for the reading room, not for
    // the count. From 2K on it buys a column outright.
    expect(columns(zones(1920, 1080, true).grid)).toBe(columns(zones(1920, 1080).grid))
    expect(columns(zones(2560, 1440, true).grid)).toBeGreaterThan(columns(zones(2560, 1440).grid))
  })

  it('never auto-folds a desktop that has room for the rail', () => {
    // The fold threshold exists for narrow windows, not for the reference
    // resolutions — folding one of those would hide the facets by default on a
    // screen that fits them.
    for (const [, vw, vh] of DESKTOPS) {
      expect(atlasWidth(vw, vh)).toBeGreaterThan(TEAM_SHOP_FACET_AUTOFOLD_WIDTH)
    }
  })
})
