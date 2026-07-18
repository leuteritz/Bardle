import {
  ORBIT_SUN_GROWTH_FACTOR,
  ORBIT_SUN_SCALE_ANCHOR_RADIUS,
  SUN_RADIUS,
} from '@/config/constants'

/** Dampened sun radius driving all orbit visuals: identical to the real sun
 *  radius up to the comet anchor, compressed growth above it. */
export function getOrbitSunRadius(sunRadius: number): number {
  if (sunRadius <= ORBIT_SUN_SCALE_ANCHOR_RADIUS) return sunRadius
  return (
    ORBIT_SUN_SCALE_ANCHOR_RADIUS + (sunRadius - ORBIT_SUN_SCALE_ANCHOR_RADIUS) * ORBIT_SUN_GROWTH_FACTOR
  )
}

/** Orbit scale factor relative to the reference SUN_RADIUS, using the dampened radius. */
export function getOrbitSunScale(sunRadius: number): number {
  return getOrbitSunRadius(sunRadius) / SUN_RADIUS
}

/**
 * 3D elliptical orbit position — shared by usePlanetOrbit and usePlanetBackground.
 * Identical to the calculation used in ChampionOrbit.
 */
export function getOrbitPos(
  angle: number,
  rx: number,
  ry: number,
  tilt: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const cosT = Math.cos(tilt)
  const sinT = Math.sin(tilt)
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  return {
    x: cx + rx * cosA * cosT - ry * sinA * sinT,
    y: cy + rx * cosA * sinT + ry * sinA * cosT,
  }
}
