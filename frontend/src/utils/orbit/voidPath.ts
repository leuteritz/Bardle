import {
  VOID_SPAWN_OVERSHOOT,
  VOID_SPAWN_SCALE,
  VOID_PATH_DRIFT_MAX,
  VOID_ARRIVAL_SUN_FRAC,
  VOID_HIT_RADIUS_SCALE,
  VOID_HIT_RADIUS_MIN_PX,
} from '@/config/constants'

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
 */
export function voidPositionAt(
  state: VoidPathState,
  sizePx: number,
  sunRadiusPx: number,
  now: number,
  viewportW = typeof window === 'undefined' ? 0 : window.innerWidth,
  viewportH = typeof window === 'undefined' ? 0 : window.innerHeight,
): VoidPoint {
  const cx = viewportW / 2
  const cy = viewportH / 2

  const span = Math.max(1, state.travelMs)
  const t = Math.min(1, Math.max(0, (now - state.spawnedAt) / span))

  const cos = Math.cos(state.angle)
  const sin = Math.sin(state.angle)

  // Startpunkt: so weit draussen, dass der Körper vollständig ausserhalb liegt.
  // Bezug ist die halbe Diagonale, damit derselbe Winkel auf 16:9 und 21:9
  // gleich weit draussen beginnt.
  const halfDiag = Math.hypot(viewportW, viewportH) / 2
  const startR = halfDiag + sizePx * VOID_SPAWN_OVERSHOOT
  const x0 = cx + cos * startR
  const y0 = cy + sin * startR

  // Ziel: auf der Sonnenscheibe, aus der eigenen Richtung.
  const endR = sunRadiusPx * VOID_ARRIVAL_SUN_FRAC
  const x2 = cx + cos * endR
  const y2 = cy + sin * endR

  // Kontrollpunkt: Mitte der Sehne, senkrecht dazu versetzt.
  const mx = (x0 + x2) / 2
  const my = (y0 + y2) / 2
  const offset = state.drift * VOID_PATH_DRIFT_MAX * halfDiag
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
