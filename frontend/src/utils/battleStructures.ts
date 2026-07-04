import type { BattleEvent, StructureId, StructureLaneKey, StructureTier } from '../types'
import { BLUE_NEXUS, RED_NEXUS } from '../config/constants'
import {
  type MapPoint,
  type LaneStructureTier,
  pointAlongPath,
  TOP_LANE_PATH,
  MID_LANE_PATH,
  BOT_LANE_PATH,
  STRUCTURE_LANE_FRACTIONS_BLUE,
  STRUCTURE_LANE_FRACTIONS_RED,
  NEXUS_TURRET_OFFSETS,
} from '../config/battleRoutes'

// Pure structure bookkeeping for the battle timeline: ids, fixed map
// positions, and the LoL destruction-order rules (outer → inner →
// inhib turret → inhibitor; nexus turrets only once an inhibitor is down).

export const STRUCTURE_LANES: Array<'top' | 'mid' | 'bot'> = ['top', 'mid', 'bot']

/** Per-lane destruction order — a tier can only fall once all earlier tiers are down. */
export const LANE_TIER_ORDER: LaneStructureTier[] = ['outer', 'inner', 'inhibTurret', 'inhibitor']

const LANE_PATHS: Record<'top' | 'mid' | 'bot', MapPoint[]> = {
  top: TOP_LANE_PATH,
  mid: MID_LANE_PATH,
  bot: BOT_LANE_PATH,
}

export function structureId(ownerTeam: 1 | 2, laneKey: StructureLaneKey, tier: StructureTier): StructureId {
  return `${ownerTeam}:${laneKey}:${tier}`
}

export function parseStructureId(id: StructureId): {
  ownerTeam: 1 | 2
  laneKey: StructureLaneKey
  tier: StructureTier
} {
  const [team, laneKey, tier] = id.split(':')
  return {
    ownerTeam: Number(team) as 1 | 2,
    laneKey: laneKey as StructureLaneKey,
    tier: tier as StructureTier,
  }
}

function buildStructurePositions(): Record<StructureId, MapPoint> {
  const out: Record<StructureId, MapPoint> = {}
  for (const ownerTeam of [1, 2] as const) {
    const fractions = ownerTeam === 1 ? STRUCTURE_LANE_FRACTIONS_BLUE : STRUCTURE_LANE_FRACTIONS_RED
    for (const lane of STRUCTURE_LANES) {
      for (const tier of LANE_TIER_ORDER) {
        out[structureId(ownerTeam, lane, tier)] = pointAlongPath(LANE_PATHS[lane], fractions[tier])
      }
    }
    const nexus = ownerTeam === 1 ? BLUE_NEXUS : RED_NEXUS
    const mirror = ownerTeam === 1 ? 1 : -1
    NEXUS_TURRET_OFFSETS.forEach((offset, i) => {
      out[structureId(ownerTeam, `nexus${i + 1}` as StructureLaneKey, 'nexusTurret')] = {
        x: nexus.x + offset.x * mirror,
        y: nexus.y + offset.y * mirror,
      }
    })
  }
  return out
}

export const STRUCTURE_POSITIONS: Readonly<Record<StructureId, MapPoint>> = buildStructurePositions()

export const ALL_STRUCTURE_IDS: StructureId[] = Object.keys(STRUCTURE_POSITIONS)

/** First still-standing tier of a lane in destruction order, or null when the lane is cracked. */
export function nextStructureInLane(
  destroyed: ReadonlySet<StructureId>,
  ownerTeam: 1 | 2,
  lane: 'top' | 'mid' | 'bot',
): StructureId | null {
  for (const tier of LANE_TIER_ORDER) {
    const id = structureId(ownerTeam, lane, tier)
    if (!destroyed.has(id)) return id
  }
  return null
}

/** Nexus turrets are only exposed once at least one of the owner's inhibitors is down. */
export function canFallNexusTurret(destroyed: ReadonlySet<StructureId>, ownerTeam: 1 | 2): boolean {
  return STRUCTURE_LANES.some((lane) => destroyed.has(structureId(ownerTeam, lane, 'inhibitor')))
}

/** First still-standing nexus turret of the owner, or null when both are down. */
export function nextNexusTurret(destroyed: ReadonlySet<StructureId>, ownerTeam: 1 | 2): StructureId | null {
  for (const slot of ['nexus1', 'nexus2'] as const) {
    const id = structureId(ownerTeam, slot, 'nexusTurret')
    if (!destroyed.has(id)) return id
  }
  return null
}

/** Replay helper — the set of structures destroyed by events at or before `t`. */
export function destroyedStructuresUpTo(events: BattleEvent[], t: number): Set<StructureId> {
  const out = new Set<StructureId>()
  for (const e of events) {
    if (e.t > t) continue
    if ((e.type === 'turret' || e.type === 'inhibitor') && e.structureId) out.add(e.structureId)
  }
  return out
}
