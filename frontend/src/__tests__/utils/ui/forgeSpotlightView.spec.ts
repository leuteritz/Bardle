import { describe, expect, it } from 'vitest'
import {
  forgeCompassAt,
  forgeCompassReach,
  forgeNodeInView,
  forgeNodeScreenPoint,
  forgeRowInView,
  type ForgeCamera,
  type ForgeViewBox,
} from '@/utils/ui/forgeSpotlightView'
import {
  FORGE_SPOTLIGHT_COMPASS_INSET_PX,
  FORGE_SPOTLIGHT_COMPASS_KEEPOUT,
  FORGE_SPOTLIGHT_EDGE_MARGIN_PX,
  FORGE_STAGE_SIZE,
} from '@/config/constants'

/**
 * Die Rechnung hinter „liegt der Knoten im Bild".
 *
 * Sie steht in einer eigenen Datei, damit genau diese Spec möglich ist — in der
 * `.vue` wäre sie untestbar, das Projekt mountet keine Komponenten.
 */

const VIEW: ForgeViewBox = { w: 800, h: 600 }
const CENTER = FORGE_STAGE_SIZE / 2

function cam(panX: number, panY: number, scale = 1): ForgeCamera {
  return { panX, panY, scale }
}

describe('forgeNodeScreenPoint', () => {
  it('setzt den Knoten unter dem Bildmittelpunkt in die Viewport-Mitte', () => {
    const p = forgeNodeScreenPoint({ x: 700, y: 900 }, cam(700, 900), VIEW)
    expect(p).toEqual({ x: VIEW.w / 2, y: VIEW.h / 2 })
  })

  it('skaliert den Versatz mit dem Zoom', () => {
    const at1 = forgeNodeScreenPoint({ x: CENTER + 100, y: CENTER }, cam(CENTER, CENTER, 1), VIEW)
    const at2 = forgeNodeScreenPoint({ x: CENTER + 100, y: CENTER }, cam(CENTER, CENTER, 2), VIEW)
    expect(at1.x - VIEW.w / 2).toBe(100)
    expect(at2.x - VIEW.w / 2).toBe(200)
  })

  it('kennt die Bühnengrösse nicht — sie kürzt sich aus der Herleitung heraus', () => {
    // Derselbe Knoten, derselbe Bildmittelpunkt, aber Koordinaten weit weg von
    // FORGE_STAGE_SIZE/2. Käme die Bühnengrösse irgendwo vor, ergäbe das einen
    // anderen Punkt.
    const near = forgeNodeScreenPoint({ x: 60, y: 40 }, cam(50, 30), VIEW)
    const far = forgeNodeScreenPoint({ x: 1960, y: 1940 }, cam(1950, 1930), VIEW)
    expect(near).toEqual(far)
    expect(near).toEqual({ x: VIEW.w / 2 + 10, y: VIEW.h / 2 + 10 })
  })
})

describe('forgeNodeInView', () => {
  it('führt einen Knoten in der Bildmitte als sichtbar', () => {
    expect(forgeNodeInView({ x: CENTER, y: CENTER }, 30, cam(CENTER, CENTER), VIEW)).toBe(true)
  })

  it('meldet einen ungemessenen Viewport als sichtbar — sonst führe der erste Hover blind', () => {
    expect(forgeNodeInView({ x: 0, y: 0 }, 30, cam(CENTER, CENTER), { w: 0, h: 0 })).toBe(true)
  })

  it('lässt einen Knoten, dessen Ring genau auf dem Saum endet, gerade noch gelten', () => {
    const r = 20
    // Linke Kante: screenX - r === EDGE_MARGIN. Der geforderte Abstand ist
    // exakt erreicht — das ist die Grenze, und die Grenze zählt als drin.
    const x = CENTER - (VIEW.w / 2 - FORGE_SPOTLIGHT_EDGE_MARGIN_PX - r)
    expect(forgeNodeInView({ x, y: CENTER }, r, cam(CENTER, CENTER), VIEW)).toBe(true)
  })

  it('zählt ihn einen Pixel weiter aussen als draussen', () => {
    const r = 20
    const x = CENTER - (VIEW.w / 2 - FORGE_SPOTLIGHT_EDGE_MARGIN_PX - r) - 1
    expect(forgeNodeInView({ x, y: CENTER }, r, cam(CENTER, CENTER), VIEW)).toBe(false)
  })

  it('holt einen Randknoten durch Herauszoomen ins Bild', () => {
    const node = { x: CENTER + 500, y: CENTER }
    expect(forgeNodeInView(node, 30, cam(CENTER, CENTER, 1), VIEW)).toBe(false)
    expect(forgeNodeInView(node, 15, cam(CENTER, CENTER, 0.5), VIEW)).toBe(true)
  })

  it('führt einen Knoten hinter der Zoom-Leiste als NICHT im Bild, obwohl er geometrisch drin liegt', () => {
    // Unten rechts: innerhalb des Saums, aber hinter der Zoom-Leiste. Bei
    // Massstab 1 ist der Bühnenversatz gleich dem Bildschirmversatz.
    const r = 10
    const node = { x: CENTER + 300, y: CENTER + 255 }
    const p = forgeNodeScreenPoint(node, cam(CENTER, CENTER), VIEW)
    // Vorbedingung: der Saum allein würde ihn durchlassen.
    expect(p.x + r).toBeLessThanOrEqual(VIEW.w - FORGE_SPOTLIGHT_EDGE_MARGIN_PX)
    expect(p.y + r).toBeLessThanOrEqual(VIEW.h - FORGE_SPOTLIGHT_EDGE_MARGIN_PX)
    // Vorbedingung: er liegt in der Sperrfläche.
    expect(p.x + r).toBeGreaterThan(VIEW.w - FORGE_SPOTLIGHT_COMPASS_KEEPOUT.w)
    expect(p.y + r).toBeGreaterThan(VIEW.h - FORGE_SPOTLIGHT_COMPASS_KEEPOUT.h)
    expect(forgeNodeInView(node, r, cam(CENTER, CENTER), VIEW)).toBe(false)
  })
})

describe('forgeCompassAt', () => {
  const inset = FORGE_SPOTLIGHT_COMPASS_INSET_PX

  it('liefert keinen Zeiger für die Bildmitte — dort gibt es keine Richtung', () => {
    expect(forgeCompassAt({ x: VIEW.w / 2, y: VIEW.h / 2 }, VIEW)).toBeNull()
  })

  it('liefert keinen Zeiger für einen ungemessenen Viewport', () => {
    expect(forgeCompassAt({ x: 10, y: 10 }, { w: 0, h: 0 })).toBeNull()
  })

  it('nennt die vier Himmelsrichtungen mit den erwarteten Winkeln', () => {
    const cx = VIEW.w / 2
    const cy = VIEW.h / 2
    expect(forgeCompassAt({ x: cx + 400, y: cy }, VIEW)?.angleDeg).toBeCloseTo(0)
    expect(forgeCompassAt({ x: cx, y: cy + 400 }, VIEW)?.angleDeg).toBeCloseTo(90)
    expect(forgeCompassAt({ x: cx - 400, y: cy }, VIEW)?.angleDeg).toBeCloseTo(180)
    expect(forgeCompassAt({ x: cx, y: cy - 400 }, VIEW)?.angleDeg).toBeCloseTo(-90)
  })

  it('setzt den Zeiger immer auf den eingerückten Rahmen', () => {
    const targets = [
      { x: -500, y: -900 },
      { x: 2000, y: -300 },
      { x: -800, y: 1400 },
      { x: 1200, y: 40 },
    ]
    for (const t of targets) {
      const mark = forgeCompassAt(t, VIEW)
      expect(mark).not.toBeNull()
      const onLeft = Math.abs(mark!.x - inset) < 0.001
      const onRight = Math.abs(mark!.x - (VIEW.w - inset)) < 0.001
      const onTop = Math.abs(mark!.y - inset) < 0.001
      const onBottom = Math.abs(mark!.y - (VIEW.h - inset)) < 0.001
      expect(onLeft || onRight || onTop || onBottom).toBe(true)
      expect(mark!.x).toBeGreaterThanOrEqual(0)
      expect(mark!.x).toBeLessThanOrEqual(VIEW.w)
      expect(mark!.y).toBeGreaterThanOrEqual(0)
      expect(mark!.y).toBeLessThanOrEqual(VIEW.h)
    }
  })

  it('hält seine GEDREHTEN Ecken aus der Zoom-Leiste heraus, nicht nur seinen Mittelpunkt', () => {
    // Zwei Fehler stecken hier übereinander, und beide hat erst das Nachmessen
    // im Browser gezeigt: der Kasten sitzt mit seiner MITTE auf dem gelieferten
    // Punkt, und er ist GEDREHT. Wer nur den Punkt prüft, lässt die halbe
    // Breite stehen; wer mit der halben Kante prüft, die Ecken.
    const half = forgeCompassReach()
    const diagonals = [
      { x: VIEW.w + 600, y: VIEW.h + 600 },
      { x: VIEW.w + 200, y: VIEW.h + 900 },
      { x: VIEW.w + 900, y: VIEW.h + 200 },
      { x: VIEW.w + 40, y: VIEW.h + 40 },
    ]
    for (const d of diagonals) {
      const mark = forgeCompassAt(d, VIEW)
      expect(mark).not.toBeNull()
      const right = mark!.x + half
      const bottom = mark!.y + half
      const inKeepout =
        right > VIEW.w - FORGE_SPOTLIGHT_COMPASS_KEEPOUT.w &&
        bottom > VIEW.h - FORGE_SPOTLIGHT_COMPASS_KEEPOUT.h
      expect(inKeepout).toBe(false)
    }
  })

  it('hält auch seine gedrehten Ecken innerhalb des Viewports', () => {
    const half = forgeCompassReach()
    const targets = [
      { x: -900, y: -900 },
      { x: 3000, y: -400 },
      { x: -700, y: 2200 },
      { x: 2600, y: 2600 },
      { x: 1400, y: 305 },
    ]
    for (const t of targets) {
      const mark = forgeCompassAt(t, VIEW)
      expect(mark).not.toBeNull()
      expect(mark!.x - half).toBeGreaterThanOrEqual(0)
      expect(mark!.y - half).toBeGreaterThanOrEqual(0)
      expect(mark!.x + half).toBeLessThanOrEqual(VIEW.w)
      expect(mark!.y + half).toBeLessThanOrEqual(VIEW.h)
    }
  })
})

describe('forgeRowInView', () => {
  it('führt eine ganz sichtbare Zeile als drin', () => {
    expect(forgeRowInView(120, 180, 100, 500)).toBe(true)
  })

  it('führt eine oben angeschnittene Zeile als draussen', () => {
    expect(forgeRowInView(80, 180, 100, 500)).toBe(false)
  })

  it('führt eine unten angeschnittene Zeile als draussen', () => {
    expect(forgeRowInView(460, 540, 100, 500)).toBe(false)
  })

  it('führt eine Zeile, die höher ist als ihr Kasten, als draussen', () => {
    expect(forgeRowInView(90, 600, 100, 500)).toBe(false)
  })

  it('führt eine bündig anliegende Zeile als drin — kein eigener Saum', () => {
    expect(forgeRowInView(100, 500, 100, 500)).toBe(true)
  })
})
