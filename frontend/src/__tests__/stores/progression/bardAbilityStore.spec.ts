import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
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
  FATE_DAMAGE_MULT,
  FATE_STASIS_DURATION_MS,
  GAME_TICK_INTERVAL_MS,
  JOURNEY_DWELL_SKIP_SEC,
  JOURNEY_EXPEDITION_SKIP_SEC,
  JOURNEY_STAR_TIME_SEC,
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
    it('strikes at most BINDING_TARGET_COUNT bosses for a share of their own max HP', () => {
      const store = useBardAbilityStore()
      unlock('q')
      const bosses = [addBoss('p1', 10_000), addBoss('p2', 20_000), addBoss('p3', 30_000)]

      store.cast('q')

      const power = store.powerMultOf('q')
      for (let i = 0; i < BINDING_TARGET_COUNT; i++) {
        const expected = Math.ceil(bosses[i].maxHP * BINDING_DAMAGE_MAX_HP_PCT * power)
        expect(bosses[i].currentHP).toBe(bosses[i].maxHP - expected)
      }
      // Das dritte Ziel liegt hinter dem Blitz und bleibt unberührt.
      expect(bosses[2].currentHP).toBe(bosses[2].maxHP)
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
      solar.phaseEnteredAt = Date.now()
      const before = solar.phaseEnteredAt

      store.cast('e')

      const skipped = Math.round(JOURNEY_DWELL_SKIP_SEC * store.powerMultOf('e'))
      expect(solar.phaseEnteredAt).toBe(before - skipped * 1000)
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
