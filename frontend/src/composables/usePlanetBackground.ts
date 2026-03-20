import { watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { usePlanetEventStore } from '../stores/planetEventStore'
import {
  PLANET_MAX_COUNT,
  PLANET_SPAWN_INTERVAL_MIN,
  PLANET_SPAWN_INTERVAL_MAX,
} from '../config/constants'
import {
  NS,
  drawPlanet,
  pickConfig,
  type PlanetType,
  type PlanetTypeConfig,
  PLANET_TYPE_CONFIGS,
} from '../utils/planetDraw'
import { MATERIALS } from '../config/materials'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanetItem {
  id: string
  el: SVGSVGElement
  x: number
  y: number
  scale: number
  scaleEnd: number
  lifetime: number
  elapsed: number
  removeTimeout: ReturnType<typeof setTimeout> | null
  orbiting?: boolean
  orbitAngle?: number
  orbitRadius?: number
  orbitSpeed?: number
  orbitCx?: number
  orbitCy?: number
}

// Re-export for consumers (avoids unused import warnings)
export type { PlanetType, PlanetTypeConfig }
export { PLANET_TYPE_CONFIGS }

let planetIdCounter = 0

// ─── Composable ───────────────────────────────────────────────────────────────

export function usePlanetBackground(container: Ref<HTMLElement | null>): void {
  const planetEventStore = usePlanetEventStore()

  const planets: PlanetItem[] = []
  const timeouts: ReturnType<typeof setTimeout>[] = []
  let spawnTimeout: ReturnType<typeof setTimeout> | null = null
  let animFrame = 0
  let lastTimestamp = 0

  function removePlanet(id: string): void {
    const idx = planets.findIndex((p) => p.id === id)
    if (idx === -1) return
    const item = planets[idx]
    if (item.removeTimeout !== null) clearTimeout(item.removeTimeout)
    if (container.value?.contains(item.el)) container.value.removeChild(item.el)
    planets.splice(idx, 1)
  }

  function spawnPlanet(): string {
    if (!container.value) return ''
    const config = pickConfig()
    const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin)
    const r = size / 2
    const w = container.value.clientWidth || window.innerWidth
    const h = container.value.clientHeight || window.innerHeight

    const mx = w * 0.12,
      my = h * 0.12
    const minCenterDist = Math.min(w, h) * 0.22
    let cx: number, cy: number
    let attempts = 0
    do {
      cx = mx + Math.random() * (w - 2 * mx)
      cy = my + Math.random() * (h - 2 * my)
      attempts++
    } while (Math.hypot(cx - w / 2, cy - h / 2) < minCenterDist && attempts < 10)
    const x = cx - r,
      y = cy - r

    const lifetime = 8_000 + Math.random() * 4_000
    const scaleEnd = 0.85 + Math.random() * 0.75

    const id = `planet-${++planetIdCounter}`
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    svg.classList.add('planet')
    svg.dataset.planetId = id
    svg.style.opacity = '0'

    drawPlanet(svg, id, config.type, r, r, r, size)

    svg.style.transform = `translate(${x}px,${y}px) scale(0.05)`
    container.value.appendChild(svg)

    const item: PlanetItem = {
      id,
      el: svg,
      x,
      y,
      scale: 0.05,
      scaleEnd,
      lifetime,
      elapsed: 0,
      removeTimeout: null,
    }
    planets.push(item)
    return id
  }

  function spawnOrbitPlanet(): { id: string; type: PlanetType } {
    if (!container.value) return { id: '', type: 'rocky' }
    const w = container.value.clientWidth ?? window.innerWidth
    const h = container.value.clientHeight ?? window.innerHeight
    const cx = w / 2
    const cy = h / 2
    const orbitRadius = 295 + Math.random() * 20
    const startAngle = Math.random() * Math.PI * 2
    const orbitSpeed = (Math.PI * 2) / (50 + Math.random() * 30)

    const config = pickConfig()
    const size = Math.max(config.sizeMin, Math.min(config.sizeMax, 60))
    const r = size / 2
    const x = cx + orbitRadius * Math.cos(startAngle) - r
    const y = cy + orbitRadius * Math.sin(startAngle) - r

    const id = `planet-${++planetIdCounter}`
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    svg.classList.add('planet')
    svg.dataset.planetId = id
    svg.style.opacity = '0'
    svg.style.transition = 'opacity 0.5s ease'

    drawPlanet(svg, id, config.type, r, r, r, size)
    svg.style.transform = `translate(${x}px, ${y}px)`
    container.value.appendChild(svg)
    requestAnimationFrame(() => {
      svg.style.opacity = '0.92'
    })

    const item: PlanetItem = {
      id,
      el: svg,
      x,
      y,
      scale: 1,
      scaleEnd: 1,
      lifetime: Infinity,
      elapsed: 0,
      removeTimeout: null,
      orbiting: true,
      orbitAngle: startAngle,
      orbitRadius,
      orbitSpeed,
      orbitCx: cx,
      orbitCy: cy,
    }
    planets.push(item)
    return { id, type: config.type }
  }

  function markPlanetAsRescue(id: string, materialIcon?: string): void {
    const item = planets.find((p) => p.id === id)
    if (!item) return

    // Cancel lifecycle auto-remove — event controls removal now
    if (item.removeTimeout !== null) {
      clearTimeout(item.removeTimeout)
      item.removeTimeout = null
    }

    // Distress animation + styling
    item.el.classList.add('planet--rescue')

    const size = parseFloat(item.el.getAttribute('width') ?? '80')

    // Add material icon at the top if available
    if (materialIcon) {
      const matText = document.createElementNS(NS, 'text')
      matText.setAttribute('x', String(size / 2))
      matText.setAttribute('y', String(size * 0.3))
      matText.setAttribute('text-anchor', 'middle')
      matText.setAttribute('dominant-baseline', 'middle')
      matText.setAttribute('font-size', String(size * 0.5))
      matText.setAttribute('pointer-events', 'none')
      matText.textContent = materialIcon
      item.el.appendChild(matText)
    }

    // Click opens the rescue modal
    item.el.addEventListener('click', () => {
      planetEventStore.openRescueModal()
    })
  }

  function triggerExplosion(planetId: string): void {
    const idx = planets.findIndex((p) => p.id === planetId)
    if (idx === -1) return
    const item = planets[idx]
    planets.splice(idx, 1)
    item.el.style.animation = 'planetExplode 0.7s ease-out forwards'
    item.el.style.pointerEvents = 'none'
    setTimeout(() => {
      if (container.value?.contains(item.el)) container.value.removeChild(item.el)
    }, 750)
  }

  function triggerSaved(planetId: string): void {
    const idx = planets.findIndex((p) => p.id === planetId)
    if (idx === -1) return
    const item = planets[idx]
    planets.splice(idx, 1)
    item.el.style.animation = 'planetSaved 0.55s ease-out forwards'
    item.el.style.pointerEvents = 'none'
    setTimeout(() => {
      if (container.value?.contains(item.el)) container.value.removeChild(item.el)
    }, 600)
  }

  function scheduleNextPlanet(): void {
    const delay =
      PLANET_SPAWN_INTERVAL_MIN +
      Math.random() * (PLANET_SPAWN_INTERVAL_MAX - PLANET_SPAWN_INTERVAL_MIN)
    spawnTimeout = setTimeout(() => {
      if (container.value && planets.length < PLANET_MAX_COUNT) {
        spawnPlanet()
      }
      scheduleNextPlanet()
    }, delay)
  }

  function animatePlanets(timestamp: number): void {
    if (lastTimestamp === 0) lastTimestamp = timestamp
    const rawDelta = (timestamp - lastTimestamp) / 1000
    const delta = Math.min(rawDelta, 0.1)
    lastTimestamp = timestamp

    const w = container.value?.clientWidth ?? window.innerWidth
    const h = container.value?.clientHeight ?? window.innerHeight

    for (let i = planets.length - 1; i >= 0; i--) {
      const planet = planets[i]
      if (planet.orbiting) {
        planet.orbitAngle! += planet.orbitSpeed! * delta
        const pSize = parseFloat(planet.el.getAttribute('width') ?? '60')
        planet.x = planet.orbitCx! + planet.orbitRadius! * Math.cos(planet.orbitAngle!) - pSize / 2
        planet.y = planet.orbitCy! + planet.orbitRadius! * Math.sin(planet.orbitAngle!) - pSize / 2
        planet.el.style.transform = `translate(${planet.x}px,${planet.y}px)`
      } else {
        planet.elapsed += delta * 1000
        const p = Math.min(planet.elapsed / planet.lifetime, 1)
        planet.scale = 0.05 + (planet.scaleEnd - 0.05) * (p * p)

        let opacity: number
        if (p < 0.1) opacity = p / 0.1
        else if (p < 0.8) opacity = 1
        else opacity = 1 - (p - 0.8) / 0.2

        planet.el.style.opacity = opacity.toFixed(2)
        planet.el.style.transform = `translate(${planet.x}px,${planet.y}px) scale(${planet.scale.toFixed(3)})`

        if (p >= 1) {
          removePlanet(planet.id)
        }
      }
    }

    animFrame = requestAnimationFrame(animatePlanets)
  }

  // ─── Store watchers ─────────────────────────────────────────────────────────

  // 1. Rescue spawnen
  watch(
    () => planetEventStore.pendingRescue,
    (pending) => {
      if (!pending || !container.value) return
      const { id: targetId, type: targetType } = spawnOrbitPlanet()
      // Activate first so potentialMaterialId is set before we render the icon
      planetEventStore.activatePlanetRescue(targetId, targetType)
      const materialId = planetEventStore.activePlanetEvent?.potentialMaterialId
      const materialIcon = materialId ? MATERIALS.find((m) => m.id === materialId)?.icon : undefined
      markPlanetAsRescue(targetId, materialIcon)
      container.value.classList.add('stars--rescue-active')
    },
  )

  // 2. Event expired → Explosion
  watch(
    () => planetEventStore.activePlanetEvent?.expired,
    (expired) => {
      if (expired && planetEventStore.activePlanetEvent) {
        triggerExplosion(planetEventStore.activePlanetEvent.planetId)
      }
    },
  )

  // 3. Planet saved → Saved-Animation
  watch(
    () => planetEventStore.activePlanetEvent?.saved,
    (saved) => {
      if (saved && planetEventStore.activePlanetEvent) {
        triggerSaved(planetEventStore.activePlanetEvent.planetId)
      }
    },
  )

  // 4. isEventActive → Klasse togglen (NUR dieser, den alten löschen)
  watch(
    () => planetEventStore.isEventActive,
    (active) => {
      if (!container.value) return
      container.value.classList.toggle('stars--rescue-active', active)
    },
  )

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  // Nach den bestehenden Watch-Blöcken hinzufügen:
  function handleVisibilityChange() {
    if (document.visibilityState !== 'visible') return

    // Prüfe ob Event während Hintergrund abgelaufen ist
    planetEventStore.forceCheckExpiry()

    // DOM und Klasse aufräumen falls Event bereits vorbei
    if (!planetEventStore.isEventActive && container.value) {
      container.value.classList.remove('stars--rescue-active')

      // Veraltete Rescue-Planeten aus dem DOM entfernen
      const stalePlanets = container.value.querySelectorAll('.planet--rescue')
      stalePlanets.forEach((el) => {
        if (container.value?.contains(el)) container.value.removeChild(el)
      })
      // Auch aus planets-Array entfernen
      for (let i = planets.length - 1; i >= 0; i--) {
        if (planets[i].el.classList.contains('planet--rescue')) {
          planets.splice(i, 1)
        }
      }
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    animFrame = requestAnimationFrame(animatePlanets)
    scheduleNextPlanet()
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    cancelAnimationFrame(animFrame)
    if (spawnTimeout) clearTimeout(spawnTimeout)
    timeouts.forEach(clearTimeout)
    for (const planet of planets) {
      if (container.value?.contains(planet.el)) container.value.removeChild(planet.el)
    }
    planets.length = 0
  })
}
