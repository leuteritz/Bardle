// Die Kurve im Polarmodell des Sternfelds. Jedes Item hält {angle, dist} um
// den Fluchtpunkt; ein Seitenrutsch (Slip) ist eine kartesische Verschiebung,
// die hier in erster Ordnung zurück ins Polare geschrieben wird — ohne atan2
// und hypot, denn das läuft ~500× je Frame.
import { HELM_SLIP_MIN_DIST_PX } from '@/config/constants'

export interface PolarItem {
  angle: number
  dist: number
}

/** norm² — dasselbe Gesetz wie die Radialgeschwindigkeit: nah rutscht mehr. */
export function depthWeight(norm: number): number {
  return norm * norm
}

/**
 * Verschiebt ein Item um (dx, dy) Bildschirm-px. Erste Ordnung, Fehler ≈
 * Schritt/(2·dist) — mit der norm²-Gewichtung des Aufrufers unter 1 %. Der
 * Kernschutz fängt nur die Division nahe null.
 */
export function slipPolar(
  item: PolarItem,
  dx: number,
  dy: number,
  cosA: number,
  sinA: number,
): void {
  const d = item.dist
  if (d < HELM_SLIP_MIN_DIST_PX) return
  item.dist = d + dx * cosA + dy * sinA
  item.angle += (-dx * sinA + dy * cosA) / d
}

/** Respawn-Winkel in der Halbebene GEGEN den Slip — der Spiegel des Warp-Zweigs. */
export function upstreamAngle(slipX: number, slipY: number, rand: () => number): number {
  return Math.atan2(-slipY, -slipX) - Math.PI / 2 + rand() * Math.PI
}

/** Richtung der Bildschirmgeschwindigkeit = radial + gewichteter Slip. */
export function trailAngle(
  angle: number,
  radial: number,
  slipX: number,
  slipY: number,
  weight: number,
): number {
  const vx = Math.cos(angle) * radial + slipX * weight
  const vy = Math.sin(angle) * radial + slipY * weight
  return Math.atan2(vy, vx)
}

/** Dreht einen Punkt um den Fokus; schreibt nach `out`, keine Allokation. */
export function rotateAbout(
  x: number,
  y: number,
  cx: number,
  cy: number,
  cos: number,
  sin: number,
  out: { x: number; y: number },
): void {
  const dx = x - cx
  const dy = y - cy
  out.x = cx + dx * cos - dy * sin
  out.y = cy + dx * sin + dy * cos
}
