import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip } from './svgHelpers'

/**
 * Shattered – broken world: cracked stone crust over a glowing molten core,
 * drifting debris shards orbiting the wound
 */
export function drawShattered(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `sg-${id}`, cx: '42%', cy: '36%', r: '68%' })
  addGradStop(grad, '0%', '#9a8878')
  addGradStop(grad, '35%', '#6e5c4c')
  addGradStop(grad, '68%', '#443426')
  addGradStop(grad, '100%', '#160e06')
  defs.appendChild(grad)

  // Molten heat bleeding through from beneath the crust
  const heat = svgEl('radialGradient')
  setAttrs(heat, { id: `sht-${id}`, cx: '58%', cy: '58%', r: '55%' })
  addGradStop(heat, '0%', 'rgba(255,140,40,0.22)')
  addGradStop(heat, '50%', 'rgba(220,90,20,0.10)')
  addGradStop(heat, '100%', 'rgba(160,50,0,0)')
  defs.appendChild(heat)

  addLimbGrad(defs, `slimb-${id}`, 0.72)
  addClip(defs, `sc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#sg-${id})` })
  svg.appendChild(base)

  const heatC = svgEl('circle')
  setAttrs(heatC, { cx, cy, r: r * 0.92, fill: `url(#sht-${id})` })
  svg.appendChild(heatC)

  const crackG = svgEl('g')
  crackG.setAttribute('clip-path', `url(#sc-${id})`)

  // Main fissures — molten glow beneath, bright ember line on top
  const fissures: [string, number, number][] = [
    [
      `M${cx - r * 0.5},${cy - r * 0.3} L${cx - r * 0.15},${cy - r * 0.05} L${cx + r * 0.1},${cy + r * 0.2} L${cx + r * 0.45},${cy + r * 0.35}`,
      r * 0.05,
      0.9,
    ],
    [
      `M${cx - r * 0.15},${cy - r * 0.05} L${cx + r * 0.2},${cy - r * 0.3} L${cx + r * 0.5},${cy - r * 0.4}`,
      r * 0.035,
      0.75,
    ],
    [
      `M${cx + r * 0.1},${cy + r * 0.2} L${cx - r * 0.15},${cy + r * 0.45} L${cx - r * 0.35},${cy + r * 0.6}`,
      r * 0.03,
      0.65,
    ],
    [
      `M${cx - r * 0.5},${cy - r * 0.3} L${cx - r * 0.68},${cy - r * 0.05}`,
      r * 0.024,
      0.5,
    ],
  ]
  for (const [d, sw, op] of fissures) {
    const glow = svgEl('path')
    setAttrs(glow, {
      d,
      fill: 'none',
      stroke: 'rgba(255,110,30,0.45)',
      'stroke-width': sw * 2.6,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: op * 0.6,
    })
    crackG.appendChild(glow)
    const ember = svgEl('path')
    setAttrs(ember, {
      d,
      fill: 'none',
      stroke: 'rgba(255,190,90,0.9)',
      'stroke-width': sw,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: op,
    })
    crackG.appendChild(ember)
  }

  // Crust plates — subtle darker patches that read as broken slabs
  for (const [pts, op] of [
    [
      [
        [-0.55, -0.5],
        [-0.1, -0.6],
        [-0.15, -0.15],
        [-0.5, -0.28],
      ],
      0.3,
    ],
    [
      [
        [0.2, -0.28],
        [0.6, -0.35],
        [0.62, 0.05],
        [0.25, 0.05],
      ],
      0.26,
    ],
    [
      [
        [-0.4, 0.15],
        [-0.05, 0.1],
        [0.0, 0.5],
        [-0.3, 0.55],
      ],
      0.24,
    ],
  ] as [number[][], number][]) {
    const d =
      pts
        .map(([ox, oy], i) => `${i === 0 ? 'M' : 'L'}${cx + r * ox},${cy + r * oy}`)
        .join(' ') + ' Z'
    const plate = svgEl('path')
    setAttrs(plate, {
      d,
      fill: 'rgba(20,12,4,0.5)',
      stroke: 'rgba(0,0,0,0.4)',
      'stroke-width': r * 0.01,
      opacity: op,
    })
    crackG.appendChild(plate)
  }
  svg.appendChild(crackG)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#slimb-${id})` })
  svg.appendChild(limb)

  // Debris shards drifting off the shattered flank (outside the body)
  for (const [ox, oy, s, rotDeg, op] of [
    [1.05, -0.25, 0.09, 25, 0.85],
    [1.18, 0.05, 0.06, -15, 0.7],
    [1.02, 0.32, 0.075, 50, 0.75],
    [1.25, -0.08, 0.04, 70, 0.55],
    [0.98, -0.5, 0.05, -40, 0.6],
  ] as [number, number, number, number, number][]) {
    const dx = cx + r * ox
    const dy = cy + r * oy
    const shard = svgEl('path')
    setAttrs(shard, {
      d: `M${dx - r * s},${dy + r * s * 0.4} L${dx},${dy - r * s} L${dx + r * s * 0.8},${dy + r * s * 0.6} Z`,
      fill: '#6e5c4c',
      stroke: 'rgba(255,150,60,0.4)',
      'stroke-width': r * 0.008,
      opacity: op,
      transform: `rotate(${rotDeg} ${dx} ${dy})`,
    })
    svg.appendChild(shard)
  }

  // Warm ember specular
  const hl = svgEl('ellipse')
  setAttrs(hl, {
    cx: cx - r * 0.18,
    cy: cy - r * 0.24,
    rx: r * 0.3,
    ry: r * 0.18,
    fill: 'rgba(255,220,180,0.10)',
  })
  svg.appendChild(hl)
}
