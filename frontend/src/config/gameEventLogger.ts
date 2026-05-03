import { useEventLog } from '@/composables/useEventLog'

function safeNumber(value: number) {
  return Math.round(value)
}

export function logPlanetHealed(planetName: string, amount: number, source?: string) {
  const { addEvent } = useEventLog()
  const msg = source
    ? `✦ ${source} flüstert Heilzauber auf ${planetName} (+${safeNumber(amount)} HP)`
    : `✦ ${planetName} wird mit Heilzauber gesegnet (+${safeNumber(amount)} HP)`

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

export function logBattleStarted(opponentLabel: string) {
  const { addEvent } = useEventLog()
  addEvent(`⚔️ Die Schlachtfelder öffnen sich – ${opponentLabel} tritt entgegen`, 'combat')
}

export function logBattleEnded(won: boolean) {
  const { addEvent } = useEventLog()
  addEvent(
    won
      ? '🏆 Sieg! Der Feind fällt vor den Klingen der Tapferen'
      : '💀 Niederlage... Die Mächte der Dunkelheit überwiegen',
    'combat',
  )
}

export function logChampionDefeated(killerName: string, victimName: string) {
  const { addEvent } = useEventLog()
  addEvent(`💀 ${killerName} schlägt ${victimName} in die Knie`, 'combat')
}
