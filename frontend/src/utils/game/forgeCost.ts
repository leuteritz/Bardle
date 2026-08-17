import { MATERIALS } from '@/config/economy/materials'
import type { ForgeCostItem } from '@/types'

/**
 * Aus einer Kostentabelle die Positionen machen, die die Spalte zeigt — „habe /
 * brauche" statt eines blanken „×3".
 *
 * Sie stand wörtlich gleich in `useForgeUpgrades` (Baum) und in
 * `StarForgePanel` (Relikte, Konstellationen, Handel); mit dem Angebots-Streifen
 * wäre sie zum dritten Mal abgeschrieben worden. Was sie nachschlägt — Name und
 * Bild eines Materials — ist für alle drei dasselbe, und dass eine Position
 * gedeckt ist, heißt überall dasselbe.
 *
 * Der LAGERSTAND kommt als Argument und nicht aus dem Store: so bleibt die
 * Funktion rein und prüfbar, und der Aufrufer entscheidet, ob er den
 * Inventarstore überhaupt anfassen will.
 */
export function forgeCostItems(
  cost: Record<string, number>,
  stock: Record<string, number>,
): ForgeCostItem[] {
  return Object.entries(cost).map(([matId, need]) => {
    const material = MATERIALS.find((mat) => mat.id === matId)
    const have = stock[matId] ?? 0
    return {
      id: matId,
      name: material?.name ?? matId,
      image: material?.image,
      need,
      have,
      ok: have >= need,
    }
  })
}
