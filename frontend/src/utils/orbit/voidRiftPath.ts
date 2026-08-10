import {
  VOID_RIFT_RADIUS_FRAC_MIN,
  VOID_RIFT_RADIUS_FRAC_RANGE,
  VOID_RIFT_HUD_MARGIN_PX,
  VOID_RIFT_PLACEMENT_TRIES,
  VOID_RIFT_HIT_PADDING_PX,
  VOID_RIFT_FIELD_TOP_PX,
  VOID_RIFT_FIELD_BOTTOM_PX,
} from '@/config/constants'
import { drifterField, measuredFieldInsets, type DrifterFieldRect } from '@/utils/orbit/drifterPath'

/** Was `voidRiftScreenPos` mindestens braucht — so lässt sich auch eine
 *  gewürfelte Kandidatenlage prüfen, bevor daraus ein `ActiveVoidRift` wird. */
export interface VoidRiftPlacement {
  angle: number
  radiusFrac: number
}

/**
 * Halbe Ausdehnung eines Riss-Typs bei vollem Wachstum — SAMT Klickpolster,
 * nicht nur der sichtbare Körper.
 *
 * Jede Stelle, die einen Riss im Bild hält, rechnet damit. Nur mit `sizePx / 2`
 * geklemmt ragte die Trefferfläche um genau das Polster über den Rand hinaus
 * (gemessen: 5 px links) — unsichtbar, aber es ist der Teil, auf den geklickt
 * wird.
 */
export function voidRiftHalfExtent(sizePx: number): number {
  return sizePx / 2 + VOID_RIFT_HIT_PADDING_PX
}

/**
 * Die freie Fläche, in der ein Riss stehen darf.
 *
 * Geliehen von den Driftern — `drifterField` und `measuredFieldInsets` messen
 * die HUD-Kanten des Spiels (Header samt Level-Abzeichen, Bottom-Bar, die
 * erhobenen Seitenpanels), nicht irgendetwas Drifter-Eigenes; nur ihre Namen
 * stammen von dem System, das sie zuerst brauchte. Eine zweite Messung
 * danebenzustellen hiesse, dass HUD-Änderungen künftig an einer der beiden
 * Stellen vergessen werden — und das fiele erst auf, wenn ein Riss unter der
 * Minimap steht.
 */
function field(): DrifterFieldRect {
  if (typeof window === 'undefined') return drifterField(0, 0)
  return drifterField(window.innerWidth, window.innerHeight, measuredFieldInsets())
}

/**
 * Wo ein Riss auf dem Bildschirm steht.
 *
 * Store UND Layer brauchen diese Rechnung: der Layer, um ihn zu zeichnen, der
 * Store, um zu wissen, wo Schliess- bzw. Kollaps-Effekt spielen. Stünde sie an
 * beiden Stellen, liefen Effekt und Objekt beim nächsten Randabgleich
 * auseinander — unbemerkt, weil beide für sich plausibel aussähen.
 *
 * `halfBodyPx` ist der halbe Riss bei VOLLEM Wachstum. Bewusst der Endwert und
 * nicht die aktuelle Grösse: ein Riss, der klein aufgeht und beim Wachsen unter
 * die Bottom-Bar rutschte, wäre am Ende genau dann unklickbar, wenn es darauf
 * ankommt.
 */
export function voidRiftScreenPos(
  rift: VoidRiftPlacement,
  halfBodyPx = 0,
): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  const w = window.innerWidth
  const h = window.innerHeight
  const f = field()

  // Halbe Diagonale als Bezug: derselbe `radiusFrac` liegt damit auf 16:9 und
  // auf 21:9 gleich weit draussen, statt auf breiten Schirmen an den Rand zu
  // kleben.
  const halfDiag = Math.hypot(w, h) / 2
  const r = rift.radiusFrac * halfDiag

  let x = w / 2 + Math.cos(rift.angle) * r
  let y = h / 2 + Math.sin(rift.angle) * r

  // Seitlich im Bild halten, damit die Trefferfläche nicht halb draussen liegt.
  x = Math.min(Math.max(x, halfBodyPx), w - halfBodyPx)

  // Unter dem Header, über dem unteren Feldrand — beides mit dem halben Körper
  // als Zugabe, sonst steht der MITTELPUNKT innerhalb der Grenze und die
  // Trefferfläche ragt trotzdem darüber hinaus.
  const topLimit = Math.max(f.top, VOID_RIFT_FIELD_TOP_PX) + halfBodyPx
  const bottomLimit = h - VOID_RIFT_FIELD_BOTTOM_PX - halfBodyPx
  // Auf sehr flachen Viewports können sich die beiden Grenzen überschneiden;
  // dann gewinnt die obere, denn der Header ist deckend und der untere Rand
  // nur in seinen erhobenen Enden.
  y = bottomLimit >= topLimit ? Math.min(Math.max(y, topLimit), bottomLimit) : topLimit

  // Und aus den erhobenen Seitenpanels heraus (Minimap links, Command rechts).
  // Die sind deckend und liegen ÜBER dem Riss-Layer: ein Riss dahinter wäre
  // unsichtbar und unklickbar — also ein sicherer Kollaps ohne jede Chance,
  // und das ist der eine Ausgang, den dieses System nie erzwingen darf.
  const inSideColumn =
    x < f.left + f.sidePanelWidth + halfBodyPx ||
    x > f.left + f.width - f.sidePanelWidth - halfBodyPx
  if (inSideColumn) {
    y = Math.min(y, f.sidePanelTop - VOID_RIFT_HUD_MARGIN_PX - halfBodyPx)
  }

  // Nach dem Hochschieben kann die Oberkante wieder verletzt sein (flacher
  // Viewport, grosser Riss) — der Header gewinnt, er ist deckend.
  y = Math.max(y, topLimit)

  return { x, y }
}

/** Liegt diese Lage frei, ohne dass geklemmt werden musste? */
function isClear(placement: VoidRiftPlacement, halfBodyPx: number): boolean {
  if (typeof window === 'undefined') return true
  const w = window.innerWidth
  const h = window.innerHeight
  const halfDiag = Math.hypot(w, h) / 2
  const r = placement.radiusFrac * halfDiag
  const x = w / 2 + Math.cos(placement.angle) * r
  const y = h / 2 + Math.sin(placement.angle) * r
  const pos = voidRiftScreenPos(placement, halfBodyPx)
  return Math.abs(pos.x - x) < 0.5 && Math.abs(pos.y - y) < 0.5
}

/**
 * Eine neue Lage für einen Riss würfeln.
 *
 * Der Winkel ist frei, der Radius liegt im erlaubten Band — dessen Untergrenze
 * hält den Riss von der Sonne fern, damit seine Klickfläche nicht über der für
 * Chimes liegt.
 *
 * Es wird mehrfach gewürfelt und die erste Lage genommen, die OHNE Klemmung
 * auskommt. Ein geklemmter Riss klebt sichtbar an einer Kante; auf dem Ring
 * ist genug Platz, das zu vermeiden, und das kostet ein paar Würfe statt einer
 * Sonderbehandlung. Reicht keiner der Versuche (sehr flacher Viewport), bleibt
 * die Klemmung in `voidRiftScreenPos` das Sicherheitsnetz.
 */
export function rollVoidRiftPlacement(halfBodyPx = 0): VoidRiftPlacement {
  let last: VoidRiftPlacement = { angle: 0, radiusFrac: VOID_RIFT_RADIUS_FRAC_MIN }
  for (let i = 0; i < VOID_RIFT_PLACEMENT_TRIES; i++) {
    last = {
      angle: Math.random() * Math.PI * 2,
      radiusFrac: VOID_RIFT_RADIUS_FRAC_MIN + Math.random() * VOID_RIFT_RADIUS_FRAC_RANGE,
    }
    if (isClear(last, halfBodyPx)) return last
  }
  return last
}
