import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip, drawSpecular } from './svgHelpers'

/**
 * Ocean – more continents, rotated cloud swirls, blue atmospheric rim
 */
export function drawOcean(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `og-${id}`, cx: '42%', cy: '36%', r: '68%' })
  addGradStop(grad, '0%', '#68c8f8')
  addGradStop(grad, '35%', '#2088d0')
  addGradStop(grad, '68%', '#0e52a0')
  addGradStop(grad, '100%', '#061830')
  defs.appendChild(grad)

  addLimbGrad(defs, `olimb-${id}`, 0.65)
  addClip(defs, `oc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#og-${id})` })
  svg.appendChild(base)

  const contG = svgEl('g')
  contG.setAttribute('clip-path', `url(#oc-${id})`)

  // Continents (more organic shapes via overlapping ellipses)
  const continents: {
    cx: number
    cy: number
    rx: number
    ry: number
    rot: number
    color: string
  }[] = [
    {
      cx: cx - r * 0.22,
      cy: cy + r * 0.12,
      rx: r * 0.28,
      ry: r * 0.17,
      rot: -15,
      color: '#3a8a3a',
    },
    { cx: cx - r * 0.08, cy: cy + r * 0.22, rx: r * 0.14, ry: r * 0.09, rot: 10, color: '#4a9a4a' },
    { cx: cx + r * 0.22, cy: cy - r * 0.2, rx: r * 0.2, ry: r * 0.13, rot: 20, color: '#428842' },
    { cx: cx + r * 0.1, cy: cy - r * 0.08, rx: r * 0.1, ry: r * 0.07, rot: -8, color: '#509850' },
    { cx: cx - r * 0.38, cy: cy - r * 0.14, rx: r * 0.14, ry: r * 0.09, rot: 30, color: '#3c8040' },
    { cx: cx + r * 0.3, cy: cy + r * 0.3, rx: r * 0.12, ry: r * 0.07, rot: -20, color: '#46924a' },
  ]
  for (const c of continents) {
    // Shallow-water shelf halo beneath each landmass — coasts read as coasts
    const shelf = svgEl('ellipse')
    setAttrs(shelf, {
      cx: c.cx,
      cy: c.cy,
      rx: c.rx * 1.3,
      ry: c.ry * 1.35,
      fill: 'rgba(90,210,230,0.35)',
      transform: `rotate(${c.rot} ${c.cx} ${c.cy})`,
    })
    contG.appendChild(shelf)
    const e = svgEl('ellipse')
    setAttrs(e, {
      cx: c.cx,
      cy: c.cy,
      rx: c.rx,
      ry: c.ry,
      fill: c.color,
      opacity: 0.88,
      transform: `rotate(${c.rot} ${c.cx} ${c.cy})`,
    })
    contG.appendChild(e)
    // Interior relief — a darker ridge stripe through the landmass
    const ridge = svgEl('ellipse')
    setAttrs(ridge, {
      cx: c.cx + c.rx * 0.15,
      cy: c.cy + c.ry * 0.1,
      rx: c.rx * 0.55,
      ry: c.ry * 0.35,
      fill: 'rgba(30,70,25,0.4)',
      transform: `rotate(${c.rot} ${c.cx} ${c.cy})`,
    })
    contG.appendChild(ridge)
  }

  // Archipelago chains trailing off the continents
  for (const [ox, oy, s, op] of [
    [0.02, 0.34, 0.024, 0.8],
    [0.1, 0.4, 0.018, 0.7],
    [0.18, 0.44, 0.014, 0.6],
    [-0.48, 0.05, 0.02, 0.7],
    [-0.55, 0.14, 0.015, 0.6],
    [0.4, -0.34, 0.018, 0.7],
    [0.48, -0.4, 0.013, 0.55],
  ] as [number, number, number, number][]) {
    const isle = svgEl('circle')
    setAttrs(isle, {
      cx: cx + r * ox,
      cy: cy + r * oy,
      r: r * s,
      fill: '#4a9448',
      opacity: op,
    })
    contG.appendChild(isle)
  }

  // Sun glitter — sparkling water trail under the specular highlight
  for (const [ox, oy, rx, op] of [
    [-0.2, -0.22, 0.05, 0.5],
    [-0.13, -0.14, 0.035, 0.4],
    [-0.08, -0.06, 0.025, 0.3],
  ] as [number, number, number, number][]) {
    const glit = svgEl('ellipse')
    setAttrs(glit, {
      cx: cx + r * ox,
      cy: cy + r * oy,
      rx: r * rx,
      ry: r * rx * 0.45,
      fill: 'rgba(255,255,255,0.55)',
      opacity: op,
    })
    contG.appendChild(glit)
  }

  // Polar ice caps
  const pc1 = svgEl('ellipse')
  setAttrs(pc1, {
    cx,
    cy: cy - r * 0.72,
    rx: r * 0.36,
    ry: r * 0.18,
    fill: 'rgba(240,252,255,0.80)',
  })
  contG.appendChild(pc1)
  const pc2 = svgEl('ellipse')
  setAttrs(pc2, {
    cx,
    cy: cy + r * 0.75,
    rx: r * 0.26,
    ry: r * 0.12,
    fill: 'rgba(240,252,255,0.60)',
  })
  contG.appendChild(pc2)

  // Cloud swirls as rotated thin ellipses
  const cloudSwirls: [number, number, number, number, number][] = [
    [cx - r * 0.12, cy - r * 0.35, r * 0.4, r * 0.09, -18],
    [cx + r * 0.25, cy + r * 0.1, r * 0.3, r * 0.07, 22],
    [cx - r * 0.35, cy + r * 0.3, r * 0.34, r * 0.08, -10],
    [cx + r * 0.08, cy - r * 0.55, r * 0.28, r * 0.06, 15],
  ]
  for (const [scx, scy, srx, sry, rot] of cloudSwirls) {
    const swirl = svgEl('ellipse')
    setAttrs(swirl, {
      cx: scx,
      cy: scy,
      rx: srx,
      ry: sry,
      fill: 'rgba(240,252,255,0.42)',
      transform: `rotate(${rot} ${scx} ${scy})`,
    })
    contG.appendChild(swirl)
  }

  svg.appendChild(contG)

  // Blue atmospheric rim
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(80,180,255,0.26)',
    'stroke-width': r * 0.1,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#olimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(200,240,255,')
}
