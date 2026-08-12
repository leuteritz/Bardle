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
}
export const MATERIAL_SOURCE_ICONS: Record<string, string> = {
  drop: 'game-icons:falling-rocks',
  harvest: 'game-icons:ringed-planet',
  boss: 'game-icons:crowned-skull',
  drifter: 'game-icons:ufo',
  bargain: 'game-icons:gems',
  expedition: 'game-icons:caravan',
  void: 'game-icons:vortex',
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

// Weighted tier roll (d100): r < epic → epic, r < rare → rare, else common
export const EXPEDITION_TIER_THRESHOLDS = { epic: 10, rare: 40 }
export const EXPEDITION_ID_RANDOM_MAX = 9999 // random suffix range for expedition slot IDs

// Item Equipment
export const ITEM_SLOT_COUNT = 5 // champion team slots that can hold weapon/armor/artefact

/** Shop sun disc diameter band (px), mapped from the current phase radius (STAR_PHASE_DATA, 30…140).
 *  Mirrors the Planets-tab sun style but a smaller band so it stays inside the branch-icon ring
 *  (ICON_DIST = 285). Grows with phase. */
export const SHOP_SUN_MIN_DIAMETER = 170
export const SHOP_SUN_MAX_DIAMETER = 240

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
 * Die Wahl hing an JEDEM Level-Up. Solange die Levelkurve exponentiell bremste,
 * war das selbstregulierend — sie war zugleich der Grund für diese Bremse
 * (siehe `LEVEL_SCALING_THRESHOLD`). Seit die Bremse bei
 * `LEVEL_SCALING_CAP_LEVEL` aufhört zu wachsen, fallen späte Level wieder
 * schnell, und ein Modal je Stufe wäre kein Angebot mehr, sondern ein Hindernis.
 *
 * Zwei Level je Wahl entkoppelt die Häufigkeit von der Kurve, ohne dem Spieler
 * etwas wegzunehmen: der Stapel ist ohnehin auf `AUGMENT_ACTIVE_CAP` gedeckelt,
 * das schwächste Augment fällt beim Nachrücken heraus. Es kommt also nicht
 * weniger an — es kommt seltener und in grösseren Schritten.
 */
export const AUGMENT_LEVEL_INTERVAL = 2

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
 * auf 200 Klicks gebracht.
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
