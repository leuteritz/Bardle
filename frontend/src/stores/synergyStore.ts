import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useBattleStore } from './battleStore'
import { getChampionOrigin, ORIGIN_SYNERGIES } from '../config/championOrigins'
import { CHAMPION_TRAITS, TRAIT_BY_ID } from '../config/championTraits'
import type { ActiveOriginSynergy, ActiveSynergy, ActiveTrait, ChampionOrigin, TraitId } from '../types'

export const useSynergyStore = defineStore('synergy', () => {
  const battleStore = useBattleStore()

  // [header, sec0, sec1] per role index
  const roleTriples = computed(() =>
    battleStore.headerSlots.map((h, i) => [
      h,
      battleStore.secondarySlots[i]?.[0] ?? null,
      battleStore.secondarySlots[i]?.[1] ?? null,
    ] as (string | null)[]),
  )

  const allInOrbit = computed(() => {
    const out: string[] = []
    for (const row of roleTriples.value) for (const n of row) if (n) out.push(n)
    return out
  })

  // Compute active origin synergies (unchanged from original)
  const activeOriginSynergies = computed<ActiveOriginSynergy[]>(() => {
    const orbit = allInOrbit.value
    const originCounts = new Map<ChampionOrigin, string[]>()

    for (const name of orbit) {
      const origin = getChampionOrigin(name)
      if (!origin || origin === 'Runeterra') continue
      if (!originCounts.has(origin)) originCounts.set(origin, [])
      originCounts.get(origin)!.push(name)
    }

    const result: ActiveOriginSynergy[] = []
    for (const [origin, champs] of originCounts) {
      const def = ORIGIN_SYNERGIES[origin]
      if (!def) continue
      const count = champs.length
      const sorted = [...def.thresholds].sort((a, b) => b.count - a.count)
      const activeThreshold = sorted.find((t) => count >= t.count) ?? null
      const nextThreshold = def.thresholds.find((t) => t.count > count) ?? null
      result.push({ origin, def, count, activeThreshold, nextThreshold, involvedChampions: champs })
    }
    return result.sort((a, b) => (b.activeThreshold ? 1 : 0) - (a.activeThreshold ? 1 : 0))
  })

  // Compute active TFT-style traits from champions currently in team slots
  const activeTraits = computed<ActiveTrait[]>(() => {
    const orbit = allInOrbit.value

    // Count how many champions in orbit carry each trait and track who
    const traitCounts = new Map<TraitId, string[]>()
    for (const name of orbit) {
      const traits = CHAMPION_TRAITS[name] ?? []
      for (const traitId of traits) {
        if (!traitCounts.has(traitId)) traitCounts.set(traitId, [])
        traitCounts.get(traitId)!.push(name)
      }
    }

    const result: ActiveTrait[] = []
    for (const [traitId, champs] of traitCounts) {
      if (champs.length < 2) continue // minimum threshold is always 2
      const trait = TRAIT_BY_ID[traitId]
      if (!trait) continue
      const count = champs.length
      const sorted = [...trait.thresholds].sort((a, b) => b.count - a.count)
      const activeThreshold = sorted.find((t) => count >= t.count) ?? null
      const nextThreshold = trait.thresholds.find((t) => t.count > count) ?? null
      result.push({ trait, count, activeThreshold, nextThreshold, involvedChampions: champs })
    }

    return result.sort((a, b) => {
      const aIdx = a.activeThreshold ? a.trait.thresholds.indexOf(a.activeThreshold) : -1
      const bIdx = b.activeThreshold ? b.trait.thresholds.indexOf(b.activeThreshold) : -1
      return bIdx - aIdx
    })
  })

  const cpsSynergyMultiplier = computed(() => {
    const originMult = activeOriginSynergies.value
      .filter((s) => s.activeThreshold)
      .flatMap((s) => s.activeThreshold!.effects)
      .filter((e) => e.type === 'cps')
      .reduce((acc, e) => acc * e.multiplier, 1)
    const traitMult = activeTraits.value
      .filter((t) => t.activeThreshold)
      .flatMap((t) => t.activeThreshold!.effects)
      .filter((e) => e.type === 'cps')
      .reduce((acc, e) => acc * e.multiplier, 1)
    return originMult * traitMult
  })

  const powerSynergyMultiplier = computed(() => {
    const originMult = activeOriginSynergies.value
      .filter((s) => s.activeThreshold)
      .flatMap((s) => s.activeThreshold!.effects)
      .filter((e) => e.type === 'power')
      .reduce((acc, e) => acc * e.multiplier, 1)
    const traitMult = activeTraits.value
      .filter((t) => t.activeThreshold)
      .flatMap((t) => t.activeThreshold!.effects)
      .filter((e) => e.type === 'power')
      .reduce((acc, e) => acc * e.multiplier, 1)
    return originMult * traitMult
  })

  const dpsSynergyMultiplier = computed(() => {
    const originMult = activeOriginSynergies.value
      .filter((s) => s.activeThreshold)
      .flatMap((s) => s.activeThreshold!.effects)
      .filter((e) => e.type === 'dps')
      .reduce((acc, e) => acc * e.multiplier, 1)
    const traitMult = activeTraits.value
      .filter((t) => t.activeThreshold)
      .flatMap((t) => t.activeThreshold!.effects)
      .filter((e) => e.type === 'dps')
      .reduce((acc, e) => acc * e.multiplier, 1)
    return originMult * traitMult
  })

  // champion name → trait ids the champion contributes to (for highlighting)
  const championSynergyMap = computed<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {}
    for (const activeTrait of activeTraits.value) {
      for (const champ of activeTrait.involvedChampions) {
        if (!map[champ]) map[champ] = []
        if (!map[champ].includes(activeTrait.trait.id)) map[champ].push(activeTrait.trait.id)
      }
    }
    return map
  })

  // Kept for interface compatibility (no role-specific synergies in new system)
  const synergyByRole = computed<ActiveSynergy[][]>(() => [[], [], [], [], []])
  const globalSynergies = computed<ActiveSynergy[]>(() => [])

  return {
    activeOriginSynergies,
    activeTraits,
    cpsSynergyMultiplier,
    powerSynergyMultiplier,
    dpsSynergyMultiplier,
    championSynergyMap,
    synergyByRole,
    globalSynergies,
  }
})
