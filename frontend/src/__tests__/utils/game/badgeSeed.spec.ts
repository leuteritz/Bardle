import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  badgeHeraldSuppressedUntil,
  clearAllBadges,
  clearBadge,
  seedAllBadges,
  seedBadge,
} from '@/utils/game/badgeSeed'
import { notifyBadgeCounters } from '@/composables/ui/useNotifyBadges'
import { SEEDABLE_BADGE_KINDS, NOTIFY_BADGE_BY_KIND } from '@/config/ui/notifyBadges'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { BADGE_LAB_EXPEDITION_ID_PREFIX } from '@/config/constants'

/*
 * Das Badge Lab ist ein Testwerkzeug — bricht es still, merkt es niemand, und
 * die Marke, die man prüfen wollte, bleibt einfach dunkel.
 *
 * Zwei Dinge prüft diese Spec, die sich nicht aus dem Code ablesen lassen:
 * dass der Seed den 1-Sekunden-Tick ÜBERLEBT (`syncAcknowledged` räumt jede
 * Sekunde auf), und dass jede Marke, die sich voll leeren lässt, auch wirklich
 * zum Ausgangsstand zurückkehrt.
 */

const SEED_N = 3

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('seedBadge — jede Marke leuchtet', () => {
  for (const kind of SEEDABLE_BADGE_KINDS) {
    it(`${kind} steht nach dem Seed`, () => {
      const before = notifyBadgeCounters()[kind]()
      expect(before).toBe(0)
      const result = seedBadge(kind, SEED_N)
      // Der Rückgabewert IST der Registry-Zähler — Seed und Zählquelle in einem
      // Test, das ist der Sinn der Registry.
      expect(result.achieved).toBe(notifyBadgeCounters()[kind]())
      expect(result.achieved).toBeGreaterThan(0)
    })
  }

  it('meldet die erreichte Zahl, nicht die gewünschte', () => {
    // Der Meep-Baum hat fünf Zweige mit je einem Tier-1-Knoten — mehr als fünf
    // kann auf frischem Stand niemand gleichzeitig lernen.
    const result = seedBadge('skill', 99)
    expect(result.requested).toBe(99)
    expect(result.achieved).toBeLessThan(99)
    expect(result.notes.length).toBeGreaterThan(0)
  })

  it('trifft die Quittungs-Marken exakt', () => {
    expect(seedBadge('shop', 2).achieved).toBe(2)
    expect(seedBadge('chronicle', 4).achieved).toBe(4)
    expect(seedBadge('expedition', 3).achieved).toBe(3)
  })
})

describe('der Seed überlebt den Tick', () => {
  it('syncAcknowledged räumt die geseedeten Knoten nicht weg', () => {
    seedBadge('skill', 2)
    const lit = notifyBadgeCounters().skill()
    useMeepTreeStore().syncAcknowledged()
    expect(notifyBadgeCounters().skill()).toBe(lit)
  })

  it('syncShopAcknowledged räumt die geseedeten Einträge nicht weg', () => {
    seedBadge('shop', 2)
    const lit = notifyBadgeCounters().shop()
    useStarForgeStore().syncShopAcknowledged()
    expect(notifyBadgeCounters().shop()).toBe(lit)
  })

  it('checkExpeditions rührt die abgeschlossenen Missionen nicht an', () => {
    seedBadge('expedition', 2)
    const expeditionStore = useExpeditionStore()
    expeditionStore.checkExpeditions()
    expect(notifyBadgeCounters().expedition()).toBe(2)
  })
})

describe('die Seed-Mission verhält sich wie eine echte', () => {
  it('lässt sich einsammeln, ohne zu werfen, und zahlt ihren Lohn', () => {
    seedBadge('expedition', 1)
    const expeditionStore = useExpeditionStore()
    const gameStore = useGameStore()
    const mission = expeditionStore.readyExpeditions[0]
    const chimesBefore = gameStore.chimes
    expect(() => expeditionStore.collectExpedition(mission.id)).not.toThrow()
    expect(gameStore.chimes).toBeGreaterThan(chimesBefore)
    expect(notifyBadgeCounters().expedition()).toBe(0)
  })

  it('sperrt keinen echten Champion aus', () => {
    // `eligibleChampions` schliesst jeden Namen aus, der auf einer laufenden
    // Mission steht — eine erfundene Crew nähme dem Spieler seine Leute weg.
    seedBadge('expedition', 3)
    expect(useExpeditionStore().championsOnExpedition).toEqual([])
  })

  it('trägt den Präfix, an dem das Aufräumen sie findet', () => {
    seedBadge('expedition', 2)
    const ids = useExpeditionStore().activeExpeditions.map((e) => e.id)
    expect(ids.every((id) => id.startsWith(BADGE_LAB_EXPEDITION_ID_PREFIX))).toBe(true)
  })
})

describe('clearBadge — was voll umkehrbar ist, kehrt zurück', () => {
  for (const kind of SEEDABLE_BADGE_KINDS.filter(
    (k) => NOTIFY_BADGE_BY_KIND[k].reversible === 'full',
  )) {
    it(`${kind} ist nach dem Aufräumen wieder dunkel`, () => {
      seedBadge(kind, SEED_N)
      expect(notifyBadgeCounters()[kind]()).toBeGreaterThan(0)
      clearBadge(kind)
      expect(notifyBadgeCounters()[kind]()).toBe(0)
    })
  }

  it('lässt echte Missionen stehen', () => {
    const expeditionStore = useExpeditionStore()
    expeditionStore.activeExpeditions.push({
      id: 'real-1',
      configId: '',
      name: 'Real run',
      description: '',
      icon: 'game-icons:caravel',
      requiredRoles: [],
      assignedChampions: [],
      durationSeconds: 10,
      startTime: 0,
      baseReward: 10,
      successChance: 100,
      status: 'success',
      reward: 10,
    })
    seedBadge('expedition', 2)
    clearBadge('expedition')
    expect(useExpeditionStore().activeExpeditions.map((e) => e.id)).toEqual(['real-1'])
  })

  it('lässt erspielte Rekrutierbare stehen', () => {
    const battleStore = useBattleStore()
    const real = battleStore.adminSeedNewChampions(1)[0]
    // Der Seed darf nur seine eigenen Namen zurücknehmen.
    const seeded = seedBadge('champions', 2)
    expect(seeded.achieved).toBeGreaterThan(1)
    clearBadge('champions')
    expect(battleStore.newlyUnlockedChampions).toEqual([real])
  })
})

describe('seedAllBadges', () => {
  it('setzt jede seedbare Marke und sperrt dabei den Herold', () => {
    const results = seedAllBadges(SEED_N)
    expect(results).toHaveLength(SEEDABLE_BADGE_KINDS.length)
    for (const r of results) expect(r.achieved).toBeGreaterThan(0)
    expect(badgeHeraldSuppressedUntil()).toBeGreaterThan(Date.now())
  })

  it('clearAllBadges räumt alles ab, was sich abräumen lässt', () => {
    seedAllBadges(SEED_N)
    clearAllBadges()
    const counters = notifyBadgeCounters()
    for (const kind of SEEDABLE_BADGE_KINDS) {
      if (NOTIFY_BADGE_BY_KIND[kind].reversible === 'full') expect(counters[kind](), kind).toBe(0)
    }
  })
})
