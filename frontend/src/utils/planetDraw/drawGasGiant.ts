import { GAS_GIANT_PALETTES } from './types'
import { svgEl, setAttrs, addGradStop, addClip } from './svgHelpers'

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

  // Curved shear highlights along band boundaries — bands read as wrapping
  // around the sphere instead of flat stripes
  for (const [oy, bow, light, op] of [
    [-0.5, -0.07, true, 0.3],
    [-0.27, -0.05, false, 0.35],
    [-0.05, -0.03, true, 0.28],
    [0.17, 0.04, false, 0.32],
    [0.36, 0.06, true, 0.26],
    [0.54, 0.08, false, 0.28],
  ] as [number, number, boolean, number][]) {
    const shear = svgEl('path')
    setAttrs(shear, {
      d: `M${cx - r},${cy + r * oy} Q${cx},${cy + r * (oy + bow)} ${cx + r},${cy + r * oy}`,
      fill: 'none',
      stroke: light ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
      'stroke-width': r * 0.028,
      opacity: op,
    })
    bandG.appendChild(shear)
  }

  // Small white oval storms drifting between bands
  for (const [ox, oy, rx, ry, op] of [
    [-0.35, -0.32, 0.055, 0.03, 0.6],
    [0.15, 0.35, 0.045, 0.025, 0.55],
    [-0.2, 0.52, 0.04, 0.022, 0.5],
  ] as [number, number, number, number, number][]) {
    const oval = svgEl('ellipse')
    setAttrs(oval, {
      cx: cx + r * ox,
      cy: cy + r * oy,
      rx: r * rx,
      ry: r * ry,
      fill: 'rgba(255,252,240,0.75)',
      opacity: op,
    })
    bandG.appendChild(oval)
  }

  // Polar hoods — darker haze caps at both poles
  for (const oy of [-0.8, 0.8]) {
    const hood = svgEl('ellipse')
    setAttrs(hood, {
      cx,
      cy: cy + r * oy,
      rx: r * 0.6,
      ry: r * 0.22,
      fill: 'rgba(0,0,0,0.28)',
    })
    bandG.appendChild(hood)
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
