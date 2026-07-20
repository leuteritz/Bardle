import {
  ARC_GUIDE_PLANET_RADIUS_FRAC,
  ARC_GUIDE_MAX_EXTEND_DEG,
  ARC_GUIDE_STEP_DEG,
} from '@/config/constants'

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
