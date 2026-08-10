import type { VoidRiftDef, VoidRiftSeverity } from '@/types'

/**
 * The Void — die Riss-Typen als reine Daten. Der Store öffnet, zieht und
 * schliesst sie; der `VoidLayer` zeichnet sie.
 *
 * Der Void ist das Böse dieses Kosmos: nicht ein Gegner, den man aufsucht,
 * sondern das, was von aussen hereindrückt, während der Wanderer beschäftigt
 * ist. Er hat keine Gestalt und keinen Namen — nur Stellen, an denen die Welt
 * nachgibt. Deshalb heissen die Einträge hier nach dem SCHADEN, den sie
 * anrichten („Sunless Breach", „Starving Maw"), und nicht nach einem Wesen:
 * es gibt niemanden zu erschlagen, es gibt nur ein Loch zu schliessen.
 *
 * **Die Regel, die dieses System trägt: ein Riss zieht an genau EINER Achse,
 * und dieselbe Achse zahlt er beim Schliessen aus.** Wer den Sunless Breach
 * stehen lässt, verliert Produktion; wer ihn schliesst, bekommt Produktion.
 * Das ist bewusst das Gegenteil der Vorzeichen, die in System A messen und in
 * System B zahlen — dort ist der Umweg der Reiz, hier wäre er eine zweite
 * Nachricht in einem Moment, in dem der Spieler schon eine hat. Ein Riss soll
 * in einem Satz zu lesen sein: „das kostet dich X, also hol dir X zurück."
 *
 * Der `aftermath` bricht diese Regel als einziger nicht, er verschärft sie:
 * dieselbe Achse, härter, für eine Minute. Ein Kollaps ist damit kein neues
 * Problem, sondern das alte, das man nicht rechtzeitig gelöst hat.
 *
 * Balance-Absicht nach Schwere:
 *  - lesser  → häufig, mild, in einer halben Minute erledigt
 *  - greater → zieht spürbar, verlangt einen Kader, der mitgewachsen ist
 *  - abyssal → zieht an mehreren Achsen zugleich; der eine Riss, für den man
 *              alles andere stehen lässt
 */
export const VOID_RIFTS: VoidRiftDef[] = [
  {
    id: 'sunlessBreach',
    name: 'Sunless Breach',
    severity: 'lesser',
    weight: 30,
    icon: 'game-icons:eclipse',
    color: '#8a6fd0',
    sizePx: 112,
    drainLine: 'Chime production sinks while it stands',
    boonLine: 'Sealed: a surge of production',
    drain: { cpsMult: 0.7 },
    boon: {
      durationMs: 60_000,
      effects: { cpsMult: 1.6 },
      chimesFromCpsSeconds: 120,
    },
    aftermath: { cpsMult: 0.6 },
  },
  {
    id: 'starvingMaw',
    name: 'Starving Maw',
    severity: 'lesser',
    weight: 22,
    icon: 'game-icons:black-hole-bolas',
    color: '#9a5fc8',
    sizePx: 118,
    drainLine: 'Materials stop finding their way to you',
    boonLine: 'Sealed: everything it swallowed, returned',
    drain: { materialDropMult: 0.55 },
    boon: {
      durationMs: 75_000,
      effects: { materialDropMult: 2 },
      materials: 5,
    },
    aftermath: { materialDropMult: 0.5 },
  },
  {
    id: 'dimmingWound',
    name: 'Dimming Wound',
    severity: 'greater',
    weight: 16,
    icon: 'game-icons:shadow-grasp',
    color: '#b04fd8',
    sizePx: 138,
    drainLine: 'Your orbit strikes softer while it stands',
    boonLine: 'Sealed: the orbit strikes back twice as hard',
    drain: { combatDpsMult: 0.55 },
    boon: {
      durationMs: 75_000,
      effects: { combatDpsMult: 2 },
      chimesFromCpsSeconds: 90,
    },
    aftermath: { combatDpsMult: 0.5 },
  },
  {
    id: 'forgottenPath',
    name: 'Forgotten Path',
    severity: 'greater',
    weight: 12,
    icon: 'game-icons:crossed-slashes',
    color: '#c94fc0',
    sizePx: 132,
    drainLine: 'Champions learn nothing while it stands',
    boonLine: 'Sealed: every lesson at once',
    drain: { xpMult: 0.5 },
    boon: {
      durationMs: 90_000,
      effects: { xpMult: 2.2 },
      chimesFromCpsSeconds: 90,
    },
    aftermath: { xpMult: 0.45 },
  },
  {
    id: 'unmakingScar',
    name: 'Unmaking Scar',
    severity: 'abyssal',
    weight: 10,
    icon: 'game-icons:sundial',
    color: '#e0409f',
    sizePx: 168,
    // Der einzige Typ, der die Ein-Achsen-Regel oben dehnt — und genau daran
    // soll man merken, dass hier etwas anderes aufgerissen ist als sonst.
    drainLine: 'It pulls at everything you have built',
    boonLine: 'Sealed: everything, doubled, for two minutes',
    drain: { cpsMult: 0.65, cpcMult: 0.65, combatDpsMult: 0.65, materialDropMult: 0.65 },
    boon: {
      durationMs: 120_000,
      effects: { cpsMult: 2, cpcMult: 2, combatDpsMult: 2, materialDropMult: 2 },
      chimesFromCpsSeconds: 240,
      materials: 8,
    },
    aftermath: { cpsMult: 0.55, cpcMult: 0.55, combatDpsMult: 0.55, materialDropMult: 0.55 },
  },
]

/** Jede Schwere, die tatsächlich Risse hat — schwerste zuerst. Das ist die
 *  Reihenfolge, in der gleichzeitig fällige Uhren bedient werden. */
export const VOID_RIFT_SEVERITIES: VoidRiftSeverity[] = [
  ...new Set(VOID_RIFTS.map((r) => r.severity)),
]

/** Nachschlagen eines Riss-Typs. Gibt `undefined` zurück, statt zu werfen —
 *  ein Spielstand mit einer ID, die es nicht mehr gibt, darf das Laden nicht
 *  abbrechen. */
export function getVoidRift(id: string): VoidRiftDef | undefined {
  return VOID_RIFTS.find((r) => r.id === id)
}
