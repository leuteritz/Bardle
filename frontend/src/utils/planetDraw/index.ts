import type { PlanetType } from './types'
import { drawRocky } from './drawRocky'
import { drawIce } from './drawIce'
import { drawGasGiant } from './drawGasGiant'
import { drawLava } from './drawLava'
import { drawOcean } from './drawOcean'
import { drawDesert } from './drawDesert'
import { drawJungle } from './drawJungle'
import { drawRinged } from './drawRinged'
import { drawCrystal } from './drawCrystal'
import { drawToxic } from './drawToxic'
import { drawVoid } from './drawVoid'
import { drawAurora } from './drawAurora'
import { drawShattered } from './drawShattered'
import { drawStorm } from './drawStorm'
import { drawBloom } from './drawBloom'
import { drawNeon } from './drawNeon'
import { drawObsidian } from './drawObsidian'
import { drawCoral } from './drawCoral'

export function drawPlanet(
  svg: SVGSVGElement,
  id: string,
  type: PlanetType,
  cx: number,
  cy: number,
  r: number,
): void {
  switch (type) {
    case 'rocky':
      drawRocky(svg, id, cx, cy, r)
      break
    case 'ice':
      drawIce(svg, id, cx, cy, r)
      break
    case 'gas-giant':
      drawGasGiant(svg, id, cx, cy, r)
      break
    case 'lava':
      drawLava(svg, id, cx, cy, r)
      break
    case 'ocean':
      drawOcean(svg, id, cx, cy, r)
      break
    case 'desert':
      drawDesert(svg, id, cx, cy, r)
      break
    case 'jungle':
      drawJungle(svg, id, cx, cy, r)
      break
    case 'ringed':
      drawRinged(svg, id, cx, cy, r)
      break
    case 'crystal':
      drawCrystal(svg, id, cx, cy, r)
      break
    case 'toxic':
      drawToxic(svg, id, cx, cy, r)
      break
    case 'void':
      drawVoid(svg, id, cx, cy, r)
      break
    case 'aurora':
      drawAurora(svg, id, cx, cy, r)
      break
    case 'shattered':
      drawShattered(svg, id, cx, cy, r)
      break
    case 'storm':
      drawStorm(svg, id, cx, cy, r)
      break
    case 'bloom':
      drawBloom(svg, id, cx, cy, r)
      break
    case 'neon':
      drawNeon(svg, id, cx, cy, r)
      break
    case 'obsidian':
      drawObsidian(svg, id, cx, cy, r)
      break
    case 'coral':
      drawCoral(svg, id, cx, cy, r)
      break
  }
}

export { drawRocky, drawIce, drawGasGiant, drawLava, drawOcean, drawDesert, drawJungle, drawRinged }
export { drawCrystal, drawToxic, drawVoid, drawAurora, drawShattered }
export { drawStorm, drawBloom, drawNeon, drawObsidian, drawCoral }
export { NS, svgEl, setAttrs, addGradStop, pickConfig } from './svgHelpers'
export { PLANET_TYPE_CONFIGS, GAS_GIANT_PALETTES } from './types'
export type { PlanetType, PlanetTypeConfig } from './types'
