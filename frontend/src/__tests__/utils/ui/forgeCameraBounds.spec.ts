import { describe, it, expect } from 'vitest'
import { forgeSeatTier } from '@/config/progression/forgeSeats'
import { forgeContentBounds, forgeTreePlacements } from '@/utils/ui/forgeTreeLayout'
import {
  forgeClampPan,
  forgeClampPanBox,
  forgeCameraHome,
  forgeFitScale,
  forgeGroupCamera,
  forgeNodeScreenRadius,
  forgePanLimit,
} from '@/utils/ui/forgeCameraBounds'
import { getForgeConstellation } from '@/config/progression/starForge'
import { forgeNodeInView, forgeNodeScreenPoint } from '@/utils/ui/forgeSpotlightView'
import {
  FORGE_CONTENT_SEAM_PX,
  FORGE_NODE_DIAMETER,
  FORGE_SPOTLIGHT_EDGE_MARGIN_PX,
  FORGE_STAGE_SIZE,
  FORGE_TREE_FIT_PADDING_PX,
  FORGE_TREE_ZOOM_FLOOR,
  FORGE_MASS_SEND_NODE,
  FORGE_TREE_ZOOM_MAX,
} from '@/config/constants'

/**
 * Die GRENZEN der Baum-Kamera — wie weit gefahren und wie weit herausgezoomt
 * werden darf.
 *
 * Bis zum Umbau war die Antwort auf beides `FORGE_STAGE_SIZE`, also ein
 * abstraktes Quadrat von 2000 px. Der Baum liegt darin aber als SCHEIBE: er
 * reicht bis r = 833, die Bühnenkante liegt bei 1000 und ihre Ecke bei 1414.
 * Eine halbe Bildbreite jenseits des letzten Knotens war erreichbar, und dort
 * stand nichts.
 *
 * Zwei Zusagen tragen diese Datei, und die zweite ist die schwierigere:
 *
 *   1. **Nicht über den äussersten Knoten hinaus** — weder rechteckig noch in
 *      die Diagonale.
 *   2. **Trotzdem bleibt JEDER Knoten vollständig erreichbar.** Eine Klemmung,
 *      die den Rand des Netzes unerreichbar macht, wäre schlimmer als gar keine:
 *      die Kamerafahrt zur Anheftung liefe ins Leere und der Rand-Kompass zeigte
 *      für immer auf ein Ziel, das nie ankommt.
 *
 * Die Viewport-Masse sind GEMESSEN, nicht geraten: Playwright, Bard-Profil →
 * Shop-Tab, `.tree-viewport.getBoundingClientRect()` bei den beiden
 * Desktop-Referenzauflösungen aus CLAUDE.md.
 */

const HALF = FORGE_STAGE_SIZE / 2

/** Gemessen am 19.08.2026, Sonnenphase 5, voll aufgespannter Baum. */
const VIEWS = [
  { name: 'Full HD 1920x1080', w: 741, h: 720 },
  { name: 'QHD 2560x1440', w: 1100, h: 994 },
]

function zoomFloorFor(view: { w: number; h: number }): number {
  return Math.max(FORGE_TREE_ZOOM_FLOOR, Math.min(1, forgeFitScale(view)))
}

describe('Star Forge — die Grenzen der Kamera', () => {
  it('die Inhalts-Huelle fasst jeden Knoten und ist enger als die Buehne', () => {
    const b = forgeContentBounds()
    const places = forgeTreePlacements()

    for (const [id, at] of places) {
      const r = FORGE_NODE_DIAMETER[forgeSeatTier(id)] / 2
      expect(at.x - r, `${id} ragt links aus der Huelle`).toBeGreaterThanOrEqual(b.minX - 0.01)
      expect(at.x + r, `${id} ragt rechts aus der Huelle`).toBeLessThanOrEqual(b.maxX + 0.01)
      expect(at.y - r, `${id} ragt oben aus der Huelle`).toBeGreaterThanOrEqual(b.minY - 0.01)
      expect(at.y + r, `${id} ragt unten aus der Huelle`).toBeLessThanOrEqual(b.maxY + 0.01)
      expect(
        Math.hypot(at.x - b.centerX, at.y - b.centerY) + r,
        `${id} ragt aus der Inhalts-Scheibe`,
      ).toBeLessThanOrEqual(b.radius + 0.01)
    }

    // Gemessen: halfW 1273,9 · halfH 1353,5 · radius 1593,9 gegen 1700
    // Buehnenhalb (davor 788,3 · 816,8 · 847,6 gegen 1000 — The Wandering hat die
    // Huelle rund verdoppelt, und die Buehne ist ihr gefolgt).
    //
    // Die Huellenmitte liegt seither auch in x neben der Buehnenmitte: fuenf
    // Spuren bilden ein Fuenfeck, und ein Fuenfeck hat keine zentrierte
    // Huellbox. Gemessen 1544,5 gegen 1700 — rund 155 px, und weil die Sonne
    // auf der BUEHNENmitte sitzt, war das der Versatz, mit dem sie aus der
    // Bildmitte rutschte. Der Anker haengt deshalb an 1700, nicht an ihr.
    // Bricht das hier, ist der Baum gewachsen — dann sind die Zahlen in den
    // Kommentaren von `FORGE_CONTENT_SEAM_PX` und `forgeCameraBounds.ts` fällig.
    expect(b.radius, `Inhaltsradius ${b.radius.toFixed(1)}`).toBeLessThan(HALF)
    expect(b.halfW, `halfW ${b.halfW.toFixed(1)}`).toBeLessThan(HALF)
    expect(b.halfH, `halfH ${b.halfH.toFixed(1)}`).toBeLessThan(HALF)
    // Die Huellenmitte ist NICHT die Buehnenmitte — sie ist der Grund fuer die
    // GEWACHSENEN Halbmasse der Kamera, nicht mehr ihr Ankerpunkt.
    expect(Math.abs(b.centerY - HALF), 'Hoehenversatz der Huelle').toBeGreaterThan(10)
    expect(Math.abs(b.centerX - HALF), 'Breitenversatz der Huelle').toBeGreaterThan(10)
    // In der BREITE zahlt der Buehnenanker den Versatz drauf — in der SCHEIBE
    // bekommt er ihn zurueck: das Netz liegt radial um die Sonne, also ist die
    // Buehnenmitte ihr natuerlicher Mittelpunkt und die Huellenmitte der
    // schlechtere. Gemessen 1459,8 gegen 1593,9 — die radiale Klemmung wurde
    // durch den Umbau enger, nicht weiter.
    expect(b.stageRadius, `Buehnenradius ${b.stageRadius.toFixed(1)}`).toBeLessThan(b.radius)
  })

  it('die Kamera steht zu Hause auf der SONNE', () => {
    // Der Wächter für „die Sonne steht mittig im Reiter". `.sun-wrapper` sitzt
    // in `ForgeTreePanel.vue` auf `top/left: 50 %` der `.tree-stage`, also auf
    // `FORGE_STAGE_SIZE / 2` — und `stageTransform` legt genau den Punkt `pan`
    // auf die Bildmitte. Beide Zahlen muessen dieselbe sein, sonst rutscht die
    // Leitzahl im Kern der Sonne aus der Mitte.
    const home = forgeCameraHome()
    expect(home.x, 'Kamera-Heimat x').toBe(HALF)
    expect(home.y, 'Kamera-Heimat y').toBe(HALF)
  })

  it('bei fitScale steht die Buehne still', () => {
    // Die Relation `FORGE_TREE_FIT_PADDING_PX >= FORGE_SPOTLIGHT_EDGE_MARGIN_PX`
    // als Rechnung. Wäre der Einpass-Rand kleiner als der Kantensaum, den
    // `forgePanLimit` zuschlägt, liesse sich der vollständig sichtbare Baum
    // noch verschieben — ein Zug, der nichts Neues zeigt.
    expect(FORGE_TREE_FIT_PADDING_PX).toBeGreaterThanOrEqual(FORGE_SPOTLIGHT_EDGE_MARGIN_PX)

    for (const view of VIEWS) {
      const limit = forgePanLimit(view, forgeFitScale(view))
      expect(limit.x, `${view.name}: x-Grenze bei fitScale`).toBe(0)
      expect(limit.y, `${view.name}: y-Grenze bei fitScale`).toBe(0)
    }
  })

  it('ganz herausgezoomt steht der Baum zentriert', () => {
    for (const view of VIEWS) {
      const s = zoomFloorFor(view)
      for (const pan of [
        { x: 0, y: 0 },
        { x: FORGE_STAGE_SIZE, y: FORGE_STAGE_SIZE },
        { x: HALF, y: 0 },
      ]) {
        const out = forgeClampPan(pan, view, s)
        const c = forgeCameraHome()
        expect(out.x, `${view.name}: x wandert am Zoomboden`).toBeCloseTo(c.x, 6)
        expect(out.y, `${view.name}: y wandert am Zoomboden`).toBeCloseTo(c.y, 6)
      }
    }
  })

  it('jeder Knoten laesst sich vollstaendig ins Bild holen', () => {
    // DIE Zusage dieses Umbaus, und die einzige, die er brechen könnte.
    //
    // `pan = node` ist genau das, was die Kamerafahrt tut (Anheftung und
    // Listen-Hover in `ForgeTreePanel.vue`). Bleibt der Knoten danach
    // angeschnitten, zählt `forgeNodeInView` ihn als nicht gesehen, die Fahrt
    // gilt als nicht angekommen und der Rand-Kompass erlischt nie.
    //
    // Woran es hängt: nach der Klemmung ist der Restabstand in Bühnen-Pixeln um
    // `Knotenradius + FORGE_CONTENT_SEAM_PX` kleiner als die halbe Sichtweite,
    // und der Knoten misst auf dem Schirm `(d/2 + 4) · 1,22`. Ein Saum von 12
    // trüge das gerade eben (1,8 px Rest), 24 mit Reserve.
    //
    // Dass die radiale Klemmung davon NICHTS frisst, hängt allein an ihrer
    // Reihenfolge — vertauscht fiel `undyingWrath` hier um 5,5 px heraus.
    //
    // Die kleinste verbleibende Reserve wird MITGEMESSEN statt nur bestanden —
    // sie ist die Zahl, an der man sieht, wie viel Luft noch da ist.
    const places = forgeTreePlacements()
    let slimmest = Infinity
    let slimmestWhere = ''
    for (const view of VIEWS) {
      for (const zoom of [zoomFloorFor(view), 1, FORGE_TREE_ZOOM_MAX]) {
        for (const [id, at] of places) {
          const pan = forgeClampPan({ x: at.x, y: at.y }, view, zoom)
          const cam = { panX: pan.x, panY: pan.y, scale: zoom }
          const radiusPx = forgeNodeScreenRadius(forgeSeatTier(id), zoom)
          expect(
            forgeNodeInView(at, radiusPx, cam, view),
            `${id} bleibt bei ${view.name} / Zoom ${zoom.toFixed(2)} ausserhalb`,
          ).toBe(true)

          const p = forgeNodeScreenPoint(at, cam, view)
          const m = FORGE_SPOTLIGHT_EDGE_MARGIN_PX
          const slack = Math.min(
            p.x - radiusPx - m,
            view.w - m - p.x - radiusPx,
            p.y - radiusPx - m,
            view.h - m - p.y - radiusPx,
          )
          if (slack < slimmest) {
            slimmest = slack
            slimmestWhere = `${id} @ ${view.name} / Zoom ${zoom.toFixed(2)}`
          }
        }
      }
    }
    // Gemessen: 13,8 px bei `worldsBounty` (Full HD, Zoom 1) — einem der äussersten
    // Knoten des Netzes. Fällt die Zahl gegen null, ist `FORGE_CONTENT_SEAM_PX`
    // zu klein geworden, weil der Baum gewachsen ist.
    expect(
      slimmest,
      `engste Stelle nur ${slimmest.toFixed(1)} px: ${slimmestWhere}`,
    ).toBeGreaterThan(4)
  })

  it('die radiale Klemmung schneidet nur die Ecken', () => {
    // Sie darf enger sein als das Rechteck, aber nie auf den ACHSEN — dort
    // liegt das Netz am weitesten aussen, und dort muss man hinkommen.
    for (const view of VIEWS) {
      for (const zoom of [zoomFloorFor(view), 1, FORGE_TREE_ZOOM_MAX]) {
        const c = forgeCameraHome()
        for (let dx = -1200; dx <= 1200; dx += 100) {
          for (let dy = -1200; dy <= 1200; dy += 100) {
            const pan = { x: c.x + dx, y: c.y + dy }
            const box = forgeClampPanBox(pan, view, zoom)
            const disc = forgeClampPan(pan, view, zoom)
            const rBox = Math.hypot(box.x - c.x, box.y - c.y)
            const rDisc = Math.hypot(disc.x - c.x, disc.y - c.y)
            expect(
              rDisc,
              `${view.name}/${zoom.toFixed(2)}: radial weiter als Rechteck bei (${dx}, ${dy})`,
            ).toBeLessThanOrEqual(rBox + 1e-9)
            if (dx === 0 || dy === 0) {
              expect(
                rDisc,
                `${view.name}/${zoom.toFixed(2)}: radial klemmt auf der Achse bei (${dx}, ${dy})`,
              ).toBeCloseTo(rBox, 6)
            }
          }
        }
      }
    }
  })

  it('die Klemmung laesst den Ausschnitt nicht ueber die Huelle hinaus', () => {
    // Die Zusage in ihrer wörtlichen Form: die Bildkante endet am Netz. Geprüft
    // wird der am weitesten aussen liegende Punkt des Ausschnitts gegen die
    // Hülle plus Saum plus Kantensaum — mehr darf nirgends sichtbar werden.
    //
    // Gemessen wird von der BUEHNENmitte aus, weil die Kamera dort verankert
    // ist: `halfW` der Huelle taugt dafuer nicht, es gilt die groessere der
    // beiden Haelften (`forgeCameraBounds.reach()` rechnet genauso).
    const b = forgeContentBounds()
    const stageHalfW = Math.max(HALF - b.minX, b.maxX - HALF)
    const stageHalfH = Math.max(HALF - b.minY, b.maxY - HALF)
    for (const view of VIEWS) {
      for (const zoom of [zoomFloorFor(view), 1, FORGE_TREE_ZOOM_MAX]) {
        const margin = FORGE_SPOTLIGHT_EDGE_MARGIN_PX / zoom
        for (const dir of [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ]) {
          const c = forgeCameraHome()
          const pan = forgeClampPan({ x: c.x + dir.x * 5000, y: c.y + dir.y * 5000 }, view, zoom)
          const edgeX = Math.abs(pan.x - c.x) + view.w / 2 / zoom
          const edgeY = Math.abs(pan.y - c.y) + view.h / 2 / zoom
          const reachX = stageHalfW + FORGE_CONTENT_SEAM_PX + margin
          const reachY = stageHalfH + FORGE_CONTENT_SEAM_PX + margin
          expect(
            edgeX,
            `${view.name}/${zoom.toFixed(2)}: Bildkante ${edgeX.toFixed(0)} ueber x-Huelle`,
          ).toBeLessThanOrEqual(Math.max(reachX, view.w / 2 / zoom) + 0.01)
          expect(
            edgeY,
            `${view.name}/${zoom.toFixed(2)}: Bildkante ${edgeY.toFixed(0)} ueber y-Huelle`,
          ).toBeLessThanOrEqual(Math.max(reachY, view.h / 2 / zoom) + 0.01)
        }
      }
    }
  })

  it('die Huelle wuerfelt nicht', () => {
    const a = forgeContentBounds()
    const b = forgeContentBounds()
    expect(b).toEqual(a)
  })
})

/**
 * Die GRUPPEN-Kamera — „fasse diese Punkte", nicht „fasse alles".
 *
 * Sie ist nötig geworden, weil nicht jedes Sprungziel einen Sitz im Netz hat:
 * eine Konstellation steht in keinem Cluster, `panToFocus()` bricht bei ihrer Id
 * ab. Zeigen lässt sie sich über ihre BEDINGUNGS-Knoten — und die Zusage lautet,
 * dass danach ALLE davon im Bild stehen. Nur die trägt den Sprung; eine Kamera,
 * die zwei von dreien fasst, ist so gut wie keine.
 */
describe('Star Forge — die Kamera fasst eine Gruppe', () => {
  const places = forgeTreePlacements()

  /**
   * Frisch gemessen (27.08.2026, `.tree-viewport.getBoundingClientRect()`) —
   * NEBEN den Werten oben, nicht statt ihrer.
   *
   * Der Viewport ist seit der Messung von 2026-08-19 flacher geworden, und die
   * HÖHE bindet den Einpass. Eine Gruppen-Kamera, die nur gegen die alte, höhere
   * Zahl geprüft wäre, ginge auf Full HD durch und im Browser nicht.
   */
  const GROUP_VIEWS = [...VIEWS, { name: 'Full HD gemessen', w: 776, h: 661 }, { name: 'QHD gemessen', w: 1135, h: 938 }]

  /** Die Tore, die der Verfolgungs-Block der Detailspalte zeigt. */
  function pursuitMarks(id: string) {
    const def = getForgeConstellation(id)!
    return def.requires.flatMap((req) => {
      const at = places.get(req.id)
      return at ? [{ id: req.id, at, tier: forgeSeatTier(req.id) }] : []
    })
  }

  it('holt JEDES Tor der Verfolgung vollstaendig ins Bild', () => {
    // DIE Zusage. Sie bricht, sobald jemand eine Bedingung auf einen Knoten am
    // anderen Ende des Netzes legt — und dann soll sie brechen.
    const marks = pursuitMarks(FORGE_MASS_SEND_NODE)
    expect(marks.length, 'kein Tor hat einen Sitz im Netz').toBeGreaterThan(1)

    for (const view of GROUP_VIEWS) {
      const cam = forgeGroupCamera(marks, view, zoomFloorFor(view))
      expect(cam, view.name).not.toBeNull()
      const camera = { panX: cam!.pan.x, panY: cam!.pan.y, scale: cam!.scale }
      for (const mark of marks) {
        expect(
          forgeNodeInView(mark.at, forgeNodeScreenRadius(mark.tier, cam!.scale), camera, view),
          `${mark.id} steht bei ${view.name} nicht im Bild`,
        ).toBe(true)
      }
    }
  })

  it('bleibt zwischen Zoomboden und Zoomdeckel', () => {
    const marks = pursuitMarks(FORGE_MASS_SEND_NODE)
    for (const view of VIEWS) {
      const floor = zoomFloorFor(view)
      const cam = forgeGroupCamera(marks, view, floor)!
      expect(cam.scale, view.name).toBeGreaterThanOrEqual(floor)
      expect(cam.scale, view.name).toBeLessThanOrEqual(FORGE_TREE_ZOOM_MAX)
    }
  })

  it('steht schon geklemmt — die Fahrt springt nicht nach', () => {
    // Der Aufrufer gibt das Ergebnis direkt an `movePan()`, und das klemmt noch
    // einmal. Wäre die Kamera nicht idempotent, ruckte sie im ersten Frame.
    const marks = pursuitMarks(FORGE_MASS_SEND_NODE)
    for (const view of VIEWS) {
      const cam = forgeGroupCamera(marks, view, zoomFloorFor(view))!
      const again = forgeClampPan(cam.pan, view, cam.scale)
      expect(Math.hypot(again.x - cam.pan.x, again.y - cam.pan.y), view.name).toBeLessThan(0.001)
    }
  })

  it('mit EINEM Punkt ist sie die geklemmte Einzelfahrt', () => {
    const [first] = pursuitMarks(FORGE_MASS_SEND_NODE)
    for (const view of VIEWS) {
      const cam = forgeGroupCamera([first], view, zoomFloorFor(view))!
      const single = forgeClampPan({ x: first.at.x, y: first.at.y }, view, cam.scale)
      expect(Math.hypot(cam.pan.x - single.x, cam.pan.y - single.y), view.name).toBeLessThan(0.001)
    }
  })

  it('ohne Punkte und ohne Viewport gibt es keine Kamera', () => {
    const marks = pursuitMarks(FORGE_MASS_SEND_NODE)
    expect(forgeGroupCamera([], VIEWS[0], 1)).toBeNull()
    expect(forgeGroupCamera(marks, { w: 0, h: 720 }, 1)).toBeNull()
    expect(forgeGroupCamera(marks, { w: 741, h: 0 }, 1)).toBeNull()
  })
})
