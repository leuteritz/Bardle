import { useBattleStore } from '../stores/battleStore'
import type { ChampionRole } from '../types'

const SLOT_ROLES: ChampionRole[] = ['top', 'jungle', 'mid', 'adc', 'support']

/** Returns the set of roles for slots that are currently filled in headerSlots. */
export function getOrbitingRoles(): Set<ChampionRole> {
  const battleStore = useBattleStore()
  const roles = new Set<ChampionRole>()
  battleStore.headerSlots.forEach((slot, i) => {
    if (slot !== null) roles.add(SLOT_ROLES[i])
  })
  return roles
}
