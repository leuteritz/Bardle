/**
 * Was eine Rolle noch hergibt — die Roster-Auskunft der Kurswahl.
 *
 * Stand einmal im Rollenwahl-Modal; die Kurs-Hover-Karte liest dieselbe
 * Rechnung. Spiegelt den echten Spawn-Griff (`planetBossStore`): Tier nach
 * renormiertem Gewicht, darin gleichverteilt — die Prozente je Rolle summieren
 * auf 100.
 */
import { CHAMPION_DATA, getChampionRoles } from '@/config/champions/championData'
import {
  getChampionStarLevel,
  getChampionTier,
  isChampionTierUnlocked,
  perChampionSpawnPercents,
} from '@/config/champions/championTiers'
import type { ChampionRole } from '@/types'

export interface RosterChampion {
  name: string
  star: number
  tierColor: string
  tierIcon: string
  /** eigene Spawn-Chance im Rollenpool in Prozent, null wenn nicht ziehbar */
  spawnPercent: number | null
}

export interface RosterInput {
  currentGalaxy: number
  requiredStarLevel: number
  ownedChampions: readonly string[]
  recruitableNames: readonly string[]
}

/** Sternstufen, die der Spieler schon kennt (besitzt oder rekrutierbar). */
export function discoveredStars(input: RosterInput): Set<number> {
  const stars = new Set<number>()
  for (const name of input.ownedChampions) {
    if (name === 'Bard') continue
    stars.add(getChampionStarLevel(name))
  }
  for (const name of input.recruitableNames) stars.add(getChampionStarLevel(name))
  return stars
}

export function obtainableByRole(input: RosterInput): Record<ChampionRole, RosterChampion[]> {
  const map: Record<ChampionRole, RosterChampion[]> = {
    top: [],
    jungle: [],
    mid: [],
    adc: [],
    support: [],
  }
  const seen = discoveredStars(input)
  for (const name of Object.keys(CHAMPION_DATA)) {
    if (name === 'Bard') continue
    const star = getChampionStarLevel(name)
    if (!isChampionTierUnlocked(star, input.currentGalaxy, input.requiredStarLevel, seen)) continue
    if (input.ownedChampions.includes(name) || input.recruitableNames.includes(name)) continue
    const tier = getChampionTier(name)
    const entry: RosterChampion = {
      name,
      star,
      tierColor: tier.color,
      tierIcon: tier.icon,
      spawnPercent: null,
    }
    for (const role of getChampionRoles(name)) map[role]?.push(entry)
  }
  for (const role of Object.keys(map) as ChampionRole[]) {
    const tierCounts = new Map<number, number>()
    for (const c of map[role]) tierCounts.set(c.star, (tierCounts.get(c.star) ?? 0) + 1)
    const perChampion = perChampionSpawnPercents(tierCounts, input.currentGalaxy)
    map[role] = map[role]
      .map((c) => ({ ...c, spawnPercent: perChampion.get(c.star) ?? null }))
      .sort((a, b) => a.star - b.star || a.name.localeCompare(b.name))
  }
  return map
}

/** Ganze Zahlen grob, Nachkommastellen fein, Boden statt eines irreführenden 0 %. */
export function formatSpawnPercent(p: number): string {
  if (p >= 10) return `${Math.round(p)}%`
  if (p >= 1) return `${(Math.round(p * 10) / 10).toFixed(1)}%`
  if (p >= 0.1) return `${(Math.round(p * 100) / 100).toFixed(2)}%`
  return '<0.1%'
}

export function spawnOddsTitle(spawnPercent: number | null): string {
  if (spawnPercent == null || spawnPercent <= 0) return ''
  const oneIn = Math.round(100 / spawnPercent)
  return oneIn <= 1
    ? 'Guaranteed next champion for this role'
    : `≈ 1 in ${oneIn} chance to be the next champion for this role`
}
