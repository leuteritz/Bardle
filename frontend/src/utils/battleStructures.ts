import type { BattleEvent, StructureId, StructureLaneKey, StructureTier } from '../types'
import {
  type MapPoint,
  type LaneStructureTier,
  mirrorPoint,
  RED_STRUCTURE_MAP_POSITIONS,
  RED_NEXUS_TURRET_POSITIONS,
} from '../config/battleRoutes'

// Pure structure bookkeeping for the battle timeline: ids, fixed map
// positions, and the LoL destruction-order rules (outer → inner →
// inhib turret → inhibitor; nexus turrets only once an inhibitor is down).

export const STRUCTURE_LANES: Array<'top' | 'mid' | 'bot'> = ['top', 'mid', 'bot']

/** Per-lane destruction order — a tier can only fall once all earlier tiers are down. */
export const LANE_TIER_ORDER: LaneStructureTier[] = ['outer', 'inner', 'inhibTurret', 'inhibitor']

/** The point mirror that produces the blue side swaps the top and bot lanes. */
const MIRRORED_LANE: Record<'top' | 'mid' | 'bot', 'top' | 'mid' | 'bot'> = {
  top: 'bot',
  mid: 'mid',
  bot: 'top',
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
  for (const lane of STRUCTURE_LANES) {
    for (const tier of LANE_TIER_ORDER) {
      const redPos = RED_STRUCTURE_MAP_POSITIONS[lane][tier]
      out[structureId(2, lane, tier)] = { ...redPos }
      out[structureId(1, MIRRORED_LANE[lane], tier)] = mirrorPoint(redPos)
    }
  }
  RED_NEXUS_TURRET_POSITIONS.forEach((pos, i) => {
    const slot = `nexus${i + 1}` as StructureLaneKey
    out[structureId(2, slot, 'nexusTurret')] = { ...pos }
    out[structureId(1, slot, 'nexusTurret')] = mirrorPoint(pos)
  })
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

/** How many tiers of an owner's lane are already down (0..4, in destruction order). */
export function laneProgress(
  destroyed: ReadonlySet<StructureId>,
  ownerTeam: 1 | 2,
  lane: 'top' | 'mid' | 'bot',
): number {
  let n = 0
  for (const tier of LANE_TIER_ORDER) {
    if (!destroyed.has(structureId(ownerTeam, lane, tier))) break
    n++
  }
  return n
}

/** The owner's lane whose inhibitor is already down, or null (used to find the winner's push lane). */
export function crackedLaneOf(
  destroyed: ReadonlySet<StructureId>,
  ownerTeam: 1 | 2,
): 'top' | 'mid' | 'bot' | null {
  for (const lane of STRUCTURE_LANES) {
    if (destroyed.has(structureId(ownerTeam, lane, 'inhibitor'))) return lane
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
