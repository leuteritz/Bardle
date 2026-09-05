import { describe, it, expect } from 'vitest'
import {
  bodyFollowerTransform,
  flightHitSeq,
  flightLive,
  kickFlightJolt,
  registerBodyFollower,
  registerWakeFollower,
  resetFlightLive,
  stepFlightJolt,
  unregisterBodyFollower,
  unregisterWakeFollower,
  wakeFollowerTransform,
  writeFlightFollowers,
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
    writeFlightFollowers()
    expect(el.style.transform).toContain('translate(')
    resetFlightLive()
    expect(el.style.transform).toBe('')
    expect(flightLive.slipX).toBe(0)
    flightLive.slipX = 30
    writeFlightFollowers()
    expect(el.style.transform).not.toBe('')
    unregisterWakeFollower(el)
    expect(el.style.transform).toBe('')
    flightLive.slipX = 0
  })
})

describe('flightLive — Treffer-Ruck und Körper', () => {
  it('der Körper-Transform behält die Zentrierung', () => {
    expect(bodyFollowerTransform(0, 0, 10)).toBe('translate(calc(-50% + 0.0px),calc(-50% + 0.0px))')
    expect(bodyFollowerTransform(1, -0.5, 10)).toBe(
      'translate(calc(-50% + 10.0px),calc(-50% + -5.0px))',
    )
  })

  it('ein Volley stösst nicht, ein Strike zählt den Treffer hoch', () => {
    resetFlightLive()
    const before = flightHitSeq.value
    expect(kickFlightJolt('volley', 0)).toBe(false)
    expect(flightHitSeq.value).toBe(before)
    expect(kickFlightJolt('strike', 0)).toBe(true)
    expect(flightHitSeq.value).toBe(before + 1)
    expect(kickFlightJolt('void', Math.PI, 'abyssal')).toBe(true)
    resetFlightLive()
  })

  it('schreibt beiden Registern und räumt beim Reset', () => {
    resetFlightLive()
    const wake = document.createElement('div')
    const body = document.createElement('div')
    registerWakeFollower(wake)
    registerBodyFollower(body, 10)
    kickFlightJolt('strike', 0)
    stepFlightJolt(1 / 60)
    writeFlightFollowers()
    expect(flightLive.bodyX).toBeLessThan(0)
    expect(body.style.transform).toContain('calc(-50% + -')
    expect(wake.style.transform).toContain('translate(')
    resetFlightLive()
    expect(flightLive.bodyX).toBe(0)
    expect(body.style.transform).toBe('')
    unregisterBodyFollower(body)
    unregisterWakeFollower(wake)
  })
})
