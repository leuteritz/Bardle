import type { EncyclopediaCategory } from './types'

export const galaxiesCategory: EncyclopediaCategory = {
  id: 'galaxies',
  title: 'Galaxies',
  icon: 'game-icons:galaxy',
  entries: [
    {
      id: 'galaxy-progression',
      name: 'Galaxy Progression',
      icon: 'game-icons:stairs',
      description:
        'Rescue champion stars to clear a galaxy: 3 stars in Galaxy 1, one more per galaxy after that. ' +
        'Travel time grows with depth and shrinks with Flight Speed.',
      lore: 'One rescued light at a time.',
      formula:
        'Stars required = 3 + (galaxy − 1)\n' + 'Travel = (60 s + (galaxy − 1) × 30 s) / flight speed',
      related: ['galaxy-boss', 'solar-rays'],
    },
    {
      id: 'galaxy-boss',
      name: 'Galaxy Boss',
      icon: 'game-icons:evil-comet',
      description:
        'At the galaxy core waits a boss guarded by escort waves of three. ' +
        'Defeat all escorts and the boss star to finish the galaxy.',
      lore: 'Every core hides a heart of darkness.',
      formula: 'Escorts = min(2 + (galaxy − 1), 12)',
      related: ['galaxy-progression', 'star-types'],
    },
    {
      id: 'galaxy-tiers',
      name: 'Galaxy Tiers',
      icon: 'game-icons:ladder',
      description:
        'Galaxies group into tiers — Tier 1 covers G1–2, then 3 galaxies per tier. ' +
        'Entering a new tier costs Chimes and materials and unlocks higher champion tiers.',
      lore: 'The deeper the dark, the brighter the prize.',
      related: ['champion-tiers', 'galaxy-progression'],
    },
    {
      id: 'sections',
      name: 'Sections',
      icon: 'game-icons:stone-path',
      description:
        'Ten named sections from Veloris Drift to Etherion Rift. Each needs boss rescues to clear and raises ' +
        'both difficulty and rewards.',
      lore: 'The map ends where the song begins.',
      formula: 'Rescues: 5 → 50 · difficulty ×1 → ×9 · rewards ×1 → ×6.5',
      related: ['boss-hp'],
    },
  ],
}

export const expeditionsCategory: EncyclopediaCategory = {
  id: 'expeditions',
  title: 'Expeditions',
  icon: 'game-icons:papyrus',
  entries: [
    {
      id: 'expeditions',
      name: 'Expeditions',
      icon: 'game-icons:direction-signs',
      description:
        'Timed missions for your champions. Up to 3 offers at once (a new one every 2 minutes) and up to 3 running. ' +
        'Match the required roles and bring enough power.',
      lore: 'The bold map what the timid fear.',
      formula:
        'Chance = (50% + power bonus up to 40%) × role factor\n' +
        'Role factor: 1.0 matched · 0.6 mismatched — clamped 5–95%\n' +
        'Tiers: common 80–280 · rare 280–750 · epic 750–2,800 Chimes',
      related: ['expedition-rewards', 'team-roster', 'tree-cosmos'],
    },
    {
      id: 'expedition-rewards',
      name: 'Expedition Rewards',
      icon: 'game-icons:money-stack',
      description:
        'Expeditions pay Chimes — boosted by Relay planets and Meep Tree nodes. ' +
        'A failed expedition still refunds 10% of the base reward.',
      lore: 'No journey returns empty-handed.',
      related: ['expeditions', 'planet-roles'],
    },
  ],
}

export const itemsCategory: EncyclopediaCategory = {
  id: 'items',
  title: 'Items & Sets',
  icon: 'game-icons:sword-spade',
  entries: [
    {
      id: 'item-shop',
      name: 'Item Shop',
      icon: 'game-icons:shop',
      description:
        'Buy weapons, armor and artefacts with Chimes (plus materials for the good stuff) in the Team tab. ' +
        'Five equipment slots each hold one item of every category.',
      lore: 'Steel, cloth and starlight — sold here.',
      related: ['item-rarities', 'set-bonuses', 'materials'],
    },
    {
      id: 'item-rarities',
      name: 'Item Rarities',
      icon: 'game-icons:cut-diamond',
      description:
        '26 items across four rarities, from a 300-Chime Health Potion to the 250,000-Chime Star Hammer. ' +
        'Items multiply combat power and/or CPS.',
      lore: 'Value is written in the cut.',
      formula:
        'Common 300–2,500 · Rare 5,000–28,000\n' + 'Epic 50,000–75,000 · Legendary 180,000–250,000',
      related: ['item-shop'],
    },
    {
      id: 'set-bonuses',
      name: 'Set Bonuses',
      icon: 'game-icons:three-keys',
      description:
        'Slot a matching weapon + armor + artefact to activate a set: Cosmic Power (+15% CPS, +20% power) ' +
        'or Stellar Origin (+30% CPS, +25% power).',
      lore: 'Three pieces, one destiny.',
      related: ['item-shop'],
    },
  ],
}

export const prestigeCategory: EncyclopediaCategory = {
  id: 'prestige',
  title: 'Prestige & Universes',
  icon: 'game-icons:divided-spiral',
  entries: [
    {
      id: 'prestige',
      name: 'Prestige',
      icon: 'game-icons:spiky-explosion',
      description:
        'Fill the universe meter to warp into a new universe. A prestige resets your run — Chimes, level, Meeps, buildings, ' +
        'augments and the Meep Tree — while lifetime totals, champions, items, Star Forge and galaxy progress stay.',
      lore: 'Endings are just louder beginnings.',
      formula: 'First warp at 100,000 universe progress, ×2 after each prestige',
      related: ['universes', 'boss-rewards'],
    },
    {
      id: 'universes',
      name: 'Universes',
      icon: 'game-icons:andromeda-chain',
      description:
        'Ten universes, each with its own laws — Void Nexus doubles CPS but raises building costs, ' +
        'Freljord triples clicks but quarters CPS, Piltover triples nearly everything.',
      lore: 'Same song, different sky.',
      related: ['prestige'],
    },
  ],
}
