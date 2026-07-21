import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip } from './svgHelpers'

/**
 * Void – abyssal dark world: near-black body, glowing magenta rift network, violet aura
 */
export function drawVoid(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `vg-${id}`, cx: '44%', cy: '38%', r: '70%' })
  addGradStop(grad, '0%', '#3a2058')
  addGradStop(grad, '40%', '#241040')
  addGradStop(grad, '75%', '#120626')
  addGradStop(grad, '100%', '#050110')
  defs.appendChild(grad)

  // Inner corruption glow seeping up from the core
  const coreGlow = svgEl('radialGradient')
  setAttrs(coreGlow, { id: `vcg-${id}`, cx: '50%', cy: '52%', r: '50%' })
  addGradStop(coreGlow, '0%', 'rgba(220,80,255,0.22)')
  addGradStop(coreGlow, '45%', 'rgba(150,50,230,0.10)')
  addGradStop(coreGlow, '100%', 'rgba(80,20,160,0)')
  defs.appendChild(coreGlow)

  addLimbGrad(defs, `vlimb-${id}`, 0.85)
  addClip(defs, `vc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  // Outer violet aura — the void bleeds beyond the surface
  const aura = svgEl('circle')
  setAttrs(aura, {
    cx,
    cy,
    r: r * 1.0,
    fill: 'none',
    stroke: 'rgba(150,60,240,0.20)',
    'stroke-width': r * 0.14,
  })
  svg.appendChild(aura)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#vg-${id})` })
  svg.appendChild(base)

  const core = svgEl('circle')
  setAttrs(core, { cx, cy, r: r * 0.92, fill: `url(#vcg-${id})` })
  svg.appendChild(core)

  const riftG = svgEl('g')
  riftG.setAttribute('clip-path', `url(#vc-${id})`)

  // Central rift — a torn seam with a blazing inner line
  const riftPath = `M${cx - r * 0.45},${cy - r * 0.1} Q${cx - r * 0.1},${cy + r * 0.18} ${cx + r * 0.15},${cy - r * 0.02} T${cx + r * 0.5},${cy + r * 0.12}`
  const riftHalo = svgEl('path')
  setAttrs(riftHalo, {
    d: riftPath,
    fill: 'none',
    stroke: 'rgba(200,80,255,0.30)',
    'stroke-width': r * 0.12,
    'stroke-linecap': 'round',
  })
  riftG.appendChild(riftHalo)
  const riftGlow = svgEl('path')
  setAttrs(riftGlow, {
    d: riftPath,
    fill: 'none',
    stroke: 'rgba(230,130,255,0.55)',
    'stroke-width': r * 0.05,
    'stroke-linecap': 'round',
  })
  riftG.appendChild(riftGlow)
  const riftCoreLine = svgEl('path')
  setAttrs(riftCoreLine, {
    d: riftPath,
    fill: 'none',
    stroke: 'rgba(255,220,255,0.9)',
    'stroke-width': r * 0.016,
    'stroke-linecap': 'round',
  })
  riftG.appendChild(riftCoreLine)

  // Branching hairline fractures radiating from the rift
  for (const [x1o, y1o, x2o, y2o, op] of [
    [-0.3, -0.02, -0.45, -0.35, 0.5],
    [-0.05, 0.08, -0.15, 0.42, 0.45],
    [0.15, -0.02, 0.32, -0.34, 0.5],
    [0.4, 0.08, 0.55, 0.4, 0.4],
    [0.02, 0.04, 0.2, 0.3, 0.35],
    [-0.38, -0.06, -0.62, 0.12, 0.35],
  ] as [number, number, number, number, number][]) {
    const glow = svgEl('line')
    setAttrs(glow, {
      x1: cx + r * x1o,
      y1: cy + r * y1o,
      x2: cx + r * x2o,
      y2: cy + r * y2o,
      stroke: 'rgba(200,90,255,0.4)',
      'stroke-width': r * 0.03,
      opacity: op * 0.6,
    })
    riftG.appendChild(glow)
    const line = svgEl('line')
    setAttrs(line, {
      x1: cx + r * x1o,
      y1: cy + r * y1o,
      x2: cx + r * x2o,
      y2: cy + r * y2o,
      stroke: 'rgba(240,170,255,0.75)',
      'stroke-width': r * 0.01,
      opacity: op,
    })
    riftG.appendChild(line)
  }

  // Faint drifting motes caught in the void's pull
  for (const [ox, oy, mr, op] of [
    [-0.25, -0.45, 0.025, 0.6],
    [0.42, -0.25, 0.02, 0.5],
    [-0.5, 0.3, 0.018, 0.45],
    [0.28, 0.48, 0.022, 0.5],
    [0.05, -0.6, 0.015, 0.4],
  ] as [number, number, number, number][]) {
    const mote = svgEl('circle')
    setAttrs(mote, {
      cx: cx + r * ox,
      cy: cy + r * oy,
      r: r * mr,
      fill: 'rgba(220,140,255,0.8)',
      opacity: op,
    })
    riftG.appendChild(mote)
  }

  svg.appendChild(riftG)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#vlimb-${id})` })
  svg.appendChild(limb)

  // Dim violet specular instead of the usual white — the void swallows light
  const hl = svgEl('ellipse')
  setAttrs(hl, {
    cx: cx - r * 0.2,
    cy: cy - r * 0.26,
    rx: r * 0.26,
    ry: r * 0.16,
    fill: 'rgba(190,130,255,0.10)',
  })
  svg.appendChild(hl)
}
