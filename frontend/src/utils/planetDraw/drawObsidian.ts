import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip } from './svgHelpers'

/**
 * Obsidian – volcanic-glass world: mirror-black surface with hard specular
 * streaks and thin molten-gold veins tracing the flow lines
 */
export function drawObsidian(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `obg-${id}`, cx: '40%', cy: '34%', r: '70%' })
  addGradStop(grad, '0%', '#4a4a55')
  addGradStop(grad, '30%', '#2a2a32')
  addGradStop(grad, '65%', '#16161c')
  addGradStop(grad, '100%', '#040406')
  defs.appendChild(grad)

  addLimbGrad(defs, `oblimb-${id}`, 0.85)
  addClip(defs, `obc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#obg-${id})` })
  svg.appendChild(base)

  const detailG = svgEl('g')
  detailG.setAttribute('clip-path', `url(#obc-${id})`)

  // Glassy flow bands — barely-visible tonal sweeps in the glass
  for (const [d, op] of [
    [`M${cx - r * 0.7},${cy - r * 0.3} Q${cx},${cy - r * 0.5} ${cx + r * 0.7},${cy - r * 0.25}`, 0.5],
    [`M${cx - r * 0.75},${cy + r * 0.1} Q${cx - r * 0.1},${cy - r * 0.08} ${cx + r * 0.75},${cy + r * 0.15}`, 0.4],
    [`M${cx - r * 0.6},${cy + r * 0.45} Q${cx + r * 0.05},${cy + r * 0.3} ${cx + r * 0.6},${cy + r * 0.5}`, 0.35],
  ] as [string, number][]) {
    const flow = svgEl('path')
    setAttrs(flow, {
      d,
      fill: 'none',
      stroke: 'rgba(90,90,110,0.25)',
      'stroke-width': r * 0.09,
      'stroke-linecap': 'round',
      opacity: op,
    })
    detailG.appendChild(flow)
  }

  // Molten gold veins — hairline cracks where the core shines through
  const veins: [string, number][] = [
    [
      `M${cx - r * 0.4},${cy + r * 0.05} L${cx - r * 0.15},${cy + r * 0.18} L${cx + r * 0.05},${cy + r * 0.12} L${cx + r * 0.3},${cy + r * 0.28}`,
      0.9,
    ],
    [
      `M${cx - r * 0.15},${cy + r * 0.18} L${cx - r * 0.08},${cy + r * 0.42}`,
      0.7,
    ],
    [
      `M${cx + r * 0.15},${cy - r * 0.3} L${cx + r * 0.32},${cy - r * 0.18} L${cx + r * 0.5},${cy - r * 0.25}`,
      0.65,
    ],
    [
      `M${cx - r * 0.55},${cy - r * 0.25} L${cx - r * 0.4},${cy - r * 0.12} L${cx - r * 0.4},${cy + r * 0.05}`,
      0.6,
    ],
  ]
  for (const [d, op] of veins) {
    const glow = svgEl('path')
    setAttrs(glow, {
      d,
      fill: 'none',
      stroke: 'rgba(255,170,50,0.4)',
      'stroke-width': r * 0.03,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: op * 0.6,
    })
    detailG.appendChild(glow)
    const vein = svgEl('path')
    setAttrs(vein, {
      d,
      fill: 'none',
      stroke: 'rgba(255,215,110,0.85)',
      'stroke-width': r * 0.009,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: op,
    })
    detailG.appendChild(vein)
  }

  // Hard-edged specular streaks — polished glass catching the sun
  const streak1 = svgEl('path')
  setAttrs(streak1, {
    d: `M${cx - r * 0.45},${cy - r * 0.38} Q${cx - r * 0.2},${cy - r * 0.52} ${cx + r * 0.05},${cy - r * 0.42}`,
    fill: 'none',
    stroke: 'rgba(235,240,255,0.55)',
    'stroke-width': r * 0.035,
    'stroke-linecap': 'round',
  })
  detailG.appendChild(streak1)
  const streak2 = svgEl('path')
  setAttrs(streak2, {
    d: `M${cx - r * 0.5},${cy - r * 0.25} Q${cx - r * 0.32},${cy - r * 0.35} ${cx - r * 0.14},${cy - r * 0.3}`,
    fill: 'none',
    stroke: 'rgba(210,220,240,0.35)',
    'stroke-width': r * 0.02,
    'stroke-linecap': 'round',
  })
  detailG.appendChild(streak2)

  svg.appendChild(detailG)

  // Thin steel rim — glass edge catching light all around
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.94,
    fill: 'none',
    stroke: 'rgba(180,190,220,0.16)',
    'stroke-width': r * 0.05,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#oblimb-${id})` })
  svg.appendChild(limb)

  // Tight bright glint — polished surface, small and intense
  const glint = svgEl('ellipse')
  setAttrs(glint, {
    cx: cx - r * 0.24,
    cy: cy - r * 0.3,
    rx: r * 0.07,
    ry: r * 0.045,
    fill: 'rgba(255,255,255,0.5)',
  })
  svg.appendChild(glint)
}
