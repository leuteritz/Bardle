import { describe, it, expect } from 'vitest'
import {
  SHOP_ATLAS_FACET_RAIL_WIDTH,
  SHOP_ATLAS_FACET_RAIL_COLLAPSED,
  SHOP_ATLAS_FACET_AUTOFOLD_WIDTH,
  SHOP_ATLAS_DETAIL_MIN_WIDTH,
  SHOP_ATLAS_DETAIL_PCT,
  SHOP_ATLAS_DETAIL_MAX_WIDTH,
  SHOP_ATLAS_CARD_MIN_WIDTH,
  SHOP_ATLAS_GRID_GAP,
  SHOP_HERO_FIELD_MAX_W,
  SHOP_HERO_FOLD_H,
  SHOP_HERO_PINNED_H,
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
 * measured at (see the worked example in constants/economy.ts):
 *   Full HD  →  232px 636px 372px   4 columns
 *   2K       →  232px 930px 498px   6 columns
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
  const facets = folded ? SHOP_ATLAS_FACET_RAIL_COLLAPSED : SHOP_ATLAS_FACET_RAIL_WIDTH
  const detail = clamp(
    SHOP_ATLAS_DETAIL_MIN_WIDTH,
    (atlas * SHOP_ATLAS_DETAIL_PCT) / 100,
    SHOP_ATLAS_DETAIL_MAX_WIDTH,
  )
  const grid = atlas - facets - detail
  return { atlas, facets, detail, grid }
}

/** What `repeat(auto-fill, minmax(CARD_MIN, 1fr))` resolves to. */
function columns(gridWidth: number): number {
  const usable = gridWidth - GRID_PADDING
  return Math.floor((usable + SHOP_ATLAS_GRID_GAP) / (SHOP_ATLAS_CARD_MIN_WIDTH + SHOP_ATLAS_GRID_GAP))
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
    expect(Math.round(fhd.grid)).toBe(636)
    expect(Math.round(fhd.detail)).toBe(372)
    expect(columns(fhd.grid)).toBe(4)

    const qhd = zones(2560, 1440)
    expect(Math.round(qhd.grid)).toBe(930)
    expect(Math.round(qhd.detail)).toBe(498)
    expect(columns(qhd.grid)).toBe(6)
  })

  it.each(DESKTOPS)('%s: folding the facet rail never costs the grid a column', (_l, vw, vh) => {
    const open = zones(vw, vh)
    const folded = zones(vw, vh, true)
    expect(folded.grid - open.grid).toBe(
      SHOP_ATLAS_FACET_RAIL_WIDTH - SHOP_ATLAS_FACET_RAIL_COLLAPSED,
    )
    expect(columns(folded.grid)).toBeGreaterThanOrEqual(columns(open.grid))
  })

  it.each(DESKTOPS)('%s: folding the rail buys a whole extra column', (_l, vw, vh) => {
    // With the wider rail the 180px it frees are worth a column everywhere — at
    // Full HD too, where the old 144px only bought reading room.
    expect(columns(zones(vw, vh, true).grid)).toBeGreaterThan(columns(zones(vw, vh).grid))
  })

  it.each(DESKTOPS)('%s: the search field fits the grid column', (_l, vw, vh) => {
    // The field heads the grid column, centred. Wider than the column it would
    // either overflow the zone or silently shrink below the width it was
    // measured readable at.
    expect(zones(vw, vh).grid - GRID_PADDING).toBeGreaterThanOrEqual(SHOP_HERO_FIELD_MAX_W)
  })

  it('the search block costs the grid its two heights and nothing more', () => {
    // Both halves are positive and the pinned one is the larger: it holds the
    // 56px field, the fold only a 28px control row. Reversed, scrolling would
    // hide the field and keep the buttons.
    expect(SHOP_HERO_FOLD_H).toBeGreaterThan(0)
    expect(SHOP_HERO_PINNED_H).toBeGreaterThan(SHOP_HERO_FOLD_H)
    // Resting height of the block — what the first section header starts below.
    expect(SHOP_HERO_FOLD_H + SHOP_HERO_PINNED_H).toBe(127)
  })

  it('never auto-folds a desktop that has room for the rail', () => {
    // The fold threshold exists for narrow windows, not for the reference
    // resolutions — folding one of those would hide the facets by default on a
    // screen that fits them.
    for (const [, vw, vh] of DESKTOPS) {
      expect(atlasWidth(vw, vh)).toBeGreaterThan(SHOP_ATLAS_FACET_AUTOFOLD_WIDTH)
    }
  })
})
