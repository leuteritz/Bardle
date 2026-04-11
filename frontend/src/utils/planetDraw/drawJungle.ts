import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip, drawSpecular } from './svgHelpers'

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
