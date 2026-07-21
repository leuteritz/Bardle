import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip, drawSpecular } from './svgHelpers'

/**
 * Bloom – pastel spring world: rose meadows, mint seas, drifting petal streams,
 * soft cream cloud wisps
 */
export function drawBloom(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `bg-${id}`, cx: '42%', cy: '36%', r: '68%' })
  addGradStop(grad, '0%', '#ffe0ec')
  addGradStop(grad, '35%', '#f0a8c4')
  addGradStop(grad, '68%', '#b86890')
  addGradStop(grad, '100%', '#4a1c38')
  defs.appendChild(grad)

  addLimbGrad(defs, `blimb-${id}`, 0.6)
  addClip(defs, `bc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#bg-${id})` })
  svg.appendChild(base)

  const detailG = svgEl('g')
  detailG.setAttribute('clip-path', `url(#bc-${id})`)

  // Mint lagoon seas breaking up the rose surface
  for (const [ox, oy, rx, ry, rot, op] of [
    [-0.25, 0.18, 0.3, 0.16, -12, 0.75],
    [0.3, -0.2, 0.22, 0.13, 18, 0.7],
    [0.15, 0.42, 0.18, 0.1, -6, 0.65],
    [-0.45, -0.25, 0.15, 0.09, 25, 0.6],
  ] as [number, number, number, number, number, number][]) {
    const sea = svgEl('ellipse')
    const scx = cx + r * ox
    const scy = cy + r * oy
    setAttrs(sea, {
      cx: scx,
      cy: scy,
      rx: r * rx,
      ry: r * ry,
      fill: '#a8e8d0',
      opacity: op,
      transform: `rotate(${rot} ${scx} ${scy})`,
    })
    detailG.appendChild(sea)
    // Bright shoreline rim on the sunlit side
    const shore = svgEl('ellipse')
    setAttrs(shore, {
      cx: scx - r * 0.01,
      cy: scy - r * 0.01,
      rx: r * rx,
      ry: r * ry,
      fill: 'none',
      stroke: 'rgba(255,250,240,0.5)',
      'stroke-width': r * 0.012,
      opacity: op * 0.8,
      transform: `rotate(${rot} ${scx} ${scy})`,
    })
    detailG.appendChild(shore)
  }

  // Deep rose meadow patches for tonal depth
  for (const [ox, oy, rx, ry, op] of [
    [0.05, -0.05, 0.24, 0.14, 0.35],
    [-0.35, 0.42, 0.18, 0.1, 0.3],
    [0.42, 0.15, 0.14, 0.09, 0.3],
  ] as [number, number, number, number, number][]) {
    const patch = svgEl('ellipse')
    setAttrs(patch, {
      cx: cx + r * ox,
      cy: cy + r * oy,
      rx: r * rx,
      ry: r * ry,
      fill: 'rgba(180,70,120,0.5)',
      opacity: op,
    })
    detailG.appendChild(patch)
  }

  // Petal streams — curved drifts of tiny bright petals riding the wind
  const streams: [string, number][] = [
    [`M${cx - r * 0.6},${cy - r * 0.1} Q${cx - r * 0.1},${cy - r * 0.35} ${cx + r * 0.5},${cy - r * 0.18}`, 0.9],
    [`M${cx - r * 0.4},${cy + r * 0.35} Q${cx + r * 0.1},${cy + r * 0.15} ${cx + r * 0.6},${cy + r * 0.3}`, 0.75],
  ]
  for (const [d, op] of streams) {
    const wind = svgEl('path')
    setAttrs(wind, {
      d,
      fill: 'none',
      stroke: 'rgba(255,235,245,0.4)',
      'stroke-width': r * 0.03,
      'stroke-linecap': 'round',
      opacity: op * 0.6,
    })
    detailG.appendChild(wind)
  }
  for (const [ox, oy, s, rot, op] of [
    [-0.42, -0.2, 0.028, 15, 0.85],
    [-0.2, -0.3, 0.022, -30, 0.75],
    [0.05, -0.32, 0.026, 45, 0.8],
    [0.3, -0.24, 0.02, -10, 0.7],
    [-0.2, 0.26, 0.024, 30, 0.75],
    [0.1, 0.2, 0.02, -45, 0.65],
    [0.38, 0.26, 0.022, 20, 0.7],
  ] as [number, number, number, number, number][]) {
    const px = cx + r * ox
    const py = cy + r * oy
    const petal = svgEl('ellipse')
    setAttrs(petal, {
      cx: px,
      cy: py,
      rx: r * s,
      ry: r * s * 0.5,
      fill: 'rgba(255,245,250,0.9)',
      opacity: op,
      transform: `rotate(${rot} ${px} ${py})`,
    })
    detailG.appendChild(petal)
  }

  // Cream cloud wisps
  for (const [ox, oy, rx, ry, rot, op] of [
    [-0.1, -0.5, 0.3, 0.08, -14, 0.5],
    [0.25, 0.5, 0.26, 0.07, 10, 0.45],
  ] as [number, number, number, number, number, number][]) {
    const wcx = cx + r * ox
    const wcy = cy + r * oy
    const wisp = svgEl('ellipse')
    setAttrs(wisp, {
      cx: wcx,
      cy: wcy,
      rx: r * rx,
      ry: r * ry,
      fill: 'rgba(255,250,245,0.55)',
      opacity: op,
      transform: `rotate(${rot} ${wcx} ${wcy})`,
    })
    detailG.appendChild(wisp)
  }

  svg.appendChild(detailG)

  // Warm rose atmosphere rim
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(255,170,200,0.30)',
    'stroke-width': r * 0.09,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#blimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(255,245,250,')
}
