import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useStatCatalog } from '../../composables/useStatCatalog'
import { STAT_CATEGORIES } from '../../config/statCategories'
import { USED_GAME_ICONS } from '../../config/constants'
import { isValidIcon } from '../../utils/iconUtils'
import { useBattleStore } from '../../stores/battleStore'
import { useGameStore } from '../../stores/gameStore'

describe('statCategories — definitions', () => {
  it('has unique ids and no duplicate icons', () => {
    const ids = STAT_CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    const icons = STAT_CATEGORIES.map((c) => c.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })

  it('only uses registered, existing game-icons', () => {
    for (const cat of STAT_CATEGORIES) {
      expect(cat.icon.startsWith('game-icons:'), `${cat.id} misses the set prefix`).toBe(true)
      expect(isValidIcon(cat.icon), `${cat.icon} is not in gameicons.txt`).toBe(true)
      expect(USED_GAME_ICONS.has(cat.icon), `${cat.icon} is not registered`).toBe(true)
    }
  })
})

describe('useStatCatalog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('builds every category with stats and unique keys', () => {
    const { categories, totalStatCount } = useStatCatalog(ref(''))
    expect(categories.value).toHaveLength(STAT_CATEGORIES.length)
    for (const cat of categories.value) {
      expect(cat.stats.length, `${cat.id} has no stats`).toBeGreaterThan(0)
      const keys = cat.stats.map((s) => s.key)
      expect(new Set(keys).size, `${cat.id} has duplicate stat keys`).toBe(keys.length)
      for (const stat of cat.stats) {
        expect(stat.label.length, `${cat.id}/${stat.key} has no label`).toBeGreaterThan(0)
        expect(stat.value.length, `${cat.id}/${stat.key} has no value`).toBeGreaterThan(0)
      }
    }
    expect(totalStatCount.value).toBe(
      categories.value.reduce((sum, c) => sum + c.stats.length, 0),
    )
  })

  it('filters by label across categories and keeps totalCount intact', () => {
    const query = ref('')
    const { categories, matchCount, totalStatCount } = useStatCatalog(query)
    const total = totalStatCount.value

    query.value = 'pentakills'
    const hit = categories.value.find((c) => c.id === 'combatRecord')!
    expect(hit.stats.map((s) => s.label)).toContain('Pentakills')
    expect(matchCount.value).toBeGreaterThan(0)
    expect(matchCount.value).toBeLessThan(total)
    // totalCount stays the unfiltered size so the header can show "n of m"
    expect(hit.totalCount).toBeGreaterThan(hit.stats.length)
  })

  it('matches a whole category by its name', () => {
    const query = ref('auto battle')
    const { categories } = useStatCatalog(query)
    const cat = categories.value.find((c) => c.id === 'autoBattle')!
    expect(cat.stats.length).toBe(cat.totalCount)
  })

  it('finds nothing for a nonsense query', () => {
    const { categories, matchCount } = useStatCatalog(ref('zzzznotastat'))
    expect(matchCount.value).toBe(0)
    expect(categories.value.every((c) => c.stats.length === 0)).toBe(true)
  })

  it('reflects live store values', () => {
    const query = ref('best win streak')
    const { categories } = useStatCatalog(query)
    const battleStore = useBattleStore()
    battleStore.bestWinStreak = 17

    const row = categories.value
      .flatMap((c) => c.stats)
      .find((s) => s.label === 'Best Win Streak')
    expect(row?.value).toBe('17')
  })

  it('keeps lifetime counters visible in their category', () => {
    const gameStore = useGameStore()
    gameStore.totalPrestiges = 4
    const { categories } = useStatCatalog(ref('prestige resets'))
    const row = categories.value
      .flatMap((c) => c.stats)
      .find((s) => s.label === 'Prestige Resets')
    expect(row?.value).toBe('4')
  })
})
