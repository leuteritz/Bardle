// Farbwahl des Sternfelds. Die Palette ist zugleich der Schlüsselraum des
// Sprite-Caches (starSprites.ts), der nie geleert wird — sie darf nicht
// wachsen. Vielfalt entsteht allein über die Gewichte je Spektralklasse.
import {
  CLUSTER_COLOR_WEIGHTS,
  SPECTRAL_STAR_PALETTE,
  STAR_BG_COLOR_WEIGHTS,
} from '@/config/constants'
import type { Rgb } from '@/utils/fx/spaceBody'

/** Index der weißen Klasse — alles andere zählt als farbig. */
export const STAR_CLASS_WHITE = 3

/** Spektralklasse aus einer Gewichtstabelle. */
export function pickStarClass(weights: readonly number[], rand: () => number): number {
  let total = 0
  for (const w of weights) total += w
  let r = rand() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}

/** Ein Ton der Klasse. */
export function toneOf(classIndex: number, rand: () => number): Rgb {
  const tones = SPECTRAL_STAR_PALETTE[Math.min(classIndex, SPECTRAL_STAR_PALETTE.length - 1)]
  return tones[Math.floor(rand() * tones.length)]
}

export function pickStarColor(weights: readonly number[], rand: () => number): Rgb {
  return toneOf(pickStarClass(weights, rand), rand)
}

/** Ein Stern des freien Felds. */
export function pickFieldStarColor(rand: () => number = Math.random): Rgb {
  return pickStarColor(STAR_BG_COLOR_WEIGHTS, rand)
}

/** Ein Stern eines Haufens — alte Haufen warm, junge blau. */
export function pickClusterStarColor(
  kind: keyof typeof CLUSTER_COLOR_WEIGHTS,
  rand: () => number = Math.random,
): Rgb {
  return pickStarColor(CLUSTER_COLOR_WEIGHTS[kind], rand)
}

/** Wächter für den Sprite-Cache: stammt die Farbe aus der Palette? */
export function isPaletteColor(rgb: Rgb): boolean {
  for (const tones of SPECTRAL_STAR_PALETTE) {
    for (const t of tones) {
      if (t[0] === rgb[0] && t[1] === rgb[1] && t[2] === rgb[2]) return true
    }
  }
  return false
}
