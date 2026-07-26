// Geteilte Geometrie-Helfer: Prozent-Clamping, Orbit-Bahnen der Sonne und
// Guide-Ellipsen der Striker-Arena. Rein funktional — kein Zustand, keine
// Store-Zugriffe.

import {
  ARC_GUIDE_MAX_EXTEND_DEG,
  ARC_GUIDE_PLANET_RADIUS_FRAC,
  ARC_GUIDE_STEP_DEG,
  ORBIT_SUN_GROWTH_FACTOR,
  ORBIT_SUN_SCALE_ANCHOR_RADIUS,
  SUN_RADIUS,
} from '@/config/constants'

// ── Allgemein ──────────────────────────────────────────────────────────────
/** Clamps a percentage value to the 0–100 range. */
export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

// ── Sonnen-Orbit ───────────────────────────────────────────────────────────
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

// ── Guide-Ellipsen (Striker-Arena) ─────────────────────────────────────────
/** Ellipse einer Guide-Linie in Arena-Prozent (Zentrum X ist immer 50 %). */
export interface ArcGuideEllipse {
  rxPct: number
  ryPct: number
  centerYPct: number
}

/**
 * Verlängert eine Guide-Ellipse vom äußersten Slot-Winkel schrittweise in
 * Richtung `dirSign`, bis der Punkt die zentrale Planeten-Silhouette erreicht.
 * Die Linie endet dort und wirkt, als liefe sie hinter dem Planeten weiter.
 * Winkel in Striker-Konvention: 0° = rechts, 90° = unten (Screen-Y nach unten).
 */
export function guideEndAngleDeg(
  startDeg: number,
  dirSign: 1 | -1,
  ellipse: ArcGuideEllipse,
  w: number,
  h: number,
): number {
  if (w <= 0 || h <= 0) return startDeg
  const planetR = ARC_GUIDE_PLANET_RADIUS_FRAC * Math.min(w, h)
  let deg = startDeg
  for (let i = 0; i <= ARC_GUIDE_MAX_EXTEND_DEG; i += ARC_GUIDE_STEP_DEG) {
    const cand = startDeg + dirSign * i
    const rad = (cand * Math.PI) / 180
    const dxPx = ((Math.cos(rad) * ellipse.rxPct) / 100) * w
    const dyPx = ((ellipse.centerYPct + Math.sin(rad) * ellipse.ryPct - 50) / 100) * h
    deg = cand
    if (Math.hypot(dxPx, dyPx) <= planetR) break
  }
  return deg
}

/** Punkt auf der Guide-Ellipse in Arena-Prozent (für SVG-Pfade im 100er-viewBox). */
export function ellipsePointPct(
  deg: number,
  ellipse: ArcGuideEllipse,
): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  return {
    x: Math.round((50 + Math.cos(rad) * ellipse.rxPct) * 10) / 10,
    y: Math.round((ellipse.centerYPct + Math.sin(rad) * ellipse.ryPct) * 10) / 10,
  }
}
