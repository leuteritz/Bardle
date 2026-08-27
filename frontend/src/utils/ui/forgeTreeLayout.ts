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
 * Vue-Renderlauf. WIE eine Linie von hier nach dort kommt, steht nicht mehr in
 * dieser Datei — das beantwortet `forgeEdgeRoute.ts`, siehe unten.
 */
import {
  FORGE_CLUSTER_GOLDEN_ANGLE_DEG,
  FORGE_CLUSTER_JITTER_PX,
  FORGE_CLUSTER_K,
  FORGE_CLUSTER_SEAT_SHARE,
  FORGE_CLUSTER_SECTOR_SPREAD,
  FORGE_COMFORT_AIR_PX,
  FORGE_EDGE_TARGET_PX,
  FORGE_MIN_AIR_PX,
  FORGE_NODE_DIAMETER,
  FORGE_RAY_DIST,
  FORGE_RELAX_ITERATIONS,
  FORGE_REPULSE_K,
  FORGE_ROAD_BAND,
  FORGE_ROAD_SECTOR_SPREAD,
  FORGE_ROOT_ANGLES_DEG,
  FORGE_SEPARATE_ITERATIONS,
  FORGE_SPRING_K,
  FORGE_STAGE_SIZE,
  FORGE_SUN_EDGE_GAP,
  FORGE_ZONE_BAND,
  SHOP_SUN_MAX_DIAMETER,
  SOLAR_BRANCHES,
} from '@/config/constants'
import { FORGE_CONSTELLATIONS, FORGE_NODES } from '@/config/progression/starForge'
import { FORGE_BRIDGES, FORGE_CLUSTERS } from '@/config/progression/starForgeNet'
import { forgeSeatTier, getForgeSeat } from '@/config/progression/forgeSeats'
import { MEEP_TREE_NODE_INDEX } from '@/config/progression/meepTree'
import type { ForgeClusterDef, ForgeUpgradeTier } from '@/types'

export interface Point {
  x: number
  y: number
}

/** Wozu eine Kante da ist. Die Art entscheidet, wie sie gezeichnet wird. */
/**
 * `path` ist die Kette von The Wandering — und bewusst NICHT `parent`.
 *
 * Ein `parent` ist ein UND mit Stufenforderung. Die Meep-Kette ist ein ODER:
 * ein Knoten geht auf, sobald IRGENDEINER des Rangs darunter gelernt ist
 * (`meepTree.ts`, `req` wird dort aus `tier` abgeleitet). Zwei Aussagen, zwei
 * Strichbilder — dieselbe Begründung, aus der eine Bedingungskante
 * gestrichelt läuft.
 */
export type ForgeEdgeKind = 'parent' | 'require' | 'bridge' | 'path'

export interface ForgeEdge {
  from: string
  to: string
  kind: ForgeEdgeKind
}

const STAGE_HALF = FORGE_STAGE_SIZE / 2
/** Der grösste Sonnenkörper — der Anker muss jeder Phase ausweichen. */
const SUN_MAX_R = SHOP_SUN_MAX_DIAMETER / 2
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
  /** Der Ringabschnitt, in dem dieser Knoten bleiben soll. `null` für die
   *  Strahlen: sie stehen fest und gehören keiner Zone. */
  sector: Sector | null
}

/**
 * Der Platz eines Clusters — ein RINGABSCHNITT, kein Kreis.
 *
 * Hier stand `homeRadius`, ein Kreis um die Clustermitte mit einer Handzahl aus
 * der Karte (82…104). Der Kreis war das eigentliche Übel: er fasste seine
 * Mitglieder nur, wenn sie sich berührten (gemessen: Median-Luft 22,0 px, also
 * exakt der Anschlag), und liess vom Ring, auf dem die fünf Cluster einer Zone
 * sitzen, mehr als die Hälfte leer.
 *
 * Ein Ringabschnitt passt dagegen zu der Form, die das Netz ohnehin hat: die
 * Zonen SIND Ringe. Radial begrenzt ihn das Band seiner Phase (`FORGE_ZONE_BAND`,
 * das damit erstmals eine Schranke ist statt einer Notiz), tangential sein
 * Anteil am Umfang — mit Überlappung zum Nachbarn, damit zwischen zwei Clustern
 * keine Naht sichtbar wird.
 */
interface Sector {
  /** Mittelwinkel aus der Karte, in Grad. */
  angleDeg: number
  /** Halbe tangentiale Weite in Grad, inklusive Überlappung. */
  halfSpanDeg: number
  inner: number
  outer: number
}

/** Der Abschnitt eines Clusters: die Weite folgt aus der ANZAHL der Cluster
 *  seiner Phase, nicht aus einer Zahl in der Karte. */
/** Der Schluessel, unter dem ein Cluster seine Nachbarn zaehlt — die Phase bei
 *  der Sonne, der Rang auf der Strasse. Zwei Regionen teilen sich keinen Ring. */
function zoneKeyOf(cluster: ForgeClusterDef): string {
  return cluster.region === 'road' ? `road:${cluster.rank}` : `sun:${cluster.phase}`
}

function sectorOf(cluster: ForgeClusterDef): Sector {
  const key = zoneKeyOf(cluster)
  const peers = FORGE_CLUSTERS.filter((c) => zoneKeyOf(c) === key).length || 1
  const band =
    cluster.region === 'road'
      ? (FORGE_ROAD_BAND[cluster.rank] ?? FORGE_ROAD_BAND[FORGE_ROAD_BAND.length - 1])
      : (FORGE_ZONE_BAND[cluster.phase] ?? FORGE_ZONE_BAND[FORGE_ZONE_BAND.length - 1])
  const spread = cluster.region === 'road' ? FORGE_ROAD_SECTOR_SPREAD : FORGE_CLUSTER_SECTOR_SPREAD
  return {
    angleDeg: cluster.angleDeg,
    halfSpanDeg: (360 / peers) * spread,
    inner: band.inner,
    outer: band.outer,
  }
}

/** Die kürzeste Drehung von `a` nach `b`, in Grad und vorzeichenbehaftet. */
function angleDelta(a: number, b: number): number {
  return ((((b - a) % 360) + 540) % 360) - 180
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
  // Die Kette von The Wandering. `req` ist im Katalog bereits aus `tier`
  // abgeleitet — an der Gabel auf Rang 4 bekommt der Knoten darüber deshalb
  // ZWEI eingehende Kanten, und die Feder zieht ihn zwischen beide.
  for (const [id, entry] of Object.entries(MEEP_TREE_NODE_INDEX)) {
    for (const req of entry.req) out.push({ from: req, to: id, kind: 'path' })
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
      sector: null,
    })
  }

  for (const cluster of FORGE_CLUSTERS) {
    const sector = sectorOf(cluster)
    const depth = sector.outer - sector.inner
    const count = cluster.members.length || 1

    cluster.members.forEach((memberId, index) => {
      const seat = getForgeSeat(memberId)
      // Ein Name in der Karte, den KEIN Katalog kennt, wäre ein Knoten ohne
      // Wirkung. Die Spec fängt ihn; hier wird er still übergangen, damit ein
      // Tippfehler nicht die ganze Bühne leert.
      if (!seat) return
      const seed = rng(`forge-seat:${memberId}`)

      // Der goldene Winkel bleibt — und aus demselben Grund wie immer: er
      // erzeugt bei KEINER Mitgliederzahl Speichen. Neu ist nur, worauf er
      // abgebildet wird. Er lief einmal auf einen KREIS um die Clustermitte und
      // machte daraus ein Knäuel; jetzt läuft er auf die BREITE des Abschnitts,
      // und daraus wird ein Band.
      const spin = ((index * FORGE_CLUSTER_GOLDEN_ANGLE_DEG) % 360) / 360
      const across = (spin * 2 - 1) * sector.halfSpanDeg * FORGE_CLUSTER_SEAT_SHARE
      // Radial gestaffelt statt gestapelt: die Mitglieder verteilen sich über
      // die TIEFE des Bandes, statt alle auf demselben Radius zu liegen. Der
      // Wurf bricht das Muster, das fünf gleich gestaffelte Cluster sonst
      // gemeinsam bildeten.
      const along =
        sector.inner + depth * ((index + 0.5) / count) + (seed() * 2 - 1) * FORGE_CLUSTER_JITTER_PX
      const at = polar(sector.angleDeg + across, clamp(along, sector.inner, sector.outer))

      seats.push({
        id: memberId,
        tier: seat.tier,
        diameter: FORGE_NODE_DIAMETER[seat.tier],
        x: at.x,
        y: at.y,
        sector,
      })
    })
  }

  return seats
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value
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
 * Die ABSTOSSUNG ist die Antwort auf „überall gleich viel Platz" — und sie ist
 * der Teil, der sich geändert hat. Sie wirkte einmal nur unterhalb von
 * `FORGE_MIN_AIR_PX` und hörte darüber schlagartig auf. Das beantwortet
 * „berührt sich nicht", nicht „steht gleichmässig": gemessen lag der MEDIAN
 * aller Nächster-Nachbar-Abstände auf exakt dem Anschlag (22,0 px), während
 * anderswo 112 px frei blieben.
 *
 * Jetzt wirkt sie bis `FORGE_COMFORT_AIR_PX` und nimmt dabei linear ab. Der
 * Unterschied ist der zwischen einem Stapel und einem GAS: jeder Knoten drückt
 * seine Nachbarn, so weit er kann, und weil das alle tun, endet es dort, wo alle
 * gleich weit auseinander stehen. Unter der harten Grenze bleibt sie zusätzlich
 * steif — dort ist sie kein Wunsch mehr, sondern eine Sperre.
 *
 * Der SEKTORZUG hält einen Knoten in seinem Ringabschnitt und ist die Antwort
 * auf „eine Phase ist eine Zone". Er ersetzt den Heimzug zur Clustermitte, und
 * das ist derselbe Gedanke wie bei der Abstossung: ein Kreis um einen Punkt
 * presst zusammen, ein Ringabschnitt lässt verteilen. Radial hält ihn das Band
 * seiner Phase, tangential seine Sektorweite.
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

    // Abstossung — weich bis zum Komfortabstand, steif unter der harten Grenze
    for (let i = 0; i < seats.length; i++) {
      for (let j = i + 1; j < seats.length; j++) {
        const a = seats[i]
        const b = seats[j]
        const touch = (a.diameter + b.diameter) / 2
        const want = touch + FORGE_COMFORT_AIR_PX
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy)
        if (dist >= want || dist === 0) continue
        // Volle Kraft, solange die harte Grenze verletzt ist; darüber nimmt sie
        // linear ab, bis sie am Komfortabstand null wird. Ohne dieses Abklingen
        // stiessen sich zwei Knoten mit 64 px Luft so heftig ab wie zwei, die
        // sich berühren — und das Netz käme nie zur Ruhe.
        const hard = touch + FORGE_MIN_AIR_PX
        const weight = dist <= hard ? 1 : (want - dist) / (want - hard)
        const push = ((want - dist) / dist) * FORGE_REPULSE_K * 0.5 * weight
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

    // Sektorzug und Klemmung
    for (const seat of seats) {
      if (seat.tier === 'root') continue
      pullIntoSector(seat, FORGE_CLUSTER_K)
      clampToStage(seat)
    }
  }
}

/**
 * Zurück in den eigenen Ringabschnitt — getrennt nach radial und tangential.
 *
 * Zwei Grenzen statt einer, und das ist der Punkt: ein Kreis um die Clustermitte
 * zog einen Knoten IMMER zur Mitte zurück und presste die Mitglieder damit
 * zusammen. Ein Ringabschnitt lässt ihn im ganzen Band wandern und greift nur
 * an seinen Rändern ein — radial am Zonenband, tangential an der Sektorweite.
 *
 * Die Kraft ist bewusst schwach (`FORGE_CLUSTER_K`): sie ordnet über viele
 * Runden, statt in einer zu zwingen. Ein harter Sprung an der Sektorgrenze
 * erzeugte eine sichtbare Naht — genau die Kante, die es nicht geben soll.
 */
function pullIntoSector(seat: Seat, strength: number): void {
  const sector = seat.sector
  if (sector === null) return
  const dx = seat.x - STAGE_HALF
  const dy = seat.y - STAGE_HALF
  const dist = Math.hypot(dx, dy) || 1
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI

  const wantDist = clamp(dist, sector.inner, sector.outer)
  const drift = angleDelta(sector.angleDeg, angle)
  const wantAngle =
    sector.angleDeg +
    (drift > sector.halfSpanDeg
      ? sector.halfSpanDeg
      : drift < -sector.halfSpanDeg
        ? -sector.halfSpanDeg
        : drift)

  if (wantDist === dist && wantAngle === angle) return
  // Radial zieht es DREIMAL so stark wie tangential, und das ist keine
  // Feinjustage: die beiden Grenzen tragen Verschiedenes. Radial steht die
  // Phasen-Leiter — eine spätere Zone liegt weiter draussen, sonst wüchse der
  // Baum nach innen. Tangential steht nur, welcher Cluster wo liegt, und dort
  // ist ein Überlaufen zum Nachbarn ausdrücklich erlaubt.
  //
  // Ohne diesen Unterschied verlor die Bandgrenze gegen die Kanten-Feder: ein
  // Zweig hängt an einem Solar Ray auf r = 200, die Feder will 150 px Kante,
  // und beides zusammen zog ihn 41 px unter sein Band.
  const radial = polar(angle, wantDist)
  seat.x += (radial.x - seat.x) * strength * 2
  seat.y += (radial.y - seat.y) * strength * 2
  const target = polar(wantAngle, wantDist)
  seat.x += (target.x - seat.x) * strength
  seat.y += (target.y - seat.y) * strength
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

/** Wo ein Cluster wirklich liegt, samt seiner Ausdehnung — die Grundlage des
 *  Zonenschleiers. */
export interface ForgeClusterSpot {
  id: string
  /** Sonnenphase — auf der Strasse `-1`, sie gehoert keiner. */
  phase: number
  accent: string
  x: number
  y: number
  /** Radius, der alle Mitglieder samt ihrer Kreise umschliesst. */
  r: number
}

let spotCache: ForgeClusterSpot[] | null = null

/**
 * Der Fleck eines Clusters — aus den TATSÄCHLICHEN Positionen seiner Mitglieder.
 *
 * Der Schleier malte ihn bisher an den Kartenpunkt (`angleDeg`/`dist`) mit dem
 * Karten-`radius`. Das ging, solange die Mitglieder als Knäuel um genau diesen
 * Punkt lagen. Seit sie ihren Ringabschnitt füllen, wäre der Fleck eine zweite
 * Behauptung über denselben Ort — und die falsche von beiden.
 *
 * Er sagt weiterhin „all das hier gehört zusammen"; neu ist nur, dass es
 * stimmt. Gerechnet aus dem Schwerpunkt und dem weitesten Mitglied, einmal und
 * modulweit gecacht wie alles hier.
 */
export function forgeClusterSpots(): readonly ForgeClusterSpot[] {
  if (spotCache !== null) return spotCache
  const places = forgeTreePlacements()
  const out: ForgeClusterSpot[] = []
  for (const cluster of FORGE_CLUSTERS) {
    const seats = cluster.members
      .map((id) => ({ id, at: places.get(id) }))
      .filter((m): m is { id: string; at: Point } => m.at !== undefined)
    if (seats.length === 0) continue
    const x = seats.reduce((s, m) => s + m.at.x, 0) / seats.length
    const y = seats.reduce((s, m) => s + m.at.y, 0) / seats.length
    // Der MEDIAN der Abstände, nicht das Maximum.
    //
    // Ein Cluster ist ein Bogen; ein Kreis, der ihn ganz umschliesst, deckt vor
    // allem den leeren Raum daneben ab. Mit dem Maximum wuchsen die
    // fünfundzwanzig Flecken so weit, dass sie sich zu einem Farbteppich
    // überlagerten — gemessen im Browser, und im Bild sofort sichtbar. Der
    // Median markiert stattdessen den KERN und läuft nach aussen aus, was ein
    // Verlauf ohnehin tut.
    const reaches = seats
      .map((m) => Math.hypot(m.at.x - x, m.at.y - y) + FORGE_NODE_DIAMETER[forgeSeatTier(m.id)] / 2)
      .sort((a, b) => a - b)
    const r = reaches[Math.floor(reaches.length / 2)]
    out.push({
      id: cluster.id,
      phase: cluster.region === 'road' ? -1 : cluster.phase,
      accent: cluster.accent,
      x: Math.round(x),
      y: Math.round(y),
      r: Math.round(r),
    })
  }
  spotCache = out
  return out
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
      const da = FORGE_NODE_DIAMETER[forgeSeatTier(ids[i])]
      const db = FORGE_NODE_DIAMETER[forgeSeatTier(ids[j])]
      const air = Math.hypot(pa.x - pb.x, pa.y - pb.y) - (da + db) / 2
      if (!worst || air < worst.air) worst = { a: ids[i], b: ids[j], air }
    }
  }
  return worst
}

/**
 * Ein freier Platz auf der Bühne, nahe bei diesen Punkten — für einen Körper,
 * der KEINEN Sitz hat.
 *
 * Es gibt genau einen solchen Körper: die verfolgte Konstellation. Sie steht in
 * keinem Cluster und hat keine Koordinate, soll aber im Netz zu sehen sein, mit
 * Linien zu ihren Toren. Dafür braucht sie eine Stelle, an der sie keinen
 * echten Knoten verdeckt.
 *
 * **Vom Schwerpunkt NACH AUSSEN.** Der Schwerpunkt der Tore ist der Ort, den
 * eine Fusion meint — dort liegen aber gerade die Knoten, um die es geht. Das
 * Netz wächst nach aussen, also weicht sie in dieselbe Richtung aus: „diese
 * drei führen dorthin" liest sich dann von selbst, statt „dorthin und wieder
 * zurück".
 *
 * Gemessen wird RAND gegen RAND, dieselbe Formel wie `forgeTightestPair()` —
 * `airBetween()` und `separate()` arbeiten auf dem internen Sitz-Typ und taugen
 * hier nicht.
 *
 * Fester Schrittzahl und keine Konvergenz: die Laufzeit ist beschränkt und das
 * Ergebnis exakt reproduzierbar, dieselbe Zusage wie bei den Sitzen selbst.
 */
/* Der Suchlauf des Ankers: 8-px-Schritte, höchstens 140 davon (1120 px) — mehr
   als die Tiefe eines Bandes, und darüber hinaus wäre er nicht mehr „nahe bei".
   Ein reiner Strahl nach aussen findet nichts: gemessen lief er in
   `driftersDue` und endete mit 19,8 px Luft.

   Gefächert bis ±90°, damit die Suche den NÄCHSTGELEGENEN freien Platz findet
   statt einen weit draussen — ein gestreckter Weg sagt nichts, was ein kurzer
   nicht auch sagt. Weiter als 90° geht nicht: dort kippt der Punkt nach innen.
   Bei genau 90° ist der radiale Anteil null und der Abstand wächst trotzdem,
   weil der Schub selbst quadratisch eingeht. */
const ANCHOR_STEP_PX = 8
const ANCHOR_STEPS = 140
const ANCHOR_FAN_DEG = [
  0, 10, -10, 20, -20, 30, -30, 40, -40, 50, -50, 60, -60, 70, -70, 80, -80, 90, -90,
] as const

export function forgeFreeAnchor(
  near: readonly Point[],
  radius: number,
  avoid: readonly { at: Point; radius: number }[] = [],
): Point {
  if (near.length === 0) return { x: STAGE_HALF, y: STAGE_HALF }

  const cx = near.reduce((sum, p) => sum + p.x, 0) / near.length
  const cy = near.reduce((sum, p) => sum + p.y, 0) / near.length

  // Die Richtung nach aussen. Steht der Schwerpunkt zufällig auf der Sonne,
  // taugt kein Strahl — dann nach oben, das ist die einzige Wahl ohne Vorzug.
  let dx = cx - STAGE_HALF
  let dy = cy - STAGE_HALF
  const dist = Math.hypot(dx, dy)
  if (dist < 1) {
    dx = 0
    dy = -1
  } else {
    dx /= dist
    dy /= dist
  }

  const places = forgeTreePlacements()
  const clear = (x: number, y: number): boolean => {
    // Die SONNE ist kein Sitz und stünde deshalb in keiner Prüfung — gemessen
    // landeten zwei Körper auf ihrer Scheibe. Gerechnet gegen den GRÖSSTEN
    // Durchmesser, damit keine Sonnenphase sie später verschluckt.
    if (Math.hypot(x - STAGE_HALF, y - STAGE_HALF) - (SUN_MAX_R + radius) < FORGE_MIN_AIR_PX) {
      return false
    }
    for (const [id, at] of places) {
      const r = FORGE_NODE_DIAMETER[forgeSeatTier(id)] / 2
      if (Math.hypot(at.x - x, at.y - y) - (r + radius) < FORGE_MIN_AIR_PX) return false
    }
    // Und den anderen Körpern OHNE Sitz ebenso ausweichen — sie stehen in
    // keiner Platzierung, wären also sonst füreinander unsichtbar.
    for (const other of avoid) {
      if (Math.hypot(other.at.x - x, other.at.y - y) - (other.radius + radius) < FORGE_MIN_AIR_PX) {
        return false
      }
    }
    return true
  }

  const { stageRadius } = forgeContentBounds()
  const snap = (x: number, y: number): Point => ({
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  })

  // Erst die Entfernung, dann der Winkel: der nächstgelegene freie Platz
  // gewinnt, und unter gleich weiten der geradeste. Die Reihenfolge IST das
  // Ergebnis — sie macht die Suche reproduzierbar.
  let fallback: Point | null = null
  for (let step = 1; step <= ANCHOR_STEPS; step++) {
    const push = step * ANCHOR_STEP_PX
    for (const deg of ANCHOR_FAN_DEG) {
      const rad = (deg * Math.PI) / 180
      const ux = dx * Math.cos(rad) - dy * Math.sin(rad)
      const uy = dx * Math.sin(rad) + dy * Math.cos(rad)
      const x = cx + ux * push
      const y = cy + uy * push
      // Nicht über den Rand des Netzes hinaus — dort stünde er im Leeren, und
      // die Kamera käme ohnehin nicht mehr hin.
      if (Math.hypot(x - STAGE_HALF, y - STAGE_HALF) + radius > stageRadius) continue
      fallback ??= snap(x, y)
      if (clear(x, y)) return snap(x, y)
    }
  }

  // Nichts frei: der erste geprüfte Punkt im Netz. Ein Körper, der einen
  // anderen streift, ist besser als keiner — er trägt seinen Namen darunter.
  return fallback ?? snap(cx, cy)
}

/** Der Kreis, den ein Fusions-Körper im Netz einnimmt. Krongrösse — er ist ein
 *  Ziel, kein Zwischenschritt. */
export const FORGE_FUSION_RADIUS = FORGE_NODE_DIAMETER.crown / 2

let fusionCache: Map<string, Point> | null = null

/**
 * Wo jede Konstellation im Netz WOHNT.
 *
 * Sie hat keinen Sitz — sie steht in keinem Cluster und hat keine `parentId`.
 * Sichtbar sein muss sie trotzdem, und zwar dauerhaft und immer an derselben
 * Stelle: ein Upgrade ist ein Ort, kein Zustand einer Navigation.
 *
 * Katalogreihenfolge, und die ist das Ergebnis: jeder Anker weicht den Sitzen
 * UND allen vorher gesetzten Ankern aus. Ohne das Zweite stünden zwei Fusionen
 * mit denselben Toren aufeinander.
 *
 * Einmal gerechnet und modulweit gecacht wie alles hier — die Eingabe ist
 * statisch, es gibt keinen Wert, der sich ändern könnte.
 */
export function forgeFusionAnchors(): ReadonlyMap<string, Point> {
  if (fusionCache !== null) return fusionCache
  const places = forgeTreePlacements()
  const set = new Map<string, Point>()
  const avoid: { at: Point; radius: number }[] = []

  for (const def of FORGE_CONSTELLATIONS) {
    const gates = def.requires.flatMap((req) => {
      const at = places.get(req.id)
      return at ? [at] : []
    })
    if (gates.length === 0) continue
    const at = forgeFreeAnchor(gates, FORGE_FUSION_RADIUS, avoid)
    set.set(def.id, at)
    avoid.push({ at, radius: FORGE_FUSION_RADIUS })
  }

  fusionCache = set
  return fusionCache
}

/** Wie weit das Netz WIRKLICH reicht — die Hülle um alle Knotenränder. */
export interface ForgeContentBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  /** Die Mitte dieser Hülle — der Punkt, um den das Netz tatsächlich liegt. */
  centerX: number
  centerY: number
  /** Halbe Breite und Höhe der Hülle. */
  halfW: number
  halfH: number
  /** Der weiteste Knotenrand, von der Hüllenmitte aus gemessen. */
  radius: number
  /** Derselbe Rand, aber von der BÜHNENmitte aus — dort, wo die Sonne steht.
   *  Die Kamera verankert auf ihr, siehe `forgeCameraBounds.ts`. */
  stageRadius: number
}

let boundsCache: ForgeContentBounds | null = null

/**
 * Wie weit das Netz reicht — gemessen an den KNOTENRÄNDERN, nicht an der
 * Bühnenkante.
 *
 * Die Bühne ist 2000 px im Quadrat, die Knoten liegen darin als SCHEIBE: das
 * äusserste belegte Band (`FORGE_ZONE_BAND[4].outer`) endet bei 900, die
 * Bühnenecke liegt bei 1414. Der Unterschied ist kein Rundungsfehler, sondern
 * eine halbe Bildbreite Leere, in die die Kamera bis hierher fahren durfte.
 * Wer die Klemmung gegen diese Hülle rechnet statt gegen `FORGE_STAGE_SIZE`,
 * bekommt genau das zurück.
 *
 * Diese Datei MISST nur, sie entscheidet nicht, wohin die Kamera sieht. Die
 * Hüllenmitte war einmal auch der Ankerpunkt der Klemmung — sie ist es nicht
 * mehr: mit The Wandering wuchs ihr Abstand zur Sonne auf 135 px, und die
 * Kamera hängt seither an der Bühnenmitte (`forgeCameraBounds.ts`). `centerX`
 * bleibt trotzdem hier, denn es ist die Zahl, aus der die Kamera ihre
 * gewachsenen Halbmasse bezieht.
 *
 * `radius` misst von der Hüllenmitte, `stageRadius` von der Bühnenmitte —
 * je Bezugspunkt einer, sonst klemmten Rechteck und Scheibe gegeneinander.
 *
 * Knotenrein, ohne die WEGE: `forgeEdgeRoute.ts` importiert diese Datei, der
 * umgekehrte Weg wäre ein Zyklus. Was ein Weg darüber hinaus ausholt, trägt
 * `FORGE_CONTENT_SEAM_PX` — gemessen und in `forgeEdgeRoute.spec.ts` gebunden.
 *
 * Einmal gerechnet und modulweit gecacht wie alles hier.
 */
export function forgeContentBounds(): ForgeContentBounds {
  if (boundsCache !== null) return boundsCache
  const places = forgeTreePlacements()
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const [id, at] of places) {
    const r = FORGE_NODE_DIAMETER[forgeSeatTier(id)] / 2
    minX = Math.min(minX, at.x - r)
    maxX = Math.max(maxX, at.x + r)
    minY = Math.min(minY, at.y - r)
    maxY = Math.max(maxY, at.y + r)
  }
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  let radius = 0
  let stageRadius = 0
  for (const [id, at] of places) {
    const r = FORGE_NODE_DIAMETER[forgeSeatTier(id)] / 2
    radius = Math.max(radius, Math.hypot(at.x - centerX, at.y - centerY) + r)
    stageRadius = Math.max(stageRadius, Math.hypot(at.x - STAGE_HALF, at.y - STAGE_HALF) + r)
  }
  boundsCache = {
    minX,
    maxX,
    minY,
    maxY,
    centerX,
    centerY,
    halfW: (maxX - minX) / 2,
    halfH: (maxY - minY) / 2,
    radius,
    stageRadius,
  }
  return boundsCache
}

// ── Die Äste ──────────────────────────────────────────────────────────────────
/* Hier stand `forgeLimb()` samt `bowPath()`: eine quadratische Bézier zwischen
 * zwei MITTELPUNKTEN, deren Kontrollpunkt seitlich neben der Sehnenmitte lag —
 * Vorzeichen und Anteil aus dem Seed gewürfelt.
 *
 * Sie ist gefallen, und nicht aus Geschmack. Bei rund 205 Kanten über 155 frei
 * stehenden Knoten war der gewürfelte Bogen kein Schwung mehr, sondern Rauschen:
 * zwei benachbarte Kanten beulten in entgegengesetzte Richtungen, kein Strich
 * fluchtete mit einem anderen. Schwerer wog, was sie GAR NICHT konnte — sie
 * kannte die übrigen Knoten nicht und lief daher quer durch fremde Kreise.
 *
 * Ihre Aufgabe hat `utils/ui/forgeEdgeRoute.ts` übernommen: nur achsparallele
 * Segmente, jeder Richtungswechsel exakt 90°, und jeder Kandidat gegen jeden
 * fremden Knoten gerechnet, bevor er genommen wird.
 *
 * Diese Datei sagt weiterhin, WO ein Knoten steht — und nur das. Die
 * Hindernisliste, die das Routing braucht, geht den Platzierer nichts an.
 */
