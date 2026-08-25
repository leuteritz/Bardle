/**
 * Meep Skill Tree — five themed branches of one-time upgrades bought with Meeps.
 * A node opens once ANY node of the rank below it is learned; each node carries
 * its own game-icons glyph, tinted in its branch color.
 *
 * **Rank 4 is a fork.** Every branch offers two nodes there, and learning one
 * seals the other for the rest of the universe — the first place in the tree
 * where the player decides rather than accumulates. Rank 5 accepts either side,
 * so no choice is a dead end.
 * Both sides of a fork cost the SAME (55 / 55 / 70 / 70 / 70). That is not
 * cosmetic: it is what keeps "what a full tree costs" a single number at all.
 * Priced differently, the total would depend on which side the player picks,
 * and `MEEP_TREE_TOTAL_COST` would stop meaning anything —
 * `__tests__/config/meepEconomy.spec.ts` binds the equality for that reason.
 *
 * Die Preise sind gegen die AUSSCHÜTTUNG geeicht, nicht frei gewählt. Meeps
 * fallen seit dem Umbau nur beim Aufbruch in ein neues Universum an
 * (`gameStore.pendingMeeps`), und der Baum überlebt das Prestige — er ist
 * damit die einzige Senke dafür.
 *
 * Der Bezugspunkt ist der DAUERRHYTHMUS, seit die Ausbeute gegen den besten
 * abgeschlossenen Lauf misst (`MEEP_RUN_BASE_MIN` / `MEEP_RUN_SHARE`): weil
 * `UNIVERSE_RESCUE_COST_MULTIPLIER` 2 ist, liegt wer jeweils an der
 * Rettungsschwelle aufbricht dauerhaft bei 2× Bestwert und bekommt **45 Meeps
 * je Aufbruch** — über das ganze Spiel, unabhängig von der Größenordnung der
 * Chime-Zahlen. Die Summe 1188 entspricht damit rund 26 Aufbrüchen; mit dem
 * eigenen Rabatt des Baums (`meepCostMult`, voll gekauft 0,6885 ⇒ ×1,21
 * Ausbeute) sind es rund 22. Der Baum verbilligt also seinen eigenen Rest, und
 * die Summe ist bewusst NICHT am vollen Zufluss ausgerichtet.
 *
 * Die Leiter ist vorn schnell und hinten gestreckt: die 31 Meeps des ersten
 * Aufbruchs kaufen alle fünf Erststufen plus einen Zweitstufen-Knoten, der
 * teuerste bleibt Spätspielziel. Gewollt — die frühen Knoten sind das, was den
 * Aufbruch überhaupt lohnend macht.
 *
 * Wer die Ausbeute ändert (`MEEP_RUN_FACTOR`, `MEEP_RUN_BASE_MIN`,
 * `MEEP_RUN_SHARE`) oder eine Stufe hier anfasst, verschiebt diese Balance:
 * `__tests__/config/meepEconomy.spec.ts` bindet die Summe an
 * `MEEP_TREE_TOTAL_COST` und prüft zusätzlich, dass der ganze Baum in 20 bis 32
 * Aufbrüche passt — damit die beiden Zahlen nicht stillschweigend
 * auseinanderlaufen.
 */

/** Meep cost badge icon (pre-scaled, shown at ~14px in every node badge). */
export const MEEP_TREE_BADGE_ICON = '/img/BardAbilities/BardMeep-64.png'

/** Start node artwork (pre-scaled 128px variant of BardMeep.png). */
export const MEEP_TREE_START_ICON = '/img/BardAbilities/BardMeep-128.png'

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
  /** `game-icons:*` glyph shown in the node circle — unique across the whole tree */
  icon: string
  /** Short effect label shown on the node card */
  effect: string
  /** One-line flavor/detail line */
  desc: string
  cost: number
  effects: Partial<MeepTreeEffects>
  /**
   * Rank within the branch, 0-based — the ONLY structural field written by
   * hand. The array index stopped being a rank the moment rank 4 gained a
   * second node; everything else (what a node requires, what it seals) is
   * derived from this number in `MEEP_TREE_NODE_INDEX`, so no two fields can
   * ever drift apart.
   */
  tier: number
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
    id: 'vigil',
    name: 'Vigil',
    tagline: 'Idle production & offline echoes',
    color: '#e8c040',
    nodes: [
      {
        id: 'vigil_1',
        name: 'Steady Watch',
        icon: 'game-icons:candlebright', // a light left burning
        effect: '+25% Chimes/s',
        desc: 'A patient watch keeps the chimes ringing on their own.',
        cost: 3,
        tier: 0,
        effects: { cpsMult: 1.25 },
      },
      {
        id: 'vigil_2',
        name: 'Widening Orbit',
        icon: 'game-icons:orbit', // the watch reaches further out
        effect: '+50% Chimes/s',
        desc: 'Your care reaches further across the sky.',
        cost: 10,
        tier: 1,
        effects: { cpsMult: 1.5 },
      },
      {
        id: 'vigil_3',
        name: 'Lingering Echo',
        icon: 'game-icons:night-sleep', // earnings while you are away
        effect: '+50% Offline Earnings',
        desc: 'The vigil holds while you are away.',
        cost: 26,
        tier: 2,
        effects: { offlineEarningsMult: 1.5 },
      },
      {
        id: 'vigil_4',
        name: 'Perfect Alignment',
        icon: 'game-icons:solar-system', // every body on the same path
        effect: '+100% Chimes/s',
        desc: 'Every building falls into the same orbit.',
        cost: 55,
        tier: 3,
        effects: { cpsMult: 2 },
      },
      {
        id: 'vigil_4b',
        name: 'Longnight Watch',
        icon: 'game-icons:moon-orbit', // the sky asleep, the watch deepening
        effect: '+120% Offline Earnings',
        desc: 'The watch deepens while the sky sleeps.',
        cost: 55,
        tier: 3,
        effects: { offlineEarningsMult: 2.2 },
      },
      {
        id: 'vigil_5',
        name: 'Endless Vigil',
        icon: 'game-icons:infinity', // a watch without end
        effect: '+4h Offline Cap · +50% Chimes/s',
        desc: 'A watch that never truly ends.',
        cost: 110,
        tier: 4,
        effects: { offlineMaxHoursBonus: 4, cpsMult: 1.5 },
      },
      {
        id: 'vigil_6',
        name: 'The Long Watch',
        icon: 'game-icons:watchtower', // a tower that keeps its own vigil
        effect: '+6h Offline Cap \u00b7 +60% Offline Earnings',
        desc: 'The tower keeps its light while the keeper walks.',
        cost: 220,
        tier: 5,
        effects: { offlineMaxHoursBonus: 6, offlineEarningsMult: 1.6 },
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
        icon: 'game-icons:punch-blast', // a firm strike
        effect: '+25% Chimes/Click',
        desc: 'Each touch of the chime rings a little louder.',
        cost: 3,
        tier: 0,
        effects: { cpcMult: 1.25 },
      },
      {
        id: 'reso_2',
        name: 'Ringing Blow',
        icon: 'game-icons:ringing-bell', // the chime answers the blow
        effect: '+50% Chimes/Click',
        desc: 'The chime answers your hand with force.',
        cost: 10,
        tier: 1,
        effects: { cpcMult: 1.5 },
      },
      {
        id: 'reso_3',
        name: 'Twin Echo',
        icon: 'game-icons:double-ringed-orb', // one strike ringing twice
        effect: '10% Double-Strike Chance',
        desc: 'Sometimes a single strike rings twice.',
        cost: 26,
        tier: 2,
        effects: { doubleClickChance: 0.1 },
      },
      {
        id: 'reso_4',
        name: 'Thunder Chime',
        icon: 'game-icons:thunder-struck', // strikes that shake the sky
        effect: '+100% Chimes/Click',
        desc: 'Your strikes shake the firmament.',
        cost: 55,
        tier: 3,
        effects: { cpcMult: 2 },
      },
      {
        id: 'reso_4b',
        name: 'Split Chime',
        icon: 'game-icons:beams-aura', // one strike splitting into two answers
        effect: '+15% Double-Strike Chance',
        desc: 'One strike, two answers — more often than not.',
        cost: 55,
        tier: 3,
        effects: { doubleClickChance: 0.15 },
      },
      {
        id: 'reso_5',
        name: 'Worldbell',
        icon: 'game-icons:tarot-21-the-world', // clicks carrying the whole world
        effect: 'Clicks gain +2% of CpS · +50% Chimes/Click',
        desc: 'Every strike carries the weight of the whole sky.',
        cost: 110,
        tier: 4,
        effects: { cpcFromCpsPct: 0.02, cpcMult: 1.5 },
      },
      {
        id: 'reso_6',
        name: 'Hand of the Caretaker',
        icon: 'game-icons:hand', // the keeper's own hand on the chime
        effect: 'Clicks gain +3% of CpS \u00b7 +60% Chimes/Click',
        desc: 'The hand that wakes the chime is the oldest instrument there is.',
        cost: 220,
        tier: 5,
        effects: { cpcFromCpsPct: 0.03, cpcMult: 1.6 },
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
        icon: 'game-icons:meeple', // a single meep, cheaper
        effect: '−10% Meep Cost',
        desc: 'Meeps gather for fewer chimes.',
        cost: 4,
        tier: 0,
        effects: { meepCostMult: 0.9 },
      },
      {
        id: 'cosmos_2',
        name: 'Star Charts',
        icon: 'game-icons:interstellar-path', // charted expedition routes
        effect: '+25% Expedition Rewards',
        desc: 'Well-planned journeys return with richer spoils.',
        cost: 14,
        tier: 1,
        effects: { expeditionRewardMult: 1.25 },
      },
      {
        id: 'cosmos_3',
        name: 'Meep Gathering',
        icon: 'game-icons:meeple-group', // a whole gathering of meeps
        effect: '−15% Meep Cost',
        desc: 'The gathering calls new meeps into being.',
        cost: 32,
        tier: 2,
        effects: { meepCostMult: 0.85 },
      },
      {
        id: 'cosmos_4',
        name: 'Portal Winds',
        icon: 'game-icons:magic-portal', // faster portal travel
        effect: 'Expeditions 20% Faster',
        desc: 'Favorable winds carry your champions home sooner.',
        cost: 70,
        tier: 3,
        effects: { expeditionSpeedMult: 0.8 },
      },
      {
        id: 'cosmos_4b',
        name: 'Wandering Comet',
        icon: 'game-icons:burning-meteor', // a long tail dragging spoils home
        effect: '+45% Expedition Rewards',
        desc: 'A long tail drags richer spoils home.',
        cost: 70,
        tier: 3,
        effects: { expeditionRewardMult: 1.45 },
      },
      {
        id: 'cosmos_5',
        name: 'Caretaker’s Bond',
        icon: 'game-icons:relationship-bounds', // the keeper-meep bond
        effect: '+30% Meep Power · −10% Meep Cost',
        desc: 'Your meeps fight — and multiply — for their keeper.',
        cost: 140,
        tier: 4,
        effects: { meepPowerMult: 1.3, meepCostMult: 0.9 },
      },
      {
        id: 'cosmos_6',
        name: 'Starcharter',
        icon: 'game-icons:galaxy', // the whole spiral, charted
        effect: '+60% Expedition Rewards \u00b7 +40% Meep Power',
        desc: 'Every anchorage on every arm, and the way between them.',
        cost: 280,
        tier: 5,
        effects: { expeditionRewardMult: 1.6, meepPowerMult: 1.4 },
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
        name: 'Rallying Call',
        icon: 'game-icons:rally-the-troops', // the whole host answers
        effect: '+500 Power',
        desc: 'A shared purpose drives your team forward.',
        cost: 4,
        tier: 0,
        effects: { powerBonus: 500 },
      },
      {
        id: 'battle_2',
        name: 'Honed Edge',
        icon: 'game-icons:crossed-swords', // sharpened intent
        effect: '+10% Champion DPS',
        desc: 'Champions strike with sharper intent.',
        cost: 14,
        tier: 1,
        effects: { championDpsMult: 1.1 },
      },
      {
        id: 'battle_3',
        name: 'Standard Bearer',
        icon: 'game-icons:knight-banner', // the raised standard
        effect: '+1500 Power',
        desc: 'Your banner alone tips the scales of ranked battles.',
        cost: 32,
        tier: 2,
        effects: { powerBonus: 1500 },
      },
      {
        id: 'battle_4',
        name: 'Storm of Blades',
        icon: 'game-icons:sword-array', // the assault swelling
        effect: '+15% Champion DPS',
        desc: 'The assault swells — and so does every strike.',
        cost: 70,
        tier: 3,
        effects: { championDpsMult: 1.15 },
      },
      {
        id: 'battle_4b',
        name: 'Crowned Vanguard',
        icon: 'game-icons:crown', // the host marching under one crown
        effect: '+3000 Power',
        desc: 'The host marches under one crown.',
        cost: 70,
        tier: 3,
        effects: { powerBonus: 3000 },
      },
      {
        id: 'battle_5',
        name: 'Legend of the Rift',
        icon: 'game-icons:relic-blade', // a legend of the rift
        effect: '+5000 Power',
        desc: 'Tales of your team echo through every universe.',
        cost: 140,
        tier: 4,
        effects: { powerBonus: 5000 },
      },
      {
        id: 'battle_6',
        name: 'Hostbearer',
        icon: 'game-icons:war-bonnet', // the crest a host follows
        effect: '+12000 Power',
        desc: 'They do not follow a banner. They follow the one who carries it.',
        cost: 280,
        tier: 5,
        effects: { powerBonus: 12000 },
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
        name: 'Piercing Shard',
        icon: 'game-icons:shard-sword', // a splinter that pierces armor
        effect: '+10% Boss Damage',
        desc: 'A sharp splinter that cuts through boss armor.',
        cost: 4,
        tier: 0,
        effects: { bossDamageMult: 1.1 },
      },
      {
        id: 'warden_2',
        name: 'Prospector’s Ear',
        icon: 'game-icons:minerals', // richer material finds
        effect: '+20% Material Drop Chance',
        desc: 'You hear where the rarest materials hide.',
        cost: 14,
        tier: 1,
        effects: { materialDropMult: 1.2 },
      },
      {
        id: 'warden_3',
        name: 'Soothing Tide',
        icon: 'game-icons:heart-beats', // a mending pulse
        effect: '+1 HP Regen/s',
        desc: 'A calm tide mends the sun’s wounds.',
        cost: 32,
        tier: 2,
        effects: { hpRegenPerSec: 1 },
      },
      {
        id: 'warden_4',
        name: 'Chime Ward',
        icon: 'game-icons:vibrating-shield', // a shield of ringing chimes
        effect: '−15% Damage Taken',
        desc: 'A shield of ringing chimes blunts every enemy blow.',
        cost: 70,
        tier: 3,
        effects: { damageTakenMult: 0.85 },
      },
      {
        id: 'warden_4b',
        name: 'Warding Bulwark',
        icon: 'game-icons:stone-wall', // a wall standing where you cannot
        effect: '−25% Damage Taken',
        desc: 'A wall of chimes stands where you cannot.',
        cost: 70,
        tier: 3,
        effects: { damageTakenMult: 0.75 },
      },
      {
        id: 'warden_5',
        name: 'Bossbreaker',
        icon: 'game-icons:sonic-boom', // the boss-breaking shockwave
        effect: '+30% Boss Damage',
        desc: 'No planetary tyrant withstands the final blow.',
        cost: 140,
        tier: 4,
        effects: { bossDamageMult: 1.3 },
      },
      {
        id: 'warden_6',
        name: 'Sunward Aegis',
        icon: 'game-icons:sun-priest', // the keeper standing before the star
        effect: '+50% Boss Damage \u00b7 +2 HP/s',
        desc: 'Nothing reaches the star that has not gone through the warden.',
        cost: 280,
        tier: 5,
        effects: { bossDamageMult: 1.5, hpRegenPerSec: 2 },
      },
    ],
  },
]

/** Every definition in the catalog, flattened — 30 nodes across 5 branches. */
export const MEEP_TREE_NODES: readonly MeepTreeNodeDef[] = MEEP_TREE_BRANCHES.flatMap(
  (branch) => branch.nodes,
)

/** Ranks per branch — the number the player reads as "Rank N of 6". */
export const MEEP_TREE_TIERS_PER_BRANCH = 6

/**
 * How many nodes ONE save can ever hold: one per branch and rank, so a fork
 * counts once. Every completion readout divides by this — dividing by the
 * catalog size instead would leave a finished tree sitting at 25/30.
 */
export const MEEP_TREE_PATH_NODES = MEEP_TREE_BRANCHES.reduce(
  (sum, b) => sum + new Set(b.nodes.map((n) => n.tier)).size,
  0,
)

/** How many definitions exist. Only icon uniqueness and catalog specs want this. */
export const MEEP_TREE_CATALOG_NODES = MEEP_TREE_NODES.length

export interface MeepTreeNodeEntry {
  branch: MeepTreeBranchDef
  node: MeepTreeNodeDef
  /** Every node of the rank below — learning ONE of them opens this node. */
  req: readonly string[]
  /** Siblings of the same rank — learning one seals the others for good. */
  excl: readonly string[]
}

/**
 * Flat lookup: node id → branch, definition, and the two derived relations.
 *
 * `req` and `excl` are computed from `tier` alone, never written by hand: a
 * fork written out on both sides (`a.excl = 'b'` plus `b.excl = 'a'`) is two
 * facts that can drift apart, and the drift is silent — one side would simply
 * stop sealing the other.
 */
export const MEEP_TREE_NODE_INDEX: Record<string, MeepTreeNodeEntry> = Object.fromEntries(
  MEEP_TREE_BRANCHES.flatMap((branch) =>
    branch.nodes.map((node) => [
      node.id,
      {
        branch,
        node,
        req: branch.nodes.filter((n) => n.tier === node.tier - 1).map((n) => n.id),
        excl: branch.nodes.filter((n) => n.tier === node.tier && n.id !== node.id).map((n) => n.id),
      } satisfies MeepTreeNodeEntry,
    ]),
  ),
)
