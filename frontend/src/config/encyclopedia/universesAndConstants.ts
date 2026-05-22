import type { EncyclopediaCategory } from './types'

export const universesCategory: EncyclopediaCategory = {
  id: 'universes',
  title: 'Universes & Prestige',
  icon: '🌌',
  entries: [
    {
      id: 'prestige-system',
      name: 'Prestige System',
      icon: '/img/BardAbilities/BardChime.png',
      description:
        'Once the required Chimes for the current universe are collected, a prestige can be performed. ' +
        'A prestige resets all Chimes, levels, Meeps, buildings, skill points, abilities, and augments. ' +
        'Total clicks and total Chimes earned are preserved.',
      lore: 'Every universe is a new beginning, a new chance to complete the cosmic harmony.',
      formula:
        'Starting threshold 1st prestige: chimesToUniverseRescue = 100,000 Chimes\n' +
        'After each prestige: threshold × 2\n' +
        'Prestige resets: chimes, level=1, meeps=0, abilityLevels=[0,0,0,0],\n' +
        '  skillPoints=0, activeAugments=[], building levels\n' +
        'Preserved: totalChimesEarned, totalClicks',
    },
    {
      id: 'universe-modifier',
      name: 'Universe Modifiers',
      icon: '/img/BardAbilities/BardChime.png',
      description:
        'Each new universe can bring its own modifiers that change the feel of the game. ' +
        'Possible modifiers: levelExponent, skillPointInterval, maxAbilityLevel, meepCostMultiplier, and more. ' +
        'Modifiers are defined by the universes.ts configuration.',
      lore: 'Every universe has its own laws. Adapt or be forgotten.',
      formula:
        'Modifier types: levelExponent (default=1.8), skillPointInterval (default=2),\n' +
        '  maxAbilityLevel (default=5), meepCostMultiplier, buildingCostMultiplier,\n' +
        '  cpsMultiplier, cpcMultiplier, and more.',
    },
  ],
}

export const constantsCategory: EncyclopediaCategory = {
  id: 'constants',
  title: 'All Constants',
  icon: '🔢',
  entries: [
    {
      id: 'constants-game',
      name: 'Core Game Constants',
      icon: '/img/BardAbilities/Bard.png',
      description:
        'The most important values the entire game is built on. All from constants.ts.',
      lore: 'The immutable laws of the cosmos.',
      formula:
        'LEVEL_BASE = 500 | LEVEL_EXPONENT = 1.8\n' +
        'MEEP_BASE_COST = 20 | MEEP_COST_EXPONENT = 1.2\n' +
        'MAX_ABILITY_LEVEL = 5\n' +
        'SKILL_MEEP_COSTS = [Q:3, W:8, E:20, R:45]\n' +
        'gameSpeed = 1,000 ms (game tick interval)\n' +
        'baseChimesPerClick = 20',
    },
    {
      id: 'constants-battle',
      name: 'Battle Constants',
      icon: '/img/BardBattle.png',
      description: 'All values related to the battle system.',
      lore: 'The mechanics of war.',
      formula:
        'ELO_K_FACTOR = 32 | ELO_RATING_SCALE = 400 | ELO_LUCK_FACTOR = 0.15\n' +
        'AUTO_BATTLE_INTERVAL_MS = 45,000 ms\n' +
        'BATTLE_REAL_DURATION_SECONDS = 45\n' +
        'MMR_TO_POWER_MULTIPLIER = 1.5\n' +
        'OPPONENT_MMR_VARIANCE = 200\n' +
        'LP_BASE_CHANGE = 20\n' +
        'LP promotion: Normal=100 | Master=500 | GM=1000\n' +
        'LP demotion: Normal=75 | Master=400 | GM=900',
    },
    {
      id: 'constants-planets',
      name: 'Planet Constants',
      icon: '/img/planet.png',
      description: 'All values for planet events and boss fights.',
      lore: 'The laws of cosmic events.',
      formula:
        'PLANET_MAX_COUNT = 3 | SPAWN_MIN=6s | SPAWN_MAX=14s\n' +
        'PLANET_EVENT_BASE_CHANCE = 0.6 | PRESTIGE_BONUS = 0.35\n' +
        'PLANET_RESCUE_BASE_REWARD = 500 Chimes\n' +
        'PLANET_MATERIAL_CHANCE = 0.6 | CHAMPION_HOME_PLANET_CHANCE = 0.5\n' +
        'BOSS_BASE_HP=200 | BOSS_HP_LEVEL_SCALE=10 | BOSS_HP_CPS_SCALE=50\n' +
        'BOSS_HP_POWER_SCALE=5000 | BOSS_PASSIVE_DPS_FRACTION=0.1\n' +
        'BOSS_BASE_REWARD=500 | BOSS_REWARD_DIFFICULTY_SCALE=4\n' +
        'BOSS_CPS_PENALTY_FRACTION=0.05 | BOSS_CPS_PENALTY_DURATION=30s\n' +
        'BOSS_ENRAGE_BASE=30s | BOSS_ENRAGE_MAX=60s | BOSS_ENRAGE_STEP=5 levels',
    },
    {
      id: 'constants-expedition',
      name: 'Expedition Constants',
      icon: '🗺️',
      description: 'All values for the expedition system.',
      lore: 'The measure of all journeys.',
      formula:
        'MAX_ACTIVE_EXPEDITIONS = 3\n' +
        'CHAMPION_BASE_POWER = 50\n' +
        'CHAMPION_POWER_PER_LEVEL = 10',
    },
  ],
}
