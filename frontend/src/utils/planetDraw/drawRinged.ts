import { svgEl, setAttrs, addGradStop, addLimbGrad, addClip, drawSpecular } from './svgHelpers'

/**
 * Ringed – multi-band ring with inner shadow, tilted ring plane, icy body
 */
export function drawRinged(
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
): void {
  const defs = svgEl('defs')

  // Ring gradient with more bands
  const ringGrad = svgEl('linearGradient')
  ringGrad.id = `rng-${id}`
  setAttrs(ringGrad, { x1: '0%', y1: '0%', x2: '100%', y2: '0%' })
  const ringStops: [string, string][] = [
    ['0%', 'rgba(180,150,100,0)'],
    ['10%', 'rgba(200,165,110,0.35)'],
    ['18%', 'rgba(215,180,125,0.62)'],
    ['27%', 'rgba(200,168,112,0.48)'],
    ['36%', 'rgba(225,192,138,0.70)'],
    ['46%', 'rgba(205,172,118,0.55)'],
    ['55%', 'rgba(228,196,142,0.68)'],
    ['64%', 'rgba(208,175,120,0.52)'],
    ['73%', 'rgba(218,184,130,0.62)'],
    ['82%', 'rgba(202,168,115,0.42)'],
    ['90%', 'rgba(215,178,122,0.35)'],
    ['100%', 'rgba(180,150,100,0)'],
  ]
  for (const [offset, color] of ringStops) {
    const s = svgEl('stop')
    setAttrs(s, { offset, 'stop-color': color })
    ringGrad.appendChild(s)
  }
  defs.appendChild(ringGrad)

  // Ring shadow on planet (darkens where ring passes over body)
  const shadowGrad = svgEl('linearGradient')
  shadowGrad.id = `rngs-${id}`
  setAttrs(shadowGrad, { x1: '0%', y1: '0%', x2: '0%', y2: '100%' })
  addGradStop(shadowGrad, '0%', 'rgba(0,0,0,0)')
  addGradStop(shadowGrad, '45%', 'rgba(0,0,0,0)')
  addGradStop(shadowGrad, '55%', 'rgba(0,0,0,0.22)')
  addGradStop(shadowGrad, '100%', 'rgba(0,0,0,0)')
  defs.appendChild(shadowGrad)

  // Clip: back half of ring (below equator = behind planet)
  const backClip = svgEl('clipPath')
  backClip.id = `rnbc-${id}`
  const backRect = svgEl('rect')
  setAttrs(backRect, { x: cx - r * 1.9, y: cy, width: r * 3.8, height: r * 1.1 })
  backClip.appendChild(backRect)
  defs.appendChild(backClip)

  // Clip: front half of ring (above equator = in front of planet)
  const frontClip = svgEl('clipPath')
  frontClip.id = `rnfc-${id}`
  const frontRect = svgEl('rect')
  setAttrs(frontRect, { x: cx - r * 1.9, y: cy - r * 1.1, width: r * 3.8, height: r * 1.1 })
  frontClip.appendChild(frontRect)
  defs.appendChild(frontClip)

  // Planet body gradient
  const bodyGrad = svgEl('radialGradient')
  setAttrs(bodyGrad, { id: `rnpg-${id}`, cx: '40%', cy: '34%', r: '64%' })
  addGradStop(bodyGrad, '0%', '#e8f4fc')
  addGradStop(bodyGrad, '30%', '#b0d0ec')
  addGradStop(bodyGrad, '60%', '#6898cc')
  addGradStop(bodyGrad, '100%', '#1e4068')
  defs.appendChild(bodyGrad)

  addLimbGrad(defs, `rnlimb-${id}`, 0.6)
  addClip(defs, `rnpc-${id}`, cx, cy, r * 0.92)

  svg.appendChild(defs)

  // ── Ring back half ──
  const ringBack = svgEl('ellipse')
  setAttrs(ringBack, {
    cx,
    cy,
    rx: r * 1.72,
    ry: r * 0.38,
    fill: `url(#rng-${id})`,
    'clip-path': `url(#rnbc-${id})`,
  })
  svg.appendChild(ringBack)

  // ── Planet body ──
  const planet = svgEl('circle')
  setAttrs(planet, { cx, cy, r: r * 0.92, fill: `url(#rnpg-${id})` })
  svg.appendChild(planet)

  // Ice-like bands on body
  const bandG = svgEl('g')
  bandG.setAttribute('clip-path', `url(#rnpc-${id})`)
  for (const [oy, h, op] of [
    [-0.28, 0.14, 0.14],
    [-0.05, 0.12, 0.1],
    [0.16, 0.1, 0.12],
    [0.34, 0.09, 0.08],
  ] as [number, number, number][]) {
    const band = svgEl('rect')
    setAttrs(band, {
      x: cx - r,
      y: cy + r * oy,
      width: r * 2,
      height: r * h,
      fill: 'rgba(200,230,255,0.60)',
      opacity: op,
    })
    bandG.appendChild(band)
  }
  // Polar caps
  const pc = svgEl('ellipse')
  setAttrs(pc, { cx, cy: cy - r * 0.72, rx: r * 0.4, ry: r * 0.19, fill: 'rgba(240,252,255,0.76)' })
  bandG.appendChild(pc)
  svg.appendChild(bandG)

  // Ring shadow stripe cast on body
  const ringShadow = svgEl('circle')
  setAttrs(ringShadow, { cx, cy, r: r * 0.92, fill: `url(#rngs-${id})` })
  svg.appendChild(ringShadow)

  const limb = svgEl('circle')
  setAttrs(limb, { cx, cy, r: r * 0.92, fill: `url(#rnlimb-${id})` })
  svg.appendChild(limb)

  drawSpecular(svg, cx, cy, r, 'rgba(220,240,255,')

  // ── Ring front half ──
  const ringFront = svgEl('ellipse')
  setAttrs(ringFront, {
    cx,
    cy,
    rx: r * 1.72,
    ry: r * 0.38,
    fill: `url(#rng-${id})`,
    'clip-path': `url(#rnfc-${id})`,
  })
  svg.appendChild(ringFront)
}
