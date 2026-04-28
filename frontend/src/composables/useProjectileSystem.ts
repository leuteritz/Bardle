// frontend/src/composables/useProjectileSystem.ts
import { ref } from 'vue'

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
}

const SHOT_DURATION_MS = 520
let _nextId = 0

export function useProjectileSystem() {
  const shots = ref<ProjectileShot[]>([])

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
    })
  }

  /**
   * Muss jeden Frame mit dt (ms) aufgerufen werden, um Schüsse zu bewegen und abgelaufene zu entfernen.
   */
  function tickShots(dt: number) {
    const alive: ProjectileShot[] = []
    for (const shot of shots.value) {
      shot.elapsed += dt
      const t = Math.min(1, shot.elapsed / shot.duration)
      shot.headX = shot.x1 + (shot.x2 - shot.x1) * t
      shot.headY = shot.y1 + (shot.y2 - shot.y1) * t
      const tailT = Math.max(0, t - 0.22)
      shot.tailX = shot.x1 + (shot.x2 - shot.x1) * tailT
      shot.tailY = shot.y1 + (shot.y2 - shot.y1) * tailT
      // Fade: 0–20% einblenden, 20–70% voll, 70–100% ausblenden
      shot.opacity = t < 0.2 ? t / 0.2 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1
      if (t < 1) alive.push(shot)
    }
    shots.value = alive
  }

  return { shots, spawnShot, tickShots }
}
