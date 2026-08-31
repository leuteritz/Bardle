/* ── Firmament-Platte ─────────────────────────────────────────────────────────
   Die EINE Zeichenreihenfolge der Firmament-Karte. Sie zerfaellt in DREI Zuege,
   und der Schnitt ist der Grund, warum der Reiter auf Grundlast steht:

   - `paintFirmamentGround` — Grund und Sternfeld. Haengt weder an Zoom noch an
     Fahrt noch am Bestand; ein eigenes Canvas, das dabei fast nie neu malt.
   - `paintFirmamentWeb` — das Filamentgewebe des Walls, um den Mittelpunkt des
     Kontexts. Ein eigenes, quadratisches Sprite, das das CSS am Compositor
     dreht.
   - `paintFirmament` — Bahn, Ringe, Tore, Koerper. DAS ist das Standbild: es
     malt genau dann, wenn Bestand, Groesse, Pixeldichte oder Zoomstufe sich
     geaendert haben, und es malt TRANSPARENT ueber die beiden anderen.

   Es gibt in keinem der drei eine Zeit und keinen Frame. Was sich dreht, ist
   ein fertiges Sprite; was atmet — der Ring der laufenden Galaxie, der
   Auswahlring — liegt als DOM darueber und bewegt allein seine `opacity`. Der
   Entwurf hatte eine rAF-Schleife mit 520 Sternen und 220 Boegen je Frame; das
   ist genau die Art Dauerlast, gegen die `docs/performance.md` geschrieben
   ist.

   Alle festen Pixelwerte sind im Massstab `k = box.r / FIRMAMENT_PLATE_REF_R`
   gemeint, damit dieselbe Reihenfolge auf 240 px Radius traegt wie auf 900.

   Deterministisch: das Sternfeld haengt an einem uebergebenen Seed, nie an
   `Math.random()` — sonst saehe die Karte nach jedem Repaint anders aus. */

import { seededRng, minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { jitter } from '@/utils/fx/universeDisc'
import {
  FIRMAMENT_FREED_COLOR,
  FIRMAMENT_GATE_COLOR,
  FIRMAMENT_HERE_COLOR,
  FIRMAMENT_LANDFALL_COLOR,
  FIRMAMENT_LANDFALL_MAX_MARKS,
  FIRMAMENT_LANDFALL_ORBIT,
  FIRMAMENT_LANDFALL_R,
  FIRMAMENT_LOST_COLOR,
  FIRMAMENT_NODE_BODY_RATIO_MAX,
  FIRMAMENT_NODE_BODY_RATIO_MIN,
  FIRMAMENT_NODE_BODY_RX,
  FIRMAMENT_NODE_CORE_R,
  FIRMAMENT_NODE_HALO_ALPHA,
  FIRMAMENT_NODE_HALO_SPAN,
  FIRMAMENT_NODE_POOL_SPAN,
  FIRMAMENT_STAR_ARC_ALPHA,
  FIRMAMENT_STAR_ARC_LOST_ALPHA,
  FIRMAMENT_STAR_ARC_ORBIT,
  FIRMAMENT_STAR_ARC_W,
  FIRMAMENT_PLATE_REF_R,
  FIRMAMENT_ROAD_CASING_W,
  FIRMAMENT_WEB_ALPHA_IN,
  FIRMAMENT_WEB_ALPHA_OUT,
  FIRMAMENT_WEB_GLOW_ALPHA,
  FIRMAMENT_WEB_INNER,
  FIRMAMENT_WEB_LINK_SHARE,
  FIRMAMENT_WEB_RINGS,
  FIRMAMENT_WEB_SHELL_HI,
  FIRMAMENT_WEB_SHELL_JITTER,
  FIRMAMENT_WEB_SHELL_LO,
  FIRMAMENT_WEB_NODES,
  FIRMAMENT_WEB_OUTER,
  FIRMAMENT_WEB_SPARK_R,
  FIRMAMENT_WEB_SPARK_SHARE,
  FIRMAMENT_WEB_TENDRIL_FORKS,
  FIRMAMENT_WEB_TENDRIL_REACH,
  FIRMAMENT_WEB_TENDRIL_SHARE,
  FIRMAMENT_WEB_TINT_STOPS,
  FIRMAMENT_WEB_W_MAX,
  FIRMAMENT_WEB_W_MIN,
  FIRMAMENT_STAR_ALPHA_MAX,
  FIRMAMENT_STAR_ALPHA_MIN,
  FIRMAMENT_STAR_DENSITY,
  FIRMAMENT_STAR_MAX,
  FIRMAMENT_UNLIT_COLOR,
} from '@/config/constants'
import { hexToRgb } from '@/utils/ui/format'
import type { FirmamentDeparture, FirmamentFitBox, FirmamentNode } from '@/utils/ui/firmamentLayout'

/** Seed des Sternfelds. FEST, nie eine Zufallszahl — sonst saehe der Grund nach
 *  jedem Repaint anders aus. Er gehoert `paintFirmamentGround`. */

/* Die roemischen Ziffern malt die Platte NICHT. Sie haengen als DOM an den
   Knoten: dort blenden Hover und Auswahl sie per CSS ein, ohne dass die ganze
   Platte dafuer neu entstehen muss — und es gibt sie nur einmal, statt einmal
   im Canvas und einmal im Markup. */

/** Ein Punkt im Bild — die Karte rechnet einmal, Platte und Trefferflaechen
 *  lesen dasselbe Ergebnis. Zwei Rechnungen liefen auseinander. */
export function firmamentScreenPos(
  box: FirmamentFitBox,
  nx: number,
  ny: number,
): { x: number; y: number } {
  return { x: box.cx + nx * box.r, y: box.cy + ny * box.r }
}

function fade(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** Die Farbe eines Knotens: befreit und laufend tragen ihr Galaxiethema,
 *  unbeleuchtet hat keines — dort steht die gedaempfte Kante. */
function nodeColor(node: FirmamentNode): string {
  if (node.state === 'unlit' || node.themeIndex < 0) return FIRMAMENT_UNLIT_COLOR
  return `rgb(${minimapAccentForTheme(node.themeIndex)})`
}

/**
 * Grund und Sternfeld — der RAUM, nicht die Karte.
 *
 * Eigenes Canvas, eigener Schluessel: er kennt weder Zoom noch Fahrt. Im alten
 * Zuschnitt malte dieses Feld bei jedem Zoomschritt mit, obwohl sich an ihm
 * nichts aendern konnte.
 */
export function paintFirmamentGround(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
): void {
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75)
  bg.addColorStop(0, '#0a0a14')
  bg.addColorStop(0.55, '#06060c')
  bg.addColorStop(1, '#030305')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Die Dichte folgt der FLAECHE, aber gedeckelt: nach Flaeche allein ertrank
  // die Bahn auf 4K im Rauschen — dieselbe Lehre wie beim Tiefenfeld.
  const count = Math.min(FIRMAMENT_STAR_MAX, Math.round((w * h * FIRMAMENT_STAR_DENSITY) / 100000))
  const rng = seededRng(seed)
  for (let i = 0; i < count; i++) {
    const x = rng() * w
    const y = rng() * h
    const a =
      FIRMAMENT_STAR_ALPHA_MIN + rng() * (FIRMAMENT_STAR_ALPHA_MAX - FIRMAMENT_STAR_ALPHA_MIN)
    const s = rng() < 0.9 ? 0.7 : 1.4
    ctx.fillStyle = `rgba(220, 230, 255, ${a.toFixed(2)})`
    ctx.fillRect(x, y, s, s)
  }
}

/* ── Das Filamentgewebe ───────────────────────────────────────────────────────
   Der Rampenverlauf des Walls: innen tiefe Glut, aussen helles Licht. Er wird
   ueber den RADIUS gelesen, nicht gewuerfelt — darin liegt der Unterschied zu
   den vier Toenen der kleinen Scheibe (`RIM_TONES` in `universeDisc.ts`), die
   einzeln gezogen werden. Hier traegt die Farbe die Tiefe.

   Die Richtung ist nicht beliebig: der tiefe Ton gehoert der GLUT hinter dem
   Gewebe, die Filamente werden nach aussen HELLER. Andersherum verschwanden
   ausgerechnet die aeussersten Faeden — die hellsten der Vorlage — im
   dunklen Grund.

   Der TON kommt vom gezeigten Universum, die Folge bleibt. Gebaut wird die
   Rampe EINMAL am Kopf von `paintFirmamentWeb` und dann durchgereicht — vier
   Multiplikationen, und die Funktion laeuft ohnehin nur bei `rimKey`-Wechsel. */
type WebRamp = readonly (readonly [number, number, number])[]

function webRamp(tint: string): WebRamp {
  const base = hexToRgb(tint)
  return FIRMAMENT_WEB_TINT_STOPS.map((stop) => {
    const target = stop < 0 ? 0 : 255
    const f = Math.abs(stop)
    return base.map((c) => Math.round(c + (target - c) * f)) as [number, number, number]
  })
}

function webInk(ramp: WebRamp, t: number, alpha: number): string {
  const x = Math.min(0.999, Math.max(0, t)) * (ramp.length - 1)
  const i = Math.floor(x)
  const f = x - i
  const a = ramp[i]
  const b = ramp[i + 1] ?? a
  const mix = (c: 0 | 1 | 2) => Math.round(a[c] + (b[c] - a[c]) * f)
  return `rgba(${mix(0)}, ${mix(1)}, ${mix(2)}, ${alpha.toFixed(3)})`
}

/** Jeder Punkt des Gewebes liegt IM Band — auch die Kontrollpunkte.
 *
 *  Aussen ist das die Sprite-Kante: eine quadratische Kurve bleibt in der
 *  konvexen Huelle ihrer drei Punkte, also genuegt es, jeden einzelnen zu
 *  klemmen. Innen ist es die Bahn: ein Faden, der tiefer kriecht, legt sich
 *  ueber die aeussersten Knoten. */
function inBand(x: number, y: number, r: number): { x: number; y: number } {
  const d = Math.hypot(x, y)
  if (d === 0) return { x, y }
  const clamped = Math.min(r * FIRMAMENT_WEB_OUTER, Math.max(r * FIRMAMENT_WEB_INNER, d))
  const s = clamped / d
  return { x: x * s, y: y * s }
}

/** Lage im Band, 0 am Innenrand, 1 an der Kante. */
function bandT(x: number, y: number, r: number): number {
  const d = Math.hypot(x, y) / r
  return Math.min(
    1,
    Math.max(0, (d - FIRMAMENT_WEB_INNER) / (FIRMAMENT_WEB_OUTER - FIRMAMENT_WEB_INNER)),
  )
}

type WebNode = { x: number; y: number; t: number }

/** Deckkraft an einer Stelle des Bandes. */
function webAlpha(t: number): number {
  return FIRMAMENT_WEB_ALPHA_IN + (FIRMAMENT_WEB_ALPHA_OUT - FIRMAMENT_WEB_ALPHA_IN) * t
}

/** Ein Strang zwischen zwei Kreuzungen: nie gerade, der Kontrollpunkt wandert
 *  radial. Er verbindet entweder zwei Nachbarn EINER Schale oder zwei Schalen
 *  miteinander — beide Richtungen zusammen schliessen die Zellen, aus denen
 *  ein Netz besteht. Nur tangential waere es eine Zickzacklinie, nur radial
 *  ein Kamm. */
function strand(
  ctx: CanvasRenderingContext2D,
  ramp: WebRamp,
  a: WebNode,
  b: WebNode,
  r: number,
  k: number,
  rng: () => number,
  dim = 1,
): void {
  const bow = 1 + (rng() < 0.5 ? -1 : 1) * (0.008 + rng() * 0.035)
  const ctrl = inBand(((a.x + b.x) / 2) * bow, ((a.y + b.y) / 2) * bow, r)
  const t = (a.t + b.t) / 2
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.quadraticCurveTo(ctrl.x, ctrl.y, b.x, b.y)
  ctx.strokeStyle = webInk(ramp, t, webAlpha(t) * (0.55 + rng() * 0.7) * dim)
  ctx.lineWidth = (FIRMAMENT_WEB_W_MIN + (FIRMAMENT_WEB_W_MAX - FIRMAMENT_WEB_W_MIN) * t) * k
  ctx.stroke()
}

/**
 * Das Filamentgewebe des aeusseren Walls — das Ende dessen, was bekannt ist,
 * und die einzige Ebene der Kartenflaeche, die sich bewegt.
 *
 * Vier Zuege, alle aus DEMSELBEN Knotensatz: Kreuzungen, Straenge zwischen
 * ihnen, Ranken nach innen, Lichtpunkte darauf. Vorher lagen hier 190 einzelne
 * Boegen nebeneinander — kein Treffpunkt, keine Verzweigung, zwei harte Kanten.
 *
 * Gemalt wird um `cx/cy` des uebergebenen Kontexts, damit dasselbe Rezept in
 * ein eigenes quadratisches Sprite passt, dessen Mitte der Drehpunkt ist. Der
 * Seed bleibt 19.
 */
export function paintFirmamentWeb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  k: number,
  tint: string,
): void {
  const rng = seededRng(19)
  const ramp = webRamp(tint)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.lineCap = 'round'

  // Die Schalen. Aussen stehen mehr Knoten als innen — sonst waeren die Zellen
  // am Rand so breit wie die Bandbreite selbst.
  const gap = FIRMAMENT_WEB_SHELL_HI - FIRMAMENT_WEB_SHELL_LO
  const spread = (gap / Math.max(1, FIRMAMENT_WEB_RINGS - 1)) * FIRMAMENT_WEB_SHELL_JITTER
  const shells: WebNode[][] = []
  for (let s = 0; s < FIRMAMENT_WEB_RINGS; s++) {
    const u = FIRMAMENT_WEB_RINGS > 1 ? s / (FIRMAMENT_WEB_RINGS - 1) : 1
    const n = Math.round(FIRMAMENT_WEB_NODES * (0.7 + 0.5 * u))
    const step = (Math.PI * 2) / n
    const shell: WebNode[] = []
    for (let i = 0; i < n; i++) {
      const ang = i * step + (rng() - 0.5) * step * 0.9 + s * 0.37
      const rad = r * (FIRMAMENT_WEB_SHELL_LO + gap * u + (rng() - 0.5) * 2 * spread)
      const p = inBand(Math.cos(ang) * rad, Math.sin(ang) * rad, r)
      shell.push({ x: p.x, y: p.y, t: bandT(p.x, p.y, r) })
    }
    shells.push(shell)
  }

  // Tangential: der Ring jeder Schale.
  for (const shell of shells) {
    for (let i = 0; i < shell.length; i++) {
      strand(ctx, ramp, shell[i], shell[(i + 1) % shell.length], r, k, rng)
    }
  }

  // Radial: jede Schale an die naechste. Die zweite Strebe macht aus je zwei
  // Vierecken drei Zellen — ohne sie bliebe eine Leiter.
  for (let s = 0; s < shells.length - 1; s++) {
    const from = shells[s]
    const to = shells[s + 1]
    for (let i = 0; i < from.length; i++) {
      const j = Math.round((i / from.length) * to.length) % to.length
      strand(ctx, ramp, from[i], to[j], r, k, rng)
      if (rng() < FIRMAMENT_WEB_LINK_SHARE) {
        strand(ctx, ramp, from[i], to[(j + 1) % to.length], r, k, rng, 0.8)
      }
    }
  }

  // Die Ranken haengen an der INNERSTEN Schale: ein Stamm nach innen, der sich
  // einmal gabelt. Sie tragen den Saum und LOESEN ihn auf — ohne sie endete
  // das Gewebe an einer Linie.
  for (const node of shells[0]) {
    if (rng() >= FIRMAMENT_WEB_TENDRIL_SHARE) continue
    const d = Math.hypot(node.x, node.y) || 1
    // Die Laenge kommt aus dem PLATZ bis zum Innenrand, nicht aus der
    // Bandbreite: eine feste Laenge liefe bei der Haelfte der Ranken in die
    // Klemmung, und deren Spitzen laegen dann alle auf demselben Kreis — genau
    // die Kante, die der Saum aufloesen soll.
    const room = Math.max(0, d - r * FIRMAMENT_WEB_INNER)
    const len = room * FIRMAMENT_WEB_TENDRIL_REACH * (0.45 + rng() * 0.55)
    const ux = -node.x / d
    const uy = -node.y / d
    const stem = inBand(
      node.x + ux * len + -uy * (rng() - 0.5) * len,
      node.y + uy * len + ux * (rng() - 0.5) * len,
      r,
    )
    const stemT = bandT(stem.x, stem.y, r)
    ctx.beginPath()
    ctx.moveTo(node.x, node.y)
    ctx.lineTo(stem.x, stem.y)
    ctx.strokeStyle = webInk(ramp, stemT, webAlpha(stemT))
    ctx.lineWidth =
      (FIRMAMENT_WEB_W_MIN + (FIRMAMENT_WEB_W_MAX - FIRMAMENT_WEB_W_MIN) * stemT) * k * 0.8
    ctx.stroke()

    for (let f = 0; f < FIRMAMENT_WEB_TENDRIL_FORKS; f++) {
      const swing = (f - (FIRMAMENT_WEB_TENDRIL_FORKS - 1) / 2) * 0.9 + (rng() - 0.5) * 0.5
      const fl = len * (0.35 + rng() * 0.4)
      const fx = ux * Math.cos(swing) - uy * Math.sin(swing)
      const fy = ux * Math.sin(swing) + uy * Math.cos(swing)
      const tip = inBand(stem.x + fx * fl, stem.y + fy * fl, r)
      const tipT = bandT(tip.x, tip.y, r)
      ctx.beginPath()
      ctx.moveTo(stem.x, stem.y)
      ctx.lineTo(tip.x, tip.y)
      ctx.strokeStyle = webInk(ramp, tipT, webAlpha(tipT) * 0.7)
      ctx.lineWidth = FIRMAMENT_WEB_W_MIN * k
      ctx.stroke()
    }
  }

  // Die Lichtpunkte auf den Kreuzungen. Ohne sie ist ein Netz aus Haarlinien
  // nur Griess — sie sind es, die es als Gewebe lesbar machen.
  for (const shell of shells) {
    for (const node of shell) {
      if (rng() >= FIRMAMENT_WEB_SPARK_SHARE) continue
      ctx.beginPath()
      ctx.arc(node.x, node.y, FIRMAMENT_WEB_SPARK_R * k * (0.5 + rng() * 0.8), 0, Math.PI * 2)
      ctx.fillStyle = webInk(
        ramp,
        Math.min(1, node.t + 0.25),
        Math.min(0.9, webAlpha(node.t) * 1.7),
      )
      ctx.fill()
    }
  }
  ctx.restore()
}

/**
 * Die Glut und die zwei geschlossenen Ringe des Walls.
 *
 * Sie bleiben im STANDBILD. Ein rotationssymmetrischer Verlauf traegt keine
 * Drehung — im Sprite kostete er nur Flaeche, und das Sprite muesste fuer ihn
 * bis an seine Kante decken.
 */
function paintRimRings(
  ctx: CanvasRenderingContext2D,
  box: FirmamentFitBox,
  k: number,
  tint: string,
): void {
  const ramp = webRamp(tint)
  ctx.save()
  ctx.translate(box.cx, box.cy)

  // Die Glut, in der das Gewebe steht. Sie reicht so weit wie das Band selbst:
  // endete sie frueher, saessen die inneren Ranken im Dunkeln und der Saum
  // fiele wieder an einer Kante ab. Sie liest DIESELBE Rampe wie die Filamente
  // — zwei Toene nebeneinander laesen sich als zwei Ringe.
  const glow = ctx.createRadialGradient(0, 0, box.r * FIRMAMENT_WEB_INNER, 0, 0, box.r * 1.03)
  glow.addColorStop(0, webInk(ramp, 0.7, 0))
  glow.addColorStop(0.62, webInk(ramp, 0.45, FIRMAMENT_WEB_GLOW_ALPHA))
  glow.addColorStop(0.92, webInk(ramp, 0.15, FIRMAMENT_WEB_GLOW_ALPHA * 1.5))
  glow.addColorStop(1, webInk(ramp, 0, 0))
  ctx.beginPath()
  ctx.arc(0, 0, box.r * 1.03, 0, Math.PI * 2)
  ctx.fillStyle = glow
  ctx.fill()

  // Blass: sie ist die Fassung, nicht die Kante, gegen die das Gewebe stossen
  // soll. Bei Alpha 0,45 las sie sich als Rand einer Kachel.
  ctx.beginPath()
  ctx.arc(0, 0, box.r * 0.985, 0, Math.PI * 2)
  ctx.strokeStyle = webInk(ramp, 0.42, 0.22)
  ctx.lineWidth = 2 * k
  ctx.stroke()
  // Die aeussere Fassung. DUNKEL, nicht braun: bei `rgba(90, 40, 20, 0.8)` lag
  // ein holzfarbener Reifen um das Gewebe und schnitt es ab. Der Rand der
  // Vorlage ist fast schwarz — er soll das Licht der Filamente begrenzen, nicht
  // mit ihm konkurrieren.
  ctx.beginPath()
  ctx.arc(0, 0, box.r * 1.02, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(44, 17, 9, 0.88)'
  ctx.lineWidth = 8 * k
  ctx.stroke()
  ctx.restore()
}

/**
 * Ein Zug der Bahn, zweimal gestrichen: erst dunkel und breiter, dann in seiner
 * Farbe.
 *
 * Die Kontur ist keine Zier. Die Bahn laeuft durch den Kern der Heldenscheibe,
 * und Gold bei Alpha 0,45 verschwindet auf deren Galaxienfeld. Dasselbe Mittel
 * wie unter der zerbrochenen Krone der Galaxiekarte.
 */
function strokeRoad(ctx: CanvasRenderingContext2D, color: string, w: number, k: number): void {
  ctx.strokeStyle = 'rgba(4, 3, 6, 0.62)'
  ctx.lineWidth = w + FIRMAMENT_ROAD_CASING_W * k
  ctx.stroke()
  ctx.strokeStyle = color
  ctx.lineWidth = w
  ctx.stroke()
}

/** Die Bahn selbst: eine durchgezogene Linie durch alles Befreite, eine
 *  gestrichelte zur laufenden Galaxie, eine gedaempfte ins Unbeleuchtete. */
function paintRoad(
  ctx: CanvasRenderingContext2D,
  nodes: readonly FirmamentNode[],
  box: FirmamentFitBox,
  k: number,
): void {
  if (nodes.length < 1) return

  const pt = (n: FirmamentNode) => firmamentScreenPos(box, n.nx, n.ny)
  const lastFreed = nodes.reduce((acc, n, i) => (n.state === 'freed' ? i : acc), -1)
  const currentIdx = nodes.findIndex((n) => n.state === 'current')

  // Vom Ursprung durch alles Befreite.
  if (lastFreed >= 0) {
    ctx.beginPath()
    ctx.moveTo(box.cx, box.cy)
    for (let i = 0; i <= lastFreed; i++) {
      const p = pt(nodes[i])
      ctx.lineTo(p.x, p.y)
    }
    strokeRoad(ctx, fade(FIRMAMENT_FREED_COLOR, 0.45), 1.6 * k, k)
  }

  // Die Ueberfahrt: gestrichelt, weil sie noch nicht abgeschlossen ist. Das
  // Muster steht STILL — eine laufende `lineDashOffset` waere eine Frame-
  // Schleife fuer eine Auskunft, die die Marke schon traegt.
  const from = lastFreed >= 0 ? pt(nodes[lastFreed]) : { x: box.cx, y: box.cy }
  if (currentIdx >= 0) {
    const to = pt(nodes[currentIdx])
    ctx.save()
    ctx.setLineDash([5 * k, 6 * k])
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    strokeRoad(ctx, fade(FIRMAMENT_HERE_COLOR, 0.75), 1.6 * k, k)
    ctx.restore()
  }

  // Was noch kommt — dieselbe Bahn, nur kaum sichtbar.
  const tailStart = currentIdx >= 0 ? currentIdx : lastFreed
  if (tailStart >= 0 && tailStart < nodes.length - 1) {
    ctx.save()
    ctx.setLineDash([2 * k, 5 * k])
    ctx.beginPath()
    const head = pt(nodes[tailStart])
    ctx.moveTo(head.x, head.y)
    for (let i = tailStart + 1; i < nodes.length; i++) {
      const p = pt(nodes[i])
      ctx.lineTo(p.x, p.y)
    }
    strokeRoad(ctx, fade(FIRMAMENT_UNLIT_COLOR, 0.3), 1.1 * k, k)
    ctx.restore()
  }
}

/* Der Ursprung ist ENTFALLEN. An seiner Stelle steht die Heldenscheibe, und die
   bringt mit `paintCore` denselben Ort schon mit — zwei Sonnen an derselben
   Stelle waeren eine doppelte Aussage. Die Bahn setzt weiter an `box.cx/cy` an
   und endet damit im Kern der Scheibe. */

/** Das Tor am Ende der Bahn: zwei Boegen quer zu ihr, dazwischen die Ziffer.
 *  Hoechstens EINES — dorthin ging der Weg weiter. */
function paintDeparture(
  ctx: CanvasRenderingContext2D,
  departure: FirmamentDeparture,
  box: FirmamentFitBox,
  k: number,
): void {
  const p = firmamentScreenPos(box, departure.nx, departure.ny)
  const span = 9 * k
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(departure.angle)
  ctx.strokeStyle = fade(FIRMAMENT_GATE_COLOR, 0.85)
  ctx.lineWidth = 1.6 * k
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.arc(0, 0, span, side * 0.5 - Math.PI / 2, side * 0.5 + Math.PI / 2, side < 0)
    ctx.stroke()
  }
  ctx.restore()
}

/** `rgb(...)` mit Deckkraft — die Themenfarbe kommt als `rgb()`, nicht als Hex. */
function tone(color: string, alpha: number): string {
  return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
}

/**
 * Achsen und Neigung eines Knotenkoerpers.
 *
 * Aus der GALAXIENUMMER, ueber denselben Hash, aus dem die Wolke ihre Koerper
 * zieht (`jitter` in `universeDisc.ts`) — nie `Math.random()`, sonst saehe die
 * Karte nach jedem Repaint anders aus, und nie ein zweiter Generator daneben.
 */
function bodyShape(node: FirmamentNode, r: number): { rx: number; ry: number; tilt: number } {
  const rx = r * FIRMAMENT_NODE_BODY_RX
  const ratio =
    FIRMAMENT_NODE_BODY_RATIO_MIN +
    jitter(node.galaxy, 17) * (FIRMAMENT_NODE_BODY_RATIO_MAX - FIRMAMENT_NODE_BODY_RATIO_MIN)
  return { rx, ry: rx * ratio, tilt: jitter(node.galaxy, 29) * Math.PI }
}

/**
 * Ein Knoten: Teich, Schein, Koerper, Kern, Sternbogen, Ortsrauten — alles
 * statisch.
 *
 * Er ist ein KOERPER DESSELBEN FELDES, kein Zeichen darauf: dieselbe geneigte
 * Ellipse wie die Galaxien der Wolke, nur groesser und heller. Was ihn abhebt,
 * ist der Sternbogen — bei einer voll befreiten Galaxie ein geschlossener
 * Goldring.
 */
function paintNode(
  ctx: CanvasRenderingContext2D,
  node: FirmamentNode,
  box: FirmamentFitBox,
  k: number,
): void {
  const p = firmamentScreenPos(box, node.nx, node.ny)
  const r = node.bodyR * k
  const color = nodeColor(node)
  const shape = bodyShape(node, r)

  if (node.state === 'unlit') {
    ctx.save()
    ctx.setLineDash([2 * k, 3 * k])
    ctx.beginPath()
    // Auch das Leere traegt die Formsprache — ein gestrichelter KREIS waere die
    // einzige runde Marke auf einer Karte aus Ellipsen.
    ctx.ellipse(p.x, p.y, shape.rx, shape.ry, shape.tilt, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(160, 146, 114, 0.45)'
    ctx.lineWidth = 1 * k
    ctx.stroke()
    ctx.restore()
    return
  }

  // Schattenteich: die innersten Knoten liegen auf dem Galaxienfeld der
  // Heldenscheibe, der dritte sogar in ihrem Glutring. Dieselbe Lehre wie bei
  // `core-gate` — ein Leuchten auf einem Leuchten ist kein Leuchten. Er steht
  // VOR Schein und Kern, damit die auf dem gedaempften Grund stehen.
  const pool = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * FIRMAMENT_NODE_POOL_SPAN)
  pool.addColorStop(0, 'rgba(6, 5, 4, 0.72)')
  pool.addColorStop(0.5, 'rgba(6, 5, 4, 0.44)')
  pool.addColorStop(1, 'rgba(6, 5, 4, 0)')
  ctx.beginPath()
  ctx.arc(p.x, p.y, r * FIRMAMENT_NODE_POOL_SPAN, 0, Math.PI * 2)
  ctx.fillStyle = pool
  ctx.fill()

  // Der Schein traegt die Neigung des Koerpers: ein Radialverlauf ist rund, die
  // Ellipse entsteht aus der Stauchung des Kontexts. Rund ueberrundete er die
  // Form, die er umgeben soll — genau das machte aus dem Knoten eine Bake.
  const reach = r * FIRMAMENT_NODE_HALO_SPAN
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(shape.tilt)
  ctx.scale(1, shape.ry / shape.rx)
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, reach)
  glow.addColorStop(0, tone(color, FIRMAMENT_NODE_HALO_ALPHA))
  glow.addColorStop(0.45, tone(color, FIRMAMENT_NODE_HALO_ALPHA * 0.42))
  glow.addColorStop(1, tone(color, 0))
  ctx.beginPath()
  ctx.arc(0, 0, reach, 0, Math.PI * 2)
  ctx.fillStyle = glow
  ctx.fill()
  ctx.restore()

  ctx.beginPath()
  ctx.ellipse(p.x, p.y, shape.rx, shape.ry, shape.tilt, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  ctx.fillStyle = '#fdf6e0'
  ctx.beginPath()
  ctx.arc(p.x, p.y, Math.max(1.2 * k, r * FIRMAMENT_NODE_CORE_R), 0, Math.PI * 2)
  ctx.fill()

  // Der Sternstand als EIN Bogen: gold, was gerettet wurde, rot anschliessend,
  // was verloren ging, der Rest bleibt leer. Die Anteile sind die der sieben
  // Pips, die hier standen — nur eine Form statt sieben je Knoten.
  const stars = Math.max(1, node.stars)
  const gold = Math.min(node.rescued, stars) / stars
  const lost = Math.min(node.lost, Math.max(0, stars - node.rescued)) / stars
  const arcR = r * FIRMAMENT_STAR_ARC_ORBIT
  const top = -Math.PI / 2
  ctx.lineCap = 'butt'
  ctx.lineWidth = FIRMAMENT_STAR_ARC_W * k
  if (gold > 0) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, arcR, top, top + gold * Math.PI * 2)
    ctx.strokeStyle = fade(FIRMAMENT_FREED_COLOR, FIRMAMENT_STAR_ARC_ALPHA)
    ctx.stroke()
  }
  if (lost > 0) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, arcR, top + gold * Math.PI * 2, top + (gold + lost) * Math.PI * 2)
    ctx.strokeStyle = fade(FIRMAMENT_LOST_COLOR, FIRMAMENT_STAR_ARC_LOST_ALPHA)
    ctx.stroke()
  }

  // Orte auf den Etappen — dieselbe hohle Raute wie auf der Galaxiekarte.
  const marks = Math.min(node.landfalls, FIRMAMENT_LANDFALL_MAX_MARKS)
  for (let l = 0; l < marks; l++) {
    const a = Math.PI / 2 + l * 0.44
    const rr = r * FIRMAMENT_LANDFALL_ORBIT
    const d = FIRMAMENT_LANDFALL_R * k
    ctx.save()
    ctx.translate(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr)
    ctx.rotate(Math.PI / 4)
    ctx.strokeStyle = fade(FIRMAMENT_LANDFALL_COLOR, 0.85)
    ctx.lineWidth = 1 * k
    ctx.strokeRect(-d, -d, d * 2, d * 2)
    ctx.restore()
  }
}

/**
 * Die Karte ueber Grund, Wall und Heldenscheibe. Reihenfolge ist Bedeutung:
 * Wallringe, Bahn, Tore, Koerper — was spaeter kommt, liegt oben.
 *
 * Sie malt TRANSPARENT. Ein deckender Grund hier legte sich ueber die beiden
 * drehenden Ebenen darunter, und die waeren nicht mehr zu sehen.
 *
 * Sie geht in ein QUADRATISCHES Sprite um `box.cx/cy`, wie der Wall: die Karte
 * dreht mit der Wolke, und buehnenfuellend schwenkte alles, was bei Zoom und
 * Fahrt ausserhalb der Buehne liegt, als leere Flaeche ins Bild. Kein Zug darf
 * `FIRMAMENT_PLATE_SPRITE_MARGIN · box.r` verlassen.
 */
export function paintFirmament(
  ctx: CanvasRenderingContext2D,
  nodes: readonly FirmamentNode[],
  departure: FirmamentDeparture | null,
  w: number,
  h: number,
  box: FirmamentFitBox,
  tint: string,
): void {
  const k = box.r / FIRMAMENT_PLATE_REF_R

  ctx.clearRect(0, 0, w, h)
  paintRimRings(ctx, box, k, tint)
  paintRoad(ctx, nodes, box, k)
  if (departure) paintDeparture(ctx, departure, box, k)
  for (const node of nodes) paintNode(ctx, node, box, k)
}
