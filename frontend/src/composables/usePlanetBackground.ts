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

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanetItem {
  id: string
  el: SVGSVGElement
  x: number
  y: number
  vx: number
  vy: number
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

  function spawnPlanet(immediate = false): string {
    if (!container.value) return ''
    const config = pickConfig()
    const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin)
    const r = size / 2
    const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin)
    const w = container.value.clientWidth || window.innerWidth
    const h = container.value.clientHeight || window.innerHeight

    let x: number, y: number, vx: number, vy: number
    if (immediate) {
      x = w * 0.2 + Math.random() * w * 0.6
      y = h * 0.2 + Math.random() * h * 0.5
      const angle = Math.random() * Math.PI * 2
      vx = Math.cos(angle) * speed * 0.4
      vy = Math.sin(angle) * speed * 0.4
    } else {
      const edge = Math.floor(Math.random() * 4)
      if (edge === 0) {
        x = Math.random() * w
        y = -size
        const a = Math.PI * 0.25 + Math.random() * Math.PI * 0.5
        vx = Math.cos(a) * speed
        vy = Math.sin(a) * speed
      } else if (edge === 1) {
        x = Math.random() * w
        y = h + size
        const a = -Math.PI + Math.PI * 0.25 + Math.random() * Math.PI * 0.5
        vx = Math.cos(a) * speed
        vy = Math.sin(a) * speed
      } else if (edge === 2) {
        x = -size
        y = Math.random() * h
        const a = -Math.PI * 0.25 + Math.random() * Math.PI * 0.5
        vx = Math.cos(a) * speed
        vy = Math.sin(a) * speed
      } else {
        x = w + size
        y = Math.random() * h
        const a = Math.PI - Math.PI * 0.25 + Math.random() * (-Math.PI * 0.5)
        vx = Math.cos(a) * speed
        vy = Math.sin(a) * speed
      }
    }

    const id = `planet-${++planetIdCounter}`
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    svg.classList.add('planet')
    svg.dataset.planetId = id

    if (!immediate) {
      svg.style.animation = `planetLifecycle ${config.lifetime}ms ease-in-out forwards`
    } else {
      svg.style.opacity = '0.95'
    }

    drawPlanet(svg, id, config.type, r, r, r, size)

    svg.style.transform = `translate(${x}px, ${y}px)`
    container.value.appendChild(svg)

    const removeTimeout = immediate ? null : setTimeout(() => removePlanet(id), config.lifetime)
    if (removeTimeout) timeouts.push(removeTimeout)

    const item: PlanetItem = { id, el: svg, x, y, vx, vy, removeTimeout }
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
      vx: 0,
      vy: 0,
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

  function markPlanetAsRescue(id: string): void {
    const item = planets.find((p) => p.id === id)
    if (!item) return

    // Cancel lifecycle auto-remove — event controls removal now
    if (item.removeTimeout !== null) {
      clearTimeout(item.removeTimeout)
      item.removeTimeout = null
    }

    // Distress animation + styling
    item.el.classList.add('planet--rescue')

    // Add "!" warning text inside the SVG
    const size = parseFloat(item.el.getAttribute('width') ?? '80')
    const warning = document.createElementNS(NS, 'text')
    warning.setAttribute('x', String(size / 2))
    warning.setAttribute('y', String(size * 0.22))
    warning.setAttribute('text-anchor', 'middle')
    warning.setAttribute('dominant-baseline', 'middle')
    warning.setAttribute('font-size', String(size * 0.28))
    warning.setAttribute('fill', '#ff4400')
    warning.setAttribute('font-weight', 'bold')
    warning.setAttribute('font-family', 'sans-serif')
    warning.setAttribute('pointer-events', 'none')
    warning.textContent = '!'
    item.el.appendChild(warning)

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

    for (const planet of planets) {
      if (planet.orbiting) {
        planet.orbitAngle! += planet.orbitSpeed! * delta
        const pSize = parseFloat(planet.el.getAttribute('width') ?? '60')
        planet.x = planet.orbitCx! + planet.orbitRadius! * Math.cos(planet.orbitAngle!) - pSize / 2
        planet.y = planet.orbitCy! + planet.orbitRadius! * Math.sin(planet.orbitAngle!) - pSize / 2
      } else {
        planet.x += planet.vx * delta
        planet.y += planet.vy * delta

        const pSize = parseFloat(planet.el.getAttribute('width') ?? '80')
        const pad = pSize
        if (planet.x < -pad) planet.x += w + pad * 2
        else if (planet.x > w + pad) planet.x -= w + pad * 2
        if (planet.y < -pad) planet.y += h + pad * 2
        else if (planet.y > h + pad) planet.y -= h + pad * 2
      }

      planet.el.style.transform = `translate(${planet.x}px, ${planet.y}px)`
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
      markPlanetAsRescue(targetId)
      planetEventStore.activatePlanetRescue(targetId, targetType)
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
