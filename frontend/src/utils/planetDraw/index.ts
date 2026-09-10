import type { PlanetType } from '@/utils/planetDraw/types'
import { PLANET_ORNAMENTS } from '@/utils/planetDraw/ornaments'
import {
  svgEl,
  setAttrs,
  seedRoll,
  planMoons,
  paintMoons,
  planRing,
  paintRing,
  addShards,
  rollIn,
  pickOne,
} from '@/utils/planetDraw/svgHelpers'
import { drawRocky } from '@/utils/planetDraw/drawRocky'
import { drawIce } from '@/utils/planetDraw/drawIce'
import { drawGasGiant } from '@/utils/planetDraw/drawGasGiant'
import { drawLava } from '@/utils/planetDraw/drawLava'
import { drawOcean } from '@/utils/planetDraw/drawOcean'
import { drawDesert } from '@/utils/planetDraw/drawDesert'
import { drawJungle } from '@/utils/planetDraw/drawJungle'
import { drawRinged } from '@/utils/planetDraw/drawRinged'
import { drawCrystal } from '@/utils/planetDraw/drawCrystal'
import { drawToxic } from '@/utils/planetDraw/drawToxic'
import { drawVoid } from '@/utils/planetDraw/drawVoid'
import { drawAurora } from '@/utils/planetDraw/drawAurora'
import { drawShattered } from '@/utils/planetDraw/drawShattered'
import { drawStorm } from '@/utils/planetDraw/drawStorm'
import { drawBloom } from '@/utils/planetDraw/drawBloom'
import { drawNeon } from '@/utils/planetDraw/drawNeon'
import { drawObsidian } from '@/utils/planetDraw/drawObsidian'
import { drawCoral } from '@/utils/planetDraw/drawCoral'

type Painter = (
  svg: SVGSVGElement,
  id: string,
  cx: number,
  cy: number,
  r: number,
  seed?: number,
) => void

const PAINTERS: Record<PlanetType, Painter> = {
  rocky: drawRocky,
  ice: drawIce,
  'gas-giant': drawGasGiant,
  lava: drawLava,
  ocean: drawOcean,
  desert: drawDesert,
  jungle: drawJungle,
  ringed: drawRinged,
  crystal: drawCrystal,
  toxic: drawToxic,
  void: drawVoid,
  aurora: drawAurora,
  shattered: drawShattered,
  storm: drawStorm,
  bloom: drawBloom,
  neon: drawNeon,
  obsidian: drawObsidian,
  coral: drawCoral,
}

/**
 * Abplattung durch Eigendrehung — die beiden Riesen sind sichtbar oval, und das
 * ist der Unterschied, den man auf 24 px noch liest.
 */
const PLANET_OBLATE: Partial<Record<PlanetType, number>> = {
  storm: 0.9,
  'gas-giant': 0.94,
}

/**
 * Farbdrift: derselbe Typ, ein anderer Himmel. Ein duenner Schleier ueber dem
 * fertigen Koerper verschiebt den Gesamtton, ohne dass 18 Farbtafeln aufgehen.
 */
const TONE_DRIFTS = [
  'rgba(255,190,120,',
  'rgba(140,190,255,',
  'rgba(190,150,255,',
  'rgba(150,255,205,',
  'rgba(255,255,255,',
] as const

/** Alles, was der Painter angehaengt hat, in EINE Gruppe fassen. */
function wrapFrom(svg: SVGSVGElement, from: number, transform: string): void {
  const g = svgEl('g')
  g.setAttribute('transform', transform)
  const moved = Array.from(svg.childNodes).slice(from)
  for (const node of moved) g.appendChild(node)
  svg.appendChild(g)
}

/** Eigener Wurfstrom fuer den Zierrat — sonst laege der Mond auf dem Bandversatz. */
function ornamentSeed(seed: number | undefined): number | undefined {
  return seed === undefined ? undefined : (seed ^ 0x9e3779b9) >>> 0
}

/**
 * Ein Planet: Zierrat hinter dem Koerper, der Typ-Painter, Zierrat davor.
 * Alles Gewuerfelte haengt am SEED, nie am Radius — klein und Hero kreuzblenden
 * und muessen deckungsgleich sein.
 */
export function drawPlanet(
  svg: SVGSVGElement,
  id: string,
  type: PlanetType,
  cx: number,
  cy: number,
  r: number,
  seed?: number,
): void {
  const orn = PLANET_ORNAMENTS[type]
  const roll = seedRoll(ornamentSeed(seed))
  const moons = orn?.moons ? planMoons(cx, cy, r, roll, orn.moons) : null
  const ring = orn?.ring ? planRing(roll, orn.ring) : null

  if (orn && (moons || ring)) {
    const defs = svgEl('defs')
    svg.appendChild(defs)
    if (ring && orn.ring) paintRing(svg, defs, id, cx, cy, r, orn.ring, ring, false)
    if (moons && orn.moons) paintMoons(svg, moons, orn.moons, false)
  }

  const before = svg.childNodes.length
  PAINTERS[type](svg, id, cx, cy, r, seed)
  const oblate = PLANET_OBLATE[type]
  if (oblate !== undefined) {
    wrapFrom(svg, before, `translate(${cx} ${cy}) scale(1 ${oblate}) translate(${-cx} ${-cy})`)
  }

  const toneAlpha = rollIn(roll, 0, 0.1)
  if (toneAlpha > 0.02) {
    const tone = svgEl('circle')
    setAttrs(tone, {
      cx,
      cy,
      r: r * 0.92,
      fill: `${pickOne(roll, TONE_DRIFTS)}${toneAlpha.toFixed(3)})`,
    })
    svg.appendChild(tone)
  }

  if (orn && (moons || ring || orn.shards)) {
    const defs = svgEl('defs')
    svg.appendChild(defs)
    if (ring && orn.ring) paintRing(svg, defs, id, cx, cy, r, orn.ring, ring, true)
    if (moons && orn.moons) paintMoons(svg, moons, orn.moons, true)
    if (orn.shards) addShards(svg, cx, cy, r, roll, orn.shards)
  }
}

export { drawRocky, drawIce, drawGasGiant, drawLava, drawOcean, drawDesert, drawJungle, drawRinged }
export { drawCrystal, drawToxic, drawVoid, drawAurora, drawShattered }
export { drawStorm, drawBloom, drawNeon, drawObsidian, drawCoral }
export { NS, svgEl, setAttrs, addGradStop, pickConfig } from '@/utils/planetDraw/svgHelpers'
export { seedRoll, rollIn, pickOne } from '@/utils/planetDraw/svgHelpers'
export {
  PLANET_TYPE_CONFIGS,
  GAS_GIANT_PALETTES,
  PLANET_TYPE_TINT,
  planetSizeFactor,
} from '@/utils/planetDraw/types'
export { PLANET_ORNAMENTS } from '@/utils/planetDraw/ornaments'
export type { PlanetType, PlanetTypeConfig, PlanetTint } from '@/utils/planetDraw/types'
