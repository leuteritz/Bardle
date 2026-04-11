import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip, drawSpecular } from './svgHelpers'

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
