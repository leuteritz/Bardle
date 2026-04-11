import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip, drawSpecular } from './svgHelpers'

/**
 * Ice – subsurface scatter, glow crack network, detailed polar caps
 */
export function drawIce(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `ig-${id}`, cx: '42%', cy: '36%', r: '68%' })
  addGradStop(grad, '0%', '#f0f8ff')
  addGradStop(grad, '30%', '#b8daf0')
  addGradStop(grad, '62%', '#5ea8d0')
  addGradStop(grad, '100%', '#1a4a70')
  defs.appendChild(grad)

  // Subsurface scatter overlay
  const ssg = svgEl('radialGradient')
  setAttrs(ssg, { id: `iss-${id}`, cx: '50%', cy: '50%', r: '50%' })
  addGradStop(ssg, '0%', 'rgba(140,210,255,0.18)')
  addGradStop(ssg, '60%', 'rgba(100,180,230,0.08)')
  addGradStop(ssg, '100%', 'rgba(0,60,120,0)')
  defs.appendChild(ssg)

  addLimbGrad(defs, `ilimb-${id}`, 0.6)
  addClip(defs, `ic-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#ig-${id})` })
  svg.appendChild(base)

  const ss = svgEl('circle')
  setAttrs(ss, { cx, cy, r: r * 0.92, fill: `url(#iss-${id})` })
  svg.appendChild(ss)

  const crackG = svgEl('g')
  crackG.setAttribute('clip-path', `url(#ic-${id})`)

  // Each crack: wide glow underneath, sharp line on top
  for (const [ox1, oy1, ox2, oy2, sw, op] of [
    [-0.3, -0.1, 0.1, 0.4, r * 0.022, 0.45],
    [0.2, -0.3, -0.1, 0.22, r * 0.018, 0.35],
    [-0.15, -0.42, 0.28, -0.04, r * 0.016, 0.3],
    [0.35, 0.05, -0.2, 0.35, r * 0.014, 0.28],
    [-0.42, 0.15, 0.05, -0.08, r * 0.012, 0.22],
    [-0.1, 0.15, 0.3, 0.38, r * 0.01, 0.2],
  ] as [number, number, number, number, number, number][]) {
    const x1 = cx + r * ox1,
      y1 = cy + r * oy1,
      x2 = cx + r * ox2,
      y2 = cy + r * oy2
    const glow = svgEl('line')
    setAttrs(glow, {
      x1,
      y1,
      x2,
      y2,
      stroke: 'rgba(180,230,255,0.35)',
      'stroke-width': sw * 2.8,
      opacity: op * 0.55,
    })
    crackG.appendChild(glow)
    const line = svgEl('line')
    setAttrs(line, {
      x1,
      y1,
      x2,
      y2,
      stroke: 'rgba(160,220,255,0.65)',
      'stroke-width': sw,
      opacity: op,
    })
    crackG.appendChild(line)
  }

  // Polar caps – outer soft + inner bright
  const cap1 = svgEl('ellipse')
  setAttrs(cap1, {
    cx,
    cy: cy - r * 0.73,
    rx: r * 0.46,
    ry: r * 0.24,
    fill: 'rgba(255,255,255,0.72)',
  })
  crackG.appendChild(cap1)
  const cap1i = svgEl('ellipse')
  setAttrs(cap1i, {
    cx,
    cy: cy - r * 0.77,
    rx: r * 0.28,
    ry: r * 0.14,
    fill: 'rgba(255,255,255,0.90)',
  })
  crackG.appendChild(cap1i)
  const cap2 = svgEl('ellipse')
  setAttrs(cap2, {
    cx,
    cy: cy + r * 0.76,
    rx: r * 0.34,
    ry: r * 0.16,
    fill: 'rgba(255,255,255,0.55)',
  })
  crackG.appendChild(cap2)

  svg.appendChild(crackG)

  // Atmospheric rim glow
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(140,210,255,0.24)',
    'stroke-width': r * 0.09,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#ilimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(220,245,255,')
}
