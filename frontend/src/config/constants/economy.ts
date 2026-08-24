// Wirtschaft: Gebäude-Katalog des Shops, Augment-Effekte, Material-Inventar
// samt Drop-Buchführung und die Expeditionen, die beides verbinden.

import type {
  ExpeditionHazardDef,
  ExpeditionHazardId,
  ExpeditionLedgerRankDef,
  ExpeditionSpoilsDef,
} from '@/types'

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
export const BUILDING_MILESTONE_INTERVAL = 25
export const BUILDING_MILESTONE_MULT = 2

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
/** Taktung der Restsekunden-Anzeige in dieser Meldung. */
export const AUTO_PICK_TICK_MS = 200
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

// ── Shop-Katalog: Klick- und Produktionsgebäude ───────────────────────────
// Grunddaten der sechs Gebäude. Der Store baut daraus seinen Zustand auf und
// hängt `level` an — die Balance-Werte selbst gehören nach config/.
// Kostenkurve: cost = baseCost * costMultiplier ^ level.
export const SHOP_UPGRADE_CATALOG = [
  {
    id: 'chimeClicker',
    name: 'Clicker',
    baseCost: 10,
    baseCPC: 1,
    costMultiplier: 1.2,
    icon: '/img/ChimesPerClick.png',
  },
  {
    id: 'glockenturm',
    name: 'Bell Tower',
    baseCost: 5,
    baseCPS: 1,
    costMultiplier: 1.15,
    icon: '/img/Glockenturm.png',
  },
  {
    id: 'klanggenerator',
    name: 'Chime Array',
    baseCost: 20,
    baseCPS: 3,
    costMultiplier: 1.2,
    icon: '/img/KlangGenerator.png',
  },
  {
    id: 'harmoniewerk',
    name: 'Chime Foundry',
    baseCost: 100,
    baseCPS: 5,
    costMultiplier: 1.25,
    icon: '/img/HarmonieWerk.png',
  },
  {
    id: 'sphaerenMusik',
    name: 'Celestial Spheres',
    baseCost: 500,
    baseCPS: 10,
    costMultiplier: 1.3,
    icon: '/img/SphaerenMusik.png',
  },
  {
    id: 'zeitEcho',
    name: 'Time Echo',
    baseCost: 2000,
    baseCPS: 25,
    costMultiplier: 1.4,
    icon: '/img/ZeitEcho.png',
  },
] as const

// Shop / Production efficiency
export const EFFICIENCY_STARS_DIVISOR = 20
export const EFFICIENCY_STARS_MAX = 5
export const EFFICIENCY_STARS_MIN = 0.5

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
// bei genau 3 und 9, also wechselt die Expeditionsstufe dort, wo der Spieler den
// Wechsel ohnehin auf der Minimap liest.
export const EXPEDITION_DEST_RARE_FROM = 3
export const EXPEDITION_DEST_EPIC_FROM = 9

/**
 * Über wie viele Galaxien die Tiefe von 0 auf 1 läuft.
 *
 * 24 und nicht 40: eine späte Galaxie dauert laut docs/balance.md rund zwei
 * Stunden. Eine Kurve, die erst bei 40 ankommt, gäbe den letzten fünfzehn
 * Galaxien nichts Neues mehr.
 */
export const EXPEDITION_DEST_DEPTH_SPAN = 24

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
/** Corrective scroll runs after the section expand animation (0.28s) settles. */
export const SHOP_JUMP_EXPAND_SETTLE_MS = 350
/** Idle time after the last scroll event before card animations resume. */
export const SHOP_SCROLL_SETTLE_MS = 150

// Champion Shop — Chimes cost badge icon
export const CHIMES_COST_ICON = 'game-icons:windchimes'

/* ── Voyages-Atlas: drei Zonen, ein Budget ────────────────────────────────────
   Dieselbe Budgetrechnung wie der Shop-Atlas (siehe TEAM_SHOP_FACET_RAIL_WIDTH):
   Seitenleiste + Karte + Detail teilen sich die Reiterbreite, und was die beiden
   Ränder nehmen, bleibt der Karte. Der Reiter ist beidseitig um
   `--hud-panel-size` eingerückt — die entscheidende Breite ist also die des
   ATLAS, nicht die des Viewports (`container-type: inline-size` + ResizeObserver).

   Präfix VOYAGE_ und nicht EXPEDITION_: reine Reiter-Layoutmaße, die sich von
   den Spielkonstanten EXPEDITION_* in derselben Datei abheben sollen.

   Durchgerechnet (Reiter = Modal / --team-ui-scale; Karte = Reiter − Leiste −
   Detail; die Fit-Box verliert davon nochmal die Bühnenrinne und
   2 × VOYAGE_MAP_INSET_PX):

     Full HD 1920×1080   Reiter 1240 → Leiste 224 · Detail 368 · Karte 648
     WUXGA   1920×1200   Reiter 1240 → Leiste 224 · Detail 368 · Karte 648
     2K/QHD  2560×1440   Reiter 1660 → Leiste 224 · Detail 448 · Karte 988
     4K      3840×2160   Reiter 2940 → Leiste 224 · Detail 520 · Karte 2196

   Der Boden ist ein GEOMETRIE-Boden, kein Geschmacksurteil: `generateGalaxyDots`
   strebt 0.085 Abstand im normalisierten Raum an, zwei benachbarte Häfen liegen
   also 0.085 × Box-Höhe auseinander. Das muss über VOYAGE_SITE_HIT_MIN bleiben,
   sonst sind sie nicht mehr getrennt anklickbar. Nimmt man der Karte Breite,
   hört sie auf zu funktionieren — `__tests__/config/voyagesAtlasLayout.spec.ts`
   bindet das.                                                                */

/** Breiter als die Facettenleiste des Shops (196), weil eine Zeile hier eine
 *  Kartenminiatur trägt und kein Glyph: dieses Bild IST das Wiedererkennen. */
export const VOYAGE_RAIL_WIDTH = 224
/** Eingeklappt: Ziffern, Stufenpunkte und Zähler bleiben, die Miniaturen falten weg. */
export const VOYAGE_RAIL_COLLAPSED = 56
/** Reiterbreite, unter der sich die Leiste selbst einklappt — am ATLAS gemessen. */
export const VOYAGE_RAIL_AUTOFOLD_WIDTH = 1180
/** Untergrenze der Detailspalte: die Breite, bei der `.ecc-crew` (flex-wrap) noch
 *  zwei Sitze je Zeile trägt, ein Epic-Vertrag mit fünf Sitzen also auf drei
 *  Zeilen umbricht statt auf fünf. */
export const VOYAGE_DETAIL_MIN_WIDTH = 368
export const VOYAGE_DETAIL_PCT = 27
export const VOYAGE_DETAIL_MAX_WIDTH = 520
/** Eingeklappte Detailspalte: nur der senkrechte Griff bleibt stehen. Genau wie
 *  bei der Leiste wird der Körper VERSCHOBEN, nicht abgerissen — die halb
 *  besetzte Crew eines Vertrags überlebt das Falten. */
export const VOYAGE_DETAIL_COLLAPSED = 44
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
 * Das Archivstandbild ist davon nicht betroffen: es malt mit `markers: 'full'`
 * und laesst diesen Faktor auf 1.
 */
export const VOYAGE_MAP_HISTORY_SCALE = 0.55
/** Deckkraft der geflogenen Route auf der grossen Karte. Bei 36 Etappen wird
 *  aus der Spur sonst ein Netz, das lauter ist als die Haefen darauf. */
export const VOYAGE_MAP_ROUTE_ALPHA = 0.22

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
/** Miniatur plus Polsterung — nicht frei gewaehlt, sondern die Summe. */
export const VOYAGE_RAIL_ROW_H = VOYAGE_RAIL_THUMB_H + 12
/** Eingeklappt bleibt ein Quadrat: die Form der Galaxie ist dort nicht mehr zu
 *  erkennen, der Zustand schon. */
export const VOYAGE_RAIL_THUMB_FOLDED = 40
/** Crew-Streifen: eine Chipreihe, Kopfzeile, Polster. Eine Ablesung, keine
 *  Liste — er rollt seitwärts, nie vertikal. */
export const VOYAGE_CREW_STRIP_H = 92
export const VOYAGE_CREW_CHIP_H = 44

/* ── Voyages-Ladeschleier ─────────────────────────────────────────────────── */
export const VOYAGE_LOADER_MIN_MS = 380
export const VOYAGE_LOADER_SETTLE_FRAMES = 4
export const VOYAGE_LOADER_ACCENT = '#e8c040'
export const VOYAGE_LOADER_ICON = 'game-icons:treasure-map'
export const VOYAGE_LOADER_TITLE = 'VOYAGES'
export const VOYAGE_LOADER_CAPTION = 'Unrolling the chart'
