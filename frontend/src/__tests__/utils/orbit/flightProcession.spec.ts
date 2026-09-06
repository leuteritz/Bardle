import { describe, expect, it } from 'vitest'
import {
  PROCESSION_BAND_CHAMPION,
  PROCESSION_BAND_PLANET,
  PROCESSION_DEPTH_FAR,
  PROCESSION_DEPTH_NEAR,
  PROCESSION_ENTER_T,
  PROCESSION_EXIT_T,
  PROCESSION_REACH_MAX_FRAC,
  PROCESSION_SCALE_MAX,
  PROCESSION_SCALE_MIN,
  PROCESSION_SPREAD_MAX,
  PROCESSION_SPREAD_MIN,
  PROCESSION_SUN_CLEAR_K,
  PROCESSION_SWELL_SEC_MAX,
  PROCESSION_SWELL_SEC_MIN,
  PROCESSION_TRAIL_LEN_K_MAX,
  PROCESSION_TRAIL_LEN_K_MIN,
} from '@/config/constants'
import {
  PROCESSION_LANE_CHAMPION,
  PROCESSION_LANE_PLANET,
  processionBodyAt,
  processionLive,
  processionSlot,
  processionSpot,
  processionTrailAngle,
  processionTrailLength,
  resetProcessionLive,
  type ProcessionSpot,
} from '@/utils/orbit/flightProcession'

const MIN_EDGE = 1080
const CX = 960
const CY = 540

function spot(
  slot: ReturnType<typeof processionSlot>,
  sec = 0,
  fx = CX,
  fy = CY,
  sunR = 0,
): ProcessionSpot {
  return processionSpot(slot, sec, fx, fy, CX, CY, MIN_EDGE, sunR, { x: 0, y: 0, scale: 1 })
}

describe('Prozession — die Plätze', () => {
  it('sind deterministisch: derselbe Index liefert denselben Platz', () => {
    for (let i = 0; i < 6; i++) {
      expect(processionSlot(i, 6, PROCESSION_LANE_PLANET)).toEqual(
        processionSlot(i, 6, PROCESSION_LANE_PLANET),
      )
    }
  })

  it('halten die zwei Bänder ein — Planeten nah, Champions voraus', () => {
    const span = PROCESSION_DEPTH_FAR - PROCESSION_DEPTH_NEAR
    const planetMax = PROCESSION_DEPTH_NEAR + PROCESSION_BAND_PLANET[1] * span
    const championMin = PROCESSION_DEPTH_NEAR + PROCESSION_BAND_CHAMPION[0] * span
    for (let i = 0; i < 6; i++) {
      const p = processionSlot(i, 6, PROCESSION_LANE_PLANET)
      expect(p.depth).toBeGreaterThanOrEqual(PROCESSION_DEPTH_NEAR - 1e-9)
      expect(p.depth).toBeLessThanOrEqual(planetMax + 1e-9)
    }
    for (let i = 0; i < 5; i++) {
      const c = processionSlot(i, 5, PROCESSION_LANE_CHAMPION)
      expect(c.depth).toBeGreaterThanOrEqual(championMin - 1e-9)
      expect(c.depth).toBeLessThanOrEqual(PROCESSION_DEPTH_FAR + 1e-9)
    }
    // Die Wand: KEIN Planet liegt jemals tiefer als der naheste Champion. Sonst
    // wäre die Tiefenordnung per z-index nicht mehr darstellbar —
    // `.planet-orbit-front` (7) liegt hart über `.champion-orbit-front` (6).
    expect(planetMax).toBeLessThanOrEqual(championMin)
  })

  it('geben keinem Nachbarn dieselbe Uhrzeit und bleiben in ihren Spannen', () => {
    const phis: number[] = []
    for (let i = 0; i < 6; i++) {
      const s = processionSlot(i, 6, PROCESSION_LANE_PLANET)
      expect(s.spread).toBeGreaterThanOrEqual(PROCESSION_SPREAD_MIN)
      expect(s.spread).toBeLessThanOrEqual(PROCESSION_SPREAD_MAX)
      expect(s.swellSec).toBeGreaterThanOrEqual(PROCESSION_SWELL_SEC_MIN)
      expect(s.swellSec).toBeLessThanOrEqual(PROCESSION_SWELL_SEC_MAX)
      expect(s.rank).toBe(i)
      phis.push(s.phi)
    }
    for (let i = 1; i < phis.length; i++) {
      expect(Math.abs(phis[i] - phis[i - 1])).toBeGreaterThan(0.3)
    }
  })

  it('stellt einen einzelnen Körper in die Mitte seines Bandes, nicht an dessen Kante', () => {
    const span = PROCESSION_DEPTH_FAR - PROCESSION_DEPTH_NEAR
    const mid = PROCESSION_DEPTH_NEAR + ((PROCESSION_BAND_PLANET[0] + PROCESSION_BAND_PLANET[1]) / 2) * span
    expect(processionSlot(0, 1, PROCESSION_LANE_PLANET).depth).toBeCloseTo(mid, 6)
  })
})

describe('Prozession — die Perspektive', () => {
  it('stellt den Ferneren näher an den Fluchtpunkt und kleiner', () => {
    const near = { depth: 1, spread: 0.25, phi: 0, swellSec: 5, seed: 0, rank: 0 }
    const far = { ...near, depth: 3 }
    const a = spot(near)
    const b = spot(far)
    expect(Math.hypot(b.x - CX, b.y - CY)).toBeLessThan(Math.hypot(a.x - CX, a.y - CY))
    expect(b.scale).toBeLessThan(a.scale)
  })

  it('skaliert den Platz mit der kurzen Kante — er ist ein Anteil, kein Pixelwert', () => {
    const slot = { depth: 2, spread: 0.3, phi: 0.7, swellSec: 5, seed: 0, rank: 0 }
    const out = { x: 0, y: 0, scale: 1 }
    const a = { ...processionSpot(slot, 0, 0, 0, 0, 0, 600, 0, out) }
    const b = { ...processionSpot(slot, 0, 0, 0, 0, 0, 1200, 0, out) }
    expect(b.x).toBeCloseTo(a.x * 2, 6)
    expect(b.y).toBeCloseTo(a.y * 2, 6)
    // Die Größe hängt an der TIEFE, nicht an der Kante.
    expect(b.scale).toBeCloseTo(a.scale, 6)
  })

  it('hält jeden Körper aus dem Spielerkörper heraus', () => {
    const sunR = 140
    const clear = sunR * PROCESSION_SUN_CLEAR_K
    for (let i = 0; i < 6; i++) {
      const s = processionSlot(i, 6, PROCESSION_LANE_CHAMPION)
      // Fluchtpunkt exakt auf der Sonne — der härteste Fall.
      const p = spot(s, 0, CX, CY, sunR)
      expect(Math.hypot(p.x - CX, p.y - CY)).toBeGreaterThanOrEqual(clear - 1e-6)
    }
  })

  it('lässt keinen Körper weiter als das Netz vom Fluchtpunkt', () => {
    const slot = { depth: 0.2, spread: PROCESSION_SPREAD_MAX, phi: 1.2, swellSec: 5, seed: 0, rank: 0 }
    const p = spot(slot)
    expect(Math.hypot(p.x - CX, p.y - CY)).toBeLessThanOrEqual(
      PROCESSION_REACH_MAX_FRAC * MIN_EDGE + 1e-6,
    )
  })

  it('klemmt die Skala an beiden Enden', () => {
    const tiny = spot({ depth: 40, spread: 0.2, phi: 0, swellSec: 5, seed: 0, rank: 0 })
    const huge = spot({ depth: 0.1, spread: 0.2, phi: 0, swellSec: 5, seed: 0, rank: 0 })
    expect(tiny.scale).toBe(PROCESSION_SCALE_MIN)
    expect(huge.scale).toBe(PROCESSION_SCALE_MAX)
  })

  it('wogt — im Reiseflug steht die Achse still, also muss der Zug selbst atmen', () => {
    const slot = processionSlot(2, 6, PROCESSION_LANE_PLANET)
    const a = spot(slot, 0)
    const b = spot(slot, 2.5)
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThan(0.5)
  })

  it('schreibt in place — kein Objekt je Frame und Körper', () => {
    const out: ProcessionSpot = { x: 0, y: 0, scale: 1 }
    const slot = processionSlot(0, 3, PROCESSION_LANE_PLANET)
    expect(processionSpot(slot, 0, CX, CY, CX, CY, MIN_EDGE, 0, out)).toBe(out)
  })
})

describe('Prozession — die Schweife', () => {
  it('liegen NACH AUSSEN, vom Fluchtpunkt weg, in allen vier Quadranten', () => {
    // Gebunden wird die WIRKUNG, nicht der Rohwinkel: `drawStreakSprite` setzt
    // den Kopf auf den Körper und zeichnet von `-len` bis `0`, der Schweif liegt
    // also entgegen dem Winkel. Der vorige Test prüfte den Winkel selbst — und
    // ging deshalb durch, während der Schweif zum Fluchtpunkt zeigte.
    const L = 40
    for (const [dx, dy] of [
      [10, 10],
      [-10, 10],
      [-10, -10],
      [10, -10],
    ]) {
      const a = processionTrailAngle(dx, dy)
      const tailX = dx - Math.cos(a) * L
      const tailY = dy - Math.sin(a) * L
      // Das Ende liegt weiter DRAUSSEN auf derselben Halbgeraden. Der Abstand
      // allein genügt NICHT: ein zum Fluchtpunkt gelegter Schweif schiesst bei
      // grosser Länge über ihn hinaus und ist dann auch weit weg — nur eben auf
      // der falschen Seite. Deshalb das Skalarprodukt.
      const d2 = dx * dx + dy * dy
      expect(tailX * dx + tailY * dy).toBeGreaterThan(d2)
      // …und ohne seitlichen Versatz: exakt auf der Radialen.
      expect(tailX * dy - tailY * dx).toBeCloseTo(0, 6)
    }
  })

  it('wachsen mit dem Abstand vom Fluchtpunkt und sind gedeckelt', () => {
    const r = 20
    const atFocus = processionTrailLength(0, 0, r, MIN_EDGE)
    const short = processionTrailLength(5, 0, r, MIN_EDGE)
    const long = processionTrailLength(300, 0, r, MIN_EDGE)
    const capped = processionTrailLength(9000, 0, r, MIN_EDGE)
    expect(atFocus).toBeCloseTo(r * PROCESSION_TRAIL_LEN_K_MIN, 6)
    expect(short).toBeGreaterThan(atFocus)
    expect(short).toBeLessThan(long)
    expect(capped).toBeCloseTo(r * PROCESSION_TRAIL_LEN_K_MAX, 6)
  })
})

describe('Prozession — der flüchtige Zustand', () => {
  it('hat eine Hysterese: die Austrittsschwelle liegt unter der Eintrittsschwelle', () => {
    expect(PROCESSION_EXIT_T).toBeLessThan(PROCESSION_ENTER_T)
  })

  it('legt Körper-Einträge einmal an und hält sie', () => {
    const list: ReturnType<typeof processionBodyAt>[] = []
    const a = processionBodyAt(list, 0)
    expect(processionBodyAt(list, 0)).toBe(a)
    expect(list.length).toBe(1)
  })

  it('setzt beim Zurücksetzen die Zähler auf null', () => {
    processionLive.t = 0.7
    processionLive.planetCount = 4
    processionLive.championCount = 3
    processionLive.active = true
    resetProcessionLive()
    expect(processionLive.t).toBe(0)
    expect(processionLive.planetCount).toBe(0)
    expect(processionLive.championCount).toBe(0)
    expect(processionLive.active).toBe(false)
  })
})
