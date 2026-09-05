/* ── Planeten des Star-Fight-Modals als Raster — EINMAL je Schlüssel ─────────
   utils/planetDraw ist SVG ohne Cache und war der teuerste Posten beim Öffnen.
   Klein (Systemansicht) und gross (Hero) kommen aus DEMSELBEN Painter mit
   demselben Seed und Lichtwinkel, damit die LOD-Blende deckungsgleich ist.
   Im DOM hängt ein <img>, kein Canvas (Compositor-Ebene je Host-Canvas).     */

import {
  STAR_FIGHT_PLANET_LIGHT_STEPS,
  STAR_FIGHT_PLANET_SPRITE_MAX_PX,
  STAR_FIGHT_PLANET_SPRITE_SPAN,
  STAR_FIGHT_PLANET_SPRITE_SPAN_RINGED,
  STAR_FIGHT_PLANET_SPRITE_CANVAS_MAX,
  STAR_FIGHT_PLANET_SPRITE_URL_MAX,
  STAR_FIGHT_PLANET_SPRITE_CROSSFADE_MS,
} from '@/config/constants'
import { drawPlanet, NS } from '@/utils/planetDraw'
import { clampSpriteDpr, newSpriteCanvas, paintTerminator } from '@/utils/fx/spaceBody'
import type { PlanetType } from '@/types'

const TWO_PI = Math.PI * 2
// Der Terminator endet knapp innerhalb der Scheibe, sonst schneidet er die Kante hart
const TERMINATOR_R_K = 0.92
// Das SVG wird in seiner eigenen Auflösung gerastert, nicht in der des Ziels
const SVG_VIEW = 600

/** FNV-1a — stabil je planetId, verschieden für `star-planet-41` / `-42`. */
export function planetSeedFor(planetId: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < planetId.length; i++) {
    hash ^= planetId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Kante des Sprites als Vielfaches des Durchmessers — Ringe reichen bis 1,9 r. */
export function planetSpriteSpan(type: PlanetType): number {
  return type === 'ringed' ? STAR_FIGHT_PLANET_SPRITE_SPAN_RINGED : STAR_FIGHT_PLANET_SPRITE_SPAN
}

/** Lichtwinkel auf STAR_FIGHT_PLANET_LIGHT_STEPS quantisiert, periodisch. */
export function lightStepOf(angle: number): number {
  const n = STAR_FIGHT_PLANET_LIGHT_STEPS
  const t = (((angle % TWO_PI) + TWO_PI) % TWO_PI) / TWO_PI
  return Math.round(t * n) % n
}

export function lightAngleOfStep(step: number): number {
  return (step / STAR_FIGHT_PLANET_LIGHT_STEPS) * TWO_PI
}

export function planetSpriteKey(
  type: PlanetType,
  seed: number,
  px: number,
  dpr: number,
  lightStep: number,
): string {
  return `${type}|${seed}|${px}|${dpr}|${lightStep}`
}

/** Kante in CSS-px und der effektive dpr unter dem Backing-Deckel auf die KANTE. */
export function planetSpriteBacking(type: PlanetType, px: number, dpr: number): { span: number; dpr: number } {
  const span = Math.round(px * planetSpriteSpan(type))
  const d = Math.min(clampSpriteDpr(dpr), STAR_FIGHT_PLANET_SPRITE_MAX_PX / Math.max(1, span))
  return { span, dpr: Math.max(0.25, Math.floor(d * 100) / 100) }
}

function svgBlobUrl(type: PlanetType, seed: number): string | null {
  if (typeof XMLSerializer === 'undefined' || typeof Blob === 'undefined') return null
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
  svg.setAttribute('xmlns', NS)
  svg.setAttribute('width', String(SVG_VIEW))
  svg.setAttribute('height', String(SVG_VIEW))
  svg.setAttribute('viewBox', `0 0 ${SVG_VIEW} ${SVG_VIEW}`)
  // Der Planet füllt die Box auf 2r · span — Ringe brauchen die Reserve
  const r = SVG_VIEW / (2 * planetSpriteSpan(type))
  drawPlanet(svg, `sf-${type}-${seed}`, type, SVG_VIEW / 2, SVG_VIEW / 2, r, seed)
  const text = new XMLSerializer().serializeToString(svg)
  return URL.createObjectURL(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }))
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// Bau ist asynchron (Image.decode): Cache und pending-Map sind EINE Map von Promises
const canvasCache = new Map<string, Promise<HTMLCanvasElement | null>>()

function rememberCanvas(key: string, job: Promise<HTMLCanvasElement | null>): void {
  canvasCache.set(key, job)
  while (canvasCache.size > STAR_FIGHT_PLANET_SPRITE_CANVAS_MAX) {
    const oldest = canvasCache.keys().next().value
    if (oldest === undefined) break
    canvasCache.delete(oldest)
  }
}

async function rasterPlanet(
  type: PlanetType,
  seed: number,
  px: number,
  dpr: number,
  lightStep: number,
): Promise<HTMLCanvasElement | null> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null
  const backing = planetSpriteBacking(type, px, dpr)
  const made = newSpriteCanvas(backing.span, backing.dpr)
  if (!made) return null
  const url = svgBlobUrl(type, seed)
  if (!url) return null
  const img = await loadImage(url)
  URL.revokeObjectURL(url)
  if (!img) return null
  const { ctx } = made
  const span = backing.span
  ctx.drawImage(img, 0, 0, span, span)
  // paintTerminator leuchtet ungedreht von LINKS — auf den Lichtwinkel drehen
  const c = span / 2
  ctx.save()
  ctx.translate(c, c)
  ctx.rotate(lightAngleOfStep(lightStep) + Math.PI)
  ctx.translate(-c, -c)
  paintTerminator(ctx, span, (px / 2) * TERMINATOR_R_K)
  ctx.restore()
  return made.cv
}

export function buildPlanetSprite(
  type: PlanetType,
  seed: number,
  px: number,
  dpr: number,
  lightStep: number,
): Promise<HTMLCanvasElement | null> {
  const d = clampSpriteDpr(dpr)
  const key = planetSpriteKey(type, seed, px, d, lightStep)
  const hit = canvasCache.get(key)
  if (hit) {
    canvasCache.delete(key)
    canvasCache.set(key, hit)
    return hit
  }
  const job = rasterPlanet(type, seed, px, d, lightStep)
  rememberCanvas(key, job)
  return job
}

const urlCache = new Map<string, string>()
const urlPending = new Map<string, Promise<string>>()

function rememberUrl(key: string, url: string): void {
  urlCache.set(key, url)
  while (urlCache.size > STAR_FIGHT_PLANET_SPRITE_URL_MAX) {
    const oldest = urlCache.keys().next().value
    if (oldest === undefined) break
    const gone = urlCache.get(oldest)
    urlCache.delete(oldest)
    if (gone) URL.revokeObjectURL(gone)
  }
}

function encode(key: string, sprite: HTMLCanvasElement | null): Promise<string> {
  if (!sprite) return Promise.resolve('')
  const hit = urlCache.get(key)
  if (hit) {
    urlCache.delete(key)
    urlCache.set(key, hit)
    return Promise.resolve(hit)
  }
  const pending = urlPending.get(key)
  if (pending) return pending
  const job = new Promise<string>((resolve) => {
    sprite.toBlob((blob) => {
      urlPending.delete(key)
      if (!blob) {
        resolve('')
        return
      }
      const url = URL.createObjectURL(blob)
      rememberUrl(key, url)
      resolve(url)
    })
  })
  urlPending.set(key, job)
  return job
}

export function planetSpriteUrl(
  type: PlanetType,
  seed: number,
  px: number,
  dpr: number,
  lightStep: number,
): Promise<string> {
  const d = clampSpriteDpr(dpr)
  const key = planetSpriteKey(type, seed, px, d, lightStep)
  const hit = urlCache.get(key)
  if (hit) return Promise.resolve(hit)
  return buildPlanetSprite(type, seed, px, d, lightStep).then((cv) => encode(key, cv))
}

/** Neues Bild dekodieren, dann einblenden; das alte steht bis zum Ende der Blende. */
function swapSlotImage(slot: HTMLElement, key: string, url: Promise<string>, fadeMs: number): void {
  slot.dataset.spriteKey = key
  void url.then((src) => {
    if (slot.dataset.spriteKey !== key) return
    if (!src) {
      slot.replaceChildren()
      return
    }
    const current = slot.querySelector<HTMLImageElement>('img.is-in')
    if (current && current.src === src) return
    const img = document.createElement('img')
    img.alt = ''
    img.draggable = false
    img.decoding = 'async'
    const show = () => {
      if (slot.dataset.spriteKey !== key) return
      const old = Array.from(slot.querySelectorAll<HTMLImageElement>('img'))
      slot.appendChild(img)
      requestAnimationFrame(() => {
        img.classList.add('is-in')
        for (const o of old) o.classList.remove('is-in')
      })
      // Rein visuelle Frist — bleibt Wanduhr
      setTimeout(() => {
        for (const o of old) if (o.parentElement === slot) o.remove()
      }, fadeMs + 50)
    }
    img.src = src
    const decode = typeof img.decode === 'function' ? img.decode() : Promise.resolve()
    decode.then(show, show)
  })
}

export interface MountPlanetOptions {
  type: PlanetType
  seed: number
  px: number
  dpr: number
  lightAngle: number
  crossfadeMs?: number
}

/** Hängt das Sprite als <img> in den Host — idempotent über `dataset.spriteKey`. */
export function mountPlanetSprite(host: HTMLElement, opts: MountPlanetOptions): void {
  const d = clampSpriteDpr(opts.dpr)
  const step = lightStepOf(opts.lightAngle)
  const key = planetSpriteKey(opts.type, opts.seed, opts.px, d, step)
  if (host.dataset.spriteKey === key) return
  host.style.setProperty('--planet-span', String(planetSpriteSpan(opts.type)))
  swapSlotImage(
    host,
    key,
    planetSpriteUrl(opts.type, opts.seed, opts.px, d, step),
    opts.crossfadeMs ?? STAR_FIGHT_PLANET_SPRITE_CROSSFADE_MS,
  )
}

export interface WarmPlanetEntry {
  type: PlanetType
  seed: number
  px: number
  lightAngle: number
}

/** Rastern und kodieren, ohne zu mounten — vor dem Öffnen und vor jedem Flug. */
export function warmPlanetSprites(list: readonly WarmPlanetEntry[], dpr: number): void {
  for (const e of list) void planetSpriteUrl(e.type, e.seed, e.px, dpr, lightStepOf(e.lightAngle))
}

export function clearPlanetSpriteCache(): void {
  canvasCache.clear()
  for (const url of urlCache.values()) URL.revokeObjectURL(url)
  urlCache.clear()
  urlPending.clear()
}
