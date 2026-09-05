import {
  DEPTH_PASS_NEAR,
  DEPTH_PASS_HIT_MIN_PX,
  DEPTH_PASS_HOVER_SCALE,
  DEPTH_PASS_SAFE_MARGIN_PX,
  SUN_CLICK_TARGET_DIAMETER_FACTOR,
  DEPTH_PASS_BAND_SAMPLES,
  DEPTH_PASS_BOW,
  DEPTH_PASS_PROFILES,
  DEPTH_PASS_MOTION_QUERY,
} from '@/config/constants'
import { hudFreeBandOver, type HudFieldMetrics } from '@/utils/ui/hudField'

export interface DepthPassPoint {
  x: number
  y: number
  scale: number
  angleDeg: number
}

interface Corridor {
  startX: number
  endX: number
  top: number
  height: number
}

const corridors = new WeakMap<HudFieldMetrics, Map<string, Corridor>>()

export function depthMotionReduced(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DEPTH_PASS_MOTION_QUERY).matches
}

export function depthPassWeight(t: number): number {
  const u = Math.min(1, Math.max(0, t))
  return 1 / (1 + (1 / DEPTH_PASS_NEAR - 1) * (1 - u))
}

function corridorFor(
  mirrored: boolean,
  bodyPx: number,
  paddingPx: number,
  scaleMax: number,
  clearance: number,
  sunRadius: number,
  metrics: HudFieldMetrics,
): Corridor {
  let cache = corridors.get(metrics)
  if (!cache) {
    cache = new Map()
    corridors.set(metrics, cache)
  }
  const key = `${mirrored}:${bodyPx}:${paddingPx}:${scaleMax}:${clearance}:${sunRadius}`
  const cached = cache.get(key)
  if (cached) return cached

  const radius = Math.max(DEPTH_PASS_HIT_MIN_PX / 2, (bodyPx / 2 + paddingPx) * scaleMax) *
    DEPTH_PASS_HOVER_SCALE + DEPTH_PASS_SAFE_MARGIN_PX
  const w = metrics.viewportW
  const h = metrics.viewportH
  const direction = mirrored ? -1 : 1
  const inner = Math.max(Math.min(w, h) * clearance, sunRadius * SUN_CLICK_TARGET_DIAMETER_FACTOR / 2 + radius)
  const startX = w / 2 + direction * inner
  const endX = mirrored ? radius : w - radius
  let top = radius
  let bottom = h - radius
  // Fit the entire flight once; frame-time clamping would flatten its curve.
  for (let i = 0; i <= DEPTH_PASS_BAND_SAMPLES; i++) {
    const x = startX + (endX - startX) * i / DEPTH_PASS_BAND_SAMPLES
    const band = hudFreeBandOver(x, radius, metrics)
    top = Math.max(top, band.top + radius)
    bottom = Math.min(bottom, band.bottom - radius)
  }
  const corridor = { startX, endX, top, height: Math.max(0, bottom - top) }
  cache.set(key, corridor)
  return corridor
}

export function depthPassPointAt(
  variant: number,
  mirrored: boolean,
  t: number,
  bodyPx: number,
  paddingPx: number,
  scaleMax: number,
  clearance: number,
  sunRadius: number,
  metrics: HudFieldMetrics,
): DepthPassPoint {
  const q = depthPassWeight(t)
  const u = (q - DEPTH_PASS_NEAR) / (1 - DEPTH_PASS_NEAR)
  const path = corridorFor(mirrored, bodyPx, paddingPx, scaleMax, clearance, sunRadius, metrics)
  const profile = DEPTH_PASS_PROFILES[variant % DEPTH_PASS_PROFILES.length]
  const dy = profile.to - profile.from
  const bow = Math.sign(dy) * DEPTH_PASS_BOW
  const dx = path.endX - path.startX
  return {
    x: path.startX + dx * u,
    y: path.top + path.height * (profile.from + dy * u + bow * Math.sin(Math.PI * u)),
    scale: scaleMax * q,
    angleDeg: Math.atan2(path.height * (dy + bow * Math.PI * Math.cos(Math.PI * u)), dx) * 180 / Math.PI,
  }
}
