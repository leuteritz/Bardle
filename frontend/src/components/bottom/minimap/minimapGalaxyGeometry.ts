/* ── Shared minimap galaxy geometry & drawing ─────────────────────────────────
   Pure, seeded helpers used by BOTH the live MiniMapCanvas and the offscreen
   galaxy-snapshot renderer (Bard-Stats "Galaxy Archive"). Everything here is
   deterministic: same seed → identical galaxy shape, star placement and look,
   so an archived galaxy re-renders exactly as it was played. */

import {
  MINIMAP_GALAXY_ARMS_MIN,
  MINIMAP_GALAXY_ARMS_MAX,
  MINIMAP_GALAXY_PARTICLES,
  MINIMAP_GALAXY_RADIUS,
  MINIMAP_GALAXY_INNER_RADIUS,
  MINIMAP_GALAXY_SWIRL_TURNS,
  MINIMAP_GALAXY_SQUASH,
  MINIMAP_GALAXY_BULGE_R,
  MINIMAP_GALAXY_KNOTS,
  MINIMAP_GALAXY_BRIGHT_STARS,
} from '@/config/constants'
import { GALAXY_THEMES } from '@/config/galaxyThemes'

export function seededRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

export interface DotPos {
  x: number
  y: number
}

/* ── Procedural spiral galaxy ──────────────────────────────────────────────
   Shared geometry: the particle renderer AND generateGalaxyDots() sample the
   same seeded spiral, so the rescue stars always sit on the galaxy's arms. */

export interface GalaxyGeo {
  arms: number
  tilt: number
  twist: number
  squash: number
  radiusScale: number
  armPhase: number // Grundwinkel der Arme (entkoppelt Form von Rotation)
  armSpread: number // Streubreite der Arm-Partikel (eng gebündelt ↔ diffus)
  barLen: number // > 0 → Balkenspirale: Zentralbalken in Galaxy-Plane-Einheiten
}

// Vier Formfamilien statt "immer dieselbe Spirale, nur gedreht": klassische
// Spirale, mehrarmige Spirale, Balkenspirale, lockere weit geöffnete Spirale.
// Geseedet mit dem per-Run-mapSeed → jede Galaxie sieht in jedem Durchlauf
// anders aus, bleibt aber über Reloads stabil.
export function galaxyGeo(seed: number): GalaxyGeo {
  const rng = seededRng(seed * 40093 + 11)
  const form = rng()
  let arms: number
  let twistMul: number
  let spread: number
  let barLen = 0
  if (form < 0.3) {
    // Klassische Spirale — 2–3 klar gezeichnete Arme
    arms = rng() < 0.55 ? MINIMAP_GALAXY_ARMS_MIN : MINIMAP_GALAXY_ARMS_MIN + 1
    twistMul = 0.9 + rng() * 0.45
    spread = 0.85 + rng() * 0.3
  } else if (form < 0.55) {
    // Mehrarmige Spirale — viele kurze, enger gewundene Arme
    arms = Math.max(MINIMAP_GALAXY_ARMS_MAX, 4) + (rng() < 0.4 ? 1 : 0)
    twistMul = 0.55 + rng() * 0.3
    spread = 0.7 + rng() * 0.25
  } else if (form < 0.8) {
    // Balkenspirale — zwei Arme, die an den Enden des Zentralbalkens ansetzen
    arms = 2
    twistMul = 0.75 + rng() * 0.4
    spread = 0.8 + rng() * 0.3
    barLen = MINIMAP_GALAXY_INNER_RADIUS * (1.5 + rng() * 0.8)
  } else {
    // Lockere Spirale — weit geöffnete, diffuse Arme
    arms = rng() < 0.5 ? MINIMAP_GALAXY_ARMS_MIN : MINIMAP_GALAXY_ARMS_MIN + 1
    twistMul = 0.45 + rng() * 0.3
    spread = 1.25 + rng() * 0.45
  }
  return {
    arms,
    tilt: rng() * Math.PI,
    twist: (MINIMAP_GALAXY_SWIRL_TURNS + (rng() - 0.5) * 0.9) * twistMul,
    squash: MINIMAP_GALAXY_SQUASH + (rng() - 0.5) * 0.3,
    radiusScale: 0.88 + rng() * 0.22,
    armPhase: rng() * Math.PI * 2,
    armSpread: spread,
    barLen,
  }
}

/** Galaxy-plane polar coords → world (0..1) coords: squash, tilt, center. */
export function galaxyPlaneToWorld(geo: GalaxyGeo, angle: number, r: number): DotPos {
  const px = Math.cos(angle) * r
  const py = Math.sin(angle) * r * geo.squash
  const cosT = Math.cos(geo.tilt)
  const sinT = Math.sin(geo.tilt)
  return { x: 0.5 + px * cosT - py * sinT, y: 0.5 + px * sinT + py * cosT }
}

/** Centerline angle of a spiral arm at normalized radius t (0 core → 1 rim). */
export function armAngle(geo: GalaxyGeo, arm: number, t: number): number {
  return geo.armPhase + (arm / geo.arms) * Math.PI * 2 + t * geo.twist * Math.PI * 2
}

/** Arm radius in galaxy-plane units at normalized t. */
export function armRadius(geo: GalaxyGeo, t: number): number {
  return (
    (MINIMAP_GALAXY_INNER_RADIUS +
      t * (MINIMAP_GALAXY_RADIUS - MINIMAP_GALAXY_INNER_RADIUS)) *
    geo.radiusScale
  )
}

export interface GalaxyParticle {
  angle: number // galaxy-plane polar angle (pre-rotation)
  r: number // galaxy-plane radius
  size: number
  color: number // 0 warm gold, 1 star white, 2 galaxy accent
  alpha: number
}

export const GALAXY_PARTICLE_COLORS = ['240, 214, 160', '255, 246, 228']

let galaxyParticleCache: GalaxyParticle[] = []
let galaxyParticleCacheKey = -1

export function getGalaxyParticles(seed: number): GalaxyParticle[] {
  if (galaxyParticleCacheKey === seed) return galaxyParticleCache
  const geo = galaxyGeo(seed)
  const rng = seededRng(seed * 91127 + 3)
  const gauss = () => rng() + rng() + rng() - 1.5
  const parts: GalaxyParticle[] = []

  const bulgeN = Math.round(MINIMAP_GALAXY_PARTICLES * 0.24)
  const hazeN = Math.round(MINIMAP_GALAXY_PARTICLES * 0.14)
  const barN = geo.barLen > 0 ? Math.round(MINIMAP_GALAXY_PARTICLES * 0.1) : 0
  const armN =
    MINIMAP_GALAXY_PARTICLES -
    bulgeN -
    hazeN -
    barN -
    MINIMAP_GALAXY_KNOTS -
    MINIMAP_GALAXY_BRIGHT_STARS

  // Dense warm bulge around the core
  for (let i = 0; i < bulgeN; i++) {
    parts.push({
      angle: rng() * Math.PI * 2,
      r: Math.abs(gauss()) * MINIMAP_GALAXY_BULGE_R * geo.radiusScale,
      size: 0.5 + rng() * 1.2,
      color: rng() < 0.75 ? 0 : 1,
      alpha: 0.22 + rng() * 0.3,
    })
  }

  // Balkenspirale: leuchtender Zentralbalken, an dessen Enden die Arme ansetzen
  for (let i = 0; i < barN; i++) {
    const along = gauss() * 0.55
    parts.push({
      angle: geo.armPhase + (along >= 0 ? 0 : Math.PI) + gauss() * 0.14,
      r: Math.min(Math.abs(along), 1) * geo.barLen,
      size: 0.5 + rng() * 1.1,
      color: rng() < 0.7 ? 0 : 1,
      alpha: 0.28 + rng() * 0.26,
    })
  }

  // Spiral arms: tight scatter around the centerline, warm → accent outward
  for (let i = 0; i < armN; i++) {
    const arm = i % geo.arms
    const t = Math.pow(rng(), 0.85)
    const tint = rng()
    parts.push({
      angle: armAngle(geo, arm, t) + gauss() * (0.42 - 0.22 * t) * geo.armSpread,
      r: armRadius(geo, t) + gauss() * 0.012,
      size: 0.5 + rng() * 1.1,
      color: t < 0.35 ? (tint < 0.7 ? 0 : 1) : tint < 0.45 ? 1 : tint < 0.8 ? 2 : 0,
      alpha: (0.55 - 0.3 * t) * (0.7 + 0.3 * rng()),
    })
  }

  // Bright accent-colored star-forming knots dotted along the arms
  for (let k = 0; k < MINIMAP_GALAXY_KNOTS; k++) {
    const arm = k % geo.arms
    const t = 0.25 + rng() * 0.65
    parts.push({
      angle: armAngle(geo, arm, t) + gauss() * 0.08,
      r: armRadius(geo, t) + gauss() * 0.008,
      size: 1.8 + rng() * 1.2,
      color: 2,
      alpha: 0.4 + rng() * 0.2,
    })
  }

  // Distinct single background stars strung along the arms
  for (let s = 0; s < MINIMAP_GALAXY_BRIGHT_STARS; s++) {
    const arm = s % geo.arms
    const t = 0.12 + rng() * 0.85
    parts.push({
      angle: armAngle(geo, arm, t) + gauss() * 0.11,
      r: armRadius(geo, t) + gauss() * 0.01,
      size: 1.1 + rng() * 0.9,
      color: rng() < 0.55 ? 1 : 2,
      alpha: 0.5 + rng() * 0.35,
    })
  }

  // Faint disk haze between the arms
  for (let i = 0; i < hazeN; i++) {
    parts.push({
      angle: rng() * Math.PI * 2,
      r: Math.sqrt(rng()) * MINIMAP_GALAXY_RADIUS * geo.radiusScale,
      size: 0.4 + rng() * 0.8,
      color: rng() < 0.6 ? 0 : 1,
      alpha: 0.05 + rng() * 0.07,
    })
  }

  galaxyParticleCache = parts
  galaxyParticleCacheKey = seed
  return parts
}

// Leuchtender Minimap-Akzent aus der Akzentfarbe des aktuellen Galaxie-Themes:
// Farbton bleibt erhalten, die (bewusst dunkle) Theme-Farbe wird für die
// additiven Partikel auf Leuchtkraft skaliert und leicht Richtung Weiß gehoben.
let themeAccentCache = ''
let themeAccentCacheKey = -1

export function minimapAccentForTheme(themeIndex: number): string {
  if (themeAccentCacheKey === themeIndex) return themeAccentCache
  const hex = GALAXY_THEMES[themeIndex % GALAXY_THEMES.length].accentColor
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const scale = 225 / Math.max(r, g, b, 1)
  const lift = (v: number) => Math.round(v * scale + (255 - v * scale) * 0.22)
  themeAccentCache = `${lift(r)}, ${lift(g)}, ${lift(b)}`
  themeAccentCacheKey = themeIndex
  return themeAccentCache
}

/* ── Star / planet marker rendering ──────────────────────────────────────── */

export const STAR_PALETTE = {
  base: '#e87820',
  shadow: '#5a1802',
  highlight: '#ffb860',
  atmo: 'rgba(240,140,30,0.6)',
  ring: false,
}

export const PLANET_PALETTES = [
  {
    base: '#d4723a',
    shadow: '#5a1a04',
    highlight: '#f4a870',
    atmo: 'rgba(220,100,40,0.5)',
    ring: false,
  },
  {
    base: '#5090d8',
    shadow: '#102860',
    highlight: '#90c8ff',
    atmo: 'rgba(70,140,240,0.45)',
    ring: false,
  },
  {
    base: '#42b850',
    shadow: '#0e3a14',
    highlight: '#80e888',
    atmo: 'rgba(50,200,70,0.4)',
    ring: false,
  },
  {
    base: '#9050d0',
    shadow: '#200850',
    highlight: '#c080ff',
    atmo: 'rgba(150,70,220,0.45)',
    ring: true,
  },
  {
    base: '#d04a14',
    shadow: '#480802',
    highlight: '#ff8040',
    atmo: 'rgba(220,80,20,0.5)',
    ring: false,
  },
  {
    base: '#38a8cc',
    shadow: '#0a2840',
    highlight: '#70d8ff',
    atmo: 'rgba(50,180,220,0.4)',
    ring: false,
  },
  {
    base: '#98cc3a',
    shadow: '#203808',
    highlight: '#ccff60',
    atmo: 'rgba(160,220,50,0.4)',
    ring: false,
  },
  {
    base: '#c89040',
    shadow: '#3a2004',
    highlight: '#ffcc70',
    atmo: 'rgba(210,160,50,0.4)',
    ring: true,
  },
  {
    base: '#e05888',
    shadow: '#500820',
    highlight: '#ff90c0',
    atmo: 'rgba(220,80,130,0.45)',
    ring: false,
  },
  {
    base: '#40c8a8',
    shadow: '#0a2c20',
    highlight: '#80ffe0',
    atmo: 'rgba(50,200,170,0.4)',
    ring: false,
  },
]

export function drawPlanet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  seed: number,
  state: 'unrescued' | 'rescued' | 'target' | 'failed',
  pulse = false,
  palOverride?: typeof STAR_PALETTE,
) {
  const rng = seededRng(seed >>> 0)
  const pal = palOverride ?? PLANET_PALETTES[Math.floor(rng() * PLANET_PALETTES.length)]
  const glowMult =
    state === 'target' ? (pulse ? 2.5 : 2.1) : state === 'rescued' ? 1.9 : state === 'failed' ? 1.45 : 1.55
  const glowR = r * glowMult
  const atmoGrad = ctx.createRadialGradient(x, y, r * 0.7, x, y, glowR)
  if (state === 'rescued') {
    atmoGrad.addColorStop(0, 'rgba(255,210,50,0.55)')
    atmoGrad.addColorStop(0.55, 'rgba(255,170,20,0.18)')
    atmoGrad.addColorStop(1, 'rgba(255,140,0,0)')
  } else if (state === 'failed') {
    atmoGrad.addColorStop(0, 'rgba(200,60,40,0.28)')
    atmoGrad.addColorStop(0.6, 'rgba(160,40,25,0.1)')
    atmoGrad.addColorStop(1, 'rgba(120,30,20,0)')
  } else if (state === 'target') {
    const baseAtmo = pal.atmo
    const dimAtmo = baseAtmo.replace(/[\d.]+\)$/, '0.12)')
    atmoGrad.addColorStop(0, baseAtmo)
    atmoGrad.addColorStop(0.55, dimAtmo)
    atmoGrad.addColorStop(1, 'rgba(0,0,0,0)')
  } else {
    const dimAtmo = pal.atmo.replace(/[\d.]+\)$/, '0.28)')
    atmoGrad.addColorStop(0, dimAtmo)
    atmoGrad.addColorStop(1, 'rgba(0,0,0,0)')
  }
  ctx.beginPath()
  ctx.arc(x, y, glowR, 0, Math.PI * 2)
  ctx.fillStyle = atmoGrad
  ctx.fill()

  const lx = x - r * 0.3
  const ly = y - r * 0.32
  const bodyGrad = ctx.createRadialGradient(lx, ly, r * 0.05, x, y, r)
  if (state === 'rescued') {
    bodyGrad.addColorStop(0, '#ffffc8')
    bodyGrad.addColorStop(0.35, '#e8c040')
    bodyGrad.addColorStop(0.72, '#8a5810')
    bodyGrad.addColorStop(1, '#1e0e02')
  } else if (state === 'failed') {
    // Burnt-out husk: desaturated ember tones, clearly "lost", never golden
    bodyGrad.addColorStop(0, '#7a5a50')
    bodyGrad.addColorStop(0.45, '#4a2c24')
    bodyGrad.addColorStop(1, '#140806')
  } else {
    bodyGrad.addColorStop(0, pal.highlight)
    bodyGrad.addColorStop(0.45, pal.base)
    bodyGrad.addColorStop(1, pal.shadow)
  }
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = bodyGrad
  ctx.fill()

  if (r >= 7) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, r - 0.5, 0, Math.PI * 2)
    ctx.clip()
    ctx.globalAlpha = state === 'rescued' ? 0.07 : 0.14
    ctx.beginPath()
    ctx.ellipse(x, y - r * 0.28, r * 0.88, r * 0.12, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.24, r * 0.82, r * 0.1, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fill()
    ctx.restore()
  }

  if (pal.ring && state !== 'rescued' && state !== 'failed') {
    ctx.save()
    ctx.globalAlpha = state === 'target' ? (pulse ? 0.78 : 0.62) : 0.48
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.75, r * 0.38, -0.28, 0, Math.PI * 2)
    ctx.strokeStyle = pal.highlight
    ctx.lineWidth = state === 'target' ? 2 : 1.3
    ctx.stroke()
    ctx.globalAlpha *= 0.5
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.42, r * 0.3, -0.28, 0, Math.PI * 2)
    ctx.lineWidth = 0.7
    ctx.stroke()
    ctx.restore()
  }

  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  if (state === 'target') {
    ctx.strokeStyle = pulse ? '#ffffff' : 'rgba(255,255,255,0.78)'
    ctx.lineWidth = pulse ? 2 : 1.5
    ctx.shadowColor = 'rgba(255,255,255,0.9)'
    ctx.shadowBlur = pulse ? 16 : 8
  } else if (state === 'rescued') {
    ctx.strokeStyle = '#fff8c0'
    ctx.lineWidth = 1.5
    ctx.shadowColor = 'rgba(255,210,60,0.85)'
    ctx.shadowBlur = 9
  } else if (state === 'failed') {
    ctx.strokeStyle = 'rgba(220,90,60,0.6)'
    ctx.lineWidth = 1.2
    ctx.shadowColor = 'rgba(200,60,30,0.6)'
    ctx.shadowBlur = 5
  } else {
    ctx.strokeStyle = 'rgba(200,210,235,0.62)'
    ctx.lineWidth = 1
    ctx.shadowBlur = 0
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  if (state === 'target') {
    const gap = r + 3.5
    const arm = r * 0.7
    ctx.strokeStyle = pulse ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1
    ctx.shadowColor = 'rgba(255,255,255,0.75)'
    ctx.shadowBlur = pulse ? 9 : 4
    ctx.beginPath()
    ctx.moveTo(x, y - gap - arm)
    ctx.lineTo(x, y - gap)
    ctx.moveTo(x, y + gap)
    ctx.lineTo(x, y + gap + arm)
    ctx.moveTo(x - gap - arm, y)
    ctx.lineTo(x - gap, y)
    ctx.moveTo(x + gap, y)
    ctx.lineTo(x + gap + arm, y)
    ctx.stroke()
    const bs = r * 0.55
    const bd = r + 3
    ctx.strokeStyle = pulse ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(x - bd, y - bd + bs)
    ctx.lineTo(x - bd, y - bd)
    ctx.lineTo(x - bd + bs, y - bd)
    ctx.moveTo(x + bd - bs, y - bd)
    ctx.lineTo(x + bd, y - bd)
    ctx.lineTo(x + bd, y - bd + bs)
    ctx.moveTo(x + bd, y + bd - bs)
    ctx.lineTo(x + bd, y + bd)
    ctx.lineTo(x + bd - bs, y + bd)
    ctx.moveTo(x - bd + bs, y + bd)
    ctx.lineTo(x - bd, y + bd)
    ctx.lineTo(x - bd, y + bd - bs)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  if (state === 'rescued') {
    const fSize = Math.max(7, Math.round(r * 0.88))
    ctx.font = `bold ${fSize}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,255,255,0.94)'
    ctx.shadowColor = 'rgba(255,240,100,1)'
    ctx.shadowBlur = 6
    ctx.fillText('✦', x, y + 0.5)
    ctx.shadowBlur = 0
  }

  if (state === 'failed') {
    const fSize = Math.max(7, Math.round(r * 0.92))
    ctx.font = `bold ${fSize}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,150,120,0.9)'
    ctx.shadowColor = 'rgba(200,50,20,0.9)'
    ctx.shadowBlur = 5
    ctx.fillText('✕', x, y + 0.5)
    ctx.shadowBlur = 0
  }
}

/* ── Seeded star placement ───────────────────────────────────────────────── */

/** Deterministic spawn point + star positions for a galaxy run.
 *  IMPORTANT: the rng call order must stay byte-identical to the historical
 *  MiniMapCanvas.generateDots() — archived galaxies replay these positions. */
export function generateGalaxyDots(
  mapSeed: number,
  totalDots: number,
): { spawn: DotPos; dots: DotPos[] } {
  // Seeded by the per-run mapSeed: a fresh random layout every galaxy
  // (and every playthrough), stable across reloads and prefix-stable when
  // extra dots are appended after a failed star.
  const rng = seededRng(mapSeed)
  const geo = galaxyGeo(mapSeed)
  const gauss = () => rng() + rng() + rng() - 1.5
  const clamp = (p: DotPos): DotPos => ({
    x: Math.min(0.94, Math.max(0.06, p.x)),
    y: Math.min(0.94, Math.max(0.06, p.y)),
  })
  // Spawn: random point anywhere on the OUTER rim of the galaxy disc —
  // top-left one run, bottom-right the next. Only the boss at the core
  // is fixed.
  const spawn = clamp(
    galaxyPlaneToWorld(geo, rng() * Math.PI * 2, armRadius(geo, 0.9 + rng() * 0.1)),
  )
  const dots: DotPos[] = []
  const minDistSq = 0.085 * 0.085
  for (let i = 0; i < totalDots; i++) {
    // Each star lands on a random arm at a random depth — scattered over
    // the whole galaxy, kept clear of the core so the boss stays alone
    // at the center.
    let pos: DotPos | null = null
    for (let attempt = 0; attempt < 8; attempt++) {
      const arm = Math.floor(rng() * geo.arms)
      const t = 0.25 + rng() * 0.62
      const candidate = clamp(
        galaxyPlaneToWorld(
          geo,
          armAngle(geo, arm, t) + gauss() * 0.12,
          armRadius(geo, t) + gauss() * 0.014,
        ),
      )
      const farEnough = dots.every(
        (d) => (d.x - candidate.x) ** 2 + (d.y - candidate.y) ** 2 >= minDistSq,
      )
      if (farEnough || attempt === 7) {
        pos = candidate
        break
      }
    }
    dots.push(pos!)
  }
  return { spawn, dots }
}
