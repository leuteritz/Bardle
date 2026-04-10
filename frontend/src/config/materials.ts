import type { Material } from '../types'

export const MATERIALS: Material[] = [
  {
    id: 'stardust',
    name: 'Sternstaub',
    image: '/img/Sternenstaub.png',
    description: 'Feiner Staub von fernen Sternen.',
    rarity: 'common',
    dropChance: 0.35,
    dropCount: 3,
  },
  {
    id: 'moon_crystal',
    name: 'Mondkristall',
    image: '/img/Mondkristall.png',
    description: 'Ein Kristall, der im Mondlicht schimmert.',
    rarity: 'common',
    dropChance: 0.25,
    dropCount: 3,
  },
  {
    id: 'nebula_quartz',
    name: 'Nebelquarz',
    image: '/img/Nebelquarz.png',
    description: 'Quarz aus den Tiefen eines Nebels.',
    rarity: 'uncommon',
    dropChance: 0.2,
    dropCount: 3,
  },
  {
    id: 'solar_essence',
    name: 'Sonnenessenz',
    image: '/img/Sonnenessenz.png',
    description: 'Konzentrierte Energie eines Sterns.',
    rarity: 'rare',
    dropChance: 0.12,
    dropCount: 3,
  },
  {
    id: 'void_shard',
    name: 'Leerscherbe',
    image: '/img/Leerscherbe.png',
    description: 'Ein Splitter aus dem Nichts.',
    rarity: 'rare',
    dropChance: 0.06,
    dropCount: 3,
  },
  {
    id: 'dark_matter',
    name: 'Dunkle Materie',
    image: '/img/DunkleMaterie.png',
    description: 'Unfassbare Materie jenseits des Sichtbaren.',
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
