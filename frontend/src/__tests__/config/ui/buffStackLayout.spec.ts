import { describe, it, expect } from 'vitest'
import {
  AUGMENT_RARITY_COLOR,
  BOTTOM_BAR_SIDE_W,
  BUFF_RANK_TIER,
  BUFF_STACK_BOTTOM_GAP,
  BUFF_STACK_GAP,
  BUFF_STACK_GAP_COMPACT,
  BUFF_STACK_MORE_H,
  BUFF_STACK_ROW_H,
  BUFF_STACK_ROW_H_COMPACT,
  BUFF_STACK_TOP_GAP,
  BUFF_STACK_W,
  BUFF_STACK_W_LEGENDARY,
  DRIFTER_RARITY_COLOR,
  EVENT_LOG_PANEL_MAX_H,
  EVENT_LOG_PANEL_MIN_H,
  EVENT_LOG_PANEL_VH,
  EVENT_LOG_BESIDE_HEADER_MIN_VW,
} from '@/config/constants'

/** Full HD: 1920×950 Viewport, Header 118 + 8 Lücke, Keycap-Leiste 30. */
const FULL_HD = { w: 1920, h: 950, headerBottom: 118 + 8, keycapBar: 30 }
/** Full HD bei 125 %: 1536 CSS-px — die Spur rückt UNTER den Header. */
const FULL_HD_125 = { w: 1536, h: 760, headerBottom: 118 + 8, keycapBar: 30 }

function hudScale(w: number, h: number) {
  return Math.min(1, Math.max(0.52, Math.min(w / 2560, h / 1440)))
}

function bandHeight({ w, h, headerBottom, keycapBar }: typeof FULL_HD) {
  const logH = Math.min(
    EVENT_LOG_PANEL_MAX_H,
    Math.max(EVENT_LOG_PANEL_MIN_H, (h * EVENT_LOG_PANEL_VH) / 100),
  )
  // Ab EVENT_LOG_BESIDE_HEADER_MIN_VW steht die Spur NEBEN dem Header, ab 8 px.
  const logTop = w >= EVENT_LOG_BESIDE_HEADER_MIN_VW ? 8 : headerBottom
  const top = logTop + logH + BUFF_STACK_TOP_GAP
  const bottom = BOTTOM_BAR_SIDE_W * hudScale(w, h) + keycapBar + BUFF_STACK_BOTTOM_GAP
  return h - top - bottom
}

describe('buff stack — the right gutter under the event log', () => {
  it('knows a tier for every real rarity, and only legendary reaches 3', () => {
    const ranks = new Set([
      ...Object.keys(DRIFTER_RARITY_COLOR),
      ...Object.keys(AUGMENT_RARITY_COLOR),
    ])
    for (const rank of ranks) {
      expect(BUFF_RANK_TIER[rank as keyof typeof BUFF_RANK_TIER]).toBeGreaterThanOrEqual(1)
    }
    const top = Object.entries(BUFF_RANK_TIER).filter(([, t]) => t === 3)
    expect(top).toEqual([['legendary', 3]])
    expect(BUFF_RANK_TIER.common).toBe(1)
  })

  it('fits four rows on Full HD and one compact row at 125 % scaling', () => {
    const rowsAt = (vp: typeof FULL_HD, rowH: number, gap: number) =>
      Math.floor((bandHeight(vp) + gap) / (rowH + gap))
    expect(rowsAt(FULL_HD, BUFF_STACK_ROW_H, BUFF_STACK_GAP)).toBeGreaterThanOrEqual(4)
    // Unter 800 px Höhe gilt die Kompaktstufe: eine Zeile plus Pille muss stehen.
    const compact = rowsAt(FULL_HD_125, BUFF_STACK_ROW_H_COMPACT, BUFF_STACK_GAP_COMPACT)
    expect(compact).toBeGreaterThanOrEqual(1)
    expect(bandHeight(FULL_HD_125)).toBeGreaterThanOrEqual(
      BUFF_STACK_ROW_H_COMPACT + BUFF_STACK_GAP_COMPACT + BUFF_STACK_MORE_H,
    )
    // Die Pille ersetzt die letzte Zeile — sie muss flacher sein als eine.
    expect(BUFF_STACK_MORE_H).toBeLessThan(BUFF_STACK_ROW_H_COMPACT)
  })

  it('grows in width with the rank, never in height', () => {
    expect(BUFF_STACK_W_LEGENDARY).toBeGreaterThan(BUFF_STACK_W)
    // Die Gasse ist die HUD-Spalte (Full HD 380 px); auch Stufe 3 bleibt darin.
    expect(BUFF_STACK_W_LEGENDARY).toBeLessThanOrEqual(380)
  })
})
