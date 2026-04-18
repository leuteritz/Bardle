import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useGalaxyStore } from '../../stores/galaxyStore'
import {
  STAR_COUNT,
  WARP_SPEED_MAX,
  GALAXY_TRANS_WARP_MS,
  GALAXY_TRANS_DECEL_MS,
  GALAXY_SPAWN_INTERVAL_MIN,
  GALAXY_SPAWN_INTERVAL_MAX,
  GALAXY_MAX_COUNT,
  STAR_BG_BASE_SPEED_MIN,
  STAR_BG_BASE_SPEED_RANGE,
} from '../../config/constants'
import { useWindowFocus } from '../useWindowFocus'

// ─── Types ────────────────────────────────────────────────────────────────────

type StarItem = {
  id: number
  angle: number
  dist: number
  baseSpeed: number
  r: number
  g: number
  b: number
  twinklePhase: number
  twinkleSpeed: number
}

type GalaxyItem = {
  el: SVGSVGElement
  x: number
  y: number
  scale: number
  maxScale: number
  lifetime: number
  elapsed: number
  rot: number
}

type GalaxyType =
  | 'spiral'
  | 'barred-spiral'
  | 'elliptical'
  | 'globular'
  | 'irregular'
  | 'ring'
  | 'lenticular'
  | 'starburst'

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

type DustPatch = {
  angle: number
  dist: number
  baseSpeed: number
  rx: number
  ry: number
  rotation: number
  opacity: number
  r: number
  g: number
  b: number
}

type StarCluster = {
  angle: number
  dist: number
  baseSpeed: number
  stars: Array<{ dx: number; dy: number; r: number; g: number; b: number; brightness: number }>
  twinklePhase: number
}

type NebulaMovingItem = {
  el: SVGSVGElement
  angle: number
  dist: number
  baseSpeed: number
  scale: number
  maxScale: number
  size: number
}

// ─── Emission Nebula / Ion Cloud constants ───────────────────────────────────

const EMISSION_MAX_COUNT = 4
const EMISSION_SPAWN_MIN = 8_000
const EMISSION_SPAWN_MAX = 18_000
const CLUSTER_COUNT = 10
const DUST_PATCH_COUNT = 7

// ─── Champion-Rettungs-Rotation ───────────────────────────────────────────────
const RESCUE_ROTATION_DURATION_MS = 2_000
const RESCUE_ROTATION_TOTAL_RAD = Math.PI * 1.5

// ─── Emission Nebula palettes ─────────────────────────────────────────────────

type EmissionType = 'emission-nebula' | 'ion-cloud'

type EmissionPalette = {
  core: string
  mid: string
  outer: string
  glow: string
}

const EMISSION_NEBULA_PALETTES: EmissionPalette[] = [
  { core: '#c8e8ff', mid: '#5599dd', outer: '#1a3a7a', glow: '#aaccff' },
  { core: '#ffcccc', mid: '#dd4466', outer: '#7a1a2a', glow: '#ffaacc' },
  { core: '#ccffee', mid: '#22aa88', outer: '#0a4a30', glow: '#88ffcc' },
  { core: '#eeccff', mid: '#8844cc', outer: '#2a0a5a', glow: '#ddaaff' },
  { core: '#fff0cc', mid: '#dd9922', outer: '#6a3a00', glow: '#ffdd88' },
  { core: '#ffddee', mid: '#ee4488', outer: '#660022', glow: '#ffaabb' },
]

const ION_CLOUD_PALETTES: EmissionPalette[] = [
  { core: '#88eeff', mid: '#0088cc', outer: '#002244', glow: '#44ccff' },
  { core: '#cc88ff', mid: '#8822cc', outer: '#220044', glow: '#aa55ff' },
  { core: '#88ffcc', mid: '#00aa66', outer: '#002211', glow: '#55ffaa' },
  { core: '#ffaa88', mid: '#cc5500', outer: '#441100', glow: '#ff8844' },
  { core: '#aaffee', mid: '#00ccaa', outer: '#004433', glow: '#55ffdd' },
  { core: '#ffccff', mid: '#cc44cc', outer: '#440044', glow: '#ff88ff' },
]

const GALAXY_TYPE_CONFIGS: GalaxyTypeConfig[] = [
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
    type: 'starburst',
    sizeMin: 80,
    sizeMax: 150,
    speedMin: 0.8,
    speedMax: 2.5,
    lifetime: 14_000,
    rotRange: [30, 90],
    weight: 2,
  },
]

const GALAXY_PALETTES_BY_TYPE: Record<GalaxyType, GalaxyPalette[]> = {
  spiral: [
    { center: '#ffffff', mid: '#8b5cf6', outer: '#3b82f6', arm: '#a78bfa' },
    { center: '#ffffff', mid: '#06b6d4', outer: '#6366f1', arm: '#67e8f9' },
    { center: '#ffffff', mid: '#ec4899', outer: '#8b5cf6', arm: '#f9a8d4' },
    { center: '#e0f2fe', mid: '#38bdf8', outer: '#0369a1', arm: '#7dd3fc' },
    { center: '#ffffff', mid: '#14b8a6', outer: '#d97706', arm: '#5eead4' },
    { center: '#fff1f2', mid: '#fb7185', outer: '#f59e0b', arm: '#fda4af' },
    { center: '#f0fdf4', mid: '#84cc16', outer: '#059669', arm: '#bef264' },
    { center: '#e0f7ff', mid: '#7dd3fc', outer: '#bfdbfe', arm: '#bae6fd' },
  ],
  'barred-spiral': [
    { center: '#fff7ed', mid: '#f59e0b', outer: '#ef4444', arm: '#fcd34d' },
    { center: '#fef3c7', mid: '#f97316', outer: '#dc2626', arm: '#fde68a' },
    { center: '#ffffff', mid: '#fb923c', outer: '#9333ea', arm: '#fdba74' },
    { center: '#f0f9ff', mid: '#38bdf8', outer: '#14b8a6', arm: '#7dd3fc' },
    { center: '#f0fdf4', mid: '#4ade80', outer: '#d97706', arm: '#86efac' },
    { center: '#fff1f2', mid: '#fb7185', outer: '#dc2626', arm: '#fda4af' },
  ],
  elliptical: [
    { center: '#fff7ed', mid: '#fbbf24', outer: '#d97706' },
    { center: '#fef9ee', mid: '#f59e0b', outer: '#b45309' },
    { center: '#ffffff', mid: '#fde68a', outer: '#f59e0b' },
    { center: '#fdf4ff', mid: '#e9d5ff', outer: '#a855f7' },
    { center: '#7f1d1d', mid: '#dc2626', outer: '#450a0a' },
    { center: '#f8fafc', mid: '#cbd5e1', outer: '#94a3b8' },
    { center: '#eff6ff', mid: '#bfdbfe', outer: '#93c5fd' },
  ],
  globular: [
    { center: '#fffbeb', mid: '#fef08a', outer: '#fbbf24' },
    { center: '#ffffff', mid: '#e0f2fe', outer: '#7dd3fc' },
    { center: '#f0fdf4', mid: '#bbf7d0', outer: '#4ade80' },
    { center: '#fdf2f8', mid: '#fbcfe8', outer: '#db2777' },
    { center: '#fff7ed', mid: '#fdba74', outer: '#d97706' },
    { center: '#faf5ff', mid: '#c4b5fd', outer: '#6d28d9' },
    { center: '#ecfeff', mid: '#99f6e4', outer: '#0d9488' },
  ],
  irregular: [
    { center: '#eff6ff', mid: '#60a5fa', outer: '#2563eb' },
    { center: '#fdf4ff', mid: '#e879f9', outer: '#a855f7' },
    { center: '#ecfdf5', mid: '#34d399', outer: '#059669' },
    { center: '#fff1f2', mid: '#fda4af', outer: '#e11d48' },
    { center: '#fff7ed', mid: '#fb923c', outer: '#b45309' },
    { center: '#ecfeff', mid: '#22d3ee', outer: '#0e7490' },
    { center: '#fdf2f8', mid: '#f0abfc', outer: '#a21caf' },
  ],
  ring: [
    { center: '#ecfeff', mid: '#22d3ee', outer: '#0891b2' },
    { center: '#f0f9ff', mid: '#38bdf8', outer: '#0284c7' },
    { center: '#fdf4ff', mid: '#c084fc', outer: '#7c3aed' },
    { center: '#fff7ed', mid: '#fed7aa', outer: '#ea580c' },
    { center: '#fffbeb', mid: '#fcd34d', outer: '#b45309' },
    { center: '#f0fdf4', mid: '#86efac', outer: '#4d7c0f' },
    { center: '#fdf2f8', mid: '#f0abfc', outer: '#7e22ce' },
  ],
  lenticular: [
    { center: '#fffbeb', mid: '#fde68a', outer: '#d97706' },
    { center: '#fff7ed', mid: '#fdba74', outer: '#c2410c' },
    { center: '#f8fafc', mid: '#cbd5e1', outer: '#64748b' },
    { center: '#fdf4ff', mid: '#e9d5ff', outer: '#7c3aed' },
    { center: '#eff6ff', mid: '#bfdbfe', outer: '#3b82f6' },
    { center: '#f0fdf4', mid: '#bbf7d0', outer: '#059669' },
  ],
  starburst: [
    { center: '#ffffff', mid: '#fef08a', outer: '#f59e0b' },
    { center: '#ffffff', mid: '#fbcfe8', outer: '#ec4899' },
    { center: '#ffffff', mid: '#a5f3fc', outer: '#06b6d4' },
    { center: '#ffffff', mid: '#bbf7d0', outer: '#10b981' },
    { center: '#ffffff', mid: '#ddd6fe', outer: '#8b5cf6' },
    { center: '#ffffff', mid: '#fed7aa', outer: '#f97316' },
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
  const halo = svgEl('circle')
  halo.setAttribute('cx', String(cx))
  halo.setAttribute('cy', String(cy))
  halo.setAttribute('r', String(r))
  halo.setAttribute('fill', `url(#${id}h)`)
  svg.appendChild(halo)
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
  const halo = svgEl('circle')
  halo.setAttribute('cx', String(cx))
  halo.setAttribute('cy', String(cy))
  halo.setAttribute('r', String(r))
  halo.setAttribute('fill', `url(#${id}h)`)
  svg.appendChild(halo)
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
  const haloEl = svgEl('ellipse')
  haloEl.setAttribute('cx', String(cx))
  haloEl.setAttribute('cy', String(cy))
  haloEl.setAttribute('rx', String(r))
  haloEl.setAttribute('ry', String(r * axisRatio))
  haloEl.setAttribute('fill', `url(#${id}h)`)
  haloEl.setAttribute('transform', `rotate(${tiltDeg}, ${cx}, ${cy})`)
  svg.appendChild(haloEl)
  const body = svgEl('ellipse')
  body.setAttribute('cx', String(cx))
  body.setAttribute('cy', String(cy))
  body.setAttribute('rx', String(r * 0.72))
  body.setAttribute('ry', String(r * 0.72 * axisRatio))
  body.setAttribute('fill', `url(#${id}g)`)
  body.setAttribute('filter', `url(#${id}f)`)
  body.setAttribute('transform', `rotate(${tiltDeg}, ${cx}, ${cy})`)
  svg.appendChild(body)
  const center = svgEl('circle')
  center.setAttribute('cx', String(cx))
  center.setAttribute('cy', String(cy))
  center.setAttribute('r', String(r * 0.14))
  center.setAttribute('fill', `url(#${id}c)`)
  svg.appendChild(center)
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
  const glow = svgEl('circle')
  glow.setAttribute('cx', String(cx))
  glow.setAttribute('cy', String(cy))
  glow.setAttribute('r', String(r))
  glow.setAttribute('fill', `url(#${id}g)`)
  svg.appendChild(glow)
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
    const dotColor = roll < 0.7 ? '#ffffff' : roll < 0.85 ? palette.center : palette.mid
    const dot = svgEl('circle')
    dot.setAttribute('cx', String(sx))
    dot.setAttribute('cy', String(sy))
    dot.setAttribute('r', String(0.4 + Math.random() * 1.8))
    dot.setAttribute('fill', dotColor)
    dot.setAttribute('opacity', String(0.4 + Math.random() * 0.6))
    svg.appendChild(dot)
  }
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
  } else {
    const ring = svgEl('circle')
    ring.setAttribute('cx', String(cx))
    ring.setAttribute('cy', String(cy))
    ring.setAttribute('r', String(r * 0.88))
    ring.setAttribute('fill', `url(#${id}r)`)
    ring.setAttribute('filter', `url(#${id}f)`)
    svg.appendChild(ring)
  }
  const center = svgEl('circle')
  center.setAttribute('cx', String(cx))
  center.setAttribute('cy', String(cy))
  center.setAttribute('r', String(r * 0.14))
  center.setAttribute('fill', `url(#${id}c)`)
  svg.appendChild(center)
}

function drawLenticular(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  size: number,
  palette: GalaxyPalette,
): void {
  const defs = svgEl('defs')
  const bodyGrad = svgEl('radialGradient')
  bodyGrad.id = `${id}g`
  bodyGrad.setAttribute('cx', '50%')
  bodyGrad.setAttribute('cy', '50%')
  bodyGrad.setAttribute('r', '50%')
  addStop(bodyGrad, '0%', '#ffffff', 1)
  addStop(bodyGrad, '20%', palette.center, 0.9)
  addStop(bodyGrad, '55%', palette.mid, 0.5)
  addStop(bodyGrad, '80%', palette.outer, 0.15)
  addStop(bodyGrad, '100%', palette.outer, 0)
  const haloGrad = svgEl('radialGradient')
  haloGrad.id = `${id}h`
  haloGrad.setAttribute('cx', '50%')
  haloGrad.setAttribute('cy', '50%')
  haloGrad.setAttribute('r', '50%')
  addStop(haloGrad, '0%', palette.outer, 0.1)
  addStop(haloGrad, '100%', palette.outer, 0)
  defs.appendChild(bodyGrad)
  defs.appendChild(haloGrad)
  defs.appendChild(makeBlurFilter(`${id}f`, 3))
  svg.appendChild(defs)
  const halo = svgEl('ellipse')
  halo.setAttribute('cx', String(cx))
  halo.setAttribute('cy', String(cy))
  halo.setAttribute('rx', String(r))
  halo.setAttribute('ry', String(r * 0.22))
  halo.setAttribute('fill', `url(#${id}h)`)
  svg.appendChild(halo)
  const body = svgEl('ellipse')
  body.setAttribute('cx', String(cx))
  body.setAttribute('cy', String(cy))
  body.setAttribute('rx', String(r * 0.75))
  body.setAttribute('ry', String(r * 0.17))
  body.setAttribute('fill', `url(#${id}g)`)
  body.setAttribute('filter', `url(#${id}f)`)
  svg.appendChild(body)
  const dust = svgEl('ellipse')
  dust.setAttribute('cx', String(cx))
  dust.setAttribute('cy', String(cy))
  dust.setAttribute('rx', String(r * 0.82))
  dust.setAttribute('ry', String(r * 0.08))
  dust.setAttribute('fill', 'none')
  dust.setAttribute('stroke', palette.outer)
  dust.setAttribute('stroke-opacity', '0.22')
  dust.setAttribute('stroke-width', String(size * 0.018))
  svg.appendChild(dust)
  const center = svgEl('circle')
  center.setAttribute('cx', String(cx))
  center.setAttribute('cy', String(cy))
  center.setAttribute('r', String(r * 0.1))
  center.setAttribute('fill', '#ffffff')
  center.setAttribute('opacity', '0.9')
  svg.appendChild(center)
}

function drawStarburst(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  size: number,
  palette: GalaxyPalette,
): void {
  const defs = svgEl('defs')
  const coreGrad = svgEl('radialGradient')
  coreGrad.id = `${id}c`
  coreGrad.setAttribute('cx', '50%')
  coreGrad.setAttribute('cy', '50%')
  coreGrad.setAttribute('r', '50%')
  addStop(coreGrad, '0%', '#ffffff', 1)
  addStop(coreGrad, '40%', palette.center, 0.85)
  addStop(coreGrad, '100%', palette.mid, 0)
  const bloomGrad = svgEl('radialGradient')
  bloomGrad.id = `${id}b`
  bloomGrad.setAttribute('cx', '50%')
  bloomGrad.setAttribute('cy', '50%')
  bloomGrad.setAttribute('r', '50%')
  addStop(bloomGrad, '0%', palette.center, 0.4)
  addStop(bloomGrad, '60%', palette.mid, 0.12)
  addStop(bloomGrad, '100%', palette.outer, 0)
  defs.appendChild(coreGrad)
  defs.appendChild(bloomGrad)
  defs.appendChild(makeBlurFilter(`${id}f`, 2))
  svg.appendChild(defs)
  const bloom = svgEl('circle')
  bloom.setAttribute('cx', String(cx))
  bloom.setAttribute('cy', String(cy))
  bloom.setAttribute('r', String(r))
  bloom.setAttribute('fill', `url(#${id}b)`)
  svg.appendChild(bloom)
  const spikeCount = 6 + Math.floor(Math.random() * 3)
  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI * 2 + Math.random() * 0.2
    const len = r * (0.5 + Math.random() * 0.45)
    const ex = cx + Math.cos(angle) * len
    const ey = cy + Math.sin(angle) * len
    const spike = svgEl('line')
    spike.setAttribute('x1', String(cx))
    spike.setAttribute('y1', String(cy))
    spike.setAttribute('x2', String(ex))
    spike.setAttribute('y2', String(ey))
    spike.setAttribute('stroke', palette.center)
    spike.setAttribute('stroke-opacity', String((0.35 + Math.random() * 0.3).toFixed(2)))
    spike.setAttribute('stroke-width', String(size * 0.018 * (1 - (i % 3) * 0.15)))
    spike.setAttribute('stroke-linecap', 'round')
    spike.setAttribute('filter', `url(#${id}f)`)
    svg.appendChild(spike)
  }
  const core = svgEl('circle')
  core.setAttribute('cx', String(cx))
  core.setAttribute('cy', String(cy))
  core.setAttribute('r', String(r * 0.22))
  core.setAttribute('fill', `url(#${id}c)`)
  svg.appendChild(core)
  const point = svgEl('circle')
  point.setAttribute('cx', String(cx))
  point.setAttribute('cy', String(cy))
  point.setAttribute('r', String(r * 0.07))
  point.setAttribute('fill', '#ffffff')
  point.setAttribute('opacity', '1')
  svg.appendChild(point)
}

// ─── Emission Nebula Draw Functions ──────────────────────────────────────────

function drawEmissionNebula(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  palette: EmissionPalette,
): void {
  const defs = svgEl('defs')
  const outerGrad = svgEl('radialGradient')
  outerGrad.id = `${id}o`
  outerGrad.setAttribute('cx', '50%')
  outerGrad.setAttribute('cy', '50%')
  outerGrad.setAttribute('r', '50%')
  addStop(outerGrad, '0%', palette.glow, 0.25)
  addStop(outerGrad, '50%', palette.outer, 0.12)
  addStop(outerGrad, '100%', palette.outer, 0)
  const midGrad = svgEl('radialGradient')
  midGrad.id = `${id}m`
  midGrad.setAttribute('cx', '48%')
  midGrad.setAttribute('cy', '52%')
  midGrad.setAttribute('r', '50%')
  addStop(midGrad, '0%', palette.mid, 0.55)
  addStop(midGrad, '40%', palette.mid, 0.3)
  addStop(midGrad, '100%', palette.outer, 0)
  const coreGrad = svgEl('radialGradient')
  coreGrad.id = `${id}c`
  coreGrad.setAttribute('cx', '50%')
  coreGrad.setAttribute('cy', '50%')
  coreGrad.setAttribute('r', '50%')
  addStop(coreGrad, '0%', '#ffffff', 0.9)
  addStop(coreGrad, '20%', palette.core, 0.75)
  addStop(coreGrad, '60%', palette.mid, 0.35)
  addStop(coreGrad, '100%', palette.outer, 0)
  const blurFilter = svgEl('filter')
  blurFilter.id = `${id}f`
  blurFilter.setAttribute('x', '-30%')
  blurFilter.setAttribute('y', '-30%')
  blurFilter.setAttribute('width', '160%')
  blurFilter.setAttribute('height', '160%')
  const blur = svgEl('feGaussianBlur')
  blur.setAttribute('stdDeviation', '10')
  blurFilter.appendChild(blur)
  defs.appendChild(outerGrad)
  defs.appendChild(midGrad)
  defs.appendChild(coreGrad)
  defs.appendChild(blurFilter)
  svg.appendChild(defs)
  const tilt = Math.random() * 60 - 30
  const axisY = 0.55 + Math.random() * 0.35
  const outer = svgEl('ellipse')
  outer.setAttribute('cx', String(cx))
  outer.setAttribute('cy', String(cy))
  outer.setAttribute('rx', String(r))
  outer.setAttribute('ry', String(r * axisY))
  outer.setAttribute('fill', `url(#${id}o)`)
  outer.setAttribute('transform', `rotate(${tilt}, ${cx}, ${cy})`)
  svg.appendChild(outer)
  const offX = (Math.random() - 0.5) * r * 0.25
  const offY = (Math.random() - 0.5) * r * 0.25
  const mid = svgEl('ellipse')
  mid.setAttribute('cx', String(cx + offX))
  mid.setAttribute('cy', String(cy + offY))
  mid.setAttribute('rx', String(r * 0.65))
  mid.setAttribute('ry', String(r * 0.65 * (0.6 + Math.random() * 0.3)))
  mid.setAttribute('fill', `url(#${id}m)`)
  mid.setAttribute('filter', `url(#${id}f)`)
  svg.appendChild(mid)
  const core = svgEl('circle')
  core.setAttribute('cx', String(cx))
  core.setAttribute('cy', String(cy))
  core.setAttribute('r', String(r * 0.3))
  core.setAttribute('fill', `url(#${id}c)`)
  svg.appendChild(core)
}

function drawIonCloud(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  palette: EmissionPalette,
): void {
  const defs = svgEl('defs')
  const g1 = svgEl('radialGradient')
  g1.id = `${id}a`
  g1.setAttribute('cx', '50%')
  g1.setAttribute('cy', '50%')
  g1.setAttribute('r', '50%')
  addStop(g1, '0%', palette.glow, 0.3)
  addStop(g1, '45%', palette.mid, 0.15)
  addStop(g1, '100%', palette.outer, 0)
  const g2 = svgEl('radialGradient')
  g2.id = `${id}b`
  g2.setAttribute('cx', '38%')
  g2.setAttribute('cy', '60%')
  g2.setAttribute('r', '50%')
  addStop(g2, '0%', palette.core, 0.22)
  addStop(g2, '60%', palette.mid, 0.08)
  addStop(g2, '100%', palette.outer, 0)
  const blurFilter = svgEl('filter')
  blurFilter.id = `${id}f`
  blurFilter.setAttribute('x', '-40%')
  blurFilter.setAttribute('y', '-40%')
  blurFilter.setAttribute('width', '180%')
  blurFilter.setAttribute('height', '180%')
  const blur = svgEl('feGaussianBlur')
  blur.setAttribute('stdDeviation', '18')
  blurFilter.appendChild(blur)
  defs.appendChild(g1)
  defs.appendChild(g2)
  defs.appendChild(blurFilter)
  svg.appendChild(defs)
  const tilt = Math.random() * 180
  const ry = 0.45 + Math.random() * 0.45
  const main = svgEl('ellipse')
  main.setAttribute('cx', String(cx))
  main.setAttribute('cy', String(cy))
  main.setAttribute('rx', String(r))
  main.setAttribute('ry', String(r * ry))
  main.setAttribute('fill', `url(#${id}a)`)
  main.setAttribute('filter', `url(#${id}f)`)
  main.setAttribute('transform', `rotate(${tilt}, ${cx}, ${cy})`)
  svg.appendChild(main)
  const sx = cx + (Math.random() - 0.5) * r * 0.5
  const sy = cy + (Math.random() - 0.5) * r * 0.5
  const secondary = svgEl('ellipse')
  secondary.setAttribute('cx', String(sx))
  secondary.setAttribute('cy', String(sy))
  secondary.setAttribute('rx', String(r * 0.7))
  secondary.setAttribute('ry', String(r * 0.7 * (0.4 + Math.random() * 0.4)))
  secondary.setAttribute('fill', `url(#${id}b)`)
  secondary.setAttribute('filter', `url(#${id}f)`)
  svg.appendChild(secondary)
}

// ─── Composable ───────────────────────────────────────────────────────────────

const STAR_COLORS: [number, number, number][] = [
  [255, 255, 255],
  [235, 240, 255],
  [255, 248, 235],
  [220, 225, 255],
  [255, 240, 250],
  [245, 245, 255],
]

export function useStarBackground() {
  const starsContainer = ref<HTMLElement>()
  const starCanvas = ref<HTMLCanvasElement>()
  const prefersReducedMotion = ref(false)
  const stars: StarItem[] = []
  const galaxies: GalaxyItem[] = []
  const emissionNebulas: NebulaMovingItem[] = []
  const dustPatches: DustPatch[] = []
  const starClusters: StarCluster[] = []
  let nextStarId = 1
  let animFrame = 0

  // ── Fokus-Zustand ──────────────────────────────────────────────────────────
  // true  → Fenster hat OS-Fokus → Canvas-Loop läuft
  // false → kein Fokus (anderes Fenster aktiv, z.B. YouTube) → Loop gestoppt
  let isWindowFocused = true
  let removeFocusListener: (() => void) | null = null

  // Polling-Fallback: document.hasFocus() alle 500ms prüfen
  // Sichert den Fall dass blur/focus Events nicht zuverlässig feuern (z.B. Chrome Multi-Monitor)
  let focusPollingInterval: ReturnType<typeof setInterval> | null = null

  let lastTimestamp = 0
  let hyperspaceElapsed = 0
  let wasHyperspaceActive = false

  let galaxyTransPhase: 'idle' | 'warp' | 'decel' = 'idle'
  let galaxyTransElapsed = 0
  let wasPendingTransition = false
  let galaxyTransDir = 0

  let resizeTimeout: ReturnType<typeof setTimeout> | null = null
  let galaxySpawnTimeout: ReturnType<typeof setTimeout> | null = null
  let emissionSpawnTimeout: ReturnType<typeof setTimeout> | null = null
  const timeouts: ReturnType<typeof setTimeout>[] = []

  const checkReducedMotion = () => {
    if (typeof window !== 'undefined') {
      prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }

  function resizeCanvas(): void {
    if (!starCanvas.value || !starsContainer.value) return
    starCanvas.value.width = starsContainer.value.clientWidth || window.innerWidth
    starCanvas.value.height = starsContainer.value.clientHeight || window.innerHeight
  }

  // ── Canvas ein-/ausblenden ─────────────────────────────────────────────────
  function hideCanvas(): void {
    if (starCanvas.value) starCanvas.value.style.opacity = '0'
  }

  function showCanvas(): void {
    if (starCanvas.value) starCanvas.value.style.opacity = '1'
  }

  // ── Loop starten / stoppen ─────────────────────────────────────────────────
  function startLoop(): void {
    if (animFrame) return // läuft bereits
    lastTimestamp = 0
    showCanvas()
    animFrame = requestAnimationFrame(animateStars)
  }

  function stopLoop(): void {
    if (animFrame) {
      cancelAnimationFrame(animFrame)
      animFrame = 0
    }
    hideCanvas()
  }

  // ── Fokus-Handler ──────────────────────────────────────────────────────────
  // Kein Fokus = Canvas-Loop komplett stoppen → 0 GPU-Last für andere Fenster
  function onWindowBlur(): void {
    if (!isWindowFocused) return
    isWindowFocused = false
    stopLoop()
    if (galaxySpawnTimeout) {
      clearTimeout(galaxySpawnTimeout)
      galaxySpawnTimeout = null
    }
    if (emissionSpawnTimeout) {
      clearTimeout(emissionSpawnTimeout)
      emissionSpawnTimeout = null
    }
  }

  function onWindowFocus(): void {
    if (isWindowFocused) return
    isWindowFocused = true
    if (!prefersReducedMotion.value && stars.length > 0) {
      startLoop()
      scheduleNextGalaxy()
      scheduleNextEmission()
    }
  }

  // ── Polling-Fallback für Multi-Monitor (Chrome blur-Event-Problem) ─────────
  // document.hasFocus() ist zuverlässiger als blur/focus Events auf Multi-Monitor-Setups
  function startFocusPolling(): void {
    focusPollingInterval = setInterval(() => {
      const hasFocus = document.hasFocus()
      if (!hasFocus && isWindowFocused) {
        onWindowBlur()
      } else if (hasFocus && !isWindowFocused) {
        onWindowFocus()
      }
    }, 500)
  }

  function stopFocusPolling(): void {
    if (focusPollingInterval) {
      clearInterval(focusPollingInterval)
      focusPollingInterval = null
    }
  }

  // ── Galaxy-Spawn ──────────────────────────────────────────────────────────
  function spawnGalaxy(): void {
    if (!starsContainer.value || prefersReducedMotion.value) return
    if (galaxies.length >= GALAXY_MAX_COUNT) return

    const config = pickGalaxyTypeConfig()
    const paletteList = GALAXY_PALETTES_BY_TYPE[config.type]
    const palette = paletteList[Math.floor(Math.random() * paletteList.length)]
    const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin)
    const w = starsContainer.value.clientWidth || window.innerWidth
    const h = starsContainer.value.clientHeight || window.innerHeight
    const mx = w * 0.1,
      my = h * 0.1
    const cx2 = mx + Math.random() * (w - 2 * mx)
    const cy2 = my + Math.random() * (h - 2 * my)
    const x = cx2 - size / 2
    const y = cy2 - size / 2
    const lifetime = 10_000 + Math.random() * 6_000
    const maxScale = 0.75 + Math.random() * 0.6
    const rotDir = Math.random() > 0.5 ? 1 : -1
    const rotDeg = config.rotRange[0] + Math.random() * (config.rotRange[1] - config.rotRange[0])
    const rot = rotDir * rotDeg

    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    svg.classList.add('galaxy')
    svg.style.opacity = '0'
    svg.style.willChange = 'transform, opacity'

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
      case 'lenticular':
        drawLenticular(svg, id, cx, cy, r, size, palette)
        break
      case 'starburst':
        drawStarburst(svg, id, cx, cy, r, size, palette)
        break
    }

    svg.style.transform = `translate(${x}px,${y}px) scale(0.05) rotate(${rot}deg)`
    starsContainer.value.appendChild(svg)
    galaxies.push({ el: svg, x, y, scale: 0.05, maxScale, lifetime, elapsed: 0, rot })
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

  function spawnEmissionNebula(randomDist = false): void {
    if (!starsContainer.value || prefersReducedMotion.value) return
    if (emissionNebulas.length >= EMISSION_MAX_COUNT) return

    const type: EmissionType = Math.random() < 0.55 ? 'emission-nebula' : 'ion-cloud'
    const palettes = type === 'emission-nebula' ? EMISSION_NEBULA_PALETTES : ION_CLOUD_PALETTES
    const palette = palettes[Math.floor(Math.random() * palettes.length)]
    const sizeMin = type === 'emission-nebula' ? 220 : 320
    const sizeMax = type === 'emission-nebula' ? 420 : 620
    const size = sizeMin + Math.random() * (sizeMax - sizeMin)
    const w = starsContainer.value.clientWidth || window.innerWidth
    const h = starsContainer.value.clientHeight || window.innerHeight
    const maxDist = Math.hypot(w / 2, h / 2) + 20
    const angle = Math.random() * Math.PI * 2
    const dist = randomDist
      ? maxDist * (0.08 + Math.random() * 0.75)
      : maxDist * (0.02 + Math.random() * 0.06)
    const baseSpeed = 0.44 + Math.random() * 0.32
    const maxScale = 1.4 + Math.random() * 1.2

    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    svg.classList.add(type)
    svg.style.opacity = '0'
    svg.style.willChange = 'transform, opacity'

    const id = `e${++galaxyIdCounter}`
    const half = size / 2
    if (type === 'emission-nebula') drawEmissionNebula(svg, id, half, half, half, palette)
    else drawIonCloud(svg, id, half, half, half, palette)

    svg.style.transform = `translate(0px,0px) scale(0.02) translate(${-half}px,${-half}px)`
    starsContainer.value.appendChild(svg)
    emissionNebulas.push({ el: svg, angle, dist, baseSpeed, scale: 0.02, maxScale, size })
  }

  function scheduleNextEmission(): void {
    const delay = EMISSION_SPAWN_MIN + Math.random() * (EMISSION_SPAWN_MAX - EMISSION_SPAWN_MIN)
    emissionSpawnTimeout = setTimeout(() => {
      spawnEmissionNebula()
      scheduleNextEmission()
    }, delay)
  }

  function initDust(): void {
    dustPatches.length = 0
    const w = starsContainer.value?.clientWidth || window.innerWidth
    const h = starsContainer.value?.clientHeight || window.innerHeight
    const maxDist = Math.hypot(w / 2, h / 2) + 20
    const dustConfigs: [number, number, number, number][] = [
      [10, 8, 5, 0.22],
      [5, 5, 12, 0.18],
      [12, 5, 3, 0.2],
      [8, 4, 8, 0.16],
      [6, 7, 4, 0.19],
      [9, 6, 6, 0.21],
      [4, 6, 10, 0.17],
    ]
    for (let i = 0; i < DUST_PATCH_COUNT; i++) {
      const [r, g, b, opacity] = dustConfigs[i]
      dustPatches.push({
        angle: Math.random() * Math.PI * 2,
        dist: maxDist * (0.1 + Math.random() * 0.8),
        baseSpeed: 0.2 + Math.random() * 0.16,
        rx: 180 + Math.random() * 200,
        ry: 100 + Math.random() * 150,
        rotation: Math.random() * Math.PI,
        opacity: opacity * (0.8 + Math.random() * 0.4),
        r,
        g,
        b,
      })
    }
  }

  function initClusters(): void {
    starClusters.length = 0
    const w = starsContainer.value?.clientWidth || window.innerWidth
    const h = starsContainer.value?.clientHeight || window.innerHeight
    const maxDist = Math.hypot(w / 2, h / 2) + 20
    for (let i = 0; i < CLUSTER_COUNT; i++) {
      const count = 15 + Math.floor(Math.random() * 12)
      const radius = 18 + Math.random() * 32
      const clusterStars = []
      for (let j = 0; j < count; j++) {
        const a = Math.random() * Math.PI * 2
        const d = Math.random() * radius
        const [r, g, b] = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
        clusterStars.push({
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          r,
          g,
          b,
          brightness: 0.4 + Math.random() * 0.6,
        })
      }
      starClusters.push({
        angle: Math.random() * Math.PI * 2,
        dist: maxDist * (0.08 + Math.random() * 0.8),
        baseSpeed: 0.56 + Math.random() * 0.36,
        stars: clusterStars,
        twinklePhase: Math.random() * Math.PI * 2,
      })
    }
  }

  function spawnStar(randomDist = false): StarItem {
    const w = starsContainer.value?.clientWidth || window.innerWidth
    const h = starsContainer.value?.clientHeight || window.innerHeight
    const cx = w / 2,
      cy = h / 2
    const maxDist = Math.hypot(cx, cy) + 20
    const angle = Math.random() * Math.PI * 2
    const minDist = maxDist * 0.1
    const dist = randomDist ? minDist + Math.random() * (maxDist * 0.85) : minDist
    const baseSpeed = STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE
    const [r, g, b] = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
    const item: StarItem = {
      id: nextStarId++,
      angle,
      dist,
      baseSpeed,
      r,
      g,
      b,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.5 + Math.random() * 1.5,
    }
    stars.push(item)
    return item
  }

  // ── Haupt-Animationsschleife ───────────────────────────────────────────────
  function animateStars(timestamp: number): void {
    // Kein Fokus oder Tab versteckt → sofort abbrechen, nächsten Frame NICHT anfordern
    if (!isWindowFocused || document.hidden) {
      animFrame = 0
      return
    }

    if (lastTimestamp === 0) lastTimestamp = timestamp
    const rawDelta = (timestamp - lastTimestamp) / 1000
    const delta = Math.min(rawDelta, 0.1)
    lastTimestamp = timestamp

    const gameStore = useGameStore()
    const hyperActive = gameStore.isHyperspaceActive
    if (hyperActive && !wasHyperspaceActive) hyperspaceElapsed = 0
    wasHyperspaceActive = hyperActive
    if (hyperActive) hyperspaceElapsed += delta

    const galaxyStore = useGalaxyStore()

    // ── Champion-Rettungs-Kameraschwenk ────────────────────────────────────
    if (galaxyStore.isRescueRotating) {
      if (prefersReducedMotion.value) {
        galaxyStore.endRescueRotation()
      } else {
        const elapsed = Date.now() - galaxyStore.rescueRotationStartTime
        const t = Math.min(elapsed / RESCUE_ROTATION_DURATION_MS, 1)
        // sin-Kurve: langsam starten, in der Mitte peak, wieder langsam enden
        const angularDelta =
          (RESCUE_ROTATION_TOTAL_RAD / RESCUE_ROTATION_DURATION_MS) *
          (delta * 1000) *
          Math.sin(t * Math.PI)
        const dir = galaxyStore.rescueRotationDirection
        for (const star of stars) star.angle += angularDelta * dir
        for (const d of dustPatches) d.angle += angularDelta * dir
        for (const c of starClusters) c.angle += angularDelta * dir
        if (t >= 1) galaxyStore.endRescueRotation()
      }
    }

    const pendingTrans = galaxyStore.pendingTransition

    if (pendingTrans && !wasPendingTransition) {
      if (prefersReducedMotion.value) {
        galaxyStore.commitAdvance()
      } else {
        galaxyTransPhase = 'warp'
        galaxyTransElapsed = 0
        galaxyTransDir = Math.random() * Math.PI * 2
        galaxyStore.setGalaxyTransitioning(true)
      }
    }
    wasPendingTransition = pendingTrans

    if (galaxyTransPhase !== 'idle') {
      galaxyTransElapsed += delta * 1000
      if (galaxyTransPhase === 'warp') {
        if (galaxyTransElapsed >= GALAXY_TRANS_WARP_MS) {
          galaxyStore.commitAdvance()
          galaxyTransPhase = 'decel'
          galaxyTransElapsed -= GALAXY_TRANS_WARP_MS
        }
      } else if (galaxyTransPhase === 'decel') {
        if (galaxyTransElapsed >= GALAXY_TRANS_DECEL_MS) {
          galaxyTransPhase = 'idle'
          galaxyTransElapsed = 0
          galaxyStore.setGalaxyTransitioning(false)
        }
      }
    }

    let speedMultiplier: number
    if (galaxyStore.isRescueRotating) {
      speedMultiplier = 0
    } else if (galaxyTransPhase === 'warp') {
      const t = Math.min(galaxyTransElapsed / GALAXY_TRANS_WARP_MS, 1)
      speedMultiplier = 1 + 44 * (t * t * t)
    } else if (galaxyTransPhase === 'decel') {
      const t = Math.min(galaxyTransElapsed / GALAXY_TRANS_DECEL_MS, 1)
      speedMultiplier = 1 + 44 * Math.pow(1 - t, 3.5)
    } else {
      speedMultiplier = hyperActive ? 1 + Math.min(hyperspaceElapsed / 2, 1) * 19 : 1
    }

    const w = starsContainer.value?.clientWidth ?? window.innerWidth
    const h = starsContainer.value?.clientHeight ?? window.innerHeight
    const ctx = starCanvas.value?.getContext('2d') ?? null

    if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    const cx = w / 2,
      cy = h / 2
    const maxDist = Math.hypot(cx, cy) + 20

    // ── Kosmischer Staub ────────────────────────────────────────────────────
    if (ctx) {
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      for (const d of dustPatches) {
        const dNorm = d.dist / maxDist
        const dSpeed = d.baseSpeed * dNorm * dNorm * WARP_SPEED_MAX * speedMultiplier
        if (galaxyTransPhase === 'warp') {
          const sx = cx + Math.cos(d.angle) * d.dist
          const sy = cy + Math.sin(d.angle) * d.dist
          const nx = sx + Math.cos(galaxyTransDir) * dSpeed * delta
          const ny = sy + Math.sin(galaxyTransDir) * dSpeed * delta
          d.dist = Math.hypot(nx - cx, ny - cy)
          d.angle = Math.atan2(ny - cy, nx - cx)
        } else {
          d.dist += dSpeed * delta
        }
        if (d.dist > maxDist) {
          d.angle = Math.random() * Math.PI * 2
          d.dist = maxDist * (0.02 + Math.random() * 0.06)
          d.baseSpeed = 0.1 + Math.random() * 0.08
        }
        const px = cx + Math.cos(d.angle) * d.dist
        const py = cy + Math.sin(d.angle) * d.dist
        const dScale = 0.3 + dNorm * 1.4
        const rx = d.rx * dScale
        const ry = d.ry * dScale
        const fadeEdge = dNorm > 0.85 ? 1 - (dNorm - 0.85) / 0.15 : 1
        const finalOpacity = d.opacity * Math.min(1, dNorm * 2.5) * fadeEdge
        const grad = ctx.createRadialGradient(px, py, 0, px, py, rx)
        grad.addColorStop(0, `rgba(${d.r},${d.g},${d.b},${finalOpacity.toFixed(3)})`)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(d.rotation)
        ctx.scale(1, ry / rx)
        ctx.translate(-px, -py)
        ctx.beginPath()
        ctx.arc(px, py, rx, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
        ctx.restore()
      }
      ctx.restore()
    }

    // ── Sternenhaufen ──────────────────────────────────────────────────────
    if (ctx) {
      for (const cluster of starClusters) {
        const cNorm = cluster.dist / maxDist
        const cSpeed = cluster.baseSpeed * cNorm * cNorm * WARP_SPEED_MAX * speedMultiplier
        if (galaxyTransPhase === 'warp') {
          const sx = cx + Math.cos(cluster.angle) * cluster.dist
          const sy = cy + Math.sin(cluster.angle) * cluster.dist
          const nx = sx + Math.cos(galaxyTransDir) * cSpeed * delta
          const ny = sy + Math.sin(galaxyTransDir) * cSpeed * delta
          cluster.dist = Math.hypot(nx - cx, ny - cy)
          cluster.angle = Math.atan2(ny - cy, nx - cx)
        } else {
          cluster.dist += cSpeed * delta
        }
        if (cluster.dist > maxDist) {
          cluster.angle = Math.random() * Math.PI * 2
          cluster.dist = maxDist * (0.02 + Math.random() * 0.06)
          cluster.baseSpeed = 0.56 + Math.random() * 0.32
        }
        const pcx = cx + Math.cos(cluster.angle) * cluster.dist
        const pcy = cy + Math.sin(cluster.angle) * cluster.dist
        cluster.twinklePhase += 0.5 * delta
        const distAlpha = Math.min(1, cNorm * 3)
        const fadeEdge = cNorm > 0.85 ? 1 - (cNorm - 0.85) / 0.15 : 1
        const baseAlpha = distAlpha * fadeEdge * (0.3 + 0.1 * Math.sin(cluster.twinklePhase))
        const spreadScale = 0.25 + cNorm * 1.6
        for (const s of cluster.stars) {
          const a = baseAlpha * s.brightness
          if (a < 0.02) continue
          const dotSize = s.brightness * spreadScale * 1.2
          ctx.beginPath()
          ctx.arc(pcx + s.dx * spreadScale, pcy + s.dy * spreadScale, dotSize, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${a.toFixed(3)})`
          ctx.fill()
        }
      }
    }

    // ── Sterne ─────────────────────────────────────────────────────────────
    for (const star of stars) {
      const norm = star.dist / maxDist
      let speed: number
      if (galaxyTransPhase === 'warp') {
        speed = star.baseSpeed * WARP_SPEED_MAX * speedMultiplier
        const sx = cx + Math.cos(star.angle) * star.dist
        const sy = cy + Math.sin(star.angle) * star.dist
        const nx = sx + Math.cos(galaxyTransDir) * speed * delta
        const ny = sy + Math.sin(galaxyTransDir) * speed * delta
        star.dist = Math.hypot(nx - cx, ny - cy)
        star.angle = Math.atan2(ny - cy, nx - cx)
      } else {
        speed = star.baseSpeed * norm * norm * WARP_SPEED_MAX * speedMultiplier
        star.dist += speed * delta
      }
      if (star.dist > maxDist) {
        if (galaxyTransPhase === 'warp') {
          star.angle = galaxyTransDir + Math.PI / 2 + Math.random() * Math.PI
          star.dist = maxDist * (0.05 + Math.random() * 0.88)
          star.baseSpeed = STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE
        } else if (galaxyTransPhase === 'decel') {
          star.angle = Math.random() * Math.PI * 2
          star.dist = maxDist * (0.25 + Math.random() * 0.65)
          star.baseSpeed = STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE
        } else {
          star.angle = Math.random() * Math.PI * 2
          star.dist = hyperActive
            ? maxDist * (0.02 + Math.random() * 0.08)
            : maxDist * (0.1 + Math.random() * 0.35)
          star.baseSpeed = STAR_BG_BASE_SPEED_MIN + Math.random() * STAR_BG_BASE_SPEED_RANGE
        }
      }
      const x = cx + Math.cos(star.angle) * star.dist
      const y = cy + Math.sin(star.angle) * star.dist
      const distAlpha = Math.min(1, norm * 4)
      star.twinklePhase += star.twinkleSpeed * delta
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase)
      const fadeEdge = norm > 0.88 ? 1 - (norm - 0.88) / 0.12 : 1
      let alpha: number
      if (hyperActive) alpha = Math.min(1, distAlpha * 1.5)
      else if (galaxyTransPhase === 'decel') alpha = Math.min(1, distAlpha * 1.8) * fadeEdge
      else alpha = distAlpha * (0.5 + 0.5 * twinkle) * fadeEdge
      if (ctx) {
        const isStreaking =
          (hyperActive || galaxyTransPhase === 'warp' || galaxyTransPhase === 'decel') &&
          speedMultiplier > 1.5
        const trailAngle = galaxyTransPhase === 'warp' ? galaxyTransDir : star.angle
        if (isStreaking) {
          const trailLength = speed * delta * 2.2
          ctx.beginPath()
          ctx.moveTo(x - Math.cos(trailAngle) * trailLength, y - Math.sin(trailAngle) * trailLength)
          ctx.lineTo(x, y)
          ctx.strokeStyle = `rgba(${star.r},${star.g},${star.b},${alpha})`
          ctx.lineWidth = 0.8 + speedMultiplier * 0.12
          ctx.lineCap = 'round'
          ctx.stroke()
        } else {
          const starSize = 0.8 + norm * norm * 5.0
          ctx.beginPath()
          ctx.arc(x, y, starSize, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${star.r},${star.g},${star.b},${alpha})`
          ctx.fill()
          ctx.beginPath()
          ctx.arc(x, y, starSize * 2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${star.r},${star.g},${star.b},${alpha * 0.12})`
          ctx.fill()
        }
      }
    }

    // ── Galaxy-SVG-Animation ───────────────────────────────────────────────
    for (let i = galaxies.length - 1; i >= 0; i--) {
      const g = galaxies[i]
      g.elapsed += delta * 1000
      const p = Math.min(g.elapsed / g.lifetime, 1)
      g.scale = 0.05 + (g.maxScale - 0.05) * (p * p)
      let opacity: number
      if (p < 0.15) opacity = p / 0.15
      else if (p < 0.75) opacity = 1
      else opacity = 1 - (p - 0.75) / 0.25
      if (hyperActive || galaxyTransPhase === 'warp') {
        const fadeTime = hyperActive ? hyperspaceElapsed : galaxyTransElapsed / 1000
        opacity *= Math.max(0, 1 - fadeTime * 3)
      }
      g.el.style.opacity = opacity.toFixed(2)
      g.el.style.transform = `translate(${g.x}px,${g.y}px) scale(${g.scale.toFixed(3)}) rotate(${g.rot}deg)`
      if (p >= 1) {
        if (starsContainer.value?.contains(g.el)) starsContainer.value.removeChild(g.el)
        galaxies.splice(i, 1)
      }
    }

    // ── Emission Nebula / Ion Cloud ────────────────────────────────────────
    for (let i = emissionNebulas.length - 1; i >= 0; i--) {
      const n = emissionNebulas[i]
      const nNorm = n.dist / maxDist
      const nSpeed = n.baseSpeed * nNorm * nNorm * WARP_SPEED_MAX * speedMultiplier
      if (galaxyTransPhase === 'warp') {
        const sx = cx + Math.cos(n.angle) * n.dist
        const sy = cy + Math.sin(n.angle) * n.dist
        const nx2 = sx + Math.cos(galaxyTransDir) * nSpeed * delta
        const ny2 = sy + Math.sin(galaxyTransDir) * nSpeed * delta
        n.dist = Math.hypot(nx2 - cx, ny2 - cy)
        n.angle = Math.atan2(ny2 - cy, nx2 - cx)
      } else {
        n.dist += nSpeed * delta
      }
      n.scale = 0.02 + (n.maxScale - 0.02) * nNorm
      const wx = cx + Math.cos(n.angle) * n.dist
      const wy = cy + Math.sin(n.angle) * n.dist
      const hw = n.size / 2
      const distAlpha = Math.min(1, nNorm * 3)
      const fadeEdge = nNorm > 0.85 ? 1 - (nNorm - 0.85) / 0.15 : 1
      let opacity = distAlpha * fadeEdge * 0.65
      if (hyperActive || galaxyTransPhase === 'warp') {
        const fadeTime = hyperActive ? hyperspaceElapsed : galaxyTransElapsed / 1000
        opacity *= Math.max(0, 1 - fadeTime * 2)
      }
      n.el.style.opacity = opacity.toFixed(3)
      n.el.style.transform = `translate(${wx.toFixed(1)}px,${wy.toFixed(1)}px) scale(${n.scale.toFixed(3)}) translate(${-hw}px,${-hw}px)`
      if (n.dist > maxDist) {
        if (starsContainer.value?.contains(n.el)) starsContainer.value.removeChild(n.el)
        emissionNebulas.splice(i, 1)
        if (!prefersReducedMotion.value)
          setTimeout(() => spawnEmissionNebula(), 200 + Math.random() * 1500)
      }
    }

    // Nächsten Frame anfordern
    animFrame = requestAnimationFrame(animateStars)
  }

  // ── Resize, Stars, Cleanup ────────────────────────────────────────────────
  function handleResize(): void {
    if (resizeTimeout) clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      const oldW = starCanvas.value?.width || window.innerWidth
      const oldH = starCanvas.value?.height || window.innerHeight
      const oldMaxDist = Math.hypot(oldW / 2, oldH / 2) + 20
      resizeCanvas()
      if (!starsContainer.value || stars.length === 0) return
      const w = starsContainer.value.clientWidth || window.innerWidth
      const h = starsContainer.value.clientHeight || window.innerHeight
      const newMaxDist = Math.hypot(w / 2, h / 2) + 20
      const scale = newMaxDist / oldMaxDist
      for (const star of stars) star.dist = star.dist * scale
    }, 150)
  }

  function createStars(): void {
    if (!starsContainer.value || prefersReducedMotion.value) return
    stars.length = 0
    resizeCanvas()
    initDust()
    initClusters()
    for (let i = 0; i < EMISSION_MAX_COUNT; i++) spawnEmissionNebula(true)
    for (let i = 0; i < STAR_COUNT; i++) spawnStar(true)
    lastTimestamp = 0
    if (isWindowFocused) startLoop()
  }

  function handleVisibilityChange(): void {
    if (document.hidden) {
      stopLoop()
      if (galaxySpawnTimeout) {
        clearTimeout(galaxySpawnTimeout)
        galaxySpawnTimeout = null
      }
      if (emissionSpawnTimeout) {
        clearTimeout(emissionSpawnTimeout)
        emissionSpawnTimeout = null
      }
    } else {
      if (!prefersReducedMotion.value && stars.length > 0 && isWindowFocused) {
        startLoop()
        scheduleNextGalaxy()
        scheduleNextEmission()
      }
    }
  }

  function cleanup(): void {
    stopLoop()
    stopFocusPolling()
    if (galaxySpawnTimeout) {
      clearTimeout(galaxySpawnTimeout)
      galaxySpawnTimeout = null
    }
    if (emissionSpawnTimeout) {
      clearTimeout(emissionSpawnTimeout)
      emissionSpawnTimeout = null
    }
    timeouts.forEach((id) => clearTimeout(id))
    timeouts.length = 0
    stars.length = 0
    if (starsContainer.value) {
      for (const galaxy of galaxies) {
        if (starsContainer.value.contains(galaxy.el)) starsContainer.value.removeChild(galaxy.el)
      }
      for (const nebula of emissionNebulas) {
        if (starsContainer.value.contains(nebula.el)) starsContainer.value.removeChild(nebula.el)
      }
    }
    galaxies.length = 0
    emissionNebulas.length = 0
    dustPatches.length = 0
    starClusters.length = 0
    window.removeEventListener('resize', handleResize)
    removeFocusListener?.()
    if (resizeTimeout) clearTimeout(resizeTimeout)
  }

  onMounted(async () => {
    checkReducedMotion()
    if (!prefersReducedMotion.value) {
      await nextTick()
      isWindowFocused = document.hasFocus()

      const { onFocusChange } = useWindowFocus()
      removeFocusListener = onFocusChange((focused) => {
        if (focused) onWindowFocus()
        else onWindowBlur()
      })

      // Polling-Fallback: zuverlässige Fokus-Erkennung für Chrome Multi-Monitor
      startFocusPolling()

      setTimeout(createStars, 100)
      window.addEventListener('resize', handleResize)
      scheduleNextGalaxy()
      scheduleNextEmission()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    cleanup()
  })

  return { starsContainer, starCanvas, prefersReducedMotion }
}
