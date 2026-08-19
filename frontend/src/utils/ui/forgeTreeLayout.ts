/**
 * Wo jeder Knoten des Star-Forge-Baums auf der Bühne steht — und wie der Ast zu
 * ihm gekrümmt ist.
 *
 * Der Katalog (`config/progression/starForge.ts`) nennt je Knoten einen
 * Basiswinkel, und jedes Kind erbt den seines Elternteils. Über sieben Ebenen
 * ergibt das fünfzehn schnurgerade Speichen im 24°-Raster — eine Zielscheibe.
 * Diese Datei bricht das auf, ohne den Katalog anzufassen: sie ist die EINE
 * Stelle, die aus Basiswinkel und Ringradius eine echte Position macht.
 *
 * **Zwei Schritte, und der erste trägt den Zugewinn.** Erst wird jeder Ring als
 * Ganzes gegen seinen Nachbarn verdreht (`FORGE_RING_DEALIGN_MIN_DEG`) — damit
 * steht ein Kind nicht mehr radial hinter seinem Elternteil, und die 12 px Luft
 * zwischen zwei Ringen werden zu 17…23. Erst danach wird jeder Knoten darin
 * einzeln versetzt. Nur der zweite Schritt hätte den Abstand bloss verschoben:
 * wer sich von einem Nachbarn entfernt, nähert sich dem nächsten.
 *
 * **Gewürfelt wird deterministisch aus Namen und ID**, nie aus `Math.random()`
 * und nie aus einer Uhr — dasselbe Prinzip wie bei den gerollten Icons
 * (`utils/game/rolledIcons.ts`). Derselbe Baum in jeder Sitzung, in jedem
 * Spielstand, in jedem Testlauf; nichts davon muss gespeichert werden.
 *
 * **Gerechnet wird EINMAL**, beim ersten Aufruf, danach aus dem Modul-Cache —
 * die Knotenmenge ist statisch, es gibt keinen Eingabewert, der sich ändern
 * könnte. Kein Anteil an irgendeinem Frame.
 *
 * Warum überhaupt ausgelagert und nicht in `ForgeTreePanel.vue`: Knoten, Äste
 * und die Spec müssen von DERSELBEN Rechnung kommen. Stünde sie in der
 * Komponente, hinge der einzige Wächter gegen Überlappung an einem
 * Vue-Renderlauf. Schwesterdatei ist `skillTreeLayout.ts`, die dasselbe für den
 * Meep-Baum tut — auch dort verbindet eine quadratische Bézier zwei Ränge.
 */
import {
  FORGE_LIMB_BOW,
  FORGE_LIMB_BOW_MIN,
  FORGE_LIMB_WIDTH,
  FORGE_NODE_DIAMETER,
  FORGE_RING_DEALIGN_MIN_DEG,
  FORGE_RING_RADIUS,
  FORGE_RING_ROTATE_MAX_DEG,
  FORGE_ROOT_ANGLES_DEG,
  FORGE_SCATTER_ANGLE_DEG,
  FORGE_SCATTER_MIN_AIR_PX,
  FORGE_SCATTER_RADIUS_PX,
  FORGE_SCATTER_TARGET_AIR_PX,
  FORGE_SCATTER_TRIES,
  FORGE_SPOKE_PITCH_DEG,
  FORGE_TETHER_BOW,
  FORGE_STAGE_SIZE,
  FORGE_SUN_EDGE_GAP,
  SHOP_SUN_MAX_DIAMETER,
  SOLAR_BRANCHES,
} from '@/config/constants'
import { FORGE_NODES } from '@/config/progression/starForge'
import type { ForgeUpgradeTier } from '@/types'

export interface ForgePlacement {
  /** Winkel in Grad, im Uhrzeigersinn ab 3 Uhr — wie im Katalog. */
  angleDeg: number
  /** Abstand vom Bühnenmittelpunkt in Design-Pixeln. */
  dist: number
}

export interface ForgeLimb {
  /** Fertiges `d`-Attribut einer quadratischen Bézier. */
  d: string
  /** Strichstärke des Grundastes. */
  width: number
}

interface Point {
  x: number
  y: number
}

/** Die Ringe von innen nach aussen — Reihenfolge ist Inhalt: gegeneinander
 *  verdreht werden je zwei BENACHBARTE. */
const RING_ORDER: readonly ForgeUpgradeTier[] = [
  'root',
  'branch',
  'leaf',
  'ward',
  'pact',
  'crown',
  'bough',
]

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
function toPoint(angleDeg: number, dist: number): Point {
  const a = (angleDeg * Math.PI) / 180
  return { x: STAGE_HALF + Math.cos(a) * dist, y: STAGE_HALF + Math.sin(a) * dist }
}

function gap(a: Seat, b: Seat): number {
  const pa = toPoint(a.angleDeg, a.dist)
  const pb = toPoint(b.angleDeg, b.dist)
  return Math.hypot(pa.x - pb.x, pa.y - pb.y) - (a.diameter + b.diameter) / 2
}

interface Seat {
  id: string
  tier: ForgeUpgradeTier
  diameter: number
  angleDeg: number
  dist: number
}

// ── Schritt 1: die Ringe gegeneinander verdrehen ──────────────────────────────
/**
 * Je Ring ein Winkel in ±`FORGE_RING_ROTATE_MAX_DEG`. Angenommen wird der ERSTE
 * Kandidat, der gegen den Ring darunter mindestens `FORGE_RING_DEALIGN_MIN_DEG`
 * steht — gemessen modulo Speichenabstand, weil zwei Speichen alle 24° wieder
 * aufeinanderliegen.
 *
 * Der innerste Ring hat keinen Nachbarn unter sich und nimmt seinen ersten
 * Wurf. Findet ein Ring nach `FORGE_SCATTER_TRIES` Würfen nichts, bekommt er
 * den vollen halben Speichenabstand gegen seinen Vorgänger — die Bedingung ist
 * damit in jedem Fall erfüllt, nie „irgendwie".
 */
function ringRotations(): Record<ForgeUpgradeTier, number> {
  const out = {} as Record<ForgeUpgradeTier, number>
  let previous: number | null = null
  for (const tier of RING_ORDER) {
    const next = rng(`forge-ring:${tier}`)
    let chosen: number | null = null
    for (let i = 0; i < FORGE_SCATTER_TRIES; i++) {
      const candidate = (next() * 2 - 1) * FORGE_RING_ROTATE_MAX_DEG
      if (previous === null) {
        chosen = candidate
        break
      }
      const raw =
        (((candidate - previous) % FORGE_SPOKE_PITCH_DEG) + FORGE_SPOKE_PITCH_DEG) %
        FORGE_SPOKE_PITCH_DEG
      const distance = Math.min(raw, FORGE_SPOKE_PITCH_DEG - raw)
      if (distance >= FORGE_RING_DEALIGN_MIN_DEG) {
        chosen = candidate
        break
      }
    }
    const value = chosen ?? (previous ?? 0) + FORGE_SPOKE_PITCH_DEG / 2
    out[tier] = value
    previous = value
  }
  return out
}

// ── Schritt 2: jeden Knoten einzeln versetzen ─────────────────────────────────
function basePlaces(rotations: Record<ForgeUpgradeTier, number>): Seat[] {
  const roots: Seat[] = SOLAR_BRANCHES.map((b) => ({
    id: b.id,
    tier: 'root' as const,
    diameter: FORGE_NODE_DIAMETER.root,
    angleDeg: FORGE_ROOT_ANGLES_DEG[b.id] + rotations.root,
    dist: FORGE_RING_RADIUS.root,
  }))
  const forge: Seat[] = FORGE_NODES.map((def) => ({
    id: def.id,
    tier: def.tier,
    diameter: FORGE_NODE_DIAMETER[def.tier],
    angleDeg: def.angleDeg + rotations[def.tier],
    dist: FORGE_RING_RADIUS[def.tier],
  }))
  // Von innen nach aussen: wer zuerst steht, hat die freiere Wahl, und der
  // Wurzelring ist der engste Fall.
  return [...roots, ...forge].sort((a, b) => a.dist - b.dist)
}

/**
 * Die eigentliche Streuung.
 *
 * Geprüft wird jeder Kandidat gegen ZWEI Mengen: die schon endgültig gesetzten
 * Knoten UND die noch unversetzten Plätze der übrigen. Ohne die zweite Menge
 * könnte ein früher Knoten in den Platz eines späten wandern — und dessen
 * Rückfallposition wäre dann selbst zu eng, obwohl sie es im Ausgangsbild nicht
 * war. So bleibt der unversetzte Platz für JEDEN Knoten bis zuletzt gültig, und
 * damit ist die Untergrenze eine echte Zusage und keine Hoffnung.
 */
function scatter(seats: Seat[]): Map<string, ForgePlacement> {
  const placed: Seat[] = []
  const result = new Map<string, ForgePlacement>()

  for (let index = 0; index < seats.length; index++) {
    const seat = seats[index]
    const rest = seats.slice(index + 1)
    const airOf = (candidate: Seat): number => {
      let min = Infinity
      for (const other of placed) min = Math.min(min, gap(candidate, other))
      for (const other of rest) min = Math.min(min, gap(candidate, other))
      return min
    }

    const withinBounds = (candidate: Seat): boolean =>
      candidate.dist - candidate.diameter / 2 >= SUN_EDGE &&
      candidate.dist + candidate.diameter / 2 <= STAGE_HALF

    const next = rng(`forge-node:${seat.id}`)
    let best: Seat | null = null
    let bestAir = -Infinity

    for (let i = 0; i < FORGE_SCATTER_TRIES; i++) {
      const candidate: Seat = {
        ...seat,
        angleDeg: seat.angleDeg + (next() * 2 - 1) * FORGE_SCATTER_ANGLE_DEG,
        dist: seat.dist + (next() * 2 - 1) * FORGE_SCATTER_RADIUS_PX,
      }
      if (!withinBounds(candidate)) continue
      const air = airOf(candidate)
      if (air < FORGE_SCATTER_MIN_AIR_PX) continue
      // Der ERSTE, der reicht — nicht der beste. Eine Maximierung verteilte die
      // Knoten wieder gleichmässig und schüfe damit ein neues Muster.
      if (air >= FORGE_SCATTER_TARGET_AIR_PX) {
        best = candidate
        bestAir = air
        break
      }
      if (air > bestAir) {
        best = candidate
        bestAir = air
      }
    }

    const chosen = best ?? seat
    placed.push(chosen)
    result.set(seat.id, { angleDeg: chosen.angleDeg, dist: chosen.dist })
  }

  return result
}

let cache: Map<string, ForgePlacement> | null = null

/**
 * Platz jedes Knotens — Wurzeln wie Forge-Knoten, über die ID abrufbar.
 * Beim ersten Aufruf gerechnet, danach aus dem Cache.
 */
export function forgeTreePlacements(): ReadonlyMap<string, ForgePlacement> {
  if (cache === null) cache = scatter(basePlaces(ringRotations()))
  return cache
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
 * Die Strichstärke kommt aus der Ebene des ZIELS, nicht des Ursprungs: der Baum
 * verjüngt sich damit nach aussen, jeder Ast ist so dick wie das, woran er
 * hängt.
 */
export function forgeLimb(from: Point, to: Point, seed: string, tier: ForgeUpgradeTier): ForgeLimb {
  return {
    d: bowPath(from, to, `forge-limb:${seed}`, FORGE_LIMB_BOW),
    width: FORGE_LIMB_WIDTH[tier],
  }
}

/**
 * Der SPANNFADEN zu einer zusätzlichen Voraussetzung (`ForgeNodeDef.requires`).
 *
 * Dieselbe Kurve, aber deutlich stärker gebogen (`FORGE_TETHER_BOW` gegen
 * `FORGE_LIMB_BOW`), und das ist kein Geschmack: ein Ast verbindet zwei Knoten
 * benachbarter Ringe auf fast derselben Speiche, ein Faden dagegen zwei Knoten
 * auf FREMDEN Speichen — als Sehne schnitte er quer durch das halbe Bild.
 * Mit dem Schwung liest er sich als Bogen, der um die Knoten dazwischen
 * herumführt.
 *
 * Eigener Seed-Vorsatz, damit ein Faden nicht zufällig genau so liegt wie der
 * Ast desselben Knotens.
 */
export function forgeTether(from: Point, to: Point, seed: string): string {
  return bowPath(from, to, `forge-tether:${seed}`, FORGE_TETHER_BOW)
}

/**
 * Eine quadratische Bézier, deren Kontrollpunkt seitlich neben der Sehnenmitte
 * liegt: Betrag `bow` mal Sehnenlänge, Vorzeichen und Anteil aus dem Seed.
 * `FORGE_LIMB_BOW_MIN` verhindert den Wurf nahe null — eine einzelne
 * schnurgerade Linie zwischen lauter geschwungenen fällt sofort auf.
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
