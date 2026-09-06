import { describe, expect, it } from 'vitest'
import { placeTip } from '@/utils/ui/tipAnchor'

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  } as DOMRect
}

describe('placeTip', () => {
  it('keeps a constrained tooltip inside its layout area', () => {
    const result = placeTip({
      anchor: rect(560, 200, 20, 20),
      tipW: 300,
      tipH: 180,
      gap: 10,
      margin: 8,
      caretInset: 12,
      prefer: 'bottom',
      bounds: rect(100, 100, 500, 700),
      viewportW: 1000,
      viewportH: 1000,
    })

    expect(result.left).toBe(292)
    expect(result.top).toBe(230)
    expect(result.left).toBeGreaterThanOrEqual(108)
    expect(result.left + 300).toBeLessThanOrEqual(592)
    expect(result.top).toBeGreaterThanOrEqual(108)
    expect(result.top + 180).toBeLessThanOrEqual(792)
  })
})
