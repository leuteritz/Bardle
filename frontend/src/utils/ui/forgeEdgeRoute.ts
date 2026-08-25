/**
 * Wie eine Linie des Star-Forge-Netzes von einem Knoten zum nächsten kommt —
 * rechtwinklig, und ohne einen fremden Knoten zu berühren.
 *
 * Hier lag einmal nichts: `forgeLimb()` warf eine quadratische Bézier zwischen
 * zwei Mittelpunkte, Krümmungsrichtung aus dem Seed, und das war der ganze Weg.
 * Bei fünfzehn Speichen und sieben Ringen ging das durch — im NETZ mit rund 205
 * Kanten über 155 frei stehenden Knoten nicht mehr:
 *
 *   • Der gewürfelte Bogen war kein Schwung, sondern Rauschen. Kein Strich
 *     fluchtete mit einem anderen, und zwei benachbarte Kanten beulten in
 *     entgegengesetzte Richtungen aus.
 *   • Die Bézier kannte die anderen Knoten NICHT. Sie lief quer durch fremde
 *     Kreise, weil nichts sie daran hinderte.
 *   • Alle Kanten trafen sich im MITTELPUNKT. Ein Knoten mit fünf Verbindungen
 *     trug einen Stern unter seinem Kreis.
 *
 * **Drei Mittel, und das erste ist das eigentliche.**
 *
 *   1. **Kanäle.** Die Querachse eines Z-Wegs wird auf `FORGE_ROUTE_CHANNEL_PX`
 *      quantisiert. Das ist der Ersatz dafür, dass die KNOTEN frei stehen — sie
 *      rasten nicht ein, die LINIEN tun es. Parallele Striche teilen sich dadurch
 *      dieselbe Achse und fluchten, ohne dass eine Position sich ändert.
 *   2. **Ports.** Eine Kante tritt am RAND aus, auf einer der vier Achsen, und
 *      mehrere Kanten derselben Seite fächern um `FORGE_ROUTE_PORT_PITCH_PX`.
 *      Damit endet kein Strich unter einem Kreis.
 *   3. **Kollisionsprüfung.** Jeder Kandidat wird gegen jeden fremden Knoten
 *      gerechnet, bevor er genommen wird. Das ist die Zusage dieser Datei, und
 *      `__tests__/utils/ui/forgeEdgeRoute.spec.ts` rechnet sie nach.
 *
 * **Warum eine eigene Datei neben `forgeTreeLayout.ts`** — derselbe Grund wie
 * bei `forgeSpotlightView.ts`: eine andere Frage mit einer anderen Eingabe. Dort
 * steht, WO ein Knoten steht; hier, WIE eine Linie dorthin kommt, ohne etwas zu
 * treffen — und dafür braucht es die vollständige Hindernisliste, die den
 * Platzierer nichts angeht.
 *
 * **Gerechnet wird EINMAL**, beim ersten Aufruf, danach aus dem Modul-Cache. Die
 * Eingabe ist statisch (die Platzierung selbst ist es), es gibt keinen Wert, der
 * sich ändern könnte. Kein Anteil an irgendeinem Frame.
 *
 * Der Preis dieses einen Males, gemessen: rund **80 ms** für alle 205 Wege —
 * dazu kommen die rund 90 ms der Platzierung, die es vorher schon gab. Beides
 * fällt beim ersten Öffnen des Shop-Tabs an und nie wieder. Wer daran etwas
 * ändert, misst es nach; die Zahl steht in
 * `__tests__/utils/ui/forgeEdgeRoute.spec.ts` NICHT als Schwelle, weil eine
 * Zeitmessung auf fremder Hardware nichts beweist.
 */
import {
  FORGE_LIMB_WIDTH,
  FORGE_MIN_AIR_PX,
  FORGE_NODE_DIAMETER,
  FORGE_ROUTE_CHANNEL_PX,
  FORGE_ROUTE_CLEARANCE_PX,
  FORGE_ROUTE_CORNER_R,
  FORGE_ROUTE_GRID_PX,
  FORGE_ROUTE_MARGIN_PX,
  FORGE_ROUTE_MAX_CELLS,
  FORGE_ROUTE_PORT_PITCH_PX,
  FORGE_ROUTE_STRAIGHT_TOL_PX,
  FORGE_ROUTE_TURN_COST,
  FORGE_STAGE_SIZE,
  FORGE_SUN_EDGE_GAP,
  SHOP_SUN_MAX_DIAMETER,
} from '@/config/constants'
import { getForgeNode } from '@/config/progression/starForge'
import { forgeSeatTier } from '@/config/progression/forgeSeats'
import { forgeEdges, forgeTreePlacements, type Point } from '@/utils/ui/forgeTreeLayout'

export type { Point }

/** Ein fertiger Weg: das `d`-Attribut, die Strichstärke und zwei Kennzahlen,
 *  an denen die Spec misst, ob das Routing noch tut, was es soll. */
export interface ForgeRoute {
  d: string
  width: number
  /** Wie oft der Weg die Richtung wechselt. Jeder Wechsel ist exakt 90°. */
  turns: number
  /** Ob der Ausweichweg gebraucht wurde. Eine Handvoll ist normal, eine Häufung
   *  heisst: die Knoten stehen zu dicht, und der Hebel ist `FORGE_MIN_AIR_PX`. */
  viaFallback: boolean
}

/** Die vier Achsen, auf denen ein Weg einen Knoten verlässt. */
type Side = 'E' | 'W' | 'N' | 'S'

const AXIS: Record<Side, Point> = {
  E: { x: 1, y: 0 },
  W: { x: -1, y: 0 },
  N: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
}

const OPPOSITE: Record<Side, Side> = { E: 'W', W: 'E', N: 'S', S: 'N' }

/**
 * Die Länge des Stummels, mit dem ein Weg den Knoten verlässt, bevor er
 * abbiegen darf.
 *
 * Ohne ihn läge der erste Knick unmittelbar am Kreisrand, und der Weg sähe aus,
 * als prallte er am Knoten ab. Die halbe Mindestluft ist die natürliche Wahl: so
 * weit kommt der Stummel IMMER, ohne in den Nachbarn zu laufen.
 */
const STUB_PX = FORGE_MIN_AIR_PX / 2

/**
 * Wie weit um die Verbindung zweier Knoten herum nach Hindernissen gesucht wird.
 *
 * Er muss decken, wie weit ein Kandidat ausholen darf: der weiteste
 * Kanalversatz (vier Kanäle), der Stummel, der Eckradius — und vor allem der
 * Umweg der Rastersuche, der bis `FORGE_ROUTE_MARGIN_PX` über die Box
 * hinausgeht. Grosszügig gewählt, weil ein zu enger Rand einen Knoten
 * ÜBERSIEHT und damit genau die Zusage bricht, um die es hier geht.
 */
const LOCAL_MARGIN_PX = FORGE_ROUTE_MARGIN_PX + 80

/** Anteil des Radius, bis zu dem ein Port seitlich wandern darf. Weiter aussen
 *  läuft der Kreisrand fast parallel zur Austrittsrichtung, und der Strich
 *  schnitte seinen eigenen Knoten. */
const PORT_SPAN = 0.6

// ── Die Hindernisse ───────────────────────────────────────────────────────────
interface Blocker {
  id: string
  x: number
  y: number
  /** Knotenradius plus `FORGE_ROUTE_CLEARANCE_PX`. */
  r: number
}

/** Die Hindernisse der Sonnenstummel. Sie hängen nur an der Platzierung und
 *  überleben deshalb den Phasenwechsel, der die fünf Wege neu rechnen lässt. */
let sunBlockers: Blocker[] | null = null

/**
 * Der Körper in der Mitte ist ein Hindernis wie jeder Knoten — auch wenn er
 * keiner ist.
 *
 * Gemessen läuft heute kein Weg durch ihn, aber das ist eine Folge davon, dass
 * `clampToStage()` die Knoten aus ihm heraushält, und keine Zusage: eine
 * Katalogänderung, die zwei Zone-1-Knoten auf gegenüberliegende Seiten legt,
 * zöge die Verbindung mitten durch die Sonne. Gerechnet wird mit dem Körper in
 * seiner GRÖSSTEN Phase plus `FORGE_SUN_EDGE_GAP` — dieselbe Kante, an der
 * schon der Platzierer misst.
 *
 * Die fünf Stummel, die ihn absichtlich berühren, führen ihn in ihrem
 * `own`-Set.
 */
const SUN_ID = '__sun__'

function buildBlockers(places: ReadonlyMap<string, Point>): Blocker[] {
  const all: Blocker[] = []
  for (const [id, at] of places) {
    const tier = forgeSeatTier(id)
    all.push({
      id,
      x: at.x,
      y: at.y,
      r: FORGE_NODE_DIAMETER[tier] / 2 + FORGE_ROUTE_CLEARANCE_PX,
    })
  }
  const half = FORGE_STAGE_SIZE / 2
  all.push({
    id: SUN_ID,
    x: half,
    y: half,
    r: SHOP_SUN_MAX_DIAMETER / 2 + FORGE_SUN_EDGE_GAP,
  })
  return all
}

/**
 * Die Hindernisse im Umkreis einer KANTE — einmal gesammelt, dann für alle
 * Kandidaten dieser Kante wiederverwendet.
 *
 * Gemessen über das ganze Netz: 210 ms mit einer Liste je SEGMENT, rund 80 mit
 * einer je Kante. Die Segmentfassung hiess, für jeden der rund zwölftausend
 * Kandidaten ein Gitter abzufragen und ein Set zu füllen — für eine Antwort,
 * die sich innerhalb einer Kante nie ändert. Ein Gitter über die Knoten stand
 * hier deshalb auch einmal; bei 155 Kreisen ist die schlichte Schleife über
 * alle schneller als seine Verwaltung.
 *
 * Der Rand deckt ab, wie weit ein Kandidat über die Verbindungsbox hinaus
 * ausholen darf: der weiteste Kanalversatz plus der Umweg der Rastersuche.
 */
function around(all: readonly Blocker[], a: Point, b: Point, margin: number): Blocker[] {
  const minX = Math.min(a.x, b.x) - margin
  const maxX = Math.max(a.x, b.x) + margin
  const minY = Math.min(a.y, b.y) - margin
  const maxY = Math.max(a.y, b.y) + margin
  const out: Blocker[] = []
  for (const blocker of all) {
    if (blocker.x + blocker.r < minX || blocker.x - blocker.r > maxX) continue
    if (blocker.y + blocker.r < minY || blocker.y - blocker.r > maxY) continue
    out.push(blocker)
  }
  return out
}

/** Abstand eines Punktes zur Strecke `a`–`b`. */
function distToSegment(px: number, py: number, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - a.x, py - a.y)
  let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq
  t = t < 0 ? 0 : t > 1 ? 1 : t
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy))
}

/** Läuft dieser Streckenzug durch einen Knoten, der nicht zu ihm gehört? */
function hits(pts: Point[], blockers: readonly Blocker[], own: Set<string>): boolean {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    for (const blocker of blockers) {
      if (own.has(blocker.id)) continue
      if (distToSegment(blocker.x, blocker.y, a, b) < blocker.r) return true
    }
  }
  return false
}

// ── Die Ports ─────────────────────────────────────────────────────────────────
/**
 * Wo ein Weg seinen Knoten verlässt — ein Punkt EXAKT auf dem Kreisrand, seitlich
 * versetzt, und dahinter ein achsparalleler Stummel.
 *
 * Der Versatz sitzt auf dem Kreis und nicht daneben: ein Strich, der neben dem
 * Rand beginnt, hinge sichtbar in der Luft.
 */
function portOf(centre: Point, radius: number, side: Side, offset: number): [Point, Point] {
  const cap = radius * PORT_SPAN
  const off = offset > cap ? cap : offset < -cap ? -cap : offset
  const along = Math.sqrt(Math.max(1, radius * radius - off * off))
  const axis = AXIS[side]
  const port =
    axis.x !== 0
      ? { x: centre.x + axis.x * along, y: centre.y + off }
      : { x: centre.x + off, y: centre.y + axis.y * along }
  const stub = { x: port.x + axis.x * STUB_PX, y: port.y + axis.y * STUB_PX }
  return [port, stub]
}

/** Die Seite, auf der eine Kante ihren Knoten am natürlichsten verlässt: die
 *  dominante Achse der Verbindung. */
function sideToward(from: Point, to: Point): Side {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'E' : 'W'
  return dy >= 0 ? 'S' : 'N'
}

/** Die Achse quer zur natürlichen — der zweite Anlauf, wenn der erste nirgends
 *  durchkommt. */
function crossSide(from: Point, to: Point): Side {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) >= Math.abs(dy)) return dy >= 0 ? 'S' : 'N'
  return dx >= 0 ? 'E' : 'W'
}

// ── Die Kanäle ────────────────────────────────────────────────────────────────
function toChannel(value: number, step: number): number {
  return (Math.round(value / FORGE_ROUTE_CHANNEL_PX) + step) * FORGE_ROUTE_CHANNEL_PX
}

function laneKey(a: Point, b: Point): { key: string; lo: number; hi: number } | null {
  if (Math.abs(a.y - b.y) < 0.5) {
    const lane = Math.round(a.y / FORGE_ROUTE_CHANNEL_PX)
    return { key: `h${lane}`, lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x) }
  }
  if (Math.abs(a.x - b.x) < 0.5) {
    const lane = Math.round(a.x / FORGE_ROUTE_CHANNEL_PX)
    return { key: `v${lane}`, lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y) }
  }
  return null
}

/**
 * Welche Kanalabschnitte schon belegt sind.
 *
 * Nicht als Verbot, sondern als AUFSCHLAG: zwei Striche exakt aufeinander sind
 * hässlich, aber ein Weg, der dafür durch einen Knoten müsste, ist schlimmer.
 */
class ChannelBook {
  private readonly lanes = new Map<string, [number, number][]>()

  overlap(pts: Point[]): number {
    let sum = 0
    for (let i = 1; i < pts.length; i++) {
      const lane = laneKey(pts[i - 1], pts[i])
      if (lane === null) continue
      const spans = this.lanes.get(lane.key)
      if (!spans) continue
      for (const [lo, hi] of spans) {
        const cover = Math.min(hi, lane.hi) - Math.max(lo, lane.lo)
        if (cover > 0) sum += cover
      }
    }
    return sum
  }

  take(pts: Point[]): void {
    for (let i = 1; i < pts.length; i++) {
      const lane = laneKey(pts[i - 1], pts[i])
      if (lane === null) continue
      const spans = this.lanes.get(lane.key)
      if (spans) spans.push([lane.lo, lane.hi])
      else this.lanes.set(lane.key, [[lane.lo, lane.hi]])
    }
  }
}

// ── Die Kandidaten ────────────────────────────────────────────────────────────
/**
 * Die vorgerechneten Wege zwischen zwei Stummelenden, von wenigen Knicken zu
 * vielen: gerade, ein Knick, zwei Knicke mit verschobenem Kanal.
 *
 * Die Reihenfolge ist keine Vorliebe, sondern die Bewertung selbst — der
 * gültige Weg mit den wenigsten Knicken gewinnt, und nur bei Gleichstand
 * entscheiden Länge und Kanalbelegung.
 *
 * `wide` öffnet die volle Menge: die Querachse wandert nicht nur um die Mitte,
 * sondern auch auf ein Viertel und drei Viertel der Strecke, und der
 * Kanalversatz reicht weiter. Das ist der Unterschied zwischen „hier ist
 * zufällig frei" und „hier ist irgendwo frei" — und der Grund, warum der
 * Ausweichweg fast nie gebraucht wird. Die schmale Menge genügt für den ersten
 * Anlauf und hält ihn billig.
 */
function candidates(p: Point, q: Point, wide: boolean): Point[][] {
  const straightX = Math.abs(p.x - q.x) < 0.5
  const straightY = Math.abs(p.y - q.y) < 0.5
  if (straightX || straightY) return [[p, q]]

  const out: Point[][] = [
    [p, { x: q.x, y: p.y }, q],
    [p, { x: p.x, y: q.y }, q],
  ]
  const stops = wide ? [0.5, 0.3, 0.7] : [0.5]
  const steps = wide ? [0, 1, -1, 2, -2, 3, -3, 4, -4] : [0, 1, -1, 2, -2]
  for (const t of stops) {
    for (const step of steps) {
      const mx = toChannel(p.x + (q.x - p.x) * t, step)
      out.push([p, { x: mx, y: p.y }, { x: mx, y: q.y }, q])
      const my = toChannel(p.y + (q.y - p.y) * t, step)
      out.push([p, { x: p.x, y: my }, { x: q.x, y: my }, q])
    }
  }
  return out
}

/** Aufeinanderfolgende gleiche Punkte und Zwischenpunkte auf einer Geraden
 *  fallen heraus — sonst zählte ein Weg Knicke, die es gar nicht gibt. */
function tidy(pts: Point[]): Point[] {
  const dense: Point[] = []
  for (const p of pts) {
    const last = dense[dense.length - 1]
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue
    dense.push(p)
  }
  const merged: Point[] = []
  for (const p of dense) {
    if (merged.length >= 2) {
      const a = merged[merged.length - 2]
      const b = merged[merged.length - 1]
      const flatH = Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - p.y) < 0.5
      const flatV = Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - p.x) < 0.5
      if (flatH || flatV) merged.pop()
    }
    merged.push(p)
  }
  return orthogonalize(merged)
}

/**
 * Der letzte Schliff: jedes Segment wird EXAKT achsparallel.
 *
 * Ein Weg aus der Rastersuche endet auf Rasterpunkten, seine Enden aber auf
 * Ports — dazwischen bleiben Zehntelpixel stehen, und ein Segment von 0,2 auf
 * 88 px ist zwar fast senkrecht, aber eben nicht senkrecht. Der Unterschied ist
 * unsichtbar und trotzdem der ganze Punkt: die Zusage lautet „achsparallel",
 * nicht „beinahe".
 *
 * Verschoben wird immer der SPÄTERE Punkt auf den früheren, und nur um weniger
 * als einen Pixel — sonst verschöbe der Schliff die Geometrie, statt sie zu
 * runden.
 */
function orthogonalize(pts: Point[]): Point[] {
  if (pts.length < 2) return pts
  const out = pts.map((p) => ({ x: p.x, y: p.y }))
  for (let i = 1; i < out.length; i++) {
    const dx = Math.abs(out[i].x - out[i - 1].x)
    const dy = Math.abs(out[i].y - out[i - 1].y)
    if (dx === 0 || dy === 0) continue
    if (dx <= dy && dx < 1) out[i].x = out[i - 1].x
    else if (dy < dx && dy < 1) out[i].y = out[i - 1].y
  }
  return out
}

function turnsOf(pts: Point[]): number {
  return Math.max(0, pts.length - 2)
}

function lengthOf(pts: Point[]): number {
  let sum = 0
  for (let i = 1; i < pts.length; i++) {
    sum += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y)
  }
  return sum
}

// ── Der Ausweichweg ───────────────────────────────────────────────────────────
/**
 * Eine Suche auf grobem Raster, wenn kein vorgerechneter Weg frei ist.
 *
 * Nur orthogonale Züge, und jeder Richtungswechsel kostet `FORGE_ROUTE_TURN_COST`
 * — das ist der Unterschied zwischen einem Weg mit zwei Knicken und einer Treppe
 * aus vierzig. Die Zellenzahl ist gedeckelt: das Netz wird einmal gerechnet,
 * aber eine unbegrenzte Suche wäre trotzdem der falsche Preis.
 *
 * Sie WIRFT nicht, wenn sie nichts findet. Ein Laufzeitfehler beim Spieler wäre
 * die schlechteste aller Meldungen — dieselbe Haltung wie `separate()` im
 * Platzierer; der Wächter ist die Spec.
 */
function detour(
  p: Point,
  q: Point,
  blockers: readonly Blocker[],
  own: Set<string>,
): Point[] | null {
  const g = FORGE_ROUTE_GRID_PX
  const minX = Math.min(p.x, q.x) - FORGE_ROUTE_MARGIN_PX
  const maxX = Math.max(p.x, q.x) + FORGE_ROUTE_MARGIN_PX
  const minY = Math.min(p.y, q.y) - FORGE_ROUTE_MARGIN_PX
  const maxY = Math.max(p.y, q.y) + FORGE_ROUTE_MARGIN_PX
  const cols = Math.ceil((maxX - minX) / g) + 1
  const rows = Math.ceil((maxY - minY) / g) + 1
  const total = cols * rows
  if (total > FORGE_ROUTE_MAX_CELLS) return null

  const at = (c: number, r: number): Point => ({ x: minX + c * g, y: minY + r * g })
  const blocked = new Uint8Array(total)
  for (const b of blockers) {
    if (own.has(b.id)) continue
    const c0 = Math.max(0, Math.floor((b.x - b.r - minX) / g))
    const c1 = Math.min(cols - 1, Math.ceil((b.x + b.r - minX) / g))
    const r0 = Math.max(0, Math.floor((b.y - b.r - minY) / g))
    const r1 = Math.min(rows - 1, Math.ceil((b.y + b.r - minY) / g))
    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) {
        const cell = at(c, r)
        if (Math.hypot(cell.x - b.x, cell.y - b.y) < b.r + g / 2) blocked[r * cols + c] = 1
      }
    }
  }

  const startC = Math.round((p.x - minX) / g)
  const startR = Math.round((p.y - minY) / g)
  const goalC = Math.round((q.x - minX) / g)
  const goalR = Math.round((q.y - minY) / g)
  const start = startR * cols + startC
  const goal = goalR * cols + goalC
  if (start < 0 || goal < 0 || start >= total || goal >= total) return null
  blocked[start] = 0
  blocked[goal] = 0

  const DIRS: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
  const cost = new Float64Array(total).fill(Infinity)
  const cameFrom = new Int32Array(total).fill(-1)
  const cameDir = new Int8Array(total).fill(-1)
  const queued = new Uint8Array(total)
  cost[start] = 0
  // Eine schlichte Liste statt eines Heaps: das Suchfeld ist gedeckelt, und die
  // ganze Rechnung läuft einmal je Sitzung.
  const open: number[] = [start]
  queued[start] = 1

  const heuristic = (idx: number): number => {
    const c = idx % cols
    const r = (idx - c) / cols
    return (Math.abs(c - goalC) + Math.abs(r - goalR)) * g
  }

  while (open.length > 0) {
    let bestAt = 0
    let bestScore = Infinity
    for (let i = 0; i < open.length; i++) {
      const score = cost[open[i]] + heuristic(open[i])
      if (score < bestScore) {
        bestScore = score
        bestAt = i
      }
    }
    const current = open.splice(bestAt, 1)[0]
    queued[current] = 0
    if (current === goal) break
    const cc = current % cols
    const cr = (current - cc) / cols
    for (let d = 0; d < 4; d++) {
      const nc = cc + DIRS[d][0]
      const nr = cr + DIRS[d][1]
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue
      const next = nr * cols + nc
      if (blocked[next] === 1) continue
      const turn = cameDir[current] >= 0 && cameDir[current] !== d ? FORGE_ROUTE_TURN_COST : 0
      const nextCost = cost[current] + g + turn
      if (nextCost >= cost[next]) continue
      cost[next] = nextCost
      cameFrom[next] = current
      cameDir[next] = d
      if (queued[next] === 0) {
        open.push(next)
        queued[next] = 1
      }
    }
  }

  if (!Number.isFinite(cost[goal])) return null
  const chain: Point[] = []
  for (let idx = goal; idx !== -1; idx = cameFrom[idx]) {
    const c = idx % cols
    const r = (idx - c) / cols
    chain.push(at(c, r))
    if (idx === start) break
  }
  chain.reverse()
  // Start und Ziel liegen auf dem RASTER, die Stummelenden nicht. Sie einfach
  // zu ersetzen war der erste Versuch und erzeugte genau das, was diese Datei
  // verhindern soll: ein schräges Reststück von wenigen Pixeln. Stattdessen
  // wird orthogonal angeschlossen — über einen Zwischenpunkt, der die Achse des
  // ersten Rasterzugs aufnimmt. `tidy()` wirft ihn wieder weg, wo er auf einer
  // Geraden liegt.
  const head = chain[0]
  const tail = chain[chain.length - 1]
  return smooth(tidy([p, { x: head.x, y: p.y }, ...chain, { x: tail.x, y: q.y }, q]), blockers, own)
}

/**
 * Die Treppe wegnehmen, die eine Rastersuche hinterlässt.
 *
 * Der Aufschlag je Richtungswechsel drückt die Knickzahl, kann sie aber nicht
 * beseitigen: die Suche merkt sich je Zelle nur EINEN Vorgänger, und damit ist
 * ihr Ergebnis in Knicken nicht optimal. Deshalb wird danach von vorn her so
 * weit wie möglich abgekürzt — jeweils die WEITESTE Zwischenstation, die sich
 * noch mit einem einzigen Knick frei erreichen lässt.
 *
 * Das läuft nur für die Handvoll Wege, die überhaupt in die Suche gefallen
 * sind, und ist dort quadratisch in einer Zahl unter dreissig.
 */
function smooth(pts: Point[], blockers: readonly Blocker[], own: Set<string>): Point[] {
  if (pts.length < 3) return pts
  const out: Point[] = [pts[0]]
  let i = 0
  while (i < pts.length - 1) {
    let jump = i + 1
    let via: Point | null = null
    for (let j = pts.length - 1; j > i + 1; j--) {
      const a = pts[i]
      const b = pts[j]
      const corner = [
        { x: b.x, y: a.y },
        { x: a.x, y: b.y },
      ].find((m) => !hits([a, m, b], blockers, own))
      if (corner) {
        jump = j
        via = corner
        break
      }
    }
    if (via !== null) out.push(via)
    out.push(pts[jump])
    i = jump
  }
  return tidy(out)
}

// ── Der Pfad ──────────────────────────────────────────────────────────────────
function round(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Aus dem Streckenzug ein `d` — gerade Segmente, und an jedem Knick eine
 * quadratische Bézier DURCH den Eckpunkt.
 *
 * `Q` und nicht `A`: bei genau 90° ist beides optisch dasselbe, und der
 * Kontrollpunkt IST die Ecke — es braucht keinen Kreisbogen, um das zu sagen.
 * Der Radius wird auf die Hälfte des kürzeren Nachbarsegments geklemmt, sonst
 * frässe eine Ecke die nächste an, wo zwei Knicke dicht aufeinander folgen.
 */
function pathOf(pts: Point[]): string {
  if (pts.length < 2) return ''
  let d = `M ${round(pts[0].x)} ${round(pts[0].y)}`
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1]
    const cur = pts[i]
    const next = pts[i + 1]
    const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y) || 1
    const outLen = Math.hypot(next.x - cur.x, next.y - cur.y) || 1
    const r = Math.min(FORGE_ROUTE_CORNER_R, inLen / 2, outLen / 2)
    const entry = {
      x: cur.x - ((cur.x - prev.x) / inLen) * r,
      y: cur.y - ((cur.y - prev.y) / inLen) * r,
    }
    const exit = {
      x: cur.x + ((next.x - cur.x) / outLen) * r,
      y: cur.y + ((next.y - cur.y) / outLen) * r,
    }
    d += ` L ${round(entry.x)} ${round(entry.y)}`
    d += ` Q ${round(cur.x)} ${round(cur.y)} ${round(exit.x)} ${round(exit.y)}`
  }
  const last = pts[pts.length - 1]
  d += ` L ${round(last.x)} ${round(last.y)}`
  return d
}

// ── Die Auswahl ───────────────────────────────────────────────────────────────
interface Attempt {
  pts: Point[]
  turns: number
  score: number
}

interface End {
  centre: Point
  radius: number
  side: Side
  offset: number
}

/**
 * Wie tief ein Weg in fremde Knoten schneidet — 0 heisst frei.
 *
 * Gebraucht wird das nur, wenn gar nichts frei ist: dann steht immer noch eine
 * Linie da, und die soll wenigstens die WENIGST schlimme sein. Eine fehlende
 * Kante wäre die schlechtere Auskunft als eine, die einen Rand streift.
 */
function penetration(pts: Point[], blockers: readonly Blocker[], own: Set<string>): number {
  let worst = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    for (const blocker of blockers) {
      if (own.has(blocker.id)) continue
      const gap = blocker.r - distToSegment(blocker.x, blocker.y, a, b)
      if (gap > worst) worst = gap
    }
  }
  return worst
}

/** Das Ergebnis eines Anlaufs: der beste FREIE Weg — und, falls keiner frei
 *  war, der mit der geringsten Durchdringung. */
interface Trial {
  best: Attempt | null
  nearest: Attempt | null
  nearestDepth: number
}

function bestOf(
  a: End,
  b: End,
  blockers: readonly Blocker[],
  own: Set<string>,
  book: ChannelBook,
  wide: boolean,
): Trial {
  const [portA, stubA] = portOf(a.centre, a.radius, a.side, a.offset)
  const [portB, stubB] = portOf(b.centre, b.radius, b.side, b.offset)
  let best: Attempt | null = null
  let nearest: Attempt | null = null
  let nearestDepth = Infinity
  for (const shape of candidates(stubA, stubB, wide)) {
    const pts = tidy([portA, ...shape, portB])
    const turns = turnsOf(pts)
    // Erst die Sperre, dann die Bewertung. Andersherum gerechnet kostete die
    // Kanalbelegung für JEDEN verworfenen Kandidaten — und verworfen wird die
    // grosse Mehrheit.
    if (hits(pts, blockers, own)) {
      if (best !== null) continue
      const depth = penetration(pts, blockers, own)
      if (depth < nearestDepth) {
        nearestDepth = depth
        nearest = { pts, turns, score: turns * 10000 + lengthOf(pts) }
      }
      continue
    }
    // Ein Weg mit mehr Knicken kann nie gewinnen — die Bewertung braucht dann
    // gar nicht erst gerechnet zu werden.
    if (best !== null && turns > best.turns) continue
    const score = turns * 10000 + lengthOf(pts) + book.overlap(pts) * 4
    if (best === null || score < best.score) best = { pts, turns, score }
  }
  return { best, nearest, nearestDepth }
}

/**
 * Liegen zwei Knoten fast auf einer Achse, wird die Kante GERADE gezogen — der
 * Ausgleich passiert am Port.
 *
 * Zwei Knicke für neun Pixel Versatz wären die auffälligste Art, nichts zu
 * sagen. Der Port wandert dafür um bis zu `FORGE_ROUTE_STRAIGHT_TOL_PX` auf dem
 * Kreisrand, und das sieht bei 34…64 px Durchmesser niemand.
 */
function straightOffsets(a: Point, b: Point, side: Side): [number, number] | null {
  const horizontal = side === 'E' || side === 'W'
  const delta = horizontal ? b.y - a.y : b.x - a.x
  if (Math.abs(delta) > FORGE_ROUTE_STRAIGHT_TOL_PX) return null
  return [delta / 2, -delta / 2]
}

// ── Das Ergebnis ──────────────────────────────────────────────────────────────
let routeCache: Map<string, ForgeRoute> | null = null

/** Der Schlüssel einer Kante — dieselbe Form wie im Panel. */
export function forgeRouteKey(from: string, to: string): string {
  return `${from}>${to}`
}

function fanBucket(nodeId: string, side: Side): string {
  return `${nodeId} ${side}`
}

function fanSlot(nodeId: string, key: string): string {
  return `${nodeId} ${key}`
}

/**
 * Der seitliche Versatz jedes Ports.
 *
 * Sortiert wird nach der LAGE der Gegenseite, nicht nach dem Namen: nur so
 * kreuzen sich zwei Stummel derselben Knotenseite nicht gleich beim Austritt.
 */
function buildFan(
  perSide: Map<string, string[]>,
  places: ReadonlyMap<string, Point>,
): Map<string, number> {
  const out = new Map<string, number>()
  for (const [bucket, keys] of perSide) {
    const cut = bucket.indexOf(' ')
    const nodeId = bucket.slice(0, cut)
    const side = bucket.slice(cut + 1) as Side
    const here = places.get(nodeId)
    if (!here || keys.length < 2) continue
    const horizontal = side === 'E' || side === 'W'
    const sorted = [...keys].sort((ka, kb) => {
      const oa = otherEnd(ka, nodeId, places) ?? here
      const ob = otherEnd(kb, nodeId, places) ?? here
      const va = horizontal ? oa.y : oa.x
      const vb = horizontal ? ob.y : ob.x
      return va - vb || ka.localeCompare(kb)
    })
    sorted.forEach((key, i) => {
      out.set(fanSlot(nodeId, key), (i - (sorted.length - 1) / 2) * FORGE_ROUTE_PORT_PITCH_PX)
    })
  }
  return out
}

function otherEnd(
  key: string,
  nodeId: string,
  places: ReadonlyMap<string, Point>,
): Point | undefined {
  const cut = key.indexOf('>')
  const from = key.slice(0, cut)
  const to = key.slice(cut + 1)
  return places.get(from === nodeId ? to : from)
}

function radiusOf(id: string): number {
  return FORGE_NODE_DIAMETER[getForgeNode(id)?.tier ?? 'root'] / 2
}

/**
 * Jeder Weg des Netzes, über `from>to` abrufbar.
 *
 * Die Reihenfolge, in der geroutet wird, ist FEST (nach Schlüssel sortiert) —
 * ohne sie hinge die Kanalbelegung an der Aufzählungsordnung, und dasselbe Netz
 * sähe in zwei Läufen verschieden aus.
 */
export function forgeRoutes(): ReadonlyMap<string, ForgeRoute> {
  if (routeCache !== null) return routeCache
  const places = forgeTreePlacements()
  const all = buildBlockers(places)
  const book = new ChannelBook()
  const out = new Map<string, ForgeRoute>()

  const edges = [...forgeEdges()]
    .filter((e) => places.has(e.from) && places.has(e.to))
    .sort((a, b) => forgeRouteKey(a.from, a.to).localeCompare(forgeRouteKey(b.from, b.to)))

  // Erst die Seite jeder Kante, dann die Fächerung: der Versatz eines Ports
  // hängt davon ab, wie viele Kanten sich dieselbe Seite teilen.
  const sides = new Map<string, [Side, Side]>()
  const perSide = new Map<string, string[]>()
  for (const edge of edges) {
    const a = places.get(edge.from)!
    const b = places.get(edge.to)!
    const sideA = sideToward(a, b)
    const sideB = sideToward(b, a)
    const key = forgeRouteKey(edge.from, edge.to)
    sides.set(key, [sideA, sideB])
    for (const [nodeId, side] of [
      [edge.from, sideA],
      [edge.to, sideB],
    ] as [string, Side][]) {
      const bucket = fanBucket(nodeId, side)
      const list = perSide.get(bucket)
      if (list) list.push(key)
      else perSide.set(bucket, [key])
    }
  }

  const fan = buildFan(perSide, places)

  for (const edge of edges) {
    const key = forgeRouteKey(edge.from, edge.to)
    const a = places.get(edge.from)!
    const b = places.get(edge.to)!
    const tier = getForgeNode(edge.to)?.tier ?? 'root'
    const radiusA = radiusOf(edge.from)
    const radiusB = radiusOf(edge.to)
    const own = new Set([edge.from, edge.to])
    const [sideA, sideB] = sides.get(key)!
    // Einmal je Kante, nicht je Kandidat — siehe `around()`.
    const blockers = around(all, a, b, LOCAL_MARGIN_PX)

    /**
     * Die Anläufe, in fester Reihenfolge — vom naheliegenden zum gründlichen.
     *
     * Gestaffelt und nicht alles auf einmal: der erste Anlauf trägt die grosse
     * Mehrheit, und ihn mit sechzehn Seitenkombinationen zu füttern hiesse, den
     * Normalfall für den Ausnahmefall zu bezahlen. Abgebrochen wird, sobald ein
     * Weg mit höchstens einem Knick steht — besser wird es nicht mehr.
     */
    const straight = straightOffsets(a, b, sideA)
    const near: [Side, number, Side, number][] = []
    if (straight !== null) near.push([sideA, straight[0], OPPOSITE[sideA], straight[1]])
    near.push([
      sideA,
      fan.get(fanSlot(edge.from, key)) ?? 0,
      sideB,
      fan.get(fanSlot(edge.to, key)) ?? 0,
    ])
    // Die Achse quer zur natürlichen genügt meist schon, wenn ein Nachbar
    // unmittelbar im Weg steht.
    near.push([crossSide(a, b), 0, sideB, 0])
    near.push([sideA, 0, crossSide(b, a), 0])
    near.push([crossSide(a, b), 0, crossSide(b, a), 0])

    let best: Attempt | null = null
    let nearest: Attempt | null = null
    let nearestDepth = Infinity
    const run = (sa: Side, oa: number, sb: Side, ob: number, wide: boolean): void => {
      const trial = bestOf(
        { centre: a, radius: radiusA, side: sa, offset: oa },
        { centre: b, radius: radiusB, side: sb, offset: ob },
        blockers,
        own,
        book,
        wide,
      )
      if (trial.best !== null && (best === null || trial.best.score < best.score)) best = trial.best
      if (trial.nearestDepth < nearestDepth) {
        nearestDepth = trial.nearestDepth
        nearest = trial.nearest
      }
    }

    for (const [sa, oa, sb, ob] of near) {
      run(sa, oa, sb, ob, false)
      // Ein Weg mit höchstens einem Knick ist so gut, wie es wird — weiter zu
      // suchen kostet nur.
      if (best !== null && best.turns <= 1) break
    }
    // Die volle Kreuztabelle ist der teuerste Teil dieser Rechnung (sechzehn
    // Seitenpaare mal die weite Kandidatenmenge) und wird deshalb NUR betreten,
    // wenn oben gar nichts frei war. Sie einmal für jede Kante mitlaufen zu
    // lassen kostete gemessen das Zehnfache — für Wege, die schon standen.
    if (best === null) {
      for (const sa of ['E', 'W', 'N', 'S'] as Side[]) {
        for (const sb of ['E', 'W', 'N', 'S'] as Side[]) {
          run(sa, 0, sb, 0, true)
          if (best !== null && best.turns <= 2) break
        }
        if (best !== null && best.turns <= 2) break
      }
    }

    let viaFallback = false
    if (best === null) {
      viaFallback = true
      const [portA, stubA] = portOf(a, radiusA, sideA, 0)
      const [portB, stubB] = portOf(b, radiusB, sideB, 0)
      const found = detour(stubA, stubB, blockers, own)
      if (found !== null) {
        const pts = tidy([portA, ...found, portB])
        best = { pts, turns: turnsOf(pts), score: 0 }
      } else if (nearest !== null) {
        // Auch die Suche kann scheitern. Dann steht trotzdem eine Linie da —
        // die mit der geringsten Durchdringung. Eine FEHLENDE Kante wäre die
        // schlechtere Auskunft als eine, die einen Rand streift.
        best = nearest
      } else {
        const pts = tidy([portA, stubA, { x: stubB.x, y: stubA.y }, stubB, portB])
        best = { pts, turns: turnsOf(pts), score: 0 }
      }
    }

    book.take(best.pts)
    out.set(key, {
      d: pathOf(best.pts),
      width: FORGE_LIMB_WIDTH[tier],
      turns: best.turns,
      viaFallback,
    })
  }

  routeCache = out
  return out
}

/**
 * Die fünf Stummel von der Sonne zu ihren Strahlen.
 *
 * Sie stehen in keiner Kantenliste, weil die Sonne kein Knoten ist — und sie
 * können nicht mitgecacht werden, weil ihr Ansatz am Körperrand mit der
 * Sonnenphase wandert. Fünf Aufrufe bei einem Phasenwechsel, sonst keiner.
 *
 * Auch sie laufen rechtwinklig. Ein radialer Strich wäre der einzige schräge im
 * ganzen Bild, und genau daran fiele er auf.
 *
 * Ihr Port sitzt dort, wo der STRAHL steht — nicht in der Mitte seiner Seite.
 * `sideToward()` legt zwei der fünf auf dieselbe Achse (Chimes/Click 54° und
 * Chimes/Sec 126° liegen beide unter der Sonne), und die träten sonst am
 * gleichen Punkt aus: EIN Strich, der sich erst weit darunter gabelt. Genau
 * dafür fächert `buildFan()` die Ports der Knoten; die Sonne bekommt es hier,
 * denn sie ist RUND — ihr Rand hat auf keiner Seite eine Mitte.
 */
export function forgeSunRoute(
  centre: Point,
  edgeRadius: number,
  toId: string,
  to: Point,
): ForgeRoute {
  const places = forgeTreePlacements()
  const all = sunBlockers ?? (sunBlockers = buildBlockers(places))
  const blockers = around(all, centre, to, LOCAL_MARGIN_PX)
  const own = new Set([toId, SUN_ID])
  const side = sideToward(centre, to)
  const radiusB = radiusOf(toId)
  const book = new ChannelBook()
  // Der Querversatz des Ziels; `portOf()` klemmt ihn auf `PORT_SPAN` und setzt
  // den Punkt AUF den Kreis.
  const spread = side === 'E' || side === 'W' ? to.y - centre.y : to.x - centre.x

  let best: Attempt | null = null
  const straight = straightOffsets(centre, to, side)
  if (straight !== null) {
    best = bestOf(
      { centre, radius: edgeRadius, side, offset: straight[0] },
      { centre: to, radius: radiusB, side: OPPOSITE[side], offset: straight[1] },
      blockers,
      own,
      book,
      false,
    ).best
  }
  if (best === null) {
    best = bestOf(
      { centre, radius: edgeRadius, side, offset: spread },
      { centre: to, radius: radiusB, side: sideToward(to, centre), offset: 0 },
      blockers,
      own,
      book,
      true,
    ).best
  }
  if (best === null) {
    const [portA, stubA] = portOf(centre, edgeRadius, side, spread)
    const [portB, stubB] = portOf(to, radiusB, sideToward(to, centre), 0)
    const pts = tidy([portA, stubA, { x: stubB.x, y: stubA.y }, stubB, portB])
    best = { pts, turns: turnsOf(pts), score: 0 }
  }
  return {
    d: pathOf(best.pts),
    width: FORGE_LIMB_WIDTH.root,
    turns: best.turns,
    viaFallback: false,
  }
}

/** Nur für Tests: die Modul-Caches leeren. */
export function _resetForgeRoutes(): void {
  routeCache = null
  sunBlockers = null
}
