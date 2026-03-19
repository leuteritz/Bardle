import type { Material } from '../types'

export const MATERIALS: Material[] = [
  {
    id: 'stardust',
    name: 'Sternstaub',
    icon: '✨',
    description: 'Feiner Staub von fernen Sternen.',
    rarity: 'common',
    dropChance: 0.35,
  },
  {
    id: 'moon_crystal',
    name: 'Mondkristall',
    icon: '🔮',
    description: 'Ein Kristall, der im Mondlicht schimmert.',
    rarity: 'common',
    dropChance: 0.25,
  },
  {
    id: 'nebula_quartz',
    name: 'Nebelquarz',
    icon: '💎',
    description: 'Quarz aus den Tiefen eines Nebels.',
    rarity: 'uncommon',
    dropChance: 0.20,
  },
  {
    id: 'solar_essence',
    name: 'Sonnenessenz',
    icon: '☀️',
    description: 'Konzentrierte Energie eines Sterns.',
    rarity: 'rare',
    dropChance: 0.12,
  },
  {
    id: 'void_shard',
    name: 'Leerscherbe',
    icon: '🌑',
    description: 'Ein Splitter aus dem Nichts.',
    rarity: 'rare',
    dropChance: 0.06,
  },
  {
    id: 'dark_matter',
    name: 'Dunkle Materie',
    icon: '⚫',
    description: 'Unfassbare Materie jenseits des Sichtbaren.',
    rarity: 'epic',
    dropChance: 0.02,
  },
]

export function pickMaterial(): Material {
  const total = MATERIALS.reduce((sum, m) => sum + m.dropChance, 0)
  let roll = Math.random() * total
  for (const m of MATERIALS) {
    roll -= m.dropChance
    if (roll <= 0) return m
  }
  return MATERIALS[MATERIALS.length - 1]
}
