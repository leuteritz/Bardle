// frontend/src/composables/useProjectileSystem.ts
import { shallowRef } from 'vue'
import { PROJECTILE_SHOT_DURATION_MS } from '../config/constants'

export interface ProjectileShot {
  id: number
  x1: number
  y1: number
  x2: number
  y2: number
  elapsed: number
  duration: number
  headX: number
  headY: number
  tailX: number
  tailY: number
  opacity: number
  trailColor?: string
  headColor?: string
  onHit?: () => void
  interceptCheck?: (headX: number, headY: number) => boolean
  onIntercept?: (headX: number, headY: number) => void
}

const SHOT_DURATION_MS = PROJECTILE_SHOT_DURATION_MS
let _nextId = 0

export function useProjectileSystem() {
  // shallowRef mit stabiler Array-Identität: Schüsse werden in-place mutiert,
  // damit per-Frame-Updates keine Vue-Re-Renders der Eltern-Templates auslösen.
  // Der Canvas-Projektil-Layer liest das Array imperativ in seiner eigenen rAF-Loop.
  const shots = shallowRef<ProjectileShot[]>([])

  /**
   * Spawnt einen neuen Schuss – NUR wenn Schütze UND Ziel im Vordergrund sind.
   */
  function spawnShot(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    shooterIsForeground: boolean,
    targetIsForeground: boolean,
    options?: {
      trailColor?: string
      headColor?: string
      onHit?: () => void
      interceptCheck?: (headX: number, headY: number) => boolean
      onIntercept?: (headX: number, headY: number) => void
    },
  ) {
    if (!shooterIsForeground || !targetIsForeground) return
    shots.value.push({
      id: _nextId++,
      x1: fromX,
      y1: fromY,
      x2: toX,
      y2: toY,
      elapsed: 0,
      duration: SHOT_DURATION_MS,
      headX: fromX,
      headY: fromY,
      tailX: fromX,
      tailY: fromY,
      opacity: 1,
      trailColor: options?.trailColor,
      headColor: options?.headColor,
      onHit: options?.onHit,
      interceptCheck: options?.interceptCheck,
      onIntercept: options?.onIntercept,
    })
  }

  /**
   * Muss jeden Frame mit dt (ms) aufgerufen werden, um Schüsse zu bewegen und abgelaufene zu entfernen.
   */
  function tickShots(dt: number) {
    const arr = shots.value
    let write = 0
    for (const shot of arr) {
      shot.elapsed += dt
      const t = Math.min(1, shot.elapsed / shot.duration)
      shot.headX = shot.x1 + (shot.x2 - shot.x1) * t
      shot.headY = shot.y1 + (shot.y2 - shot.y1) * t
      const tailT = Math.max(0, t - 0.22)
      shot.tailX = shot.x1 + (shot.x2 - shot.x1) * tailT
      shot.tailY = shot.y1 + (shot.y2 - shot.y1) * tailT
      // Fade: 0–20% einblenden, 20–70% voll, 70–100% ausblenden
      shot.opacity = t < 0.2 ? t / 0.2 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1
      if (shot.interceptCheck?.(shot.headX, shot.headY)) {
        shot.onIntercept?.(shot.headX, shot.headY)
      } else if (t < 1) {
        arr[write++] = shot
      } else {
        shot.onHit?.()
      }
    }
    arr.length = write
  }

  return { shots, spawnShot, tickShots }
}
