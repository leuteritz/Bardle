// Wirtschaft: Gebäude-Katalog des Shops, Augment-Effekte, Material-Inventar
// samt Drop-Buchführung und die Expeditionen, die beides verbinden.

import type {
  ExpeditionHazardDef,
  ExpeditionHazardId,
  ExpeditionLedgerRankDef,
  ExpeditionSpoilsDef,
} from '@/types'
// Wie `firmament.ts`: das Sternsoll ist eine Progressionszahl, die Reihe darf
// sie nur LESEN. Direkt aus der Themendatei, nicht ueber das Barrel.
import { GALAXY_STARS_MAX } from '@/config/constants/progression'

/** Aufsammel-Blitz und Lebensdauer eines Chime-Pops im Expeditions-Panel. */
export const EXPEDITION_COLLECT_FLASH_MS = 600
export const EXPEDITION_CHIME_POP_LIFETIME_MS = 850
export const EXPEDITION_CHIME_POP_SPREAD_PX = 80
/** Farbschwellen der Erfolgsaussicht einer Expedition. */
export const EXPEDITION_CHANCE_GOOD = 0.7
export const EXPEDITION_CHANCE_MID = 0.45

// ── Material display (header materials grid) ────────────────────────────────
// Count color per material id.
export const MATERIAL_COLOR: Record<string, string> = {
  stardust: '#fde68a', // warm gold        – Stardust
  moon_crystal: '#bae6fd', // icy light blue   – Moon Crystal
  nebula_quartz: '#6ee7b7', // mint green       – Nebula Quartz
  solar_essence: '#fb923c', // glowing orange   – Solar Essence
  void_shard: '#a78bfa', // deep violet      – Void Shard
  dark_matter: '#f472b6', // pink magenta     – Dark Matter
  comet_ice: '#7dd3fc', // pale ice blue    – Comet Ice
  star_iron: '#cbd5e1', // steel grey       – Star Iron
  plasma_core: '#f0abfc', // hot fuchsia      – Plasma Core
  aether_dust: '#fcd34d', // shimmering amber – Aether Dust
}
// Initials shown in the placeholder box while a material has no artwork yet.
export const MATERIAL_PLACEHOLDER_LABELS: Record<string, string> = {
  comet_ice: 'CI',
  star_iron: 'SI',
  plasma_core: 'PC',
  aether_dust: 'AD',
}

// Shown instead of a bare "0" for materials the player has none of.
export const MATERIAL_EMPTY_GLYPH = '–'

// ── Material ledger: where a material came from, where it went ──────────────
// Every inflow and outflow is tallied per material so the header tooltip can
// answer "where does this stuff actually come from" and "what am I burning it
// on". The ids are stored in the save — renaming one silently orphans the old
// tally, so add new ids instead of repurposing existing ones.
export const MATERIAL_SOURCE_LABELS: Record<string, string> = {
  drop: 'Orbit Drops',
  harvest: 'Planet Harvest',
  boss: 'Boss Loot',
  drifter: 'Drifters',
  bargain: 'Forge Deals',
  expedition: 'Expeditions',
  void: 'Sealed Rifts',
  click: 'Shaken Loose',
  mission: 'Wayfinder',
  landfall: 'Landfalls',
}
export const MATERIAL_SOURCE_ICONS: Record<string, string> = {
  drop: 'game-icons:falling-rocks',
  harvest: 'game-icons:ringed-planet',
  boss: 'game-icons:crowned-skull',
  drifter: 'game-icons:ufo',
  bargain: 'game-icons:gems',
  expedition: 'game-icons:caravan',
  void: 'game-icons:vortex',
  click: 'game-icons:click',
  mission: 'game-icons:direction-signs',
  landfall: 'game-icons:crossroad',
}
export const MATERIAL_SINK_LABELS: Record<string, string> = {
  recruit: 'Champion Recruits',
  level: 'Champion Levels',
  equipment: 'Equipment',
  tier: 'Tier Unlocks',
  forge: 'Star Forge',
  relic: 'Relics',
  constellation: 'Constellations',
  bargain: 'Forge Deals',
  other: 'Other',
}
/**
 * Der Ton, in dem Material dort steht, wo es neben Chimes und Meeps abgelesen
 * wird — Muster wie `MEEP_ACCENT_HEX`, `MISSION_ACCENT_HEX`, `LANDFALL_ACCENT_HEX`.
 *
 * Er muss sich von JEDER Stufenfarbe unterscheiden, und das ist keine Vorsicht,
 * sondern eine Reparatur: die Fleet-Karte trug ihr Material-Glyph in `#7aa8e0`
 * — exakt `EXPEDITION_TIER_COLORS.rare`, dieselbe Farbe, die zwei Zeilen höher
 * im Stufenstreifen derselben Karte die Rare-Stufe markiert. Das Symbol las sich
 * als Stufenangabe. Stein statt Signal: unbunter als jede der drei Stufen.
 * `voyagesFleetLayout.spec.ts` bindet den Abstand.
 */
export const MATERIAL_ACCENT_HEX = '#9fb0c4'
export const MATERIAL_SINK_ICONS: Record<string, string> = {
  recruit: 'game-icons:swordman',
  level: 'game-icons:upgrade',
  equipment: 'game-icons:chest-armor',
  tier: 'game-icons:star-gate',
  forge: 'game-icons:anvil',
  relic: 'game-icons:relic-blade',
  constellation: 'game-icons:star-formation',
  bargain: 'game-icons:card-exchange',
  other: 'game-icons:stone-pile',
}

// ── Material intake rate (header tooltip sparkline) ─────────────────────────
// One bucket per minute over a rolling hour. The window is session-only: after
// an offline break every bucket would read 0 and the tooltip would claim the
// player earns nothing, so loading a save restarts the measurement instead of
// restoring it.
export const MATERIAL_RATE_BUCKET_MS = 60_000
export const MATERIAL_RATE_BUCKET_COUNT = 60
// Below this much measured time the extrapolation to an hour is noise (a single
// drop after 4s would read as 900/h) — the tooltip shows "measuring…" instead.
export const MATERIAL_RATE_MIN_SAMPLE_MS = 30_000

// ── Header material tooltip ────────────────────────────────────────────────
// Scales with the viewport like the rest of the header: ~350px on Full HD,
// ~460px on 4K, so the panel never reads as a postage stamp on a big screen.
export const MATERIAL_TOOLTIP_WIDTH = 'clamp(340px, 19vw, 470px)'
export const MATERIAL_TOOLTIP_GAP_PX = 12
// Live readout cadence for "3m ago" and the per-hour figure while open.
export const MATERIAL_TOOLTIP_TICK_MS = 1_000
// At most this many source/sink rows — the long tail collapses into "Other".
export const MATERIAL_TOOLTIP_BREAKDOWN_ROWS = 4
// Sparkline viewBox (unitless; the SVG stretches to the row via preserveAspectRatio).
export const MATERIAL_SPARK_VIEW_H = 24

// How many expeditions may run at once, and how many contracts sit on the board,
// are no longer fixed — both widen with the ledger rank. See
// EXPEDITION_LEDGER_RANKS and the store getters that read it.

// Die Stufe wird nicht mehr gewürfelt — sie hängt am Ziel, siehe
// EXPEDITION_DEST_* weiter unten und config/economy/expeditionDestinations.ts.
export const EXPEDITION_ID_RANDOM_MAX = 9999 // random suffix range for expedition slot IDs

// Item Equipment
export const ITEM_SLOT_COUNT = 5 // champion team slots that can hold weapon/armor/artefact

/**
 * Durchmesserband des Sternkörpers im Shop-Tab (px), abgebildet auf den Radius
 * der laufenden Phase (`STAR_PHASE_DATA`, 38…140). Bei Standardzoom ist ein
 * Bühnenpixel ein Bildschirmpixel — das hier sind also echte Pixel.
 *
 * **Von 170/240 auf 240/320 gewachsen**, als die Leitzahl des Chime-Ertrags in
 * den KERN der Sonne zog (`SunChimeBoost.vue`). Der Körper trägt seitdem eine
 * Auskunft und ist nicht mehr nur Zierat; 170px hätten für sechs Zeichen plus
 * Etikett nicht gereicht, und ausgerechnet die kleinste Phase ist die, in der
 * jeder Spieler anfängt. Deshalb wächst die UNTERE Kante stärker als die obere.
 *
 * `SHOP_SUN_MAX_DIAMETER` ist zugleich GEOMETRIE und nicht nur Optik — drei
 * Rechnungen lesen sie:
 *
 *   • `forgeTreeLayout.ts` klemmt jeden Knoten außerhalb von
 *     `MAX/2 + FORGE_SUN_EDGE_GAP` (`clampToStage`) — ausgenommen die fünf
 *     Solar Rays, die deshalb über `FORGE_RAY_DIST` von Hand mitwandern müssen.
 *   • `forgeEdgeRoute.ts` setzt denselben Kreis als Hindernis, um das jeder Weg
 *     herumgeführt wird.
 *   • `ForgeTreePanel.vue` leitet daraus `--shop-sun-d`, den Ansatzpunkt der
 *     Wurzelstummel und den Kaufblitz ab.
 *
 * Die Obergrenze steht deshalb nicht frei: `forgeNetGeometry.spec.ts` rechnet
 * nach, dass kein Knoten in der Sonne steckt, und der engste ist der Ray-Knoten
 * (`FORGE_RAY_DIST − 32`). Wer hier hochgeht, geht dort mit.
 */
export const SHOP_SUN_MIN_DIAMETER = 240
export const SHOP_SUN_MAX_DIAMETER = 320

/**
 * Alle wie viel Stufen ein Gebäude seinen Ertrag verdoppelt.
 *
 * Ohne Meilensteine ist der Ertrag linear in der Stufe und die Kosten
 * geometrisch — die CpS aus Gebäuden wächst dann nur logarithmisch mit dem
 * Ausgegebenen. Gemessen: alle sechs Gebäude zusammen trugen rund 1000 von
 * 2,6e7 CpS bei, der Rest kam aus Faktoren, die keine Chimes kosten. Ein
 * Gebäudekauf war damit im Spätspiel bedeutungslos.
 *
 * 25 Stufen sind so gewählt, dass der erste Meilenstein bei rund 5300 Chimes
 * liegt — also in den ersten zwanzig Minuten. Das Frühspiel wird dadurch
 * schneller und zeigt in Stunde 1, worauf man in Stunde 50 spart.
 */

export const AUGMENT_CHOICE_COUNT = 3

/**
 * Wie viele Augments gleichzeitig wirken.
 *
 * Ohne diesen Deckel war die Liste ein reines Push-Array, und
 * `combinedAugmentEffects` multipliziert JEDEN Eintrag: jedes Level-Up legte
 * einen Faktor drauf, mehr CpS führte zu schnelleren Leveln, und das ist eine
 * geschlossene exponentielle Rückkopplung. Gemessen über einen
 * Universums-Durchlauf: Level 5 → 2800 und CpS 10² → 10⁹⁹ in zwei Spielstunden.
 * Das entwertete nebenbei die Level-Kurve, sprengte die Boss-HP-Formel (die auf
 * CpS steht) und machte jedes Prestige zum Rückschritt statt zum Fortschritt.
 *
 * Der Deckel macht die Wahl beim Level-Up überhaupt erst zu einer: vorher bekam
 * man ohnehin alles, nur in anderer Reihenfolge.
 */
export const AUGMENT_ACTIVE_CAP = 10

/**
 * Alle wie viel Level eine Augment-Wahl ausgelegt wird.
 *
 * Stand einmal auf zwei, weil späte Level hinter `LEVEL_SCALING_CAP_LEVEL`
 * wieder schnell fielen und ein Modal je Stufe kein Angebot mehr war, sondern
 * ein Hindernis. Seit `LEVEL_BASE` und `LEVEL_EXPONENT` jede Stufe um
 * Grössenordnungen teurer machen, trägt das nicht mehr: bei zwei Leveln je Wahl
 * füllte sich der Stapel bis `AUGMENT_ACTIVE_CAP` über die halbe Laufzeit nicht.
 */
export const AUGMENT_LEVEL_INTERVAL = 1

/** Wie lange die Auto-Pick-Meldung stehen bleibt, bevor sie ausblendet. */
export const AUTO_PICK_TOAST_MS = 6500
/** Ab dieser Restzeit färbt sich die Uhr warnend — „gleich ist sie weg". */
export const AUTO_PICK_URGENT_MS = 2000
/** Icon des Auto-Picks — Modal-Button, Panel-Zeile und Meldung teilen es sich. */
export const AUTO_PICK_ICON = 'game-icons:cycle'
/** Display names of the four augment rarities (level-up selection cards). */
export const AUGMENT_RARITY_LABEL: Record<string, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
}
export const BUILDING_HISTORY_BUFFER_SIZE = 60

// Material rarity colors (WoW-style tiers) — used by the harvest target picker in
// PlanetSelectTabComponent to color material medallions, names and rarity badges.
export const MATERIAL_RARITY_COLOR: Record<string, string> = {
  common: '#c8c8c8',
  uncommon: '#4dff35',
  rare: '#5aabff',
  epic: '#c37aff',
}

/**
 * Seltenheit von hoch nach niedrig — Sortierreihenfolge, wo Material-Listen
 * nach Wert geordnet werden (Pause-Overlay-Ernte).
 */
export const MATERIAL_RARITY_ORDER: string[] = ['epic', 'rare', 'uncommon', 'common']

// Augment rarity colors — used by the augment list in BardStatsTab.
export const AUGMENT_RARITY_COLOR: Record<string, string> = {
  common: '#9d9d9d',
  rare: '#4a90e2',
  epic: '#a855f7',
  legendary: '#e8c040',
}

// Augments
export const AUGMENT_CLICK_HISTORY_SIZE = 5
export const AUGMENT_GRAVITY_FLIP_DURATION_MS = 3000
/**
 * Rückfallwerte für Augment-Spezialeffekte. Die echten Werte stehen als
 * `specialEffect.params` in config/economy/augments.ts — greifen die hier, fehlt dort
 * ein Parameter, und der Effekt läuft trotzdem mit sinnvoller Wirkung.
 */
export const AUGMENT_OVERCLOCK_DEFAULT_MS = 30_000
export const AUGMENT_OVERCLOCK_DEFAULT_MULT = 2
export const AUGMENT_ECHO_CHAMBER_DEFAULT_MS = 60_000
/** Keyboard Smash würfelt je Stat einen Modifikator in diesem Bereich. */
export const AUGMENT_KEYBOARD_SMASH_DEFAULT_MIN = -0.05
export const AUGMENT_KEYBOARD_SMASH_DEFAULT_MAX = 0.5

// Expedition color system
export interface ExpeditionColorDef {
  key: string
  primary: string
  dim: string
  glowRgb: string
}

export const EXPEDITION_COLORS: ExpeditionColorDef[] = [
  { key: 'gold', primary: '#e8c040', dim: '#c89040', glowRgb: '232,192,64' },
  { key: 'celestial', primary: '#60b0f0', dim: '#3a7ab8', glowRgb: '96,176,240' },
  { key: 'arcane', primary: '#c080e0', dim: '#8040a8', glowRgb: '192,128,224' },
  { key: 'emerald', primary: '#4dc870', dim: '#2a7840', glowRgb: '77,200,112' },
  { key: 'ember', primary: '#e08050', dim: '#a04828', glowRgb: '224,128,80' },
  { key: 'frost', primary: '#70d0e8', dim: '#3080a0', glowRgb: '112,208,232' },
]

/** How long (ms) a spawned expedition slot is visible/available */
export const EXPEDITION_AVAILABILITY_DURATION_MS = 5 * 60 * 1000
/** Minimum interval (ms) between consecutive slot spawns */
export const EXPEDITION_SPAWN_INTERVAL_MS = 2 * 60 * 1000
/** Time threshold (ms) below which a slot enters the "expiring soon" warning state */
export const EXPEDITION_EXPIRY_WARNING_MS = 30_000

// Expedition generation — tiers
export const EXPEDITION_TIERS = {
  common: { rewardMin: 80, rewardMax: 280, durMin: 30, durMax: 100, maxRoles: 2, powerBase: 50 },
  rare: { rewardMin: 280, rewardMax: 750, durMin: 60, durMax: 220, maxRoles: 3, powerBase: 120 },
  epic: { rewardMin: 750, rewardMax: 2800, durMin: 120, durMax: 380, maxRoles: 5, powerBase: 280 },
} as const
export type ExpeditionTier = keyof typeof EXPEDITION_TIERS

/**
 * Die Farbe einer Stufe — die EINE Quelle, seit die Fleet-Karte sie auch braucht.
 *
 * Sie stand fünfmal im Voyages-Ordner und zwei Fassungen waren sich uneinig:
 * `ExpeditionGalaxyMap`, `ExpeditionGalaxyRow` und `ExpeditionOverviewCard` nennen
 * die Werte unten, `ExpeditionFieldCard` `#6ab0e0`/`#b080e0`, und
 * `ExpeditionContractCard` färbt gar nicht nach Stufe, sondern nach der
 * gewürfelten Vertragsfarbe. Die fünf sind noch nicht umgestellt — wer dort
 * vorbeikommt, holt die Farbe von hier.
 */
export const EXPEDITION_TIER_COLORS: Record<ExpeditionTier, string> = {
  common: '#c89040',
  rare: '#7aa8e0',
  epic: '#c090e0',
}

/** Erleuchtete Segmente des Stufenstreifens — Farbe UND Länge sagen dasselbe. */
export const EXPEDITION_TIER_SEGMENTS: Record<ExpeditionTier, number> = {
  common: 1,
  rare: 2,
  epic: 3,
}

// Expedition generation — name parts
export const EXPEDITION_NAME_ADJECTIVES = [
  'Mystical',
  'Ancient',
  'Forgotten',
  'Spectral',
  'Cosmic',
  'Twilight',
  'Arcane',
  'Wandering',
  'Timeless',
  'Hidden',
]
export const EXPEDITION_NAME_TARGETS = [
  'Rift',
  'Freljord',
  'Void',
  'Ionia',
  'Summit',
  'Shrine',
  'Nexus',
  'Jungle',
  'Abyss',
  'Ruins',
]
export const EXPEDITION_NAME_ACTIONS = [
  'Expedition',
  'Patrol',
  'Raid',
  'Trek',
  'Odyssey',
  'Pilgrimage',
]

/**
 * Fallback-Glyphen, wenn eine ID ins Leere zeigt (gelöschtes Augment, unbekanntes
 * Vorzeichen aus einem alten Spielstand). Ohne sie stünde dort eine leere Fläche.
 */
export const AUGMENT_FALLBACK_ICON = 'game-icons:gems'
export const OMEN_FALLBACK_ICON = 'game-icons:all-seeing-eye'

// Expedition mechanics
//
// The success chance is ADDITIVE — base plus a signed contribution per factor.
// It used to be multiplicative (base × role-synergy), which cannot be shown as a
// breakdown: a multiplier has no honest "worth this many points" reading once a
// second one joins it. Every contribution below is a number the player can read
// off the card and change by picking a different champion.

/** Additive penalty when the crew does not cover every required role. */
export const EXPEDITION_ROLE_MATCH_PENALTY = 0.2
/** Max additive power bonus cap in success calculation */
export const EXPEDITION_POWER_BONUS_CAP = 0.4
/** Mirror of the cap for an UNDER-strength crew — a weak crew loses points. */
export const EXPEDITION_POWER_MALUS_CAP = 0.25
/** Scales power ratio into a bonus (powerRatio - 1) * this = bonus */
export const EXPEDITION_POWER_BONUS_SCALE = 0.2
/** Base success probability before role/power modifiers */
export const EXPEDITION_BASE_SUCCESS_CHANCE = 0.5
/**
 * Harte Grenzen der Erfolgsaussicht. Weder ein übermächtiges Team noch ein
 * hoffnungsloses darf die Würfel ganz ausschalten — sonst ist die Expedition
 * keine Entscheidung mehr.
 */
export const EXPEDITION_SUCCESS_CHANCE_MIN = 0.05
export const EXPEDITION_SUCCESS_CHANCE_MAX = 0.95
/** Fraction of base reward granted on expedition failure */
export const EXPEDITION_FAILURE_REWARD_FRACTION = 0.1

// ── Expedition hazards ────────────────────────────────────────────────────────
//
// A hazard is what turns "which champion" into a question. Four of them read a
// champion STAT, so levelling anyone raises the odds; two read the crew's
// COMPOSITION, so who stands next to whom matters even at equal level.
//
// Stat hazards mitigate on a RAMP, not a threshold: half the required stat
// removes half the penalty. A cliff would make every champion below the line
// interchangeable with every other one below it — the ramp makes each level-up
// visible on the card the moment it happens.

/** Crew stat required per member to fully shrug off a stat hazard, per tier. */
export const EXPEDITION_HAZARD_STAT_PER_MEMBER = { common: 26, rare: 55, epic: 100 } as const

/**
 * Crew strength a mission expects PER REQUIRED ROLE, per tier.
 *
 * Measured against the sum of all four stats, where a freshly recruited level-1
 * champion is worth 40. Common therefore sits just above a raw recruit, epic
 * wants a crew somewhere around level 30 to break even.
 */
export const EXPEDITION_CREW_POWER_PER_ROLE = { common: 55, rare: 130, epic: 260 } as const

/** Success-chance points a single unmitigated hazard costs. */
export const EXPEDITION_HAZARD_PENALTY = 0.18

/** How many hazards a mission of each tier carries. */
export const EXPEDITION_HAZARD_COUNT = { common: 1, rare: 1, epic: 2 } as const

export const EXPEDITION_HAZARDS: ExpeditionHazardDef[] = [
  {
    id: 'voidStatic',
    name: 'Void Static',
    icon: 'game-icons:lightning-arc',
    kind: 'stat',
    counterStat: 'focus',
    requirement: 'Send high Focus',
    desc: 'Screaming interference. Only a focused mind keeps the heading.',
  },
  {
    id: 'crushingGravity',
    name: 'Crushing Gravity',
    icon: 'game-icons:heavy-fall',
    kind: 'stat',
    counterStat: 'vitality',
    requirement: 'Send high Vitality',
    desc: 'The well pulls hard. Frail crews do not walk back out.',
  },
  {
    id: 'hostileWardens',
    name: 'Hostile Wardens',
    icon: 'game-icons:crossed-swords',
    kind: 'stat',
    counterStat: 'power',
    requirement: 'Send high Power',
    desc: 'Something guards this place, and it does not negotiate.',
  },
  {
    id: 'sealedVault',
    name: 'Sealed Vault',
    icon: 'game-icons:stone-tablet',
    kind: 'stat',
    counterStat: 'fortune',
    requirement: 'Send high Fortune',
    desc: 'The prize sits behind a lock that opens for the lucky.',
  },
  {
    id: 'ancientSeals',
    name: 'Ancient Seals',
    icon: 'game-icons:tribal-pendant',
    kind: 'kinship',
    counterStat: null,
    requirement: 'Send 2 of the same origin',
    desc: 'The seals answer only to a shared bloodline.',
  },
  {
    id: 'shiftingPaths',
    name: 'Shifting Paths',
    icon: 'game-icons:maze',
    kind: 'diversity',
    counterStat: null,
    requirement: 'Send all different origins',
    desc: 'Every road lies differently. No two travellers may share a home.',
  },
]

export const EXPEDITION_HAZARD_BY_ID = Object.fromEntries(
  EXPEDITION_HAZARDS.map((h) => [h.id, h]),
) as Record<ExpeditionHazardId, ExpeditionHazardDef>

// ── Expedition spoils ─────────────────────────────────────────────────────────
//
// Chimes alone were never a reason to run an expedition — the idle loop prints
// them faster than any mission pays. Materials are: outside of boss kills and
// drifters there is no way to farm a specific one, and the tab has been
// promising them in its subtitle all along. A failed run pays neither.

export const EXPEDITION_SPOILS: Record<ExpeditionTier, ExpeditionSpoilsDef> = {
  common: { materialRolls: 1, materialChance: 0.55, meep: 0 },
  rare: { materialRolls: 2, materialChance: 0.7, meep: 0 },
  epic: { materialRolls: 3, materialChance: 0.85, meep: 1 },
}

// ── Expeditionsziele ──────────────────────────────────────────────────────────
//
// Ein Ziel ist eine befreite Galaxie, und ihre NUMMER setzt Stufe, Lohn, Dauer
// und Schwellen. Der frühere d100-Wurf auf die Stufe ist ersatzlos entfallen:
// bei einem Ziel, das der Spieler ablesen kann, wäre ein verstecktes Los darüber
// eine zweite, unlesbare Entscheidung.
//
// Die beiden Bandgrenzen sind nicht gegriffen — `galaxyStore.tierOf()` springt
// bei genau diesen Zahlen, also wechselt die Expeditionsstufe dort, wo der
// Spieler den Wechsel ohnehin auf der Minimap liest. Mit `GALAXIES_PER_TIER` 9
// liegen die Sprünge bei 3, 12, 21, 30 …; die 9 von vorher ist keiner mehr und
// wandert deshalb auf 12 mit. Wer die Spanne wieder anfasst, zieht HIER nach.
export const EXPEDITION_DEST_RARE_FROM = 3
export const EXPEDITION_DEST_EPIC_FROM = 12

/**
 * Über wie viele Galaxien die Tiefe von 0 auf 1 läuft.
 *
 * War 24 gegen einen Durchlauf von rund 40 Galaxien — die Kurve sättigt also
 * bei etwa 60 % der Strecke, der Rest läuft flach.
 *
 * Anders als alles andere in diesem Umbau ist die Spanne NICHT an der Spielzeit
 * gemessen, sondern an der Galaxienzahl: `depthOf` beschreibt ein ZIEL, und ein
 * Ziel IST eine Galaxie. Zeitlich gerechnet käme 55 heraus, und der flache
 * Schwanz wüchse von 37 % auf 56 % der Strecke. Deshalb proportional zur neuen
 * Streckenlänge (letztes Champion-Tor Galaxie 126): 24/40 × 126 ≈ 75.
 *
 * Hergeleitet, nicht gemessen — derselbe Vorbehalt wie bei
 * `CHAMPION_TIER_REQUIRED_GALAXY`.
 */
export const EXPEDITION_DEST_DEPTH_SPAN = 75

export const EXPEDITION_DEST_REWARD_SLOPE = 1.5
export const EXPEDITION_DEST_DURATION_SLOPE = 0.6
export const EXPEDITION_DEST_POWER_SLOPE = 1.0
export const EXPEDITION_DEST_HAZARD_SLOPE = 0.8
/** Ab dieser Tiefe trägt ein Ziel eine Gefahr mehr, als seine Stufe vorsieht. */
export const EXPEDITION_DEST_HAZARD_STEP = 0.75

/**
 * Wie stark die Ziehung zur zuletzt befreiten Galaxie neigt.
 *
 * Ohne Gewicht läge die Hälfte aller Verträge in Galaxien, die der Spieler vor
 * Stunden hinter sich gelassen hat; mit einem harten Fenster wären frühe Ziele
 * am Tag ihrer Befreiung tot. Bei 30 Zielen ist das jüngste viermal so
 * wahrscheinlich wie das erste — und das erste bleibt der billige, schnelle Lauf
 * für einen ausgedünnten Kader.
 */
export const EXPEDITION_DEST_RECENCY_WEIGHT = 3

/** Crew-Sitze am flachsten Ziel; wächst mit der Tiefe bis `maxRoles` der Stufe. */
export const EXPEDITION_DEST_MIN_ROLES = 1

/** Kartografiestufen je Ziel. */
export const EXPEDITION_CHART_MAX = 5
/** Wegmarken, die ein Champion an EINEM Ziel sammeln kann (Stufe 4). */
export const EXPEDITION_WAYMARK_MAX = 5

/**
 * Die Galaxie, ab der Voyages offensteht — reine ANZEIGEZAHL. Das Tor selbst
 * ist `expeditionChartStore.isUnlocked` (eine befreite Galaxie); beides meint
 * denselben Moment, `expeditionChartStore.spec.ts` bindet sie aneinander.
 */
export const EXPEDITION_UNLOCK_GALAXY = 2

// ── Expedition ledger ─────────────────────────────────────────────────────────
//
// The meta layer: every resolved mission counts once, forever. Ranks widen the
// operation itself (more missions in the field, more contracts on the board)
// rather than handing out a flat number — the reward for running expeditions is
// being able to run more of them.

export const EXPEDITION_LEDGER_RANKS: ExpeditionLedgerRankDef[] = [
  {
    tier: 1,
    name: 'Wayfinder',
    icon: 'game-icons:compass',
    required: 0,
    activeSlots: 3,
    offerSlots: 3,
    chanceBonus: 0,
  },
  {
    tier: 2,
    name: 'Trailblazer',
    icon: 'game-icons:mountain-road',
    required: 12,
    activeSlots: 3,
    offerSlots: 4,
    chanceBonus: 0.02,
  },
  {
    tier: 3,
    name: 'Pathwarden',
    icon: 'game-icons:treasure-map',
    required: 35,
    activeSlots: 4,
    offerSlots: 4,
    chanceBonus: 0.04,
  },
  {
    tier: 4,
    name: 'Starcharter',
    icon: 'game-icons:radar-dish',
    required: 80,
    activeSlots: 4,
    offerSlots: 5,
    chanceBonus: 0.07,
  },
  {
    tier: 5,
    name: 'Voidwalker',
    icon: 'game-icons:black-hole-bolas',
    required: 160,
    activeSlots: 5,
    offerSlots: 5,
    chanceBonus: 0.1,
  },
]

/** How many resolved missions the ledger history keeps for display. */
export const EXPEDITION_LEDGER_HISTORY_MAX = 24

// Gameplay — click base
/**
 * Chimes für den allerersten Klick, bevor irgendein Upgrade greift.
 *
 * War 20, und das machte den Klick zu einer Zahl, an der man nichts ablesen
 * konnte: das Klicker-Gebäude gibt +1 je Stufe, seine erste Stufe war also ein
 * Zuwachs von fünf Prozent — unsichtbar. Bei 1 ist dieselbe Stufe eine
 * Verdopplung.
 *
 * Spät ist dieser Wert ohnehin bedeutungslos. `calculateTotalCPC` addiert am
 * Ende einen Anteil der GESAMTEN CpS je Klick (bis 64 % über Star Forge und
 * Meep-Baum); im Spätspiel stehen dort sechsstellige Beträge gegen die paar
 * hundert aus dem additiven Teil. Die Änderung von 20 auf 1 wirkt deshalb
 * ausschliesslich in den ersten Minuten — dort aber deutlich, weshalb die
 * frühen Preisanker (siehe SHOP_UPGRADE_CATALOG, SOLAR_*_BASE_COST,
 * PLANET_SLOT_CONFIG) mitgesenkt wurden.
 *
 * WICHTIG: Diese Zahl ist keine Kampfgrösse. Der Boss-Klickschaden hat seit
 * dieser Änderung seine eigene Basis (`BOSS_CLICK_DAMAGE_BASE`) — vorher hing
 * beides an diesem einen Wert, und ein Absenken hätte den ersten Boss von 18
 * auf 200 Klicks gebracht. Dass die Kampfbasis inzwischen ebenfalls auf 1
 * steht, ist eine eigene Entscheidung aus demselben Grund (Lesbarkeit der
 * ersten Upgrade-Stufe) und keine Kopplung: die beiden Zahlen können sich seit
 * der Trennung unabhängig bewegen, und `bossClickDamage.spec.ts` hält das fest.
 */
export const CHIMES_PER_CLICK_BASE = 1

// CPS tracking periods (seconds) and update intervals (ms)
export const CPS_PERIOD_1MIN_S = 60
export const CPS_PERIOD_10MIN_S = 600
export const CPS_PERIOD_1HOUR_S = 3600
export const CPS_INTERVAL_10MIN_MS = 10_000
export const CPS_INTERVAL_1HOUR_MS = 60_000

/**
 * Dateisuffixe der Material-Icons (public/img). `Material.image` zeigt auf die
 * 128er-Stufe; das Loot-Banner des Star-Fight-Modals wächst mit der Auflösung
 * über deren Grenze hinaus und greift über `materialIconMd()` zur 256er.
 */
export const MATERIAL_ICON_SM_SUFFIX = '-128.png'
export const MATERIAL_ICON_MD_SUFFIX = '-256.png'

/**
 * Height (px) of the home-planet glyph on the shop's locked champion panel.
 * Sized against the text beside it (name + hint + the one instruction chip):
 * bigger and the card grows past its own content and pushes the cost preview
 * below the fold at Full HD.
 */
export const SHOP_HOME_PLANET_GLYPH_SIZE = 84

// ── Shop domain tabs (ChampionShopComponent) ─────────────────────────────────
/** Gap kept above a section header after the tab's landing scroll (px). */
export const SHOP_JUMP_SCROLL_OFFSET_PX = 8
/**
 * The search row at the head of the grid column: field, reset, collapse-all —
 * one row, pinned whole. It SETS its height via `v-bind` (a described height
 * would drift) and that height goes into the jump scroll as well, or a section
 * header jumped to lands underneath it.
 *
 * The field takes whatever the two buttons leave over, so the row's budget is
 * the one number that can break: spelled out the buttons cost ~260px, and the
 * Full HD grid column is 636 wide. Below LABEL_MIN they drop their labels and
 * stand as squares, which hands the field ~150px back.
 */
/** Row height: 10 + 56 field + 10 + 1 rule. */
export const SHOP_HERO_BAR_H = 77
/** Both buttons WITH labels, including the two 10px gaps: 89 reset + 138
 *  collapse-all + 20, measured in the browser at 2K. */
export const SHOP_HERO_ACTIONS_W = 248
/** Both buttons as 44px squares, including the two 10px gaps. */
export const SHOP_HERO_ACTIONS_ICON_W = 108
/** Floor of the field. Narrower, a query stops being readable while typed. */
export const SHOP_HERO_FIELD_MIN_W = 320
/**
 * Grid-column width (px) from which the buttons carry their labels. Not a round
 * number: Full HD (636) falls below it and 2K (930) above, which is the whole
 * decision — labels where the column can pay for them, squares where it cannot.
 */
export const SHOP_HERO_LABEL_MIN_W = 760
/** Corrective scroll runs after the section expand animation (0.28s) settles. */
export const SHOP_JUMP_EXPAND_SETTLE_MS = 350
/** Idle time after the last scroll event before card animations resume. */
export const SHOP_SCROLL_SETTLE_MS = 150

/**
 * ── Shop „Atlas" ──
 *
 * The shop owns a tab of its own and fills it. It used to be a destination of
 * the team board, lying as a layer over it. A rail 900px wide has no room
 * for a permanent detail column, which is why the detail used to slide OVER the
 * grid — reading a card meant losing the list. Across the full tab (~1240px at
 * Full HD, ~1660 at 2K) facets, grid and detail stand side by side and neither
 * hides the other.
 *
 * The three widths add up: whatever the facets and the detail take, the grid
 * gets the rest. That is why the detail is a percentage between two bounds
 * rather than a fixed number — at Full HD it has to give the grid its four
 * columns back, at 2K it can afford to grow with the splash art.
 *
 * Worked through, because the four numbers only make sense together (grid width
 * = atlas − facets − detail, minus 28px of padding; a column costs
 * CARD_MIN_WIDTH + GRID_GAP):
 *   Full HD  atlas 1240 → detail 372 → grid 636 → 4 columns → card 144px
 *   2K       atlas 1660 → detail 498 → grid 930 → 6 columns → card 142px
 *   4K       atlas 2940 → detail 520 → grid 2188 → 14 columns → card 144px
 * Four at Full HD is the floor that matters: it is what the old 900px rail
 * showed, and this layout must not buy its detail column with a narrower grid.
 *
 * The rail grew from 196 to 232 so the domain switch could move into it out of
 * the command bar; the 36px came off CARD_MIN_WIDTH, not off the column count.
 * That the card lands near 144px on all three screens instead of 154/180/167 is
 * the second gain — one card size everywhere.
 */
export const SHOP_ATLAS_FACET_RAIL_WIDTH = 232
/** Collapsed facet rail — the group icons stay, the chips fold away. */
export const SHOP_ATLAS_FACET_RAIL_COLLAPSED = 52
export const SHOP_ATLAS_DETAIL_MIN_WIDTH = 360
export const SHOP_ATLAS_DETAIL_PCT = 30
export const SHOP_ATLAS_DETAIL_MAX_WIDTH = 520
/**
 * Container width (px) below which the facet rail folds itself. Measured against
 * the ATLAS, not the viewport — the profile modal is inset by `--hud-panel-size`
 * on both sides, so a viewport media query would fold the rail on the wrong
 * screens (see `container-type: inline-size` on .cs-atlas).
 */
export const SHOP_ATLAS_FACET_AUTOFOLD_WIDTH = 1180
/**
 * Card grid geometry. The min width is what `repeat(auto-fill, minmax(…))` in
 * .cs-cards reads, so the column count follows the space the other two zones
 * leave over instead of being fixed per breakpoint.
 */
export const SHOP_ATLAS_CARD_MIN_WIDTH = 140
export const SHOP_ATLAS_CARD_HEIGHT = 168
export const SHOP_ATLAS_GRID_GAP = 10
/** Portrait (px) of the champion holding the seat, in the detail panel's seat row. */
export const SHOP_SEAT_PORTRAIT_SIZE = 28
// Champion Shop — Chimes cost badge icon
export const CHIMES_COST_ICON = 'game-icons:windchimes'

/* ── Voyages-Atlas: zwei Zonen, ein Budget ────────────────────────────────────
   Seitenleiste + Karte teilen sich die Reiterbreite, und was die Leiste nimmt,
   bleibt der Karte. Der Reiter ist beidseitig um `--hud-panel-size` eingerückt —
   die entscheidende Breite ist also die des ATLAS, nicht die des Viewports
   (`container-type: inline-size` + ResizeObserver).

   Präfix VOYAGE_ und nicht EXPEDITION_: reine Reiter-Layoutmaße, die sich von
   den Spielkonstanten EXPEDITION_* in derselben Datei abheben sollen.

   Die DRITTE Zone ist gefallen. Sie trug das Missions-Dossier und war zugleich
   der einzige Weg, eine Expedition loszuschicken — beides liegt jetzt an der
   Marke selbst: die Hover-Karte ist die Auskunft, ein Klick die Geste
   (`utils/game/voyageAction.ts`). Was sie kostete, hat die Galaxie geerbt.

   Die Leiste steht RECHTS, im Rezept der Forge-Detailspalte, und trägt deren
   Griffleiste: 44 px, die auch eingeklappt stehen bleiben. Diese 44 gehen der
   Karte ab — der eine bewusst zugestandene dritte Rand. Eingeklappt gibt die
   Zone dafür die vollen 224 zurück statt der 168 der alten Miniaturspalte:

     Full HD 1920×1080   Reiter 1240 → Zone 268 · Karte  972  (zu: 44 · 1196)
     WUXGA   1920×1200   Reiter 1240 → Zone 268 · Karte  972  (zu: 44 · 1196)
     2K/QHD  2560×1440   Reiter 1660 → Zone 268 · Karte 1392  (zu: 44 · 1616)
     4K      3840×2160   Reiter 2940 → Zone 268 · Karte 2672  (zu: 44 · 2896)

   Der Boden ist ein GEOMETRIE-Boden, kein Geschmacksurteil: `generateGalaxyDots`
   strebt 0.085 Abstand im normalisierten Raum an, zwei benachbarte Häfen liegen
   also 0.085 × Box-Höhe auseinander. Das muss über VOYAGE_SITE_HIT_MIN bleiben,
   sonst sind sie nicht mehr getrennt anklickbar. Nimmt man der Karte Breite,
   hört sie auf zu funktionieren — `__tests__/config/voyagesAtlasLayout.spec.ts`
   bindet das.                                                                */

/** Breiter als die Facettenleiste des Shops (196), weil eine Zeile hier eine
 *  Kartenminiatur trägt und kein Glyph: dieses Bild IST das Wiedererkennen.
 *  Die LISTE allein — der Griff daneben zählt extra. */
export const VOYAGE_RAIL_WIDTH = 224
/**
 * Die Griffleiste, die eingeklappt stehen bleibt.
 *
 * Eigene Zahl statt `FORGE_DETAILS_RAIL_PX`: übernommen ist das Idiom der
 * Forge-Detailspalte, nicht ihr Wert — eine Forge-Konstante in einem
 * Voyages-Bauteil wäre eine Kopplung, die niemand sucht. 44 px tragen beides,
 * das gekippte Wort samt Sperrung und die aufrechte zweistellige Pille darüber.
 *
 * Sie ersetzt die alte 56-px-Miniaturspalte. Deren Auskunft — Zustandskante und
 * Wartezähler JE Galaxie — trägt jetzt der Griff als EINE Summe plus einen
 * Punkt; eine Spalte, die nicht mehr meldet, dass irgendwo etwas wartet, wird
 * vergessen.
 */
export const VOYAGE_RAIL_HANDLE_PX = 44
/**
 * Was die Zone AUSSEN misst — Liste plus Griff.
 *
 * Die Zahl, die der Karte abgeht, und deshalb die, mit der die Specs rechnen.
 * Die Fit-Box klemmt auf allen vier Referenzauflösungen an der BREITE: der
 * Griff geht damit 1:1 von der gemalten Platte ab (Full HD box.w 960 → 916).
 * Eingeklappt gibt die Zone genau `VOYAGE_RAIL_WIDTH` zurück.
 */
export const VOYAGE_RAIL_ZONE_W = VOYAGE_RAIL_WIDTH + VOYAGE_RAIL_HANDLE_PX
/**
 * Das Wort auf dem Griff.
 *
 * Der Name dessen, was HINTER ihm liegt, nicht die Geste und nicht der Reiter,
 * auf dem er ohnehin steht — dieselbe Regel wie `FORGE_DETAILS_RAIL_LABEL`.
 *
 * Er steht seit dem Fall des Kopfbands ALLEIN: die Liste trägt keine eigene
 * Überschrift mehr, weil sie hier schon stand. Dieselbe Aufteilung wie im
 * Skill Tree, wo `StarForgePanel` ebenfalls titellos ist.
 */
export const VOYAGE_RAIL_HANDLE_LABEL = 'GALAXIES'
export const VOYAGE_RAIL_OPEN_TITLE = 'Show galaxies'
export const VOYAGE_RAIL_CLOSE_TITLE = 'Hide galaxies'
/** Die beiden Signale des zugeklappten Griffs — Galaxien, nicht Missionen. */
export const VOYAGE_RAIL_WAITING_TITLE = 'galaxies with something waiting'
export const VOYAGE_RAIL_READY_TITLE = 'a crew is home and waiting'
/** Abstand zwischen Zähler-Pille und Wortende. Die Pille nimmt KEINEN
 *  Fluss-Platz, sonst wanderte das Wort, sobald ein Signal kommt oder geht. */
export const VOYAGE_RAIL_HANDLE_BADGE_GAP = 10
/**
 * Höhe des gekippten Wortes.
 *
 * Nur der Ladeschleier braucht sie — der Griff selbst setzt sie nie, dort
 * ergibt sie sich aus der Schrift. Sie steht hier, damit sein Platzhalter
 * dieselbe Marke zeigt und das Wort beim Aufdecken nicht hereinspringt.
 * Im Browser gemessen, nicht gerechnet: das WORT samt der Zahl dahinter.
 */
export const VOYAGE_RAIL_WORD_H = 125
/**
 * Wie lange die Leiste fährt.
 *
 * Bewegt wird ausschliesslich `transform`; die ZONENBREITE wechselt in EINEM
 * Frame. Sie steht in `paintKey` der Galaxie (`ExpeditionGalaxyMap`) — über die
 * Fahrt animiert malte die Karte bei jedem Auf und Zu rund dreizehnmal neu statt
 * einmal.
 */
export const VOYAGE_RAIL_SLIDE_MS = 220
/** Reiterbreite, unter der sich die Leiste selbst einklappt — am ATLAS gemessen. */
export const VOYAGE_RAIL_AUTOFOLD_WIDTH = 1180
/** Luft ueber bzw. unter der Zeile, die ein Sprung von aussen ins Sichtfeld
 *  rollt — bündig an der Kante läse sie sich als abgeschnitten. */
export const VOYAGE_RAIL_REVEAL_PAD = 8
/* ── Die Geste an der Marke ───────────────────────────────────────────────────
   Die Gründe stehen wörtlich so in den Wachen von `startExpedition` — sie sind
   die Ansage der Hover-Karte UND die Bedingung des Klicks, und ein zweiter
   Wortlaut daneben liefe auseinander.                                        */
export const VOYAGE_ACTION_BLOCK_NO_SLOT = 'No free expedition slot'
export const VOYAGE_ACTION_BLOCK_NO_CREW = 'Every seat needs a champion'
export const VOYAGE_ACTION_BLOCK_EXPIRED = 'This contract has lapsed'

export const VOYAGE_ACTION_SEND_LABEL = 'Click to send'
export const VOYAGE_ACTION_COLLECT_LABEL = 'Click to collect'
/** Die Uhr steht IN dieser Zeile — sie ist der Grund, warum nichts zu tun ist. */
export const VOYAGE_ACTION_WAITING_LABEL = 'Back in'

/** Ein Glyph je Ausgang — dieselbe Familie, die schon die Zustandschips führen. */
export const VOYAGE_ACTION_ICONS = {
  send: 'ph:paper-plane-tilt-fill',
  collect: 'ph:treasure-chest-fill',
  waiting: 'ph:hourglass-medium-fill',
  blocked: 'ph:prohibit-fill',
} as const

/** Die Farbe des Verdikt-Bandes je Ausgang; `lost` ist der eingesammelte
 *  FEHLSCHLAG — derselbe Klick, anderer Ausgang. */
export const VOYAGE_VERDICT_COLORS = {
  send: '#64dcb4',
  collect: '#64dcb4',
  lost: '#cc6050',
  waiting: '#e8c040',
  blocked: '#cc6050',
} as const

/** Die vier Tonstufen der Erfolgsaussicht, gegen EXPEDITION_CHANCE_GOOD/_MID.
 *  `dim` trägt den Vertrag ohne besetzten Sitz — dort gibt es keine Chance. */
export const VOYAGE_ODDS_COLORS = {
  good: '#64dcb4',
  mid: '#e8c040',
  poor: '#cc6050',
  dim: '#7a6f58',
} as const

/** Wie lange eine abgewiesene Marke wackelt. Rein visuell, deshalb real. */
export const VOYAGE_MARK_REFUSE_MS = 420

/* ── Das Fleet-Band ─ die EINE Zeile der Kopfleiste ───────────────────

   Es steht IMMER und misst IMMER dasselbe. Zwei Gründe, beide zwingend:
   `.etc-bar` ist eine auto-Grid-Zeile — eine wachsende Kopfleiste ändert die
   Bühnenhöhe, damit `paintKey`, und malt die Galaxie neu; bei einer Höhe, die an
   der Vertragszahl hinge, geschähe das bei JEDEM Spawn. Und sie nimmt der Fit-Box
   Höhe, die die Klickflächen der Häfen trägt.

   Gebunden ist die AUSSENHÖHE: `VOYAGE_COMMAND_BAR_H` plus der 3-px-Rahmen von
   `.ecb` ergeben 112 — genau sie steckt in den STAGE_HEIGHT-Tabellen beider
   Layout-Specs. `voyagesFleetLayout.spec.ts` bindet das.

   Und 112 ist keine Zahl dieses Reiters allein: das Kopfband des Firmaments
   misst dieselbe (`FIRMAMENT_CREST_BAND_H`). Beide Reiter legen ein Band über
   eine grosse Bühne, und bei 126 gegen 108 sprang deren Oberkante beim Wechsel
   um 18 px. Wer eine der beiden anfasst, fasst beide an.

   Woher die 24 px gegenüber der vorigen Fassung (102) kommen: NICHT von der
   Galaxie, sondern vom Statsband der Karte (96 → 72). Weil
   `fitHeight = Bühne − Band` und beide um dieselben 24 fallen, bleibt die Fit-Box
   auf 561,6 px — Hafentrennung, Fokusgewinn und Kartenboden sind unverändert.
   Mehr geht nicht: `voyageBandFit.spec.ts` bindet
   `VOYAGE_MAP_STATS_VALUE_MIN > 30.4`, und darunter trägt kein Band mehr die
   höchste Spalte. Die Wand liegt bei 131, und nur mit 2 px Innenabstand.        */

/** GESETZTE Höhe des Bandes — sie hängt per `v-bind` an `.ecb-main`, damit die
 *  Summe nicht driften kann, und der Ladeschleier dieselben Maße kennt. Eine
 *  Konstante, die beschreibt statt zu bestimmen, driftet unbemerkt: die Specs
 *  lesen Zahlen, kein DOM.
 *
 *  109 + 3 Rahmen = 112, dieselbe Aussenhöhe wie das Firmament-Band. Die 14 px
 *  gegenüber der vorigen Fassung (123) zahlt NICHT der Inhalt der Karte — ihre
 *  drei Zeilen stehen unverändert —, sondern ihre Polsterung: `_CARD_PAD_Y`
 *  7 → 2 und `_CARD_INSET_Y` 8 → 6. Die Galaxie GEWINNT die 14. */
export const VOYAGE_COMMAND_BAR_H = 109

/** DREIzeilige Karte: Crew, Lohn, Ablesung. Sie ist von 168 auf 210 gewachsen,
 *  damit Lohn, Loot, Dauer und Chance nebeneinander stehen statt um eine
 *  Fußzeile zu streiten — bezahlt mit einer Karte weniger ohne Scrollen.
 *  Die HÖHE bleibt unberührt: sie steckt in beiden STAGE_HEIGHT-Tabellen. */
export const VOYAGE_FLEET_CARD_MIN_W = 210
export const VOYAGE_FLEET_CARD_GAP = 6
/** Kartenhöhe. Sie steht neben der Bandhöhe, weil beide gekoppelt sind — eine
 *  davon frei im CSS wäre die zweite Quelle für dasselbe Budget.
 *
 *  105 + 2 x 2 = 109 füllt das Band wieder exakt; die Karte ist die BINDENDE
 *  Last darin, nicht die Aktionskachel (96). */
export const VOYAGE_FLEET_CARD_H = 105
/** Luft über und unter der Karte — bindet die Kopplung in der Spec. */
export const VOYAGE_FLEET_CARD_PAD_Y = 2
/**
 * So viele Karten müssen auf Full HD OHNE Scrollen stehen — der Preis der
 * breiteren Karte: 4 x 210 + 3 x 6 = 858 in 874 px Bandbreite. Weil die
 * Reihenfolge nach Dringlichkeit ordnet, sind es die vier, die etwas wollen;
 * was dahinter liegt, nennt der `+N`-Chip. Still verschwinden darf nichts.
 */
export const VOYAGE_FLEET_CARD_MIN_VISIBLE = 4
/**
 * Crew-Portrait auf der Karte. Die 34 sind die `-128`-Auflösungsstufe, sonst
 * nichts — die zweite Wand („fünf Sitze passen nicht nebeneinander") ist mit
 * dem Stapel gefallen.
 *
 * Die Sitze STAPELN sich, statt nebeneinander zu stehen: nebeneinander belegten
 * fünf 5 x 34 + 4 x 4 = 186 von 188 px, und die Reisedauer hatte in der Zeile
 * keinen Platz mehr. Gestapelt sind es
 *
 *   34 + 4 x (34 − 12) + 2 x 2 = 126  →  56 px bleiben für die Dauer
 *
 * Der Aussenring ist nicht Zierrat: ohne ihn laufen zwei benachbarte Sitze zu
 * EINER Form zusammen, weil beide dieselbe dunkle Fläche tragen. Er trägt die
 * Kartenfarbe, nicht die des Sitzes — er trennt, er schmückt nicht.
 * `voyagesFleetLayout.spec.ts` bindet den Stapel gegen `EXPEDITION_TIERS`.
 */
export const VOYAGE_FLEET_AVATAR_PX = 34
export const VOYAGE_FLEET_SEAT_OVERLAP = 12
export const VOYAGE_FLEET_SEAT_RING = 2
/**
 * Die DREI Zeilen der Karte und ihr Innenmaß. Sie BESTIMMEN das CSS per
 * `v-bind` — eine Konstante, die nur beschreibt, driftet, und die Spec merkt es
 * nicht: sie liest Zahlen, kein DOM.
 *
 * Vier waren es einmal: Kopfzeile (Glyph + Zielname) und Fortschrittsschiene
 * sind gefallen und haben 31 px an die Zahlen abgegeben. Der Name war das
 * Unwichtigste auf der Karte und steht weiter im Tooltip; die Schiene maß
 * dieselbe Spanne wie die Uhr, nur ungenauer.
 *
 * `voyagesFleetLayout.spec.ts` bindet die Summe: 34 + 30 + 22 + 2 x 2 = 90 in
 * 91 px Innenmaß. Die 91 kommen seit dem Gleichstand der beiden Kopfleisten aus
 * `105 − 2 x 6 − 2` statt aus `109 − 2 x 8 − 2` — dieselbe eine Reserve, nur
 * anders bezahlt: die Karte gab 4 px Höhe ab und holte sie sich aus ihrem
 * eigenen senkrechten Innenabstand zurück.
 *
 * ZWEIMAL haben die Zeilenlücken bezahlt, und beide Male für Schriftgröße: erst
 * 4 → 3 für die 19-px-Uhr der Ablesezeile, dann 3 → 2 für den 28-px-Lohn. Das
 * geht nur, weil die Ertragszeile einen eigenen GRUND trägt — er trennt sie von
 * ihren Nachbarn, also braucht sie die Lücke nicht, um gelesen zu werden.
 *
 * Keine der drei Zeilen hat dafür nachgegeben, und keine kann es: die Crew trägt
 * das 34-px-Portrait, der Ertrag 28-px-Schrift, die Ablesung 19 — und
 * MedievalSharp überschiesst seine Zeilenbox um rund 5 % (28 x 1,05 = 29,4).
 */
export const VOYAGE_FLEET_PAY_H = 30
export const VOYAGE_FLEET_READ_H = 22
export const VOYAGE_FLEET_CARD_ROW_GAP = 2
export const VOYAGE_FLEET_CARD_INSET_Y = 6
export const VOYAGE_FLEET_CARD_INSET_X = 9
/** Rahmen quer und hoch: links 3 (Zustandskante) + rechts 1, oben/unten je 1. */
export const VOYAGE_FLEET_CARD_BORDER_X = 4
export const VOYAGE_FLEET_CARD_BORDER_Y = 2
/**
 * Reservierte Breiten der beiden laufenden Zahlen. Sie sind Pflicht, nicht
 * Kosmetik: MedievalSharp hat keine Tabellenziffern,
 * `font-variant-numeric: tabular-nums` ist im Projekt wirkungslos, und Chance
 * wie Uhr wanderten sonst im Sekundentakt unter dem Zeiger.
 *
 * Beide im Browser GEMESSEN, in der Schriftgröße ihrer Zelle: „100 %" misst bei
 * 13 px 31,45 plus 10 px Innenabstand der Pille, „12:00" bei 19 px 48,48.
 *
 * GEMESSEN heisst hier: per `Range` über den Textknoten, NICHT per `scrollWidth`.
 * An einem Element mit `min-width` meldet `scrollWidth` die BOX, sobald der Text
 * schmaler ist — eine Runde lang stand hier deshalb „52", und das war die Zelle,
 * die sich selbst bestätigte.
 *
 * Die Uhr ist von 17 auf 19 px gewachsen und ihre Zelle mit ihr (46 → 55). Die
 * Reserve über dem Text ist grosszügig und darf es sein: „12:00" ist nicht die
 * breiteste Ziffernfolge, die dort stehen kann, und die Ablesezeile hat Platz —
 * sie trägt seit dem Umbau nur noch Frist und Aussicht, 101 von 188 px. Der
 * Loot steht beim Lohn.
 */
export const VOYAGE_FLEET_ODDS_W = 42
export const VOYAGE_FLEET_TIME_W = 55
/**
 * Die breiteste Plakette als Aussenmaß: „salvage" 50,7 bei 11 px versal plus
 * 12 px Innenabstand und Rahmen. Sie nimmt in der Ablesezeile das Ende, das der
 * Zustand frei lässt — heimgekehrt links statt der Uhr, blockiert rechts statt
 * der Erfolgsaussicht — und muss dort in beiden Fällen neben die Uhr passen.
 */
export const VOYAGE_FLEET_MARK_MAX_PX = 63
/**
 * Die längste Reisedauer, „12m 30s": im Browser GEMESSENE 51,16 bei 13 px, plus
 * knapp 3 px Reserve wie bei der Uhr nebenan.
 *
 * Sie steht seit dem Umbau OBEN, rechts neben dem Crew-Stapel, statt als
 * kleinste Schrift der Karte unter der Uhr. Zwei Gründe: beim Vertrag
 * entscheidet sie mit über „losschicken oder verfallen lassen", und in der
 * Ablesezeile stand sie als Dauer neben einer laufenden Uhr — zwei Zeitangaben
 * derselben Zeile, die Verschiedenes meinen. Auseinander gehalten werden sie
 * jetzt durch die Schreibweise: „2m 30s" mit Einheiten gegen „2:55" mit
 * Doppelpunkt. Die Zahl steht hier, damit die Spec prüfen kann, dass der volle
 * Trupp ihr die Breite lässt.
 */
export const VOYAGE_FLEET_DUR_W = 54
/** Lücke zwischen zwei Gruppen einer Zeile, und die engere innerhalb einer
 *  Gruppe (Glyph gegen Zahl). Die Spec rechnet alle drei Zeilen daraus.
 *  Die enge steht auf 2, seit Glyph und Zahl als EIN Objekt lesen sollen —
 *  sie war einmal 3 und hat der überfüllten Ertragszeile Platz gemacht. */
export const VOYAGE_FLEET_EARN_GAP = 4
export const VOYAGE_FLEET_EARN_TIGHT = 2
/**
 * Chime- und Meep-Artwork auf der Karte — die BEIDEN Erträge, die sie zeigt.
 * Das ECHTE Artwork, kein Iconify-Ersatz: dieselbe Währung sieht überall gleich
 * aus. Beide liegen unter der 34-px-Schwelle, also trägt die `-128`-Stufe.
 *
 * Das Chime BLEIBT bei 16, obwohl seine Zahl auf 28 px gewachsen ist, und das
 * ist kein Versehen: der Lohn braucht im schlimmsten Fall 139 px, und mit einem
 * 20-px-Sprite liefe die Zeile über (190 von 188). Das Sprite ist der einzige
 * Posten, dessen Verkleinerung nichts kostet — eine gekürzte Zahl kostet immer
 * etwas.
 */
export const VOYAGE_FLEET_CHIME_PX = 16
export const VOYAGE_FLEET_LOOT_ICON = 14
/**
 * Die beiden Textbreiten der Ertragszeile, im Browser per `Range` GEMESSEN.
 * Sie sind die Wand, gegen die `voyagesFleetLayout.spec.ts` die Zeile rechnet —
 * läuft sie über, kürzt sich der Lohn selbst weg, also genau die Zahl, wegen der
 * die Zeile da ist.
 *
 * Der Lohn: 139, und die Zahl hat DREI Überraschungen. „999.99M" ist NICHT der
 * schlimmste Fall (119) — die NULL ist breiter als die Neun („000.00M" 123,72),
 * und eine zurückgekehrte Mission trägt das Präfix `+` (`rewardPrefix`), das
 * allein 15 px kostet. Gemessen bei 28 px: „+900.00M" 138,25, als theoretische
 * Obergrenze „+000.00M" 139,19. Die alte 102 war deshalb schon vor dem Umbau zu
 * schmal gebunden: sie mass „999.99M" ohne Präfix.
 *
 * Die Meepzahl: eine Ziffer, denn `EXPEDITION_SPOILS` gibt höchstens 1 Meep.
 * Gebunden ist trotzdem die breiteste (7,53 bei 12 px, gut 8 bei 13) — die Wand
 * soll die Stufen überleben, nicht sie beschreiben.
 */
export const VOYAGE_FLEET_PAY_MAX_PX = 139
export const VOYAGE_FLEET_LOOT_MAX_PX = 9
/**
 * Der Stufenstreifen an der Oberkante. Er liegt ABSOLUT und kostet deshalb keine
 * Zeile — der Höhenhaushalt der Karte hat sie nicht.
 */
export const VOYAGE_FLEET_TIER_BAR_H = 4
export const VOYAGE_FLEET_TIER_BAR_GAP = 2
/**
 * Breite der Rangsäule links und der Aktionssäule rechts — die Bandbreite, die
 * der Kartenspur NICHT zur Verfügung steht. Zusammen höchstens 328, sonst trägt
 * die Spur auf Full HD keine vier Karten mehr:
 *
 *   1212 innen = Rang 176 + 10 + Spur 874 + 10 + Aktionen 142
 *   Spur braucht 4 x 210 + 3 x 6 = 858  →  16 px Reserve
 *
 * Die Aktionssäule ist zweimal geschrumpft (216 → 146 → 142), obwohl ihre
 * Knöpfe zweimal gewachsen sind: erst fielen Focus-Knopf und Dev-Spawn aus der
 * Reihe, dann zog der „Next contract"-Chip nach links. Sie trägt nur noch
 * HANDLUNGEN; die Ablesungen stehen alle links beim Spielstand.
 */
export const VOYAGE_FLEET_RANK_W = 176
export const VOYAGE_FLEET_ASIDE_W = 142
/**
 * Das Rangsiegel und die Uhr daneben — EIN Objekt, keine zwei Blöcke mit
 * Haarlinie dazwischen. Sie teilen die 165 px, die von der Säule bleiben:
 *
 *   176 − VOYAGE_RANK_PAD_R − 1 (Haarlinie rechts) = 165
 *   Siegel 52 + Lücke 8 + Uhrzelle 103 = 163
 *
 * Die Uhr hat den grösseren Teil, und das ist die Rangordnung, nicht Geschmack:
 * sie läuft jede Sekunde, der Rang steht tagelang still. Das Siegel ist von 66
 * auf 52 gefallen, damit sie 45 px tragen kann.
 *
 * Alles davon spielt INNERHALB der 176: die Säule zu verbreitern ginge nur
 * gegen die 16 px Reserve der Kartenspur, und bei 190 blieben davon zwei.
 */
export const VOYAGE_RANK_MEDAL_PX = 52
export const VOYAGE_RANK_MEDAL_GAP = 8
export const VOYAGE_RANK_PAD_R = 10
export const VOYAGE_RANK_RING_R = 24
export const VOYAGE_RANK_RING_STROKE = 3
/** EIGENER Umfang, kein geliehener — ein fremder füllt den Ring falsch. */
export const VOYAGE_RANK_RING_CIRCUMFERENCE = 2 * Math.PI * VOYAGE_RANK_RING_R
/**
 * Breite der Uhrzelle — die reservierte Breite der ZAHL. „2:00" ist ihr
 * breitester Zustand (das Intervall sind zwei Minuten, Cartographer's Pact
 * verkürzt es nur) und misst bei 45 px 100,1; GEMESSEN sind 66,75 bei 30 px,
 * die Breite skaliert linear mit 2,225 px je Schriftpunkt.
 *
 * Bei 30 px pinnte noch das LABEL („NEXT CONTRACT", gemessen 75,34 bei 9 px
 * versal). Ab 40 px überholt die Zahl es, und reserviert bleiben muss die Zelle
 * ohnehin: der Wert wechselt zwischen „2:00", „0:59" und „FULL", und
 * MedievalSharp hat keine Tabellenziffern.
 */
export const VOYAGE_RANK_CLOCK_W = 103
/**
 * Die beiden Aktionskacheln. Sie sind NICHT quadratisch: seit der Chip die
 * Säule verlassen hat, steht darüber und darunter nichts mehr, und die Höhe
 * war der einzige Platz, an dem sie ohne Kosten wachsen konnten — Breite nimmt
 * der Kartenspur weg, Höhe niemandem.
 *
 *   96 + 2 x 6.5 Luft = 109 in ein Band von VOYAGE_COMMAND_BAR_H (109)
 *   2 x 66 + Lücke 10 = 142 = VOYAGE_FLEET_ASIDE_W
 *
 * Vorher deckelte der Chip sie bei 66: `Chip 50.5 + Lücke 6 + Knopf 66 = 122.5`.
 * Die 50.5 waren GEMESSEN — MedievalSharp überschiesst seine Zeilenbox, eine
 * geschätzte 48 hatte die Säule schon 1.5 px über das Band gehoben.
 */
export const VOYAGE_FLEET_ACT_W = 66
export const VOYAGE_FLEET_ACT_H = 96
export const VOYAGE_FLEET_BAND_PAD_X = 14
export const VOYAGE_FLEET_BAND_GAP = 10

/**
 * Harter Boden der Kartenzone. Die Zahl ist ABGELEITET, nicht gewaehlt: bei
 * dieser Breite klemmt die Fit-Box am unteren Ende ihres Seitenverhaeltnis-
 * Bandes, ihre Hoehe ist also `(Breite - Rinne - 2 x Einrueckung) / 1.15`, und
 * `VOYAGE_BERTH_MIN_SEPARATION x Hoehe` muss VOYAGE_SITE_HIT_MIN noch tragen.
 * Bei 620 sind das ~35.3 px gegen 34. `voyagesAtlasLayout.spec.ts` rechnet es
 * nach; wer an VOYAGE_SITE_HIT_MIN oder am Seitenverhaeltnis-Band dreht, muss
 * diese Zahl mitziehen.
 */
export const VOYAGE_MAP_MIN_WIDTH = 620

/**
 * Das Seitenverhältnis-Band, in dem die Galaxie gezeichnet wird, zentriert in
 * der Kartenzone. Hintergrund, Dunst und Funkelsterne füllen weiterhin die GANZE
 * Zone, die Letterbox zeigt sich also nie als Balken, sondern als Tiefraum.
 *
 * Über VOYAGE_MAP_ASPECT_MAX schmiert die Scheibe zum Streifen.
 *
 * Der untere Rand stand einmal bei 1.15 und kostete auf Full HD 59 px Höhe: die
 * Kartenzone misst dort 628×610, also 1.03 — die Box wurde auf 592×515 geklemmt,
 * obwohl 592×574 gepasst hätten. Die Scheibe faltet dabei nicht, weil
 * MINIMAP_GALAXY_SQUASH (0.62) sie ohnehin staucht: bei einer quadratischen Box
 * liest sie sich als 1.6-Ellipse. Erst deutlich unter 1 stellt sie sich auf.
 */
export const VOYAGE_MAP_ASPECT_MIN = 1.0
export const VOYAGE_MAP_ASPECT_MAX = 1.75
/** Einrückung der Fit-Box in der Bühne. `generateGalaxyDots` klemmt Sterne auf
 *  0.06..0.94; das ist der Rest an Rand, den ein Randhafen braucht, damit seine
 *  Marke nicht halb unter der Zonenkante sitzt. */
export const VOYAGE_MAP_INSET_PX = 18
/** Polster zwischen Kartenzone und Bühne, beide Seiten zusammen. */
export const VOYAGE_MAP_GUTTER_PX = 20
/**
 * Längste Backing-Store-Kante in Gerätepixeln. Eine 4K-Bühne bei dpr 2 belegte
 * sonst ~58 MB für ein weiches Sternenfeld. Auf diesem Canvas ist nichts Text
 * und nichts Haarlinie — jede Beschriftung, Uhr und Zahl der Karte ist DOM —,
 * der Rückstand von ~1.2× in genau dieser Konstellation kostet also keine
 * Lesbarkeit.
 */
export const VOYAGE_MAP_MAX_BACKING_PX = 2600

/**
 * Ankerplaetze je Galaxie — GENAU der Deckel, nicht mehr.
 *
 * Der hoechste Expeditionsrang gibt 5 Angebotsplaetze und 5 Missionsplaetze
 * (EXPEDITION_LEDGER_RANKS), und ein Angebot behaelt beim Absenden seinen
 * Schluessel. Mehr als zehn Eintraege koennen also nie in DERSELBEN Galaxie
 * liegen, und ein Auffangfach fuer Ueberzaehlige braucht es nicht.
 *
 * Die Zahl ist kein Spielraum, sondern eine Grenze: jeder weitere Platz drueckt
 * den garantierten Abstand (VOYAGE_BERTH_MIN_SEPARATION). Gemessen ueber 20
 * Galaxien und neun Sternzahlen faellt er von 38.9 px bei zehn Plaetzen auf
 * 34.5 px bei zwoelf — unter die Klickflaeche.
 */
export const VOYAGE_SITE_SLOTS = 10

/**
 * Garantierter Mindestabstand zweier Ankerplaetze im normalisierten Raum, und
 * ebenso zwischen einem Platz und einem geretteten Stern.
 *
 * GEMESSEN, nicht angepeilt — das ist der Unterschied zu den 0.085, die
 * `generateGalaxyDots` anstrebt und nach acht Versuchen aufgibt. Der Wert
 * stammt aus dem Farthest-Point-Sampling in `voyageBerthsOf`, ueber 20 Galaxien
 * x neun Sternzahlen (3 bis 45 Versuche): schlechtester Fall 0.0756 zwischen
 * zwei Plaetzen und 0.0722 zu einem Stern. 0.075 mit Sicherheitsabstand
 * darunter. `voyageSites.spec.ts` haelt die Zusage, `voyagesAtlasLayout.spec.ts`
 * rechnet sie gegen VOYAGE_SITE_HIT_MIN in Pixel um.
 */
export const VOYAGE_BERTH_MIN_SEPARATION = 0.072
/**
 * Groesse des Kandidatenpools, aus dem `voyageBerthsOf` die Plaetze WAEHLT.
 *
 * Die Plaetze kommen NICHT aus `generateGalaxyDots`. Der Zug strebt 0.085
 * Abstand an, garantiert ihn aber nicht — er probiert acht Kandidaten und nimmt
 * danach den letzten, wie er faellt. Gemessen lagen in der dichtesten Galaxie
 * zwei Punkte 25.5 px auseinander, bei VOYAGE_SITE_HIT_MIN 40 also zwei Haefen
 * mit deckenden Klickflaechen. Mehr Punkte anzufordern half nicht: die
 * spaeteren werden in genau die engen Luecken gedrueckt.
 *
 * 240 flaechengleich verteilte Kandidaten aus einem EIGENEN Seed-Strom, aus
 * denen Farthest-Point-Sampling waehlt, loesen das — die Geschichte ist dabei
 * die Startmenge, kein Hafen rueckt ihr also auf den Leib. Der Pool wird einmal
 * je Galaxiewechsel aufgebaut; 240 Punkte gegen 12 Plaetze sind ~3000
 * Abstandsvergleiche, nichts, was einen Frame kostet.
 */
export const VOYAGE_BERTH_CANDIDATE_POOL = 240
/* ── Groesse eines Hafens: aus der ENGE, nicht aus dem schlimmsten Fall ───────
   Hier stand einmal ein festes Klickquadrat von 34 px, abgeleitet aus dem
   dichtesten denkbaren Fall — zehn Haefen in EINER Galaxie auf Full HD, wo der
   garantierte Abstand (VOYAGE_BERTH_MIN_SEPARATION x kuerzere Achse) bei 37 px
   liegt. Der Normalfall sind ein bis drei Vertraege; dort stehen ueber 300 px
   zwischen zwei Haefen und die Marke blieb trotzdem 34. Auf 2K und 4K war sie
   bei VOLLEM Deckel nur die Haelfte bzw. ein Drittel dessen, was die Geometrie
   erlaubt (58 bzw. 112 px Abstand).

   `voyageMarkerSizeFor()` in `utils/game/voyageSites.ts` rechnet die Groesse
   jetzt aus dem kleinsten TATSAECHLICHEN Abstand der gerade gesetzten Haefen.
   Die Regel darunter bleibt unveraendert: die Platte liegt INNERHALB der
   Klickflaeche, und zwei Klickflaechen decken sich nie.                       */

/** Boden der Klickflaeche — der bisherige feste Wert, damit die dichteste
 *  Galaxie nirgends schlechter dasteht als vorher. `voyagesAtlasLayout.spec.ts`
 *  bindet ihn an den garantierten Hafenabstand. */
export const VOYAGE_SITE_HIT_MIN = 34
/** Deckel der Klickflaeche. Auf 4K bindet er statt der Enge: dort stuenden
 *  sonst 180-px-Marken auf der Karte. */
export const VOYAGE_SITE_HIT_MAX = 96
/** Luft zwischen zwei Klickflaechen. Nachbarn beruehren sich damit nie, auch
 *  nicht bei Rundungsfehlern in der Prozentumrechnung der Bühne. */
export const VOYAGE_SITE_HIT_GAP = 4
/** Zweiter Deckel, an der Karte statt an der Enge: eine Marke, die mehr als
 *  dieser Anteil der Boxhoehe misst, ist keine Marke mehr, sondern ein Motiv.
 *  Bindet, wenn eine Galaxie nur einen einzigen Hafen traegt. */
export const VOYAGE_SITE_MAX_SPAN_FRACTION = 0.12
/** Die Platte bleibt INNERHALB der Klickflaeche: eine Platte, die groesser ist
 *  als ihr Ziel, verspricht einen Treffer, den sie nicht einloest. */
export const VOYAGE_SITE_PLATE_INSET = 2
/** Blanker geretteter/verlorener Hafen — ein Hover-Ring, keine Platte. Anteil
 *  an der Platte, damit er mitwaechst (frueher fest 22 zu 32). */
export const VOYAGE_SITE_DOT_RATIO = 0.69
/** Ab dieser Plattengroesse traegt die Marke ihre Uhr selbst, statt sie in eine
 *  Pille darunter zu haengen. Die Ziffer misst `0.2 x Platte`; bei 48 sind das
 *  9.6 px und damit knapp unter der Pille (10.5) — darunter kippt es, und die
 *  Pille mit ihrem eigenen Untergrund ist dann die bessere Auskunft. Full HD
 *  liefert in der dichtesten Galaxie 51 px, faellt also gerade nicht zurueck. */
export const VOYAGE_SITE_INLINE_CLOCK_PX = 48

/**
 * Wie gross die GESCHICHTE auf der grossen Karte gegenueber dem Archivstandbild
 * gemalt wird — geflogene Route und die Koerper der besuchten Sterne.
 *
 * Nicht 1, obwohl `paintGalaxy` sonst alles linear mitwachsen laesst. Auf 320 px
 * lesen sich 36 Sterne als Punkte; linear auf 592 px hochgezogen sind es
 * 31-px-Scheiben, fast so gross wie eine Vertragsplatte (damals fest 32) — die
 * Spirale verschwand unter einer Golddecke und die Marken, die man
 * ANKLICKEN soll, standen gleichberechtigt neben Marken, die nur Vergangenheit
 * sind. Gemessen an der dichtesten Galaxie, die das Spiel kennt
 * (GALAXY_STARS_MAX 36 plus Fehlversuche).
 *
 * Das Archivstandbild laesst diesen Faktor auf 1.
 */
export const VOYAGE_MAP_HISTORY_SCALE = 0.55
/** Deckkraft der geflogenen Route auf der grossen Karte. Bei 36 Etappen wird
 *  aus der Spur sonst ein Netz, das lauter ist als die Haefen darauf. Seit der
 *  befreite Stern ein offener Ring ist, deckt nichts mehr die Spur zu — sie war
 *  danach das lauteste Gold im Bild und musste um dieselbe Stufe zurueck. */
export const VOYAGE_MAP_ROUTE_ALPHA = 0.16

/**
 * Das Datenband an der Unterkante der Kartenbuehne.
 *
 * Es SCHRUMPFT die Fit-Box, statt sich darueberzulegen: Haefen sind anklickbar,
 * und ein Band ueber die ganze Kante laege sonst auf ihren Klickflaechen.
 *
 * ZWEI Gruppen, und die Leserichtung ist WAS WAR | WAS EIN VERTRAG HIER BIETET:
 * Chronik (Sterne, Fahrten) | Payout | die vier Kosten. Die Identitaetszone
 * davor (Ziffer, Name, Stufe) ist GEFALLEN — sie stand vollstaendig ein zweites
 * Mal in der markierten Leistenzeile, bis hin zu denselben Stufen-Hexwerten.
 *
 * Der elastische Ueberschuss liegt auf der Naht zwischen Chronik und Deal, also
 * dort, wo die Gruppen ohnehin auseinandergehen; Payout und Kosten bleiben
 * beieinander, weil sie ZUSAMMEN der Deal sind.
 *
 * 72 und nicht mehr 96: die 24 px sind an die Kopfleiste gegangen, damit deren
 * Karten Crew-Portraits tragen koennen. Weil die Buehne um DIESELBEN 24 faellt,
 * bleibt `fitHeight = Buehne - Band` bei 561,6 px — die Galaxie verliert nichts.
 * Nach unten ist hier Schluss: `voyageBandFit.spec.ts` bindet
 * VOYAGE_MAP_STATS_VALUE_MIN > 30.4, und die hoechste Spalte samt dem
 * 15-px-Abstand des Bodens braucht dafuer 63 px nutzbare Hoehe.
 */
export const VOYAGE_MAP_STATS_BAND_H = 72
/** Luft zwischen Datenband und der Ruecksprung-Pille ins Firmament. Auf dem
 *  Band stuende sie ueber den Zahlen, die die Galaxie ausmachen. */
export const VOYAGE_RETURN_PILL_CLEARANCE = 14
/** Ihre Aussenhoehe, im Browser GEMESSEN (2x12 Polster + 24 Glyph + 2x2 Rahmen)
 *  — gebunden, damit sie den Kartenrand nicht verlaesst.
 *  `voyagesAtlasLayout.spec.ts` rechnet sie gegen die Buehnenhoehe. */
export const VOYAGE_RETURN_PILL_H = 52
/** Senkrechtes Polster des Textblocks: 72 - 2x4 = 64 px nutzbar. Die hoechste
 *  Spalte (Segmente + Wert + Label) belegt davon 63,3 — daraus faellt der
 *  Wert-Deckel, er ist nicht gewaehlt. Der 1-px-`border-top` von `.egsb-row`
 *  geht zusaetzlich ab: nutzbar sind 63. `voyageBandFit.spec.ts` bindet es. */
export const VOYAGE_MAP_STATS_PAD_Y = 4
/** Boden und Deckel der grossen Zahl. Der Boden ist, was auf Full HD in sechs
 *  Spalten passt (gemessene Textbreiten). Der Deckel ist GERECHNET und nicht
 *  gewaehlt: das Band steht vertikal MITTIG, oben wie unten muss also Luft
 *  bleiben. 37 x 1,07 + 11 x 1,5 = 54,3 in 63 nutzbaren (72 minus 2x4 Polster
 *  minus der 1-px-Rahmen) laesst je 4,4 px — im Browser gemessen 4,36 / 4,38.
 *  Schon 38 faellt unter die zugesagte Mindestluft; der Deckel ist damit der
 *  groesstmoegliche Wert, nicht ein gewaehlter. `voyageBandFit.spec.ts` bindet
 *  beides. Die Kurve dazwischen steht als `clamp` im Band. */
export const VOYAGE_MAP_STATS_VALUE_MIN = 31
export const VOYAGE_MAP_STATS_VALUE_MAX = 37
/** Deckel der Label-Schrift — sie steht unter JEDEM Wert des Bandes, unter der
 *  grossen Ablesung wie unter einem Modifikator-Chip, und geht in dieselbe
 *  Hoehenbilanz ein wie er. `voyageBandFit.spec.ts` rechnet sie zusammen. */
export const VOYAGE_MAP_STATS_LABEL_MAX = 11
/** Deckel der Chip-Zahl. Kleiner als die grosse Ablesung, weil eine KOSTE ein
 *  Merkmal des Ziels ist und keine Bilanz des Laufs — und weil vier davon auf
 *  Full HD nebeneinander passen muessen, ohne umzubrechen. Der Payout traegt
 *  dagegen VALUE_MAX: er ist der einzige Gewinn und die dritte grosse Zahl. */
export const VOYAGE_MAP_STATS_CHIP_MAX = 16
/** Deckel der Chip-Beschriftung. Kleiner als `_LABEL_MAX`, damit eine Koste
 *  auch im Wort unter der grossen Ablesung bleibt. Steht per `v-bind` im CSS
 *  und nicht als Literal: `voyageBandFit.spec.ts` rechnet damit. */
export const VOYAGE_MAP_STATS_CHIP_LABEL_MAX = 10
/** Deckel des Chip-Glyphs. Es ist HOEHER als die Chip-Zahl (17 gegen 16) und
 *  bestimmt damit die Zeilenhoehe des Chips — im Browser gemessen 17,0 gegen
 *  16,0. Wer es anhebt, hebt die ganze Chip-Zone. */
export const VOYAGE_MAP_STATS_ICON_MAX = 17
/** Deckel des Chime-Artworks neben dem Payout. Es steht neben einer 37-px-Zahl
 *  und muss unter DEREN Zeilenbox bleiben (37 x 0,94 = 34,78), sonst waechst
 *  die Payout-Spalte an der Ablesung vorbei. `voyageBandFit.spec.ts` bindet es. */
export const VOYAGE_MAP_STATS_ART_MAX = 26
/** Nur der Verlauf. Er laeuft transparent aus und verdeckt nichts, darf also
 *  ueber den Textblock hinausragen und bleibt aus der Fit-Box heraus. */
export const VOYAGE_MAP_STATS_SCRIM_H = 110
/**
 * Untergrenze der Buehnenhoehe — HERGELEITET, nicht gewaehlt: die kuerzere
 * Achse der Fit-Box muss VOYAGE_SITE_HIT_MIN / VOYAGE_BERTH_MIN_SEPARATION
 * (472.2) halten, sonst decken sich zwei Nachbarhaefen. Dazu das Band und
 * beide Insets. Darunter faellt es weg und die Box bekommt die Hoehe zurueck.
 *
 * 472.2 + 72 (Band) + 36 (2 x Inset) = 580.2, aufgerundet mit demselben Polster
 * wie zuvor. Mit dem Band ist auch diese Schwelle um 24 gefallen — haette man
 * sie stehen lassen, waere sie eine willkuerliche Zahl statt einer Herleitung.
 */
export const VOYAGE_MAP_STATS_MIN_H = 596
/** Darunter fallen die vier Kosten weg; Chronik und Payout bleiben. Der Payout
 *  ist der Grund, ueberhaupt hierhin zu schicken — er geht als LETZTES. */
export const VOYAGE_MAP_STATS_MIN_W = 560
/**
 * Was Chronik, Payout und alle VIER Kosten zusammen brauchen, wenn jeder
 * `clamp` auf seinem Boden steht — im Browser GEMESSEN, nicht gerechnet: 494 px
 * in einer Zeile von 566, also 72 px Reserve.
 *
 * Es gab hier einmal eine zweite Schwelle (`_WIDE_W`, 900), unter der Hazards
 * und Crew wegfielen. Sie war eine Folge der Identitaetszone: deren rund 195 px
 * fehlten der Reihe. Ohne sie passen alle vier ueberall dort, wo die Zone
 * ueberhaupt gezeigt wird — eine Schwelle, die nie mehr greift, ist keine
 * Zusicherung, sondern ein Irrtum in Wartestellung.
 *
 * Der Deckel bleibt trotzdem gebunden, denn die Reihe steht auf `nowrap` und
 * ihr Ueberlauf wird STILL abgeschnitten (`voyageBandFit.spec.ts` nennt den
 * Fall): wer einen fuenften Chip anhaengt oder ein Wort verbreitert, bricht die
 * Spec statt des Bildes.
 */
export const VOYAGE_MAP_STATS_ROW_NEED_MIN = 494

/**
 * Die fuenf Ablesungen des Bandes, die am ZIEL haengen — Wort und Erklaersatz.
 *
 * Das Wort traegt die RICHTUNG, nicht die Farbe und nicht der Tooltip: `TRAVEL`
 * und `POWER` standen hier einmal und lasen sich beide als Gewinn, obwohl nur
 * der Chime-Ertrag einer ist. `+64% POWER` neben `game-icons:mighty-force` ist
 * eine FORDERUNG an die eigene Crew, kein Buff auf sie.
 *
 * Der Satz nennt die Mechanik, nicht die Zahl — die steht daneben.
 */
export const VOYAGE_DEST_MODS = {
  payout: {
    label: 'Payout',
    tip: 'Every contract that leads here pays this much more in chimes.',
  },
  longer: { label: 'Longer', tip: 'Crews sent here stay away this much longer.' },
  tougher: {
    label: 'Tougher',
    tip:
      'The crew-strength bar a contract here sets is this much higher. ' +
      'Beat it and the odds rise, fall short and they drop.',
  },
  hazards: {
    label: 'Hazards',
    tip:
      'Every contract from here carries this many hazards. Each one the crew cannot ' +
      `answer costs ${Math.round(EXPEDITION_HAZARD_PENALTY * 100)} points of success chance.`,
  },
  // „Max crew" und nicht „≤4 Crew": MedievalSharp hat kein U+2264, und der
  // Browser holt es sich dann aus der Standardschrift — im Canvas nachgemessen
  // ist die Breite dort identisch zu serif UND sans, waehrend `A`, `4` und `%`
  // sich in allen dreien unterscheiden. Das Zeichen stuende also in einer
  // fremden Schrift neben einer MedievalSharp-Ziffer. Das Wort traegt den
  // Deckel genauso gut.
  crew: { label: 'Max crew', tip: 'The largest crew a contract from here can ask for.' },
} as const

/** Die beiden Ablesungen der Chronik — dieselbe Sprache, aber sie haengen am
 *  gespielten LAUF und nicht am Ziel, deshalb eine eigene Liste. */
export const VOYAGE_MAP_STATS_RECORD_TIPS = {
  stars: 'Stars freed here against stars lost on the way.',
  voyages: 'Expeditions that have come back from this destination.',
} as const

/* ── Die Formlegende — eine dritte Bahn im Band ───────────────────────────────
   Sie stand einmal als Overlay UNTEN LINKS auf der Buehne und ist genau daran
   gestorben: eine dauerhaft belegte Ecke, eine Sperrzone, die Portal und Marken
   verschob, und `tint` unkonditioniert an jede Zeile. Im Band trifft nichts
   davon zu — es schrumpft die Fit-Box ohnehin, unter ihm liegt keine Marke.

   Sie fuellt die Fuge NICHT, sondern steht als eigene `auto`-Bahn LINKS davon:
   der elastische Ueberschuss bleibt damit auf der Bedeutungsnaht zwischen
   Chronik und Deal, wo er hingehoert. */

/**
 * Kachelkante einer Sonde.
 *
 * Sie SKALIERT mit der Buehne, wie jede andere Zone des Bandes auch
 * (`.egsb-val` laeuft auf `clamp(31px, 5.4cqw, 37px)`). Vorher stand sie fest
 * auf 30 — damit blieb auf 4K fast der ganze Fuss leer, und auf Full HD passten
 * die Woerter nicht daneben.
 *
 * Der Boden ist GEMESSEN und knapp: auf Full HD mit ausgeklappter Zielliste
 * (Buehne 952) stehen der Zone 329 px zur Verfuegung, und die Reihe mit
 * Woertern braucht bei einer 24er-Kachel 393. Erst bei 20 passt sie — mit rund
 * 8 px Reserve. Grosse Sonden UND Woerter gibt der Platz dort nicht her; das
 * ist keine Wahl, sondern die Rechnung.
 *
 * Der Deckel ist die HOEHE, nicht der Wille: die Zone darf nicht an
 * `readColumn(VALUE_MAX)` (48,77) vorbeiwachsen, sonst ist die Wand, gegen die
 * alle Schriftdeckel des Bandes gerechnet sind, die falsche. Sie ist damit
 * nicht mehr die flachste Zone des Bandes — `modsColumn` (32) liegt in der
 * Spanne —, aber die grosse Ablesung bleibt die hoechste.
 */
export const VOYAGE_MAP_LEGEND_ICON_MIN = 20
export const VOYAGE_MAP_LEGEND_ICON_MAX = 44
/**
 * Der Sondenradius FOLGT der Kachel: `r = Kachel / 3.06`.
 *
 * HERGELEITET, nicht gewaehlt: der weiteste Ausschlag der fuenf Marken ist
 * `r x 1,3` (der Saum des verlorenen Sterns), die Marke belegt also `2,6 r`.
 * 3,06 haelt sie damit auf konstant 85 % der Kachel — genug, dass sie diese
 * fuellt, und genug Rand, dass ihr `shadowBlur` nicht sichtbar hart abreisst.
 * Der Rest ist Blur, der wie zuvor beschnitten werden darf: `landmarkPad`
 * rechnet mit `LANDMARK_PAD_SPAN` plus 12 px und lag auch bei 4,4 in 22 schon
 * darueber.
 *
 * Der gerechnete Radius wird per `roundLandmarkRadius()` auf halbe Pixel
 * quantisiert — sonst zoege jede Zwischenbreite eigene Sprite-Cache-Eintraege
 * und `LANDMARK_SPRITE_CACHE_MAX` (24) kippte in Thrashing.
 */
export const VOYAGE_MAP_LEGEND_R_RATIO = 3.06
/**
 * Spanne des Wortes. Es stand einmal fest auf 9 und war damit die leiseste
 * Schrift des Bandes — eine Lesehilfe, die man nicht lesen kann, ist keine.
 *
 * Der Boden ist der des ganzen Bandes — `.egsb-lbl--chip` steht auf demselben
 * und ist die kleinste Schrift im Fuss. Er greift auf Full HD, wo die Woerter
 * neben die Sonden muessen; der
 * Deckel liegt UEBER `VOYAGE_MAP_STATS_LABEL_MAX` (11), und das ist Absicht:
 * dort ist 11 der Deckel einer Zone, die selbst mitwaechst. Die Rangordnung
 * traegt hier die DECKKRAFT (0,42 gegen 0,52 der Ablesungen), nicht die
 * Groesse.
 */
export const VOYAGE_MAP_LEGEND_LABEL_MIN = 8
export const VOYAGE_MAP_LEGEND_LABEL_MAX = 18

/**
 * Die Skala ist AFFIN (`cqw x W - Versatz`), nicht proportional — sie muss zwei
 * Enden gleichzeitig treffen, und ein reiner Faktor trifft nur eines.
 *
 * Auf Full HD ist der Fuss gemessen knapp: mit einer 24er Kachel braeuchte die
 * Reihe 393 von 329 px, und der Ueberlauf einer `nowrap`-Zeile wird still
 * abgeschnitten. Der Boden muss dort also stehen bleiben. Auf 2K und 4K blieb
 * die Zone umgekehrt weit unter ihrem Deckel (30 von 44), obwohl daneben
 * Hunderte Pixel frei sind.
 *
 * Der Versatz loest das: an beiden Schwellen (790, 918) und auf Full HD (952)
 * rechnet die Formel UNTER den Boden und wird geklemmt — die Legende waechst
 * erst dort, wo sie ohnehin schon Platz hat. Die gemessenen Bedarfszahlen
 * `_NEED_FULL` / `ZONES_AT_FULL` bleiben damit gueltig, sie sind an genau
 * diesen Schwellen genommen.
 *
 * Beide Versaetze tragen eine halbe bzw. drei Zehntel ZUVIEL, und das ist der
 * Kern: der Boden muss die engste ECHTE Buehne mit Woertern ueberleben, nicht
 * nur die Schwelle. Bei 20,0 loeste die Kachel schon bei 952,38 ab — 0,4 px
 * ueber Full HD mit ausgeklappter Zielliste, eine Rundungswette. Bei 6,0 stand
 * das Wort dort bereits auf 8,28 und frass ueber fuenf Marken samt
 * `letter-spacing` rund 5 der 8 px Reserve, gegen die `_ICON_MIN` hergeleitet
 * ist. Jetzt loesen die Boeden bei 964 und 953 ab, die Deckel greifen bei 1536
 * und 1620 — beide ueber der offenen 2K-Buehne (1372).
 */
export const VOYAGE_MAP_LEGEND_ICON_CQW = 4.2
export const VOYAGE_MAP_LEGEND_ICON_OFFSET = 20.5
export const VOYAGE_MAP_LEGEND_LABEL_CQW = 1.5
export const VOYAGE_MAP_LEGEND_LABEL_OFFSET = 6.3

/**
 * Die fuenf Chronikmarken — was ein gespielter Lauf auf der Karte hinterlaesst.
 *
 * Tor und Ankunftsportal stehen NICHT drin: beide sind gross, einmalig je Karte
 * und tragen ohnehin eine Pille bzw. eine Beschriftung. Route und Haefen auch
 * nicht — eine Linie hat keine Silhouette, und ein Hafen ist der Knopf, den man
 * ohnehin anklickt.
 *
 * Landfall ist EINE Zeile fuer alle sechs Orte: sie teilen sich die Raute und
 * trennen sich erst auf voller Detailstufe durch eine Binnenmarke. Welcher Ort
 * es war, sagt der Hover-Tooltip der Marke.
 *
 * Die Namen sind die `state`-Zeilen der Marken-Tooltips, gekuerzt — kein
 * zweites Vokabular fuer dieselbe Sache.
 *
 * Der Satz steht hier und nicht als Sammelliste an der Reihe: seit die Woerter
 * gefallen sind, ist der Tooltip die EINZIGE Textquelle, und eine Liste an der
 * ganzen Reihe liesse die Zuordnung Symbol → Name nur ueber die Reihenfolge
 * erraten. Je Marke eine eigene Blase ist ausserdem die Hausform — jede Marke
 * auf der Karte traegt ihre eigene.
 */
export const VOYAGE_MAP_LEGEND_ROWS = [
  {
    kind: 'star-freed',
    label: 'Freed',
    tip: 'A star Bard pulled out of this galaxy.',
  },
  { kind: 'star-lost', label: 'Lost', tip: 'A star this run never reached.' },
  { kind: 'landfall-reef', label: 'Landfall', tip: 'A waypoint a leg brushed past.' },
  { kind: 'void-impact', label: 'Void', tip: 'Where a Void creature struck.' },
  { kind: 'drifter-trace', label: 'Drifter', tip: 'Where a drifter crossed the run.' },
] as const

/**
 * MINDESTbedarf der Reihe mit Woertern, an ihrer Schwelle gemessen — Kacheln,
 * Woerter, Boden-Abstaende, Polster und der Rest zur naechsten Zone.
 *
 * Seit die Zone in der ELASTISCHEN Bahn sitzt, ist das nicht mehr ihre Breite:
 * sie nimmt, was die Bahn hergibt, und verteilt den Ueberschuss zwischen ihre
 * Marken (gemessen 368 px auf Full HD, 716 auf 2K, 1940 auf 4K). Was hier steht,
 * ist die Breite, unter die sie NICHT gedrueckt werden darf — darunter faellt
 * der Abstand zwischen zwei Marken unter seinen `gap`-Boden und die
 * `nowrap`-Zeile wird still abgeschnitten.
 */
export const VOYAGE_MAP_LEGEND_NEED_FULL = 326
/** Dasselbe fuer die Sondenreihe allein — fuenf Kacheln, Abstaende, Polster
 *  und die Haarlinie; gemessen 191 an ihrer Schwelle. */
export const VOYAGE_MAP_LEGEND_NEED_ICONS = 158
/**
 * Der Rest, der hinter der Legende stehen bleibt — seit sie vorn steht, ist das
 * die Naht zur CHRONIK und nicht mehr die zum Payout.
 *
 * Er war einmal `VOYAGE_MAP_STATS_BAND_H` (72) — die Fuge sollte so breit sein
 * wie das Band hoch, damit sie als Trennung zweier Gruppen liest. Seit die
 * Legende den freien Fuss NUTZEN soll statt ihn freizuhalten, ist er auf einen
 * sichtbaren Spalt geschrumpft; die Trennung traegt jetzt die Haarlinie der
 * Zone selbst (0,34).
 *
 * Unter 16 wuerde das letzte Wort an dieser Linie kleben — deshalb steht er
 * auch als `padding-right`-Boden im CSS der Zone.
 */
export const VOYAGE_MAP_LEGEND_SEAM_MIN = 24

/**
 * Ab dieser BUEHNENbreite traegt die Legende ihre WOERTER, darunter nur noch
 * die Sonden.
 *
 * Beide Schwellen sind gemessen und HERGELEITET, nicht gewaehlt: sie sind die
 * schmalste Buehne, auf der nach der Reihe noch `VOYAGE_MAP_STATS_BAND_H` an
 * Fuge bleibt. Die Naht hinter der Legende ist Bedeutung — eine Fuge, die
 * schmaler ist als das Band hoch, liest sich nicht mehr als Trennung zweier
 * Gruppen, sondern als Abstand innerhalb einer.
 *
 * Gemessen (Buehne → Fuge nach der Reihe mit Woertern): 900,4 → 12,4 ·
 * 916,1 ist die letzte Sondenstufe · 927,9 → 31,8 · 952 → 48,3 · 1372 → 249,7.
 * Der Ueberlauf einer `nowrap`-Zeile wird hier STILL abgeschnitten.
 *
 * Praktisch traegt jede Desktopaufloesung die Woerter — auch Full HD mit
 * ausgeklappter Zielliste (Buehne 952), und genau dafuer sind die Boeden von
 * Kachel und Schrift so knapp gesetzt.
 */
export const VOYAGE_MAP_LEGEND_MIN_W = 918
/**
 * Ab hier steht die Sondenreihe, darunter faellt die Legende ganz weg.
 *
 * Gemessen (Buehne → Fuge nach der Sondenreihe): 718,4 → 24,1 · 758,4 → 53,4 ·
 * 795,4 → 75,6 · 900,4 → 135,3. Anders als das gefallene `_WIDE_W` greifen
 * beide Schwellen nachweislich — darum sind sie eine Zusicherung und kein
 * Irrtum in Wartestellung.
 */
export const VOYAGE_MAP_LEGEND_ICONS_MIN_W = 790

/* ── Die Manifestreihe — der Zwilling des Datenbands, oben links ──────────────
   Das Band sagt WIE VIELE (`STARS 7/2`), die Reihe sagt WER. Deshalb traegt sie
   keinen Zaehler: dieselbe Zahl zweimal auf einem Bild war schon der Grund,
   aus dem die Identitaetsplakette in dieser Ecke gefallen ist.

   Anders als das Band schrumpft sie die Fit-Box NICHT — unter ihr liegen echte
   Marken. Sie ist deshalb ein Scrim wie der Fuss des Bandes, kein Kasten: was
   darunter liegt, steht abgedunkelt weiter da statt zu verschwinden.

   Alle Masse haengen an der KACHEL, die Kachel an der Buehnenbreite — Muster
   `voyageMarkerSizeFor`. Der Anteil, den die Reihe von der Buehne nimmt, bleibt
   damit ueber alle Aufloesungen derselbe, statt auf 4K zum Streifen zu
   schrumpfen. `voyageManifestFit.spec.ts` bindet die Kette.                  */

/** Portraitkante, Boden und Deckel. Der DECKEL ist die eigentliche Zusicherung:
 *  er haelt die Kachel unter `CHAMPION_ART_MD_MAX_EDGE` (110), damit ueberall
 *  die 256er-Stufe gilt — dieselbe, die Sternmanifest-Tooltip und
 *  Firmament-Knotenkarte laden. Darueber holte der Reiter dieselben Gesichter
 *  ein zweites Mal, und im Bild saehe man nichts davon. */
export const VOYAGE_MANIFEST_TILE_MIN = 56
export const VOYAGE_MANIFEST_TILE_MAX = 96
/** Kachelkante je Pixel Buehnenbreite — 56 px auf Full HD, 81 auf 2K. */
export const VOYAGE_MANIFEST_TILE_SHARE = 0.0588
/** Die Zelle ist breiter als das Bild: darunter steht ein Name, und die
 *  laengsten haben zwoelf Zeichen (`Heimerdinger`, `Aurelion Sol`). Jedes
 *  weitere Pixel kostet siebenfach im Reihenbudget. */
export const VOYAGE_MANIFEST_CELL_RATIO = 1.107
export const VOYAGE_MANIFEST_GAP_RATIO = 0.09
export const VOYAGE_MANIFEST_PAD_RATIO = 0.16
/** Schrift des Namens und des Kopfworts, beide aus der Kachel. Die Boeden sind
 *  die des Datenbands (`.egsb-lbl` 11, Chip-Label 10) — eine Buehne, eine
 *  Stimme. */
export const VOYAGE_MANIFEST_NAME_RATIO = 0.196
export const VOYAGE_MANIFEST_NAME_MAX = 18
export const VOYAGE_MANIFEST_HEAD_RATIO = 0.82
export const VOYAGE_MANIFEST_HEAD_MAX = 12
/** `line-height` von Kopf und Name. Das CSS bestimmt, die Hoehenrechnung
 *  spiegelt — dieselbe Regel wie in `voyageBandFit.spec.ts`. */
export const VOYAGE_MANIFEST_LINE = 1.15
/**
 * Hoechster Anteil der Buehne, den die Reihe belegen darf.
 *
 * Die Zahl ist NICHT gewaehlt, sie folgt aus einer Zusicherung: auf Full HD —
 * der haeufigsten Aufloesung — soll eine volle Galaxie (`GALAXY_STARS_MAX`) in
 * die Reihe passen, ohne dass ab Galaxie 5 dauerhaft ein „+2 more" danebensteht.
 * Bei 0,50 fielen dort sechs Kacheln heraus, bei 0,52 sieben (gemessen 482 von
 * 952 px, also 0,506).
 */
export const VOYAGE_MANIFEST_MAX_SHARE = 0.52
/** Boden der Sitze. Er greift nie — am schmalsten zulaessigen Punkt
 *  (`VOYAGE_MAP_MIN_WIDTH`) fallen vier heraus. Die Spec schreibt genau das aus. */
export const VOYAGE_MANIFEST_SEATS_MIN = 3
/** Verlustzuschlag ueber das Sternsoll hinaus: `attemptResults` waechst mit
 *  jedem verlorenen Stern ungedeckelt weiter, und der Lauf, der diese Reihe
 *  ausgeloest hat, stand auf 7/2. */
export const VOYAGE_MANIFEST_LOSS_SEATS = 2
export const VOYAGE_MANIFEST_SEATS_MAX = GALAXY_STARS_MAX + VOYAGE_MANIFEST_LOSS_SEATS
/** Wie weit der Scrim unter die Reihe und ueber sie hinaus laeuft, in Kacheln.
 *  Er muss AUSLAUFEN statt zu enden — eine harte Kante waere der Kasten, den
 *  diese Ecke ausdruecklich nicht bekommt. */
export const VOYAGE_MANIFEST_SCRIM_FALL_RATIO = 0.7
export const VOYAGE_MANIFEST_SCRIM_FADE_RATIO = 1.2
/** Die Akzentleiste am Kopfwort, im Ton der Galaxie — im Idiom von
 *  `.tip-accent`: Zugehoerigkeit als Leiste. */
export const VOYAGE_MANIFEST_ACCENT_BAR_PX = 2
/** Die beiden Kopfworte der Manifestreihe. Sie unterscheiden sich im LETZTEN
 *  Wort — dort landet das Auge, wenn zwei Baender uebereinanderstehen. */
export const VOYAGE_MANIFEST_LABEL = 'Champions saved'
export const VOYAGE_MANIFEST_LOST_LABEL = 'Champions lost'

/**
 * Takt der Uhren auf der Karte. Bewusst 1000 und nicht HUD_COUNTDOWN_TICK_MS
 * (250): die Fortschrittsspur eines Knotens laeuft ueber
 * `transition: transform 1s linear`, ein schnellerer Takt setzte sie viermal je
 * Sekunde neu an und sie kaeme nie an. Sekunden sind ausserdem alles, was eine
 * mm:ss-Pille zu sagen hat.
 */
export const VOYAGE_CLOCK_TICK_MS = 1000

export const VOYAGE_MARKER_BREATH_MS = 2600
export const VOYAGE_MARKER_BREATH_WARN_MS = 900
export const VOYAGE_MARKER_BOB_MS = 1100
export const VOYAGE_MARKER_HOVER_SCALE = 1.12
/** Ein Hafen, der den Platz wechselt, weil sein Vorgänger die Galaxie verlassen
 *  hat, gleitet statt zu springen — der einzige Fall, in dem eine Marke nicht
 *  dort ist, wo sie war, und die einzige Stelle im Reiter, an der etwas anderes
 *  als transform/opacity übergeht. Die Alternative (Transform-Versatz gegen eine
 *  wandernde Basis) bräuchte einen zweiten Layoutdurchgang je Knoten. */
export const VOYAGE_SITE_MOVE_MS = 320
/** Umfang der SVG-Kreislinie im Fortschrittsring eines Knotens (2π × 16).
 *  EIGENE Konstante und nicht ABILITY_RING_CIRCUMFERENCE — die gehört zu
 *  r = 47.5 der Fähigkeitenkacheln; ein geliehener Umfang füllt den Ring falsch. */
export const VOYAGE_NODE_RING_CIRCUMFERENCE = 100.53

/* Hover-Tooltip einer Marke; die Hülle ist `RpgBadgeTooltip`. */
export const VOYAGE_TIP_WIDTH = 'clamp(300px, 17vw, 348px)'
/** Nur die MISSIONSKARTE. Sie trägt Kopf, Verdikt-Band, zwei 1.7em-Ablesungen
 *  und die Crewreihe; Tor, Portal, Ort und Stern bleiben bei `VOYAGE_TIP_WIDTH`
 *  — um deren drei Zeilen stünde sonst ein Rahmen von Handbreite. */
export const VOYAGE_TIP_MISSION_WIDTH = 'clamp(324px, 18.5vw, 384px)'
export const VOYAGE_TIP_GAP_PX = 10
/** Zehn Marken stehen dicht: ohne Verzug feuert ein Zeigerstrich fünf Tooltips. */
export const VOYAGE_TIP_OPEN_DELAY_MS = 90
/** So groß wie die größte Crew — es gibt deshalb nie ein „+N". */
export const VOYAGE_TIP_CREW_MAX = 5

/**
 * Eine Leistenzeile: Miniatur plus Namenszeile und Kartografiebalken.
 *
 * Diese drei sind die QUELLE — Zeile und Ladeschleier lesen aus ihnen. Vorher
 * standen sie hier, waehrend `ExpeditionGalaxyRow.vue` und `VoyagesTabLoader.vue`
 * je 84x53 verdrahteten; drei Zahlen fuer ein Mass, von denen keine galt.
 *
 * Die Miniatur ist gewachsen, weil die Zaehler auf sie gewandert sind: was eine
 * Galaxie gerade traegt, steht als Marke IM Bild statt als 10-px-Chip darunter.
 * Die Zeile braucht daneben nur noch Namen, Stufe und Kartografiebalken.
 */
export const VOYAGE_RAIL_THUMB_W = 96
export const VOYAGE_RAIL_THUMB_H = 60

/* Die Zeile ist eine KARTE im Rezept der Forge-Liste (`.fut-row`) — eigene
   Fläche, eigener Rahmen, Radius 4. Ihre Polsterung ist NICHT geliehen:
   `.fut-row` steht in einer 400–560 px breiten Spalte und darf dort 17 links
   und 14 rechts. Hier misst die Zeile aussen 208 px
   (224 − 2 Naht − 2 x VOYAGE_RAIL_PAD_X) und trägt eine 96er Miniatur; mit
   17/14 blieben dem Textblock 73 statt 86 px, und dort stehen bereits drei
   Zustandschips UND die Stufe. Der Umbau darf ihm nichts wegnehmen. */
/** Links mehr: 3 px Zustandsstreifen plus 6 px Luft. */
export const VOYAGE_RAIL_ROW_PAD_L = 9
export const VOYAGE_RAIL_ROW_PAD_R = 7
export const VOYAGE_RAIL_ROW_PAD_Y = 7
export const VOYAGE_RAIL_ROW_GAP = 8
/** Der Zustandskanal — eine eigene Ebene, kein `border-left` mehr. */
export const VOYAGE_RAIL_STATE_BAR_PX = 3
/** Polsterung des Rollkastens, beide Seiten. */
export const VOYAGE_RAIL_PAD_X = 7
/**
 * Miniatur plus Polsterung plus die beiden Kanten der Karte — die Summe, nicht
 * eine Wahl. Der Ladeschleier liest sie; verspräche er 72 und die Zeile misst
 * 76, drifteten sechs Skelettzeilen um 24 px.
 */
export const VOYAGE_RAIL_ROW_H = VOYAGE_RAIL_THUMB_H + 2 * VOYAGE_RAIL_ROW_PAD_Y + 2
/**
 * Was dem Textblock neben der Miniatur bleibt — die Zahl, gegen die die
 * Polsterung oben hergeleitet ist, gebunden in `voyagesAtlasLayout.spec.ts`.
 *
 * Genau so viel wie VOR dem Kartenrezept: die Zeile trug damals 3 px
 * Zustandskante plus 1 px Rahmen statt 1 + 1, und 9/7 Polsterung ergibt
 * dieselbe Summe. Der Umbau nimmt dem Textblock also nichts. Im Browser
 * nachgemessen.
 */
export const VOYAGE_RAIL_BODY_MIN = 86
/* ── Voyages-Ladeschleier ─────────────────────────────────────────────────── */
export const VOYAGE_LOADER_MIN_MS = 380
export const VOYAGE_LOADER_SETTLE_FRAMES = 4
export const VOYAGE_LOADER_ACCENT = '#e8c040'
export const VOYAGE_LOADER_ICON = 'game-icons:treasure-map'
export const VOYAGE_LOADER_TITLE = 'VOYAGES'
export const VOYAGE_LOADER_CAPTION = 'Unrolling the chart'

/* ── Etappen einer Voyage ─────────────────────────────────────────────────────
   Eine Reise zerfällt in benannte Abschnitte. Sie sind ABGELEITET, nicht
   gespeichert (`utils/game/voyageLegs.ts`) und ändern an der Auflösung nichts:
   ein Wurf am Ende wie bisher, keine Teilauszahlung. Sie teilen die bestehende
   `durationSeconds` auf und ordnen die bestehenden Hazards einem Abschnitt zu.

   Die Zahl hängt an der STUFE, nicht an der Dauer — die kürzen Star Forge, Meep
   Tree und Providence, eine stark gebuffte Reise verlöre sonst Etappen:

     common (Galaxie 1–3)   1 Hazard   → 1 Etappe
     rare   (4–9)           1 Hazard   → 2 Etappen
     epic   (ab 10)         2 Hazards  → 3 Etappen
     epic   (ab 19)         3 Hazards  → 3 Etappen, die letzte trägt zwei      */

export const VOYAGE_LEG_MAX = 3
/** Streuung der Etappenlängen um den Gleichanteil. Ohne sie liest sich die
 *  Reise als Metronom; darüber wird eine Etappe zum Nebensatz. */
export const VOYAGE_LEG_WEIGHT_MIN = 0.8
export const VOYAGE_LEG_WEIGHT_MAX = 1.2

/** Die Anreise — steht nur, wenn es mehr als eine Etappe gibt. */
export const VOYAGE_LEG_APPROACH_NAMES = [
  'Leave the portal',
  'Cross the shallows',
  'Set the heading',
  'Clear the rim',
  'Drift out',
  'Chart the near reach',
]
/** Etappen, die eine Gefahr tragen. */
export const VOYAGE_LEG_HAZARD_NAMES = [
  'Thread the belt',
  'Ford the rift',
  'Breach the veil',
  'Run the dark',
  'Sound the deep',
  'Weather the tide',
  'Hold the heading',
  'Push the current',
]
/** Die letzte Etappe, wenn sie keine Gefahr trägt. */
export const VOYAGE_LEG_ARRIVAL_NAMES = [
  'Make anchor',
  'Reach the shrine',
  'Come about',
  'Sight the waypoint',
  'Put in',
]

/* ── Die Namen der Sterne einer Galaxie ───────────────────────────────────────

   Ein Stern trug bisher NICHTS als 'rescued' | 'failed' und seinen Index. Die
   Karte konnte damit sagen, DASS dort etwas geschah, nicht WAS. Der Name ist
   ABGELEITET wie das Logbuch — aus `mapSeed` plus eigenem Salz, kein
   Speicherfeld, keine Migration; ein Archiv bekommt seine Namen rueckwirkend
   und behaelt sie.

   Der Name haengt NICHT am Ausgang, und das ist die tragende Regel: ein Stern
   steht auf der Karte, bevor er befreit oder verloren ist. Zoege 'failed' aus
   einem anderen Vokabular, benennte sich dieselbe Marke in dem Moment um, in
   dem ein Rettungstimer ablaeuft. Den Ausgang traegt der Chip daneben.

   Drei Bedeutungsfamilien, alle aus Bards Rolle als Caretaker heraus: das
   gehaltene Licht, ein Schuetzling in jemandes Obhut, ein kleines aufbewahrtes
   Ding. Jedes Wort ist gegen den Bestand gegrept — Bardles Vokabular ist
   gesaettigt, und `Gleam`, `Hollow`, `Watchful`, `Husk`, `Lantern` und `Debt`
   sind an dieser Pruefung gescheitert.                                       */

/** 24 x 20 = 480 Paare. Der Boden ist die dichteste Karte (rund 16 Marken):
 *  beide Haelften muessen 16 Ziehungen tragen, ohne dass `drawUnique` in den
 *  Wiederholungs-Fallback faellt — der letzte Stern waehlt noch aus 8 und 4. */
export const GALAXY_STAR_NAME_ATTRIBUTES = [
  'Nameless',
  'Sleeping',
  'Stubborn',
  'Faithful',
  'Wayward',
  'Unquiet',
  'Reluctant',
  'Guttering',
  'Threadbare',
  'Meek',
  'Crooked',
  'Sullen',
  'Grudging',
  'Untended',
  'Unmarked',
  'Unspoken',
  'Unsought',
  'Overdue',
  'Wintry',
  'Truant',
  'Smouldering',
  'Icebound',
  'Fallow',
  'Uncounted',
]

export const GALAXY_STAR_NAME_NOUNS = [
  'Hearth',
  'Torch',
  'Filament',
  'Tinder',
  'Brazier',
  'Sconce',
  'Censer',
  'Cradle',
  'Foundling',
  'Waif',
  'Captive',
  'Stranger',
  'Guest',
  'Lodestar',
  'Keepsake',
  'Talisman',
  'Marrow',
  'Kernel',
  'Vow',
  'Bauble',
]

/** Eigener Strom, per XOR gesalzen — `mapSeed` ist eine volle 32-Bit-
 *  Zufallszahl, eine Multiplikation braucht es nicht. */
export const GALAXY_STAR_NAME_SEED_SALT = 0x5eed57a1

/** Fangflaeche ueber einer gemalten Sternmarke, als Vielfaches ihres Radius.
 *  Dieselbe Zahl, mit der `landfallHit` seine Raute umfasst. */
export const GALAXY_STAR_MARK_HIT_SCALE = 2.4
/** Boden der Fangflaeche in px — eine Marke bleibt greifbar, auch wenn die
 *  Buehne klein wird. Etwas ueber dem Landfall-Boden (16), weil ein Stern
 *  groesser gemalt wird als eine Ortsraute. */
export const GALAXY_STAR_MARK_HIT_MIN = 18

/* ── Reiseroute auf der Karte ─────────────────────────────────────────────── */

/* ── Caretaker's Gate: der befreite Kern als Hafen ───────────────────────

   Die SICHTBARE Marke malt das Canvas (`core-gate` in `galaxyLandmarks.ts`);
   das DOM-Tor legt nur den Zustand darauf und muss sie deshalb umschliessen.
   Seine Grösse kommt entsprechend aus CORE_GATE_MOUTH_R x CORE_GATE_CROWN_SPAN
   und dem Massstab der Platte, nicht aus einer eigenen Zahl.

   Gedeckelt wird sie trotzdem am nächsten Hafen. Gemessen über 400 Seeds liegt
   der nächste Ankerplatz im Median 42, im fünften Perzentil 27 und im
   schlechtesten Fall 15 Referenzeinheiten vom Kern entfernt (Bezug
   GALAXY_PLATE_REF_W): eine ungedeckelte Torgrösse deckte dort jede zwanzigste
   Galaxie einen Vertrag zu.                                                   */

/**
 * Boden: derselbe wie bei einer Hafenmarke. Wo der Deckel oben greift, weil ein
 * Vertrag dicht am Kern liegt, ist das Tor damit nie das Grösste im Kern — es
 * fällt auf das Mass zurück, das die Karte dort ohnehin trägt.
 */
export const VOYAGE_GATE_MIN_PX = VOYAGE_SITE_HIT_MIN
/** Luft zwischen Torkante und Hafenplatte, und zwischen Torkante und Routenanfang. */
export const VOYAGE_GATE_GAP_PX = 6
/** Atem des ruhenden Tores — langsamer als eine Hafenmarke, es wartet. */
export const VOYAGE_GATE_BREATH_MS = 4200
/** Wie lange eine heimgekehrte Crew am Tor steht, bevor sie eingeht. */
export const VOYAGE_GATE_DOCK_MS = 1400
/** Dauer des Heimflugs vom Hafen zum Tor — Spielzeit, nicht Wanduhr. */
export const VOYAGE_HOMECOMING_MS = 2600
/** Portraits am heimkehrenden Marker; dieselbe Zahl wie unterwegs. */
export const VOYAGE_GATE_FACES = 3
/** Seitliche Auslenkung eines Wegpunkts, als Anteil der Sehnenlänge. Eine
 *  gerade Linie zwischen zwei Punkten liest sich nicht als Reise. */
export const VOYAGE_ROUTE_BOW = 0.16
/** Stützpunkte, in die eine Route für die SVG-Zeichnung aufgelöst wird. */
export const VOYAGE_ROUTE_SAMPLES = 48

/**
 * Portraitgrösse des reisenden Crew-Markers, abgeleitet aus der PLATTE der
 * Hafenmarken (`voyageMarkerSizeFor`) — derselbe Massstab, dieselbe Karte. Fest
 * gewählt ginge die Crew auf 4K unter, wo ein Hafen bis 96 px misst.
 *
 * Der Anteil liegt unter 1/2: die Crew ist unterwegs, der Hafen ist das Ziel —
 * sie darf ihn nicht überstrahlen.
 */
export const VOYAGE_CREW_MARKER_FACE_RATIO = 0.42
export const VOYAGE_CREW_MARKER_FACE_MIN = 20
export const VOYAGE_CREW_MARKER_FACE_MAX = 40
/** Höchstens so viele Portraits am Marker, der Rest wird zu `+n`. */
export const VOYAGE_CREW_MARKER_FACES = 3
export const VOYAGE_CREW_MARKER_PULSE_MS = 2400
