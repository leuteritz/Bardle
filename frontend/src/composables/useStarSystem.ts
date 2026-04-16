import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useStarGroupStore } from '../stores/starGroupStore'
import { usePlanetBossStore } from '../stores/planetBossStore'
import { useGalaxyStore } from '../stores/galaxyStore'
import { activePlanetPositions } from '../utils/activePlanetPositions'
import { getOrbitPos } from '../utils/orbitMath'
import { MATERIALS } from '../config/materials'
import type { LabelData, PlanetType, StarType } from '../types'

const PLANET_SIZE_CHAMPION = 64
const PLANET_SIZE_GALAXY_BOSS = 72
const PLANET_SIZE_NORMAL = 52

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
  planets: PlanetRenderEntry[]
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

  const material = boss.potentialMaterialId
    ? MATERIALS.find((m) => m.id === boss.potentialMaterialId)
    : null

  const championName = boss.homePlanetChampion ?? null
  const championImg = championName
    ? championName === 'Bard'
      ? '/img/BardAbilities/Bard.png'
      : `/img/champion/${championName}.jpg`
    : null

  // Place label outward from star center, left or right of planet
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
    reward: boss.reward,
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

  const starRenders = ref<StarRenderEntry[]>([])

  // Per-star and per-planet local animation state (not reactive — updated by rAF)
  const starAngles = new Map<string, number>()
  const planetAngles = new Map<string, number>()
  const planetCurRx = new Map<string, number>()
  const planetCurRy = new Map<string, number>()
  // Tracks when each planet entered the 'saved' state so we can remove it after the animation
  const planetSavedAt = new Map<string, number>()

  let animFrame = 0
  let lastTs = 0

  // ── Watchers: trigger star spawns from galaxy state ────────────────────────

  watch(
    () => galaxyStore.championTravelState,
    (state) => {
      if (state === 'champion_available') {
        starGroupStore.spawnChampionStar()
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
        starGroupStore.spawnResourceStar()
      } else if (wasActive) {
        starGroupStore.clearResourceStar()
      }
    },
  )

  // ── Watcher: detect boss defeat / expiry → mark star planet as cleared ─────

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

  // ── rAF animation loop ─────────────────────────────────────────────────────

  function animate(ts: number) {
    const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
    lastTs = ts

    const screenCx = window.innerWidth / 2
    const screenCy = window.innerHeight / 2

    const newRenders: StarRenderEntry[] = []

    for (const star of starGroupStore.activeStars) {
      // Advance star orbit angle
      let sAngle = starAngles.get(star.id) ?? star.starAngle
      sAngle += star.starDirection * star.orbitSpeed * dt
      starAngles.set(star.id, sAngle)

      const { x: sx, y: sy } = getOrbitPos(
        sAngle,
        star.orbitRx,
        star.orbitRy,
        star.orbitTilt,
        screenCx,
        screenCy,
      )

      // Depth calc for star
      const sRelY = (sy - screenCy) / Math.max(star.orbitRy, 1)
      const sIsBehind = sRelY < -0.05
      const sDepth = Math.max(0, Math.min(1, (sRelY + 1) / 2))
      const sScale = 0.72 + sDepth * 0.56
      const sOpacity = sIsBehind ? 0.22 + sDepth * 0.38 : 0.78 + sDepth * 0.22

      const planetEntries: PlanetRenderEntry[] = []

      for (const slot of star.planetSlots) {
        // Advance angle even for cleared planets (so removal animation stays in orbit)
        let pAngle = planetAngles.get(slot.planetId) ?? slot.orbitAngle
        pAngle += slot.orbitDirection * slot.orbitSpeed * dt
        planetAngles.set(slot.planetId, pAngle)

        // Fly-in: start at 2.5× target radius, lerp inward
        const FLY = 2.5
        let curRx = planetCurRx.get(slot.planetId) ?? slot.orbitRx * FLY
        let curRy = planetCurRy.get(slot.planetId) ?? slot.orbitRy * FLY
        curRx += (slot.orbitRx - curRx) * 0.018
        curRy += (slot.orbitRy - curRy) * 0.018
        planetCurRx.set(slot.planetId, curRx)
        planetCurRy.set(slot.planetId, curRy)

        const { x: px, y: py } = getOrbitPos(
          pAngle,
          curRx,
          curRy,
          slot.orbitTilt,
          sx,
          sy,
        )

        const boss = bossStore.activeBosses.find((b) => b.planetId === slot.planetId)

        const isGalaxyBoss = boss?.isGalaxyBoss ?? false
        const pSize = isGalaxyBoss
          ? PLANET_SIZE_GALAXY_BOSS
          : slot.isChampionPlanet
            ? PLANET_SIZE_CHAMPION
            : PLANET_SIZE_NORMAL
        const pR = pSize / 2

        // Depth relative to screen center for proper sun occlusion
        const pRelY = (py - screenCy) / Math.max(star.orbitRy + slot.orbitRy, 1)
        const pIsBehind = pRelY < -0.05
        const pDepth = Math.max(0, Math.min(1, (pRelY + 1) / 2))
        const pScale = 0.72 + pDepth * 0.56
        const pOpacity = pIsBehind ? 0.22 + pDepth * 0.35 : 0.8 + pDepth * 0.2

        const transform =
          `translate(${px}px, ${py}px) ` +
          `scale(${pScale.toFixed(4)}) ` +
          `translate(${-pR}px, ${-pR}px)`

        // Update champion combat targeting map
        if (!slot.cleared) {
          activePlanetPositions.set(slot.planetId, { cx: px, cy: py })
        }

        // Determine anim state
        let animState: PlanetRenderEntry['animState'] = 'normal'
        if (boss?.expired) animState = 'exploding'
        else if (boss?.defeated) animState = 'saved'
        else if (slot.cleared) animState = 'saved'

        // Once saved animation has finished (~600 ms), stop rendering the planet entirely
        if (animState === 'saved') {
          if (!planetSavedAt.has(slot.planetId)) planetSavedAt.set(slot.planetId, ts)
          if (ts - planetSavedAt.get(slot.planetId)! > 600) continue
        }

        // Label only for active (not cleared, not isBehind) planets
        const labelData =
          !slot.cleared && !pIsBehind
            ? buildLabelData(slot.planetId, px, py, pR, sx, sy)
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
        x: sx,
        y: sy,
        scale: sScale,
        opacity: sOpacity,
        isBehind: sIsBehind,
        planets: planetEntries,
      })
    }

    // Clean up position map and savedAt map for removed/cleared planets
    const allActiveSlots = new Set(
      starGroupStore.activeStars
        .flatMap((s) => s.planetSlots)
        .filter((p) => !p.cleared)
        .map((p) => p.planetId),
    )
    for (const id of activePlanetPositions.keys()) {
      if (!allActiveSlots.has(id)) {
        activePlanetPositions.delete(id)
      }
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
