// Star Forge: Baumknoten, Relikte, Konstellationen, Bargains.

import type { IconPoolKey } from './ui'

// ── Star Forge (Shop tab) ────────────────────────────────────────────────────

/**
 * Welcher Ring.
 *
 * `bough` ist der einzige OHNE Obergrenze — seine Stufen laufen weiter, wenn
 * alles andere im Baum auf MAX steht. `crown` ist der äusserste und die
 * Gegenfigur dazu: EINE Stufe, und dafür verschiebt jeder Knoten eine Regel
 * statt eine Zahl. Beides zusammen ginge nicht — eine Regel, die man mehrfach
 * kaufen kann, ist wieder eine Zahl.
 */
export type ForgeNodeTier = 'branch' | 'leaf' | 'bough' | 'crown'

/** A purchasable node on the Forge Tree (rings 2–4 around the sun).
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
  /**
   * Materials required per purchase, quantities scale with the level bought.
   * Boughs lassen die Rezeptur LEER: die Menge wächst mit `qty × nextLevel`,
   * und bei einem Knoten ohne Obergrenze liefe der Materialbedarf damit ohne
   * Ende linear davon, während das Lager an Drop-Chancen hängt.
   */
  materialCost: Record<string, number>
  /** Effect description template — `{v}` is replaced with the level value. */
  desc: string
  /** Branches und Boughs: Wirkung je Stufe. Leaves: ungenutzt (fester Verstärker). */
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

/**
 * `voidPurge` und `meeps` sind die zwei Handel, die nicht mit Zahlen bezahlen,
 * sondern mit dem Zustand der Welt: der eine räumt den offenen Riss, der andere
 * kauft anstehende Ausbeute vorzeitig frei. Beide brauchen deshalb einen
 * eigenen Zweig in `starForgeStore.buyBargain()` — ein `materials`-Handel mit
 * Sonderfall wäre eine zweite Bedeutung für dasselbe Wort.
 */
export type ForgeBargainKind =
  | 'buff'
  | 'materials'
  | 'gold'
  | 'dwellSkip'
  | 'heal'
  | 'voidPurge'
  | 'meeps'

/**
 * Die befristeten Handels-Buffs. `dropX2` kam mit der Phase Lantern dazu und
 * ist der erste, der nicht auf die Chime-Rate zielt — er wirkt in
 * `inventoryStore.tryDropMaterial`.
 */
export type ForgeBuffId = 'cpcX2' | 'cpsX2' | 'dropX2'

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
  buffId?: ForgeBuffId
  durationMs?: number
  materials?: Record<string, number>
  goldReward?: number
  /** Fraction of the remaining phase dwell time skipped. */
  dwellSkipPct?: number
  /** `meeps`: how many pending meeps the caravan hands over at once. */
  meepReward?: number
}

export interface ForgeActiveBuff {
  id: ForgeBuffId
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
  /**
   * DERSELBE Name, nur mit markierten Trennstellen (U+00AD, weiches
   * Trennzeichen) — für die 78px-Zelle der Rail. Kein zweiter Name und damit
   * keine zweite Quelle für die Bedeutung; dasselbe Zugeständnis an eine enge
   * Fläche wie `shortTitle` bei den Ring-Gruppen.
   *
   * Nötig, weil Chrome die automatische Silbentrennung (`hyphens: auto`) hier
   * nicht anwendet: „Constellations" brach gemessen als „CONSTELLATIO / NS".
   * Fehlt das Feld, steht der `label` unverändert da.
   */
  wrapLabel?: string
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

/**
 * Die Kanten der Zeile, an der das schwebende Kärtchen der Upgrade-Liste hängt
 * (`ForgeRowTooltip`).
 *
 * Gemessen wird beim Hover-Wechsel und nur dort — nie pro Frame. Drei Zahlen
 * statt eines ganzen `DOMRect`, damit klar ist, dass Breite und Höhe der Zeile
 * hier nichts zu suchen haben: das Kärtchen richtet sich an ihrer Ober- oder
 * Unterkante aus und liegt links neben der Spalte.
 */
export interface ForgeRowTipAnchor {
  top: number
  bottom: number
  left: number
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
 * Wohin ein Eintrag in der Upgrade-LISTE fällt — nicht zu verwechseln mit
 * seinem `state`, den auch der Baum liest.
 *
 * Der Zustand beschreibt den Knoten, der Topf beschreibt, was der Spieler mit
 * ihm anfangen kann. Deshalb sind es vier statt sechs: `empty`, `partial` und
 * `capped` landen gemeinsam in `reach` — alle drei zeigen eine volle Karte samt
 * Kosten, keiner von ihnen ist kaufbar.
 *
 * `ready` hängt an `canBuy`, nicht an `state === 'affordable'`: der Zustand
 * kennt nur die Chimes, `canBuy` auch das Materiallager.
 */
export type ForgeUpgradeBucketId = 'ready' | 'reach' | 'next' | 'grown'

/**
 * Warum ein Knoten zu ist — die beiden Gründe, die `lockedFor()` unterscheidet.
 *
 * Sie sind für den Spieler NICHT dasselbe: gegen eine Phasensperre kann er
 * nichts tun ausser warten, eine Elternsperre kann er sofort angehen. Die
 * Upgrade-Liste trennt sie deshalb mit je einem eigenen Trenner. `''` heisst
 * offen.
 */
export type ForgeLockKind = 'phase' | 'parent' | ''

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
  /**
   * `Infinity` bei einem Bough — er wird deshalb nie `maxed`, und `level >=
   * maxLevel` bleibt für ihn dauerhaft falsch. Wer die Zahl ANZEIGT oder über
   * sie iteriert, muss sie vorher mit `Number.isFinite` abfangen.
   */
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
  /**
   * WORAN die Sperre hängt, als Wert statt als Satz.
   *
   * `lockReason` daneben ist ein fertiger Satz für das Auge; wer danach
   * GRUPPIERT, müsste ihn beschnüffeln. Die Upgrade-Liste tut genau das: sie
   * setzt je Sperrgrund einen eigenen Trenner, weil „warte auf die Sonne" und
   * „lass erst den Elternknoten wachsen" zwei verschiedene Aufgaben sind — die
   * eine kann man nur abwarten, die andere sofort angehen.
   */
  lockKind: ForgeLockKind
  /**
   * Die Sonnenphase, die den Knoten öffnet — `-1`, wenn keine wartet (also bei
   * `lockKind` ≠ `'phase'`). Der Trenner nimmt daraus Name und Tönung; die Zahl
   * ist der INDEX in `STAR_PHASE_DATA`, nicht die angezeigte Phasennummer.
   */
  lockPhase: number
  /** Name des Elternknotens (Wurzel bei Branches, Branch bei Leaves). */
  parentName: string
  /** Fortschritt zur Freischaltung, 0–1 — nur bei `locked` aussagekräftig. */
  unlockProgress: number
  canBuy: boolean
}
