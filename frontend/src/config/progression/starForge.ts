import type { ForgeNodeDef, ForgeRelicDef, ForgeConstellationDef, ForgeBargainDef } from '@/types'
import {
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_LEAF_UNLOCK_PHASE,
  FORGE_WARD_UNLOCK_PHASE,
  FORGE_PACT_UNLOCK_PHASE,
  FORGE_CROWN_UNLOCK_PHASE,
  FORGE_BOUGH_UNLOCK_PHASE,
  FORGE_BOUGH_COST_MULTIPLIER,
  FORGE_CROWN_BASE_COST,
} from '@/config/constants'

// ═════════════════════════════════════════════════════════════════════════════
// STAR FORGE — static catalog
//
// Sieben Ringe, einer je Sonnenphase. Ring 1 (roots) = die fünf Solar Rays im
// solarUpgradeStore; alles darüber steht hier und lebt im starForgeStore:
//
//   Ring 2 Branches (Spark) · 3 Leaves (Dawn) · 4 Wards (Zenith) ·
//   5 Covenants (Swell) · 6 Crowns (Pyre) · 7 Boughs ∞ (Collapse)
//
// Fünfzehn Winkel tragen den Baum, jeweils 24° auseinander, abgeleitet aus den
// Wurzelwinkeln: flightSpeed 270°, maxHp 342°, chimesPerClick 54°,
// chimesPerSecond 126°, dmgPerClick 198°. **Jeder Knoten hängt am Knoten
// DESSELBEN Winkels auf dem Ring direkt innen** — die Kette überspringt keinen
// Ring, und die Verbindungslinie ist damit überall radial.
// ═════════════════════════════════════════════════════════════════════════════

// ── Branches (ring 2) — three per root: root angle − 24°, + 24° and 0° ───────
// Alle fünfzehn gehen gemeinsam in Spark auf. Vorher kamen die letzten fünf
// eine Phase später, damit sich der Ring nicht auf einen Schlag füllt — seit
// jede Phase einen eigenen Ring öffnet, ist das nicht mehr nötig und wäre eine
// Ausnahme in einer Leiter, die keine verträgt. Die Staffelung liegt jetzt in
// der Höchststufe (Stufe 1 bei Freischaltung, +1 je Phase) und im Preis: die
// fünf auf dem Wurzelwinkel bleiben die teuren.
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

  // ── Der dritte Zweig je Wurzel ────────────────────────────────────────────
  // Jeder sitzt auf dem Winkel seiner Wurzel und eröffnet eine Achse, die es in
  // der Forge bisher nur als einmalige Konstellation oder gar nicht gab.
  // Er geht mit den anderen zehn auf, kostet aber rund das Dreifache — der
  // Preis ist seither das, was ihn zum späten Zweig macht.
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
    phase: FORGE_BRANCH_UNLOCK_PHASE,
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
    phase: FORGE_BRANCH_UNLOCK_PHASE,
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
    phase: FORGE_BRANCH_UNLOCK_PHASE,
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
    phase: FORGE_BRANCH_UNLOCK_PHASE,
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
    phase: FORGE_BRANCH_UNLOCK_PHASE,
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

  // ── Die Blätter an den teuren Zweigen ─────────────────────────────────────
  // Sie gehen mit dem ganzen Blätter-Ring auf (Dawn), sind aber die ersten
  // Knoten des Baums, deren Rezeptur durchgehend Dark Matter oder Void Shards
  // verlangt. Das ist seit der Ring-Leiter ihre eigentliche Sperre: in Dawn
  // liegt von beidem praktisch nichts im Lager, der Knoten steht also sichtbar
  // („Saving up") und trotzdem unerreichbar da — Material ist der Taktgeber,
  // nicht mehr die Sonne.
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

// ── Wards (ring 4) — wo der Baum über sich hinausgreift ─────────────────────
/**
 * Fünfzehn Knoten, einer je Winkel, offen ab Zenith.
 *
 * **Ihre Klammer ist nicht eine Zahl, sondern eine GRENZE.** Jeder Ward sitzt
 * auf einem Wert, zu dem die Forge bis hierhin gar nichts zu sagen hatte: der
 * Takt des Void, die Frequenz der Drifter und Vorzeichen, die Preise der
 * Gebäude, Items und Champion-Level, die Abklingzeit der Bard-Fähigkeiten, das
 * LP eines Sieges, die HP eines Bosses. Die drei Ringe darunter haben den Baum
 * verstärkt; dieser greift heraus.
 *
 * Zwei Klassen bleiben ausgeschlossen, und beide aus `docs/balance.md`:
 *   • Alles, was `otherDps` hebt (Champion-DPS, Turret-DPS, passiver
 *     Boss-Schaden) — es steckt im Boss-HP-Schätzer und kürzt sich weg.
 *   • Alles, was still sättigt (`materialDropMult`, `extraDropCount`).
 * Deshalb senkt `hollowCore` die Boss-HP DIREKT statt den Schaden zu heben, und
 * deshalb steht auf der Material-Achse der Erntetakt statt der Fallchance.
 *
 * Jede Achse, die eine Dauer oder einen Preis kürzt, läuft gegen einen Boden aus
 * `constants/forge.ts` — und jeder dieser Böden ist so gesetzt, dass die vierte
 * Stufe ihn ERREICHT. Es gibt hier also weder eine tote Stufe noch einen
 * Überlauf: der Bodensatz ist der Entwurf.
 */
function ward(
  id: string,
  name: string,
  parentId: string,
  icon: string,
  color: string,
  angleDeg: number,
  materialCost: Record<string, number>,
  desc: string,
  effectPerLevel: number,
  opts: { baseCost?: number; costMultiplier?: number } = {},
): ForgeNodeDef {
  return {
    id,
    name,
    parentId,
    tier: 'ward',
    phase: FORGE_WARD_UNLOCK_PHASE,
    icon,
    color,
    angleDeg,
    baseCost: opts.baseCost ?? 120_000,
    costMultiplier: opts.costMultiplier ?? 2.6,
    materialCost,
    desc,
    effectPerLevel,
  }
}

export const FORGE_WARDS: ForgeNodeDef[] = [
  // flightSpeed-Achse — Reisen, Expeditionen, alles was von aussen hereinkommt
  ward(
    'pathfindersOath',
    "Pathfinder's Oath",
    'auroraWake',
    'game-icons:sextant',
    '#e8c040',
    246,
    { solar_essence: 3 },
    'Expeditions succeed {v}% more often.',
    3,
  ),
  ward(
    'dreamersDraw',
    "Dreamer's Draw",
    'midnightTide',
    'game-icons:card-random',
    '#f0d878',
    294,
    { void_shard: 3 },
    'Augment offers are {v}% more likely to be rare or better.',
    8,
  ),
  ward(
    'wanderersBeacon',
    "Wanderer's Beacon",
    'wanderersCrest',
    'game-icons:lighthouse',
    '#ffe9a8',
    270,
    { solar_essence: 4, void_shard: 2 },
    'Drifters cross your sky {v}% more often.',
    6,
    { baseCost: 200_000, costMultiplier: 2.8 },
  ),

  // maxHp-Achse — was die Sonne bewahrt und was gegen sie drängt
  ward(
    'gravityWell',
    'Gravity Well',
    'vitalBloom',
    'game-icons:vortex',
    '#e05050',
    318,
    { solar_essence: 3 },
    'Void creatures crawl {v}% slower.',
    10,
  ),
  ward(
    'starwardensLantern',
    "Starwarden's Lantern",
    'starboundCore',
    'game-icons:lantern-flame',
    '#ffb0b0',
    342,
    { solar_essence: 4, dark_matter: 1 },
    'Resource stars appear {v}% more often.',
    7,
    { baseCost: 200_000, costMultiplier: 2.8 },
  ),
  ward(
    'riftAnchor',
    'Rift Anchor',
    'echoingBulwark',
    'game-icons:anchor',
    '#ff8080',
    6,
    { void_shard: 3 },
    'Rifts tear open {v}% less often.',
    8,
  ),

  // chimesPerClick-Achse — Preise, Handel, was ein Chime kaufen kann
  ward(
    'merchantsFavor',
    "Merchant's Favor",
    'coinCascade',
    'game-icons:trade',
    '#52b830',
    30,
    { nebula_quartz: 6 },
    'Item prices are {v}% lower.',
    6,
  ),
  ward(
    'almsOfTheKeeper',
    'Alms of the Keeper',
    'sunlitTrove',
    'game-icons:take-my-money',
    '#b0f090',
    54,
    { nebula_quartz: 8, dark_matter: 1 },
    'Champion level-ups cost {v}% less.',
    5,
    { baseCost: 200_000, costMultiplier: 2.8 },
  ),
  ward(
    'chimeConduit',
    'Chime Conduit',
    'echoChamber',
    'game-icons:lightning-arc',
    '#8fe060',
    78,
    { void_shard: 3 },
    "Bard's abilities come back {v}% sooner.",
    5,
  ),

  // chimesPerSecond-Achse — Material, Gebäude, der Takt der Zeit
  ward(
    'quarrymastersEye',
    "Quarrymaster's Eye",
    'deepVein',
    'game-icons:foundry-bucket',
    '#e89840',
    102,
    { solar_essence: 3 },
    'Planet harvesters gather {v}% faster.',
    6,
  ),
  ward(
    'kilnSubsidy',
    'Kiln Subsidy',
    'tidewake',
    'game-icons:brick-pile',
    '#ffd0a0',
    126,
    { nebula_quartz: 8, void_shard: 2 },
    'Building upgrades cost {v}% less.',
    4,
    { baseCost: 200_000, costMultiplier: 2.8 },
  ),
  ward(
    'omenReader',
    'Omen-Reader',
    'timeWeaver',
    'game-icons:crystal-ball',
    '#ffb860',
    150,
    { dark_matter: 1 },
    'Omens are offered {v}% more often.',
    6,
  ),

  // dmgPerClick-Achse — Kampf, Ladder, Bosse
  ward(
    'heraldsFavor',
    "Herald's Favor",
    'warhost',
    'game-icons:podium',
    '#c060a0',
    174,
    { void_shard: 3 },
    'A won match grants {v}% more LP.',
    6,
  ),
  ward(
    'hollowCore',
    'Hollow Core',
    'riftshard',
    'game-icons:mineral-heart',
    '#f0b8e0',
    198,
    { void_shard: 4, dark_matter: 1 },
    'Planet bosses rise with {v}% less health.',
    5,
    { baseCost: 200_000, costMultiplier: 2.8 },
  ),
  ward(
    'siegeReckoning',
    'Siege Reckoning',
    'starquake',
    'game-icons:cash',
    '#e08cc8',
    222,
    { dark_matter: 1 },
    'Planet bosses pay {v}% more Chimes.',
    9,
  ),
]

// ── Covenants (ring 5) — was die Gefährten zurückgeben ──────────────────────
/**
 * Fünfzehn Knoten, offen ab Swell, drei Stufen tief.
 *
 * Der Ward darunter greift in ein fremdes System hinein; der Covenant handelt
 * mit ihm. Jeder sitzt auf derselben Achse wie sein Ward und dreht an einer
 * ANDEREN Schraube desselben Systems: der Ward lässt Vorzeichen häufiger
 * kommen, der Covenant lässt sie weniger verlangen; der Ward verlangsamt die
 * Void-Wesen, der Covenant senkt, was ihr Einschlag kostet.
 *
 * **Material ist hier der Taktgeber, nicht der Chime-Preis** — dieselbe Rolle
 * wie bei den späten Blättern. Jede Rezeptur verlangt `void_shard` oder
 * `dark_matter`, beides Dinge, die man nicht ersparen, sondern nur finden kann.
 */
function pact(
  id: string,
  name: string,
  parentId: string,
  icon: string,
  color: string,
  angleDeg: number,
  materialCost: Record<string, number>,
  desc: string,
  effectPerLevel: number,
): ForgeNodeDef {
  return {
    id,
    name,
    parentId,
    tier: 'pact',
    phase: FORGE_PACT_UNLOCK_PHASE,
    icon,
    color,
    angleDeg,
    baseCost: 2_000_000,
    costMultiplier: 3,
    materialCost,
    desc,
    effectPerLevel,
  }
}

export const FORGE_PACTS: ForgeNodeDef[] = [
  pact(
    'cartographersPact',
    "Cartographer's Pact",
    'pathfindersOath',
    'game-icons:treasure-map',
    '#e8c040',
    246,
    { void_shard: 4, dark_matter: 1 },
    'New expedition offers appear {v}% sooner.',
    8,
  ),
  pact(
    'longVigilPact',
    'Pact of the Long Vigil',
    'dreamersDraw',
    'game-icons:sundial',
    '#f0d878',
    294,
    { void_shard: 5, dark_matter: 1 },
    'Offline progress counts {v} hours longer.',
    2,
  ),
  pact(
    'starroadPact',
    'Starroad Pact',
    'wanderersBeacon',
    'game-icons:star-gate',
    '#ffe9a8',
    270,
    { dark_matter: 3 },
    'Champions cross to the next galaxy {v}% sooner.',
    8,
  ),
  pact(
    'hollowPact',
    'Hollow Pact',
    'gravityWell',
    'game-icons:mighty-force',
    '#e05050',
    318,
    { void_shard: 5, dark_matter: 1 },
    'A rift that lands takes {v}% fewer meeps.',
    12,
  ),
  pact(
    'wardensPact',
    "Warden's Pact",
    'starwardensLantern',
    'game-icons:arena',
    '#ffb0b0',
    342,
    { solar_essence: 6, dark_matter: 2 },
    'Resource stars carry {v} more planets.',
    1,
  ),
  pact(
    'unbrokenPact',
    'Unbroken Pact',
    'riftAnchor',
    'game-icons:defensive-wall',
    '#ff8080',
    6,
    { void_shard: 6, dark_matter: 1 },
    "A rift's aftermath fades {v}% sooner.",
    10,
  ),
  pact(
    'hagglersPact',
    "Haggler's Pact",
    'merchantsFavor',
    'game-icons:shop',
    '#52b830',
    30,
    { nebula_quartz: 12, dark_matter: 1 },
    'Cosmic Bargains cost {v}% less.',
    10,
  ),
  pact(
    'merchantsPact',
    "Merchant's Pact",
    'almsOfTheKeeper',
    'game-icons:ascending-block',
    '#b0f090',
    54,
    { solar_essence: 6, dark_matter: 2 },
    'The Cosmic Bargain restocks {v}% sooner.',
    8,
  ),
  pact(
    'resonantPact',
    'Resonant Pact',
    'chimeConduit',
    'game-icons:magic-swirl',
    '#8fe060',
    78,
    { void_shard: 5, dark_matter: 2 },
    "Bard's abilities strike {v}% harder.",
    8,
  ),
  pact(
    'prospectorsPact',
    "Prospector's Pact",
    'quarrymastersEye',
    'game-icons:stone-block',
    '#e89840',
    102,
    { solar_essence: 6, void_shard: 3 },
    'Planet bosses leave {v}% more material behind.',
    12,
  ),
  pact(
    'foundersPact',
    "Founder's Pact",
    'kilnSubsidy',
    'game-icons:brick-wall',
    '#ffd0a0',
    126,
    { nebula_quartz: 14, dark_matter: 2 },
    'Building milestones arrive {v} levels sooner.',
    2,
  ),
  pact(
    'augursPact',
    "Augur's Pact",
    'omenReader',
    'game-icons:third-eye',
    '#ffb860',
    150,
    { dark_matter: 3 },
    'Omens ask {v}% less of you.',
    7,
  ),
  pact(
    'honoredPact',
    'Pact of Honor',
    'heraldsFavor',
    'game-icons:medallist',
    '#c060a0',
    174,
    { void_shard: 5, dark_matter: 1 },
    'Honor tribute pays {v}% more.',
    12,
  ),
  pact(
    'patientPact',
    'Pact of Patience',
    'hollowCore',
    'game-icons:extra-time',
    '#f0b8e0',
    198,
    { solar_essence: 6, dark_matter: 2 },
    "A boss's enrage clock runs {v}% longer.",
    10,
  ),
  pact(
    'arbitersPact',
    "Arbiter's Pact",
    'siegeReckoning',
    'game-icons:scales',
    '#e08cc8',
    222,
    { void_shard: 6, dark_matter: 2 },
    'A defeat costs {v}% less LP.',
    10,
  ),
]

// ── Boughs (ring 7) — der einzige Ring OHNE Obergrenze ───────────────────────
/**
 * Zehn Knoten, die in der Endphase aufgehen und danach nie fertig werden.
 *
 * Sie sind die Antwort auf zwei Löcher im Spätspiel: der Baum stand ab Phase 5
 * vollständig auf „✦ MAX", und Chimes hatten ausser den Planeten-Leveln keine
 * Senke mehr. Jeder trägt die Achse eines Zweiges ungedeckelt weiter — vier
 * davon eine mit harter Kappe.
 *
 * **Sein Elternknoten ist trotzdem der Covenant desselben Winkels**, nicht der
 * Zweig, dessen Idee er fortführt: seit die Ringe eine Leiter bilden, hängt
 * jeder Knoten am Ring direkt innen. Die Verbindungslinie bleibt dabei radial —
 * alle Knoten eines Winkels stehen auf derselben Geraden.
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
    'starroadPact',
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
    'longVigilPact',
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
    'wardensPact',
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
    'hollowPact',
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
    'merchantsPact',
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
    'resonantPact',
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
    'foundersPact',
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
    'honoredPact',
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
    'patientPact',
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
    'arbitersPact',
    'game-icons:burning-embers',
    '#e08cc8',
    222,
    2.5e9,
    'Damage against bosses +{v}%.',
    10,
  ),
]

// ── Crowns (ring 6) — der einzige Ring, der eine REGEL kauft ─────────────────
/**
 * Fünf Knoten, einer je Wurzelachse, jeder genau EINMAL zu haben.
 *
 * Sie schliessen das Loch, das die Boughs offengelassen haben. Der endlose Ring
 * gibt dem Spätspiel eine Chime-Senke, aber keine Überraschung mehr: Stufe 24
 * fühlt sich an wie Stufe 23, nur teurer. Was ab dort fehlte, war keine Zahl,
 * sondern eine neue Regel.
 *
 * Deshalb trägt kein Crown ein `effectPerLevel`, das etwas bedeutet — die
 * Wirkung steht als Konstante in `constants/forge.ts` und wird von genau EINEM
 * Getter im Store gelesen. `desc` sagt sie im Klartext, ohne `{v}`.
 *
 * Zwei von ihnen sind der eigentliche Grund für diesen Ring: **Tideless Watch**
 * und **Sunderer's Mark** greifen in die zwei Herkünfte des Ertragsbandes, die
 * nach UNTEN zeigen (`FORGE_YIELD_SOURCES`, nature `toll`). Gegen Void-Zoll und
 * Boss-Zoll hatte der Spieler bis hierhin kein einziges Kaufangebot — nur
 * Warten. Ein Zoll, den man verhandeln kann, ist eine Entscheidung.
 *
 * Der Preis ist einheitlich und liegt eine Grössenordnung über dem Einstieg der
 * Boughs (2e9): wer hier steht, hat ein Universum hinter sich und einen
 * ausgewachsenen Covenant-Ring — die Kosten sollen die Entscheidung sein, welche
 * Krone ZUERST.
 */
function crown(
  id: string,
  name: string,
  parentId: string,
  icon: string,
  color: string,
  angleDeg: number,
  materialCost: Record<string, number>,
  desc: string,
): ForgeNodeDef {
  return {
    id,
    name,
    parentId,
    tier: 'crown',
    // Pyre — die eigene Sprosse der Ring-Leiter. Das Prestige-Tor
    // (`FORGE_CROWN_UNLOCK_PRESTIGES`) steht DANEBEN und ersetzt sie nicht.
    phase: FORGE_CROWN_UNLOCK_PHASE,
    icon,
    color,
    angleDeg,
    baseCost: FORGE_CROWN_BASE_COST,
    // Ohne Bedeutung — ein Crown hat genau eine Stufe, es gibt keine zweite,
    // deren Preis sich vervielfachen könnte.
    costMultiplier: 1,
    materialCost,
    desc,
    effectPerLevel: 0,
  }
}

export const FORGE_CROWNS: ForgeNodeDef[] = [
  crown(
    'wanderersGate',
    "Wanderer's Gate",
    'starroadPact',
    'game-icons:portal',
    '#ffe9a8',
    270,
    { solar_essence: 8, dark_matter: 3 },
    'A returning expedition opens the next passage at once.',
  ),
  crown(
    'wardensReprieve',
    "Warden's Reprieve",
    'hollowPact',
    'game-icons:heart-tower',
    '#ffb0b0',
    318,
    { moon_crystal: 40, dark_matter: 3 },
    'Once per star phase, a fallen sun returns at half health.',
  ),
  crown(
    'midasOverflow',
    'Midas Overflow',
    'merchantsPact',
    'game-icons:gold-nuggets',
    '#b0f090',
    54,
    { nebula_quartz: 30, solar_essence: 6 },
    'Chimes past your hoard settle into stardust.',
  ),
  crown(
    'tidelessWatch',
    'Tideless Watch',
    'foundersPact',
    'game-icons:eclipse',
    '#ffd0a0',
    126,
    { void_shard: 10, dark_matter: 4 },
    // Zwei Sätze, ein Gedanke: der Riss nimmt weniger, und was man ihm abnimmt,
    // zahlt mehr. Die Rückzahlung hängt am BOON eines erlegten Wesens und nicht
    // an einer nachgerechneten Drossel-Bilanz — die müsste Rampe, Milderung und
    // alle gleichzeitig stehenden Wesen auseinanderhalten und wäre eine Zahl,
    // die niemand nachprüfen kann.
    'The Void takes half as much, and every creature you slay pays double.',
  ),
  crown(
    'sunderersMark',
    "Sunderer's Mark",
    'patientPact',
    'game-icons:broken-shield',
    '#f0b8e0',
    198,
    { void_shard: 8, dark_matter: 4 },
    'A boss below half health pays you its toll instead of taking it.',
  ),
]

/** Alle 75 Knoten der Ringe 2–7, in Ringreihenfolge von innen nach aussen. */
export const FORGE_NODES: ForgeNodeDef[] = [
  ...FORGE_BRANCHES,
  ...FORGE_LEAVES,
  ...FORGE_WARDS,
  ...FORGE_PACTS,
  ...FORGE_CROWNS,
  ...FORGE_BOUGHS,
]

/**
 * Nachschlagen über eine Map statt über `find`.
 *
 * Der Katalog hat 75 Knoten, und `starForgeStore.canAffordNode` fragt für EINEN
 * Knoten fünfmal hier nach (freigeschaltet, Höchststufe, Chime-Preis,
 * Materialpreis, Elternstufe). Seit das Shop-Abzeichen an der Header-Ecktaste
 * hängt, läuft diese Prüfung für alle 75 Knoten bei jeder Chime-Änderung —
 * ab Programmstart, nicht erst nach dem ersten Öffnen des Shop-Tabs. Als
 * lineare Suche wären das rund 28.000 Zeichenkettenvergleiche je Runde; die
 * Map macht daraus 75 Hash-Zugriffe. Mit zwei neuen Ringen ist das kein
 * Feinschliff mehr, sondern die Bedingung, unter der das Abzeichen bleiben darf.
 */
const FORGE_NODE_BY_ID = new Map(FORGE_NODES.map((n) => [n.id, n]))

export function getForgeNode(id: string): ForgeNodeDef | undefined {
  return FORGE_NODE_BY_ID.get(id)
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

  // ── Die drei Relikte, die auf FREMDE Systeme zahlen ────────────────────────
  // Die sechs darüber verstärken alle eine Achse, die ihr Zweig ohnehin schon
  // trägt — mehr Beute, mehr Schaden, mehr Offline-Ertrag. Diese drei greifen
  // dorthin, wo der Baum bisher gar nichts zu sagen hatte: in den Void-Zoll,
  // in die Laufzeit eingesammelter Gaben und in die Meep-Ernte.
  //
  // Das ist keine Kosmetik. Void und Boss sind die zwei einzigen Herkünfte des
  // Ertragsbandes, die nach UNTEN zeigen (`FORGE_YIELD_SOURCES`, nature `toll`),
  // und der Spieler hatte gegen sie bis hierhin kein einziges Kaufangebot —
  // nur Warten. Ein Zoll, den man abkaufen kann, ist eine Entscheidung; einer,
  // den man nur aussitzt, ist eine Wartezeit.
  {
    id: 'riftwardensSeal',
    name: "Riftwarden's Seal",
    rarity: 'epic',
    icon: 'game-icons:wax-seal',
    color: '#e0409f',
    requiresNode: 'aegis',
    requiresLevel: 3,
    maxLevel: 5,
    goldCost: 9_000,
    goldMultiplier: 3,
    materialCost: { void_shard: 4, nebula_quartz: 8 },
    // Wirkt auf JEDEN Void-Faktor, nicht nur den auf die Chimes: der Riss
    // drosselt Klicks, Kampf-DPS und Materialfall gleich mit, und ein Siegel,
    // das nur eine der vier Fesseln löst, wäre schwer zu erklären.
    desc: 'The Void takes {v}% less from you while a rift stands.',
    effectPerLevel: 12,
    sourceLabel: 'Aegis branch + Void Shards',
  },
  {
    id: 'pilgrimsReliquary',
    name: "Pilgrim's Reliquary",
    rarity: 'rare',
    icon: 'game-icons:relic-blade',
    color: '#a9b6c4',
    requiresNode: 'moonOrbit',
    requiresLevel: 3,
    maxLevel: 5,
    goldCost: 5_000,
    goldMultiplier: 3,
    materialCost: { dark_matter: 1, moon_crystal: 12 },
    // Die Gegenrichtung zu allem anderen im Baum: nicht STÄRKER, sondern
    // LÄNGER. Es ist der einzige Kauf, der auf die Bandzeile `boons` zahlt —
    // die trägt sonst nur, was der Zufall gerade vorbeischickt.
    desc: 'Collected drifter boons last {v}% longer.',
    effectPerLevel: 15,
    sourceLabel: 'Moon Orbit branch + Dark Matter',
  },
  {
    id: 'meepShrine',
    name: 'Meep Shrine',
    rarity: 'epic',
    icon: 'game-icons:stone-tablet',
    color: '#40c8b0',
    requiresNode: 'gildedHarvest',
    requiresLevel: 3,
    maxLevel: 5,
    goldCost: 12_000,
    goldMultiplier: 3,
    materialCost: { solar_essence: 4, dark_matter: 1 },
    // Senkt die ANFORDERUNG, nicht die Ausbeute — die steht als Wurzel darauf
    // (`gameStore.exactPendingMeeps`), und ein Faktor auf die Ernte selbst
    // hätte die Kurve verlassen. Ein Relikt-Level kann nur steigen, die
    // Anforderung also nur fallen: die Monotonie, an der `runMeepCostFloor`
    // hängt, bleibt unangetastet.
    desc: 'Each pending meep needs {v}% fewer chimes.',
    effectPerLevel: 4,
    sourceLabel: 'Gilded Harvest branch + Solar Essence',
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

  // ── Drei Fusionen, die eine REGEL setzen statt eine Zahl ───────────────────
  // Von den sieben darüber tragen fünf einen Prozentwert; die zwei, an die man
  // sich erinnert, sind Prospector's Charm („+1 Material je Fall") und
  // Shattering Nova („Klicks splashen"). Diese drei folgen ihnen: jede sagt
  // einen Satz, der vorher nicht galt.
  {
    id: 'voidboundPact',
    name: 'Voidbound Pact',
    icon: 'game-icons:evil-hand',
    color: '#e0409f',
    nodeA: 'aegis',
    nodeB: 'sunderingWake',
    goldCost: 24_000,
    materialCost: { void_shard: 5, dark_matter: 2 },
    // Der Riss war bis hierhin reiner Verlust — er kostet Chimes, Meeps und
    // Sonnen-HP und gibt nichts zurück. Mit dem Pakt wird das Aufräumen zur
    // Quelle des Materials, das die Forge am dringendsten braucht.
    desc: 'Void creatures your orbit destroys leave a Void Shard behind.',
    pairLabel: 'Aegis + Sundering Wake · shards from kills',
  },
  {
    id: 'caretakersLedger',
    name: "Caretaker's Ledger",
    icon: 'game-icons:scroll-quill',
    color: '#e8c040',
    nodeA: 'goldenEcho',
    nodeB: 'cometMiner',
    goldCost: 21_000,
    materialCost: { stardust: 30, nebula_quartz: 6 },
    // Bindet die Klick-Achse an die Material-Achse: wer auf Doppelklicks
    // gespielt hat, erntet damit auch ohne Sternenfall. Der Wurf hängt am
    // TREFFER, nicht am Klick — sonst hinge die Ausbeute an der Klickrate
    // statt am Ausbau.
    desc: 'Every doubled click has a chance to shake a material loose.',
    pairLabel: 'Golden Echo + Comet Miner · materials from clicks',
  },
  {
    id: 'starfarersCompact',
    name: "Starfarer's Compact",
    icon: 'game-icons:portal',
    color: '#7bb8ff',
    nodeA: 'wayfindersCache',
    nodeB: 'moonOrbit',
    goldCost: 26_000,
    materialCost: { solar_essence: 5, void_shard: 3 },
    // Nicht „mehr Offline-Ertrag" — das trägt der Moon-Orbit-Zweig bereits
    // dreifach. Die Fusion verschiebt die GRENZE, gegen die er läuft: acht
    // Stunden mehr, die überhaupt erst gezählt werden.
    desc: 'Offline progress counts 8 hours longer.',
    pairLabel: "Wayfinder's Cache + Moon Orbit · +8h offline cap",
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

  // ── Drei Handel, die einen ZUSTAND kaufen ──────────────────────────────────
  // Die sieben darüber geben Ware, Rate oder Zeit. Diese drei greifen in die
  // Lage ein, in der der Spieler gerade steckt — und genau deshalb sind sie
  // nicht immer etwas wert: wer keinen Riss stehen hat, kauft die Maut nicht.
  // Ein Angebot, das man ausschlagen kann, ist mehr wert als eines, das man
  // immer nimmt.
  {
    id: 'wanderersToll',
    name: "Wanderer's Toll",
    iconPool: 'arcane',
    desc: 'Pay the passage and the rift closes at once.',
    basePrice: 30_000,
    discountPct: 0.3,
    kind: 'voidPurge',
    materials: { void_shard: 2 },
  },
  {
    id: 'meepCaravan',
    name: 'Meep Caravan',
    iconPool: 'fortune',
    // Der einzige Weg, Meeps zu bekommen, ohne den Aufbruch abzuwarten —
    // neben dem Drifter „Lost Meep" und der Expeditionsbeute, die beide nicht
    // planbar sind. Die Menge ist FEST und klein: an `exactPendingMeeps`
    // gekoppelt wäre sie im Spätspiel eine zweite Ernte neben der eigentlichen.
    desc: 'A caravan of meeps joins you on the spot.',
    basePrice: 40_000,
    discountPct: 0.25,
    kind: 'meeps',
    meepReward: 3,
  },
  {
    id: 'phaseLantern',
    name: 'Phase Lantern',
    iconPool: 'cosmos',
    desc: 'Doubles the material drop chance for 45 minutes.',
    basePrice: 18_000,
    discountPct: 0.3,
    kind: 'buff',
    buffId: 'dropX2',
    durationMs: 45 * 60_000,
  },
]

export function getForgeBargain(id: string): ForgeBargainDef | undefined {
  return FORGE_BARGAINS.find((b) => b.id === id)
}
