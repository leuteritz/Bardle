/**
 * Meep Skill Tree — five themed branches of one-time upgrades bought with Meeps.
 * Every node requires the previous node of its branch (linear chains).
 * Each node carries its own game-icons glyph, tinted in its branch color.
 *
 * Die Preise sind gegen die AUSSCHÜTTUNG geeicht, nicht frei gewählt. Meeps
 * fallen seit dem Umbau nur beim Aufbruch in ein neues Universum an
 * (`gameStore.pendingMeeps`), und der Baum überlebt das Prestige — er ist
 * damit die einzige Senke dafür. Zwei Referenzläufe über je 76 Spielstunden
 * haben die Summe eingestellt: ein Baum für 894 stand nach 28 Stunden und ließ
 * 4336 Meeps ohne Verwendung liegen; einer für 4029 stand nach 40. Der zweite
 * Lauf zeigte auch, warum die erste Korrektur zu klein war — der Knoten
 * `meepCostMult` senkt `meepChimeRequirement`, der Baum verbilligt also seinen
 * eigenen Rest, und der Zufluss stieg von 5376 auf 8830. Die Summe liegt
 * deshalb bei 6420: nicht am vollen Zufluss ausgerichtet, weil ein langsamer
 * wachsender Baum auch später verbilligt und der Zufluss damit mitfällt.
 *
 * Nachgemessen mit dieser Summe: der erste Knoten fällt nach 3,2 Stunden (noch
 * vor dem ersten Aufbruch, aus Drifter-Funden), der zehnte nach 9,8, der
 * zwanzigste nach 42 und der letzte nach 68,4 von 76 Stunden; am Ende bleiben
 * 1374 Meeps übrig statt 4336. Die Kurve ist vorn schnell und hinten gestreckt
 * — gewollt, denn die frühen Knoten sind das, was den Aufbruch überhaupt
 * lohnend macht.
 *
 * Wer die Ausbeute ändert (`MEEP_RUN_FACTOR`, `MEEP_RUN_BASE`) oder eine
 * Stufe hier anfasst, verschiebt diese Balance: eine Spec bindet die Summe an
 * `MEEP_TREE_TOTAL_COST`, damit die beiden Zahlen nicht stillschweigend
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
        icon: 'game-icons:lantern-flame', // a light left burning
        effect: '+25% Chimes/s',
        desc: 'A patient watch keeps the chimes ringing on their own.',
        cost: 15,
        effects: { cpsMult: 1.25 },
      },
      {
        id: 'vigil_2',
        name: 'Widening Orbit',
        icon: 'game-icons:orbital', // the watch reaches further out
        effect: '+50% Chimes/s',
        desc: 'Your care reaches further across the sky.',
        cost: 65,
        effects: { cpsMult: 1.5 },
      },
      {
        id: 'vigil_3',
        name: 'Lingering Echo',
        icon: 'game-icons:night-sleep', // earnings while you are away
        effect: '+50% Offline Earnings',
        desc: 'The vigil holds while you are away.',
        cost: 145,
        effects: { offlineEarningsMult: 1.5 },
      },
      {
        id: 'vigil_4',
        name: 'Perfect Alignment',
        icon: 'game-icons:solar-system', // every body on the same path
        effect: '+100% Chimes/s',
        desc: 'Every building falls into the same orbit.',
        cost: 320,
        effects: { cpsMult: 2 },
      },
      {
        id: 'vigil_5',
        name: 'Endless Vigil',
        icon: 'game-icons:infinity', // a watch without end
        effect: '+4h Offline Cap · +50% Chimes/s',
        desc: 'A watch that never truly ends.',
        cost: 670,
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
        icon: 'game-icons:fist', // a firm strike
        effect: '+25% Chimes/Click',
        desc: 'Each touch of the chime rings a little louder.',
        cost: 15,
        effects: { cpcMult: 1.25 },
      },
      {
        id: 'reso_2',
        name: 'Ringing Blow',
        icon: 'game-icons:ringing-bell', // the chime answers the blow
        effect: '+50% Chimes/Click',
        desc: 'The chime answers your hand with force.',
        cost: 65,
        effects: { cpcMult: 1.5 },
      },
      {
        id: 'reso_3',
        name: 'Twin Echo',
        icon: 'game-icons:echo-ripples', // one strike ringing twice
        effect: '10% Double-Click Chance',
        desc: 'Sometimes a single strike rings twice.',
        cost: 145,
        effects: { doubleClickChance: 0.1 },
      },
      {
        id: 'reso_4',
        name: 'Thunder Chime',
        icon: 'game-icons:thunder-struck', // strikes that shake the sky
        effect: '+100% Chimes/Click',
        desc: 'Your strikes shake the firmament.',
        cost: 320,
        effects: { cpcMult: 2 },
      },
      {
        id: 'reso_5',
        name: 'Worldbell',
        icon: 'game-icons:tarot-21-the-world', // clicks carrying the whole world
        effect: 'Clicks gain +2% of CpS · +50% Chimes/Click',
        desc: 'Every strike carries the weight of the whole sky.',
        cost: 670,
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
        icon: 'game-icons:meeple', // a single meep, cheaper
        effect: '−10% Meep Cost',
        desc: 'Meeps gather for fewer chimes.',
        cost: 30,
        effects: { meepCostMult: 0.9 },
      },
      {
        id: 'cosmos_2',
        name: 'Star Charts',
        icon: 'game-icons:interstellar-path', // charted expedition routes
        effect: '+25% Expedition Rewards',
        desc: 'Well-planned journeys return with richer spoils.',
        cost: 70,
        effects: { expeditionRewardMult: 1.25 },
      },
      {
        id: 'cosmos_3',
        name: 'Meep Gathering',
        icon: 'game-icons:meeple-group', // a whole gathering of meeps
        effect: '−15% Meep Cost',
        desc: 'The gathering calls new meeps into being.',
        cost: 160,
        effects: { meepCostMult: 0.85 },
      },
      {
        id: 'cosmos_4',
        name: 'Portal Winds',
        icon: 'game-icons:magic-portal', // faster portal travel
        effect: 'Expeditions 20% Faster',
        desc: 'Favorable winds carry your champions home sooner.',
        cost: 350,
        effects: { expeditionSpeedMult: 0.8 },
      },
      {
        id: 'cosmos_5',
        name: 'Caretaker’s Bond',
        icon: 'game-icons:relationship-bounds', // the keeper-meep bond
        effect: '+30% Meep Power · −10% Meep Cost',
        desc: 'Your meeps fight — and multiply — for their keeper.',
        cost: 720,
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
        name: 'Rallying Call',
        icon: 'game-icons:rally-the-troops', // the whole host answers
        effect: '+500 Power',
        desc: 'A shared purpose drives your team forward.',
        cost: 30,
        effects: { powerBonus: 500 },
      },
      {
        id: 'battle_2',
        name: 'Honed Edge',
        icon: 'game-icons:crossed-swords', // sharpened intent
        effect: '+10% Champion DPS',
        desc: 'Champions strike with sharper intent.',
        cost: 70,
        effects: { championDpsMult: 1.1 },
      },
      {
        id: 'battle_3',
        name: 'Standard Bearer',
        icon: 'game-icons:knight-banner', // the raised standard
        effect: '+1500 Power',
        desc: 'Your banner alone tips the scales of ranked battles.',
        cost: 160,
        effects: { powerBonus: 1500 },
      },
      {
        id: 'battle_4',
        name: 'Storm of Blades',
        icon: 'game-icons:sword-array', // the assault swelling
        effect: '+15% Champion DPS',
        desc: 'The assault swells — and so does every strike.',
        cost: 350,
        effects: { championDpsMult: 1.15 },
      },
      {
        id: 'battle_5',
        name: 'Legend of the Rift',
        icon: 'game-icons:relic-blade', // a legend of the rift
        effect: '+5000 Power',
        desc: 'Tales of your team echo through every universe.',
        cost: 720,
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
        name: 'Piercing Shard',
        icon: 'game-icons:shard-sword', // a splinter that pierces armor
        effect: '+10% Boss Damage',
        desc: 'A sharp splinter that cuts through boss armor.',
        cost: 30,
        effects: { bossDamageMult: 1.1 },
      },
      {
        id: 'warden_2',
        name: 'Prospector’s Ear',
        icon: 'game-icons:minerals', // richer material finds
        effect: '+20% Material Drop Chance',
        desc: 'You hear where the rarest materials hide.',
        cost: 70,
        effects: { materialDropMult: 1.2 },
      },
      {
        id: 'warden_3',
        name: 'Soothing Tide',
        icon: 'game-icons:heart-beats', // a mending pulse
        effect: '+1 HP Regen/s',
        desc: 'A calm tide mends the sun’s wounds.',
        cost: 160,
        effects: { hpRegenPerSec: 1 },
      },
      {
        id: 'warden_4',
        name: 'Chime Ward',
        icon: 'game-icons:vibrating-shield', // a shield of ringing chimes
        effect: '−15% Damage Taken',
        desc: 'A shield of ringing chimes blunts every enemy blow.',
        cost: 350,
        effects: { damageTakenMult: 0.85 },
      },
      {
        id: 'warden_5',
        name: 'Bossbreaker',
        icon: 'game-icons:sonic-boom', // the boss-breaking shockwave
        effect: '+30% Boss Damage',
        desc: 'No planetary tyrant withstands the final blow.',
        cost: 720,
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

export const MEEP_TREE_TOTAL_NODES = MEEP_TREE_BRANCHES.reduce((sum, b) => sum + b.nodes.length, 0)
