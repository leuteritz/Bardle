import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useUiStore } from '@/stores/core/uiStore'
import { resetGameClock } from '@/utils/game/gameClock'
import {
  COURSE_OPTION_COUNT,
  GALAXY_TRANS_DECEL_MS,
  GALAXY_TRANS_WARP_MS,
  RESCUE_ROTATION_DURATION_MS,
} from '@/config/constants'

/**
 * Chart your course — die Kurswahl ersetzt das Rollenwahl-Modal.
 *
 * Die Wahl setzt Rolle UND Ort; der Ort steht parallel zu `attemptResults`
 * (dieselbe Index-Gleichheit wie beim Manifest), der Flugzeit-Faktor kommt aus
 * der Entfernung, und nach dem Warp öffnet sich der Galaxy-Tab von selbst.
 */
function stubReducedMotion(matches: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia
}

function manifest() {
  return { planets: 1, cleared: 1, chimes: 0, heldSec: 1, windowSec: 60 }
}

describe('galaxyStore — Kurswahl', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    resetGameClock()
  })
  afterEach(() => vi.useRealTimers())

  it('legt beim Öffnen der Wahl drei Kandidaten mit drei Rollen aus', () => {
    const store = useGalaxyStore()
    store.requestRoleSelection()
    expect(store.pendingRoleSelection).toBe(true)
    expect(store.courseOptions).toHaveLength(COURSE_OPTION_COUNT)
    expect(new Set(store.courseOptions.map((o) => o.role)).size).toBe(COURSE_OPTION_COUNT)
  })

  it('hält den Hintergrund bei offener Wahl NICHT an — Bard treibt', () => {
    const store = useGalaxyStore()
    store.requestRoleSelection()
    expect(store.starsBackgroundPaused).toBe(false)
  })

  it('setzt mit dem Kurs Rolle, Ort und Faktor und bricht auf', () => {
    const store = useGalaxyStore()
    store.requestRoleSelection()
    const opt = store.courseOptions[1]
    store.chartCourse(1)

    expect(store.pendingRoleSelection).toBe(false)
    expect(store.nextStarRole).toBe(opt.role)
    expect(store.courseLegFactor).toBe(opt.legFactor)
    expect(store.starPositions).toEqual([opt.pos])
    expect(store.totalCoursesCharted).toBe(1)
    expect(store.isRescueRotating).toBe(true)
    expect(store.starDots.dots[0]).toEqual(opt.pos)

    vi.advanceTimersByTime(RESCUE_ROTATION_DURATION_MS + 10)
    store.tickChampionTravel()
    expect(store.championTravelState).toBe('traveling')
    expect(store.championTravelBaseDurationMs).toBe(
      Math.round(store.flightMsForFactor(1) * opt.legFactor),
    )
  })

  it('ignoriert einen Kurs ohne offene Wahl oder ausserhalb der Kandidaten', () => {
    const store = useGalaxyStore()
    store.requestRoleSelection()
    store.chartCourse(7)
    expect(store.pendingRoleSelection).toBe(true)
    store.chartCourse(0)
    const charted = store.totalCoursesCharted
    store.chartCourse(0)
    expect(store.totalCoursesCharted).toBe(charted)
  })

  it('confirmRoleSelection wählt den Kandidaten dieser Rolle', () => {
    const store = useGalaxyStore()
    store.requestRoleSelection()
    const opt = store.courseOptions[2]
    store.confirmRoleSelection(opt.role)
    expect(store.nextStarRole).toBe(opt.role)
    expect(store.starPositions[0]).toEqual(opt.pos)
  })

  it('hält starPositions in Index-Gleichheit mit attemptResults, auch beim Fehlschlag', () => {
    const store = useGalaxyStore()
    store.starsRequired = 5
    store.requestRoleSelection()
    store.chartCourse(0)
    store.onChampionStarRescued(manifest())
    expect(store.attemptResults).toEqual(['rescued'])
    expect(store.starPositions).toHaveLength(1)
    expect(store.pendingRoleSelection).toBe(true)

    store.chartCourse(0)
    store.onChampionStarExpired(manifest())
    expect(store.attemptResults).toEqual(['rescued', 'failed'])
    // Die Ersatz-Etappe bekommt ihren Ort im selben Atemzug.
    expect(store.starPositions).toHaveLength(3)
    expect(store.nextStarRole).not.toBeNull()
  })

  it('räumt Orte und Faktor beim Galaxiewechsel', () => {
    const store = useGalaxyStore()
    store.requestRoleSelection()
    store.chartCourse(0)
    stubReducedMotion(false)
    store.adminJumpToGalaxy(2)
    expect(store.starPositions).toEqual([])
    expect(store.courseLegFactor).toBe(1)
    expect(store.pendingRoleSelection).toBe(true)
    expect(store.courseOptions).toHaveLength(COURSE_OPTION_COUNT)
  })

  it('öffnet nach der Warp-Ankunft den Galaxy-Tab live', () => {
    stubReducedMotion(true)
    const store = useGalaxyStore()
    const ui = useUiStore()
    store.starsRescued = store.starsRequired
    store.galaxyBossDefeated = true
    store.bossEscortsTotal = 0
    store.unlockedTier = 9
    store.requestTransition()
    vi.advanceTimersByTime(GALAXY_TRANS_WARP_MS + 100)
    expect(ui.bardActiveTab).toBeNull()
    vi.advanceTimersByTime(GALAXY_TRANS_DECEL_MS)
    expect(store.pendingRoleSelection).toBe(true)
    expect(ui.bardActiveTab).toBe('galaxy')
    expect(ui.pendingGalaxyLive).toBe(true)
  })

  it('nimmt die Orte mit ins Archiv', () => {
    const store = useGalaxyStore()
    store.starsRequired = 1
    store.requestRoleSelection()
    store.chartCourse(0)
    const pos = store.starPositions[0]
    store.onChampionStarRescued(manifest())
    store.galaxyBossDefeated = true
    store.bossEscortsTotal = 0
    store.maybeRecordCompletion()
    expect(store.completedGalaxies[0].starPositions).toEqual([pos])
  })
})
