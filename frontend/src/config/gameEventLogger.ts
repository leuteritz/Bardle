import { useEventLog } from '@/composables/useEventLog'

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
