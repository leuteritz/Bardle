import type { UniverseConfig } from '@/types'

/**
 * Die Universen, zwischen denen das Prestige führt.
 *
 * Sie tragen KEINE Effekte mehr. Früher hing an jedem ein fester `modifier`, und
 * das hiess: zehn Universen, zehn feste Kombinationen — der zweite Besuch von
 * Void Nexus war Zeile für Zeile der erste, und wer Piltover kannte, hatte
 * Piltover gesehen. Die Effekte bringt heute die beim Prestige gezogene
 * Vorsehung mit (`config/progression/providences.ts`); aus zehn Möglichkeiten
 * werden damit zehn mal achtzehn.
 *
 * Was bleibt, ist das, was ein Universum immer schon war: ein Ort mit Namen und
 * Wappen. Genau deshalb stehen sie weiter hier und werden nicht generiert —
 * Shurima und Freljord sind Herkünfte, keine Zahlen.
 */
export const universes: UniverseConfig[] = [
  {
    id: 1,
    name: 'Runeterra Prime',
    description: 'The original universe',
    icon: 'game-icons:ringed-planet',
  },
  {
    id: 2,
    name: 'Void Nexus',
    description: 'Dimension of the Void',
    icon: 'game-icons:vortex',
  },
  {
    id: 3,
    name: 'Celestial Realm',
    description: 'Where the stars keep their own counsel',
    icon: 'game-icons:star-swirl',
  },
  {
    id: 4,
    name: 'Shadow Isles',
    description: 'Islands of Shadow',
    icon: 'game-icons:spectre',
  },
  {
    id: 5,
    name: 'Freljord',
    description: 'Eternal Ice Wasteland',
    icon: 'game-icons:icicles-aura',
  },
  {
    id: 6,
    name: 'Shurima',
    description: 'Ancient Desert Civilization',
    icon: 'game-icons:solar-system',
  },
  {
    id: 7,
    name: 'Ionia',
    description: 'Land of Harmony',
    icon: 'game-icons:yin-yang',
  },
  {
    id: 8,
    name: 'Noxus',
    description: 'Empire of Strength',
    icon: 'game-icons:sword-altar',
  },
  {
    id: 9,
    name: 'Demacia',
    description: 'Kingdom of Justice',
    icon: 'game-icons:crested-helmet',
  },
  {
    id: 10,
    name: 'Piltover',
    description: 'City of Progress',
    icon: 'game-icons:gear-hammer',
  },
]

export function getUniverse(id: number): UniverseConfig | undefined {
  return universes.find((u) => u.id === id)
}
