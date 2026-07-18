/**
 * Meep Skill Tree — five themed branches of one-time upgrades bought with Meeps.
 * Every node requires the previous node of its branch (linear chains).
 * All icons share one placeholder image until per-node artwork exists.
 */

/** Placeholder artwork for every node — swap per-node `icon` fields later. */
export const MEEP_TREE_PLACEHOLDER_ICON = '/img/BardAbilities/Bard.png'

/** Folded effect bag produced by the store from all bought nodes. */
export interface MeepTreeEffects {
  /** ×: chimes per second */
  cpsMult: number
  /** ×: chimes per click */
  cpcMult: number
  /** +: chance that a click counts twice (stacks with Star Forge) */
  doubleClickChance: number
  /** +: clicks additionally gain this fraction of total CpS */
  cpcFromCpsPct: number
  /** ×: chime requirement per Meep (lower = cheaper) */
  meepCostMult: number
  /** ×: battle power gained per Meep */
  meepPowerMult: number
  /** +: flat battle power */
  powerBonus: number
  /** ×: expedition chime rewards */
  expeditionRewardMult: number
  /** ×: expedition duration (lower = faster) */
  expeditionSpeedMult: number
  /** ×: champion orbit DPS */
  championDpsMult: number
  /** ×: all damage dealt to planet bosses */
  bossDamageMult: number
  /** ×: material drop chance */
  materialDropMult: number
  /** +: player HP regeneration per second */
  hpRegenPerSec: number
  /** ×: damage the player takes (lower = tankier) */
  damageTakenMult: number
  /** ×: offline chime earnings */
  offlineEarningsMult: number
  /** +: hours added to the offline earnings cap */
  offlineMaxHoursBonus: number
}

/** Keys that fold multiplicatively (start at 1); everything else folds additively (start at 0). */
export const MEEP_TREE_MULTIPLICATIVE_KEYS: ReadonlyArray<keyof MeepTreeEffects> = [
  'cpsMult',
  'cpcMult',
  'meepCostMult',
  'meepPowerMult',
  'expeditionRewardMult',
  'expeditionSpeedMult',
  'championDpsMult',
  'bossDamageMult',
  'materialDropMult',
  'damageTakenMult',
  'offlineEarningsMult',
]

export interface MeepTreeNodeDef {
  id: string
  name: string
  /** Short effect label shown on the node card */
  effect: string
  /** One-line flavor/detail line */
  desc: string
  cost: number
  effects: Partial<MeepTreeEffects>
}

export interface MeepTreeBranchDef {
  id: string
  name: string
  tagline: string
  /** Branch accent color (node glow, connectors, progress) */
  color: string
  nodes: MeepTreeNodeDef[]
}

export const MEEP_TREE_BRANCHES: MeepTreeBranchDef[] = [
  {
    id: 'melody',
    name: 'Melody',
    tagline: 'Idle production & offline echoes',
    color: '#e8c040',
    nodes: [
      {
        id: 'melody_1',
        name: 'Gentle Tune',
        effect: '+25% Chimes/s',
        desc: 'A soft melody keeps the chimes ringing on their own.',
        cost: 3,
        effects: { cpsMult: 1.25 },
      },
      {
        id: 'melody_2',
        name: 'Rising Chorus',
        effect: '+50% Chimes/s',
        desc: 'More voices join the song of the spheres.',
        cost: 8,
        effects: { cpsMult: 1.5 },
      },
      {
        id: 'melody_3',
        name: 'Lingering Echo',
        effect: '+50% Offline Earnings',
        desc: 'The song keeps playing while you are away.',
        cost: 20,
        effects: { offlineEarningsMult: 1.5 },
      },
      {
        id: 'melody_4',
        name: 'Grand Symphony',
        effect: '+100% Chimes/s',
        desc: 'Every building plays in perfect harmony.',
        cost: 45,
        effects: { cpsMult: 2 },
      },
      {
        id: 'melody_5',
        name: 'Eternal Song',
        effect: '+4h Offline Cap · +50% Chimes/s',
        desc: 'A song that never truly ends.',
        cost: 95,
        effects: { offlineMaxHoursBonus: 4, cpsMult: 1.5 },
      },
    ],
  },
  {
    id: 'resonance',
    name: 'Resonance',
    tagline: 'Click power & echoes on touch',
    color: '#6ec040',
    nodes: [
      {
        id: 'reso_1',
        name: 'Firm Strike',
        effect: '+25% Chimes/Click',
        desc: 'Each touch of the chime rings a little louder.',
        cost: 3,
        effects: { cpcMult: 1.25 },
      },
      {
        id: 'reso_2',
        name: 'Ringing Blow',
        effect: '+50% Chimes/Click',
        desc: 'The chime answers your hand with force.',
        cost: 8,
        effects: { cpcMult: 1.5 },
      },
      {
        id: 'reso_3',
        name: 'Twin Echo',
        effect: '10% Double-Click Chance',
        desc: 'Sometimes a single strike rings twice.',
        cost: 20,
        effects: { doubleClickChance: 0.1 },
      },
      {
        id: 'reso_4',
        name: 'Thunder Chime',
        effect: '+100% Chimes/Click',
        desc: 'Your strikes shake the firmament.',
        cost: 45,
        effects: { cpcMult: 2 },
      },
      {
        id: 'reso_5',
        name: 'Worldbell',
        effect: 'Clicks gain +2% of CpS · +50% Chimes/Click',
        desc: 'Every strike carries the weight of the whole song.',
        cost: 95,
        effects: { cpcFromCpsPct: 0.02, cpcMult: 1.5 },
      },
    ],
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    tagline: 'Meeps & portal expeditions',
    color: '#40a0e0',
    nodes: [
      {
        id: 'cosmos_1',
        name: 'Meep Whisper',
        effect: '−10% Meep Cost',
        desc: 'Meeps gather at the sound of fewer chimes.',
        cost: 4,
        effects: { meepCostMult: 0.9 },
      },
      {
        id: 'cosmos_2',
        name: 'Star Charts',
        effect: '+25% Expedition Rewards',
        desc: 'Well-planned journeys return with richer spoils.',
        cost: 10,
        effects: { expeditionRewardMult: 1.25 },
      },
      {
        id: 'cosmos_3',
        name: 'Meep Choir',
        effect: '−15% Meep Cost',
        desc: 'The choir sings new meeps into being.',
        cost: 22,
        effects: { meepCostMult: 0.85 },
      },
      {
        id: 'cosmos_4',
        name: 'Portal Winds',
        effect: 'Expeditions 20% Faster',
        desc: 'Favorable winds carry your champions home sooner.',
        cost: 48,
        effects: { expeditionSpeedMult: 0.8 },
      },
      {
        id: 'cosmos_5',
        name: 'Caretaker’s Bond',
        effect: '+30% Meep Power · −10% Meep Cost',
        desc: 'Your meeps fight — and multiply — for their keeper.',
        cost: 100,
        effects: { meepPowerMult: 1.3, meepCostMult: 0.9 },
      },
    ],
  },
  {
    id: 'battle',
    name: 'Battle',
    tagline: 'Auto-battle power & champions',
    color: '#e05050',
    nodes: [
      {
        id: 'battle_1',
        name: 'War Drums',
        effect: '+500 Power',
        desc: 'A steady beat drives your team forward.',
        cost: 4,
        effects: { powerBonus: 500 },
      },
      {
        id: 'battle_2',
        name: 'Battle Hymn',
        effect: '+10% Champion DPS',
        desc: 'Champions strike harder to the rhythm of your song.',
        cost: 10,
        effects: { championDpsMult: 1.1 },
      },
      {
        id: 'battle_3',
        name: 'Standard Bearer',
        effect: '+1500 Power',
        desc: 'Your banner alone tips the scales of ranked battles.',
        cost: 22,
        effects: { powerBonus: 1500 },
      },
      {
        id: 'battle_4',
        name: 'Crescendo of Blades',
        effect: '+15% Champion DPS',
        desc: 'The song swells — and so does every strike.',
        cost: 48,
        effects: { championDpsMult: 1.15 },
      },
      {
        id: 'battle_5',
        name: 'Legend of the Rift',
        effect: '+5000 Power',
        desc: 'Tales of your team echo through every universe.',
        cost: 100,
        effects: { powerBonus: 5000 },
      },
    ],
  },
  {
    id: 'warden',
    name: 'Warden',
    tagline: 'Boss fights, survival & materials',
    color: '#c060e0',
    nodes: [
      {
        id: 'warden_1',
        name: 'Piercing Note',
        effect: '+10% Boss Damage',
        desc: 'A sharp note that cuts through boss armor.',
        cost: 4,
        effects: { bossDamageMult: 1.1 },
      },
      {
        id: 'warden_2',
        name: 'Prospector’s Ear',
        effect: '+20% Material Drop Chance',
        desc: 'You hear where the rarest materials hide.',
        cost: 10,
        effects: { materialDropMult: 1.2 },
      },
      {
        id: 'warden_3',
        name: 'Soothing Refrain',
        effect: '+1 HP Regen/s',
        desc: 'A calm refrain mends the sun’s wounds.',
        cost: 22,
        effects: { hpRegenPerSec: 1 },
      },
      {
        id: 'warden_4',
        name: 'Chime Ward',
        effect: '−15% Damage Taken',
        desc: 'A shield of sound blunts every enemy blow.',
        cost: 48,
        effects: { damageTakenMult: 0.85 },
      },
      {
        id: 'warden_5',
        name: 'Bossbreaker',
        effect: '+30% Boss Damage',
        desc: 'No planetary tyrant withstands the final chord.',
        cost: 100,
        effects: { bossDamageMult: 1.3 },
      },
    ],
  },
]

/** Flat lookup: node id → { branch, node, index within branch }. */
export const MEEP_TREE_NODE_INDEX: Record<
  string,
  { branch: MeepTreeBranchDef; node: MeepTreeNodeDef; index: number }
> = Object.fromEntries(
  MEEP_TREE_BRANCHES.flatMap((branch) =>
    branch.nodes.map((node, index) => [node.id, { branch, node, index }]),
  ),
)

export const MEEP_TREE_TOTAL_NODES = MEEP_TREE_BRANCHES.reduce(
  (sum, b) => sum + b.nodes.length,
  0,
)
