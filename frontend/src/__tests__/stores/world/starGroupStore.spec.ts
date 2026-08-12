import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import type { PlanetBossEvent } from '@/types'

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
