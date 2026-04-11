import type { EncyclopediaCategory } from './types'

export const materialsCategory: EncyclopediaCategory = {
  id: 'materials',
  title: 'Materialien',
  icon: '💠',
  entries: [
    {
      id: 'materials-overview',
      name: 'Material-Übersicht',
      icon: '/img/Sternenstaub.png',
      description:
        'Materialien werden bei Planeten-Rettungen (60% Chance) und Expeditionen gesammelt. ' +
        'Sie werden als Herstellungskosten für seltene Items benötigt. ' +
        'Insgesamt gibt es 6 Materialien mit unterschiedlichen Drop-Chancen.',
      lore: 'Die Rohstoffe des Kosmos – in den richtigen Händen werden sie zu Wundern.',
      formula:
        'PLANET_MATERIAL_CHANCE = 0.6 (60%)\n' +
        'Drop-Chancen relativ zur Gesamtmasse (1,00):\n' +
        'Sternstaub 35% | Mondkristall 25% | Nebelquarz 20%\n' +
        'Sonnenessenz 12% | Leerscherbe 6% | Dunkle Materie 2%',
    },
    {
      id: 'material-stardust',
      name: 'Sternstaub',
      icon: '/img/Sternenstaub.png',
      description:
        'Häufigstes Material (35% Drop). Feiner Staub von fernen Sternen. Seltenheit: Common.',
      lore: 'Feiner Staub von fernen Sternen.',
      formula: 'id = stardust | rarity = common | dropChance = 0.35 (35%)',
    },
    {
      id: 'material-moon-crystal',
      name: 'Mondkristall',
      icon: '/img/Mondkristall.png',
      description:
        'Zweithäufigstes Material (25% Drop). Ein Kristall, der im Mondlicht schimmert. Seltenheit: Common.',
      lore: 'Ein Kristall, der im Mondlicht schimmert.',
      formula: 'id = moon_crystal | rarity = common | dropChance = 0.25 (25%)',
    },
    {
      id: 'material-nebula-quartz',
      name: 'Nebelquarz',
      icon: '/img/Nebelquarz.png',
      description:
        'Uncommon-Material (20% Drop). Wird für seltene Waffen als Handwerkskosten benötigt. Seltenheit: Uncommon.',
      lore: 'Quarz aus den Tiefen eines Nebels.',
      formula: 'id = nebula_quartz | rarity = uncommon | dropChance = 0.20 (20%)',
    },
    {
      id: 'material-solar-essence',
      name: 'Sonnenessenz',
      icon: '/img/Sonnenessenz.png',
      description:
        'Seltenes Material (12% Drop). Konzentrierte Energie eines Sterns. Benötigt für Rare-Items. Seltenheit: Rare.',
      lore: 'Konzentrierte Energie eines Sterns.',
      formula: 'id = solar_essence | rarity = rare | dropChance = 0.12 (12%)',
    },
    {
      id: 'material-void-shard',
      name: 'Leerscherbe',
      icon: '/img/Leerscherbe.png',
      description:
        'Sehr seltenes Material (6% Drop). Ein Splitter aus dem Nichts. Benötigt für Epic-Items. Seltenheit: Rare.',
      lore: 'Ein Splitter aus dem Nichts.',
      formula: 'id = void_shard | rarity = rare | dropChance = 0.06 (6%)',
    },
    {
      id: 'material-dark-matter',
      name: 'Dunkle Materie',
      icon: '/img/DunkleMaterie.png',
      description:
        'Extrem seltenes Material (2% Drop). Unfassbare Materie jenseits des Sichtbaren. Benötigt für Legendary-Items. Seltenheit: Epic.',
      lore: 'Unfassbare Materie jenseits des Sichtbaren.',
      formula: 'id = dark_matter | rarity = epic | dropChance = 0.02 (2%)',
    },
  ],
}

export const itemsCategory: EncyclopediaCategory = {
  id: 'items',
  title: 'Item-Shop',
  icon: '🗡️',
  entries: [
    {
      id: 'item-system',
      name: 'Item-System',
      icon: '/img/BardAbilities/BardChime.png',
      description:
        'Items werden mit Gold (und teils mit Materialien) gekauft und geben permanente Multiplikatoren. ' +
        'Es gibt 4 Seltenheiten: Common, Rare, Epic, Legendary. ' +
        'Items können Kampfkraft (Power), CPS oder CPC erhöhen.',
      lore: 'Die Ausrüstung des Meisters bestimmt die Schlagkraft.',
      formula:
        'Effekttypen: powerMultiplier, cpsMultiplier, cpcMultiplier\n' +
        'Preisskala: Common ≈ 1 200–2 500 Gold | Rare ≈ 15 000–28 000 Gold\n' +
        'Epic ≈ 65 000–75 000 Gold + Materialkosten',
    },
    {
      id: 'item-swords-common',
      name: 'Waffen: Common-Schwerter',
      icon: '/img/itemShop/sword/AncientBoneSword.png',
      description:
        '• Ancient Bone Sword: 1 200 Gold → +12% Kampfkraft\n' +
        '• Crystal Shard Sword: 1 800 Gold → +10% CPS, +5% Kampfkraft\n' +
        '• Coral Cutlass: 2 500 Gold → +15% Kampfkraft',
      lore: 'Einfache, aber bewährte Klingen.',
      formula:
        'ancient_bone_sword: price=1200, powerMultiplier=1.12\n' +
        'crystal_shard_sword: price=1800, cpsMultiplier=1.1, powerMultiplier=1.05\n' +
        'coral_cutlass: price=2500, powerMultiplier=1.15',
    },
    {
      id: 'item-swords-rare',
      name: 'Waffen: Rare-Schwerter',
      icon: '/img/itemShop/sword/HolySunblade.png',
      description:
        '• Holy Sunblade: 15 000 Gold + 1× Sonnenessenz → +20% Power, +15% CPS\n' +
        '• Mechanical Gear Sword: 18 000 Gold + 2× Nebelquarz → +25% CPS, +12% Power\n' +
        '• Leaf & Vine Sword: 22 000 Gold + 1× Sonnenessenz → +20% CPS, +18% Power\n' +
        '• Lava Forge Blade: 28 000 Gold + 2× Nebelquarz → +28% Power, +8% CPS',
      lore: 'Klingen, die mit kosmischen Materialien gefertigt wurden.',
      formula:
        'holy_sunblade: price=15000, solar_essence×1, powerMultiplier=1.2, cpsMultiplier=1.15\n' +
        'mechanical_gear_sword: price=18000, nebula_quartz×2, cpsMultiplier=1.25, powerMultiplier=1.12\n' +
        'leaf_vine_sword: price=22000, solar_essence×1, cpsMultiplier=1.2, powerMultiplier=1.18\n' +
        'lava_forge_blade: price=28000, nebula_quartz×2, powerMultiplier=1.28, cpsMultiplier=1.08',
    },
    {
      id: 'item-swords-epic',
      name: 'Waffen: Epic-Schwerter',
      icon: '/img/itemShop/sword/StormBlade.png',
      description:
        '• Storm Blade: 65 000 Gold + 1× Leerscherbe → +40% Power, +12% CPS\n' +
        '• Frozen Tundra Sword: 75 000 Gold + 1× Leerscherbe → +45% Power, +8% CPS',
      lore: 'Waffen epischer Macht – jede Schwingung erschüttert den Kosmos.',
      formula:
        'storm_blade: price=65000, void_shard×1, powerMultiplier=1.4, cpsMultiplier=1.12\n' +
        'frozen_tundra_sword: price=75000, void_shard×1, powerMultiplier=1.45, cpsMultiplier=1.08',
    },
  ],
}
