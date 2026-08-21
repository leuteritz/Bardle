import { describe, expect, it } from 'vitest'
import {
  forgeComfortPan,
  forgeComfortZone,
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

/**
 * Die NACHFÜHRUNG — die dritte Antwort neben dem Ja/Nein von `forgeNodeInView`.
 *
 * Geprüft wird vor allem das, was sie von der alten Fassung unterscheidet: dass
 * sie den Knoten NICHT in die Bildmitte zieht, sondern genau bis an die Kante
 * der Komfortzone — und dass sie gar nichts tut, solange er bequem dasteht.
 */
describe('forgeComfortPan', () => {
  const ZONE = forgeComfortZone(VIEW)

  /** Wo der Knoten landet, wenn die Kamera dem Vorschlag folgt. */
  function after(node: { x: number; y: number }, pan: { x: number; y: number }, scale = 1) {
    return forgeNodeScreenPoint(node, cam(pan.x, pan.y, scale), VIEW)
  }

  it('spannt die Zone mittig auf und lässt sie nicht über den Saum hinauswachsen', () => {
    expect((ZONE.left + ZONE.right) / 2).toBeCloseTo(VIEW.w / 2)
    expect((ZONE.top + ZONE.bottom) / 2).toBeCloseTo(VIEW.h / 2)
    expect(ZONE.left).toBeGreaterThanOrEqual(FORGE_SPOTLIGHT_EDGE_MARGIN_PX)
    expect(ZONE.bottom).toBeLessThanOrEqual(VIEW.h - FORGE_SPOTLIGHT_EDGE_MARGIN_PX)
    // Und sie ist ECHT kleiner als das freie Feld — wäre sie es nicht, fiele sie
    // mit „im Bild" zusammen und die Nachführung täte nie etwas.
    expect(ZONE.right - ZONE.left).toBeLessThan(VIEW.w - FORGE_SPOTLIGHT_EDGE_MARGIN_PX * 2)
  })

  it('lässt die Bühne stehen, solange der Knoten in der Zone steht', () => {
    expect(forgeComfortPan({ x: CENTER, y: CENTER }, 30, cam(CENTER, CENTER), VIEW)).toBeNull()
  })

  it('fährt nicht ins Blinde — ungemessener Viewport heisst stehenbleiben', () => {
    expect(forgeComfortPan({ x: 0, y: 0 }, 30, cam(CENTER, CENTER), { w: 0, h: 0 })).toBeNull()
  })

  it('holt einen Knoten links draussen GENAU bis an die Zonenkante, nicht in die Mitte', () => {
    const r = 20
    // Bildschirmposition 100 — die linke Kante der Zone liegt bei 176.
    const node = { x: CENTER - 300, y: CENTER }
    const pan = forgeComfortPan(node, r, cam(CENTER, CENTER), VIEW)
    expect(pan).not.toBeNull()

    const p = after(node, pan!)
    expect(p.x - r).toBeCloseTo(ZONE.left)
    // Die Gegenprobe, und sie ist der eigentliche Inhalt dieser Spec: das alte
    // Verhalten hätte hier die Bildmitte geliefert.
    expect(p.x).not.toBeCloseTo(VIEW.w / 2)
    // Die andere Achse stand bequem und bleibt unberührt.
    expect(pan!.y).toBe(CENTER)
  })

  it('rechnet beide Achsen einzeln und jede minimal', () => {
    const r = 15
    const node = { x: CENTER + 380, y: CENTER + 260 }
    const pan = forgeComfortPan(node, r, cam(CENTER, CENTER), VIEW)
    expect(pan).not.toBeNull()

    const p = after(node, pan!)
    expect(p.x + r).toBeCloseTo(ZONE.right)
    expect(p.y + r).toBeCloseTo(ZONE.bottom)
  })

  it('zentriert einen Knoten, der gar nicht in die Zone passt', () => {
    // Ohne diesen Fall schöbe die Rechnung ihn abwechselnd an die eine und an
    // die andere Kante — es gibt keine Lage, in der er ganz hineinpasst.
    //
    // Eigener, HOHER Viewport: ein Knoten dieser Grösse berührt in der Bildmitte
    // sonst die Sperrfläche des Kamera-Docks, und deren Korrektur schöbe ihn
    // wieder aus der Mitte. Beides ist richtig, aber hier steht der Mittenfall
    // zur Prüfung — nicht sein Zusammentreffen mit dem Dock.
    const tall: ForgeViewBox = { w: 800, h: 800 }
    const zone = forgeComfortZone(tall)
    const r = 230
    expect(r * 2).toBeGreaterThan(zone.right - zone.left)
    const node = { x: CENTER + 120, y: CENTER + 90 }
    const pan = forgeComfortPan(node, r, cam(CENTER, CENTER), tall)
    expect(pan).toEqual({ x: node.x, y: node.y })
  })

  it('teilt den Bildschirmversatz durch den Massstab', () => {
    const r = 20
    // Derselbe Bildschirmpunkt wie oben (100), nur bei doppeltem Zoom: der
    // Bühnenweg ist dann halb so lang.
    const node = { x: CENTER - 150, y: CENTER }
    const pan = forgeComfortPan(node, r, cam(CENTER, CENTER, 2), VIEW)
    expect(pan).not.toBeNull()
    expect(CENTER - pan!.x).toBeCloseTo(96 / 2)
    expect(after(node, pan!, 2).x - r).toBeCloseTo(ZONE.left)
  })

  it('schiebt einen Knoten aus der Sperrfläche der Zoom-Leiste heraus', () => {
    // Auf einem schmalen Viewport reicht die Zone bis in die Ecke, in der die
    // Leiste sitzt. Verdeckt ist schlimmer als unbequem, also gewinnt sie.
    const small: ForgeViewBox = { w: 400, h: 260 }
    const zone = forgeComfortZone(small)
    expect(zone.right).toBeGreaterThan(small.w - FORGE_SPOTLIGHT_COMPASS_KEEPOUT.w)

    const r = 10
    const node = { x: CENTER + 100, y: CENTER + 65 }
    const before = forgeNodeScreenPoint(node, cam(CENTER, CENTER), small)
    // Vorbedingung: er liegt in der Sperrfläche.
    expect(before.x + r).toBeGreaterThan(small.w - FORGE_SPOTLIGHT_COMPASS_KEEPOUT.w)
    expect(before.y + r).toBeGreaterThan(small.h - FORGE_SPOTLIGHT_COMPASS_KEEPOUT.h)

    const pan = forgeComfortPan(node, r, cam(CENTER, CENTER), small)
    expect(pan).not.toBeNull()
    expect(forgeNodeInView(node, r, cam(pan!.x, pan!.y), small)).toBe(true)
  })

  it('holt jeden Knoten, den `forgeNodeInView` verwirft, in einem Zug ins Bild', () => {
    // Die Zusage, auf der die Kamera ruht: eine Fahrt, danach steht er da.
    const r = 24
    const targets = [
      { x: CENTER - 900, y: CENTER },
      { x: CENTER + 900, y: CENTER - 700 },
      { x: CENTER, y: CENTER + 800 },
      { x: CENTER + 340, y: CENTER + 250 },
    ]
    for (const node of targets) {
      expect(forgeNodeInView(node, r, cam(CENTER, CENTER), VIEW)).toBe(false)
      const pan = forgeComfortPan(node, r, cam(CENTER, CENTER), VIEW)
      expect(pan).not.toBeNull()
      expect(forgeNodeInView(node, r, cam(pan!.x, pan!.y), VIEW)).toBe(true)
    }
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
