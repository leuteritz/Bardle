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
  {
    type: 'rocky',
    sizeMin: 40,
    sizeMax: 90,
    speedMin: 2.0,
    speedMax: 5.2,
    lifetime: 14_000,
    weight: 3,
  },
  {
    type: 'ice',
    sizeMin: 45,
    sizeMax: 95,
    speedMin: 1.6,
    speedMax: 4.6,
    lifetime: 16_000,
    weight: 2,
  },
  {
    type: 'gas-giant',
    sizeMin: 80,
    sizeMax: 140,
    speedMin: 0.7,
    speedMax: 2.4,
    lifetime: 20_000,
    weight: 2,
  },
  {
    type: 'lava',
    sizeMin: 40,
    sizeMax: 80,
    speedMin: 2.6,
    speedMax: 6.5,
    lifetime: 12_000,
    weight: 2,
  },
  {
    type: 'ocean',
    sizeMin: 50,
    sizeMax: 100,
    speedMin: 1.3,
    speedMax: 3.9,
    lifetime: 17_000,
    weight: 2,
  },
  {
    type: 'desert',
    sizeMin: 40,
    sizeMax: 85,
    speedMin: 1.3,
    speedMax: 3.3,
    lifetime: 15_000,
    weight: 2,
  },
  {
    type: 'jungle',
    sizeMin: 50,
    sizeMax: 100,
    speedMin: 1.3,
    speedMax: 3.3,
    lifetime: 16_000,
    weight: 2,
  },
  {
    type: 'ringed',
    sizeMin: 70,
    sizeMax: 130,
    speedMin: 0.7,
    speedMax: 2.3,
    lifetime: 18_000,
    weight: 1,
  },
]

export const GAS_GIANT_PALETTES = [
  {
    base: '#c87941',
    bands: ['#a85a2a', '#d4a060', '#7a4020', '#e0aa6a', '#b86030', '#cc9045'],
    storm: '#e08050',
    stormRim: '#ffd080',
    stormInner: '#fff4c0',
  },
  {
    base: '#6b8db0',
    bands: ['#4a6d90', '#8aaac8', '#3a5070', '#9bbce0', '#5a7da0', '#7a9ab8'],
    storm: '#a0c8e8',
    stormRim: '#d8f0ff',
    stormInner: '#ffffff',
  },
  {
    base: '#7a9e5a',
    bands: ['#5a7a3a', '#9ab87a', '#3a5a2a', '#aaca8a', '#6a8e4a', '#88a868'],
    storm: '#c0e880',
    stormRim: '#e8ffc0',
    stormInner: '#f8fff0',
  },
  {
    base: '#9a5a7a',
    bands: ['#7a3a5a', '#ba7a9a', '#5a2040', '#caa0b8', '#8a4a6a', '#aa6888'],
    storm: '#e890b8',
    stormRim: '#ffd0e8',
    stormInner: '#fff0f8',
  },
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

// ─── Shared Helpers ────────────────────────────────────────────────────────────

function addLimbGrad(defs: SVGElement, id: string, darkness = 0.75): void {
  const g = svgEl('radialGradient')
  setAttrs(g, { id, cx: '50%', cy: '50%', r: '50%' })
  addGradStop(g, '0%', 'rgba(0,0,0,0)')
  addGradStop(g, '65%', 'rgba(0,0,0,0)')
  addGradStop(g, '85%', `rgba(0,0,0,${(darkness * 0.45).toFixed(2)})`)
  addGradStop(g, '100%', `rgba(0,0,0,${darkness.toFixed(2)})`)
  defs.appendChild(g)
}

function addClip(defs: SVGElement, id: string, cx: number, cy: number, r: number): void {
  const clip = svgEl('clipPath')
  clip.id = id
  const cc = svgEl('circle')
  setAttrs(cc, { cx, cy, r })
  clip.appendChild(cc)
  defs.appendChild(clip)
}

/** Double specular: large soft ellipse + small bright glint */
function drawSpecular(
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

// ─── Draw Functions ────────────────────────────────────────────────────────────

/**
 * Rocky – richer surface patches + craters with floor & rim highlight
 */
export function drawRocky(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `rg-${id}`, cx: '38%', cy: '32%', r: '68%' })
  addGradStop(grad, '0%', '#d8b890')
  addGradStop(grad, '35%', '#a87848')
  addGradStop(grad, '70%', '#7a5232')
  addGradStop(grad, '100%', '#2a1208')
  defs.appendChild(grad)

  addLimbGrad(defs, `rlimb-${id}`, 0.8)
  addClip(defs, `rc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#rg-${id})` })
  svg.appendChild(base)

  // Surface texture patches
  const texG = svgEl('g')
  texG.setAttribute('clip-path', `url(#rc-${id})`)
  for (const [ox, oy, erx, ery, col] of [
    [-0.15, 0.2, 0.3, 0.19, 'rgba(60,35,18,0.38)'],
    [0.28, -0.08, 0.24, 0.15, 'rgba(80,50,25,0.30)'],
    [-0.3, -0.28, 0.2, 0.13, 'rgba(50,28,12,0.35)'],
    [0.05, 0.34, 0.16, 0.11, 'rgba(70,42,20,0.28)'],
    [-0.42, 0.08, 0.13, 0.09, 'rgba(60,36,18,0.25)'],
  ] as [number, number, number, number, string][]) {
    const e = svgEl('ellipse')
    setAttrs(e, { cx: cx + r * ox, cy: cy + r * oy, rx: r * erx, ry: r * ery, fill: col })
    texG.appendChild(e)
  }

  // Craters: shadow bowl + lighter floor + rim highlight arc
  for (const [ox, oy, cr] of [
    [-0.28, -0.18, 0.13],
    [0.32, 0.22, 0.1],
    [-0.08, 0.38, 0.07],
    [0.15, -0.32, 0.09],
    [-0.42, 0.1, 0.055],
    [0.08, 0.08, 0.045],
  ] as [number, number, number][]) {
    const shadow = svgEl('circle')
    setAttrs(shadow, { cx: cx + r * ox, cy: cy + r * oy, r: r * cr, fill: 'rgba(0,0,0,0.40)' })
    texG.appendChild(shadow)
    const floor = svgEl('circle')
    setAttrs(floor, {
      cx: cx + r * (ox + cr * 0.12),
      cy: cy + r * (oy + cr * 0.12),
      r: r * cr * 0.62,
      fill: 'rgba(155,115,75,0.22)',
    })
    texG.appendChild(floor)
    const rim = svgEl('circle')
    setAttrs(rim, {
      cx: cx + r * (ox - cr * 0.18),
      cy: cy + r * (oy - cr * 0.18),
      r: r * cr,
      fill: 'none',
      stroke: 'rgba(220,185,140,0.38)',
      'stroke-width': r * 0.016,
    })
    texG.appendChild(rim)
  }
  svg.appendChild(texG)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#rlimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r)
}

/**
 * Ice – subsurface scatter, glow crack network, detailed polar caps
 */
export function drawIce(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `ig-${id}`, cx: '42%', cy: '36%', r: '68%' })
  addGradStop(grad, '0%', '#f0f8ff')
  addGradStop(grad, '30%', '#b8daf0')
  addGradStop(grad, '62%', '#5ea8d0')
  addGradStop(grad, '100%', '#1a4a70')
  defs.appendChild(grad)

  // Subsurface scatter overlay
  const ssg = svgEl('radialGradient')
  setAttrs(ssg, { id: `iss-${id}`, cx: '50%', cy: '50%', r: '50%' })
  addGradStop(ssg, '0%', 'rgba(140,210,255,0.18)')
  addGradStop(ssg, '60%', 'rgba(100,180,230,0.08)')
  addGradStop(ssg, '100%', 'rgba(0,60,120,0)')
  defs.appendChild(ssg)

  addLimbGrad(defs, `ilimb-${id}`, 0.6)
  addClip(defs, `ic-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#ig-${id})` })
  svg.appendChild(base)

  const ss = svgEl('circle')
  setAttrs(ss, { cx, cy, r: r * 0.92, fill: `url(#iss-${id})` })
  svg.appendChild(ss)

  const crackG = svgEl('g')
  crackG.setAttribute('clip-path', `url(#ic-${id})`)

  // Each crack: wide glow underneath, sharp line on top
  for (const [ox1, oy1, ox2, oy2, sw, op] of [
    [-0.3, -0.1, 0.1, 0.4, r * 0.022, 0.45],
    [0.2, -0.3, -0.1, 0.22, r * 0.018, 0.35],
    [-0.15, -0.42, 0.28, -0.04, r * 0.016, 0.3],
    [0.35, 0.05, -0.2, 0.35, r * 0.014, 0.28],
    [-0.42, 0.15, 0.05, -0.08, r * 0.012, 0.22],
    [-0.1, 0.15, 0.3, 0.38, r * 0.01, 0.2],
  ] as [number, number, number, number, number, number][]) {
    const x1 = cx + r * ox1,
      y1 = cy + r * oy1,
      x2 = cx + r * ox2,
      y2 = cy + r * oy2
    const glow = svgEl('line')
    setAttrs(glow, {
      x1,
      y1,
      x2,
      y2,
      stroke: 'rgba(180,230,255,0.35)',
      'stroke-width': sw * 2.8,
      opacity: op * 0.55,
    })
    crackG.appendChild(glow)
    const line = svgEl('line')
    setAttrs(line, {
      x1,
      y1,
      x2,
      y2,
      stroke: 'rgba(160,220,255,0.65)',
      'stroke-width': sw,
      opacity: op,
    })
    crackG.appendChild(line)
  }

  // Polar caps – outer soft + inner bright
  const cap1 = svgEl('ellipse')
  setAttrs(cap1, {
    cx,
    cy: cy - r * 0.73,
    rx: r * 0.46,
    ry: r * 0.24,
    fill: 'rgba(255,255,255,0.72)',
  })
  crackG.appendChild(cap1)
  const cap1i = svgEl('ellipse')
  setAttrs(cap1i, {
    cx,
    cy: cy - r * 0.77,
    rx: r * 0.28,
    ry: r * 0.14,
    fill: 'rgba(255,255,255,0.90)',
  })
  crackG.appendChild(cap1i)
  const cap2 = svgEl('ellipse')
  setAttrs(cap2, {
    cx,
    cy: cy + r * 0.76,
    rx: r * 0.34,
    ry: r * 0.16,
    fill: 'rgba(255,255,255,0.55)',
  })
  crackG.appendChild(cap2)

  svg.appendChild(crackG)

  // Atmospheric rim glow
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(140,210,255,0.24)',
    'stroke-width': r * 0.09,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#ilimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(220,245,255,')
}

/**
 * Gas Giant – 7 bands, 3-layer nested storm, specular shine gradient
 */
export function drawGasGiant(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const pal = GAS_GIANT_PALETTES[Math.floor(Math.random() * GAS_GIANT_PALETTES.length)]
  const defs = svgEl('defs')

  addClip(defs, `ggc-${id}`, cx, cy, r * 0.92)

  const lgrad = svgEl('radialGradient')
  setAttrs(lgrad, { id: `ggl-${id}`, cx: '50%', cy: '50%', r: '50%' })
  addGradStop(lgrad, '0%', 'rgba(0,0,0,0)')
  addGradStop(lgrad, '65%', 'rgba(0,0,0,0)')
  addGradStop(lgrad, '84%', 'rgba(0,0,0,0.28)')
  addGradStop(lgrad, '100%', 'rgba(0,0,0,0.65)')
  defs.appendChild(lgrad)

  // Specular shine gradient (top-left glow)
  const shine = svgEl('radialGradient')
  setAttrs(shine, { id: `ggh-${id}`, cx: '35%', cy: '28%', r: '45%' })
  addGradStop(shine, '0%', 'rgba(255,255,255,0.14)')
  addGradStop(shine, '50%', 'rgba(255,255,255,0.04)')
  addGradStop(shine, '100%', 'rgba(255,255,255,0)')
  defs.appendChild(shine)

  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: pal.base })
  svg.appendChild(base)

  const bandG = svgEl('g')
  bandG.setAttribute('clip-path', `url(#ggc-${id})`)

  const bandOffsets = [-0.6, -0.38, -0.16, 0.06, 0.26, 0.44, 0.6]
  const bandHeights = [0.22, 0.24, 0.22, 0.2, 0.18, 0.16, 0.14]
  const bandOpacities = [0.42, 0.5, 0.46, 0.44, 0.4, 0.38, 0.32]

  for (let i = 0; i < bandOffsets.length; i++) {
    const rect = svgEl('rect')
    setAttrs(rect, {
      x: cx - r * 1.1,
      y: cy + r * bandOffsets[i],
      width: r * 2.2,
      height: r * bandHeights[i],
      fill: pal.bands[i % pal.bands.length],
      opacity: bandOpacities[i],
    })
    bandG.appendChild(rect)
  }

  // 3-layer storm
  const scx = cx + r * 0.28,
    scy = cy + r * 0.14
  const stOuter = svgEl('ellipse')
  setAttrs(stOuter, { cx: scx, cy: scy, rx: r * 0.2, ry: r * 0.12, fill: pal.storm, opacity: 0.78 })
  bandG.appendChild(stOuter)
  const stMid = svgEl('ellipse')
  setAttrs(stMid, {
    cx: scx - r * 0.01,
    cy: scy,
    rx: r * 0.13,
    ry: r * 0.078,
    fill: pal.stormRim,
    opacity: 0.72,
  })
  bandG.appendChild(stMid)
  const stCore = svgEl('ellipse')
  setAttrs(stCore, {
    cx: scx - r * 0.01,
    cy: scy,
    rx: r * 0.062,
    ry: r * 0.038,
    fill: pal.stormInner,
    opacity: 0.65,
  })
  bandG.appendChild(stCore)

  svg.appendChild(bandG)

  // Atmospheric rim glow (tinted to base color)
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: `${pal.base}55`,
    'stroke-width': r * 0.1,
  })
  svg.appendChild(atm)

  const limbOv = svgEl('circle')
  setAttrs(limbOv, { cx, cy, r: r * 0.92, fill: `url(#ggl-${id})` })
  svg.appendChild(limbOv)

  const shineEl = svgEl('circle')
  setAttrs(shineEl, { cx, cy, r: r * 0.92, fill: `url(#ggh-${id})` })
  svg.appendChild(shineEl)

  const glint = svgEl('ellipse')
  setAttrs(glint, {
    cx: cx - r * 0.22,
    cy: cy - r * 0.26,
    rx: r * 0.12,
    ry: r * 0.08,
    fill: 'rgba(255,255,255,0.20)',
  })
  svg.appendChild(glint)
}

/**
 * Lava – 3-layer crack glow (outer/mid/inner), hot-spot nodes, ember atmosphere
 */
export function drawLava(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `lvg-${id}`, cx: '50%', cy: '50%', r: '50%' })
  addGradStop(grad, '0%', '#4a2020')
  addGradStop(grad, '50%', '#2a1010')
  addGradStop(grad, '100%', '#0e0505')
  defs.appendChild(grad)

  const glow = svgEl('filter')
  glow.id = `lvf-${id}`
  const blur = svgEl('feGaussianBlur')
  setAttrs(blur, { in: 'SourceGraphic', stdDeviation: String(r * 0.05) })
  glow.appendChild(blur)
  defs.appendChild(glow)

  addClip(defs, `lvc-${id}`, cx, cy, r * 0.92)
  addLimbGrad(defs, `lvlimb-${id}`, 0.65)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#lvg-${id})` })
  svg.appendChild(base)

  const crackG = svgEl('g')
  crackG.setAttribute('clip-path', `url(#lvc-${id})`)

  const crackPaths = [
    `M ${cx - r * 0.08} ${cy - r * 0.52} L ${cx + r * 0.18} ${cy - r * 0.05} L ${cx + r * 0.05} ${cy + r * 0.48}`,
    `M ${cx + r * 0.42} ${cy - r * 0.3} L ${cx - r * 0.08} ${cy + r * 0.18} L ${cx + r * 0.28} ${cy + r * 0.58}`,
    `M ${cx - r * 0.52} ${cy + r * 0.08} L ${cx + r * 0.08} ${cy + r * 0.42}`,
    `M ${cx - r * 0.28} ${cy - r * 0.42} L ${cx + r * 0.18} ${cy + r * 0.12}`,
    `M ${cx - r * 0.48} ${cy - r * 0.18} L ${cx - r * 0.08} ${cy - r * 0.52}`,
    `M ${cx + r * 0.08} ${cy + r * 0.42} L ${cx + r * 0.42} ${cy + r * 0.18}`,
  ]

  for (const d of crackPaths) {
    const outerGlow = svgEl('path')
    setAttrs(outerGlow, {
      d,
      stroke: '#ff3000',
      'stroke-width': r * 0.07,
      fill: 'none',
      filter: `url(#lvf-${id})`,
      opacity: 0.65,
    })
    crackG.appendChild(outerGlow)
    const midGlow = svgEl('path')
    setAttrs(midGlow, {
      d,
      stroke: '#ff6600',
      'stroke-width': r * 0.03,
      fill: 'none',
      opacity: 0.85,
    })
    crackG.appendChild(midGlow)
    const inner = svgEl('path')
    setAttrs(inner, { d, stroke: '#ffcc00', 'stroke-width': r * 0.01, fill: 'none', opacity: 0.95 })
    crackG.appendChild(inner)
  }

  // Glowing hot spots at intersection nodes
  for (const [ox, oy, hr] of [
    [-0.08, -0.05, 0.058],
    [0.08, 0.42, 0.045],
    [-0.08, 0.18, 0.04],
  ] as [number, number, number][]) {
    const hGlow = svgEl('circle')
    setAttrs(hGlow, {
      cx: cx + r * ox,
      cy: cy + r * oy,
      r: r * hr,
      fill: '#ff4400',
      filter: `url(#lvf-${id})`,
      opacity: 0.82,
    })
    crackG.appendChild(hGlow)
    const hCore = svgEl('circle')
    setAttrs(hCore, {
      cx: cx + r * ox,
      cy: cy + r * oy,
      r: r * hr * 0.5,
      fill: '#ffcc00',
      opacity: 0.92,
    })
    crackG.appendChild(hCore)
  }

  svg.appendChild(crackG)

  // Ember atmosphere glow
  const atmGlow = svgEl('circle')
  setAttrs(atmGlow, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(255,60,0,0.24)',
    'stroke-width': r * 0.12,
  })
  svg.appendChild(atmGlow)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#lvlimb-${id})` })
  svg.appendChild(limb)

  const glint = svgEl('ellipse')
  setAttrs(glint, {
    cx: cx - r * 0.22,
    cy: cy - r * 0.28,
    rx: r * 0.1,
    ry: r * 0.07,
    fill: 'rgba(255,140,60,0.18)',
  })
  svg.appendChild(glint)
}

/**
 * Ocean – more continents, rotated cloud swirls, blue atmospheric rim
 */
export function drawOcean(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `og-${id}`, cx: '42%', cy: '36%', r: '68%' })
  addGradStop(grad, '0%', '#68c8f8')
  addGradStop(grad, '35%', '#2088d0')
  addGradStop(grad, '68%', '#0e52a0')
  addGradStop(grad, '100%', '#061830')
  defs.appendChild(grad)

  addLimbGrad(defs, `olimb-${id}`, 0.65)
  addClip(defs, `oc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#og-${id})` })
  svg.appendChild(base)

  const contG = svgEl('g')
  contG.setAttribute('clip-path', `url(#oc-${id})`)

  // Continents (more organic shapes via overlapping ellipses)
  const continents: {
    cx: number
    cy: number
    rx: number
    ry: number
    rot: number
    color: string
  }[] = [
    {
      cx: cx - r * 0.22,
      cy: cy + r * 0.12,
      rx: r * 0.28,
      ry: r * 0.17,
      rot: -15,
      color: '#3a8a3a',
    },
    { cx: cx - r * 0.08, cy: cy + r * 0.22, rx: r * 0.14, ry: r * 0.09, rot: 10, color: '#4a9a4a' },
    { cx: cx + r * 0.22, cy: cy - r * 0.2, rx: r * 0.2, ry: r * 0.13, rot: 20, color: '#428842' },
    { cx: cx + r * 0.1, cy: cy - r * 0.08, rx: r * 0.1, ry: r * 0.07, rot: -8, color: '#509850' },
    { cx: cx - r * 0.38, cy: cy - r * 0.14, rx: r * 0.14, ry: r * 0.09, rot: 30, color: '#3c8040' },
    { cx: cx + r * 0.3, cy: cy + r * 0.3, rx: r * 0.12, ry: r * 0.07, rot: -20, color: '#46924a' },
  ]
  for (const c of continents) {
    const e = svgEl('ellipse')
    setAttrs(e, {
      cx: c.cx,
      cy: c.cy,
      rx: c.rx,
      ry: c.ry,
      fill: c.color,
      opacity: 0.88,
      transform: `rotate(${c.rot} ${c.cx} ${c.cy})`,
    })
    contG.appendChild(e)
  }

  // Polar ice caps
  const pc1 = svgEl('ellipse')
  setAttrs(pc1, {
    cx,
    cy: cy - r * 0.72,
    rx: r * 0.36,
    ry: r * 0.18,
    fill: 'rgba(240,252,255,0.80)',
  })
  contG.appendChild(pc1)
  const pc2 = svgEl('ellipse')
  setAttrs(pc2, {
    cx,
    cy: cy + r * 0.75,
    rx: r * 0.26,
    ry: r * 0.12,
    fill: 'rgba(240,252,255,0.60)',
  })
  contG.appendChild(pc2)

  // Cloud swirls as rotated thin ellipses
  const cloudSwirls: [number, number, number, number, number][] = [
    [cx - r * 0.12, cy - r * 0.35, r * 0.4, r * 0.09, -18],
    [cx + r * 0.25, cy + r * 0.1, r * 0.3, r * 0.07, 22],
    [cx - r * 0.35, cy + r * 0.3, r * 0.34, r * 0.08, -10],
    [cx + r * 0.08, cy - r * 0.55, r * 0.28, r * 0.06, 15],
  ]
  for (const [scx, scy, srx, sry, rot] of cloudSwirls) {
    const swirl = svgEl('ellipse')
    setAttrs(swirl, {
      cx: scx,
      cy: scy,
      rx: srx,
      ry: sry,
      fill: 'rgba(240,252,255,0.42)',
      transform: `rotate(${rot} ${scx} ${scy})`,
    })
    contG.appendChild(swirl)
  }

  svg.appendChild(contG)

  // Blue atmospheric rim
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(80,180,255,0.26)',
    'stroke-width': r * 0.1,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#olimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(200,240,255,')
}

/**
 * Desert – layered dune arcs, heat shimmer haze, warm specular
 */
export function drawDesert(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `dsg-${id}`, cx: '36%', cy: '30%', r: '70%' })
  addGradStop(grad, '0%', '#f0c87a')
  addGradStop(grad, '35%', '#d88830')
  addGradStop(grad, '68%', '#a05818')
  addGradStop(grad, '100%', '#5a2808')
  defs.appendChild(grad)

  addLimbGrad(defs, `dslimb-${id}`, 0.72)
  addClip(defs, `dsc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#dsg-${id})` })
  svg.appendChild(base)

  const duneG = svgEl('g')
  duneG.setAttribute('clip-path', `url(#dsc-${id})`)

  // Dune arcs – each with a light crest stroke + dark shadow fill below
  const duneData: [number, number, number, number, number, number, string, string][] = [
    [
      cx - r * 0.52,
      cy + r * 0.08,
      cx,
      cy - r * 0.08,
      cx + r * 0.52,
      cy + r * 0.08,
      'rgba(215,158,72,0.38)',
      'rgba(130,70,18,0.22)',
    ],
    [
      cx - r * 0.6,
      cy + r * 0.34,
      cx + r * 0.08,
      cy + r * 0.16,
      cx + r * 0.62,
      cy + r * 0.36,
      'rgba(185,122,48,0.32)',
      'rgba(110,55,12,0.20)',
    ],
    [
      cx - r * 0.4,
      cy - r * 0.22,
      cx + r * 0.18,
      cy - r * 0.38,
      cx + r * 0.55,
      cy - r * 0.1,
      'rgba(235,178,90,0.30)',
      'rgba(145,80,22,0.18)',
    ],
    [
      cx - r * 0.62,
      cy - r * 0.05,
      cx - r * 0.1,
      cy - r * 0.2,
      cx + r * 0.3,
      cy + r * 0.05,
      'rgba(200,140,60,0.26)',
      'rgba(120,62,15,0.16)',
    ],
    [
      cx - r * 0.2,
      cy + r * 0.5,
      cx + r * 0.28,
      cy + r * 0.36,
      cx + r * 0.65,
      cy + r * 0.55,
      'rgba(175,110,42,0.28)',
      'rgba(100,50,10,0.16)',
    ],
  ]
  for (const [x1, y1, x2, y2, x3, y3, crest, shadow] of duneData) {
    const shadowPath = svgEl('path')
    setAttrs(shadowPath, {
      d: `M ${x1} ${y1} Q ${x2} ${y2} ${x3} ${y3} L ${x3} ${y3 + r * 0.14} Q ${x2} ${y2 + r * 0.14} ${x1} ${y1 + r * 0.14} Z`,
      fill: shadow,
    })
    duneG.appendChild(shadowPath)
    const arc = svgEl('path')
    setAttrs(arc, {
      d: `M ${x1} ${y1} Q ${x2} ${y2} ${x3} ${y3}`,
      stroke: crest,
      'stroke-width': r * 0.07,
      fill: 'none',
      'stroke-linecap': 'round',
    })
    duneG.appendChild(arc)
  }

  // Small dark rocks
  for (const [ox, oy, rr] of [
    [-0.18, 0.28, 0.028],
    [0.32, -0.14, 0.022],
    [-0.38, 0.4, 0.02],
    [0.1, 0.44, 0.018],
  ] as [number, number, number][]) {
    const rock = svgEl('ellipse')
    setAttrs(rock, {
      cx: cx + r * ox,
      cy: cy + r * oy,
      rx: r * rr,
      ry: r * rr * 0.65,
      fill: 'rgba(80,40,12,0.55)',
    })
    duneG.appendChild(rock)
  }

  svg.appendChild(duneG)

  // Warm heat-haze atmosphere
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(230,145,40,0.22)',
    'stroke-width': r * 0.1,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#dslimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(255,225,140,')
}

/**
 * Jungle – dense cloud cover with varying opacity, vivid green rim glow
 */
export function drawJungle(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `jg-${id}`, cx: '42%', cy: '36%', r: '68%' })
  addGradStop(grad, '0%', '#6ad06e')
  addGradStop(grad, '38%', '#228b28')
  addGradStop(grad, '68%', '#0e4e14')
  addGradStop(grad, '100%', '#051808')
  defs.appendChild(grad)

  addLimbGrad(defs, `jlimb-${id}`, 0.68)
  addClip(defs, `jc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#jg-${id})` })
  svg.appendChild(base)

  const cloudG = svgEl('g')
  cloudG.setAttribute('clip-path', `url(#jc-${id})`)

  // Multi-layer cloud system: outer soft + inner brighter
  const cloudDefs: [number, number, number, number, number, number, number][] = [
    [cx - r * 0.18, cy - r * 0.46, r * 0.42, r * 0.17, -12, 0.42, 0.62],
    [cx + r * 0.28, cy - r * 0.16, r * 0.32, r * 0.14, 18, 0.36, 0.55],
    [cx - r * 0.44, cy + r * 0.24, r * 0.36, r * 0.15, -8, 0.4, 0.6],
    [cx + r * 0.08, cy + r * 0.4, r * 0.4, r * 0.15, 12, 0.38, 0.58],
    [cx - r * 0.1, cy + r * 0.08, r * 0.24, r * 0.1, -5, 0.28, 0.44],
    [cx + r * 0.38, cy + r * 0.1, r * 0.22, r * 0.09, 22, 0.3, 0.46],
    [cx - r * 0.3, cy - r * 0.22, r * 0.26, r * 0.11, -20, 0.32, 0.5],
  ]
  for (const [ccx, ccy, crx, cry, rot, opOut, opIn] of cloudDefs) {
    const outer = svgEl('ellipse')
    setAttrs(outer, {
      cx: ccx,
      cy: ccy,
      rx: crx,
      ry: cry,
      fill: `rgba(240,252,245,${opOut})`,
      transform: `rotate(${rot} ${ccx} ${ccy})`,
    })
    cloudG.appendChild(outer)
    const inner = svgEl('ellipse')
    setAttrs(inner, {
      cx: ccx,
      cy: ccy,
      rx: crx * 0.62,
      ry: cry * 0.6,
      fill: `rgba(255,255,255,${opIn - opOut})`,
      transform: `rotate(${rot} ${ccx} ${ccy})`,
    })
    cloudG.appendChild(inner)
  }

  svg.appendChild(cloudG)

  // Vivid green-teal atmospheric rim
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(40,210,100,0.26)',
    'stroke-width': r * 0.1,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#jlimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(210,255,220,')
}

/**
 * Ringed – multi-band ring with inner shadow, tilted ring plane, icy body
 */
export function drawRinged(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const defs = svgEl('defs')

  // Ring gradient with more bands
  const ringGrad = svgEl('linearGradient')
  ringGrad.id = `rng-${id}`
  setAttrs(ringGrad, { x1: '0%', y1: '0%', x2: '100%', y2: '0%' })
  const ringStops: [string, string][] = [
    ['0%', 'rgba(180,150,100,0)'],
    ['10%', 'rgba(200,165,110,0.35)'],
    ['18%', 'rgba(215,180,125,0.62)'],
    ['27%', 'rgba(200,168,112,0.48)'],
    ['36%', 'rgba(225,192,138,0.70)'],
    ['46%', 'rgba(205,172,118,0.55)'],
    ['55%', 'rgba(228,196,142,0.68)'],
    ['64%', 'rgba(208,175,120,0.52)'],
    ['73%', 'rgba(218,184,130,0.62)'],
    ['82%', 'rgba(202,168,115,0.42)'],
    ['90%', 'rgba(215,178,122,0.35)'],
    ['100%', 'rgba(180,150,100,0)'],
  ]
  for (const [offset, color] of ringStops) {
    const s = svgEl('stop')
    setAttrs(s, { offset, 'stop-color': color })
    ringGrad.appendChild(s)
  }
  defs.appendChild(ringGrad)

  // Ring shadow on planet (darkens where ring passes over body)
  const shadowGrad = svgEl('linearGradient')
  shadowGrad.id = `rngs-${id}`
  setAttrs(shadowGrad, { x1: '0%', y1: '0%', x2: '0%', y2: '100%' })
  addGradStop(shadowGrad, '0%', 'rgba(0,0,0,0)')
  addGradStop(shadowGrad, '45%', 'rgba(0,0,0,0)')
  addGradStop(shadowGrad, '55%', 'rgba(0,0,0,0.22)')
  addGradStop(shadowGrad, '100%', 'rgba(0,0,0,0)')
  defs.appendChild(shadowGrad)

  // Clip: back half of ring (below equator = behind planet)
  const backClip = svgEl('clipPath')
  backClip.id = `rnbc-${id}`
  const backRect = svgEl('rect')
  setAttrs(backRect, { x: cx - r * 1.9, y: cy, width: r * 3.8, height: r * 1.1 })
  backClip.appendChild(backRect)
  defs.appendChild(backClip)

  // Clip: front half of ring (above equator = in front of planet)
  const frontClip = svgEl('clipPath')
  frontClip.id = `rnfc-${id}`
  const frontRect = svgEl('rect')
  setAttrs(frontRect, { x: cx - r * 1.9, y: cy - r * 1.1, width: r * 3.8, height: r * 1.1 })
  frontClip.appendChild(frontRect)
  defs.appendChild(frontClip)

  // Planet body gradient
  const bodyGrad = svgEl('radialGradient')
  setAttrs(bodyGrad, { id: `rnpg-${id}`, cx: '40%', cy: '34%', r: '64%' })
  addGradStop(bodyGrad, '0%', '#e8f4fc')
  addGradStop(bodyGrad, '30%', '#b0d0ec')
  addGradStop(bodyGrad, '60%', '#6898cc')
  addGradStop(bodyGrad, '100%', '#1e4068')
  defs.appendChild(bodyGrad)

  addLimbGrad(defs, `rnlimb-${id}`, 0.6)
  addClip(defs, `rnpc-${id}`, cx, cy, r * 0.92)

  svg.appendChild(defs)

  // ── Ring back half ──
  const ringBack = svgEl('ellipse')
  setAttrs(ringBack, {
    cx,
    cy,
    rx: r * 1.72,
    ry: r * 0.38,
    fill: `url(#rng-${id})`,
    'clip-path': `url(#rnbc-${id})`,
  })
  svg.appendChild(ringBack)

  // ── Planet body ──
  const planet = svgEl('circle')
  setAttrs(planet, { cx, cy, r: r * 0.92, fill: `url(#rnpg-${id})` })
  svg.appendChild(planet)

  // Ice-like bands on body
  const bandG = svgEl('g')
  bandG.setAttribute('clip-path', `url(#rnpc-${id})`)
  for (const [oy, h, op] of [
    [-0.28, 0.14, 0.14],
    [-0.05, 0.12, 0.1],
    [0.16, 0.1, 0.12],
    [0.34, 0.09, 0.08],
  ] as [number, number, number][]) {
    const band = svgEl('rect')
    setAttrs(band, {
      x: cx - r,
      y: cy + r * oy,
      width: r * 2,
      height: r * h,
      fill: 'rgba(200,230,255,0.60)',
      opacity: op,
    })
    bandG.appendChild(band)
  }
  // Polar caps
  const pc = svgEl('ellipse')
  setAttrs(pc, { cx, cy: cy - r * 0.72, rx: r * 0.4, ry: r * 0.19, fill: 'rgba(240,252,255,0.76)' })
  bandG.appendChild(pc)
  svg.appendChild(bandG)

  // Ring shadow stripe cast on body
  const ringShadow = svgEl('circle')
  setAttrs(ringShadow, { cx, cy, r: r * 0.92, fill: `url(#rngs-${id})` })
  svg.appendChild(ringShadow)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#rnlimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(220,240,255,')

  // ── Ring front half ──
  const ringFront = svgEl('ellipse')
  setAttrs(ringFront, {
    cx,
    cy,
    rx: r * 1.72,
    ry: r * 0.38,
    fill: `url(#rng-${id})`,
    'clip-path': `url(#rnfc-${id})`,
  })
  svg.appendChild(ringFront)
}

// ─── Dispatcher ────────────────────────────────────────────────────────────────

export function drawPlanet(
  svg: SVGSVGElement,
  id: string,
  type: PlanetType,
  cx: number,
  cy: number,
  r: number,
): void {
  switch (type) {
    case 'rocky':
      drawRocky(svg, id, cx, cy, r)
      break
    case 'ice':
      drawIce(svg, id, cx, cy, r)
      break
    case 'gas-giant':
      drawGasGiant(svg, id, cx, cy, r)
      break
    case 'lava':
      drawLava(svg, id, cx, cy, r)
      break
    case 'ocean':
      drawOcean(svg, id, cx, cy, r)
      break
    case 'desert':
      drawDesert(svg, id, cx, cy, r)
      break
    case 'jungle':
      drawJungle(svg, id, cx, cy, r)
      break
    case 'ringed':
      drawRinged(svg, id, cx, cy, r)
      break
  }
}
