import { useEventLog } from '@/composables/useEventLog'

function safeNumber(value: number) {
  return Math.round(value)
}

export function logPlanetHealed(planetName: string, amount: number, source?: string) {
  const { addEvent } = useEventLog()
  const msg = source
    ? `${source} heilt ${planetName} um ${safeNumber(amount)}`
    : `${planetName} wird um ${safeNumber(amount)} geheilt`

  addEvent(msg, 'support')
}

export function logPlanetDamaged(planetName: string, amount: number, source?: string) {
  const { addEvent } = useEventLog()
  const msg = source
    ? `${planetName} erleidet ${safeNumber(amount)} Schaden durch ${source}`
    : `${planetName} erleidet ${safeNumber(amount)} Schaden`

  addEvent(msg, 'combat')
}

export function logSupportSalary(roleName: string, planetName: string, amount: number) {
  const { addEvent } = useEventLog()
  addEvent(`${roleName} erhält auf ${planetName} Gehalt ${safeNumber(amount)}`, 'support')
}

export function logPlanetSaved(planetName: string, source?: string) {
  const { addEvent } = useEventLog()
  addEvent(
    source ? `${source} hat ${planetName} gerettet` : `${planetName} wurde gerettet`,
    'planet',
  )
}

export function logChimeGain(amount: number, source?: string) {
  const { addEvent } = useEventLog()
  addEvent(
    source
      ? `${source} bringt ${safeNumber(amount)} Chimes`
      : `+${safeNumber(amount)} Chimes gesammelt`,
    'chime',
  )
}

export function logAugmentPicked(name: string) {
  const { addEvent } = useEventLog()
  addEvent(`Augment erhalten: ${name}`, 'augment')
}

export function logPrestige(name: string) {
  const { addEvent } = useEventLog()
  addEvent(`Hyperspace aktiviert: ${name}`, 'prestige')
}

export function logInfo(message: string) {
  const { addEvent } = useEventLog()
  addEvent(message, 'info')
}
