import { describe, it, expect } from 'vitest'
import {
  voyageLegCountOf,
  voyageLegsOf,
  voyageLegAt,
  voyageRouteNodesOf,
  voyageRoutePointAt,
  voyageRouteSamples,
} from '@/utils/game/voyageLegs'
import { VOYAGE_LEG_MAX } from '@/config/constants'
import type { AvailableExpeditionSlot, ExpeditionHazardId, ExpeditionMission } from '@/types'

/**
 * Die Etappen sind ABGELEITET, nicht gespeichert. Was diese Spec hält, ist
 * deshalb genau eine Zusage: Vertrag und die daraus entstandene Mission zeigen
 * dieselbe Aufteilung. Fiele sie, sähe der Spieler seine Reise beim Absenden
 * umspringen — und niemand im Code würde es merken.
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

/** Wie `startExpedition` sie baut: `configId` ist die Slot-ID. */
function missionFrom(s: AvailableExpeditionSlot): ExpeditionMission {
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
  }
}

const HAZ = (n: number): ExpeditionHazardId[] =>
  (['voidStatic', 'crushingGravity', 'hostileWardens'] as ExpeditionHazardId[]).slice(0, n)

describe('voyageLegCountOf', () => {
  it('lässt den ersten Kurztrip einteilig', () => {
    // hazards.length ist nie 0 — ein blosses `1 + Gefahren` machte JEDE Voyage
    // mehrteilig, auch die 30-Sekunden-Reise der ersten Galaxie.
    expect(voyageLegCountOf(1, 'common')).toBe(1)
  })

  it('staffelt über die Stufe', () => {
    expect(voyageLegCountOf(1, 'rare')).toBe(2)
    expect(voyageLegCountOf(2, 'epic')).toBe(3)
  })

  it('deckelt bei VOYAGE_LEG_MAX', () => {
    expect(voyageLegCountOf(3, 'epic')).toBe(VOYAGE_LEG_MAX)
    expect(voyageLegCountOf(9, 'epic')).toBe(VOYAGE_LEG_MAX)
  })

  it('gibt nie null Etappen', () => {
    expect(voyageLegCountOf(0, 'common')).toBe(1)
  })
})

describe('voyageLegsOf', () => {
  it('verteilt die Gefahren ab der zweiten Etappe', () => {
    const legs = voyageLegsOf(slot({ tier: 'epic', hazards: HAZ(2) }))
    expect(legs).toHaveLength(3)
    expect(legs[0].hazards).toEqual([])
    expect(legs[1].hazards).toEqual(['voidStatic'])
    expect(legs[2].hazards).toEqual(['crushingGravity'])
  })

  it('gibt der letzten Etappe den Überhang', () => {
    const legs = voyageLegsOf(slot({ tier: 'epic', hazards: HAZ(3) }))
    expect(legs).toHaveLength(3)
    expect(legs[2].hazards).toEqual(['crushingGravity', 'hostileWardens'])
  })

  it('lässt die einzige Etappe alles tragen', () => {
    const legs = voyageLegsOf(slot({ tier: 'common', hazards: HAZ(1) }))
    expect(legs).toHaveLength(1)
    expect(legs[0].hazards).toEqual(['voidStatic'])
  })

  it('teilt die Laufzeit lückenlos und vollständig auf', () => {
    const legs = voyageLegsOf(slot({ tier: 'epic', hazards: HAZ(2) }))
    expect(legs[0].from).toBe(0)
    expect(legs.at(-1)!.to).toBe(1)
    for (let i = 1; i < legs.length; i++) {
      expect(legs[i].from).toBeCloseTo(legs[i - 1].to, 12)
      expect(legs[i].to).toBeGreaterThan(legs[i].from)
    }
  })

  it('benennt keine zwei Etappen derselben Reise gleich', () => {
    const legs = voyageLegsOf(slot({ tier: 'epic', hazards: HAZ(3) }))
    expect(new Set(legs.map((l) => l.name)).size).toBe(legs.length)
  })

  it('ist deterministisch', () => {
    expect(voyageLegsOf(slot())).toEqual(voyageLegsOf(slot()))
  })

  it('streut über verschiedene Verträge', () => {
    // Der Seed mischt vier Zahlen mit Primzahlen statt sie zu summieren —
    // `durationSeconds` ist auf 5er gerundet, `baseReward` auf 10er.
    const names = new Set<string>()
    for (let i = 0; i < 12; i++) {
      names.add(
        voyageLegsOf(slot({ id: `avail-rare-17000000000${10 + i}-7`, baseReward: 500 + i * 10 }))[0]
          .name,
      )
    }
    expect(names.size).toBeGreaterThan(2)
  })

  it('DER Vertrag und SEINE Mission zeigen dieselbe Reise', () => {
    const s = slot({ tier: 'epic', hazards: HAZ(2) })
    expect(voyageLegsOf(missionFrom(s))).toEqual(voyageLegsOf(s))
  })

  it('trägt eine Altsave-Mission ohne hazards und galaxy', () => {
    const s = slot()
    const legacy = { ...missionFrom(s), hazards: undefined, galaxy: undefined, tier: undefined }
    expect(() => voyageLegsOf(legacy)).not.toThrow()
    expect(voyageLegsOf(legacy)).toHaveLength(1)
  })

  it('gibt einer Badge-Lab-Mission ohne Slot-ID einen eigenen Seed', () => {
    // `pinStampOf` liefert dafür MAX_SAFE_INTEGER; ohne Sonderweg teilten sich
    // alle denselben Seed.
    const a = voyageLegsOf(slot({ id: 'badgelab-exp-1-0', tier: 'epic', hazards: HAZ(2) }))
    const b = voyageLegsOf(slot({ id: 'badgelab-exp-1-1', tier: 'epic', hazards: HAZ(2) }))
    expect(a.map((l) => l.to)).not.toEqual(b.map((l) => l.to))
  })
})

describe('voyageLegAt', () => {
  const legs = voyageLegsOf(slot({ tier: 'epic', hazards: HAZ(2) }))

  it('findet die Etappe zum Fortschritt', () => {
    expect(voyageLegAt(legs, 0)).toBe(0)
    expect(voyageLegAt(legs, (legs[1].from + legs[1].to) / 2)).toBe(1)
    expect(voyageLegAt(legs, 1)).toBe(legs.length - 1)
  })

  it('klemmt ausserhalb von 0..1', () => {
    expect(voyageLegAt(legs, -5)).toBe(0)
    expect(voyageLegAt(legs, 99)).toBe(legs.length - 1)
  })
})

describe('voyageRoute', () => {
  // Der Start ist der Ausgang des Caretaker's Gate im Kern, nicht mehr das
  // Portal am Aussenrand — `voyageGateExit` rechnet ihn, die Route uebernimmt.
  const spawn = { x: 0.53, y: 0.55 }
  const target = { x: 0.7, y: 0.3 }

  it('gibt einen Knoten je Etappengrenze', () => {
    expect(voyageRouteNodesOf(spawn, target, 3, 12345)).toHaveLength(4)
    expect(voyageRouteNodesOf(spawn, target, 1, 12345)).toHaveLength(2)
  })

  it('uebernimmt den Startpunkt unveraendert', () => {
    // Er wurde einmal zur Mitte gezogen, weil er am Aussenrand unter Band oder
    // Legende fiel. Seit die Route im Kern beginnt, waere der Zug ein zweiter
    // Ort fuer eine Entscheidung, die `voyageGateExit` schon getroffen hat.
    expect(voyageRouteNodesOf(spawn, target, 2, 7)[0]).toEqual(spawn)
  })

  it('endet exakt am Hafen', () => {
    expect(voyageRouteNodesOf(spawn, target, 3, 7).at(-1)).toEqual(target)
  })

  it('hält jeden Knoten im Bild', () => {
    for (const n of voyageRouteNodesOf({ x: 0.94, y: 0.06 }, { x: 0.06, y: 0.94 }, 3, 99)) {
      expect(n.x).toBeGreaterThanOrEqual(0)
      expect(n.x).toBeLessThanOrEqual(1)
      expect(n.y).toBeGreaterThanOrEqual(0)
      expect(n.y).toBeLessThanOrEqual(1)
    }
  })

  it('startet am ersten und landet am letzten Knoten', () => {
    const legs = voyageLegsOf(slot({ tier: 'epic', hazards: HAZ(2) }))
    const nodes = voyageRouteNodesOf(spawn, target, legs.length, 7)
    const a = voyageRoutePointAt(nodes, legs, 0)
    const b = voyageRoutePointAt(nodes, legs, 1)
    expect(a.x).toBeCloseTo(nodes[0].x, 9)
    expect(a.y).toBeCloseTo(nodes[0].y, 9)
    expect(b.x).toBeCloseTo(target.x, 9)
    expect(b.y).toBeCloseTo(target.y, 9)
  })

  it('klemmt über die Laufzeit hinaus auf den Hafen', () => {
    // gameSpeed geht bis 100 — zwischen Ablauf und dem nächsten
    // checkExpeditions()-Tick schösse der Marker sonst über das Ziel hinaus.
    const legs = voyageLegsOf(slot())
    const nodes = voyageRouteNodesOf(spawn, target, legs.length, 7)
    expect(voyageRoutePointAt(nodes, legs, 4.2)).toEqual(voyageRoutePointAt(nodes, legs, 1))
  })

  it('läuft monoton auf das Ziel zu', () => {
    const legs = voyageLegsOf(slot({ tier: 'epic', hazards: HAZ(2) }))
    const nodes = voyageRouteNodesOf(spawn, target, legs.length, 7)
    let prev = Number.POSITIVE_INFINITY
    for (let i = 6; i <= 10; i++) {
      const p = voyageRoutePointAt(nodes, legs, i / 10)
      const d = Math.hypot(target.x - p.x, target.y - p.y)
      expect(d).toBeLessThanOrEqual(prev + 1e-9)
      prev = d
    }
  })

  it('löst die Linie ohne Uhr auf', () => {
    const nodes = voyageRouteNodesOf(spawn, target, 3, 7)
    const pts = voyageRouteSamples(nodes, 8)
    expect(pts).toHaveLength(3 * 8 + 1)
    expect(pts[0]).toEqual(nodes[0])
    expect(pts.at(-1)).toEqual(target)
  })
})
