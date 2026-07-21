import type { EncyclopediaCategory } from './types'

export const sunForgeCategory: EncyclopediaCategory = {
  id: 'sunforge',
  title: 'Sun & Star Forge',
  icon: 'game-icons:solar-power',
  entries: [
    {
      id: 'comet-origin',
      name: 'Comet Origin',
      icon: 'game-icons:meteor-impact',
      description:
        'You begin as a rogue comet. Kindle all five Solar Rays and forge the Ignition to turn the comet into a Spark — the birth of your sun.',
      lore: 'Every sun was once a wanderer.',
      formula: 'Comet grows with each kindled ray (5 rays)\nMinimum dwell before ignition: 3 min',
      related: ['sun-phases', 'solar-rays'],
    },
    {
      id: 'sun-phases',
      name: 'Sun Phases',
      icon: 'game-icons:sunset',
      description:
        'The sun evolves through 7 stages, from Comet to the supernova Finale. ' +
        'Each evolution needs all Solar Rays levelled evenly plus a minimum dwell time in the current phase.',
      lore: 'A symphony in seven movements.',
      formula:
        'Comet → Spark → Prelude → Crescendo → Swell → Requiem → Finale\n' +
        'Dwell: 3 min → 10 min → 30 min → 90 min → 4 h → 24 h → —\n' +
        'Evolve needs every ray ≥ phase + 1',
      related: ['solar-rays', 'comet-origin', 'planet-slots'],
    },
    {
      id: 'solar-rays',
      name: 'Solar Rays',
      icon: 'game-icons:beam-wake',
      description:
        'The five roots of the forge tree: Flight Speed, Max HP, Chimes/Click, Chimes/Second and Damage/Click. ' +
        'Rays must be raised evenly — no ray can exceed the lowest by more than one level.',
      lore: 'Light bends where will directs it.',
      formula:
        'Flight 200 ×1.6 → +10% speed & CPS per level\n' +
        'Max HP 150 ×1.5 → +25 HP\n' +
        'Chimes/Click 50 ×1.5 → +2 CPC\n' +
        'Chimes/Second 50 ×1.5 → +20 CPS\n' +
        'Damage 200 ×1.6 → +25% click damage\n' +
        'Max level 6',
      related: ['sun-phases', 'forge-branches'],
    },
    {
      id: 'forge-branches',
      name: 'Forge Branches',
      icon: 'game-icons:tree-branch',
      description:
        'Ten branches grow from the roots (two per ray) once the sun reaches phase 2. ' +
        'They add utility: expedition speed, offline gains, HP regen, damage reduction, double clicks, material drops and more. ' +
        'Cost Chimes plus materials.',
      lore: 'The tree remembers every season.',
      formula:
        'Cost = ceil(base × mult^level), materials × (level + 1)\n' +
        'Max level 3, +1 per phase above 2 (cap 5)',
      related: ['forge-leaves', 'solar-rays'],
    },
    {
      id: 'forge-leaves',
      name: 'Forge Leaves',
      icon: 'game-icons:falling-leaf',
      description:
        'At phase 4 each branch sprouts a leaf that amplifies its parent branch by +25% per level (max 3).',
      lore: 'The smallest growth crowns the tallest tree.',
      formula: 'Branch effect × (1 + 0.25 × leaf level)\nCost = 25,000 × 2.5^level',
      related: ['forge-branches'],
    },
    {
      id: 'forge-relics',
      name: 'Relics',
      icon: 'game-icons:anvil',
      description:
        'Six craftable relics fuse a fully grown branch (level 3) with materials: Echo of the Void (offline), ' +
        'Choir of Champions (champion DPS), Heart of the Star (max HP), Midas Bell (clicks gain CPS), ' +
        'Stellar Compass (expedition speed) and Ember Crown (boss damage). Relics level 1–3.',
      lore: 'Forged once, resonating forever.',
      related: ['forge-branches', 'constellations', 'materials'],
    },
    {
      id: 'constellations',
      name: 'Constellations',
      icon: 'game-icons:north-star-shuriken',
      description:
        'Seven one-time fusions of two level-3 branches with permanent effects — e.g. Stellar Wind (+18% CPS), ' +
        "Prospector's Song (+1 material per drop), Percussive Nova (click splash damage) and Golden Tempest (+12% CPC).",
      lore: 'Stars aligned by a patient hand.',
      related: ['forge-relics'],
    },
    {
      id: 'cosmic-bargain',
      name: 'Cosmic Bargain',
      icon: 'game-icons:trade',
      description:
        'A rotating deal that restocks every 8 hours: temporary ×2 buffs, material crates, phase-dwell skips or a full sun heal. ' +
        'One purchase per cycle; a reroll costs 1 Dark Matter.',
      lore: 'The void always has something to sell.',
      related: ['materials', 'sun-phases'],
    },
  ],
}

export const meepTreeCategory: EncyclopediaCategory = {
  id: 'meeptree',
  title: 'Meep Skill Tree',
  icon: 'game-icons:tree-growth',
  entries: [
    {
      id: 'meep-tree',
      name: 'Meep Skill Tree',
      icon: 'game-icons:sprout',
      description:
        'Spend Meeps on 25 one-time nodes across five branches. ' +
        'Nodes unlock in order within a branch and reset on prestige.',
      lore: 'Every Meep carries a seed of greatness.',
      formula: 'Node costs per branch: 3 / 8 / 20 / 45 / 95 Meeps',
      related: ['meeps', 'prestige'],
    },
    {
      id: 'tree-melody',
      name: 'Melody Branch',
      icon: 'game-icons:pan-flute',
      description:
        'The idle branch: up to +225% CPS, stronger offline earnings and a +4 h offline cap.',
      lore: 'A song that plays while you sleep.',
      related: ['meep-tree'],
    },
    {
      id: 'tree-resonance',
      name: 'Resonance Branch',
      icon: 'game-icons:drum-kit',
      description:
        'The click branch: up to +200% CPC, a 10% double-click chance and Worldbell — clicks gain +2% of your CPS.',
      lore: 'Strike once, hear it thrice.',
      related: ['meep-tree', 'clicker'],
    },
    {
      id: 'tree-cosmos',
      name: 'Cosmos Branch',
      icon: 'game-icons:ufo',
      description:
        'The Meep & expedition branch: −35% Meep cost, +25% expedition rewards, 20% faster expeditions and +30% Meep power.',
      lore: 'The in-between is shorter than it looks.',
      related: ['meep-tree', 'expeditions'],
    },
    {
      id: 'tree-battle',
      name: 'Battle Branch',
      icon: 'game-icons:war-axe',
      description: 'The war branch: up to +7,000 flat combat power and +25% champion DPS.',
      lore: 'Drums before the storm.',
      related: ['meep-tree', 'orbit-combat'],
    },
    {
      id: 'tree-warden',
      name: 'Warden Branch',
      icon: 'game-icons:guards',
      description:
        'The defense branch: +40% boss damage, +20% material drops, +1 HP regen/s and −15% damage taken.',
      lore: 'A shield sung into being.',
      related: ['meep-tree', 'sun-hp'],
    },
  ],
}

export const planetSlotsCategory: EncyclopediaCategory = {
  id: 'planetslots',
  title: 'Planet Slots',
  icon: 'game-icons:orbital',
  entries: [
    {
      id: 'planet-slots',
      name: 'Orbit Slots',
      icon: 'game-icons:stone-sphere',
      description:
        'Six orbit slots for worker planets, unlocked by sun phase and bought with Chimes. ' +
        'Each slot is permanently assigned one role — choose wisely.',
      lore: 'Worlds sworn to a single purpose.',
      formula:
        'Costs: 500 · 2,000 · 8,000 · 35,000 · 150,000 · 600,000\n' +
        'Slot i requires sun phase i − 1',
      related: ['planet-roles', 'attunement', 'sun-phases'],
    },
    {
      id: 'planet-roles',
      name: 'Planet Roles',
      icon: 'game-icons:gears',
      description:
        'Six roles: Turret (auto-attack DPS), Harvester (+1 material every 30 ticks), Relay (+30% expedition rewards), ' +
        'Aegis (−15% boss damage), Timewarp (+25% offline earnings) and Resonator (+25% CPS for one chosen building).',
      lore: 'Each world hums its own note.',
      related: ['planet-slots', 'jungle-buffs', 'turret-salvos'],
    },
    {
      id: 'attunement',
      name: 'Attunement',
      icon: 'game-icons:ascending-block',
      description:
        'Level up a slot to scale its role bonus and HP. Every 5 levels hits a milestone with a +25% bonus jump and a new rank, ' +
        'from Nascent to Transcendent.',
      lore: 'Repetition becomes ritual, ritual becomes power.',
      formula:
        'Bonus = 1 + (level − 1) × 0.10 + milestones × 0.25\n' +
        'HP = 100 × (1 + (level − 1) × 0.20)\n' +
        'Cost = ceil(slotCost × 0.5 × 1.6^(level − 1))',
      related: ['planet-slots'],
    },
    {
      id: 'jungle-buffs',
      name: 'Jungle Buffs',
      icon: 'game-icons:jungle',
      description:
        'Your Jungle champion patrols the orbit and super-charges planets it passes: Turret ×2.5, Harvester ×3, Relay ×2, ' +
        'Aegis ×1.5, Timewarp ×2 and Resonator ×2 — for 12–30 seconds each.',
      lore: 'The hunter feeds the garden.',
      related: ['planet-roles', 'role-abilities'],
    },
  ],
}
