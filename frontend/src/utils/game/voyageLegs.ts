/* ── Etappen und Reiseroute einer Voyage ──────────────────────────────────────
   Reine Funktionen ohne Store-Zugriff, damit die Specs sie ohne Pinia prüfen —
   dasselbe Muster wie `utils/game/voyageSites.ts`.

   Die Etappen sind ABGELEITET, nicht gespeichert. Alle vier Seed-Zutaten
   überleben `startExpedition` unverändert (`configId`, `galaxy`,
   `durationSeconds`, `baseReward`) — ein Vertrag und die daraus entstandene
   Mission zeigen deshalb dieselbe Aufteilung. Kein Speicherfeld, keine Migration.

   Sie ändern an der Auflösung NICHTS: ein Wurf am Ende wie bisher, keine
   Teilauszahlung. Sie teilen die bestehende Laufzeit auf und ordnen die
   bestehenden Hazards einem Abschnitt zu.                                    */

import { seededRng } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { pinKeyOf, pinStampOf } from '@/utils/game/voyageSites'
import {
  VOYAGE_LEG_MAX,
  VOYAGE_LEG_WEIGHT_MIN,
  VOYAGE_LEG_WEIGHT_MAX,
  VOYAGE_LEG_APPROACH_NAMES,
  VOYAGE_LEG_HAZARD_NAMES,
  VOYAGE_LEG_ARRIVAL_NAMES,
  VOYAGE_ROUTE_START_PULL,
  VOYAGE_ROUTE_BOW,
  type ExpeditionTier,
} from '@/config/constants'
import type {
  AvailableExpeditionSlot,
  ExpeditionMission,
  ExpeditionHazardId,
  VoyageLeg,
  VoyageRoutePoint,
} from '@/types'

export type VoyageSubject = AvailableExpeditionSlot | ExpeditionMission

/**
 * Wie viele Etappen eine Reise dieser Stufe hat.
 *
 * An der STUFE und nicht an `durationSeconds`: die Dauer kürzen Star Forge, Meep
 * Tree und Providence beim Auslegen, eine stark gebuffte Reise verlöre sonst
 * Etappen. Und `hazards.length` ist nie 0 (EXPEDITION_HAZARD_COUNT) — ein
 * blosses `1 + Gefahren` machte jede Voyage mehrteilig, auch den ersten Kurztrip.
 */
export function voyageLegCountOf(hazardCount: number, tier: ExpeditionTier): number {
  return Math.min(VOYAGE_LEG_MAX, Math.max(1, hazardCount + (tier === 'common' ? 0 : 1)))
}

/**
 * FNV-1a über den Schlüssel — NUR für Einträge, deren Auslegezeit nicht in der ID
 * steht. `pinStampOf` gibt dafür MAX_SAFE_INTEGER zurück; das in eine
 * Multiplikation zu geben verlöre die Präzision und gäbe allen Badge-Lab-
 * Missionen denselben Seed.
 */
function fallbackSeed(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Vier Zahlen, mit Primzahlen gemischt statt summiert: `durationSeconds` ist auf
 * 5er gerundet und `baseReward` auf 10er, eine Summe häufte gleiche Namensfolgen.
 */
export function voyageSeedOf(subject: VoyageSubject): number {
  const key = pinKeyOf(subject)
  const stamp = pinStampOf(key)
  const base = stamp === Number.MAX_SAFE_INTEGER ? fallbackSeed(key) : stamp % 1000003
  // Default wie in loadGame: ältere Missionen kennen `galaxy` nicht.
  const galaxy = subject.galaxy ?? 1
  return (
    (Math.imul(base, 31) ^
      Math.imul(galaxy, 7919) ^
      Math.imul(subject.durationSeconds, 104729) ^
      Math.imul(subject.baseReward, 15485863)) >>>
    0
  )
}

/** Zieht ohne Zurücklegen — zwei Ziehungen derselben Reise fallen nie gleich aus. */
export function drawUnique(pool: readonly string[], used: Set<string>, rng: () => number): string {
  const free = pool.filter((n) => !used.has(n))
  const from = free.length ? free : pool
  const name = from[Math.min(from.length - 1, Math.floor(rng() * from.length))]
  used.add(name)
  return name
}

export function voyageLegsOf(subject: VoyageSubject): VoyageLeg[] {
  const hazards: ExpeditionHazardId[] = subject.hazards ?? []
  const tier: ExpeditionTier = subject.tier ?? 'common'
  const count = voyageLegCountOf(hazards.length, tier)
  const rng = seededRng(voyageSeedOf(subject))

  // Die erste Etappe ist die Anreise und trägt keine Gefahr — es sei denn, sie
  // ist die einzige. Was über die Plätze hinausgeht, nimmt die letzte mit.
  const buckets: ExpeditionHazardId[][] = Array.from({ length: count }, () => [])
  const first = count > 1 ? 1 : 0
  for (let i = 0; i < hazards.length; i++) {
    buckets[Math.min(count - 1, first + i)].push(hazards[i])
  }

  const weights: number[] = []
  let total = 0
  for (let i = 0; i < count; i++) {
    const w = VOYAGE_LEG_WEIGHT_MIN + rng() * (VOYAGE_LEG_WEIGHT_MAX - VOYAGE_LEG_WEIGHT_MIN)
    weights.push(w)
    total += w
  }

  const used = new Set<string>()
  const legs: VoyageLeg[] = []
  let cursor = 0
  for (let i = 0; i < count; i++) {
    const from = cursor
    // Die letzte Etappe endet EXAKT bei 1 — aufsummierte Anteile liessen sonst
    // einen Rest, und der Marker käme nicht am Hafen an.
    cursor = i === count - 1 ? 1 : Math.min(1, cursor + weights[i] / total)
    const pool = buckets[i].length
      ? VOYAGE_LEG_HAZARD_NAMES
      : i === 0 && count > 1
        ? VOYAGE_LEG_APPROACH_NAMES
        : VOYAGE_LEG_ARRIVAL_NAMES
    legs.push({ index: i, name: drawUnique(pool, used, rng), hazards: buckets[i], from, to: cursor })
  }
  return legs
}

/** Index der Etappe, in der ein Fortschritt 0..1 liegt. */
export function voyageLegAt(legs: readonly VoyageLeg[], progress: number): number {
  const p = clamp01(progress)
  for (const leg of legs) if (p < leg.to) return leg.index
  return legs.length - 1
}

// ── Route ───────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

/**
 * Die Knoten der Reise: Abflugportal, eine Wende je Etappengrenze, Hafen.
 * Normalisiert 0..1 in der Fit-Box — derselbe Raum, in dem die Ankerplätze liegen.
 *
 * Der Start wird radial zur Mitte gezogen: `generateGalaxyDots` setzt den Spawn
 * auf den Aussenrand der Scheibe, im Winkel gleichverteilt. Ungezogen läge er in
 * etwa jeder vierten Galaxie unter dem Kartenband oben links oder unter der
 * Legende unten links — beide liegen darüber.
 */
export function voyageRouteNodesOf(
  spawn: VoyageRoutePoint,
  target: VoyageRoutePoint,
  legCount: number,
  seed: number,
): VoyageRoutePoint[] {
  const start = {
    x: spawn.x + (0.5 - spawn.x) * VOYAGE_ROUTE_START_PULL,
    y: spawn.y + (0.5 - spawn.y) * VOYAGE_ROUTE_START_PULL,
  }
  const dx = target.x - start.x
  const dy = target.y - start.y
  const rng = seededRng(seed >>> 0)

  const nodes: VoyageRoutePoint[] = [start]
  for (let i = 1; i < legCount; i++) {
    const t = i / legCount
    // Senkrecht zur Sehne, Seite und Betrag aus dem Seed — eine gerade Linie
    // zwischen zwei Punkten liest sich nicht als Reise.
    const bow = (rng() - 0.5) * 2 * VOYAGE_ROUTE_BOW
    nodes.push({
      x: clamp01(start.x + dx * t - dy * bow),
      y: clamp01(start.y + dy * t + dx * bow),
    })
  }
  nodes.push(target)
  return nodes
}

/** Catmull-Rom, Enden verdoppelt. */
function spline(
  p0: VoyageRoutePoint,
  p1: VoyageRoutePoint,
  p2: VoyageRoutePoint,
  p3: VoyageRoutePoint,
  t: number,
): VoyageRoutePoint {
  const t2 = t * t
  const t3 = t2 * t
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  }
}

function at(nodes: readonly VoyageRoutePoint[], i: number): VoyageRoutePoint {
  return nodes[Math.min(nodes.length - 1, Math.max(0, i))]
}

/** Punkt auf Segment `seg` bei lokalem 0..1. */
export function voyageRouteSegmentPoint(
  nodes: readonly VoyageRoutePoint[],
  seg: number,
  local: number,
): VoyageRoutePoint {
  const i = Math.min(nodes.length - 2, Math.max(0, seg))
  return spline(at(nodes, i - 1), at(nodes, i), at(nodes, i + 1), at(nodes, i + 2), clamp01(local))
}

/**
 * Wo die Crew zum Zeitpunkt `t` (0..1 der GESAMTDAUER) steht.
 *
 * Die Etappengrenzen sind zugleich die Knoten: Etappe i läuft über Segment i.
 * Ungleich lange Etappen sind damit ungleich lange Segmente — die Crew wird auf
 * einer zähen Etappe sichtbar langsamer.
 *
 * Gibt bewusst KEINEN Kurswinkel zurück. Er kostete zwei weitere
 * Spline-Auswertungen je Marker und Frame (gemessen: Median 2.8 → 3.9 ms), und
 * der Marker dreht sich nicht — er trägt runde Portraits, die aufrecht bleiben
 * müssen. Wer ihn später braucht, holt ihn per finiter Differenz aus
 * `voyageRouteSegmentPoint`, so wie `drifterPath` es tut.
 */
export function voyageRoutePointAt(
  nodes: readonly VoyageRoutePoint[],
  legs: readonly VoyageLeg[],
  t: number,
): VoyageRoutePoint {
  const p = clamp01(t)
  const leg = legs[voyageLegAt(legs, p)]
  const span = Math.max(1e-6, leg.to - leg.from)
  return voyageRouteSegmentPoint(nodes, leg.index, clamp01((p - leg.from) / span))
}

/** Stützpunkte für die SVG-Linie — gleichmässig über die Segmente, ohne Uhr. */
export function voyageRouteSamples(
  nodes: readonly VoyageRoutePoint[],
  perLeg: number,
): VoyageRoutePoint[] {
  const out: VoyageRoutePoint[] = []
  const segs = Math.max(1, nodes.length - 1)
  for (let s = 0; s < segs; s++) {
    for (let k = 0; k < perLeg; k++) out.push(voyageRouteSegmentPoint(nodes, s, k / perLeg))
  }
  out.push(nodes[nodes.length - 1])
  return out
}
