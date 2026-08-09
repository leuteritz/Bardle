import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { OMENS, getOmen, omenRewardLine, OMEN_DOMAINS } from '@/config/progression/omens'
import {
  OMEN_OFFER_SIZE,
  OMEN_SWIFT_DURATION_MULT,
  OMEN_UNLOCK_LEVEL,
  OMEN_OFFER_DELAY_SEC,
} from '@/config/constants'
import type { OmenDef, OmenMetricId } from '@/types'

/** Ein Vorzeichen nach ID — schlägt laut fehl, wenn eines umbenannt wurde. */
function omen(id: string): OmenDef {
  const found = getOmen(id)
  expect(found, `omen "${id}" missing from OMENS`).toBeDefined()
  return found!
}

/**
 * Setzt die Metrik eines Vorzeichens auf einen Wert. EINE Stelle je Metrik —
 * laufen der Katalog und die Auflösung im Store auseinander, fällt es hier auf
 * und nicht erst im Spiel.
 */
function setMetric(metric: OmenMetricId, value: number) {
  switch (metric) {
    case 'chimesEarned':
      useGameStore().totalChimesEarned = value
      break
    case 'clicks':
      useGameStore().totalClicks = value
      break
    case 'meepsEarned':
      useGameStore().totalMeepsEarned = value
      break
    case 'driftersCollected':
      useDrifterStore().totalDriftersCollected = value
      break
    case 'bossesDefeated':
      usePlanetBossStore().totalBossesDefeated = value
      break
    case 'starsRescued':
      useGalaxyStore().totalStarsRescued = value
      break
    case 'battleWins':
      useBattleStore().totalWins = value
      break
    case 'championKills':
      useBattleStore().totalKills = value
      break
    case 'championLevelsGained':
      useChampionLevelStore().totalLevelsBought = value
      break
    case 'materialsCollected':
      useInventoryStore().totalMaterialsCollected = value
      break
    case 'expeditionsCompleted':
      useExpeditionStore().totalExpeditionsSucceeded = value
      break
  }
}

/** Ein Vorzeichen annehmen, ohne den Weg übers Angebot zu gehen. */
function accept(store: ReturnType<typeof useOmenStore>, def: OmenDef) {
  store.offer = [def.id]
  const ok = store.accept(def.id)
  expect(ok).toBe(true)
}

describe('omenStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Über der Freischaltschwelle, sonst kommt der Tick nie bis zur Ziehung.
    useGameStore().level = OMEN_UNLOCK_LEVEL
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Katalog ────────────────────────────────────────────────────────────────

  describe('catalogue', () => {
    it('has unique ids and icons', () => {
      const ids = OMENS.map((o) => o.id)
      const icons = OMENS.map((o) => o.icon)
      expect(new Set(ids).size).toBe(ids.length)
      // Alle Vorzeichen können nebeneinander im selben Trio stehen, also müssen
      // sie über den ganzen Katalog unterscheidbar bleiben.
      expect(new Set(icons).size).toBe(icons.length)
    })

    it('spans at least as many domains as a single offer has cards', () => {
      // Sonst kann die Ziehung ihre eigene Regel — drei verschiedene Domänen —
      // nie einhalten, und die Karten liefen still auf Dubletten hinaus.
      expect(OMEN_DOMAINS.length).toBeGreaterThanOrEqual(OMEN_OFFER_SIZE)
    })

    it('never rewards the system its objective measures', () => {
      // Die tragende Regel des Systems: gemessen in A, ausgezahlt in B.
      const DOMAIN_OF_EFFECT: Record<string, string> = {
        cpsMult: 'economy',
        cpcMult: 'economy',
        materialDropMult: 'economy',
        combatDpsMult: 'combat',
        xpMult: 'roster',
      }
      for (const def of OMENS) {
        for (const key of Object.keys(def.reward.effects)) {
          expect(
            DOMAIN_OF_EFFECT[key],
            `${def.id} rewards an axis with no domain mapping`,
          ).toBeDefined()
          expect(DOMAIN_OF_EFFECT[key], `${def.id} pays into its own domain`).not.toBe(def.domain)
        }
      }
    })

    it('renders a reward line naming the axis', () => {
      expect(omenRewardLine(omen('tideOfRuin'))).toBe('+60% CHIMES/SEC')
    })
  })

  // ── Annahme ────────────────────────────────────────────────────────────────

  describe('accept', () => {
    it('freezes the metric at its current value', () => {
      const store = useOmenStore()
      const def = omen('dimming')
      setMetric(def.metric, 40)

      accept(store, def)

      expect(store.active?.startValue).toBe(40)
      // Der Fortschritt zählt NUR, was seither dazukam — sonst wäre ein Ziel
      // von 3 Sternen bei 40 geretteten sofort erfüllt.
      expect(store.activeView?.progress).toBe(0)
    })

    it('counts only the delta since acceptance', () => {
      const store = useOmenStore()
      const def = omen('dimming')
      setMetric(def.metric, 40)
      accept(store, def)

      setMetric(def.metric, 42)

      expect(store.activeView?.progress).toBe(2)
      expect(store.activeView?.ratio).toBeCloseTo(2 / def.target)
    })

    it('clears the offer and refuses a second omen', () => {
      const store = useOmenStore()
      store.offer = ['dimming', 'tideOfRuin']
      expect(store.accept('dimming')).toBe(true)
      expect(store.offer).toEqual([])
      expect(store.accept('tideOfRuin')).toBe(false)
    })

    it('refuses an omen that is not on offer', () => {
      const store = useOmenStore()
      store.offer = ['dimming']
      expect(store.accept('tideOfRuin')).toBe(false)
      expect(store.active).toBeNull()
    })

    it('derives a chime target from production, with the flat value as a floor', () => {
      const store = useOmenStore()
      const def = omen('hoardOfAges')
      expect(def.targetFromCpsSeconds).toBeDefined()

      // Ohne Produktion greift der Boden aus der Definition …
      useGameStore().chimesPerSecond = 0
      expect(store.resolveTarget(def)).toBe(def.target)

      // … mit Produktion wächst das Ziel mit ihr.
      useGameStore().chimesPerSecond = 1_000
      expect(store.resolveTarget(def)).toBe(1_000 * def.targetFromCpsSeconds!)
    })

    it('keeps the resolved target fixed while production grows', () => {
      const store = useOmenStore()
      const def = omen('hoardOfAges')
      useGameStore().chimesPerSecond = 1_000
      accept(store, def)
      const target = store.active!.target

      // Ein Ausbau der Produktion darf das laufende Ziel nicht vor sich
      // herschieben — sonst wäre es nie zu erreichen.
      useGameStore().chimesPerSecond = 50_000
      expect(store.activeView?.target).toBe(target)
    })
  })

  // ── Erfüllung ──────────────────────────────────────────────────────────────

  describe('completion', () => {
    it('pays out and starts the reward buff once the target is met', () => {
      const store = useOmenStore()
      const def = omen('tideOfRuin')
      setMetric(def.metric, 0)
      accept(store, def)

      setMetric(def.metric, def.target)
      store.tick()

      expect(store.active).toBeNull()
      expect(store.totalOmensCompleted).toBe(1)
      expect(store.liveBuffs).toHaveLength(1)
      expect(store.cpsMult).toBeCloseTo(def.reward.effects.cpsMult!)
    })

    it('doubles the buff duration when the deadline is still open', () => {
      const store = useOmenStore()
      const def = omen('tideOfRuin')
      accept(store, def)

      setMetric(def.metric, def.target)
      store.tick()

      expect(store.buffs[0].swift).toBe(true)
      expect(store.totalOmensSwift).toBe(1)
      expect(store.buffs[0].durationMs).toBe(def.reward.durationSec * 1000 * OMEN_SWIFT_DURATION_MULT)
    })

    it('still pays out after the deadline, only without the swift bonus', () => {
      const store = useOmenStore()
      const def = omen('tideOfRuin')
      accept(store, def)
      // Frist verstreichen lassen — nichts geht verloren, das ist die Zusage
      // des ganzen Systems.
      store.active!.deadlineAt = Date.now() - 1

      setMetric(def.metric, def.target)
      store.tick()

      expect(store.totalOmensCompleted).toBe(1)
      expect(store.totalOmensSwift).toBe(0)
      expect(store.buffs[0].swift).toBe(false)
      expect(store.buffs[0].durationMs).toBe(def.reward.durationSec * 1000)
    })

    it('reports the swift window as lapsed in the view', () => {
      const store = useOmenStore()
      accept(store, omen('dimming'))
      expect(store.activeView?.swiftAvailable).toBe(true)

      store.active!.deadlineAt = Date.now() - 1
      store.omenNow = Date.now()

      expect(store.activeView?.swiftAvailable).toBe(false)
      expect(store.activeView?.secondsLeft).toBe(0)
    })

    it('does not complete before the target is reached', () => {
      const store = useOmenStore()
      const def = omen('tideOfRuin')
      accept(store, def)

      setMetric(def.metric, def.target - 1)
      store.tick()

      expect(store.active).not.toBeNull()
      expect(store.totalOmensCompleted).toBe(0)
    })
  })

  // ── Robustheit ─────────────────────────────────────────────────────────────

  describe('resilience', () => {
    it('re-anchors the start value when a counter is reset', () => {
      const store = useOmenStore()
      const def = omen('tideOfRuin')
      setMetric(def.metric, 100)
      accept(store, def)

      // Prestige o. ä. setzt den Zähler zurück. Ohne das Nachziehen bliebe der
      // Startwert über dem Stand und das Ziel wäre unerreichbar.
      setMetric(def.metric, 0)
      store.tick()

      expect(store.active?.startValue).toBe(0)
      expect(store.activeView?.progress).toBe(0)

      setMetric(def.metric, def.target)
      store.tick()
      expect(store.totalOmensCompleted).toBe(1)
    })

    it('drops an omen whose definition no longer exists', () => {
      const store = useOmenStore()
      store.active = {
        defId: 'removedFromCatalogue',
        startValue: 0,
        target: 5,
        acceptedAt: Date.now(),
        deadlineAt: Date.now() + 60_000,
      }

      store.tick()

      expect(store.active).toBeNull()
      expect(store.offerCooldownSec).toBe(OMEN_OFFER_DELAY_SEC)
      expect(store.activeView).toBeNull()
    })

    it('expires buffs and stops multiplying once they run out', () => {
      const store = useOmenStore()
      const def = omen('tideOfRuin')
      accept(store, def)
      setMetric(def.metric, def.target)
      store.tick()
      expect(store.cpsMult).toBeGreaterThan(1)

      store.buffs[0].expiresAt = Date.now() - 1
      store.tick()

      expect(store.liveBuffs).toHaveLength(0)
      expect(store.cpsMult).toBe(1)
    })

    it('restarts a repeated omen instead of stacking it twice', () => {
      const store = useOmenStore()
      const def = omen('tideOfRuin')

      for (const round of [1, 2]) {
        setMetric(def.metric, 0)
        accept(store, def)
        setMetric(def.metric, def.target)
        store.tick()
        expect(store.totalOmensCompleted).toBe(round)
      }

      expect(store.buffs).toHaveLength(1)
      // Zweimal derselbe Multiplikator wäre 2,56× statt 1,6× — der Unterschied
      // zwischen „Uhr zurückgesetzt" und „doppelt kassiert".
      expect(store.cpsMult).toBeCloseTo(def.reward.effects.cpsMult!)
    })
  })

  // ── Angebot ────────────────────────────────────────────────────────────────

  describe('offer', () => {
    it('draws three cards from three different domains', () => {
      const store = useOmenStore()
      // Alle Systeme offen, damit der Filter niemanden aussortiert.
      useBattleStore().headerSlots = ['Bard', null, null, null, null]
      useBattleStore().ownedChampions = ['Bard', 'Ashe']
      useExpeditionStore().totalExpeditionsStarted = 1

      for (let i = 0; i < 25; i++) {
        store.offer = []
        store.rollOffer()
        expect(store.offer).toHaveLength(OMEN_OFFER_SIZE)
        const domains = store.offerDefs.map((d) => d.domain)
        expect(new Set(domains).size).toBe(OMEN_OFFER_SIZE)
      }
    })

    it('still fills an offer when few systems are open', () => {
      const store = useOmenStore()
      // Frischer Spielstand: kein Team, keine Planeten, keine Expedition.
      store.rollOffer()
      expect(store.offer).toHaveLength(OMEN_OFFER_SIZE)
    })

    it('keeps battle omens out while no champion is fielded', () => {
      const store = useOmenStore()
      useBattleStore().headerSlots = [null, null, null, null, null]
      expect(store.isEligible(omen('trialByRift'))).toBe(false)

      useBattleStore().headerSlots = ['Bard', null, null, null, null]
      expect(store.isEligible(omen('trialByRift'))).toBe(true)
    })

    it('stays silent below the unlock level', () => {
      const store = useOmenStore()
      useGameStore().level = OMEN_UNLOCK_LEVEL - 1
      store.offerCooldownSec = 0

      store.tick()

      expect(store.offer).toEqual([])
      expect(store.hasOffer).toBe(false)
    })

    it('lays out a trio once the cooldown runs out', () => {
      const store = useOmenStore()
      store.offerCooldownSec = 0.5

      store.tick()

      expect(store.offer).toHaveLength(OMEN_OFFER_SIZE)
      expect(store.hasOffer).toBe(true)
    })

    it('reports no offer while an omen is already running', () => {
      const store = useOmenStore()
      store.offer = ['dimming', 'tideOfRuin', 'wakingHand']
      store.accept('dimming')
      store.offer = ['tideOfRuin']
      expect(store.hasOffer).toBe(false)
    })
  })

  // ── Aufgeben ───────────────────────────────────────────────────────────────

  it('abandons the running omen without paying anything out', () => {
    const store = useOmenStore()
    accept(store, omen('dimming'))

    store.abandon()

    expect(store.active).toBeNull()
    expect(store.buffs).toHaveLength(0)
    expect(store.totalOmensCompleted).toBe(0)
    expect(store.offerCooldownSec).toBe(OMEN_OFFER_DELAY_SEC)
  })
})
