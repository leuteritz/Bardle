import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { getDrifter, DRIFTERS } from '@/config/world/drifters'
import {
  DWELL_SKIP_PHASE_FRACTION,
  DRIFTER_MAX_CONCURRENT,
  DRIFTER_CHIME_REWARD_MIN_CLICKS,
  DRIFTER_CHIME_REWARD_CAP_SEC,
  DRIFTER_SPAWN_INTERVAL_SEC,
  DRIFTER_FIRST_DELAY_SEC,
  DRIFTER_SPAWN_RETRY_SEC,
  GAME_TICK_INTERVAL_MS,
} from '@/config/constants'

/** Spawns a specific type and returns its live instance. */
function spawn(defId: string) {
  const store = useDrifterStore()
  store.active = []
  const drifter = store.spawnDrifter(defId)
  expect(drifter).not.toBeNull()
  return drifter!
}

describe('drifterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('spawning', () => {
    it('respects the concurrency cap', () => {
      const store = useDrifterStore()
      for (let i = 0; i < DRIFTER_MAX_CONCURRENT + 3; i++) store.spawnDrifter('errantChime')
      expect(store.active).toHaveLength(DRIFTER_MAX_CONCURRENT)
    })

    it('counts every spawn for the stats catalog', () => {
      const store = useDrifterStore()
      store.spawnDrifter('errantChime')
      store.active = []
      store.spawnDrifter('emberShard')
      expect(store.totalDriftersSpawned).toBe(2)
    })

    it('does not spawn from the tick while an overlay hides the idle view', () => {
      const store = useDrifterStore()
      store.setSpawningBlocked(true)
      store.spawnCooldowns.common = 0
      store.tick()
      expect(store.active).toHaveLength(0)
      // The clock must not drain either — otherwise closing the overlay would
      // dump a backlog of drifters onto the screen at once.
      expect(store.spawnCooldowns.common).toBe(0)
    })

    it('spawns from the tick once a rarity clock runs out', () => {
      const store = useDrifterStore()
      store.spawnCooldowns.common = GAME_TICK_INTERVAL_MS / 1000
      store.tick()
      expect(store.active).toHaveLength(1)
      expect(getDrifter(store.active[0].defId)?.rarity).toBe('common')
      // Rearmed within that rarity's own band, not with a global interval.
      const [min, max] = DRIFTER_SPAWN_INTERVAL_SEC.common
      expect(store.spawnCooldowns.common).toBeGreaterThanOrEqual(min)
      expect(store.spawnCooldowns.common).toBeLessThanOrEqual(max)
    })

    it('gives every rarity its own clock, staggered at the start', () => {
      const store = useDrifterStore()
      for (const rarity of ['common', 'uncommon', 'rare', 'legendary'] as const) {
        const [min, max] = DRIFTER_FIRST_DELAY_SEC[rarity]
        expect(store.spawnCooldowns[rarity]).toBeGreaterThanOrEqual(min)
        expect(store.spawnCooldowns[rarity]).toBeLessThanOrEqual(max)
      }
      // Common must come around fastest, legendary slowest — that ordering is
      // the whole point of separate clocks.
      expect(DRIFTER_SPAWN_INTERVAL_SEC.common[1]).toBeLessThan(
        DRIFTER_SPAWN_INTERVAL_SEC.uncommon[0],
      )
      expect(DRIFTER_SPAWN_INTERVAL_SEC.uncommon[1]).toBeLessThan(
        DRIFTER_SPAWN_INTERVAL_SEC.rare[0],
      )
      expect(DRIFTER_SPAWN_INTERVAL_SEC.rare[1]).toBeLessThan(
        DRIFTER_SPAWN_INTERVAL_SEC.legendary[0],
      )
    })

    it('serves the rarest tier first when several clocks come due together', () => {
      const store = useDrifterStore()
      for (const rarity of ['common', 'uncommon', 'rare', 'legendary'] as const) {
        store.spawnCooldowns[rarity] = GAME_TICK_INTERVAL_MS / 1000
      }
      store.tick()
      // The sky holds one drifter — it has to be the legendary one, or waiting
      // for a leviathan would mean waiting for a gap between common spawns.
      expect(store.active).toHaveLength(DRIFTER_MAX_CONCURRENT)
      expect(getDrifter(store.active[0].defId)?.rarity).toBe('legendary')
    })

    it('retries a tier that found the sky full instead of forfeiting its turn', () => {
      const store = useDrifterStore()
      store.spawnDrifter('starLeviathan')
      store.spawnCooldowns.common = GAME_TICK_INTERVAL_MS / 1000
      store.tick()
      // No second body, but the common clock is back on a short retry rather
      // than on its full interval — the due spawn is deferred, not lost.
      expect(store.active).toHaveLength(DRIFTER_MAX_CONCURRENT)
      expect(store.spawnCooldowns.common).toBe(DRIFTER_SPAWN_RETRY_SEC)
    })

    it('keeps a lively but not crowded rate over a long session', () => {
      // The clocks are authored per rarity, but only DRIFTER_MAX_CONCURRENT
      // bodies may fly at once — the interesting number is what actually
      // reaches the player after that cap and the retries have had their say.
      // Time is advanced for real so drifters occupy the sky for their full
      // flight; ending them early would flatter the rate.
      vi.useFakeTimers()
      const store = useDrifterStore()
      const minutes = 60
      const ticks = minutes * 60
      const seen: Record<string, number> = {}
      let spawns = 0

      for (let i = 0; i < ticks; i++) {
        vi.setSystemTime(Date.now() + GAME_TICK_INTERVAL_MS)
        const before = store.totalDriftersSpawned
        store.tick()
        if (store.totalDriftersSpawned > before) {
          spawns++
          const def = getDrifter(store.active[store.active.length - 1].defId)!
          seen[def.rarity] = (seen[def.rarity] ?? 0) + 1
        }
      }

      const perMinute = spawns / minutes
      // Measured at authoring time: 180/hour = one every 20.0s, split
      // 122 common / 35 uncommon / 18 rare / 5 legendary.
      // Lively: on average one roughly every 20-30s, and never a swarm.
      expect(perMinute).toBeGreaterThan(2)
      expect(perMinute).toBeLessThan(4)
      // Every tier has to actually show up over an hour — a legendary that
      // never appears is a promise the config does not keep.
      expect(seen.common ?? 0).toBeGreaterThan(0)
      expect(seen.uncommon ?? 0).toBeGreaterThan(0)
      expect(seen.rare ?? 0).toBeGreaterThan(0)
      expect(seen.legendary ?? 0).toBeGreaterThan(0)
      // …and the ordering must hold: common most often, legendary least.
      expect(seen.common).toBeGreaterThan(seen.uncommon)
      expect(seen.uncommon).toBeGreaterThan(seen.rare)
      expect(seen.rare).toBeGreaterThanOrEqual(seen.legendary)
    })

    it('drops drifters whose flight has finished and counts them as missed', () => {
      const store = useDrifterStore()
      const drifter = spawn('errantChime')
      drifter.spawnedAt = Date.now() - drifter.flightMs - 1
      store.tick()
      expect(store.active).toHaveLength(0)
      expect(store.totalDriftersMissed).toBe(1)
      expect(store.totalDriftersCollected).toBe(0)
      // The info card turns this counter into its "got away" state.
      expect(store.lastExpired.defId).toBe('errantChime')
      expect(store.lastExpired.seq).toBe(1)
    })
  })

  describe('hits', () => {
    it('collects a single-hit drifter on the first click', () => {
      const store = useDrifterStore()
      const drifter = spawn('emberShard')
      const collected = store.hitDrifter(drifter.uid)
      expect(collected?.id).toBe('emberShard')
      expect(store.active).toHaveLength(0)
      expect(store.totalDriftersCollected).toBe(1)
    })

    it('pays a multi-hit drifter out only on the final strike', () => {
      const store = useDrifterStore()
      const def = getDrifter('starLeviathan')!
      expect(def.hits).toBeGreaterThan(1)
      const drifter = spawn('starLeviathan')

      for (let i = 1; i < def.hits; i++) {
        expect(store.hitDrifter(drifter.uid)).toBeNull()
        expect(store.active).toHaveLength(1)
        expect(store.buffs).toHaveLength(0)
      }

      expect(store.hitDrifter(drifter.uid)?.id).toBe('starLeviathan')
      expect(store.active).toHaveLength(0)
      expect(store.buffs).toHaveLength(1)
    })

    it('ignores a hit on an unknown uid', () => {
      const store = useDrifterStore()
      expect(store.hitDrifter(9999)).toBeNull()
    })

    it('bumps the collect counter so the UI replays for the same type twice', () => {
      const store = useDrifterStore()
      store.hitDrifter(spawn('emberShard').uid, 120, 340)
      const first = store.lastCollect.seq
      store.hitDrifter(spawn('emberShard').uid, 120, 340)
      expect(store.lastCollect.seq).toBe(first + 1)
      expect(store.lastCollect.x).toBe(120)
      expect(store.lastCollect.y).toBe(340)
    })
  })

  describe('buffs', () => {
    it('multiplies only the axis the buff names', () => {
      const store = useDrifterStore()
      store.hitDrifter(spawn('emberShard').uid)
      expect(store.cpcMult).toBe(3)
      expect(store.cpsMult).toBe(1)
      expect(store.combatDpsMult).toBe(1)
      expect(store.materialDropMult).toBe(1)
      expect(store.xpMult).toBe(1)
    })

    it('lifts every axis for the legendary drifter', () => {
      const store = useDrifterStore()
      const def = getDrifter('starLeviathan')!
      store.applyBuff(def)
      expect(store.cpsMult).toBe(3)
      expect(store.cpcMult).toBe(3)
      expect(store.combatDpsMult).toBe(3)
      expect(store.materialDropMult).toBe(3)
      expect(store.xpMult).toBe(3)
    })

    it('refreshes instead of stacking when the same type is collected twice', () => {
      const store = useDrifterStore()
      store.hitDrifter(spawn('emberShard').uid)
      const firstExpiry = store.buffs[0].expiresAt
      vi.setSystemTime(Date.now() + 5_000)
      store.hitDrifter(spawn('emberShard').uid)

      expect(store.buffs).toHaveLength(1)
      // Same multiplier as before — a second copy would make it ×9
      expect(store.cpcMult).toBe(3)
      expect(store.buffs[0].expiresAt).toBeGreaterThan(firstExpiry)
    })

    it('stacks multiplicatively across different types', () => {
      const store = useDrifterStore()
      store.applyBuff(getDrifter('emberShard')!)
      store.applyBuff(getDrifter('starLeviathan')!)
      expect(store.cpcMult).toBe(9)
    })

    it('expires a buff on the tick that passes its end', () => {
      vi.useFakeTimers()
      const store = useDrifterStore()
      const def = getDrifter('emberShard')!
      store.applyBuff(def)
      expect(store.cpcMult).toBe(3)

      vi.setSystemTime(Date.now() + def.buff!.durationMs + 1)
      store.spawningBlocked = true // keep the tick from spawning into the assertion
      store.tick()

      expect(store.buffs).toHaveLength(0)
      expect(store.cpcMult).toBe(1)
    })

    it('leaves an expired buff out of the multipliers even before the tick clears it', () => {
      const store = useDrifterStore()
      store.buffs = [
        {
          sourceId: 'emberShard',
          expiresAt: Date.now() - 1,
          durationMs: 30_000,
          effects: { cpcMult: 3 },
        },
      ]
      store.drifterNow = Date.now()
      expect(store.cpcMult).toBe(1)
      expect(store.liveBuffs).toHaveLength(0)
    })
  })

  describe('instant rewards', () => {
    it('pays chimes worth the promised seconds of production', () => {
      const game = useGameStore()
      const store = useDrifterStore()
      game.chimesPerSecond = 1000
      game.chimesPerClick = 1
      const before = game.chimes

      store.hitDrifter(spawn('errantChime').uid)

      const def = getDrifter('errantChime')!
      expect(game.chimes - before).toBe(1000 * def.reward!.chimesFromCpsSeconds!)
    })

    it('falls back to a click-based floor while production is still zero', () => {
      const game = useGameStore()
      const store = useDrifterStore()
      game.chimesPerSecond = 0
      game.chimesPerClick = 42
      const before = game.chimes

      store.hitDrifter(spawn('errantChime').uid)

      expect(game.chimes - before).toBe(42 * DRIFTER_CHIME_REWARD_MIN_CLICKS)
    })

    it('caps the chime payout at the configured production window', () => {
      const game = useGameStore()
      const store = useDrifterStore()
      game.chimesPerSecond = 1000
      game.chimesPerClick = 1
      const def = getDrifter('errantChime')!
      // Only meaningful if the type promises less than the cap — guard the
      // assumption so a future rebalance cannot make this test vacuous.
      expect(def.reward!.chimesFromCpsSeconds!).toBeLessThanOrEqual(DRIFTER_CHIME_REWARD_CAP_SEC)

      const before = game.chimes
      store.hitDrifter(spawn('errantChime').uid)
      expect(game.chimes - before).toBeLessThanOrEqual(1000 * DRIFTER_CHIME_REWARD_CAP_SEC)
    })

    it('hands over a meep and fills the meep bar', () => {
      const game = useGameStore()
      const store = useDrifterStore()
      game.meeps = 4
      game.chimesForMeep = 0
      game.meepChimeRequirement = 5000

      store.hitDrifter(spawn('lostMeep').uid)

      expect(game.meeps).toBe(5)
      expect(game.totalMeepsEarned).toBe(1)
      expect(game.chimesForMeep).toBe(5000)
    })

    it('drops the promised number of materials', () => {
      const inventory = useInventoryStore()
      const store = useDrifterStore()
      const def = getDrifter('salvageProbe')!

      store.hitDrifter(spawn('salvageProbe').uid)

      expect(inventory.totalMaterialsCollected).toBeGreaterThanOrEqual(def.reward!.materials!)
    })

    it('backdates the star-phase dwell clock, aber nur im gemeinsamen Rahmen', () => {
      // Der Drifter-Lohn ist eine von DREI Quellen, die Verweildauer
      // überspringen (dazu Bard-E und das Relikt „Solar Winds"). Alle drei
      // teilen sich denselben Deckel je Phase — sonst verschiebt sich das
      // Problem nur auf die Quelle, die gerade nicht geklemmt ist. Ungedeckelt
      // fiel die volle Sonne nach 13,9 statt ~38 Spielstunden.
      const solar = useSolarUpgradeStore()
      const store = useDrifterStore()
      solar.phaseEnteredAt = Date.now()
      const before = solar.phaseEnteredAt
      const def = getDrifter('coronalSurge')!
      const budget = solar.phaseDwellRequiredMs * DWELL_SKIP_PHASE_FRACTION

      store.hitDrifter(spawn('coronalSurge').uid)

      const skipped = before - solar.phaseEnteredAt
      expect(skipped).toBeGreaterThan(0)
      expect(skipped).toBe(Math.min(def.reward!.dwellSkipSeconds! * 1000, budget))
      expect(solar.phaseDwellSkippedMs).toBe(skipped)
    })

    it('extends every star timer, leaving timerless stars alone', () => {
      const starGroup = useStarGroupStore()
      const store = useDrifterStore()
      starGroup.spawnResourceStar()
      const timed = starGroup.activeStars.find((s) => s.durationMs !== undefined)!
      const before = timed.durationMs!
      // Galaxy boss stars carry no despawn timer — they must stay untouched.
      starGroup.activeStars.push({ ...timed, id: 'timeless', durationMs: undefined })

      store.hitDrifter(spawn('wayfarerBeacon').uid)

      const def = getDrifter('wayfarerBeacon')!
      expect(timed.durationMs! - before).toBe(def.reward!.starTimeSeconds! * 1000)
      expect(starGroup.activeStars.find((s) => s.id === 'timeless')!.durationMs).toBeUndefined()
    })
  })

  describe('orbit strike', () => {
    /** Two stars' worth of planets — every one of them a live boss. */
    function fillOrbit() {
      const starGroup = useStarGroupStore()
      starGroup.spawnResourceStar()
      starGroup.spawnResourceStar()
      const bosses = usePlanetBossStore().activeBosses
      expect(bosses.length).toBeGreaterThan(1)
      return bosses
    }

    it('hits every living planet for its own share of max health', () => {
      const store = useDrifterStore()
      const bosses = fillOrbit()
      const pct = getDrifter('sunderingPulse')!.reward!.orbitStrikeMaxHpPct!
      const before = bosses.map((b) => b.currentHP)

      store.hitDrifter(spawn('sunderingPulse').uid)

      bosses.forEach((boss, i) => {
        // A share, not a flat number: each planet loses at least its own
        // percentage, whatever its max HP happens to be.
        expect(before[i] - boss.currentHP).toBeGreaterThanOrEqual(Math.ceil(boss.maxHP * pct))
      })
    })

    it('reports the tally so the shockwave can replay it', () => {
      const store = useDrifterStore()
      const bosses = fillOrbit()

      store.hitDrifter(spawn('sunderingPulse').uid)

      expect(store.lastOrbitStrike.seq).toBe(1)
      expect(store.lastOrbitStrike.defId).toBe('sunderingPulse')
      expect(store.lastOrbitStrike.planetsHit).toBe(bosses.length)
      expect(store.lastOrbitStrike.damage).toBeGreaterThan(0)
    })

    it('spares planets that are already down and counts the ones it kills', () => {
      const store = useDrifterStore()
      const bosses = fillOrbit()
      const dead = bosses[0]
      dead.defeated = true
      const doomed = bosses[1]
      // One hit away from death — the strike has to finish it and say so.
      doomed.currentHP = 1
      const untouched = dead.currentHP

      store.hitDrifter(spawn('sunderingPulse').uid)

      expect(dead.currentHP).toBe(untouched)
      expect(store.lastOrbitStrike.planetsHit).toBe(bosses.length - 1)
      expect(store.lastOrbitStrike.kills).toBeGreaterThanOrEqual(1)
      expect(doomed.defeated).toBe(true)
    })

    it('still fires on an empty orbit, reporting zero targets', () => {
      const store = useDrifterStore()
      expect(usePlanetBossStore().activeBosses).toHaveLength(0)

      store.hitDrifter(spawn('sunderingPulse').uid)

      // The wave plays either way — a collected drifter that silently does
      // nothing would read as a bug, not as an empty sky.
      expect(store.lastOrbitStrike.seq).toBe(1)
      expect(store.lastOrbitStrike.planetsHit).toBe(0)
      expect(store.lastOrbitStrike.damage).toBe(0)
    })
  })

  describe('integration into the production pipeline', () => {
    it('raises the cached CpS the moment a chime buff starts', () => {
      const game = useGameStore()
      const shop = useShopStore()
      const store = useDrifterStore()
      shop.shopUpgrades.find((u) => u.id === 'glockenturm')!.level = 100
      game.chimesPerSecond = shop.calculateTotalCPS()
      const before = game.chimesPerSecond
      expect(before).toBeGreaterThan(0)

      store.applyBuff(getDrifter('coronalSurge')!)

      expect(shop.calculateTotalCPS()).toBe(before * 2)
      // applyBuff must also refresh the cached value the tick reads
      expect(game.chimesPerSecond).toBe(before * 2)
    })

    it('raises the click value while an Ember Shard runs', () => {
      const game = useGameStore()
      const shop = useShopStore()
      const store = useDrifterStore()
      shop.shopUpgrades.find((u) => u.id === 'chimeClicker')!.level = 10
      const before = shop.calculateTotalCPC()

      store.applyBuff(getDrifter('emberShard')!)

      expect(shop.calculateTotalCPC()).toBe(before * 3)
      expect(game.chimesPerClick).toBe(before * 3)
    })

    it('multiplies champion XP gains', () => {
      const levels = useChampionLevelStore()
      const store = useDrifterStore()
      const champion = 'Bard'

      const plain = levels.grantXp(champion, 100)
      store.applyBuff(getDrifter('starLeviathan')!)
      const buffed = levels.grantXp(champion, 100)

      expect(buffed).toBe(plain * 3)
    })

    it('restores the plain rates once every buff has expired', () => {
      vi.useFakeTimers()
      const game = useGameStore()
      const shop = useShopStore()
      const store = useDrifterStore()
      shop.shopUpgrades.find((u) => u.id === 'glockenturm')!.level = 100
      game.chimesPerSecond = shop.calculateTotalCPS()
      const plain = game.chimesPerSecond

      const def = getDrifter('coronalSurge')!
      store.applyBuff(def)
      expect(game.chimesPerSecond).toBe(plain * 2)

      vi.setSystemTime(Date.now() + def.buff!.durationMs + 1)
      store.spawningBlocked = true
      store.tick()

      expect(game.chimesPerSecond).toBe(plain)
    })
  })

  describe('definitions', () => {
    it('gives every drifter a unique id and a positive spawn weight', () => {
      const ids = DRIFTERS.map((d) => d.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const def of DRIFTERS) expect(def.weight).toBeGreaterThan(0)
    })

    it('gives every drifter a payout — no type is a dead click', () => {
      for (const def of DRIFTERS) {
        const hasReward = def.reward && Object.keys(def.reward).length > 0
        const hasBuff = def.buff && Object.keys(def.buff.effects).length > 0
        expect(hasReward || hasBuff).toBe(true)
      }
    })

    it('uses a distinct icon per type so a row of chips stays readable', () => {
      const icons = DRIFTERS.map((d) => d.icon)
      expect(new Set(icons).size).toBe(icons.length)
    })
  })

  describe('reset', () => {
    it('clears the sky and every running buff', () => {
      const store = useDrifterStore()
      store.spawnDrifter('errantChime')
      store.applyBuff(getDrifter('emberShard')!)
      store.spawnCooldowns.common = 0

      store.clearAll()

      expect(store.active).toHaveLength(0)
      expect(store.buffs).toHaveLength(0)
      expect(store.cpcMult).toBe(1)
      // Clocks rearmed, so a fresh universe does not open with a burst.
      expect(store.spawnCooldowns.common).toBeGreaterThan(0)
    })
  })
})
