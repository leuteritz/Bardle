/* ── Firmament-Platte ─────────────────────────────────────────────────────────
   Die EINE Zeichenreihenfolge der Firmament-Karte. Sie zerfaellt in DREI Zuege,
   und der Schnitt ist der Grund, warum der Reiter auf Grundlast steht:

   - `paintFirmamentGround` — Grund und Sternfeld. Haengt weder an Zoom noch an
     Fahrt noch am Bestand; ein eigenes Canvas, das dabei fast nie neu malt.
   - `paintFirmamentRimArcs` — die 190 Boegen des Walls, um den Mittelpunkt des
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
import {
  FIRMAMENT_FREED_COLOR,
  FIRMAMENT_GATE_COLOR,
  FIRMAMENT_HERE_COLOR,
  FIRMAMENT_LANDFALL_COLOR,
  FIRMAMENT_LANDFALL_MAX_MARKS,
  FIRMAMENT_LANDFALL_ORBIT,
  FIRMAMENT_LANDFALL_R,
  FIRMAMENT_LOST_COLOR,
  FIRMAMENT_NODE_POOL_SPAN,
  FIRMAMENT_PIP_ORBIT,
  FIRMAMENT_PIP_R,
  FIRMAMENT_PLATE_REF_R,
  FIRMAMENT_ROAD_CASING_W,
  FIRMAMENT_RIM_ARCS,
  FIRMAMENT_STAR_ALPHA_MAX,
  FIRMAMENT_STAR_ALPHA_MIN,
  FIRMAMENT_STAR_DENSITY,
  FIRMAMENT_STAR_MAX,
  FIRMAMENT_UNLIT_COLOR,
} from '@/config/constants'
import type { FirmamentFitBox, FirmamentGate, FirmamentNode } from '@/utils/ui/firmamentLayout'

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
    const a = FIRMAMENT_STAR_ALPHA_MIN + rng() * (FIRMAMENT_STAR_ALPHA_MAX - FIRMAMENT_STAR_ALPHA_MIN)
    const s = rng() < 0.9 ? 0.7 : 1.4
    ctx.fillStyle = `rgba(220, 230, 255, ${a.toFixed(2)})`
    ctx.fillRect(x, y, s, s)
  }
}

/**
 * Die Boegen des aeusseren Walls — das Ende dessen, was bekannt ist, und die
 * einzige Ebene der Kartenflaeche, die sich bewegt.
 *
 * Gemalt wird um `cx/cy` des uebergebenen Kontexts, damit dasselbe Rezept in
 * ein eigenes quadratisches Sprite passt, dessen Mitte der Drehpunkt ist. Der
 * Seed bleibt 19: das Aussehen ist byte-identisch zu dem, was frueher im
 * Standbild stand.
 */
export function paintFirmamentRimArcs(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  k: number,
): void {
  const rng = seededRng(19)
  ctx.save()
  ctx.translate(cx, cy)
  for (let i = 0; i < FIRMAMENT_RIM_ARCS; i++) {
    const a0 = rng() * Math.PI * 2
    const len = 0.06 + rng() * 0.2
    const r0 = r * (0.9 + rng() * 0.09)
    const r1 = r0 * (0.96 + rng() * 0.07)
    ctx.beginPath()
    ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0)
    ctx.quadraticCurveTo(
      Math.cos(a0 + len * 0.5) * r1 * 1.02,
      Math.sin(a0 + len * 0.5) * r1 * 1.02,
      Math.cos(a0 + len) * r0,
      Math.sin(a0 + len) * r0,
    )
    ctx.strokeStyle = rng() < 0.35 ? 'rgba(255, 196, 120, 0.32)' : 'rgba(255, 140, 60, 0.2)'
    ctx.lineWidth = (0.6 + rng() * 1.1) * k
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * Die zwei geschlossenen Ringe des Walls.
 *
 * Sie bleiben im STANDBILD. Ein rotationssymmetrischer Kreis traegt keine
 * Drehung — im Sprite kostete er nur Flaeche, und das Sprite muesste fuer ihn
 * bis an seine Kante decken.
 */
function paintRimRings(ctx: CanvasRenderingContext2D, box: FirmamentFitBox, k: number): void {
  ctx.save()
  ctx.translate(box.cx, box.cy)
  ctx.beginPath()
  ctx.arc(0, 0, box.r * 0.985, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255, 120, 40, 0.45)'
  ctx.lineWidth = 2 * k
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, box.r * 1.02, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(90, 40, 20, 0.8)'
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

/** Ein Universumstor: zwei Boegen quer zur Bahn, dazwischen die Ziffer. */
function paintGates(
  ctx: CanvasRenderingContext2D,
  gates: readonly FirmamentGate[],
  box: FirmamentFitBox,
  k: number,
): void {
  for (const gate of gates) {
    const p = firmamentScreenPos(box, gate.nx, gate.ny)
    const span = 9 * k
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(gate.angle)
    ctx.strokeStyle = fade(FIRMAMENT_GATE_COLOR, 0.85)
    ctx.lineWidth = 1.6 * k
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(0, 0, span, side * 0.5 - Math.PI / 2, side * 0.5 + Math.PI / 2, side < 0)
      ctx.stroke()
    }
    ctx.restore()
  }
}

/** Ein Knoten: Schein, Kern, Sternpips, Ortsrauten — alles statisch. */
function paintNode(
  ctx: CanvasRenderingContext2D,
  node: FirmamentNode,
  box: FirmamentFitBox,
  k: number,
): void {
  const p = firmamentScreenPos(box, node.nx, node.ny)
  const r = node.bodyR * k
  const color = nodeColor(node)

  if (node.state === 'unlit') {
    ctx.save()
    ctx.setLineDash([2 * k, 3 * k])
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
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

  const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.6)
  glow.addColorStop(0, color)
  glow.addColorStop(0.35, color.replace('rgb(', 'rgba(').replace(')', ', 0.5)'))
  glow.addColorStop(1, color.replace('rgb(', 'rgba(').replace(')', ', 0)'))
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(p.x, p.y, r * 2.6, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#fdf6e0'
  ctx.beginPath()
  ctx.arc(p.x, p.y, Math.max(1.4 * k, r * 0.32), 0, Math.PI * 2)
  ctx.fill()

  // Ein Pip je verlangtem Stern: gold gerettet, rot verloren, blass offen.
  // Sie sind der Grund, warum die Koerper aufs Canvas gehoeren — dreissig
  // Knoten mal sieben Pips waeren 210 DOM-Elemente fuer etwas Stillstehendes.
  for (let s = 0; s < node.stars; s++) {
    const a = -Math.PI / 2 + s * ((Math.PI * 2) / node.stars)
    const rr = r * FIRMAMENT_PIP_ORBIT
    ctx.beginPath()
    ctx.arc(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr, FIRMAMENT_PIP_R * k, 0, Math.PI * 2)
    ctx.fillStyle =
      s < node.rescued
        ? FIRMAMENT_FREED_COLOR
        : s < node.rescued + node.lost
          ? FIRMAMENT_LOST_COLOR
          : 'rgba(200, 184, 144, 0.3)'
    ctx.fill()
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
 */
export function paintFirmament(
  ctx: CanvasRenderingContext2D,
  nodes: readonly FirmamentNode[],
  gates: readonly FirmamentGate[],
  w: number,
  h: number,
  box: FirmamentFitBox,
): void {
  const k = box.r / FIRMAMENT_PLATE_REF_R

  ctx.clearRect(0, 0, w, h)
  paintRimRings(ctx, box, k)
  paintRoad(ctx, nodes, box, k)
  paintGates(ctx, gates, box, k)
  for (const node of nodes) paintNode(ctx, node, box, k)
}
