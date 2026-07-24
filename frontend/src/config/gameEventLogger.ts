import { useEventLog } from '@/composables/useEventLog'

function safeNumber(value: number) {
  return Math.round(value)
}

export function logPlanetHealed(planetName: string, amount: number, source?: string) {
  const { addEvent } = useEventLog()
  const msg = source
    ? `${source} heals ${planetName} +${safeNumber(amount)} HP.`
    : `+${safeNumber(amount)} HP to ${planetName}.`

  addEvent(msg, 'support')
}

export function logPlanetDamaged(planetName: string, amount: number, source?: string) {
  const { addEvent } = useEventLog()
  const msg = source
    ? `${source} hits ${planetName} for ${safeNumber(amount)}.`
    : `${planetName} -${safeNumber(amount)} HP.`

  addEvent(msg, 'combat')
}

export function logPlanetDestroyed(planetName: string, downSeconds: number) {
  const { addEvent } = useEventLog()
  addEvent(`${planetName} destroyed — back in ${safeNumber(downSeconds)}s.`, 'combat')
}

export function logPlanetRestored(planetName: string) {
  const { addEvent } = useEventLog()
  addEvent(`${planetName} is back online at full HP.`, 'planet')
}

export function logSupportSalary(roleName: string, planetName: string, amount: number) {
  const { addEvent } = useEventLog()
  addEvent(`${roleName} +${safeNumber(amount)} on ${planetName}.`, 'support')
}

export function logPlanetSaved(planetName: string, source?: string) {
  const { addEvent } = useEventLog()
  addEvent(source ? `${source} saves ${planetName}.` : `${planetName} saved.`, 'planet')
}

export function logChimeGain(amount: number, source?: string) {
  const { addEvent } = useEventLog()
  addEvent(
    source ? `+${safeNumber(amount)} Chimes from ${source}.` : `+${safeNumber(amount)} Chimes.`,
    'chime',
  )
}

export function logAugmentPicked(name: string) {
  const { addEvent } = useEventLog()
  addEvent(`Augment: ${name}.`, 'augment')
}

export function logPrestige(name: string) {
  const { addEvent } = useEventLog()
  addEvent(`Prestige: ${name}.`, 'prestige')
}

export function logInfo(message: string) {
  const { addEvent } = useEventLog()
  addEvent(message, 'info')
}
