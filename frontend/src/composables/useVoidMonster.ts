import { ref, onMounted, onUnmounted } from 'vue'
import { useVoidMonsterStore } from '../stores/voidMonsterStore'
import { getOrbitPos } from '../utils/orbitMath'
import {
  VOID_MONSTER_FLY_DURATION_MS,
  VOID_MONSTER_SPAWN_INTERVAL_MIN_MS,
  VOID_MONSTER_SPAWN_INTERVAL_MAX_MS,
  ORBIT_TIERS,
} from '../config/constants'

const BEHIND_SUN_SPEED_MULTIPLIER = 1.5
const BEHIND_THRESHOLD = -0.05
const BEHIND_FADE_BAND = 0.12
const SPEED_LERP = 0.04
const VOID_BEHIND_OPACITY = 0.2
const VOID_ORBIT_SPEED = 0.00007
const VOID_ORBIT_LIFETIME_MS = 50_000
const ORBIT_EXPAND_LERP = 0.018

export interface VoidMonsterRenderEntry {
  id: string
  x: number
  y: number
  opacity: number
  scale: number
  isBehind: boolean
  hintOpacity: number
  orbitRx: number
  orbitRy: number
  orbitTilt: number
}

interface OrbitState {
  angle: number
  rx: number        // aktueller Radius (startet bei 0, expandiert zu targetRx)
  ry: number
  targetRx: number  // Ziel-Orbit-Radius
  targetRy: number
  tilt: number
  direction: 1 | -1
  speedMul: number
}

export function useVoidMonster() {
  const store = useVoidMonsterStore()
  const monsterRenders = ref<VoidMonsterRenderEntry[]>([])

  const orbitStates = new Map<string, OrbitState>()
  const flyStartPos = new Map<string, { x: number; y: number }>()
  const orbitStartedAt = new Map<string, number>()

  let animFrame = 0
  let lastTs = 0
  let spawnTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleNextSpawn() {
    const delay =
      VOID_MONSTER_SPAWN_INTERVAL_MIN_MS +
      Math.random() * (VOID_MONSTER_SPAWN_INTERVAL_MAX_MS - VOID_MONSTER_SPAWN_INTERVAL_MIN_MS)
    spawnTimer = setTimeout(() => {
      store.spawnMonster()
      scheduleNextSpawn()
    }, delay)
  }

  function animate(ts: number) {
    const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
    lastTs = ts

    const screenCx = window.innerWidth / 2
    const screenCy = window.innerHeight / 2

    const renders: VoidMonsterRenderEntry[] = []
    const toRemove: string[] = []

    for (const monster of store.activeMonsters) {
      // ── Initialisierung beim ersten Frame ──────────────────────────────────
      if (!orbitStates.has(monster.id)) {
        // Deterministisch: Tier 0 oder 1 anhand erster Stelle der ID
        const tierIndex = monster.id.charCodeAt(0) % 2
        const tier = ORBIT_TIERS.void_monster[tierIndex]

        // Startwinkel = Richtung vom Spawn-Punkt zur Sonne
        const approachAngle = Math.atan2(monster.spawnY - screenCy, monster.spawnX - screenCx)

        orbitStates.set(monster.id, {
          angle: approachAngle,
          rx: 0,
          ry: 0,
          targetRx: tier.rx,
          targetRy: tier.ry,
          tilt: tier.tiltRad,
          direction: Math.random() < 0.5 ? 1 : -1,
          speedMul: 1.0,
        })
        flyStartPos.set(monster.id, { x: monster.spawnX, y: monster.spawnY })
      }

      const state = orbitStates.get(monster.id)!
      const fly = flyStartPos.get(monster.id)!

      // ── Fly-in Fortschritt ─────────────────────────────────────────────────
      const spawnT = Math.min(1, (ts - monster.spawnedAt) / VOID_MONSTER_FLY_DURATION_MS)
      const spawnFactor = 1 - Math.pow(1 - spawnT, 5) // cubic ease-out

      let displayX: number
      let displayY: number
      let relY: number
      let isBehind: boolean
      let visibleFactor: number
      let opacity: number
      let scale: number
      let hintOpacity: number

      if (spawnT < 1) {
        // ── Phase 1: Fly-in zur SONNENMITTE ───────────────────────────────────
        displayX = fly.x + (screenCx - fly.x) * spawnFactor
        displayY = fly.y + (screenCy - fly.y) * spawnFactor

        // Während Fly-in: am Sonnenzentrum → keine Behind-Berechnung nötig
        relY = 0
        isBehind = false
        visibleFactor = 1
        opacity = spawnFactor
        scale = 0.6 + spawnFactor * 0.5
        hintOpacity = 0
      } else {
        // ── Phase 2: Orbit – Radius expandiert von 0 auf Zielgröße ───────────
        if (!orbitStartedAt.has(monster.id)) {
          orbitStartedAt.set(monster.id, ts)
        }
        const orbitAge = ts - orbitStartedAt.get(monster.id)!

        // Orbit-Radius expandiert sanft
        state.rx += (state.targetRx - state.rx) * ORBIT_EXPAND_LERP
        state.ry += (state.targetRy - state.ry) * ORBIT_EXPAND_LERP

        // Speed-Multiplikator (aus letztem Frame)
        const { y: prevOy } = getOrbitPos(state.angle, state.rx, state.ry, state.tilt, screenCx, screenCy)
        const prevRelY = (prevOy - screenCy) / Math.max(state.targetRy, 1)
        const prevIsBehind = prevRelY < BEHIND_THRESHOLD
        const targetMul = prevIsBehind ? BEHIND_SUN_SPEED_MULTIPLIER : 1.0
        state.speedMul += (targetMul - state.speedMul) * SPEED_LERP

        // Winkel vorantreiben
        const keplerBoost = 1.0 + 0.55 * (1 - Math.abs(Math.cos(state.angle)))
        state.angle += state.direction * VOID_ORBIT_SPEED * keplerBoost * state.speedMul * dt

        const { x: ox, y: oy } = getOrbitPos(state.angle, state.rx, state.ry, state.tilt, screenCx, screenCy)
        displayX = ox
        displayY = oy

        // Behind-sun Berechnung
        relY = (oy - screenCy) / Math.max(state.targetRy, 1)
        isBehind = relY < BEHIND_THRESHOLD
        visibleFactor = Math.max(0, Math.min(1, (relY - BEHIND_THRESHOLD + BEHIND_FADE_BAND) / BEHIND_FADE_BAND))

        const depth = (relY + 1) / 2
        opacity = Math.max(VOID_BEHIND_OPACITY, visibleFactor * 0.9 + 0.1)
        scale = 0.85 + depth * 0.3

        // Hint: skaliert auch mit wie weit der Orbit expandiert ist
        const expandFactor = Math.min(state.rx / state.targetRx, 1)
        hintOpacity = (1 - visibleFactor) * expandFactor

        // Orbit-Lifetime: letzte 3s ausblenden, dann entfernen
        if (orbitAge > VOID_ORBIT_LIFETIME_MS) {
          toRemove.push(monster.id)
          continue
        }
        const fadeOutStart = VOID_ORBIT_LIFETIME_MS - 3000
        if (orbitAge > fadeOutStart) {
          opacity *= 1 - (orbitAge - fadeOutStart) / 3000
          hintOpacity *= 1 - (orbitAge - fadeOutStart) / 3000
        }
      }

      renders.push({
        id: monster.id,
        x: displayX,
        y: displayY,
        opacity,
        scale,
        isBehind,
        hintOpacity,
        orbitRx: state.targetRx,
        orbitRy: state.targetRy,
        orbitTilt: state.tilt,
      })
    }

    for (const id of toRemove) {
      store.removeMonster(id)
      orbitStates.delete(id)
      flyStartPos.delete(id)
      orbitStartedAt.delete(id)
    }

    monsterRenders.value = renders
    animFrame = requestAnimationFrame(animate)
  }

  onMounted(() => {
    animFrame = requestAnimationFrame(animate)
    scheduleNextSpawn()
  })

  onUnmounted(() => {
    cancelAnimationFrame(animFrame)
    if (spawnTimer !== null) {
      clearTimeout(spawnTimer)
      spawnTimer = null
    }
  })

  return { monsterRenders }
}
