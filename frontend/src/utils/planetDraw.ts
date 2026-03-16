import type { PlanetType } from '../types'

export type { PlanetType }

export interface PlanetTypeConfig {
  type: PlanetType
  sizeMin: number
  sizeMax: number
  speedMin: number
  speedMax: number
  lifetime: number
  weight: number
}

export const PLANET_TYPE_CONFIGS: PlanetTypeConfig[] = [
  { type: 'rocky',     sizeMin: 40, sizeMax: 90,  speedMin: 1.5, speedMax: 4.0, lifetime: 14_000, weight: 3 },
  { type: 'ice',       sizeMin: 45, sizeMax: 95,  speedMin: 1.2, speedMax: 3.5, lifetime: 16_000, weight: 2 },
  { type: 'gas-giant', sizeMin: 80, sizeMax: 140, speedMin: 0.5, speedMax: 1.8, lifetime: 20_000, weight: 2 },
  { type: 'lava',      sizeMin: 40, sizeMax: 80,  speedMin: 2.0, speedMax: 5.0, lifetime: 12_000, weight: 2 },
  { type: 'ocean',     sizeMin: 50, sizeMax: 100, speedMin: 1.0, speedMax: 3.0, lifetime: 17_000, weight: 2 },
]

export const GAS_GIANT_PALETTES = [
  { base: '#c87941', bands: ['#a85a2a', '#d4955a', '#7a4020', '#e0aa6a'], storm: '#d4955a' },
  { base: '#6b8db0', bands: ['#4a6d90', '#8aaac8', '#3a5070', '#9bbce0'], storm: '#d0e8ff' },
  { base: '#7a9e5a', bands: ['#5a7a3a', '#9ab87a', '#3a5a2a', '#aaca8a'], storm: '#e8f8d0' },
  { base: '#9a5a7a', bands: ['#7a3a5a', '#ba7a9a', '#5a2040', '#caa0b8'], storm: '#ffd0e8' },
]

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

// ─── Draw Functions ────────────────────────────────────────────────────────────

export function drawRocky(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number): void {
  const defs = svgEl('defs')
  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `rg-${id}`, cx: '35%', cy: '30%', r: '65%' })
  addGradStop(grad, '0%', '#c9a882')
  addGradStop(grad, '55%', '#8b6347')
  addGradStop(grad, '100%', '#3d2418')
  defs.appendChild(grad)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#rg-${id})` })
  svg.appendChild(base)

  for (const [ox, oy, cr] of [[-0.28, -0.18, 0.11], [0.32, 0.22, 0.08], [-0.08, 0.38, 0.06], [0.15, -0.32, 0.07]]) {
    const c = svgEl('circle')
    setAttrs(c, { cx: cx + r * ox, cy: cy + r * oy, r: r * cr, fill: 'rgba(0,0,0,0.2)', stroke: 'rgba(0,0,0,0.15)', 'stroke-width': r * 0.02 })
    svg.appendChild(c)
  }

  const hl = svgEl('ellipse')
  setAttrs(hl, { cx: cx - r * 0.2, cy: cy - r * 0.25, rx: r * 0.35, ry: r * 0.22, fill: 'rgba(255,255,255,0.13)', transform: `rotate(-25 ${cx - r * 0.2} ${cy - r * 0.25})` })
  svg.appendChild(hl)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: 'none', stroke: 'rgba(0,0,0,0.45)', 'stroke-width': r * 0.14 })
  svg.appendChild(limb)
}

export function drawIce(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number): void {
  const defs = svgEl('defs')
  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `ig-${id}`, cx: '40%', cy: '35%', r: '65%' })
  addGradStop(grad, '0%', '#e8f4fd')
  addGradStop(grad, '55%', '#7eb8d8')
  addGradStop(grad, '100%', '#2a6a90')
  defs.appendChild(grad)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#ig-${id})` })
  svg.appendChild(base)

  const cap1 = svgEl('ellipse')
  setAttrs(cap1, { cx, cy: cy - r * 0.75, rx: r * 0.42, ry: r * 0.22, fill: 'rgba(255,255,255,0.7)' })
  svg.appendChild(cap1)
  const cap2 = svgEl('ellipse')
  setAttrs(cap2, { cx, cy: cy + r * 0.78, rx: r * 0.32, ry: r * 0.15, fill: 'rgba(255,255,255,0.5)' })
  svg.appendChild(cap2)

  for (const [x1, y1, x2, y2, op] of [
    [cx - r * 0.3, cy - r * 0.1, cx + r * 0.1, cy + r * 0.4, 0.4],
    [cx + r * 0.2, cy - r * 0.3, cx - r * 0.1, cy + r * 0.2, 0.3],
    [cx - r * 0.15, cy - r * 0.4, cx + r * 0.25, cy - r * 0.05, 0.25],
  ]) {
    const line = svgEl('line')
    setAttrs(line, { x1, y1, x2, y2, stroke: 'rgba(180,230,255,0.5)', 'stroke-width': r * 0.02, opacity: op })
    svg.appendChild(line)
  }

  const hl = svgEl('ellipse')
  setAttrs(hl, { cx: cx - r * 0.15, cy: cy - r * 0.2, rx: r * 0.3, ry: r * 0.2, fill: 'rgba(255,255,255,0.2)' })
  svg.appendChild(hl)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: 'none', stroke: 'rgba(0,0,40,0.35)', 'stroke-width': r * 0.1 })
  svg.appendChild(limb)
}

export function drawGasGiant(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number, size: number): void {
  const pal = GAS_GIANT_PALETTES[Math.floor(Math.random() * GAS_GIANT_PALETTES.length)]
  const defs = svgEl('defs')

  const clip = svgEl('clipPath')
  clip.id = `ggc-${id}`
  const cc = svgEl('circle')
  setAttrs(cc, { cx, cy, r: r * 0.92 })
  clip.appendChild(cc)
  defs.appendChild(clip)

  const lgrad = svgEl('radialGradient')
  setAttrs(lgrad, { id: `ggl-${id}`, cx: '50%', cy: '50%', r: '50%' })
  const ls1 = svgEl('stop'); setAttrs(ls1, { offset: '0%', 'stop-color': 'white', 'stop-opacity': '0' }); lgrad.appendChild(ls1)
  const ls2 = svgEl('stop'); setAttrs(ls2, { offset: '70%', 'stop-color': 'white', 'stop-opacity': '0' }); lgrad.appendChild(ls2)
  const ls3 = svgEl('stop'); setAttrs(ls3, { offset: '100%', 'stop-color': 'black', 'stop-opacity': '0.55' }); lgrad.appendChild(ls3)
  defs.appendChild(lgrad)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: pal.base })
  svg.appendChild(base)

  const bandGroup = svgEl('g')
  bandGroup.setAttribute('clip-path', `url(#ggc-${id})`)
  const bandOffsets = [-0.55, -0.3, -0.05, 0.2, 0.45, 0.65]
  const bandHeights = [0.18, 0.22, 0.2, 0.18, 0.15, 0.12]
  for (let i = 0; i < bandOffsets.length; i++) {
    const rect = svgEl('rect')
    setAttrs(rect, { x: 0, y: cy + r * bandOffsets[i], width: size, height: r * bandHeights[i], fill: pal.bands[i % pal.bands.length], opacity: 0.45 })
    bandGroup.appendChild(rect)
  }
  const storm = svgEl('ellipse')
  setAttrs(storm, { cx: cx + r * 0.25, cy: cy + r * 0.12, rx: r * 0.16, ry: r * 0.1, fill: pal.storm, opacity: 0.7 })
  bandGroup.appendChild(storm)
  svg.appendChild(bandGroup)

  const limbOv = svgEl('circle')
  setAttrs(limbOv, { cx, cy, r: r * 0.92, fill: `url(#ggl-${id})` })
  svg.appendChild(limbOv)

  const hl = svgEl('ellipse')
  setAttrs(hl, { cx: cx - r * 0.15, cy: cy - r * 0.2, rx: r * 0.25, ry: r * 0.18, fill: 'rgba(255,255,255,0.12)' })
  svg.appendChild(hl)
}

export function drawLava(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `lvg-${id}`, cx: '50%', cy: '50%', r: '50%' })
  addGradStop(grad, '0%', '#3a2020')
  addGradStop(grad, '100%', '#150808')
  defs.appendChild(grad)

  const glow = svgEl('filter')
  glow.id = `lvf-${id}`
  const blur = svgEl('feGaussianBlur')
  blur.setAttribute('stdDeviation', String(r * 0.04))
  glow.appendChild(blur)
  defs.appendChild(glow)

  const clip = svgEl('clipPath')
  clip.id = `lvc-${id}`
  const cc = svgEl('circle')
  setAttrs(cc, { cx, cy, r: r * 0.92 })
  clip.appendChild(cc)
  defs.appendChild(clip)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#lvg-${id})` })
  svg.appendChild(base)

  const crackGroup = svgEl('g')
  crackGroup.setAttribute('clip-path', `url(#lvc-${id})`)
  const crackDefs = [
    `M ${cx - r * 0.1} ${cy - r * 0.5} L ${cx + r * 0.2} ${cy} L ${cx} ${cy + r * 0.5}`,
    `M ${cx + r * 0.4} ${cy - r * 0.3} L ${cx - r * 0.1} ${cy + r * 0.2} L ${cx + r * 0.3} ${cy + r * 0.6}`,
    `M ${cx - r * 0.5} ${cy + r * 0.1} L ${cx + r * 0.1} ${cy + r * 0.4}`,
    `M ${cx - r * 0.3} ${cy - r * 0.4} L ${cx + r * 0.15} ${cy + r * 0.15}`,
  ]
  for (const d of crackDefs) {
    const glowPath = svgEl('path')
    setAttrs(glowPath, { d, stroke: '#ff4500', 'stroke-width': r * 0.035, fill: 'none', filter: `url(#lvf-${id})` })
    crackGroup.appendChild(glowPath)
    const inner = svgEl('path')
    setAttrs(inner, { d, stroke: '#ff8800', 'stroke-width': r * 0.015, fill: 'none', opacity: 0.9 })
    crackGroup.appendChild(inner)
  }
  svg.appendChild(crackGroup)

  const limbGlow = svgEl('circle')
  setAttrs(limbGlow, { cx, cy, r: r * 0.92, fill: 'none', stroke: 'rgba(255,80,0,0.25)', 'stroke-width': r * 0.12 })
  svg.appendChild(limbGlow)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: 'none', stroke: 'rgba(0,0,0,0.5)', 'stroke-width': r * 0.1 })
  svg.appendChild(limb)
}

export function drawOcean(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number): void {
  const defs = svgEl('defs')
  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `og-${id}`, cx: '40%', cy: '35%', r: '65%' })
  addGradStop(grad, '0%', '#4ab0e8')
  addGradStop(grad, '60%', '#1a6ab0')
  addGradStop(grad, '100%', '#082840')
  defs.appendChild(grad)

  const clip = svgEl('clipPath')
  clip.id = `oc-${id}`
  const cc = svgEl('circle')
  setAttrs(cc, { cx, cy, r: r * 0.92 })
  clip.appendChild(cc)
  defs.appendChild(clip)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#og-${id})` })
  svg.appendChild(base)

  const contGroup = svgEl('g')
  contGroup.setAttribute('clip-path', `url(#oc-${id})`)
  const continents = [
    { cx: cx - r * 0.22, cy: cy + r * 0.12, rx: r * 0.25, ry: r * 0.16, color: '#4a8a4a' },
    { cx: cx + r * 0.2, cy: cy - r * 0.22, rx: r * 0.18, ry: r * 0.12, color: '#5a9a5a' },
    { cx: cx - r * 0.35, cy: cy - r * 0.15, rx: r * 0.12, ry: r * 0.08, color: '#508850' },
  ]
  for (const cont of continents) {
    const ell = svgEl('ellipse')
    setAttrs(ell, { cx: cont.cx, cy: cont.cy, rx: cont.rx, ry: cont.ry, fill: cont.color, opacity: 0.85 })
    contGroup.appendChild(ell)
  }
  svg.appendChild(contGroup)

  const atm = svgEl('circle')
  setAttrs(atm, { cx, cy, r: r * 0.95, fill: 'none', stroke: 'rgba(100,200,255,0.2)', 'stroke-width': r * 0.08 })
  svg.appendChild(atm)

  const hl = svgEl('ellipse')
  setAttrs(hl, { cx: cx - r * 0.15, cy: cy - r * 0.2, rx: r * 0.3, ry: r * 0.2, fill: 'rgba(255,255,255,0.18)' })
  svg.appendChild(hl)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: 'none', stroke: 'rgba(0,0,40,0.45)', 'stroke-width': r * 0.1 })
  svg.appendChild(limb)
}

export function drawPlanet(svg: SVGSVGElement, id: string, type: PlanetType, cx: number, cy: number, r: number, size: number): void {
  switch (type) {
    case 'rocky':     drawRocky(svg, id, cx, cy, r);              break
    case 'ice':       drawIce(svg, id, cx, cy, r);                break
    case 'gas-giant': drawGasGiant(svg, id, cx, cy, r, size);     break
    case 'lava':      drawLava(svg, id, cx, cy, r);               break
    case 'ocean':     drawOcean(svg, id, cx, cy, r);              break
  }
}
