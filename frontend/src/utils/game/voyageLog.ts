/* ── Das Logbuch einer Voyage ─────────────────────────────────────────────────
   Rein, ohne Store-Zugriff und ohne Uhr, damit die Specs es ohne Pinia pruefen —
   dasselbe Muster wie `voyageLegs.ts`, und aus demselben Seed: ein Vertrag und
   die daraus entstandene Mission schreiben dasselbe Buch. Kein Speicherfeld,
   keine Migration.

   Das Salz haelt beide Ziehungen auseinander: ungesalzen liefe die Zeilenwahl
   mit den Etappennamen im Gleichschritt.

   Die Ziehreihenfolge ist FEST — erst die Zeile, dann der Namenswurf, in jedem
   Fall. Deshalb liefert ein Vertrag ohne Crew dieselben Zeilen und dieselben
   Zeitpunkte wie die Mission mit Crew; nur `{crew}` loest anders auf.

   An der Aufloesung aendert das Buch NICHTS: ein Wurf am Ende wie bisher.     */

import { seededRng } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { voyageSeedOf, voyageLegsOf, drawUnique, type VoyageSubject } from '@/utils/game/voyageLegs'
import {
  EXPEDITION_HAZARD_BY_ID,
  VOYAGE_LOG_MAX,
  VOYAGE_LOG_SEED_SALT,
  VOYAGE_LOG_AT_OPEN,
  VOYAGE_LOG_AT_CREW,
  VOYAGE_LOG_AT_HAZARD,
  VOYAGE_LOG_AT_HAZARD_STEP,
  VOYAGE_LOG_AT_ARRIVE,
  VOYAGE_LOG_CREW_FALLBACK,
  VOYAGE_LOG_DEST_FALLBACK,
  VOYAGE_LOG_DEPART_LINES,
  VOYAGE_LOG_TRAVEL_LINES,
  VOYAGE_LOG_CREW_LINES,
  VOYAGE_LOG_HAZARD_LINES,
  VOYAGE_LOG_ARRIVE_LINES,
  VOYAGE_LOG_VERDICT_SUCCESS,
  VOYAGE_LOG_VERDICT_FAILURE,
} from '@/config/constants'
import type { VoyageLogEntry, VoyageLogKind } from '@/types'

export interface VoyageLogContext {
  /** Champion-Namen in Sitzreihenfolge. Leer heisst „noch nicht gesetzt". */
  crew?: readonly string[]
  destination?: string
}

interface Vars {
  crew: string
  hazard: string
  leg: string
  dest: string
}

function fill(line: string, v: Vars): string {
  return line
    .replace('{crew}', v.crew)
    .replace('{hazard}', v.hazard)
    .replace('{leg}', v.leg)
    .replace('{dest}', v.dest)
}

function nameAt(crew: readonly string[] | undefined, roll: number): string {
  if (!crew?.length) return VOYAGE_LOG_CREW_FALLBACK
  return crew[Math.min(crew.length - 1, Math.floor(roll * crew.length))]
}

/**
 * Das ganze Drehbuch der Reise, ohne Verdikt.
 *
 * Je Etappe: ein Auftakt, eine Crew-Notiz, eine Zeile je Gefahr DIESER Etappe —
 * die Gefahr steht damit dort, wo die Leiter sie ohnehin zeigt. Die letzte
 * Etappe traegt die Ankunft. Alle Zeitpunkte liegen echt unter 1, sonst fiele
 * die Ankunft mit der Aufloesung zusammen.
 */
export function voyageLogOf(subject: VoyageSubject, ctx: VoyageLogContext = {}): VoyageLogEntry[] {
  const legs = voyageLegsOf(subject)
  const rng = seededRng((voyageSeedOf(subject) ^ VOYAGE_LOG_SEED_SALT) >>> 0)
  const used = new Set<string>()
  const dest = ctx.destination || VOYAGE_LOG_DEST_FALLBACK
  const entries: VoyageLogEntry[] = []

  const push = (
    at: number,
    leg: number,
    kind: VoyageLogKind,
    pool: readonly string[],
    legName: string,
    hazard = '',
  ) => {
    const line = drawUnique(pool, used, rng)
    const crew = nameAt(ctx.crew, rng())
    entries.push({
      index: entries.length,
      at,
      leg,
      kind,
      text: fill(line, { crew, hazard, leg: legName, dest }),
    })
  }

  for (const leg of legs) {
    const span = leg.to - leg.from
    const at = (share: number) => leg.from + span * share

    push(
      at(VOYAGE_LOG_AT_OPEN),
      leg.index,
      leg.index === 0 ? 'depart' : 'travel',
      leg.index === 0 ? VOYAGE_LOG_DEPART_LINES : VOYAGE_LOG_TRAVEL_LINES,
      leg.name,
    )
    push(at(VOYAGE_LOG_AT_CREW), leg.index, 'crew', VOYAGE_LOG_CREW_LINES, leg.name)

    for (let k = 0; k < leg.hazards.length; k++) {
      const def = EXPEDITION_HAZARD_BY_ID[leg.hazards[k]]
      if (!def) continue
      push(
        at(VOYAGE_LOG_AT_HAZARD + k * VOYAGE_LOG_AT_HAZARD_STEP),
        leg.index,
        'hazard',
        VOYAGE_LOG_HAZARD_LINES[def.id],
        leg.name,
        def.name,
      )
    }

    if (leg.index === legs.length - 1) {
      push(at(VOYAGE_LOG_AT_ARRIVE), leg.index, 'arrive', VOYAGE_LOG_ARRIVE_LINES, leg.name)
    }
  }

  return entries
}

/**
 * Die Schlusszeile. Sie haengt am AUSGANG und nicht am Seed und steht deshalb
 * getrennt: der Status darf die Eintraege davor nicht verschieben.
 */
export function voyageLogVerdictOf(
  subject: VoyageSubject,
  success: boolean,
  ctx: VoyageLogContext = {},
): VoyageLogEntry {
  const legs = voyageLegsOf(subject)
  const rng = seededRng((voyageSeedOf(subject) ^ VOYAGE_LOG_SEED_SALT) >>> 0)
  const pool = success ? VOYAGE_LOG_VERDICT_SUCCESS : VOYAGE_LOG_VERDICT_FAILURE
  const line = drawUnique(pool, new Set<string>(), rng)
  return {
    // Immer hinter jedem echten Eintrag — das Buch hat hoechstens VOYAGE_LOG_MAX.
    index: VOYAGE_LOG_MAX,
    at: 1,
    leg: legs.length - 1,
    kind: 'verdict',
    text: fill(line, {
      crew: nameAt(ctx.crew, rng()),
      hazard: '',
      leg: legs[legs.length - 1].name,
      dest: ctx.destination || VOYAGE_LOG_DEST_FALLBACK,
    }),
  }
}

/** Was bei Fortschritt `progress` (0..1 der Gesamtdauer) schon geschrieben ist. */
export function voyageLogRevealed(
  entries: readonly VoyageLogEntry[],
  progress: number,
): VoyageLogEntry[] {
  const p = Math.min(1, Math.max(0, progress))
  return entries.filter((e) => e.at <= p)
}
