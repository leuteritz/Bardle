import type { EncyclopediaCategory } from './types'

export const materialsCategory: EncyclopediaCategory = {
  id: 'materials',
  title: 'Materials',
  icon: 'game-icons:crystal-growth',
  entries: [
    {
      id: 'materials-overview',
      name: 'Materials Overview',
      icon: '/img/Sternenstaub.png',
      description:
        'Materials are collected during planet rescues (60% chance) and expeditions. ' +
        'They are required as crafting costs for rare items. ' +
        'There are 6 materials in total with different drop chances.',
      lore: 'The raw materials of the cosmos — in the right hands, they become wonders.',
      formula:
        'PLANET_MATERIAL_CHANCE = 0.6 (60%)\n' +
        'Drop chances relative to total weight (1.00):\n' +
        'Stardust 35% | Moon Crystal 25% | Nebula Quartz 20%\n' +
        'Solar Essence 12% | Void Shard 6% | Dark Matter 2%',
    },
    {
      id: 'material-stardust',
      name: 'Stardust',
      icon: '/img/Sternenstaub.png',
      description:
        'Most common material (35% drop). Fine dust from distant stars. Rarity: Common.',
      lore: 'Fine dust from distant stars.',
      formula: 'id = stardust | rarity = common | dropChance = 0.35 (35%)',
    },
    {
      id: 'material-moon-crystal',
      name: 'Moon Crystal',
      icon: '/img/Mondkristall.png',
      description:
        'Second most common material (25% drop). A crystal that shimmers in moonlight. Rarity: Common.',
      lore: 'A crystal that shimmers in moonlight.',
      formula: 'id = moon_crystal | rarity = common | dropChance = 0.25 (25%)',
    },
    {
      id: 'material-nebula-quartz',
      name: 'Nebula Quartz',
      icon: '/img/Nebelquarz.png',
      description:
        'Uncommon material (20% drop). Required as crafting cost for rare weapons. Rarity: Uncommon.',
      lore: 'Quartz from the depths of a nebula.',
      formula: 'id = nebula_quartz | rarity = uncommon | dropChance = 0.20 (20%)',
    },
    {
      id: 'material-solar-essence',
      name: 'Solar Essence',
      icon: '/img/Sonnenessenz.png',
      description:
        'Rare material (12% drop). Concentrated energy of a star. Required for Rare items. Rarity: Rare.',
      lore: 'Concentrated energy of a star.',
      formula: 'id = solar_essence | rarity = rare | dropChance = 0.12 (12%)',
    },
    {
      id: 'material-void-shard',
      name: 'Void Shard',
      icon: '/img/Leerscherbe.png',
      description:
        'Very rare material (6% drop). A splinter from the void. Required for Epic items. Rarity: Rare.',
      lore: 'A splinter from the void.',
      formula: 'id = void_shard | rarity = rare | dropChance = 0.06 (6%)',
    },
    {
      id: 'material-dark-matter',
      name: 'Dark Matter',
      icon: '/img/DunkleMaterie.png',
      description:
        'Extremely rare material (2% drop). Incomprehensible matter beyond the visible. Required for Legendary items. Rarity: Epic.',
      lore: 'Incomprehensible matter beyond the visible.',
      formula: 'id = dark_matter | rarity = epic | dropChance = 0.02 (2%)',
    },
  ],
}

export const itemsCategory: EncyclopediaCategory = {
  id: 'items',
  title: 'Item Shop',
  icon: 'game-icons:sword-spade',
  entries: [
    {
      id: 'item-system',
      name: 'Item System',
      icon: '/img/BardAbilities/BardChime.png',
      description:
        'Items are purchased with Gold (and sometimes Materials) and grant permanent multipliers. ' +
        'There are 4 rarities: Common, Rare, Epic, Legendary. ' +
        'Items can increase Combat Power, CPS, or CPC.',
      lore: "The master's equipment determines their striking power.",
      formula:
        'Effect types: powerMultiplier, cpsMultiplier, cpcMultiplier\n' +
        'Price range: Common ≈ 1,200–2,500 Gold | Rare ≈ 15,000–28,000 Gold\n' +
        'Epic ≈ 65,000–75,000 Gold + material costs',
    },
    {
      id: 'item-swords-common',
      name: 'Weapons: Common Swords',
      icon: '/img/itemShop/sword/AncientBoneSword.png',
      description:
        '• Ancient Bone Sword: 1,200 Gold → +12% Combat Power\n' +
        '• Crystal Shard Sword: 1,800 Gold → +10% CPS, +5% Combat Power\n' +
        '• Coral Cutlass: 2,500 Gold → +15% Combat Power',
      lore: 'Simple but proven blades.',
      formula:
        'ancient_bone_sword: price=1200, powerMultiplier=1.12\n' +
        'crystal_shard_sword: price=1800, cpsMultiplier=1.1, powerMultiplier=1.05\n' +
        'coral_cutlass: price=2500, powerMultiplier=1.15',
    },
    {
      id: 'item-swords-rare',
      name: 'Weapons: Rare Swords',
      icon: '/img/itemShop/sword/HolySunblade.png',
      description:
        '• Holy Sunblade: 15,000 Gold + 1× Solar Essence → +20% Power, +15% CPS\n' +
        '• Mechanical Gear Sword: 18,000 Gold + 2× Nebula Quartz → +25% CPS, +12% Power\n' +
        '• Leaf & Vine Sword: 22,000 Gold + 1× Solar Essence → +20% CPS, +18% Power\n' +
        '• Lava Forge Blade: 28,000 Gold + 2× Nebula Quartz → +28% Power, +8% CPS',
      lore: 'Blades forged with cosmic materials.',
      formula:
        'holy_sunblade: price=15000, solar_essence×1, powerMultiplier=1.2, cpsMultiplier=1.15\n' +
        'mechanical_gear_sword: price=18000, nebula_quartz×2, cpsMultiplier=1.25, powerMultiplier=1.12\n' +
        'leaf_vine_sword: price=22000, solar_essence×1, cpsMultiplier=1.2, powerMultiplier=1.18\n' +
        'lava_forge_blade: price=28000, nebula_quartz×2, powerMultiplier=1.28, cpsMultiplier=1.08',
    },
    {
      id: 'item-swords-epic',
      name: 'Weapons: Epic Swords',
      icon: '/img/itemShop/sword/StormBlade.png',
      description:
        '• Storm Blade: 65,000 Gold + 1× Void Shard → +40% Power, +12% CPS\n' +
        '• Frozen Tundra Sword: 75,000 Gold + 1× Void Shard → +45% Power, +8% CPS',
      lore: 'Weapons of epic power — every swing shakes the cosmos.',
      formula:
        'storm_blade: price=65000, void_shard×1, powerMultiplier=1.4, cpsMultiplier=1.12\n' +
        'frozen_tundra_sword: price=75000, void_shard×1, powerMultiplier=1.45, cpsMultiplier=1.08',
    },
  ],
}
