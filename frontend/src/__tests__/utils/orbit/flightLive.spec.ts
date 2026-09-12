import { describe, it, expect } from 'vitest'
import {
  bodyFollowerTransform,
  flightHitSeq,
  flightLive,
  kickFlightJolt,
  registerBodyFollower,
  registerWakeFollower,
  resetFlightLive,
  setFlightCourse,
  stepFlightJolt,
  unregisterBodyFollower,
  unregisterWakeFollower,
  wakeFollowerTransform,
  wakeStrength,
  writeFlightFollowers,
} from '@/utils/orbit/flightLive'

const EDGE = 1000
/** Lange genug, dass die Dämpfung den Zielwinkel praktisch erreicht. */
const SETTLED = 10

function shift(t: string): { x: number; y: number } {
  const m = /translate\((-?[\d.]+)%,(-?[\d.]+)%\)/.exec(t)!
  return { x: Number(m[1]), y: Number(m[2]) }
}

describe('flightLive — Schweif-Kopplung', () => {
  it('ohne Kurs ist der Transform die Identität', () => {
    const t = wakeFollowerTransform(0, 0, 0)
    expect(t).toContain('translate(0.00%,0.00%)')
    expect(t).toContain('rotate(0.00deg)')
    expect(t).toContain('scale(1.000,1.000)')
  })

  it('besteht nur aus translate, rotate und scale', () => {
    const t = wakeFollowerTransform(0.6, 1.2, 0.05)
    const names = [...t.matchAll(/([a-z]+)\(/g)].map((m) => m[1])
    expect(new Set(names)).toEqual(new Set(['translate', 'rotate', 'scale']))
  })

  // Gebunden wird die WIRKUNG, nicht der Rohwinkel: die Keule des Kranzes liegt
  // kanonisch auf +x, `rotate` legt sie auf die Achse. Ein Kurs nach rechts muss
  // den Schweif nach LINKS tragen — er liegt entgegen der Nase.
  it('legt den Schweif entgegen den Kurs und versetzt ihn dorthin', () => {
    resetFlightLive()
    setFlightCourse(100, 0, EDGE, SETTLED)
    expect(Math.cos(flightLive.wakeAngle)).toBeLessThan(-0.99)
    expect(shift(wakeFollowerTransform(wakeStrength(), flightLive.wakeAngle, 0)).x).toBeLessThan(0)

    setFlightCourse(0, -100, EDGE, SETTLED)
    expect(Math.sin(flightLive.wakeAngle)).toBeGreaterThan(0.99)
    expect(shift(wakeFollowerTransform(wakeStrength(), flightLive.wakeAngle, 0)).y).toBeGreaterThan(
      0,
    )
    resetFlightLive()
  })

  it('entwickelt die Achse — am Durchgang bei ±π dreht sie nicht ganz herum', () => {
    resetFlightLive()
    flightLive.wakeAngle = Math.PI - 0.01
    // Zielwinkel knapp jenseits von −π: roh wären das fast 360°.
    setFlightCourse(190 * Math.cos(0.02), 190 * Math.sin(0.02), EDGE, SETTLED)
    expect(Math.abs(flightLive.wakeAngle - (Math.PI - 0.01))).toBeLessThan(0.1)
    resetFlightLive()
  })

  it('ohne Kurs und ohne Slip hält die Achse ihren Stand', () => {
    resetFlightLive()
    flightLive.wakeAngle = 1.23
    setFlightCourse(0, 0, EDGE, SETTLED)
    expect(flightLive.wakeAngle).toBe(1.23)
    resetFlightLive()
  })

  // Der Warp fährt ohne Helm und erzeugt deshalb keinen Slip — trüge die Stärke
  // allein der Slip, stünde der Kranz im Tunnel still.
  it('schlägt auch ohne Slip aus, wenn der Kurs steht', () => {
    resetFlightLive()
    expect(wakeStrength()).toBe(0)
    setFlightCourse(150, 0, EDGE, SETTLED)
    expect(flightLive.slipX).toBe(0)
    expect(wakeStrength()).toBeGreaterThan(0.5)
    resetFlightLive()
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
    expect(flightLive.wakeAngle).toBe(0)
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
    // Der Gruppen-Shift ist in px und additiv — nicht in Jolt-Einheiten.
    expect(bodyFollowerTransform(1, 0, 10, 120, -30)).toBe(
      'translate(calc(-50% + 130.0px),calc(-50% + -30.0px))',
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
