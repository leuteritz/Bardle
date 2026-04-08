import { ref, onMounted, onUnmounted } from 'vue'
import { activePlanetPositions } from '@/utils/activePlanetPositions'
import { ORBIT_RADIUS_SCALE } from '@/config/constants'

export interface PlanetOrbitParams {
  id: string
  orbitRadiusX: number
  orbitRadiusY: number
  tiltRad: number
  baseSpeed: number
  direction: 1 | -1
  initialAngle: number
}

export interface PlanetRenderPos {
  id: string
  x: number
  y: number
  isBehind: boolean
  depth: number
  parallaxScale: number
  opacity: number
  zIndex: number
  /** Fertiger CSS-transform-String für PlanetComponent */
  transform: string
}

interface LocalState {
  x: number
  y: number
  orbitAngle: number
  currentRadiusX: number
  currentRadiusY: number
}

/** Identische Funktion wie in ChampionOrbit */
function getOrbitPos(
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

/** Planeten starten 3.5× so weit entfernt und spiralisieren ins Orbit */
const FLY_IN_START_SCALE = 3.5

export function usePlanetOrbit(baseSize: number, getPlanets: () => PlanetOrbitParams[]) {
  const renderPositions = ref<PlanetRenderPos[]>([])
  const localStates = new Map<string, LocalState>()
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let animFrame = 0
  let lastTs = 0

  function animate(ts: number) {
    const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
    lastTs = ts

    const screenCx = window.innerWidth / 2
    const screenCy = window.innerHeight / 2
    const planets = getPlanets()
    const newPositions: PlanetRenderPos[] = []

    for (const p of planets) {
      const targetRx = p.orbitRadiusX * ORBIT_RADIUS_SCALE
      const targetRy = p.orbitRadiusY * ORBIT_RADIUS_SCALE

      let ls = localStates.get(p.id)
      if (!ls) {
        // Fly-In: Startposition weit außen
        const startRx = targetRx * FLY_IN_START_SCALE
        const startRy = targetRy * FLY_IN_START_SCALE
        const sp = getOrbitPos(p.initialAngle, startRx, startRy, p.tiltRad, screenCx, screenCy)
        ls = {
          x: sp.x,
          y: sp.y,
          orbitAngle: p.initialAngle,
          currentRadiusX: startRx,
          currentRadiusY: startRy,
        }
        localStates.set(p.id, ls)
      }

      if (!reducedMotion) {
        // Radius langsam zum Zielorbit lerpen (erzeugt Spiralflug)
        ls.currentRadiusX += (targetRx - ls.currentRadiusX) * 0.018
        ls.currentRadiusY += (targetRy - ls.currentRadiusY) * 0.018

        // Gleicher Kepler-Boost wie bei Champions
        const keplerBoost = 1.0 + 0.55 * (1 - Math.abs(Math.cos(ls.orbitAngle)))
        ls.orbitAngle += p.direction * p.baseSpeed * keplerBoost * dt

        const tp = getOrbitPos(
          ls.orbitAngle,
          ls.currentRadiusX,
          ls.currentRadiusY,
          p.tiltRad,
          screenCx,
          screenCy,
        )
        ls.x += (tp.x - ls.x) * 0.12
        ls.y += (tp.y - ls.y) * 0.12
      } else {
        ls.currentRadiusX = targetRx
        ls.currentRadiusY = targetRy
        const tp = getOrbitPos(p.initialAngle, targetRx, targetRy, p.tiltRad, screenCx, screenCy)
        ls.x = tp.x
        ls.y = tp.y
      }

      // Tiefe: -1 = Orbit-Spitze (hinter Sonne), +1 = Orbit-Boden (vor Sonne)
      const relY = (ls.y - screenCy) / Math.max(targetRy, 1)
      const isBehind = relY < -0.05
      const depth = (relY + 1) / 2 // 0 = ganz hinten, 1 = ganz vorne

      // Gleiche Parallax-Formel wie Champions
      const parallaxScale = 0.72 + depth * 0.56
      const opacity = isBehind ? 0.22 + depth * 0.35 : 0.8 + depth * 0.2
      const zIndex = isBehind ? Math.floor(3 + depth * 2) : Math.floor(5 + depth * 2)

      // Zentriert den Planeten an (ls.x, ls.y), skaliert um diesen Mittelpunkt:
      // translate(cx, cy) scale(s) translate(-size/2, -size/2)
      const transform =
        `translate(${ls.x}px, ${ls.y}px) ` +
        `scale(${parallaxScale}) ` +
        `translate(${-baseSize / 2}px, ${-baseSize / 2}px)`

      // activePlanetPositions aktualisieren (wird von ChampionOrbit für Projektile genutzt)
      activePlanetPositions.set(p.id, { cx: ls.x, cy: ls.y })

      newPositions.push({
        id: p.id,
        x: ls.x,
        y: ls.y,
        isBehind,
        depth,
        parallaxScale,
        opacity,
        zIndex,
        transform,
      })
    }

    // Entfernte Planeten aufräumen
    for (const key of localStates.keys()) {
      if (!planets.some((p) => p.id === key)) {
        localStates.delete(key)
        activePlanetPositions.delete(key)
      }
    }

    renderPositions.value = newPositions
    animFrame = requestAnimationFrame(animate)
  }

  onMounted(() => {
    animFrame = requestAnimationFrame(animate)
  })
  onUnmounted(() => {
    cancelAnimationFrame(animFrame)
  })

  return { renderPositions }
}
