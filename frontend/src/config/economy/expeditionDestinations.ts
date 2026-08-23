/* ── Expeditionsziele ─────────────────────────────────────────────────────────
   Eine befreite Galaxie wird hier zum Ziel. Reine Funktionen ohne Store-Zugriff,
   damit die Specs sie ohne Pinia prüfen können — dasselbe Muster wie
   `utils/fx/galaxySnapshot.ts`, das den Archiv-Datensatz ebenfalls nur als Typ
   importiert. */

import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'
import {
  EXPEDITION_DEST_RARE_FROM,
  EXPEDITION_DEST_EPIC_FROM,
  EXPEDITION_DEST_DEPTH_SPAN,
  EXPEDITION_DEST_REWARD_SLOPE,
  EXPEDITION_DEST_DURATION_SLOPE,
  EXPEDITION_DEST_POWER_SLOPE,
  EXPEDITION_DEST_HAZARD_SLOPE,
  EXPEDITION_DEST_HAZARD_STEP,
  EXPEDITION_DEST_MIN_ROLES,
  EXPEDITION_HAZARD_COUNT,
  EXPEDITION_TIERS,
  type ExpeditionTier,
} from '@/config/constants'

export interface ExpeditionDestination {
  galaxy: number
  themeIndex: number
  /** Der Galaxiename aus dem Thema — das ist der Name, den der Spieler kennt. */
  name: string
  tier: ExpeditionTier
  /** 0 an der ersten Galaxie, 1 ab EXPEDITION_DEST_DEPTH_SPAN. */
  depth: number
  rewardMult: number
  durationMult: number
  powerMult: number
  hazardMult: number
  hazardCount: number
  /** Wie viele Sitze ein Vertrag hierhin höchstens verlangt. */
  maxRoles: number
}

export function expeditionTierOf(galaxy: number): ExpeditionTier {
  if (galaxy <= EXPEDITION_DEST_RARE_FROM) return 'common'
  if (galaxy <= EXPEDITION_DEST_EPIC_FROM) return 'rare'
  return 'epic'
}

export function depthOf(galaxy: number): number {
  return Math.min(1, Math.max(0, (galaxy - 1) / EXPEDITION_DEST_DEPTH_SPAN))
}

export function destinationName(themeIndex: number): string {
  return GALAXY_THEMES[themeIndex % GALAXY_THEMES.length]?.name ?? 'Unknown Reach'
}

export function destinationFor(record: CompletedGalaxyRecord): ExpeditionDestination {
  const galaxy = record.galaxy
  const tier = expeditionTierOf(galaxy)
  const depth = depthOf(galaxy)
  const tierDef = EXPEDITION_TIERS[tier]

  return {
    galaxy,
    themeIndex: record.themeIndex,
    name: destinationName(record.themeIndex),
    tier,
    depth,
    rewardMult: 1 + EXPEDITION_DEST_REWARD_SLOPE * depth,
    durationMult: 1 + EXPEDITION_DEST_DURATION_SLOPE * depth,
    powerMult: 1 + EXPEDITION_DEST_POWER_SLOPE * depth,
    hazardMult: 1 + EXPEDITION_DEST_HAZARD_SLOPE * depth,
    hazardCount:
      EXPEDITION_HAZARD_COUNT[tier] + (depth >= EXPEDITION_DEST_HAZARD_STEP ? 1 : 0),
    // Ein Vertrag am flachsten Ziel hat einen Sitz — sonst hätte ein Spielstand
    // mit einer befreiten Galaxie und drei Champions auf dem Board niemanden,
    // den er schicken könnte.
    maxRoles: Math.max(
      EXPEDITION_DEST_MIN_ROLES,
      Math.round(EXPEDITION_DEST_MIN_ROLES + (tierDef.maxRoles - EXPEDITION_DEST_MIN_ROLES) * depth),
    ),
  }
}

/**
 * Gewicht eines Ziels in der Ziehung. Steigt zur zuletzt befreiten Galaxie hin,
 * fällt aber nie auf null — siehe EXPEDITION_DEST_RECENCY_WEIGHT.
 */
export function destinationWeight(galaxy: number, maxFreedGalaxy: number, recency: number): number {
  if (maxFreedGalaxy <= 0) return 1
  return 1 + recency * (galaxy / maxFreedGalaxy)
}
