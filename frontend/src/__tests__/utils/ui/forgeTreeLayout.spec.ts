import { describe, it, expect } from 'vitest'
import {
  FORGE_DEPTH_CREST_SPREAD,
  FORGE_NODE_DIAMETER,
  FORGE_RING_RADIUS,
  FORGE_ROOT_ANGLES_DEG,
  FORGE_SCATTER_ANGLE_DEG,
  FORGE_SCATTER_MIN_AIR_PX,
  FORGE_SCATTER_RADIUS_PX,
  FORGE_SPOKE_PITCH_DEG,
  FORGE_STAGE_SIZE,
  FORGE_SUN_EDGE_GAP,
  SHOP_SUN_MAX_DIAMETER,
  SOLAR_BRANCHES,
} from '@/config/constants'
import { FORGE_NODES } from '@/config/progression/starForge'
import { forgeLimb, forgeTreePlacements } from '@/utils/ui/forgeTreeLayout'
import type { ForgeUpgradeTier } from '@/types'

/**
 * Die Streuung des Sternbaums — der Wächter dazu.
 *
 * `utils/ui/forgeTreeLayout.ts` verdreht jeden Ring gegen seinen Nachbarn und
 * versetzt darin jeden Knoten einzeln. Beides ist gewürfelt, wenn auch
 * deterministisch: ohne diese Datei fiele erst im Browser auf, dass zwei Knoten
 * übereinanderliegen — und auch dort nur, wenn man zufällig an die richtige
 * Stelle zoomt.
 *
 * Sie prüft ausdrücklich BEIDE Richtungen: dass die Streuung nichts kaputt macht
 * (Abstände, Sonnenrand, Bühnenkante, Kammband) und dass sie überhaupt
 * stattfindet. Ein zu strenger Schwellwert liesse jeden Knoten auf seinen
 * Ausgangsplatz zurückfallen — das Bild wäre wieder das Zifferblatt, und keine
 * der anderen Bedingungen würde es merken.
 *
 * Die RINGLEITER, auf der das aufsetzt, prüft `config/forgeGeometry.spec.ts`.
 */

const STAGE_HALF = FORGE_STAGE_SIZE / 2
const SUN_EDGE = SHOP_SUN_MAX_DIAMETER / 2 + FORGE_SUN_EDGE_GAP
const CREST_HALF_BAND = FORGE_DEPTH_CREST_SPREAD * STAGE_HALF

interface Seat {
  id: string
  tier: ForgeUpgradeTier
  baseAngle: number
  x: number
  y: number
  angleDeg: number
  dist: number
}

const BASE: { id: string; tier: ForgeUpgradeTier; baseAngle: number }[] = [
  ...SOLAR_BRANCHES.map((b) => ({
    id: b.id as string,
    tier: 'root' as ForgeUpgradeTier,
    baseAngle: FORGE_ROOT_ANGLES_DEG[b.id],
  })),
  ...FORGE_NODES.map((n) => ({
    id: n.id,
    tier: n.tier as ForgeUpgradeTier,
    baseAngle: n.angleDeg,
  })),
]

function seats(): Seat[] {
  const places = forgeTreePlacements()
  return BASE.map((b) => {
    const p = places.get(b.id)
    if (!p) throw new Error(`kein Platz für ${b.id}`)
    const a = (p.angleDeg * Math.PI) / 180
    return {
      ...b,
      angleDeg: p.angleDeg,
      dist: p.dist,
      x: Math.cos(a) * p.dist,
      y: Math.sin(a) * p.dist,
    }
  })
}

/** Luft zwischen zwei Knotenrändern. Negativ heißt: sie überlappen. */
function air(a: Seat, b: Seat): number {
  const centre = Math.hypot(a.x - b.x, a.y - b.y)
  return centre - (FORGE_NODE_DIAMETER[a.tier] + FORGE_NODE_DIAMETER[b.tier]) / 2
}

function tightestPair(list: Seat[]): { air: number; a: string; b: string } {
  let worst = { air: Infinity, a: '', b: '' }
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const value = air(list[i], list[j])
      if (value < worst.air) worst = { air: value, a: list[i].id, b: list[j].id }
    }
  }
  return worst
}

describe('Star Forge — die Streuung hält den Baum auseinander', () => {
  it('liefert für jeden Knoten genau einen Platz', () => {
    const places = forgeTreePlacements()
    expect(places.size).toBe(BASE.length)
    for (const b of BASE) expect(places.has(b.id), `${b.id} fehlt`).toBe(true)
  })

  it('würfelt bei jedem Aufruf dasselbe', () => {
    // Kein `Math.random()`, keine Uhr: derselbe Baum in jeder Sitzung. Wäre es
    // anders, sähe der Spieler nach jedem Reload eine andere Bühne.
    const a = forgeTreePlacements()
    const b = forgeTreePlacements()
    for (const [id, place] of a) {
      expect(b.get(id)?.angleDeg).toBe(place.angleDeg)
      expect(b.get(id)?.dist).toBe(place.dist)
    }
  })

  it('kein Knoten überlappt einen anderen', () => {
    const worst = tightestPair(seats())
    expect(worst.air, `engstes Paar: ${worst.a} / ${worst.b}`).toBeGreaterThan(0)
  })

  it('hält überall die harte Untergrenze', () => {
    // Sie ist eine ZUSAGE, keine Hoffnung: der unversetzte Platz ist für jeden
    // Knoten Kandidat und bleibt bis zuletzt gültig, weil jeder Versatz auch
    // gegen die noch unversetzten Plätze geprüft wird.
    const worst = tightestPair(seats())
    expect(
      worst.air,
      `engstes Paar: ${worst.a} / ${worst.b} mit ${worst.air.toFixed(1)} px`,
    ).toBeGreaterThanOrEqual(FORGE_SCATTER_MIN_AIR_PX)
  })

  it('steht enger als der ungestreute Baum an keiner Stelle', () => {
    // Der Vergleichswert wird MITGERECHNET und nicht abgeschrieben — sonst
    // stünde hier eine Zahl, die beim nächsten Ringradius still falsch wird.
    const plain: Seat[] = BASE.map((b) => {
      const a = (b.baseAngle * Math.PI) / 180
      const dist = FORGE_RING_RADIUS[b.tier]
      return { ...b, angleDeg: b.baseAngle, dist, x: Math.cos(a) * dist, y: Math.sin(a) * dist }
    })
    const before = tightestPair(plain)
    const after = tightestPair(seats())
    expect(
      after.air,
      `vorher ${before.air.toFixed(1)} px (${before.a}/${before.b}), ` +
        `nachher ${after.air.toFixed(1)} px (${after.a}/${after.b})`,
    ).toBeGreaterThan(before.air)
  })

  it('kein Knoten steht in der Sonne oder über der Bühnenkante', () => {
    for (const seat of seats()) {
      const half = FORGE_NODE_DIAMETER[seat.tier] / 2
      expect(seat.dist - half, `${seat.id} steckt im Körper`).toBeGreaterThanOrEqual(SUN_EDGE)
      expect(seat.dist + half, `${seat.id} ragt über die Bühne`).toBeLessThanOrEqual(STAGE_HALF)
    }
  })

  it('jeder Knoten bleibt im Kammband seiner Ebene', () => {
    // Verliesse er es, stünde er auf dem Kamm der Nachbarebene — das Tiefenfeld
    // zeigte dann eine Zugehörigkeit an, die nicht stimmt, und der
    // Ring-Filter-Chip leuchtete die falsche Zone aus.
    for (const seat of seats()) {
      const drift = Math.abs(seat.dist - FORGE_RING_RADIUS[seat.tier])
      expect(
        drift,
        `${seat.id} driftet ${drift.toFixed(1)} px aus seinem Ring`,
      ).toBeLessThanOrEqual(Math.min(FORGE_SCATTER_RADIUS_PX, CREST_HALF_BAND))
    }
  })

  it('das 24°-Raster ist aufgelöst', () => {
    // DER Punkt der ganzen Übung: vorher lagen ALLE achtzig Knoten auf fünfzehn
    // Speichen.
    //
    // Verlangt wird nicht, dass keiner mehr auf einer Speiche steht — bei
    // achtzig Würfen landet gelegentlich einer zufällig darauf, und ihn
    // wegzuregeln hiesse, ausgerechnet ein Muster zu erzwingen. Verlangt ist,
    // dass die Speiche nichts mehr erklärt.
    const all = seats()
    const onGrid = all.filter((seat) => {
      const raw =
        ((seat.angleDeg % FORGE_SPOKE_PITCH_DEG) + FORGE_SPOKE_PITCH_DEG) % FORGE_SPOKE_PITCH_DEG
      return Math.min(raw, FORGE_SPOKE_PITCH_DEG - raw) < 0.5
    })
    expect(
      onGrid.length / all.length,
      `noch auf dem Raster: ${onGrid.map((s) => s.id).join(', ')}`,
    ).toBeLessThan(0.1)
  })

  it('die Streuung fällt nicht still auf null zusammen', () => {
    // Ein zu strenger Schwellwert liesse jeden Knoten auf seinen Ausgangsplatz
    // zurückfallen. Das Ergebnis wäre zulässig — und wertlos.
    const moved = seats().filter((seat) => Math.abs(seat.dist - FORGE_RING_RADIUS[seat.tier]) > 0.5)
    expect(moved.length / BASE.length).toBeGreaterThan(0.6)
  })

  it('kein Knoten wandert an seinem Ringnachbarn vorbei', () => {
    // Der Versatz ist auf weniger als den halben Speichenabstand begrenzt; die
    // Reihenfolge auf dem Ring bleibt damit die des Katalogs, und ein Kind ist
    // seinem Elternteil auch ohne die Linie zuzuordnen.
    expect(FORGE_SCATTER_ANGLE_DEG).toBeLessThan(FORGE_SPOKE_PITCH_DEG / 2)
    const byRing = new Map<ForgeUpgradeTier, Seat[]>()
    for (const seat of seats()) {
      const list = byRing.get(seat.tier) ?? []
      list.push(seat)
      byRing.set(seat.tier, list)
    }
    for (const [tier, list] of byRing) {
      const base = [...list].sort((a, b) => a.baseAngle - b.baseAngle).map((s) => s.id)
      const now = [...list].sort((a, b) => a.angleDeg - b.angleDeg).map((s) => s.id)
      expect(now, `Ring ${tier} hat die Reihenfolge getauscht`).toEqual(base)
    }
  })
})

describe('Star Forge — die Äste sind gekrümmt', () => {
  const from = { x: 100, y: 100 }
  const to = { x: 300, y: 260 }

  it('liefert eine quadratische Bézier mit endlichen Zahlen', () => {
    const limb = forgeLimb(from, to, 'solarSails', 'leaf')
    expect(limb.d).toMatch(/^M [-\d.]+ [-\d.]+ Q [-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+$/)
    for (const n of limb.d.match(/[-\d.]+/g) ?? []) expect(Number.isFinite(Number(n))).toBe(true)
  })

  it('krümmt jeden Ast spürbar — keiner bleibt gerade', () => {
    // Ein einzelner schnurgerader Ast zwischen lauter geschwungenen fällt
    // sofort auf; `FORGE_LIMB_BOW_MIN` verhindert den Wurf nahe null.
    const chord = Math.hypot(to.x - from.x, to.y - from.y)
    for (const node of FORGE_NODES) {
      const limb = forgeLimb(from, to, node.id, node.tier)
      const [cx, cy] = (limb.d.split('Q')[1] ?? '').trim().split(/\s+/).map(Number)
      const offset = Math.hypot(cx - (from.x + to.x) / 2, cy - (from.y + to.y) / 2)
      expect(offset / chord, `${node.id} ist zu gerade`).toBeGreaterThan(0.05)
    }
  })

  it('verjüngt sich nach aussen', () => {
    const width = (tier: ForgeUpgradeTier) => forgeLimb(from, to, 'x', tier).width
    expect(width('root')).toBeGreaterThan(width('branch'))
    expect(width('branch')).toBeGreaterThan(width('leaf'))
    expect(width('leaf')).toBeGreaterThan(width('ward'))
    expect(width('ward')).toBeGreaterThan(width('bough'))
  })
})
