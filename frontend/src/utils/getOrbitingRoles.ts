import { useCombatStore } from '../stores/combatStore'
import { getChampionRoles } from '../config/championRoles'
import type { ChampionRole } from '../types'

/** Returns the set of all roles represented by champions currently in orbit. */
export function getOrbitingRoles(): Set<ChampionRole> {
  const combat = useCombatStore()
  const roles = new Set<ChampionRole>()
  for (const c of combat.champions) {
    for (const r of getChampionRoles(c.name)) {
      roles.add(r)
    }
  }
  return roles
}
