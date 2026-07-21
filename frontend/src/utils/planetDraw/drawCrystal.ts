import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip, drawSpecular } from './svgHelpers'

/**
 * Crystal – faceted gem world: teal-to-magenta prism facets, glowing edges, sharp glints
 */
export function drawCrystal(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const defs = svgEl('defs')

  const grad = svgEl('radialGradient')
  setAttrs(grad, { id: `cg-${id}`, cx: '40%', cy: '34%', r: '70%' })
  addGradStop(grad, '0%', '#b0fff0')
  addGradStop(grad, '30%', '#48d8c8')
  addGradStop(grad, '62%', '#1e8898')
  addGradStop(grad, '100%', '#0c2848')
  defs.appendChild(grad)

  // Prismatic sheen — magenta tint bleeding in from the lower right
  const sheen = svgEl('radialGradient')
  setAttrs(sheen, { id: `csh-${id}`, cx: '72%', cy: '72%', r: '60%' })
  addGradStop(sheen, '0%', 'rgba(220,100,255,0.30)')
  addGradStop(sheen, '55%', 'rgba(180,80,240,0.12)')
  addGradStop(sheen, '100%', 'rgba(120,40,200,0)')
  defs.appendChild(sheen)

  addLimbGrad(defs, `climb-${id}`, 0.65)
  addClip(defs, `cc-${id}`, cx, cy, r * 0.92)
  svg.appendChild(defs)

  const base = svgEl('circle')
  setAttrs(base, { cx, cy, r: r * 0.92, fill: `url(#cg-${id})` })
  svg.appendChild(base)

  const sheenC = svgEl('circle')
  setAttrs(sheenC, { cx, cy, r: r * 0.92, fill: `url(#csh-${id})` })
  svg.appendChild(sheenC)

  const facetG = svgEl('g')
  facetG.setAttribute('clip-path', `url(#cc-${id})`)

  // Facets: translucent polygons with a bright leading edge
  const facets: [number[][], string, number][] = [
    [
      [
        [-0.55, -0.25],
        [-0.1, -0.55],
        [0.05, -0.1],
        [-0.35, 0.1],
      ],
      'rgba(200,255,245,0.20)',
      0.9,
    ],
    [
      [
        [0.05, -0.1],
        [0.5, -0.35],
        [0.65, 0.15],
        [0.2, 0.3],
      ],
      'rgba(120,230,220,0.16)',
      0.8,
    ],
    [
      [
        [-0.35, 0.1],
        [0.2, 0.3],
        [0.05, 0.65],
        [-0.45, 0.45],
      ],
      'rgba(210,130,255,0.14)',
      0.7,
    ],
    [
      [
        [-0.1, -0.55],
        [0.35, -0.7],
        [0.5, -0.35],
        [0.05, -0.1],
      ],
      'rgba(240,255,255,0.22)',
      1,
    ],
    [
      [
        [-0.75, 0.05],
        [-0.55, -0.25],
        [-0.35, 0.1],
        [-0.6, 0.35],
      ],
      'rgba(90,200,210,0.18)',
      0.6,
    ],
  ]
  for (const [pts, fill, edgeOp] of facets) {
    const d =
      pts
        .map(([ox, oy], i) => `${i === 0 ? 'M' : 'L'}${cx + r * ox},${cy + r * oy}`)
        .join(' ') + ' Z'
    const facet = svgEl('path')
    setAttrs(facet, { d, fill, stroke: 'rgba(230,255,250,0.35)', 'stroke-width': r * 0.012 })
    facetG.appendChild(facet)
    // Bright leading edge on the light-facing side
    const [ax, ay] = pts[0]
    const [bx, by] = pts[1]
    const edge = svgEl('line')
    setAttrs(edge, {
      x1: cx + r * ax,
      y1: cy + r * ay,
      x2: cx + r * bx,
      y2: cy + r * by,
      stroke: 'rgba(255,255,255,0.55)',
      'stroke-width': r * 0.02,
      opacity: edgeOp * 0.6,
    })
    facetG.appendChild(edge)
  }

  // Sharp glint sparks at facet corners
  for (const [ox, oy, s, op] of [
    [-0.1, -0.55, 0.05, 0.9],
    [0.5, -0.35, 0.035, 0.7],
    [-0.55, -0.25, 0.03, 0.6],
    [0.2, 0.3, 0.028, 0.5],
  ] as [number, number, number, number][]) {
    const gx = cx + r * ox
    const gy = cy + r * oy
    const spark = svgEl('path')
    setAttrs(spark, {
      d: `M${gx - r * s},${gy} L${gx},${gy - r * s} L${gx + r * s},${gy} L${gx},${gy + r * s} Z`,
      fill: 'rgba(255,255,255,0.85)',
      opacity: op,
    })
    facetG.appendChild(spark)
  }
  svg.appendChild(facetG)

  // Cool cyan atmosphere rim
  const atm = svgEl('circle')
  setAttrs(atm, {
    cx,
    cy,
    r: r * 0.96,
    fill: 'none',
    stroke: 'rgba(110,240,225,0.26)',
    'stroke-width': r * 0.09,
  })
  svg.appendChild(atm)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#climb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(230,255,250,')
}
