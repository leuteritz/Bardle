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
        'The primary currency. Earned per click (CPC) and passively every second (CPS). ' +
        'Almost everything — buildings, planet slots, the Star Forge, items and champion recruitment — is paid in Chimes.',
      lore: 'Cosmic sounds echoing through dimensions.',
      formula:
        'Click: +CPC · Passive: +CPS per second\n' +
        'Base CPC = 20\n' +
        'Both scale with augments, items, synergies,\n' +
        'Solar Rays, Star Forge and Meep Tree bonuses',
      related: ['buildings', 'clicker', 'augment-system'],
    },
    {
      id: 'meeps',
      name: 'Meeps',
      icon: '/img/BardAbilities/BardMeep.png',
      description:
        'Cosmic companions that spawn automatically once enough Chimes accumulate. ' +
        'Each Meep grants +100 combat power — and Meeps are the currency of the Meep Skill Tree.',
      lore: 'Loyal spirits from the space between worlds.',
      formula:
        'Next Meep = ceil(20 × meeps^1.2) Chimes\n' +
        'Power = Meeps × 100 (× tree & augment bonuses)\n' +
        'Cost reduced by Meep Tree nodes',
      related: ['meep-tree', 'level-system'],
    },
    {
      id: 'materials',
      name: 'Materials',
      icon: '/img/Sternenstaub.png',
      description:
        'Ten cosmic materials collected from boss rewards, Harvester planets and Cosmic Bargains. ' +
        'Spent on items, Star Forge crafting and champion recruitment.',
      lore: 'The raw matter of the cosmos, waiting for a maker.',
      formula:
        'Drop gate = 30% base × forge & tree bonuses\n' +
        'Weights: Stardust .35 · Moon Crystal .25\n' +
        'Nebula Quartz .20 · Solar Essence .12 · Comet Ice .10\n' +
        'Void Shard .06 · Star Iron .05 · Dark Matter .02\n' +
        'Plasma Core .015 · Aether Dust .008',
      related: ['item-shop', 'forge-relics', 'boss-rewards'],
    },
    {
      id: 'sun-hp',
      name: 'Sun HP',
      icon: 'game-icons:life-support',
      description:
        'Your sun has 100 base HP and regenerates 1 HP per second. Boss enrages, Shock Novas and enemy shots damage it; ' +
        'Support champions, relics and Solar upgrades keep it alive.',
      lore: 'Even a sun can bleed.',
      formula:
        'Base 100 HP (+25 per Solar Max-HP level)\n' +
        'Regen 1 HP/s + forge & tree bonuses\n' +
        'Enrage −25 · Shock Nova −5 · Enemy shot −8',
      related: ['boss-attacks', 'role-abilities', 'solar-rays'],
    },
  ],
}

export const levelingCategory: EncyclopediaCategory = {
  id: 'leveling',
  title: 'Leveling & Augments',
  icon: 'game-icons:rank-3',
  entries: [
    {
      id: 'level-system',
      name: 'Level System',
      icon: 'game-icons:progression',
      description:
        'Your level rises automatically as Chimes accumulate. ' +
        'Every level-up offers a choice of 3 augments; overflow Chimes carry into the next level.',
      lore: 'Growth through experience.',
      formula:
        'Threshold(N) = ceil(2500 × N^2.2)\n' + 'Above level 30: threshold × 1.1^(N − 30)',
      related: ['augment-system'],
    },
    {
      id: 'augment-system',
      name: 'Augments',
      icon: 'game-icons:gift-of-knowledge',
      description:
        'Pick 1 of 3 random augments at every level-up. Augments stack for the whole run and reset on prestige. ' +
        'Rarity decides how strong — and how rare — an offer is.',
      lore: 'Cosmic forces that grow with every ascent.',
      formula: 'Rarity weights: Common 60 · Rare 25 · Epic 12 · Legendary 3',
      related: ['augment-pool', 'level-system', 'prestige'],
    },
    {
      id: 'augment-pool',
      name: 'Augment Pool',
      icon: 'game-icons:card-random',
      description:
        'Eleven augments are in rotation: Melodic Surge (+30% CPS), Resonant Strike (+50% CPC), ' +
        'Frugal Harmony (−15% building cost), Harmonic Cascade (+70% CPS), Thunder Chime (+100% CPC), ' +
        'Battle Hymn (+500 power per level), Double Tap (every 10th click counts twice), Eternal Melody (+150% CPS), ' +
        'Chain Reaction (20% bonus click), Big Bang (one-time 5× power) and Infinite Loop (every 50th click echoes 5 times).',
      lore: 'Small gifts of fate — weak alone, mighty combined.',
      related: ['augment-system'],
    },
  ],
}

export const buildingsCategory: EncyclopediaCategory = {
  id: 'buildings',
  title: 'Buildings',
  icon: 'game-icons:brick-wall',
  entries: [
    {
      id: 'buildings',
      name: 'Chime Buildings',
      icon: 'game-icons:village',
      description:
        'Five passive producers bought with Chimes: Bell Tower, Sound Generator, Harmony Works, Sphere Music and Zeit Echo. ' +
        'Each level adds flat CPS; costs grow exponentially.',
      lore: 'Machines that turn silence into song.',
      formula:
        'Cost(N) = ceil(base × mult^N)\n' +
        'Bell Tower 25 ×1.15 → +1 CPS\n' +
        'Sound Generator 100 ×1.2 → +3 CPS\n' +
        'Harmony Works 500 ×1.25 → +5 CPS\n' +
        'Sphere Music 2,500 ×1.3 → +10 CPS\n' +
        'Zeit Echo 10,000 ×1.4 → +25 CPS',
      related: ['chimes', 'clicker'],
    },
    {
      id: 'clicker',
      name: 'Clicker',
      icon: '/img/ChimesPerClick.png',
      description:
        'The one click building: +1 base CPC per level, starting at 50 Chimes. ' +
        'Scales with every CPC multiplier in the game.',
      lore: 'A mechanical amplifier for every touch.',
      formula: 'Cost(N) = ceil(50 × 1.2^N) · +1 CPC per level',
      related: ['chimes', 'buildings'],
    },
  ],
}
