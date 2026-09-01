/* ── Der Void-Körper: ein Gravitationsriss in drei Ebenen ─────────────────────
   Der Void hat keine Gestalt, nur Stellen, an denen die Welt nachgibt — das
   Bild dazu ist eine LINSE, kein Wesen. `core` steht (Schattenscheibe,
   Photonenring, Hof), `whorl` dreht (einfallende Filamente, Trümmer, das
   Motiv im Schlund), `flare` kommt erst nahe der Sonne dazu.

   Vorgerendert, weil zwei Dutzend gleichzeitig laufen: im Frame kostet ein
   Wesen zwei bis sechs `drawImage`, nie einen Verlauf. Nie `Math.random` —
   alles aus dem Index, sonst sähe dasselbe Wesen nach jedem Neuaufbau anders
   aus. Aufrufer: `VoidLayer.vue` und die Porträts der Karten.                 */

import type { VoidDwellerMotif, VoidMonster, VoidRiftDef, VoidRiftSeverity } from '@/types'
import {
  VOID_DEBRIS_CHUNKS,
  VOID_FLARE_ALPHA_MAX,
  VOID_FLARE_PULSE_MS_FAR,
  VOID_FLARE_PULSE_MS_NEAR,
  VOID_PORTRAIT_FLARE_ALPHA,
  VOID_PORTRAIT_WHORL_RAD,
  VOID_RING_DOPPLER_BRIGHT,
  VOID_RING_DOPPLER_DIM,
  VOID_SPRITE_CACHE_MAX,
  VOID_SPRITE_SPAN,
  VOID_URGENT_FRAC,
  VOID_WAKE_ECHOES,
  VOID_WHORL_ARMS,
  VOID_WHORL_SPIN_MS,
  VOID_WHORL_TURNS,
} from '@/config/constants'
import { hexToRgbTriple } from '@/utils/ui/format'
import {
  clampSpriteDpr,
  createSpriteCache,
  jitter,
  lumpyPath,
  newSpriteCanvas,
  sway,
} from '@/utils/fx/spaceBody'

export type VoidSpriteLayer = 'core' | 'whorl' | 'flare'

export interface VoidSpriteSet {
  core: HTMLCanvasElement
  whorl: HTMLCanvasElement
  flare: HTMLCanvasElement
}

const cache = createSpriteCache(VOID_SPRITE_CACHE_MAX)

/** Die Signaturfarbe Richtung Weiss gezogen — der heisse Rand des Rings. */
function hot(hex: string, t: number, alpha: number): string {
  const [r, g, b] = hexToRgbTriple(hex).split(',').map((v) => Number(v))
  const m = (v: number) => Math.round(v + (255 - v) * t)
  return `rgba(${m(r)}, ${m(g)}, ${m(b)}, ${alpha})`
}

function tint(hex: string, alpha: number): string {
  return `rgba(${hexToRgbTriple(hex)}, ${alpha})`
}

/** Richtung, aus der der Ring am hellsten ist — die zugewandte Seite. */
const DOPPLER_RAD = -0.6
const RING_R = 0.86
const DISC_R = 0.8

/* ── core ───────────────────────────────────────────────────────────────────── */

export function paintVoidCore(
  ctx: CanvasRenderingContext2D,
  c: number,
  bodyR: number,
  def: VoidRiftDef,
): void {
  // Hof: der Raum dahinter wird leiser — Verzerrung, die nichts verzerrt.
  const halo = ctx.createRadialGradient(c, c, bodyR * 0.9, c, c, c)
  halo.addColorStop(0, 'rgba(3, 2, 8, 0.62)')
  halo.addColorStop(0.45, 'rgba(3, 2, 8, 0.22)')
  halo.addColorStop(1, 'rgba(3, 2, 8, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, c * 2, c * 2)

  // Innenglut in der Signaturfarbe, knapp über den Ring hinaus.
  const glow = ctx.createRadialGradient(c, c, bodyR * 0.7, c, c, bodyR * 1.5)
  glow.addColorStop(0, tint(def.color, 0.5))
  glow.addColorStop(0.35, tint(def.color, 0.18))
  glow.addColorStop(1, tint(def.color, 0))
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(c, c, bodyR * 1.5, 0, Math.PI * 2)
  ctx.fill()

  // Die Schattenscheibe: das Einzige im Bild, das kein Licht zurückgibt.
  const disc = ctx.createRadialGradient(c, c, 0, c, c, bodyR * DISC_R)
  disc.addColorStop(0, '#020108')
  disc.addColorStop(0.9, '#020108')
  disc.addColorStop(1, 'rgba(2, 1, 8, 0)')
  ctx.fillStyle = disc
  ctx.beginPath()
  ctx.arc(c, c, bodyR * DISC_R, 0, Math.PI * 2)
  ctx.fill()

  // Photonenring, in Segmenten: hell auf der zugewandten Seite, dunkel hinten.
  const segs = 64
  const ringR = bodyR * RING_R
  ctx.lineCap = 'butt'
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2
    const a1 = ((i + 1.15) / segs) * Math.PI * 2
    const face = 0.5 + 0.5 * Math.cos((a0 + a1) / 2 - DOPPLER_RAD)
    const alpha = VOID_RING_DOPPLER_DIM + (VOID_RING_DOPPLER_BRIGHT - VOID_RING_DOPPLER_DIM) * face
    ctx.beginPath()
    ctx.arc(c, c, ringR, a0, a1)
    ctx.strokeStyle = hot(def.color, 0.25 + face * 0.55, alpha)
    ctx.lineWidth = Math.max(1.2, bodyR * (0.035 + face * 0.03))
    ctx.stroke()
  }

  // Gelinstes Sternlicht: ein Bogen aussen, nur auf der hellen Seite.
  ctx.lineCap = 'round'
  const arcs = 5
  for (let i = 0; i < arcs; i++) {
    const t = i / arcs
    const a0 = DOPPLER_RAD - 1.1 + t * 2.2
    const a1 = a0 + 2.2 / arcs + 0.02
    const fade = Math.sin(Math.PI * (t + 0.5 / arcs))
    ctx.beginPath()
    ctx.arc(c, c, bodyR * 1.14, a0, a1)
    ctx.strokeStyle = hot(def.color, 0.7, 0.28 * fade)
    ctx.lineWidth = Math.max(0.8, bodyR * 0.02)
    ctx.stroke()
  }
}

/* ── whorl ──────────────────────────────────────────────────────────────────── */

/** Ein Punkt auf Arm `k` bei Fortschritt `t` (0 am Ring, 1 draussen). */
function armPoint(k: number, arms: number, t: number, bodyR: number): { x: number; y: number } {
  const rStart = bodyR * (RING_R + 0.06)
  const rEnd = bodyR * 2.0
  const a0 = (k / arms) * Math.PI * 2 + sway(k, 3) * 0.3
  const a = a0 + t * VOID_WHORL_TURNS * Math.PI * 2
  const r = rStart * Math.exp(Math.log(rEnd / rStart) * t)
  return { x: Math.cos(a) * r, y: Math.sin(a) * r }
}

export function paintDwellerMotif(
  ctx: CanvasRenderingContext2D,
  bodyR: number,
  motif: VoidDwellerMotif,
  color: string,
): void {
  if (motif === 'embers') {
    for (let i = 0; i < 7; i++) {
      const a = jitter(i, 41) * Math.PI * 2
      const d = bodyR * (0.12 + jitter(i, 43) * 0.42)
      const x = Math.cos(a) * d
      const y = Math.sin(a) * d
      const r = bodyR * (0.05 + jitter(i, 47) * 0.05)
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, hot(color, 0.85, 0.7))
      g.addColorStop(0.5, tint(color, 0.35))
      g.addColorStop(1, tint(color, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    return
  }
  // spires: Kristallspitzen, die aus dem Schlund ragen.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + sway(i, 53) * 0.35
    const base = bodyR * 0.22
    const tip = bodyR * (0.58 + jitter(i, 59) * 0.26)
    const hw = bodyR * (0.06 + jitter(i, 61) * 0.05)
    const nx = Math.cos(a + Math.PI / 2)
    const ny = Math.sin(a + Math.PI / 2)
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * base + nx * hw, Math.sin(a) * base + ny * hw)
    ctx.lineTo(Math.cos(a) * tip, Math.sin(a) * tip)
    ctx.lineTo(Math.cos(a) * base - nx * hw, Math.sin(a) * base - ny * hw)
    ctx.closePath()
    ctx.fillStyle = '#150b1e'
    ctx.fill()
    ctx.strokeStyle = tint(color, 0.55)
    ctx.lineWidth = Math.max(0.6, bodyR * 0.018)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(Math.cos(a) * tip * 0.92, Math.sin(a) * tip * 0.92, Math.max(0.8, bodyR * 0.02), 0, Math.PI * 2)
    ctx.fillStyle = hot(color, 0.8, 0.8)
    ctx.fill()
  }
}

export function paintVoidWhorl(
  ctx: CanvasRenderingContext2D,
  c: number,
  bodyR: number,
  def: VoidRiftDef,
): void {
  const arms = VOID_WHORL_ARMS[def.severity]
  const segs = 28
  ctx.save()
  ctx.translate(c, c)
  ctx.lineCap = 'round'

  // Einfallende Filamente, additiv, zum Rand hin auslaufend.
  ctx.globalCompositeOperation = 'lighter'
  for (let k = 0; k < arms; k++) {
    let prev = armPoint(k, arms, 0, bodyR)
    for (let j = 1; j <= segs; j++) {
      const t = j / segs
      const p = armPoint(k, arms, t, bodyR)
      const fade = Math.pow(1 - t, 1.3)
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(p.x, p.y)
      ctx.strokeStyle = hot(def.color, 0.35 * (1 - t), 0.62 * fade)
      ctx.lineWidth = Math.max(0.7, bodyR * 0.075 * (1 - t * 0.8))
      ctx.stroke()
      prev = p
    }
  }
  ctx.globalCompositeOperation = 'source-over'

  // Gezeitentrümmer auf den Armen — Randlicht zum Riss hin.
  const chunks = VOID_DEBRIS_CHUNKS[def.severity]
  for (let i = 0; i < chunks; i++) {
    const k = i % arms
    const t = 0.22 + jitter(i, 5) * 0.6
    const p = armPoint(k, arms, t, bodyR)
    const r = bodyR * (0.05 + jitter(i, 7) * 0.06)
    lumpyPath(ctx, p.x, p.y, r, 11 + i, 0.22, 7)
    ctx.fillStyle = '#0b0712'
    ctx.fill()
    const toward = Math.atan2(-p.y, -p.x)
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, toward - 0.9, toward + 0.9)
    ctx.strokeStyle = tint(def.color, 0.7)
    ctx.lineWidth = Math.max(0.6, r * 0.28)
    ctx.stroke()
  }

  if (def.dweller) paintDwellerMotif(ctx, bodyR, def.dweller, def.color)
  ctx.restore()
}

/* ── flare ──────────────────────────────────────────────────────────────────── */

export function paintVoidFlare(
  ctx: CanvasRenderingContext2D,
  c: number,
  bodyR: number,
  def: VoidRiftDef,
): void {
  const bloom = ctx.createRadialGradient(c, c, bodyR * 0.7, c, c, bodyR * 1.9)
  bloom.addColorStop(0, tint(def.color, 0.5))
  bloom.addColorStop(0.4, tint(def.color, 0.16))
  bloom.addColorStop(1, tint(def.color, 0))
  ctx.fillStyle = bloom
  ctx.beginPath()
  ctx.arc(c, c, bodyR * 1.9, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(c, c, bodyR * RING_R, 0, Math.PI * 2)
  ctx.strokeStyle = hot(def.color, 0.8, 0.7)
  ctx.lineWidth = Math.max(1.5, bodyR * 0.11)
  ctx.stroke()
}

/* ── Zeit ───────────────────────────────────────────────────────────────────── */

/** Winkel des Wirbels. Aus `now − spawnedAt`, damit Stase und Kontakt-Halt ihn
 *  einfrieren — beide schieben `spawnedAt`. Richtung aus der uid. */
export function voidWhorlAngle(
  m: Pick<VoidMonster, 'uid' | 'spawnedAt'>,
  severity: VoidRiftSeverity,
  now: number,
  reduced: boolean,
): number {
  const phase = ((m.uid * 0.618) % 1) * Math.PI * 2
  if (reduced) return phase
  const dir = m.uid % 2 === 0 ? 1 : -1
  return phase + (dir * ((now - m.spawnedAt) / VOID_WHORL_SPIN_MS[severity])) * Math.PI * 2
}

/** Pulsperiode des Aufflammens bei Wegfortschritt `t` — schneller zur Sonne. */
export function voidFlarePeriodMs(t: number): number {
  const u = Math.min(1, Math.max(0, (t - VOID_URGENT_FRAC) / (1 - VOID_URGENT_FRAC)))
  return VOID_FLARE_PULSE_MS_FAR + (VOID_FLARE_PULSE_MS_NEAR - VOID_FLARE_PULSE_MS_FAR) * u
}

/** Deckkraft des Aufflammens: null bis `VOID_URGENT_FRAC`, dann steigend und
 *  pulsend. Reduced motion: nur die Hüllkurve. */
export function voidFlareAlpha(t: number, now: number, reduced: boolean): number {
  if (t < VOID_URGENT_FRAC) return 0
  const u = Math.min(1, (t - VOID_URGENT_FRAC) / (1 - VOID_URGENT_FRAC))
  const envelope = u * VOID_FLARE_ALPHA_MAX
  if (reduced) return envelope
  const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((now / voidFlarePeriodMs(t)) * Math.PI * 2))
  return envelope * pulse
}

export function voidWakeEchoes(severity: VoidRiftSeverity): number {
  return VOID_WAKE_ECHOES[severity]
}

/* ── Bau und Cache ──────────────────────────────────────────────────────────── */

/** Kantenlänge, mit der ein Sprite gezeichnet werden muss, damit sein KÖRPER
 *  die gewünschte Grösse hat. */
export function voidSpriteDrawSize(sizePx: number): number {
  return sizePx * VOID_SPRITE_SPAN
}

function buildLayer(def: VoidRiftDef, layer: VoidSpriteLayer, d: number): HTMLCanvasElement | null {
  const key = `${def.id}|${layer}|${d}`
  const hit = cache.get(key)
  if (hit) return hit
  const span = Math.ceil(voidSpriteDrawSize(def.sizePx))
  const made = newSpriteCanvas(span, d)
  if (!made) return null
  const { cv, ctx } = made
  const c = span / 2
  const bodyR = def.sizePx / 2
  if (layer === 'core') paintVoidCore(ctx, c, bodyR, def)
  else if (layer === 'whorl') paintVoidWhorl(ctx, c, bodyR, def)
  else paintVoidFlare(ctx, c, bodyR, def)
  cache.set(key, cv)
  return cv
}

/** Die drei Ebenen eines Typs — EIN Cache-Zugriff je Ebene und Frame. */
export function getVoidSpriteSet(def: VoidRiftDef, dpr: number): VoidSpriteSet | null {
  const d = clampSpriteDpr(dpr)
  const core = buildLayer(def, 'core', d)
  const whorl = buildLayer(def, 'whorl', d)
  const flare = buildLayer(def, 'flare', d)
  if (!core || !whorl || !flare) return null
  return { core, whorl, flare }
}

/** Kern und Wirbel in EIN stehendes Bild für die Karten. */
export function buildVoidPortrait(
  def: VoidRiftDef,
  px: number,
  dpr: number,
): HTMLCanvasElement | null {
  const d = clampSpriteDpr(dpr)
  const key = `portrait|${def.id}|${px}|${d}`
  const hit = cache.get(key)
  if (hit) return hit
  const set = getVoidSpriteSet(def, d)
  const made = newSpriteCanvas(px, d)
  if (!set || !made) return null
  const { cv, ctx } = made
  ctx.drawImage(set.core, 0, 0, px, px)
  ctx.save()
  ctx.translate(px / 2, px / 2)
  ctx.rotate(VOID_PORTRAIT_WHORL_RAD)
  ctx.drawImage(set.whorl, -px / 2, -px / 2, px, px)
  ctx.restore()
  ctx.save()
  ctx.globalAlpha = VOID_PORTRAIT_FLARE_ALPHA
  ctx.globalCompositeOperation = 'lighter'
  ctx.drawImage(set.flare, 0, 0, px, px)
  ctx.restore()
  cache.set(key, cv)
  return cv
}

/** Nur für Tests und den Wechsel der Pixeldichte. */
export function clearVoidSpriteCache(): void {
  cache.clear()
}
