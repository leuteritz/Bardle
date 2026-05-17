import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useBattleStore } from './battleStore'
import { getHomePlanetConfig } from '../config/championHomePlanets'
import { getChampionRoles } from '../config/championRoles'
import {
  ELEMENTAL_SYNERGIES,
  ROLE_ECHO_DEFS,
  LORE_BONDS,
  FULL_ORBIT_PER_ROLE,
  FULL_CONSTELLATION,
  RARITY_LEGENDARY,
  RARITY_STAR_FORGED,
} from '../config/synergies'
import type { ActiveSynergy } from '../types'

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

  const activeSynergies = computed<ActiveSynergy[]>(() => {
    const synergies: ActiveSynergy[] = []
    const orbit = allInOrbit.value

    // 1. Elemental bonds — per role orbit
    for (const [roleIdx, triple] of roleTriples.value.entries()) {
      const filled = triple.filter(Boolean) as string[]
      if (filled.length < 2) continue

      const groups = new Map<string, string[]>()
      for (const name of filled) {
        const cfg = getHomePlanetConfig(name)
        if (!cfg) continue
        const pt = cfg.planetType
        if (!groups.has(pt)) groups.set(pt, [])
        groups.get(pt)!.push(name)
      }

      for (const [pt, champs] of groups) {
        if (champs.length < 2) continue
        const def = ELEMENTAL_SYNERGIES.find((s) => s.condition.planetType === pt)
        if (!def) continue
        const id = `${def.id}_r${roleIdx}`
        if (!synergies.some((s) => s.id === id))
          synergies.push({ ...def, id, involvedChampions: champs, roleIndex: roleIdx })
      }
    }

    // 2. Role echo — all filled champs in orbit share a game position
    for (const [roleIdx, triple] of roleTriples.value.entries()) {
      const filled = triple.filter(Boolean) as string[]
      if (filled.length < 2) continue

      const roleArrays = filled.map((n) => getChampionRoles(n))
      const commonRoles = roleArrays[0].filter((r) => roleArrays.slice(1).every((ra) => ra.includes(r)))

      for (const commonRole of commonRoles) {
        const def = ROLE_ECHO_DEFS.find((d) => d.condition.roleKey === commonRole)
        if (!def) continue
        const id = `${def.id}_r${roleIdx}`
        if (!synergies.some((s) => s.id === id))
          synergies.push({ ...def, id, involvedChampions: filled, roleIndex: roleIdx })
      }
    }

    // 3. Lore bonds — anywhere in orbit (global)
    for (const bond of LORE_BONDS) {
      const [a, b] = bond.pair
      if (orbit.includes(a) && orbit.includes(b) && !synergies.some((s) => s.id === bond.id))
        synergies.push({ ...bond, involvedChampions: [a, b] })
    }

    // 4. Full orbit — per role
    for (const [roleIdx, triple] of roleTriples.value.entries()) {
      const filled = triple.filter(Boolean) as string[]
      if (filled.length === 3) {
        const id = `${FULL_ORBIT_PER_ROLE.id}_r${roleIdx}`
        synergies.push({ ...FULL_ORBIT_PER_ROLE, id, involvedChampions: filled, roleIndex: roleIdx })
      }
    }

    // 4b. Complete constellation (all 15 slots) — global
    if (orbit.length === 15)
      synergies.push({ ...FULL_CONSTELLATION, involvedChampions: orbit })

    // 5. Rarity — material cost total ≥ 6 — global
    const rareCount = orbit.filter((n) => {
      const cfg = getHomePlanetConfig(n)
      if (!cfg) return false
      return Object.values(cfg.materialCost).reduce((a, b) => a + b, 0) >= 6
    }).length

    if (rareCount >= 5) synergies.push({ ...RARITY_STAR_FORGED, involvedChampions: [] })
    else if (rareCount >= 3) synergies.push({ ...RARITY_LEGENDARY, involvedChampions: [] })

    return synergies
  })

  const cpsSynergyMultiplier = computed(() =>
    activeSynergies.value
      .flatMap((s) => s.effects)
      .filter((e) => e.type === 'cps')
      .reduce((acc, e) => acc * e.multiplier, 1),
  )

  const powerSynergyMultiplier = computed(() =>
    activeSynergies.value
      .flatMap((s) => s.effects)
      .filter((e) => e.type === 'power')
      .reduce((acc, e) => acc * e.multiplier, 1),
  )

  const dpsSynergyMultiplier = computed(() =>
    activeSynergies.value
      .flatMap((s) => s.effects)
      .filter((e) => e.type === 'dps')
      .reduce((acc, e) => acc * e.multiplier, 1),
  )

  // name → list of synergy ids the champion participates in
  const championSynergyMap = computed<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {}
    for (const syn of activeSynergies.value) {
      for (const champ of syn.involvedChampions) {
        if (!map[champ]) map[champ] = []
        if (!map[champ].includes(syn.id)) map[champ].push(syn.id)
      }
    }
    return map
  })

  // Synergies grouped per role index (0–4)
  const synergyByRole = computed<ActiveSynergy[][]>(() => {
    const buckets: ActiveSynergy[][] = [[], [], [], [], []]
    for (const syn of activeSynergies.value) {
      if (syn.roleIndex !== undefined) buckets[syn.roleIndex].push(syn)
    }
    return buckets
  })

  // Synergies without a role (lore bonds, rarity, constellation)
  const globalSynergies = computed<ActiveSynergy[]>(() =>
    activeSynergies.value.filter((s) => s.roleIndex === undefined),
  )

  return {
    activeSynergies,
    cpsSynergyMultiplier,
    powerSynergyMultiplier,
    dpsSynergyMultiplier,
    championSynergyMap,
    synergyByRole,
    globalSynergies,
  }
})
