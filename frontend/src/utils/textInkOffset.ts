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

/** Nach einem Font-Load sind die alten Messungen die der Fallback-Schrift. */
export function clearInkOffsetCache(): void {
  cache.clear()
}

// ── v-ink-center ────────────────────────────────────────────────────────────
// Schiebt zentrierten Text um seine gemessene Tinten-Abweichung zurück auf die
// Achse. Gedacht für Text, der sichtbar an einer Mitte ausgerichtet ist:
// Zahlen in Ringen und Badges, Werte über Balken, Labels unter Icons.
//
// Verschoben wird über die eigenständige CSS-Property `translate`, NICHT über
// `transform` — sonst würde ein vorhandenes `translateX(-50%)` (Badges) oder
// eine transform-Animation überschrieben. Elemente, die `translate` selbst im
// CSS setzen, dürfen die Direktive folglich nicht tragen.

interface FontDescriptor {
  font: string
  letterSpacing: string
  generation: number
}

const descriptors = new WeakMap<HTMLElement, FontDescriptor>()
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

function descriptorFor(el: HTMLElement): FontDescriptor {
  const hit = descriptors.get(el)
  if (hit && hit.generation === generation) return hit
  // getComputedStyle nur einmal pro Element und Generation — die Direktive
  // läuft auch an Zahlen, die sich jede Sekunde ändern.
  const cs = getComputedStyle(el)
  const next: FontDescriptor = {
    font: `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
    letterSpacing: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing,
    generation,
  }
  descriptors.set(el, next)
  return next
}

function applyInkCentering(el: HTMLElement): void {
  const text = (el.textContent ?? '').trim()
  if (!text) {
    el.style.translate = ''
    return
  }
  const { font, letterSpacing } = descriptorFor(el)
  const shift = -inkCenterOffsetPx(text, font, letterSpacing)
  el.style.translate = shift ? `${shift.toFixed(2)}px 0` : ''
}

export const vInkCenter: ObjectDirective<HTMLElement> = {
  mounted(el) {
    bindListeners()
    active.add(el)
    applyInkCentering(el)
  },
  updated(el) {
    applyInkCentering(el)
  },
  unmounted(el) {
    active.delete(el)
  },
}
