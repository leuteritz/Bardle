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
