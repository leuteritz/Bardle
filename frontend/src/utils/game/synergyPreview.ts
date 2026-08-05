import { CHAMPION_TRAITS, TRAIT_BY_ID } from '@/config/champions/championTraits'
import { getChampionOrigin, ORIGIN_SYNERGIES } from '@/config/champions/championOrigins'
import { SYNERGY_NEUTRAL_ORIGIN } from '@/config/constants'
import type { ChampionOrigin } from '@/types'

/**
 * What a champion swap would do to the team's trait and origin thresholds.
 *
 * The synergy store answers "what is active right now" off the live slots; this
 * answers "what WOULD be active" for a lineup that does not exist yet, which is
 * the question the inline champion picker asks on every hover. Same counting
 * rules as the store (thresholds are team-wide, Runeterra never counts), kept
 * here as pure functions so a preview never has to touch state to be computed.
 */

/** One trait or origin, with the threshold a given lineup reaches. */
export interface SynergyStanding {
  /** Stable identity across both lineups — `trait:<id>` or `origin:<name>`. */
  key: string
  label: string
  icon: string
  color: string
  /** Champions in the lineup carrying it. */
  count: number
  /** Count of the highest threshold reached — 0 while the synergy is dormant. */
  tier: number
  /** Bonus text of that threshold, null while dormant. */
  bonus: string | null
}

/** A synergy whose reached threshold differs between two lineups. */
export interface SynergyShift extends SynergyStanding {
  /** Threshold count before the swap (0 = was dormant). */
  fromTier: number
  /** Threshold count after it — `tier` mirrors this, so a shift reads as a standing. */
  toTier: number
}

/** Highest threshold `count` reaches, 0 when it reaches none. */
function reachedTier(thresholds: { count: number }[], count: number): number {
  let best = 0
  for (const t of thresholds) {
    if (count >= t.count && t.count > best) best = t.count
  }
  return best
}

function bonusOf(thresholds: { count: number; bonus: string }[], tier: number): string | null {
  return thresholds.find((t) => t.count === tier)?.bonus ?? null
}

/**
 * Every trait and origin the lineup carries, keyed for comparison. Dormant
 * entries are kept (tier 0) — a swap that pushes a trait from 1 to 2 champions
 * has to be able to name it, and it is not in the "active" set beforehand.
 */
export function synergyStandings(names: string[]): Map<string, SynergyStanding> {
  const out = new Map<string, SynergyStanding>()

  for (const name of names) {
    for (const traitId of CHAMPION_TRAITS[name] ?? []) {
      const def = TRAIT_BY_ID[traitId]
      if (!def) continue
      const key = `trait:${traitId}`
      const entry = out.get(key)
      if (entry) entry.count++
      else
        out.set(key, {
          key,
          label: def.name,
          icon: def.icon,
          color: def.color,
          count: 1,
          tier: 0,
          bonus: null,
        })
    }

    const origin = getChampionOrigin(name)
    if (!origin || origin === SYNERGY_NEUTRAL_ORIGIN) continue
    const def = ORIGIN_SYNERGIES[origin as ChampionOrigin]
    if (!def) continue
    const key = `origin:${origin}`
    const entry = out.get(key)
    if (entry) entry.count++
    else
      out.set(key, {
        key,
        label: def.name,
        icon: def.icon,
        color: def.color,
        count: 1,
        tier: 0,
        bonus: null,
      })
  }

  for (const standing of out.values()) {
    const [kind, id] = standing.key.split(':')
    const thresholds =
      kind === 'trait'
        ? (TRAIT_BY_ID[id]?.thresholds ?? [])
        : (ORIGIN_SYNERGIES[id as ChampionOrigin]?.thresholds ?? [])
    standing.tier = reachedTier(thresholds, standing.count)
    standing.bonus = bonusOf(thresholds, standing.tier)
  }

  return out
}

/**
 * Threshold changes between two lineups — gains first, then losses, each by
 * size. Only synergies whose reached threshold actually moves are returned: a
 * trait going from 3 to 4 champions without crossing a threshold changes no
 * bonus, and listing it would bury the two lines that do.
 */
export function synergyShift(before: string[], after: string[]): SynergyShift[] {
  const from = synergyStandings(before)
  const to = synergyStandings(after)
  const shifts: SynergyShift[] = []

  for (const key of new Set([...from.keys(), ...to.keys()])) {
    const a = from.get(key)
    const b = to.get(key)
    const fromTier = a?.tier ?? 0
    const toTier = b?.tier ?? 0
    if (fromTier === toTier) continue
    // The surviving side describes the synergy; a lost one is only in `before`.
    const shape = b ?? a!
    shifts.push({ ...shape, tier: toTier, fromTier, toTier })
  }

  return shifts.sort((x, y) => {
    const xUp = x.toTier > x.fromTier
    const yUp = y.toTier > y.fromTier
    if (xUp !== yUp) return xUp ? -1 : 1
    return Math.abs(y.toTier - y.fromTier) - Math.abs(x.toTier - x.fromTier)
  })
}
