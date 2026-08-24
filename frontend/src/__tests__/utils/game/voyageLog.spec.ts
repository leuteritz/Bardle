import { describe, it, expect } from 'vitest'
import { voyageLogOf, voyageLogVerdictOf, voyageLogRevealed } from '@/utils/game/voyageLog'
import { voyageLegsOf } from '@/utils/game/voyageLegs'
import { VOYAGE_LOG_MAX, VOYAGE_LOG_CREW_FALLBACK } from '@/config/constants'
import type { AvailableExpeditionSlot, ExpeditionHazardId, ExpeditionMission } from '@/types'

/**
 * Das Logbuch ist ABGELEITET, nicht gespeichert. Was diese Spec haelt, ist
 * dieselbe Zusage wie bei den Etappen: Vertrag und die daraus entstandene
 * Mission erzaehlen dieselbe Reise. Faellt sie, spraenge der Text beim
 * Absenden um — und niemand im Code wuerde es merken.
 */

function slot(over: Partial<AvailableExpeditionSlot> = {}): AvailableExpeditionSlot {
  return {
    id: 'avail-epic-1700000000000-42',
    colorKey: 'gold',
    availableUntil: 1700000300000,
    spawnedAt: 1700000000000,
    galaxy: 7,
    tier: 'epic',
    name: 'Ancient Ionia Trek',
    icon: 'game-icons:orbital',
    baseReward: 900,
    durationSeconds: 240,
    requiredRoles: ['top', 'jungle', 'mid'],
    minPowerThreshold: 400,
    hazards: ['voidStatic', 'sealedVault', 'shiftingPaths'],
    hazardThreshold: 90,
    ...over,
  }
}

/** Wie `startExpedition` sie baut: `configId` ist die Slot-ID. */
function missionFrom(s: AvailableExpeditionSlot): ExpeditionMission {
  return {
    id: `exp-${s.id}-1700000010000`,
    configId: s.id,
    name: s.name,
    description: '',
    icon: s.icon,
    requiredRoles: s.requiredRoles,
    assignedChampions: s.requiredRoles.map((role, i) => ({ name: ['Bard', 'Ahri', 'Sett'][i], role })),
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
  }
}

const CREW = ['Bard', 'Ahri', 'Sett']

describe('voyage log', () => {
  it('Vertrag und Mission schreiben dasselbe Buch', () => {
    const s = slot()
    const preview = voyageLogOf(s, { destination: 'Ionia' })
    const live = voyageLogOf(missionFrom(s), { crew: CREW, destination: 'Ionia' })

    expect(live.length).toBe(preview.length)
    for (let i = 0; i < live.length; i++) {
      expect(live[i].at).toBeCloseTo(preview[i].at, 10)
      expect(live[i].kind).toBe(preview[i].kind)
      expect(live[i].leg).toBe(preview[i].leg)
    }
  })

  it('ist deterministisch — zwei Laeufe, ein Ergebnis', () => {
    const m = missionFrom(slot())
    expect(voyageLogOf(m, { crew: CREW })).toEqual(voyageLogOf(m, { crew: CREW }))
  })

  it('haelt die Zeitpunkte monoton, in ihrer Etappe und echt unter 1', () => {
    const m = missionFrom(slot())
    const legs = voyageLegsOf(m)
    const log = voyageLogOf(m, { crew: CREW })

    let prev = -1
    for (const e of log) {
      expect(e.at).toBeGreaterThanOrEqual(prev)
      expect(e.at).toBeLessThan(1)
      const leg = legs[e.leg]
      expect(e.at).toBeGreaterThanOrEqual(leg.from)
      expect(e.at).toBeLessThanOrEqual(leg.to)
      prev = e.at
    }
  })

  it('zaehlt 2 je Etappe, 1 je Gefahr und die Ankunft', () => {
    for (const hazards of [
      ['voidStatic'],
      ['voidStatic', 'sealedVault'],
      ['voidStatic', 'sealedVault', 'shiftingPaths'],
    ] as ExpeditionHazardId[][]) {
      const m = missionFrom(slot({ hazards }))
      const legs = voyageLegsOf(m)
      const log = voyageLogOf(m, { crew: CREW })
      expect(log.length).toBe(2 * legs.length + hazards.length + 1)
      expect(log.length).toBeLessThanOrEqual(VOYAGE_LOG_MAX)
    }
  })

  it('nennt jede Gefahr der Mission an ihrer Etappe', () => {
    const m = missionFrom(slot())
    const legs = voyageLegsOf(m)
    const log = voyageLogOf(m, { crew: CREW })

    for (const leg of legs) {
      const written = log.filter((e) => e.leg === leg.index && e.kind === 'hazard')
      expect(written.length).toBe(leg.hazards.length)
    }
  })

  it('wiederholt innerhalb einer Reise keine Zeile', () => {
    const m = missionFrom(slot())
    const log = voyageLogOf(m, { crew: CREW })
    expect(new Set(log.map((e) => e.text)).size).toBe(log.length)
  })

  it('laesst keinen Platzhalter stehen', () => {
    const withCrew = voyageLogOf(missionFrom(slot()), { crew: CREW, destination: 'Ionia' })
    const without = voyageLogOf(slot())
    for (const e of [...withCrew, ...without]) {
      expect(e.text).not.toMatch(/\{(crew|hazard|leg|dest)\}/)
    }
    expect(without.some((e) => e.text.includes(VOYAGE_LOG_CREW_FALLBACK))).toBe(true)
  })

  it('deckt auf, was die Uhr freigegeben hat — und bei 1 alles', () => {
    const m = missionFrom(slot())
    const log = voyageLogOf(m, { crew: CREW })

    expect(voyageLogRevealed(log, 0).length).toBe(0)
    expect(voyageLogRevealed(log, 1)).toEqual(log)

    let prev = 0
    for (const p of [0.1, 0.25, 0.5, 0.75, 0.99, 1]) {
      const n = voyageLogRevealed(log, p).length
      expect(n).toBeGreaterThanOrEqual(prev)
      prev = n
    }
  })

  it('gibt dem Verdikt einen Index hinter jedem Eintrag', () => {
    const m = missionFrom(slot())
    const log = voyageLogOf(m, { crew: CREW })
    const ok = voyageLogVerdictOf(m, true, { crew: CREW, destination: 'Ionia' })
    const bad = voyageLogVerdictOf(m, false, { crew: CREW, destination: 'Ionia' })

    expect(ok.kind).toBe('verdict')
    expect(ok.at).toBe(1)
    expect(ok.index).toBeGreaterThanOrEqual(log.length)
    expect(ok.text).not.toBe(bad.text)
    expect(bad.text).not.toMatch(/\{(crew|hazard|leg|dest)\}/)
  })

  it('haelt einen alten Spielstand ohne hazards/tier mit der Leiter zusammen', () => {
    const m = missionFrom(slot())
    delete m.hazards
    delete m.tier
    const legs = voyageLegsOf(m)
    const log = voyageLogOf(m, { crew: CREW })

    expect(new Set(log.map((e) => e.leg)).size).toBe(legs.length)
    expect(log.length).toBe(2 * legs.length + 1)
  })
})
