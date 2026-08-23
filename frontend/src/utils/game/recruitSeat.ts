// Welcher Hauptsitz einen Champion beim Recruit aufnimmt. Nur der Hauptsitz —
// Ally-Plätze bleiben frei, weil ein besetzter Platz den Champion aus
// `expeditionStore.eligibleChampions` nimmt ("wer kämpft, reist nicht").
import { CHAMPION_ROLES } from '@/config/champions/championData'
import { ROLE_INDEX_BY_KEY } from '@/config/constants'
import type { ChampionRole } from '@/types'

export type RecruitSeat =
  | { kind: 'open'; roleKey: ChampionRole; roleIndex: number }
  | { kind: 'held'; roleKey: ChampionRole; roleIndex: number; occupant: string }
  | { kind: 'none' }

export function recruitSeatFor(
  name: string,
  headerSlots: readonly (string | null)[],
): RecruitSeat {
  const roleKey = CHAMPION_ROLES[name]
  if (!roleKey) return { kind: 'none' }
  const roleIndex = ROLE_INDEX_BY_KEY[roleKey]
  const occupant = headerSlots[roleIndex]
  return occupant && occupant !== name
    ? { kind: 'held', roleKey, roleIndex, occupant }
    : { kind: 'open', roleKey, roleIndex }
}
