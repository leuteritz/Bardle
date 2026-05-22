import type { Material } from '../types'

export const MATERIALS: Material[] = [
  {
    id: 'stardust',
    name: 'Stardust',
    image: '/img/Sternenstaub.png',
    description: 'Fine dust from distant stars.',
    rarity: 'common',
    dropChance: 0.35,
    dropCount: 3,
  },
  {
    id: 'moon_crystal',
    name: 'Moon Crystal',
    image: '/img/Mondkristall.png',
    description: 'A crystal that shimmers in moonlight.',
    rarity: 'common',
    dropChance: 0.25,
    dropCount: 3,
  },
  {
    id: 'nebula_quartz',
    name: 'Nebula Quartz',
    image: '/img/Nebelquarz.png',
    description: 'Quartz from the depths of a nebula.',
    rarity: 'uncommon',
    dropChance: 0.2,
    dropCount: 3,
  },
  {
    id: 'solar_essence',
    name: 'Solar Essence',
    image: '/img/Sonnenessenz.png',
    description: 'Concentrated energy of a star.',
    rarity: 'rare',
    dropChance: 0.12,
    dropCount: 3,
  },
  {
    id: 'void_shard',
    name: 'Void Shard',
    image: '/img/Leerscherbe.png',
    description: 'A shard from the void.',
    rarity: 'rare',
    dropChance: 0.06,
    dropCount: 3,
  },
  {
    id: 'dark_matter',
    name: 'Dark Matter',
    image: '/img/DunkleMaterie.png',
    description: 'Incomprehensible matter beyond the visible.',
    rarity: 'epic',
    dropChance: 0.02,
    dropCount: 3,
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
