import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useActiveBuffList } from '@/composables/ui/useActiveBuffList'
import { useGameStore } from '@/stores/core/gameStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import { useLandfallStore } from '@/stores/world/landfallStore'
import { DRIFTERS } from '@/config/world/drifters'
import { OMENS } from '@/config/progression/omens'

describe('useActiveBuffList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is empty on a fresh game', () => {
    const { buffs, count } = useActiveBuffList()
    expect(buffs.value).toEqual([])
    expect(count.value).toBe(0)
  })

  it('lists one entry per source, short-lived first, and drops expired ones', () => {
    const game = useGameStore()
    const drifter = useDrifterStore()
    const omen = useOmenStore()
    const ability = useBardAbilityStore()
    const forge = useStarForgeStore()
    const augment = useAugmentStore()
    const landfall = useLandfallStore()

    const now = drifter.drifterNow
    ability.abilityNow = now
    omen.omenNow = now
    forge.forgeNow = now

    ability.buffs.push({ sourceId: 'q', expiresAt: now + 5_000, durationMs: 10_000, cpsMult: 1.5 })
    game.mvpBuffSecondsLeft = 4
    drifter.buffs.push({
      sourceId: DRIFTERS[0].id,
      expiresAt: now + 30_000,
      durationMs: 60_000,
      effects: { cpcMult: 2 },
    })
    drifter.buffs.push({
      sourceId: DRIFTERS[0].id,
      expiresAt: now - 1,
      durationMs: 60_000,
      effects: { cpcMult: 2 },
    })
    omen.buffs.push({
      sourceId: OMENS[0].id,
      expiresAt: now + 90_000,
      durationMs: 120_000,
      swift: false,
      effects: { cpsMult: 1.2 },
    })
    forge.activeBuffs.push({ id: 'cpsX2', expiresAt: now + 600_000 })
    augment.activeTimedBuffs.push({
      augmentId: 'rare_overclock',
      effectKey: 'cpsMultiplier',
      multiplier: 2,
      expiresAt: now + 15_000,
    })
    landfall.boon = 'keptChimes'

    const { buffs } = useActiveBuffList()
    expect(buffs.value.map((b) => b.source)).toEqual([
      'ability',
      'mvp',
      'drifter',
      'omen',
      'forge',
      'augment',
      'landfall',
    ])

    const byId = Object.fromEntries(buffs.value.map((b) => [b.source, b]))
    expect(byId.ability.image).toBeTruthy()
    expect(byId.ability.timer?.secondsLeft).toBe(5)
    expect(byId.ability.timer?.progress).toBeCloseTo(0.5)
    expect(byId.mvp.timer?.secondsLeft).toBe(4)
    expect(byId.drifter.rankColor).toBeTruthy()
    expect(byId.drifter.rank).toBe(DRIFTERS[0].rarity)
    expect(byId.drifter.image).toBeTruthy()
    expect(byId.drifter.label).toBe('PER CLICK')
    expect(byId.forge.label).toBe('CHIMES')
    expect(byId.forge.timer?.secondsLeft).toBe(600)
    expect(byId.augment.label).toBe('CHIMES')
    expect(byId.augment.multiplier).toBe(2)
    expect(byId.augment.rank).toBe('rare')
    expect(byId.augment.rankColor).toBeTruthy()
    for (const src of ['ability', 'mvp', 'omen', 'forge', 'landfall']) {
      expect(byId[src].rank).toBeUndefined()
    }
    expect(byId.landfall.timer).toBeNull()
    expect(byId.landfall.startedAt).toBeNull()
    expect(byId.ability.startedAt).toBe(now - 5_000)
    expect(byId.drifter.startedAt).toBe(now - 30_000)
    expect(byId.mvp.startedAt).toBeLessThanOrEqual(now)
    for (const b of buffs.value) {
      expect(b.key.length).toBeGreaterThan(0)
      expect(b.name.length).toBeGreaterThan(0)
      expect(b.icon || b.image).toBeTruthy()
    }
  })
})
