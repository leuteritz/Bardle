import {
  FORGE_CAMERA_COMFORT_H,
  FORGE_CAMERA_COMFORT_W,
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

/** Die Kanten der Komfortzone in Viewport-Koordinaten. */
export interface ForgeComfortZone {
  left: number
  right: number
  top: number
  bottom: number
}

/**
 * Der Bereich, in dem ein Knoten als GUT ZU SEHEN gilt.
 *
 * Mittig im Bild, `FORGE_CAMERA_COMFORT_*` seiner Kantenlängen gross — und
 * zusätzlich gegen den Saum begrenzt: auf einem sehr flachen Viewport wäre die
 * anteilige Zone sonst breiter als das freie Feld, und die Nachführung schöbe
 * einen Knoten in eine Zone, die selbst schon angeschnitten ist.
 *
 * Eigene Funktion und exportiert, damit die Spec mit denselben Kanten rechnet
 * wie die Nachführung — zwei Fassungen derselben Zone liefen beim ersten
 * Feinschliff auseinander.
 */
export function forgeComfortZone(view: ForgeViewBox): ForgeComfortZone {
  const free = FORGE_SPOTLIGHT_EDGE_MARGIN_PX * 2
  const halfW = Math.min(view.w * FORGE_CAMERA_COMFORT_W, Math.max(0, view.w - free)) / 2
  const halfH = Math.min(view.h * FORGE_CAMERA_COMFORT_H, Math.max(0, view.h - free)) / 2
  const cx = view.w / 2
  const cy = view.h / 2
  return { left: cx - halfW, right: cx + halfW, top: cy - halfH, bottom: cy + halfH }
}

/**
 * Wie weit der Knoten auf EINER Achse wandern muss, damit er in die Zone passt.
 *
 * Positiv heisst nach rechts beziehungsweise nach unten. Null heisst: er steht.
 *
 * Der erste Fall ist der, den man beim Aufschreiben vergisst — ist die Zone
 * schmaler als der Knoten, gibt es keine Lage, in der er ganz hineinpasst, und
 * die beiden folgenden Zeilen schöben ihn abwechselnd an die eine und an die
 * andere Kante. Dann gilt die Mitte.
 */
function comfortShift(center: number, radius: number, lo: number, hi: number, mid: number): number {
  if (hi - lo < radius * 2) return mid - center
  if (center - radius < lo) return lo - (center - radius)
  if (center + radius > hi) return hi - (center + radius)
  return 0
}

/**
 * Wohin die Kamera fahren muss, damit der Knoten komfortabel im Bild steht —
 * oder `null`, wenn sie stehen bleiben darf.
 *
 * Das ist die dritte Antwort neben `forgeNodeInView`s Ja/Nein: **so weit wie
 * nötig.** Ein Knoten in der Zone bewegt gar nichts; einer ausserhalb wird
 * genau bis an ihre Kante geholt, nicht in die Bildmitte. Damit fährt die Bühne
 * bei einem Klick auf den Nachbarknoten nicht mehr unter dem Zeiger weg, und
 * ein Klick auf etwas am Rand reisst sie nicht quer über den Schirm.
 *
 * Gerechnet wird auf dem SCHIRM und erst am Schluss zurück in Bühnen-Pixel
 * geteilt — dieselbe Umrechnung wie im Zug an der Maus (`onPointerMove`) und
 * beim Zoom auf den Cursor (`onWheel`).
 *
 * `radiusPx` ist der halbe Durchmesser auf dem Schirm samt Spotlight-Sprung und
 * Ringüberstand, genau wie bei `forgeNodeInView` — die Aufrufseite kennt die
 * Grössenklasse, diese Rechnung nicht.
 *
 * Ein noch nicht vermessener Viewport meldet `null`: vor dem ersten Lauf des
 * `ResizeObserver` wird nicht gefahren. Dieselbe Zusage wie nebenan, nur mit
 * dem umgekehrten Vorzeichen — dort heisst „ich weiss es nicht" sichtbar, hier
 * heisst es stehenbleiben, und beides bedeutet: keine Fahrt ins Blinde.
 */
export function forgeComfortPan(
  node: ForgeStagePoint,
  radiusPx: number,
  cam: ForgeCamera,
  view: ForgeViewBox,
): ForgeStagePoint | null {
  if (view.w <= 0 || view.h <= 0) return null

  const p = forgeNodeScreenPoint(node, cam, view)
  const zone = forgeComfortZone(view)

  let dx = comfortShift(p.x, radiusPx, zone.left, zone.right, view.w / 2)
  let dy = comfortShift(p.y, radiusPx, zone.top, zone.bottom, view.h / 2)

  // Die Sperrfläche der Zoom-Leiste schlägt die Zone. Landete der Knoten nach
  // der Nachführung dahinter, wäre er verdeckt — und verdeckt ist für den
  // Spieler nicht vorhanden, während „knapp neben der Zone" nur weniger bequem
  // ist. Ausgewichen wird über die Achse mit dem KÜRZEREN Weg, damit die
  // Bewegung so wenig wie möglich von dem abweicht, was die Zone wollte;
  // dasselbe Muster wie beim Rand-Kompass.
  const barX = view.w - FORGE_SPOTLIGHT_COMPASS_KEEPOUT.w
  const barY = view.h - FORGE_SPOTLIGHT_COMPASS_KEEPOUT.h
  if (p.x + dx + radiusPx > barX && p.y + dy + radiusPx > barY) {
    const outX = barX - (p.x + dx + radiusPx)
    const outY = barY - (p.y + dy + radiusPx)
    if (Math.abs(outX) < Math.abs(outY)) dx += outX
    else dy += outY
  }

  if (dx === 0 && dy === 0) return null

  // Der Knoten wandert nach rechts, indem der Bildmittelpunkt nach LINKS geht —
  // daher das Minus.
  const s = cam.scale || 1
  return { x: cam.panX - dx / s, y: cam.panY - dy / s }
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
