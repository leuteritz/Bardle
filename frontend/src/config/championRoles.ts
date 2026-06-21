import type { ChampionRole } from '../types'
import { CHAMPION_DATA } from './championData'

export const CHAMPION_ROLES: Record<string, ChampionRole> = Object.fromEntries(
  Object.entries(CHAMPION_DATA).map(([n, d]) => [n, d.role]),
)

export function getChampionRoles(name: string): ChampionRole[] {
  const role = CHAMPION_ROLES[name]
  return role ? [role] : []
}
