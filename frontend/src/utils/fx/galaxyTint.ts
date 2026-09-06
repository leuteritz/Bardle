import { GALAXY_GLOW_PEAK, GALAXY_GLOW_WHITE_LIFT } from '@/config/constants'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'

// Der Leuchtton einer Galaxie — EINE Ableitung für alle, die ihn brauchen.
//
// Die Theme-Akzente sind absichtlich sehr dunkel (`#0a1a3e`, `#3a0a60`, …): sie
// tönen einen Vollbild-Schleier bei 18 % Deckkraft. Als Farbe für etwas, das
// LEUCHTEN soll — Minimap-Partikel, die Tunnelmündung des Warps, der Blitz am
// Schnitt — taugen sie nicht. Also auf Leuchtkraft normieren und leicht nach
// Weiss heben; der Farbton bleibt dabei exakt erhalten, weil die Abbildung
// affin über alle drei Kanäle läuft. Das ist wichtig: `pickThemeIndex` wählt
// die nächste Welt nach Farbton-ABSTAND, und diese Ableitung darf ihn nicht
// wieder einebnen.
const cache = new Map<number, [number, number, number]>()

export function themeGlowRgb(themeIndex: number): [number, number, number] {
  const key = themeIndex % GALAXY_THEMES.length
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const hex = GALAXY_THEMES[key].accentColor
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const scale = GALAXY_GLOW_PEAK / Math.max(r, g, b, 1)
  const lift = (v: number) =>
    Math.round(v * scale + (255 - v * scale) * GALAXY_GLOW_WHITE_LIFT)
  const glow: [number, number, number] = [lift(r), lift(g), lift(b)]
  cache.set(key, glow)
  return glow
}

/**
 * Zwei Leuchttöne mischen — über den FARBKREIS, nicht über RGB.
 *
 * Linear in RGB führt der Weg zwischen zwei gesättigten Tönen durch Grau: auf
 * halber Strecke zwischen Blau und Grün stand ein müdes Teal, und die Reise sah
 * dort aus, als ginge ihr die Farbe aus. Über den Farbton genommen wandert sie
 * stattdessen am Rand des Kreises entlang und bleibt auf ganzer Strecke satt.
 * Genommen wird immer der kürzere Bogen.
 */
export function mixGlow(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  const k = t < 0 ? 0 : t > 1 ? 1 : t
  const [ah, as, al] = toHsl(a)
  const [bh, bs, bl] = toHsl(b)
  let dh = bh - ah
  if (dh > 180) dh -= 360
  if (dh < -180) dh += 360
  return fromHsl((ah + dh * k + 360) % 360, as + (bs - as) * k, al + (bl - al) * k)
}

function toHsl(rgb: readonly [number, number, number]): [number, number, number] {
  const r = rgb[0] / 255
  const g = rgb[1] / 255
  const b = rgb[2] / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
  else if (max === g) h = ((b - r) / d + 2) * 60
  else h = ((r - g) / d + 4) * 60
  return [h, s, l]
}

function fromHsl(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hk = h / 360
  const ch = (n: number) => {
    let x = hk + n
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return [Math.round(ch(1 / 3) * 255), Math.round(ch(0) * 255), Math.round(ch(-1 / 3) * 255)]
}
