// Star Forge: Baumknoten, Relikte, Konstellationen, Bargains.

import type { IconPoolKey } from './ui'

// ── Star Forge (Shop tab) ────────────────────────────────────────────────────

export type ForgeNodeTier = 'branch' | 'leaf'

/** A purchasable node on the Forge Tree (rings 2 & 3 around the sun).
 *  Ring 1 (roots) stays in solarUpgradeStore. */
export interface ForgeNodeDef {
  id: string
  name: string
  /** Root SolarBranchId for branches; branch node id for leaves. */
  parentId: string
  tier: ForgeNodeTier
  /** Minimum starPhase at which the node becomes purchasable. */
  phase: number
  icon: string
  color: string
  /** Polar angle on the tree stage (degrees, 0 = right, clockwise). */
  angleDeg: number
  baseCost: number
  costMultiplier: number
  /** Materials required per purchase, quantities scale with the level bought. */
  materialCost: Record<string, number>
  /** Effect description template — `{v}` is replaced with the level value. */
  desc: string
  /** Branches: effect magnitude per level. Leaves: unused (uniform amplify). */
  effectPerLevel: number
}

export type ForgeRelicRarity = 'rare' | 'epic'

export interface ForgeRelicDef {
  id: string
  name: string
  rarity: ForgeRelicRarity
  icon: string
  color: string
  /** Branch node that must be grown before this relic can be forged. */
  requiresNode: string
  requiresLevel: number
  maxLevel: number
  goldCost: number
  goldMultiplier: number
  materialCost: Record<string, number>
  desc: string
  effectPerLevel: number
  /** Short provenance line, e.g. "Moon Orbit branch + Void Shards". */
  sourceLabel: string
}

export interface ForgeConstellationDef {
  id: string
  name: string
  icon: string
  color: string
  /** The two branch nodes fused by this constellation. */
  nodeA: string
  nodeB: string
  goldCost: number
  materialCost: Record<string, number>
  desc: string
  /** Compact pair line, e.g. "Flight + Chimes/Sec · +18% idle". */
  pairLabel: string
}

export type ForgeBargainKind = 'buff' | 'materials' | 'gold' | 'dwellSkip' | 'heal'

export interface ForgeBargainDef {
  id: string
  name: string
  /**
   * Motivfamilie statt festem Glyph: der Handel wird bei jedem Restock neu
   * ausgelegt, also trägt er auch jedes Mal ein anderes Zeichen
   * (`starForgeStore.activeDealIcon`).
   */
  iconPool: IconPoolKey
  desc: string
  basePrice: number
  /** 0–1 fraction knocked off basePrice. */
  discountPct: number
  kind: ForgeBargainKind
  buffId?: 'cpcX2' | 'cpsX2'
  durationMs?: number
  materials?: Record<string, number>
  goldReward?: number
  /** Fraction of the remaining phase dwell time skipped. */
  dwellSkipPct?: number
}

export interface ForgeActiveBuff {
  id: 'cpcX2' | 'cpsX2'
  expiresAt: number
}
