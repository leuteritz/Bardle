import type { EncyclopediaCategory } from './types'

export const planetEventsCategory: EncyclopediaCategory = {
  id: 'planetEvents',
  title: 'Planet Events',
  icon: '/img/planet.png',
  entries: [
    {
      id: 'planet-spawn',
      name: 'Planet Spawning',
      icon: '/img/BardAbilities/BardChime.png',
      description:
        'Planets spawn randomly every 6–14 seconds. Maximum 3 planets at once. ' +
        'Base chance that a rescue event triggers: 60%. ' +
        'Each prestige increases the base event chance by +35%.',
      lore: 'Worlds in distress. Every second a new planet might call for help.',
      formula:
        'PLANET_SPAWN_INTERVAL_MIN = 6,000 ms | PLANET_SPAWN_INTERVAL_MAX = 14,000 ms\n' +
        'PLANET_MAX_COUNT = 3 (simultaneous)\n' +
        'PLANET_EVENT_BASE_CHANCE = 0.6 (60%)\n' +
        'PLANET_EVENT_PRESTIGE_BONUS = 0.35 (per prestige)',
    },
    {
      id: 'planet-rescue',
      name: 'Planet Rescue',
      icon: '/img/BardAbilities/BardQ.png',
      description:
        'A rescue event requires 5–15 clicks within 5–10 seconds. ' +
        'Reward: at least 500 Chimes (base), scales with progress. ' +
        '60% chance the planet contains a material.',
      lore: 'Every rescued planet rewards you with cosmic gifts.',
      formula:
        'PLANET_RESCUE_DURATION_MIN = 5,000 ms | MAX = 10,000 ms\n' +
        'PLANET_RESCUE_CLICKS_MIN = 5 | MAX = 15\n' +
        'PLANET_RESCUE_BASE_REWARD = 500 Chimes\n' +
        'PLANET_MATERIAL_CHANCE = 0.6 (60% materials)\n' +
        'CHAMPION_HOME_PLANET_CHANCE = 0.5 (50% champion home planet)',
    },
    {
      id: 'planet-types',
      name: 'Planet Types',
      icon: '/img/BardAbilities/BardW.png',
      description:
        'There are 8 different planet types: Rocky, Ice, Gas Giant, Lava, Ocean, Desert, Jungle, Ringed. ' +
        'The type affects visual appearance but has no influence on rewards.',
      lore: 'Every world has its own story — its own beauty.',
      formula:
        'PLANET_TYPE_NAMES = { rocky, ice, gas-giant, lava, ocean, desert, jungle, ringed }',
    },
  ],
}

export const planetBossCategory: EncyclopediaCategory = {
  id: 'planetBoss',
  title: 'Planet Boss',
  icon: 'game-icons:goblin',
  entries: [
    {
      id: 'boss-hp',
      name: 'Boss Hit Points',
      icon: '/img/BardAbilities/BardChimeMeep.png',
      description:
        'Boss HP scales with the current level, CPS, Combat Power, your team ' +
        'strength (total star levels of slotted champions) and the current galaxy. ' +
        'Base: 200 HP. High CPS, high Power, strong champions and deep galaxies ' +
        'all increase the boss HP pool.',
      lore: 'The more powerful the player, the more fearsome the boss.',
      formula:
        'Boss HP = BOSS_BASE_HP × (1 + Level/BOSS_HP_LEVEL_SCALE) × (1 + CPS/BOSS_HP_CPS_SCALE) × (1 + Power/BOSS_HP_POWER_SCALE) × Section × Champions × Galaxy\n' +
        'Champions = 1 + Σ star levels × BOSS_HP_PER_CHAMPION_STAR (0.1)\n' +
        'Galaxy = 1 + (Galaxy − 1) × BOSS_HP_PER_GALAXY (0.2)\n' +
        'BOSS_BASE_HP = 200 | BOSS_HP_LEVEL_SCALE = 10\n' +
        'BOSS_HP_CPS_SCALE = 50 | BOSS_HP_POWER_SCALE = 5,000',
    },
    {
      id: 'boss-damage',
      name: 'Boss Damage (Passive DPS)',
      icon: '/img/BardAbilities/BardE.png',
      description:
        'The boss passively deals 10% of your own Combat Power as damage per second. ' +
        'On victory: reward = 500 + (difficulty × 4) Chimes. ' +
        'On defeat: −5% CPS for 30 seconds.',
      lore: "The boss never lets up. It turns your own strength against you.",
      formula:
        'Passive DPS = Power × BOSS_PASSIVE_DPS_FRACTION = Power × 0.1\n' +
        'Reward = BOSS_BASE_REWARD + (Difficulty × BOSS_REWARD_DIFFICULTY_SCALE)\n' +
        '  = 500 + (Difficulty × 4)\n' +
        'CPS penalty = −BOSS_CPS_PENALTY_FRACTION = −5% for 30,000 ms',
    },
    {
      id: 'boss-enrage',
      name: 'Boss Enrage',
      icon: '/img/BardAbilities/BardR.png',
      description:
        'The boss enrages if not defeated in time. ' +
        'Base enrage timer: 30 seconds. Every 5 levels the timer increases by up to 60 seconds. ' +
        'While enraged, damage and difficulty increase significantly.',
      lore: "Rage is the last refuge of the defeated — but also its most dangerous weapon.",
      formula:
        'BOSS_ENRAGE_BASE_SECONDS = 30s\n' +
        'BOSS_ENRAGE_LEVEL_STEP = 5 (every 5 levels +1s)\n' +
        'BOSS_ENRAGE_MAX_SECONDS = 60s',
    },
  ],
}

export const expeditionsCategory: EncyclopediaCategory = {
  id: 'expeditions',
  title: 'Expeditions',
  icon: 'game-icons:papyrus',
  entries: [
    {
      id: 'expedition-system',
      name: 'Expedition System',
      icon: '/img/BardAbilities/BardChime.png',
      description:
        'Send champions on expeditions to earn rewards. ' +
        'A maximum of 3 simultaneous expeditions are possible (MAX_ACTIVE_EXPEDITIONS = 3). ' +
        'Expedition rewards can be increased by augments and items.',
      lore: 'The vastness of the cosmos holds immeasurable treasures — but only for the bold.',
      formula:
        'MAX_ACTIVE_EXPEDITIONS = 3 (simultaneous)\n' +
        'Champion Expedition Power = CHAMPION_BASE_POWER + (Level × CHAMPION_POWER_PER_LEVEL)\n' +
        '  = 50 + (Level × 10)',
    },
  ],
}
