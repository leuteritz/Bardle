import { shallowRef, watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { useStarGroupStore } from '../stores/starGroupStore'
import { usePlanetBossStore } from '../stores/planetBossStore'
import { useGalaxyStore } from '../stores/galaxyStore'
import { useWindowFocus } from './useWindowFocus'
import { useRenderingPaused } from './useRenderingPaused'
import { activePlanetPositions, activeStarCombatState } from '../utils/liveState'
import { getOrbitPos, orbitBehindArc, orbitBehindProgress, starBodySize } from '../utils/geometry'
import { playStarVanishFx } from '../utils/starVanishFx'
import {
  STAR_SPAWN_DURATION_MS,
  STAR_SPAWN_FLY_EASING,
  SUN_RADIUS,
  STAR_BEHIND_SUN_SPEED_MULTIPLIER,
  STAR_FX_TANGENT_PROBE_RAD,
  HOVER_SPEED_MULTIPLIER,
} from '../config/constants'
import { usePlanetShopStore } from '../stores/planetShopStore'
import { useOrbitScale } from './useOrbitScale'
import type { PlanetType, StarType } from '../types'

const PLANET_SIZE_CHAMPION = 12
const PLANET_SIZE_GALAXY_BOSS = 14
const PLANET_SIZE_NORMAL = 10

export const livePlanetAngles = new Map<string, number>()
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
  /** Nur Transportfelder für `activeStarCombatState` — keine Renderwerte. */
  eclipseProgress: number
  eclipseRemainingMs: number
  filterStyle: string
  orbitRx: number
  orbitRy: number
  orbitTilt: number
  hintOpacity: number
  totalPlanets: number
  remainingCount: number
  planets: PlanetRenderEntry[]
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
  const { isRenderingPaused, isIdleRenderingPaused, isIdleSimulationPaused } = useRenderingPaused()

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

  // Resource-Stars werden komplett im gameStore.tick gespawnt/despawnt (läuft
  // auch während Pause) — hier kein Watcher mehr nötig.

  watch(windowFocused, (focused) => {
    if (focused) {
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
          // Ein abgelaufener Boss ist kein Sieg — der Stern verliert damit den
          // Rettungs-Status und bricht am Ende aus der Bahn aus.
          starGroupStore.onBossResult(curr.id, curr.defeated)
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

      // Wie weit ist der Stern durch seine Verdeckung? Verdeckt ODER nicht
      // entscheidet weiterhin sRelY aus der gemalten Position; der Fortschritt
      // kommt aus dem Bahnwinkel, weil das Tempo hinter der Sonne auf das
      // Zehnfache hochgelerpt wird und eine Zeitrechnung deshalb den Austritt
      // verfehlen würde. Beide Wege benutzen dieselbe Formel, können an der
      // Austrittskante aber um einen Frame auseinanderliegen — ein dort noch
      // negativer Fortschritt heißt „so gut wie draußen", also 1.
      let sEclipseProgress = -1
      let sEclipseRemainingMs = 0
      if (sIsBehind) {
        const ratio = scaledOrbitRx / Math.max(scaledOrbitRy, 1)
        const raw = orbitBehindProgress(
          sAngle,
          star.starDirection,
          ratio,
          star.orbitTilt,
          BEHIND_THRESHOLD,
        )
        sEclipseProgress = raw < 0 ? 1 : Math.min(1, raw)

        // Restdauer aus dem verbleibenden Bogen und dem VOLLEN Tempo hinter der
        // Sonne — nicht aus dem Tempo, das der Stern in diesem Frame gerade hat.
        // Beim Eintauchen ist der Speedup noch am Hochlerpen; mit dem Ist-Wert
        // gerechnet stünde im ersten Tick eine absurde Zahl (gemessen: 22 s für
        // eine Verdeckung von 3,8 s), die dann in einem Sprung zusammenfiele.
        // Der Anlauf dauert nur Sekundenbruchteile, deshalb liegt die Rechnung
        // mit dem Zielwert über die ganze Verdeckung nur ~4 % zu niedrig
        // (3,64 s gerechnet gegen 3,81 s gemessen) — und sie ist von der ersten
        // Sekunde an stabil.
        const arc = orbitBehindArc(ratio, star.orbitTilt, BEHIND_THRESHOLD)
        const angularSpeed = star.orbitSpeed * STAR_BEHIND_SUN_SPEED_MULTIPLIER
        sEclipseRemainingMs =
          arc > 0 && angularSpeed > 0 ? ((1 - sEclipseProgress) * arc) / angularSpeed : 0
      }

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
        ? STAR_BEHIND_SUN_SPEED_MULTIPLIER
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
          // Unter dem Bard-Profil oder im Star-Fight-Modal liegt der Orbit unter
          // einem deckenden Overlay — der Effekt würde nur Frame-Budget kosten.
          if (!isIdleRenderingPaused.value) {
            // Ausbruchsrichtung = Bahntangente an dieser Stelle. Ein zweiter
            // Punkt ein Stück weiter auf der Bahn ist billiger und robuster als
            // eine analytische Ableitung über die gekippte Ellipse.
            const ahead = getOrbitPos(
              sAngle + star.starDirection * STAR_FX_TANGENT_PROBE_RAD,
              scaledOrbitRx,
              scaledOrbitRy,
              star.orbitTilt,
              screenCx,
              screenCy,
            )
            playStarVanishFx(star.despawnReason ?? 'expired', {
              x: sx,
              y: sy,
              size: starBodySize(star.starType, sunScale),
              starColor: star.starColor,
              dirX: ahead.x - sx,
              dirY: ahead.y - sy,
            })
          }
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

        if (!slot.cleared) {
          // Kampf-Gate folgt dem Stern, nicht dem lokalen Mini-Orbit: der Planet
          // gilt genau dann als "hinter der Sonne", wenn sein STERN hinter der
          // Sonne fliegt (sIsBehind) — synchron zum visuellen Layering im
          // Idle-Orbit und zum Eclipse-Status im Star-Fight-Modal.
          activePlanetPositions.set(slot.planetId, { cx: px, cy: py, isForeground: !sIsBehind })
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
        eclipseProgress: sEclipseProgress,
        eclipseRemainingMs: sEclipseRemainingMs,
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

    // Kampfrelevanter Sternzustand — geht immer raus, damit der Salven-Takt in
    // StarSystemComponent auch unter dem Bard-Profil weiterläuft.
    for (const r of newRenders) {
      activeStarCombatState.set(r.id, {
        x: r.x,
        y: r.y,
        isBehind: r.isBehind,
        eclipseProgress: r.eclipseProgress,
        eclipseRemainingMs: r.eclipseRemainingMs,
        firablePlanets: r.planets.filter((p) => !p.isBehind && p.animState === 'normal').length,
      })
    }
    for (const id of activeStarCombatState.keys()) {
      if (!newRenders.some((r) => r.id === id)) activeStarCombatState.delete(id)
    }

    // Ab hier nur noch Sichtbares. Unter dem Bard-Profil endet der Frame: die
    // Stern- und Planetenbahnen sind oben schon weitergedreht und
    // activePlanetPositions ist aktuell, also bleibt der Eclipse-Status der
    // Boss-Planeten korrekt — es wird nur nichts davon ausgegeben.
    if (isIdleRenderingPaused.value) {
      animFrame = requestAnimationFrame(animate)
      return
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
        o.eclipseProgress = n.eclipseProgress
        o.eclipseRemainingMs = n.eclipseRemainingMs
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

  // Gestoppt wird nur bei echtem Stillstand (blurred window, hidden tab,
  // pausiertes Spiel). Unter dem Bard-Profil läuft der Loop headless weiter —
  // ohne Ausgabe kostet er nur die Bahn-Mathematik, hält aber Sternflug und
  // Eclipse-Status der Boss-Planeten korrekt am Laufen.
  watch(isIdleSimulationPaused, (paused) => {
    if (paused) {
      cancelAnimationFrame(animFrame)
      animFrame = 0
    } else if (!animFrame) {
      lastTs = 0
      animFrame = requestAnimationFrame(animate)
    }
  })

  onMounted(() => {
    if (!isIdleSimulationPaused.value) {
      animFrame = requestAnimationFrame(animate)
    }
  })

  onUnmounted(() => {
    cancelAnimationFrame(animFrame)
  })

  return { starRenders }
}
