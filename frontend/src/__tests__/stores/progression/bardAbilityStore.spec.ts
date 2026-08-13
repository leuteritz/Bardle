import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import {
  ABILITY_CDR_CAP,
  ABILITY_LEVELS_PER_RANK,
  ABILITY_MAX_RANK,
  ABILITY_RANK_CDR_STEP,
  ABILITY_RANK_POWER_STEP,
  ABILITY_UNLOCK_LEVEL_Q,
  ABILITY_UNLOCK_LEVEL_R,
  ABILITY_UNLOCK_LEVEL_W,
  BINDING_DAMAGE_MAX_HP_PCT,
  BINDING_STUN_MS,
  BINDING_TARGET_COUNT,
  BINDING_TARGET_PER_RANK,
  FATE_DAMAGE_MULT,
  FATE_STASIS_DURATION_MS,
  FATE_STASIS_PER_RANK_MS,
  GAME_TICK_INTERVAL_MS,
  JOURNEY_BUFF_DURATION_MS,
  JOURNEY_BUFF_PER_RANK_MS,
  SHRINE_BUFF_DURATION_MS,
  SHRINE_BUFF_PER_RANK_MS,
  JOURNEY_DWELL_SKIP_SEC,
  DWELL_SKIP_PHASE_FRACTION,
  JOURNEY_EXPEDITION_SKIP_SEC,
  JOURNEY_STAR_TIME_SEC,
  JOURNEY_TRAVEL_SKIP_SEC,
  RESONANCE_CDR_PER_STACK,
  RESONANCE_CLICKS_PER_STACK,
  RESONANCE_CLICK_REFUND_MS,
  RESONANCE_MAX_STACKS,
  RESONANCE_POWER_PER_STACK,
  SHRINE_CPS_MULT,
  SHRINE_HEAL_MAX_HP_PCT,
} from '@/config/constants'
import { getBardAbility } from '@/config/progression/bardAbilities'
import type { BardAbilityId } from '@/types'

/** Hebt das Bard-Level so weit, dass `id` freigeschaltet ist. */
function unlock(id: BardAbilityId, extraLevels = 0): void {
  useGameStore().level = (getBardAbility(id)?.unlockLevel ?? 1) + extraLevels
}

/** Ein lebender Planeten-Boss mit `maxHP` Lebenspunkten. */
function addBoss(planetId: string, maxHP: number, startTime = Date.now()) {
  const bossStore = usePlanetBossStore()
  const boss = {
    planetId,
    maxHP,
    currentHP: maxHP,
    totalDamageDealt: 0,
    defeated: false,
    expired: false,
    startTime,
    enrageTimerMs: 60_000,
    passiveDPS: 0,
  } as never as (typeof bossStore.activeBosses)[number]
  bossStore.activeBosses.push(boss)
  return boss
}

describe('bardAbilityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("passive — Traveler's Call", () => {
    it('turns every RESONANCE_CLICKS_PER_STACK clicks into one stack', () => {
      const store = useBardAbilityStore()
      for (let i = 0; i < RESONANCE_CLICKS_PER_STACK * 3; i++) store.registerClick()
      expect(store.resonance).toBe(3)
      expect(store.resonanceProgress).toBe(0)
    })

    it('reports the clicks left to the next stack', () => {
      const store = useBardAbilityStore()
      store.registerClick()
      expect(store.resonanceToNext).toBe(RESONANCE_CLICKS_PER_STACK - 1)
      expect(store.resonanceFill).toBeCloseTo(1 / RESONANCE_CLICKS_PER_STACK)
    })

    it('stops at the cap and drops the leftover progress', () => {
      const store = useBardAbilityStore()
      store.resonance = RESONANCE_MAX_STACKS - 1
      store.resonanceProgress = RESONANCE_CLICKS_PER_STACK - 1
      store.registerClick()
      store.registerClick()
      expect(store.resonance).toBe(RESONANCE_MAX_STACKS)
      expect(store.resonanceProgress).toBe(0)
      expect(store.resonanceToNext).toBe(0)
    })

    it('scales ability power and cooldown reduction with the stacks', () => {
      const store = useBardAbilityStore()
      store.resonance = 40
      expect(store.resonancePowerMult).toBeCloseTo(1 + 40 * RESONANCE_POWER_PER_STACK)
      expect(store.resonanceCdr).toBeCloseTo(40 * RESONANCE_CDR_PER_STACK)
    })

    it('takes a slice off every running cooldown per click', () => {
      const store = useBardAbilityStore()
      const now = Date.now()
      store.cooldownReadyAt.q = now + 10_000
      store.cooldownReadyAt.w = now + 20_000

      store.registerClick()

      expect(store.cooldownReadyAt.q).toBeCloseTo(now + 10_000 - RESONANCE_CLICK_REFUND_MS, -1)
      expect(store.cooldownReadyAt.w).toBeCloseTo(now + 20_000 - RESONANCE_CLICK_REFUND_MS, -1)
    })

    it('never refunds a cooldown below "ready now"', () => {
      const store = useBardAbilityStore()
      store.cooldownReadyAt.q = Date.now() + RESONANCE_CLICK_REFUND_MS / 2
      store.registerClick()
      expect(store.cooldownReadyAt.q).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('ranks and unlocking', () => {
    it('keeps an ability locked below its unlock level', () => {
      const store = useBardAbilityStore()
      useGameStore().level = ABILITY_UNLOCK_LEVEL_Q - 1
      expect(store.isUnlocked('q')).toBe(false)
      expect(store.rankOf('q')).toBe(0)
    })

    it('grants rank 1 exactly at the unlock level', () => {
      const store = useBardAbilityStore()
      unlock('q')
      expect(store.rankOf('q')).toBe(1)
    })

    it('adds a rank every ABILITY_LEVELS_PER_RANK levels, capped', () => {
      const store = useBardAbilityStore()
      unlock('q', ABILITY_LEVELS_PER_RANK * 2)
      expect(store.rankOf('q')).toBe(3)
      unlock('q', ABILITY_LEVELS_PER_RANK * 50)
      expect(store.rankOf('q')).toBe(ABILITY_MAX_RANK)
    })

    it('multiplies power by rank and resonance together', () => {
      const store = useBardAbilityStore()
      unlock('q', ABILITY_LEVELS_PER_RANK)
      store.resonance = 20
      expect(store.powerMultOf('q')).toBeCloseTo(
        (1 + ABILITY_RANK_POWER_STEP) * (1 + 20 * RESONANCE_POWER_PER_STACK),
      )
    })

    it('shortens the cooldown with rank and resonance, capped at ABILITY_CDR_CAP', () => {
      const store = useBardAbilityStore()
      const base = getBardAbility('q')!.baseCooldownSec * 1000

      unlock('q')
      expect(store.cooldownMsOf('q')).toBe(base)

      unlock('q', ABILITY_LEVELS_PER_RANK)
      expect(store.cooldownMsOf('q')).toBe(Math.round(base * (1 - ABILITY_RANK_CDR_STEP)))

      store.resonance = RESONANCE_MAX_STACKS * 10
      expect(store.cooldownMsOf('q')).toBe(Math.round(base * (1 - ABILITY_CDR_CAP)))
    })

    it('names the level of the next rank, and none at the cap', () => {
      const store = useBardAbilityStore()

      useGameStore().level = ABILITY_UNLOCK_LEVEL_Q - 1
      expect(store.nextRankLevelOf('q')).toBe(ABILITY_UNLOCK_LEVEL_Q)

      unlock('q')
      expect(store.nextRankLevelOf('q')).toBe(ABILITY_UNLOCK_LEVEL_Q + ABILITY_LEVELS_PER_RANK)

      unlock('q', ABILITY_LEVELS_PER_RANK * 2)
      expect(store.nextRankLevelOf('q')).toBe(ABILITY_UNLOCK_LEVEL_Q + 3 * ABILITY_LEVELS_PER_RANK)

      unlock('q', ABILITY_LEVELS_PER_RANK * 50)
      expect(store.nextRankLevelOf('q')).toBe(0)
    })
  })

  // Der zweite Skalierungsweg. Zielzahl, Stasedauer und die beiden Fenster
  // wachsen ALLEIN mit dem Rang — hinge eines davon an der Resonance, dann
  // verlängerte Klicken das Fenster, in dem Klicken mehr zählt. Genau das
  // binden die zweiten Erwartungen unten fest.
  describe('rank-scaled values (resonance must not touch them)', () => {
    const CASES = [
      ['bindingTargets', 'q', BINDING_TARGET_COUNT, BINDING_TARGET_PER_RANK],
      ['shrineBuffMs', 'w', SHRINE_BUFF_DURATION_MS, SHRINE_BUFF_PER_RANK_MS],
      ['journeyBuffMs', 'e', JOURNEY_BUFF_DURATION_MS, JOURNEY_BUFF_PER_RANK_MS],
      ['stasisMs', 'r', FATE_STASIS_DURATION_MS, FATE_STASIS_PER_RANK_MS],
    ] as const

    it.each(CASES)('%s grows by one step per rank', (field, id, base, step) => {
      const store = useBardAbilityStore()

      unlock(id)
      expect(store[field]).toBe(base)

      unlock(id, ABILITY_LEVELS_PER_RANK * 2)
      expect(store[field]).toBe(base + 2 * step)
    })

    it.each(CASES)('%s stops at ABILITY_MAX_RANK', (field, id, base, step) => {
      const store = useBardAbilityStore()
      unlock(id, ABILITY_LEVELS_PER_RANK * 50)
      expect(store[field]).toBe(base + (ABILITY_MAX_RANK - 1) * step)
    })

    it.each(CASES)('%s reads as rank 1 while the ability is still locked', (field, id, base) => {
      const store = useBardAbilityStore()
      useGameStore().level = 1
      expect(store.rankOf(id)).toBe(0)
      expect(store[field]).toBe(base)
    })

    it.each(CASES)('%s is untouched by resonance', (field, id, base, step) => {
      const store = useBardAbilityStore()
      unlock(id, ABILITY_LEVELS_PER_RANK * 2)
      const withoutResonance = store[field]

      store.resonance = RESONANCE_MAX_STACKS

      expect(store.powerMultOf(id)).toBeGreaterThan(1) // die Resonance wirkt sehr wohl …
      expect(store[field]).toBe(withoutResonance) // … nur eben nicht hier
      expect(store[field]).toBe(base + 2 * step)
    })
  })

  describe('casting', () => {
    it('refuses a locked ability', () => {
      const store = useBardAbilityStore()
      useGameStore().level = 1
      expect(store.cast('r')).toBe(false)
      expect(store.totalCasts).toBe(0)
    })

    it('refuses a second cast while the cooldown runs', () => {
      const store = useBardAbilityStore()
      unlock('q')
      expect(store.cast('q')).toBe(true)
      expect(store.cast('q')).toBe(false)
      expect(store.totalCasts).toBe(1)
    })

    it('puts the ability on its full cooldown', () => {
      const store = useBardAbilityStore()
      unlock('q')
      const before = Date.now()
      store.cast('q')
      expect(store.cooldownReadyAt.q).toBeGreaterThanOrEqual(before + store.cooldownMsOf('q'))
      expect(store.isReady('q')).toBe(false)
    })
  })

  describe('Q — Cosmic Binding', () => {
    it('strikes as many bosses as the rank allows, for a share of their own max HP', () => {
      const store = useBardAbilityStore()
      unlock('q')
      const bosses = [addBoss('p1', 10_000), addBoss('p2', 20_000), addBoss('p3', 30_000)]

      store.cast('q')

      // Gegen den GETTER geprüft, nicht gegen die Basiskonstante: sonst liefe
      // die Schleife auf höherem Rang an den zusätzlichen Zielen vorbei und der
      // Test würde still weniger prüfen, als er verspricht.
      const reach = store.bindingTargets
      expect(reach).toBe(BINDING_TARGET_COUNT)

      const power = store.powerMultOf('q')
      for (let i = 0; i < reach; i++) {
        const expected = Math.ceil(bosses[i].maxHP * BINDING_DAMAGE_MAX_HP_PCT * power)
        expect(bosses[i].currentHP).toBe(bosses[i].maxHP - expected)
      }
      // Was hinter der Reichweite des Blitzes liegt, bleibt unberührt.
      expect(bosses[reach].currentHP).toBe(bosses[reach].maxHP)
    })

    it('reaches one boss further per rank', () => {
      const store = useBardAbilityStore()
      unlock('q', ABILITY_LEVELS_PER_RANK * 2) // Rang 3 → vier Ziele
      const reach = BINDING_TARGET_COUNT + 2 * BINDING_TARGET_PER_RANK
      const bosses = Array.from({ length: reach }, (_, i) => addBoss(`p${i}`, 10_000))
      const spare = addBoss('spare', 10_000)

      store.cast('q')

      expect(store.bindingTargets).toBe(reach)
      for (const boss of bosses) expect(boss.currentHP).toBeLessThan(boss.maxHP)
      // Der Blitz endet an seiner Reichweite und nicht an der Bosszahl.
      expect(spare.currentHP).toBe(spare.maxHP)
    })

    it('holds the enrage clock of every boss it did not kill', () => {
      const store = useBardAbilityStore()
      unlock('q')
      const startTime = Date.now() - 5000
      const boss = addBoss('p1', 1_000_000, startTime)

      store.cast('q')

      expect(boss.startTime).toBe(startTime + BINDING_STUN_MS)
    })

    it('rebounds off the sun for chimes when no boss is out there', () => {
      const store = useBardAbilityStore()
      const game = useGameStore()
      unlock('q')
      game.chimesPerClick = 100
      const before = game.chimes

      store.cast('q')

      expect(game.chimes).toBeGreaterThan(before)
      expect(store.lastCast.summary).toContain('chimes')
    })
  })

  describe('W — Caretaker’s Shrine', () => {
    it('heals a share of max HP and lifts the boss chime penalty', () => {
      const store = useBardAbilityStore()
      const player = usePlayerStore()
      const bossStore = usePlanetBossStore()
      unlock('w')
      player.currentHP = 1
      bossStore.cpsPenaltyActive = true

      store.cast('w')

      const expected = Math.round(player.maxHP * SHRINE_HEAL_MAX_HP_PCT * store.powerMultOf('w'))
      expect(player.currentHP).toBe(Math.min(player.maxHP, 1 + expected))
      expect(bossStore.cpsPenaltyActive).toBe(false)
    })

    it('never heals past the maximum', () => {
      const store = useBardAbilityStore()
      const player = usePlayerStore()
      unlock('w')
      store.cast('w')
      expect(player.currentHP).toBe(player.maxHP)
    })

    it('multiplies the cached chime production for its window', () => {
      const store = useBardAbilityStore()
      const game = useGameStore()
      const shop = useShopStore()
      unlock('w')
      shop.shopUpgrades.find((u) => u.id === 'glockenturm')!.level = 100
      game.chimesPerSecond = shop.calculateTotalCPS()
      const plain = game.chimesPerSecond

      store.cast('w')

      expect(store.cpsMult).toBe(SHRINE_CPS_MULT)
      expect(game.chimesPerSecond).toBe(Math.floor(plain * SHRINE_CPS_MULT))
    })

    it('lets the afterglow run as long as the rank allows', () => {
      const store = useBardAbilityStore()
      unlock('w', ABILITY_LEVELS_PER_RANK * 2) // Rang 3

      store.cast('w')

      // Der Getter ist an anderer Stelle gebunden — hier zählt, dass die
      // EINBAUSTELLE ihn benutzt und nicht weiter die Basiskonstante.
      const buff = store.buffs.find((b) => b.sourceId === 'w')
      expect(buff?.durationMs).toBe(store.shrineBuffMs)
      expect(buff?.durationMs).toBe(SHRINE_BUFF_DURATION_MS + 2 * SHRINE_BUFF_PER_RANK_MS)
    })
  })

  describe('E — Magical Journey', () => {
    it('grants every star in the orbit extra standing time', () => {
      const store = useBardAbilityStore()
      const starGroup = useStarGroupStore()
      unlock('e')
      starGroup.activeStars = [
        { id: 's1', durationMs: 60_000 } as never,
        { id: 's2' } as never, // ohne Frist — muss unangetastet bleiben
      ]

      store.cast('e')

      const bonus = Math.round(JOURNEY_STAR_TIME_SEC * 1000 * store.powerMultOf('e'))
      expect(starGroup.activeStars[0].durationMs).toBe(60_000 + bonus)
      expect(starGroup.activeStars[1].durationMs).toBeUndefined()
    })

    it('backdates the sun phase clock, which is what "skip ahead" means here', () => {
      const store = useBardAbilityStore()
      const solar = useSolarUpgradeStore()
      unlock('e')
      solar.isCometState = false
      solar.starPhase = 3 // lange Phase → das Budget ist nicht die Bremse
      solar.phaseEnteredAt = Date.now()
      const before = solar.phaseEnteredAt

      store.cast('e')

      const skipped = Math.round(JOURNEY_DWELL_SKIP_SEC * store.powerMultOf('e'))
      expect(solar.phaseEnteredAt).toBe(before - skipped * 1000)
      expect(solar.phaseDwellSkippedMs).toBe(skipped * 1000)
    })

    // Ungeklemmt war dieser eine Effekt der eigentliche Taktgeber der
    // Sonnenachse: kurze Abklingzeit mal Rangfaktor ergaben rund 480
    // übersprungene Sekunden je 40 Sekunden Echtzeit — Faktor 12 auf die ganze
    // Rampe. Die Sonne war dadurch nach 4,4 statt 21 Spielstunden fertig, und
    // jede Änderung an der Rampe lief ins Leere.
    it('überspringt nie mehr als seinen Anteil einer Phase', () => {
      const store = useBardAbilityStore()
      const solar = useSolarUpgradeStore()
      unlock('e')
      solar.isCometState = false
      solar.starPhase = 0
      solar.phaseEnteredAt = Date.now()
      const budget = solar.phaseDwellRequiredMs * DWELL_SKIP_PHASE_FRACTION

      // Viel öfter zünden, als das Budget hergibt.
      for (let i = 0; i < 50; i++) {
        store.cooldownReadyAt.e = 0
        store.cast('e')
      }

      expect(solar.phaseDwellSkippedMs).toBeLessThanOrEqual(budget)
      expect(solar.phaseDwellSkippedMs).toBeGreaterThan(0)
      expect(solar.phaseDwellElapsedMs).toBeLessThan(solar.phaseDwellRequiredMs)
    })

    it('pulls every running expedition forward and leaves resolved ones alone', () => {
      const store = useBardAbilityStore()
      const expeditions = useExpeditionStore()
      unlock('e')
      const started = Date.now()
      expeditions.activeExpeditions = [
        { id: 'm1', status: 'active', startTime: started, durationSeconds: 100_000 } as never,
        { id: 'm2', status: 'success', startTime: started, durationSeconds: 100_000 } as never,
      ]

      store.cast('e')

      const skipped = Math.round(JOURNEY_EXPEDITION_SKIP_SEC * store.powerMultOf('e'))
      expect(expeditions.activeExpeditions[0].startTime).toBe(started - skipped * 1000)
      expect(expeditions.activeExpeditions[1].startTime).toBe(started)
    })

    // Die Championreise ist die einzige Uhr des Spiels ohne aktiven Griff und
    // ab Galaxie 13 die, die am längsten warten lässt. Dass ausgerechnet
    // „Magical Journey" sie nicht anfasste, war ein Loch im eigenen Namen.
    it('rafft die laufende Championreise', () => {
      const store = useBardAbilityStore()
      const galaxy = useGalaxyStore()
      unlock('e')
      galaxy.championTravelState = 'traveling'
      const started = Date.now()
      galaxy.championTravelStartTime = started

      store.cast('e')

      const skipped = Math.round(JOURNEY_TRAVEL_SKIP_SEC * store.powerMultOf('e'))
      expect(galaxy.championTravelStartTime).toBe(started - skipped * 1000)
    })

    it('lässt eine nicht laufende Reise unangetastet', () => {
      const store = useBardAbilityStore()
      const galaxy = useGalaxyStore()
      unlock('e')
      galaxy.championTravelState = 'idle'
      galaxy.championTravelStartTime = 0

      store.cast('e')

      expect(galaxy.championTravelStartTime).toBe(0)
      expect(galaxy.championTravelState).toBe('idle')
    })

    it('holds the travel window open as long as the rank allows', () => {
      const store = useBardAbilityStore()
      unlock('e', ABILITY_LEVELS_PER_RANK * 2) // Rang 3

      store.cast('e')

      const buff = store.buffs.find((b) => b.sourceId === 'e')
      expect(buff?.durationMs).toBe(store.journeyBuffMs)
      expect(buff?.durationMs).toBe(JOURNEY_BUFF_DURATION_MS + 2 * JOURNEY_BUFF_PER_RANK_MS)
    })
  })

  describe('R — Tempered Fate', () => {
    it('opens a stasis window and multiplies own damage while it holds', () => {
      const store = useBardAbilityStore()
      unlock('r')

      expect(store.combatDpsMult).toBe(1)
      store.cast('r')

      expect(store.stasisActive).toBe(true)
      expect(store.combatDpsMult).toBe(FATE_DAMAGE_MULT)
      expect(store.stasisSecondsLeft).toBe(Math.round(FATE_STASIS_DURATION_MS / 1000))
    })

    it('holds the stasis longer with every rank', () => {
      const store = useBardAbilityStore()
      unlock('r', ABILITY_LEVELS_PER_RANK * 2) // Rang 3

      store.cast('r')

      expect(store.stasisSecondsLeft).toBe(
        Math.round((FATE_STASIS_DURATION_MS + 2 * FATE_STASIS_PER_RANK_MS) / 1000),
      )
      // Die Klartextzeile nennt dieselbe Zahl — sie wird aus derselben Quelle
      // gebildet und darf nicht auf der Basiskonstante hängenbleiben.
      expect(store.lastCast.summary).toContain(`${Math.round(store.stasisMs / 1000)}s`)
    })

    it('carries enrage clocks and star timers along with each tick', () => {
      const store = useBardAbilityStore()
      const starGroup = useStarGroupStore()
      unlock('r')
      const startTime = Date.now() - 10_000
      const boss = addBoss('p1', 1_000_000, startTime)
      starGroup.activeStars = [{ id: 's1', durationMs: 60_000 } as never]

      store.cast('r')
      store.tick()

      expect(boss.startTime).toBe(startTime + GAME_TICK_INTERVAL_MS)
      expect(starGroup.activeStars[0].durationMs).toBe(60_000 + GAME_TICK_INTERVAL_MS)
    })

    it('lands the parting blow when the stasis breaks, once', () => {
      vi.useFakeTimers()
      const store = useBardAbilityStore()
      unlock('r')
      const boss = addBoss('p1', 1_000_000)

      store.cast('r')
      const hpAtCast = boss.currentHP

      vi.setSystemTime(Date.now() + FATE_STASIS_DURATION_MS + 1000)
      store.tick()
      const hpAfterBreak = boss.currentHP
      expect(hpAfterBreak).toBeLessThan(hpAtCast)

      // Der Schlag gehört zum Auflösen und darf sich nicht jede Sekunde
      // wiederholen — danach steht keine Stase mehr.
      store.tick()
      expect(boss.currentHP).toBe(hpAfterBreak)
      expect(store.stasisActive).toBe(false)
    })
  })

  describe('timed effects', () => {
    it('drops a window once it has run out and restores the plain rate', () => {
      vi.useFakeTimers()
      const store = useBardAbilityStore()
      const game = useGameStore()
      const shop = useShopStore()
      unlock('w')
      shop.shopUpgrades.find((u) => u.id === 'glockenturm')!.level = 100
      game.chimesPerSecond = shop.calculateTotalCPS()
      const plain = game.chimesPerSecond

      store.cast('w')
      expect(game.chimesPerSecond).toBe(Math.floor(plain * SHRINE_CPS_MULT))

      vi.setSystemTime(Date.now() + 60_000)
      store.tick()

      expect(store.liveBuffs).toHaveLength(0)
      expect(store.cpsMult).toBe(1)
      expect(game.chimesPerSecond).toBe(plain)
    })

    it('restarts a window instead of stacking a second copy', () => {
      const store = useBardAbilityStore()
      unlock('w', ABILITY_LEVELS_PER_RANK * 10)
      store.cast('w')
      store.resetCooldowns()
      store.cast('w')
      expect(store.buffs.filter((b) => b.sourceId === 'w')).toHaveLength(1)
      expect(store.cpsMult).toBe(SHRINE_CPS_MULT)
    })
  })

  describe('unlock levels stay in the intended order', () => {
    it('Q comes before W comes before R', () => {
      expect(ABILITY_UNLOCK_LEVEL_Q).toBeLessThan(ABILITY_UNLOCK_LEVEL_W)
      expect(ABILITY_UNLOCK_LEVEL_W).toBeLessThan(ABILITY_UNLOCK_LEVEL_R)
    })
  })
})
