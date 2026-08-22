// Alles, was das Live-Eventlog konfiguriert: die Farbe je Ereignistyp und die
// benannten Logger, mit denen Stores ein Ereignis eintragen. Beide Haelften
// haengen am selben useEventLog-Composable und lagen vorher als zwei
// Ein-Zweck-Dateien nebeneinander.
import { useEventLog, type GameEventType } from '@/composables/ui/useEventLog'
import { ROLE_COLORS, MISSION_ACCENT_HEX } from '@/config/constants'

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
  // Mint-Teal zwischen dem Gold der Chronicle und dem Violett der Vorzeichen:
  // drei Systeme melden erreichte Ziele, und im Vorbeilesen trennt sie nur die
  // Farbe. Steht als MISSION_ACCENT_HEX in den Konstanten, damit Log-Zeile,
  // Kartenrand und Herald-Banner denselben Ton tragen.
  mission: MISSION_ACCENT_HEX,
  // Magenta, und das einzige Rot-Ende im Log: die Void-Zeilen sind die
  // einzigen, die von einem VERLUST berichten. Bewusst weit weg vom Violett
  // der Vorzeichen darüber — die beiden dürfen sich nicht ähneln, weil sie
  // gegensätzliche Nachrichten tragen.
  void: '#e0409f',
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

/** Ein Void-Wesen wurde erlegt — Name plus die Beute, die es freigibt. */
export function logVoidRiftSealed(name: string, boonLine: string) {
  const { addEvent } = useEventLog()
  addEvent(`${name} slain — ${boonLine}`, 'void')
}

/**
 * Ein Void-Wesen hat die Sonne erreicht. Die einzige Logzeile im Spiel, die
 * einen Verlust meldet — deshalb stehen die Beträge darin und nicht nur der
 * Name: „was hat mich das gekostet?" ist die Frage, die der Spieler an sie hat.
 *
 * Der Meep-Teil entfällt, wenn nichts anstand: eine Null zu melden, wo nichts
 * verloren ging, macht aus einer Bilanz eine Floskel.
 */
export function logVoidRiftCollapsed(name: string, hpLost: number, meepsLost = 0) {
  const { addEvent } = useEventLog()
  const meeps = safeNumber(meepsLost)
  const clause = meeps > 0 ? ` and devoured ${meeps} meep${meeps === 1 ? '' : 's'}` : ''
  addEvent(`${name} reached the sun — it took ${safeNumber(hpLost)} damage${clause}.`, 'void')
}

/**
 * Top hat ein Wesen körperlich aufgehalten.
 *
 * Die zweite Hälfte der Zeile ist wichtiger als die erste: ein angehaltenes
 * Wesen klettert nicht weiter, verliert damit die Führung, und der gesamte
 * Orbit-Beschuss springt auf das nächste. Ohne diesen Satz liest niemand das ab.
 */
export function logVoidBlocked(championName: string, verb: string, riftName: string) {
  const { addEvent } = useEventLog()
  addEvent(`${championName}'s ${verb} stops ${riftName} dead — the orbit shifts its fire.`, 'top')
}

/** Der Jungler hat ein angeschlagenes Wesen hingerichtet. */
export function logVoidCulled(championName: string, verb: string, riftName: string) {
  const { addEvent } = useEventLog()
  addEvent(`${championName}'s ${verb} finishes ${riftName} before it closes in.`, 'jungle')
}

/** Support hat die Drossel eines Wesens stillgelegt. */
export function logVoidWarded(
  championName: string,
  verb: string,
  riftName: string,
  seconds: number,
) {
  const { addEvent } = useEventLog()
  addEvent(
    `${championName}'s ${verb} silences ${riftName} — its pull goes quiet for ${seconds}s.`,
    'support',
  )
}

/** Ein Relay-Planet hat ein Wesen zurückgeworfen. */
export function logVoidBanished(planetName: string, riftName: string, seconds: number) {
  const { addEvent } = useEventLog()
  addEvent(`${planetName} opens a corridor — ${riftName} loses ${seconds}s of ground.`, 'void')
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
 * Ein Rang des Codex ist erreicht. Eigene Zeile neben der Stufe, die ihn
 * ausgelöst hat: die Stufe hebt EINE Bahn, der Rang hebt alle acht.
 */
export function logChronicleRank(rankTitle: string, effectLine: string) {
  const { addEvent } = useEventLog()
  addEvent(`Codex rank: ${rankTitle} — ${effectLine}`, 'chronicle')
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

/**
 * Eine Wayfinder-Mission wurde eingelöst. Das Kapitel steht mit in der Zeile,
 * weil die Leiter 41 Stufen lang ist — ohne es liest sich der Log nach ein paar
 * Stunden wie eine Liste unverbundener Namen.
 */
export function logMissionClaimed(missionName: string, rewardLine: string, chapterName: string) {
  const { addEvent } = useEventLog()
  addEvent(`${chapterName}: ${missionName} — ${rewardLine}`, 'mission')
}
