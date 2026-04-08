import { watch, onMounted, onUnmounted, nextTick, ref } from 'vue'
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
  drawPlanet,
  pickConfig,
  type PlanetType,
  type PlanetTypeConfig,
  PLANET_TYPE_CONFIGS,
} from '../utils/planetDraw'
import { generateUniquePlanetName, releasePlanetName } from './usePlanetNames'
import { MATERIALS } from '../config/materials'
import type { PlanetItem, LabelData } from '../types'

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

export function usePlanetBackground(
  container: Ref<HTMLElement | null>,
): { planets: Ref<PlanetItem[]> } {
  const planetEventStore = usePlanetEventStore()
  const bossStore = usePlanetBossStore()

  const planets = ref<PlanetItem[]>([])
  const timeouts: ReturnType<typeof setTimeout>[] = []
  let spawnTimeout: ReturnType<typeof setTimeout> | null = null
  let animFrame = 0
  let lastTimestamp = 0

  function removePlanet(id: string): void {
    const idx = planets.value.findIndex((p) => p.id === id)
    if (idx === -1) return
    const item = planets.value[idx]
    if (item.removeTimeout !== null) clearTimeout(item.removeTimeout)
    if (item.name) {
      releasePlanetName(item.name)
      item.name = undefined
    }
    activePlanetPositions.delete(id)
    planets.value.splice(idx, 1)
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

    const item: PlanetItem = {
      id,
      type: config.type,
      size,
      x,
      y,
      scale: 0.05,
      scaleEnd,
      opacity: 0,
      transform: `translate(${x}px,${y}px) scale(0.05)`,
      lifetime,
      elapsed: 0,
      removeTimeout: null,
      isRescue: false,
      isGalaxyBoss: false,
      labelData: null,
      animState: 'normal',
    }
    planets.value.push(item)
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

    const item: PlanetItem = {
      id,
      type: config.type,
      size,
      x: spawnX,
      y: spawnY,
      scale: 1,
      scaleEnd: 1,
      opacity: 0,
      transform: `translate(${spawnX}px,${spawnY}px)`,
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
      isRescue: false,
      isGalaxyBoss: false,
      labelData: null,
      animState: 'normal',
    }
    planets.value.push(item)

    // Fade in via CSS transition (applied in PlanetComponent)
    nextTick(() => {
      item.opacity = 0.92
    })

    return { id, type: config.type }
  }

  function markPlanetAsRescue(id: string): void {
    const item = planets.value.find((p) => p.id === id)
    if (!item) return

    if (item.removeTimeout !== null) {
      clearTimeout(item.removeTimeout)
      item.removeTimeout = null
    }

    const boss = bossStore.activeBosses.find((b) => b.planetId === id)
    const isGalaxyBoss = boss?.isGalaxyBoss ?? false

    item.isRescue = true
    item.isGalaxyBoss = isGalaxyBoss

    const material = boss?.potentialMaterialId
      ? MATERIALS.find((m) => m.id === boss.potentialMaterialId)
      : null

    const championName = boss?.homePlanetChampion ?? null
    const championImg = championName
      ? championName === 'Bard'
        ? '/img/BardAbilities/Bard.png'
        : `/img/champion/${championName}.jpg`
      : null

    item.labelData = {
      planetId: id,
      bossName: boss?.bossName ?? '???',
      currentHP: boss?.currentHP ?? 0,
      maxHP: boss?.maxHP ?? 1,
      reward: boss?.reward ?? null,
      materialImage: material?.image,
      materialName: material?.name,
      championImage: championImg ?? undefined,
      championName: championName ?? undefined,
      isGalaxyBoss,
      transform: getLabelTransform(item, item.size),
    }
  }

  function triggerExplosion(planetId: string): void {
    const item = planets.value.find((p) => p.id === planetId)
    if (!item) return

    activePlanetPositions.delete(planetId)
    if (item.name) {
      releasePlanetName(item.name)
      item.name = undefined
    }
    item.labelData = null
    item.animState = 'exploding'

    setTimeout(() => {
      const idx = planets.value.findIndex((p) => p.id === planetId)
      if (idx !== -1) planets.value.splice(idx, 1)
    }, 750)
  }

  function triggerSaved(planetId: string): void {
    const item = planets.value.find((p) => p.id === planetId)
    if (!item) return

    activePlanetPositions.delete(planetId)
    if (item.name) {
      releasePlanetName(item.name)
      item.name = undefined
    }
    item.labelData = null
    item.animState = 'saved'

    setTimeout(() => {
      const idx = planets.value.findIndex((p) => p.id === planetId)
      if (idx !== -1) planets.value.splice(idx, 1)
    }, 600)
  }

  function scheduleNextPlanet(): void {
    const delay =
      PLANET_SPAWN_INTERVAL_MIN +
      Math.random() * (PLANET_SPAWN_INTERVAL_MAX - PLANET_SPAWN_INTERVAL_MIN)
    spawnTimeout = setTimeout(() => {
      if (container.value && planets.value.length < PLANET_MAX_COUNT) {
        spawnPlanet()
      }
      scheduleNextPlanet()
    }, delay)
  }

  function getLabelTransform(planet: PlanetItem, pSize: number): string {
    const pRadius = pSize / 2
    const gap = 10

    const pcx = planet.x + pRadius
    const pcy = planet.y + pRadius

    const cx = planet.orbitCx ?? window.innerWidth / 2
    const cy = planet.orbitCy ?? window.innerHeight / 2
    const angle = Math.atan2(pcy - cy, pcx - cx)
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)

    const anchorY = pcy + dy * (pRadius + gap)

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

    for (let i = planets.value.length - 1; i >= 0; i--) {
      const planet = planets.value[i]

      // Skip planets in exit animations — their CSS animation handles visuals
      if (planet.animState !== 'normal') continue

      if (planet.approaching) {
        planet.approachElapsed! += delta * 1000
        const t = Math.min(planet.approachElapsed! / planet.approachDuration!, 1)
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        planet.x = planet.approachFromX! + (planet.approachToX! - planet.approachFromX!) * e
        planet.y = planet.approachFromY! + (planet.approachToY! - planet.approachFromY!) * e
        planet.transform = `translate(${planet.x}px,${planet.y}px)`

        if (planet.labelData) {
          planet.labelData.transform = getLabelTransform(planet, planet.size)
        }

        if (t >= 1) {
          planet.approaching = false
          planet.orbiting = true
        }
      } else if (planet.orbiting) {
        planet.orbitAngle! += planet.orbitSpeed! * delta
        planet.x = planet.orbitCx! + planet.orbitRadius! * Math.cos(planet.orbitAngle!) - planet.size / 2
        planet.y = planet.orbitCy! + planet.orbitRadius! * Math.sin(planet.orbitAngle!) - planet.size / 2
        planet.transform = `translate(${planet.x}px,${planet.y}px)`

        activePlanetPositions.set(planet.id, {
          cx: planet.x + planet.size / 2,
          cy: planet.y + planet.size / 2,
        })

        if (planet.labelData) {
          planet.labelData.transform = getLabelTransform(planet, planet.size)
        }
      } else {
        planet.elapsed += delta * 1000
        const p = Math.min(planet.elapsed / planet.lifetime, 1)
        planet.scale = 0.05 + (planet.scaleEnd - 0.05) * (p * p)

        let opacity: number
        if (p < 0.1) opacity = p / 0.1
        else if (p < 0.8) opacity = 1
        else opacity = 1 - (p - 0.8) / 0.2

        planet.opacity = opacity
        planet.transform = `translate(${planet.x}px,${planet.y}px) scale(${planet.scale.toFixed(3)})`

        if (p >= 1) {
          removePlanet(planet.id)
        }
      }
    }

    animFrame = requestAnimationFrame(animatePlanets)
  }

  // ─── Store watchers ─────────────────────────────────────────────────────────

  watch(
    () => planetEventStore.pendingRescue,
    async (pending) => {
      if (!pending || !container.value) return
      const { id: targetId, type: targetType } = spawnOrbitPlanet()
      planetEventStore.activatePlanetRescue(targetId, targetType)
      await nextTick()
      const spawnedBoss = bossStore.activeBosses.find((b) => b.planetId === targetId)
      if (!spawnedBoss || !container.value) return
      markPlanetAsRescue(targetId)
      container.value.classList.add('stars--rescue-active')
    },
  )

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

  watch(
    () => planetEventStore.isEventActive,
    (active) => {
      if (!container.value) return
      container.value.classList.toggle('stars--rescue-active', active)
    },
  )

  watch(
    () => bossStore.activeBosses.map((b) => ({ id: b.planetId, hp: b.currentHP, maxHP: b.maxHP })),
    (cur) => {
      for (const info of cur) {
        const planet = planets.value.find((p) => p.id === info.id)
        if (planet?.labelData) {
          planet.labelData.currentHP = info.hp
          planet.labelData.maxHP = info.maxHP
        }
      }
    },
    { deep: true },
  )

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  function handleVisibilityChange() {
    if (document.visibilityState !== 'visible') return

    planetEventStore.forceCheckExpiry()

    if (!planetEventStore.isEventActive && container.value) {
      container.value.classList.remove('stars--rescue-active')

      for (let i = planets.value.length - 1; i >= 0; i--) {
        if (planets.value[i].isRescue) {
          if (planets.value[i].name) releasePlanetName(planets.value[i].name!)
          planets.value.splice(i, 1)
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
    for (const planet of planets.value) {
      if (planet.name) releasePlanetName(planet.name)
    }
    planets.value = []
  })

  return { planets }
}
