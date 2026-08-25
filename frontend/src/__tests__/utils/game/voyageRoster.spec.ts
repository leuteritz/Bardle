import { describe, it, expect, vi } from 'vitest'
import { buildVoyageRoster, rosterSubjectsOf } from '@/utils/game/voyageRoster'
import type { AvailableExpeditionSlot, ExpeditionMission, VoyageRosterRow } from '@/types'

/**
 * Der Roster ist die EINE Zeilenquelle für Detailspalte und Fleet-Brett. Zwei
 * Zusagen hält diese Spec: die Rangfolge, die der Spieler liest, und die
 * ZEITFREIHEIT — hinge eine Zeile an der Uhr, würde die ganze Liste im
 * Sekundentakt neu gebaut, und das Fleet-Brett trägt bis zu zwanzig davon.
 */

function slot(over: Partial<AvailableExpeditionSlot> = {}): AvailableExpeditionSlot {
  return {
    id: 'avail-rare-1700000000000-42',
    colorKey: 'gold',
    availableUntil: 1700000300000,
    spawnedAt: 1700000000000,
    galaxy: 5,
    tier: 'rare',
    name: 'Ancient Ionia Trek',
    icon: 'game-icons:orbital',
    baseReward: 500,
    durationSeconds: 120,
    requiredRoles: ['TOP', 'MID'],
    minPowerThreshold: 200,
    hazards: ['voidStatic'],
    hazardThreshold: 40,
    ...over,
  }
}

function missionFrom(
  s: AvailableExpeditionSlot,
  over: Partial<ExpeditionMission> = {},
): ExpeditionMission {
  return {
    id: `exp-${s.id}-1700000010000`,
    configId: s.id,
    name: s.name,
    description: '',
    icon: s.icon,
    requiredRoles: s.requiredRoles,
    assignedChampions: s.requiredRoles.map((role) => ({ name: 'Ahri', role })),
    durationSeconds: s.durationSeconds,
    startTime: 1700000010000,
    baseReward: s.baseReward,
    successChance: 0.6,
    status: 'active',
    reward: 0,
    colorKey: s.colorKey,
    galaxy: s.galaxy,
    tier: s.tier,
    hazards: [...s.hazards],
    ...over,
  }
}

const deps = {
  projectedReward: (m: { baseReward: number }) => ({
    success: m.baseReward * 2,
    failure: Math.floor(m.baseReward * 0.1),
  }),
  seatsFilled: () => 1,
  offerOdds: () => 0.62,
}

describe('voyageRoster', () => {
  it('ordnet in drei Eimern: einsammelbar, ausliegend, unterwegs', () => {
    const offer = slot({ id: 'avail-common-1700000000000-1' })
    const running = missionFrom(slot({ id: 'avail-common-1700000000000-2' }))
    const done = missionFrom(slot({ id: 'avail-common-1700000000000-3' }), {
      status: 'success',
      reward: 900,
    })
    const rows = buildVoyageRoster(rosterSubjectsOf([offer], [running, done]), deps)
    expect(rows.map((r) => r.state)).toEqual(['ready', 'offer', 'field'])
  })

  it('behält innerhalb eines Eimers die Eingangsreihenfolge', () => {
    const a = slot({ id: 'avail-common-1700000000000-1', name: 'Alpha' })
    const b = slot({ id: 'avail-common-1700000000000-2', name: 'Beta' })
    const rows = buildVoyageRoster(rosterSubjectsOf([a, b], []), deps)
    expect(rows.map((r) => r.name)).toEqual(['Alpha', 'Beta'])
  })

  it('trägt den Schlüssel des VERTRAGS weiter, auch als Mission', () => {
    const s = slot()
    const [asOffer] = buildVoyageRoster(rosterSubjectsOf([s], []), deps)
    const [asMission] = buildVoyageRoster(rosterSubjectsOf([], [missionFrom(s)]), deps)
    expect(asMission.pinKey).toBe(asOffer.pinKey)
    expect(asOffer.pinKey).toBe(s.id)
  })

  it('nimmt den Lohn aus der hereingereichten Rechnung, statt ihn nachzubauen', () => {
    const projectedReward = vi.fn(deps.projectedReward)
    const [row] = buildVoyageRoster(rosterSubjectsOf([slot({ baseReward: 700 })], []), {
      ...deps,
      projectedReward,
    })
    expect(projectedReward).toHaveBeenCalledTimes(1)
    expect(row.reward).toBe(1400)
  })

  it('zeigt bei einer aufgelösten Mission den festgeschriebenen Lohn', () => {
    const [row] = buildVoyageRoster(
      rosterSubjectsOf([], [missionFrom(slot(), { status: 'failure', reward: 50 })]),
      deps,
    )
    expect(row.state).toBe('failed')
    expect(row.reward).toBe(50)
    expect(row.chipIcon).toBe('ph:warning-fill')
  })

  it('zählt besetzte Sitze aus den Deps, nicht aus den verlangten Rollen', () => {
    const [row] = buildVoyageRoster(rosterSubjectsOf([slot()], []), {
      ...deps,
      seatsFilled: () => 0,
    })
    expect(row.seatsFilled).toBe(0)
    expect(row.seatsTotal).toBe(2)
  })

  /**
   * Ein Vertrag trägt kein `successChance` — die Chance hängt an der Draft-Crew
   * und kommt deshalb aus den Deps. Ohne besetzten Sitz bleibt sie offen: eine
   * Karte, die dort 5 % zeigte, löge über eine Crew, die es nicht gibt.
   */
  it('nimmt die Chance eines Vertrags aus den Deps und rundet auf Prozent', () => {
    const [row] = buildVoyageRoster(rosterSubjectsOf([slot()], []), {
      ...deps,
      offerOdds: () => 0.716,
    })
    expect(row.odds).toBe(72)

    const [blank] = buildVoyageRoster(rosterSubjectsOf([slot()], []), {
      ...deps,
      offerOdds: () => null,
    })
    expect(blank.odds).toBeNull()
  })

  it('überspringt ein Subjekt ohne Vertrag und ohne Mission', () => {
    expect(buildVoyageRoster([{ pinKey: 'x', offer: null, mission: null }], deps)).toEqual([])
  })

  /**
   * Der eigentliche Grund für diese Datei. Der Builder nimmt gar kein `now`
   * entgegen — hier steht, dass auch keine Zeile eine fertige Uhrzeit trägt.
   */
  it('trägt nirgends eine formatierte Uhrzeit', () => {
    const rows = buildVoyageRoster(
      rosterSubjectsOf(
        [slot()],
        [
          missionFrom(slot({ id: 'avail-common-1700000000000-9' })),
          missionFrom(slot({ id: 'avail-common-1700000000000-8' }), {
            status: 'success',
            reward: 10,
          }),
        ],
      ),
      deps,
    )
    const clock = /\d+:\d\d/
    for (const row of rows) {
      for (const value of Object.values(row as unknown as Record<string, unknown>)) {
        if (typeof value === 'string') expect(clock.test(value), value).toBe(false)
      }
    }
  })

  it('leitet Ende und Spanne einer laufenden Mission aus Start und Dauer ab', () => {
    const mission = missionFrom(slot({ durationSeconds: 120 }))
    const [row]: VoyageRosterRow[] = buildVoyageRoster(rosterSubjectsOf([], [mission]), deps)
    expect(row.spanMs).toBe(120_000)
    expect(row.endsAt).toBe(mission.startTime + 120_000)
    expect(row.odds).toBe(60)
  })
})
