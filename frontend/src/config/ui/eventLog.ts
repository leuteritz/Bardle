// Alles, was das Live-Eventlog konfiguriert: die Farbe je Ereignistyp und die
// benannten Logger, mit denen Stores ein Ereignis eintragen. Beide Haelften
// haengen am selben useEventLog-Composable und lagen vorher als zwei
// Ein-Zweck-Dateien nebeneinander.
import { useEventLog, type GameEventType } from '@/composables/ui/useEventLog'
import { ROLE_COLORS } from '@/config/constants'

export const typeColor: Record<GameEventType, string> = {
  support: ROLE_COLORS.support,
  top: ROLE_COLORS.top,
  mid: ROLE_COLORS.mid,
  adc: ROLE_COLORS.adc,
  jungle: ROLE_COLORS.jungle,
  planet: '#7ec8e3',
  augment: '#c084fc',
  meep: '#6ee7b7',
  chime: '#fde68a',
  combat: '#fb923c',
  prestige: '#818cf8',
  chronicle: '#e8c040',
  // Kühles Violett gegen das Gold der Chronicle: die beiden melden ähnlich
  // klingende Zeilen (ein Ziel ist erreicht, ein Bonus gilt ab jetzt) und
  // müssen im Log auf den ersten Blick auseinanderzuhalten sein.
  omen: '#a8b0f0',
  info: '#c8b89a',
}

function safeNumber(value: number) {
  return Math.round(value)
}

export function logPlanetDestroyed(planetName: string, downSeconds: number) {
  const { addEvent } = useEventLog()
  addEvent(`${planetName} destroyed — back in ${safeNumber(downSeconds)}s.`, 'combat')
}

export function logPlanetRestored(planetName: string) {
  const { addEvent } = useEventLog()
  addEvent(`${planetName} is back online at full HP.`, 'planet')
}

/** Auto-Pick hat gewählt — die Meldung blendet aus, das Log behält die Historie. */
export function logAugmentAutoPicked(name: string, effectLine: string) {
  const { addEvent } = useEventLog()
  addEvent(`Auto-picked ${name} — ${effectLine}`, 'augment')
}

/** Ein Drifter wurde eingesammelt — Name plus die Wirkung in einer Zeile. */
export function logDrifterCollected(name: string, effectLine: string) {
  const { addEvent } = useEventLog()
  addEvent(`${name} collected — ${effectLine}`, 'chime')
}

/**
 * Eine Chronicle-Stufe ist gefallen. Das Herald-Banner sagt WAS, diese Zeile
 * bleibt als Belegkopie im Log — mit der Wirkung, die ab jetzt gilt.
 */
export function logChronicleStage(trackName: string, numeral: string, effectLine: string) {
  const { addEvent } = useEventLog()
  addEvent(`${trackName} ${numeral} — ${effectLine}`, 'chronicle')
}

/**
 * Ein Vorzeichen wurde erfüllt. `swift` steht als Vorsatz in der Zeile und
 * nicht als eigener Ereignistyp: es ist dasselbe Ereignis, nur pünktlich — ein
 * zweiter Typ hätte im Log eine zweite Farbe für dieselbe Sache bedeutet.
 */
export function logOmenCompleted(omenName: string, effectLine: string, swift: boolean) {
  const { addEvent } = useEventLog()
  addEvent(`${swift ? 'Swift omen' : 'Omen'}: ${omenName} — ${effectLine}`, 'omen')
}
