import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { STAR_COUNT } from '../config/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

type StarItem = {
  id: number
  el: HTMLDivElement
  x: number
  y: number
  vx: number
  vy: number
  targetVx: number
  targetVy: number
  nextDirectionChange: number
}

type GalaxyItem = {
  el: SVGSVGElement
  x: number
  y: number
  vx: number
  vy: number
}

type GalaxyType = 'spiral' | 'barred-spiral' | 'elliptical' | 'globular' | 'irregular' | 'ring'

type GalaxyPalette = {
  center: string
  mid: string
  outer: string
  arm?: string
}

type GalaxyTypeConfig = {
  type: GalaxyType
  sizeMin: number
  sizeMax: number
  speedMin: number
  speedMax: number
  lifetime: number
  rotRange: [number, number]
  weight: number
}

// ─── Star Constants ───────────────────────────────────────────────────────────

const SPEED_MIN = 2
const SPEED_MAX = 5
const DIR_CHANGE_MIN = 4000
const DIR_CHANGE_MAX = 10_000
const LERP_RATE = 1.5

const STAR_CONNECTION_INTERVAL = 3000
const LINE_DURATION = 2000

// ─── Galaxy Constants ─────────────────────────────────────────────────────────

const GALAXY_SPAWN_INTERVAL_MIN = 5_000
const GALAXY_SPAWN_INTERVAL_MAX = 10_000
const GALAXY_MAX_COUNT = 3

const GALAXY_TYPE_CONFIGS: GalaxyTypeConfig[] = [
  {
    type: 'spiral',
    sizeMin: 120,
    sizeMax: 220,
    speedMin: 0.4,
    speedMax: 1.5,
    lifetime: 18_000,
    rotRange: [20, 45],
    weight: 3,
  },
  {
    type: 'barred-spiral',
    sizeMin: 140,
    sizeMax: 240,
    speedMin: 0.3,
    speedMax: 1.2,
    lifetime: 20_000,
    rotRange: [15, 35],
    weight: 2,
  },
  {
    type: 'elliptical',
    sizeMin: 160,
    sizeMax: 300,
    speedMin: 0.2,
    speedMax: 0.8,
    lifetime: 25_000,
    rotRange: [3, 15],
    weight: 2,
  },
  {
    type: 'globular',
    sizeMin: 60,
    sizeMax: 110,
    speedMin: 0.8,
    speedMax: 2.5,
    lifetime: 12_000,
    rotRange: [0, 8],
    weight: 2,
  },
  {
    type: 'irregular',
    sizeMin: 100,
    sizeMax: 180,
    speedMin: 0.6,
    speedMax: 2.0,
    lifetime: 14_000,
    rotRange: [10, 60],
    weight: 2,
  },
  {
    type: 'ring',
    sizeMin: 90,
    sizeMax: 170,
    speedMin: 0.4,
    speedMax: 1.5,
    lifetime: 16_000,
    rotRange: [8, 25],
    weight: 1,
  },
]

const GALAXY_PALETTES_BY_TYPE: Record<GalaxyType, GalaxyPalette[]> = {
  spiral: [
    { center: '#ffffff', mid: '#8b5cf6', outer: '#3b82f6', arm: '#a78bfa' },
    { center: '#ffffff', mid: '#06b6d4', outer: '#6366f1', arm: '#67e8f9' },
    { center: '#ffffff', mid: '#ec4899', outer: '#8b5cf6', arm: '#f9a8d4' },
    { center: '#e0f2fe', mid: '#38bdf8', outer: '#0369a1', arm: '#7dd3fc' },
    // new palettes
    { center: '#ffffff', mid: '#14b8a6', outer: '#d97706', arm: '#5eead4' },   // teal/gold
    { center: '#fff1f2', mid: '#fb7185', outer: '#f59e0b', arm: '#fda4af' },   // rose/amber
    { center: '#f0fdf4', mid: '#84cc16', outer: '#059669', arm: '#bef264' },   // lime/emerald
    { center: '#e0f7ff', mid: '#7dd3fc', outer: '#bfdbfe', arm: '#bae6fd' },   // cold ice-blue
  ],
  'barred-spiral': [
    { center: '#fff7ed', mid: '#f59e0b', outer: '#ef4444', arm: '#fcd34d' },
    { center: '#fef3c7', mid: '#f97316', outer: '#dc2626', arm: '#fde68a' },
    { center: '#ffffff', mid: '#fb923c', outer: '#9333ea', arm: '#fdba74' },
    // new palettes
    { center: '#f0f9ff', mid: '#38bdf8', outer: '#14b8a6', arm: '#7dd3fc' },   // cool steel-blue/teal
    { center: '#f0fdf4', mid: '#4ade80', outer: '#d97706', arm: '#86efac' },   // emerald/gold
    { center: '#fff1f2', mid: '#fb7185', outer: '#dc2626', arm: '#fda4af' },   // rose/crimson
  ],
  elliptical: [
    { center: '#fff7ed', mid: '#fbbf24', outer: '#d97706' },
    { center: '#fef9ee', mid: '#f59e0b', outer: '#b45309' },
    { center: '#ffffff', mid: '#fde68a', outer: '#f59e0b' },
    { center: '#fdf4ff', mid: '#e9d5ff', outer: '#a855f7' },
    // new palettes
    { center: '#7f1d1d', mid: '#dc2626', outer: '#450a0a' },                   // red-giant deep red
    { center: '#f8fafc', mid: '#cbd5e1', outer: '#94a3b8' },                   // cool silver-white
    { center: '#eff6ff', mid: '#bfdbfe', outer: '#93c5fd' },                   // blue-white
  ],
  globular: [
    { center: '#fffbeb', mid: '#fef08a', outer: '#fbbf24' },
    { center: '#ffffff', mid: '#e0f2fe', outer: '#7dd3fc' },
    { center: '#f0fdf4', mid: '#bbf7d0', outer: '#4ade80' },
    { center: '#fdf2f8', mid: '#fbcfe8', outer: '#db2777' },
    // new palettes
    { center: '#fff7ed', mid: '#fdba74', outer: '#d97706' },                   // orange/amber dense
    { center: '#faf5ff', mid: '#c4b5fd', outer: '#6d28d9' },                   // deep violet
    { center: '#ecfeff', mid: '#99f6e4', outer: '#0d9488' },                   // teal/seafoam
  ],
  irregular: [
    { center: '#eff6ff', mid: '#60a5fa', outer: '#2563eb' },
    { center: '#fdf4ff', mid: '#e879f9', outer: '#a855f7' },
    { center: '#ecfdf5', mid: '#34d399', outer: '#059669' },
    { center: '#fff1f2', mid: '#fda4af', outer: '#e11d48' },
    // new palettes
    { center: '#fff7ed', mid: '#fb923c', outer: '#b45309' },                   // warm amber/terracotta
    { center: '#ecfeff', mid: '#22d3ee', outer: '#0e7490' },                   // cyan/teal
    { center: '#fdf2f8', mid: '#f0abfc', outer: '#a21caf' },                   // magenta/neon
  ],
  ring: [
    { center: '#ecfeff', mid: '#22d3ee', outer: '#0891b2' },
    { center: '#f0f9ff', mid: '#38bdf8', outer: '#0284c7' },
    { center: '#fdf4ff', mid: '#c084fc', outer: '#7c3aed' },
    { center: '#fff7ed', mid: '#fed7aa', outer: '#ea580c' },
    // new palettes
    { center: '#fffbeb', mid: '#fcd34d', outer: '#b45309' },                   // gold/amber
    { center: '#f0fdf4', mid: '#86efac', outer: '#4d7c0f' },                   // teal/lime
    { center: '#fdf2f8', mid: '#f0abfc', outer: '#7e22ce' },                   // magenta/violet
  ],
}

// ─── SVG Helpers ─────────────────────────────────────────────────────────────

const NS = 'http://www.w3.org/2000/svg'
let galaxyIdCounter = 0

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(NS, tag)
}

function addStop(grad: SVGElement, offset: string, color: string, opacity: number): void {
  const stop = svgEl('stop')
  stop.setAttribute('offset', offset)
  stop.setAttribute('stop-color', color)
  stop.setAttribute('stop-opacity', String(opacity))
  grad.appendChild(stop)
}

function makeBlurFilter(id: string, stdDev: number): SVGFilterElement {
  const filter = svgEl('filter')
  filter.id = id
  const blur = svgEl('feGaussianBlur')
  blur.setAttribute('stdDeviation', String(stdDev))
  filter.appendChild(blur)
  return filter
}

function pickGalaxyTypeConfig(): GalaxyTypeConfig {
  const total = GALAXY_TYPE_CONFIGS.reduce((s, c) => s + c.weight, 0)
  let rand = Math.random() * total
  for (const config of GALAXY_TYPE_CONFIGS) {
    rand -= config.weight
    if (rand <= 0) return config
  }
  return GALAXY_TYPE_CONFIGS[0]
}

// ─── Galaxy Draw Functions ────────────────────────────────────────────────────

function drawSpiral(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  size: number,
  palette: GalaxyPalette,
): void {
  const defs = svgEl('defs')

  const haloGrad = svgEl('radialGradient')
  haloGrad.id = `${id}h`
  haloGrad.setAttribute('cx', '50%')
  haloGrad.setAttribute('cy', '50%')
  haloGrad.setAttribute('r', '50%')
  addStop(haloGrad, '0%', palette.mid, 0.2)
  addStop(haloGrad, '60%', palette.outer, 0.07)
  addStop(haloGrad, '100%', palette.outer, 0)

  const cGrad = svgEl('radialGradient')
  cGrad.id = `${id}c`
  cGrad.setAttribute('cx', '50%')
  cGrad.setAttribute('cy', '50%')
  cGrad.setAttribute('r', '50%')
  addStop(cGrad, '0%', '#ffffff', 1)
  addStop(cGrad, '30%', palette.center, 0.9)
  addStop(cGrad, '70%', palette.mid, 0.4)
  addStop(cGrad, '100%', palette.outer, 0)

  defs.appendChild(haloGrad)
  defs.appendChild(cGrad)
  defs.appendChild(makeBlurFilter(`${id}f`, 2.5))
  svg.appendChild(defs)

  // Halo
  const halo = svgEl('circle')
  halo.setAttribute('cx', String(cx))
  halo.setAttribute('cy', String(cy))
  halo.setAttribute('r', String(r))
  halo.setAttribute('fill', `url(#${id}h)`)
  svg.appendChild(halo)

  // Spiral arms (2–4) with variable curvature and width
  const armCount = 2 + Math.floor(Math.random() * 3)
  const curl = 0.8 + Math.random() * 1.0
  for (let i = 0; i < armCount; i++) {
    const sa = (i / armCount) * Math.PI * 2
    const ar = r * 0.42
    const x1 = cx + Math.cos(sa) * ar * 0.3
    const y1 = cy + Math.sin(sa) * ar * 0.3
    const x2 = cx + Math.cos(sa + curl) * ar * 0.7
    const y2 = cy + Math.sin(sa + curl) * ar * 0.7
    const x3 = cx + Math.cos(sa + curl * 2) * ar
    const y3 = cy + Math.sin(sa + curl * 2) * ar
    const armWidth = size * 0.045 * (0.8 + Math.random() * 0.4)
    const arm = svgEl('path')
    arm.setAttribute('d', `M ${cx} ${cy} Q ${x1} ${y1} ${x2} ${y2} T ${x3} ${y3}`)
    arm.setAttribute('stroke', palette.arm ?? palette.mid)
    arm.setAttribute('stroke-opacity', '0.45')
    arm.setAttribute('stroke-width', String(armWidth))
    arm.setAttribute('fill', 'none')
    arm.setAttribute('filter', `url(#${id}f)`)
    svg.appendChild(arm)

    // Star knots (stellar nurseries) along arm with 50% probability
    if (Math.random() < 0.5) {
      const knotCount = 2 + Math.floor(Math.random() * 3)
      for (let k = 1; k <= knotCount; k++) {
        const t = k / (knotCount + 1)
        const kx = cx + Math.cos(sa + curl * 2 * t) * ar * t
        const ky = cy + Math.sin(sa + curl * 2 * t) * ar * t
        const knot = svgEl('circle')
        knot.setAttribute('cx', String(kx))
        knot.setAttribute('cy', String(ky))
        knot.setAttribute('r', String(1.2 + Math.random() * 2.0))
        knot.setAttribute('fill', palette.arm ?? palette.mid)
        knot.setAttribute('opacity', String(0.55 + Math.random() * 0.4))
        svg.appendChild(knot)
      }
    }
  }

  // Center glow
  const center = svgEl('circle')
  center.setAttribute('cx', String(cx))
  center.setAttribute('cy', String(cy))
  center.setAttribute('r', String(r * 0.2))
  center.setAttribute('fill', `url(#${id}c)`)
  svg.appendChild(center)
}

function drawBarredSpiral(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  size: number,
  palette: GalaxyPalette,
): void {
  // Pre-compute bar geometry so the gradient can use real coordinates
  const barAngle = Math.random() * Math.PI
  const barLen = r * 0.52
  const bx1 = cx - Math.cos(barAngle) * barLen
  const by1 = cy - Math.sin(barAngle) * barLen
  const bx2 = cx + Math.cos(barAngle) * barLen
  const by2 = cy + Math.sin(barAngle) * barLen

  const defs = svgEl('defs')

  const haloGrad = svgEl('radialGradient')
  haloGrad.id = `${id}h`
  haloGrad.setAttribute('cx', '50%')
  haloGrad.setAttribute('cy', '50%')
  haloGrad.setAttribute('r', '50%')
  addStop(haloGrad, '0%', palette.mid, 0.18)
  addStop(haloGrad, '100%', palette.outer, 0)

  const cGrad = svgEl('radialGradient')
  cGrad.id = `${id}c`
  cGrad.setAttribute('cx', '50%')
  cGrad.setAttribute('cy', '50%')
  cGrad.setAttribute('r', '50%')
  addStop(cGrad, '0%', '#ffffff', 1)
  addStop(cGrad, '40%', palette.center, 0.8)
  addStop(cGrad, '100%', palette.outer, 0)

  // Linear gradient along bar in user space
  const barGrad = svgEl('linearGradient')
  barGrad.id = `${id}b`
  barGrad.setAttribute('x1', String(bx1))
  barGrad.setAttribute('y1', String(by1))
  barGrad.setAttribute('x2', String(bx2))
  barGrad.setAttribute('y2', String(by2))
  barGrad.setAttribute('gradientUnits', 'userSpaceOnUse')
  addStop(barGrad, '0%', palette.outer, 0)
  addStop(barGrad, '20%', palette.mid, 0.6)
  addStop(barGrad, '50%', palette.center, 0.9)
  addStop(barGrad, '80%', palette.mid, 0.6)
  addStop(barGrad, '100%', palette.outer, 0)

  defs.appendChild(haloGrad)
  defs.appendChild(cGrad)
  defs.appendChild(barGrad)
  defs.appendChild(makeBlurFilter(`${id}f`, 2))
  svg.appendChild(defs)

  // Halo
  const halo = svgEl('circle')
  halo.setAttribute('cx', String(cx))
  halo.setAttribute('cy', String(cy))
  halo.setAttribute('r', String(r))
  halo.setAttribute('fill', `url(#${id}h)`)
  svg.appendChild(halo)

  // Central bar
  const bar = svgEl('line')
  bar.setAttribute('x1', String(bx1))
  bar.setAttribute('y1', String(by1))
  bar.setAttribute('x2', String(bx2))
  bar.setAttribute('y2', String(by2))
  bar.setAttribute('stroke', `url(#${id}b)`)
  bar.setAttribute('stroke-width', String(size * 0.07))
  bar.setAttribute('stroke-linecap', 'round')
  bar.setAttribute('filter', `url(#${id}f)`)
  svg.appendChild(bar)

  // Arms from each bar end
  for (let i = 0; i < 2; i++) {
    const baseX = i === 0 ? bx1 : bx2
    const baseY = i === 0 ? by1 : by2
    const exitAngle = barAngle + (i === 0 ? Math.PI : 0)
    const curl = i === 0 ? -1.5 : 1.5
    const cpx = baseX + Math.cos(exitAngle + curl * 0.5) * r * 0.35
    const cpy = baseY + Math.sin(exitAngle + curl * 0.5) * r * 0.35
    const ex = baseX + Math.cos(exitAngle + curl) * r * 0.45
    const ey = baseY + Math.sin(exitAngle + curl) * r * 0.45

    const arm = svgEl('path')
    arm.setAttribute('d', `M ${baseX} ${baseY} Q ${cpx} ${cpy} ${ex} ${ey}`)
    arm.setAttribute('stroke', palette.arm ?? palette.mid)
    arm.setAttribute('stroke-opacity', '0.4')
    arm.setAttribute('stroke-width', String(size * 0.04))
    arm.setAttribute('fill', 'none')
    arm.setAttribute('filter', `url(#${id}f)`)
    svg.appendChild(arm)
  }

  // Center glow
  const center = svgEl('circle')
  center.setAttribute('cx', String(cx))
  center.setAttribute('cy', String(cy))
  center.setAttribute('r', String(r * 0.18))
  center.setAttribute('fill', `url(#${id}c)`)
  svg.appendChild(center)
}

function drawElliptical(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  size: number,
  palette: GalaxyPalette,
): void {
  const axisRatio = 0.35 + Math.random() * 0.55
  const tiltDeg = Math.random() * 90

  const defs = svgEl('defs')

  const bodyGrad = svgEl('radialGradient')
  bodyGrad.id = `${id}g`
  bodyGrad.setAttribute('cx', '50%')
  bodyGrad.setAttribute('cy', '50%')
  bodyGrad.setAttribute('r', '50%')
  addStop(bodyGrad, '0%', '#ffffff', 0.95)
  addStop(bodyGrad, '15%', palette.center, 0.85)
  addStop(bodyGrad, '45%', palette.mid, 0.5)
  addStop(bodyGrad, '75%', palette.outer, 0.2)
  addStop(bodyGrad, '100%', palette.outer, 0)

  const haloGrad = svgEl('radialGradient')
  haloGrad.id = `${id}h`
  haloGrad.setAttribute('cx', '50%')
  haloGrad.setAttribute('cy', '50%')
  haloGrad.setAttribute('r', '50%')
  addStop(haloGrad, '0%', palette.outer, 0.1)
  addStop(haloGrad, '100%', palette.outer, 0)

  const cGrad = svgEl('radialGradient')
  cGrad.id = `${id}c`
  cGrad.setAttribute('cx', '50%')
  cGrad.setAttribute('cy', '50%')
  cGrad.setAttribute('r', '50%')
  addStop(cGrad, '0%', '#ffffff', 1)
  addStop(cGrad, '60%', palette.center, 0.5)
  addStop(cGrad, '100%', palette.center, 0)

  const dustFilter = svgEl('filter')
  dustFilter.id = `${id}d`
  const dustBlur = svgEl('feGaussianBlur')
  dustBlur.setAttribute('stdDeviation', '2')
  dustFilter.appendChild(dustBlur)

  defs.appendChild(bodyGrad)
  defs.appendChild(haloGrad)
  defs.appendChild(cGrad)
  defs.appendChild(makeBlurFilter(`${id}f`, 5))
  defs.appendChild(dustFilter)
  svg.appendChild(defs)

  // Outer halo ellipse
  const haloEl = svgEl('ellipse')
  haloEl.setAttribute('cx', String(cx))
  haloEl.setAttribute('cy', String(cy))
  haloEl.setAttribute('rx', String(r))
  haloEl.setAttribute('ry', String(r * axisRatio))
  haloEl.setAttribute('fill', `url(#${id}h)`)
  haloEl.setAttribute('transform', `rotate(${tiltDeg}, ${cx}, ${cy})`)
  svg.appendChild(haloEl)

  // Main body (softly blurred)
  const body = svgEl('ellipse')
  body.setAttribute('cx', String(cx))
  body.setAttribute('cy', String(cy))
  body.setAttribute('rx', String(r * 0.72))
  body.setAttribute('ry', String(r * 0.72 * axisRatio))
  body.setAttribute('fill', `url(#${id}g)`)
  body.setAttribute('filter', `url(#${id}f)`)
  body.setAttribute('transform', `rotate(${tiltDeg}, ${cx}, ${cy})`)
  svg.appendChild(body)

  // Sharp bright center
  const center = svgEl('circle')
  center.setAttribute('cx', String(cx))
  center.setAttribute('cy', String(cy))
  center.setAttribute('r', String(r * 0.14))
  center.setAttribute('fill', `url(#${id}c)`)
  svg.appendChild(center)

  // Dust lane (40% probability) — makes some ellipticals look edge-on
  if (Math.random() < 0.4) {
    const dustAngle = Math.random() * 180
    const dustLane = svgEl('rect')
    dustLane.setAttribute('x', String(cx - r * 0.9))
    dustLane.setAttribute('y', String(cy - size * 0.025))
    dustLane.setAttribute('width', String(r * 1.8))
    dustLane.setAttribute('height', String(size * 0.05))
    dustLane.setAttribute('fill', 'rgba(0,0,0,0.25)')
    dustLane.setAttribute('filter', `url(#${id}d)`)
    dustLane.setAttribute('transform', `rotate(${dustAngle + tiltDeg}, ${cx}, ${cy})`)
    svg.appendChild(dustLane)
  }
}

function drawGlobular(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  _size: number,
  palette: GalaxyPalette,
): void {
  const defs = svgEl('defs')

  const glowGrad = svgEl('radialGradient')
  glowGrad.id = `${id}g`
  glowGrad.setAttribute('cx', '50%')
  glowGrad.setAttribute('cy', '50%')
  glowGrad.setAttribute('r', '50%')
  addStop(glowGrad, '0%', '#ffffff', 0.7)
  addStop(glowGrad, '25%', palette.center, 0.5)
  addStop(glowGrad, '60%', palette.mid, 0.25)
  addStop(glowGrad, '100%', palette.outer, 0)

  const cGrad = svgEl('radialGradient')
  cGrad.id = `${id}c`
  cGrad.setAttribute('cx', '50%')
  cGrad.setAttribute('cy', '50%')
  cGrad.setAttribute('r', '50%')
  addStop(cGrad, '0%', '#ffffff', 1)
  addStop(cGrad, '50%', palette.center, 0.8)
  addStop(cGrad, '100%', palette.center, 0)

  defs.appendChild(glowGrad)
  defs.appendChild(cGrad)
  svg.appendChild(defs)

  // Base glow
  const glow = svgEl('circle')
  glow.setAttribute('cx', String(cx))
  glow.setAttribute('cy', String(cy))
  glow.setAttribute('r', String(r))
  glow.setAttribute('fill', `url(#${id}g)`)
  svg.appendChild(glow)

  // Gaussian-distributed star dots with color variety
  const starCount = 40 + Math.floor(Math.random() * 30)
  for (let i = 0; i < starCount; i++) {
    const u = Math.max(1e-6, Math.random())
    const v = Math.random()
    const gauss = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
    const dist = Math.min(Math.abs(gauss) * r * 0.3, r * 0.88)
    const angle = Math.random() * Math.PI * 2
    const sx = cx + Math.cos(angle) * dist
    const sy = cy + Math.sin(angle) * dist

    const roll = Math.random()
    const dotColor = roll < 0.70 ? '#ffffff' : roll < 0.85 ? palette.center : palette.mid

    const dot = svgEl('circle')
    dot.setAttribute('cx', String(sx))
    dot.setAttribute('cy', String(sy))
    dot.setAttribute('r', String(0.4 + Math.random() * 1.8))
    dot.setAttribute('fill', dotColor)
    dot.setAttribute('opacity', String(0.4 + Math.random() * 0.6))
    svg.appendChild(dot)
  }

  // Dense bright center
  const center = svgEl('circle')
  center.setAttribute('cx', String(cx))
  center.setAttribute('cy', String(cy))
  center.setAttribute('r', String(r * 0.25))
  center.setAttribute('fill', `url(#${id}c)`)
  svg.appendChild(center)
}

function drawIrregular(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  _size: number,
  palette: GalaxyPalette,
): void {
  const defs = svgEl('defs')

  const blobCount = 3 + Math.floor(Math.random() * 3)
  const blobColors = ['#ffffff', palette.center, palette.mid, palette.outer, palette.mid]

  for (let i = 0; i < blobCount; i++) {
    const bg = svgEl('radialGradient')
    bg.id = `${id}b${i}`
    bg.setAttribute('cx', '50%')
    bg.setAttribute('cy', '50%')
    bg.setAttribute('r', '50%')
    const col = blobColors[i % blobColors.length]
    const opacity = i === 0 ? 0.75 : 0.35 + Math.random() * 0.25
    addStop(bg, '0%', col, opacity)
    addStop(bg, '100%', palette.outer, 0)
    defs.appendChild(bg)
  }

  defs.appendChild(makeBlurFilter(`${id}f`, 3.5))
  svg.appendChild(defs)

  // Irregular ellipse blob patches (more organic than circles)
  for (let i = 0; i < blobCount; i++) {
    const ox = (Math.random() - 0.5) * r * 0.65
    const oy = (Math.random() - 0.5) * r * 0.65
    const baseR = r * (0.22 + Math.random() * 0.4)
    const rxRatio = 0.5 + Math.random() * 1.3
    const ryRatio = 0.5 + Math.random() * 1.3
    const blobRot = Math.random() * 360

    const blob = svgEl('ellipse')
    blob.setAttribute('cx', String(cx + ox))
    blob.setAttribute('cy', String(cy + oy))
    blob.setAttribute('rx', String(baseR * rxRatio))
    blob.setAttribute('ry', String(baseR * ryRatio))
    blob.setAttribute('fill', `url(#${id}b${i})`)
    blob.setAttribute('filter', `url(#${id}f)`)
    blob.setAttribute('transform', `rotate(${blobRot}, ${cx + ox}, ${cy + oy})`)
    svg.appendChild(blob)
  }

  // Bright HII star-forming regions
  const regionCount = 2 + Math.floor(Math.random() * 4)
  for (let i = 0; i < regionCount; i++) {
    const ox = (Math.random() - 0.5) * r * 0.85
    const oy = (Math.random() - 0.5) * r * 0.85
    const rr = r * (0.03 + Math.random() * 0.055)

    const region = svgEl('circle')
    region.setAttribute('cx', String(cx + ox))
    region.setAttribute('cy', String(cy + oy))
    region.setAttribute('r', String(rr))
    region.setAttribute('fill', '#ffffff')
    region.setAttribute('opacity', String(0.5 + Math.random() * 0.45))
    svg.appendChild(region)
  }

  // Tidal stream (40% probability)
  if (Math.random() < 0.4) {
    const startAngle = Math.random() * Math.PI * 2
    const sx = cx + Math.cos(startAngle) * r * 0.7
    const sy = cy + Math.sin(startAngle) * r * 0.7
    const ex = cx + Math.cos(startAngle + Math.PI * 0.6) * r * 1.5
    const ey = cy + Math.sin(startAngle + Math.PI * 0.6) * r * 1.5
    const cpx = cx + Math.cos(startAngle + Math.PI * 0.3) * r * 1.1
    const cpy = cy + Math.sin(startAngle + Math.PI * 0.3) * r * 1.1

    const stream = svgEl('path')
    stream.setAttribute('d', `M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`)
    stream.setAttribute('stroke', palette.mid)
    stream.setAttribute('stroke-opacity', '0.18')
    stream.setAttribute('stroke-width', String(r * 0.18))
    stream.setAttribute('fill', 'none')
    stream.setAttribute('stroke-linecap', 'round')
    stream.setAttribute('filter', `url(#${id}f)`)
    svg.appendChild(stream)
  }
}

function drawRing(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  _size: number,
  palette: GalaxyPalette,
): void {
  const defs = svgEl('defs')

  const ringGrad = svgEl('radialGradient')
  ringGrad.id = `${id}r`
  ringGrad.setAttribute('cx', '50%')
  ringGrad.setAttribute('cy', '50%')
  ringGrad.setAttribute('r', '50%')
  addStop(ringGrad, '0%', palette.outer, 0)
  addStop(ringGrad, '42%', palette.outer, 0)
  addStop(ringGrad, '55%', palette.center, 0.85)
  addStop(ringGrad, '68%', palette.mid, 0.65)
  addStop(ringGrad, '80%', palette.outer, 0.3)
  addStop(ringGrad, '100%', palette.outer, 0)

  const cGrad = svgEl('radialGradient')
  cGrad.id = `${id}c`
  cGrad.setAttribute('cx', '50%')
  cGrad.setAttribute('cy', '50%')
  cGrad.setAttribute('r', '50%')
  addStop(cGrad, '0%', '#ffffff', 0.65)
  addStop(cGrad, '60%', palette.center, 0.2)
  addStop(cGrad, '100%', palette.center, 0)

  defs.appendChild(ringGrad)
  defs.appendChild(cGrad)
  defs.appendChild(makeBlurFilter(`${id}f`, 1.5))
  svg.appendChild(defs)

  const isTilted = Math.random() < 0.5
  const tiltDeg = Math.random() * 60

  if (isTilted) {
    // Perspective-tilted ring rendered as ellipse
    const ry = r * 0.88 * (0.3 + Math.random() * 0.5)
    const ring = svgEl('ellipse')
    ring.setAttribute('cx', String(cx))
    ring.setAttribute('cy', String(cy))
    ring.setAttribute('rx', String(r * 0.88))
    ring.setAttribute('ry', String(ry))
    ring.setAttribute('fill', `url(#${id}r)`)
    ring.setAttribute('filter', `url(#${id}f)`)
    ring.setAttribute('transform', `rotate(${tiltDeg}, ${cx}, ${cy})`)
    svg.appendChild(ring)

    // Double ring (30% chance)
    if (Math.random() < 0.3) {
      const outerRy = ry * 1.15
      const outerRing = svgEl('ellipse')
      outerRing.setAttribute('cx', String(cx))
      outerRing.setAttribute('cy', String(cy))
      outerRing.setAttribute('rx', String(r * 0.88 * 1.15))
      outerRing.setAttribute('ry', String(outerRy))
      outerRing.setAttribute('fill', 'none')
      outerRing.setAttribute('stroke', palette.mid)
      outerRing.setAttribute('stroke-opacity', '0.22')
      outerRing.setAttribute('stroke-width', String(_size * 0.025))
      outerRing.setAttribute('transform', `rotate(${tiltDeg}, ${cx}, ${cy})`)
      svg.appendChild(outerRing)
    }
  } else {
    // Flat circular ring
    const ring = svgEl('circle')
    ring.setAttribute('cx', String(cx))
    ring.setAttribute('cy', String(cy))
    ring.setAttribute('r', String(r * 0.88))
    ring.setAttribute('fill', `url(#${id}r)`)
    ring.setAttribute('filter', `url(#${id}f)`)
    svg.appendChild(ring)

    // Double ring (30% chance)
    if (Math.random() < 0.3) {
      const outerRing = svgEl('circle')
      outerRing.setAttribute('cx', String(cx))
      outerRing.setAttribute('cy', String(cy))
      outerRing.setAttribute('r', String(r * 0.88 * 1.15))
      outerRing.setAttribute('fill', 'none')
      outerRing.setAttribute('stroke', palette.mid)
      outerRing.setAttribute('stroke-opacity', '0.22')
      outerRing.setAttribute('stroke-width', String(_size * 0.025))
      svg.appendChild(outerRing)
    }
  }

  // Small center remnant
  const center = svgEl('circle')
  center.setAttribute('cx', String(cx))
  center.setAttribute('cy', String(cy))
  center.setAttribute('r', String(r * 0.14))
  center.setAttribute('fill', `url(#${id}c)`)
  svg.appendChild(center)
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useStarBackground() {
  const starsContainer = ref<HTMLElement>()
  const prefersReducedMotion = ref(false)
  const stars: StarItem[] = []
  const galaxies: GalaxyItem[] = []
  let nextStarId = 1
  let animFrame = 0
  let lastTimestamp = 0
  let resizeTimeout: ReturnType<typeof setTimeout> | null = null
  let galaxySpawnTimeout: ReturnType<typeof setTimeout> | null = null

  const intervals: ReturnType<typeof setInterval>[] = []
  const timeouts: ReturnType<typeof setTimeout>[] = []

  const checkReducedMotion = () => {
    if (typeof window !== 'undefined') {
      prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }

  function getRandomVelocity(): { vx: number; vy: number } {
    const angle = Math.random() * Math.PI * 2
    const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN)
    return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }
  }

  async function connectRandomStars(): Promise<void> {
    if (!starsContainer.value || prefersReducedMotion.value) return
    await nextTick()
    const nodeList = starsContainer.value.querySelectorAll('.star')
    if (nodeList.length < 2) return

    const i1 = Math.floor(Math.random() * nodeList.length)
    let i2: number
    do {
      i2 = Math.floor(Math.random() * nodeList.length)
    } while (i1 === i2)

    const star1 = nodeList[i1] as HTMLElement
    const star2 = nodeList[i2] as HTMLElement

    const rect = starsContainer.value.getBoundingClientRect()
    const r1 = star1.getBoundingClientRect()
    const r2 = star2.getBoundingClientRect()

    const x1 = r1.left + r1.width / 2 - rect.left
    const y1 = r1.top + r1.height / 2 - rect.top
    const x2 = r2.left + r2.width / 2 - rect.left
    const y2 = r2.top + r2.height / 2 - rect.top

    const dx = x2 - x1
    const dy = y2 - y1
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 250) return
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI

    const line = document.createElement('div')
    line.className = 'star-connection'
    line.style.cssText = `
      position: absolute;
      left: ${x1}px;
      top: ${y1}px;
      width: ${dist}px;
      height: 2px;
      background: linear-gradient(90deg, rgba(255,255,255,0.8), rgba(255,223,100,0.6), rgba(255,255,255,0.1));
      transform-origin: 0 0;
      transform: rotate(${angle}deg);
      pointer-events: none;
      z-index: 5;
      opacity: 0;
      animation: fadeInOut ${LINE_DURATION}ms ease-in-out;
    `
    starsContainer.value.appendChild(line)

    const timeoutId = setTimeout(() => {
      if (starsContainer.value && starsContainer.value.contains(line)) {
        starsContainer.value.removeChild(line)
      }
    }, LINE_DURATION)
    timeouts.push(timeoutId)
  }

  function spawnGalaxy(): void {
    if (!starsContainer.value || prefersReducedMotion.value) return
    if (galaxies.length >= GALAXY_MAX_COUNT) return

    const config = pickGalaxyTypeConfig()
    const paletteList = GALAXY_PALETTES_BY_TYPE[config.type]
    const palette = paletteList[Math.floor(Math.random() * paletteList.length)]

    const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin)
    const w = starsContainer.value.clientWidth || window.innerWidth
    const h = starsContainer.value.clientHeight || window.innerHeight
    const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin)
    const edge = Math.floor(Math.random() * 4)
    let x: number, y: number, vx: number, vy: number
    if (edge === 0) { // top
      x = Math.random() * w; y = -size
      const a = Math.PI * 0.25 + Math.random() * Math.PI * 0.5
      vx = Math.cos(a) * speed; vy = Math.sin(a) * speed
    } else if (edge === 1) { // bottom
      x = Math.random() * w; y = h + size
      const a = -Math.PI + Math.PI * 0.25 + Math.random() * Math.PI * 0.5
      vx = Math.cos(a) * speed; vy = Math.sin(a) * speed
    } else if (edge === 2) { // left
      x = -size; y = Math.random() * h
      const a = -Math.PI * 0.25 + Math.random() * Math.PI * 0.5
      vx = Math.cos(a) * speed; vy = Math.sin(a) * speed
    } else { // right
      x = w + size; y = Math.random() * h
      const a = Math.PI - Math.PI * 0.25 + Math.random() * (-Math.PI * 0.5)
      vx = Math.cos(a) * speed; vy = Math.sin(a) * speed
    }

    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    svg.classList.add('galaxy')
    svg.style.animation = `galaxyLifecycle ${config.lifetime}ms ease-in-out forwards`

    const rotDir = Math.random() > 0.5 ? 1 : -1
    const rotDeg = config.rotRange[0] + Math.random() * (config.rotRange[1] - config.rotRange[0])
    svg.style.setProperty('--rot', `${rotDir * rotDeg}deg`)

    const cx = size / 2
    const cy = size / 2
    const r = size / 2
    const id = `g${++galaxyIdCounter}`

    switch (config.type) {
      case 'spiral':
        drawSpiral(svg, id, cx, cy, r, size, palette)
        break
      case 'barred-spiral':
        drawBarredSpiral(svg, id, cx, cy, r, size, palette)
        break
      case 'elliptical':
        drawElliptical(svg, id, cx, cy, r, size, palette)
        break
      case 'globular':
        drawGlobular(svg, id, cx, cy, r, size, palette)
        break
      case 'irregular':
        drawIrregular(svg, id, cx, cy, r, size, palette)
        break
      case 'ring':
        drawRing(svg, id, cx, cy, r, size, palette)
        break
    }

    const item: GalaxyItem = { el: svg, x, y, vx, vy }
    svg.style.transform = `translate(${x}px, ${y}px)`
    starsContainer.value.appendChild(svg)
    galaxies.push(item)

    const removeTimeout = setTimeout(() => {
      if (starsContainer.value && starsContainer.value.contains(svg)) {
        starsContainer.value.removeChild(svg)
      }
      const idx = galaxies.indexOf(item)
      if (idx !== -1) galaxies.splice(idx, 1)
    }, config.lifetime)
    timeouts.push(removeTimeout)
  }

  function scheduleNextGalaxy(): void {
    const delay =
      GALAXY_SPAWN_INTERVAL_MIN +
      Math.random() * (GALAXY_SPAWN_INTERVAL_MAX - GALAXY_SPAWN_INTERVAL_MIN)
    galaxySpawnTimeout = setTimeout(() => {
      spawnGalaxy()
      scheduleNextGalaxy()
    }, delay)
  }

  function spawnStar(timestamp: number): StarItem | null {
    if (!starsContainer.value) return null

    const star = document.createElement('div')
    star.className = 'star'

    const size = Math.random() * 4 + 2
    const w = starsContainer.value.clientWidth || window.innerWidth
    const h = starsContainer.value.clientHeight || window.innerHeight

    const starColors = [
      { bg: 'rgba(255, 255, 255, 0.95)', glow: 'rgba(255, 255, 255, 0.8)' },
      { bg: 'rgba(235, 240, 255, 0.9)', glow: 'rgba(200, 220, 255, 0.7)' },
      { bg: 'rgba(255, 248, 235, 0.9)', glow: 'rgba(255, 240, 200, 0.7)' },
      { bg: 'rgba(220, 225, 255, 0.85)', glow: 'rgba(180, 200, 255, 0.6)' },
      { bg: 'rgba(255, 240, 250, 0.9)', glow: 'rgba(255, 210, 240, 0.7)' },
      { bg: 'rgba(245, 245, 255, 0.92)', glow: 'rgba(230, 230, 255, 0.75)' },
    ]
    const color = starColors[Math.floor(Math.random() * starColors.length)]

    star.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: ${size}px;
        height: ${size}px;
        background: ${color.bg};
        border-radius: 50%;
        box-shadow: 0 0 10px ${color.glow};
        animation: twinkle 3s ease-in-out ${-(Math.random() * 3).toFixed(2)}s infinite;
        will-change: transform, opacity;
        pointer-events: none;
      `

    const x = Math.random() * w
    const y = Math.random() * h
    const { vx, vy } = getRandomVelocity()
    const { vx: tvx, vy: tvy } = getRandomVelocity()

    const item: StarItem = {
      id: nextStarId++,
      el: star,
      x,
      y,
      vx,
      vy,
      targetVx: tvx,
      targetVy: tvy,
      nextDirectionChange:
        timestamp + DIR_CHANGE_MIN + Math.random() * (DIR_CHANGE_MAX - DIR_CHANGE_MIN),
    }

    star.style.transform = `translate(${x}px, ${y}px)`
    starsContainer.value.appendChild(star)
    stars.push(item)
    return item
  }

  function animateStars(timestamp: number): void {
    if (lastTimestamp === 0) lastTimestamp = timestamp
    const rawDelta = (timestamp - lastTimestamp) / 1000
    const delta = Math.min(rawDelta, 0.1)
    lastTimestamp = timestamp

    const w = starsContainer.value?.clientWidth ?? window.innerWidth
    const h = starsContainer.value?.clientHeight ?? window.innerHeight

    for (const star of stars) {
      const lerpFactor = Math.min(1, LERP_RATE * delta)
      star.vx += (star.targetVx - star.vx) * lerpFactor
      star.vy += (star.targetVy - star.vy) * lerpFactor

      star.x += star.vx * delta
      star.y += star.vy * delta

      const pad = 10
      if (star.x < -pad) star.x += w + pad * 2
      else if (star.x > w + pad) star.x -= w + pad * 2
      if (star.y < -pad) star.y += h + pad * 2
      else if (star.y > h + pad) star.y -= h + pad * 2

      star.el.style.transform = `translate(${star.x}px, ${star.y}px)`

      if (timestamp >= star.nextDirectionChange) {
        const { vx, vy } = getRandomVelocity()
        star.targetVx = vx
        star.targetVy = vy
        star.nextDirectionChange =
          timestamp + DIR_CHANGE_MIN + Math.random() * (DIR_CHANGE_MAX - DIR_CHANGE_MIN)
      }
    }

    for (const galaxy of galaxies) {
      galaxy.x += galaxy.vx * delta
      galaxy.y += galaxy.vy * delta

      const gSize = parseFloat(galaxy.el.getAttribute('width') ?? '220')
      const pad = gSize
      if (galaxy.x < -pad) galaxy.x += w + pad * 2
      else if (galaxy.x > w + pad) galaxy.x -= w + pad * 2
      if (galaxy.y < -pad) galaxy.y += h + pad * 2
      else if (galaxy.y > h + pad) galaxy.y -= h + pad * 2

      galaxy.el.style.transform = `translate(${galaxy.x}px, ${galaxy.y}px)`
    }

    animFrame = requestAnimationFrame(animateStars)
  }

  function handleResize(): void {
    if (resizeTimeout) clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      if (!starsContainer.value || stars.length === 0) return
      const w = starsContainer.value.clientWidth || window.innerWidth
      const h = starsContainer.value.clientHeight || window.innerHeight
      for (const star of stars) {
        star.x = Math.random() * w
        star.y = Math.random() * h
        star.el.style.transform = `translate(${star.x}px, ${star.y}px)`
      }
    }, 150)
  }

  function createStars(): void {
    if (!starsContainer.value || prefersReducedMotion.value) return
    starsContainer.value.innerHTML = ''
    stars.length = 0
    const now = performance.now()
    for (let i = 0; i < STAR_COUNT; i++) {
      spawnStar(now)
    }
    lastTimestamp = 0
    animFrame = requestAnimationFrame(animateStars)
  }

  function cleanup(): void {
    if (animFrame) {
      cancelAnimationFrame(animFrame)
      animFrame = 0
    }
    if (galaxySpawnTimeout) {
      clearTimeout(galaxySpawnTimeout)
      galaxySpawnTimeout = null
    }
    intervals.forEach((id) => clearInterval(id))
    timeouts.forEach((id) => clearTimeout(id))
    intervals.length = 0
    timeouts.length = 0
    stars.length = 0
    galaxies.length = 0
    window.removeEventListener('resize', handleResize)
    if (resizeTimeout) clearTimeout(resizeTimeout)
    if (starsContainer.value) {
      starsContainer.value.innerHTML = ''
    }
  }

  onMounted(async () => {
    checkReducedMotion()
    if (!prefersReducedMotion.value) {
      await nextTick()
      setTimeout(createStars, 100)
      window.addEventListener('resize', handleResize)

      const starConnectionInterval = setInterval(connectRandomStars, STAR_CONNECTION_INTERVAL)
      intervals.push(starConnectionInterval)

      scheduleNextGalaxy()
    }
  })

  onUnmounted(() => {
    cleanup()
  })

  return { starsContainer, prefersReducedMotion }
}
