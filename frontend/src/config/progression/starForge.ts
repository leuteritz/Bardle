import type { ForgeNodeDef, ForgeRelicDef, ForgeConstellationDef, ForgeBargainDef } from '@/types'
import {
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_BRANCH_LATE_UNLOCK_PHASE,
  FORGE_LEAF_UNLOCK_PHASE,
  FORGE_BOUGH_UNLOCK_PHASE,
  FORGE_BOUGH_COST_MULTIPLIER,
} from '@/config/constants'

// ═════════════════════════════════════════════════════════════════════════════
// STAR FORGE — static catalog
// Ring 1 (roots) = the 5 solar branches in solarUpgradeStore (unchanged).
// Ring 2 (branches), ring 3 (leaves) und ring 4 (boughs) stehen hier und leben
// im starForgeStore. Root angles: flightSpeed 270°, maxHp 342°,
// chimesPerClick 54°, chimesPerSecond 126°, dmgPerClick 198°.
// ═════════════════════════════════════════════════════════════════════════════

// ── Branches (ring 2) — three per root: root angle − 24°, + 24° and 0° ───────
// Die beiden ersten gehen in Phase 2 auf, der dritte (auf dem Wurzelwinkel)
// eine Phase später. Damit stehen die fünfzehn Zweige exakt gleichmässig mit
// 24° über den ganzen Ring, ohne dass sich der Ring auf einen Schlag füllt.
export const FORGE_BRANCHES: ForgeNodeDef[] = [
  // flightSpeed root (270°)
  {
    id: 'solarSails',
    name: 'Solar Sails',
    parentId: 'flightSpeed',
    tier: 'branch',
    phase: FORGE_BRANCH_UNLOCK_PHASE,
    icon: 'game-icons:caravel',
    color: '#e8c040',
    angleDeg: 246,
    baseCost: 1_500,
    costMultiplier: 2.2,
    materialCost: { stardust: 4 },
    desc: 'Expeditions complete {v}% faster.',
    effectPerLevel: 6,
  },
  {
    id: 'moonOrbit',
    name: 'Moon Orbit',
    parentId: 'flightSpeed',
    tier: 'branch',
    phase: FORGE_BRANCH_UNLOCK_PHASE,
    icon: 'game-icons:moon',
    color: '#f0d878',
    angleDeg: 294,
    baseCost: 2_000,
    costMultiplier: 2.2,
    materialCost: { moon_crystal: 4 },
    desc: 'Offline earnings +{v}%.',
    effectPerLevel: 10,
  },
  // maxHp root (342°)
  {
    id: 'regeneration',
    name: 'Regeneration',
    parentId: 'maxHp',
    tier: 'branch',
    phase: FORGE_BRANCH_UNLOCK_PHASE,
    icon: 'game-icons:remedy',
    color: '#e05050',
    angleDeg: 318,
    baseCost: 1_500,
    costMultiplier: 2.1,
    materialCost: { moon_crystal: 4 },
    desc: 'The sun regenerates {v} HP per second.',
    effectPerLevel: 0.5,
  },
  {
    id: 'aegis',
    name: 'Aegis',
    parentId: 'maxHp',
    tier: 'branch',
    phase: FORGE_BRANCH_UNLOCK_PHASE,
    icon: 'game-icons:bolt-shield',
    color: '#ff8080',
    angleDeg: 6,
    baseCost: 2_200,
    costMultiplier: 2.2,
    materialCost: { nebula_quartz: 3 },
    desc: 'Damage taken reduced by {v}%.',
    effectPerLevel: 5,
  },
  // chimesPerClick root (54°)
  {
    id: 'goldenEcho',
    name: 'Golden Echo',
    parentId: 'chimesPerClick',
    tier: 'branch',
    phase: FORGE_BRANCH_UNLOCK_PHASE,
    icon: 'game-icons:two-coins',
    color: '#52b830',
    angleDeg: 30,
    baseCost: 1_200,
    costMultiplier: 2.1,
    materialCost: { stardust: 4 },
    desc: '{v}% chance a click counts twice.',
    effectPerLevel: 8,
  },
  {
    id: 'resonance',
    name: 'Resonance',
    parentId: 'chimesPerClick',
    tier: 'branch',
    phase: FORGE_BRANCH_UNLOCK_PHASE,
    icon: 'game-icons:sound-waves',
    color: '#8fe060',
    angleDeg: 78,
    baseCost: 1_800,
    costMultiplier: 2.2,
    materialCost: { nebula_quartz: 3 },
    desc: 'Clicks gain +{v}% of your Chimes/Sec.',
    effectPerLevel: 2,
  },
  // chimesPerSecond root (126°)
  {
    id: 'cometMiner',
    name: 'Comet Miner',
    parentId: 'chimesPerSecond',
    tier: 'branch',
    phase: FORGE_BRANCH_UNLOCK_PHASE,
    icon: 'game-icons:mining',
    color: '#e89840',
    angleDeg: 102,
    baseCost: 1_600,
    costMultiplier: 2.2,
    materialCost: { stardust: 5 },
    desc: 'Material drop chance +{v}%.',
    effectPerLevel: 8,
  },
  {
    id: 'quickening',
    name: 'Quickening',
    parentId: 'chimesPerSecond',
    tier: 'branch',
    phase: FORGE_BRANCH_UNLOCK_PHASE,
    icon: 'game-icons:hourglass',
    color: '#ffb860',
    angleDeg: 150,
    baseCost: 2_400,
    costMultiplier: 2.3,
    materialCost: { nebula_quartz: 3 },
    desc: 'Star phase dwell time −{v}%.',
    effectPerLevel: 5,
  },
  // dmgPerClick root (198°)
  {
    id: 'warcry',
    name: 'Warcry',
    parentId: 'dmgPerClick',
    tier: 'branch',
    phase: FORGE_BRANCH_UNLOCK_PHASE,
    icon: 'game-icons:sonic-shout',
    color: '#c060a0',
    angleDeg: 174,
    baseCost: 1_800,
    costMultiplier: 2.2,
    materialCost: { moon_crystal: 4 },
    desc: 'Orbiting champions deal +{v}% DPS.',
    effectPerLevel: 5,
  },
  {
    id: 'shatter',
    name: 'Shatter',
    parentId: 'dmgPerClick',
    tier: 'branch',
    phase: FORGE_BRANCH_UNLOCK_PHASE,
    icon: 'game-icons:shattered-glass',
    color: '#e08cc8',
    angleDeg: 222,
    baseCost: 2_000,
    costMultiplier: 2.2,
    materialCost: { nebula_quartz: 3 },
    desc: 'Damage against bosses +{v}%.',
    effectPerLevel: 8,
  },

  // ── Der dritte Zweig je Wurzel, ab Phase 3 ────────────────────────────────
  // Jeder sitzt auf dem Winkel seiner Wurzel und eröffnet eine Achse, die es in
  // der Forge bisher nur als einmalige Konstellation oder gar nicht gab.
  //
  // Warum ausgerechnet diese fünf: von den zehn Zweigen darüber laufen fünf
  // gegen einen Boden (Solar Sails 0,4 · Aegis 0,25 · Golden Echo 0,8 ·
  // Quickening 0,5) oder sättigen still (Comet Miner — `tryDropMaterial`
  // vergleicht `Math.random() > chance`). Ein dritter Zweig auf einer solchen
  // Achse wäre nur nominell stärker. Diese fünf sitzen auf Gettern ohne Kappe,
  // damit „spürbar stärker" auch ankommt.
  {
    id: 'wayfindersCache',
    name: "Wayfinder's Cache",
    parentId: 'flightSpeed',
    tier: 'branch',
    phase: FORGE_BRANCH_LATE_UNLOCK_PHASE,
    icon: 'game-icons:knapsack',
    color: '#ffe9a8',
    angleDeg: 270,
    baseCost: 5_000,
    costMultiplier: 2.4,
    materialCost: { stardust: 6, solar_essence: 1 },
    desc: 'Expeditions pay {v}% more Chimes.',
    effectPerLevel: 12,
  },
  {
    // Max HP wäre die naheliegende Achse an dieser Wurzel — sie kann es aber
    // NICHT sein: `playerStore.maxHP` ist ein State-Feld, das beim Kauf gebucht
    // wird (Muster `heartOfTheStar`), und ein Zweig trägt den Verstärker seines
    // Blattes. Ein später gekauftes Blatt müsste die Buchung rückwirkend
    // erhöhen. Max HP hängt deshalb am Bough darüber, der keinen Verstärker
    // kennt; hier steht die andere Bewahrungs-Achse des Wandering Caretaker.
    id: 'wardensVigil',
    name: "Warden's Vigil",
    parentId: 'maxHp',
    tier: 'branch',
    phase: FORGE_BRANCH_LATE_UNLOCK_PHASE,
    icon: 'game-icons:heart-tower',
    color: '#ffb0b0',
    angleDeg: 342,
    baseCost: 5_000,
    costMultiplier: 2.4,
    materialCost: { moon_crystal: 6, solar_essence: 1 },
    desc: 'Resource stars linger {v}% longer.',
    effectPerLevel: 6,
  },
  {
    id: 'gildedHarvest',
    name: 'Gilded Harvest',
    parentId: 'chimesPerClick',
    tier: 'branch',
    phase: FORGE_BRANCH_LATE_UNLOCK_PHASE,
    icon: 'game-icons:gold-stack',
    color: '#b0f090',
    angleDeg: 54,
    baseCost: 7_000,
    costMultiplier: 2.5,
    materialCost: { nebula_quartz: 5, void_shard: 1 },
    desc: 'Chimes per click +{v}%.',
    effectPerLevel: 6,
  },
  {
    id: 'tidalDrift',
    name: 'Tidal Drift',
    parentId: 'chimesPerSecond',
    tier: 'branch',
    phase: FORGE_BRANCH_LATE_UNLOCK_PHASE,
    icon: 'game-icons:big-wave',
    color: '#ffd0a0',
    angleDeg: 126,
    baseCost: 8_000,
    costMultiplier: 2.5,
    materialCost: { nebula_quartz: 5, solar_essence: 2 },
    desc: 'Chimes per second +{v}%.',
    effectPerLevel: 6,
  },
  {
    id: 'sunderingWake',
    name: 'Sundering Wake',
    parentId: 'dmgPerClick',
    tier: 'branch',
    phase: FORGE_BRANCH_LATE_UNLOCK_PHASE,
    icon: 'game-icons:impact-point',
    color: '#f0b8e0',
    angleDeg: 198,
    baseCost: 6_000,
    costMultiplier: 2.4,
    materialCost: { moon_crystal: 5, void_shard: 2 },
    desc: 'Clicks splash {v}% of their damage to all enemies.',
    effectPerLevel: 3,
  },
]

// ── Leaves (ring 3) — one per branch, same angle, uniform amplify mechanic ───
// Each leaf level amplifies its parent branch's effect by
// FORGE_LEAF_AMPLIFY_PER_LEVEL (25%).
/**
 * `opts` deckt die Blätter an den späten Zweigen ab: dieselbe Mechanik, aber
 * eine Zehnerpotenz teurer und mit einer steileren Kurve, weil sie einen
 * stärkeren Zweig verstärken. Alles andere bleibt für alle fünfzehn gleich —
 * ein zweiter Fabrikkopf hätte nur dieselben Felder ein zweites Mal aufgezählt.
 */
function leaf(
  id: string,
  name: string,
  parentId: string,
  icon: string,
  color: string,
  angleDeg: number,
  materialCost: Record<string, number>,
  opts: { baseCost?: number; costMultiplier?: number } = {},
): ForgeNodeDef {
  return {
    id,
    name,
    parentId,
    tier: 'leaf',
    phase: FORGE_LEAF_UNLOCK_PHASE,
    icon,
    color,
    angleDeg,
    baseCost: opts.baseCost ?? 25_000,
    costMultiplier: opts.costMultiplier ?? 2.5,
    materialCost,
    desc: 'Amplifies {p} by +{v}%.',
    effectPerLevel: 0,
  }
}

/** Die abweichende Preisfamilie der fünf späten Blätter — eine Stelle, fünf Nutzer. */
const LATE_LEAF_COST = { baseCost: 250_000, costMultiplier: 2.8 }

export const FORGE_LEAVES: ForgeNodeDef[] = [
  leaf('auroraWake', 'Aurora Wake', 'solarSails', 'game-icons:sunrise', '#e8c040', 246, {
    solar_essence: 2,
  }),
  leaf('midnightTide', 'Midnight Tide', 'moonOrbit', 'game-icons:night-sky', '#f0d878', 294, {
    void_shard: 2,
  }),
  leaf('vitalBloom', 'Vital Bloom', 'regeneration', 'game-icons:heart-plus', '#e05050', 318, {
    solar_essence: 2,
  }),
  leaf('echoingBulwark', 'Echoing Bulwark', 'aegis', 'game-icons:shield-echoes', '#ff8080', 6, {
    void_shard: 2,
  }),
  leaf('coinCascade', 'Coin Cascade', 'goldenEcho', 'game-icons:coins-pile', '#52b830', 30, {
    solar_essence: 2,
  }),
  leaf('echoChamber', 'Echo Chamber', 'resonance', 'game-icons:echo-ripples', '#8fe060', 78, {
    void_shard: 2,
  }),
  leaf('deepVein', 'Deep Vein', 'cometMiner', 'game-icons:gold-mine', '#e89840', 102, {
    solar_essence: 2,
  }),
  leaf('timeWeaver', 'Time Weaver', 'quickening', 'game-icons:clockwork', '#ffb860', 150, {
    dark_matter: 1,
  }),
  leaf('warhost', 'Warhost', 'warcry', 'game-icons:swords-power', '#c060a0', 174, {
    void_shard: 2,
  }),
  leaf('starquake', 'Starquake', 'shatter', 'game-icons:implosion', '#e08cc8', 222, {
    dark_matter: 1,
  }),

  // ── Die Blätter an den späten Zweigen ─────────────────────────────────────
  // Sie gehen mit dem regulären Blätter-Ring auf (Phase 4), sind aber die
  // ersten Knoten des Baums, deren Rezeptur durchgehend Dark Matter oder Void
  // Shards verlangt — der Chime-Preis ist zu diesem Zeitpunkt Nebensache, das
  // seltene Material ist der Taktgeber.
  leaf(
    'wanderersCrest',
    "Wanderer's Crest",
    'wayfindersCache',
    'game-icons:laurel-crown',
    '#ffe9a8',
    270,
    { void_shard: 2, dark_matter: 1 },
    LATE_LEAF_COST,
  ),
  leaf(
    'starboundCore',
    'Starbound Core',
    'wardensVigil',
    'game-icons:crystal-cluster',
    '#ffb0b0',
    342,
    { solar_essence: 3, dark_matter: 1 },
    LATE_LEAF_COST,
  ),
  leaf(
    'sunlitTrove',
    'Sunlit Trove',
    'gildedHarvest',
    'game-icons:open-chest',
    '#b0f090',
    54,
    { void_shard: 3, dark_matter: 1 },
    LATE_LEAF_COST,
  ),
  leaf(
    'tidewake',
    'Tidewake',
    'tidalDrift',
    'game-icons:wave-crest',
    '#ffd0a0',
    126,
    { void_shard: 2, dark_matter: 2 },
    LATE_LEAF_COST,
  ),
  leaf(
    'riftshard',
    'Riftshard',
    'sunderingWake',
    'game-icons:crystal-shine',
    '#f0b8e0',
    198,
    { solar_essence: 3, void_shard: 2 },
    LATE_LEAF_COST,
  ),
]

// ── Boughs (ring 4) — der einzige Ring OHNE Obergrenze ───────────────────────
/**
 * Zehn Knoten, die in der Endphase aufgehen und danach nie fertig werden.
 *
 * Sie sind die Antwort auf zwei Löcher im Spätspiel: der Baum stand ab Phase 5
 * vollständig auf „✦ MAX", und Chimes hatten ausser den Planeten-Leveln keine
 * Senke mehr. Jeder hängt an dem Zweig, dessen Achse er fortsetzt — vier davon
 * an Zweigen mit harter Kappe, deren Idee er ungedeckelt weiterträgt.
 *
 * Drei Eigenschaften machen sie sicher, und keine davon ist Geschmack (die
 * ganze Herleitung steht an `FORGE_BOUGH_COST_MULTIPLIER`):
 *   1. Wirkung ADDITIV je Stufe, Kosten GEOMETRISCH → Ertrag logarithmisch.
 *   2. Nur ungedeckelte Achsen — was gegen eine Kappe läuft, wäre ein
 *      bezahltes Nichts.
 *   3. KEIN Material: `nodeMaterialCost` skaliert `qty × nextLevel`, und ohne
 *      Obergrenze liefe der Bedarf ohne Ende linear davon.
 */
function bough(
  id: string,
  name: string,
  parentId: string,
  icon: string,
  color: string,
  angleDeg: number,
  baseCost: number,
  desc: string,
  effectPerLevel: number,
): ForgeNodeDef {
  return {
    id,
    name,
    parentId,
    tier: 'bough',
    phase: FORGE_BOUGH_UNLOCK_PHASE,
    icon,
    color,
    angleDeg,
    baseCost,
    costMultiplier: FORGE_BOUGH_COST_MULTIPLIER,
    materialCost: {},
    desc,
    effectPerLevel,
  }
}

export const FORGE_BOUGHS: ForgeNodeDef[] = [
  bough(
    'wayfarersHoard',
    "Wayfarer's Hoard",
    'wayfindersCache',
    'game-icons:swap-bag',
    '#ffe9a8',
    270,
    2.0e9,
    'Expeditions pay an additional {v}% more.',
    9,
  ),
  bough(
    'sleeplessOrbit',
    'Sleepless Orbit',
    'moonOrbit',
    'game-icons:orbital',
    '#f0d878',
    294,
    1.5e9,
    'Offline earnings +{v}%.',
    8,
  ),
  bough(
    'kindledVigil',
    'Kindled Vigil',
    'wardensVigil',
    'game-icons:round-star',
    '#ffb0b0',
    342,
    2.2e9,
    'Resource stars linger an additional {v}% longer.',
    4,
  ),
  bough(
    'adamantCore',
    'Adamant Core',
    'regeneration',
    'game-icons:stone-sphere',
    '#e05050',
    318,
    1.8e9,
    'Maximum HP of the sun +{v}.',
    90,
  ),
  bough(
    'gildedCascade',
    'Gilded Cascade',
    'gildedHarvest',
    'game-icons:coins',
    '#b0f090',
    54,
    2.0e9,
    'Chimes per click +{v}%.',
    5,
  ),
  bough(
    'deepResonance',
    'Deep Resonance',
    'resonance',
    'game-icons:concentric-crescents',
    '#8fe060',
    78,
    5.0e9,
    'Clicks gain +{v}% of your Chimes/Sec.',
    1,
  ),
  bough(
    'endlessTide',
    'Endless Tide',
    'tidalDrift',
    'game-icons:sands-of-time',
    '#ffd0a0',
    126,
    4.0e9,
    'Chimes per second +{v}%.',
    3,
  ),
  bough(
    'eternalHost',
    'Eternal Host',
    'warcry',
    'game-icons:winged-sword',
    '#c060a0',
    174,
    1.8e9,
    'Champions gain +{v}% experience.',
    8,
  ),
  bough(
    'rendingArc',
    'Rending Arc',
    'sunderingWake',
    'game-icons:explosion-rays',
    '#f0b8e0',
    198,
    2.0e9,
    'Clicks splash an additional {v}% of their damage.',
    1.5,
  ),
  bough(
    'undyingWrath',
    'Undying Wrath',
    'shatter',
    'game-icons:burning-embers',
    '#e08cc8',
    222,
    2.5e9,
    'Damage against bosses +{v}%.',
    10,
  ),
]

export const FORGE_NODES: ForgeNodeDef[] = [...FORGE_BRANCHES, ...FORGE_LEAVES, ...FORGE_BOUGHS]

export function getForgeNode(id: string): ForgeNodeDef | undefined {
  return FORGE_NODES.find((n) => n.id === id)
}

// ── Crafted Relics — fuse a grown branch with materials, leveled Lv 1–3 ──────
export const FORGE_RELICS: ForgeRelicDef[] = [
  {
    id: 'echoOfTheVoid',
    name: 'Echo of the Void',
    rarity: 'epic',
    icon: 'game-icons:evil-moon',
    color: '#c9a0ff',
    requiresNode: 'moonOrbit',
    requiresLevel: 3,
    maxLevel: 5,
    goldCost: 6_000,
    goldMultiplier: 3,
    materialCost: { void_shard: 3, dark_matter: 1 },
    desc: 'Offline earnings +{v}% and extends the offline cap by 4 hours.',
    effectPerLevel: 20,
    sourceLabel: 'Moon Orbit branch + Void Shards',
  },
  {
    id: 'hostOfChampions',
    name: 'Host of Champions',
    rarity: 'rare',
    icon: 'game-icons:swords-emblem',
    color: '#e8c040',
    requiresNode: 'warcry',
    requiresLevel: 3,
    maxLevel: 5,
    goldCost: 3_200,
    goldMultiplier: 3,
    materialCost: { stardust: 20 },
    desc: 'Every orbiting champion deals +{v}% DPS in battle.',
    effectPerLevel: 15,
    sourceLabel: 'Warcry branch + Stardust',
  },
  {
    id: 'heartOfTheStar',
    name: 'Heart of the Star',
    rarity: 'rare',
    icon: 'game-icons:shining-heart',
    color: '#ff8080',
    requiresNode: 'regeneration',
    requiresLevel: 3,
    maxLevel: 5,
    goldCost: 3_600,
    goldMultiplier: 3,
    materialCost: { solar_essence: 4 },
    desc: 'Maximum HP of the sun +{v}.',
    effectPerLevel: 50,
    sourceLabel: 'Regeneration branch + Solar Essence',
  },
  {
    id: 'midasBell',
    name: 'Midas Bell',
    rarity: 'epic',
    icon: 'game-icons:bell-shield',
    color: '#ffdf80',
    requiresNode: 'resonance',
    requiresLevel: 3,
    maxLevel: 5,
    goldCost: 7_500,
    goldMultiplier: 3,
    materialCost: { nebula_quartz: 6, moon_crystal: 10 },
    desc: 'Clicks gain an additional +{v}% of your Chimes/Sec.',
    effectPerLevel: 10,
    sourceLabel: 'Resonance branch + Nebula Quartz',
  },
  {
    id: 'stellarCompass',
    name: 'Stellar Compass',
    rarity: 'rare',
    icon: 'game-icons:compass',
    color: '#86d0ff',
    requiresNode: 'solarSails',
    requiresLevel: 3,
    maxLevel: 5,
    goldCost: 3_400,
    goldMultiplier: 3,
    materialCost: { stardust: 15, nebula_quartz: 4 },
    desc: 'Expeditions complete an additional {v}% faster.',
    effectPerLevel: 5,
    sourceLabel: 'Solar Sails branch + Stardust',
  },
  {
    id: 'emberCrown',
    name: 'Ember Crown',
    rarity: 'epic',
    icon: 'game-icons:crown-coin',
    color: '#ff9a5c',
    requiresNode: 'shatter',
    requiresLevel: 3,
    maxLevel: 5,
    goldCost: 6_500,
    goldMultiplier: 3,
    materialCost: { solar_essence: 3, void_shard: 2 },
    desc: 'Damage against bosses increased by an additional {v}%.',
    effectPerLevel: 12,
    sourceLabel: 'Shatter branch + Solar Essence',
  },
]

export function getForgeRelic(id: string): ForgeRelicDef | undefined {
  return FORGE_RELICS.find((r) => r.id === id)
}

// ── Constellations — one-time fusions of two grown branches ──────────────────
export const FORGE_CONSTELLATIONS: ForgeConstellationDef[] = [
  {
    id: 'stellarWind',
    name: 'Stellar Wind',
    icon: 'game-icons:wind-hole',
    color: '#86d0ff',
    nodeA: 'solarSails',
    nodeB: 'quickening',
    goldCost: 12_000,
    materialCost: { stardust: 15, nebula_quartz: 5 },
    desc: '+18% Chimes/Sec.',
    pairLabel: 'Solar Sails + Quickening · +18% idle',
  },
  {
    id: 'shatteringNova',
    name: 'Shattering Nova',
    icon: 'game-icons:beams-aura',
    color: '#ff9a5c',
    nodeA: 'goldenEcho',
    nodeB: 'shatter',
    goldCost: 15_000,
    materialCost: { solar_essence: 4, moon_crystal: 10 },
    desc: 'Clicks splash 10% of their damage to all enemies.',
    pairLabel: 'Golden Echo + Shatter · click AoE',
  },
  {
    id: 'bulwarkPact',
    name: 'Bulwark Pact',
    icon: 'game-icons:temporary-shield',
    color: '#7bb8ff',
    nodeA: 'aegis',
    nodeB: 'warcry',
    goldCost: 15_000,
    materialCost: { moon_crystal: 12, void_shard: 2 },
    desc: 'All damage taken reduced by an additional 10%.',
    pairLabel: 'Aegis + Warcry · −10% damage taken',
  },
  {
    id: 'prospectorsCharm',
    name: "Prospector's Charm",
    icon: 'game-icons:mine-wagon',
    color: '#e8c040',
    nodeA: 'cometMiner',
    nodeB: 'resonance',
    goldCost: 18_000,
    materialCost: { stardust: 25, solar_essence: 3 },
    desc: 'Every material drop grants +1 extra material.',
    pairLabel: 'Comet Miner + Resonance · +1 drop',
  },
  {
    id: 'eternalOrbit',
    name: 'Eternal Orbit',
    icon: 'game-icons:ouroboros',
    color: '#c9a0ff',
    nodeA: 'moonOrbit',
    nodeB: 'regeneration',
    goldCost: 20_000,
    materialCost: { void_shard: 3, dark_matter: 1 },
    desc: '+15% offline earnings and HP regeneration is doubled.',
    pairLabel: 'Moon Orbit + Regeneration · offline & regen',
  },
  {
    id: 'goldenTempest',
    name: 'Golden Tempest',
    icon: 'game-icons:tornado',
    color: '#ffd76a',
    nodeA: 'goldenEcho',
    nodeB: 'quickening',
    goldCost: 16_000,
    materialCost: { stardust: 20, solar_essence: 2 },
    desc: '+12% Chimes/Click.',
    pairLabel: 'Golden Echo + Quickening · +12% clicks',
  },
  {
    id: 'huntersVigil',
    name: "Hunter's Vigil",
    icon: 'game-icons:night-vision',
    color: '#e08cc8',
    nodeA: 'warcry',
    nodeB: 'shatter',
    goldCost: 17_000,
    materialCost: { moon_crystal: 10, dark_matter: 1 },
    desc: 'Orbiting champions deal an additional +10% DPS.',
    pairLabel: 'Warcry + Shatter · +10% champion DPS',
  },
]

export function getForgeConstellation(id: string): ForgeConstellationDef | undefined {
  return FORGE_CONSTELLATIONS.find((c) => c.id === id)
}

// ── Cosmic Bargain — rotating deal pool ───────────────────────────────────────
export const FORGE_BARGAINS: ForgeBargainDef[] = [
  {
    id: 'midasHour',
    name: 'Midas Hour',
    iconPool: 'fortune',
    desc: 'Doubles Chimes/Click for 30 minutes.',
    basePrice: 15_000,
    discountPct: 0.4,
    kind: 'buff',
    buffId: 'cpcX2',
    durationMs: 30 * 60_000,
  },
  {
    id: 'stellarSurge',
    name: 'Stellar Surge',
    iconPool: 'cosmos',
    desc: 'Doubles Chimes/Sec for 1 hour.',
    basePrice: 20_000,
    discountPct: 0.35,
    kind: 'buff',
    buffId: 'cpsX2',
    durationMs: 60 * 60_000,
  },
  {
    id: 'stellarCache',
    name: 'Stellar Cache',
    iconPool: 'forge',
    desc: 'A crate of materials gathered from passing comets.',
    basePrice: 10_000,
    discountPct: 0.3,
    kind: 'materials',
    materials: { stardust: 12, moon_crystal: 8, nebula_quartz: 4, solar_essence: 1 },
  },
  {
    id: 'solarWinds',
    name: 'Solar Winds',
    iconPool: 'haste',
    desc: 'Skips 25% of the remaining phase dwell time.',
    basePrice: 25_000,
    discountPct: 0.4,
    kind: 'dwellSkip',
    dwellSkipPct: 0.25,
  },
  {
    id: 'goldRush',
    name: 'Gold Rush',
    iconPool: 'fortune',
    desc: 'Trade rare shards for a heap of chimes.',
    basePrice: 0,
    discountPct: 0,
    kind: 'gold',
    materials: { void_shard: 1 },
    goldReward: 8_000,
  },
  {
    id: 'solarBalm',
    name: 'Solar Balm',
    iconPool: 'arcane',
    desc: 'Restores the sun to full HP instantly.',
    basePrice: 8_000,
    discountPct: 0.25,
    kind: 'heal',
  },
  {
    id: 'voidHarvest',
    name: 'Void Harvest',
    iconPool: 'forge',
    desc: 'A rare haul of shards from the dark between stars.',
    basePrice: 22_000,
    discountPct: 0.35,
    kind: 'materials',
    materials: { void_shard: 2, dark_matter: 1, nebula_quartz: 3 },
  },
]

export function getForgeBargain(id: string): ForgeBargainDef | undefined {
  return FORGE_BARGAINS.find((b) => b.id === id)
}
