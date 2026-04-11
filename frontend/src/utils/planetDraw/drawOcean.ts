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
