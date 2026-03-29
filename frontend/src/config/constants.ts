// ELO rating system
export const ELO_K_FACTOR = 32
export const ELO_RATING_SCALE = 400
export const ELO_LUCK_FACTOR = 0.15

// Leveling formula: 500 * level^1.8
export const LEVEL_BASE = 500
export const LEVEL_EXPONENT = 1.8

// Meep cost formula: 20 * meeps^1.2
export const MEEP_BASE_COST = 20
export const MEEP_COST_EXPONENT = 1.2

// Auto-battle
export const AUTO_BATTLE_INTERVAL_MS = 45000
export const BATTLE_REAL_DURATION_SECONDS = 45
export const KILL_EVENTS_PER_TEAM_MIN = 20
export const KILL_EVENTS_PER_TEAM_MAX = 40
export const MMR_TO_POWER_MULTIPLIER = 1.5

// Star background (App.vue)
export const STAR_COUNT = 400

// Rank system
export const RANK_DIVISIONS = ['IV', 'III', 'II', 'I'] as const
export const RANK_TIERS = [
  'Iron',
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Emerald',
  'Diamond',
  'Master',
  'Grandmaster',
  'Challenger',
] as const

// Abilities
export const MAX_ABILITY_LEVEL = 5

// Skill Tree Meep costs (Q, W, E, R)
export const SKILL_MEEP_COSTS = [3, 8, 20, 45] as const

// Planet events
export const PLANET_MAX_COUNT = 3
export const PLANET_SPAWN_INTERVAL_MIN = 6_000
export const PLANET_SPAWN_INTERVAL_MAX = 14_000
export const PLANET_EVENT_CHECK_INTERVAL = 30
export const PLANET_RESCUE_DURATION_MIN = 5_000
export const PLANET_RESCUE_DURATION_MAX = 10_000
export const PLANET_RESCUE_CLICKS_MIN = 5
export const PLANET_RESCUE_CLICKS_MAX = 15
export const PLANET_RESCUE_BASE_REWARD = 500
export const PLANET_EVENT_BASE_CHANCE = 0.6
export const PLANET_EVENT_PRESTIGE_BONUS = 0.35

// Planet material drop chance (probability that a rescue planet carries material)
export const PLANET_MATERIAL_CHANCE = 0.6

// Champion home planet discovery chance
export const CHAMPION_HOME_PLANET_CHANCE = 0.5

// Planet Boss Fight
export const BOSS_BASE_HP = 200
export const BOSS_HP_LEVEL_SCALE = 10
export const BOSS_HP_CPS_SCALE = 50
export const BOSS_HP_POWER_SCALE = 5000
export const BOSS_ENRAGE_BASE_SECONDS = 30
export const BOSS_ENRAGE_LEVEL_STEP = 5
export const BOSS_ENRAGE_MAX_SECONDS = 60
export const BOSS_PASSIVE_DPS_FRACTION = 0.1
export const BOSS_BASE_REWARD = 500
export const BOSS_REWARD_DIFFICULTY_SCALE = 4
export const BOSS_CPS_PENALTY_FRACTION = 0.05
export const BOSS_CPS_PENALTY_DURATION_MS = 30_000
function _generateBossNames(): string[] {
  const prefixes: string[] = [
    // Cosmic / Astronomical (28)
    'Void',
    'Nebula',
    'Quasar',
    'Stellar',
    'Pulsar',
    'Galactic',
    'Solar',
    'Astral',
    'Cosmic',
    'Dark Matter',
    'Event Horizon',
    'Supernova',
    'Nova',
    'Photon',
    'Plasma',
    'Neutron Star',
    'Ion Storm',
    'Aurora',
    'Comet',
    'Meteor',
    'Eclipse',
    'Celestial',
    'Orbital',
    'Zenith',
    'Stardust',
    'Starfall',
    'Moonfire',
    'Solaris',
    // Mythological / Epic (22)
    'Kronos',
    'Fenrir',
    'Leviathan',
    'Chimera',
    'Typhon',
    'Ragnarok',
    'Quetzalcoatl',
    'Anubis',
    'Osiris',
    'Moloch',
    'Gorgoroth',
    'Olympian',
    'Titan',
    'Colossus',
    'Goliath',
    'Behemoth',
    'Juggernaut',
    'Poseidon',
    'Zeus',
    'Ares',
    'Hades',
    'Enki',
    // Exotic / Alien (22)
    "Xar'veth",
    "Zh'kraan",
    "Vex'al",
    "Thul'nar",
    "Kyr'ax",
    "Soth'is",
    "Grax'ul",
    "Neth'ar",
    "Vor'kaan",
    "Zel'thar",
    "Ul'vaash",
    "Drax'eel",
    "Myr'och",
    "Pyr'ath",
    "Ryv'zel",
    "Cyx'nar",
    "Bael'thos",
    "Khaaz'ul",
    "Vrix'aal",
    "Thyx'nor",
    "Ghal'zyr",
    "Xoth'eel",
    // Elemental / Physical (10)
    'Entropy',
    'Antimatter',
    'Graviton',
    'Singularity',
    'Quantum',
    'Plasma Storm',
    'Dark Energy',
    'Null Field',
    'Tachyon',
    'Void Particle',
    // "The ..." names — ~20 % starts with "The" (20)
    'The Undying',
    'The Eternal',
    'The Infinite',
    'The Ancient',
    'The Sovereign',
    'The Void',
    'The Cosmic',
    'The Abyssal',
    'The Forsaken',
    'The Omnipotent',
    'The Galactic',
    'The Celestial',
    'The Primordial',
    'The Supreme',
    'The Boundless',
    'The Nullborn',
    'The Starborn',
    'The Deathless',
    'The Omega',
    'The Apocalyptic',
    // Extra cosmic / compound (10)
    'Binary Star',
    'Black Hole',
    'Magnetar',
    'Accretion',
    'Interstellar',
    'Hypernova',
    'Dark Flux',
    'Void Storm',
    'Nebular',
    'Axiom',
  ]

  const suffixes: string[] = [
    // Role / Title (20)
    'Devourer',
    'Destroyer',
    'Annihilator',
    'Obliterator',
    'Ravager',
    'Predator',
    'Hunter',
    'Stalker',
    'Tyrant',
    'Sovereign',
    'Emperor',
    'Warlord',
    'Conqueror',
    'Dominator',
    'Archon',
    'Arbiter',
    'Executor',
    'Exterminator',
    'Devastator',
    'Eradicator',
    // Cosmic / Horror (20)
    'Leviathan',
    'Colossus',
    'Goliath',
    'Juggernaut',
    'Horror',
    'Terror',
    'Nightmare',
    'Abomination',
    'Monstrosity',
    'Fiend',
    'Reaper',
    'Wraith',
    'Specter',
    'Phantom',
    'Revenant',
    'Shade',
    'Harbinger',
    'Titan',
    'Giant',
    'Dragon',
    // Epic / Destructive noun (20)
    'Wyrm',
    'Beast',
    'Demon',
    'Scourge',
    'Plague',
    'Blight',
    'Curse',
    'Malice',
    'Fury',
    'Wrath',
    'Chaos',
    'Null',
    'Cataclysm',
    'Apocalypse',
    'Armageddon',
    'Oblivion',
    'Nemesis',
    'Doom',
    'Entropy',
    'Ruin',
    // Cosmic forces / events (20)
    'Collapse',
    'Decay',
    'Corruption',
    'Madness',
    'Despair',
    'Desolation',
    'Extinction',
    'Devastation',
    'Decimation',
    'Manifestation',
    'Incarnation',
    'Avatar',
    'Entity',
    'Presence',
    'Nexus',
    'Vortex',
    'Core',
    'Soul',
    'Force',
    'Abyss',
    // Compound / action (20)
    'Bringer',
    'Walker',
    'Weaver',
    'Forger',
    'Breaker',
    'Fallen',
    'Risen',
    'Forsaken',
    'Ascendant',
    'Overlord',
    'Purger',
    'Subjugator',
    'Oppressor',
    'Sentinel',
    'Herald',
    'Vanguard',
    'Nullbringer',
    'Voidwalker',
    'Starkiller',
    'Worldender',
    // Abstract power (20)
    'Prime',
    'Omega',
    'Alpha',
    'Apex',
    'Pinnacle',
    'Ascension',
    'Awakened',
    'Risen One',
    'Undying',
    'Eternal',
    'Remnant',
    'Omen',
    'Specter Prime',
    'Void Spawn',
    'Null Shard',
    'Star Fiend',
    'Dark Servant',
    'Chaos Spawn',
    'Abyss Walker',
    'Death Mark',
  ]

  const names: string[] = []
  for (const p of prefixes) {
    for (const s of suffixes) {
      names.push(`${p} ${s}`)
    }
  }
  return names.slice(0, 10_000)
}

export const BOSS_NAMES: string[] = _generateBossNames()

// Planet type display names (German)
export const PLANET_TYPE_NAMES: Record<string, string> = {
  rocky: 'Felsplanet',
  ice: 'Eisplanet',
  'gas-giant': 'Gasriese',
  lava: 'Lavaplanet',
  ocean: 'Ozeanplanet',
  desert: 'Wüstenplanet',
  jungle: 'Dschungelplanet',
  ringed: 'Ringplanet',
}

// Title rotation
export const TITLE_MESSAGE_INTERVAL_MS = 5000

// LP thresholds
export const LP_NORMAL_PROMOTION_THRESHOLD = 100
export const LP_MASTER_PROMOTION_THRESHOLD = 500
export const LP_GRANDMASTER_PROMOTION_THRESHOLD = 1000
export const LP_DEMOTION_VALUE = 75
export const LP_MASTER_DEMOTION_VALUE = 400
export const LP_GRANDMASTER_DEMOTION_VALUE = 900
export const LP_BASE_CHANGE = 20

// Minimap phases (game-time seconds, 60 game-sec = 1 real-sec, total = 1800)
export const MINIMAP_PHASE_LANING_END = 700
export const MINIMAP_PHASE_DRAKE_END = 1200
export const MINIMAP_PHASE_MIDFIGHT_END = 1500
export const MINIMAP_PHASE_BARON_END = 2200
export const MINIMAP_PHASE_PUSH_END = 2700

export const BLUE_NEXUS = { x: 12, y: 88 }
export const RED_NEXUS = { x: 88, y: 12 }
export const BLUE_FOUNTAIN = { x: 8, y: 92 }
export const RED_FOUNTAIN = { x: 92, y: 8 }

// Objective positions
export const DRAKE_POS = { x: 72, y: 72 }
export const BARON_POS = { x: 28, y: 28 }
export const MID_CENTER = { x: 50, y: 50 }

// Battle constants
export const OPPONENT_MMR_VARIANCE = 200
export const BATTLE_TIME_MIN_SECONDS = 30
export const BATTLE_TIME_RANGE_SECONDS = 471

// Battle stat tick chances and max values
export const STAT_KILL_CHANCE = 0.5
export const STAT_DEATH_CHANCE = 0.3
export const STAT_ASSIST_CHANCE = 0.7
export const STAT_MAX_KILLS = 3
export const STAT_MAX_DEATHS = 2
export const STAT_MAX_ASSISTS = 7

// MMR rank thresholds
export const MMR_RANK_THRESHOLDS = [
  { tier: 'Iron', division: 'IV', minMMR: 0 },
  { tier: 'Bronze', division: 'IV', minMMR: 500 },
  { tier: 'Silver', division: 'IV', minMMR: 1000 },
  { tier: 'Gold', division: 'IV', minMMR: 1500 },
  { tier: 'Platinum', division: 'IV', minMMR: 2000 },
  { tier: 'Diamond', division: 'IV', minMMR: 2500 },
  { tier: 'Master', division: 'I', minMMR: 3000 },
  { tier: 'Grandmaster', division: 'I', minMMR: 3500 },
  { tier: 'Challenger', division: 'I', minMMR: 4000 },
] as const

// Mission system
export const CHAMPION_BASE_POWER = 50
export const CHAMPION_POWER_PER_LEVEL = 10
export const MAX_ACTIVE_MISSIONS = 3

// Rank border image paths
export const RANK_BORDER_IMAGES: Record<string, string> = {
  Iron: '/img/RankBorder/RankIron.png',
  Bronze: '/img/RankBorder/RankBronze.png',
  Silver: '/img/RankBorder/RankSilver.png',
  Gold: '/img/RankBorder/RankGold.png',
  Platinum: '/img/RankBorder/RankPlatin.png',
  Emerald: '/img/RankBorder/RankEmerald.png',
  Diamond: '/img/RankBorder/RankDiamand.png',
  Master: '/img/RankBorder/RankMaster.png',
  Grandmaster: '/img/RankBorder/RankGrandMaster.png',
  Challenger: '/img/RankBorder/RankChallenger.png',
}
