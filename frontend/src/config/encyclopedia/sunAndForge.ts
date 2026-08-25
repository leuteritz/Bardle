import type { EncyclopediaCategory } from '@/config/encyclopedia/types'

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
        'The sun evolves through 7 stages, from Comet to the Collapse. ' +
        'Each evolution needs all Solar Rays levelled evenly plus a minimum dwell time in the current phase. ' +
        'Pyre is the largest the star ever burns — the last evolution detonates it in a supernova ' +
        'and leaves a black hole behind.',
      lore: 'Seven turns of the wheel. The last one is silence.',
      formula:
        'Comet → Spark → Dawn → Zenith → Swell → Pyre → Collapse\n' +
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
        'Flight 40 ×1.6 → +10% speed & CPS per level\n' +
        'Max HP 30 ×1.5 → +25 HP\n' +
        'Chimes/Click 10 ×1.5 → +2 CPC\n' +
        'Chimes/Second 10 ×1.5 → +20 CPS\n' +
        'Damage 40 ×1.6 → +25% click damage\n' +
        'Max level 6',
      related: ['sun-phases', 'forge-branches'],
    },
    {
      id: 'forge-branches',
      name: 'Forge Branches',
      icon: 'game-icons:tree-branch',
      description:
        'Fifteen branches grow from the roots — two per ray at phase 2, a third at phase 3. ' +
        'They add utility: expedition speed and payout, offline gains, HP regen, damage reduction, double clicks, ' +
        'material drops, star lifetime, click and idle multipliers. ' +
        'Cost Chimes plus materials.',
      lore: 'The tree remembers every season.',
      formula:
        'Cost = ceil(base × mult^level), materials × (level + 1)\n' +
        'Max level 3, +1 per phase above its own unlock phase (cap 6)',
      related: ['forge-leaves', 'astral-boughs', 'solar-rays'],
    },
    {
      id: 'forge-leaves',
      name: 'Forge Leaves',
      icon: 'game-icons:falling-leaf',
      description:
        'At phase 4 each branch sprouts a leaf that amplifies its parent branch by +25% per level (max 4).',
      lore: 'The smallest growth crowns the tallest tree.',
      formula:
        'Branch effect × (1 + 0.25 × leaf level)\n' +
        'Cost = 25,000 × 2.5^level (late branches: 250,000 × 2.8^level)',
      related: ['forge-branches', 'astral-boughs'],
    },
    {
      id: 'astral-boughs',
      name: 'Astral Boughs',
      icon: 'game-icons:infinity',
      description:
        'The outermost ring, open once the star collapses. Ten boughs hang from grown branches and have NO final level — ' +
        'they keep growing after everything else in the tree reads MAX. Each carries its branch onward on an uncapped axis: ' +
        'idle and click output, boss damage, offline gains, champion experience, expedition payout, star lifetime and max HP. ' +
        'They cost Chimes only, no materials.',
      lore: 'What the Caretaker tends outlasts the star that lit it.',
      formula:
        'Effect = level × per-level value (added, never multiplied)\n' +
        'Cost = ceil(base × 1.35^level) — cost grows faster than the payout, always',
      related: ['forge-branches', 'forge-leaves'],
    },
    {
      id: 'forge-relics',
      name: 'Relics',
      icon: 'game-icons:anvil',
      description:
        'Six craftable relics fuse a fully grown branch (level 3) with materials: Echo of the Void (offline), ' +
        'Host of Champions (champion DPS), Heart of the Star (max HP), Midas Bell (clicks gain CPS), ' +
        'Stellar Compass (expedition speed) and Ember Crown (boss damage). Relics level 1–5.',
      lore: 'Forged once, resonating forever.',
      related: ['forge-branches', 'constellations', 'materials'],
    },
    {
      id: 'constellations',
      name: 'Constellations',
      icon: 'game-icons:north-star-shuriken',
      description:
        'Seven one-time fusions of two level-3 branches with permanent effects — e.g. Stellar Wind (+18% CPS), ' +
        "Prospector's Charm (+1 material per drop), Shattering Nova (click splash damage) and Golden Tempest (+12% CPC).",
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
  title: 'The Wandering',
  icon: 'game-icons:footsteps',
  entries: [
    {
      id: 'meep-tree',
      name: 'The Wandering',
      icon: 'game-icons:sprout',
      description:
        'Five lanes on the outer rim of the Star Forge, bought with Meeps in the Shop tab. ' +
        'A node opens once any node of the rank below it is learned; at rank 4 two nodes ' +
        'share a rank and seal each other, so one save can hold 30 of the 35 nodes. ' +
        'Everything learned here survives prestige.',
      lore: 'The road remembers every keeper who walked it.',
      formula:
        'Vigil & Resonance: 3 / 10 / 26 / 55 / 110 / 220 Meeps\n' +
        'Cosmos, Battle & Warden: 4 / 14 / 32 / 70 / 140 / 280 Meeps\n' +
        'One full path across all five lanes: 2,468 Meeps',
      related: ['meeps', 'prestige', 'confluences'],
    },
    {
      id: 'confluences',
      name: 'Confluences',
      icon: 'game-icons:knot',
      description:
        'Five nodes on the seam between the sun ladder and The Wandering — the only ' +
        'purchases in the game that cost Chimes, materials and Meeps at once. ' +
        'Each needs a Bough above it and the first node of one lane beside it, and each ' +
        'is bound once, never levelled.',
      lore: 'Two roads that never met now share a stone.',
      formula:
        'Effect grows with every node opened on The Wandering:\n' +
        'Tidewatch +3% offline · Handfast +3% per click · Waychart +3% expedition spoils\n' +
        'Hostcall +400 power · Sunbind +3% boss damage — each per learned node',
      related: ['meep-tree', 'forge-branches', 'materials'],
    },
    {
      id: 'tree-vigil',
      name: 'Vigil Lane',
      icon: 'game-icons:candlebright',
      description:
        'The idle lane: Chimes/s on three ranks, far richer offline earnings and a +10 h offline cap.',
      lore: 'A watch that keeps itself while you sleep.',
      related: ['meep-tree'],
    },
    {
      id: 'tree-resonance',
      name: 'Resonance Lane',
      icon: 'game-icons:double-ringed-orb',
      description:
        'The click lane: Chimes/Click on three ranks, up to a 15% double-strike chance, ' +
        'and clicks that gain +3% of your CpS.',
      lore: 'Strike once, hear it thrice.',
      related: ['meep-tree', 'clicker'],
    },
    {
      id: 'tree-cosmos',
      name: 'Cosmos Lane',
      icon: 'game-icons:ufo',
      description:
        'The Meep & expedition lane: cheaper Meeps, up to +60% expedition rewards, ' +
        '20% faster expeditions and +40% Meep power.',
      lore: 'The in-between is shorter than it looks.',
      related: ['meep-tree', 'expeditions'],
    },
    {
      id: 'tree-battle',
      name: 'Battle Lane',
      icon: 'game-icons:war-axe',
      description: 'The war lane: up to +22,000 flat combat power, or champion DPS at the fork.',
      lore: 'The hush before the storm.',
      related: ['meep-tree', 'orbit-combat'],
    },
    {
      id: 'tree-warden',
      name: 'Warden Lane',
      icon: 'game-icons:guards',
      description:
        'The defense lane: up to +90% boss damage, +20% material drops, +3 HP regen/s ' +
        'and up to −25% damage taken.',
      lore: 'A shield willed into being.',
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
        'Aegis (−15% boss damage), Timewarp (+25% offline earnings) and Resonator (+25% CPS for one chosen Solar Ray).',
      lore: 'Each world keeps its own hour.',
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
