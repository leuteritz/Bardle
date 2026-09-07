import { describe, it, expect } from 'vitest'
import { paintGalaxy, galaxyFitBox } from '@/utils/fx/galaxyPlate'
import { recordingCtx } from '../../helpers/recordingCtx'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

/**
 * Der `live`-Schalter von `paintGalaxy` — die zwei Stellen, an denen sich die
 * LAUFENDE Galaxie von einer befreiten unterscheidet.
 *
 * Er ist der Grund, aus dem die Live-Bühne des Voyages-Reiters keine zweite
 * Zeichenreihenfolge braucht: dieselbe Platte, zwei Zustände.
 */
const W = 480
const H = 320
const BOX = galaxyFitBox(W, H)
const CX = Math.round((BOX.x + 0.5 * BOX.w) * 100) / 100
const CY = Math.round((BOX.y + 0.5 * BOX.h) * 100) / 100

const RECORD: CompletedGalaxyRecord = {
  galaxy: 4,
  mapSeed: 9182,
  themeIndex: 2,
  universe: 1,
  attemptResults: ['rescued', 'rescued', 'failed'],
  landfallResults: [],
  incidentResults: [],
  starManifests: [],
  durationSeconds: 0,
  completedAt: 0,
}

function paint(live: boolean): string[] {
  const { ctx, ops } = recordingCtx()
  paintGalaxy(ctx, RECORD, W, H, BOX, { dpr: 1, live })
  return ops
}

describe('paintGalaxy mit live', () => {
  it('führt die Reise NICHT in den Kern', () => {
    expect(paint(true)).not.toContain(`lineTo(${CX},${CY})`)
  })

  it('führt sie ohne das Flag sehr wohl dorthin', () => {
    expect(paint(false)).toContain(`lineTo(${CX},${CY})`)
  })

  /** Das Caretaker's Gate gibt es erst, wenn der Kern befreit ist. */
  it('lässt das Tor im Kern weg', () => {
    const am = (ops: string[]) => ops.filter((o) => o.includes(`${CX},${CY}`)).length
    expect(am(paint(true))).toBeLessThan(am(paint(false)))
  })

  it('malt insgesamt weniger als das Standbild', () => {
    expect(paint(true).length).toBeLessThan(paint(false).length)
  })

  /** Alles VOR dem Tor bleibt gleich — Scheibe, Route, Sterne, Orte. */
  it('behält den gemeinsamen Anfang Zug für Zug', () => {
    const live = paint(true)
    const full = paint(false)
    const gemeinsam = live.filter((op, i) => op === full[i]).length
    expect(gemeinsam).toBeGreaterThan(live.length * 0.5)
  })
})
