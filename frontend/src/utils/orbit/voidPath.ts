import {
  VOID_SPAWN_EDGE_OFFSET,
  VOID_SPAWN_SCALE,
  VOID_PATH_DRIFT_MAX,
  VOID_ARRIVAL_SUN_FRAC,
  VOID_HIT_RADIUS_SCALE,
  VOID_HIT_RADIUS_MIN_PX,
  VOID_EDGE_MARCH_STEPS,
  VOID_EDGE_REFINE_STEPS,
  VOID_EDGE_ANGLE_KEY_SCALE,
} from '@/config/constants'
// Die HUD-Kontur gehört dem Spiel, nicht dem Void — sie steht in `hudField`
// und wird von Drifter, Sternen und diesem Modul gleichermassen gelesen.
import { hudFreeBandAt, hudFieldMetrics, type HudFieldMetrics } from '@/utils/ui/hudField'
import { useHeaderCenterArc } from '@/composables/ui/useHeaderCenterArc'

/** Der Header-Bogen liegt in einem geteilten Ref; hier nur lesend abgeholt. */
function sharedHeaderArc() {
  return useHeaderCenterArc().headerCenterArc.value ?? null
}

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
 * Abstand von der Sonne zur Kante des freien Feldes in Richtung (`cos`, `sin`).
 *
 * Das Feld ist weder mittenzentriert noch rechteckig: die Bottom-Bar steht an
 * den Enden hoch und fällt in der Mitte auf einen schmalen Streifen ab, der
 * Header hängt mittig als Oval herunter und hört seitlich ganz auf. Mit einem
 * Rechteck gerechnet reissen alle Wesen auf derselben geraden Linie auf, ein
 * gutes Stück innerhalb dessen, was frei ist — unter der Sonne sind das rund
 * 250 px.
 *
 * Gesucht ist der ERSTE Austritt aus dem freien Feld, und dafür braucht es
 * Marching: eine Fixpunkt-Iteration stand hier zuerst und schwang bei schrägen
 * Winkeln zwischen zwei Ästen hin und her (der Strahl verlässt das Feld über
 * einem Seitenpanel, die Kontur an der NEUEN Stelle erlaubt wieder mehr, und
 * so fort). Das Ergebnis war ein Startpunkt mitten auf der Bühne statt am Rand.
 *
 * Grobe Abtastung bis zum ersten unfreien Schritt, dann Bisektion auf ein paar
 * Pixel genau. Nicht-monoton ist die Freiheit ausdrücklich — deshalb keine
 * reine Bisektion von aussen.
 */
function marchEdgeRadius(
  cos: number,
  sin: number,
  cx: number,
  cy: number,
  metrics: HudFieldMetrics,
  overshoot: number,
): number {
  const W = metrics.viewportW
  const H = metrics.viewportH
  const limit = Math.hypot(W, H)

  const isFree = (r: number): boolean => {
    const x = cx + cos * r
    const y = cy + sin * r
    if (x < 0 || x > W || y < 0 || y > H) return false
    const band = hudFreeBandAt(x, metrics)
    return y >= band.top && y <= band.bottom
  }

  const step = limit / VOID_EDGE_MARCH_STEPS
  let lastFree = 0
  let firstBlocked = limit
  for (let r = step; r <= limit; r += step) {
    if (isFree(r)) {
      lastFree = r
    } else {
      firstBlocked = r
      break
    }
  }
  // Auf die Kante einschnüren.
  for (let i = 0; i < VOID_EDGE_REFINE_STEPS; i++) {
    const mid = (lastFree + firstBlocked) / 2
    if (isFree(mid)) lastFree = mid
    else firstBlocked = mid
  }

  // Der Überstand hinter die Kante gehört hierher und nicht zum Aufrufer: an
  // einer STEILEN Stelle der Kontur — der senkrechten Wand eines Seitenpanels
  // — schiebt er das Wesen nicht ein Stück hinter den Rand, sondern mit einem
  // Satz mehrere hundert Pixel hinter das Panel. Wo er nicht mehr passt, endet
  // das Wesen eben genau auf der Kante.
  const withOvershoot = lastFree + overshoot
  return isFree(withOvershoot) ? withOvershoot : lastFree
}

/**
 * Wie `marchEdgeRadius`, nur einmal je Richtung gerechnet.
 *
 * Der Startpunkt eines Wesens hängt allein an seinem Winkel und an der Form des
 * HUD — er ändert sich auf der ganzen Reise nicht. Der Zwischenspeicher hängt
 * deshalb am Metrics-OBJEKT: `hudFieldMetrics()` gibt dasselbe Objekt zurück,
 * solange sich nichts bewegt, und liefert bei jedem Resize ein neues. Damit
 * räumt sich der Speicher von selbst auf, ohne dass jemand daran denken muss.
 */
const edgeCache = new WeakMap<HudFieldMetrics, Map<string, number>>()

function spawnRadius(
  angle: number,
  cx: number,
  cy: number,
  metrics: HudFieldMetrics,
  overshoot: number,
): number {
  let perAngle = edgeCache.get(metrics)
  if (!perAngle) {
    perAngle = new Map()
    edgeCache.set(metrics, perAngle)
  }
  const key = `${Math.round(angle * VOID_EDGE_ANGLE_KEY_SCALE)}|${Math.round(overshoot)}`
  const hit = perAngle.get(key)
  if (hit !== undefined) return hit
  const r = marchEdgeRadius(Math.cos(angle), Math.sin(angle), cx, cy, metrics, overshoot)
  perAngle.set(key, r)
  return r
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
 * `metrics` ist die HUD-Kontur, hinter der nichts zu sehen ist. Wer je Frame
 * über alle Wesen läuft, liest sie EINMAL und reicht sie durch; der Default
 * liest selbst und ist für die seltenen Einzelabfragen gedacht (Ausgangseffekt).
 */
export function voidPositionAt(
  state: VoidPathState,
  sizePx: number,
  sunRadiusPx: number,
  now: number,
  viewportW = typeof window === 'undefined' ? 0 : window.innerWidth,
  viewportH = typeof window === 'undefined' ? 0 : window.innerHeight,
  metrics?: HudFieldMetrics,
): VoidPoint {
  const cx = viewportW / 2
  const cy = viewportH / 2

  const span = Math.max(1, state.travelMs)
  const t = Math.min(1, Math.max(0, (now - state.spawnedAt) / span))

  const cos = Math.cos(state.angle)
  const sin = Math.sin(state.angle)

  // Startpunkt: an der Kante des SICHTBAREN Feldes in dieser Richtung. Drei
  // Dinge stecken darin, und jedes entschied darüber, ob man das Wesen
  // überhaupt zu sehen bekommt, während die HUD-Karte oben links es meldet:
  //
  // Erstens die Entfernung. Der Bezug war einmal die halbe Bilddiagonale — auf
  // 16:9 sind das 1082 px in JEDE Richtung, während die echte Kante von oben
  // nur 500 px entfernt ist. Ein Wesen von oben reisste also mehr als eine
  // halbe Bildhöhe ausserhalb auf und war 55 seiner 96 Sekunden unsichtbar.
  //
  // Zweitens das HUD selbst: Header und Bottom-Bar liegen über dem Void-Layer
  // und sind undurchsichtig. Hinter ihnen aufzureissen ist für den Spieler
  // dasselbe wie ausserhalb des Bildes.
  //
  // Drittens ihre FORM. Als Rechteck gerechnet reissen alle Wesen auf einer
  // geraden Linie auf, deutlich innerhalb dessen, was frei ist: die Bar fällt
  // in der Mitte auf einen schmalen Streifen ab (rund 250 px Unterschied), und
  // den Header gibt es an den äusseren Rändern gar nicht. `hudField` liefert
  // die Kontur, gerechnet aus denselben Konstanten, aus denen die Formen
  // gezeichnet werden.
  // Die Kontur muss von DEMSELBEN Bild ausgehen wie die Bahn. Weicht sie ab —
  // was passiert, sobald jemand Viewport-Maße von Hand übergibt —, liegt die
  // Sonne ausserhalb des Feldes, das die Kontur beschreibt, und der Strahl
  // findet keinen freien Punkt mehr.
  const base = metrics ?? hudFieldMetrics(sharedHeaderArc())
  const field: HudFieldMetrics =
    base.viewportW === viewportW && base.viewportH === viewportH
      ? base
      : { ...base, viewportW, viewportH, headerRight: viewportW - base.headerLeft }
  // Hinter die Kante nur um einen Bruchteil des Körpers, den es JETZT hat — es
  // ist beim Aufreissen erst `VOID_SPAWN_SCALE` gross.
  const overshoot = (sizePx / 2) * VOID_SPAWN_SCALE * VOID_SPAWN_EDGE_OFFSET
  const startR = spawnRadius(state.angle, cx, cy, field, overshoot)
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
