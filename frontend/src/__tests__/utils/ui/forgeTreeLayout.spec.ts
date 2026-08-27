import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  FORGE_FUSION_RADIUS,
  forgeContentBounds,
  forgeEdges,
  forgeFreeAnchor,
  forgeFusionAnchors,
  forgeLongestEdge,
  forgeTightestPair,
  forgeTreePlacements,
} from '@/utils/ui/forgeTreeLayout'
import { FORGE_CONSTELLATIONS, FORGE_NODES } from '@/config/progression/starForge'
import { FORGE_SEATS } from '@/config/progression/forgeSeats'
import { FORGE_BRIDGES } from '@/config/progression/starForgeNet'
import {
  FORGE_BRIDGE_MAX_PX,
  FORGE_EDGE_MAX_PX,
  FORGE_FUSION_AIR_PX,
  FORGE_LIMB_WIDTH,
  FORGE_MASS_SEND_NODE,
  FORGE_MIN_AIR_PX,
  FORGE_NODE_DIAMETER,
  FORGE_STAGE_SIZE,
  SHOP_SUN_MAX_DIAMETER,
} from '@/config/constants'
import { FORGE_CONSTELLATIONS, getForgeConstellation } from '@/config/progression/starForge'
import { forgeSeatTier } from '@/config/progression/forgeSeats'

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

  it('liefert für jeden SITZ genau einen Punkt', () => {
    const places = forgeTreePlacements()
    expect(places.size).toBe(FORGE_SEATS.length)
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

/**
 * Der ANKER für einen Körper OHNE Sitz.
 *
 * Es gibt genau einen: die verfolgte Konstellation. Sie soll im Netz zu sehen
 * sein, damit die Ringe an ihren Toren nicht als drei beliebige Knoten gelesen
 * werden — und dafür braucht sie eine Stelle, an der sie keinen echten Knoten
 * verdeckt. Verdeckte sie einen, wäre die Markierung schlimmer als keine: sie
 * nähme dem Netz einen Knoten weg, um einen dazuzustellen.
 */
describe('Star Forge — der Anker ohne Sitz', () => {
  const HALF = FORGE_STAGE_SIZE / 2
  const RADIUS = FORGE_NODE_DIAMETER.crown / 2

  /** Die drei Tore, die auch die Karte in der Detailspalte zeigt. */
  function gates() {
    const def = getForgeConstellation(FORGE_MASS_SEND_NODE)!
    const places = forgeTreePlacements()
    return def.requires.flatMap((req) => {
      const at = places.get(req.id)
      return at ? [at] : []
    })
  }

  it('hält zu JEDEM Sitz die Mindestluft', () => {
    // DIE Zusage. Sie bricht, sobald das Netz an dieser Stelle dichter wird —
    // und dann soll sie brechen.
    const at = forgeFreeAnchor(gates(), RADIUS)
    const places = forgeTreePlacements()
    let tightest = Infinity
    let where = ''
    for (const [id, seat] of places) {
      const r = FORGE_NODE_DIAMETER[forgeSeatTier(id)] / 2
      const air = Math.hypot(seat.x - at.x, seat.y - at.y) - (r + RADIUS)
      if (air < tightest) {
        tightest = air
        where = id
      }
    }
    expect(tightest, `engste Stelle ${tightest.toFixed(1)} px bei ${where}`).toBeGreaterThanOrEqual(
      FORGE_MIN_AIR_PX,
    )
  })

  it('weicht nach AUSSEN aus und bleibt im Netz', () => {
    // Nach aussen, weil das Netz nach aussen wächst: „diese drei führen
    // dorthin" liest sich dann von selbst statt „dorthin und wieder zurück".
    const near = gates()
    const cx = near.reduce((sum, p) => sum + p.x, 0) / near.length
    const cy = near.reduce((sum, p) => sum + p.y, 0) / near.length
    const at = forgeFreeAnchor(near, RADIUS)

    const centroidReach = Math.hypot(cx - HALF, cy - HALF)
    const anchorReach = Math.hypot(at.x - HALF, at.y - HALF)
    expect(anchorReach).toBeGreaterThan(centroidReach)
    expect(anchorReach + RADIUS).toBeLessThanOrEqual(forgeContentBounds().stageRadius)
  })

  it('würfelt nicht', () => {
    const near = gates()
    expect(forgeFreeAnchor(near, RADIUS)).toEqual(forgeFreeAnchor(near, RADIUS))
  })

  it('fällt ohne Tore auf die Bühnenmitte', () => {
    expect(forgeFreeAnchor([], RADIUS)).toEqual({ x: HALF, y: HALF })
  })
})

/**
 * Wo die KONSTELLATIONEN wohnen.
 *
 * Sie haben keinen Sitz — kein Cluster, keine `parentId`, keine Phase. Sichtbar
 * sein müssen sie trotzdem, dauerhaft und immer an derselben Stelle: ein
 * Upgrade ist ein Ort, kein Zustand einer Navigation. Diese Spec ist der
 * Wächter der einzigen Zahl, die das tragen kann — der Luft.
 */
describe('Star Forge — wo die Konstellationen wohnen', () => {
  const HALF = FORGE_STAGE_SIZE / 2

  it('gibt JEDER einen Platz', () => {
    expect(forgeFusionAnchors().size).toBe(FORGE_CONSTELLATIONS.length)
    for (const def of FORGE_CONSTELLATIONS) {
      expect(forgeFusionAnchors().get(def.id), `${def.id} steht nirgends`).toBeDefined()
    }
  })

  it('hält die volle Mindestluft zu jedem SITZ', () => {
    // Ein Körper, der einen Knoten verdeckt, nimmt dem Netz einen weg, um einen
    // dazuzustellen. Gegen einen Sitz gilt die volle Zahl: der trägt Schloss,
    // Kranz und Stufenchip, und die ragen über seinen Kreis hinaus.
    const anchors = forgeFusionAnchors()
    const places = forgeTreePlacements()
    let tightest = Infinity
    let where = ''

    for (const [id, at] of anchors) {
      for (const [seatId, seat] of places) {
        const r = FORGE_NODE_DIAMETER[forgeSeatTier(seatId)] / 2
        const air = Math.hypot(seat.x - at.x, seat.y - at.y) - (r + FORGE_FUSION_RADIUS)
        if (air < tightest) {
          tightest = air
          where = `${id} ↔ ${seatId}`
        }
      }
    }

    expect(tightest, `engste Stelle ${tightest.toFixed(1)} px: ${where}`).toBeGreaterThanOrEqual(
      FORGE_MIN_AIR_PX,
    )
  })

  it('hält untereinander die kleinere Luft — und die wirklich', () => {
    // Weniger, weil ein Fusions-Körper nichts über seinen Kreis hinausragen
    // lässt. Der Grund für die kleinere Zahl ist gemessen: mit 44 px wurde die
    // dritte Konstellation der Reise-Achse 570 px von ihren Toren weggedrückt,
    // und die Kamera zahlt diese Strecke mit Zoom.
    const anchors = forgeFusionAnchors()
    let tightest = Infinity
    let where = ''
    for (const [id, at] of anchors) {
      for (const [otherId, other] of anchors) {
        if (otherId === id) continue
        const air = Math.hypot(other.x - at.x, other.y - at.y) - 2 * FORGE_FUSION_RADIUS
        if (air < tightest) {
          tightest = air
          where = `${id} ↔ ${otherId}`
        }
      }
    }
    expect(tightest, `engste Stelle ${tightest.toFixed(1)} px: ${where}`).toBeGreaterThanOrEqual(
      FORGE_FUSION_AIR_PX,
    )
    // Und sie bleibt eine LUFT, keine Berührung.
    expect(FORGE_FUSION_AIR_PX).toBeGreaterThan(0)
  })

  it('liegt jeder im Netz und weiter aussen als seine Tore', () => {
    const anchors = forgeFusionAnchors()
    const places = forgeTreePlacements()
    const { stageRadius } = forgeContentBounds()

    for (const def of FORGE_CONSTELLATIONS) {
      const at = anchors.get(def.id)!
      const gates = def.requires.flatMap((req) => {
        const seat = places.get(req.id)
        return seat ? [seat] : []
      })
      const cx = gates.reduce((sum, g) => sum + g.x, 0) / gates.length
      const cy = gates.reduce((sum, g) => sum + g.y, 0) / gates.length

      expect(
        Math.hypot(at.x - HALF, at.y - HALF),
        `${def.id} liegt nicht weiter aussen als seine Tore`,
      ).toBeGreaterThan(Math.hypot(cx - HALF, cy - HALF))
      expect(
        Math.hypot(at.x - HALF, at.y - HALF) + FORGE_FUSION_RADIUS,
        `${def.id} steht ausserhalb des Netzes`,
      ).toBeLessThanOrEqual(stageRadius)
    }
  })

  it('steht keiner auf der SONNE', () => {
    // Sie ist kein Sitz und stünde damit in keiner Prüfung — gemessen landeten
    // zwei Körper auf ihrer Scheibe. Gerechnet gegen den grössten Durchmesser,
    // damit keine Sonnenphase sie später verschluckt.
    const sunR = SHOP_SUN_MAX_DIAMETER / 2
    for (const [id, at] of forgeFusionAnchors()) {
      const air = Math.hypot(at.x - HALF, at.y - HALF) - (sunR + FORGE_FUSION_RADIUS)
      expect(air, `${id} steht auf der Sonne (${air.toFixed(1)} px)`).toBeGreaterThanOrEqual(
        FORGE_MIN_AIR_PX,
      )
    }
  })

  it('würfelt nicht und rechnet nur einmal', () => {
    expect(forgeFusionAnchors()).toBe(forgeFusionAnchors())
  })
})
