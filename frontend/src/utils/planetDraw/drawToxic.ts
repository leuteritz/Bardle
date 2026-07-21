import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip, drawSpecular } from './svgHelpers'

/**
 * Toxic – acid sludge world: sulfur-green swirls, bubbling pools, hazy smog band
 */
export function drawToxic(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `tg-${id}`, cx: '42%', cy: '36%', r: '68%' })
  addGradStop(grad, '0%', '#d8f070')
  addGradStop(grad, '30%', '#9cc832')
  addGradStop(grad, '62%', '#587c14')
  addGradStop(grad, '100%', '#1c2c06')
  defs.appendChild(grad)

  addLimbGrad(defs, `tlimb-${id}`, 0.7)
  addClip(defs, `tc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#tg-${id})` })
  svg.appendChild(base)

  const detailG = svgEl('g')
  detailG.setAttribute('clip-path', `url(#tc-${id})`)

  // Swirling sludge currents — curved strokes in darker and brighter acid tones
  const swirls: [string, string, number, number][] = [
    [
      `M${cx - r * 0.8},${cy - r * 0.2} Q${cx - r * 0.2},${cy - r * 0.45} ${cx + r * 0.5},${cy - r * 0.15}`,
      'rgba(40,60,10,0.5)',
      r * 0.09,
      0.7,
    ],
    [
      `M${cx - r * 0.7},${cy + r * 0.15} Q${cx},${cy - r * 0.05} ${cx + r * 0.75},${cy + 0.25 * r}`,
      'rgba(200,240,90,0.45)',
      r * 0.06,
      0.6,
    ],
    [
      `M${cx - r * 0.55},${cy + r * 0.45} Q${cx + r * 0.1},${cy + r * 0.25} ${cx + r * 0.6},${cy + r * 0.5}`,
      'rgba(50,75,12,0.45)',
      r * 0.07,
      0.6,
    ],
    [
      `M${cx - r * 0.4},${cy - r * 0.55} Q${cx + r * 0.15},${cy - r * 0.7} ${cx + r * 0.55},${cy - r * 0.45}`,
      'rgba(215,245,110,0.35)',
      r * 0.05,
      0.5,
    ],
  ]
  for (const [d, stroke, sw, op] of swirls) {
    const path = svgEl('path')
    setAttrs(path, {
      d,
      fill: 'none',
      stroke,
      'stroke-width': sw,
      'stroke-linecap': 'round',
      opacity: op,
    })
    detailG.appendChild(path)
  }

  // Dark sludge pools
  for (const [ox, oy, rx, ry, op] of [
    [-0.3, 0.28, 0.2, 0.13, 0.55],
    [0.35, -0.05, 0.16, 0.11, 0.5],
    [0.05, 0.55, 0.14, 0.09, 0.45],
  ] as [number, number, number, number, number][]) {
    const pool = svgEl('ellipse')
    setAttrs(pool, {
      cx: cx + r * ox,
      cy: cy + r * oy,
      rx: r * rx,
      ry: r * ry,
      fill: 'rgba(30,45,8,0.6)',
      opacity: op,
    })
    detailG.appendChild(pool)
  }

  // Bubble clusters — bright rim, translucent body
  for (const [ox, oy, br, op] of [
    [-0.28, 0.24, 0.05, 0.85],
    [-0.18, 0.32, 0.035, 0.7],
    [-0.36, 0.34, 0.028, 0.6],
    [0.38, -0.08, 0.04, 0.75],
    [0.3, 0.0, 0.028, 0.6],
    [0.08, 0.52, 0.032, 0.65],
    [0.16, 0.58, 0.022, 0.5],
  ] as [number, number, number, number][]) {
    const bx = cx + r * ox
    const by = cy + r * oy
    const bubble = svgEl('circle')
    setAttrs(bubble, {
      cx: bx,
      cy: by,
      r: r * br,
      fill: 'rgba(220,255,140,0.25)',
      stroke: 'rgba(235,255,170,0.7)',
      'stroke-width': r * 0.008,
      opacity: op,
    })
    detailG.appendChild(bubble)
    const glint = svgEl('circle')
    setAttrs(glint, {
      cx: bx - r * br * 0.35,
      cy: by - r * br * 0.35,
      r: r * br * 0.3,
      fill: 'rgba(255,255,220,0.8)',
      opacity: op * 0.8,
    })
    detailG.appendChild(glint)
  }

  // Smog band drifting across the equator
  const smog = svgEl('ellipse')
  setAttrs(smog, {
    cx: cx + r * 0.1,
    cy: cy - r * 0.1,
    rx: r * 0.85,
    ry: r * 0.18,
    fill: 'rgba(190,220,110,0.16)',
  })
  detailG.appendChild(smog)

  svg.appendChild(detailG)

  // Sickly haze rim
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.97,
    fill: 'none',
    stroke: 'rgba(180,230,70,0.28)',
    'stroke-width': r * 0.1,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#tlimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(240,255,200,')
}
