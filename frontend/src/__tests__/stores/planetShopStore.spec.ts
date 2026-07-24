import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  usePlanetShopStore,
  PLANET_ROLES,
  JUNGLE_BUFF_DEFS,
  planetLevelBonusMultiplier,
  planetMilestoneCount,
  planetRankTier,
  computePlanetMaxHp,
  planetLevelUpCost,
  planetLevelRequiredPhase,
  isPlanetDown,
} from '../../stores/planetShopStore'
import type { PlanetRoleType } from '../../stores/planetShopStore'
import { useGameStore } from '../../stores/gameStore'
import { useSolarUpgradeStore } from '../../stores/solarUpgradeStore'
import {
  PLANET_SLOT_MAX_HP,
  PLANET_SLOT_SUN_PHASE_REQUIREMENTS,
  PLANET_RESPAWN_MS,
  STAR_PHASE_DATA,
} from '../../config/constants'

describe('planetShopStore — Attunement leveling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ─── Pure helpers ──────────────────────────────────────────────────────────
  describe('pure helpers', () => {
    it('planetLevelBonusMultiplier: +10% per level above 1', () => {
      expect(planetLevelBonusMultiplier(1)).toBe(1)
      expect(planetLevelBonusMultiplier(3)).toBeCloseTo(1.2)
    })

    it('computePlanetMaxHp grows with level', () => {
      expect(computePlanetMaxHp(1)).toBe(PLANET_SLOT_MAX_HP)
      expect(computePlanetMaxHp(2)).toBe(Math.round(PLANET_SLOT_MAX_HP * 1.2))
      expect(computePlanetMaxHp(3)).toBeGreaterThan(computePlanetMaxHp(2))
    })

    it('planetLevelUpCost grows geometrically from baseCost', () => {
      expect(planetLevelUpCost({ baseCost: 1000, level: 1 })).toBe(Math.ceil(1000 * 0.5))
      expect(planetLevelUpCost({ baseCost: 1000, level: 2 })).toBe(Math.ceil(1000 * 0.5 * 1.6))
    })

    it('planetLevelRequiredPhase: ~5 levels per phase, capped at 5', () => {
      expect(planetLevelRequiredPhase(2)).toBe(0)
      expect(planetLevelRequiredPhase(6)).toBe(1)
      expect(planetLevelRequiredPhase(31)).toBe(5)
      expect(planetLevelRequiredPhase(100)).toBe(5)
    })

    it('every sun phase after the comet unlocks one planet slot', () => {
      expect(PLANET_SLOT_SUN_PHASE_REQUIREMENTS).toEqual([0, 1, 2, 3, 4, 5])
      expect(PLANET_SLOT_SUN_PHASE_REQUIREMENTS.length).toBe(STAR_PHASE_DATA.length)
    })
  })

  // ─── Getters scale with level ──────────────────────────────────────────────
  describe('bonus getters scale with slot level', () => {
    it('autoAttackDPS scales with turret level', () => {
      const store = usePlanetShopStore()
      const slot = store.slots[0]
      slot.purchased = true
      slot.role = 'turret_planet'
      slot.level = 3
      expect(store.autoAttackDPS).toBeCloseTo(
        PLANET_ROLES.turret_planet.bonusPerSlot * planetLevelBonusMultiplier(3),
      )
    })

    it('planetExpeditionRewardMultiplier scales with level', () => {
      const store = usePlanetShopStore()
      const slot = store.slots[0]
      slot.purchased = true
      slot.role = 'expedition_relay'
      slot.level = 3
      const m = planetLevelBonusMultiplier(3)
      expect(store.planetExpeditionRewardMultiplier).toBeCloseTo(
        1 + PLANET_ROLES.expedition_relay.bonusPerSlot * m,
      )
    })

    it('resonanceTowerBuildingMultipliers scales with level', () => {
      const store = usePlanetShopStore()
      const slot = store.slots[0]
      slot.purchased = true
      slot.role = 'resonance_tower'
      slot.level = 2
      slot.slotConfig = { buildingId: 'glockenturm' }
      const m = planetLevelBonusMultiplier(2)
      expect(store.resonanceTowerBuildingMultipliers['glockenturm']).toBeCloseTo(
        1 + PLANET_ROLES.resonance_tower.bonusPerSlot * m,
      )
    })
  })

  // ─── Level-up gating + action ──────────────────────────────────────────────
  describe('canLevelUpPlanet / levelUpPlanet', () => {
    function setup(level = 1, phase = 6, chimes = 1e9) {
      const store = usePlanetShopStore()
      const game = useGameStore()
      const solar = useSolarUpgradeStore()
      const slot = store.slots[0]
      slot.purchased = true
      slot.role = 'turret_planet'
      slot.level = level
      slot.maxHp = computePlanetMaxHp(level)
      slot.currentHp = slot.maxHp
      solar.starPhase = phase
      game.chimes = chimes
      return { store, game, slot }
    }

    it('blocked when chimes insufficient', () => {
      const { store, slot } = setup(1, 6, 0)
      expect(store.planetLevelUpBlockReason(slot.id)).toBe('chimes')
      expect(store.canLevelUpPlanet(slot.id)).toBe(false)
    })

    it('blocked when sun phase too low', () => {
      // next level 6 requires phase 1; phase 0 must block even with plenty of chimes
      const { store, slot } = setup(5, 0, 1e9)
      expect(store.planetLevelUpBlockReason(slot.id)).toBe('phase')
      expect(store.canLevelUpPlanet(slot.id)).toBe(false)
    })

    it('levelUpPlanet deducts chimes, bumps level, grows + heals HP', () => {
      const { store, game, slot } = setup(1, 6, 1e9)
      const cost = store.getPlanetLevelUpCost(slot.id)
      slot.currentHp = 50 // damaged
      const prevMaxHp = slot.maxHp
      const beforeChimes = game.chimes

      expect(store.levelUpPlanet(slot.id)).toBe(true)
      expect(slot.level).toBe(2)
      expect(game.chimes).toBe(beforeChimes - cost)
      expect(slot.maxHp).toBe(computePlanetMaxHp(2))
      expect(slot.maxHp).toBeGreaterThan(prevMaxHp)
      // healed by exactly the HP delta gained from the level
      expect(slot.currentHp).toBe(50 + (slot.maxHp - prevMaxHp))
    })

    it('levelUpPlanet is a no-op when blocked', () => {
      const { store, slot } = setup(1, 6, 0)
      expect(store.levelUpPlanet(slot.id)).toBe(false)
      expect(slot.level).toBe(1)
    })
  })

  // ─── Milestones ────────────────────────────────────────────────────────────
  describe('milestone perks', () => {
    it('planetMilestoneCount counts every 5th level', () => {
      expect(planetMilestoneCount(4)).toBe(0)
      expect(planetMilestoneCount(5)).toBe(1)
      expect(planetMilestoneCount(12)).toBe(2)
    })

    it('planetLevelBonusMultiplier spikes at milestones', () => {
      // level 5: 1 + 4*0.1 (per-level) + 1*0.25 (milestone) = 1.65
      expect(planetLevelBonusMultiplier(5)).toBeCloseTo(1.65)
      // level 4: no milestone yet → 1 + 3*0.1 = 1.3
      expect(planetLevelBonusMultiplier(4)).toBeCloseTo(1.3)
    })
  })

  // ─── Rank tiers ────────────────────────────────────────────────────────────
  describe('planetRankTier', () => {
    it('returns the highest band whose min <= level', () => {
      expect(planetRankTier(1).name).toBe('Nascent')
      expect(planetRankTier(5).name).toBe('Resonant')
      expect(planetRankTier(10).name).toBe('Harmonic')
      expect(planetRankTier(34).name).toBe('Celestial')
      expect(planetRankTier(35).name).toBe('Transcendent')
    })
  })

  // ─── Permanent role ────────────────────────────────────────────────────────
  describe('assignRole permanence', () => {
    it('sets a role on an empty slot, then refuses to change it', () => {
      const store = usePlanetShopStore()
      const slot = store.slots[0]
      slot.purchased = true
      store.assignRole(slot.id, 'turret_planet')
      expect(slot.role).toBe('turret_planet')
      // second assign is a no-op
      store.assignRole(slot.id, 'harvest_node')
      expect(slot.role).toBe('turret_planet')
    })
  })

  // ─── Bulk attune ───────────────────────────────────────────────────────────
  describe('bulk attune', () => {
    function setup(level = 1, phase = 6, chimes = 1e12) {
      const store = usePlanetShopStore()
      const game = useGameStore()
      const solar = useSolarUpgradeStore()
      const slot = store.slots[0]
      slot.purchased = true
      slot.role = 'turret_planet'
      slot.level = level
      slot.maxHp = computePlanetMaxHp(level)
      slot.currentHp = slot.maxHp
      solar.starPhase = phase
      game.chimes = chimes
      return { store, game, slot }
    }

    it('levelUpPlanetTimes gains the requested count when affordable', () => {
      const { store, slot } = setup(1, 6, 1e12)
      const gained = store.levelUpPlanetTimes(slot.id, 10)
      expect(gained).toBe(10)
      expect(slot.level).toBe(11)
    })

    it('stops at the phase gate', () => {
      // phase 0 allows levels up to 5 (next level 6 needs phase 1)
      const { store, slot } = setup(1, 0, 1e12)
      const gained = store.levelUpPlanetTimes(slot.id, 100)
      expect(slot.level).toBe(5)
      expect(gained).toBe(4)
      expect(store.planetLevelUpBlockReason(slot.id)).toBe('phase')
    })

    it('getMaxAffordableLevelCount matches what an unbounded attune would gain', () => {
      const { store, game, slot } = setup(1, 6, 50_000)
      const predicted = store.getMaxAffordableLevelCount(slot.id)
      const startChimes = game.chimes
      const gained = store.levelUpPlanetTimes(slot.id, Infinity)
      expect(gained).toBe(predicted)
      expect(game.chimes).toBeLessThanOrEqual(startChimes)
      expect(game.chimes).toBeGreaterThanOrEqual(0)
    })

    it('getBulkLevelUpCost sums the next N level costs', () => {
      const { store, slot } = setup(1, 6, 1e12)
      const expected =
        planetLevelUpCost({ baseCost: slot.baseCost, level: 1 }) +
        planetLevelUpCost({ baseCost: slot.baseCost, level: 2 }) +
        planetLevelUpCost({ baseCost: slot.baseCost, level: 3 })
      expect(store.getBulkLevelUpCost(slot.id, 3)).toBe(expected)
    })
  })

  // ─── Destruction + respawn ─────────────────────────────────────────────────
  describe('destroyed planets', () => {
    function armed(role: PlanetRoleType = 'turret_planet', level = 3) {
      const store = usePlanetShopStore()
      const slot = store.slots[0]
      slot.purchased = true
      slot.role = role
      slot.level = level
      slot.maxHp = computePlanetMaxHp(level)
      slot.currentHp = slot.maxHp
      slot.downUntilMs = 0
      return { store, slot }
    }

    it('takeDamage above remaining HP destroys the planet and starts the timer', () => {
      const { store, slot } = armed()
      store.takeDamage(slot.id, slot.maxHp + 500)
      expect(slot.currentHp).toBe(0)
      expect(isPlanetDown(slot)).toBe(true)
      expect(slot.downUntilMs).toBeGreaterThan(Date.now())
      expect(slot.downUntilMs).toBeLessThanOrEqual(Date.now() + PLANET_RESPAWN_MS)
    })

    it('surviving damage leaves the planet alive', () => {
      const { store, slot } = armed()
      store.takeDamage(slot.id, 1)
      expect(slot.currentHp).toBe(slot.maxHp - 1)
      expect(isPlanetDown(slot)).toBe(false)
    })

    it('a destroyed planet contributes no role bonus', () => {
      const { store, slot } = armed('turret_planet')
      expect(store.autoAttackDPS).toBeGreaterThan(0)
      store.takeDamage(slot.id, slot.maxHp)
      expect(store.autoAttackDPS).toBe(0)
    })

    it('a destroyed harvester stops harvesting', () => {
      const { store, slot } = armed('harvest_node')
      slot.slotConfig = { materialId: 'iron' }
      expect(store.activeHarvestSlots).toHaveLength(1)
      store.takeDamage(slot.id, slot.maxHp)
      expect(store.activeHarvestSlots).toHaveLength(0)
    })

    it('cannot be healed back while destroyed', () => {
      const { store, slot } = armed()
      store.takeDamage(slot.id, slot.maxHp)
      store.healSlot(slot.id, 999)
      expect(slot.currentHp).toBe(0)
      expect(isPlanetDown(slot)).toBe(true)
    })

    it('takes no further damage while destroyed (timer is not extended)', () => {
      const { store, slot } = armed()
      store.takeDamage(slot.id, slot.maxHp)
      const downUntil = slot.downUntilMs
      store.takeDamage(slot.id, 50)
      expect(slot.downUntilMs).toBe(downUntil)
    })

    it('tickRespawn restores full HP once the timer expires', () => {
      const { store, slot } = armed('turret_planet', 4)
      store.takeDamage(slot.id, slot.maxHp)

      // Timer läuft noch → nichts passiert
      store.tickRespawn()
      expect(isPlanetDown(slot)).toBe(true)
      expect(slot.currentHp).toBe(0)

      slot.downUntilMs = Date.now() - 1
      store.tickRespawn()
      expect(isPlanetDown(slot)).toBe(false)
      expect(slot.maxHp).toBe(computePlanetMaxHp(4))
      expect(slot.currentHp).toBe(slot.maxHp)
      expect(store.autoAttackDPS).toBeGreaterThan(0)
    })

    it('destruction clears an active jungle buff and blocks new ones', () => {
      const { store, slot } = armed()
      store.applyJungleBuff(slot.id, JUNGLE_BUFF_DEFS.turret_planet)
      expect(slot.jungleBuff?.active).toBe(true)

      store.takeDamage(slot.id, slot.maxHp)
      expect(slot.jungleBuff).toBeNull()

      store.applyJungleBuff(slot.id, JUNGLE_BUFF_DEFS.turret_planet)
      expect(slot.jungleBuff).toBeNull()
    })
  })
})
