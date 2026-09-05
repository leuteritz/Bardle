import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import type { PlanetBossEvent } from '@/types'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import {
  STAR_REMOVAL_DELAY_MS,
  STAR_DESPAWN_DELAY_MS,
  STAR_FIGHT_VANISH_SETTLE_MS,
} from '@/config/constants'

/**
 * Der Getter liest von den beiden Arrays nur `id` / `planetSlots[].planetId`
 * bzw. `planetId` / `defeated` / `expired`. Der Zustand wird deshalb direkt
 * gestellt statt über die Spawn-Actions erspielt: die ziehen halbe Galaxie und
 * Sonnenphase mit, ohne dass eines davon in diese Rechnung einginge.
 */
function makeStar(id: string, planetIds: string[]) {
  return {
    id,
    starType: 'resource' as const,
    look: 'dwarf' as const,
    seed: 0,
    starAngle: 0,
    starDirection: 1 as const,
    orbitRx: 100,
    orbitRy: 60,
    orbitTilt: 0,
    orbitSpeed: 0.1,
    starColor: [255, 214, 0] as [number, number, number],
    planetSlots: planetIds.map((planetId) => ({
      planetId,
      type: 'rock' as never,
      isChampionPlanet: false,
      orbitAngle: 0,
      orbitSpeed: 0.1,
      orbitDirection: 1 as const,
      orbitRx: 30,
      orbitRy: 18,
      orbitTilt: 0,
      cleared: false,
    })),
  }
}

function makeBoss(planetId: string, over: Partial<PlanetBossEvent> = {}): PlanetBossEvent {
  return {
    planetId,
    planetType: 'rock' as never,
    bossName: 'Test Boss',
    startTime: Date.now(),
    enrageTimerMs: 60_000,
    maxHP: 100,
    currentHP: 100,
    clickDamagePerHit: 1,
    passiveDPS: 1,
    totalDamageDealt: 0,
    rewardSlots: [],
    defeated: false,
    expired: false,
    ...over,
  }
}

/** Der Ausdruck, der vor dem Getter an jeder Anzeigestelle einzeln stand. */
function legacyTargetedStarId(): string | null {
  const starStore = useStarGroupStore()
  const boss = usePlanetBossStore().activeBoss
  if (!boss || boss.defeated || boss.expired) return null
  return (
    starStore.activeStars.find((s) => s.planetSlots.some((p) => p.planetId === boss.planetId))
      ?.id ?? null
  )
}

describe('starGroupStore.targetedStarId', () => {
  let starStore: ReturnType<typeof useStarGroupStore>
  let bossStore: ReturnType<typeof usePlanetBossStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    starStore = useStarGroupStore()
    bossStore = usePlanetBossStore()
    starStore.activeStars = []
    bossStore.activeBosses = []
    bossStore.selectedBossId = null
  })

  it('is null without stars and without bosses', () => {
    expect(starStore.targetedStarId).toBeNull()
    expect(starStore.targetedStarId).toBe(legacyTargetedStarId())
  })

  it('is null while a star stands but nothing is being fought', () => {
    starStore.activeStars = [makeStar('star-1', ['star-planet-1'])]
    expect(starStore.targetedStarId).toBeNull()
  })

  it('names the star owning the active boss', () => {
    starStore.activeStars = [makeStar('star-1', ['star-planet-1', 'star-planet-2'])]
    bossStore.activeBosses = [makeBoss('star-planet-2')]
    expect(starStore.targetedStarId).toBe('star-1')
    expect(starStore.targetedStarId).toBe(legacyTargetedStarId())
  })

  it('follows selectedBossId to the second star', () => {
    starStore.activeStars = [makeStar('star-1', ['p-1']), makeStar('star-2', ['p-2'])]
    bossStore.activeBosses = [makeBoss('p-1'), makeBoss('p-2')]

    expect(starStore.targetedStarId).toBe('star-1')

    bossStore.selectedBossId = 'p-2'
    expect(starStore.targetedStarId).toBe('star-2')
    expect(starStore.targetedStarId).toBe(legacyTargetedStarId())
  })

  it('is null once the selected boss is defeated or expired', () => {
    starStore.activeStars = [makeStar('star-1', ['p-1'])]
    bossStore.activeBosses = [makeBoss('p-1')]
    bossStore.selectedBossId = 'p-1'

    bossStore.activeBosses[0].defeated = true
    expect(starStore.targetedStarId).toBeNull()

    bossStore.activeBosses[0].defeated = false
    bossStore.activeBosses[0].expired = true
    expect(starStore.targetedStarId).toBeNull()
    expect(starStore.targetedStarId).toBe(legacyTargetedStarId())
  })

  it('is null for a boss whose planet belongs to no active star', () => {
    starStore.activeStars = [makeStar('star-1', ['p-1'])]
    bossStore.activeBosses = [makeBoss('orphan-planet')]
    bossStore.selectedBossId = 'orphan-planet'
    expect(starStore.targetedStarId).toBeNull()
    expect(starStore.targetedStarId).toBe(legacyTargetedStarId())
  })

  it('never names more than one star', () => {
    starStore.activeStars = [
      makeStar('star-1', ['p-1', 'p-2']),
      makeStar('star-2', ['p-3']),
      makeStar('star-3', ['p-4']),
    ]
    bossStore.activeBosses = [makeBoss('p-1'), makeBoss('p-3'), makeBoss('p-4')]

    for (const id of ['p-1', 'p-3', 'p-4']) {
      bossStore.selectedBossId = id
      const hit = starStore.activeStars.filter((s) => s.id === starStore.targetedStarId)
      expect(hit).toHaveLength(1)
    }
  })
})

/**
 * Der Champion-Stern darf nie ausbleiben.
 *
 * `spawnChampionStar()` kehrt sofort zurück, solange noch ein Champion-Stern
 * lebt — etwa der Vorgänger in seiner Entfernungsverzögerung. Das ist richtig
 * so, macht den Aufruf aber zu einem Versuch, der scheitern KANN. Wer ihn nur
 * beim Zustandswechsel auf 'champion_available' auslöst, verliert den Stern
 * genau dann lautlos, und weil der Zustand danach stehen bleibt, kommt kein
 * zweiter Versuch: die Reise ist zu Ende, der Stern erscheint nicht, und damit
 * steht die ganze Stern→Boss→Material→Galaxie-Kette für immer.
 *
 * Gemessen in einem 72-Stunden-Lauf: ab Spielstunde 15,8 keine einzige
 * Sternrettung mehr über acht Spielstunden, während Chimes und Material
 * weiterliefen. Der Watcher in `useStarSystem` beobachtet deshalb den Zustand
 * ZUSAMMEN mit `hasActiveChampionStar` — diese Spec hält die Eigenschaft fest,
 * auf die er sich verlässt.
 */
describe('spawnChampionStar — ein verpuffter Versuch muss nachholbar sein', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lehnt ab, solange ein Champion-Stern steht, und gelingt danach', () => {
    const starStore = useStarGroupStore()

    starStore.spawnChampionStar()
    expect(starStore.hasActiveChampionStar).toBe(true)
    const first = starStore.activeStars.find((s) => s.starType === 'champion')!

    // Zweiter Versuch bei besetztem Platz: nichts passiert, kein Fehler.
    starStore.spawnChampionStar()
    expect(starStore.activeStars.filter((s) => s.starType === 'champion')).toHaveLength(1)

    // Sobald der alte weg ist, trägt derselbe Aufruf wieder — genau darauf
    // stützt sich das Nachziehen im Orbit-Layer.
    starStore.activeStars = starStore.activeStars.filter((s) => s.id !== first.id)
    expect(starStore.hasActiveChampionStar).toBe(false)

    starStore.spawnChampionStar()
    expect(starStore.hasActiveChampionStar).toBe(true)
  })
})

describe('starFightOutro — das Modal fährt heraus und schliesst sich selbst', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function openTwoPlanetStar() {
    const starStore = useStarGroupStore()
    const bossStore = usePlanetBossStore()
    starStore.activeStars = [makeStar('s1', ['p1', 'p2']) as never]
    bossStore.activeBosses = [makeBoss('p1'), makeBoss('p2')]
    starStore.openStarFightModal('s1')
    return { starStore, bossStore }
  }

  it('setzt beim letzten Planeten das Outro, statt zu schliessen', () => {
    const { starStore } = openTwoPlanetStar()
    expect(starStore.starFightOutro).toBe(false)
    starStore.advanceStarFight()
    expect(starStore.starFightCurrentIndex).toBe(1)
    expect(starStore.starFightOutro).toBe(false)
    starStore.advanceStarFight()
    expect(starStore.starFightOutro).toBe(true)
    expect(starStore.starFightModalOpen).toBe(true)
    expect(starStore.starFightCurrentIndex).toBe(1)
    expect(starStore.currentFightPlanetId).toBe('p2')
  })

  it('_despawnResourceStar schliesst NICHT im Outro — danach schon', () => {
    const { starStore } = openTwoPlanetStar()
    starStore.advanceStarFight()
    starStore.advanceStarFight()
    starStore._despawnResourceStar('s1')
    expect(starStore.starFightModalOpen).toBe(true)
    starStore.closeStarFightModal()
    expect(starStore.starFightOutro).toBe(false)
    expect(starStore.starFightModalOpen).toBe(false)

    const again = openTwoPlanetStar()
    again.starStore._despawnResourceStar('s1')
    expect(again.starStore.starFightModalOpen).toBe(false)
  })

  it('openStarFightModal beginnt ohne Outro', () => {
    const { starStore } = openTwoPlanetStar()
    starStore.starFightOutro = true
    starStore.closeStarFightModal()
    starStore.openStarFightModal('s1')
    expect(starStore.starFightOutro).toBe(false)
  })
})

describe('Sternentfernung wartet auf das Schliessen des Star-Fight-Modals', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function twoStars() {
    const starStore = useStarGroupStore()
    const bossStore = usePlanetBossStore()
    starStore.activeStars = [makeStar('s1', ['p1', 'p2']) as never, makeStar('s2', ['q1']) as never]
    bossStore.activeBosses = [makeBoss('p1'), makeBoss('p2'), makeBoss('q1')]
    return { starStore, bossStore }
  }

  it('hält den Kampfstern, solange das Modal offen ist, und entfernt ihn danach', () => {
    const { starStore } = twoStars()
    starStore.openStarFightModal('s1')
    starStore.onBossResult('p1', true)
    starStore.onBossResult('p2', true)
    expect(starStore.starFightOutro).toBe(true)
    vi.advanceTimersByTime(STAR_REMOVAL_DELAY_MS * 3)
    expect(starStore.activeStars.some((s) => s.id === 's1')).toBe(true)
    starStore.closeStarFightModal()
    vi.advanceTimersByTime(STAR_REMOVAL_DELAY_MS - 1)
    expect(starStore.activeStars.some((s) => s.id === 's1')).toBe(true)
    vi.advanceTimersByTime(2)
    expect(starStore.activeStars.some((s) => s.id === 's1')).toBe(false)
  })

  it('entfernt bei geschlossenem Modal wie bisher nach STAR_REMOVAL_DELAY_MS', () => {
    const { starStore } = twoStars()
    starStore.onBossResult('p1', true)
    starStore.onBossResult('p2', true)
    vi.advanceTimersByTime(STAR_REMOVAL_DELAY_MS + 1)
    expect(starStore.activeStars.some((s) => s.id === 's1')).toBe(false)
  })

  it('hält auch einen FREMDEN Stern, der während des Kampfes abläuft', () => {
    const { starStore } = twoStars()
    starStore.openStarFightModal('s1')
    starStore._despawnResourceStar('s2')
    expect(starStore.activeStars.find((s) => s.id === 's2')?.despawnReason).toBe('expired')
    vi.advanceTimersByTime(STAR_DESPAWN_DELAY_MS * 5)
    expect(starStore.activeStars.some((s) => s.id === 's2')).toBe(true)
    expect(starStore.starFightModalOpen).toBe(true)
    starStore.closeStarFightModal()
    vi.advanceTimersByTime(STAR_REMOVAL_DELAY_MS + 1)
    expect(starStore.activeStars.some((s) => s.id === 's2')).toBe(false)
  })

  it('closeStarFightModal ohne gehaltene Sterne entfernt nichts', () => {
    const { starStore } = twoStars()
    starStore.openStarFightModal('s1')
    starStore.closeStarFightModal()
    vi.advanceTimersByTime(STAR_REMOVAL_DELAY_MS * 2)
    expect(starStore.activeStars).toHaveLength(2)
  })
})

describe('Rollenwahl und Abflug warten auf den Abgang des Sterns', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function championStar() {
    const starStore = useStarGroupStore()
    const bossStore = usePlanetBossStore()
    const galaxy = useGalaxyStore()
    galaxy.pendingRoleSelection = false
    galaxy.nextStarRole = 'top'
    galaxy.starsRequired = 3
    galaxy.starsRescued = 0
    galaxy.championTravelState = 'champion_spawned'
    const star = { ...makeStar('c1', ['p1']), starType: 'champion' as const }
    starStore.activeStars = [star as never]
    bossStore.activeBosses = [makeBoss('p1')]
    return { starStore, galaxy }
  }

  it('hält die Rollenwahl bei offenem Modal zurück und gibt sie nach dem Effekt frei', () => {
    const { starStore, galaxy } = championStar()
    starStore.openStarFightModal('c1')
    starStore.onBossResult('p1', true)
    expect(galaxy.starsRescued).toBe(1)
    expect(galaxy.attemptResults).toEqual(['rescued'])
    expect(galaxy.pendingRoleSelection).toBe(false)
    expect(galaxy.rescueFollowUp).toBe('role')
    vi.advanceTimersByTime(10_000)
    expect(galaxy.pendingRoleSelection).toBe(false)
    starStore.closeStarFightModal()
    vi.advanceTimersByTime(STAR_REMOVAL_DELAY_MS + STAR_FIGHT_VANISH_SETTLE_MS - 1)
    expect(galaxy.pendingRoleSelection).toBe(false)
    vi.advanceTimersByTime(2)
    expect(galaxy.pendingRoleSelection).toBe(true)
    expect(galaxy.rescueFollowUp).toBeNull()
  })

  it('öffnet die Rollenwahl sofort, wenn kein Modal offen ist', () => {
    const { starStore, galaxy } = championStar()
    starStore.onBossResult('p1', true)
    expect(galaxy.pendingRoleSelection).toBe(true)
    expect(galaxy.rescueFollowUp).toBeNull()
  })

  it('hält beim letzten Stern den Abflug zum Galaxiekern zurück', () => {
    const { starStore, galaxy } = championStar()
    galaxy.starsRequired = 1
    starStore.openStarFightModal('c1')
    starStore.onBossResult('p1', true)
    expect(galaxy.travelingToGalaxyBoss).toBe(true)
    expect(galaxy.rescueFollowUp).toBe('travel')
    expect(galaxy.championTravelState).not.toBe('traveling')
    starStore.closeStarFightModal()
    vi.advanceTimersByTime(STAR_REMOVAL_DELAY_MS + STAR_FIGHT_VANISH_SETTLE_MS + 1)
    expect(galaxy.championTravelState).toBe('traveling')
  })
})
