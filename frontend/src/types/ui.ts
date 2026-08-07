// Anzeige-Typen: Stat-Katalog, Shop-Detailpanel, Scoreboard, Keybinds.

import type { PlanetType } from '@/types/world'
import type { ItemCategory, ItemRarity } from '@/types/economy'

// ── Bard Stats catalog (stats tab, left column) ──────────────────────────────
/** Identifier of a stat category — the accordion sections in the Journey column. */
export type StatCategoryId =
  | 'progression'
  | 'economy'
  | 'chimeWorks'
  | 'autoBattle'
  | 'combatRecord'
  | 'objectives'
  | 'champions'
  | 'galaxy'
  | 'starFights'
  | 'planets'
  | 'solar'
  | 'starForge'
  | 'meepTree'
  | 'expeditions'
  | 'materials'
  | 'buffs'

/** Static metadata of a stat category (config/ui/statCategories.ts). */
export interface StatCategoryDef {
  id: StatCategoryId
  label: string
  /** One-line description shown under the category header. */
  blurb: string
  icon: string
  /** Accent color driving the header, the rail and the highlight values. */
  accent: string
}

/** A single readable stat inside a category. */
export interface StatEntry {
  /** Unique within its category — used as the render key. */
  key: string
  label: string
  /** Already formatted for display. */
  value: string
  /** Extra searchable words that are not part of the label (e.g. "kda", "cps"). */
  keywords?: string
  /** Rendered larger with the category accent — reserved for a category's headline numbers. */
  highlight?: boolean
  /** Optional hover explanation. */
  hint?: string
}

/** A category plus its resolved, already filtered stats. */
export interface StatCategoryView extends StatCategoryDef {
  stats: StatEntry[]
  /** Number of stats before the search filter was applied. */
  totalCount: number
}

/* ── Champion Shop detail panel ── */
export interface ShopDetailMaterial {
  id: string
  name: string
  image: string
  need: number
  have: number
  ok: boolean
  color?: string
}

/** Everything the shop's champion detail panel renders for one champion. */
export interface ShopChampionDetail {
  name: string
  image: string
  roleLabel: string
  roleColor: string
  traits: Array<{ id: string; name: string; icon: string; color: string }>
  origin: { origin: string; icon: string; color: string } | null
  starLevel: number
  tierName: string
  tierColor: string
  tierIcon: string
  tierDescription: string
  spawnPercent: number | null
  locked: boolean
  lockedHint: string
  /**
   * The champion's home planet — the one that has to be rescued before it can be
   * recruited at all. Carried for every champion (not just locked ones) because
   * it is where the champion is FROM, but only the locked panel spells it out.
   */
  homePlanet: { type: PlanetType; name: string } | null
  /**
   * Recruit cost. A locked champion has no recruit entry yet, so its rows come
   * from the home-planet config instead — the price is fixed data, and showing it
   * early lets the player farm towards a champion they cannot buy yet.
   */
  materials: ShopDetailMaterial[]
  chimes: { need: number; have: number; ok: boolean }
  canBuy: boolean
}

/** Everything the unified shop's item detail panel renders for one item. */
export interface ShopItemDetail {
  id: string
  name: string
  icon: string
  description: string
  category: ItemCategory
  categoryLabel: string
  categoryImage: string
  categoryColor: string
  rarity: ItemRarity
  rarityLabel: string
  rarityColor: string
  ownedCount: number
  set: { name: string; icon: string; description: string; active: boolean } | null
  materials: ShopDetailMaterial[]
  chimes: { need: number; have: number; ok: boolean }
  canBuy: boolean
}

/* ── Bottom scoreboard auto-fit (utils/ui/scoreboardFit.ts) ─────────────────── */

/** One stat cell as the fit sees it: measured glyph widths, no DOM. */
export interface ScoreboardFitCell {
  key: string
  /** Width of the rendered value at font-size 1px (its em width), in px. */
  em: number
  /** Width of the cell's label at font-size 1px; 0 → the cell has no label. */
  labelEm: number
  /** Same for the cell's short caption; falls back to labelEm when absent. */
  labelShortEm?: number
  /** true → the value renders on two stacked lines (win / loss). */
  stacked?: boolean
}

/** The one line the crest renders — its string plus the ornament beside it. */
export interface ScoreboardCrestLine {
  /** Width of the line's text at font-size 1px (its em width), in px. */
  em: number
  /** Ornament width beside the text, in em — icons, stars and their gaps. */
  ornamentEm: number
}

export interface ScoreboardFitInput {
  /**
   * Usable width of the left / right stat group at the SMALLEST crest box, in
   * px — the widest the half can ever be. Whatever the cells leave unused of it
   * goes to the crest (see ScoreboardFit.crestWidth), so the halves the browser
   * finally lays out are this width minus that share.
   */
  leftWidth: number
  rightWidth: number
  /** Usable height of the whole strip, in px. */
  stripHeight: number
  leftCells: ScoreboardFitCell[]
  rightCells: ScoreboardFitCell[]
  /** Smallest / largest crest box the strip allows, in px. */
  crestMin?: number
  crestMax?: number
  /** The crest's two lines — the idle game title and the live status. */
  crestTitle?: ScoreboardCrestLine
  crestStatus?: ScoreboardCrestLine
  /** Internal: the second pass sets this to false once labels have been dropped. */
  showLabels?: boolean
  /** Internal: set once the fit falls back to the short captions. */
  useShortLabels?: boolean
}

/** Every size the scoreboard renders with — all in px, all derived. */
export interface ScoreboardFit {
  valueSize: number
  stackedValueSize: number
  /** 0 → labels do not fit and are not rendered. */
  labelSize: number
  /** true → the strip renders the short caption of every cell. */
  shortLabels: boolean
  rowGap: number
  /** 0 → icons would be specks and are not rendered. */
  iconSize: number
  iconGap: number
  cellPad: number
  /** flex-grow weight per cell key — proportional to the cell's real demand. */
  grow: Record<string, number>
  /** Measured em width per cell key — lets a cell reserve a fixed text slot. */
  em: Record<string, number>
  /** Width of the crest box in the middle: its minimum plus the halves' spare. */
  crestWidth: number
  /** Font size of the idle game title, px. */
  crestTitleSize: number
  /** Font size of the live status line, px. */
  crestStatusSize: number
  /** Height of the ornament row above the line (rule · star · rule), px. */
  crestOrnamentSize: number
  /** Gap between that row and the line, px. */
  crestRowGap: number
  /**
   * Height reserved for the line's ink, px — the same for the title and the
   * status, so the ornament row above them does not move when they swap.
   */
  crestBand: number
}

// ── Tastenkürzel ─────────────────────────────────────────────────────────────
// Die Registry selbst liegt als KEYBINDINGS in config/constants/keybindings.ts.
// Ein Eintrag dort erscheint automatisch im Controls-Panel; `inHud` entscheidet
// zusätzlich über die Keycap in der schwebenden Leiste.

export type KeybindId =
  | 'pause'
  | 'shop'
  | 'tree'
  | 'controls'
  | 'abilityQ'
  | 'abilityW'
  | 'abilityE'
  | 'abilityR'

export type KeybindCategoryId = 'game' | 'interface'

export interface KeybindCategory {
  id: KeybindCategoryId
  label: string
  icon: string
}

export interface KeybindDef {
  id: KeybindId
  /**
   * Akzeptierte `KeyboardEvent.key`-Werte, klein geschrieben verglichen.
   * Bewusst `key` und nicht `code`: Zeichen wie `?` liegen je nach Layout auf
   * einer anderen physischen Taste, und genau das Zeichen steht auf der Keycap.
   */
  keys: string[]
  /** Beschriftung der Keycap in HUD und Panel. */
  cap: string
  /** Kurzform neben der Keycap. */
  label: string
  /** Ein Satz im Controls-Panel — was die Taste bewirkt. */
  description: string
  icon: string
  category: KeybindCategoryId
  /** true = Keycap steht dauerhaft in der HUD-Leiste. */
  inHud: boolean
}

// ── Action-Toast ─────────────────────────────────────────────────────────────
// Die Registry liegt als TOAST_KINDS in config/constants/ui.ts. Jede
// showToast-Stelle nennt die Art ihres Ereignisses, daraus holt sich die Karte
// Sigil, Kopfzeile und Akzentfarbe — der Spieler erkennt so schon am Rand der
// Karte, WORUM es geht, bevor er den Satz gelesen hat.

export type ToastKind =
  | 'levelup'
  | 'recruit'
  | 'assign'
  | 'purchase'
  | 'unlock'
  | 'equip'
  | 'perk'
  | 'forge'
  | 'expedition'
  | 'event'
  | 'warning'
  | 'info'

export interface ToastKindDef {
  /** Kopfzeile über der Meldung — sagt in einem Wort, was passiert ist. */
  label: string
  /** Iconify-Name des Sigils links (Spielinhalt → game-icons). */
  icon: string
  /** Akzent für Sigil, Kopfzeile, Randleiste und Laufbalken. */
  accent: string
}
