import { describe, it, expect } from 'vitest'
import {
  paintStarBandStrip,
  starAxisStyle,
  starBandStrip,
  starBandVars,
  starBodySpriteKey,
  starPaletteFromRgb,
  starSpinShown,
  type StarDetail,
} from '@/utils/fx/starBodySprite'
import {
  STAR_BODY_AXIS_TILT_MAX_DEG,
  STAR_BODY_BAND_H_BR,
  STAR_BODY_BAND_MASK_EDGE,
  STAR_BODY_BAND_MASK_FULL,
  STAR_BODY_BAND_PERIOD_BR,
  STAR_BODY_BAND_STRIP_PERIODS,
  STAR_BODY_DISC_R,
  STAR_BODY_SEED_SLOTS,
  STAR_BODY_SPIN_LOOKS,
  STAR_BODY_TURN_JITTER,
  STAR_BODY_TURN_SEC,
} from '@/config/constants'
import type { StarLook } from '@/types'
import { recordingCtx } from '../../helpers/recordingCtx'

const LOOKS = Object.keys(STAR_BODY_DISC_R) as StarLook[]
const R = 30
const RGB: [number, number, number] = [80, 144, 232]

function strip(look: StarLook) {
  const s = starBandStrip(0, 0, R, look)
  return starBandStrip(s.w / 2, s.h / 2, R, look)
}

function run(look: StarLook, detail: StarDetail = 2, seed = 3) {
  const s = strip(look)
  const { ctx, ops } = recordingCtx()
  paintStarBandStrip(ctx, s, starPaletteFromRgb(RGB), look, seed, detail)
  return { s, ops }
}

/** Alle Motivmitten (Kreise und Ellipsen) eines Laufs. */
function motifs(ops: string[]): { x: number; y: number }[] {
  const re = /^(arc|ellipse)\((-?[\d.]+),(-?[\d.]+),/
  return ops
    .map((o) => re.exec(o))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ x: Number(m[2]), y: Number(m[3]) }))
}

describe('Achsdrehung — der Streifen rollt, er dreht nicht', () => {
  it('trägt genau zwei Perioden: translateX(50 %) ist eine, die Naht bleibt unsichtbar', () => {
    for (const look of LOOKS) {
      const s = strip(look)
      const br = R * STAR_BODY_DISC_R[look]
      expect(s.br, look).toBeCloseTo(br, 6)
      expect(s.period, look).toBeCloseTo(STAR_BODY_BAND_PERIOD_BR * br, 6)
      expect(s.w, look).toBeCloseTo(s.period * STAR_BODY_BAND_STRIP_PERIODS, 6)
      expect(s.h, look).toBeCloseTo(STAR_BODY_BAND_H_BR * br, 6)
    }
  })

  it('deckt die ganze Scheibe ab — sonst stünde die Oberfläche an den Polen still', () => {
    for (const look of LOOKS) {
      const s = strip(look)
      expect(s.h / 2, look).toBeGreaterThanOrEqual(s.br)
    }
  })

  it('jedes Motiv steht doppelt, genau eine Periode auseinander', () => {
    for (const look of LOOKS) {
      const { s, ops } = run(look)
      const pts = motifs(ops)
      expect(pts.length, look).toBeGreaterThan(3)
      for (const p of pts) {
        const twin = pts.some(
          (q) => Math.abs(Math.abs(q.x - p.x) - s.period) < 0.01 && Math.abs(q.y - p.y) < 0.01,
        )
        expect(twin, `${look}: ${p.x.toFixed(2)}/${p.y.toFixed(2)} ohne Zwilling`).toBe(true)
      }
    }
  })

  it('bleibt im Streifen', () => {
    for (const look of LOOKS) {
      for (let seed = 0; seed < STAR_BODY_SEED_SLOTS; seed++) {
        const { s, ops } = run(look, 2, seed)
        for (const p of motifs(ops)) {
          expect(p.x, `${look}/${seed}`).toBeGreaterThanOrEqual(s.x0 - 0.01)
          expect(p.x, `${look}/${seed}`).toBeLessThanOrEqual(s.x0 + s.w + 0.01)
          expect(p.y, `${look}/${seed}`).toBeGreaterThanOrEqual(s.y0 - 0.01)
          expect(p.y, `${look}/${seed}`).toBeLessThanOrEqual(s.y0 + s.h + 0.01)
        }
      }
    }
  })

  it('ist deterministisch, streut über den Seed und trennt die Gestalten', () => {
    for (const look of LOOKS) {
      expect(run(look, 2, 4).ops.join('|'), look).toBe(run(look, 2, 4).ops.join('|'))
      expect(run(look, 2, 1).ops.join('|'), look).not.toBe(run(look, 2, 6).ops.join('|'))
    }
    const sigs = LOOKS.map((look) => run(look).ops.join('|'))
    expect(new Set(sigs).size).toBe(LOOKS.length)
  })

  it('malt auf der kleineren Stufe weniger, nie mehr', () => {
    for (const look of LOOKS) {
      expect(run(look, 1).ops.length, look).toBeLessThanOrEqual(run(look, 2).ops.length)
    }
  })

  it('die Maske sitzt auf dem Scheibenradius, der Streifen in Box-Einheiten', () => {
    for (const look of LOOKS) {
      const v = starBandVars(look)
      const dr = STAR_BODY_DISC_R[look]
      expect(Number(v['--band-r']), look).toBeCloseTo(dr, 6)
      // Box-Einheiten: die Streifenbreite in Pixeln geteilt durch die Boxkante (2 r)
      const s = starBandStrip(0, 0, R, look)
      expect(Number(v['--band-w']), look).toBeCloseTo(s.w / (R * 2), 6)
      expect(Number(v['--band-h']), look).toBeCloseTo(s.h / (R * 2), 6)
      expect(Number(v['--band-mask-full'])).toBe(STAR_BODY_BAND_MASK_FULL)
      expect(Number(v['--band-mask-edge'])).toBe(STAR_BODY_BAND_MASK_EDGE)
    }
  })

  it('die Maske schneidet innerhalb der Scheibe — kein Motiv steht über dem Rand', () => {
    for (const look of LOOKS) {
      expect(STAR_BODY_BAND_MASK_EDGE * STAR_BODY_DISC_R[look], look).toBeLessThanOrEqual(1)
      expect(STAR_BODY_BAND_MASK_FULL).toBeLessThan(STAR_BODY_BAND_MASK_EDGE)
    }
  })
})

describe('Achsdrehung — Neigung, Tempo, Drehsinn je Stern', () => {
  const IDS = ['star-1', 'star-2', 'star-3', 'star-17', 'boss-a', 'escort-3']

  it('ist deterministisch und bleibt in ihren Bändern', () => {
    for (const look of LOOKS) {
      for (const id of IDS) {
        const a = starAxisStyle(look, 3, id)
        expect(a).toEqual(starAxisStyle(look, 3, id))
        expect(Math.abs(a.tiltDeg), `${look}/${id}`).toBeLessThanOrEqual(STAR_BODY_AXIS_TILT_MAX_DEG)
        const base = STAR_BODY_TURN_SEC[look]
        expect(a.turnSec, `${look}/${id}`).toBeGreaterThanOrEqual(base * (1 - STAR_BODY_TURN_JITTER) - 0.1)
        expect(a.turnSec, `${look}/${id}`).toBeLessThanOrEqual(base * (1 + STAR_BODY_TURN_JITTER) + 0.1)
        expect(['normal', 'reverse']).toContain(a.dir)
      }
    }
  })

  it('gleicher Seed, andere id: die Sterne drehen trotzdem verschieden', () => {
    // Drei Resource-Sterne teilen sich acht Seed-Stufen — ohne die id liefen sie im Takt.
    const tilts = new Set(IDS.map((id) => starAxisStyle('dwarf', 3, id).tiltDeg))
    expect(tilts.size).toBeGreaterThan(IDS.length / 2)
  })

  it('beide Drehsinne kommen vor — nicht alles läuft nach links', () => {
    const dirs = new Set<string>()
    for (let seed = 0; seed < STAR_BODY_SEED_SLOTS; seed++) {
      for (const id of IDS) dirs.add(starAxisStyle('giant', seed, id).dir)
    }
    expect(dirs.size).toBe(2)
  })

  it('geneigt heisst geneigt: nicht jeder Stern rollt waagerecht', () => {
    const schräg = IDS.filter((id) => Math.abs(starAxisStyle('flare', 2, id).tiltDeg) > 10)
    expect(schräg.length).toBeGreaterThanOrEqual(2)
  })

  it('im Kreis dreht nur noch, wo die Drehung die Gestalt IST', () => {
    for (const look of LOOKS) {
      expect(starSpinShown(look), look).toBe(STAR_BODY_SPIN_LOOKS.includes(look))
    }
    expect(starSpinShown('dwarf')).toBe(false)
    expect(starSpinShown('pulsar')).toBe(true)
    expect(starSpinShown('splinter')).toBe(true)
  })

  it('der Schlüssel trennt das Band von den anderen Ebenen', () => {
    const band = starBodySpriteKey('band', 'dwarf', RGB, 1, 46, 2, 1)
    expect(band).not.toBe(starBodySpriteKey('core', 'dwarf', RGB, 1, 46, 2, 1))
    expect(band).not.toBe(starBodySpriteKey('spin', 'dwarf', RGB, 1, 46, 2, 1))
    expect(band).not.toBe(starBodySpriteKey('band', 'giant', RGB, 1, 46, 2, 1))
  })
})
