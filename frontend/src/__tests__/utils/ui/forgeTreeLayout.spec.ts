import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  forgeEdges,
  forgeLongestEdge,
  forgeTightestPair,
  forgeTreePlacements,
} from '@/utils/ui/forgeTreeLayout'
import { FORGE_NODES } from '@/config/progression/starForge'
import { FORGE_BRIDGES } from '@/config/progression/starForgeNet'
import {
  FORGE_BRIDGE_MAX_PX,
  FORGE_EDGE_MAX_PX,
  FORGE_LIMB_WIDTH,
  FORGE_MIN_AIR_PX,
  SOLAR_BRANCHES,
} from '@/config/constants'

/**
 * Der PLATZIERER — was `forgeTreeLayout.ts` aus der Karte macht.
 *
 * Diese Datei prüfte einmal eine Streuung: dass Knoten von ihrer Speiche
 * abweichen, im Kammband ihres Rings bleiben und ihre Ringnachbarn nicht
 * überholen. Alle drei sind Aussagen über ein Raster, das es nicht mehr gibt.
 *
 * Geprüft wird jetzt, was die Kräftesimulation zu leisten HAT — und zwar an
 * ihrem Ergebnis, nicht an ihren Zwischenschritten. Ob sie 160 Runden braucht
 * oder 40, ist ihre Sache; dass am Ende nichts klebt und keine Bedingung aus
 * dem Bild zeigt, ist die Zusage.
 *
 * Die geometrischen Grenzwerte selbst stehen in `forgeNetGeometry.spec.ts` —
 * hier geht es um das Werkzeug, dort um das Bild.
 */
describe('Star Forge — der Platzierer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('würfelt nicht', () => {
    // Härter als zwei Aufrufe zu vergleichen: der Modul-Cache liesse auch ein
    // `Math.random()` durchgehen, weil der zweite Aufruf gar nicht rechnet.
    // Hier wird nachgewiesen, dass die Quelle des Zufalls die Id ist und sonst
    // nichts — nur so ist das Netz in jedem Spielstand dasselbe, ohne dass eine
    // einzige Koordinate gespeichert werden müsste.
    const spy = vi.spyOn(Math, 'random')
    forgeTreePlacements()
    forgeEdges()
    expect(spy).not.toHaveBeenCalled()
  })

  it('liefert für jeden Katalogknoten und jeden Strahl genau einen Punkt', () => {
    const places = forgeTreePlacements()
    expect(places.size).toBe(FORGE_NODES.length + SOLAR_BRANCHES.length)
    for (const [, at] of places) {
      expect(Number.isFinite(at.x)).toBe(true)
      expect(Number.isFinite(at.y)).toBe(true)
    }
  })

  it('führt jede Kante des Katalogs und der Karte', () => {
    const edges = forgeEdges()
    const parents = edges.filter((e) => e.kind === 'parent')
    const requires = edges.filter((e) => e.kind === 'require')
    const bridges = edges.filter((e) => e.kind === 'bridge')
    expect(parents.length).toBe(FORGE_NODES.length)
    expect(bridges.length).toBe(FORGE_BRIDGES.length)
    expect(requires.length).toBe(
      FORGE_NODES.reduce((sum, n) => sum + (n.requires?.length ?? 0), 0),
    )
    // Keine Kante zeigt auf sich selbst, keine steht doppelt.
    const seen = new Set<string>()
    for (const e of edges) {
      expect(e.from, 'Kante auf sich selbst').not.toBe(e.to)
      const key = `${e.kind}:${e.from}>${e.to}`
      expect(seen.has(key), `Kante doppelt: ${key}`).toBe(false)
      seen.add(key)
    }
  })

  it('drückt die längste Bedingungskante unter die Bildgrenze', () => {
    // Die Feder ist das einzige Mittel, das der Platzierer dafür hat. Wenn
    // dieser Test bricht, liegen zwei verbundene Cluster in der Karte zu weit
    // auseinander — nicht die Simulation ist schuld, sondern die Karte.
    const worst = forgeLongestEdge()
    expect(worst).not.toBeNull()
    const limit = worst!.edge.kind === 'bridge' ? FORGE_BRIDGE_MAX_PX : FORGE_EDGE_MAX_PX
    expect(
      worst!.length,
      `${worst!.edge.kind}: ${worst!.edge.from} → ${worst!.edge.to}`,
    ).toBeLessThanOrEqual(limit)
  })

  it('hält die engste Stelle über der Mindestluft', () => {
    const tight = forgeTightestPair()
    expect(tight).not.toBeNull()
    expect(tight!.air, `${tight!.a} und ${tight!.b}`).toBeGreaterThanOrEqual(FORGE_MIN_AIR_PX - 1)
  })

  it('löst das alte Speichenraster wirklich auf', () => {
    // Der Nachweis, dass aus dem Zifferblatt ein Netz geworden ist — gemessen an
    // einer Grösse, die es im Netz noch gibt: der RICHTUNG der Kanten. Lägen die
    // Knoten weiter auf fünfzehn Speichen, zeigten fast alle Strukturkanten
    // radial nach aussen, und ihre Winkel häuften sich in wenigen Fächern.
    const places = forgeTreePlacements()
    const buckets = new Array(36).fill(0)
    let counted = 0
    for (const edge of forgeEdges()) {
      const a = places.get(edge.from)
      const b = places.get(edge.to)
      if (!a || !b) continue
      const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
      buckets[Math.floor((((deg % 360) + 360) % 360) / 10)]++
      counted++
    }
    const peak = Math.max(...buckets) / counted
    expect(peak, `dichtestes 10°-Fach hält ${(peak * 100).toFixed(0)} % aller Kanten`).toBeLessThan(
      0.2,
    )
  })

  /*
   * Hier stand: „zeichnet jede Kante als geschwungene Bézier, nicht als
   * Strecke" — der Nachweis, dass `forgeLimb()` einen Kontrollpunkt NEBEN die
   * Sehnenmitte legt.
   *
   * Er prüfte damit genau das, was heute falsch wäre. Die Wege sind
   * rechtwinklig, und was von ihnen zu beweisen ist, steht in
   * `forgeEdgeRoute.spec.ts`: jedes Segment achsparallel, keines durch einen
   * fremden Knoten.
   */

  it('verjüngt die Kanten nach aussen', () => {
    // Die Strichstärke kommt aus dem ZIEL, nicht aus dem Ursprung: jede Kante
    // ist so dick wie das, woran sie hängt.
    expect(FORGE_LIMB_WIDTH.root).toBeGreaterThan(FORGE_LIMB_WIDTH.branch)
    expect(FORGE_LIMB_WIDTH.branch).toBeGreaterThan(FORGE_LIMB_WIDTH.leaf)
    expect(FORGE_LIMB_WIDTH.bough).toBeGreaterThan(FORGE_LIMB_WIDTH.glimmer)
  })
})
