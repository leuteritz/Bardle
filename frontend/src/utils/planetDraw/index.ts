import type { PlanetType } from '@/utils/planetDraw/types'
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
export { NS, svgEl, setAttrs, addGradStop, pickConfig } from '@/utils/planetDraw/svgHelpers'
export { PLANET_TYPE_CONFIGS, GAS_GIANT_PALETTES } from '@/utils/planetDraw/types'
export type { PlanetType, PlanetTypeConfig } from '@/utils/planetDraw/types'
