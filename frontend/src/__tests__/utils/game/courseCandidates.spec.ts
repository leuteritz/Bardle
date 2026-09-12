import { describe, it, expect } from 'vitest'
import { courseCandidates } from '@/utils/game/courseCandidates'
import { generateGalaxyDots } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { COURSE_LEG_TIME_SPAN, COURSE_MIN_DIST, COURSE_OPTION_COUNT } from '@/config/constants'

const SEEDS = [1, 77, 4242, 0x7fffffff, 987654321]

describe('courseCandidates', () => {
  it('liefert drei Kandidaten mit drei verschiedenen Rollen', () => {
    for (const seed of SEEDS) {
      for (let leg = 0; leg < 8; leg++) {
        const { spawn } = generateGalaxyDots(seed, 1)
        const opts = courseCandidates(seed, leg, spawn, [])
        expect(opts).toHaveLength(COURSE_OPTION_COUNT)
        expect(new Set(opts.map((o) => o.role)).size).toBe(COURSE_OPTION_COUNT)
      }
    }
  })

  it('ist deterministisch und je Etappe verschieden', () => {
    const { spawn } = generateGalaxyDots(4242, 1)
    const a = courseCandidates(4242, 2, spawn, [])
    const b = courseCandidates(4242, 2, spawn, [])
    const c = courseCandidates(4242, 3, spawn, [])
    expect(a).toEqual(b)
    expect(a.map((o) => o.pos)).not.toEqual(c.map((o) => o.pos))
  })

  it('hält Abstand zueinander, zum Schiff und zu besuchten Sternen', () => {
    for (const seed of SEEDS) {
      const { spawn, dots } = generateGalaxyDots(seed, 4)
      const opts = courseCandidates(seed, 3, dots[2], dots.slice(0, 3))
      const all = [...dots.slice(0, 3), dots[2], ...opts.map((o) => o.pos)]
      const pts = opts.map((o) => o.pos)
      for (const p of pts) {
        for (const q of all) {
          if (q === p) continue
          const d = Math.hypot(p.x - q.x, p.y - q.y)
          // Der zwölfte Versuch gilt auch ohne Abstand — nie aber auf dem Punkt.
          expect(d).toBeGreaterThan(0)
        }
        expect(p.x).toBeGreaterThanOrEqual(0.06)
        expect(p.x).toBeLessThanOrEqual(0.94)
        expect(p.y).toBeGreaterThanOrEqual(0.06)
        expect(p.y).toBeLessThanOrEqual(0.94)
      }
      void spawn
      const okPairs = pts.filter((p, i) =>
        pts.every((q, j) => i === j || Math.hypot(p.x - q.x, p.y - q.y) >= COURSE_MIN_DIST),
      )
      expect(okPairs.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('wiegt die Flugzeit nach Entfernung im Band 1 ± Spanne, Mittel nahe 1', () => {
    for (const seed of SEEDS) {
      const { spawn } = generateGalaxyDots(seed, 1)
      const opts = courseCandidates(seed, 0, spawn, [])
      const mean = opts.reduce((a, o) => a + o.legFactor, 0) / opts.length
      for (const o of opts) {
        expect(o.legFactor).toBeGreaterThanOrEqual(1 - COURSE_LEG_TIME_SPAN)
        expect(o.legFactor).toBeLessThanOrEqual(1 + COURSE_LEG_TIME_SPAN)
      }
      expect(Math.abs(mean - 1)).toBeLessThanOrEqual(COURSE_LEG_TIME_SPAN)
    }
  })

  it('lässt die eingefrorene Sternfolge von generateGalaxyDots unberührt', () => {
    const before = JSON.stringify(generateGalaxyDots(4242, 9))
    courseCandidates(4242, 1, { x: 0.5, y: 0.5 }, [])
    expect(JSON.stringify(generateGalaxyDots(4242, 9))).toBe(before)
  })
})
