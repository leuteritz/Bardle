import { describe, it, expect } from 'vitest'
import {
  depthWeight,
  rotateAbout,
  slipPolar,
  trailAngle,
  upstreamAngle,
} from '@/utils/orbit/flightField'
import { HELM_SLIP_MAX_PX_S, HELM_SLIP_MIN_DIST_PX } from '@/config/constants'

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

describe('flightField — Slip im Polarmodell', () => {
  it('slipPolar trifft den exakten kartesischen Versatz auf unter 1 %', () => {
    // Der Schritt ist im Spiel mit norm² gewichtet — nahe dem Fokus ist er
    // winzig, und genau dort wäre die erste Ordnung sonst grob.
    const rand = seeded(7)
    const maxDist = 1000
    for (let i = 0; i < 500; i++) {
      const angle = rand() * Math.PI * 2
      const dist = HELM_SLIP_MIN_DIST_PX + rand() * (maxDist - HELM_SLIP_MIN_DIST_PX)
      const w = depthWeight(dist / maxDist) / 60
      const dx = (rand() * 2 - 1) * HELM_SLIP_MAX_PX_S * w
      const dy = (rand() * 2 - 1) * HELM_SLIP_MAX_PX_S * w
      const item = { angle, dist }
      slipPolar(item, dx, dy, Math.cos(angle), Math.sin(angle))
      const ex = Math.cos(angle) * dist + dx
      const ey = Math.sin(angle) * dist + dy
      const gx = Math.cos(item.angle) * item.dist
      const gy = Math.sin(item.angle) * item.dist
      const err = Math.hypot(gx - ex, gy - ey)
      expect(err).toBeLessThanOrEqual(0.01 * Math.hypot(dx, dy) + 1e-9)
    }
  })

  it('unter dem Kernradius ruht der Slip', () => {
    const item = { angle: 1, dist: HELM_SLIP_MIN_DIST_PX - 0.5 }
    slipPolar(item, 2, 2, Math.cos(1), Math.sin(1))
    expect(item).toEqual({ angle: 1, dist: HELM_SLIP_MIN_DIST_PX - 0.5 })
  })

  it('depthWeight ist monoton, 0 am Fokus und 1 am Rand', () => {
    expect(depthWeight(0)).toBe(0)
    expect(depthWeight(1)).toBe(1)
    let prev = -1
    for (let n = 0; n <= 1; n += 0.05) {
      const w = depthWeight(n)
      expect(w).toBeGreaterThanOrEqual(prev)
      prev = w
    }
  })

  it('upstreamAngle liegt immer in der Halbebene gegen den Slip', () => {
    const rand = seeded(3)
    for (let i = 0; i < 300; i++) {
      const sx = rand() * 2 - 1
      const sy = rand() * 2 - 1
      const a = upstreamAngle(sx, sy, rand)
      const dot = Math.cos(a) * sx + Math.sin(a) * sy
      expect(dot).toBeLessThanOrEqual(1e-9)
    }
  })

  it('trailAngle ist der Polarwinkel, solange kein Slip wirkt', () => {
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const t = trailAngle(a, 40, 0, 0, 1)
      const diff = Math.atan2(Math.sin(t - a), Math.cos(t - a))
      expect(Math.abs(diff)).toBeLessThan(1e-9)
    }
  })

  it('rotateAbout dreht um den Fokus, nicht um den Ursprung', () => {
    const out = { x: 0, y: 0 }
    rotateAbout(110, 50, 100, 50, Math.cos(Math.PI / 2), Math.sin(Math.PI / 2), out)
    expect(out.x).toBeCloseTo(100, 9)
    expect(out.y).toBeCloseTo(60, 9)
  })
})
