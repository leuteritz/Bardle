import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useDrifterStore } from '../../stores/drifterStore'
import { useGameStore } from '../../stores/gameStore'
import { useShopStore } from '../../stores/shopStore'
import { useInventoryStore } from '../../stores/inventoryStore'
import { useSolarUpgradeStore } from '../../stores/solarUpgradeStore'
import { useStarGroupStore } from '../../stores/starGroupStore'
import { useChampionLevelStore } from '../../stores/championLevelStore'
import { getDrifter, DRIFTERS } from '../../config/drifters'
import {
  DRIFTER_MAX_CONCURRENT,
  DRIFTER_CHIME_REWARD_MIN_CLICKS,
  DRIFTER_CHIME_REWARD_CAP_SEC,
  GAME_TICK_INTERVAL_MS,
} from '../../config/constants'

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
      store.spawnCooldownSec = 0
      store.tick()
      expect(store.active).toHaveLength(0)
      // The cooldown must not drain either — otherwise closing the overlay
      // would dump a backlog of drifters onto the screen at once.
      expect(store.spawnCooldownSec).toBe(0)
    })

    it('spawns from the tick once the cooldown runs out', () => {
      const store = useDrifterStore()
      store.spawnCooldownSec = GAME_TICK_INTERVAL_MS / 1000
      store.tick()
      expect(store.active).toHaveLength(1)
      expect(store.spawnCooldownSec).toBeGreaterThan(0)
    })

    it('drops drifters whose flight has finished and counts them as missed', () => {
      const store = useDrifterStore()
      const drifter = spawn('errantChime')
      drifter.spawnedAt = Date.now() - drifter.flightMs - 1
      store.tick()
      expect(store.active).toHaveLength(0)
      expect(store.totalDriftersMissed).toBe(1)
      expect(store.totalDriftersCollected).toBe(0)
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

    it('backdates the star-phase dwell clock', () => {
      const solar = useSolarUpgradeStore()
      const store = useDrifterStore()
      solar.phaseEnteredAt = Date.now()
      const before = solar.phaseEnteredAt
      const def = getDrifter('coronalSurge')!

      store.hitDrifter(spawn('coronalSurge').uid)

      expect(before - solar.phaseEnteredAt).toBe(def.reward!.dwellSkipSeconds! * 1000)
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

      store.clearAll()

      expect(store.active).toHaveLength(0)
      expect(store.buffs).toHaveLength(0)
      expect(store.cpcMult).toBe(1)
    })
  })
})
