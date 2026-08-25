// Wirtschaft: Shop, Items, Materialien, Augments, Expeditionen, Missionen.

import type { ChampionRole } from '@/types/core'
import type { ChampionStatKey } from '@/types/champions'
import type { IconPoolKey } from '@/types/ui'

// Expedition types
export type ExpeditionStatus = 'active' | 'success' | 'failure'

export type ExpeditionHazardId =
  | 'voidStatic'
  | 'crushingGravity'
  | 'hostileWardens'
  | 'sealedVault'
  | 'ancientSeals'
  | 'shiftingPaths'

/**
 * A condition on the mission that the crew either answers or pays for.
 *
 * `stat` hazards mitigate on a ramp against the crew's summed stat; `kinship`
 * wants two champions of one origin, `diversity` wants no two alike. The last
 * two are the reason a crew is more than the sum of its levels.
 */
export interface ExpeditionHazardDef {
  id: ExpeditionHazardId
  name: string
  icon: string
  kind: 'stat' | 'kinship' | 'diversity'
  /** Which champion stat answers this hazard — null for composition hazards. */
  counterStat: ChampionStatKey | null
  /**
   * What the crew must bring, in four or five words, shown ON the card.
   * The flavour line below is decoration; this is the part a player acts on, so
   * it may never live in a tooltip.
   */
  requirement: string
  desc: string
}

/** What a tier pays beyond chimes. A failed run pays none of it. */
export interface ExpeditionSpoilsDef {
  materialRolls: number
  materialChance: number
  meep: number
}

/** What a resolved mission actually handed over — kept for the result card. */
export interface ExpeditionSpoilsPayout {
  materials: { id: string; qty: number }[]
  meep: number
}

export interface ExpeditionLedgerRankDef {
  tier: number
  name: string
  icon: string
  /** Missions resolved before this rank applies. */
  required: number
  activeSlots: number
  offerSlots: number
  chanceBonus: number
}

/** One signed line of the success-chance sum, as shown on the contract card. */
export interface ExpeditionChanceEntry {
  id: string
  label: string
  icon: string
  /** Signed contribution in probability points (0.12 = +12 %). */
  value: number
  /** Extra note under the label — e.g. how far a hazard is mitigated. */
  detail?: string
}

export interface ExpeditionChanceBreakdown {
  base: number
  entries: ExpeditionChanceEntry[]
  /** Clamped final chance — what the dice actually use. */
  total: number
}

/**
 * Wie weit ein Ziel erschlossen ist. `runs` und `charted` sind zwei Zahlen, weil
 * eine Etappe kartieren kann, ohne dass die Mission zurückkommt (Stufe 3).
 */
export interface DestinationProgress {
  /** Hier aufgelöste Missionen, Erfolg wie Fehlschlag. */
  runs: number
  /** Kartografiepunkte, 0..EXPEDITION_CHART_MAX. */
  charted: number
}

export interface AvailableExpeditionSlot {
  id: string
  colorKey: string
  availableUntil: number
  spawnedAt: number
  /** Befreite Galaxie, in die dieser Vertrag führt — setzt Stufe und Skalierung. */
  galaxy: number
  tier: 'common' | 'rare' | 'epic'
  name: string
  icon: string
  baseReward: number
  durationSeconds: number
  requiredRoles: ChampionRole[]
  minPowerThreshold: number
  hazards: ExpeditionHazardId[]
  /** Crew stat that fully answers a stat hazard on this mission. */
  hazardThreshold: number
}

export interface ExpeditionMission {
  id: string
  configId: string
  name: string
  description: string
  icon: string
  requiredRoles: ChampionRole[]
  assignedChampions: { name: string; role: ChampionRole }[]
  durationSeconds: number
  startTime: number
  baseReward: number
  successChance: number
  status: ExpeditionStatus
  reward: number
  colorKey?: string
  /** Zielgalaxie. Ältere Spielstände kennen sie nicht — `loadGame` füllt 1 nach. */
  galaxy?: number
  tier?: 'common' | 'rare' | 'epic'
  hazards?: ExpeditionHazardId[]
  /** Filled in on resolve — what the run brought home besides chimes. */
  spoils?: ExpeditionSpoilsPayout
}

/**
 * Ein Glied der CpS-Multiplikatorkette, so wie `shopStore.cpsFactorBreakdown`
 * es liefert: roh, ungefiltert, ungewichtet.
 *
 * Was daraus gezeigt wird, ist DARSTELLUNG und steht bewusst nicht hier: die
 * Sonne im Shop bildet das Produkt aller Glieder
 * (`components/bardProfil/skillTree/SunChimeBoost.vue`), eine Aufschlüsselung nach
 * Herkunft gibt es derzeit nirgends.
 */
export interface CpsFactor {
  /** Schlüssel in `FORGE_YIELD_SOURCES` — dort steht der Katalog der Herkünfte. */
  id: string
  /** Das Produkt aller Faktoren dieser Herkunft. Neutral ist exakt 1. */
  factor: number
}

export interface TimePeriod {
  key: string
  label: string
  duration: number
  interval: number
  dataPoints: number
}

export interface Expedition {
  universeId: number
  universeName: string
  meepsSent: number
  startTime: number
  durationMs: number
  reward: number
  collected: boolean
}

export type AugmentRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface AugmentEffects {
  cpsMultiplier?: number
  cpcMultiplier?: number
  buildingCostMultiplier?: number
  meepCostMultiplier?: number
  meepPowerMultiplier?: number
  expeditionRewardMultiplier?: number
  abilityPowerPerLevel?: number
  cooldownMultiplier?: number
  enemySpeedMultiplier?: number
  enemyMaxHPDrainPerSecond?: number
}

export type AugmentSpecialEffectType =
  | 'doubleTap'
  | 'chainReaction'
  | 'overclock'
  | 'bigBang'
  | 'infiniteLoop'
  | 'gravityFlip'
  | 'bardsCurse'
  | 'quantumLuck'
  | 'echoChamber'
  | 'keyboardSmash'

export interface AugmentSpecialEffect {
  type: AugmentSpecialEffectType
  params: Record<string, number>
}

export interface AugmentDefinition {
  id: string
  name: string
  description: string
  effectLine: string
  /**
   * Motivfamilie statt festem Glyph — das Icon wird bei jedem Roll neu gezogen
   * (`augmentIcon` in `utils/game/rolledIcons.ts`), damit dasselbe Augment beim
   * zwanzigsten Mal nicht wieder gleich aussieht.
   */
  iconPool: IconPoolKey
  rarity: AugmentRarity
  effects: AugmentEffects
  specialEffect?: AugmentSpecialEffect
}

export interface TimedBuff {
  augmentId: string
  effectKey: string
  multiplier: number
  expiresAt: number
}

export type ItemCategory = 'weapon' | 'armor' | 'artefact'
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface ItemEffect {
  cpsMultiplier?: number
  powerMultiplier?: number
}

export interface ItemSetBonus {
  setId: string
  setName: string
  icon: string
  description: string
  bonusEffect: ItemEffect
}

export interface ShopItem {
  id: string
  name: string
  description: string
  icon: string
  price: number
  materialCost?: Record<string, number>
  rarity: ItemRarity
  category: ItemCategory
  effects: ItemEffect
  setId?: string
}

export interface SlotEquipment {
  weapon: string | null
  armor: string | null
  artefact: string | null
}

export type MaterialRarity = 'common' | 'uncommon' | 'rare' | 'epic'

export interface Material {
  id: string
  name: string
  icon?: string
  image?: string
  description: string
  rarity: MaterialRarity
  dropChance: number
  dropCount?: number
}

/** Where a unit of material entered the inventory. Labels: MATERIAL_SOURCE_LABELS. */
export type MaterialSourceId =
  | 'drop'
  | 'harvest'
  | 'boss'
  | 'drifter'
  | 'bargain'
  | 'expedition'
  | 'void'
  /** Caretaker's Ledger (constellation): a doubled click shook something loose. */
  | 'click'
  /** A claimed Wayfinder mission. */
  | 'mission'

/** What a unit of material was spent on. Labels: MATERIAL_SINK_LABELS. */
export type MaterialSinkId =
  | 'recruit'
  | 'level'
  | 'equipment'
  | 'tier'
  | 'forge'
  | 'relic'
  | 'constellation'
  | 'bargain'
  | 'other'

/** One row of the source/sink breakdown in the header material tooltip. */
export interface MaterialFlowShare {
  id: string
  label: string
  icon: string
  amount: number
  /** 0–1, relative to the largest row — drives the bar width, not the label. */
  fraction: number
  /** 0–1, share of the whole tally — the percentage the player reads. */
  share: number
}

// ── Universe run (header universe tooltip) ───────────────────────────────────

// ── Voyages: die Karte des Expeditions-Reiters ───────────────────────────────

/**
 * Ein besetzter Ankerplatz auf der Galaxie-Karte. `berth` ist der Platz aus
 * `assignVoyageBerths`, `pinKey` überlebt den Übergang Vertrag → Mission.
 */
export interface VoyagePlacedSite {
  pinKey: string
  berth: number
  /** Normalisiert 0..1 in der Fit-Box. */
  x: number
  y: number
  offer: AvailableExpeditionSlot | null
  mission: ExpeditionMission | null
}

/**
 * Eine Crew auf dem Heimweg zum Caretaker's Gate.
 *
 * Rein darstellend und NICHT im Spielstand: die Mission ist beim Einsammeln
 * schon aufgelöst und ausgezahlt. Was hier steht, ist nur, was die Karte zum
 * Zeichnen des Rückwegs braucht — Ausgangshafen, Startzeit, Besatzung.
 */
export interface VoyageHomecoming {
  /** `pinKey` der aufgelösten Mission; der Hafen ist da schon frei. */
  key: string
  x: number
  y: number
  berth: number
  legCount: number
  /** `gameNow()` beim Einsammeln — der Rückweg ist zeitraffer-treu. */
  startedAt: number
  colorKey: string
  crew: string[]
  success: boolean
}

/** Eine Zeile der Galaxie-Seitenleiste. */
export interface VoyageRailRow {
  galaxy: number
  name: string
  tier: 'common' | 'rare' | 'epic'
  /** Akzentfarbe des Themes als `"r, g, b"` — aus `minimapAccentForTheme`. */
  accent: string
  charted: number
  runs: number
  contracts: number
  inField: number
  ready: number
  seen: boolean
}

/** Was eine Galaxie gerade trägt — derselbe Rang in Leiste und Fleet-Brett. */
export type VoyageGalaxyState = 'ready' | 'offer' | 'field' | 'quiet'

/**
 * Ein Subjekt für den Roster-Aufbau. `VoyagePlacedSite` erfüllt ihn strukturell,
 * die Detailspalte reicht ihre Häfen also unverändert durch.
 */
export interface VoyageRosterSubject {
  pinKey: string
  offer: AvailableExpeditionSlot | null
  mission: ExpeditionMission | null
}

export type VoyageRosterState = 'ready' | 'failed' | 'offer' | 'field'

/**
 * Eine Marke als Zeile — ZEITFREI. Die Uhr hängt erst die Zeilenkomponente an;
 * ein fertig formatierter Countdown hier hieße, die ganze Liste im Sekundentakt
 * neu zu bauen.
 */
export interface VoyageRosterRow {
  pinKey: string
  name: string
  icon: string
  state: VoyageRosterState
  accent: string
  chipIcon: string
  chip: string
  /** Chimes der Zeile, oder null wo es keine zu zeigen gibt. */
  reward: number | null
  rewardPrefix: string
  /** Vertrag: besetzte / verlangte Sitze. Sonst null. */
  seatsFilled: number | null
  seatsTotal: number | null
  /** Vertrag: Ablaufstempel. */
  expiresAt: number | null
  /** Laufende Mission: Ende und Gesamtspanne. */
  endsAt: number | null
  spanMs: number | null
  odds: number | null
  crewCount: number | null
  /** Der zeitfreie Teil der Vorlesung; die Uhr ergänzt den Rest. */
  ariaLead: string
}

/**
 * Eine EXPEDITION als Karte des Fleet-Bandes — nicht eine Galaxie. Die Frage der
 * Kopfleiste ist „was laeuft, mit wem, und was kann ich starten"; eine Zeile je
 * Galaxie kann sie nicht beantworten, weil sie nur Summen kennt.
 *
 * ZEITFREI wie die Zeile, aus der sie besteht: `row` traegt Zeitstempel, nie
 * einen fertigen Countdown.
 */
export interface VoyageFleetCard {
  pinKey: string
  galaxy: number
  /** Name der Zielgalaxie — die Karte nennt das Ziel, nicht nur die Ziffer. */
  galaxyName: string
  /** Akzentfarbe der Galaxie als `"r, g, b"`. */
  accent: string
  tier: 'common' | 'rare' | 'epic'
  /** Vertrag mit allen Sitzen besetzt: er kann JETZT losgeschickt werden. */
  sendable: boolean
  row: VoyageRosterRow
  /** Wer draussen ist. Leer bei einem Vertrag, der noch nicht abgereist ist. */
  crew: { name: string; role: ChampionRole }[]
  /** Vertrag: die Draft-Crew, `null` je leerem Sitz. Sonst leer. */
  seats: (string | null)[]
}

/**
 * Was der Hover-Tooltip einer Marke zeigt (`utils/game/voyageTip.ts`).
 *
 * ZEITFREI wie die Roster-Zeile: Stempel, kein fertiges Ziffernblatt — sonst
 * baute der Tooltip sich im Sekundentakt selbst neu.
 */
export interface VoyageTipView {
  pinKey: string
  name: string
  icon: string
  /** Farbe der Marke auf der Karte. */
  accent: string
  state: VoyageRosterState
  stateLabel: string
  stateIcon: string
  /** Themenname der Zielgalaxie. */
  destination: string
  tier: 'common' | 'rare' | 'epic'
  /** Vertrag: Ablaufstempel. */
  expiresAt: number | null
  /** Laufende Mission: Ende und Gesamtspanne. */
  endsAt: number | null
  spanMs: number | null
  durationSeconds: number
  /** Erfolgschance in Prozent, `null` solange kein Sitz besetzt ist. */
  odds: number | null
  reward: number
  rewardPrefix: string
  spoils: ExpeditionSpoilsDef
  hazards: VoyageTrackHazard[]
  /** Vertrag: besetzte / verlangte Sitze. Sonst null. */
  seatsFilled: number | null
  seatsTotal: number | null
  /** Wer draussen bzw. heimgekehrt ist. */
  crew: string[]
}

/**
 * Ein benannter Abschnitt einer Voyage. ABGELEITET aus dem Vertrag bzw. der
 * Mission (`utils/game/voyageLegs.ts`), nie gespeichert — `from`/`to` sind
 * Anteile der Gesamtdauer und schliessen lückenlos aneinander an.
 */
export interface VoyageLeg {
  index: number
  name: string
  hazards: ExpeditionHazardId[]
  from: number
  to: number
}

/** Ein Punkt der Reiseroute, normalisiert 0..1 in der Fit-Box der Karte. */
export interface VoyageRoutePoint {
  x: number
  y: number
}

/**
 * Eine Gefahr, wie die Etappenleiter sie zeigt. Der Vertrag füllt `requirement`
 * und `state` (dort steht die Crew noch zur Wahl), die laufende Mission nicht.
 */
export interface VoyageTrackHazard {
  id: ExpeditionHazardId
  name: string
  icon: string
  requirement?: string
  state?: 'met' | 'partial' | 'unmet' | 'open'
  cost?: number | null
}

/**
 * Eine Zeile des Reise-Logbuchs. ABGELEITET wie die Etappen
 * (`utils/game/voyageLog.ts`), nie gespeichert — `at` ist der Anteil der
 * Gesamtdauer, ab dem die Zeile steht.
 */
export type VoyageLogKind = 'depart' | 'travel' | 'crew' | 'hazard' | 'arrive' | 'verdict'

export interface VoyageLogEntry {
  index: number
  at: number
  leg: number
  kind: VoyageLogKind
  text: string
}
