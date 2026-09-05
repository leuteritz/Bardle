import { describe, it, expect } from 'vitest'
import {
  systemLayout,
  fightTransform,
  farTransform,
  fightZoom,
  courseLine,
  cameraCss,
  type SystemSlotInput,
} from '@/utils/orbit/starFightSystem'
import {
  STAR_FIGHT_SYS_MARGIN_X,
  STAR_FIGHT_SYS_MARGIN_TOP,
  STAR_FIGHT_SYS_MARGIN_BOTTOM,
  STAR_FIGHT_SYS_MIN_GAP_PX,
  STAR_FIGHT_ANCHOR_X_PCT,
  STAR_FIGHT_ANCHOR_Y_PCT,
  STAR_FIGHT_FAR_ZOOM,
  STAR_FIGHT_FIGHT_PLANET_D_PCT,
  STAR_FIGHT_SYS_PLANET_D_PCT,
} from '@/config/constants'

function slot(i: number, over: Partial<SystemSlotInput> = {}): SystemSlotInput {
  return {
    planetId: `star-planet-${i}`,
    type: 'rocky',
    isChampionPlanet: false,
    orbitAngle: (i / 4) * Math.PI * 2,
    orbitDirection: 1,
    orbitRx: 30 + i * 8,
    orbitRy: 17 + i * 5,
    orbitTilt: 0.1 * i,
    cleared: false,
    ...over,
  }
}

const STAGES: Array<[number, number]> = [
  [1108, 913],
  [1500, 1150],
  [2900, 1900],
]

describe('starFightSystem — Systemansicht', () => {
  it('legt jeden Planeten samt Radius in den freien Rand der Bühne', () => {
    for (const [w, h] of STAGES) {
      const layout = systemLayout({ planetSlots: [0, 1, 2, 3, 4].map((i) => slot(i)) }, w, h)
      for (const p of layout.planets) {
        expect(p.x - p.r).toBeGreaterThanOrEqual(w * STAR_FIGHT_SYS_MARGIN_X - 1e-6)
        expect(p.x + p.r).toBeLessThanOrEqual(w * (1 - STAR_FIGHT_SYS_MARGIN_X) + 1e-6)
        expect(p.y - p.r).toBeGreaterThanOrEqual(h * STAR_FIGHT_SYS_MARGIN_TOP - 1e-6)
        expect(p.y + p.r).toBeLessThanOrEqual(h * (1 - STAR_FIGHT_SYS_MARGIN_BOTTOM) + 1e-6)
      }
    }
  })

  it('erzwingt den Mindestabstand per Ablehnungspass, auch bei gleichem Spawn-Winkel', () => {
    const same = [0, 1, 2, 3].map((i) => slot(i, { orbitAngle: 1.2, orbitRx: 40, orbitRy: 22, orbitTilt: 0.15 }))
    const layout = systemLayout({ planetSlots: same }, 1108, 913)
    for (let i = 0; i < layout.planets.length; i++) {
      for (let j = i + 1; j < layout.planets.length; j++) {
        const a = layout.planets[i]
        const b = layout.planets[j]
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(2 * a.r + STAR_FIGHT_SYS_MIN_GAP_PX - 1e-6)
      }
    }
  })

  it('ist deterministisch und reicht cleared, Champion und Galaxieboss durch', () => {
    const slots = [slot(0, { cleared: true }), slot(1, { isChampionPlanet: true }), slot(2)]
    const a = systemLayout({ planetSlots: slots }, 1108, 913, new Set(['star-planet-2']))
    const b = systemLayout({ planetSlots: slots }, 1108, 913, new Set(['star-planet-2']))
    expect(a).toEqual(b)
    expect(a.planets[0].cleared).toBe(true)
    expect(a.planets[1].isChampionPlanet).toBe(true)
    expect(a.planets[2].isGalaxyBoss).toBe(true)
    expect(a.planets[0].seed).toBe(b.planets[0].seed)
    expect(a.planets[0].seed).not.toBe(a.planets[1].seed)
  })

  it('trägt einen einzelnen Planeten und leere Sterne ohne NaN', () => {
    const one = systemLayout({ planetSlots: [slot(0)] }, 1108, 913)
    expect(one.planets).toHaveLength(1)
    expect(Number.isFinite(one.planets[0].x)).toBe(true)
    const none = systemLayout({ planetSlots: [] }, 1108, 913)
    expect(none.planets).toHaveLength(0)
    expect(Number.isFinite(none.unit)).toBe(true)
  })

  it('richtet die Lichtseite jedes Planeten zum Stern', () => {
    const layout = systemLayout({ planetSlots: [0, 1, 2].map((i) => slot(i)) }, 1108, 913)
    for (const p of layout.planets) {
      const toStar = Math.atan2(layout.star.y - p.y, layout.star.x - p.x)
      expect(p.lightAngle).toBeCloseTo(toStar, 9)
    }
  })
})

describe('starFightSystem — Kamera', () => {
  it('legt den Zielplaneten mit konstantem Zoom auf den Anker', () => {
    expect(fightZoom()).toBe(STAR_FIGHT_FIGHT_PLANET_D_PCT / STAR_FIGHT_SYS_PLANET_D_PCT)
    for (const [w, h] of STAGES) {
      const layout = systemLayout({ planetSlots: [0, 1, 2].map((i) => slot(i)) }, w, h)
      for (const p of layout.planets) {
        const t = fightTransform(layout, p.planetId)
        expect(t.k).toBe(fightZoom())
        expect(t.k * p.x + t.tx).toBeCloseTo((w * STAR_FIGHT_ANCHOR_X_PCT) / 100, 9)
        expect(t.k * p.y + t.ty).toBeCloseTo((h * STAR_FIGHT_ANCHOR_Y_PCT) / 100, 9)
        // Der Planet füllt am Anker exakt seinen Kampfdurchmesser
        expect(2 * p.r * t.k).toBeCloseTo((h * STAR_FIGHT_FIGHT_PLANET_D_PCT) / 100, 9)
      }
    }
  })

  it('bewegt die ferne Ebene nur um einen Anteil und höchstens auf FAR_ZOOM', () => {
    const layout = systemLayout({ planetSlots: [0, 1].map((i) => slot(i)) }, 1108, 913)
    const near = fightTransform(layout, 'star-planet-1')
    const far = farTransform(layout, 'star-planet-1')
    expect(far.k).toBeLessThanOrEqual(STAR_FIGHT_FAR_ZOOM)
    expect(Math.hypot(far.tx, far.ty)).toBeLessThan(Math.hypot(near.tx, near.ty))
    expect(farTransform(layout, null)).toEqual({ tx: 0, ty: 0, k: 1 })
  })

  it('kennt unbekannte Planeten nicht und liefert dann die Systemansicht', () => {
    const layout = systemLayout({ planetSlots: [slot(0)] }, 1108, 913)
    expect(fightTransform(layout, 'nope')).toEqual({ tx: 0, ty: 0, k: 1 })
    expect(courseLine(layout, 'nope', 'star-planet-0')).toBeNull()
  })

  it('zieht die Kurslinie von Mitte zu Mitte und schreibt einen CSS-Transform', () => {
    const layout = systemLayout({ planetSlots: [0, 1].map((i) => slot(i)) }, 1108, 913)
    const c = courseLine(layout, 'star-planet-0', 'star-planet-1')
    expect(c).toEqual({
      x1: layout.planets[0].x,
      y1: layout.planets[0].y,
      x2: layout.planets[1].x,
      y2: layout.planets[1].y,
    })
    expect(cameraCss({ tx: 1.234, ty: -2, k: 8 })).toBe('translate(1.23px, -2.00px) scale(8)')
  })
})
