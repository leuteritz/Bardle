import { svgEl, addStop, makeBlurFilter } from './galaxyRenderers'
import type { EmissionPalette } from './types'

// ─── Emission Nebula Draw Functions ──────────────────────────────────────────

export function drawEmissionNebula(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  palette: EmissionPalette,
): void {
  const defs = svgEl('defs')

  // Outer glow (large, very soft)
  const outerGrad = svgEl('radialGradient')
  outerGrad.id = `${id}o`
  outerGrad.setAttribute('cx', '50%')
  outerGrad.setAttribute('cy', '50%')
  outerGrad.setAttribute('r', '50%')
  addStop(outerGrad, '0%', palette.glow, 0.25)
  addStop(outerGrad, '50%', palette.outer, 0.12)
  addStop(outerGrad, '100%', palette.outer, 0)

  // Mid cloud layer
  const midGrad = svgEl('radialGradient')
  midGrad.id = `${id}m`
  midGrad.setAttribute('cx', '48%')
  midGrad.setAttribute('cy', '52%')
  midGrad.setAttribute('r', '50%')
  addStop(midGrad, '0%', palette.mid, 0.55)
  addStop(midGrad, '40%', palette.mid, 0.3)
  addStop(midGrad, '100%', palette.outer, 0)

  // Core glow
  const coreGrad = svgEl('radialGradient')
  coreGrad.id = `${id}c`
  coreGrad.setAttribute('cx', '50%')
  coreGrad.setAttribute('cy', '50%')
  coreGrad.setAttribute('r', '50%')
  addStop(coreGrad, '0%', '#ffffff', 0.9)
  addStop(coreGrad, '20%', palette.core, 0.75)
  addStop(coreGrad, '60%', palette.mid, 0.35)
  addStop(coreGrad, '100%', palette.outer, 0)

  // Soft blur filter for glow
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

  // Outer halo (large ellipse, random tilt for organic feel)
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

  // Mid cloud (offset slightly for irregular feel)
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

  // Bright core
  const core = svgEl('circle')
  core.setAttribute('cx', String(cx))
  core.setAttribute('cy', String(cy))
  core.setAttribute('r', String(r * 0.3))
  core.setAttribute('fill', `url(#${id}c)`)
  svg.appendChild(core)
}

export function drawIonCloud(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  palette: EmissionPalette,
): void {
  const defs = svgEl('defs')

  // Primary diffuse layer
  const g1 = svgEl('radialGradient')
  g1.id = `${id}a`
  g1.setAttribute('cx', '50%')
  g1.setAttribute('cy', '50%')
  g1.setAttribute('r', '50%')
  addStop(g1, '0%', palette.glow, 0.3)
  addStop(g1, '45%', palette.mid, 0.15)
  addStop(g1, '100%', palette.outer, 0)

  // Secondary layer, offset for wispy feel
  const g2 = svgEl('radialGradient')
  g2.id = `${id}b`
  g2.setAttribute('cx', '38%')
  g2.setAttribute('cy', '60%')
  g2.setAttribute('r', '50%')
  addStop(g2, '0%', palette.core, 0.22)
  addStop(g2, '60%', palette.mid, 0.08)
  addStop(g2, '100%', palette.outer, 0)

  // Very soft outer blur
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

  // Main blob (large, rotated ellipse)
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

  // Secondary wispy lobe
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

export { makeBlurFilter }
