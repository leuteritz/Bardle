import {
  VOID_SPAWN_EDGE_OFFSET,
  VOID_SPAWN_SCALE,
  VOID_PATH_DRIFT_MAX,
  VOID_ARRIVAL_SUN_FRAC,
  VOID_HIT_RADIUS_SCALE,
  VOID_HIT_RADIUS_MIN_PX,
} from '@/config/constants'
// Die HUD-Kanten misst der Drifter bereits, und er misst sie nicht für sich
// selbst, sondern für das Spiel — dieselbe Frage, dieselbe Antwort.
import { measuredFieldInsets, type DrifterFieldInsets } from '@/utils/orbit/drifterPath'

/** Was `voidPositionAt` mindestens über ein Wesen wissen muss. */
export interface VoidPathState {
  angle: number
  drift: number
  spawnedAt: number
  travelMs: number
}

export interface VoidPoint {
  x: number
  y: number
  /** Grössenfaktor an dieser Stelle — 1 bei Ankunft. */
  scale: number
  /** Zurückgelegter Anteil des Weges, 0..1. */
  t: number
}

/**
 * Abstand von der Sonne zur Kante des Feldes in Richtung (`cos`, `sin`).
 *
 * Das Feld ist NICHT mittenzentriert — oben nimmt der Header mehr weg als die
 * Bottom-Bar unten —, also der allgemeine Strahl-Rechteck-Schnitt und nicht die
 * kürzere Fassung über halbe Kantenlängen. Läuft der Strahl parallel zu einem
 * Kantenpaar, ist dessen Wert unendlich und `Math.min` wählt von selbst das
 * andere.
 */
function rectEdgeRadius(
  cos: number,
  sin: number,
  cx: number,
  cy: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): number {
  const toVertical =
    cos > 1e-6 ? (right - cx) / cos : cos < -1e-6 ? (left - cx) / cos : Number.POSITIVE_INFINITY
  const toHorizontal =
    sin > 1e-6 ? (bottom - cy) / sin : sin < -1e-6 ? (top - cy) / sin : Number.POSITIVE_INFINITY
  return Math.max(0, Math.min(toVertical, toHorizontal))
}

/**
 * Wo ein Void-Wesen zur Zeit `now` steht.
 *
 * Die Position wird IMMER neu aus der Wanduhr gerechnet und nie fortgeschrieben:
 * dasselbe Prinzip wie beim Drifter. Ein gedrosselter Tab, ein verschluckter
 * Frame oder ein Modal, das den Layer verdeckt, können das Wesen damit nicht
 * von der Spiellogik abkoppeln — es steht immer dort, wo die Uhr es hinstellt.
 *
 * Die Bahn ist eine quadratische Bézier vom Rand zur Sonne. Der Kontrollpunkt
 * sitzt seitlich versetzt (`drift`), sonst liefen alle Wesen exakt radial und
 * der Bildschirm sähe aus wie ein Explosionsdiagramm. Ziel ist NICHT die
 * Bildmitte, sondern der Sonnenrand aus der eigenen Anflugrichtung — sonst
 * stapeln sich alle Einschläge auf einem Punkt.
 *
 * `insets` sind die HUD-Kanten, hinter denen nichts zu sehen ist. Wer je Frame
 * über alle Wesen läuft, misst sie EINMAL und reicht sie durch; der Default
 * misst selbst und ist für die seltenen Einzelabfragen gedacht (Ausgangseffekt).
 */
export function voidPositionAt(
  state: VoidPathState,
  sizePx: number,
  sunRadiusPx: number,
  now: number,
  viewportW = typeof window === 'undefined' ? 0 : window.innerWidth,
  viewportH = typeof window === 'undefined' ? 0 : window.innerHeight,
  insets: DrifterFieldInsets = measuredFieldInsets(),
): VoidPoint {
  const cx = viewportW / 2
  const cy = viewportH / 2

  const span = Math.max(1, state.travelMs)
  const t = Math.min(1, Math.max(0, (now - state.spawnedAt) / span))

  const cos = Math.cos(state.angle)
  const sin = Math.sin(state.angle)

  // Startpunkt: an der Kante des SICHTBAREN Feldes in dieser Richtung. Zwei
  // Dinge stecken darin, und beide entschieden darüber, ob man das Wesen
  // überhaupt zu sehen bekommt, während die HUD-Karte oben links es meldet:
  //
  // Erstens die Form. Vorher war der Bezug die halbe Bilddiagonale — auf 16:9
  // sind das 1082 px in JEDE Richtung, während die echte Kante von oben nur
  // 500 px entfernt ist. Ein Wesen von oben reisste also mehr als eine halbe
  // Bildhöhe ausserhalb auf und war 55 seiner 96 Sekunden unsichtbar.
  //
  // Zweitens das HUD. Header und Bottom-Bar liegen über dem Void-Layer und
  // gehen über die volle Breite; die nackte Bildkante hätte ein Wesen von oben
  // hinter dem Header aufreissen lassen, was für den Spieler dasselbe ist wie
  // ausserhalb. Gemessen wird mit demselben Werkzeug wie beim Drifter: das
  // sind die Kanten des SPIELS, nicht etwas, das einem der beiden gehört.
  const top = Math.min(insets.headerBottomPx ?? 0, cy - 1)
  const bottom = Math.max(viewportH - (insets.bottomBarHeightPx ?? 0), cy + 1)
  const edgeR = rectEdgeRadius(cos, sin, cx, cy, 0, top, viewportW, bottom)
  // Hinter die Kante nur noch um einen Bruchteil des Körpers, den es JETZT hat —
  // es ist beim Aufreissen erst `VOID_SPAWN_SCALE` gross.
  const startR = edgeR + (sizePx / 2) * VOID_SPAWN_SCALE * VOID_SPAWN_EDGE_OFFSET
  const x0 = cx + cos * startR
  const y0 = cy + sin * startR

  // Ziel: auf der Sonnenscheibe, aus der eigenen Richtung.
  const endR = sunRadiusPx * VOID_ARRIVAL_SUN_FRAC
  const x2 = cx + cos * endR
  const y2 = cy + sin * endR

  // Kontrollpunkt: Mitte der Sehne, senkrecht dazu versetzt. Der Versatz hängt
  // an der Länge DIESER Sehne, nicht an der Bilddiagonale: ein Anflug von oben
  // ist nur halb so lang wie einer von der Seite, und ein fester Versatz
  // krümmte ihn dort zu einem Bogen, der aus dem Bild führt.
  const mx = (x0 + x2) / 2
  const my = (y0 + y2) / 2
  const offset = state.drift * VOID_PATH_DRIFT_MAX * Math.max(0, startR - endR)
  // Normale zur Anflugrichtung.
  const x1 = mx + -sin * offset
  const y1 = my + cos * offset

  const inv = 1 - t
  const a = inv * inv
  const b = 2 * inv * t
  const c = t * t

  return {
    x: a * x0 + b * x1 + c * x2,
    y: a * y0 + b * y1 + c * y2,
    scale: VOID_SPAWN_SCALE + (1 - VOID_SPAWN_SCALE) * t,
    t,
  }
}

/**
 * Trefferradius um den Mittelpunkt eines Wesens.
 *
 * Grosszügiger als der Körper und mit einer Untergrenze: die Wesen bewegen
 * sich, und ein frisch aufgerissenes ist klein. Pixelgenaues Treffen eines
 * wandernden Ziels ist keine Spielmechanik, sondern eine Geduldsprobe.
 */
export function voidHitRadius(sizePx: number, scale: number): number {
  return Math.max(VOID_HIT_RADIUS_MIN_PX, sizePx * scale * VOID_HIT_RADIUS_SCALE)
}

/** Eine frische Anflugrichtung samt seitlichem Versatz. */
export function rollVoidApproach(): { angle: number; drift: number } {
  return {
    angle: Math.random() * Math.PI * 2,
    drift: Math.random() * 2 - 1,
  }
}
