import { PLANET_TYPE_CONFIGS } from './types'
import type { PlanetTypeConfig } from './types'

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
