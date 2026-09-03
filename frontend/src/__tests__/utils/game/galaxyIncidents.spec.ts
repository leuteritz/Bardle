import { describe, it, expect } from 'vitest'
import {
  incidentMarks,
  incidentMarkRadius,
  incidentPaint,
  incidentRank,
} from '@/utils/game/galaxyIncidents'
import { generateGalaxyDots } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { VOID_RIFTS, VOID_RIFT_SEVERITIES } from '@/config/world/void'
import { DRIFTERS } from '@/config/world/drifters'
import {
  DRIFTER_RARITY_ORDER,
  GALAXY_INCIDENT_BOW_MAX,
  GALAXY_INCIDENT_DRIFTER_MIN_RANK,
  GALAXY_INCIDENT_MIN_GAP,
  GALAXY_INCIDENT_RANK_SCALE,
  LANDFALL_BOW_MAX,
} from '@/config/constants'
import type { GalaxyIncident } from '@/types'

const SEED = 20260903
const ATTEMPTS = 6

function strecke() {
  const { spawn, dots } = generateGalaxyDots(SEED, ATTEMPTS + 1)
  return { spawn, dots }
}

const VOID_ABYSSAL = VOID_RIFTS.filter((r) => r.severity === 'abyssal')[0]
const VOID_LESSER = VOID_RIFTS.filter((r) => r.severity === 'lesser')[0]
const DRIFTER_RARE = DRIFTERS.filter((d) => d.rarity === 'rare')[0]
const DRIFTER_LEGENDARY = DRIFTERS.filter((d) => d.rarity === 'legendary')[0]

function chronik(): GalaxyIncident[] {
  return [
    { kind: 'void-impact', leg: 0, id: VOID_LESSER.id, hp: 6, meeps: 1 },
    { kind: 'drifter-caught', leg: 1, id: DRIFTER_RARE.id },
    { kind: 'void-impact', leg: 2, id: VOID_ABYSSAL.id, hp: 32, meeps: 4 },
    { kind: 'drifter-missed', leg: ATTEMPTS, id: DRIFTER_LEGENDARY.id },
  ]
}

function marken(incidents = chronik(), occupied: { x: number; y: number }[] = []) {
  const { spawn, dots } = strecke()
  return incidentMarks(SEED, spawn, dots, ATTEMPTS, incidents, occupied)
}

/** Maximumsnorm — dieselbe, in der die Lage geprüft wird. */
function abstand(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}

describe('Die Ereignis-Chronik — Lage, Rang und Paarung', () => {
  it('gibt genau so viele Marken zurück wie Einträge, in derselben Reihenfolge', () => {
    const eintraege = chronik()
    const out = marken(eintraege)
    expect(out).toHaveLength(eintraege.length)
    out.forEach((m, i) => {
      expect(m.kind).toBe(eintraege[i].kind)
      expect(m.id).toBe(eintraege[i].id)
    })
  })

  it('ist deterministisch — zweimal gerechnet, dieselbe Karte', () => {
    expect(marken()).toEqual(marken())
  })

  it('bleibt bei leerer Chronik leer — Altbestand erfindet nichts', () => {
    expect(marken([])).toEqual([])
  })

  it('hält jede Marke im Bild', () => {
    for (const m of marken()) {
      expect(m.x).toBeGreaterThan(-0.05)
      expect(m.x).toBeLessThan(1.05)
      expect(m.y).toBeGreaterThan(-0.05)
      expect(m.y).toBeLessThan(1.05)
    }
  })

  /**
   * Der Mindestabstand wird per Ablehnungspass ERZWUNGEN, nicht aus der Formel
   * gefolgert. Ohne ihn lägen zwei Einschläge derselben Etappe übereinander und
   * die zweite Fangfläche wäre nicht zu treffen.
   */
  it('hält die Marken voneinander fern, auch auf derselben Etappe', () => {
    const eng: GalaxyIncident[] = Array.from({ length: 4 }, () => ({
      kind: 'void-impact' as const,
      leg: 1,
      id: VOID_LESSER.id,
    }))
    const out = marken(eng)
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        expect(abstand(out[i], out[j])).toBeGreaterThanOrEqual(GALAXY_INCIDENT_MIN_GAP)
      }
    }
  })

  it('weicht den belegten Punkten aus, die es mitbekommt', () => {
    const { spawn, dots } = strecke()
    const belegt = dots.slice(0, ATTEMPTS)
    const out = incidentMarks(SEED, spawn, dots, ATTEMPTS, chronik(), belegt)
    for (const m of out) {
      for (const b of belegt) {
        expect(abstand(m, b)).toBeGreaterThanOrEqual(GALAXY_INCIDENT_MIN_GAP)
      }
    }
  })

  /**
   * Die letzte Sehne läuft in den Kern. Ohne sie hätte ein Einschlag im
   * Bosskampf — `leg === attempts` — keine Etappe, auf der er liegen könnte.
   */
  it('trägt auch das Ereignis auf der letzten Sehne, der zum Kern', () => {
    const out = marken([{ kind: 'void-impact', leg: ATTEMPTS, id: VOID_ABYSSAL.id }])
    expect(out).toHaveLength(1)
    expect(Number.isFinite(out[0].x)).toBe(true)
  })

  it('klemmt eine Etappe ausserhalb der Kette, statt zu werfen', () => {
    const out = marken([{ kind: 'void-impact', leg: 99, id: VOID_ABYSSAL.id }])
    expect(out).toHaveLength(1)
    expect(Number.isFinite(out[0].x)).toBe(true)
  })

  /** Sonst kommen sich die beiden Chroniken ins Gehege — eine Raute unter einem
   *  Bruchkreuz ist keine. */
  it('legt die Marken weiter neben die Route als die Orte', () => {
    expect(GALAXY_INCIDENT_BOW_MAX).toBeGreaterThan(LANDFALL_BOW_MAX)
  })
})

describe('Der Rang eines Ereignisses — aus dem Katalog, nicht aus dem Save', () => {
  it('liest die Schwere eines Einschlags aus dem Katalog', () => {
    expect(incidentRank('void-impact', VOID_LESSER.id)).toBe(0)
    expect(incidentRank('void-impact', VOID_ABYSSAL.id)).toBe(VOID_RIFT_SEVERITIES.length - 1)
  })

  it('hält `VOID_RIFT_SEVERITIES` aufsteigend — daran hängt der ganze Rang', () => {
    // Die Liste erbt ihre Reihenfolge vom Katalog. Stünde `abyssal` dort vorn,
    // wäre der schwerste Einschlag die kleinste Marke, und niemand sähe warum.
    expect(VOID_RIFT_SEVERITIES).toEqual(['lesser', 'greater', 'abyssal'])
  })

  it('rechnet den Drifterrang gegen die Schwelle, nicht absolut', () => {
    expect(incidentRank('drifter-caught', DRIFTER_RARE.id)).toBe(0)
    expect(incidentRank('drifter-caught', DRIFTER_LEGENDARY.id)).toBe(
      DRIFTER_RARITY_ORDER[DRIFTER_LEGENDARY.rarity] - GALAXY_INCIDENT_DRIFTER_MIN_RANK,
    )
  })

  it('fällt bei unbekannter ID auf 0 zurück, statt eine Schwere zu behaupten', () => {
    expect(incidentRank('void-impact', 'gibtEsNicht')).toBe(0)
    expect(incidentRank('drifter-caught', 'gibtEsNicht')).toBe(0)
  })

  it('lässt den Rang in die Grösse wachsen', () => {
    expect(incidentMarkRadius(0, 10)).toBe(10)
    expect(incidentMarkRadius(2, 10)).toBeGreaterThan(incidentMarkRadius(1, 10))
    // Ein Rang jenseits der Leiter bekommt die letzte Stufe statt NaN.
    expect(incidentMarkRadius(99, 10)).toBe(
      10 * GALAXY_INCIDENT_RANK_SCALE[GALAXY_INCIDENT_RANK_SCALE.length - 1],
    )
  })

  it('gibt nur dem Einschlag einen Kernfunken', () => {
    for (const m of marken()) {
      if (m.kind === 'void-impact') expect(m.coreTint).toBeTruthy()
      else expect(m.coreTint).toBeUndefined()
    }
  })

  it('reicht die Kosten an der Marke durch, statt sie über den Index zu suchen', () => {
    const einschlag = marken().filter((m) => m.id === VOID_ABYSSAL.id)[0]
    expect(einschlag.hp).toBe(32)
    expect(einschlag.meeps).toBe(4)
  })
})

describe('Womit eine Marke gemalt wird', () => {
  it('teilt beiden Drifter-Ausgängen denselben Zug zu — verpasst ist nur leiser', () => {
    const out = marken()
    const gefangen = out.filter((m) => m.kind === 'drifter-caught')[0]
    const verpasst = out.filter((m) => m.kind === 'drifter-missed')[0]
    expect(incidentPaint(gefangen).kind).toBe('drifter-trace')
    expect(incidentPaint(verpasst).kind).toBe('drifter-trace')
    expect(incidentPaint(gefangen).faded).toBe(false)
    expect(incidentPaint(verpasst).faded).toBe(true)
  })

  it('gibt dem Einschlag seinen eigenen Zug', () => {
    const einschlag = marken().filter((m) => m.kind === 'void-impact')[0]
    expect(incidentPaint(einschlag).kind).toBe('void-impact')
    expect(incidentPaint(einschlag).faded).toBe(false)
  })
})
