import type { EncyclopediaCategory } from './types'

export const universesCategory: EncyclopediaCategory = {
  id: 'universes',
  title: 'Universen & Prestige',
  icon: '🌌',
  entries: [
    {
      id: 'prestige-system',
      name: 'Prestige-System',
      icon: '/img/BardAbilities/BardChime.png',
      description:
        'Sobald die Chimes für das aktuelle Universum gesammelt sind, kann ein Prestige durchgeführt werden. ' +
        'Ein Prestige setzt alle Chimes, Level, Meeps, Gebäude, Skillpunkte, Fähigkeiten und Augmente zurück. ' +
        'Die Gesamtzahl aller Klicks und verdienten Chimes bleibt erhalten.',
      lore: 'Jedes Universum ist ein neuer Anfang, eine neue Chance die kosmische Harmonie zu vollenden.',
      formula:
        'Startschwelle 1. Prestige: chimesToUniverseRescue = 100 000 Chimes\n' +
        'Nach jedem Prestige: Schwelle × 2\n' +
        'Prestige setzt zurück: chimes, level=1, meeps=0, abilityLevels=[0,0,0,0],\n' +
        '  skillPoints=0, activeAugments=[], Gebäude-Level\n' +
        'Bleibt erhalten: totalChimesEarned, totalClicks',
    },
    {
      id: 'universe-modifier',
      name: 'Universum-Modifikatoren',
      icon: '/img/BardAbilities/BardChime.png',
      description:
        'Jedes neue Universum kann eigene Modifikatoren mitbringen, die das Spielgefühl verändern. ' +
        'Mögliche Modifikatoren: levelExponent, skillPointInterval, maxAbilityLevel, meepCostMultiplier u.v.m. ' +
        'Die Modifikatoren werden durch die universes.ts-Konfiguration definiert.',
      lore: 'Jedes Universum hat seine eigenen Gesetze. Passe dich an oder werde vergessen.',
      formula:
        'Modifier-Typen: levelExponent (Standard=1.8), skillPointInterval (Standard=2),\n' +
        '  maxAbilityLevel (Standard=5), meepCostMultiplier, buildingCostMultiplier,\n' +
        '  cpsMultiplier, cpcMultiplier u.a.',
    },
  ],
}

export const constantsCategory: EncyclopediaCategory = {
  id: 'constants',
  title: 'Alle Konstanten',
  icon: '🔢',
  entries: [
    {
      id: 'constants-game',
      name: 'Spiel-Kernkonstanten',
      icon: '/img/BardAbilities/Bard.png',
      description:
        'Die wichtigsten Werte, auf denen das gesamte Spiel aufbaut. Alle aus constants.ts.',
      lore: 'Die unveränderlichen Gesetze des Kosmos.',
      formula:
        'LEVEL_BASE = 500 | LEVEL_EXPONENT = 1.8\n' +
        'MEEP_BASE_COST = 20 | MEEP_COST_EXPONENT = 1.2\n' +
        'MAX_ABILITY_LEVEL = 5\n' +
        'SKILL_MEEP_COSTS = [Q:3, W:8, E:20, R:45]\n' +
        'gameSpeed = 1 000 ms (Spieltick-Interval)\n' +
        'baseChimesPerClick = 20',
    },
    {
      id: 'constants-battle',
      name: 'Kampf-Konstanten',
      icon: '/img/BardBattle.png',
      description: 'Alle Werte rund um das Kampfsystem.',
      lore: 'Die Mechanik des Krieges.',
      formula:
        'ELO_K_FACTOR = 32 | ELO_RATING_SCALE = 400 | ELO_LUCK_FACTOR = 0.15\n' +
        'AUTO_BATTLE_INTERVAL_MS = 45 000 ms\n' +
        'BATTLE_REAL_DURATION_SECONDS = 45\n' +
        'MMR_TO_POWER_MULTIPLIER = 1.5\n' +
        'OPPONENT_MMR_VARIANCE = 200\n' +
        'LP_BASE_CHANGE = 20\n' +
        'LP Beförderung: Normal=100 | Master=500 | GM=1000\n' +
        'LP Abstieg: Normal=75 | Master=400 | GM=900',
    },
    {
      id: 'constants-planets',
      name: 'Planeten-Konstanten',
      icon: '🪐',
      description: 'Alle Werte für Planeten-Events und Boss-Kämpfe.',
      lore: 'Die Gesetze der kosmischen Ereignisse.',
      formula:
        'PLANET_MAX_COUNT = 3 | SPAWN_MIN=6s | SPAWN_MAX=14s\n' +
        'PLANET_EVENT_BASE_CHANCE = 0.6 | PRESTIGE_BONUS = 0.35\n' +
        'PLANET_RESCUE_BASE_REWARD = 500 Chimes\n' +
        'PLANET_MATERIAL_CHANCE = 0.6 | CHAMPION_HOME_PLANET_CHANCE = 0.5\n' +
        'BOSS_BASE_HP=200 | BOSS_HP_LEVEL_SCALE=10 | BOSS_HP_CPS_SCALE=50\n' +
        'BOSS_HP_POWER_SCALE=5000 | BOSS_PASSIVE_DPS_FRACTION=0.1\n' +
        'BOSS_BASE_REWARD=500 | BOSS_REWARD_DIFFICULTY_SCALE=4\n' +
        'BOSS_CPS_PENALTY_FRACTION=0.05 | BOSS_CPS_PENALTY_DURATION=30s\n' +
        'BOSS_ENRAGE_BASE=30s | BOSS_ENRAGE_MAX=60s | BOSS_ENRAGE_STEP=5 Level',
    },
    {
      id: 'constants-expedition',
      name: 'Expeditions-Konstanten',
      icon: '🗺️',
      description: 'Alle Werte für das Expeditions-System.',
      lore: 'Das Maß aller Reisen.',
      formula:
        'MAX_ACTIVE_EXPEDITIONS = 3\n' +
        'CHAMPION_BASE_POWER = 50\n' +
        'CHAMPION_POWER_PER_LEVEL = 10',
    },
  ],
}
