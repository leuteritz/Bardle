import type { ObjectDirective } from 'vue'

/**
 * Wie weit die sichtbare Tinte eines Textes von der Mitte seiner Advance-Box
 * abweicht — in Pixeln, gemessen bei genau der Schriftgröße, in der der Text
 * auch gerendert wird.
 *
 * Hintergrund: MedievalSharp gibt vielen Glyphen ein asymmetrisches
 * Seitenlager; die "1" ragt sogar links aus ihrer Box heraus. Ein zentrierter
 * Text steht dadurch sichtbar links der Achse, obwohl seine Layout-Box exakt
 * mittig sitzt — gemessen bis zu −2,6px. Dazu kommt das letter-spacing, das
 * CSS auch hinter das letzte Zeichen setzt und zentrierten Text um dessen
 * halbe Breite nach links schiebt.
 *
 * Bewusst NICHT auf eine Referenzgröße normiert und in em umgerechnet: durch
 * das Hinting sind die Tintenkanten kleiner Schriftgrade nicht proportional zu
 * denen großer. Eine bei 100px gemessene Korrektur lag bei 20px Text um mehr
 * als einen Pixel daneben.
 *
 * Negativer Rückgabewert = Tinte liegt links der Boxmitte.
 */
const cache = new Map<string, number>()

let ctx: CanvasRenderingContext2D | null | undefined

function getContext(): CanvasRenderingContext2D | null {
  if (ctx !== undefined) return ctx
  ctx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  return ctx
}

export function inkCenterOffsetPx(text: string, font: string, letterSpacing: string): number {
  const key = `${font}|${letterSpacing}|${text}`
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const c = getContext()
  if (!c) return 0
  c.font = font
  // letterSpacing kennt nicht jede Engine — ohne sie fehlt nur der kleinere
  // Anteil der Korrektur, die Bearing-Korrektur greift trotzdem.
  if ('letterSpacing' in c) c.letterSpacing = letterSpacing

  const m = c.measureText(text)
  // jsdom liefert keine Tintenkanten — dann gibt es nichts zu korrigieren.
  if (typeof m.actualBoundingBoxLeft !== 'number' || !m.width) return 0

  const inkCenter = (-m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 2
  const offset = inkCenter - m.width / 2
  cache.set(key, offset)
  return offset
}

// ── vertikal ────────────────────────────────────────────────────────────────
/**
 * Wie weit die sichtbare Tinte eines Textes von der Mitte seiner Zeilenbox
 * abweicht — nach unten positiv, in Pixeln bei genau der Schriftgröße und
 * Zeilenhöhe, in der der Text auch gerendert wird.
 *
 * Dasselbe Übel wie horizontal, nur auf der anderen Achse: MedievalSharp setzt
 * Ziffern fast vollständig über die Baseline (Ascent ≫ Descent). Zentriert man
 * die Zeilenbox — `align-items: center` in einer Bar, einem Chip, einem Ring —
 * sitzt die Tinte darin sichtbar zu hoch.
 *
 * Auch dieser Versatz ist NICHT auf eine Referenzgröße normierbar, und zwar
 * weit stärker als der horizontale. Blink berechnet die Baselinelage der
 * Zeilenbox aus den auf ganze Pixel gerundeten Font-Metriken, die Tinte
 * skaliert dagegen stetig mit der Schriftgröße. Im Star-Timer gemessen:
 *
 *   12.99px (Full HD) → 0.625px nötig = 0.048em
 *   14.66px (2K)      → 1.961px nötig = 0.134em
 *
 * Ein fester em-Wert trifft daher immer nur eine Auflösung. Die vorherige
 * Konstante `top: 0.16em` stand auf 2K fast richtig (0.04px daneben) und ließ
 * die Zahl auf Full HD 1.375px zu tief stehen — neben einer 10px-Kugel gut
 * sichtbar, und genau der Unterschied, der zwischen beiden Auflösungen auffiel.
 *
 * Zwei Größen gehen in die Rechnung ein, jede aus der Quelle, die sie wirklich
 * kennt:
 *
 *   Baselinelage — im Layout gemessen (unsichtbare Sonde im DOM). Aus den
 *     Canvas-Font-Metriken hergeleitet lag sie bei 14.7px um 0.94px daneben:
 *     `fontBoundingBox*` rundet anders als Blinks Zeilenbox.
 *   Tintenkanten — per Pixel-Scan eines Canvas in der Zielgröße.
 *     `actualBoundingBox*` rundet auf ganze Pixel auf und verfehlte den Wert
 *     bei 11.3px um 0.4px, also fast um den Fehler, den es zu beheben gilt.
 *
 * Der Scan läuft bewusst OHNE Übersampling: vierfach übersampelt trifft er
 * zwar eine feinere Kante, aber die eines anders gehinteten Schriftgrads — der
 * Fehler stieg damit von 0.35px auf 0.60px und wurde zwischen den Auflösungen
 * wieder ungleich (Spannweite 0.80px statt 0.17px). Gemessen wird in genau der
 * Rasterung, in der der Text auch steht.
 *
 * Es bleibt eine Überkorrektur von 0.18–0.35px nach unten, weil der Scan die
 * schwachen Antialiasing-Säume mitzählt, die das Auge nicht mehr sieht. Sie
 * fällt über alle Schriftgrade fast gleich aus und verschiebt damit nichts
 * gegeneinander — anders als die em-Konstante, die sie ersetzt.
 *
 * Negativer Rückgabewert = Tinte liegt über der Mitte der Zeilenbox.
 */

/**
 * Die Schriftmerkmale eines Elements, aus denen beide Achsen ihre Korrektur
 * ziehen — einmal pro Element und Resize aus `getComputedStyle` gelesen.
 */
export interface InkFontDescriptor {
  /** Canvas-Kurzform `<weight> <size> <family>` */
  font: string
  letterSpacing: string
  fontFamily: string
  fontWeight: string
  /** Schriftgröße mit Einheit, so wie sie im Layout steht */
  fontSize: string
  lineHeight: string
}

interface InkEdges {
  /** Tintenkante über der Baseline, in px */
  ascent: number
  /** Tintenkante unter der Baseline, in px */
  descent: number
}

const inkEdgeCache = new Map<string, InkEdges | null>()
const baselineCache = new Map<string, number>()

/**
 * Für die senkrechte Ausdehnung zählt nur, WELCHE Zeichen vorkommen, nicht wie
 * oft und in welcher Reihenfolge. "100", "010" und "001" teilen sich damit
 * einen Cache-Eintrag — sonst bekäme eine Zahl, die jede Sekunde tickt, jedes
 * Mal einen neuen.
 */
function inkKey(text: string): string {
  return [...new Set(text)].sort().join('')
}

function measureInkEdges(chars: string, font: string, fontSize: number): InkEdges | null {
  if (typeof document === 'undefined' || !chars || !(fontSize > 0)) return null

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(fontSize * chars.length * 2 + 20)
  canvas.height = Math.ceil(fontSize * 3)
  const cx = canvas.getContext('2d', { willReadFrequently: true })
  // jsdom hat keinen 2D-Kontext — dann gibt es nichts zu korrigieren.
  if (!cx || typeof cx.getImageData !== 'function') return null

  cx.font = font
  cx.textBaseline = 'alphabetic'
  cx.fillStyle = '#fff'
  const baselineY = fontSize * 2
  cx.fillText(chars, 10, baselineY)

  let data: Uint8ClampedArray
  try {
    data = cx.getImageData(0, 0, canvas.width, canvas.height).data
  } catch {
    return null
  }

  const rowHasInk = (y: number): boolean => {
    const row = canvas.width * y
    for (let x = 0; x < canvas.width; x++) {
      if (data[((row + x) << 2) + 3] > 0) return true
    }
    return false
  }

  // Von beiden Rändern nach innen: die Glyphen füllen nur einen Bruchteil der
  // Fläche, ein voller Durchlauf wäre reine Verschwendung.
  let first = -1
  for (let y = 0; y < canvas.height; y++) {
    if (rowHasInk(y)) {
      first = y
      break
    }
  }
  if (first < 0) return null
  let last = first
  for (let y = canvas.height - 1; y > first; y--) {
    if (rowHasInk(y)) {
      last = y
      break
    }
  }

  return {
    ascent: baselineY - first,
    descent: last + 1 - baselineY,
  }
}

/**
 * Wie weit die Baseline unter der Mitte der Zeilenbox liegt — gemessen an einer
 * kurzlebigen Sonde außerhalb des Sichtfelds, weil nur das Layout selbst diese
 * Zahl zuverlässig kennt.
 *
 * Die Sonde spiegelt die Struktur der Ziele: ein zentrierender Flex-Container
 * um einen Textknoten. Der 0×0-Inline-Block darin ist der Baseline-Marker —
 * seine Oberkante sitzt per Definition auf der Baseline der Zeile.
 */
function baselineBelowBoxMiddle(
  fontFamily: string,
  fontWeight: string,
  fontSize: string,
  lineHeight: string,
): number {
  const key = `${fontFamily}|${fontWeight}|${fontSize}|${lineHeight}`
  const cached = baselineCache.get(key)
  if (cached !== undefined) return cached

  if (typeof document === 'undefined' || !document.body) return 0

  const host = document.createElement('span')
  host.style.cssText =
    'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;' +
    `display:inline-flex;align-items:center;flex:none;font-family:${fontFamily};` +
    `font-weight:${fontWeight};font-size:${fontSize};line-height:${lineHeight};`
  const line = document.createElement('span')
  line.appendChild(document.createTextNode('0'))
  const marker = document.createElement('span')
  marker.style.cssText = 'display:inline-block;width:0;height:0;'
  line.appendChild(marker)
  host.appendChild(line)
  document.body.appendChild(host)

  const hostRect = host.getBoundingClientRect()
  const markerRect = marker.getBoundingClientRect()
  document.body.removeChild(host)

  // jsdom layoutet nicht — alle Rects sind 0, die Sonde liefert nichts.
  if (!hostRect.height) return 0

  const value = markerRect.top - (hostRect.top + hostRect.height / 2)
  baselineCache.set(key, value)
  return value
}

export function inkMiddleOffsetPx(text: string, d: InkFontDescriptor): number {
  const chars = inkKey(text)
  if (!chars) return 0

  const edgeKey = `${d.font}|${chars}`
  let edges = inkEdgeCache.get(edgeKey)
  if (edges === undefined) {
    edges = measureInkEdges(chars, d.font, parseFloat(d.fontSize))
    inkEdgeCache.set(edgeKey, edges)
  }
  if (!edges) return 0

  const baseline = baselineBelowBoxMiddle(d.fontFamily, d.fontWeight, d.fontSize, d.lineHeight)
  const offset = baseline + (edges.descent - edges.ascent) / 2
  return Number.isFinite(offset) ? offset : 0
}

/** Nach einem Font-Load sind die alten Messungen die der Fallback-Schrift. */
export function clearInkOffsetCache(): void {
  cache.clear()
  inkEdgeCache.clear()
  baselineCache.clear()
}

// ── v-ink-center ────────────────────────────────────────────────────────────
// Schiebt zentrierten Text um seine gemessene Tinten-Abweichung zurück auf die
// Achse. Gedacht für Text, der sichtbar an einer Mitte ausgerichtet ist:
// Zahlen in Ringen und Badges, Werte über Balken, Labels unter Icons.
//
//   v-ink-center      waagerecht (Voreinstellung)
//   v-ink-center.y    senkrecht — für Text, der in einer Zeile mittig neben
//                     Icons, Kugeln oder Balken stehen soll
//   v-ink-center.x.y  beides
//
// Verschoben wird über die eigenständige CSS-Property `translate`, NICHT über
// `transform` — sonst würde ein vorhandenes `translateX(-50%)` (Badges) oder
// eine transform-Animation überschrieben. Elemente, die `translate` selbst im
// CSS setzen, dürfen die Direktive folglich nicht tragen.
//
// Die senkrechte Achse setzt eine einzeilige Zeilenbox voraus — bei umbrechendem
// Text gibt es keine eine Mitte, auf die sich die Tinte legen ließe.

interface ElementState {
  descriptor: InkFontDescriptor | null
  x: boolean
  y: boolean
  generation: number
  /**
   * Optionaler Bindungswert als Cache-Schlüssel: Elemente, deren Schriftgröße
   * nicht am Viewport hängt, sondern an einer gemessenen Größe (Bottom-Crest),
   * ändern sie ohne Resize — dann ist der gecachte Deskriptor der einer anderen
   * Schriftgröße, und die Korrektur säße daneben.
   */
  key?: unknown
}

const states = new WeakMap<HTMLElement, ElementState>()
const active = new Set<HTMLElement>()
let generation = 0
let listenersBound = false

function bindListeners(): void {
  if (listenersBound || typeof window === 'undefined') return
  listenersBound = true
  // Schriftgröße hängt an vw/--header-height: nach einem Resize kann sich das
  // Verhältnis von letter-spacing zur Schriftgröße geändert haben.
  // Schriftgrößen hängen an vw und --header-height: nach einem Resize ist die
  // in px gemessene Korrektur nicht mehr die richtige.
  window.addEventListener('resize', () => {
    generation++
    active.forEach(applyInkCentering)
  })
  // Vor dem Font-Load misst der Canvas die Fallback-Schrift.
  document.fonts?.ready.then(() => {
    clearInkOffsetCache()
    generation++
    active.forEach(applyInkCentering)
  })
}

function stateFor(el: HTMLElement): ElementState {
  const hit = states.get(el)
  if (hit && hit.generation === generation && hit.descriptor) return hit
  // getComputedStyle nur einmal pro Element und Generation — die Direktive
  // läuft auch an Zahlen, die sich jede Sekunde ändern.
  const cs = getComputedStyle(el)
  const next: ElementState = {
    descriptor: {
      font: `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
      letterSpacing: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
    },
    // Ohne Modifier bleibt es bei der waagerechten Korrektur — so wirken die
    // Stellen weiter, die es vor der senkrechten Achse schon gab.
    x: hit?.x ?? true,
    y: hit?.y ?? false,
    generation,
    key: hit?.key,
  }
  states.set(el, next)
  return next
}

function applyInkCentering(el: HTMLElement): void {
  const text = (el.textContent ?? '').trim()
  if (!text) {
    el.style.translate = ''
    return
  }
  const state = stateFor(el)
  const d = state.descriptor!
  const dx = state.x ? -inkCenterOffsetPx(text, d.font, d.letterSpacing) : 0
  const dy = state.y ? -inkMiddleOffsetPx(text, d) : 0
  el.style.translate = dx || dy ? `${dx.toFixed(2)}px ${dy.toFixed(2)}px` : ''
}

export const vInkCenter: ObjectDirective<HTMLElement> = {
  mounted(el, binding) {
    bindListeners()
    active.add(el)
    const mods = binding?.modifiers ?? {}
    // `.y` allein heißt: nur senkrecht. Erst `.x.y` will beide Achsen.
    states.set(el, {
      descriptor: null,
      x: mods.x === true || mods.y !== true,
      y: mods.y === true,
      generation: -1,
      key: binding?.value,
    })
    applyInkCentering(el)
  },
  updated(el, binding) {
    // Ein geänderter Bindungswert (z. B. `v-ink-center="fontSize"`) verwirft den
    // Deskriptor — sonst korrigierte die neue Größe mit den alten Tintenmaßen.
    const state = states.get(el)
    if (state && state.key !== binding?.value) {
      state.key = binding?.value
      state.descriptor = null
      state.generation = -1
    }
    applyInkCentering(el)
  },
  unmounted(el) {
    active.delete(el)
  },
}
