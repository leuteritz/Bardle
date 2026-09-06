import { describe, it, expect } from 'vitest'
import { tintedTheme, themeGlowRgb } from '@/utils/fx/galaxyTint'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'
import { universes } from '@/config/progression/universes'
import { UNIVERSE_TINT_NEUTRAL_ID, MIN_THEME_HUE_DISTANCE } from '@/config/constants'
import { hexToRgb } from '@/utils/ui/format'

/* ── Das Universum toent seine Galaxien ───────────────────────────────────────
   Der zufaellige Themewurf bleibt, das Universum ist der Blickwinkel: sein
   `tint` zieht FARBTON und Saettigung zu sich, die Luminanz jedes Farbwerts
   bleibt. Zwei Waende halten das: der Neutralfall (Universum I) und der
   Farbtonabstand, an dem sich die Galaxien untereinander noch unterscheiden. */

type Rgb = [number, number, number]

const luma = ([r, g, b]: Rgb): number => 0.2126 * r + 0.7152 * g + 0.0722 * b

function hue([r, g, b]: Rgb): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 0
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return (h * 60 + 360) % 360
}

function hueGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/** Alle Farbwerte eines Themes als RGB — Akzent, vier Gradient-Stops, vier Nebel. */
function swatches(theme: (typeof GALAXY_THEMES)[number]): Rgb[] {
  const grad = theme.gradient.match(/#[0-9a-f]{6}/gi) ?? []
  const neb = theme.nebulaColors.map((c) => {
    const m = c.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    return [Number(m![1]), Number(m![2]), Number(m![3])] as Rgb
  })
  return [hexToRgb(theme.accentColor), ...grad.map(hexToRgb), ...neb]
}

const TINTING = universes.filter((u) => u.id !== UNIVERSE_TINT_NEUTRAL_ID)

describe('tintedTheme — Universum I ist der Referenzzustand', () => {
  it('liefert die rohe Referenz zurueck, bitgleich', () => {
    for (let i = 0; i < GALAXY_THEMES.length; i++) {
      expect(tintedTheme(i, UNIVERSE_TINT_NEUTRAL_ID)).toBe(GALAXY_THEMES[i])
    }
  })

  it('faellt auf die rohe Referenz zurueck, wenn das Universum unbekannt ist', () => {
    expect(tintedTheme(3, 9999)).toBe(GALAXY_THEMES[3])
  })
})

describe('tintedTheme — der Ton wandert, die Helligkeit bleibt', () => {
  // Die Wand: voll gemischt hellte der Vollbild-Schleier auf und der Raum
  // verloere seine Schwaerze. Dieselbe Lehre wie FIRMAMENT_PENUMBRA_INK_LUMA.
  it('haelt die Luminanz jedes einzelnen Farbwerts', () => {
    for (const u of TINTING) {
      for (let i = 0; i < GALAXY_THEMES.length; i++) {
        const before = swatches(GALAXY_THEMES[i])
        const after = swatches(tintedTheme(i, u.id))
        expect(after).toHaveLength(before.length)
        for (let k = 0; k < before.length; k++) {
          expect(Math.abs(luma(after[k]) - luma(before[k]))).toBeLessThanOrEqual(1.5)
        }
      }
    }
  })

  it('zieht den Farbton messbar zum Universumston', () => {
    for (const u of TINTING) {
      const target = hue(hexToRgb(u.tint))
      let moved = 0
      for (let i = 0; i < GALAXY_THEMES.length; i++) {
        const raw = hue(hexToRgb(GALAXY_THEMES[i].accentColor))
        const lit = hue(hexToRgb(tintedTheme(i, u.id).accentColor))
        if (hueGap(raw, target) < 8) continue
        expect(hueGap(lit, target)).toBeLessThan(hueGap(raw, target))
        moved++
      }
      expect(moved).toBeGreaterThan(GALAXY_THEMES.length / 2)
    }
  })
})

describe('tintedTheme — die Galaxien bleiben unterscheidbar', () => {
  // Der Zug komprimiert die Farbtonabstaende. Waechst er unbemerkt, kippen die
  // Galaxien eines Universums zu Varianten EINES Tons — das bindet diese Wand.
  it('haelt zwischen zwei Themes mit vollem Rohabstand mindestens die Haelfte', () => {
    const FLOOR = MIN_THEME_HUE_DISTANCE / 2
    for (const u of TINTING) {
      for (let a = 0; a < GALAXY_THEMES.length; a++) {
        for (let b = a + 1; b < GALAXY_THEMES.length; b++) {
          const rawGap = hueGap(
            hue(hexToRgb(GALAXY_THEMES[a].accentColor)),
            hue(hexToRgb(GALAXY_THEMES[b].accentColor)),
          )
          if (rawGap < MIN_THEME_HUE_DISTANCE) continue
          const litGap = hueGap(
            hue(hexToRgb(tintedTheme(a, u.id).accentColor)),
            hue(hexToRgb(tintedTheme(b, u.id).accentColor)),
          )
          expect(litGap).toBeGreaterThanOrEqual(FLOOR)
        }
      }
    }
  })
})

describe('tintedTheme — die Form der Farbwerte bleibt', () => {
  it('behaelt Gradient-Form und Nebel-Alpha', () => {
    for (const u of TINTING) {
      for (let i = 0; i < GALAXY_THEMES.length; i++) {
        const raw = GALAXY_THEMES[i]
        const lit = tintedTheme(i, u.id)
        expect(lit.name).toBe(raw.name)
        expect(lit.gradient.startsWith('linear-gradient(45deg, ')).toBe(true)
        expect(lit.gradient.match(/#[0-9a-f]{6}/gi)).toHaveLength(4)
        expect(lit.accentColor).toMatch(/^#[0-9a-f]{6}$/)
        for (let k = 0; k < 4; k++) {
          const alpha = (s: string) => s.match(/,\s*([\d.]+)\s*\)$/)![1]
          expect(alpha(lit.nebulaColors[k])).toBe(alpha(raw.nebulaColors[k]))
        }
      }
    }
  })

  it('memoisiert — derselbe Aufruf gibt dieselbe Referenz', () => {
    expect(tintedTheme(5, 8)).toBe(tintedTheme(5, 8))
    expect(tintedTheme(5, 8)).not.toBe(tintedTheme(5, 7))
  })
})

describe('themeGlowRgb — der Leuchtton folgt der Toenung', () => {
  it('trennt die Universen und bleibt auf Leuchtkraft normiert', () => {
    for (const u of universes) {
      for (let i = 0; i < GALAXY_THEMES.length; i++) {
        const glow = themeGlowRgb(i, u.id)
        expect(Math.max(...glow)).toBeGreaterThan(200)
        expect(glow.every((c) => c >= 0 && c <= 255)).toBe(true)
      }
    }
    // Dieselbe Galaxie, zwei Universen, zwei Leuchttoene. Blue Veil (0) unter
    // dem Blut von Universum VIII — ein Themenakzent, der dessen Ton NICHT
    // schon selbst traegt (Crimson Expanse taete es und aendert sich zu Recht kaum).
    expect(themeGlowRgb(0, 8)).not.toEqual(themeGlowRgb(0, UNIVERSE_TINT_NEUTRAL_ID))
  })
})
