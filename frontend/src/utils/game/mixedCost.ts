import type { MaterialSinkId } from '@/types'

/**
 * Ein Preis aus mehreren Währungen — und die EINE Antwort darauf, woran er
 * gerade scheitert.
 *
 * Das Muster stand bis hierher neunmal von Hand im Code, jedes Mal in derselben
 * Reihenfolge: Chimes prüfen, Material prüfen, Material abziehen, Chimes
 * abziehen. Neun Fassungen sind acht Gelegenheiten, die Reihenfolge zu
 * vertauschen — und genau dort liegt der Fehler, der wehtut: wer die Chimes
 * zuerst abzieht und danach am Material scheitert, hat sie verschenkt.
 *
 * **Material kommt zuletzt**, weil `removeMaterials()` der einzige Schritt ist,
 * der noch fehlschlagen kann. Dieselbe Reihenfolge und derselbe Grund wie in
 * `championLevelStore.payFor()`.
 *
 * Die PRÜFUNG ist rein und store-frei: der Beutel kommt als Argument. Die
 * ZAHLUNG kann das nicht sein — sie mutiert drei Stores — und steht deshalb als
 * `starForgeStore.payMixed()` dort, wo die Stores ohnehin zusammenkommen.
 */
export interface MixedCost {
  chimes?: number
  meeps?: number
  materials?: Record<string, number>
}

/** Was der Spieler gerade hat. Ein Abbild, kein Store. */
export interface Purse {
  chimes: number
  meeps: number
  stock: Record<string, number>
}

/** Welches Bein nicht trägt — `null`, wenn alle tragen. */
export type MixedCostLeg = 'chimes' | 'meeps' | 'materials'

/**
 * Das ERSTE Bein, das nicht trägt, in Zahlungsreihenfolge.
 *
 * Ein Wert und kein Satz: wer nach dem Grund GRUPPIERT — die Kaufschiene tut
 * das —, müsste einen Satz beschnüffeln. Vorbild ist
 * `championLevelStore.blockReasonOf()`, das dieselbe Frage für Champion-Level
 * beantwortet und dort schon `'cap' | 'xp' | 'chimes' | 'materials'` liefert.
 */
export function mixedCostBlock(cost: MixedCost, purse: Purse): MixedCostLeg | null {
  if ((cost.chimes ?? 0) > 0 && purse.chimes < (cost.chimes ?? 0)) return 'chimes'
  if ((cost.meeps ?? 0) > 0 && purse.meeps < (cost.meeps ?? 0)) return 'meeps'
  for (const [id, need] of Object.entries(cost.materials ?? {})) {
    if ((purse.stock[id] ?? 0) < need) return 'materials'
  }
  return null
}

/** Trägt der ganze Preis? Dieselbe Rechnung, nur als Ja/Nein. */
export function canPayMixed(cost: MixedCost, purse: Purse): boolean {
  return mixedCostBlock(cost, purse) === null
}

/**
 * Was eine Zahlung braucht, um alles-oder-nichts zu sein.
 *
 * Kein Store-Zugriff hier drin — der Aufrufer reicht die zwei Wege herein.
 * `takeMaterials` gibt `false` zurück, wenn das Lager doch nicht reicht; passiert
 * das, ist noch KEINE Zahl gefallen, weil Chimes und Meeps erst danach sinken.
 */
export function payMixed(
  cost: MixedCost,
  purse: Purse,
  takeMaterials: (cost: Record<string, number>, sink: MaterialSinkId) => boolean,
  sink: MaterialSinkId,
  pay: (chimes: number, meeps: number) => void,
): boolean {
  if (!canPayMixed(cost, purse)) return false
  const materials = cost.materials ?? {}
  if (Object.keys(materials).length > 0 && !takeMaterials(materials, sink)) return false
  pay(cost.chimes ?? 0, cost.meeps ?? 0)
  return true
}
