import {
  GALAXY_TYPE_CONFIGS,
  GALAXY_PALETTES_BY_TYPE,
  type GalaxyPalette,
  type GalaxyType,
  type GalaxyTypeConfig,
} from './types'

// ─── SVG Helpers ─────────────────────────────────────────────────────────────

export const NS = 'http://www.w3.org/2000/svg'
export const galaxyIdCounter = 0

export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(NS, tag)
}

export function addStop(grad: SVGElement, offset: string, color: string, opacity: number): void {
  const stop = svgEl('stop')
  stop.setAttribute('offset', offset)
  stop.setAttribute('stop-color', color)
  stop.setAttribute('stop-opacity', String(opacity))
  grad.appendChild(stop)
}

export function makeBlurFilter(id: string, stdDev: number): SVGFilterElement {
  const filter = svgEl('filter')
  filter.id = id
  const blur = svgEl('feGaussianBlur')
  blur.setAttribute('stdDeviation', String(stdDev))
  filter.appendChild(blur)
  return filter
}

export function pickGalaxyTypeConfig(): GalaxyTypeConfig {
  const total = GALAXY_TYPE_CONFIGS.reduce((s, c) => s + c.weight, 0)
  let rand = Math.random() * total
  for (const config of GALAXY_TYPE_CONFIGS) {
    rand -= config.weight
    if (rand <= 0) return config
  }
  return GALAXY_TYPE_CONFIGS[0]
}

export { GALAXY_PALETTES_BY_TYPE }

// ─── Galaxy Draw Functions ────────────────────────────────────────────────────

export function drawSpiral(
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

export function drawBarredSpiral(
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

export function drawElliptical(
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

  // Dust lane (40% probability)
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

export function drawGlobular(
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
    const dotColor = roll < 0.7 ? '#ffffff' : roll < 0.85 ? palette.center : palette.mid

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

export function drawIrregular(
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

  // Irregular ellipse blob patches
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

export function drawRing(
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
    const ring = svgEl('circle')
    ring.setAttribute('cx', String(cx))
    ring.setAttribute('cy', String(cy))
    ring.setAttribute('r', String(r * 0.88))
    ring.setAttribute('fill', `url(#${id}r)`)
    ring.setAttribute('filter', `url(#${id}f)`)
    svg.appendChild(ring)

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

export function drawLenticular(
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

  // Outer lens halo
  const halo = svgEl('ellipse')
  halo.setAttribute('cx', String(cx))
  halo.setAttribute('cy', String(cy))
  halo.setAttribute('rx', String(r))
  halo.setAttribute('ry', String(r * 0.22))
  halo.setAttribute('fill', `url(#${id}h)`)
  svg.appendChild(halo)

  // Main disk body (softly blurred)
  const body = svgEl('ellipse')
  body.setAttribute('cx', String(cx))
  body.setAttribute('cy', String(cy))
  body.setAttribute('rx', String(r * 0.75))
  body.setAttribute('ry', String(r * 0.17))
  body.setAttribute('fill', `url(#${id}g)`)
  body.setAttribute('filter', `url(#${id}f)`)
  svg.appendChild(body)

  // Subtle dust ring
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

  // Bright center
  const center = svgEl('circle')
  center.setAttribute('cx', String(cx))
  center.setAttribute('cy', String(cy))
  center.setAttribute('r', String(r * 0.1))
  center.setAttribute('fill', '#ffffff')
  center.setAttribute('opacity', '0.9')
  svg.appendChild(center)
}

export function drawStarburst(
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

  // Bloom halo
  const bloom = svgEl('circle')
  bloom.setAttribute('cx', String(cx))
  bloom.setAttribute('cy', String(cy))
  bloom.setAttribute('r', String(r))
  bloom.setAttribute('fill', `url(#${id}b)`)
  svg.appendChild(bloom)

  // Radiant spike lines (6–8)
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

  // Core glow
  const core = svgEl('circle')
  core.setAttribute('cx', String(cx))
  core.setAttribute('cy', String(cy))
  core.setAttribute('r', String(r * 0.22))
  core.setAttribute('fill', `url(#${id}c)`)
  svg.appendChild(core)

  // Bright point
  const point = svgEl('circle')
  point.setAttribute('cx', String(cx))
  point.setAttribute('cy', String(cy))
  point.setAttribute('r', String(r * 0.07))
  point.setAttribute('fill', '#ffffff')
  point.setAttribute('opacity', '1')
  svg.appendChild(point)
}

export type { GalaxyType }
