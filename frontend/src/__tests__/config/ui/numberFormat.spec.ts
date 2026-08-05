import { describe, it, expect } from 'vitest'
import { formatNumberCompact } from '../../config/numberFormat'

describe('formatNumberCompact', () => {
  it('leaves values below 1000 as plain integers', () => {
    expect(formatNumberCompact(0)).toBe('0')
    expect(formatNumberCompact(7)).toBe('7')
    expect(formatNumberCompact(934)).toBe('934')
    expect(formatNumberCompact(999)).toBe('999')
    expect(formatNumberCompact(128.7)).toBe('128')
  })

  it('keeps one decimal only below ten of a unit', () => {
    expect(formatNumberCompact(1234)).toBe('1.2K')
    expect(formatNumberCompact(9940)).toBe('9.9K')
    expect(formatNumberCompact(12480)).toBe('12K')
    expect(formatNumberCompact(123456)).toBe('123K')
    expect(formatNumberCompact(1234567)).toBe('1.2M')
  })

  it('steps up a unit instead of printing a five-character "1000K"', () => {
    expect(formatNumberCompact(999999)).toBe('1M')
    expect(formatNumberCompact(999999999)).toBe('1B')
    expect(formatNumberCompact(999499)).toBe('999K')
  })

  it('rounds 9.97K up into the two-digit form', () => {
    expect(formatNumberCompact(9970)).toBe('10K')
  })

  // Der Grund für diese Funktion: die Materialspalten im Header sind rund
  // 76px breit und tragen genau vier Zeichen.
  it('stays within four characters up to 1e15', () => {
    for (let exp = 0; exp < 15; exp++) {
      for (const mantissa of [1, 1.234, 5.5, 9.97, 9.999]) {
        const value = mantissa * 10 ** exp
        const out = formatNumberCompact(value)
        expect(out.length, `${value} → "${out}"`).toBeLessThanOrEqual(4)
      }
    }
  })

  // Oberhalb davon sind die Einheiten zweibuchstabig (Qa, Qi, …) — dort ist
  // fünf Zeichen die Grenze. Der Bereich ist spielerisch nicht erreichbar.
  it('stays within five characters up to the largest unit', () => {
    for (let exp = 15; exp < 30; exp++) {
      for (const mantissa of [1, 1.234, 5.5, 9.999]) {
        const value = mantissa * 10 ** exp
        const out = formatNumberCompact(value)
        expect(out.length, `${value} → "${out}"`).toBeLessThanOrEqual(5)
      }
    }
  })

  it('falls back to exponential above the largest unit instead of "1000No"', () => {
    expect(formatNumberCompact(9.999e32)).toBe('1.0e+33')
    expect(formatNumberCompact(5e35)).toBe('5.0e+35')
    // Zweibuchstabige Einheiten führen keine Nachkommastelle.
    expect(formatNumberCompact(2e30)).toBe('2No')
  })

  it('mirrors negatives', () => {
    expect(formatNumberCompact(-1234)).toBe('-1.2K')
  })
})
