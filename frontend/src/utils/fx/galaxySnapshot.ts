/* ── Galaxy-Archive snapshot renderer ─────────────────────────────────────────
   Renders a completed galaxy's minimap as a still image (data URL) for the
   Bard-Stats "Galaxy Archive". Fully deterministic: it replays the seeded
   geometry the live minimap used (same mapSeed → same spiral, same star
   positions, same route), so no pixel data ever needs to be persisted —
   the tiny CompletedGalaxyRecord in the save is enough to reproduce the map. */

import {
  seededRng,
  galaxyGeo,
  galaxyPlaneToWorld,
  getGalaxyParticles,
  GALAXY_PARTICLE_COLORS,
  minimapAccentForTheme,
  drawPlanet,
  drawRouteArrowhead,
  generateGalaxyDots,
} from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  MINIMAP_TWINKLE_COUNT,
  MINIMAP_GALAXY_CORE_RADIUS,
  SNAPSHOT_ROUTE_ARROW_SIZE,
  SNAPSHOT_ROUTE_ARROW_GAP,
} from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/galaxyStore'

/** Logical snapshot size (rendered at 2× for crisp HiDPI display). */
export const GALAXY_SNAPSHOT_W = 320
export const GALAXY_SNAPSHOT_H = 200
const RENDER_SCALE = 2

const snapshotCache = new Map<string, string>()

export function renderGalaxySnapshot(record: CompletedGalaxyRecord): string {
  const key = `${record.galaxy}:${record.mapSeed}:${record.attemptResults.length}:${record.themeIndex}`
  const cached = snapshotCache.get(key)
  if (cached) return cached

  const w = GALAXY_SNAPSHOT_W
  const h = GALAXY_SNAPSHOT_H
  const canvas = document.createElement('canvas')
  canvas.width = w * RENDER_SCALE
  canvas.height = h * RENDER_SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0)

  const wToC = (wx: number, wy: number): [number, number] => [wx * w, wy * h]

  // ── Deep-space backdrop with a faint theme-tinted haze ──
  ctx.fillStyle = '#0b0806'
  ctx.fillRect(0, 0, w, h)
  const accent = minimapAccentForTheme(record.themeIndex)
  const haze = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6)
  haze.addColorStop(0, `rgba(${accent}, 0.06)`)
  haze.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = haze
  ctx.fillRect(0, 0, w, h)

  // ── Twinkling background stars, frozen mid-twinkle (same seed as live map) ──
  const twRng = seededRng(record.galaxy * 52361 + 7)
  for (let i = 0; i < MINIMAP_TWINKLE_COUNT; i++) {
    const tx = twRng() * w
    const ty = twRng() * h
    twRng() // phase (unused in the still image — keep rng order identical)
    twRng() // period
    const size = 0.8 + twRng() * 1.0
    const tint = twRng()
    const a = 0.2 + 0.55 * 0.5
    ctx.beginPath()
    ctx.arc(tx, ty, size, 0, Math.PI * 2)
    ctx.fillStyle =
      tint < 0.33
        ? `rgba(255, 233, 176, ${a.toFixed(3)})`
        : tint < 0.66
          ? `rgba(207, 224, 255, ${a.toFixed(3)})`
          : `rgba(255, 255, 255, ${a.toFixed(3)})`
    ctx.fill()
  }

  // ── Procedural spiral galaxy (core glow + seeded particles, additive) ──
  const geo = galaxyGeo(record.mapSeed)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const [gcx, gcy] = wToC(0.5, 0.5)
  const coreR = MINIMAP_GALAXY_CORE_RADIUS * w
  const coreBright = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, coreR * 0.55)
  coreBright.addColorStop(0, 'rgba(255, 240, 200, 0.35)')
  coreBright.addColorStop(1, 'rgba(255, 240, 200, 0)')
  ctx.fillStyle = coreBright
  ctx.fillRect(gcx - coreR, gcy - coreR, coreR * 2, coreR * 2)
  const halo = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, coreR * 1.9)
  halo.addColorStop(0, 'rgba(240, 205, 140, 0.1)')
  halo.addColorStop(1, 'rgba(240, 205, 140, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(gcx - coreR * 2, gcy - coreR * 2, coreR * 4, coreR * 4)
  for (const p of getGalaxyParticles(record.mapSeed)) {
    const wp = galaxyPlaneToWorld(geo, p.angle, p.r)
    const [px, py] = wToC(wp.x, wp.y)
    const rgb = p.color === 2 ? accent : GALAXY_PARTICLE_COLORS[p.color]
    ctx.beginPath()
    ctx.arc(px, py, p.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${rgb}, ${p.alpha.toFixed(3)})`
    ctx.fill()
  }
  ctx.restore()

  // ── The journey: spawn → every attempted star → the freed galaxy core ──
  const attempts = record.attemptResults.length
  const { spawn, dots } = generateGalaxyDots(record.mapSeed, attempts + 1)
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(232, 192, 64, 0.55)'
  ctx.lineWidth = 1.6
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const [spx, spy] = wToC(spawn.x, spawn.y)
  ctx.moveTo(spx, spy)
  for (let i = 0; i < attempts; i++) {
    const [sx, sy] = wToC(dots[i].x, dots[i].y)
    ctx.lineTo(sx, sy)
  }
  ctx.lineTo(gcx, gcy)
  ctx.stroke()

  // Chevron per flown leg (incl. the final approach to the freed core) so the
  // archived journey stays readable as a directed trail.
  {
    let [ax, ay] = [spx, spy]
    for (let i = 0; i <= attempts; i++) {
      const [sx, sy] = i < attempts ? wToC(dots[i].x, dots[i].y) : [gcx, gcy]
      drawRouteArrowhead(
        ctx,
        ax,
        ay,
        sx,
        sy,
        SNAPSHOT_ROUTE_ARROW_GAP,
        SNAPSHOT_ROUTE_ARROW_SIZE,
        'rgba(240, 205, 96, 0.85)',
        1.6,
      )
      ;[ax, ay] = [sx, sy]
    }
  }

  // Spawn marker: small warm departure dot with a gold ring
  const spawnGlow = ctx.createRadialGradient(spx, spy, 0, spx, spy, 8)
  spawnGlow.addColorStop(0, 'rgba(255, 214, 120, 0.6)')
  spawnGlow.addColorStop(1, 'rgba(255, 214, 120, 0)')
  ctx.beginPath()
  ctx.arc(spx, spy, 8, 0, Math.PI * 2)
  ctx.fillStyle = spawnGlow
  ctx.fill()
  ctx.beginPath()
  ctx.arc(spx, spy, 2.4, 0, Math.PI * 2)
  ctx.fillStyle = '#fff2c8'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(spx, spy, 4.6, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(232, 192, 64, 0.7)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Star markers — rescued ✦ / failed ✕, same seeds and radii as the live map
  const galaxySeed = record.galaxy * 10007
  for (let i = 0; i < attempts; i++) {
    const [sx, sy] = wToC(dots[i].x, dots[i].y)
    if (record.attemptResults[i] === 'failed') {
      drawPlanet(ctx, sx, sy, 7, galaxySeed + i, 'failed')
    } else {
      drawPlanet(ctx, sx, sy, 8.5, galaxySeed + i, 'rescued')
    }
  }

  // Freed galaxy core: the defeated boss star, now golden and at peace
  const coreGlow = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, 22)
  coreGlow.addColorStop(0, 'rgba(255, 220, 90, 0.55)')
  coreGlow.addColorStop(0.6, 'rgba(255, 180, 40, 0.16)')
  coreGlow.addColorStop(1, 'rgba(255, 160, 20, 0)')
  ctx.beginPath()
  ctx.arc(gcx, gcy, 22, 0, Math.PI * 2)
  ctx.fillStyle = coreGlow
  ctx.fill()
  drawPlanet(ctx, gcx, gcy, 10, galaxySeed + 991, 'rescued')

  const url = canvas.toDataURL('image/png')
  snapshotCache.set(key, url)
  return url
}
