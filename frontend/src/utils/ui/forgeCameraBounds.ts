import {
  FORGE_CONTENT_SEAM_PX,
  FORGE_TREE_ZOOM_MAX,
  FORGE_NODE_DIAMETER,
  FORGE_SPOTLIGHT_EDGE_MARGIN_PX,
  FORGE_SPOTLIGHT_NODE_SCALE,
  FORGE_SPOTLIGHT_RING_INSET_PX,
  FORGE_STAGE_SIZE,
  FORGE_TREE_FIT_PADDING_PX,
  FORGE_TREE_ZOOM_FLOOR,
} from '@/config/constants'
import { forgeContentBounds, type Point } from '@/utils/ui/forgeTreeLayout'
import type { ForgeViewBox } from '@/utils/ui/forgeSpotlightView'
import type { ForgeUpgradeTier } from '@/types'

/**
 * Wie weit die Kamera der Baumbühne fahren darf — und ab welchem Zoom alles im
 * Bild ist.
 *
 * Bis hierher rechnete beides gegen `FORGE_STAGE_SIZE`, also gegen ein
 * abstraktes Quadrat von 2000 px. Der Baum liegt darin aber als SCHEIBE:
 * gemessen reicht er bis r = 833, die Bühnenkante liegt bei 1000, ihre Ecke bei
 * 1414. Man konnte also eine halbe Bildbreite über den letzten Knoten
 * hinausfahren und stand vor Nichts. Hier steht, was stattdessen gilt.
 *
 * Zwei Fragen, zwei Antworten: der ANKER ist die Bühnenmitte (dort steht die
 * Sonne), die AUSDEHNUNG kommt aus den gemessenen Knotenrändern. Siehe `reach()`.
 *
 * Eigene Datei und nicht in `ForgeTreePanel.vue`: es gibt in diesem Projekt
 * keine Komponententests, und genau diese Rechnung will man prüfen können
 * (`__tests__/utils/ui/forgeCameraBounds.spec.ts`) — dieselbe Begründung wie bei
 * `forgeSpotlightView.ts`.
 *
 * Und auch nicht IN `forgeSpotlightView.ts`: dort steht ausdrücklich, dass die
 * Datei die Bühnengrösse nicht kennt, weil sie sich aus ihrer Herleitung
 * herauskürzt, und eine Spec bindet das. Die Klemmung kennt sie zwangsläufig —
 * sie ist die einzige Stelle, an der Bühne und Inhalt aufeinandertreffen.
 */

interface Reach {
  cx: number
  cy: number
  halfW: number
  halfH: number
  radius: number
}

const STAGE_HALF = FORGE_STAGE_SIZE / 2

/** Inhalt plus Saum — einmal gerechnet wie die Hülle selbst. */
let reachCache: Reach | null = null

/**
 * Der Ankerpunkt ist die BÜHNENMITTE — dort steht die Sonne.
 *
 * Hier stand die Mitte der Knoten-HÜLLE, und das war einmal der bessere Handel:
 * um sie herum ist der Rand auf allen vier Seiten derselbe, während die
 * Bühnenmitte oben ein leeres Band einhandelt (gemessen 109 gegen 46 px). Der
 * Preis war ein Sonnenversatz von 26 px.
 *
 * The Wandering hat den Preis vervielfacht. Fünf Spuren bilden ein FÜNFECK, und
 * ein Fünfeck hat keine zentrierte Hüllbox: gemessen liegt `centerX` bei 1544,5
 * gegen 1700 — bei Standardzoom 155 Bildschirm-Pixel, um die die Sonne samt
 * ihrer Leitzahl aus der Bildmitte rutschte. Das ist keine Feinheit mehr,
 * sondern das Auffälligste am ganzen Reiter.
 *
 * Umgedreht kostet es fast nichts. Das RECHTECK zahlt drauf, weil die grössere
 * der beiden Hälften gilt (`halfW` 1273,9 → 1429,4; `halfH` 1353,5 → 1378,4) —
 * auf beiden Referenzauflösungen bindet aber die HÖHE den Einpass, der Zoomboden
 * fällt also nur um rund 3,7 % (Full HD 0,2305 → 0,2219, QHD 0,3317 → 0,3202).
 * Die SCHEIBE gewinnt sogar: das Netz liegt radial um die Sonne, ihr Mittelpunkt
 * ist damit der bessere — `stageRadius` misst 1459,8 gegen 1593,9.
 */
function reach(): Reach {
  if (reachCache !== null) return reachCache
  const bounds = forgeContentBounds()
  reachCache = {
    cx: STAGE_HALF,
    cy: STAGE_HALF,
    halfW: Math.max(STAGE_HALF - bounds.minX, bounds.maxX - STAGE_HALF) + FORGE_CONTENT_SEAM_PX,
    halfH: Math.max(STAGE_HALF - bounds.minY, bounds.maxY - STAGE_HALF) + FORGE_CONTENT_SEAM_PX,
    radius: bounds.stageRadius + FORGE_CONTENT_SEAM_PX,
  }
  return reachCache
}

/**
 * Der Punkt, auf den die Kamera zurückfällt, wenn alles ins Bild passt — und
 * damit die Stelle, die im Bild mittig steht.
 *
 * Es ist die Bühnenmitte, also der Sitz von `.sun-wrapper`: die Sonne mit der
 * Leitzahl in ihrem Kern steht zentriert, sobald niemand geschwenkt hat.
 * `ForgeTreePanel.vue` startet `pan` hier, `recenterCamera()` fährt hierher
 * zurück, und am Zoomboden zwingt `forgePanLimit()` ohnehin hierhin.
 */
export function forgeCameraHome(): Point {
  const { cx, cy } = reach()
  return { x: cx, y: cy }
}

/**
 * Der halbe Durchmesser eines Knotens auf dem SCHIRM, samt Spotlight-Sprung und
 * Ringüberstand.
 *
 * Dieselbe Formel stand als Einzeiler in `ForgeTreePanel.vue` und war damit für
 * keine Spec erreichbar. Sie gehört hierher, weil die Zusage „jeder Knoten lässt
 * sich vollständig ins Bild holen" nur trägt, wenn Klemmung und Sichtbarkeit
 * MIT DERSELBEN Zahl rechnen.
 */
export function forgeNodeScreenRadius(tier: ForgeUpgradeTier, scale: number): number {
  const half = FORGE_NODE_DIAMETER[tier] / 2 + FORGE_SPOTLIGHT_RING_INSET_PX
  return half * FORGE_SPOTLIGHT_NODE_SCALE * scale
}

/**
 * Ab welchem Zoom der ganze INHALT ins Bild passt.
 *
 * Achsenweise, und das ist der Unterschied zur alten Fassung: die rechnete
 * `min(w, h)` gegen die quadratische Bühne, weil bei einem Quadrat beide Achsen
 * dieselbe Antwort geben. Die Inhalts-Hülle ist nicht quadratisch (gemessen
 * 1551 × 1583), also muss jede Achse ihre eigene Frage stellen.
 */
export function forgeFitScale(view: ForgeViewBox): number {
  if (view.w <= 0 || view.h <= 0) return FORGE_TREE_ZOOM_FLOOR
  const { halfW, halfH } = reach()
  const pad = FORGE_TREE_FIT_PADDING_PX * 2
  return Math.min((view.w - pad) / (halfW * 2), (view.h - pad) / (halfH * 2))
}

/**
 * Wie weit der Bildmittelpunkt von der Hüllenmitte weg darf — rechteckig.
 *
 * Der Zuschlag `FORGE_SPOTLIGHT_EDGE_MARGIN_PX / scale` ist kein Zierrat,
 * sondern die Bedingung dafür, dass die Kamerafahrt zum angehefteten Knoten ihr
 * Ziel erreicht: `forgeNodeInView()` zählt einen angeschnittenen Knoten als
 * nicht gesehen. Ohne ihn stünde der äusserste Knoten am Anschlag exakt auf der
 * Bildkante, und der Rand-Kompass zeigte für immer auf ihn.
 *
 * Passt der Inhalt ganz ins Bild, ist die Grenze null: der Baum steht zentriert
 * und lässt sich nicht verschieben. Genau richtig — es gibt nichts zu suchen.
 */
export function forgePanLimit(view: ForgeViewBox, scale: number): Point {
  const s = scale || 1
  const { halfW, halfH } = reach()
  const margin = FORGE_SPOTLIGHT_EDGE_MARGIN_PX / s
  return {
    x: Math.max(0, halfW + margin - view.w / 2 / s),
    y: Math.max(0, halfH + margin - view.h / 2 / s),
  }
}

/** Rechteck-Klemmung: der Ausschnitt bleibt in der Inhalts-BOX. */
export function forgeClampPanBox(pan: Point, view: ForgeViewBox, scale: number): Point {
  const limit = forgePanLimit(view, scale)
  const { cx, cy } = reach()
  return {
    x: Math.min(cx + limit.x, Math.max(cx - limit.x, pan.x)),
    y: Math.min(cy + limit.y, Math.max(cy - limit.y, pan.y)),
  }
}

/**
 * Die benutzte Fassung: Rechteck UND radial.
 *
 * Die Box allein lässt die vier ECKEN offen — der Baum ist rund, die Box ist
 * eckig, und in ihren Zwickeln steht nichts. Deshalb zusätzlich eine Klemmung
 * gegen die Inhalts-SCHEIBE.
 *
 * Gerechnet gegen den INKREIS des Viewports (`min(w, h) / 2`), und darin liegt
 * die ganze Entscheidung dieser Funktion:
 *
 *   • Mit der HALBDIAGONALE müsste das ganze Viewport-Rechteck in die Scheibe
 *     passen. Dann liesse sich ein Randknoten nicht mehr in die Bildmitte holen,
 *     und die Kamerafahrt zur Anheftung liefe ins Leere.
 *   • Mit dem INKREIS dürfen die vier Bildschirmecken über die Scheibe
 *     hinausragen, die Kantenmitten nicht. Weil `min(w,h)/2 ≤ w/2` und `≤ h/2`
 *     ist, ist diese Grenze auf den Achsen nie enger als die rechteckige — sie
 *     schneidet ausschliesslich die Diagonale, also genau dort, wo die Leere
 *     liegt.
 *
 * **Die Reihenfolge ist RADIAL ZUERST, und sie ist gemessen, nicht gewählt.**
 * Umgekehrt verdreht die achsenweise Klemmung die Richtung, in die danach
 * projiziert wird: der Bildmittelpunkt landet nicht mehr auf dem Strahl zum
 * gemeinten Knoten, sondern daneben, und der Restabstand wächst. Gemessen fiel
 * `undyingWrath` bei Full HD dadurch um 5,5 px aus dem Bild. Zieht die Scheibe
 * zuerst, bleibt die Richtung die des Originals, und die Box klemmt danach nur
 * noch, was wirklich über die Kante steht.
 */
export function forgeClampPan(pan: Point, view: ForgeViewBox, scale: number): Point {
  const s = scale || 1
  const { cx, cy, radius } = reach()
  const max = Math.max(
    0,
    radius + FORGE_SPOTLIGHT_EDGE_MARGIN_PX / s - Math.min(view.w, view.h) / 2 / s,
  )
  const dx = pan.x - cx
  const dy = pan.y - cy
  const dist = Math.hypot(dx, dy)
  const onDisc =
    dist <= max || dist === 0 ? pan : { x: cx + (dx * max) / dist, y: cy + (dy * max) / dist }
  return forgeClampPanBox(onDisc, view, scale)
}

/**
 * Welche Kamera fasst DIESE Punkte — Massstab und Bildmittelpunkt in einem.
 *
 * Nötig geworden, weil nicht jedes Sprungziel einen Sitz im Netz hat: eine
 * Konstellation steht in keinem Cluster. Zeigen lässt sie sich trotzdem, nämlich
 * über ihre Bedingungs-Knoten — und die will man dann ALLE im Bild haben, nicht
 * einen nach dem anderen. `forgeFitScale` beantwortet dieselbe Frage für den
 * ganzen Inhalt; hier ist es eine Handvoll.
 *
 * Der Radius geht bei Massstab 1 in die Hülle ein, weil Bühnen- und
 * Schirm-Pixel dort dasselbe sind. Ihn beim GEFUNDENEN Massstab zu rechnen wäre
 * ein Zirkel — er hängt an der Zahl, die erst daraus folgt.
 *
 * Am Ende dieselbe `forgeClampPan` wie jede andere Fahrt: zwei Antworten auf
 * „wie weit darf die Kamera" wären eine zu viel.
 */
/**
 * Ein Körper, den die Kamera fassen soll — Lage und BÜHNEN-Radius.
 *
 * Der Radius steht am Eintrag statt als `tier`, weil nicht jeder Körper einen
 * Sitz hat: der Ankerknoten einer Verfolgung nicht, und die Sonne schon gar
 * nicht — ihr Radius hängt an der Sonnenphase.
 */
export interface ForgeCameraMark {
  at: Point
  radius: number
}

export function forgeGroupCamera(
  marks: readonly ForgeCameraMark[],
  view: ForgeViewBox,
  zoomFloor: number,
): { pan: Point; scale: number } | null {
  if (marks.length === 0 || view.w <= 0 || view.h <= 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const mark of marks) {
    const r = mark.radius
    minX = Math.min(minX, mark.at.x - r)
    minY = Math.min(minY, mark.at.y - r)
    maxX = Math.max(maxX, mark.at.x + r)
    maxY = Math.max(maxY, mark.at.y + r)
  }

  const pad = FORGE_TREE_FIT_PADDING_PX * 2
  const boxW = Math.max(1, maxX - minX)
  const boxH = Math.max(1, maxY - minY)
  const wanted = Math.min((view.w - pad) / boxW, (view.h - pad) / boxH)
  const scale = Math.min(FORGE_TREE_ZOOM_MAX, Math.max(zoomFloor, wanted))
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }

  return { pan: forgeClampPan(center, view, scale), scale }
}

/**
 * Dieselbe Frage, aber MITTIG auf einen bestimmten Punkt: „fasse das alles, und
 * stell mir DAS in die Mitte."
 *
 * Der Unterschied zur Hüllbox-Fassung ist keine Feinheit. Wer einen Kaufweg
 * zeigt — Sonne, Kernstrahl, Zweige, Tore, Ziel —, hat eine lange, einseitige
 * Kette im Bild; ihre Hüllbox stellt die Mitte der KETTE ins Bild, und das Ziel
 * steht dann am Rand. Gemeint ist aber das Ziel.
 *
 * Geschlossene Form, kein Suchlauf: jede Marke muss auf beiden Achsen in die
 * halbe Sichtweite passen, also gilt
 * `(|Δ| + radius) · scale ≤ halbe Sichtweite − Rand`. Nach `scale` aufgelöst ist
 * das ein Minimum über Marken und Achsen.
 *
 * Am Ende dieselbe `forgeClampPan` wie jede andere Fahrt. Sie kann den
 * Fokuspunkt aus der Mitte ziehen, wenn er weiter draussen liegt als der
 * erlaubte Schwenk — das ist richtig so, die Alternative wäre ein Bild, das
 * über den Rand des Netzes hinaussieht.
 */
export function forgeGroupCameraAt(
  focus: Point,
  marks: readonly ForgeCameraMark[],
  view: ForgeViewBox,
  zoomFloor: number,
): { pan: Point; scale: number } | null {
  if (marks.length === 0 || view.w <= 0 || view.h <= 0) return null

  const halfW = view.w / 2 - FORGE_TREE_FIT_PADDING_PX
  const halfH = view.h / 2 - FORGE_TREE_FIT_PADDING_PX
  if (halfW <= 0 || halfH <= 0) return null

  let wanted = FORGE_TREE_ZOOM_MAX
  for (const mark of marks) {
    const dx = Math.abs(mark.at.x - focus.x) + mark.radius
    const dy = Math.abs(mark.at.y - focus.y) + mark.radius
    if (dx > 0) wanted = Math.min(wanted, halfW / dx)
    if (dy > 0) wanted = Math.min(wanted, halfH / dy)
  }

  const scale = Math.min(FORGE_TREE_ZOOM_MAX, Math.max(zoomFloor, wanted))
  return { pan: forgeClampPan(focus, view, scale), scale }
}
