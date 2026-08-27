// Wer von den Karten der linken Spalte aufgerissen steht — und wer als Zeile.
//
// Vorher stand jede Karte voll da, alle sechs zugleich: gemessen rund 774 px
// auf einem 1000er Viewport, also ueber zwei Drittel der Buehne, genau dort, wo
// der Orbit laeuft. Es steht deshalb genau EINE offen, und diese Datei sagt,
// welche. Vorbild ist der Zustandsrang in `utils/game/voyageFleet.ts`.
//
// Der Wayfinder nimmt nicht teil. Er ist das einzige dauerhafte Glied, steht
// ganz oben und faltet nie — haenge er am Rang, wanderte das eine Element, auf
// das der Spieler sich verlaesst, mehrmals pro Minute auf und ab.

import type { HudCardCandidate, HudCardId } from '@/types'

/**
 * Die Leiter. Kleiner ist dringlicher.
 *
 * Warum das STEHENDE hinter dem FLUECHTIGEN steht: der Void ist
 * quasi-dauerhaft (Nachschub alle 26–44 s bei 46 s Reisezeit). Bekaeme er den
 * Fokus nach Bedrohungsgrad, hielte er ihn fast immer und die Faltung zeigte
 * nie etwas anderes. Ein Drifter dagegen hat Sekunden und ist dann fuer immer
 * weg. Es ist dieselbe Logik, nach der die Spalte schon vorher sortiert war
 * („permanent oben, fluechtig unten") — nur auf die EMPHASE angewandt statt auf
 * die Position.
 */
export const HUD_CARD_RANK = {
  /** Der Wayside Cairn: drei Knoepfe, ohne Aufriss unbedienbar. */
  decision: 0,
  /** Ein Void, das die Sonne gleich erreicht (`VOID_URGENT_FRAC`). */
  emergency: 1,
  /** Ein Landfall mit offenen Griffen — die Karte IST der Griff. */
  actionable: 2,
  /** Ein Drifter in Sicht. */
  fleeting: 3,
  /** Der Nachlauf von Void und Drifter (3,2 s). */
  outcome: 4,
  /** Ein Void auf dem Weg. */
  threat: 5,
  /** Das Omen — Minuten bis Stunden. */
  standing: 6,
  /** Die Auto-Pick-Quittung: etwas ist bereits geschehen. */
  receipt: 7,
} as const

/** Die feste Reihenfolge der GEFALTETEN Zeilen. */
const FOLD_ORDER: readonly HudCardId[] = ['landfall', 'drifter', 'void', 'omen', 'autopick']

/**
 * Der Fokus: kleinster Rang, bei Gleichstand die kuerzere Restzeit. `null`,
 * wenn ausser dem Wayfinder nichts steht.
 */
export function pickHudCardFocus(candidates: readonly HudCardCandidate[]): HudCardId | null {
  let best: HudCardCandidate | null = null
  for (const c of candidates) {
    if (c.id === 'wayfinder') continue
    if (!best) {
      best = c
      continue
    }
    if (c.rank < best.rank) best = c
    else if (c.rank === best.rank && c.remainingMs < best.remainingMs) best = c
  }
  return best?.id ?? null
}

/**
 * Die Renderreihenfolge: Wayfinder, dann der Fokus, dann die gefalteten Zeilen
 * in FESTER Reihenfolge.
 *
 * Der Fokus steht direkt unter dem Wayfinder und nicht an seinem Rangplatz —
 * die eine aufgerissene Karte gehoert an eine feste Stelle, sonst sucht der
 * Blick sie jedes Mal neu. Die gefalteten sortieren sich NICHT nach Rang: ein
 * Void, das dringlich wird, springt schon durch den Fokuswechsel nach oben, und
 * eine Zeile, die sich im Sekundentakt umordnet, ist nicht ablesbar.
 */
export function orderHudCards(
  candidates: readonly HudCardCandidate[],
  focus: HudCardId | null,
): HudCardId[] {
  const present = new Set(candidates.map((c) => c.id))
  const out: HudCardId[] = []
  if (present.has('wayfinder')) out.push('wayfinder')
  if (focus && present.has(focus)) out.push(focus)
  for (const id of FOLD_ORDER) {
    if (id !== focus && present.has(id)) out.push(id)
  }
  return out
}
