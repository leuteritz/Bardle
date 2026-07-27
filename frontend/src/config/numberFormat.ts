export function formatNumber(num: number): string {
  if (num === 0) return '0'
  if (num < 0) return '-' + formatNumber(-num)

  if (num >= 1e33) {
    return num.toExponential(2)
  }

  const units = [
    { value: 1e30, suffix: 'No' }, // Nonillion
    { value: 1e27, suffix: 'Oc' }, // Octillion
    { value: 1e24, suffix: 'Sp' }, // Septillion
    { value: 1e21, suffix: 'Sx' }, // Sextillion
    { value: 1e18, suffix: 'Qi' }, // Quintillion
    { value: 1e15, suffix: 'Qa' }, // Quadrillion
    { value: 1e12, suffix: 'T' }, // Trillion
    { value: 1e9, suffix: 'B' }, // Billion
    { value: 1e6, suffix: 'M' }, // Million
    { value: 1e3, suffix: 'K' }, // Thousand
  ]

  for (const unit of units) {
    if (num >= unit.value) {
      const formatted = (num / unit.value).toFixed(2)
      // Entferne überflüssige Nullen
      return parseFloat(formatted).toString() + unit.suffix
    }
  }

  return Math.floor(num).toString()
}

/**
 * Kurzform für enge HUD-Spalten: vier Zeichen ("947", "1.2K", "12K", "125K",
 * "1.2M") bis 1e15 — dem Bereich, in dem sich jeder Spielwert bewegt. Die
 * zweibuchstabigen Einheiten darüber (Qa, Qi, …) brauchen im Extremfall fünf.
 * formatNumber hängt immer zwei Nachkommastellen an ("12.48K") und sprengt
 * damit die Materialspalten im Header.
 */
export function formatNumberCompact(num: number): string {
  if (num < 0) return '-' + formatNumberCompact(-num)
  if (num < 1000) return Math.floor(num).toString()
  if (num >= 1e33) return num.toExponential(1)

  const units = [
    { value: 1e30, suffix: 'No' },
    { value: 1e27, suffix: 'Oc' },
    { value: 1e24, suffix: 'Sp' },
    { value: 1e21, suffix: 'Sx' },
    { value: 1e18, suffix: 'Qi' },
    { value: 1e15, suffix: 'Qa' },
    { value: 1e12, suffix: 'T' },
    { value: 1e9, suffix: 'B' },
    { value: 1e6, suffix: 'M' },
    { value: 1e3, suffix: 'K' },
  ]

  for (let i = 0; i < units.length; i++) {
    const unit = units[i]
    if (num < unit.value) continue
    const scaled = num / unit.value
    // Eine Nachkommastelle nur unterhalb von 10 und nur bei einbuchstabigen
    // Einheiten — "1.2Qa" wären fünf Zeichen.
    const decimals = scaled < 10 && unit.suffix.length === 1 ? 1 : 0
    const rounded = parseFloat(scaled.toFixed(decimals))
    // 999_999 rundet in dieser Einheit auf "1000K" — fünf Zeichen. Eine
    // Einheit höher ist derselbe Wert als "1M" geschrieben.
    if (rounded >= 1000) {
      // Über der größten Einheit (No) gibt es nichts mehr zum Hochstufen.
      if (i === 0) return num.toExponential(1)
      const next = units[i - 1]
      return parseFloat((num / next.value).toFixed(1)).toString() + next.suffix
    }
    return rounded.toString() + unit.suffix
  }

  return Math.floor(num).toString()
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '...' : str
}
