// Anzeige-Formatierung für Zeiten und Farben. Diese Helfer standen vorher als
// gleichnamige Kopien in vier bis fünf Komponenten — mit teils unterschiedlichem
// Ausgabeformat unter demselben Namen. Die Namen hier sagen deshalb, WELCHES
// Format herauskommt.
//
// Zahlen (Chimes, Schaden …) laufen weiterhin über `formatNumber` aus
// `config/numberFormat.ts` bzw. die globale `$formatNumber`-Property.

import { SWORN_ALLY_COUNT, SWORN_ALLY_LABELS } from '@/config/constants'

/** Ganzzahl in römischer Schreibweise — Sektor-/Orbit-Nummern. */
const ROMAN_PAIRS: Array<[number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

export function toRoman(value: number): string {
  let n = Math.max(1, Math.floor(value))
  let out = ''
  for (const [num, sym] of ROMAN_PAIRS) {
    while (n >= num) {
      out += sym
      n -= num
    }
  }
  return out
}

/** Millisekunden als Uhrzeit-Countdown: `02:07:45`. */
export function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/** Millisekunden grob gerundet auf die zwei größten Einheiten: `2d 3h`, `7m 12s`. */
export function formatCompactDuration(ms: number): string {
  const secs = Math.max(0, Math.ceil(ms / 1000))
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/** Ein Ziffernblock eines Odometer-Readouts: Wert plus seine Einheit. */
export interface DurationSegment {
  /** Bereits formatiert, immer mindestens zweistellig. */
  value: string
  /** Kurzform der Einheit: `days` / `hrs` / `min` / `sec`. */
  unit: string
  /** Führender Null-Block vor der ersten Einheit mit Wert — darf gedimmt werden. */
  leadingZero: boolean
}

/**
 * Zerlegt eine Dauer in die vier festen Blöcke einer Chronometer-Anzeige.
 *
 * Immer alle vier Einheiten, auch bei frischem Spielstand (`00 00 34 13`):
 * das Readout behält seine Form vom ersten Tick an, statt bei jedem
 * Größensprung umzuspringen. Jeder Block ist zweistellig aufgefüllt, damit
 * die Breite beim Hochzählen konstant bleibt; `leadingZero` markiert die
 * noch leeren Blöcke am Anfang für eine gedämpfte Darstellung.
 */
export function durationSegments(ms: number): DurationSegment[] {
  const secs = Math.max(0, Math.floor(ms / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  const parts: Array<[number, string]> = [
    [Math.floor(secs / 86400), 'days'],
    [Math.floor((secs % 86400) / 3600), 'hrs'],
    [Math.floor((secs % 3600) / 60), 'min'],
    [secs % 60, 'sec'],
  ]
  let seenValue = false
  return parts.map(([value, unit]) => {
    const leadingZero = !seenValue && value === 0
    if (value > 0) seenValue = true
    return { value: pad(value), unit, leadingZero }
  })
}

/** Sekunden als kurze Restdauer: `5m 30s`, `40s`, `3m`. */
export function formatShortDuration(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  if (min === 0) return `${sec}s`
  if (sec === 0) return `${min}m`
  return `${min}m ${sec}s`
}

/**
 * Name of an ally sub-slot as the player reads it. The first SWORN_ALLY_COUNT
 * seats are the sworn pair and carry their own names; the bench BELOW them
 * counts from 1 again rather than continuing the raw index — a player sees three
 * bench seats, so they are Ally 1 to Ally 3, not Ally 3 to Ally 5.
 *
 * The board tooltip, the details header, the picker title and the assign toast
 * all name the same seat, so they all have to say the same thing — hence one
 * function instead of the four copies of `Ally ${sub + 1}` this replaced.
 */
export function allySlotLabel(sub: number): string {
  if (sub < SWORN_ALLY_COUNT) return SWORN_ALLY_LABELS[sub] ?? `Sworn ${sub + 1}`
  return `Ally ${sub - SWORN_ALLY_COUNT + 1}`
}

/** `#rrggbb` → `[r, g, b]`. */
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** `#rrggbb` + Alpha → `rgba(…)`-String. */
export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}
