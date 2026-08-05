import { describe, it, expect } from 'vitest'
import {
  inkCenterOffsetPx,
  inkMiddleOffsetPx,
  clearInkOffsetCache,
  vInkCenter,
} from '../../utils/textInkOffset'

const FONT = {
  font: '800 13px MedievalSharp',
  letterSpacing: '0.13px',
  fontFamily: 'MedievalSharp',
  fontWeight: '800',
  fontSize: '13px',
  lineHeight: '13px',
}

// jsdom rastert keine Glyphen und liefert daher keine Tintenkanten. Die
// Funktion muss das erkennen und 0 zurückgeben statt NaN in ein
// translate: <NaN>px zu schreiben.
describe('inkCenterOffsetPx', () => {
  it('returns a finite number without a measuring canvas', () => {
    const out = inkCenterOffsetPx('123.46M', '800 46px MedievalSharp', '0.9px')
    expect(Number.isFinite(out)).toBe(true)
  })

  it('degrades to zero correction rather than shifting blindly', () => {
    expect(inkCenterOffsetPx('1.53K', '800 46px MedievalSharp', '0.9px')).toBe(0)
  })

  it('survives an empty string', () => {
    expect(inkCenterOffsetPx('', '800 46px MedievalSharp', '0px')).toBe(0)
  })

  it('clearInkOffsetCache can be called at any time', () => {
    clearInkOffsetCache()
    expect(inkCenterOffsetPx('0', '900 20px MedievalSharp', '0px')).toBe(0)
  })
})

describe('inkMiddleOffsetPx', () => {
  it('returns a finite number without a rasterizing canvas', () => {
    expect(Number.isFinite(inkMiddleOffsetPx('100', FONT))).toBe(true)
  })

  it('degrades to zero correction rather than shifting blindly', () => {
    expect(inkMiddleOffsetPx('100', FONT)).toBe(0)
  })

  it('survives an empty string', () => {
    expect(inkMiddleOffsetPx('', FONT)).toBe(0)
  })

  it('shares one measurement across texts built from the same characters', () => {
    // "100" und "001" haben dieselbe senkrechte Ausdehnung — eine Zahl, die
    // jede Sekunde tickt, darf den Cache nicht volllaufen lassen.
    clearInkOffsetCache()
    expect(inkMiddleOffsetPx('100', FONT)).toBe(inkMiddleOffsetPx('001', FONT))
  })
})

describe('v-ink-center', () => {
  it('exposes the hooks Vue needs to keep the shift in sync with the text', () => {
    expect(typeof vInkCenter.mounted).toBe('function')
    expect(typeof vInkCenter.updated).toBe('function')
    expect(typeof vInkCenter.unmounted).toBe('function')
  })

  it('writes to the standalone translate property, never to transform', () => {
    // transform trägt an vielen Zielen bereits translateX(-50%) oder eine
    // Animation — die Direktive darf es nicht überschreiben.
    const el = document.createElement('span')
    el.textContent = '123'
    el.style.transform = 'translateX(-50%)'
    vInkCenter.mounted?.(el, {} as never, null as never, null)
    expect(el.style.transform).toBe('translateX(-50%)')
    vInkCenter.unmounted?.(el, {} as never, null as never, null)
  })

  it('clears the shift when an element loses its text', () => {
    const el = document.createElement('span')
    el.textContent = ''
    vInkCenter.mounted?.(el, {} as never, null as never, null)
    expect(el.style.translate).toBe('')
    vInkCenter.unmounted?.(el, {} as never, null as never, null)
  })

  it('accepts an axis modifier without falling over', () => {
    // `.y` schaltet auf die senkrechte Achse um; ohne Modifier bleibt es bei
    // der waagerechten, damit die Stellen von vorher unverändert wirken.
    const el = document.createElement('span')
    el.textContent = '100'
    for (const modifiers of [{}, { y: true }, { x: true, y: true }]) {
      vInkCenter.mounted?.(el, { modifiers } as never, null as never, null)
      expect(el.style.translate).toBe('')
      vInkCenter.unmounted?.(el, {} as never, null as never, null)
    }
  })
})
