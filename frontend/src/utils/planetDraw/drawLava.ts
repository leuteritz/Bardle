import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip } from './svgHelpers'

/**
 * Lava – 3-layer crack glow (outer/mid/inner), hot-spot nodes, ember atmosphere
 */
export function drawLava(svg: SVGSVGElement, id: string, cx: number, cy: number, r: number): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `lvg-${id}`, cx: '50%', cy: '50%', r: '50%' })
  addGradStop(grad, '0%', '#4a2020')
  addGradStop(grad, '50%', '#2a1010')
  addGradStop(grad, '100%', '#0e0505')
  defs.appendChild(grad)

  const glow = svgEl('filter')
  glow.id = `lvf-${id}`
  const blur = svgEl('feGaussianBlur')
  setAttrs(blur, { in: 'SourceGraphic', stdDeviation: String(r * 0.05) })
  glow.appendChild(blur)
  defs.appendChild(glow)

  addClip(defs, `lvc-${id}`, cx, cy, r * 0.92)
  addLimbGrad(defs, `lvlimb-${id}`, 0.65)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#lvg-${id})` })
  svg.appendChild(base)

  const crackG = svgEl('g')
  crackG.setAttribute('clip-path', `url(#lvc-${id})`)

  const crackPaths = [
    `M ${cx - r * 0.08} ${cy - r * 0.52} L ${cx + r * 0.18} ${cy - r * 0.05} L ${cx + r * 0.05} ${cy + r * 0.48}`,
    `M ${cx + r * 0.42} ${cy - r * 0.3} L ${cx - r * 0.08} ${cy + r * 0.18} L ${cx + r * 0.28} ${cy + r * 0.58}`,
    `M ${cx - r * 0.52} ${cy + r * 0.08} L ${cx + r * 0.08} ${cy + r * 0.42}`,
    `M ${cx - r * 0.28} ${cy - r * 0.42} L ${cx + r * 0.18} ${cy + r * 0.12}`,
    `M ${cx - r * 0.48} ${cy - r * 0.18} L ${cx - r * 0.08} ${cy - r * 0.52}`,
    `M ${cx + r * 0.08} ${cy + r * 0.42} L ${cx + r * 0.42} ${cy + r * 0.18}`,
  ]

  for (const d of crackPaths) {
    const outerGlow = svgEl('path')
    setAttrs(outerGlow, {
      d,
      stroke: '#ff3000',
      'stroke-width': r * 0.07,
      fill: 'none',
      filter: `url(#lvf-${id})`,
      opacity: 0.65,
    })
    crackG.appendChild(outerGlow)
    const midGlow = svgEl('path')
    setAttrs(midGlow, {
      d,
      stroke: '#ff6600',
      'stroke-width': r * 0.03,
      fill: 'none',
      opacity: 0.85,
    })
    crackG.appendChild(midGlow)
    const inner = svgEl('path')
    setAttrs(inner, { d, stroke: '#ffcc00', 'stroke-width': r * 0.01, fill: 'none', opacity: 0.95 })
    crackG.appendChild(inner)
  }

  // Glowing hot spots at intersection nodes
  for (const [ox, oy, hr] of [
    [-0.08, -0.05, 0.058],
    [0.08, 0.42, 0.045],
    [-0.08, 0.18, 0.04],
  ] as [number, number, number][]) {
    const hGlow = svgEl('circle')
    setAttrs(hGlow, {
      cx: cx + r * ox,
      cy: cy + r * oy,
      r: r * hr,
      fill: '#ff4400',
      filter: `url(#lvf-${id})`,
      opacity: 0.82,
    })
    crackG.appendChild(hGlow)
    const hCore = svgEl('circle')
    setAttrs(hCore, {
      cx: cx + r * ox,
      cy: cy + r * oy,
      r: r * hr * 0.5,
      fill: '#ffcc00',
      opacity: 0.92,
    })
    crackG.appendChild(hCore)
  }

  svg.appendChild(crackG)

  // Ember atmosphere glow
  const atmGlow = svgEl('circle')
  setAttrs(atmGlow, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(255,60,0,0.24)',
    'stroke-width': r * 0.12,
  })
  svg.appendChild(atmGlow)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#lvlimb-${id})` })
  svg.appendChild(limb)

  const glint = svgEl('ellipse')
  setAttrs(glint, {
    cx: cx - r * 0.22,
    cy: cy - r * 0.28,
    rx: r * 0.1,
    ry: r * 0.07,
    fill: 'rgba(255,140,60,0.18)',
  })
  svg.appendChild(glint)
}
