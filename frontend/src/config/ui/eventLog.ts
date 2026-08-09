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
