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

// ── Detailspalte des Shop-Tabs (StarForgePanel) ──────────────────────────────

/**
 * Die Abteilungen der Forge-Detailspalte, je ein Reiter.
 *
 * `upgrades` steht bewusst vorn: die drei anderen zeigen, was aus dem Baum
 * FOLGT — dieser zeigt den Baum selbst. Ohne ihn war alles Kaufbare nur als
 * Kreis auf der Leinwand erreichbar, einer nach dem anderen per Tooltip.
 */
export type ForgeSectionId = 'upgrades' | 'relics' | 'constellations' | 'bargain'

export interface ForgeSectionDef {
  id: ForgeSectionId
  label: string
  icon: string
  /** Leitfarbe des Reiters und seiner Überschrift. */
  accent: string
}

/**
 * Eine Kostenposition, wie die Spalte sie zeigt: was verlangt wird UND was im
 * Lager liegt. Ein blankes „×5" beantwortet die Frage nicht, die der Spieler
 * beim Schmieden wirklich hat.
 */
export interface ForgeCostItem {
  id: string
  name: string
  image?: string
  need: number
  have: number
  /** Lager deckt die Position. */
  ok: boolean
}

// ── Kaufbares im Baum: eine Fassung für Wurzeln UND Forge-Knoten ─────────────

/** Welcher Ring — Wurzeln liegen im solarUpgradeStore, der Rest im starForgeStore. */
export type ForgeUpgradeTier = 'root' | ForgeNodeTier

/**
 * Zustand eines Knotens, wie ihn Baum und Liste gleichermaßen lesen.
 *
 * `capped` und `locked` schließen sich gegenseitig aus und gehören je einem
 * Ring: nur Wurzeln kennen die Gleichwuchs-Sperre (`maxAllowedLevel`), nur
 * Branches und Leaves kennen eine Freischaltung über Phase und Elternstufe.
 */
export type ForgeUpgradeState = 'locked' | 'empty' | 'partial' | 'affordable' | 'capped' | 'maxed'

/**
 * Ein kaufbarer Knoten, fertig zum Anzeigen — ohne jede Geometrie.
 *
 * Der Baum hängt seine Polarkoordinaten daneben, die Liste nicht. Beide lesen
 * denselben Eintrag, damit ein Kauf auf der einen Seite die andere sofort
 * mitzieht und Kosten, Wirkung und Sperrgrund nirgends ein zweites Mal
 * gerechnet werden.
 */
export interface ForgeUpgradeEntry {
  id: string
  name: string
  icon: string
  color: string
  tier: ForgeUpgradeTier
  /** ROOT / BRANCH / LEAF — die Beschriftung des Tier-Chips. */
  tierLabel: string
  level: number
  maxLevel: number
  state: ForgeUpgradeState
  goldCost: number
  goldOk: boolean
  materials: ForgeCostItem[]
  /** Wirkungssatz auf der aktuellen Stufe — der ganze Satz, mit Zahl darin. */
  desc: string
  /** Derselbe Satz mit dem Wert der nächsten Stufe. */
  nextDesc: string
  /** Nur der Wert der aktuellen Stufe — die linke Hälfte der Now-→-After-Zeile. */
  nowText: string
  /** Nur der Wert nach dem Kauf — die rechte Hälfte. */
  nextText: string
  /** Klartext, warum gerade nicht gekauft werden kann — leer, wenn offen. */
  lockReason: string
  /** Name des Elternknotens (Wurzel bei Branches, Branch bei Leaves). */
  parentName: string
  /** Fortschritt zur Freischaltung, 0–1 — nur bei `locked` aussagekräftig. */
  unlockProgress: number
  canBuy: boolean
}
