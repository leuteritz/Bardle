import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useStarGroupStore } from '../stores/starGroupStore'
import { usePlanetBossStore } from '../stores/planetBossStore'
import { useGalaxyStore } from '../stores/galaxyStore'
import { useWindowFocus } from './useWindowFocus'
import { useRenderingPaused } from './useRenderingPaused'
import { activePlanetPositions } from '../utils/activePlanetPositions'
import { getOrbitPos } from '../utils/orbitMath'
import { MATERIALS } from '../config/materials'
import { STAR_SPAWN_DURATION_MS, STAR_SPAWN_FLY_EASING } from '../config/constants'
import type { LabelData, PlanetType, StarType } from '../types'

const PLANET_SIZE_CHAMPION = 64
const PLANET_SIZE_GALAXY_BOSS = 72
const PLANET_SIZE_NORMAL = 52
const VANISH_DURATION_MS = 800
const BEHIND_FADE_BAND = 0.12
const BEHIND_THRESHOLD = -0.05
const BEHIND_SPEED_MULT = 4.5
const STAR_BEHIND_OPACITY = 0.2
const SPEED_LERP = 0.04

export interface PlanetRenderEntry {
  planetId: string
  type: PlanetType
  isChampionPlanet: boolean
  isGalaxyBoss: boolean
  size: number
  transform: string
  opacity: number
  isBehind: boolean
  labelData: LabelData | null
  animState: 'normal' | 'exploding' | 'saved' | 'champion_arriving'
}

export interface StarRenderEntry {
  id: string
  starType: StarType
  x: number
  y: number
  scale: number
  opacity: number
  isBehind: boolean
  filterStyle: string
  orbitRx: number
  orbitRy: number
  orbitTilt: number
  hintOpacity: number
  planets: PlanetRenderEntry[]
}

// ── Programmatische Vanish-Animation ──────────────────────────────────────────
// Erstellt einmalig ein DOM-Element an der eingefrorenen Sternposition,
// animiert die Implosion komplett in JS/CSS und entfernt sich danach selbst.
// Kein Vue-Reaktivitätsproblem, kein Re-Mount, kein Ghost-Element.
function spawnVanishEffect(x: number, y: number, starType: StarType, size: number) {
  const gradients: Record<string, string> = {
    champion: 'radial-gradient(circle, #ffe8a0 0%, #d4a020 45%, #7a4808 100%)',
    resource: 'radial-gradient(circle, #ffffff 0%, #a8d4ff 35%, #2060c8 75%, #0a1a5c 100%)',
    galaxy_boss: 'radial-gradient(circle, #ff9060 0%, #c01818 45%, #4a0000 100%)',
  }
  const shadows: Record<string, string> = {
    champion:
      '0 0 14px rgba(255,200,60,0.9), 0 0 32px rgba(220,140,20,0.6), 0 0 56px rgba(180,100,10,0.3)',
    resource:
      '0 0 12px rgba(160,210,255,0.95), 0 0 28px rgba(80,160,255,0.65), 0 0 52px rgba(30,80,200,0.35)',
    galaxy_boss:
      '0 0 18px rgba(255,80,30,0.95), 0 0 38px rgba(200,20,20,0.7), 0 0 65px rgba(120,0,0,0.4)',
  }

  // Container — positioniert an der eingefrorenen Sternmitte
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    left: ${x - size / 2}px;
    top:  ${y - size / 2}px;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    overflow: visible;
    background: ${gradients[starType] ?? gradients.resource};
    box-shadow: ${shadows[starType] ?? shadows.resource};
  `

  // Shockwave-Ring
  const shockwave = document.createElement('div')
  shockwave.style.cssText = `
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.85);
    pointer-events: none;
  `
  container.appendChild(shockwave)
  document.body.appendChild(container)

  // Web Animations API — kein CSS-Klassen-Toggle, kein Re-Mount-Problem
  const easing = 'cubic-bezier(0.4, 0, 0.6, 1)'

  container.animate(
    [
      { transform: 'scale(1)', opacity: '1', filter: 'brightness(1)' },
      { transform: 'scale(0.7)', opacity: '1', filter: 'brightness(1.3)', offset: 0.15 },
      { transform: 'scale(1.6)', opacity: '1', filter: 'brightness(6) saturate(0)', offset: 0.4 },
      { transform: 'scale(0.4)', opacity: '0.8', filter: 'brightness(3)', offset: 0.55 },
      { transform: 'scale(0.1)', opacity: '0.3', filter: 'brightness(1)', offset: 0.8 },
      { transform: 'scale(0)', opacity: '0', filter: 'brightness(1)' },
    ],
    { duration: VANISH_DURATION_MS, easing, fill: 'forwards' },
  )

  shockwave.animate(
    [
      { transform: 'scale(1)', opacity: '0.9' },
      { transform: 'scale(1.5)', opacity: '0.6', offset: 0.3 },
      { transform: 'scale(3.2)', opacity: '0.25', offset: 0.65 },
      { transform: 'scale(5)', opacity: '0' },
    ],
    { duration: VANISH_DURATION_MS, easing: 'ease-out', fill: 'forwards' },
  )

  // Element nach Animation sauber aus dem DOM entfernen
  setTimeout(() => {
    container.remove()
  }, VANISH_DURATION_MS + 50)
}

function buildLabelData(
  planetId: string,
  cx: number,
  cy: number,
  pR: number,
  starX: number,
  starY: number,
): LabelData | null {
  const bossStore = usePlanetBossStore()
  const boss = bossStore.activeBosses.find((b) => b.planetId === planetId)
  if (!boss || boss.defeated || boss.expired) return null

  const firstMaterialSlot = boss.rewardSlots.find((s) => s.type === 'material')
  const material = firstMaterialSlot?.materialId
    ? MATERIALS.find((m) => m.id === firstMaterialSlot.materialId)
    : null

  const championName = boss.homePlanetChampion ?? null
  const championImg = championName
    ? championName === 'Bard'
      ? '/img/BardAbilities/Bard.png'
      : `/img/champion/${championName}.jpg`
    : null

  const angle = Math.atan2(cy - starY, cx - starX)
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const gap = 10
  const anchorY = cy + dy * (pR + gap)
  const transform =
    dx >= 0
      ? `translate(${cx + pR + gap}px, ${anchorY}px) translateY(-50%)`
      : `translate(${cx - pR - gap}px, ${anchorY}px) translateX(-100%) translateY(-50%)`

  return {
    planetId,
    bossName: boss.bossName,
    currentHP: boss.currentHP,
    maxHP: boss.maxHP,
    reward: boss.rewardSlots
      .filter((s) => s.type === 'chimes')
      .reduce((sum, s) => sum + (s.amount ?? 0), 0),
    chimesImage: '/img/BardAbilities/BardChime.png',
    materialImage: material?.image,
    materialName: material?.name,
    materialCount: material?.dropCount,
    championImage: championImg ?? undefined,
    championName: championName ?? undefined,
    isGalaxyBoss: boss.isGalaxyBoss ?? false,
    transform,
  }
}

export function useStarSystem() {
  const starGroupStore = useStarGroupStore()
  const bossStore = usePlanetBossStore()
  const galaxyStore = useGalaxyStore()
  const { windowFocused } = useWindowFocus()
  const { isRenderingPaused } = useRenderingPaused()

  const starRenders = ref<StarRenderEntry[]>([])

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const starAngles = new Map<string, number>()
  const planetAngles = new Map<string, number>()
  const planetCurRx = new Map<string, number>()
  const planetCurRy = new Map<string, number>()
  const planetSavedAt = new Map<string, number>()
  const starSpawnedAt = new Map<string, number>()
  const starSpeedMul = new Map<string, number>()
  const starFlyStart = new Map<string, { x: number; y: number }>()
  // Statt isVanishing im Render: Set der IDs für die bereits gespawnt wurde
  const vanishFired = new Set<string>()

  let animFrame = 0
  let lastTs = 0

  watch(
    () => galaxyStore.championTravelState,
    (state) => {
      if (state === 'champion_available') {
        if (isRenderingPaused.value) {
          galaxyStore.pendingChampionStar = true
        } else {
          starGroupStore.spawnChampionStar()
        }
      }
    },
  )

  watch(
    () => galaxyStore.pendingGalaxyBoss,
    (pending) => {
      if (pending) {
        starGroupStore.spawnGalaxyBossStar()
      }
    },
  )

  watch(
    () => galaxyStore.resourceStarActive,
    (active, wasActive) => {
      if (active) {
        if (isRenderingPaused.value) {
          galaxyStore.pendingResourceStars++
        } else {
          starGroupStore.spawnResourceStar()
        }
      } else if (wasActive && starGroupStore.hasActiveResourceStar) {
        starGroupStore.clearResourceStar()
      }
    },
  )

  watch(windowFocused, (focused) => {
    if (focused) {
      if (galaxyStore.pendingResourceStars > 0) {
        starGroupStore.spawnResourceStar()
        galaxyStore.pendingResourceStars = 0
      }
      if (galaxyStore.pendingChampionStar) {
        starGroupStore.spawnChampionStar()
        galaxyStore.pendingChampionStar = false
      }
    }
  })

  watch(
    () =>
      bossStore.activeBosses.map((b) => ({
        id: b.planetId,
        defeated: b.defeated,
        expired: b.expired,
      })),
    (cur, prev) => {
      if (!prev) return
      for (const curr of cur) {
        const was = prev.find((p) => p.id === curr.id)
        if (!was) continue
        if ((curr.defeated && !was.defeated) || (curr.expired && !was.expired)) {
          starGroupStore.onBossResult(curr.id)
        }
      }
    },
    { deep: true },
  )

  function animate(ts: number) {
    const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
    lastTs = ts

    const screenCx = window.innerWidth / 2
    const screenCy = window.innerHeight / 2

    const newRenders: StarRenderEntry[] = []

    for (const star of starGroupStore.activeStars) {
      let speedMul = starSpeedMul.get(star.id) ?? 1.0
      let sAngle = starAngles.get(star.id) ?? star.starAngle
      sAngle += star.starDirection * star.orbitSpeed * speedMul * dt
      starAngles.set(star.id, sAngle)

      const { x: sx, y: sy } = getOrbitPos(
        sAngle,
        star.orbitRx,
        star.orbitRy,
        star.orbitTilt,
        screenCx,
        screenCy,
      )

      const sRelY = (sy - screenCy) / Math.max(star.orbitRy, 1)
      const sIsBehind = sRelY < BEHIND_THRESHOLD
      const sDepth = Math.max(0, Math.min(1, (sRelY + 1) / 2))

      const visibleFactor = Math.max(0, Math.min(1,
        (sRelY - BEHIND_THRESHOLD + BEHIND_FADE_BAND) / BEHIND_FADE_BAND,
      ))
      const starFactor = Math.max(STAR_BEHIND_OPACITY, visibleFactor)

      if (!starSpawnedAt.has(star.id)) {
        starFlyStart.set(star.id, {
          x: Math.random() * window.innerWidth,
          y: window.innerHeight * (0.5 + Math.random() * 0.5),
        })
        starSpawnedAt.set(star.id, ts)
      }
      const spawnT = Math.min(1, (ts - starSpawnedAt.get(star.id)!) / STAR_SPAWN_DURATION_MS)
      const spawnFactor = reducedMotion ? 1 : 1 - Math.pow(1 - spawnT, STAR_SPAWN_FLY_EASING)

      let displayX = sx
      let displayY = sy
      if (!reducedMotion && spawnT < 1) {
        const fly = starFlyStart.get(star.id)
        if (fly) {
          displayX = fly.x + (sx - fly.x) * spawnFactor
          displayY = fly.y + (sy - fly.y) * spawnFactor
        }
      }

      const targetMul = sIsBehind ? BEHIND_SPEED_MULT : 1.0
      starSpeedMul.set(star.id, speedMul + (targetMul - speedMul) * SPEED_LERP)

      const baseScale = 0.72 + sDepth * 0.56
      const sScale = baseScale * (reducedMotion ? 1 : Math.max(0.05, spawnFactor))
      const sOpacity = starFactor * (0.78 + sDepth * 0.22) * spawnFactor
      const blurPx = sIsBehind ? ((1 - sDepth) * 2.5).toFixed(1) : '0'
      const starFilterStyle = parseFloat(blurPx) > 0.1 ? `blur(${blurPx}px)` : ''

      const allSlotsCleared = star.planetSlots.every((s) => s.cleared)

      if (allSlotsCleared) {
        // Einmalig die Vanish-Animation spawnen — danach nie wieder
        if (!vanishFired.has(star.id)) {
          vanishFired.add(star.id)
          const size = star.starType === 'galaxy_boss' ? 82 : star.starType === 'champion' ? 72 : 62
          spawnVanishEffect(sx, sy, star.starType, size)
        }
        // Stern nicht in newRenders — Vue rendert ihn nicht mehr
        continue
      }

      const planetEntries: PlanetRenderEntry[] = []

      for (const slot of star.planetSlots) {
        let pAngle = planetAngles.get(slot.planetId) ?? slot.orbitAngle
        pAngle += slot.orbitDirection * slot.orbitSpeed * dt
        planetAngles.set(slot.planetId, pAngle)

        const FLY = 2.5
        let curRx = planetCurRx.get(slot.planetId) ?? slot.orbitRx * FLY
        let curRy = planetCurRy.get(slot.planetId) ?? slot.orbitRy * FLY
        curRx += (slot.orbitRx - curRx) * 0.018
        curRy += (slot.orbitRy - curRy) * 0.018
        planetCurRx.set(slot.planetId, curRx)
        planetCurRy.set(slot.planetId, curRy)

        const { x: px, y: py } = getOrbitPos(pAngle, curRx, curRy, slot.orbitTilt, displayX, displayY)

        const boss = bossStore.activeBosses.find((b) => b.planetId === slot.planetId)
        const isGalaxyBoss = boss?.isGalaxyBoss ?? false
        const pSize = isGalaxyBoss
          ? PLANET_SIZE_GALAXY_BOSS
          : slot.isChampionPlanet
            ? PLANET_SIZE_CHAMPION
            : PLANET_SIZE_NORMAL
        const pR = pSize / 2

        const pRelY = (py - sy) / Math.max(slot.orbitRy, 1)
        const pIsBehind = pRelY < -0.05
        const pDepth = Math.max(0, Math.min(1, (pRelY + 1) / 2))
        const pScale = 0.72 + pDepth * 0.56
        const pOpacity = (0.2 + pDepth * 0.8) * visibleFactor * spawnFactor

        const transform =
          `translate(${px}px, ${py}px) ` +
          `scale(${pScale.toFixed(4)}) ` +
          `translate(${-pR}px, ${-pR}px)`

        if (!slot.cleared) {
          activePlanetPositions.set(slot.planetId, { cx: px, cy: py })
        }

        let animState: PlanetRenderEntry['animState'] = 'normal'
        if (boss?.expired) animState = 'exploding'
        else if (boss?.defeated) animState = 'saved'
        else if (slot.cleared) animState = 'saved'

        if (animState === 'saved') {
          if (!planetSavedAt.has(slot.planetId)) planetSavedAt.set(slot.planetId, ts)
          if (ts - planetSavedAt.get(slot.planetId)! > 600) continue
        }

        const labelData =
          !slot.cleared && !pIsBehind && !sIsBehind
            ? buildLabelData(slot.planetId, px, py, pR, displayX, displayY)
            : null

        planetEntries.push({
          planetId: slot.planetId,
          type: slot.type,
          isChampionPlanet: slot.isChampionPlanet,
          isGalaxyBoss,
          size: pSize,
          transform,
          opacity: pOpacity,
          isBehind: pIsBehind,
          labelData,
          animState,
        })
      }

      newRenders.push({
        id: star.id,
        starType: star.starType,
        x: displayX,
        y: displayY,
        scale: sScale,
        opacity: sOpacity,
        isBehind: sIsBehind,
        filterStyle: starFilterStyle,
        orbitRx: star.orbitRx,
        orbitRy: star.orbitRy,
        orbitTilt: star.orbitTilt,
        hintOpacity: (1 - visibleFactor) * spawnFactor,
        planets: planetEntries,
      })
    }

    // Cleanup vanishFired für Stars die nicht mehr in activeStars sind
    for (const id of vanishFired) {
      if (!starGroupStore.activeStars.some((s) => s.id === id)) {
        vanishFired.delete(id)
      }
    }
    for (const id of starSpawnedAt.keys()) {
      if (!starGroupStore.activeStars.some((s) => s.id === id)) starSpawnedAt.delete(id)
    }
    for (const id of starSpeedMul.keys()) {
      if (!starGroupStore.activeStars.some((s) => s.id === id)) starSpeedMul.delete(id)
    }
    for (const id of starFlyStart.keys()) {
      if (!starGroupStore.activeStars.some((s) => s.id === id)) starFlyStart.delete(id)
    }

    const allActiveSlots = new Set(
      starGroupStore.activeStars
        .flatMap((s) => s.planetSlots)
        .filter((p) => !p.cleared)
        .map((p) => p.planetId),
    )
    for (const id of activePlanetPositions.keys()) {
      if (!allActiveSlots.has(id)) activePlanetPositions.delete(id)
    }
    for (const id of planetSavedAt.keys()) {
      if (!starGroupStore.activeStars.some((s) => s.planetSlots.some((p) => p.planetId === id))) {
        planetSavedAt.delete(id)
      }
    }

    starRenders.value = newRenders
    animFrame = requestAnimationFrame(animate)
  }

  onMounted(() => {
    animFrame = requestAnimationFrame(animate)
  })

  onUnmounted(() => {
    cancelAnimationFrame(animFrame)
  })

  return { starRenders }
}
