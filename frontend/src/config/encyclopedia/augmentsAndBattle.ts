import type { EncyclopediaCategory } from './types'

export const augmentsCategory: EncyclopediaCategory = {
  id: 'augments',
  title: 'Augments',
  icon: '✨',
  entries: [
    {
      id: 'augment-system',
      name: 'Augment System',
      icon: '/img/BardAbilities/BardChime.png',
      description:
        'At every level-up, 3 random augments appear for you to choose from. ' +
        'The chosen augment applies for the entire current run and stacks with other augments. ' +
        'Selection is based on weighted randomness: ' +
        'Common = 60, Rare = 25, Epic = 12, Legendary = 3.',
      lore: 'Cosmic forces that grow stronger with every ascent.',
      formula:
        'Total weight = 100 (60+25+12+3)\n' +
        'Chance Common ≈ 60% | Rare ≈ 25% | Epic ≈ 12% | Legendary ≈ 3%\n' +
        'RARITY_WEIGHTS = { common:60, rare:25, epic:12, legendary:3 }',
    },
    {
      id: 'augments-common',
      name: 'Augments: Common',
      icon: '⚪',
      description:
        'Common augments (≈60% chance). Moderate bonuses:\n' +
        '• Melodic Surge: +30% CPS\n' +
        '• Resonant Strike: +50% CPC\n' +
        "• Warrior's Beat: +200 Power per ability level\n" +
        '• Frugal Harmony: −15% building costs\n' +
        '• Meep Bargain: −20% Meep costs\n' +
        "• Wanderer's Luck: +25% expedition reward\n" +
        '• Balanced Chord: +20% CPS & CPC\n' +
        '• Meep Empowerment: +50% Meep Combat Power\n' +
        '• Caffeine Rush: +10% CPS\n' +
        '• Steady Hands: +5% CPC\n' +
        '• Lucky Penny: +8% expedition reward',
      lore: 'Small gifts of fate — weak alone, powerful combined.',
      formula: 'Weight = 60 | Total pool = 11 Common augments',
    },
    {
      id: 'augments-rare',
      name: 'Augments: Rare',
      icon: '🔵',
      description:
        'Rare augments (≈25% chance). Strong bonuses:\n' +
        '• Harmonic Cascade: +70% CPS\n' +
        '• Thunder Chime: +100% CPC\n' +
        '• Battle Hymn: +500 Power per ability level\n' +
        '• Master Builder: −30% building costs\n' +
        "• Fortune's Compass: +50% expedition reward\n" +
        '• Combat Rhythm: +40% CPS & +300 Power/Level\n' +
        '• Double Tap: Every 10th click counts twice\n' +
        '• Coin Magnet: +15% CPS\n' +
        '• Overclock: CPS ×2 for 30s after level-up',
      lore: 'Rare harmonies from distant galaxies.',
      formula: 'Weight = 25 | Total pool = 9 Rare augments',
    },
    {
      id: 'augments-epic-legendary',
      name: 'Augments: Epic & Legendary',
      icon: '🟣',
      description:
        'Epic (≈12% chance):\n' +
        '• Eternal Melody: +150% CPS\n' +
        '• Cosmic Click: +200% CPC\n' +
        "• Warlord's Anthem: +1,000 Power per ability level\n" +
        '• Grand Crescendo: +80% CPS & CPC\n' +
        '• Time Warp: All cooldowns halved\n\n' +
        'Legendary (≈3% chance): The most powerful augments in the game with transformative effects.',
      lore: 'Forces beyond comprehension — only a chosen few ever witness them.',
      formula:
        'Epic weight = 12 | Legendary weight = 3\n' +
        'Stack with all other augments and modifiers',
    },
  ],
}

export const battleCategory: EncyclopediaCategory = {
  id: 'battle',
  title: 'Battle System',
  icon: '⚔️',
  entries: [
    {
      id: 'auto-battle',
      name: 'Auto-Battle',
      icon: '/img/BardBattle.png',
      description:
        'Battles run fully automatically every 45 seconds of real time. ' +
        'Each battle also lasts 45 seconds (simulated). ' +
        'Victory or defeat is calculated based on Combat Power and ELO probability.',
      lore: 'The battles rage endlessly. Bard and his Meeps fight without pause.',
      formula:
        'AUTO_BATTLE_INTERVAL_MS = 45,000 ms (45 seconds)\n' +
        'BATTLE_REAL_DURATION_SECONDS = 45',
    },
    {
      id: 'power',
      name: 'Combat Power',
      icon: '/img/BardAbilities/BardChimeMeep.png',
      description:
        'Combat Power determines the win probability. ' +
        'Comprised of: Meeps × 100 + W ability × 300 + augment bonuses. ' +
        "Opponent Power is calculated from their MMR (MMR × 1.5 as base value).",
      lore: 'The combined strength of all Meeps and cosmic abilities, channeled for battle.',
      formula:
        'Power = (Meeps × 100) + (W-Level × 300) + AugmentBonuses\n' +
        'Opponent Power ≈ opponentMMR × 1.5\n' +
        'MMR_TO_POWER_MULTIPLIER = 1.5',
    },
    {
      id: 'win-probability',
      name: 'Win Probability',
      icon: '/img/BardBattle.png',
      description:
        'Calculated using the ELO principle based on the Power difference. ' +
        'A luck factor of ±15% introduces surprises. ' +
        'The K-factor determines how strongly MMR changes after a battle (32 = standard ELO).',
      lore: 'Even the stars cannot predict the outcome of a battle with certainty.',
      formula:
        'Win% = 1 / (1 + 10^(−PowerDiff / 400))\n' +
        'ELO_K_FACTOR = 32 | ELO_RATING_SCALE = 400\n' +
        'ELO_LUCK_FACTOR = 0.15 (±15% random variance)\n' +
        'Opponent MMR variance: OPPONENT_MMR_VARIANCE = 200',
    },
    {
      id: 'mmr',
      name: 'MMR (Matchmaking Rating)',
      icon: '/img/BardBattle.png',
      description:
        'A hidden value that determines strength and rank. ' +
        'Rises on wins (K-factor 32) and falls on losses. ' +
        'Each rank tier begins at a specific MMR threshold.',
      lore: 'The cosmic scale that measures the strength of every fighter.',
      formula:
        'MMR thresholds:\n' +
        'Iron IV = 0 | Bronze IV = 500 | Silver IV = 1,000\n' +
        'Gold IV = 1,500 | Platinum IV = 2,000 | Diamond IV = 2,500\n' +
        'Master I = 3,000 | Grandmaster I = 3,500 | Challenger I = 4,000+',
    },
    {
      id: 'lp',
      name: 'LP (League Points)',
      icon: '/img/BardBattle.png',
      description:
        'Visible points within a division. Standard change: ±20 LP per battle. ' +
        'At 100 LP a promotion occurs. At 75 LP or below demotion is possible. ' +
        'Master/Grandmaster/Challenger have higher thresholds.',
      lore: 'Gleaming points on the path to the top of the cosmic leaderboard.',
      formula:
        'LP_BASE_CHANGE = 20 (per battle)\n' +
        'Normal promotion: LP ≥ 100 → LP_NORMAL_PROMOTION_THRESHOLD\n' +
        'Master promotion: LP ≥ 500 → LP_MASTER_PROMOTION_THRESHOLD\n' +
        'Grandmaster promotion: LP ≥ 1,000 → LP_GRANDMASTER_PROMOTION_THRESHOLD\n' +
        'Demotion risk: LP ≤ 75 (LP_DEMOTION_VALUE)\n' +
        'Master demotion: LP ≤ 400 | Grandmaster demotion: LP ≤ 900',
    },
    {
      id: 'battle-stats',
      name: 'Battle Statistics',
      icon: '/img/minimap.png',
      description:
        'After each battle, K/D/A values are randomly generated. ' +
        'Kill chance: 50%, Death chance: 30%, Assist chance: 70%. ' +
        'Max per battle: 3 Kills, 2 Deaths, 7 Assists.',
      lore: 'Numbers recorded by cosmic chroniclers.',
      formula:
        'STAT_KILL_CHANCE = 0.5 | STAT_DEATH_CHANCE = 0.3 | STAT_ASSIST_CHANCE = 0.7\n' +
        'STAT_MAX_KILLS = 3 | STAT_MAX_DEATHS = 2 | STAT_MAX_ASSISTS = 7',
    },
    {
      id: 'ranks',
      name: 'Ranks',
      icon: '/img/RankBorder/RankGold.png',
      description:
        'From Iron to Challenger: 9 rank tiers, each with divisions IV through I. ' +
        'Iron–Diamond have 4 divisions each (IV, III, II, I). ' +
        'Master, Grandmaster, and Challenger have only Division I and higher LP thresholds.',
      lore: 'The eternal hierarchy of fighters, forged in the fires of countless battles.',
      formula:
        'RANK_TIERS = [Iron, Bronze, Silver, Gold, Platinum, Emerald, Diamond, Master, Grandmaster, Challenger]\n' +
        'RANK_DIVISIONS = [IV, III, II, I]',
    },
  ],
}

export const championsCategory: EncyclopediaCategory = {
  id: 'champions',
  title: 'Champions',
  icon: '/img/roles/top.png',
  entries: [
    {
      id: 'champion-system',
      name: 'Champion System',
      icon: '/img/BardAbilities/Bard.png',
      description:
        'Recruit champions with Gold for your 5v5 battle team. ' +
        'Each champion starts with 50 base Power and gains +10 Power per level. ' +
        'A full team of 5 champions maximizes Combat Power.',
      lore: 'Heroes from every dimension answering the call of the cosmic wanderer.',
      formula:
        'Champion Power = CHAMPION_BASE_POWER + (Level × CHAMPION_POWER_PER_LEVEL)\n' +
        'CHAMPION_BASE_POWER = 50 | CHAMPION_POWER_PER_LEVEL = 10',
    },
    {
      id: 'champion-team',
      name: 'Team Composition',
      icon: '/img/minimap.png',
      description:
        'Assemble a team of 5 champions. Team strength influences battles against automatically generated enemy teams. ' +
        'An incomplete team (< 5) reduces effective Combat Power.',
      lore: 'The right combination of fighters can make all the difference.',
      formula: 'Optimal team size = 5 champions',
    },
  ],
}
