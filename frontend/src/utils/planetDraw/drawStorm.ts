import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip, drawSpecular } from './svgHelpers'

/**
 * Storm – indigo tempest giant: curved cloud bands, spiral cyclone eye,
 * branching lightning with layered glow
 */
export function drawStorm(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `stg-${id}`, cx: '42%', cy: '36%', r: '68%' })
  addGradStop(grad, '0%', '#8090c8')
  addGradStop(grad, '35%', '#4a5a9a')
  addGradStop(grad, '68%', '#2a3468')
  addGradStop(grad, '100%', '#0a0e28')
  defs.appendChild(grad)

  addLimbGrad(defs, `stlimb-${id}`, 0.7)
  addClip(defs, `stc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#stg-${id})` })
  svg.appendChild(base)

  const stormG = svgEl('g')
  stormG.setAttribute('clip-path', `url(#stc-${id})`)

  // Curved storm bands — darker troughs and lighter crests sweeping the sphere
  const bands: [string, string, number, number][] = [
    [
      `M${cx - r},${cy - r * 0.45} Q${cx},${cy - r * 0.62} ${cx + r},${cy - r * 0.4}`,
      'rgba(20,25,60,0.5)',
      r * 0.14,
      0.7,
    ],
    [
      `M${cx - r},${cy - r * 0.15} Q${cx + r * 0.1},${cy - r * 0.32} ${cx + r},${cy - r * 0.1}`,
      'rgba(150,170,230,0.35)',
      r * 0.09,
      0.6,
    ],
    [
      `M${cx - r},${cy + r * 0.12} Q${cx - r * 0.1},${cy - r * 0.02} ${cx + r},${cy + r * 0.18}`,
      'rgba(25,32,75,0.5)',
      r * 0.12,
      0.65,
    ],
    [
      `M${cx - r},${cy + r * 0.42} Q${cx + r * 0.05},${cy + r * 0.28} ${cx + r},${cy + r * 0.48}`,
      'rgba(130,150,215,0.3)',
      r * 0.08,
      0.55,
    ],
    [
      `M${cx - r},${cy + r * 0.66} Q${cx},${cy + r * 0.55} ${cx + r},${cy + r * 0.7}`,
      'rgba(18,22,55,0.45)',
      r * 0.1,
      0.55,
    ],
  ]
  for (const [d, stroke, sw, op] of bands) {
    const band = svgEl('path')
    setAttrs(band, {
      d,
      fill: 'none',
      stroke,
      'stroke-width': sw,
      'stroke-linecap': 'round',
      opacity: op,
    })
    stormG.appendChild(band)
  }

  // Cyclone eye — dark pit ringed by a bright spiral arm
  const ecx = cx - r * 0.22
  const ecy = cy + r * 0.08
  const eyeOuter = svgEl('ellipse')
  setAttrs(eyeOuter, {
    cx: ecx,
    cy: ecy,
    rx: r * 0.22,
    ry: r * 0.15,
    fill: 'rgba(15,18,50,0.75)',
  })
  stormG.appendChild(eyeOuter)
  const spiral = svgEl('path')
  setAttrs(spiral, {
    d: `M${ecx - r * 0.2},${ecy} Q${ecx - r * 0.05},${ecy - r * 0.16} ${ecx + r * 0.12},${ecy - r * 0.06} Q${ecx + r * 0.2},${ecy + r * 0.02} ${ecx + r * 0.08},${ecy + r * 0.09} Q${ecx - r * 0.02},${ecy + r * 0.13} ${ecx - r * 0.08},${ecy + r * 0.05}`,
    fill: 'none',
    stroke: 'rgba(190,210,255,0.65)',
    'stroke-width': r * 0.028,
    'stroke-linecap': 'round',
  })
  stormG.appendChild(spiral)
  const eyeCore = svgEl('ellipse')
  setAttrs(eyeCore, {
    cx: ecx,
    cy: ecy,
    rx: r * 0.05,
    ry: r * 0.035,
    fill: 'rgba(8,10,35,0.9)',
  })
  stormG.appendChild(eyeCore)

  // Branching lightning — halo stroke beneath a crisp white core
  const bolts: [string, number][] = [
    [
      `M${cx + r * 0.3},${cy - r * 0.35} L${cx + r * 0.22},${cy - r * 0.18} L${cx + r * 0.32},${cy - r * 0.12} L${cx + r * 0.24},${cy + r * 0.05}`,
      0.9,
    ],
    [
      `M${cx + r * 0.22},${cy - r * 0.18} L${cx + r * 0.12},${cy - r * 0.1}`,
      0.6,
    ],
    [
      `M${cx - r * 0.45},${cy - r * 0.5} L${cx - r * 0.5},${cy - r * 0.36} L${cx - r * 0.42},${cy - r * 0.3}`,
      0.6,
    ],
    [
      `M${cx + r * 0.05},${cy + r * 0.42} L${cx - r * 0.02},${cy + r * 0.55} L${cx + r * 0.06},${cy + r * 0.6}`,
      0.5,
    ],
  ]
  for (const [d, op] of bolts) {
    const halo = svgEl('path')
    setAttrs(halo, {
      d,
      fill: 'none',
      stroke: 'rgba(140,190,255,0.5)',
      'stroke-width': r * 0.045,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: op * 0.6,
    })
    stormG.appendChild(halo)
    const bolt = svgEl('path')
    setAttrs(bolt, {
      d,
      fill: 'none',
      stroke: 'rgba(240,248,255,0.95)',
      'stroke-width': r * 0.014,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: op,
    })
    stormG.appendChild(bolt)
    // Flash pool where the bolt strikes the cloud deck
    const parts = d.split('L')
    const [fx, fy] = parts[parts.length - 1].split(',').map(Number)
    const flash = svgEl('circle')
    setAttrs(flash, {
      cx: fx,
      cy: fy,
      r: r * 0.06,
      fill: 'rgba(170,210,255,0.30)',
      opacity: op,
    })
    stormG.appendChild(flash)
  }

  svg.appendChild(stormG)

  // Electric blue atmosphere rim
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(110,150,255,0.26)',
    'stroke-width': r * 0.1,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#stlimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(200,220,255,')
}
