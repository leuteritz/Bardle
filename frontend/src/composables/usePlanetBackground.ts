import { watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { Ref } from 'vue'
import { usePlanetEventStore } from '../stores/planetEventStore'
import { usePlanetBossStore } from '../stores/planetBossStore'
import { activePlanetPositions } from '../utils/activePlanetPositions'
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
import { generateUniquePlanetName, releasePlanetName } from './usePlanetNames'
import { formatNumber } from '../config/numberFormat'
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
  labelEl?: HTMLDivElement
  name?: string
  clickHandler?: () => void
  approaching?: boolean
  approachFromX?: number
  approachFromY?: number
  approachToX?: number
  approachToY?: number
  approachDuration?: number
  approachElapsed?: number
}

// Re-export for consumers (avoids unused import warnings)
export type { PlanetType, PlanetTypeConfig }
export { PLANET_TYPE_CONFIGS }

let planetIdCounter = 0

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getViewportEdgePoint(
  cx: number,
  cy: number,
  angle: number,
  w: number,
  h: number,
): [number, number] {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const candidates: number[] = []
  if (dx > 0) candidates.push((w - cx) / dx)
  else if (dx < 0) candidates.push(-cx / dx)
  if (dy > 0) candidates.push((h - cy) / dy)
  else if (dy < 0) candidates.push(-cy / dy)
  const t = Math.min(...candidates.filter((v) => v > 0))
  return [cx + dx * t, cy + dy * t]
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function usePlanetBackground(container: Ref<HTMLElement | null>): void {
  const planetEventStore = usePlanetEventStore()
  const bossStore = usePlanetBossStore()

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
    if (item.labelEl) {
      if (container.value?.contains(item.labelEl)) container.value.removeChild(item.labelEl)
      item.labelEl = undefined
    }
    if (item.name) {
      releasePlanetName(item.name)
      item.name = undefined
    }
    activePlanetPositions.delete(id)
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

    drawPlanet(svg, id, config.type, r, r, r)

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
    const orbitEntryX = cx + orbitRadius * Math.cos(startAngle) - r
    const orbitEntryY = cy + orbitRadius * Math.sin(startAngle) - r

    const [edgeCx, edgeCy] = getViewportEdgePoint(cx, cy, startAngle, w, h)
    const spawnX = edgeCx - r
    const spawnY = edgeCy - r

    const id = `planet-${++planetIdCounter}`
    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
    svg.classList.add('planet')
    svg.dataset.planetId = id
    svg.style.opacity = '0'
    svg.style.transition = 'opacity 0.5s ease'

    drawPlanet(svg, id, config.type, r, r, r)
    svg.style.transform = `translate(${spawnX}px, ${spawnY}px)`
    container.value.appendChild(svg)
    requestAnimationFrame(() => {
      svg.style.opacity = '0.92'
    })

    const item: PlanetItem = {
      id,
      el: svg,
      x: spawnX,
      y: spawnY,
      scale: 1,
      scaleEnd: 1,
      lifetime: Infinity,
      elapsed: 0,
      removeTimeout: null,
      orbiting: false,
      approaching: true,
      approachFromX: spawnX,
      approachFromY: spawnY,
      approachToX: orbitEntryX,
      approachToY: orbitEntryY,
      approachDuration: 7000 + Math.random() * 3000,
      approachElapsed: 0,
      orbitAngle: startAngle,
      orbitRadius,
      orbitSpeed,
      orbitCx: cx,
      orbitCy: cy,
      name: generateUniquePlanetName(),
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

    // Label-DIV erstellen
    const boss = bossStore.activeBosses.find((b) => b.planetId === id)

    // Distress animation + styling
    const isGalaxyBoss = boss?.isGalaxyBoss ?? false
    item.el.classList.add('planet--rescue')
    if (isGalaxyBoss) {
      item.el.classList.add('planet--rescue--galaxy')
      // Add lila border ring around the planet shape
      const pSize = parseFloat(item.el.getAttribute('width') ?? '60')
      const pr = pSize / 2
      const borderCircle = document.createElementNS(NS, 'circle')
      borderCircle.setAttribute('cx', String(pr))
      borderCircle.setAttribute('cy', String(pr))
      borderCircle.setAttribute('r', String(pr - 1.5))
      borderCircle.setAttribute('fill', 'none')
      borderCircle.setAttribute('stroke', 'rgba(180, 60, 255, 0.85)')
      borderCircle.setAttribute('stroke-width', '2')
      item.el.appendChild(borderCircle)
    }
    item.el.style.pointerEvents = 'auto'
    item.el.style.cursor = 'pointer'

    // Click opens the boss modal for this specific planet
    item.el.addEventListener('click', () => {
      bossStore.openBossModal(id)
    })
    const pSize = parseFloat(item.el.getAttribute('width') ?? '60')

    const material = boss?.potentialMaterialId
      ? MATERIALS.find((m) => m.id === boss.potentialMaterialId)
      : null
    const hpPct = boss ? Math.max(0, (boss.currentHP / boss.maxHP) * 100) : 100

    const championName = boss?.homePlanetChampion ?? null
    const championImg = championName
      ? championName === 'Bard'
        ? '/img/BardAbilities/Bard.png'
        : `/img/champion/${championName}.jpg`
      : null

    const label = document.createElement('div')
    label.className = isGalaxyBoss ? 'planet-label planet-label--galaxy' : 'planet-label'
    label.innerHTML = `
      <span class="planet-label__name">${boss?.bossName ?? '???'}</span>
      <span class="planet-label__hp">♥ ${formatNumber(boss?.currentHP ?? 0)} / ${formatNumber(boss?.maxHP ?? 0)}</span>
      <div class="planet-label__hp-bar-track">
        <div class="planet-label__hp-bar-fill" style="width:${hpPct}%"></div>
      </div>
      ${boss?.reward ? `<span class="planet-label__reward">${formatNumber(boss.reward)} Chimes</span>` : ''}
      ${material ? `<div class="planet-label__material"><img src="${material.image}" alt="${material.name}" />${material.name}</div>` : ''}
      ${championImg ? `<div class="planet-label__champion"><img src="${championImg}" alt="${championName}" /><span>${championName}</span></div>` : ''}
    `
    label.style.transform = getLabelTransform(item, pSize)
    container.value!.appendChild(label)
    item.labelEl = label
  }

  function triggerExplosion(planetId: string): void {
    const idx = planets.findIndex((p) => p.id === planetId)
    if (idx === -1) return
    const item = planets[idx]
    planets.splice(idx, 1)
    activePlanetPositions.delete(planetId)
    if (item.labelEl) {
      if (container.value?.contains(item.labelEl)) container.value.removeChild(item.labelEl)
      item.labelEl = undefined
    }
    if (item.name) {
      releasePlanetName(item.name)
      item.name = undefined
    }
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
    activePlanetPositions.delete(planetId)
    if (item.labelEl) {
      if (container.value?.contains(item.labelEl)) container.value.removeChild(item.labelEl)
      item.labelEl = undefined
    }
    if (item.name) {
      releasePlanetName(item.name)
      item.name = undefined
    }
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

  function getLabelTransform(planet: PlanetItem, pSize: number): string {
    const pRadius = pSize / 2
    const gap = 10

    // Planet center in screen space (planet.x/y is the top-left corner of the SVG)
    const pcx = planet.x + pRadius
    const pcy = planet.y + pRadius

    // Direction from sun center → planet center
    const cx = planet.orbitCx ?? window.innerWidth / 2
    const cy = planet.orbitCy ?? window.innerHeight / 2
    const angle = Math.atan2(pcy - cy, pcx - cx)
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)

    // Y anchor follows the radial angle so the label appears near the outer side of the planet.
    // X anchor uses the planet's leftmost/rightmost edge (not the diagonal point) so the label
    // never overlaps the planet circle regardless of angle.
    const anchorY = pcy + dy * (pRadius + gap)

    // Right half → label extends right; left half → label extends left
    if (dx >= 0) {
      return `translate(${pcx + pRadius + gap}px, ${anchorY}px) translateY(-50%)`
    } else {
      return `translate(${pcx - pRadius - gap}px, ${anchorY}px) translateX(-100%) translateY(-50%)`
    }
  }

  function animatePlanets(timestamp: number): void {
    if (lastTimestamp === 0) lastTimestamp = timestamp
    const rawDelta = (timestamp - lastTimestamp) / 1000
    const delta = Math.min(rawDelta, 0.1)
    lastTimestamp = timestamp

    for (let i = planets.length - 1; i >= 0; i--) {
      const planet = planets[i]
      if (planet.approaching) {
        planet.approachElapsed! += delta * 1000
        const t = Math.min(planet.approachElapsed! / planet.approachDuration!, 1)
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        planet.x = planet.approachFromX! + (planet.approachToX! - planet.approachFromX!) * e
        planet.y = planet.approachFromY! + (planet.approachToY! - planet.approachFromY!) * e
        planet.el.style.transform = `translate(${planet.x}px,${planet.y}px)`

        if (planet.labelEl) {
          const pSize = parseFloat(planet.el.getAttribute('width') ?? '60')
          planet.labelEl.style.transform = getLabelTransform(planet, pSize)
        }

        if (t >= 1) {
          planet.approaching = false
          planet.orbiting = true
        }
      } else if (planet.orbiting) {
        planet.orbitAngle! += planet.orbitSpeed! * delta
        const pSize = parseFloat(planet.el.getAttribute('width') ?? '60')
        planet.x = planet.orbitCx! + planet.orbitRadius! * Math.cos(planet.orbitAngle!) - pSize / 2
        planet.y = planet.orbitCy! + planet.orbitRadius! * Math.sin(planet.orbitAngle!) - pSize / 2
        planet.el.style.transform = `translate(${planet.x}px,${planet.y}px)`

        // Track planet center for champion combat system
        activePlanetPositions.set(planet.id, {
          cx: planet.x + pSize / 2,
          cy: planet.y + pSize / 2,
        })

        if (planet.labelEl) {
          planet.labelEl.style.transform = getLabelTransform(planet, pSize)
        }
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

  // 1. Rescue spawnen — delegates to boss store via planetEventStore
  watch(
    () => planetEventStore.pendingRescue,
    async (pending) => {
      if (!pending || !container.value) return
      const { id: targetId, type: targetType } = spawnOrbitPlanet()
      planetEventStore.activatePlanetRescue(targetId, targetType)
      // Wait one tick so admin overrides are applied before building the label
      await nextTick()
      const spawnedBoss = bossStore.activeBosses.find((b) => b.planetId === targetId)
      if (!spawnedBoss || !container.value) return
      markPlanetAsRescue(targetId)
      container.value.classList.add('stars--rescue-active')
    },
  )

  // 2. Boss expired → Explosion
  watch(
    () => bossStore.activeBosses.map((b) => ({ id: b.planetId, expired: b.expired })),
    (cur, prev) => {
      if (!prev) return
      for (const curr of cur) {
        const was = prev.find((p) => p.id === curr.id)
        if (curr.expired && was && !was.expired) {
          triggerExplosion(curr.id)
        }
      }
    },
    { deep: true },
  )

  // 3. Boss defeated → Saved-Animation
  watch(
    () => bossStore.activeBosses.map((b) => ({ id: b.planetId, defeated: b.defeated })),
    (cur, prev) => {
      if (!prev) return
      for (const curr of cur) {
        const was = prev.find((p) => p.id === curr.id)
        if (curr.defeated && was && !was.defeated) {
          triggerSaved(curr.id)
        }
      }
    },
    { deep: true },
  )

  // 4. isEventActive → Klasse togglen
  watch(
    () => planetEventStore.isEventActive,
    (active) => {
      if (!container.value) return
      container.value.classList.toggle('stars--rescue-active', active)
    },
  )

  // 5. Boss HP → label text + bar live aktualisieren
  watch(
    () => bossStore.activeBosses.map((b) => ({ id: b.planetId, hp: b.currentHP, maxHP: b.maxHP })),
    (cur) => {
      for (const info of cur) {
        const planet = planets.find((p) => p.id === info.id)
        if (!planet?.labelEl) continue
        const pct = Math.max(0, (info.hp / info.maxHP) * 100)

        const hpEl = planet.labelEl.querySelector('.planet-label__hp') as HTMLElement | null
        if (hpEl) {
          hpEl.textContent = `♥ ${formatNumber(info.hp)} / ${formatNumber(info.maxHP)}`
          hpEl.classList.toggle('planet-label__hp--critical', pct < 25)
        }
        const barFill = planet.labelEl.querySelector('.planet-label__hp-bar-fill') as HTMLElement | null
        if (barFill) {
          barFill.style.width = pct + '%'
          barFill.classList.toggle('planet-label__hp-bar-fill--critical', pct < 25)
        }
      }
    },
    { deep: true },
  )

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  function handleVisibilityChange() {
    if (document.visibilityState !== 'visible') return

    // Prüfe ob Boss während Hintergrund abgelaufen ist
    planetEventStore.forceCheckExpiry()

    // DOM und Klasse aufräumen falls Event bereits vorbei
    if (!planetEventStore.isEventActive && container.value) {
      container.value.classList.remove('stars--rescue-active')

      // Veraltete Rescue-Planeten aus dem DOM entfernen
      const stalePlanets = container.value.querySelectorAll('.planet--rescue')
      stalePlanets.forEach((el) => {
        if (container.value?.contains(el)) container.value.removeChild(el)
      })
      // Veraltete Labels entfernen
      const staleLabels = container.value.querySelectorAll('.planet-label')
      staleLabels.forEach((el) => {
        if (container.value?.contains(el)) container.value.removeChild(el)
      })
      // Auch aus planets-Array entfernen
      for (let i = planets.length - 1; i >= 0; i--) {
        if (planets[i].el.classList.contains('planet--rescue')) {
          if (planets[i].name) releasePlanetName(planets[i].name!)
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
      if (planet.labelEl && container.value?.contains(planet.labelEl)) {
        container.value.removeChild(planet.labelEl)
      }
      if (planet.name) releasePlanetName(planet.name)
    }
    planets.length = 0
  })
}
