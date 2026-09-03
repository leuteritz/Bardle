/* ── Die Ereignis-Chronik einer Galaxie ───────────────────────────────────────
   Wo ein Void-Wesen durchkam und wo ein seltener Drifter fiel. Rein und ohne
   Store-Zugriff, damit die Specs ohne Pinia laufen — Muster `landfalls.ts`.

   Drifter und Void-Wesen sind ORTLOS: sie bewegen sich aus eigenem Antrieb und
   tragen ihre eigene Uhr. Die Lage der Marke ist deshalb ABGELEITET, aus dem
   `mapSeed` und der Etappe, auf der das Ereignis fiel — dieselbe Trennung wie
   bei den Orten, wo nur der AUSGANG gespeichert wird.

   Die EINE Paarung von Ereignis und Lage für alle drei Kartenflächen
   (`galaxyPlate`, Archivstandbild, Live-Minimap), so wie `landfallMarks` es
   ist: rechnete eine Fläche selbst, läge ihre Marke woanders als die Fangfläche
   darüber.                                                                  */

import { seededRng } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { clearCore, landfallWorldPos, type LandfallPoint } from '@/utils/game/landfalls'
import { getVoidRift, VOID_RIFT_SEVERITIES } from '@/config/world/void'
import { getDrifter } from '@/config/world/drifters'
import {
  DRIFTER_RARITY_ORDER,
  GALAXY_INCIDENT_BOW_MAX,
  GALAXY_INCIDENT_BOW_MIN,
  GALAXY_INCIDENT_DRIFTER_MIN_RANK,
  GALAXY_INCIDENT_MIN_GAP,
  GALAXY_INCIDENT_PLACE_TRIES,
  GALAXY_INCIDENT_RANK_SCALE,
  GALAXY_INCIDENT_SEED_OFFSET,
  GALAXY_INCIDENT_SEED_SALT,
  GALAXY_INCIDENT_T_MAX,
  GALAXY_INCIDENT_T_MIN,
  GALAXY_INCIDENT_VOID_CORE,
  LANDFALL_CORE_CLEARANCE,
} from '@/config/constants'
import type { GalaxyIncident, GalaxyIncidentKind } from '@/types'

export interface IncidentMark {
  kind: GalaxyIncidentKind
  id: string
  /** 0..2 — Schwere beim Einschlag, Stufe über der Schwelle beim Drifter. */
  rank: number
  /** Kernfunke; nur der Einschlag trägt einen. */
  coreTint?: string
  /** Was der Einschlag gekostet hat — die Hover-Karte liest es von HIER, nicht
   *  über den Listenindex zurück in die Chronik. */
  hp?: number
  meeps?: number
  x: number
  y: number
}

/**
 * Der Rang eines Ereignisses.
 *
 * Er wird NICHT gespeichert, sondern über die ID aus dem Katalog geholt: zwei
 * Quellen für dieselbe Auskunft laufen auseinander, sobald jemand einen Katalog
 * anfasst. Fehlt der Eintrag, ist 0 richtig — die Marke fällt auf ihre
 * Grundform zurück statt eine Schwere zu behaupten.
 */
export function incidentRank(kind: GalaxyIncidentKind, id: string): number {
  if (kind === 'void-impact') {
    const def = getVoidRift(id)
    if (!def) return 0
    // Der Katalog steht aufsteigend, `VOID_RIFT_SEVERITIES` erbt das —
    // `voidChronicle.spec.ts` bindet es.
    return Math.max(0, VOID_RIFT_SEVERITIES.indexOf(def.severity))
  }
  const def = getDrifter(id)
  if (!def) return 0
  return Math.max(0, (DRIFTER_RARITY_ORDER[def.rarity] ?? 0) - GALAXY_INCIDENT_DRIFTER_MIN_RANK)
}

/** Radius der Marke: der Rang wächst in die GRÖSSE. */
export function incidentMarkRadius(rank: number, baseR: number): number {
  const k = GALAXY_INCIDENT_RANK_SCALE[Math.min(rank, GALAXY_INCIDENT_RANK_SCALE.length - 1)] ?? 1
  return baseR * k
}

/** Maximumsnorm, nicht euklidisch: der 0..1-Raum der Karte ist anisotrop. */
function belegt(p: LandfallPoint, gesetzt: readonly LandfallPoint[]): boolean {
  for (const q of gesetzt) {
    if (Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) < GALAXY_INCIDENT_MIN_GAP) return true
  }
  return false
}

/**
 * Die Ereignismarken einer gelaufenen Galaxie, in Buchungsreihenfolge.
 *
 * EIN rng-Strom für die ganze Liste, nicht ein Seed je Ereignis: `seededRng` ist
 * ein LCG, und benachbarte Seeds liefern benachbarte erste Züge — die Marken
 * lägen dann in einer Reihe.
 *
 * `occupied` sind die Punkte, denen ausgewichen wird (Sterne und Ortsmarken).
 * Der Mindestabstand wird per Ablehnungspass ERZWUNGEN; nach
 * `GALAXY_INCIDENT_PLACE_TRIES` Versuchen bleibt der letzte stehen, wie er
 * fällt — endlos zu suchen hiesse, auf einer vollen Etappe zu hängen.
 */
export function incidentMarks(
  mapSeed: number,
  spawn: LandfallPoint,
  dots: LandfallPoint[],
  attempts: number,
  incidents: readonly GalaxyIncident[],
  occupied: readonly LandfallPoint[] = [],
  /** Halbkanten der Sperrzone um den Kern. Ohne Angabe rund. */
  clearance: LandfallPoint = { x: LANDFALL_CORE_CLEARANCE, y: LANDFALL_CORE_CLEARANCE },
): IncidentMark[] {
  if (!incidents.length) return []
  // Dieselbe Kette wie bei den Orten: die letzte Sehne läuft in den Kern, ein
  // `leg` ist damit immer gültig — auch das Ereignis im Bosskampf.
  const kette = [spawn, ...dots.slice(0, attempts), { x: 0.5, y: 0.5 }]
  const rng = seededRng(mapSeed * GALAXY_INCIDENT_SEED_SALT + GALAXY_INCIDENT_SEED_OFFSET)
  const gesetzt: LandfallPoint[] = [...occupied]
  const out: IncidentMark[] = []

  for (const e of incidents) {
    const leg = Math.min(Math.max(0, e.leg), kette.length - 2)
    let frei: LandfallPoint | null = null
    let letzte: LandfallPoint = kette[leg]
    for (let versuch = 0; versuch < GALAXY_INCIDENT_PLACE_TRIES; versuch++) {
      const t = GALAXY_INCIDENT_T_MIN + rng() * (GALAXY_INCIDENT_T_MAX - GALAXY_INCIDENT_T_MIN)
      const betrag =
        GALAXY_INCIDENT_BOW_MIN + rng() * (GALAXY_INCIDENT_BOW_MAX - GALAXY_INCIDENT_BOW_MIN)
      const bow = rng() < 0.5 ? -betrag : betrag
      letzte = clearCore(landfallWorldPos(kette[leg], kette[leg + 1], t, bow), clearance)
      if (!belegt(letzte, gesetzt)) {
        frei = letzte
        break
      }
    }
    const pos = frei ?? letzte
    gesetzt.push(pos)
    const rank = incidentRank(e.kind, e.id)
    out.push({
      kind: e.kind,
      id: e.id,
      rank,
      coreTint:
        e.kind === 'void-impact'
          ? GALAXY_INCIDENT_VOID_CORE[VOID_RIFT_SEVERITIES[rank] ?? 'lesser']
          : undefined,
      hp: e.hp,
      meeps: e.meeps,
      x: pos.x,
      y: pos.y,
    })
  }
  return out
}

/** Womit eine Marke gemalt wird — die EINE Übersetzung für alle drei Flächen.
 *  Beide Drifter-Ausgänge teilen sich EINEN Zug: verpasst ist dieselbe Form,
 *  nur leiser, wie beim verpassten Ort. */
export function incidentPaint(m: IncidentMark): {
  kind: 'void-impact' | 'drifter-trace'
  faded: boolean
} {
  return {
    kind: m.kind === 'void-impact' ? 'void-impact' : 'drifter-trace',
    faded: m.kind === 'drifter-missed',
  }
}
