import type { UniverseConfig } from '@/types'

/**
 * Die Universen, zwischen denen das Prestige führt.
 *
 * Sie tragen KEINE Effekte mehr. Früher hing an jedem ein fester `modifier`, und
 * das hiess: zehn Universen, zehn feste Kombinationen — der zweite Besuch war
 * Zeile für Zeile der erste. Die Effekte bringt heute die beim Prestige gezogene
 * Vorsehung mit (`config/progression/providences.ts`); aus zehn Möglichkeiten
 * werden damit zehn mal achtzehn.
 *
 * Sie tragen auch keine NAMEN mehr. Ein Universum ist seine Nummer — überall
 * `universeLabel(id)`, also „Universe VI". Der Name stand im Firmament-Kopfband
 * als grösste Schrift über einer Zeile, die dasselbe schon sagte, und nahm den
 * Platz, an dem jetzt die zwei Wirkungen der Vorsehung stehen.
 *
 * Was bleibt, ist das, was ohne Text trägt: das `icon` als Wappen und der
 * `tint` — der Farbton der Scheibe, die das Universum im Firmament IST. Er liegt
 * nur im Inneren der Scheibe — Staub und Galaxien —, nie auf einer Kante, sonst
 * spraeche er dieselbe Sprache wie die Zustandsfarben der Karte.
 */
export const universes: UniverseConfig[] = [
  {
    id: 1,
    icon: 'game-icons:ringed-planet',
    tint: '#4fa85e', // lebendes Gruen — die Welt, aus der alles kam
  },
  {
    id: 2,
    icon: 'game-icons:vortex',
    tint: '#a84ce0', // Violett
  },
  {
    id: 3,
    icon: 'game-icons:star-swirl',
    tint: '#9a90f8', // Sternenviolett
  },
  {
    id: 4,
    icon: 'game-icons:spectre',
    tint: '#3fe8c8', // Spektralgruen
  },
  {
    id: 5,
    icon: 'game-icons:icicles-aura',
    tint: '#a8e8f8', // blasses Eis
  },
  {
    id: 6,
    icon: 'game-icons:solar-system',
    tint: '#e08a30', // Wuestenkupfer
  },
  {
    id: 7,
    icon: 'game-icons:yin-yang',
    tint: '#f08cb8', // Bluete
  },
  {
    id: 8,
    icon: 'game-icons:sword-altar',
    tint: '#e02828', // Blut
  },
  {
    id: 9,
    icon: 'game-icons:crested-helmet',
    tint: '#dcd8b0', // Petrichor
  },
  {
    id: 10,
    icon: 'game-icons:gear-hammer',
    tint: '#4ea8c8', // Hextech
  },
]

export function getUniverse(id: number): UniverseConfig | undefined {
  return universes.find((u) => u.id === id)
}
