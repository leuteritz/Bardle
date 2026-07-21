import type { EncyclopediaCategory } from './types'

export const battleCategory: EncyclopediaCategory = {
  id: 'battle',
  title: 'Battle Broadcast',
  icon: 'game-icons:katana',
  entries: [
    {
      id: 'auto-battle',
      name: 'Auto-Battle',
      icon: 'game-icons:tv',
      description:
        'Every 45 seconds a full 5v5 match is broadcast: 60 minutes of game time compressed into 60 real seconds. ' +
        'The whole match — kills, drakes, baron, the winner — is generated up front from a seeded timeline and replayed live.',
      lore: 'The rift never sleeps.',
      formula:
        'Search 45 s → battle 60 s (3,600 game-seconds)\n' +
        'Phases: laning → drakes → mid fights → baron → final push',
      related: ['win-probability', 'battle-objectives', 'honor-mvp'],
    },
    {
      id: 'win-probability',
      name: 'Win Probability',
      icon: 'game-icons:perspective-dice-six-faces-random',
      description:
        'Your combat power meets an opponent scaled from your hidden MMR. ' +
        'The win chance follows the classic ELO curve — with a little luck on top.',
      lore: 'Even the stars cannot call a coin flip.',
      formula:
        'Expected = 1 / (1 + 10^(−(power − enemyPower) / 400))\n' +
        '± 15% luck, clamped 5–95%\n' +
        'Enemy power = max(100, MMR × 1.5), MMR ± 200',
      related: ['mmr-ranks', 'lp'],
    },
    {
      id: 'mmr-ranks',
      name: 'MMR & Ranks',
      icon: 'game-icons:podium',
      description:
        'A hidden MMR moves after every match and drives your rank: 10 tiers from Iron to Challenger, ' +
        'each with divisions IV–I.',
      lore: 'The cosmic ladder has no top rung.',
      formula:
        'ΔMMR = 32 × (result − expected)\n' +
        'Iron 0 · Bronze 500 · Silver 1000 · Gold 1500\n' +
        'Platinum 2000 · Diamond 2500 · Master 3000\n' +
        'Grandmaster 3500 · Challenger 4000+',
      related: ['lp', 'win-probability'],
    },
    {
      id: 'lp',
      name: 'League Points',
      icon: 'game-icons:flying-flag',
      description:
        'Visible points inside a division. Gains scale with how surprising the result was; ' +
        '100 LP promotes, dropping below 0 demotes — you re-enter the lower division at 75 LP.',
      lore: 'Glory, measured in small numbers.',
      formula:
        'LP = ±20 × |ΔMMR| / 32\n' +
        'Elder drake win: +15 LP\n' +
        'Hand of Baron halves an LP loss',
      related: ['mmr-ranks', 'battle-objectives'],
    },
    {
      id: 'battle-objectives',
      name: 'Drakes & Baron',
      icon: 'game-icons:sea-dragon',
      description:
        'Seven drake types and Baron Nashor spawn on a schedule. Securing them swings the win chance and can open ' +
        'interactive fights where your clicks and role abilities decide the outcome.',
      lore: 'Monsters guard the scales of fate.',
      formula:
        'Win swing: minor drakes +6% · Infernal +10%\n' +
        'Elder +12% · Baron +12%\n' +
        'Fight HP: drake 3,200 · baron 4,000 · click +15 dmg',
      related: ['auto-battle', 'lp'],
    },
    {
      id: 'honor-mvp',
      name: 'Honor & MVP',
      icon: 'game-icons:crowned-heart',
      description:
        'After the match, honor up to 3 champions. The MVP is scored from kills, damage, gold and objectives — ' +
        'honoring the MVP grants ×2 CPS & CPC for 10 seconds.',
      lore: 'Respect is the oldest currency.',
      related: ['auto-battle'],
    },
  ],
}

export const championsCategory: EncyclopediaCategory = {
  id: 'champions',
  title: 'Champions & Team',
  icon: 'game-icons:visored-helm',
  entries: [
    {
      id: 'champion-recruitment',
      name: 'Recruitment',
      icon: 'game-icons:knight-banner',
      description:
        'Champions appear as star bosses on their home planets. ' +
        'Defeat the boss, then recruit the champion with Chimes and materials.',
      lore: 'Heroes answer only after the fight.',
      formula: 'Recruit price by star: 500 · 1,400 · 2,800 · 4,500 · 6,500 · 9,500 Chimes + materials',
      related: ['champion-tiers', 'star-types'],
    },
    {
      id: 'champion-tiers',
      name: 'Champion Tiers',
      icon: 'game-icons:rank-2',
      description:
        'Six star tiers from Wanderer (★1) to Ascendant (★6). Higher tiers unlock in deeper galaxies and spawn less often; ' +
        'locked tiers can be bought open with Chimes and materials.',
      lore: 'Not all stars burn at the same height.',
      formula:
        'Unlock galaxies: 1 · 3 · 6 · 10 · 15 · 21\n' +
        'Tier unlock cost = ceil(50,000 × 3.2^(tier − 2)) + materials',
      related: ['champion-recruitment', 'galaxy-tiers'],
    },
    {
      id: 'team-roster',
      name: 'Team Roster',
      icon: 'game-icons:meeple-army',
      description:
        'Your battle team fields 5 main champions — one per role — plus 25 ally slots (5 per role). ' +
        'Mains and allies feed combat power through the Battle Sigil.',
      lore: 'A constellation of chosen fighters.',
      formula: '+100 power per main star · +25 per ally star',
      related: ['synergies', 'orbit-combat'],
    },
    {
      id: 'synergies',
      name: 'Traits & Origins',
      icon: 'game-icons:chain-lightning',
      description:
        'Champions share Traits and Origins. Fielding two or more matching champions activates tiered bonuses ' +
        'that multiply CPS, combat power or champion DPS.',
      lore: 'Kinship is a force multiplier.',
      related: ['team-roster'],
    },
  ],
}
