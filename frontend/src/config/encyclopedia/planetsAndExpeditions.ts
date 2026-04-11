import type { EncyclopediaCategory } from './types'

export const planetEventsCategory: EncyclopediaCategory = {
  id: 'planetEvents',
  title: 'Planeten-Events',
  icon: '🪐',
  entries: [
    {
      id: 'planet-spawn',
      name: 'Planeten-Erscheinung',
      icon: '/img/BardAbilities/BardChime.png',
      description:
        'Planeten erscheinen zufällig alle 6–14 Sekunden. Maximal 3 Planeten gleichzeitig. ' +
        'Grundchance, dass ein Rettungs-Event ausgelöst wird: 60%. ' +
        'Mit jedem Prestige erhöht sich die Basis-Ereignischance um +35%.',
      lore: 'Welten in Not. Jede Sekunde könnte ein neuer Planet um Hilfe rufen.',
      formula:
        'PLANET_SPAWN_INTERVAL_MIN = 6 000 ms | PLANET_SPAWN_INTERVAL_MAX = 14 000 ms\n' +
        'PLANET_MAX_COUNT = 3 (gleichzeitig)\n' +
        'PLANET_EVENT_BASE_CHANCE = 0.6 (60%)\n' +
        'PLANET_EVENT_PRESTIGE_BONUS = 0.35 (pro Prestige)',
    },
    {
      id: 'planet-rescue',
      name: 'Planeten-Rettung',
      icon: '/img/BardAbilities/BardQ.png',
      description:
        'Ein Rettungs-Event erfordert 5–15 Klicks innerhalb von 5–10 Sekunden. ' +
        'Belohnung: mindestens 500 Chimes (Basis), skaliert mit Fortschritt. ' +
        '60% Chance, dass der Planet ein Material enthält.',
      lore: 'Jeder gerettete Planet dankt es dir mit kosmischen Gaben.',
      formula:
        'PLANET_RESCUE_DURATION_MIN = 5 000 ms | MAX = 10 000 ms\n' +
        'PLANET_RESCUE_CLICKS_MIN = 5 | MAX = 15\n' +
        'PLANET_RESCUE_BASE_REWARD = 500 Chimes\n' +
        'PLANET_MATERIAL_CHANCE = 0.6 (60% Materialien)\n' +
        'CHAMPION_HOME_PLANET_CHANCE = 0.5 (50% Champion-Heimatplanet)',
    },
    {
      id: 'planet-types',
      name: 'Planetentypen',
      icon: '/img/BardAbilities/BardW.png',
      description:
        'Es gibt 8 verschiedene Planetentypen: Felsplanet, Eisplanet, Gasriese, Lavaplanet, Ozeanplanet, Wüstenplanet, Dschungelplanet, Ringplanet. ' +
        'Der Typ beeinflusst das visuelle Erscheinungsbild, hat aber keinen Einfluss auf die Belohnungen.',
      lore: 'Jede Welt hat ihre eigene Geschichte – ihre eigene Schönheit.',
      formula:
        'PLANET_TYPE_NAMES = { rocky, ice, gas-giant, lava, ocean, desert, jungle, ringed }',
    },
  ],
}

export const planetBossCategory: EncyclopediaCategory = {
  id: 'planetBoss',
  title: 'Planeten-Boss',
  icon: '👹',
  entries: [
    {
      id: 'boss-hp',
      name: 'Boss-Lebenspunkte',
      icon: '/img/BardAbilities/BardChimeMeep.png',
      description:
        'Boss-HP skalieren mit dem aktuellen Level, CPS und Kampfkraft. ' +
        'Basis: 200 HP. Jedes Level fügt +10 HP hinzu. ' +
        'Hohe CPS und hohe Power erhöhen ebenfalls den HP-Pool des Bosses.',
      lore: 'Je mächtiger der Spieler, desto furchterregender der Boss.',
      formula:
        'Boss-HP = BOSS_BASE_HP + (Level × BOSS_HP_LEVEL_SCALE) + (CPS / BOSS_HP_CPS_SCALE) + (Power / BOSS_HP_POWER_SCALE)\n' +
        'BOSS_BASE_HP = 200 | BOSS_HP_LEVEL_SCALE = 10\n' +
        'BOSS_HP_CPS_SCALE = 50 | BOSS_HP_POWER_SCALE = 5 000',
    },
    {
      id: 'boss-damage',
      name: 'Boss-Schaden (Passive DPS)',
      icon: '/img/BardAbilities/BardE.png',
      description:
        'Der Boss verursacht passiv 10% der eigenen Kampfkraft als Schaden pro Sekunde. ' +
        'Bei Sieg: Belohnung = 500 + (Schwierigkeit × 4) Chimes. ' +
        'Bei Niederlage: −5% CPS für 30 Sekunden.',
      lore: 'Der Boss lässt nicht locker. Er nutzt deine eigene Stärke gegen dich.',
      formula:
        'Passive DPS = Power × BOSS_PASSIVE_DPS_FRACTION = Power × 0.1\n' +
        'Belohnung = BOSS_BASE_REWARD + (Difficulty × BOSS_REWARD_DIFFICULTY_SCALE)\n' +
        '  = 500 + (Difficulty × 4)\n' +
        'CPS-Strafe = −BOSS_CPS_PENALTY_FRACTION = −5% für 30 000 ms',
    },
    {
      id: 'boss-enrage',
      name: 'Boss-Enrage',
      icon: '/img/BardAbilities/BardR.png',
      description:
        'Der Boss wütet (Enrage), wenn er nicht rechtzeitig besiegt wird. ' +
        'Basis-Enrage-Timer: 30 Sekunden. Alle 5 Level erhöht sich der Timer um bis zu 60 Sekunden. ' +
        'Im Enrage-Zustand steigen Schaden und Schwierigkeit erheblich.',
      lore: 'Wut ist die letzte Zuflucht des Besiegten – aber auch seine gefährlichste Waffe.',
      formula:
        'BOSS_ENRAGE_BASE_SECONDS = 30 s\n' +
        'BOSS_ENRAGE_LEVEL_STEP = 5 (alle 5 Level +1s)\n' +
        'BOSS_ENRAGE_MAX_SECONDS = 60 s',
    },
  ],
}

export const expeditionsCategory: EncyclopediaCategory = {
  id: 'expeditions',
  title: 'Expeditionen',
  icon: '🗺️',
  entries: [
    {
      id: 'expedition-system',
      name: 'Expeditions-System',
      icon: '/img/BardAbilities/BardChime.png',
      description:
        'Schicke Champions auf Expeditionen, um Belohnungen zu erhalten. ' +
        'Maximal 3 gleichzeitige Expeditionen möglich (MAX_ACTIVE_EXPEDITIONS = 3). ' +
        'Expeditions-Belohnungen können durch Augmente und Items erhöht werden.',
      lore: 'Die Weiten des Kosmos bieten unermessliche Schätze – aber nur für die Mutigen.',
      formula:
        'MAX_ACTIVE_EXPEDITIONS = 3 (gleichzeitig)\n' +
        'Champion-Expedition-Power = CHAMPION_BASE_POWER + (Level × CHAMPION_POWER_PER_LEVEL)\n' +
        '  = 50 + (Level × 10)',
    },
  ],
}
