import { describe, it, expect } from 'vitest'
import { buildVoyageFleet, voyageGalaxyState } from '@/utils/game/voyageFleet'
import type { AvailableExpeditionSlot, ExpeditionMission, VoyageRailRow } from '@/types'

/**
 * Der Fleet-Streifen beantwortet „wo liegt gerade etwas" über ALLE Galaxien. Zwei
 * Zusagen: stille Galaxien erscheinen gar nicht (sonst wäre der Streifen zu neun
 * Zehnteln Füllung — die Markenzahl ist global durch den Rang gedeckelt), und die
 * Reihenfolge hängt nicht an der Uhr.
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

function slot(galaxy: number, id: string): AvailableExpeditionSlot {
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
    requiredRoles: ['TOP'],
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

const deps = {
  projectedReward: (m: { baseReward: number }) => ({ success: m.baseReward, failure: 0 }),
  seatsFilled: () => 0,
}

describe('voyageGalaxyState', () => {
  it('hält den Rang einsammelbar > ausliegend > unterwegs > still', () => {
    expect(voyageGalaxyState(row({ ready: 1, contracts: 3, inField: 2 }))).toBe('ready')
    expect(voyageGalaxyState(row({ contracts: 1, inField: 2 }))).toBe('offer')
    expect(voyageGalaxyState(row({ inField: 1 }))).toBe('field')
    expect(voyageGalaxyState(row())).toBe('quiet')
  })
})

describe('buildVoyageFleet', () => {
  it('lässt stille Galaxien ganz weg', () => {
    const rows = [row({ galaxy: 3, contracts: 1 }), row({ galaxy: 2 }), row({ galaxy: 1 })]
    expect(buildVoyageFleet(rows, [slot(3, 'a')], [], deps).map((c) => c.galaxy)).toEqual([3])
  })

  it('ordnet nach Rang, dann nach Galaxie absteigend', () => {
    const rows = [
      row({ galaxy: 4, inField: 1 }),
      row({ galaxy: 3, ready: 1 }),
      row({ galaxy: 2, contracts: 1 }),
      row({ galaxy: 1, ready: 1 }),
    ]
    const cards = buildVoyageFleet(
      rows,
      [slot(2, 'c')],
      [mission(4, 'd', 'active'), mission(3, 'a', 'success'), mission(1, 'b', 'success')],
      deps,
    )
    expect(cards.map((c) => c.galaxy)).toEqual([3, 1, 2, 4])
  })

  it('legt jede Marke auf die Pille ihrer Galaxie', () => {
    const cards = buildVoyageFleet(
      [row({ galaxy: 2, contracts: 1, inField: 1 }), row({ galaxy: 1, contracts: 1 })],
      [slot(2, 'a'), slot(1, 'b')],
      [mission(2, 'c', 'active')],
      deps,
    )
    const two = cards.find((c) => c.galaxy === 2)!
    const one = cards.find((c) => c.galaxy === 1)!
    expect(two.roster.map((r) => r.pinKey).sort()).toEqual(['a', 'c'])
    expect(one.roster.map((r) => r.pinKey)).toEqual(['b'])
  })

  it('lässt eine Mission ohne Galaxie liegen, statt sie falsch einzusortieren', () => {
    const stray = { ...mission(1, 'x', 'active'), galaxy: undefined }
    const cards = buildVoyageFleet([row({ galaxy: 1, contracts: 1 })], [slot(1, 'a')], [stray], deps)
    expect(cards[0].roster.map((r) => r.pinKey)).toEqual(['a'])
  })

  /** Der Sprungpunkt einer Pille ist die erste Zeile: was am dringendsten ist. */
  it('stellt die einsammelbare Marke einer Galaxie an den Anfang ihres Rosters', () => {
    const cards = buildVoyageFleet(
      [row({ galaxy: 1, contracts: 1, inField: 1, ready: 1 })],
      [slot(1, 'a')],
      [mission(1, 'b', 'active'), mission(1, 'c', 'success')],
      deps,
    )
    expect(cards[0].roster[0].pinKey).toBe('c')
  })

  it('liefert bei gleichem Zustand zweimal dasselbe — die Reihenfolge kennt keine Uhr', () => {
    const rows = [row({ galaxy: 2, contracts: 1 }), row({ galaxy: 1, inField: 1 })]
    const args = [rows, [slot(2, 'a')], [mission(1, 'b', 'active')], deps] as const
    const first = buildVoyageFleet(...args)
    const second = buildVoyageFleet(...args)
    expect(second).toEqual(first)
  })
})
