import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { EXPEDITION_CHART_MAX, EXPEDITION_WAYMARK_MAX } from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

function freed(galaxy: number): CompletedGalaxyRecord {
  return {
    galaxy,
    mapSeed: galaxy * 104729,
    themeIndex: galaxy % 20,
    attemptResults: ['rescued', 'rescued'],
    durationSeconds: 90,
    completedAt: 0,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('expedition chart — das Tor', () => {
  it('bleibt zu, solange keine Galaxie befreit ist', () => {
    const chart = useExpeditionChartStore()
    expect(chart.isUnlocked).toBe(false)
    expect(chart.destinations).toHaveLength(0)
  })

  it('öffnet mit der ersten befreiten Galaxie', () => {
    const chart = useExpeditionChartStore()
    useGalaxyStore().completedGalaxies.push(freed(1))
    expect(chart.isUnlocked).toBe(true)
    expect(chart.destinations).toHaveLength(1)
    expect(chart.maxFreedGalaxy).toBe(1)
  })

  it('sortiert die Ziele mit dem jüngsten zuerst', () => {
    const chart = useExpeditionChartStore()
    const galaxy = useGalaxyStore()
    galaxy.completedGalaxies.push(freed(1), freed(7), freed(3))
    expect(chart.destinations.map((d) => d.galaxy)).toEqual([7, 3, 1])
  })
})

describe('expedition chart — Kartografie', () => {
  beforeEach(() => {
    useGalaxyStore().completedGalaxies.push(freed(4))
  })

  it('zählt jeden Lauf, kartiert aber nur den erfolgreichen', () => {
    const chart = useExpeditionChartStore()
    chart.recordRun(4, 1)
    chart.recordRun(4, 0)
    expect(chart.progressOf(4)).toEqual({ runs: 2, charted: 1 })
  })

  it('deckelt die Kartografie', () => {
    const chart = useExpeditionChartStore()
    for (let i = 0; i < EXPEDITION_CHART_MAX + 5; i++) chart.recordRun(4, 1)
    expect(chart.progressOf(4).charted).toBe(EXPEDITION_CHART_MAX)
  })

  it('gibt für ein unbereistes Ziel einen Nullwert statt undefined', () => {
    expect(useExpeditionChartStore().progressOf(99)).toEqual({ runs: 0, charted: 0 })
  })

  it('zählt nur kartierte Ziele als kartiert', () => {
    const chart = useExpeditionChartStore()
    chart.recordRun(4, 0)
    expect(chart.chartedCount).toBe(0)
    chart.recordRun(4, 1)
    expect(chart.chartedCount).toBe(1)
  })
})

describe('expedition chart — Wegmarken und Zehrung', () => {
  beforeEach(() => {
    useGalaxyStore().completedGalaxies.push(freed(2))
    useBattleStore().ownedChampions.push('Ahri')
  })

  it('sammelt Wegmarken je Ziel und deckelt sie', () => {
    const chart = useExpeditionChartStore()
    for (let i = 0; i < EXPEDITION_WAYMARK_MAX + 3; i++) chart.addWaymark('Ahri', 2)
    expect(chart.waymarksOf('Ahri', 2)).toBe(EXPEDITION_WAYMARK_MAX)
    // Ein anderes Ziel profitiert davon nicht — das ist der Grund für Rotation.
    expect(chart.waymarksOf('Ahri', 9)).toBe(0)
  })

  it('trennt Champions mit Sonderzeichen im Namen sauber', () => {
    const chart = useExpeditionChartStore()
    useBattleStore().ownedChampions.push("Kai'Sa", 'Dr. Mundo')
    chart.addWaymark("Kai'Sa", 2)
    chart.addWaymark('Dr. Mundo', 2)
    expect(chart.waymarksOf("Kai'Sa", 2)).toBe(1)
    expect(chart.waymarksOf('Dr. Mundo', 2)).toBe(1)
  })

  it('lässt die Zehrung ablaufen', () => {
    const chart = useExpeditionChartStore()
    expect(chart.isWeary('Ahri')).toBe(false)
    chart.setWeary('Ahri', 10_000)
    expect(chart.isWeary('Ahri')).toBe(true)
  })
})

describe('expedition chart — prune', () => {
  it('wirft weg, was ins Leere zeigt', () => {
    const chart = useExpeditionChartStore()
    const galaxy = useGalaxyStore()
    const battle = useBattleStore()
    galaxy.completedGalaxies.push(freed(3))
    battle.ownedChampions.push('Ahri')

    chart.recordRun(3, 1)
    chart.recordRun(88, 1) // nie befreit
    chart.addWaymark('Ahri', 3)
    chart.addWaymark('Ahri', 88) // nie befreit
    chart.addWaymark('Ghost', 3) // nie besessen
    chart.markSeen(3)
    chart.markSeen(88)

    chart.prune()

    expect(chart.progressOf(3).runs).toBe(1)
    expect(chart.cartography['88']).toBeUndefined()
    expect(chart.waymarksOf('Ahri', 3)).toBe(1)
    expect(chart.waymarksOf('Ahri', 88)).toBe(0)
    expect(chart.waymarksOf('Ghost', 3)).toBe(0)
    expect(chart.seenDestinations).toEqual([3])
  })
})

describe('expedition — die harte Trennung', () => {
  beforeEach(() => {
    useGalaxyStore().completedGalaxies.push(freed(1))
    useBattleStore().ownedChampions.push('Ahri', 'Darius', 'Braum')
  })

  it('nimmt einen Champion vom Board aus der Crew-Auswahl', () => {
    const expedition = useExpeditionStore()
    const battle = useBattleStore()
    expect(expedition.eligibleChampions()).toContain('Ahri')

    battle.setHeaderSlot(0, 'Ahri')
    expect(expedition.eligibleChampions()).not.toContain('Ahri')
    expect(expedition.eligibleChampions()).toContain('Darius')
  })

  it('erfasst auch die Verbündeten-Sitze, nicht nur die Kopfslots', () => {
    const expedition = useExpeditionStore()
    useBattleStore().setSecondarySlot(1, 2, 'Braum')
    expect(expedition.eligibleChampions()).not.toContain('Braum')
  })

  it('weist einen gesetzten Champion beim Start ab', () => {
    const expedition = useExpeditionStore()
    const battle = useBattleStore()
    expedition.forceSpawn()
    const slot = expedition.availableExpeditions[0]
    expect(slot).toBeDefined()

    battle.setHeaderSlot(0, 'Ahri')
    const crew = slot.requiredRoles.map((role) => ({ name: 'Ahri', role }))
    expect(expedition.startExpedition(slot.id, crew)).toBe(false)
    expect(expedition.activeExpeditions).toHaveLength(0)
  })

  it('weist einen reisenden Champion am Board ab, statt ihn still zu schlucken', () => {
    const expedition = useExpeditionStore()
    const battle = useBattleStore()
    expedition.forceSpawn()
    const slot = expedition.availableExpeditions[0]
    const crew = slot.requiredRoles.map((role) => ({ name: 'Darius', role }))
    expect(expedition.startExpedition(slot.id, crew)).toBe(true)

    expect(battle.setHeaderSlot(0, 'Darius')).toBe(false)
    expect(battle.headerSlots[0]).toBeNull()
    expect(battle.setSecondarySlot(0, 0, 'Darius')).toBe(false)
    expect(battle.secondarySlots[0][0]).toBeNull()
  })
})

describe('expedition — Ziele treiben den Vertrag', () => {
  it('legt ohne befreite Galaxie nichts aus', () => {
    const expedition = useExpeditionStore()
    expedition.forceSpawn()
    expedition.checkAvailability()
    expect(expedition.availableExpeditions).toHaveLength(0)
  })

  it('schreibt die Zielgalaxie an Vertrag und Mission', () => {
    useGalaxyStore().completedGalaxies.push(freed(5))
    useBattleStore().ownedChampions.push('Ahri')
    const expedition = useExpeditionStore()
    expedition.forceSpawn()
    const slot = expedition.availableExpeditions[0]
    expect(slot.galaxy).toBe(5)

    const crew = slot.requiredRoles.map((role) => ({ name: 'Ahri', role }))
    expect(expedition.startExpedition(slot.id, crew)).toBe(true)
    expect(expedition.activeExpeditions[0].galaxy).toBe(5)
  })

  it('verlangt an einem späten Ziel mehr und zahlt mehr als am ersten', () => {
    const galaxy = useGalaxyStore()
    const expedition = useExpeditionStore()

    galaxy.completedGalaxies.push(freed(1))
    const early: number[] = []
    const earlyPower: number[] = []
    for (let i = 0; i < 12; i++) {
      expedition.availableExpeditions = []
      expedition.forceSpawn()
      early.push(expedition.availableExpeditions[0].baseReward)
      earlyPower.push(expedition.availableExpeditions[0].minPowerThreshold)
    }

    galaxy.completedGalaxies.splice(0, galaxy.completedGalaxies.length, freed(40))
    const late: number[] = []
    const latePower: number[] = []
    for (let i = 0; i < 12; i++) {
      expedition.availableExpeditions = []
      expedition.forceSpawn()
      late.push(expedition.availableExpeditions[0].baseReward)
      latePower.push(expedition.availableExpeditions[0].minPowerThreshold)
    }

    // Der schwächste späte Lauf schlägt den stärksten frühen — die Bänder
    // dürfen sich nicht überlappen, sonst ist der Fortschritt nicht spürbar.
    expect(Math.min(...late)).toBeGreaterThan(Math.max(...early))
    expect(Math.min(...latePower)).toBeGreaterThan(Math.max(...earlyPower))
  })
})
