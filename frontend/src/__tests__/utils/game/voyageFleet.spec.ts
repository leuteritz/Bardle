import { describe, it, expect } from 'vitest'
import { buildVoyageFleetCards, voyageGalaxyState } from '@/utils/game/voyageFleet'
import type { AvailableExpeditionSlot, ExpeditionMission, VoyageRailRow } from '@/types'

/**
 * Das Fleet-Band beantwortet „was läuft, mit wem, und was kann ich starten" über
 * ALLE Galaxien — eine Karte je Expedition, nicht je Galaxie. Drei Zusagen: die
 * Reihenfolge hängt nicht an der Uhr, die laufenden Missionen stehen vor den
 * Angeboten (jeder Vertrag ist durch die Auto-Crew startbar, als Rang trägt das
 * also nichts), und was keiner Galaxie zuzuordnen ist, erscheint gar nicht.
 */

function row(over: Partial<VoyageRailRow> = {}): VoyageRailRow {
  return {
    galaxy: 1,
    name: 'Ionia Reach',
    tier: 'common',
    accent: '120, 140, 200',
    charted: 0,
    runs: 0,
    contracts: 0,
    inField: 0,
    ready: 0,
    seen: true,
    ...over,
  }
}

function slot(galaxy: number, id: string, roles = 1): AvailableExpeditionSlot {
  return {
    id,
    colorKey: 'gold',
    availableUntil: 1700000300000,
    spawnedAt: 1700000000000,
    galaxy,
    tier: 'common',
    name: `Contract ${id}`,
    icon: 'game-icons:orbital',
    baseReward: 100,
    durationSeconds: 60,
    requiredRoles: Array.from({ length: roles }, () => 'TOP' as const),
    minPowerThreshold: 10,
    hazards: [],
    hazardThreshold: 10,
  }
}

function mission(galaxy: number, id: string, status: ExpeditionMission['status']): ExpeditionMission {
  return {
    id: `exp-${id}`,
    configId: id,
    name: `Mission ${id}`,
    description: '',
    icon: 'game-icons:orbital',
    requiredRoles: ['TOP'],
    assignedChampions: [{ name: 'Ahri', role: 'TOP' }],
    durationSeconds: 60,
    startTime: 1700000010000,
    baseReward: 100,
    successChance: 0.5,
    status,
    reward: status === 'success' ? 200 : 0,
    colorKey: 'gold',
    galaxy,
    tier: 'common',
    hazards: [],
  }
}

/** Kein Sitz besetzt — ein Vertrag ist damit nie `sendable`. */
const deps = {
  projectedReward: (m: { baseReward: number }) => ({ success: m.baseReward, failure: 0 }),
  seatsOf: (o: AvailableExpeditionSlot) => o.requiredRoles.map(() => null),
}

/** Jeder Sitz besetzt. */
const crewedDeps = {
  ...deps,
  seatsOf: (o: AvailableExpeditionSlot) => o.requiredRoles.map(() => 'Ahri'),
}

describe('voyageGalaxyState', () => {
  it('hält den Rang einsammelbar > ausliegend > unterwegs > still', () => {
    expect(voyageGalaxyState(row({ ready: 1, contracts: 3, inField: 2 }))).toBe('ready')
    expect(voyageGalaxyState(row({ contracts: 1, inField: 2 }))).toBe('offer')
    expect(voyageGalaxyState(row({ inField: 1 }))).toBe('field')
    expect(voyageGalaxyState(row())).toBe('quiet')
  })
})

describe('buildVoyageFleetCards', () => {
  it('gibt jeder Marke eine eigene Karte, nicht jeder Galaxie eine', () => {
    const cards = buildVoyageFleetCards(
      [row({ galaxy: 1, contracts: 2, inField: 1 })],
      [slot(1, 'a'), slot(1, 'b')],
      [mission(1, 'c', 'active')],
      deps,
    )
    expect(cards).toHaveLength(3)
    expect(cards.map((c) => c.pinKey).sort()).toEqual(['a', 'b', 'c'])
  })

  it('ordnet einsammelbar > unterwegs > bemannter Vertrag > unbemannter Vertrag', () => {
    const rows = [row({ galaxy: 1, contracts: 2, inField: 1, ready: 1 })]
    const offers = [slot(1, 'crewed'), slot(1, 'empty')]
    const cards = buildVoyageFleetCards(rows, offers, [mission(1, 'field', 'active'), mission(1, 'done', 'success')], {
      ...deps,
      // Nur der eine Vertrag ist voll besetzt.
      seatsOf: (o: AvailableExpeditionSlot) => o.requiredRoles.map(() => (o.id === 'crewed' ? 'Ahri' : null)),
    })
    expect(cards.map((c) => c.pinKey)).toEqual(['done', 'field', 'crewed', 'empty'])
  })

  it('ordnet innerhalb eines Rangs nach Galaxie absteigend', () => {
    const rows = [row({ galaxy: 3, contracts: 1 }), row({ galaxy: 7, contracts: 1 })]
    const cards = buildVoyageFleetCards(rows, [slot(3, 'a'), slot(7, 'b')], [], deps)
    expect(cards.map((c) => c.galaxy)).toEqual([7, 3])
  })

  it('meldet einen voll besetzten Vertrag als startbar', () => {
    const cards = buildVoyageFleetCards([row({ galaxy: 1, contracts: 1 })], [slot(1, 'a', 3)], [], crewedDeps)
    expect(cards[0].sendable).toBe(true)
    expect(cards[0].seats).toEqual(['Ahri', 'Ahri', 'Ahri'])
  })

  it('meldet einen halb besetzten Vertrag NICHT als startbar', () => {
    const cards = buildVoyageFleetCards([row({ galaxy: 1, contracts: 1 })], [slot(1, 'a', 3)], [], {
      ...deps,
      seatsOf: () => ['Ahri', null, null],
    })
    expect(cards[0].sendable).toBe(false)
    expect(cards[0].row.seatsFilled).toBe(1)
  })

  it('trägt die Crew einer laufenden Mission, aber keine Sitze', () => {
    const cards = buildVoyageFleetCards([row({ galaxy: 1, inField: 1 })], [], [mission(1, 'a', 'active')], deps)
    expect(cards[0].crew).toEqual([{ name: 'Ahri', role: 'TOP' }])
    expect(cards[0].seats).toEqual([])
  })

  it('nimmt Name, Akzent und Stufe aus der Leistenzeile der Galaxie', () => {
    const cards = buildVoyageFleetCards(
      [row({ galaxy: 4, contracts: 1, name: 'Crimson Expanse', tier: 'epic', accent: '9, 8, 7' })],
      [slot(4, 'a')],
      [],
      deps,
    )
    expect(cards[0]).toMatchObject({ galaxy: 4, galaxyName: 'Crimson Expanse', tier: 'epic', accent: '9, 8, 7' })
  })

  it('lässt eine Mission ohne Galaxie liegen, statt sie falsch einzusortieren', () => {
    const stray = { ...mission(1, 'x', 'active'), galaxy: undefined }
    const cards = buildVoyageFleetCards([row({ galaxy: 1, contracts: 1 })], [slot(1, 'a')], [stray], deps)
    expect(cards.map((c) => c.pinKey)).toEqual(['a'])
  })

  it('lässt eine Marke ohne Leistenzeile liegen — sie hätte weder Namen noch Akzent', () => {
    const cards = buildVoyageFleetCards([row({ galaxy: 1, contracts: 1 })], [slot(1, 'a'), slot(9, 'b')], [], deps)
    expect(cards.map((c) => c.pinKey)).toEqual(['a'])
  })

  it('liefert bei gleicher Eingabe zweimal dasselbe — die Reihenfolge kennt keine Uhr', () => {
    const rows = [row({ galaxy: 2, contracts: 1 }), row({ galaxy: 1, inField: 1 })]
    const args = [rows, [slot(2, 'a')], [mission(1, 'b', 'active')], deps] as const
    expect(buildVoyageFleetCards(...args)).toEqual(buildVoyageFleetCards(...args))
  })
})
