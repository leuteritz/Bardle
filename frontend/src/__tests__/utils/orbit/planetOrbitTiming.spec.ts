import { describe, it, expect } from 'vitest'
import {
  orbitArcs,
  orbitEclipsePhase,
  orbitOrderedSlots,
  orbitTierForSlotIndex,
  planetOrbitTiming,
} from '@/utils/orbit/planetOrbitPhase'
import { planetOrbitSpeedMultiplier } from '@/stores/world/planetShopStore'
import { ORBIT_TIERS, PLANET_SLOT_CONFIG } from '@/config/constants'

const TWO_PI = Math.PI * 2

/** Die zwei Bahnen, auf denen Spieler-Planeten tatsächlich laufen. */
const TIERS = ORBIT_TIERS.planet.map((_, i) => orbitTierForSlotIndex(i))

describe('orbitArcs — die zwei Bögen einer Bahn', () => {
  it('teilt jede Bahn vollständig in Vordergrund und Verdeckung', () => {
    for (const { ratio, tiltRad } of TIERS) {
      const arcs = orbitArcs(ratio, tiltRad)!
      expect(arcs).not.toBeNull()
      expect(arcs.foregroundArc + arcs.behindArc).toBeCloseTo(TWO_PI, 9)
      expect(arcs.foregroundArc).toBeGreaterThan(0)
      expect(arcs.behindArc).toBeGreaterThan(0)
    }
  })

  it('meldet die entartete Bahn statt sie zu erfinden', () => {
    // ratio 0 und tilt 0: relY schwingt nur noch mit cos(tilt) = 1 …
    expect(orbitArcs(0, Math.PI / 2)).toBeNull()
  })

  it('bleibt die Quelle, aus der orbitEclipsePhase seine Grenzen zieht', () => {
    // Der Fortschritt springt genau am Übergang der beiden Bögen auf die
    // Keyframe-Grenze — wären es zwei Rechnungen, liefen sie hier auseinander.
    const { ratio, tiltRad } = TIERS[0]
    const arcs = orbitArcs(ratio, tiltRad)!
    const angleAtExit = arcs.psiExit - arcs.phaseShift
    expect(orbitEclipsePhase(angleAtExit, 1, ratio, tiltRad)).toBeCloseTo(0, 6)
  })
})

describe('planetOrbitTiming — Umlaufzeit und Verdeckung', () => {
  const slotTiming = (idx: number, level: number) => {
    const slot = PLANET_SLOT_CONFIG[idx]
    const { ratio, tiltRad } = orbitTierForSlotIndex(idx)
    return planetOrbitTiming(
      slot.baseSpeed,
      planetOrbitSpeedMultiplier(level),
      slot.direction,
      ratio,
      tiltRad,
    )
  }

  it('zerlegt jede Periode restlos in erreichbar und verdeckt', () => {
    for (let i = 0; i < PLANET_SLOT_CONFIG.length; i++) {
      const t = slotTiming(i, 1)
      expect(t.behindMs).toBeGreaterThan(0)
      expect(t.behindMs).toBeLessThan(t.periodMs)
      expect(t.inReachFrac).toBeCloseTo((t.periodMs - t.behindMs) / t.periodMs, 12)
    }
  })

  it('liegt unter der nominellen Periode — beide Modulationen beschleunigen', () => {
    // Kepler-Boost und der fünffach durchlaufene verdeckte Bogen ziehen die
    // Periode BEIDE nach unten. Käme hier 2π/baseSpeed heraus, wäre keine von
    // beiden angekommen.
    for (let i = 0; i < PLANET_SLOT_CONFIG.length; i++) {
      const nominal = TWO_PI / PLANET_SLOT_CONFIG[i].baseSpeed
      const t = slotTiming(i, 1)
      expect(t.periodMs).toBeLessThan(nominal)
      expect(t.periodMs).toBeGreaterThan(nominal * 0.3)
    }
  })

  it('rechnet in Millisekunden, nicht in Sekunden', () => {
    // Slot 1 liegt bei rund 16 s. Eine Faktor-1000-Verwechslung zwischen rad/ms
    // und rad/s fiele nur hier auf.
    const t = slotTiming(0, 1)
    expect(t.periodMs).toBeGreaterThan(5_000)
    expect(t.periodMs).toBeLessThan(60_000)
  })

  it('verkürzt Periode und Eclipse streng monoton bis zum Deckel', () => {
    let prev = Infinity
    for (let lvl = 1; lvl <= 41; lvl++) {
      const t = slotTiming(0, lvl)
      expect(t.periodMs).toBeLessThan(prev)
      prev = t.periodMs
    }
    const atCap = slotTiming(0, 41)
    const beyond = slotTiming(0, 300)
    expect(beyond.periodMs).toBeCloseTo(atCap.periodMs, 9)
    expect(beyond.behindMs).toBeCloseTo(atCap.behindMs, 9)
  })

  it('halbiert die Periode am Deckel — die versprochene Verdopplung', () => {
    const base = slotTiming(0, 1)
    const capped = slotTiming(0, 300)
    expect(capped.periodMs).toBeCloseTo(base.periodMs / 2, 6)
  })

  it('lässt den erreichbaren Anteil vom Level unberührt', () => {
    // Der verdeckte Bogen ist Geometrie. Schneller kreisen verkürzt den einzelnen
    // Blackout, nicht seinen Zeitanteil — sonst wäre es eine Turret-DPS-Änderung
    // und keine reine Wartezeit-Achse.
    const base = slotTiming(0, 1)
    const capped = slotTiming(0, 300)
    expect(capped.inReachFrac).toBeCloseTo(base.inReachFrac, 9)
  })

  it('gibt beiden Laufrichtungen praktisch dieselbe Periode', () => {
    // Nur die Phasenlage des Kepler-Boosts gegen den Eclipse-Bogen unterscheidet
    // sie; über einen vollen Umlauf bleibt davon fast nichts.
    for (const { ratio, tiltRad } of TIERS) {
      const fwd = planetOrbitTiming(0.0001, 1, 1, ratio, tiltRad)
      const rev = planetOrbitTiming(0.0001, 1, -1, ratio, tiltRad)
      expect(Math.abs(rev.periodMs - fwd.periodMs) / fwd.periodMs).toBeLessThan(0.001)
      expect(rev.inReachFrac).toBeCloseTo(fwd.inReachFrac, 3)
    }
  })

  it('steht still statt zu teilen, wenn die Bahn stillsteht', () => {
    const { ratio, tiltRad } = TIERS[0]
    const t = planetOrbitTiming(0, 1, 1, ratio, tiltRad)
    expect(t.periodMs).toBe(0)
    expect(Number.isFinite(t.inReachFrac)).toBe(true)
  })
})

describe('orbitOrderedSlots — die eine Bahnreihenfolge', () => {
  it('nimmt nur gekaufte Slots mit Rolle, in Slot-Reihenfolge', () => {
    const slots = [
      { id: 'a', purchased: true, role: 'turret_planet' },
      { id: 'b', purchased: true, role: null },
      { id: 'c', purchased: false, role: 'harvest_node' },
      { id: 'd', purchased: true, role: 'harvest_node' },
    ]
    expect(orbitOrderedSlots(slots).map((s) => s.id)).toEqual(['a', 'd'])
  })

  it('bestimmt damit das Tier — der Index ist nicht die Slot-Nummer', () => {
    // Genau das ist die Falle: kauft der Spieler einen früheren Slot dazu, rückt
    // jeder spätere Planet auf das andere Tier.
    const before = orbitOrderedSlots([
      { id: 'slot_2', purchased: true, role: 'turret_planet' },
      { id: 'slot_3', purchased: true, role: 'turret_planet' },
    ])
    const after = orbitOrderedSlots([
      { id: 'slot_1', purchased: true, role: 'turret_planet' },
      { id: 'slot_2', purchased: true, role: 'turret_planet' },
      { id: 'slot_3', purchased: true, role: 'turret_planet' },
    ])
    expect(before.findIndex((s) => s.id === 'slot_3')).toBe(1)
    expect(after.findIndex((s) => s.id === 'slot_3')).toBe(2)
  })
})
