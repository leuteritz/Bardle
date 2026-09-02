// Anzeige-Formatierung für Zeiten und Farben. Diese Helfer standen vorher als
// gleichnamige Kopien in vier bis fünf Komponenten — mit teils unterschiedlichem
// Ausgabeformat unter demselben Namen. Die Namen hier sagen deshalb, WELCHES
// Format herauskommt.
//
// Zahlen (Chimes, Schaden …) laufen weiterhin über `formatNumber` aus
// `config/ui/numberFormat.ts` bzw. die globale `$formatNumber`-Property.

import {
  SWORN_ALLY_COUNT,
  SWORN_ALLY_LABELS,
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  SECONDS_PER_HOUR,
  SECONDS_PER_DAY,
  BADGE_COUNT_CAP,
  HP_STAGE_HIGH_PCT,
  HP_STAGE_MID_PCT,
  HP_HEALTHY_PERCENT,
  HP_CRIT_PERCENT,
} from '@/config/constants'

/** Eine Dauer in ihre vier Einheiten zerlegt. */
export interface DurationParts {
  days: number
  hours: number
  minutes: number
  seconds: number
}

/**
 * Zerlegt Sekunden in Tage/Stunden/Minuten/Sekunden.
 *
 * Die Zerlegung ist überall dieselbe, das Ausgabeformat nicht: der Pause-Timer
 * zeigt `1:07:45`, die Solar-Spalte `2d 03h 17m`, die Offline-Bilanz `3h 12m`.
 * Deshalb liefert dieser Helfer nur die Zahlen — jede Anzeige setzt sie selbst
 * zusammen, ohne die Divisoren erneut hinzuschreiben.
 */
export function splitDuration(totalSeconds: number): DurationParts {
  const secs = Math.max(0, Math.floor(totalSeconds))
  return {
    days: Math.floor(secs / SECONDS_PER_DAY),
    hours: Math.floor((secs % SECONDS_PER_DAY) / SECONDS_PER_HOUR),
    minutes: Math.floor((secs % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
    seconds: secs % SECONDS_PER_MINUTE,
  }
}

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

/** Wie ein Universum heisst — es hat keinen Namen mehr, nur seine Nummer.
 *  EINE Schreibweise fuer alle acht Anzeigestellen; getrennt geschrieben liefen
 *  „Universe VI" und „Universe 6" nebeneinander her. */
export function universeLabel(id: number): string {
  return `Universe ${toRoman(id)}`
}

/** Millisekunden als Uhrzeit-Countdown: `02:07:45`. */
export function formatClock(ms: number): string {
  const { hours, minutes, seconds } = splitDuration(ms / MS_PER_SECOND)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

/** Millisekunden als knapper Countdown: `4:12`. Negativ wird zu `0:00`. */
export function formatMinuteClock(ms: number): string {
  const secs = Math.max(0, Math.ceil(ms / MS_PER_SECOND))
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

/** Millisekunden grob gerundet auf die zwei größten Einheiten: `2d 3h`, `7m 12s`. */
export function formatCompactDuration(ms: number): string {
  const secs = Math.max(0, Math.ceil(ms / MS_PER_SECOND))
  const { days: d, hours: h, minutes: m, seconds: s } = splitDuration(secs)
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
  const { days, hours, minutes, seconds } = splitDuration(ms / MS_PER_SECOND)
  const pad = (n: number) => String(n).padStart(2, '0')
  const parts: Array<[number, string]> = [
    [days, 'days'],
    [hours, 'hrs'],
    [minutes, 'min'],
    [seconds, 'sec'],
  ]
  let seenValue = false
  return parts.map(([value, unit]) => {
    const leadingZero = !seenValue && value === 0
    if (value > 0) seenValue = true
    return { value: pad(value), unit, leadingZero }
  })
}

/**
 * Eine Abklingzeit, wie der Spieler sie liest: ganze Sekunden, AUFGERUNDET.
 *
 * Aufgerundet, damit die volle Dauer im Tooltip dieselbe Zahl ist, mit der der
 * Countdown auf der Kachel losläuft — sie zeigte einmal `23.3s`, während die
 * Uhr beim Druck auf `24` sprang. Und damit die letzte gezeigte Sekunde `1`
 * ist statt `0`: eine `0` auf einer noch kühlenden Kachel liest sich als
 * „bereit", und genau das ist sie nicht.
 *
 * Gibt eine ZAHL zurück, keinen String: die Kachel schreibt sie nackt, der
 * Tooltip mit `s` dahinter, das Command Panel reicht sie an
 * `formatShortDuration` weiter. Ein fertiger String müsste an einer der drei
 * Stellen wieder zerlegt werden.
 */
export function formatCooldownSeconds(ms: number): number {
  return Math.ceil(Math.max(0, ms) / MS_PER_SECOND)
}

/** Sekunden als kurze Restdauer: `5m 30s`, `40s`, `3m`. */
export function formatShortDuration(seconds: number): string {
  const min = Math.floor(seconds / SECONDS_PER_MINUTE)
  const sec = seconds % SECONDS_PER_MINUTE
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

/**
 * CSS-Klasse der HP-Stufe zu einem Prozentwert: `hp--high` / `hp--mid` /
 * `hp--low`. Stand vorher als identische Kopie in drei Battle-Komponenten,
 * die dieselben Kämpfer gleichzeitig anzeigen.
 */
export function hpStageClass(percent: number): string {
  if (percent > HP_STAGE_HIGH_PCT) return 'hp--high'
  if (percent > HP_STAGE_MID_PCT) return 'hp--mid'
  return 'hp--low'
}

/** Die drei Zustände der eigenen Sonne. */
export type SunVitalStage = 'green' | 'yellow' | 'red'

/**
 * Stufe der SPIELER-Sonne zu einem Prozentwert.
 *
 * Steht bewusst NEBEN `hpStageClass` und ist nicht darin aufgegangen: das dort
 * ist die Skala der Kämpfer (Champions, Bosse, Objectives) mit 60/35, hier
 * steht die des Spielers mit 50/25. Zwei Skalen, weil zwei Dinge gemeint sind —
 * die Schwellen müssen sich getrennt bewegen können.
 *
 * Gibt den STUFENNAMEN zurück, nicht die CSS-Klasse: vier Leisten, der Tooltip
 * im Profilkopf und der Store-Getter `isLow` lesen dieselbe Entscheidung, aber
 * mit drei verschiedenen Klassenpräfixen bzw. gar keinem.
 *
 * Die Vergleiche sind `>`, nicht `>=`. Das ist der Grund, warum es die Funktion
 * gibt: `isLow` prüfte einmal `< 25`, das Pause-Overlay `<= 25` — bei exakt
 * 25,0 % pulste die Leiste rot, während der Store die Sonne nicht als „low"
 * führte und die Vignette ausblieb.
 */
export function sunVitalStage(percent: number): SunVitalStage {
  if (percent > HP_HEALTHY_PERCENT) return 'green'
  if (percent > HP_CRIT_PERCENT) return 'yellow'
  return 'red'
}

/**
 * Zähler für ein Badge — alles über BADGE_COUNT_CAP wird zu `99+`.
 *
 * Header-Bogen und Profilmenü zeigen denselben Zähler; sie müssen ihn auch
 * gleich abschneiden, sonst steht im Menü `132` und im Header `99+`.
 */
export function formatBadgeCount(count: number): string {
  return count > BADGE_COUNT_CAP ? `${BADGE_COUNT_CAP}+` : String(count)
}

/**
 * Prozentpunkte mit höchstens einer Nachkommastelle, ohne `.0` am Ende:
 * `19.5` → „19.5", `13` → „13", `3.9000000000000004` → „3.9".
 *
 * Steht hier und nicht in der Karte, weil DREI Stellen dieselbe Zahl schreiben
 * müssen: der Store (Effekt-Getter und Herald-Banner) und das Codex-Panel.
 * Zeigten sie unterschiedlich gerundete Werte, sähe der Spieler im Banner eine
 * andere Wirkung als in der Karte — und die Differenz eines Rang-Anteils
 * (`19.5 − 15`) läuft ohne diese Rundung auf `4.499999999999996` hinaus.
 */
export function formatPercentValue(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
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

/** `#rrggbb` → `"r, g, b"`. Genau die Form, die der Herald als `accent`
 *  erwartet — er setzt sie in eigene `rgba()`-Ausdrücke ein. */
export function hexToRgbTriple(hex: string): string {
  return hexToRgb(hex).join(', ')
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const sat = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === R) h = ((G - B) / d) % 6
  else if (max === G) h = (B - R) / d + 2
  else h = (R - G) / d + 4
  return [((h * 60 + 360) % 360), sat, l]
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const sector = Math.floor(h / 60) % 6
  const [R, G, B] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector]
  return [R, G, B].map((v) => Math.round((v + m) * 255)) as [number, number, number]
}

/** Den Farbton um `deg` drehen, Saettigung und Helligkeit bleiben. */
export function shiftHue(hex: string, deg: number): string {
  const [h, s, l] = rgbToHsl(hexToRgb(hex))
  const rgb = hslToRgb([(((h + deg) % 360) + 360) % 360, s, l])
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('')
}

/** 1st, 2nd, 3rd, 4th — die Nummer ist alles, was ein Stern an Ordnung hat.
 *  Zwei Leser: die Marke auf der Karte und die Kachel der Manifestreihe. */
export function ordinalOf(n: number): string {
  const rest = n % 100
  if (rest >= 11 && rest <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}
