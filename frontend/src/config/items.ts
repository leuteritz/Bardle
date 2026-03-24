import type { ShopItem } from '../types'

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'sword',
    name: 'Kurzschwert',
    description: '+ATK',
    icon: '⚔️',
    price: 120,
    rarity: 'common',
    category: 'weapon',
  },
  {
    id: 'shield',
    name: 'Holzschild',
    description: '+DEF',
    icon: '🛡️',
    price: 100,
    rarity: 'common',
    category: 'armor',
  },
  {
    id: 'staff',
    name: 'Zauberstab',
    description: '+AP',
    icon: '🪄',
    price: 350,
    rarity: 'rare',
    category: 'weapon',
  },
  {
    id: 'potion',
    name: 'Heiltrank',
    description: '+HP Regen',
    icon: '🧪',
    price: 80,
    rarity: 'common',
    category: 'misc',
  },
  {
    id: 'cloak',
    name: 'Schattenmantel',
    description: '+Ausweichen',
    icon: '🧥',
    price: 500,
    rarity: 'rare',
    category: 'armor',
  },
  {
    id: 'amulet',
    name: 'Drachenamulett',
    description: '+Alle Stats',
    icon: '📿',
    price: 1200,
    rarity: 'epic',
    category: 'misc',
  },
  {
    id: 'bow',
    name: 'Elfenbogen',
    description: '+CRIT',
    icon: '🏹',
    price: 750,
    rarity: 'rare',
    category: 'weapon',
  },
  {
    id: 'crown',
    name: 'Goetterkrone',
    description: 'Legendaer',
    icon: '👑',
    price: 9999,
    rarity: 'legendary',
    category: 'misc',
  },
]

export function getItemById(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id)
}
