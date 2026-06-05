import type { EncyclopediaCategory } from './types'

export const resourcesCategory: EncyclopediaCategory = {
  id: 'resources',
  title: 'Resources',
  icon: 'game-icons:gem-chain',
  entries: [
    {
      id: 'chimes',
      name: 'Chimes',
      icon: '/img/BardAbilities/BardChime.png',
      description:
        'The primary currency in the game. Chimes are earned by clicking (CPC) or through passive building production (CPS). ' +
        'They are needed to buy buildings, permanent upgrades, and to reach the next universe. ' +
        'The starting value for Chimes per click is 20 (baseChimesPerClick = 20).',
      lore: 'Cosmic sounds echoing through dimensions. Every Chime carries a fragment of universal harmony.',
      formula:
        'Manual: Chimes += chimesPerClick per click\n' +
        'Passive: Chimes += chimesPerSecond × Δt\n' +
        'Starting value baseChimesPerClick = 20',
    },
    {
      id: 'meeps',
      name: 'Meeps',
      icon: '/img/BardAbilities/BardMeep.png',
      description:
        'Small cosmic companions that automatically appear when enough Chimes have been accumulated for the next Meep. ' +
        'Each Meep grants +100 Combat Power. Meeps can be sent on expeditions. ' +
        'The first Meep costs 20 Chimes. Costs scale exponentially with each additional Meep.',
      lore: 'Loyal spirits from the space between worlds. They follow the call of Chimes and gather around their master.',
      formula:
        'Cost = ceil(20 × meeps^1.2)\n' +
        'MEEP_BASE_COST = 20 | MEEP_COST_EXPONENT = 1.2\n' +
        'E ability & augments can reduce the cost',
    },
    {
      id: 'gold',
      name: 'Gold',
      icon: '/img/BardGold.png',
      description:
        'Earned exclusively through won battles. ' +
        'Gold is used to recruit new champions in the item shop. ' +
        'The amount of Gold per win scales with MMR and rank.',
      lore: 'The currency of the battlefields. Forged from triumph over worthy opponents.',
      formula: 'Gold earned per win = depends on MMR and rank',
    },
  ],
}

export const levelingCategory: EncyclopediaCategory = {
  id: 'leveling',
  title: 'Leveling & Skill Points',
  icon: 'game-icons:rank-3',
  entries: [
    {
      id: 'level-system',
      name: 'Level System',
      icon: '/img/BardAbilities/Bard.png',
      description:
        'Level increases automatically when cumulative Chimes exceed the threshold for the current level. ' +
        'Every second level (skillPointInterval = 2) grants a skill point used to upgrade abilities. ' +
        'At every level-up the augment selection appears (3 random augments).',
      lore: 'Growth through experience. Every new level opens doors to unknown powers.',
      formula:
        'Threshold for Level N = ceil(2000 × N^2.2)\n' +
        'LEVEL_BASE = 2000 | LEVEL_EXPONENT = 2.2\n' +
        'Example: Level 5 → ceil(2000 × 5^2.2) = ceil(2000 × 21.11) ≈ 42,220 Chimes\n' +
        'Skill point every 2 levels (default, can be changed by modifier)',
    },
    {
      id: 'skill-points',
      name: 'Skill Points',
      icon: '/img/BardAbilities/BardQ.png',
      description:
        'Skill points are used to upgrade the four abilities Q, W, E, and R. ' +
        'Alternatively, abilities can be unlocked once with Meeps (costs: Q=3, W=8, E=20, R=45 Meeps). ' +
        'Maximum per ability: 5 levels (MAX_ABILITY_LEVEL = 5).',
      lore: 'Knowledge crystallized into energy. Every point is a promise to the future.',
      formula:
        'Meep unlock costs (one-time, unlocks to MAX level):\n' +
        'Q = 3 Meeps | W = 8 Meeps | E = 20 Meeps | R = 45 Meeps\n' +
        'SKILL_MEEP_COSTS = [3, 8, 20, 45]\n' +
        'Order: abilities must be unlocked in sequence (Q → W → E → R)',
    },
  ],
}
