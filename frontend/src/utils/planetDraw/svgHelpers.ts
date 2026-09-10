import { PLANET_TYPE_CONFIGS } from '@/utils/planetDraw/types'
import type { PlanetTypeConfig } from '@/utils/planetDraw/types'
import { jitter } from '@/utils/fx/spaceBody'
import {
  PLANET_MOON_DIST_MIN,
  PLANET_MOON_DIST_MAX,
  PLANET_MOON_R_MIN,
  PLANET_MOON_R_MAX,
  PLANET_SHARD_DIST_MIN,
  PLANET_SHARD_DIST_MAX,
  PLANET_SHARD_SIZE_MIN,
  PLANET_SHARD_SIZE_MAX,
} from '@/config/constants'

export const NS = 'http://www.w3.org/2000/svg'

export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(NS, tag)
}

export function setAttrs(el: Element, attrs: Record<string, string | number>): void {
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
}

export function addGradStop(grad: SVGElement, offset: string, color: string): void {
  const s = svgEl('stop')
  setAttrs(s, { offset, 'stop-color': color })
  grad.appendChild(s)
}

/**
 * Wurffolge aus dem Seed — Hash je Index, kein LCG: ein Strom, der bei jedem
 * Aufruf einen neuen Index nimmt. Ohne Seed wird gewuerfelt (PlanetGlyph).
 */
export function seedRoll(seed: number | undefined): () => number {
  if (seed === undefined) return () => Math.random()
  let n = 0
  return () => jitter(seed, ++n)
}

/** Wurf auf eine Spanne. */
export function rollIn(roll: () => number, min: number, max: number): number {
  return min + roll() * (max - min)
}

/** Wurf auf einen Listeneintrag. */
export function pickOne<T>(roll: () => number, list: readonly T[]): T {
  return list[Math.min(list.length - 1, Math.floor(roll() * list.length))]
}

export function pickConfig(): PlanetTypeConfig {
  const total = PLANET_TYPE_CONFIGS.reduce((s, c) => s + c.weight, 0)
  let rand = Math.random() * total
  for (const cfg of PLANET_TYPE_CONFIGS) {
    rand -= cfg.weight
    if (rand <= 0) return cfg
  }
  return PLANET_TYPE_CONFIGS[0]
}

// ─── Shared internal helpers used by all draw functions ───────────────────────

export function addLimbGrad(defs: SVGElement, id: string, darkness = 0.75): void {
  const g = svgEl('radialGradient')
  setAttrs(g, { id, cx: '50%', cy: '50%', r: '50%' })
  addGradStop(g, '0%', 'rgba(0,0,0,0)')
  addGradStop(g, '65%', 'rgba(0,0,0,0)')
  addGradStop(g, '85%', `rgba(0,0,0,${(darkness * 0.45).toFixed(2)})`)
  addGradStop(g, '100%', `rgba(0,0,0,${darkness.toFixed(2)})`)
  defs.appendChild(g)
}

export function addClip(defs: SVGElement, id: string, cx: number, cy: number, r: number): void {
  const clip = svgEl('clipPath')
  clip.id = id
  const cc = svgEl('circle')
  setAttrs(cc, { cx, cy, r })
  clip.appendChild(cc)
  defs.appendChild(clip)
}

/** Double specular: large soft ellipse + small bright glint */
export function drawSpecular(
  svg: SVGSVGElement,
  cx: number,
  cy: number,
  r: number,
  tint = 'rgba(255,255,255,',
): void {
  const hl1 = svgEl('ellipse')
  setAttrs(hl1, {
    cx: cx - r * 0.18,
    cy: cy - r * 0.24,
    rx: r * 0.32,
    ry: r * 0.2,
    fill: `${tint}0.11)`,
  })
  svg.appendChild(hl1)
  const hl2 = svgEl('ellipse')
  setAttrs(hl2, {
    cx: cx - r * 0.22,
    cy: cy - r * 0.28,
    rx: r * 0.12,
    ry: r * 0.08,
    fill: `${tint}0.22)`,
  })
  svg.appendChild(hl2)
}

/* ── Zierrat ausserhalb der Scheibe ──────────────────────────────────────────
   Die drei Formen, an denen ein Planet auf 24 px auseinanderzuhalten ist:
   Trabant, Ring, Splitter. Was hier hinausragt, braucht Platz in
   PLANET_SPRITE_SPANS — die Kante des Rasters schneidet sonst ab.            */

export interface MoonSpec {
  min: number
  max: number
  fill: string
  shade: string
}

export interface RingSpec {
  inner: number
  outer: number
  color: string
  alpha: number
  /** Abflachung der Ringebene; der Wurf liegt dazwischen. */
  flatMin: number
  flatMax: number
}

export interface ShardSpec {
  min: number
  max: number
  fill: string
  rim: string
}

export interface PlannedMoon {
  x: number
  y: number
  r: number
  front: boolean
}

/**
 * Trabanten EINMAL wuerfeln, dann zweimal malen (hinter und vor dem Koerper).
 * Getrennte Wuerfe je Durchgang wuerden zwei verschiedene Monde ergeben.
 */
export function planMoons(
  cx: number,
  cy: number,
  r: number,
  roll: () => number,
  spec: MoonSpec,
): PlannedMoon[] {
  const count = Math.floor(rollIn(roll, spec.min, spec.max + 0.999))
  const out: PlannedMoon[] = []
  for (let i = 0; i < count; i++) {
    const a = roll() * Math.PI * 2
    const dist = r * rollIn(roll, PLANET_MOON_DIST_MIN, PLANET_MOON_DIST_MAX)
    const mr = r * rollIn(roll, PLANET_MOON_R_MIN, PLANET_MOON_R_MAX)
    out.push({
      x: cx + Math.cos(a) * dist,
      y: cy + Math.sin(a) * dist * 0.62,
      r: mr,
      front: Math.sin(a) >= 0,
    })
  }
  return out
}

export function paintMoons(
  svg: SVGSVGElement,
  moons: readonly PlannedMoon[],
  spec: MoonSpec,
  front: boolean,
): void {
  for (const m of moons) {
    if (m.front !== front) continue
    const body = svgEl('circle')
    setAttrs(body, { cx: m.x, cy: m.y, r: m.r, fill: spec.fill })
    svg.appendChild(body)
    const shade = svgEl('circle')
    setAttrs(shade, {
      cx: m.x + m.r * 0.34,
      cy: m.y + m.r * 0.26,
      r: m.r * 0.92,
      fill: spec.shade,
      opacity: 0.72,
    })
    svg.appendChild(shade)
  }
}

export interface PlannedRing {
  flat: number
  tilt: number
}

export function planRing(roll: () => number, spec: RingSpec): PlannedRing {
  return { flat: rollIn(roll, spec.flatMin, spec.flatMax), tilt: rollIn(roll, -26, 26) }
}

/**
 * Ein duennes Ringband. Hinten die volle Ellipse, vorn dieselbe Ellipse auf die
 * untere Haelfte geklippt — so laeuft der Ring sichtbar hinter dem Koerper durch.
 */
export function paintRing(
  svg: SVGSVGElement,
  defs: SVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  spec: RingSpec,
  plan: PlannedRing,
  front: boolean,
): void {
  const mid = r * (spec.inner + spec.outer) * 0.5
  const width = r * (spec.outer - spec.inner)
  const ring = svgEl('ellipse')
  setAttrs(ring, {
    cx,
    cy,
    rx: mid,
    ry: mid * plan.flat,
    fill: 'none',
    stroke: spec.color,
    'stroke-width': width,
    opacity: front ? spec.alpha : spec.alpha * 0.7,
    transform: `rotate(${plan.tilt.toFixed(2)} ${cx} ${cy})`,
  })
  if (front) {
    const clipId = `ringfr-${id}`
    const clip = svgEl('clipPath')
    clip.id = clipId
    const box = svgEl('rect')
    setAttrs(box, { x: cx - r * 3, y: cy, width: r * 6, height: r * 3 })
    clip.appendChild(box)
    defs.appendChild(clip)
    ring.setAttribute('clip-path', `url(#${clipId})`)
  }
  svg.appendChild(ring)
}

/** Kantige Bruchstuecke im nahen Orbit. */
export function addShards(
  svg: SVGSVGElement,
  cx: number,
  cy: number,
  r: number,
  roll: () => number,
  spec: ShardSpec,
): void {
  const count = Math.floor(rollIn(roll, spec.min, spec.max + 1))
  for (let i = 0; i < count; i++) {
    const a = roll() * Math.PI * 2
    const dist = r * rollIn(roll, PLANET_SHARD_DIST_MIN, PLANET_SHARD_DIST_MAX)
    const sz = r * rollIn(roll, PLANET_SHARD_SIZE_MIN, PLANET_SHARD_SIZE_MAX)
    const x = cx + Math.cos(a) * dist
    const y = cy + Math.sin(a) * dist * 0.7
    const shard = svgEl('path')
    setAttrs(shard, {
      d: `M${x - sz},${y + sz * 0.45} L${x},${y - sz} L${x + sz * 0.85},${y + sz * 0.6} Z`,
      fill: spec.fill,
      stroke: spec.rim,
      'stroke-width': r * 0.008,
      opacity: rollIn(roll, 0.55, 0.9),
      transform: `rotate(${(roll() * 360).toFixed(1)} ${x} ${y})`,
    })
    svg.appendChild(shard)
  }
}

/**
 * Lage der OBERFLAECHE eines Planeten: Drehung und Spiegelung.
 *
 * Sie liegt auf der geclippten Detailgruppe, nie auf dem Koerper — Glanzpunkt,
 * Terminator und Limbus gehoeren dem Licht und muessen stehen bleiben.
 */
export function detailTransform(
  cx: number,
  cy: number,
  spinDeg: number,
  mirror: boolean,
): string {
  const spin = `rotate(${spinDeg.toFixed(2)} ${cx} ${cy})`
  return mirror ? `${spin} translate(${(cx * 2).toFixed(2)} 0) scale(-1 1)` : spin
}
