import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip } from './svgHelpers'

/**
 * Neon – night-side tech world: dark slate sphere webbed with glowing
 * cyan circuit lines, amber city clusters and an orange terminator glow
 */
export function drawNeon(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `ng-${id}`, cx: '42%', cy: '36%', r: '68%' })
  addGradStop(grad, '0%', '#2a3240')
  addGradStop(grad, '40%', '#1a2028')
  addGradStop(grad, '75%', '#101318')
  addGradStop(grad, '100%', '#04060a')
  defs.appendChild(grad)

  // Warm dusk glow along the sunset edge
  const dusk = svgEl('radialGradient')
  setAttrs(dusk, { id: `nd-${id}`, cx: '18%', cy: '30%', r: '55%' })
  addGradStop(dusk, '0%', 'rgba(255,140,60,0.28)')
  addGradStop(dusk, '55%', 'rgba(220,100,40,0.10)')
  addGradStop(dusk, '100%', 'rgba(160,60,20,0)')
  defs.appendChild(dusk)

  addLimbGrad(defs, `nlimb-${id}`, 0.8)
  addClip(defs, `nc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#ng-${id})` })
  svg.appendChild(base)

  const duskC = svgEl('circle')
  setAttrs(duskC, { cx, cy, r: r * 0.92, fill: `url(#nd-${id})` })
  svg.appendChild(duskC)

  const gridG = svgEl('g')
  gridG.setAttribute('clip-path', `url(#nc-${id})`)

  // Circuit arteries — glowing cyan trunk lines linking the city hubs
  const arteries: [string, number][] = [
    [
      `M${cx - r * 0.55},${cy - r * 0.15} L${cx - r * 0.2},${cy - r * 0.05} L${cx + r * 0.1},${cy - r * 0.22} L${cx + r * 0.45},${cy - r * 0.1}`,
      0.85,
    ],
    [
      `M${cx - r * 0.2},${cy - r * 0.05} L${cx - r * 0.1},${cy + r * 0.28} L${cx + r * 0.25},${cy + r * 0.38}`,
      0.75,
    ],
    [
      `M${cx + r * 0.1},${cy - r * 0.22} L${cx + r * 0.3},${cy + r * 0.1} L${cx + r * 0.25},${cy + r * 0.38}`,
      0.7,
    ],
    [
      `M${cx - r * 0.55},${cy - r * 0.15} L${cx - r * 0.45},${cy + r * 0.2} L${cx - r * 0.1},${cy + r * 0.28}`,
      0.65,
    ],
    [`M${cx + r * 0.45},${cy - r * 0.1} L${cx + r * 0.58},${cy + r * 0.18}`, 0.55],
    [`M${cx - r * 0.2},${cy - r * 0.05} L${cx - r * 0.28},${cy - r * 0.42}`, 0.6],
  ]
  for (const [d, op] of arteries) {
    const glow = svgEl('path')
    setAttrs(glow, {
      d,
      fill: 'none',
      stroke: 'rgba(60,220,255,0.35)',
      'stroke-width': r * 0.035,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: op * 0.6,
    })
    gridG.appendChild(glow)
    const line = svgEl('path')
    setAttrs(line, {
      d,
      fill: 'none',
      stroke: 'rgba(140,240,255,0.8)',
      'stroke-width': r * 0.01,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: op,
    })
    gridG.appendChild(line)
  }

  // City hubs — amber cores with a soft halo, like megacities from orbit
  for (const [ox, oy, hr, op] of [
    [-0.2, -0.05, 0.075, 0.95],
    [0.1, -0.22, 0.06, 0.9],
    [0.25, 0.38, 0.065, 0.85],
    [-0.45, 0.2, 0.05, 0.8],
    [0.45, -0.1, 0.045, 0.8],
    [-0.28, -0.42, 0.04, 0.7],
    [0.58, 0.18, 0.035, 0.65],
  ] as [number, number, number, number][]) {
    const hx = cx + r * ox
    const hy = cy + r * oy
    const halo = svgEl('circle')
    setAttrs(halo, {
      cx: hx,
      cy: hy,
      r: r * hr,
      fill: 'rgba(255,180,80,0.25)',
      opacity: op,
    })
    gridG.appendChild(halo)
    const core = svgEl('circle')
    setAttrs(core, {
      cx: hx,
      cy: hy,
      r: r * hr * 0.4,
      fill: 'rgba(255,210,130,0.9)',
      opacity: op,
    })
    gridG.appendChild(core)
  }

  // Scattered suburb specks along the arteries
  for (const [ox, oy, op] of [
    [-0.35, -0.1, 0.7],
    [-0.05, -0.14, 0.65],
    [0.2, -0.16, 0.6],
    [-0.15, 0.12, 0.65],
    [0.05, 0.32, 0.6],
    [-0.32, 0.24, 0.55],
    [0.38, 0.0, 0.6],
    [0.15, 0.05, 0.5],
    [-0.5, 0.02, 0.5],
  ] as [number, number, number][]) {
    const speck = svgEl('circle')
    setAttrs(speck, {
      cx: cx + r * ox,
      cy: cy + r * oy,
      r: r * 0.012,
      fill: 'rgba(255,225,160,0.85)',
      opacity: op,
    })
    gridG.appendChild(speck)
  }

  svg.appendChild(gridG)

  // Cool cyan atmosphere rim
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(80,200,255,0.22)',
    'stroke-width': r * 0.08,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#nlimb-${id})` })
  svg.appendChild(limb)

  // Faint cool sheen — the night side reflects starlight, not sun
  const hl = svgEl('ellipse')
  setAttrs(hl, {
    cx: cx - r * 0.2,
    cy: cy - r * 0.26,
    rx: r * 0.24,
    ry: r * 0.14,
    fill: 'rgba(150,200,255,0.08)',
  })
  svg.appendChild(hl)
}
