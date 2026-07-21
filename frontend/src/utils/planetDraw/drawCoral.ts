import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip, drawSpecular } from './svgHelpers'

/**
 * Coral – tropical shallows world: turquoise seas, pink-orange reef atolls
 * with lagoon centers, white foam arcs and sandbars
 */
export function drawCoral(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `crg-${id}`, cx: '42%', cy: '36%', r: '68%' })
  addGradStop(grad, '0%', '#a0f0e8')
  addGradStop(grad, '32%', '#40c8c0')
  addGradStop(grad, '65%', '#188898')
  addGradStop(grad, '100%', '#043045')
  defs.appendChild(grad)

  addLimbGrad(defs, `crlimb-${id}`, 0.62)
  addClip(defs, `crc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#crg-${id})` })
  svg.appendChild(base)

  const reefG = svgEl('g')
  reefG.setAttribute('clip-path', `url(#crc-${id})`)

  // Deep-water channels for tonal variation
  for (const [ox, oy, rx, ry, rot, op] of [
    [0.1, -0.35, 0.4, 0.12, -15, 0.45],
    [-0.25, 0.4, 0.35, 0.11, 8, 0.4],
    [0.4, 0.15, 0.2, 0.09, 30, 0.35],
  ] as [number, number, number, number, number, number][]) {
    const dcx = cx + r * ox
    const dcy = cy + r * oy
    const deep = svgEl('ellipse')
    setAttrs(deep, {
      cx: dcx,
      cy: dcy,
      rx: r * rx,
      ry: r * ry,
      fill: 'rgba(8,60,90,0.5)',
      opacity: op,
      transform: `rotate(${rot} ${dcx} ${dcy})`,
    })
    reefG.appendChild(deep)
  }

  // Reef atolls — coral ring with a pale lagoon center
  const atolls: [number, number, number, string, number][] = [
    [-0.25, -0.08, 0.16, '#ff8a70', 0.9],
    [0.22, 0.25, 0.13, '#ffa060', 0.85],
    [0.35, -0.28, 0.1, '#ff7a88', 0.8],
    [-0.42, 0.28, 0.09, '#ffb070', 0.75],
    [0.02, 0.5, 0.08, '#ff9078', 0.7],
  ]
  for (const [ox, oy, ar, coralColor, op] of atolls) {
    const ax = cx + r * ox
    const ay = cy + r * oy
    const ring = svgEl('circle')
    setAttrs(ring, {
      cx: ax,
      cy: ay,
      r: r * ar,
      fill: 'none',
      stroke: coralColor,
      'stroke-width': r * ar * 0.45,
      opacity: op,
    })
    reefG.appendChild(ring)
    const lagoon = svgEl('circle')
    setAttrs(lagoon, {
      cx: ax,
      cy: ay,
      r: r * ar * 0.62,
      fill: 'rgba(170,240,230,0.75)',
      opacity: op,
    })
    reefG.appendChild(lagoon)
    // Foam edge on the windward side
    const foam = svgEl('path')
    setAttrs(foam, {
      d: `M${ax - r * ar * 1.15},${ay} A${r * ar * 1.15},${r * ar * 1.15} 0 0 1 ${ax},${ay - r * ar * 1.15}`,
      fill: 'none',
      stroke: 'rgba(255,255,255,0.6)',
      'stroke-width': r * 0.014,
      'stroke-linecap': 'round',
      opacity: op * 0.8,
    })
    reefG.appendChild(foam)
  }

  // Sandbars — pale crescents between the atolls
  for (const [ox, oy, rx, ry, rot, op] of [
    [-0.05, 0.15, 0.12, 0.04, -20, 0.6],
    [0.45, 0.02, 0.09, 0.03, 40, 0.5],
    [-0.5, -0.15, 0.08, 0.03, -35, 0.45],
  ] as [number, number, number, number, number, number][]) {
    const sx = cx + r * ox
    const sy = cy + r * oy
    const sand = svgEl('ellipse')
    setAttrs(sand, {
      cx: sx,
      cy: sy,
      rx: r * rx,
      ry: r * ry,
      fill: 'rgba(255,240,200,0.7)',
      opacity: op,
      transform: `rotate(${rot} ${sx} ${sy})`,
    })
    reefG.appendChild(sand)
  }

  // High cirrus wisps
  for (const [ox, oy, rx, ry, rot, op] of [
    [-0.15, -0.52, 0.3, 0.06, -10, 0.5],
    [0.3, 0.45, 0.24, 0.05, 14, 0.4],
  ] as [number, number, number, number, number, number][]) {
    const wx = cx + r * ox
    const wy = cy + r * oy
    const wisp = svgEl('ellipse')
    setAttrs(wisp, {
      cx: wx,
      cy: wy,
      rx: r * rx,
      ry: r * ry,
      fill: 'rgba(250,255,255,0.5)',
      opacity: op,
      transform: `rotate(${rot} ${wx} ${wy})`,
    })
    reefG.appendChild(wisp)
  }

  svg.appendChild(reefG)

  // Bright turquoise atmosphere rim
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(90,230,220,0.28)',
    'stroke-width': r * 0.1,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#crlimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(220,255,250,')
}
