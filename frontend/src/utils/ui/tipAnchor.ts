/**
 * Wo eine schwebende Karte an ihrem Anker steht — die EINE Rechnung dafür.
 *
 * Sie stand als Rumpf von `RpgBadgeTooltip.open()` an genau einer Stelle,
 * während vier andere Blasen im Spiel gar nicht rechneten und aus dem Bild
 * ragen konnten. Ausgelagert ist sie prüfbar und teilbar.
 *
 * Die Karte wird VORHER gemessen, nicht geschätzt: der Aufrufer stellt sie
 * ausserhalb des Bildes ab, liest `offsetWidth`/`offsetHeight` und reicht sie
 * hier herein. Eine Karte, deren Höhe vom Inhalt abhängt, lässt sich nicht
 * anders klemmen.
 */

export interface TipAnchorInput {
  /** Die Kante, auf die der Pfeil zeigt. */
  anchor: DOMRect
  /**
   * Die Kante, die die Karte RÄUMT — meist dieselbe. Sie weicht ab, wo der
   * Anker in einem dichten Block sitzt: das Materialgitter im Header stapelt
   * zwei Reihen, und eine Karte, die nur ihre eigene Zelle räumte, läge auf
   * der Reihe darunter.
   */
  clear?: DOMRect
  tipW: number
  tipH: number
  gap: number
  /** Mindestabstand zu den Bildkanten. */
  margin: number
  /** Der Pfeil bleibt so weit von den gerundeten Ecken weg. */
  caretInset: number
  /** Vorzugsseite; die Gegenseite nur, wenn dort Platz ist. */
  prefer?: 'top' | 'bottom'
  bounds?: DOMRect
  viewportW?: number
  viewportH?: number
}

export interface TipAnchorResult {
  left: number
  top: number
  /** Lage des Pfeils INNERHALB der Karte. */
  caretX: number
  placement: 'top' | 'bottom'
}

export function placeTip(o: TipAnchorInput): TipAnchorResult {
  const vw = o.viewportW ?? window.innerWidth
  const vh = o.viewportH ?? window.innerHeight
  const clear = o.clear ?? o.anchor
  const m = o.margin
  const minX = Math.max(m, (o.bounds?.left ?? 0) + m)
  const maxX = Math.min(vw - o.tipW - m, (o.bounds?.right ?? vw) - o.tipW - m)

  // Waagerecht folgt die Karte IMMER dem Anker; nur die Kante, die sie räumt,
  // darf von einem Vorfahren kommen.
  let left = o.anchor.left + o.anchor.width / 2 - o.tipW / 2
  left = Math.min(Math.max(left, minX), Math.max(minX, maxX))

  const below = clear.bottom + o.gap
  const above = clear.top - o.gap - o.tipH
  const minY = Math.max(m, (o.bounds?.top ?? 0) + m)
  const maxY = Math.min(vh - o.tipH - m, (o.bounds?.bottom ?? vh) - o.tipH - m)
  const fitsBelow = below >= minY && below <= maxY
  const fitsAbove = above >= minY && above <= maxY
  const useTop = o.prefer === 'top' ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove
  const rawTop = useTop ? above : below
  const top = Math.min(Math.max(rawTop, minY), Math.max(minY, maxY))

  const caretX = Math.min(
    Math.max(o.anchor.left + o.anchor.width / 2 - left, o.caretInset),
    o.tipW - o.caretInset,
  )

  return {
    left,
    top,
    caretX,
    placement: useTop ? 'top' : 'bottom',
  }
}
