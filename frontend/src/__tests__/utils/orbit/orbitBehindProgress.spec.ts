import { describe, it, expect } from 'vitest'
import { getOrbitPos, orbitBehindProgress } from '../../utils/geometry'
import { ORBIT_TIERS, SUN_RADIUS } from '../../config/constants'

// Schwelle und Bahnen wie im Sternsystem (useStarSystem: BEHIND_THRESHOLD)
const THRESHOLD = -0.05
const TIERS = ORBIT_TIERS.star.map((t) => ({ ratio: t.rx / t.ry, tilt: t.tiltRad }))

/** relY exakt so, wie useStarSystem sie aus der gemalten Position ableitet. */
function relYFromPosition(angle: number, ratio: number, tilt: number): number {
  const ry = SUN_RADIUS * 5.5
  const { y } = getOrbitPos(angle, ry * ratio, ry, tilt, 0, 0)
  return y / ry
}

describe('orbitBehindProgress', () => {
  it.each(TIERS)('läuft in der Verdeckung von 0 auf 1 (ratio $ratio)', ({ ratio, tilt }) => {
    for (const direction of [1, -1] as const) {
      // Erste VOLLSTÄNDIGE Verdeckung: Winkel 0 kann mitten in einer liegen,
      // deren Anfang wir nie gesehen haben — deshalb erst einen
      // Vordergrund-Abschnitt abwarten und dann bis zum nächsten sammeln.
      const samples: number[] = []
      let sawForeground = false
      for (let i = 0; i < 8000; i++) {
        const angle = direction * i * 0.002
        const p = orbitBehindProgress(angle, direction, ratio, tilt, THRESHOLD)
        const behind = p >= 0 && p <= 1
        if (!behind) {
          if (samples.length) break
          sawForeground = true
        } else if (sawForeground) {
          samples.push(p)
        }
      }
      expect(samples.length).toBeGreaterThan(100)
      // Beginnt am Eintritt, endet am Austritt
      expect(samples[0]).toBeLessThan(0.02)
      expect(samples[samples.length - 1]).toBeGreaterThan(0.98)
      // Und wächst dazwischen streng monoton
      for (let i = 1; i < samples.length; i++) {
        expect(samples[i]).toBeGreaterThan(samples[i - 1])
      }
    }
  })

  it.each(TIERS)('deckt sich mit der gemalten Position (ratio $ratio)', ({ ratio, tilt }) => {
    for (const direction of [1, -1] as const) {
      for (let i = 0; i < 2000; i++) {
        const angle = direction * i * 0.004
        const inBehindRange = (() => {
          const p = orbitBehindProgress(angle, direction, ratio, tilt, THRESHOLD)
          return p >= 0 && p <= 1
        })()
        const isBehind = relYFromPosition(angle, ratio, tilt) < THRESHOLD
        // An der Kante selbst darf beides um Fließkomma-Epsilon abweichen
        const p = orbitBehindProgress(angle, direction, ratio, tilt, THRESHOLD)
        const onEdge = Math.abs(p) < 1e-6 || Math.abs(p - 1) < 1e-6
        if (!onEdge) expect(inBehindRange).toBe(isBehind)
      }
    }
  })

  it('meldet den Vordergrund mit negativen Werten', () => {
    const { ratio, tilt } = TIERS[0]
    // Bahnscheitel oben (relY maximal) liegt am weitesten vom Eintritt entfernt
    let maxRelY = -Infinity
    let peakAngle = 0
    for (let i = 0; i < 2000; i++) {
      const a = i * 0.004
      const relY = relYFromPosition(a, ratio, tilt)
      if (relY > maxRelY) {
        maxRelY = relY
        peakAngle = a
      }
    }
    expect(orbitBehindProgress(peakAngle, 1, ratio, tilt, THRESHOLD)).toBeLessThan(0)
  })

  it('gibt -1 für eine Bahn ohne Höhenauslenkung zurück', () => {
    // ratio·sin(tilt) und cos(tilt) beide 0 gibt es nur bei entarteter Bahn
    expect(orbitBehindProgress(1.2, 1, 0, Math.PI / 2, THRESHOLD)).toBe(-1)
  })

  it('gibt -1 zurück, wenn die Schwelle außerhalb des Bahnscheitels liegt', () => {
    const { ratio, tilt } = TIERS[0]
    // Schwelle unter dem tiefsten Punkt → nie verdeckt
    expect(orbitBehindProgress(1.2, 1, ratio, tilt, -5)).toBe(-1)
    // Schwelle über dem höchsten Punkt → immer verdeckt
    expect(orbitBehindProgress(1.2, 1, ratio, tilt, 5)).toBe(-1)
  })

  it('verbringt bei flacher Neigung rund die Hälfte des Umlaufs verdeckt', () => {
    // Schwelle 0 und kein Tilt: exakt die untere Halbebene
    const covered: number[] = []
    for (let i = 0; i < 3600; i++) {
      const p = orbitBehindProgress(i * 0.001745, 1, 2.5, 0, 0)
      if (p >= 0 && p <= 1) covered.push(p)
    }
    expect(covered.length / 3600).toBeCloseTo(0.5, 2)
  })
})
