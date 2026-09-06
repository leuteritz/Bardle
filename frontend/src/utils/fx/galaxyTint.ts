import {
  GALAXY_GLOW_PEAK,
  GALAXY_GLOW_WHITE_LIFT,
  UNIVERSE_TINT_HUE_PULL,
  UNIVERSE_TINT_LUMA_STEPS,
  UNIVERSE_TINT_NEUTRAL_ID,
  UNIVERSE_TINT_SAT_PULL,
} from '@/config/constants'
import { GALAXY_THEMES, type GalaxyTheme } from '@/config/world/galaxyThemes'
import { getUniverse } from '@/config/progression/universes'
import { hexToRgb } from '@/utils/ui/format'

type Rgb = [number, number, number]

// Rec. 709 — dieselbe Wägung, mit der die Penumbra ihre Tinte normiert.
const luma = ([r, g, b]: Rgb): number => 0.2126 * r + 0.7152 * g + 0.0722 * b

/**
 * Die Farbwelt einer Galaxie, gesehen aus einem Universum.
 *
 * Die zwanzig Themes bleiben der Wurf, das Universum ist der Blickwinkel: sein
 * `tint` zieht FARBTON und Sättigung zu sich, die Luminanz jedes einzelnen
 * Farbwerts bleibt. Dieselbe Lehre wie die Penumbra-Tinte — der Ton sagt
 * WELCHES Universum, die Helligkeit bleibt. Voll gemischt hellte der
 * Vollbild-Schleier (`.galaxy-tint-overlay`, 18 %) auf und der Raum verlöre
 * seine Schwärze; die Theme-Akzente sind nicht zufällig sehr dunkel.
 *
 * Universum I tönt NICHT und liefert die rohe Referenz zurück — es ist der
 * Zustand, an dem der Spieler den Unterschied ab Universum II überhaupt bemerkt.
 *
 * Der Zug ist reine ANZEIGE: `pickThemeIndex` bleibt universumsblind, im Save
 * steht weiter der rohe `themeIndex`. Das ist Vertrag, nicht Bequemlichkeit —
 * der Archiv-Nachtrag zieht dieselbe Kette nach, und `CompletedGalaxyRecord`
 * trägt `themeIndex` und `universe` ohnehin nebeneinander.
 */
const themeCache = new Map<string, GalaxyTheme>()

export function tintedTheme(themeIndex: number, universeId: number): GalaxyTheme {
  const key = ((themeIndex % GALAXY_THEMES.length) + GALAXY_THEMES.length) % GALAXY_THEMES.length
  const raw = GALAXY_THEMES[key]
  if (universeId === UNIVERSE_TINT_NEUTRAL_ID) return raw
  const tint = getUniverse(universeId)?.tint
  if (tint === undefined) return raw

  const cacheKey = `${universeId}:${key}`
  const hit = themeCache.get(cacheKey)
  if (hit !== undefined) return hit

  const [th, ts] = toHsl(hexToRgb(tint))
  const made: GalaxyTheme = {
    name: raw.name,
    // Nur die Farbwerte tauschen: `linear-gradient(45deg, …)` bleibt wörtlich stehen.
    gradient: raw.gradient.replace(/#[0-9a-f]{6}/gi, (hex) => toHex(pull(hexToRgb(hex), th, ts))),
    accentColor: toHex(pull(hexToRgb(raw.accentColor), th, ts)),
    nebulaColors: raw.nebulaColors.map((c) => pullRgbaString(c, th, ts)) as GalaxyTheme['nebulaColors'],
  }
  themeCache.set(cacheKey, made)
  return made
}

/**
 * Der Farbton wandert auf dem kürzeren Bogen, die Luminanz wird zurückgeholt.
 *
 * Zurückgeholt per Bisektion über die Helligkeit, nicht per Kanalskalierung:
 * skaliert klemmte ein heller Nebel (`rgba(220, 190, 20, …)`) bei 255, sobald
 * der Zug ihn ins Blaue schob, und verlor dabei bis zu 6 Luminanzstufen. Über
 * L ist die Luminanz von Schwarz nach Weiss streng monoton, die Suche trifft
 * also immer — und das nur beim Cache-Miss.
 */
function pull(rgb: Rgb, th: number, ts: number): Rgb {
  const y0 = luma(rgb)
  const [h, s, l] = toHsl(rgb)
  let dh = th - h
  if (dh > 180) dh -= 360
  if (dh < -180) dh += 360
  const hue = (h + dh * UNIVERSE_TINT_HUE_PULL + 360) % 360
  const sat = s + (ts - s) * UNIVERSE_TINT_SAT_PULL

  let lo = 0
  let hi = 1
  let out = fromHsl(hue, sat, l)
  for (let i = 0; i < UNIVERSE_TINT_LUMA_STEPS; i++) {
    const mid = (lo + hi) / 2
    out = fromHsl(hue, sat, mid)
    if (luma(out) < y0) lo = mid
    else hi = mid
  }
  return out
}

/** `rgba(88, 28, 135, 0.10)` — die drei Kanäle ziehen, das Alpha bleibt. */
function pullRgbaString(css: string, th: number, ts: number): string {
  const m = css.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (m === null) return css
  const [r, g, b] = pull([Number(m[1]), Number(m[2]), Number(m[3])], th, ts)
  return css.replace(m[0], `${r}, ${g}, ${b}`)
}

const toHex = (rgb: Rgb): string =>
  '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('')

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
const cache = new Map<string, Rgb>()

export function themeGlowRgb(themeIndex: number, universeId: number): Rgb {
  const key = `${universeId}:${themeIndex % GALAXY_THEMES.length}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const [r, g, b] = hexToRgb(tintedTheme(themeIndex, universeId).accentColor)
  const scale = GALAXY_GLOW_PEAK / Math.max(r, g, b, 1)
  const lift = (v: number) =>
    Math.round(v * scale + (255 - v * scale) * GALAXY_GLOW_WHITE_LIFT)
  const glow: Rgb = [lift(r), lift(g), lift(b)]
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
