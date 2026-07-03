import type {
  ForgeNodeDef,
  ForgeRelicDef,
  ForgeConstellationDef,
  ForgeBargainDef,
} from '../types'
import {
  FORGE_BRANCH_UNLOCK_PHASE,
  FORGE_LEAF_UNLOCK_PHASE,
} from './constants'

// ═════════════════════════════════════════════════════════════════════════════
// STAR FORGE — static catalog
// Ring 1 (roots) = the 5 solar branches in solarUpgradeStore (unchanged).
// Ring 2 (branches) & ring 3 (leaves) are defined here and live in
// starForgeStore. Root angles: flightSpeed 270°, maxHp 342°,
// chimesPerClick 54°, chimesPerSecond 126°, dmgPerClick 198°.
// ═════════════════════════════════════════════════════════════════════════════

// ── Branches (ring 2) — two per root, root angle ± 24° ───────────────────────
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
    id: 'allegro',
    name: 'Allegro',
    parentId: 'chimesPerSecond',
    tier: 'branch',
    phase: FORGE_BRANCH_UNLOCK_PHASE,
    icon: 'game-icons:extra-time',
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
]

// ── Leaves (ring 3) — one per branch, same angle, uniform amplify mechanic ───
// Each leaf level amplifies its parent branch's effect by
// FORGE_LEAF_AMPLIFY_PER_LEVEL (25%).
function leaf(
  id: string,
  name: string,
  parentId: string,
  icon: string,
  color: string,
  angleDeg: number,
  materialCost: Record<string, number>,
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
    baseCost: 25_000,
    costMultiplier: 2.5,
    materialCost,
    desc: 'Amplifies {p} by +{v}%.',
    effectPerLevel: 0,
  }
}

export const FORGE_LEAVES: ForgeNodeDef[] = [
  leaf('auroraWake', 'Aurora Wake', 'solarSails', 'game-icons:sunrise', '#e8c040', 246, { solar_essence: 2 }),
  leaf('midnightTide', 'Midnight Tide', 'moonOrbit', 'game-icons:night-sky', '#f0d878', 294, { void_shard: 2 }),
  leaf('vitalBloom', 'Vital Bloom', 'regeneration', 'game-icons:heart-plus', '#e05050', 318, { solar_essence: 2 }),
  leaf('echoingBulwark', 'Echoing Bulwark', 'aegis', 'game-icons:shield-echoes', '#ff8080', 6, { void_shard: 2 }),
  leaf('coinCascade', 'Coin Cascade', 'goldenEcho', 'game-icons:coins-pile', '#52b830', 30, { solar_essence: 2 }),
  leaf('echoChamber', 'Echo Chamber', 'resonance', 'game-icons:echo-ripples', '#8fe060', 78, { void_shard: 2 }),
  leaf('deepVein', 'Deep Vein', 'cometMiner', 'game-icons:gold-mine', '#e89840', 102, { solar_essence: 2 }),
  leaf('timeWeaver', 'Time Weaver', 'allegro', 'game-icons:clockwork', '#ffb860', 150, { dark_matter: 1 }),
  leaf('battleChorus', 'Battle Chorus', 'warcry', 'game-icons:swords-power', '#c060a0', 174, { void_shard: 2 }),
  leaf('starquake', 'Starquake', 'shatter', 'game-icons:implosion', '#e08cc8', 222, { dark_matter: 1 }),
]

export const FORGE_NODES: ForgeNodeDef[] = [...FORGE_BRANCHES, ...FORGE_LEAVES]

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
    maxLevel: 3,
    goldCost: 6_000,
    goldMultiplier: 3,
    materialCost: { void_shard: 3, dark_matter: 1 },
    desc: 'Offline earnings +{v}% and extends the offline cap by 4 hours.',
    effectPerLevel: 20,
    sourceLabel: 'Moon Orbit branch + Void Shards',
  },
  {
    id: 'choirOfChampions',
    name: 'Choir of Champions',
    rarity: 'rare',
    icon: 'game-icons:musical-score',
    color: '#e8c040',
    requiresNode: 'warcry',
    requiresLevel: 3,
    maxLevel: 3,
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
    maxLevel: 3,
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
    maxLevel: 3,
    goldCost: 7_500,
    goldMultiplier: 3,
    materialCost: { nebula_quartz: 6, moon_crystal: 10 },
    desc: 'Clicks gain an additional +{v}% of your Chimes/Sec.',
    effectPerLevel: 10,
    sourceLabel: 'Resonance branch + Nebula Quartz',
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
    nodeB: 'allegro',
    goldCost: 12_000,
    materialCost: { stardust: 15, nebula_quartz: 5 },
    desc: '+18% Chimes/Sec.',
    pairLabel: 'Solar Sails + Allegro · +18% idle',
  },
  {
    id: 'percussiveNova',
    name: 'Percussive Nova',
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
    id: 'bulwarkChoir',
    name: 'Bulwark Choir',
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
    id: 'prospectorsSong',
    name: "Prospector's Song",
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
    id: 'eternalCadence',
    name: 'Eternal Cadence',
    icon: 'game-icons:ouroboros',
    color: '#c9a0ff',
    nodeA: 'moonOrbit',
    nodeB: 'regeneration',
    goldCost: 20_000,
    materialCost: { void_shard: 3, dark_matter: 1 },
    desc: '+15% offline earnings and HP regeneration is doubled.',
    pairLabel: 'Moon Orbit + Regeneration · offline & regen',
  },
]

export function getForgeConstellation(id: string): ForgeConstellationDef | undefined {
  return FORGE_CONSTELLATIONS.find((c) => c.id === id)
}

// ── Cosmic Bargain — rotating deal pool ───────────────────────────────────────
export const FORGE_BARGAINS: ForgeBargainDef[] = [
  {
    id: 'midasCadence',
    name: 'Midas Cadence',
    icon: 'game-icons:take-my-money',
    desc: 'Doubles Chimes/Click for 30 minutes.',
    basePrice: 15_000,
    discountPct: 0.4,
    kind: 'buff',
    buffId: 'cpcX2',
    durationMs: 30 * 60_000,
  },
  {
    id: 'tempoSurge',
    name: 'Tempo Surge',
    icon: 'game-icons:profit',
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
    icon: 'game-icons:swap-bag',
    desc: 'A crate of materials gathered from passing comets.',
    basePrice: 10_000,
    discountPct: 0.3,
    kind: 'materials',
    materials: { stardust: 12, moon_crystal: 8, nebula_quartz: 4, solar_essence: 1 },
  },
  {
    id: 'solarWinds',
    name: 'Solar Winds',
    icon: 'game-icons:time-synchronization',
    desc: 'Skips 25% of the remaining phase dwell time.',
    basePrice: 25_000,
    discountPct: 0.4,
    kind: 'dwellSkip',
    dwellSkipPct: 0.25,
  },
  {
    id: 'goldRush',
    name: 'Gold Rush',
    icon: 'game-icons:receive-money',
    desc: 'Trade rare shards for a heap of chimes.',
    basePrice: 0,
    discountPct: 0,
    kind: 'gold',
    materials: { void_shard: 1 },
    goldReward: 8_000,
  },
]

export function getForgeBargain(id: string): ForgeBargainDef | undefined {
  return FORGE_BARGAINS.find((b) => b.id === id)
}
