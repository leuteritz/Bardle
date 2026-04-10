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
  pickConfig,
  type PlanetType,
  type PlanetTypeConfig,
  PLANET_TYPE_CONFIGS,
} from '../utils/planetDraw'
import { generateUniquePlanetName, releasePlanetName } from './usePlanetNames'
import { MATERIALS } from '../config/materials'
import type { PlanetItem } from '../types'

// Re-export for consumers (avoids unused import warnings)
export type { PlanetType, PlanetTypeConfig }
export { PLANET_TYPE_CONFIGS }

let planetIdCounter = 0

// ─── 3D-Ellipsen-Orbit (identisch mit ChampionOrbit) ──────────────────────

function getOrbitPos(
  angle: number,
  rx: number,
  ry: number,
  tilt: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const cosT = Math.cos(tilt),
    sinT = Math.sin(tilt)
  const cosA = Math.cos(angle),
    sinA = Math.sin(angle)
  return {
    x: cx + rx * cosA * cosT - ry * sinA * sinT,
    y: cy + rx * cosA * sinT + ry * sinA * cosT,
  }
}

const FLY_IN_START_SCALE = 3.5

// ─── Composable ───────────────────────────────────────────────────────────────

export function usePlanetBackground(container: Ref<HTMLElement | null>): {
  planets: Ref<PlanetItem[]>
} {
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

  // Schwebende Hintergrund-Planeten (kein Orbit, nur fade-in/out)
  function spawnPlanet(): string {
    if (!container.value) return ''

    const config = pickConfig()
    const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin)
    const r = size / 2
    const w = container.value.clientWidth || window.innerWidth
    const h = container.value.clientHeight || window.innerHeight

    const mx = w * 0.12
    const my = h * 0.12
    const minCenterDist = Math.min(w, h) * 0.22

    let cx = 0
    let cy = 0
    let attempts = 0

    do {
      cx = mx + Math.random() * (w - 2 * mx)
      cy = my + Math.random() * (h - 2 * my)
      attempts++
    } while (Math.hypot(cx - w / 2, cy - h / 2) < minCenterDist && attempts < 10)

    const x = cx - r
    const y = cy - r

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

  // 3D-Orbit-Planeten (Rescue-Planeten fliegen auf die Ellipse und umkreisen die Sonne)
  function spawnOrbitPlanet(): { id: string; type: PlanetType } {
    if (!container.value) return { id: '', type: 'rocky' }

    const w = container.value.clientWidth ?? window.innerWidth
    const h = container.value.clientHeight ?? window.innerHeight
    const cx = w / 2
    const cy = h / 2

    // Elliptische 3D-Orbit-Parameter
    const orbitRadiusX = 320 + Math.random() * 80
    const orbitRadiusY = 145 + Math.random() * 40
    const tiltRad = 0.15 + Math.random() * 0.2
    const baseSpeed = 0.00012 + Math.random() * 0.00008
    const direction = (Math.random() < 0.5 ? 1 : -1) as 1 | -1
    const startAngle = Math.random() * Math.PI * 2

    const config = pickConfig()
    const size = Math.max(config.sizeMin, Math.min(config.sizeMax, 60))
    const r = size / 2

    // Fly-In: Planet startet 3.5× weiter draußen auf derselben Ellipse
    const startRx = orbitRadiusX * FLY_IN_START_SCALE
    const startRy = orbitRadiusY * FLY_IN_START_SCALE
    const startPos = getOrbitPos(startAngle, startRx, startRy, tiltRad, cx, cy)

    const id = `planet-${++planetIdCounter}`
    const item: PlanetItem = {
      id,
      type: config.type,
      size,
      x: startPos.x - r,
      y: startPos.y - r,
      scale: 1,
      scaleEnd: 1,
      opacity: 0,
      transform: `translate(${startPos.x}px,${startPos.y}px) scale(1) translate(${-r}px,${-r}px)`,
      lifetime: Infinity,
      elapsed: 0,
      removeTimeout: null,
      approaching: true,
      orbiting: false,
      orbitAngle: startAngle,
      orbitRadiusX,
      orbitRadiusY,
      tiltRad,
      baseSpeed,
      direction,
      currentRadiusX: startRx,
      currentRadiusY: startRy,
      orbitCx: cx,
      orbitCy: cy,
      isBehind: false,
      name: generateUniquePlanetName(),
      isRescue: false,
      isGalaxyBoss: false,
      labelData: null,
      animState: 'normal',
    }

    planets.value.push(item)
    nextTick(() => {
      item.opacity = 0.6
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
      chimesImage: '/img/BardAbilities/BardChime.png',
      materialImage: material?.image,
      materialName: material?.name,
      materialCount: material?.dropCount,
      championImage: championImg ?? undefined,
      championName: championName ?? undefined,
      isGalaxyBoss,
      transform: 'translate(-9999px, -9999px)',
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

    const curCx = planet.x + pRadius
    const curCy = planet.y + pRadius

    const oCx = planet.orbitCx ?? window.innerWidth / 2
    const oCy = planet.orbitCy ?? window.innerHeight / 2

    const angle = Math.atan2(curCy - oCy, curCx - oCx)
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)

    const anchorY = curCy + dy * (pRadius + gap)

    if (dx >= 0) {
      return `translate(${curCx + pRadius + gap}px, ${anchorY}px) translateY(-50%)`
    }

    return `translate(${curCx - pRadius - gap}px, ${anchorY}px) translateX(-100%) translateY(-50%)`
  }

  function animatePlanets(timestamp: number): void {
    if (lastTimestamp === 0) lastTimestamp = timestamp

    const rawDelta = (timestamp - lastTimestamp) / 1000
    const delta = Math.min(rawDelta, 0.1)
    lastTimestamp = timestamp

    for (let i = planets.value.length - 1; i >= 0; i--) {
      const planet = planets.value[i]

      if (planet.animState !== 'normal') continue

      if (planet.approaching || planet.orbiting) {
        // ── 3D-Ellipsen-Orbit-System ─────────────────────────────────────────
        const targetRx = planet.orbitRadiusX!
        const targetRy = planet.orbitRadiusY!
        const tilt = planet.tiltRad ?? 0.18
        const oCx = planet.orbitCx!
        const oCy = planet.orbitCy!

        // Fly-In-Spirale: Radius lerpt langsam auf Zielorbit zu
        planet.currentRadiusX! += (targetRx - planet.currentRadiusX!) * 0.018
        planet.currentRadiusY! += (targetRy - planet.currentRadiusY!) * 0.018

        // Sobald Radius nah genug am Ziel → stabiler Orbit
        if (planet.approaching && Math.abs(planet.currentRadiusX! - targetRx) < targetRx * 0.08) {
          planet.approaching = false
          planet.orbiting = true
        }

        // Kepler-Boost: schneller am Äquator (wie Champions)
        const keplerBoost = 1.0 + 0.55 * (1 - Math.abs(Math.cos(planet.orbitAngle!)))
        planet.orbitAngle! +=
          (planet.direction ?? 1) * planet.baseSpeed! * keplerBoost * (delta * 1000)

        // Zielposition auf aktueller (noch schrumpfender) Ellipse
        const tp = getOrbitPos(
          planet.orbitAngle!,
          planet.currentRadiusX!,
          planet.currentRadiusY!,
          tilt,
          oCx,
          oCy,
        )

        // Smooth-Lerp der Planetenmitte
        let curCx = planet.x + planet.size / 2
        let curCy = planet.y + planet.size / 2
        curCx += (tp.x - curCx) * 0.12
        curCy += (tp.y - curCy) * 0.12

        // Top-left speichern (für getLabelTransform)
        planet.x = curCx - planet.size / 2
        planet.y = curCy - planet.size / 2

        // Tiefe & Parallax-Skala (identisch mit Champions)
        const relY = (curCy - oCy) / Math.max(targetRy, 1)
        planet.isBehind = relY < -0.05
        const depth = Math.max(0, Math.min(1, (relY + 1) / 2))
        const pScale = 0.72 + depth * 0.56
        planet.opacity = planet.isBehind ? 0.22 + depth * 0.35 : 0.8 + depth * 0.2

        // 3D-Transform: skaliert um den Mittelpunkt
        planet.transform =
          `translate(${curCx}px, ${curCy}px) ` +
          `scale(${pScale.toFixed(4)}) ` +
          `translate(${-planet.size / 2}px, ${-planet.size / 2}px)`

        activePlanetPositions.set(planet.id, { cx: curCx, cy: curCy })

        if (planet.labelData) {
          planet.labelData.transform = planet.orbiting
            ? getLabelTransform(planet, planet.size)
            : 'translate(-9999px, -9999px)'
        }
      } else {
        // ── Schwebende Hintergrund-Planeten (spawnPlanet) ────────────────────
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
