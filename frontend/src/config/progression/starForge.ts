import type {
  ForgeEffectFamily,
  ForgeNodeDef,
  ForgeNodeRequirement,
  ForgeRelicDef,
  ForgeConstellationDef,
  ForgeBargainDef,
} from '@/types'
import {
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_LEAF_UNLOCK_PHASE,
  FORGE_WARD_UNLOCK_PHASE,
  FORGE_PACT_UNLOCK_PHASE,
  FORGE_CROWN_UNLOCK_PHASE,
  FORGE_BOUGH_UNLOCK_PHASE,
  FORGE_BOUGH_COST_MULTIPLIER,
  FORGE_CROWN_BASE_COST,
  FORGE_CONJUNCTION_PACT_LEVEL,
  FORGE_GLIMMER_BASE_COST_SHARE,
  FORGE_GLIMMER_COST_MULTIPLIER,
  FORGE_GLIMMER_FAMILY_ICON,
  FORGE_CONJUNCTION_WARD_LEVEL,
  FORGE_CROWN_OWN_WARD_LEVEL,
  FORGE_CROWN_MAX_LEVEL,
  FORGE_VAULT_REQUIRED_LEVEL,
  SOLAR_BRANCHES,
  FORGE_CONFLUENCE_BASE_COST,
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
    family: 'travel',
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
    family: 'idle',
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
    family: 'guard',
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
    family: 'guard',
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
    family: 'click',
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
    family: 'click',
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
    family: 'harvest',
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
    family: 'idle',
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
    family: 'combat',
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
    family: 'combat',
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
    family: 'travel',
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
    family: 'star',
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
    family: 'click',
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
    family: 'income',
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
    family: 'combat',
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
  family: ForgeEffectFamily,
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
    family,
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
  leaf('auroraWake', 'Aurora Wake', 'solarSails', 'game-icons:sunrise', '#e8c040', 'travel', {
    solar_essence: 2,
  }),
  leaf('midnightTide', 'Midnight Tide', 'moonOrbit', 'game-icons:night-sky', '#f0d878', 'idle', {
    void_shard: 2,
  }),
  leaf('vitalBloom', 'Vital Bloom', 'regeneration', 'game-icons:heart-plus', '#e05050', 'guard', {
    solar_essence: 2,
  }),
  leaf('echoingBulwark', 'Echoing Bulwark', 'aegis', 'game-icons:shield-echoes', '#ff8080', 'guard', {
    void_shard: 2,
  }),
  leaf('coinCascade', 'Coin Cascade', 'goldenEcho', 'game-icons:coins-pile', '#52b830', 'click', {
    solar_essence: 2,
  }),
  leaf('echoChamber', 'Echo Chamber', 'resonance', 'game-icons:echo-ripples', '#8fe060', 'click', {
    void_shard: 2,
  }),
  leaf('deepVein', 'Deep Vein', 'cometMiner', 'game-icons:gold-mine', '#e89840', 'harvest', {
    solar_essence: 2,
  }),
  leaf('timeWeaver', 'Time Weaver', 'quickening', 'game-icons:clockwork', '#ffb860', 'idle', {
    dark_matter: 1,
  }),
  leaf('warhost', 'Warhost', 'warcry', 'game-icons:swords-power', '#c060a0', 'combat', {
    void_shard: 2,
  }),
  leaf('starquake', 'Starquake', 'shatter', 'game-icons:implosion', '#e08cc8', 'combat', {
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
    'travel',
    { void_shard: 2, dark_matter: 1 },
    LATE_LEAF_COST,
  ),
  leaf(
    'starboundCore',
    'Starbound Core',
    'wardensVigil',
    'game-icons:crystal-cluster',
    '#ffb0b0',
    'star',
    { solar_essence: 3, dark_matter: 1 },
    LATE_LEAF_COST,
  ),
  leaf(
    'sunlitTrove',
    'Sunlit Trove',
    'gildedHarvest',
    'game-icons:open-chest',
    '#b0f090',
    'click',
    { void_shard: 3, dark_matter: 1 },
    LATE_LEAF_COST,
  ),
  leaf(
    'tidewake',
    'Tidewake',
    'tidalDrift',
    'game-icons:wave-crest',
    '#ffd0a0',
    'income',
    { void_shard: 2, dark_matter: 2 },
    LATE_LEAF_COST,
  ),
  leaf(
    'riftshard',
    'Riftshard',
    'sunderingWake',
    'game-icons:crystal-shine',
    '#f0b8e0',
    'combat',
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
  family: ForgeEffectFamily,
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
    family,
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
    'travel',
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
    'fortune',
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
    'drifter',
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
    'void',
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
    'star',
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
    'void',
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
    'market',
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
    'market',
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
    'ability',
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
    'harvest',
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
    'market',
    { nebula_quartz: 8, void_shard: 2 },
    'Solar Ray upgrades cost {v}% less.',
    4,
    { baseCost: 200_000, costMultiplier: 2.8 },
  ),
  ward(
    'omenReader',
    'Omen-Reader',
    'timeWeaver',
    'game-icons:crystal-ball',
    '#ffb860',
    'fortune',
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
    'ladder',
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
    'boss',
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
    'boss',
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
  family: ForgeEffectFamily,
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
    family,
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
    'travel',
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
    'idle',
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
    'travel',
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
    'void',
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
    'star',
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
    'void',
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
    'market',
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
    'market',
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
    'ability',
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
    'harvest',
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
    'market',
    { nebula_quartz: 14, dark_matter: 2 },
    'Solar Rays give {v}% more Chimes/Sec.',
    4,
  ),
  pact(
    'augursPact',
    "Augur's Pact",
    'omenReader',
    'game-icons:third-eye',
    '#ffb860',
    'fortune',
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
    'ladder',
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
    'boss',
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
    'ladder',
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
 *
 * **Und seit dem Zusammenlauf kann ein Bough ein TOR tragen** (`requires`). Die
 * fünf neuen verlangen je eine KRONE — nicht als Hürde, sondern als Erklaerung:
 * eine Krone kauft eine Regel und ist danach fertig, der Bough dahinter macht
 * aus dieser Regel eine Achse, an der man weiterbauen kann. Ring 6 liegt weiter
 * innen als Ring 7, `forgeRequirements.spec.ts` prueft es. Die zehn ALTEN tragen
 * kein Tor und sollen auch keins bekommen: sie sind die Chime-Senke, die
 * verfuegbar sein muss, sobald die Sonne fertig ist.
 */
function bough(
  id: string,
  name: string,
  parentId: string,
  icon: string,
  color: string,
  family: ForgeEffectFamily,
  baseCost: number,
  desc: string,
  effectPerLevel: number,
  requires?: readonly ForgeNodeRequirement[],
): ForgeNodeDef {
  return {
    id,
    name,
    parentId,
    requires,
    tier: 'bough',
    phase: FORGE_BOUGH_UNLOCK_PHASE,
    icon,
    color,
    family,
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
    'travel',
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
    'idle',
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
    'star',
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
    'guard',
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
    'click',
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
    'click',
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
    'income',
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
    'combat',
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
    'combat',
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
    'combat',
    2.5e9,
    'Damage against bosses +{v}%.',
    10,
  ),

  /* ── Die fünf mit TOR: was eine Regel eroeffnet hat, waechst weiter ───────
     Jeder verlangt genau die Krone, deren Regel er ins Endlose fortsetzt — die
     Bedingung ist damit keine Huerde, sondern der Satz, der den Knoten
     erklaert. Tideless Watch verdoppelt den Lohn eines erlegten Wesens, Dark
     Tithe multipliziert genau diese Zahl weiter.

     Alle fünf halten die drei Bedingungen des endlosen Rings: additive Wirkung,
     geometrische Kosten, kein Material — und ausschliesslich Achsen, die weder
     `otherDps` heben noch STILL saettigen. Es sind Faktoren auf eine
     AUSZAHLUNG, keine Wahrscheinlichkeitswuerfe: es gibt keinen Wert, ab dem
     eine weitere Stufe nichts mehr hinzufuegt. Getaktet sind sie durch
     Ereignisse (Void-Spawn, Boss-Kill, Drifter-Uhr, Handelsfenster, Erntetakt),
     deren Frequenz je gegen einen eigenen Boden laeuft. */
  bough(
    'darkTithe',
    'Dark Tithe',
    'unbrokenPact',
    'game-icons:black-hole-bolas',
    '#ff8080',
    'void',
    1.6e9,
    'Void creatures you put down pay an additional {v}% more.',
    12,
    [
      // Die Krone DERSELBEN Kette, gleich nebenan: was ihre Regel eröffnet
      // hat, setzt dieser Ast ins Endlose fort.
      { id: 'sealedThreshold', level: FORGE_CROWN_MAX_LEVEL },
    ],
  ),
  bough(
    'brimmingCart',
    'Brimming Cart',
    'hagglersPact',
    'game-icons:cornucopia',
    '#52b830',
    'market',
    1.2e9,
    'Cosmic Bargain buffs last {v}% longer.',
    6,
    [
      // Die Krone DERSELBEN Kette, gleich nebenan: was ihre Regel eröffnet
      // hat, setzt dieser Ast ins Endlose fort.
      { id: 'reclaimedBargain', level: FORGE_CROWN_MAX_LEVEL },
    ],
  ),
  bough(
    'rivenLode',
    'Riven Lode',
    'prospectorsPact',
    'game-icons:ore',
    '#e89840',
    'harvest',
    2.4e9,
    'Planet bosses leave an additional {v}% more material behind.',
    7,
    [
      // Die Krone DERSELBEN Kette, gleich nebenan: was ihre Regel eröffnet
      // hat, setzt dieser Ast ins Endlose fort.
      { id: 'tirelessQuarry', level: FORGE_CROWN_MAX_LEVEL },
    ],
  ),
  bough(
    'worldsBounty',
    "World's Bounty",
    'augursPact',
    'game-icons:planet-core',
    '#ffb860',
    'harvest',
    3.0e9,
    'Planet harvesters bring up {v}% more.',
    5,
    [
      // Die Krone DERSELBEN Kette, gleich nebenan: was ihre Regel eröffnet
      // hat, setzt dieser Ast ins Endlose fort.
      { id: 'unfailingSign', level: FORGE_CROWN_MAX_LEVEL },
    ],
  ),
  bough(
    'driftersDue',
    "Drifter's Due",
    'cartographersPact',
    'game-icons:falling-star',
    '#e8c040',
    'drifter',
    1.8e9,
    'A drifter you catch pays an additional {v}% more.',
    10,
    // Der LOHN und nicht die Boon-Dauer: die haeufigen Drifter kommen alle
    // 20–30 s bei 20–90 s Laufzeit, eine endlose Dauer liefe dort in volle
    // Abdeckung und waere ab da ein bezahltes Nichts. Der Lohn saettigt nicht.
    [
      // Die Krone DERSELBEN Kette, gleich nebenan: was ihre Regel eröffnet
      // hat, setzt dieser Ast ins Endlose fort.
      { id: 'pilgrimsAccord', level: FORGE_CROWN_MAX_LEVEL },
    ],
  ),
]

// ── Crowns (ring 6) — der einzige Ring, der eine REGEL kauft ─────────────────
/**
 * ZEHN Knoten, zwei je Wurzelachse, jeder genau EINMAL zu haben.
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
 * und **Sunderer's Mark** greifen in die zwei Herkünfte des Chime-Ertrags, die
 * nach UNTEN zeigen (`FORGE_YIELD_SOURCES`, nature `toll`). Gegen Void-Zoll und
 * Boss-Zoll hatte der Spieler bis hierhin kein einziges Kaufangebot — nur
 * Warten. Ein Zoll, den man verhandeln kann, ist eine Entscheidung.
 *
 * Der Preis ist einheitlich und liegt eine Grössenordnung über dem Einstieg der
 * Boughs (2e9): wer hier steht, hat ein Universum hinter sich und einen
 * ausgewachsenen Covenant-Ring — die Kosten sollen die Entscheidung sein, welche
 * Krone ZUERST. **Auch die fünf neuen kosten dasselbe**: bei ihnen sind die
 * Voraussetzungen der Preis.
 *
 * ── Der ZUSAMMENLAUF ────────────────────────────────────────────────────────
 * Der Ring trägt seit der Erweiterung ZWEI Fassungen derselben Idee, und der
 * Kontrast ist der Inhalt:
 *
 *   die fünf ALTEN verlangen ihre EIGENE Achse bis nach unten
 *     — den Ward derselben Speiche auf `FORGE_CROWN_OWN_WARD_LEVEL`
 *   die fünf NEUEN verlangen den Zusammenlauf zweier FREMDER Achsen
 *     — je zwei Knoten von zwei anderen Wurzelachsen, jeder mit eigener Stufe
 *
 * `parentId` bleibt bei allen zehn der Covenant DERSELBEN Speiche — daran hängen
 * Ringradius, gezeichneter Ast und Scheinwerferkette, und
 * `chronicleReachable.spec.ts` verlangt dafür Winkelgleichheit. Was ein Knoten
 * ZUSÄTZLICH braucht, steht in `requires` und ist von der Geometrie frei; im
 * Baum zeigt es sich als Punkt am Bedingungs-Kranz des Knotens und, sobald der
 * Zeiger darauf liegt, als eigener Ring am Voraussetzungsknoten.
 *
 * Die Stufen in `requires` sind an der ERREICHBARKEIT geeicht, nicht am Gefühl —
 * die Rechnung steht an `FORGE_CONJUNCTION_WARD_LEVEL`, und
 * `forgeRequirements.spec.ts` prüft sie nach.
 */
function crown(
  id: string,
  name: string,
  parentId: string,
  icon: string,
  color: string,
  family: ForgeEffectFamily,
  materialCost: Record<string, number>,
  desc: string,
  requires: readonly ForgeNodeRequirement[],
): ForgeNodeDef {
  return {
    id,
    name,
    parentId,
    requires,
    tier: 'crown',
    // Pyre — die eigene Sprosse der Ring-Leiter. Das Prestige-Tor
    // (`FORGE_CROWN_UNLOCK_PRESTIGES`) steht DANEBEN und ersetzt sie nicht.
    phase: FORGE_CROWN_UNLOCK_PHASE,
    icon,
    color,
    family,
    baseCost: FORGE_CROWN_BASE_COST,
    // Ohne Bedeutung — ein Crown hat genau eine Stufe, es gibt keine zweite,
    // deren Preis sich vervielfachen könnte.
    costMultiplier: 1,
    materialCost,
    desc,
    effectPerLevel: 0,
  }
}


/* ── DIE NAHT: Confluences ───────────────────────────────────────────────────
 *
 * Fuenf Knoten, die es ohne den Merge nicht geben koennte. Jeder haengt an einem
 * Bough der Sonne UND verlangt einen Knoten von The Wandering — und seine
 * Wirkung ist keine feste Zahl, sondern eine KOPPLUNG: sie waechst mit jedem
 * Knoten, der auf der Strasse gelernt ist.
 *
 * Das ist der Grund, warum sie keine weiteren Prozente sind. Eine Krone
 * verschiebt eine Regel, ein Bough gibt einen Betrag; eine Confluence macht aus
 * zwei getrennten Fortschritten EINEN. Wer nur schmiedet, bekommt von ihr
 * nichts, wer nur wandert, kann sie nicht kaufen.
 *
 * **Verlangt wird der ERSTE Knoten der Spur, nicht ein tiefer.** Das ist keine
 * Milde, sondern Geometrie: eine Confluence sitzt zwischen Bough und Strasse,
 * und ihre Bedingungskante ZIEHT im Layout. Haengt sie an Rang 2 oder 3, zerrt
 * sie den Knoten unter seine Vorgaenger — gemessen kippte die Reihenfolge der
 * Spur um 80 px, und `forgeNetGeometry.spec.ts` faengt genau das. An Rang 1
 * zieht sie am innersten Knoten, und die Ordnung bleibt.
 *
 * Es kostet auch nichts: das TOR ist der erste Schritt auf die Strasse, die
 * WIRKUNG kommt aus dem ganzen Weg. Ein tieferes Tor haette nur verschoben,
 * wann man kaufen darf — nicht, was der Kauf wert ist.
 *
 * `maxLevel` ist 1 — dieselbe Begruendung wie bei der Krone: sie sind
 * Entscheidungen, keine Leitern. Ihr Preis hat drei Beine (Chimes, Material,
 * Meeps) und ist die einzige Stelle im Spiel, an der das so ist.
 *
 * Sie zaehlen NICHT in `progressMetrics.forgeLevels` — dieselbe Begruendung,
 * aus der `crownLevels` dort fehlt: fuenf Einsen sind keine geschmiedete Tiefe.
 */
function confluence(
  id: string,
  name: string,
  parentId: string,
  requiresMeep: string,
  icon: string,
  color: string,
  family: ForgeEffectFamily,
  materialCost: Record<string, number>,
  desc: string,
  effectPerLevel: number,
): ForgeNodeDef {
  return {
    id,
    name,
    parentId,
    requires: [{ id: requiresMeep, level: 1 }],
    tier: 'confluence',
    phase: FORGE_BOUGH_UNLOCK_PHASE,
    icon,
    color,
    family,
    baseCost: FORGE_CONFLUENCE_BASE_COST,
    costMultiplier: 1,
    materialCost,
    desc,
    effectPerLevel,
  }
}

export const FORGE_CONFLUENCES: ForgeNodeDef[] = [
  confluence(
    'tidewatch',
    'Tidewatch',
    'kindledVigil',
    'vigil_1',
    'game-icons:knot',
    '#e8c040',
    'idle',
    { comet_ice: 8, star_iron: 4 },
    'Offline earnings +{v}% for every node opened on The Wandering.',
    3,
  ),
  confluence(
    'handfast',
    'Handfast',
    'deepResonance',
    'reso_1',
    'game-icons:linked-rings',
    '#8fe060',
    'click',
    { comet_ice: 8, plasma_core: 1 },
    'Chimes per click +{v}% for every node opened on The Wandering.',
    3,
  ),
  confluence(
    'waychart',
    'Waychart',
    'endlessTide',
    'cosmos_1',
    'game-icons:stone-bridge',
    '#58c0d0',
    'travel',
    { star_iron: 4, aether_dust: 1 },
    'Expedition rewards +{v}% for every node opened on The Wandering.',
    3,
  ),
  confluence(
    'hostcall',
    'Hostcall',
    'undyingWrath',
    'battle_1',
    'game-icons:triple-gate',
    '#e05050',
    'ladder',
    { star_iron: 4, plasma_core: 1 },
    '+{v} battle power for every node opened on The Wandering.',
    400,
  ),
  confluence(
    'sunbind',
    'Sunbind',
    'adamantCore',
    'warden_1',
    'game-icons:crossed-air-flows',
    '#c060e0',
    'boss',
    { comet_ice: 8, aether_dust: 1 },
    'Damage to planet bosses +{v}% for every node opened on The Wandering.',
    3,
  ),
]

export const FORGE_CROWNS: ForgeNodeDef[] = [
  /* ── Die fünf ALTEN: die eigene Achse bis nach unten ───────────────────────
     Jede verlangt zusätzlich den Ward IHRER Speiche auf dessen Pyre-Deckel. Der
     Covenant darüber hat ihn bereits auf 2 gefordert; die dritte Stufe ist das,
     was die Krone darüber hinaus verlangt. */
  crown(
    'wanderersGate',
    "Wanderer's Gate",
    'starroadPact',
    'game-icons:portal',
    '#ffe9a8',
    'travel',
    { solar_essence: 8, dark_matter: 3 },
    'A returning expedition opens the next passage at once.',
    [
      // EINE Wacht, die der eigenen Kette.
      { id: 'wanderersBeacon', level: FORGE_CROWN_OWN_WARD_LEVEL },
    ],
  ),
  crown(
    'wardensReprieve',
    "Warden's Reprieve",
    'hollowPact',
    'game-icons:heart-tower',
    '#ffb0b0',
    'guard',
    { moon_crystal: 40, dark_matter: 3 },
    'Once per star phase, a fallen sun returns at half health.',
    [
      // ZWEI fremde Ketten — die lange Wacht und das Leuchtfeuer der Wanderer.
      { id: 'longVigilPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'wanderersBeacon', level: FORGE_CONJUNCTION_WARD_LEVEL },
    ],
  ),
  crown(
    'midasOverflow',
    'Midas Overflow',
    'merchantsPact',
    'game-icons:gold-nuggets',
    '#b0f090',
    'market',
    { nebula_quartz: 30, solar_essence: 6 },
    'Chimes past your hoard settle into stardust.',
    [
      // EINE Wacht, die der eigenen Kette.
      { id: 'almsOfTheKeeper', level: FORGE_CROWN_OWN_WARD_LEVEL },
    ],
  ),
  crown(
    'tidelessWatch',
    'Tideless Watch',
    'foundersPact',
    'game-icons:eclipse',
    '#ffd0a0',
    'void',
    { void_shard: 10, dark_matter: 4 },
    // Zwei Sätze, ein Gedanke: der Riss nimmt weniger, und was man ihm abnimmt,
    // zahlt mehr. Die Rückzahlung hängt am BOON eines erlegten Wesens und nicht
    // an einer nachgerechneten Drossel-Bilanz — die müsste Rampe, Milderung und
    // alle gleichzeitig stehenden Wesen auseinanderhalten und wäre eine Zahl,
    // die niemand nachprüfen kann.
    'The Void takes half as much, and every creature you slay pays double.',
    [
      // EINE Wacht, die der eigenen Kette.
      { id: 'kilnSubsidy', level: FORGE_CROWN_OWN_WARD_LEVEL },
    ],
  ),
  crown(
    'sunderersMark',
    "Sunderer's Mark",
    'patientPact',
    'game-icons:broken-shield',
    '#f0b8e0',
    'boss',
    { void_shard: 8, dark_matter: 4 },
    'A boss below half health pays you its toll instead of taking it.',
    [
      // EINE Wacht, die der eigenen Kette.
      { id: 'hollowCore', level: FORGE_CROWN_OWN_WARD_LEVEL },
    ],
  ),

  /* ── Die fünf NEUEN: der Zusammenlauf zweier fremder Achsen ────────────────
     Jede sitzt auf der zweiten freien Speiche ihrer Wurzelachse und verlangt
     zwei Knoten von zwei ANDEREN Achsen. Das ist der ganze Inhalt des Rings:
     eine Regel über die Reise kauft nur, wer auch Material und Bewahrung
     ausgebaut hat.

     Die Materialrezepturen sind zugleich die erste Senke für `comet_ice`,
     `star_iron`, `plasma_core` und `aether_dust` — vier Materialien, die seit
     ihrer Einführung fallen (17,3 % des Ziehungsgewichts) und in KEINER
     Rezeptur des Spiels verlangt wurden. Die Mengen sind an dem geeicht, was
     eine alte Krone kostet (`moon_crystal: 40` ≈ 190 Drops): comet_ice 16 ·
     star_iron 8 · plasma_core 2 · aether_dust 1 entsprechen je rund 185 Drops.
     Je ein neues Material plus ein etabliertes, damit die fünf in der Liste als
     Signatur lesbar bleiben — dasselbe Prinzip wie bei den Solar Rays. */
  crown(
    'pilgrimsAccord',
    "Pilgrim's Accord",
    'cartographersPact',
    'game-icons:tied-scroll',
    '#ffe9a8',
    'travel',
    { comet_ice: 16, dark_matter: 3 },
    'A failed expedition brings its materials home anyway.',
    [
      // ZWEI fremde Ketten — das Urteil und der hohle Kern.
      { id: 'arbitersPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'hollowCore', level: FORGE_CONJUNCTION_WARD_LEVEL },
    ],
  ),
  crown(
    'stillpoint',
    'Stillpoint',
    'wardensPact',
    'game-icons:anchor',
    '#ffb0b0',
    'star',
    { star_iron: 8, solar_essence: 8 },
    'A resource star cannot fade while you are fighting on it.',
    [
      // ZWEI fremde Ketten — der Handel und der Riss. Wer den Ort festhält,
      // muss ihn erst bezahlt und dann gesichert haben.
      { id: 'hagglersPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'riftAnchor', level: FORGE_CONJUNCTION_WARD_LEVEL },
    ],
  ),
  crown(
    'reclaimedBargain',
    'Reclaimed Bargain',
    'hagglersPact',
    // Kein zweites Wagen-Motiv neben `mine-wagon` unten — innerhalb einer Liste
    // gilt „jedes Icon genau einmal", und das schliesst ähnliche Varianten
    // desselben Motivs ein. „Reclaimed" ist wörtlich ein Zurückkommen.
    'game-icons:cycle',
    '#b0f090',
    'market',
    { aether_dust: 1, nebula_quartz: 30 },
    'A Cosmic Bargain you let expire returns once, at half price.',
    [
      // ALLE DREI Ketten dieses Clusters — Riss, Sternenwacht und der eigene
      // Handel. Die dritte Fassung nimmt nicht mehr Stufen, sondern mehr Wege.
      { id: 'unbrokenPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'wardensPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'merchantsFavor', level: FORGE_CONJUNCTION_WARD_LEVEL },
    ],
  ),
  crown(
    'tirelessQuarry',
    'Tireless Quarry',
    'prospectorsPact',
    'game-icons:mine-wagon',
    '#8fe060',
    'harvest',
    { plasma_core: 2, void_shard: 10 },
    'Harvesters keep gathering for the first hour you are away.',
    [
      // ZWEI fremde Ketten — das Bündnis der Leitung und die Wacht des Handels.
      { id: 'resonantPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'almsOfTheKeeper', level: FORGE_CONJUNCTION_WARD_LEVEL },
    ],
  ),
  crown(
    'steadfastTribute',
    'Steadfast Tribute',
    'honoredPact',
    'game-icons:laurel-crown',
    '#c060a0',
    'ladder',
    { star_iron: 8, plasma_core: 2 },
    'A lost match pays its honor tribute in full.',
    [
      // ZWEI fremde Ketten — das Omen-Bündnis und die Wacht der Flut.
      { id: 'augursPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'kilnSubsidy', level: FORGE_CONJUNCTION_WARD_LEVEL },
    ],
  ),

  /* ── Die fünf DRITTEN: das Zusammentreffen dreier Achsen ────────────────
     Die Reihe des Rings ist damit vollstaendig und liest sich als Steigerung:
     eine Achse bis nach unten → zwei fremde Achsen → drei fremde Achsen. Jede
     der fünf hier holt einen ZWEIG, ein BLATT und einen WARD, jeden von einer
     anderen Wurzel — drei Ringe und drei Achsen in einer Bedingung.

     Die Stufen bleiben `FORGE_CONJUNCTION_*` und damit an der Erreichbarkeit
     geeicht: in Pyre steht ein Zweig auf höchstens 5, ein Blatt auf 4, ein Ward
     auf 3, und jede Forderung liegt genau eine Stufe darunter. Keine neue
     Konstante — was eine dritte Bedingung teurer macht, ist ihre ZAHL, nicht
     ihre Höhe. */
  crown(
    'homewardSky',
    'Homeward Sky',
    'longVigilPact',
    'game-icons:polar-star',
    '#f0d878',
    'drifter',
    { comet_ice: 16, void_shard: 10 },
    'A drifter that crossed while you were away waits in the sky for your return.',
    [
      // ALLE DREI Ketten — Sternenstraße, Hohlpakt und der eigene Traumzug.
      { id: 'starroadPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'hollowPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'dreamersDraw', level: FORGE_CONJUNCTION_WARD_LEVEL },
    ],
  ),
  crown(
    'sealedThreshold',
    'Sealed Threshold',
    'unbrokenPact',
    'game-icons:closed-doors',
    '#ff8080',
    'void',
    { star_iron: 8, moon_crystal: 40 },
    "A rift that lands while another rift's aftermath still runs takes nothing from you.",
    [
      // EINE Wacht, und zwar die der eigenen Kette: dieser Weg ganz nach unten.
      { id: 'riftAnchor', level: FORGE_CROWN_OWN_WARD_LEVEL },
    ],
  ),
  crown(
    'sanctumVeil',
    'Sanctum Veil',
    'resonantPact',
    'game-icons:aura',
    '#8fe060',
    'ability',
    { plasma_core: 2, nebula_quartz: 30 },
    "While a Bard ability's effect still runs, the Void cannot tear a rift.",
    [
      // ALLE DREI Ketten — Handel, Steinbruch und die eigene Leitung.
      { id: 'merchantsPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'prospectorsPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'chimeConduit', level: FORGE_CONJUNCTION_WARD_LEVEL },
    ],
  ),
  crown(
    'unfailingSign',
    'Unfailing Sign',
    'augursPact',
    'game-icons:sunbeams',
    '#ffb860',
    'fortune',
    { aether_dust: 1, solar_essence: 8 },
    'While an omen reward runs, the sun cannot fall below half its health.',
    [
      // ALLE DREI Ketten — Bauwerk, Ehre und der eigene Omen-Leser.
      { id: 'foundersPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'honoredPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'omenReader', level: FORGE_CONJUNCTION_WARD_LEVEL },
    ],
  ),
  crown(
    'rememberedWound',
    'Remembered Wound',
    'arbitersPact',
    'game-icons:scar-wound',
    '#e08cc8',
    'boss',
    { comet_ice: 16, star_iron: 8 },
    'A planet boss that escapes you rises again already wounded.',
    [
      // ALLE DREI Ketten — Geduld, Kartenwerk und die eigene Belagerung.
      { id: 'patientPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'cartographersPact', level: FORGE_CONJUNCTION_PACT_LEVEL },
      { id: 'siegeReckoning', level: FORGE_CONJUNCTION_WARD_LEVEL },
    ],
  ),
]

/** Alle 90 Knoten der Ringe 2–7, in Ringreihenfolge von innen nach aussen. */

/* ══ GLIMMERS — die kleinen Knoten zwischen den grossen ═════════════════════
 *
 * Sechzig Stück, und sie tun drei Dinge auf einmal, die der Baum vorher nicht
 * konnte:
 *
 *   1. **Sie füllen die Fläche.** Auf einer Bühne von 2000 px standen
 *      fünfundneunzig Knoten verloren; mit hundertfünfundfünfzig ist sie ein
 *      Netz.
 *   2. **Sie mischen die Wirkungen.** Ein Glimmer hängt an dem einen Knoten und
 *      zahlt auf einen ANDEREN — `parentId` sagt, was ihn aufschliesst,
 *      `boosts` sagt, worauf er wirkt, und dass beides auseinanderfällt, ist
 *      der Punkt. Der kleine Knoten am Kampfast zahlt auf die Wirtschaft.
 *   3. **Sie sind sofort fertig.** Drei Stufen, kein Material, ein Zehntel des
 *      Preises daneben. Ein Weg soll begehbar sein, nicht selbst ein Vorhaben.
 *
 * **Sie erfinden keine einzige neue Achse.** Jeder zahlt auf eine Zahl, die es
 * schon gibt, in derselben Einheit — `starForgeStore.glimmerBoost()` addiert
 * ihn dort, wo die Wirkung ohnehin entsteht. Sechzig neue Getter wären sechzig
 * neue Verdrahtungen und ebenso viele Stellen, an denen etwas nicht ankommt.
 *
 * **Worauf keiner zeigen darf:** eine Achse mit `FORGE_MIN_*`-Boden.
 * `forgeRingReach.spec.ts` bindet, dass jeder dieser Böden bei Vollausbau GENAU
 * erreicht wird — ein Glimmer darüber wäre eine tote Stufe, die aussieht wie
 * eine lebendige. `forgeMixing.spec.ts` rechnet die Liste nach.
 */
/**
 * Nachschlagetabelle NUR fuer die Fabrik unten.
 *
 * `getForgeNode()` geht nicht: es liest `FORGE_NODE_BY_ID`, und das entsteht
 * erst aus `FORGE_NODES` — also nach diesem Block. Ein Glimmer braucht sein
 * Ziel aber schon beim Bauen (Farbe und Beschreibungssatz kommen von dort).
 * Die sechs Raenge darueber sind zu diesem Zeitpunkt vollstaendig; mehr braucht
 * es nicht, weil ein Glimmer nie auf einen anderen Glimmer zeigt.
 */
const GLIMMER_TARGETS = new Map<string, ForgeNodeDef>(
  [
    ...FORGE_BRANCHES,
    ...FORGE_LEAVES,
    ...FORGE_WARDS,
    ...FORGE_PACTS,
    ...FORGE_BOUGHS,
    ...FORGE_CROWNS,
    ...FORGE_CONFLUENCES,
  ].map((def) => [def.id, def]),
)

function glimmer(
  id: string,
  name: string,
  parentId: string,
  boosts: string,
  family: ForgeEffectFamily,
  effectPerLevel: number,
  phase: number,
  parentBaseCost: number,
): ForgeNodeDef {
  const target = GLIMMER_TARGETS.get(boosts)
  return {
    id,
    name,
    parentId,
    tier: 'glimmer',
    // Die Phase seiner ZONE, nicht eine eigene Sprosse der Leiter. Ein Glimmer
    // geht auf, wenn der Ort aufgeht, an dem er liegt.
    phase,
    // Ein Glyph je FAMILIE statt eines je Knoten: was einen Weg interessant
    // macht, ist nicht seine Identität, sondern wohin er zahlt.
    icon: FORGE_GLIMMER_FAMILY_ICON[family],
    // Die Farbe des ZIELS — man sieht dem kleinen Knoten an, welchen grossen er
    // speist, noch bevor man auf ihn zeigt.
    color: target?.color ?? '#9fb4c8',
    family,
    // Kein eigenes Preisliteral: ein Anteil am Preis des Knotens, an dem er
    // hängt. Wird eine Phase später neu geeicht, wandern die sechzig von selbst
    // mit.
    baseCost: Math.round(parentBaseCost * FORGE_GLIMMER_BASE_COST_SHARE),
    costMultiplier: FORGE_GLIMMER_COST_MULTIPLIER,
    // Ausdrücklich LEER. Material ist der Taktgeber der grossen Ringe; ein Weg,
    // für den man erst sammeln muss, ist kein Weg.
    materialCost: {},
    desc: target ? `Adds {v} to ${target.name}.` : 'Adds {v}.',
    effectPerLevel,
    boosts,
  }
}

export const FORGE_GLIMMERS: ForgeNodeDef[] = [
  glimmer('emberTithe', 'Ember Tithe', 'aegis', 'gildedHarvest', 'click', 2, 0, 2200),
  glimmer('vigilSpark', 'Vigil Spark', 'wardensVigil', 'regeneration', 'guard', 0.15, 0, 5000),
  glimmer('quarryGleam', 'Quarry Gleam', 'cometMiner', 'tidalDrift', 'income', 2, 0, 1600),
  glimmer('sunlitDust', 'Sunlit Dust', 'gildedHarvest', 'wardensVigil', 'star', 2, 0, 7000),
  glimmer('tideEcho', 'Tide Echo', 'tidalDrift', 'sunderingWake', 'combat', 1, 0, 8000),
  glimmer('hourGrain', 'Hour Grain', 'quickening', 'moonOrbit', 'idle', 3, 0, 2400),
  glimmer('marchEmber', 'March Ember', 'shatter', 'wayfindersCache', 'travel', 4, 0, 2000),
  glimmer('sailSplinter', 'Sail Splinter', 'solarSails', 'shatter', 'combat', 2.5, 0, 1500),
  glimmer('sailGlint', 'Sail Glint', 'wayfindersCache', 'resonance', 'click', 0.6, 0, 5000),
  glimmer('moonSilt', 'Moon Silt', 'moonOrbit', 'resonance', 'click', 0.6, 0, 2000),
  glimmer('gladeSpark', 'Glade Spark', 'echoingBulwark', 'wardensVigil', 'star', 2, 1, 25000),
  glimmer('hollowGleam', 'Hollow Gleam', 'sunlitTrove', 'moonOrbit', 'idle', 3, 1, 250000),
  glimmer('veinGrain', 'Vein Grain', 'deepVein', 'gildedHarvest', 'click', 2, 1, 25000),
  glimmer('wakeEmber', 'Wake Ember', 'tidewake', 'shatter', 'combat', 2.5, 1, 250000),
  glimmer('stormGlint', 'Storm Glint', 'warhost', 'wayfindersCache', 'travel', 4, 1, 25000),
  glimmer('weftSilt', 'Weft Silt', 'timeWeaver', 'tidalDrift', 'income', 2, 1, 25000),
  glimmer('duskSpark', 'Dusk Spark', 'auroraWake', 'sunderingWake', 'combat', 1, 1, 25000),
  glimmer('crestGleam', 'Crest Gleam', 'wanderersCrest', 'regeneration', 'guard', 0.15, 1, 250000),
  glimmer('tideGrain', 'Tide Grain', 'midnightTide', 'resonance', 'click', 0.6, 1, 25000),
  glimmer('bloomEmber', 'Bloom Ember', 'vitalBloom', 'moonOrbit', 'idle', 3, 1, 25000),
  glimmer('anchorGlint', 'Anchor Glint', 'riftAnchor', 'wardensVigil', 'star', 2, 2, 120000),
  glimmer('lanternSilt', 'Lantern Silt', 'merchantsFavor', 'gildedHarvest', 'click', 2, 2, 120000),
  glimmer('almsSpark', 'Alms Spark', 'almsOfTheKeeper', 'heraldsFavor', 'ladder', 0.5, 2, 200000),
  glimmer('conduitGrain', 'Conduit Grain', 'chimeConduit', 'tidalDrift', 'income', 2, 2, 120000),
  glimmer('kilnGleam', 'Kiln Gleam', 'kilnSubsidy', 'siegeReckoning', 'boss', 0.8, 2, 200000),
  glimmer('omenSilt', 'Omen Silt', 'omenReader', 'sunderingWake', 'combat', 1, 2, 120000),
  glimmer('coreEmber', 'Core Ember', 'hollowCore', 'heraldsFavor', 'ladder', 0.5, 2, 200000),
  glimmer('oathGlint', 'Oath Glint', 'pathfindersOath', 'wayfindersCache', 'travel', 4, 2, 120000),
  glimmer('beaconSpark', 'Beacon Spark', 'wanderersBeacon', 'siegeReckoning', 'boss', 0.8, 2, 200000),
  glimmer('wellGrain', 'Well Grain', 'gravityWell', 'regeneration', 'guard', 0.15, 2, 120000),
  glimmer('vaultGleam', 'Vault Gleam', 'unbrokenPact', 'resonantPact', 'ability', 0.5, 3, 2000000),
  glimmer('wardSilt', 'Ward Silt', 'wardensPact', 'prospectorsPact', 'harvest', 0.8, 3, 2000000),
  glimmer('haggleEmber', 'Haggle Ember', 'hagglersPact', 'honoredPact', 'ladder', 0.8, 3, 2000000),
  glimmer('loomGlint', 'Loom Glint', 'merchantsPact', 'longVigilPact', 'idle', 0.1, 3, 2000000),
  glimmer('chordSpark', 'Chord Spark', 'resonantPact', 'siegeReckoning', 'boss', 0.8, 3, 2000000),
  glimmer('lodeGrain', 'Lode Grain', 'prospectorsPact', 'shatter', 'combat', 2.5, 3, 2000000),
  glimmer('foundGleam', 'Found Gleam', 'foundersPact', 'prospectorsPact', 'harvest', 0.8, 3, 2000000),
  glimmer('augurSilt', 'Augur Silt', 'augursPact', 'heraldsFavor', 'ladder', 0.5, 3, 2000000),
  glimmer('honorEmber', 'Honor Ember', 'honoredPact', 'resonantPact', 'ability', 0.5, 3, 2000000),
  glimmer('patientGlint', 'Patient Glint', 'patientPact', 'honoredPact', 'ladder', 0.8, 3, 2000000),
  glimmer('arbiterSpark', 'Arbiter Spark', 'arbitersPact', 'longVigilPact', 'idle', 0.1, 3, 2000000),
  glimmer('chartGrain', 'Chart Grain', 'cartographersPact', 'honoredPact', 'ladder', 0.8, 3, 2000000),
  glimmer('roadGleam', 'Road Gleam', 'starroadPact', 'longVigilPact', 'idle', 0.1, 3, 2000000),
  glimmer('vigilSilt', 'Vigil Silt', 'longVigilPact', 'prospectorsPact', 'harvest', 0.8, 3, 2000000),
  glimmer('hollowEmber', 'Hollow Ember', 'hollowPact', 'resonantPact', 'ability', 0.5, 3, 2000000),
  glimmer('summitSpark', 'Summit Spark', 'sealedThreshold', 'darkTithe', 'void', 3.0, 4, 25000000000),
  glimmer('stillGrain', 'Still Grain', 'stillpoint', 'kindledVigil', 'star', 1.0, 4, 25000000000),
  glimmer('cartGlint', 'Cart Glint', 'reclaimedBargain', 'brimmingCart', 'market', 1.5, 4, 25000000000),
  glimmer('spireGleam', 'Spire Gleam', 'midasOverflow', 'gildedCascade', 'click', 1.25, 4, 25000000000),
  glimmer('veilSilt', 'Veil Silt', 'sanctumVeil', 'deepResonance', 'click', 0.25, 4, 25000000000),
  glimmer('quarryEmber', 'Quarry Ember', 'tirelessQuarry', 'rivenLode', 'harvest', 1.75, 4, 25000000000),
  glimmer('watchGlint', 'Watch Glint', 'tidelessWatch', 'endlessTide', 'income', 0.75, 4, 25000000000),
  glimmer('signSpark', 'Sign Spark', 'unfailingSign', 'worldsBounty', 'harvest', 1.25, 4, 25000000000),
  glimmer('tributeGrain', 'Tribute Grain', 'steadfastTribute', 'eternalHost', 'combat', 2.0, 4, 25000000000),
  glimmer('markGleam', 'Mark Gleam', 'sunderersMark', 'rendingArc', 'combat', 0.38, 4, 25000000000),
  glimmer('woundSilt', 'Wound Silt', 'rememberedWound', 'undyingWrath', 'combat', 2.5, 4, 25000000000),
  glimmer('accordEmber', 'Accord Ember', 'pilgrimsAccord', 'driftersDue', 'drifter', 2.5, 4, 25000000000),
  glimmer('gateGlint', 'Gate Glint', 'wanderersGate', 'wayfarersHoard', 'travel', 2.25, 4, 25000000000),
  glimmer('skySpark', 'Sky Spark', 'homewardSky', 'sleeplessOrbit', 'idle', 2.0, 4, 25000000000),
  glimmer('repriveGrain', 'Reprieve Grain', 'wardensReprieve', 'adamantCore', 'guard', 22.5, 4, 25000000000),
]

export const FORGE_NODES: ForgeNodeDef[] = [
  ...FORGE_BRANCHES,
  ...FORGE_LEAVES,
  ...FORGE_WARDS,
  ...FORGE_PACTS,
  ...FORGE_CROWNS,
  ...FORGE_BOUGHS,
  // Die Confluences NACH den Boughs: adminMaxAll() arbeitet dieses Array der
  // Reihe nach ab und verlaesst sich darauf, dass jeder Vorgaenger schon dran
  // war — eine Confluence haengt an einem Bough.
  ...FORGE_CONFLUENCES,
  /*
   * Die Glimmers stehen ZULETZT, und das ist Spiellogik, keine Ordnungsliebe.
   * `starForgeStore.adminMaxAll()` arbeitet dieses Array in Reihenfolge ab und
   * prueft `nodeUnlocked` gar nicht — es verlaesst sich darauf, dass jeder
   * Vorgaenger vorher dran war. Ein Glimmer haengt an einem grossen Knoten und
   * muss deshalb nach ihm kommen; `forgeMixing.spec.ts` bindet die Ordnung.
   */
  ...FORGE_GLIMMERS,
]

/**
 * Nachschlagen über eine Map statt über `find`.
 *
 * Der Katalog hat 90 Knoten, und `starForgeStore.canAffordNode` fragt für EINEN
 * Knoten fünfmal hier nach (freigeschaltet, Höchststufe, Chime-Preis,
 * Materialpreis, Elternstufe). Seit das Shop-Abzeichen an der Header-Ecktaste
 * hängt, läuft diese Prüfung für alle 90 Knoten bei jeder Chime-Änderung —
 * ab Programmstart, nicht erst nach dem ersten Öffnen des Shop-Tabs. Als
 * lineare Suche wären das rund 40.000 Zeichenkettenvergleiche je Runde; die
 * Map macht daraus 90 Hash-Zugriffe. Mit zwei neuen Ringen ist das kein
 * Feinschliff mehr, sondern die Bedingung, unter der das Abzeichen bleiben darf.
 */
const FORGE_NODE_BY_ID = new Map(FORGE_NODES.map((n) => [n.id, n]))

export function getForgeNode(id: string): ForgeNodeDef | undefined {
  return FORGE_NODE_BY_ID.get(id)
}

/**
 * Der Anzeigename hinter einer Vorgänger-Id — Ring 1 oder Ring 2–7.
 *
 * Steht hier und nicht bei einem der beiden Aufrufer: seit `requires` existiert,
 * braucht ihn der Store (für die Bedingungsliste) UND das Ansichtsmodell (für
 * den Sperrsatz). Zwei Fassungen liefen auseinander, sobald ein Ring dazukommt.
 * Eine unbekannte Id ergibt einen leeren Namen und keinen Fehler — die
 * Erreichbarkeit prüft `forgeRequirements.spec.ts`, nicht die Anzeige.
 */
export function forgeNodeName(id: string): string {
  return FORGE_NODE_BY_ID.get(id)?.name ?? SOLAR_BRANCHES.find((ray) => ray.id === id)?.name ?? ''
}

/* ── Der Vault spricht dieselbe Sprache wie der Baum ────────────────────────
 * Relikte trugen `requiresNode` + `requiresLevel` (genau EINE Bedingung),
 * Konstellationen `nodeA` + `nodeB` (genau ZWEI). Drei Vokabulare fuer dieselbe
 * Sache, und keines davon konnte, was das dritte konnte: ein Relikt mit zwei
 * Vorgaengern war nicht schreibbar, eine Konstellation aus drei Knoten auch
 * nicht. Seit beide `requires: ForgeNodeRequirement[]` fuehren, gilt im ganzen
 * Forge-System EIN Wort — und `forgeRequirements.spec.ts` prueft sie alle mit
 * derselben Schleife.
 *
 * Die zwei Helfer halten die Umstellung kurz: neunzehn Eintraege sollen nicht
 * neunzehn Mal dieselbe Drei ausschreiben.
 */
/** Ein Vorgaenger auf der Vault-Vorgabestufe. */
const vaultReq = (id: string): ForgeNodeRequirement => ({ id, level: FORGE_VAULT_REQUIRED_LEVEL })
/** Das klassische Konstellations-PAAR — zwei Knoten auf derselben Stufe. */
const pair = (a: string, b: string): ForgeNodeRequirement[] => [vaultReq(a), vaultReq(b)]

// ── Crafted Relics — fuse a grown branch with materials, leveled Lv 1–3 ──────
export const FORGE_RELICS: ForgeRelicDef[] = [
  {
    id: 'echoOfTheVoid',
    name: 'Echo of the Void',
    rarity: 'epic',
    icon: 'game-icons:evil-moon',
    color: '#c9a0ff',
    requires: [vaultReq('moonOrbit'), { id: 'midnightTide', level: 2 }],
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
    requires: [vaultReq('warcry'), { id: 'warhost', level: 2 }],
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
    requires: [vaultReq('regeneration'), { id: 'vitalBloom', level: 2 }],
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
    requires: [vaultReq('resonance'), { id: 'echoChamber', level: 2 }],
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
    requires: [vaultReq('solarSails'), { id: 'auroraWake', level: 2 }],
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
    requires: [vaultReq('shatter'), { id: 'starquake', level: 2 }],
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
  // Chime-Ertrags, die nach UNTEN zeigen (`FORGE_YIELD_SOURCES`, nature `toll`),
  // und der Spieler hatte gegen sie bis hierhin kein einziges Kaufangebot —
  // nur Warten. Ein Zoll, den man abkaufen kann, ist eine Entscheidung; einer,
  // den man nur aussitzt, ist eine Wartezeit.
  {
    id: 'riftwardensSeal',
    name: "Riftwarden's Seal",
    rarity: 'epic',
    icon: 'game-icons:wax-seal',
    color: '#e0409f',
    requires: [vaultReq('aegis'), { id: 'riftAnchor', level: 2 }],
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
    requires: [vaultReq('moonOrbit'), { id: 'wanderersBeacon', level: 2 }],
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
    requires: [vaultReq('gildedHarvest'), { id: 'sunlitTrove', level: 2 }],
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

  /* ── Drei Relikte, die MEHR als einen Knoten verlangen ──────────────────
     Was `requiresNode` + `requiresLevel` strukturell nicht konnte. Keins
     wartet dabei laenger als noetig: ein Zweig auf 3 und ein Blatt auf 2 sind
     BEIDE erstmals in Zenith erreichbar (`min(cap, 1 + Phase − Ringphase)`), ein
     Ward auf 2 in Swell.

     Alle drei bleiben von `otherDps` weg. `championXpMult` ist dabei der in
     docs/balance.md benannte ehrliche Ersatz für Champion-DPS: er laeuft neben
     der Ladder her, statt sich gegen die Boss-Formel wegzukuerzen. */
  {
    id: 'skyboundAltar',
    name: 'Skybound Altar',
    rarity: 'epic',
    icon: 'game-icons:star-altar',
    color: '#8fe060',
    requires: [vaultReq('resonance'), { id: 'chimeConduit', level: 2 }],
    maxLevel: 5,
    goldCost: 8_000,
    goldMultiplier: 3,
    materialCost: { void_shard: 3, comet_ice: 6 },
    // Die WIRKUNG der Faehigkeiten, nicht ihre Abklingzeit: die laeuft gegen
    // `FORGE_MIN_BARD_COOLDOWN_MULT`, an dem der Ward in der Bedingung schon
    // zieht. Zwei Kaeufe auf dieselbe Kappe waeren einer zu viel.
    desc: "The Bard's abilities strike an additional {v}% harder.",
    effectPerLevel: 6,
    sourceLabel: 'Resonance branch + Chime Conduit',
  },
  {
    id: 'chaliceOfTheFallen',
    name: 'Chalice of the Fallen',
    rarity: 'epic',
    icon: 'game-icons:jeweled-chalice',
    color: '#e08cc8',
    requires: [
      vaultReq('shatter'),
      { id: 'starquake', level: 2 },
      { id: 'siegeReckoning', level: 2 },
    ],
    maxLevel: 5,
    goldCost: 11_000,
    goldMultiplier: 3,
    materialCost: { star_iron: 3, dark_matter: 1 },
    desc: 'Planet bosses pay an additional {v}% more chimes.',
    effectPerLevel: 10,
    sourceLabel: 'Shatter branch + Starquake + Siege Reckoning',
  },
  {
    id: 'heraldsTrophy',
    name: "Herald's Trophy",
    rarity: 'rare',
    icon: 'game-icons:trophy',
    color: '#c060a0',
    requires: [vaultReq('warcry'), { id: 'warhost', level: 2 }],
    maxLevel: 5,
    goldCost: 5_500,
    goldMultiplier: 3,
    materialCost: { moon_crystal: 12, nebula_quartz: 5 },
    desc: 'Champions gain an additional {v}% experience.',
    effectPerLevel: 10,
    sourceLabel: 'Warcry branch + Warhost',
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
    requires: pair('solarSails', 'quickening'),
    goldCost: 12_000,
    materialCost: { stardust: 15, nebula_quartz: 5 },
    desc: '+18% Chimes/Sec.',
    sourceLabel: 'Solar Sails + Quickening · +18% idle',
  },
  {
    id: 'shatteringNova',
    name: 'Shattering Nova',
    icon: 'game-icons:beams-aura',
    color: '#ff9a5c',
    requires: pair('goldenEcho', 'shatter'),
    goldCost: 15_000,
    materialCost: { solar_essence: 4, moon_crystal: 10 },
    desc: 'Clicks splash 10% of their damage to all enemies.',
    sourceLabel: 'Golden Echo + Shatter · click AoE',
  },
  {
    id: 'bulwarkPact',
    name: 'Bulwark Pact',
    icon: 'game-icons:temporary-shield',
    color: '#7bb8ff',
    requires: pair('aegis', 'warcry'),
    goldCost: 15_000,
    materialCost: { moon_crystal: 12, void_shard: 2 },
    desc: 'All damage taken reduced by an additional 10%.',
    sourceLabel: 'Aegis + Warcry · −10% damage taken',
  },
  {
    id: 'prospectorsCharm',
    name: "Prospector's Charm",
    icon: 'game-icons:mine-wagon',
    color: '#e8c040',
    requires: [...pair('cometMiner', 'resonance'), { id: 'quarrymastersEye', level: 2 }],
    goldCost: 18_000,
    materialCost: { stardust: 25, solar_essence: 3 },
    desc: 'Every material drop grants +1 extra material.',
    sourceLabel: 'Comet Miner + Resonance · +1 drop',
  },
  {
    id: 'eternalOrbit',
    name: 'Eternal Orbit',
    icon: 'game-icons:ouroboros',
    color: '#c9a0ff',
    requires: [...pair('moonOrbit', 'regeneration'), { id: 'vitalBloom', level: 2 }],
    goldCost: 20_000,
    materialCost: { void_shard: 3, dark_matter: 1 },
    desc: '+15% offline earnings and HP regeneration is doubled.',
    sourceLabel: 'Moon Orbit + Regeneration · offline & regen',
  },
  {
    id: 'goldenTempest',
    name: 'Golden Tempest',
    icon: 'game-icons:tornado',
    color: '#ffd76a',
    requires: pair('goldenEcho', 'quickening'),
    goldCost: 16_000,
    materialCost: { stardust: 20, solar_essence: 2 },
    desc: '+12% Chimes/Click.',
    sourceLabel: 'Golden Echo + Quickening · +12% clicks',
  },
  {
    id: 'huntersVigil',
    name: "Hunter's Vigil",
    icon: 'game-icons:night-vision',
    color: '#e08cc8',
    requires: pair('warcry', 'shatter'),
    goldCost: 17_000,
    materialCost: { moon_crystal: 10, dark_matter: 1 },
    desc: 'Orbiting champions deal an additional +10% DPS.',
    sourceLabel: 'Warcry + Shatter · +10% champion DPS',
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
    requires: [...pair('aegis', 'sunderingWake'), { id: 'riftAnchor', level: 2 }],
    goldCost: 24_000,
    materialCost: { void_shard: 5, dark_matter: 2 },
    // Der Riss war bis hierhin reiner Verlust — er kostet Chimes, Meeps und
    // Sonnen-HP und gibt nichts zurück. Mit dem Pakt wird das Aufräumen zur
    // Quelle des Materials, das die Forge am dringendsten braucht.
    desc: 'Void creatures your orbit destroys leave a Void Shard behind.',
    sourceLabel: 'Aegis + Sundering Wake · shards from kills',
  },
  {
    id: 'caretakersLedger',
    name: "Caretaker's Ledger",
    icon: 'game-icons:scroll-quill',
    color: '#e8c040',
    requires: [...pair('goldenEcho', 'cometMiner'), { id: 'coinCascade', level: 2 }],
    goldCost: 21_000,
    materialCost: { stardust: 30, nebula_quartz: 6 },
    // Bindet die Klick-Achse an die Material-Achse: wer auf Doppelklicks
    // gespielt hat, erntet damit auch ohne Sternenfall. Der Wurf hängt am
    // TREFFER, nicht am Klick — sonst hinge die Ausbeute an der Klickrate
    // statt am Ausbau.
    desc: 'Every doubled click has a chance to shake a material loose.',
    sourceLabel: 'Golden Echo + Comet Miner · materials from clicks',
  },
  {
    id: 'starfarersCompact',
    name: "Starfarer's Compact",
    icon: 'game-icons:portal',
    color: '#7bb8ff',
    requires: [...pair('wayfindersCache', 'moonOrbit'), { id: 'midnightTide', level: 2 }],
    goldCost: 26_000,
    materialCost: { solar_essence: 5, void_shard: 3 },
    // Nicht „mehr Offline-Ertrag" — das trägt der Moon-Orbit-Zweig bereits
    // dreifach. Die Fusion verschiebt die GRENZE, gegen die er läuft: acht
    // Stunden mehr, die überhaupt erst gezählt werden.
    desc: 'Offline progress counts 8 hours longer.',
    sourceLabel: "Wayfinder's Cache + Moon Orbit · +8h offline cap",
  },

  /* ── Drei Konstellationen aus DREI Knoten ────────────────────────────
     Genau das, was `nodeA`/`nodeB` strukturell nie konnten — der eigentliche
     Grund fuer die Vokabular-Umstellung.

     Alle drei setzen eine REGEL statt einer Zahl, die Linie, die
     `voidboundPact`, `caretakersLedger` und `starfarersCompact` eroeffnet
     haben. Eine Konstellation ist ein EINMALKAUF ohne Stufe; eine Regel passt
     dazu, ein Prozentwert mit Zwischenschritten nicht — dasselbe Argument wie
     beim Kronen-Ring. Sie zaehlen nicht in die Codex-Bahn „Sunsmith“ und
     verschieben deren Maximum daher nicht. */
  {
    id: 'waitingRoad',
    name: 'The Waiting Road',
    icon: 'game-icons:interstellar-path',
    color: '#e8c040',
    requires: [
      vaultReq('solarSails'),
      vaultReq('wayfindersCache'),
      { id: 'pathfindersOath', level: 2 },
    ],
    goldCost: 30_000,
    materialCost: { comet_ice: 6, solar_essence: 4 },
    // Die Uhr des ANGEBOTS, nicht die der Reise: das Tempo traegt
    // `stellarCompass` und laeuft gegen `FORGE_MIN_EXPEDITION_MULT`. Ein
    // Angebot, das wartet, nimmt dem Spieler nur die Strafe dafür, dass er
    // gerade woanders war.
    desc: 'An expedition offer no longer expires — it waits until you answer it.',
    sourceLabel: "Solar Sails + Wayfinder's Cache + Pathfinder's Oath",
  },
  {
    id: 'standingVein',
    name: 'The Standing Vein',
    icon: 'game-icons:ringed-planet',
    color: '#e89840',
    requires: [
      vaultReq('cometMiner'),
      { id: 'deepVein', level: 2 },
      { id: 'quarrymastersEye', level: 2 },
    ],
    goldCost: 28_000,
    materialCost: { star_iron: 3, nebula_quartz: 8 },
    desc: 'A planet knocked down keeps its harvesters at work.',
    sourceLabel: "Comet Miner + Deep Vein + Quarrymaster's Eye",
  },
  {
    id: 'twinnedSky',
    name: 'Twinned Sky',
    icon: 'game-icons:star-satellites',
    color: '#f0d878',
    requires: [
      vaultReq('moonOrbit'),
      { id: 'midnightTide', level: 2 },
      { id: 'wanderersBeacon', level: 2 },
    ],
    goldCost: 32_000,
    materialCost: { aether_dust: 1, void_shard: 4 },
    // Ein Platz mehr am Himmel, keine schnellere Uhr: der Abstand laeuft gegen
    // `FORGE_MIN_DRIFTER_INTERVAL_MULT`, an dem der Ward in der Bedingung schon
    // zieht.
    desc: 'Two drifters may cross your sky at once.',
    sourceLabel: "Moon Orbit + Midnight Tide + Wanderer's Beacon",
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
