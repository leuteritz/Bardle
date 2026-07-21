import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip, drawSpecular } from './svgHelpers'

/**
 * Aurora – steel-blue tundra world crowned by curtains of green-cyan polar light
 */
export function drawAurora(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `ag-${id}`, cx: '42%', cy: '38%', r: '68%' })
  addGradStop(grad, '0%', '#a8c4dc')
  addGradStop(grad, '32%', '#6288ac')
  addGradStop(grad, '65%', '#32506e')
  addGradStop(grad, '100%', '#0a1626')
  defs.appendChild(grad)

  // Vertical glow wash under the aurora crown
  const crown = svgEl('linearGradient')
  setAttrs(crown, { id: `acr-${id}`, x1: '0%', y1: '0%', x2: '0%', y2: '100%' })
  addGradStop(crown, '0%', 'rgba(90,255,190,0.30)')
  addGradStop(crown, '45%', 'rgba(70,220,200,0.10)')
  addGradStop(crown, '100%', 'rgba(50,180,210,0)')
  defs.appendChild(crown)

  addLimbGrad(defs, `alimb-${id}`, 0.68)
  addClip(defs, `ac-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#ag-${id})` })
  svg.appendChild(base)

  const detailG = svgEl('g')
  detailG.setAttribute('clip-path', `url(#ac-${id})`)

  // Frozen terrain streaks — muted horizontal bands
  for (const [oy, h, op] of [
    [0.05, 0.1, 0.12],
    [0.25, 0.08, 0.1],
    [0.45, 0.09, 0.09],
    [-0.15, 0.07, 0.08],
  ] as [number, number, number][]) {
    const band = svgEl('rect')
    setAttrs(band, {
      x: cx - r,
      y: cy + r * oy,
      width: r * 2,
      height: r * h,
      fill: 'rgba(190,215,235,0.5)',
      opacity: op,
    })
    detailG.appendChild(band)
  }

  // Glow wash over the northern hemisphere
  const wash = svgEl('rect')
  setAttrs(wash, {
    x: cx - r,
    y: cy - r,
    width: r * 2,
    height: r * 1.1,
    fill: `url(#acr-${id})`,
  })
  detailG.appendChild(wash)

  // Aurora curtains — layered arcs over the pole, each with halo + bright core
  const curtains: [string, string, string, number][] = [
    [
      `M${cx - r * 0.65},${cy - r * 0.35} Q${cx - r * 0.2},${cy - r * 0.72} ${cx + r * 0.45},${cy - r * 0.42}`,
      'rgba(90,255,180,0.30)',
      'rgba(160,255,210,0.75)',
      0.9,
    ],
    [
      `M${cx - r * 0.5},${cy - r * 0.22} Q${cx},${cy - r * 0.55} ${cx + r * 0.6},${cy - r * 0.28}`,
      'rgba(70,230,220,0.26)',
      'rgba(140,250,240,0.6)',
      0.75,
    ],
    [
      `M${cx - r * 0.32},${cy - r * 0.5} Q${cx + r * 0.1},${cy - r * 0.8} ${cx + r * 0.3},${cy - r * 0.55}`,
      'rgba(150,220,255,0.24)',
      'rgba(200,240,255,0.55)',
      0.65,
    ],
  ]
  for (const [d, haloColor, coreColor, op] of curtains) {
    const halo = svgEl('path')
    setAttrs(halo, {
      d,
      fill: 'none',
      stroke: haloColor,
      'stroke-width': r * 0.1,
      'stroke-linecap': 'round',
      opacity: op,
    })
    detailG.appendChild(halo)
    const coreLine = svgEl('path')
    setAttrs(coreLine, {
      d,
      fill: 'none',
      stroke: coreColor,
      'stroke-width': r * 0.028,
      'stroke-linecap': 'round',
      opacity: op,
    })
    detailG.appendChild(coreLine)
  }

  // Bright polar cap under the lights
  const cap = svgEl('ellipse')
  setAttrs(cap, {
    cx,
    cy: cy - r * 0.74,
    rx: r * 0.4,
    ry: r * 0.18,
    fill: 'rgba(235,250,255,0.6)',
  })
  detailG.appendChild(cap)

  svg.appendChild(detailG)

  // Cold teal atmosphere rim
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(100,240,200,0.22)',
    'stroke-width': r * 0.09,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#alimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(210,245,255,')
}
