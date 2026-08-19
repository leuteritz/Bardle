import {
  FORGE_SPOTLIGHT_COMPASS_INSET_PX,
  FORGE_SPOTLIGHT_COMPASS_KEEPOUT,
  FORGE_SPOTLIGHT_COMPASS_SIZE_PX,
  FORGE_SPOTLIGHT_EDGE_MARGIN_PX,
} from '@/config/constants'

/**
 * Liegt das Gemeinte im Bild — und wenn nicht, in welcher Richtung?
 *
 * Eine eigene Datei neben `forgeTreeLayout.ts`, obwohl beide über dieselben
 * Punkte reden. Der Unterschied ist die LEBENSDAUER: dort steht, WO ein Knoten
 * steht — einmal gerechnet, modulweit gecacht, für den Rest der Sitzung wahr.
 * Hier steht, was die Kamera davon gerade sieht, und das ändert sich mit jeder
 * Geste. Zwei Lebensdauern in einer Datei laufen bei der nächsten Änderung
 * auseinander.
 *
 * Kein Vue, kein DOM, kein Store — reine Rechnung, und deshalb prüfbar
 * (`__tests__/utils/ui/forgeSpotlightView.spec.ts`). Das ist der eigentliche
 * Grund für die Auslagerung: dieselbe Logik in `ForgeTreePanel.vue` wäre in
 * diesem Projekt untestbar, es gibt keine Komponententests.
 */

/** Der Kamerazustand der Baumbühne: Bildmittelpunkt in BÜHNEN-Koordinaten
 *  plus der wirksame Massstab. */
export interface ForgeCamera {
  panX: number
  panY: number
  scale: number
}

/** Die Innenmasse des Viewports in Bildschirm-Pixeln. */
export interface ForgeViewBox {
  w: number
  h: number
}

export interface ForgeStagePoint {
  x: number
  y: number
}

/** Wo der Kompass sitzt und wohin er zeigt. `angleDeg` ist mathematisch
 *  gemessen: 0° nach rechts, 90° nach unten (Bildschirmachsen). */
export interface ForgeCompassMark {
  x: number
  y: number
  angleDeg: number
}

/**
 * Ein Bühnenpunkt in Viewport-Koordinaten.
 *
 * Hergeleitet aus `stageTransform` in `ForgeTreePanel.vue` — die Bühne sitzt auf
 * `top: 50%; left: 50%` und trägt
 * `translate(dx, dy) translate(-50%, -50%) scale(s)` mit `dx = (S/2 - panX)·s`.
 * Setzt man beides zusammen, fällt die Bühnengrösse `S` VOLLSTÄNDIG heraus:
 *
 *     screenX = view.w / 2 + (node.x - panX) · scale
 *
 * Dass sie sich herauskürzt, ist kein Zufall, sondern die Aussage der Formel —
 * `pan` IST der Bildmittelpunkt. Eine Fassung, in der `FORGE_STAGE_SIZE`
 * vorkommt, hat sich verrechnet; die Spec prüft genau das.
 */
export function forgeNodeScreenPoint(
  node: ForgeStagePoint,
  cam: ForgeCamera,
  view: ForgeViewBox,
): ForgeStagePoint {
  return {
    x: view.w / 2 + (node.x - cam.panX) * cam.scale,
    y: view.h / 2 + (node.y - cam.panY) * cam.scale,
  }
}

/**
 * Steht der Knoten GANZ im freien Bild?
 *
 * `radiusPx` ist sein halber Durchmesser auf dem Schirm, einschliesslich
 * Spotlight-Vergrösserung und Ringüberstand — die Aufrufseite kennt seine
 * Grössenklasse, diese Rechnung nicht.
 *
 * Zwei Dinge machen die Antwort strenger, als sie aussieht. Erstens der Saum
 * (`FORGE_SPOTLIGHT_EDGE_MARGIN_PX`): ein angeschnittener Knoten zählt als
 * nicht gesehen. Zweitens die Zoom-Leiste unten rechts — was hinter ihr liegt,
 * ist verdeckt, und Verdecktes ist für den Spieler nicht vorhanden.
 *
 * Ein noch nicht vermessener Viewport meldet WAHR. Der `ResizeObserver` füllt
 * `viewportSize` erst nach dem Mount; ohne diesen Fall führe der erste Hover
 * nach dem Öffnen des Tabs blind ins Leere.
 */
export function forgeNodeInView(
  node: ForgeStagePoint,
  radiusPx: number,
  cam: ForgeCamera,
  view: ForgeViewBox,
): boolean {
  if (view.w <= 0 || view.h <= 0) return true

  const p = forgeNodeScreenPoint(node, cam, view)
  const m = FORGE_SPOTLIGHT_EDGE_MARGIN_PX

  const inBox =
    p.x - radiusPx >= m &&
    p.x + radiusPx <= view.w - m &&
    p.y - radiusPx >= m &&
    p.y + radiusPx <= view.h - m
  if (!inBox) return false

  const underBar =
    p.x + radiusPx > view.w - FORGE_SPOTLIGHT_COMPASS_KEEPOUT.w &&
    p.y + radiusPx > view.h - FORGE_SPOTLIGHT_COMPASS_KEEPOUT.h
  return !underBar
}

/**
 * Wo an der Viewport-Kante der Zeiger auf einen Punkt ausserhalb sitzt.
 *
 * Ein Strahl von der Bildmitte zum Ziel, geschnitten mit dem um
 * `FORGE_SPOTLIGHT_COMPASS_INSET_PX` eingerückten Rechteck. Der Schnitt ist der
 * KLEINERE der beiden Streckfaktoren — er trifft die Kante, die zuerst kommt;
 * der grössere läge auf der Verlängerung ausserhalb.
 *
 * Danach dieselbe Sperrfläche wie in `forgeNodeInView`: landete der Zeiger auf
 * der Zoom-Leiste, wiese er hinter ein undurchsichtiges Bedienelement. Er weicht
 * über die Achse mit dem KÜRZEREN Weg aus, damit die Richtung, die er meint, so
 * wenig wie möglich verfälscht wird.
 *
 * `null` heisst „kein Zeiger nötig": kein vermessener Viewport, oder das Ziel
 * liegt auf der Bildmitte und hat damit keine Richtung.
 */
/**
 * Wie weit der Kompass von seinem Mittelpunkt nach aussen reicht.
 *
 * Die halbe DIAGONALE, weil er gedreht ist — die halbe Kante gälte nur für ein
 * achsenparalleles Kästchen, und der Zeiger ist nie achsenparallel ausser bei
 * exakt vier Winkeln. Eine eigene Funktion, damit die Spec dieselbe Zahl
 * benutzt wie die Klemmung.
 */
export function forgeCompassReach(): number {
  return (FORGE_SPOTLIGHT_COMPASS_SIZE_PX * Math.SQRT2) / 2
}

export function forgeCompassAt(at: ForgeStagePoint, view: ForgeViewBox): ForgeCompassMark | null {
  if (view.w <= 0 || view.h <= 0) return null

  const cx = view.w / 2
  const cy = view.h / 2
  const dx = at.x - cx
  const dy = at.y - cy
  if (Math.hypot(dx, dy) < 1) return null

  const inset = FORGE_SPOTLIGHT_COMPASS_INSET_PX
  const halfW = Math.max(1, cx - inset)
  const halfH = Math.max(1, cy - inset)
  const t = Math.min(
    dx === 0 ? Infinity : halfW / Math.abs(dx),
    dy === 0 ? Infinity : halfH / Math.abs(dy),
  )

  let x = cx + dx * t
  let y = cy + dy * t

  // Der Kompass sitzt MIT SEINER MITTE auf diesem Punkt (`translate(-50%,-50%)`),
  // die Sperrfläche zählt aber ab seiner äussersten Ecke — und er ist GEDREHT.
  // Deshalb die halbe DIAGONALE und nicht die halbe Kante: bei 45° stehen die
  // Ecken um 22,6 statt 16 px ab. Beides zusammen (Mittelpunkt statt Kante,
  // Kante statt Diagonale) liess ihn beim Nachmessen 6 px über der Zoom-Leiste
  // stehen, und im Bild war davon nichts zu sehen.
  const reach = forgeCompassReach()
  const kw = FORGE_SPOTLIGHT_COMPASS_KEEPOUT.w + reach
  const kh = FORGE_SPOTLIGHT_COMPASS_KEEPOUT.h + reach
  if (x > view.w - kw && y > view.h - kh) {
    if (view.w - x < view.h - y) y = view.h - kh
    else x = view.w - kw
  }

  return { x, y, angleDeg: (Math.atan2(dy, dx) * 180) / Math.PI }
}

/**
 * Steht die Zeile ganz in ihrem Rollkasten?
 *
 * OHNE Saum, und das ist Absicht: die Frage wird gestellt, um zu wissen, ob
 * `scrollIntoView({ block: 'nearest' })` gleich etwas tun wird — und das rechnet
 * genau so. Ein eigener Saum wäre eine zweite Meinung neben der des Browsers,
 * und die beiden lägen bei jeder halben Zeile auseinander.
 *
 * Eine Zeile, die höher ist als ihr Kasten, gilt als draussen. Auch dort bewegt
 * `nearest` etwas, und die Antwort bleibt damit ehrlich.
 */
export function forgeRowInView(
  rowTop: number,
  rowBottom: number,
  boxTop: number,
  boxBottom: number,
): boolean {
  return rowTop >= boxTop && rowBottom <= boxBottom
}
