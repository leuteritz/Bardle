import type { VoidRiftDef } from '@/types'
import { VOID_TENDRIL_COUNT } from '@/config/constants'
import { hexToRgba } from '@/utils/ui/format'

/**
 * Vorgerenderte Körper der Void-Wesen — EIN Offscreen-Canvas je Typ, das der
 * Layer pro Frame nur noch als Ganzes zeichnet.
 *
 * Der Grund ist die Menge. Zwei Dutzend Wesen gleichzeitig hiesse sonst zwei
 * Dutzend `createRadialGradient` plus Zacken plus Clipping-Pfade pro Frame, und
 * Gradienten sind das Teuerste, was eine 2D-Canvas kennt: sie werden bei jedem
 * Aufruf neu aufgebaut. Vorgerendert kostet ein Wesen im Frame genau ein
 * `drawImage` — und das ist unabhängig davon, wie aufwendig sein Körper ist.
 *
 * Gerendert wird bei voller Anzeigegrösse mal Pixeldichte; im Bild erscheinen
 * die Wesen fast immer kleiner (sie wachsen erst auf dem Weg zur Sonne), also
 * wird durchweg herunterskaliert und bleibt scharf.
 */

/** Wie weit die Aura über den Körper hinausreicht. */
const AURA_SCALE = 2.15

interface SpriteEntry {
  canvas: HTMLCanvasElement
  /** Kantenlänge des Canvas in Gerätepixeln. */
  px: number
  /** Für welche Pixeldichte gebaut — ändert sie sich, wird neu gebaut. */
  dpr: number
  /** Steht das Bewohner-Bild schon drin? */
  withDweller: boolean
}

const cache = new Map<string, SpriteEntry>()
const images = new Map<string, HTMLImageElement>()

/** Lädt das Bewohner-Bild einmal je Pfad und verwirft das Sprite, sobald es da
 *  ist — der nächste Zugriff baut es dann samt Bild neu. */
function ensureImage(def: VoidRiftDef): HTMLImageElement | null {
  if (!def.dweller) return null
  const existing = images.get(def.dweller)
  if (existing) return existing.complete && existing.naturalWidth > 0 ? existing : null

  const img = new Image()
  img.decoding = 'async'
  img.src = def.dweller
  img.onload = () => cache.delete(def.id)
  images.set(def.dweller, img)
  return null
}

function build(def: VoidRiftDef, dpr: number): SpriteEntry {
  const img = ensureImage(def)
  const px = Math.ceil(def.sizePx * AURA_SCALE * dpr)
  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')
  if (!ctx) return { canvas, px, dpr, withDweller: false }

  const c = px / 2
  const bodyR = (def.sizePx / 2) * dpr

  // ── Aura ──
  const aura = ctx.createRadialGradient(c, c, bodyR * 0.2, c, c, c)
  aura.addColorStop(0, hexToRgba(def.color, 0.42))
  aura.addColorStop(0.42, hexToRgba(def.color, 0.16))
  aura.addColorStop(1, hexToRgba(def.color, 0))
  ctx.fillStyle = aura
  ctx.fillRect(0, 0, px, px)

  // ── Zacken ──
  // Aus dem Index abgeleitete Längen, nie gewürfelt: ein Math.random hier
  // liesse dasselbe Wesen bei jedem Neuaufbau anders aussehen.
  ctx.save()
  ctx.translate(c, c)
  ctx.lineCap = 'round'
  for (let i = 0; i < VOID_TENDRIL_COUNT; i++) {
    const angle = (i / VOID_TENDRIL_COUNT) * Math.PI * 2
    const len = bodyR * (1.18 + ((i * 7) % 5) * 0.16)
    const grad = ctx.createLinearGradient(0, 0, Math.cos(angle) * len, Math.sin(angle) * len)
    grad.addColorStop(0, hexToRgba(def.color, 0.55))
    grad.addColorStop(1, hexToRgba(def.color, 0))
    ctx.strokeStyle = grad
    ctx.lineWidth = Math.max(1.5, bodyR * 0.08)
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * bodyR * 0.55, Math.sin(angle) * bodyR * 0.55)
    ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len)
    ctx.stroke()
  }
  ctx.restore()

  // ── Schlund ──
  // Eine Fehlstelle, kein Körper: dunkler als der Hintergrund, mit der
  // Signaturfarbe erst am Rand, wo sie ihn vom Raum trennt.
  ctx.save()
  ctx.translate(c, c)
  ctx.rotate(-0.24)
  ctx.beginPath()
  ctx.ellipse(0, 0, bodyR, bodyR * 0.72, 0, 0, Math.PI * 2)
  ctx.clip()

  const maw = ctx.createRadialGradient(0, 0, 0, 0, 0, bodyR)
  maw.addColorStop(0, '#05030a')
  maw.addColorStop(0.52, '#0b0616')
  maw.addColorStop(0.82, hexToRgba(def.color, 0.32))
  maw.addColorStop(1, hexToRgba(def.color, 0.08))
  ctx.fillStyle = maw
  ctx.fillRect(-bodyR, -bodyR, bodyR * 2, bodyR * 2)

  // ── Bewohner ──
  // Innerhalb desselben Clips, damit er nur durch den Schlund zu sehen ist,
  // und mit einer Vignette darüber: so läuft die Silhouette zum Rand hin ins
  // Nichts, statt an einer Bildkante zu enden.
  if (img) {
    const dw = bodyR * 2.3
    const dh = (dw * img.naturalHeight) / img.naturalWidth
    ctx.save()
    ctx.rotate(0.24)
    ctx.globalAlpha = 0.92
    ctx.drawImage(img, -dw / 2, -dh / 2 - bodyR * 0.08, dw, dh)
    ctx.restore()

    const veil = ctx.createRadialGradient(0, 0, 0, 0, 0, bodyR)
    veil.addColorStop(0, 'rgba(5,3,10,0.05)')
    veil.addColorStop(0.34, 'rgba(5,3,10,0.5)')
    veil.addColorStop(0.66, 'rgba(5,3,10,0.93)')
    veil.addColorStop(1, '#05030a')
    ctx.fillStyle = veil
    ctx.fillRect(-bodyR, -bodyR, bodyR * 2, bodyR * 2)
  }
  ctx.restore()

  // ── Rand ──
  ctx.save()
  ctx.translate(c, c)
  ctx.rotate(-0.24)
  ctx.strokeStyle = hexToRgba(def.color, 0.75)
  ctx.lineWidth = Math.max(1.5, bodyR * 0.045)
  ctx.beginPath()
  ctx.ellipse(0, 0, bodyR, bodyR * 0.72, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  return { canvas, px, dpr, withDweller: !!img }
}

/**
 * Das Sprite eines Typs. Baut es beim ersten Zugriff und nach jeder Änderung
 * der Pixeldichte neu; ein nachgeladenes Bewohner-Bild verwirft den Eintrag
 * selbst, sodass der nächste Zugriff ihn samt Bild neu aufbaut.
 */
export function getVoidSprite(def: VoidRiftDef, dpr: number): HTMLCanvasElement {
  const hit = cache.get(def.id)
  if (hit && hit.dpr === dpr) return hit.canvas
  const entry = build(def, dpr)
  cache.set(def.id, entry)
  return entry.canvas
}

/** Kantenlänge, mit der ein Sprite gezeichnet werden muss, damit sein KÖRPER
 *  die gewünschte Grösse hat — die Aura ragt darüber hinaus. */
export function voidSpriteDrawSize(sizePx: number): number {
  return sizePx * AURA_SCALE
}

/** Nur für Tests und den Wechsel der Pixeldichte. */
export function clearVoidSpriteCache(): void {
  cache.clear()
}
