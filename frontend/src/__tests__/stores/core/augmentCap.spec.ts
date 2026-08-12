import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/stores/core/gameStore'
import { AUGMENTS, RARITY_WEIGHTS } from '@/config/economy/augments'
import { AUGMENT_ACTIVE_CAP } from '@/config/constants'
import type { AugmentRarity } from '@/types'

/**
 * Der Deckel auf die aktiven Augments. Er ist keine Kosmetik: ohne ihn
 * multipliziert `combinedAugmentEffects` einen Faktor je Level-Up, und aus
 * „mehr CpS → schnellere Level → mehr Augments" wird eine exponentielle
 * Rückkopplung (gemessen: CpS 10² → 10⁹⁹ in zwei Spielstunden).
 */

const idsOfRarity = (rarity: AugmentRarity, n: number) =>
  AUGMENTS.filter((a) => a.rarity === rarity)
    .slice(0, n)
    .map((a) => a.id)

const rarityOf = (id: string) => AUGMENTS.find((a) => a.id === id)!.rarity

describe('Augment-Deckel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lässt die Liste nie über den Deckel wachsen', () => {
    const store = useGameStore()
    for (const aug of AUGMENTS) store._addAugment(aug.id)
    expect(store.activeAugments.length).toBe(AUGMENT_ACTIVE_CAP)
  })

  it('füllt bis zum Deckel ohne zu verdrängen', () => {
    const store = useGameStore()
    const ids = AUGMENTS.slice(0, AUGMENT_ACTIVE_CAP).map((a) => a.id)
    for (const id of ids) store._addAugment(id)
    expect(store.activeAugments).toEqual(ids)
  })

  it('wirft das häufigste Augment heraus, nicht das älteste', () => {
    const store = useGameStore()
    // Deckel voll mit Legendaries und genau einem Common in der MITTE.
    const legendaries = idsOfRarity('legendary', 2)
    const commons = idsOfRarity('common', AUGMENT_ACTIVE_CAP - 2)
    for (const id of [...legendaries, ...commons]) store._addAugment(id)
    expect(store.activeAugments.length).toBe(AUGMENT_ACTIVE_CAP)

    const epic = idsOfRarity('epic', 1)[0]
    store._addAugment(epic)

    expect(store.activeAugments).toContain(epic)
    // Beide Legendaries stehen noch — verdrängt wurde ein Common.
    for (const l of legendaries) expect(store.activeAugments).toContain(l)
    expect(store.activeAugments.length).toBe(AUGMENT_ACTIVE_CAP)
  })

  it('lässt eine schwache Wahl kein starkes Augment verdrängen', () => {
    const store = useGameStore()
    const strong = [...idsOfRarity('legendary', 4), ...idsOfRarity('epic', 6)]
    for (const id of strong) store._addAugment(id)

    const common = idsOfRarity('common', 1)[0]
    store._addAugment(common)

    // Das Common war das schwächste und hat sich selbst verdrängt.
    expect(store.activeAugments).not.toContain(common)
    expect(store.activeAugments.sort()).toEqual(strong.sort())
  })

  it('hält die Restliste immer bei den stärksten Einträgen', () => {
    const store = useGameStore()
    for (const aug of AUGMENTS) store._addAugment(aug.id)

    const weightsLeft = store.activeAugments.map((id) => RARITY_WEIGHTS[rarityOf(id)])
    const worstKept = Math.max(...weightsLeft)
    // Kein Legendary darf herausgefallen sein, solange Häufigeres drinsteht.
    const legendaryCount = AUGMENTS.filter((a) => a.rarity === 'legendary').length
    const keptLegendaries = store.activeAugments.filter((id) => rarityOf(id) === 'legendary').length
    expect(keptLegendaries).toBe(Math.min(legendaryCount, AUGMENT_ACTIVE_CAP))
    expect(worstKept).toBeLessThanOrEqual(RARITY_WEIGHTS.common)
  })
})
