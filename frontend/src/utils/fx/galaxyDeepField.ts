/* ── Tiefenfeld der grossen Voyages-Karte ─────────────────────────────────────
   Das Sternenfeld der Platte wuchs mit der FLÄCHE: 30 Punkte auf dem 320×200-
   Standbild, aber 1955 auf einer 4K-Bühne — mehr Hintergrundsterne als die
   Galaxie Partikel hat, jeder heller und dicker als die Armpartikel darunter.
   Die Spirale verschwand darin.

   Hier wächst die Zahl mit der KANTE (`k`), nicht mit der Fläche, sie verteilt
   sich auf drei Helligkeitsebenen, und über der Scheibe hält eine Freizone die
   Arme frei. Die Aussparung folgt der ECHTEN Scheibe — geneigt und gestaucht
   wie `galaxyPlaneToWorld` sie malt —, nicht einem Kreis.

   Rechnen und Malen sind getrennt: Canvas ist unter jsdom nicht malbar, die
   Verteilung wird aber gebunden (`__tests__/utils/fx/galaxyDeepField.spec.ts`). */

import { seededRng, galaxyDiscDistance } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import type { GalaxyGeo } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  GALAXY_DEEPFIELD_FAR,
  GALAXY_DEEPFIELD_MID,
  GALAXY_DEEPFIELD_ANCHOR,
  GALAXY_DEEPFIELD_ANCHOR_MAX,
  GALAXY_DEEPFIELD_SIZE_DAMP,
  GALAXY_DEEPFIELD_CLEAR_INNER,
  GALAXY_DEEPFIELD_CLEAR_OUTER,
  GALAXY_DEEPFIELD_CLEAR_FLOOR,
  GALAXY_DEEPFIELD_VIGNETTE,
} from '@/config/constants'
import type { FitBox } from './galaxyPlate'

export interface DeepStar {
  x: number
  y: number
  r: number
  alpha: number
  rgb: string
  /** Armlänge des Glanzkreuzes — > 0 nur bei Ankersternen. */
  spike: number
  /** Abstand vom Scheibenmittelpunkt in Scheibenradien, 1 = Rand. */
  disc: number
}

const WARM = '255, 233, 176'
const COOL = '207, 224, 255'
const PLAIN = '255, 255, 255'

/**
 * Drei Ebenen, drei EIGENE Zufallsströme. Ein gemeinsamer liesse beim Resize die
 * ganze Verteilung springen: die geänderte Zahl der Fernsterne verschöbe den
 * Strom der mittleren. Getrennt wächst jede Ebene nur an ihrem Ende.
 */
const LAYERS = [
  { base: GALAXY_DEEPFIELD_FAR, salt: 1, rMin: 0.45, rSpan: 0.35, aMin: 0.1, aSpan: 0.12 },
  { base: GALAXY_DEEPFIELD_MID, salt: 2, rMin: 0.85, rSpan: 0.5, aMin: 0.24, aSpan: 0.16 },
  { base: GALAXY_DEEPFIELD_ANCHOR, salt: 3, rMin: 1.4, rSpan: 0.6, aMin: 0.55, aSpan: 0.25 },
] as const

const ANCHOR_LAYER = LAYERS.length - 1

function smoothstep(a: number, b: number, t: number): number {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}

/**
 * @param k Massstab der Platte (`box.w / GALAXY_PLATE_REF_W`) — er trägt hier
 *          die ANZAHL, nicht nur die Grösse: die Zahl soll mit der Kante wachsen.
 */
export function buildDeepField(
  w: number,
  h: number,
  k: number,
  seed: number,
  geo: GalaxyGeo,
  box: FitBox,
  accent: string,
): DeepStar[] {
  const stars: DeepStar[] = []
  if (w <= 0 || h <= 0 || box.w <= 0 || box.h <= 0) return stars
  const sizeMul = 1 + Math.max(0, k - 1) * GALAXY_DEEPFIELD_SIZE_DAMP

  for (let li = 0; li < LAYERS.length; li++) {
    const layer = LAYERS[li]
    const anchor = li === ANCHOR_LAYER
    let n = Math.round(layer.base * Math.max(1, k))
    if (anchor) n = Math.min(n, GALAXY_DEEPFIELD_ANCHOR_MAX)
    const rng = seededRng(seed * 74221 + 13 + layer.salt)

    for (let i = 0; i < n; i++) {
      // Immer alle fünf Werte ziehen, auch für Verworfene — sonst wandert der
      // Strom mit der Ablehnungsquote.
      const x = rng() * w
      const y = rng() * h
      const roll = rng()
      const tint = rng()
      const keepRoll = rng()

      const disc = galaxyDiscDistance(geo, (x - box.x) / box.w, (y - box.y) / box.h)
      // Ankersterne bleiben draussen: innerhalb der Scheibe läse sich ein heller
      // Punkt mit Kreuz als Landmarke.
      if (anchor && disc <= 1) continue
      const keep = smoothstep(GALAXY_DEEPFIELD_CLEAR_INNER, GALAXY_DEEPFIELD_CLEAR_OUTER, disc)
      if (keepRoll > Math.max(keep, GALAXY_DEEPFIELD_CLEAR_FLOOR)) continue

      const r = (layer.rMin + roll * layer.rSpan) * sizeMul
      stars.push({
        x,
        y,
        r,
        alpha: (layer.aMin + roll * layer.aSpan) * (0.4 + 0.6 * keep),
        rgb: anchor && tint < 0.34 ? accent : tint < 0.3 ? WARM : tint < 0.62 ? COOL : PLAIN,
        spike: anchor ? r * 4.5 : 0,
        disc,
      })
    }
  }
  return stars
}

function paintSpikes(ctx: CanvasRenderingContext2D, s: DeepStar): void {
  const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3)
  halo.addColorStop(0, `rgba(${s.rgb}, ${(s.alpha * 0.34).toFixed(3)})`)
  halo.addColorStop(1, `rgba(${s.rgb}, 0)`)
  ctx.fillStyle = halo
  ctx.fillRect(s.x - s.r * 3, s.y - s.r * 3, s.r * 6, s.r * 6)

  const tip = `rgba(${s.rgb}, ${(s.alpha * 0.55).toFixed(3)})`
  const fade = `rgba(${s.rgb}, 0)`
  ctx.lineWidth = Math.max(0.5, s.r * 0.28)
  for (const axis of [0, 1]) {
    const dx = axis === 0 ? s.spike : 0
    const dy = axis === 0 ? 0 : s.spike
    const g = ctx.createLinearGradient(s.x - dx, s.y - dy, s.x + dx, s.y + dy)
    g.addColorStop(0, fade)
    g.addColorStop(0.5, tip)
    g.addColorStop(1, fade)
    ctx.strokeStyle = g
    ctx.beginPath()
    ctx.moveTo(s.x - dx, s.y - dy)
    ctx.lineTo(s.x + dx, s.y + dy)
    ctx.stroke()
  }
}

export function paintDeepField(
  ctx: CanvasRenderingContext2D,
  stars: DeepStar[],
  w: number,
  h: number,
): void {
  ctx.save()
  ctx.lineCap = 'round'
  for (const s of stars) {
    if (s.spike > 0) paintSpikes(ctx, s)
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${s.rgb}, ${s.alpha.toFixed(3)})`
    ctx.fill()
  }
  ctx.restore()

  // Der Rand tritt zurück, damit die Scheibe die Mitte behält. Liegt VOR dem
  // Galaxiekörper, dämpft also nur Tiefraum und Sterne.
  const vig = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.32,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.72,
  )
  vig.addColorStop(0, 'rgba(6, 4, 3, 0)')
  vig.addColorStop(1, `rgba(6, 4, 3, ${GALAXY_DEEPFIELD_VIGNETTE})`)
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, w, h)
}
