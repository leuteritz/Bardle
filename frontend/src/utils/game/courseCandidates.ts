/**
 * Chart your course — die drei Kandidaten-Sterne einer Etappe.
 *
 * Deterministisch aus `mapSeed` und Etappe: EIN seeded Strom je Liste (ein
 * Seed je Index kollabiert beim LCG), erst die Rollen, dann die Orte. Die
 * Platzierung folgt `generateGalaxyDots` (Arm, Tiefe, Gauss-Streuung), fasst
 * dessen rng-Reihenfolge aber nie an — Archive spielen sie byte-gleich nach.
 */
import {
  armAngle,
  armRadius,
  galaxyGeo,
  galaxyPlaneToWorld,
  seededRng,
  type DotPos,
} from '@/components/bottom/minimap/minimapGalaxyGeometry'
import {
  COURSE_LEG_TIME_SPAN,
  COURSE_MIN_DIST,
  COURSE_OPTION_COUNT,
  COURSE_PLACE_TRIES,
  COURSE_RNG_SALT,
  ROLES,
} from '@/config/constants'
import type { ChampionRole } from '@/types'

export interface CourseOption {
  role: ChampionRole
  pos: DotPos
  /** Flugzeit-Faktor nach Entfernung, 1 ± COURSE_LEG_TIME_SPAN. */
  legFactor: number
}

function clampDot(p: DotPos): DotPos {
  return { x: Math.min(0.94, Math.max(0.06, p.x)), y: Math.min(0.94, Math.max(0.06, p.y)) }
}

function farEnough(p: DotPos, others: DotPos[]): boolean {
  const min = COURSE_MIN_DIST * COURSE_MIN_DIST
  return others.every((d) => (d.x - p.x) ** 2 + (d.y - p.y) ** 2 >= min)
}

export function courseRoles(rng: () => number): ChampionRole[] {
  const keys = ROLES.map((r) => r.key as ChampionRole)
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[keys[i], keys[j]] = [keys[j], keys[i]]
  }
  return keys.slice(0, COURSE_OPTION_COUNT)
}

/**
 * @param from   wo das Schiff steht — nur für den Flugzeit-Faktor
 * @param prior  besuchte Sterne, die kein Kandidat überdecken darf
 */
export function courseCandidates(
  mapSeed: number,
  leg: number,
  from: DotPos,
  prior: DotPos[],
): CourseOption[] {
  const rng = seededRng((mapSeed ^ Math.imul(leg + 1, COURSE_RNG_SALT)) >>> 0)
  const geo = galaxyGeo(mapSeed)
  const gauss = () => rng() + rng() + rng() - 1.5
  const roles = courseRoles(rng)
  const placed: DotPos[] = []
  for (let i = 0; i < roles.length; i++) {
    let pos: DotPos = from
    for (let t = 0; t < COURSE_PLACE_TRIES; t++) {
      const arm = Math.floor(rng() * geo.arms)
      const depth = 0.25 + rng() * 0.62
      pos = clampDot(
        galaxyPlaneToWorld(
          geo,
          armAngle(geo, arm, depth) + gauss() * 0.12,
          armRadius(geo, depth) + gauss() * 0.014,
        ),
      )
      if (farEnough(pos, [...prior, ...placed, from])) break
    }
    placed.push(pos)
  }
  const dist = placed.map((p) => Math.hypot(p.x - from.x, p.y - from.y))
  const mean = dist.reduce((a, b) => a + b, 0) / dist.length || 1
  return roles.map((role, i) => ({
    role,
    pos: placed[i],
    legFactor: Math.min(
      1 + COURSE_LEG_TIME_SPAN,
      Math.max(1 - COURSE_LEG_TIME_SPAN, dist[i] / mean),
    ),
  }))
}
