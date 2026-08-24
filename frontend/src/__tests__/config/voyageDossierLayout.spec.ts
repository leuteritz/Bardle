import { describe, it, expect } from 'vitest'
import {
  VOYAGE_DOSSIER_BLOCK_H,
  VOYAGE_DOSSIER_GAP,
  VOYAGE_DOSSIER_PAD_Y,
  VOYAGE_DOSSIER_LOG_MIN_H,
  VOYAGE_DOSSIER_CREW_MAX_H,
  VOYAGE_DOSSIER_COLUMN_MIN_H,
  VOYAGE_DOSSIER_COLUMN_FULL_MIN_H,
  VOYAGE_DOSSIER_COLUMN_MAX_H,
  VOYAGE_DOSSIER_TAIL_MAX_H,
  VOYAGE_LEG_MAX,
  VOYAGE_LOG_MAX,
  EXPEDITION_TIERS,
  EXPEDITION_HAZARD_COUNT,
} from '@/config/constants'

/**
 * Die Missionskarte der Detailspalte ROLLT NICHT.
 *
 * Das laesst sich im Browser nicht beobachten: der Rahmen traegt `overflow:
 * clip`, also meldet kein `scrollHeight` einen Ueberlauf — was zu hoch ist,
 * wird schlicht abgeschnitten. Genau deshalb steht der Haushalt hier als
 * Rechnung und nicht als Augenmass.
 *
 * Der schlimmste Fall ist ein epischer Vertrag in der Tiefe: fuenf Sitze, drei
 * Etappen, drei Gefahren. Die Etappenverteilung ist die von `voyageLegsOf` —
 * Etappe 0 bleibt frei, der Rest verteilt sich ab Etappe 1, die letzte nimmt
 * den Ueberhang.
 *
 * Die Spaltenhoehen sind GEMESSEN und stehen als STAGE_HEIGHT in
 * `voyagesAtlasLayout.spec.ts`: `.etc-detail` und `.etc-stage` teilen sich
 * Reihe 2 desselben Rasters.
 */

type Regime = 'full' | 'compact'
const REGIMES: Regime[] = ['full', 'compact']

const B = VOYAGE_DOSSIER_BLOCK_H
const LEGS = VOYAGE_LEG_MAX
const SEATS = EXPEDITION_TIERS.epic.maxRoles
/** EXPEDITION_DEST_HAZARD_STEP legt der tiefsten Stufe eine Gefahr obendrauf. */
const HAZARDS = EXPEDITION_HAZARD_COUNT.epic + 1

/** Drei Gefahren auf drei Etappen: 0 frei, 1 traegt eine, 2 traegt zwei. */
const legsWithHazard = Math.min(LEGS - 1, HAZARDS)
const extraHazardRows = HAZARDS - legsWithHazard

function track(v: Regime): number {
  return (
    (LEGS - legsWithHazard) * B.legClear[v] +
    legsWithHazard * B.legHazard[v] +
    extraHazardRows * B.hazardRow[v]
  )
}

function crew(v: Regime): number {
  return B.crewHead[v] + SEATS * B.crewRow[v]
}

/** Zwischenraeume zwischen `n` Bloecken plus der untere Innenabstand. */
function chrome(v: Regime, blocks: number): number {
  return (blocks - 1) * VOYAGE_DOSSIER_GAP[v] + VOYAGE_DOSSIER_PAD_Y[v]
}

/** Kopf · Uhr · Prognose · Leiter · Crew · Logbuch */
function fixedRunning(v: Regime): number {
  return B.head[v] + B.clock[v] + B.forecast[v] + track(v) + crew(v) + chrome(v, 6)
}
/** Dieselben, die Uhr traegt die Beutezahl, dazu der Collect-Knopf. */
function fixedDone(v: Regime): number {
  return B.head[v] + B.haul[v] + B.forecast[v] + track(v) + crew(v) + B.foot[v] + chrome(v, 7)
}
function worst(v: Regime): number {
  return Math.max(fixedRunning(v), fixedDone(v))
}

describe('voyage dossier layout', () => {
  it('haelt die Zusage: nichts rollt, nichts wird beschnitten ausser dem Logbuch', () => {
    expect(worst('compact') + VOYAGE_DOSSIER_LOG_MIN_H.compact).toBeLessThanOrEqual(
      VOYAGE_DOSSIER_COLUMN_MIN_H,
    )
    expect(worst('full') + VOYAGE_DOSSIER_LOG_MIN_H.full).toBeLessThanOrEqual(
      VOYAGE_DOSSIER_COLUMN_FULL_MIN_H,
    )
  })

  /* Ohne diese Zeile liest sich die Media Query wie Feinschliff. Sie ist keiner:
     im vollen Satz passt das Schlimmste NICHT in die Full-HD-Spalte. */
  it('macht die Kompakt-Query tragend, nicht dekorativ', () => {
    expect(worst('full') + VOYAGE_DOSSIER_LOG_MIN_H.full).toBeGreaterThan(
      VOYAGE_DOSSIER_COLUMN_MIN_H,
    )
  })

  it('kennt jeden Block der Karte', () => {
    expect(Object.keys(B).sort()).toEqual(
      [
        'clock',
        'crewHead',
        'crewRow',
        'foot',
        'forecast',
        'haul',
        'hazardRow',
        'head',
        'legClear',
        'legHazard',
        'logEntry',
      ].sort(),
    )
  })

  /* Wer einen Block ergaenzt, muss ihn oben eintragen (die Spec darueber faellt)
     UND ihm Platz nehmen, den es nicht gibt (diese hier). Beides zusammen zwingt
     dazu, den Platz bei einem benannten Block abzuziehen und das zu sagen. */
  it('hat fuer keinen weiteren Block Platz', () => {
    const MODEST_BLOCK = 60
    expect(
      worst('compact') + MODEST_BLOCK + VOYAGE_DOSSIER_GAP.compact + VOYAGE_DOSSIER_LOG_MIN_H.compact,
    ).toBeGreaterThan(VOYAGE_DOSSIER_COLUMN_MIN_H)
  })

  it.each(REGIMES)('%s: der Crew-Deckel beschneidet keine volle Crew', (v) => {
    expect(VOYAGE_DOSSIER_CREW_MAX_H[v]).toBeGreaterThanOrEqual(crew(v))
  })

  it('macht das Logbuch zum einzigen Block, der nachgibt — absichtlich', () => {
    expect(VOYAGE_DOSSIER_LOG_MIN_H.compact).toBeLessThan(VOYAGE_LOG_MAX * B.logEntry.compact)
  })

  it('laesst auf 4K keinen Leerraum, den der Schweif nicht traegt', () => {
    const crewGrowth = VOYAGE_DOSSIER_CREW_MAX_H.full - crew('full')
    const slack =
      VOYAGE_DOSSIER_COLUMN_MAX_H - (worst('full') + VOYAGE_LOG_MAX * B.logEntry.full) - crewGrowth
    expect(slack).toBeGreaterThan(0)
    expect(slack).toBeLessThanOrEqual(VOYAGE_DOSSIER_TAIL_MAX_H)
  })

  it('verdichtet wirklich, statt nur andere Zahlen zu tragen', () => {
    for (const key of Object.keys(B) as (keyof typeof B)[]) {
      expect(B[key].compact).toBeLessThanOrEqual(B[key].full)
    }
    expect(VOYAGE_DOSSIER_GAP.compact).toBeLessThan(VOYAGE_DOSSIER_GAP.full)
    expect(worst('compact')).toBeLessThan(worst('full'))
  })
})
