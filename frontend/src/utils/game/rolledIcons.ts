import { pickPooledIcon } from '@/config/ui/iconPools'
import { AUGMENTS } from '@/config/economy/augments'
import { getOmen } from '@/config/progression/omens'
import { AUGMENT_FALLBACK_ICON, OMEN_FALLBACK_ICON } from '@/config/constants'

/**
 * Auflösung der ausgewürfelten Icons — eine Stelle je System, damit Angebot und
 * spätere Anzeige DASSELBE Glyph zeigen. Der Seed ist jeweils etwas, das ohnehin
 * im Spielstand steht; nichts davon muss zusätzlich gespeichert werden.
 */

/**
 * Das Icon eines Augments. Gesetzt wird es über den Platz in `activeAugments` —
 * der ist stabil (die Liste wächst nur hinten) und wächst mit jedem Roll, also
 * trägt dasselbe Augment beim nächsten Mal ein anderes Motiv.
 *
 * Beim Angebot ist `index` die Länge von `activeAugments`, also der Platz, den
 * die Karte nach der Wahl einnimmt — dadurch behält die gewählte Karte im
 * Augment-Deck exakt das Glyph, das im Modal stand.
 */
export function augmentIcon(id: string, index: number): string {
  const def = AUGMENTS.find((a) => a.id === id)
  if (!def) return AUGMENT_FALLBACK_ICON
  return pickPooledIcon(def.iconPool, `${id}#${index}`)
}

/**
 * Das Icon eines Vorzeichens. `seq` zählt die ausgelegten Angebote hoch und wird
 * bei der Annahme im `ActiveOmen` festgehalten — damit bleibt das Glyph von der
 * Karte über die laufende Aufgabe bis zum Erfüllt-Banner dasselbe.
 */
export function omenIcon(id: string, seq: number): string {
  const def = getOmen(id)
  if (!def) return OMEN_FALLBACK_ICON
  return pickPooledIcon(def.iconPool, `${id}#${seq}`)
}
