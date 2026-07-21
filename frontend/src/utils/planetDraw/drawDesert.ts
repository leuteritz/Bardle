import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip, drawSpecular } from './svgHelpers'

/**
 * Desert – layered dune arcs, heat shimmer haze, warm specular
 */
export function drawDesert(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `dsg-${id}`, cx: '36%', cy: '30%', r: '70%' })
  addGradStop(grad, '0%', '#f0c87a')
  addGradStop(grad, '35%', '#d88830')
  addGradStop(grad, '68%', '#a05818')
  addGradStop(grad, '100%', '#5a2808')
  defs.appendChild(grad)

  addLimbGrad(defs, `dslimb-${id}`, 0.72)
  addClip(defs, `dsc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#dsg-${id})` })
  svg.appendChild(base)

  const duneG = svgEl('g')
  duneG.setAttribute('clip-path', `url(#dsc-${id})`)

  // Dune arcs – each with a light crest stroke + dark shadow fill below
  const duneData: [number, number, number, number, number, number, string, string][] = [
    [
      cx - r * 0.52,
      cy + r * 0.08,
      cx,
      cy - r * 0.08,
      cx + r * 0.52,
      cy + r * 0.08,
      'rgba(215,158,72,0.38)',
      'rgba(130,70,18,0.22)',
    ],
    [
      cx - r * 0.6,
      cy + r * 0.34,
      cx + r * 0.08,
      cy + r * 0.16,
      cx + r * 0.62,
      cy + r * 0.36,
      'rgba(185,122,48,0.32)',
      'rgba(110,55,12,0.20)',
    ],
    [
      cx - r * 0.4,
      cy - r * 0.22,
      cx + r * 0.18,
      cy - r * 0.38,
      cx + r * 0.55,
      cy - r * 0.1,
      'rgba(235,178,90,0.30)',
      'rgba(145,80,22,0.18)',
    ],
    [
      cx - r * 0.62,
      cy - r * 0.05,
      cx - r * 0.1,
      cy - r * 0.2,
      cx + r * 0.3,
      cy + r * 0.05,
      'rgba(200,140,60,0.26)',
      'rgba(120,62,15,0.16)',
    ],
    [
      cx - r * 0.2,
      cy + r * 0.5,
      cx + r * 0.28,
      cy + r * 0.36,
      cx + r * 0.65,
      cy + r * 0.55,
      'rgba(175,110,42,0.28)',
      'rgba(100,50,10,0.16)',
    ],
  ]
  for (const [x1, y1, x2, y2, x3, y3, crest, shadow] of duneData) {
    const shadowPath = svgEl('path')
    setAttrs(shadowPath, {
      d: `M ${x1} ${y1} Q ${x2} ${y2} ${x3} ${y3} L ${x3} ${y3 + r * 0.14} Q ${x2} ${y2 + r * 0.14} ${x1} ${y1 + r * 0.14} Z`,
      fill: shadow,
    })
    duneG.appendChild(shadowPath)
    const arc = svgEl('path')
    setAttrs(arc, {
      d: `M ${x1} ${y1} Q ${x2} ${y2} ${x3} ${y3}`,
      stroke: crest,
      'stroke-width': r * 0.07,
      fill: 'none',
      'stroke-linecap': 'round',
    })
    duneG.appendChild(arc)
  }

  // Large eroded impact basin with a raised rim
  const basin = svgEl('circle')
  setAttrs(basin, {
    cx: cx + r * 0.34,
    cy: cy + r * 0.28,
    r: r * 0.15,
    fill: 'rgba(120,60,15,0.30)',
  })
  duneG.appendChild(basin)
  const basinRim = svgEl('circle')
  setAttrs(basinRim, {
    cx: cx + r * 0.33,
    cy: cy + r * 0.27,
    r: r * 0.15,
    fill: 'none',
    stroke: 'rgba(245,200,120,0.35)',
    'stroke-width': r * 0.018,
  })
  duneG.appendChild(basinRim)

  // Dry canyon carving across the highlands
  const canyon = svgEl('path')
  setAttrs(canyon, {
    d: `M${cx - r * 0.55},${cy - r * 0.35} Q${cx - r * 0.25},${cy - r * 0.18} ${cx - r * 0.05},${cy - r * 0.3} T${cx + r * 0.35},${cy - r * 0.22}`,
    fill: 'none',
    stroke: 'rgba(105,52,12,0.45)',
    'stroke-width': r * 0.022,
    'stroke-linecap': 'round',
  })
  duneG.appendChild(canyon)

  // Drifting dust-storm veil
  const stormVeil = svgEl('ellipse')
  setAttrs(stormVeil, {
    cx: cx - r * 0.25,
    cy: cy + r * 0.42,
    rx: r * 0.4,
    ry: r * 0.12,
    fill: 'rgba(235,190,120,0.22)',
    transform: `rotate(-8 ${cx - r * 0.25} ${cy + r * 0.42})`,
  })
  duneG.appendChild(stormVeil)

  // Small dark rocks
  for (const [ox, oy, rr] of [
    [-0.18, 0.28, 0.028],
    [0.32, -0.14, 0.022],
    [-0.38, 0.4, 0.02],
    [0.1, 0.44, 0.018],
  ] as [number, number, number][]) {
    const rock = svgEl('ellipse')
    setAttrs(rock, {
      cx: cx + r * ox,
      cy: cy + r * oy,
      rx: r * rr,
      ry: r * rr * 0.65,
      fill: 'rgba(80,40,12,0.55)',
    })
    duneG.appendChild(rock)
  }

  svg.appendChild(duneG)

  // Warm heat-haze atmosphere
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(230,145,40,0.22)',
    'stroke-width': r * 0.1,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#dslimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(255,225,140,')
}
