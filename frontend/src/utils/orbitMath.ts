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
