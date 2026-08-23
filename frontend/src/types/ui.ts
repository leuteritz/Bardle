// Anzeige-Typen: Stat-Katalog, Shop-Detailpanel, Scoreboard, Keybinds.

import type { PlanetType } from '@/types/world'
import type { ItemCategory, ItemRarity } from '@/types/economy'

// ── Ausgewürfelte Icons ──────────────────────────────────────────────────────
/**
 * Motivfamilie für ausgewürfelte Icons — die Schlüssel von `ICON_POOLS`
 * (`config/ui/iconPools.ts`). Alles, was der Spieler gerollt bekommt, nennt
 * eine Familie statt eines festen Glyphs, damit jeder Roll anders aussieht.
 */
export type IconPoolKey =
  | 'might'
  | 'ward'
  | 'haste'
  | 'fortune'
  | 'arcane'
  | 'ascend'
  | 'cosmos'
  | 'journey'
  | 'fate'
  | 'forge'
  | 'roster'

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

/* ── Champion Shop facet rail ──
   The rail renders these and nothing else: it cannot resolve what a facet means
   against the catalog, so the shop hands it fully-formed rows. Champions and
   items therefore fill ONE component with two different sets of groups. */
export interface ShopFacetChip {
  id: string
  label: string
  /** Drives the row's left border and its active tint. */
  color?: string
  icon?: string
  image?: string
  /** How many cards would be left standing — omitted where a count says nothing. */
  count?: number
  active: boolean
  disabled?: boolean
  /** Locked shows a padlock instead of the count (galaxy-gated tiers). */
  locked?: boolean
  title?: string
}

export interface ShopFacetGroup {
  id: string
  label: string
  /** Shown as the group's stub while the rail is folded. */
  icon: string
  chips: ShopFacetChip[]
}

/* ── Champion Shop overview card (detail column, nothing picked) ── */
export interface ShopOverviewTier {
  starLevel: number
  name: string
  icon: string
  color: string
  requiredGalaxy: number
}

export interface ShopOverviewPick {
  kind: 'champion' | 'item'
  id: string
  name: string
  image?: string
  icon?: string
  color: string
  /** One line of why it is worth the click — tier and price, or rarity. */
  sub: string
}

export interface ShopOverviewSet {
  id: string
  name: string
  /** Iconify name — or `image`, since item icons are half asset paths. */
  icon?: string
  image?: string
  description: string
  ownedParts: number
  totalParts: number
  active: boolean
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
  /**
   * Der Hauptsitz, den dieser Champion beim Recruit einnimmt — trägt die
   * Sitz-Zeile über dem Buy-Button. `occupant: null` heißt: der Sitz ist frei
   * und der Kauf besetzt ihn ohne Rückfrage.
   */
  seat: {
    roleLabel: string
    roleColor: string
    roleIcon: string
    occupant: { name: string; image: string } | null
  } | null
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
  | 'forgeRecenter'

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

// ── Herold-Quittungen ────────────────────────────────────────────────────────
// Die Nebenspur des Herolds (HeraldReceiptStack / useHerald). Die Registry liegt
// als HERALD_RECEIPT_KINDS in config/constants/ui.ts. Jede announceReceipt-Stelle
// nennt die Art ihres Ereignisses, daraus holt sich die Karte Sigil, Kopfzeile
// und Akzentfarbe — der Spieler erkennt so schon am Rand der Karte, WORUM es
// geht, bevor er die Zeile gelesen hat.

export type HeraldReceiptKind =
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
  /** Kaufquittung der Star Forge — bringt Glyph und Farbe des Objekts selbst mit. */
  | 'forged'
  /** Hinweis, dass eine Notify-Marke aufgetaucht ist (siehe useBadgeHeralds). */
  | 'ready'

export interface HeraldReceiptKindDef {
  /** Kopfzeile über der Meldung — sagt in einem Wort, was passiert ist. */
  label: string
  /** Iconify-Name des Sigils links (Spielinhalt → game-icons). */
  icon: string
  /** Akzent für Sigil, Kopfzeile, Randleiste und Restzeitleiste, als "r, g, b". */
  accent: string
}

/**
 * Das getrennte Zahlenfeld einer Quittung — Kosten oder Ertrag.
 *
 * Das VORZEICHEN entscheidet über die Farbe, nicht der Aufrufer; sonst steht
 * irgendwann ein grünes Minus auf der Karte.
 */
export interface HeraldDelta {
  value: number
  /**
   * Kurze Einheit hinter der Zahl: 'chimes' | 'levels' | 'meeps' | 'HP'.
   *
   * Immer dieselbe Form je Quelle — sie ist zugleich der Schlüssel, an dem die
   * Verdichtung entscheidet, ob zwei Deltas summiert werden dürfen. Wer hier
   * zwischen 'level' und 'levels' wechselt, bekommt statt einer Summe eine
   * Ersetzung.
   */
  unit?: string
  /** Form bei genau 1 ('level' zu 'levels'). Zählt NICHT für die Verdichtung. */
  unitOne?: string
  /** false = beim Verdichten ersetzen statt aufsummieren. Default true. */
  sum?: boolean
}

/**
 * Was die Champion-Karte des Pause-Overlays zeigt — ein Schnappschuss, kein
 * Live-Objekt. Er wird im Takt von `STAR_TIMER_TICK_MS` neu gebaut und nur
 * dann zugewiesen, wenn sich etwas ABLESBARES geändert hat (dasselbe Muster
 * wie bei den Stern- und der Void-Karte, siehe `PauseOverlay.vue`).
 *
 * Zwei Zustände, eine Karte:
 *  • `awaited` — der Champion ist gefunden, sein Stern steht noch nicht.
 *    Es gibt nichts zu zählen; `secs`/`endsAt`/`durationMs`/`bossHp` sind 0.
 *  • `active`  — der Stern läuft, seine Frist zählt ab.
 * Beide schließen sich aus: `spawnChampionStar()` schaltet den Reisezustand
 * im selben Zug von `champion_available` auf `champion_spawned`.
 */
export interface PauseChampionCallout {
  state: 'awaited' | 'active'
  /** Fertiger CSS-Wert: die Rollenfarbe — im laufenden Stern seine `starColor`,
   *  die aus derselben Rolle abgeleitet ist. */
  color: string
  /** Rollenlabel (`awaited`) bzw. Name des Champions (`active`). */
  title: string
  /** Nur `awaited`: wann der Stern erscheint. */
  status: string | null
  /** Rollenbild (`awaited`) bzw. Porträt des Champions (`active`). */
  art: string | null
  /** Iconify-Name des Rollenwappens (ROLES[].icon). */
  roleIcon: string
  /** Restsekunden des Sterns — die Zahl im Ring. */
  secs: number
  /** ABSOLUTER Zeitpunkt, an dem der Stern verschwindet (ms). Der Zeitbogen
   *  läuft als Animation und braucht genau diesen Fixpunkt. */
  endsAt: number
  /** Gesamtlaufzeit derselben Uhr in ms — der Nenner des Bogens. */
  durationMs: number
  /** Leben des Bosses auf dem Champion-Planeten (0..1). */
  bossHp: number
  /** Begleitwelten des Sterns: wie viele es sind und wie viele schon frei sind. */
  escortTotal: number
  escortCleared: number
}

// ── Notify-Marken ────────────────────────────────────────────────────────────
// Die Typen liegen HIER und nicht in config/, weil sowohl `config/ui/notifyBadges.ts`
// (die Registry) als auch der uiStore sie brauchen — läge `BardTabId` weiter im
// Store, zöge die Registry an `stores/` und damit config an Pinia.

/** Ein Reiter des Bard-Profils. Wohnt hier, weil die Badge-Registry ihn nennt. */
export type BardTabId =
  | 'bard'
  | 'shop'
  | 'tree'
  | 'team'
  | 'expedition'
  | 'battle'
  | 'admin'
  | 'planets'

/** Die Marken-Art, die Tooltip, Herold und Badge Lab gemeinsam kennen. */
export type NotifyBadgeKind =
  | 'level'
  | 'expedition'
  | 'forge'
  | 'champions'
  | 'skill'
  | 'planet'
  | 'shop'
  | 'chronicle'

/** Eine Stelle im Markup, an der diese Marke auftaucht. Die Guard-Spec
 *  (`__tests__/config/notifyBadges.spec.ts`) prüft beide Richtungen gegen diese
 *  Liste: kein Markup ohne Eintrag, kein Eintrag ohne Markup. */
export interface NotifyBadgeSite {
  /** Pfad ab `src/`, mit Schrägstrichen. */
  file: string
  /** Zeichenfolge, an der die Spec die Marke in der Datei wiederfindet. */
  marker: string
  /** Klartext für den Menschen: wo im Bild das ist. */
  where: string
}

/** Wie genau sich die Marke auf eine Wunschzahl setzen lässt. */
export type NotifyBadgeSeedability =
  /** Trifft die Zahl exakt (Quittungs-Marken). */
  | 'exact'
  /** Trifft sie bis zu einer Decke, die der Spielstand vorgibt. */
  | 'capped'
  /** Reine canAfford-Ableitung — nur ungefähr steuerbar. */
  | 'derived'
  /** Gar nicht (Tooltip-Kind ohne Marke). */
  | 'none'

/** Ob „clear" den Zustand von vorher wiederherstellt. */
export type NotifyBadgeReversibility = 'full' | 'partial' | 'none'

export interface NotifyBadgeDef {
  id: NotifyBadgeKind
  /** Überschrift im Tooltip und in der Herold-Schlagzeile. */
  title: string
  /** Kurzname für die Zeile im Badge Lab. */
  short: string
  /** Akzent als "r, g, b" — dieselbe Farbe, die die Marke im Spiel trägt. */
  accent: string
  /** Iconify-Name. Entfällt, wo `imageSrc` steht. */
  icon?: string
  /** Bild statt Glyph — der Meep zeigt sich selbst, kein Symbol für sich. */
  imageSrc?: string
  /** Reiter, den die Marke meint. `null` = kein eigener. */
  tab: BardTabId | null
  /** false = nur ein Tooltip-Kind, nie eine Marke. */
  hasBadge: boolean
  /** Meldet der `ready`-Herold diese Marke? */
  heralds: boolean
  /** Kopfzeile des Herolds über der Meldung. */
  heraldEyebrow?: string
  /** Substantiv der Herold-Unterzeile: „3 skills ready to learn". */
  heraldNoun?: string
  sites: readonly NotifyBadgeSite[]
  seedability: NotifyBadgeSeedability
  reversible: NotifyBadgeReversibility
  /** Klartext für die Panel-Zeile — was das Befüllen anfasst. */
  seedNote: string
  /** Klassentoken, die aus den Suchmustern der Guard-Spec fallen. */
  extraMarkers?: readonly string[]
}

/** Was ein Seed- oder Clear-Lauf erreicht hat. Die Zahl ist die ERREICHTE, nicht
 *  die gewünschte — Decken werden gemeldet, nicht verschwiegen. */
export interface BadgeSeedResult {
  kind: NotifyBadgeKind
  requested: number
  achieved: number
  notes: string[]
}

/**
 * Wo Fähigkeitenleiste und Buff-Reihe gerade stehen. App.vue hängt sie per
 * `<Teleport>` um — dieselbe Instanz, nur Form und Anker wechseln.
 *
 * `free`  — am freien Bild: die Leiste über dem Scoreboard, die Buff-Reihe
 *           darüber gestapelt. Beide `position: fixed`.
 * `rail`  — in der Schiene des Star-Fight-Modals, als schmale Spalte.
 * `pause` — im Kit-Band des Pause-Overlays. **Nur die Buff-Reihe**: die
 *           Fähigkeitenleiste wird dort nicht umgehängt, sondern gar nicht
 *           gerendert (sie prüft `isPaused` selbst). Ihren Platz nimmt
 *           `PauseKitPanel` ein — Zeilen statt Kacheln, weil im Overlay
 *           nichts bedienbar ist.
 *
 * Benannte Werte statt Booleans — `docked && paused` wäre ein Zustand, den es
 * nicht gibt.
 */
export type AbilityBarDock = 'free' | 'rail' | 'pause'
