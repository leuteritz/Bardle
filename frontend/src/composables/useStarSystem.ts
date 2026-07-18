import { shallowRef, watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { useStarGroupStore } from '../stores/starGroupStore'
import { usePlanetBossStore } from '../stores/planetBossStore'
import { useGalaxyStore } from '../stores/galaxyStore'
import { useWindowFocus } from './useWindowFocus'
import { useRenderingPaused } from './useRenderingPaused'
import { activePlanetPositions } from '../utils/activePlanetPositions'
import { getOrbitPos } from '../utils/orbitMath'
import { STAR_SPAWN_DURATION_MS, STAR_SPAWN_FLY_EASING, SUN_RADIUS, BEHIND_SUN_SPEED_MULTIPLIER, HOVER_SPEED_MULTIPLIER } from '../config/constants'
import { usePlanetShopStore } from '../stores/planetShopStore'
import { useOrbitScale } from './useOrbitScale'
import type { PlanetType, StarType } from '../types'

const PLANET_SIZE_CHAMPION = 12
const PLANET_SIZE_GALAXY_BOSS = 14
const PLANET_SIZE_NORMAL = 10

export const livePlanetAngles = new Map<string, number>()
const VANISH_DURATION_MS = 800
const BEHIND_FADE_BAND = 0.12
const BEHIND_THRESHOLD = -0.05
const STAR_BEHIND_OPACITY = 0.2
const SPEED_LERP = 0.04

// Planeten werden nicht mehr um die Sterne gerendert — die Einträge dienen
// nur noch der Logik (Zähler, Gegner-Salven, Fluch-Zuordnung, Ziel-Positionen).
export interface PlanetRenderEntry {
  planetId: string
  type: PlanetType
  isChampionPlanet: boolean
  isGalaxyBoss: boolean
  size: number
  isBehind: boolean
  animState: 'normal' | 'exploding' | 'saved' | 'champion_arriving'
}

export interface StarRenderEntry {
  id: string
  starType: StarType
  starColor: [number, number, number]
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
  totalPlanets: number
  remainingCount: number
  planets: PlanetRenderEntry[]
}

function spawnVanishEffect(x: number, y: number, starColor: [number, number, number], size: number) {
  const [r, g, b] = starColor
  const r2 = Math.round(r * 0.55), g2 = Math.round(g * 0.55), b2 = Math.round(b * 0.55)
  const gradient = `radial-gradient(circle, rgb(${r},${g},${b}) 0%, rgb(${r2},${g2},${b2}) 45%, rgb(0,0,0) 100%)`
  const shadow = [
    `0 0 14px rgba(${r},${g},${b},0.9)`,
    `0 0 32px rgba(${r},${g},${b},0.6)`,
    `0 0 56px rgba(${r},${g},${b},0.3)`,
  ].join(', ')

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
    background: ${gradient};
    box-shadow: ${shadow};
  `

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

  setTimeout(() => {
    container.remove()
  }, VANISH_DURATION_MS + 50)
}

/**
 * @param onFrame Wird nach jedem Animations-Tick aufgerufen. `starRenders`
 *   ist ein shallowRef: Positionsfelder werden pro Frame IN-PLACE mutiert
 *   (kein Vue-Re-Render); ein neues Array wird nur bei strukturellen
 *   Änderungen zugewiesen (Stern/Planet kommt/geht, Ebenenwechsel, animState).
 *   Der Aufrufer schreibt die Positionswerte in onFrame direkt ans DOM.
 */
export function useStarSystem(hoveredStarId?: Ref<string | null>, onFrame?: () => void) {
  const starGroupStore = useStarGroupStore()
  const bossStore = usePlanetBossStore()
  const galaxyStore = useGalaxyStore()
  const planetShopStore = usePlanetShopStore()
  const { windowFocused } = useWindowFocus()
  const { isRenderingPaused, isIdleRenderingPaused } = useRenderingPaused()

  const starRenders = shallowRef<StarRenderEntry[]>([])
  let structureSig: string | null = null

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const starAngles = new Map<string, number>()
  const planetAngles = new Map<string, number>()
  const planetCurRx = new Map<string, number>()
  const planetCurRy = new Map<string, number>()
  const planetSavedAt = new Map<string, number>()
  const starSpawnedAt = new Map<string, number>()
  const starSpeedMul = new Map<string, number>()
  const starFlyStart = new Map<string, { x: number; y: number }>()
  const vanishFired = new Set<string>()

  const { orbitScale } = useOrbitScale()

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

  // Endkampf-Choreografie am Galaxiekern: zuerst kommen die Eskorten-Wellen —
  // sobald keine Eskorte mehr lebt und noch welche ausstehen, rückt die
  // nächste Welle an. Erst wenn ALLE Eskorten besiegt sind, erscheint der
  // Bossstern als Finale. `immediate` deckt den Reload mitten in der
  // Bossphase ab (activeStars starten dann leer, egal an welchem Punkt).
  watch(
    () => ({
      pendingBoss: galaxyStore.pendingGalaxyBoss,
      phaseActive: galaxyStore.bossPhaseActive,
      remaining: galaxyStore.bossEscortsRemaining,
      alive: starGroupStore.aliveBossEscortCount,
    }),
    ({ pendingBoss, phaseActive, remaining, alive }) => {
      if (!phaseActive || alive > 0) return
      if (remaining > 0) {
        starGroupStore.spawnBossEscortWave()
      } else if (pendingBoss) {
        starGroupStore.spawnGalaxyBossStar()
      }
    },
    { immediate: true },
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
  )

  function animate(ts: number) {
    const dt = lastTs === 0 ? 16 : Math.min(ts - lastTs, 50)
    lastTs = ts

    const screenCx = window.innerWidth / 2
    const screenCy = window.innerHeight / 2
    const sunScale = planetShopStore.orbitSunScale
    const orbitScaleVal = orbitScale.value

    const vMin = Math.min(window.innerWidth, window.innerHeight)
    const adcBaseRy = SUN_RADIUS * 5.43
    const adcBaseRx = SUN_RADIUS * 12.67
    const adcRawRy = adcBaseRy * sunScale * orbitScaleVal
    const adcMinRy = Math.max(planetShopStore.orbitSunRadius * 2.6, vMin * 0.22)
    const adcFlooredRy = Math.max(adcRawRy, adcMinRy)
    const adcFlooredRx = adcFlooredRy * (adcBaseRx / adcBaseRy)
    const adcActualRx = Math.min(adcFlooredRx, screenCx * 0.85)

    const newRenders: StarRenderEntry[] = []
    let sig = ''

    const bossByPlanet = new Map(bossStore.activeBosses.map((b) => [b.planetId, b]))

    for (const star of starGroupStore.activeStars) {
      const speedMul = starSpeedMul.get(star.id) ?? 1.0
      let sAngle = starAngles.get(star.id) ?? star.starAngle
      sAngle += star.starDirection * star.orbitSpeed * speedMul * dt
      starAngles.set(star.id, sAngle)

      const starSunScale = Math.max(0.9, sunScale)
      let scaledOrbitRx = star.orbitRx * starSunScale * orbitScaleVal
      let scaledOrbitRy = star.orbitRy * starSunScale * orbitScaleVal

      if (star.starType !== 'galaxy_boss') {
        const starAspect = star.orbitRx / star.orbitRy
        const tierGap = star.starType === 'resource' ? 140 : 60
        const minRx = adcActualRx + tierGap
        if (scaledOrbitRx < minRx) {
          scaledOrbitRx = minRx
          scaledOrbitRy = minRx / starAspect
        }
        const viewportMaxRx = screenCx - 20
        if (scaledOrbitRx > viewportMaxRx) {
          const capFactor = viewportMaxRx / scaledOrbitRx
          scaledOrbitRx *= capFactor
          scaledOrbitRy *= capFactor
        }
      }

      const { x: sx, y: sy } = getOrbitPos(
        sAngle,
        scaledOrbitRx,
        scaledOrbitRy,
        star.orbitTilt,
        screenCx,
        screenCy,
      )

      const sRelY = (sy - screenCy) / Math.max(scaledOrbitRy, 1)
      const sIsBehind = sRelY < BEHIND_THRESHOLD
      const sDepth = Math.max(0, Math.min(1, (sRelY + 1) / 2))

      const visibleFactor = Math.max(
        0,
        Math.min(1, (sRelY - BEHIND_THRESHOLD + BEHIND_FADE_BAND) / BEHIND_FADE_BAND),
      )
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

      const isHovered = !sIsBehind && !reducedMotion && hoveredStarId?.value === star.id
      const targetMul = sIsBehind
        ? BEHIND_SUN_SPEED_MULTIPLIER
        : isHovered
          ? HOVER_SPEED_MULTIPLIER
          : 1.0
      starSpeedMul.set(star.id, speedMul + (targetMul - speedMul) * SPEED_LERP)

      const baseScale = 0.72 + sDepth * 0.56
      const sScale = baseScale * (reducedMotion ? 1 : Math.max(0.05, spawnFactor))
      const sOpacity = starFactor * (0.78 + sDepth * 0.22) * spawnFactor
      // Blur auf 0.5px-Stufen quantisieren: weniger Filter-Neuberechnungen pro Frame
      const blurPx = sIsBehind ? Math.round((1 - sDepth) * 2.5 * 2) / 2 : 0
      const starFilterStyle = blurPx > 0.1 ? `blur(${blurPx}px)` : ''

      const allSlotsCleared = star.planetSlots.every((s) => s.cleared)

      if (allSlotsCleared) {
        if (!vanishFired.has(star.id)) {
          vanishFired.add(star.id)
          const size =
            star.starType === 'galaxy_boss'
              ? 96
              : star.starType === 'champion'
                ? 72
                : star.starType === 'boss_escort'
                  ? 54
                  : 62
          spawnVanishEffect(sx, sy, star.starColor, size)
        }
        continue
      }

      const planetEntries: PlanetRenderEntry[] = []

      for (const slot of star.planetSlots) {
        let pAngle = planetAngles.get(slot.planetId) ?? slot.orbitAngle
        pAngle += slot.orbitDirection * slot.orbitSpeed * dt
        planetAngles.set(slot.planetId, pAngle)
        livePlanetAngles.set(slot.planetId, pAngle)

        const FLY = 2.5
        const targetSlotRx = slot.orbitRx * sunScale * orbitScaleVal
        const targetSlotRy = slot.orbitRy * sunScale * orbitScaleVal
        let curRx = planetCurRx.get(slot.planetId) ?? targetSlotRx * FLY
        let curRy = planetCurRy.get(slot.planetId) ?? targetSlotRy * FLY
        curRx += (targetSlotRx - curRx) * 0.018
        curRy += (targetSlotRy - curRy) * 0.018
        planetCurRx.set(slot.planetId, curRx)
        planetCurRy.set(slot.planetId, curRy)

        const { x: px, y: py } = getOrbitPos(
          pAngle,
          curRx,
          curRy,
          slot.orbitTilt,
          displayX,
          displayY,
        )

        const boss = bossByPlanet.get(slot.planetId)
        const isGalaxyBoss = boss?.isGalaxyBoss ?? false
        const pSize =
          (isGalaxyBoss
            ? PLANET_SIZE_GALAXY_BOSS
            : slot.isChampionPlanet
              ? PLANET_SIZE_CHAMPION
              : PLANET_SIZE_NORMAL) * Math.pow(sunScale, 0.65)

        const pRelY = (py - sy) / Math.max(targetSlotRy, 1)
        const pIsBehind = pRelY < -0.05
        const pDepth = Math.max(0, Math.min(1, (pRelY + 1) / 2))

        if (!slot.cleared) {
          const isForeground = !pIsBehind && pDepth > 0.65
          activePlanetPositions.set(slot.planetId, { cx: px, cy: py, isForeground })
        }

        let animState: PlanetRenderEntry['animState'] = 'normal'
        if (boss?.expired) animState = 'exploding'
        else if (boss?.defeated) animState = 'saved'
        else if (slot.cleared) animState = 'saved'

        if (animState === 'saved') {
          if (!planetSavedAt.has(slot.planetId)) planetSavedAt.set(slot.planetId, ts)
          if (ts - planetSavedAt.get(slot.planetId)! > 600) continue
        }

        planetEntries.push({
          planetId: slot.planetId,
          type: slot.type,
          isChampionPlanet: slot.isChampionPlanet,
          isGalaxyBoss,
          size: pSize,
          isBehind: pIsBehind,
          animState,
        })
      }

      const remainingCount = planetEntries.reduce(
        (n, p) => n + (p.animState !== 'saved' ? 1 : 0),
        0,
      )

      // Struktur-Signatur: alles, was Mount/Unmount beeinflusst. Positionswerte
      // und die Vor/Hinter-Zuordnung der Planeten (flippt alle ~1,3s pro Planet!)
      // gehören bewusst NICHT dazu — Layering läuft per Frame über display/zIndex.
      sig +=
        `${star.id}|${star.starType}|${sIsBehind ? 1 : 0}|${remainingCount}|` +
        `${Math.round(scaledOrbitRx)}|${Math.round(scaledOrbitRy)}`
      for (const p of planetEntries) {
        sig += `;${p.planetId}|${p.animState}|${p.isGalaxyBoss ? 1 : 0}|${p.size.toFixed(1)}`
      }
      sig += '#'

      newRenders.push({
        id: star.id,
        starType: star.starType,
        starColor: star.starColor,
        x: displayX,
        y: displayY,
        scale: sScale,
        opacity: sOpacity,
        isBehind: sIsBehind,
        filterStyle: starFilterStyle,
        orbitRx: scaledOrbitRx,
        orbitRy: scaledOrbitRy,
        orbitTilt: star.orbitTilt,
        hintOpacity: (1 - visibleFactor) * spawnFactor,
        totalPlanets: star.planetSlots.length,
        remainingCount,
        planets: planetEntries,
      })
    }

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
    for (const id of livePlanetAngles.keys()) {
      if (!allActiveSlots.has(id)) livePlanetAngles.delete(id)
    }
    for (const id of planetSavedAt.keys()) {
      if (!starGroupStore.activeStars.some((s) => s.planetSlots.some((p) => p.planetId === id))) {
        planetSavedAt.delete(id)
      }
    }

    if (sig !== structureSig) {
      // Strukturelle Änderung → Vue rendert neu (Mount/Unmount/Layer-Wechsel)
      structureSig = sig
      starRenders.value = newRenders
    } else {
      // Nur Positionen geändert → in-place mutieren, kein Vue-Re-Render.
      const prev = starRenders.value
      for (let i = 0; i < newRenders.length; i++) {
        const n = newRenders[i]
        const o = prev[i]
        o.x = n.x
        o.y = n.y
        o.scale = n.scale
        o.opacity = n.opacity
        o.filterStyle = n.filterStyle
        o.hintOpacity = n.hintOpacity
        o.orbitRx = n.orbitRx
        o.orbitRy = n.orbitRy
        for (let j = 0; j < n.planets.length; j++) {
          o.planets[j].isBehind = n.planets[j].isBehind
        }
      }
    }

    onFrame?.()
    animFrame = requestAnimationFrame(animate)
  }

  // The orbit loop had no pause guard at all — it kept burning ~60fps of
  // orbit math under the bard overlay, on blurred windows and hidden tabs.
  watch(isIdleRenderingPaused, (paused) => {
    if (paused) {
      cancelAnimationFrame(animFrame)
      animFrame = 0
    } else if (!animFrame) {
      lastTs = 0
      animFrame = requestAnimationFrame(animate)
    }
  })

  onMounted(() => {
    if (!isIdleRenderingPaused.value) {
      animFrame = requestAnimationFrame(animate)
    }
  })

  onUnmounted(() => {
    cancelAnimationFrame(animFrame)
  })

  return { starRenders }
}
