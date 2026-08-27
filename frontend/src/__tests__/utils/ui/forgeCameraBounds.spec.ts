import { describe, it, expect } from 'vitest'
import { forgeSeatTier } from '@/config/progression/forgeSeats'
import { forgeContentBounds, forgeTreePlacements } from '@/utils/ui/forgeTreeLayout'
import {
  forgeClampPan,
  forgeClampPanBox,
  forgeCameraHome,
  forgeFitScale,
  forgeNodeScreenRadius,
  forgePanLimit,
} from '@/utils/ui/forgeCameraBounds'
import { forgeNodeInView, forgeNodeScreenPoint } from '@/utils/ui/forgeSpotlightView'
import {
  FORGE_CONTENT_SEAM_PX,
  FORGE_NODE_DIAMETER,
  FORGE_SPOTLIGHT_EDGE_MARGIN_PX,
  FORGE_STAGE_SIZE,
  FORGE_TREE_FIT_PADDING_PX,
  FORGE_TREE_ZOOM_FLOOR,
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
