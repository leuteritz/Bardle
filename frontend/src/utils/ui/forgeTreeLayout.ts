/**
 * Wo jeder Knoten des Star-Forge-Netzes auf der Bühne steht — und welche Kante
 * ihn mit welchem verbindet.
 *
 * Hier stand einmal eine STREUUNG: der Katalog nannte je Knoten einen
 * Basiswinkel, das Tier gab den Ringradius, und diese Datei verdrehte die Ringe
 * gegeneinander und versetzte darin jeden Knoten einzeln. Ein Mittel gegen ein
 * Raster, das es gab — fünfzehn Speichen, sieben Kreise, jeder Knoten auf einem
 * Kreuzungspunkt.
 *
 * Das Raster ist weg, und mit ihm die Streuung. An ihre Stelle tritt eine
 * KRÄFTESIMULATION, und der Unterschied ist nicht die Technik, sondern was
 * gemessen wird. Die Streuung fragte „liegt dieser Knoten weit genug von seiner
 * Speiche?" — eine Frage über das Raster. Die Relaxation fragt „hält dieses
 * Paar seine Luft, und ist diese Kante kurz genug?" — eine Frage über das Bild.
 * Nur die zweite lässt sich beantworten, wenn es keine Speiche mehr gibt.
 *
 * **Vier Schritte, und der dritte trägt das Ergebnis.**
 *
 *   1. Jeder Cluster bekommt seinen Mittelpunkt aus der Karte, plus einen
 *      deterministischen Versatz — ohne ihn bildeten die Mittelpunkte selbst
 *      ein Muster.
 *   2. Die Mitglieder werden um den Mittelpunkt ausgelegt, auf einer
 *      Golden-Angle-Spirale. Der goldene Winkel ist hier keine Zierde: er
 *      erzeugt bei KEINER Mitgliederzahl Speichen, und genau das soll
 *      verschwinden.
 *   3. Federn entlang jeder Kante ziehen zusammen, was zusammengehört;
 *      Abstossung hält frei, was sich berührt; ein schwacher Zug hält jeden
 *      Knoten in der Nähe seines Clusters. Feste Rundenzahl, keine Konvergenz —
 *      die Laufzeit ist damit beschränkt und das Ergebnis exakt reproduzierbar.
 *   4. Ein harter Trenn-Pass schiebt auseinander, was danach noch klebt.
 *
 * **Gewürfelt wird deterministisch aus der Id**, nie aus `Math.random()` und nie
 * aus einer Uhr — dasselbe Prinzip wie bei den gerollten Icons
 * (`utils/game/rolledIcons.ts`). Dasselbe Netz in jeder Sitzung, in jedem
 * Spielstand, in jedem Testlauf; nichts davon muss gespeichert werden.
 *
 * **Gerechnet wird EINMAL**, beim ersten Aufruf, danach aus dem Modul-Cache —
 * die Knotenmenge ist statisch, es gibt keinen Eingabewert, der sich ändern
 * könnte. Kein Anteil an irgendeinem Frame.
 *
 * Warum überhaupt ausgelagert und nicht in `ForgeTreePanel.vue`: Knoten, Kanten
 * und die Specs müssen von DERSELBEN Rechnung kommen. Stünde sie in der
 * Komponente, hinge der einzige Wächter gegen Überlappung an einem
 * Vue-Renderlauf. Schwesterdatei ist `skillTreeLayout.ts`, die dasselbe für den
 * Meep-Baum tut — auch dort verbindet eine quadratische Bézier zwei Knoten.
 */
import {
  FORGE_CLUSTER_GOLDEN_ANGLE_DEG,
  FORGE_CLUSTER_JITTER_PX,
  FORGE_CLUSTER_K,
  FORGE_CLUSTER_SEAT_SHARE,
  FORGE_EDGE_TARGET_PX,
  FORGE_LIMB_BOW,
  FORGE_LIMB_BOW_MIN,
  FORGE_LIMB_WIDTH,
  FORGE_MIN_AIR_PX,
  FORGE_NODE_DIAMETER,
  FORGE_RAY_DIST,
  FORGE_RELAX_ITERATIONS,
  FORGE_REPULSE_K,
  FORGE_ROOT_ANGLES_DEG,
  FORGE_SEPARATE_ITERATIONS,
  FORGE_SPRING_K,
  FORGE_STAGE_SIZE,
  FORGE_SUN_EDGE_GAP,
  SHOP_SUN_MAX_DIAMETER,
  SOLAR_BRANCHES,
} from '@/config/constants'
import { FORGE_NODES, getForgeNode } from '@/config/progression/starForge'
import { FORGE_BRIDGES, FORGE_CLUSTERS } from '@/config/progression/starForgeNet'
import type { ForgeUpgradeTier } from '@/types'

export interface Point {
  x: number
  y: number
}

/** Wozu eine Kante da ist. Die Art entscheidet, wie sie gezeichnet wird. */
export type ForgeEdgeKind = 'parent' | 'require' | 'bridge'

export interface ForgeEdge {
  from: string
  to: string
  kind: ForgeEdgeKind
}

export interface ForgeLimb {
  /** Fertiges `d`-Attribut einer quadratischen Bézier. */
  d: string
  /** Strichstärke des Grundastes. */
  width: number
}

const STAGE_HALF = FORGE_STAGE_SIZE / 2
/** Innenrand: der Körper in seiner GRÖSSTEN Phase plus der Abstand, hinter dem
 *  die Wurzeläste ansetzen. Kein Knoten darf davor stehen. */
const SUN_EDGE = SHOP_SUN_MAX_DIAMETER / 2 + FORGE_SUN_EDGE_GAP

// ── Der Würfel ────────────────────────────────────────────────────────────────
/** FNV-1a über die Zeichen — aus einem Namen wird ein Startwert. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** `mulberry32` — kurz, gut verteilt, und vor allem: bei gleichem Startwert
 *  immer dieselbe Folge. */
function rng(seed: string): () => number {
  let a = hashSeed(seed)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Geometrie ─────────────────────────────────────────────────────────────────
function polar(angleDeg: number, dist: number): Point {
  const a = (angleDeg * Math.PI) / 180
  return { x: STAGE_HALF + Math.cos(a) * dist, y: STAGE_HALF + Math.sin(a) * dist }
}

/** Der Abstand zwischen den RÄNDERN zweier Knoten — negativ heisst Überlappung. */
function airBetween(a: Seat, b: Seat): number {
  return Math.hypot(a.x - b.x, a.y - b.y) - (a.diameter + b.diameter) / 2
}

interface Seat {
  id: string
  tier: ForgeUpgradeTier
  diameter: number
  x: number
  y: number
  /** Mittelpunkt des eigenen Clusters — der schwache Zug hängt daran. */
  homeX: number
  homeY: number
  /** Wie weit dieser Knoten von seinem Clustermittelpunkt entfernt sein darf. */
  homeRadius: number
}

// ── Die Kanten ────────────────────────────────────────────────────────────────
let edgeCache: ForgeEdge[] | null = null

/**
 * Alle Verbindungen des Netzes, aus DREI Quellen.
 *
 * `parent` ist die Struktur: woran ein Knoten hängt, und damit seine
 * Grundbedingung. `require` ist die Zusatzbedingung einer Krone oder eines
 * endlosen Astes — sie war früher unsichtbar, weil ihre beiden Enden gar nicht
 * gleichzeitig ins Bild passten; im Netz ist sie kurz und wird deshalb
 * gezeichnet. `bridge` schaltet nichts frei, sondern hält das Bild zusammen.
 *
 * Dass alle drei durch dieselbe Liste laufen, ist der Punkt: sie sind zugleich
 * Federkraft im Layout und Pfad im SVG. Zwei Listen für dieselbe Menge liefen
 * beim ersten umgehängten Knoten auseinander.
 */
export function forgeEdges(): readonly ForgeEdge[] {
  if (edgeCache !== null) return edgeCache
  const out: ForgeEdge[] = []
  for (const def of FORGE_NODES) {
    out.push({ from: def.parentId, to: def.id, kind: 'parent' })
    for (const req of def.requires ?? []) {
      out.push({ from: req.id, to: def.id, kind: 'require' })
    }
  }
  for (const bridge of FORGE_BRIDGES) {
    out.push({ from: bridge.from, to: bridge.to, kind: 'bridge' })
  }
  edgeCache = out
  return out
}

// ── Schritt 1 und 2: Cluster setzen, Mitglieder auslegen ──────────────────────
function seatEveryone(): Seat[] {
  const seats: Seat[] = []

  // Die fünf Strahlen sitzen fest. Sie gehören keinem Cluster: sie sind der
  // Anfang, an dem alles hängt, und ihre Winkel sind die einzige Ordnung, die
  // aus der Zeit der Speichen übrig bleibt — fünf Richtungen, keine fünfzehn.
  for (const ray of SOLAR_BRANCHES) {
    const at = polar(FORGE_ROOT_ANGLES_DEG[ray.id], FORGE_RAY_DIST)
    seats.push({
      id: ray.id,
      tier: 'root',
      diameter: FORGE_NODE_DIAMETER.root,
      x: at.x,
      y: at.y,
      homeX: at.x,
      homeY: at.y,
      homeRadius: 0,
    })
  }

  for (const cluster of FORGE_CLUSTERS) {
    const next = rng(`forge-cluster:${cluster.id}`)
    const jitterA = (next() * 2 - 1) * FORGE_CLUSTER_JITTER_PX
    const jitterD = (next() * 2 - 1) * FORGE_CLUSTER_JITTER_PX
    const centre = polar(cluster.angleDeg, cluster.dist)
    centre.x += jitterA
    centre.y += jitterD

    cluster.members.forEach((memberId, index) => {
      const def = getForgeNode(memberId)
      // Ein Name in der Karte, den der Katalog nicht kennt, wäre ein Knoten
      // ohne Wirkung. Die Spec fängt ihn; hier wird er still übergangen, damit
      // ein Tippfehler nicht die ganze Bühne leert.
      if (!def) return
      const seed = rng(`forge-seat:${memberId}`)
      const spin = index * FORGE_CLUSTER_GOLDEN_ANGLE_DEG + cluster.angleDeg
      const reach = cluster.radius * (FORGE_CLUSTER_SEAT_SHARE + seed() * 0.3)
      // `chain` legt seine Mitglieder radial hintereinander, `fan` quer dazu,
      // `knot` rundherum. Alle drei starten aus derselben Spirale — die Form
      // entscheidet nur, wie stark sie in eine Richtung gestaucht wird.
      const rad = (spin * Math.PI) / 180
      const along = Math.cos(rad) * reach
      const across = Math.sin(rad) * reach
      const outward = (cluster.angleDeg * Math.PI) / 180
      const ox = Math.cos(outward)
      const oy = Math.sin(outward)
      let dx: number
      let dy: number
      if (cluster.shape === 'chain') {
        dx = ox * along - oy * across * 0.45
        dy = oy * along + ox * across * 0.45
      } else if (cluster.shape === 'fan') {
        dx = ox * along * 0.45 - oy * across
        dy = oy * along * 0.45 + ox * across
      } else {
        dx = ox * along - oy * across
        dy = oy * along + ox * across
      }
      seats.push({
        id: memberId,
        tier: def.tier,
        diameter: FORGE_NODE_DIAMETER[def.tier],
        x: centre.x + dx,
        y: centre.y + dy,
        homeX: centre.x,
        homeY: centre.y,
        homeRadius: cluster.radius,
      })
    })
  }

  return seats
}

// ── Schritt 3: entspannen ─────────────────────────────────────────────────────
/**
 * Drei Kräfte, und jede beantwortet eine der drei Zusagen dieses Umbaus.
 *
 * Die FEDER entlang einer Kante zieht auf `FORGE_EDGE_TARGET_PX` zusammen und
 * ist die Antwort auf „jede Voraussetzung ist ein sichtbarer Nachbar". Sie zieht
 * nur, wenn die Kante zu lang ist, und drückt, wenn sie zu kurz ist — sonst
 * fielen zwei verbundene Knoten ineinander.
 *
 * Die ABSTOSSUNG wirkt zwischen JEDEM Paar, das näher steht als
 * `FORGE_MIN_AIR_PX`, und ist die Antwort auf „nichts überlappt".
 *
 * Der HEIMZUG hält einen Knoten in der Nähe seines Clusters und ist die Antwort
 * auf „eine Phase ist eine Zone". Er ist mit Abstand der schwächste der drei:
 * er ordnet, er zwingt nicht. Wäre er stark, presste er die Cluster zu Kugeln
 * und die Kanten dazwischen würden lang.
 */
function relax(seats: Seat[]): void {
  const byId = new Map(seats.map((s) => [s.id, s]))
  const edges = forgeEdges()
  const pairs: [Seat, Seat][] = []
  for (const edge of edges) {
    const a = byId.get(edge.from)
    const b = byId.get(edge.to)
    if (a && b) pairs.push([a, b])
  }

  for (let round = 0; round < FORGE_RELAX_ITERATIONS; round++) {
    // Federn
    for (const [a, b] of pairs) {
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy) || 1
      const pull = ((dist - FORGE_EDGE_TARGET_PX) / dist) * FORGE_SPRING_K * 0.5
      // Ein Strahl steht fest — er ist der Anker, nicht der Gezogene.
      const aFixed = a.tier === 'root'
      const bFixed = b.tier === 'root'
      if (!aFixed) {
        a.x += dx * pull * (bFixed ? 2 : 1)
        a.y += dy * pull * (bFixed ? 2 : 1)
      }
      if (!bFixed) {
        b.x -= dx * pull * (aFixed ? 2 : 1)
        b.y -= dy * pull * (aFixed ? 2 : 1)
      }
    }

    // Abstossung
    for (let i = 0; i < seats.length; i++) {
      for (let j = i + 1; j < seats.length; j++) {
        const a = seats[i]
        const b = seats[j]
        const want = (a.diameter + b.diameter) / 2 + FORGE_MIN_AIR_PX
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy)
        if (dist >= want || dist === 0) continue
        const push = ((want - dist) / dist) * FORGE_REPULSE_K * 0.5
        if (a.tier !== 'root') {
          a.x -= dx * push
          a.y -= dy * push
        }
        if (b.tier !== 'root') {
          b.x += dx * push
          b.y += dy * push
        }
      }
    }

    // Heimzug und Klemmung
    for (const seat of seats) {
      if (seat.tier === 'root') continue
      const dx = seat.homeX - seat.x
      const dy = seat.homeY - seat.y
      const dist = Math.hypot(dx, dy)
      if (dist > seat.homeRadius) {
        const over = (dist - seat.homeRadius) / dist
        seat.x += dx * over * FORGE_CLUSTER_K
        seat.y += dy * over * FORGE_CLUSTER_K
      }
      clampToStage(seat)
    }
  }
}

/** Kein Knoten steckt in der Sonne oder ragt über die Bühnenkante. */
function clampToStage(seat: Seat): void {
  const half = seat.diameter / 2
  const dx = seat.x - STAGE_HALF
  const dy = seat.y - STAGE_HALF
  const dist = Math.hypot(dx, dy) || 1
  const min = SUN_EDGE + half
  const max = STAGE_HALF - half
  if (dist < min) {
    seat.x = STAGE_HALF + (dx / dist) * min
    seat.y = STAGE_HALF + (dy / dist) * min
  } else if (dist > max) {
    seat.x = STAGE_HALF + (dx / dist) * max
    seat.y = STAGE_HALF + (dy / dist) * max
  }
}

// ── Schritt 4: der harte Trenn-Pass ───────────────────────────────────────────
/**
 * Was nach der Relaxation noch klebt, wird entlang seiner Verbindungsachse
 * symmetrisch auseinandergeschoben.
 *
 * Er WIRFT nicht, wenn er es nicht schafft. Ein Laufzeitfehler beim Spieler
 * wäre die schlechteste aller Meldungen; der Wächter ist die Spec, die dieselbe
 * Bedingung bei jedem Testlauf nachrechnet und mit lesbarem Text bricht.
 */
function separate(seats: Seat[]): void {
  for (let round = 0; round < FORGE_SEPARATE_ITERATIONS; round++) {
    let moved = false
    for (let i = 0; i < seats.length; i++) {
      for (let j = i + 1; j < seats.length; j++) {
        const a = seats[i]
        const b = seats[j]
        const air = airBetween(a, b)
        if (air >= FORGE_MIN_AIR_PX) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy) || 1
        const shift = (FORGE_MIN_AIR_PX - air) / 2
        const ux = (dx / dist) * shift
        const uy = (dy / dist) * shift
        if (a.tier !== 'root') {
          a.x -= ux
          a.y -= uy
          clampToStage(a)
        }
        if (b.tier !== 'root') {
          b.x += ux
          b.y += uy
          clampToStage(b)
        }
        moved = true
      }
    }
    if (!moved) break
  }
}

// ── Das Ergebnis ──────────────────────────────────────────────────────────────
let cache: Map<string, Point> | null = null

/**
 * Platz jedes Knotens — Strahlen wie Katalogknoten, über die Id abrufbar, in
 * Bühnen-Pixeln.
 *
 * Kartesisch und nicht mehr polar: im Netz denkt nichts mehr in Winkel und
 * Radius, und eine Polarangabe wäre nur ein umständlich geschriebenes (x, y).
 */
export function forgeTreePlacements(): ReadonlyMap<string, Point> {
  if (cache !== null) return cache
  const seats = seatEveryone()
  relax(seats)
  separate(seats)
  cache = new Map(
    seats.map((s) => [s.id, { x: Math.round(s.x * 10) / 10, y: Math.round(s.y * 10) / 10 }]),
  )
  return cache
}

/** Die längste Kante des fertigen Netzes — die Spec misst daran, ob beide Enden
 *  einer Bedingung gleichzeitig ins Bild passen (`FORGE_EDGE_MAX_PX`). */
export function forgeLongestEdge(): { edge: ForgeEdge; length: number } | null {
  const places = forgeTreePlacements()
  let worst: { edge: ForgeEdge; length: number } | null = null
  for (const edge of forgeEdges()) {
    const a = places.get(edge.from)
    const b = places.get(edge.to)
    if (!a || !b) continue
    const length = Math.hypot(a.x - b.x, a.y - b.y)
    if (!worst || length > worst.length) worst = { edge, length }
  }
  return worst
}

/** Die engste Stelle des fertigen Netzes, gemessen zwischen den RÄNDERN. */
export function forgeTightestPair(): { a: string; b: string; air: number } | null {
  const places = forgeTreePlacements()
  const ids = [...places.keys()]
  let worst: { a: string; b: string; air: number } | null = null
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const pa = places.get(ids[i])!
      const pb = places.get(ids[j])!
      const da = FORGE_NODE_DIAMETER[tierOf(ids[i])]
      const db = FORGE_NODE_DIAMETER[tierOf(ids[j])]
      const air = Math.hypot(pa.x - pb.x, pa.y - pb.y) - (da + db) / 2
      if (!worst || air < worst.air) worst = { a: ids[i], b: ids[j], air }
    }
  }
  return worst
}

function tierOf(id: string): ForgeUpgradeTier {
  return getForgeNode(id)?.tier ?? 'root'
}

// ── Die Äste ──────────────────────────────────────────────────────────────────
/**
 * Der geschwungene Weg von einem Punkt zum nächsten.
 *
 * Eine quadratische Bézier, deren Kontrollpunkt seitlich neben der Sehnenmitte
 * liegt: Betrag `FORGE_LIMB_BOW` mal Sehnenlänge, Vorzeichen und Anteil aus dem
 * Seed. `FORGE_LIMB_BOW_MIN` verhindert den Wurf nahe null — ein einzelner
 * schnurgerader Ast zwischen lauter geschwungenen fällt sofort auf.
 *
 * Die Strichstärke kommt aus der Ebene des ZIELS, nicht des Ursprungs: das Netz
 * verjüngt sich damit nach aussen, jede Kante ist so dick wie das, woran sie
 * hängt.
 */
export function forgeLimb(from: Point, to: Point, seed: string, tier: ForgeUpgradeTier): ForgeLimb {
  return {
    d: bowPath(from, to, `forge-limb:${seed}`, FORGE_LIMB_BOW),
    width: FORGE_LIMB_WIDTH[tier],
  }
}

/**
 * Eine quadratische Bézier, deren Kontrollpunkt seitlich neben der Sehnenmitte
 * liegt: Betrag `bow` mal Sehnenlänge, Vorzeichen und Anteil aus dem Seed.
 */
function bowPath(from: Point, to: Point, seed: string, bowFraction: number): string {
  const next = rng(seed)
  const dx = to.x - from.x
  const dy = to.y - from.y
  const chord = Math.hypot(dx, dy) || 1

  const sign = next() < 0.5 ? -1 : 1
  const share = FORGE_LIMB_BOW_MIN + next() * (1 - FORGE_LIMB_BOW_MIN)
  const bow = sign * share * bowFraction * chord

  // Normale auf der Sehne, auf Einheitslänge gebracht.
  const nx = -dy / chord
  const ny = dx / chord
  const cx = (from.x + to.x) / 2 + nx * bow
  const cy = (from.y + to.y) / 2 + ny * bow

  return `M ${round(from.x)} ${round(from.y)} Q ${round(cx)} ${round(cy)} ${round(to.x)} ${round(to.y)}`
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
