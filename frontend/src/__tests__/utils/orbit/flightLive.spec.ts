import { describe, it, expect } from 'vitest'
import {
  flightLive,
  registerWakeFollower,
  resetFlightLive,
  unregisterWakeFollower,
  wakeFollowerTransform,
  writeWakeFollowers,
} from '@/utils/orbit/flightLive'

describe('flightLive — Schweif-Kopplung', () => {
  it('ohne Kurs ist der Transform die Identität', () => {
    const t = wakeFollowerTransform(0, 0, 0)
    expect(t).toContain('translate(0.00%,0.00%)')
    expect(t).toContain('rotate(0.00deg)')
    expect(t).toContain('scale(1.000,1.000)')
  })

  it('besteht nur aus translate, rotate und scale', () => {
    const t = wakeFollowerTransform(40, -20, 0.05)
    const names = [...t.matchAll(/([a-z]+)\(/g)].map((m) => m[1])
    expect(new Set(names)).toEqual(new Set(['translate', 'rotate', 'scale']))
  })

  it('ein Slip nach rechts versetzt den Kranz nach rechts', () => {
    const t = wakeFollowerTransform(55, 0, 0)
    const m = /translate\((-?[\d.]+)%,(-?[\d.]+)%\)/.exec(t)!
    expect(Number(m[1])).toBeGreaterThan(0)
    expect(Number(m[2])).toBe(0)
  })

  it('schreibt registrierten Elementen den Transform und räumt beim Abmelden', () => {
    const el = document.createElement('div')
    registerWakeFollower(el)
    flightLive.slipX = 30
    flightLive.slipY = 10
    flightLive.roll = 0.02
    writeWakeFollowers()
    expect(el.style.transform).toContain('translate(')
    resetFlightLive()
    expect(el.style.transform).toBe('')
    expect(flightLive.slipX).toBe(0)
    flightLive.slipX = 30
    writeWakeFollowers()
    expect(el.style.transform).not.toBe('')
    unregisterWakeFollower(el)
    expect(el.style.transform).toBe('')
    flightLive.slipX = 0
  })
})
