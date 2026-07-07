import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useBattleStore } from '../../stores/battleStore'
import { useCombatStore } from '../../stores/combatStore'
import { usePlanetBossStore } from '../../stores/planetBossStore'
import { normalizeSecondarySlots } from '../../composables/usePersistence'
import { activePlanetPositions } from '../../utils/activePlanetPositions'
import { ALLIES_PER_ROLE, ALLY_DPS_CONTRIBUTION, CHAMPION_DPS_BASE } from '../../config/constants'

describe('ally slots (5 per role)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ─── secondarySlots shape ────────────────────────────────────────────────────

  it('initializes 5 roles × ALLIES_PER_ROLE empty ally slots', () => {
    const store = useBattleStore()
    expect(store.secondarySlots).toHaveLength(5)
    for (const row of store.secondarySlots) {
      expect(row).toHaveLength(ALLIES_PER_ROLE)
      expect(row.every((s) => s === null)).toBe(true)
    }
  })

  // ─── setSecondarySlot uniqueness across the widened row ─────────────────────

  it('moving a champion to the last ally sub-slot vacates its previous slot', () => {
    const store = useBattleStore()
    store.setSecondarySlot(0, 0, 'Ahri')
    expect(store.secondarySlots[0][0]).toBe('Ahri')

    store.setSecondarySlot(2, ALLIES_PER_ROLE - 1, 'Ahri')
    expect(store.secondarySlots[0][0]).toBeNull()
    expect(store.secondarySlots[2][ALLIES_PER_ROLE - 1]).toBe('Ahri')
  })

  it('assigning a main champion as ally removes it from the header slot', () => {
    const store = useBattleStore()
    store.setHeaderSlot(1, 'Garen')
    store.setSecondarySlot(1, 3, 'Garen')
    expect(store.headerSlots[1]).toBeNull()
    expect(store.secondarySlots[1][3]).toBe('Garen')
  })

  // ─── persistence normalization (no SAVE_VERSION bump) ───────────────────────

  describe('normalizeSecondarySlots', () => {
    it('pads legacy 2-slot rows to ALLIES_PER_ROLE, preserving champions at 0/1', () => {
      const legacy = [
        ['Ahri', 'Garen'],
        [null, 'Lux'],
        [null, null],
        ['Jinx', null],
        [null, null],
      ]
      const result = normalizeSecondarySlots(legacy)
      expect(result).toHaveLength(5)
      for (const row of result) expect(row).toHaveLength(ALLIES_PER_ROLE)
      expect(result[0]).toEqual(['Ahri', 'Garen', null, null, null])
      expect(result[1]).toEqual([null, 'Lux', null, null, null])
      expect(result[3]).toEqual(['Jinx', null, null, null, null])
    })

    it('truncates over-long rows and nulls out malformed entries', () => {
      const rows = [
        ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        [42, 'B', undefined, {}, null, 'X'],
        'not-an-array',
        [],
        [null],
      ]
      const result = normalizeSecondarySlots(rows)
      expect(result[0]).toEqual(['A', 'B', 'C', 'D', 'E'])
      expect(result[1]).toEqual([null, 'B', null, null, null])
      expect(result[2]).toEqual([null, null, null, null, null])
      expect(result[3]).toEqual([null, null, null, null, null])
    })
  })

  // ─── combatStore tick: passive ally DPS multiplier ───────────────────────────

  describe('combatStore ally DPS multiplier', () => {
    afterEach(() => {
      activePlanetPositions.clear()
      vi.restoreAllMocks()
    })

    function setupBossFight(alliesFilled: number) {
      const battleStore = useBattleStore()
      const combatStore = useCombatStore()
      const bossStore = usePlanetBossStore()

      battleStore.setHeaderSlot(0, 'TestMain')
      for (let s = 0; s < alliesFilled; s++) {
        battleStore.setSecondarySlot(0, s, `TestAlly${s}`)
      }

      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      activePlanetPositions.set('planet-1', { cx, cy, isForeground: true })
      bossStore.activeBosses = [
        {
          planetId: 'planet-1',
          defeated: false,
          expired: false,
          isChampionPlanet: false,
        } as never,
      ]
      bossStore.selectedBossId = 'planet-1'

      combatStore.syncChampions(['TestMain'])
      combatStore.setChampionScreenPos('TestMain', cx, cy)

      const dealDamage = vi.spyOn(bossStore, 'dealDamage').mockReturnValue(false)
      return { combatStore, dealDamage }
    }

    it('attacking main with 0 allies deals base DPS', () => {
      const { combatStore, dealDamage } = setupBossFight(0)
      combatStore.tick()
      expect(dealDamage).toHaveBeenCalledWith(CHAMPION_DPS_BASE)
    })

    it('attacking main with k allies deals base × (1 + k × ALLY_DPS_CONTRIBUTION)', () => {
      const k = 3
      const { combatStore, dealDamage } = setupBossFight(k)
      combatStore.tick()
      expect(dealDamage).toHaveBeenCalledWith(
        expect.closeTo(CHAMPION_DPS_BASE * (1 + k * ALLY_DPS_CONTRIBUTION), 5),
      )
    })

    it('full ally row restores the old 3× ceiling', () => {
      const { combatStore, dealDamage } = setupBossFight(ALLIES_PER_ROLE)
      combatStore.tick()
      expect(dealDamage).toHaveBeenCalledWith(expect.closeTo(CHAMPION_DPS_BASE * 3, 5))
    })
  })
})
