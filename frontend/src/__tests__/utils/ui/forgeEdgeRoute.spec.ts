import { describe, it, expect, vi, afterEach } from 'vitest'
import { forgeRouteKey, forgeRoutes, forgeSunRoute } from '@/utils/ui/forgeEdgeRoute'
import { forgeContentBounds, forgeEdges, forgeTreePlacements } from '@/utils/ui/forgeTreeLayout'
import { getForgeNode } from '@/config/progression/starForge'
import {
  FORGE_CONTENT_SEAM_PX,
  FORGE_NODE_DIAMETER,
  FORGE_ROUTE_CLEARANCE_PX,
  FORGE_ROUTE_CORNER_R,
  FORGE_STAGE_SIZE,
  FORGE_SUN_EDGE_GAP,
  SHOP_SUN_MAX_DIAMETER,
} from '@/config/constants'
import type { ForgeUpgradeTier } from '@/types'

/**
 * Das ROUTING — was `forgeEdgeRoute.ts` aus zwei Punkten macht.
 *
 * Hier wird die Zusage nachgerechnet, an der die alte Bézier gescheitert ist:
 * sie kannte die übrigen Knoten nicht und lief quer durch fremde Kreise. Drei
 * Prüfungen tragen die Datei, und die ersten beiden sind der eigentliche Grund
 * für ihre Existenz.
 *
 *   1. **Jedes Segment ist achsparallel.** Das ist „wenn Drehung, dann nur
 *      rechtwinklig", als Rechnung statt als Absicht.
 *   2. **Kein Segment berührt einen fremden Knoten.**
 *   3. **Die Knicke bleiben wenige.** Ein Weg, der technisch beide Zusagen hält
 *      und dabei eine Treppe aus zwölf Stufen zeichnet, wäre wieder Wirrwarr —
 *      nur ein rechtwinkliger.
 */

/** Ein Stück des Weges, aus dem `d` zurückgewonnen. */
interface Leg {
  ax: number
  ay: number
  bx: number
  by: number
}

/**
 * Der Pfad, zurückgelesen.
 *
 * Die verrundete Ecke ist eine quadratische Bézier, deren Kontrollpunkt der
 * Eckpunkt selbst IST. Für die Prüfung zählt sie deshalb nicht als eigenes
 * Stück: relevant sind die geraden `L`-Segmente dazwischen, und ihre Endpunkte
 * sind genau die Punkte, die eine Ecke ein- und ausleitet.
 */
function legsOf(d: string): { legs: Leg[]; corners: number } {
  const tokens = d.trim().split(/\s+/)
  const legs: Leg[] = []
  let corners = 0
  let cx = 0
  let cy = 0
  let i = 0
  while (i < tokens.length) {
    const cmd = tokens[i]
    if (cmd === 'M') {
      cx = Number(tokens[i + 1])
      cy = Number(tokens[i + 2])
      i += 3
    } else if (cmd === 'L') {
      const nx = Number(tokens[i + 1])
      const ny = Number(tokens[i + 2])
      legs.push({ ax: cx, ay: cy, bx: nx, by: ny })
      cx = nx
      cy = ny
      i += 3
    } else if (cmd === 'Q') {
      // Der Kontrollpunkt ist die Ecke; der Bogen wird übersprungen, weil er
      // definitionsgemäss in der Ecke sitzt und keine eigene Richtung trägt.
      cx = Number(tokens[i + 3])
      cy = Number(tokens[i + 4])
      corners++
      i += 5
    } else {
      throw new Error(`unbekannter Pfadbefehl: ${cmd} in ${d}`)
    }
  }
  return { legs, corners }
}

function tierOf(id: string): ForgeUpgradeTier {
  return getForgeNode(id)?.tier ?? 'root'
}

function distToSegment(px: number, py: number, leg: Leg): number {
  const dx = leg.bx - leg.ax
  const dy = leg.by - leg.ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - leg.ax, py - leg.ay)
  let t = ((px - leg.ax) * dx + (py - leg.ay) * dy) / lenSq
  t = t < 0 ? 0 : t > 1 ? 1 : t
  return Math.hypot(px - (leg.ax + t * dx), py - (leg.ay + t * dy))
}

/** Die Ecke ist verrundet, also weicht sie um bis zu einem Eckradius von der
 *  scharfen Kante ab — und darf einem Nachbarn entsprechend näher kommen. */
const CORNER_SLACK_PX = FORGE_ROUTE_CORNER_R

describe('Star Forge — das Routing', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('führt jede Kante des Netzes', () => {
    const routes = forgeRoutes()
    const places = forgeTreePlacements()
    for (const edge of forgeEdges()) {
      if (!places.has(edge.from) || !places.has(edge.to)) continue
      const route = routes.get(forgeRouteKey(edge.from, edge.to))
      expect(route, `${edge.from} → ${edge.to} hat keinen Weg`).toBeDefined()
      expect(route!.d.length, `${edge.from} → ${edge.to} ist ein leerer Pfad`).toBeGreaterThan(0)
    }
  })

  it('setzt jedes Segment achsparallel — eine Drehung ist immer rechtwinklig', () => {
    // DIE Prüfung dieser Datei. Eine Linie, die schräg läuft, hat irgendwo
    // einen Winkel ungleich 90° genommen — und genau das soll es nicht mehr
    // geben.
    const routes = forgeRoutes()
    for (const [key, route] of routes) {
      for (const leg of legsOf(route.d).legs) {
        const flatH = Math.abs(leg.ay - leg.by) < 0.2
        const flatV = Math.abs(leg.ax - leg.bx) < 0.2
        expect(
          flatH || flatV,
          `${key} hat ein schräges Segment: ${leg.ax},${leg.ay} → ${leg.bx},${leg.by}`,
        ).toBe(true)
      }
    }
  })

  it('lässt keinen Weg durch einen fremden Knoten laufen', () => {
    // Die zweite Zusage, und die, an der die Bézier gescheitert ist. Geprüft
    // wird gegen JEDEN Knoten ausser den beiden Enden der Kante selbst.
    const routes = forgeRoutes()
    const places = forgeTreePlacements()
    const nodes = [...places].map(([id, at]) => ({
      id,
      x: at.x,
      y: at.y,
      r: FORGE_NODE_DIAMETER[tierOf(id)] / 2,
    }))

    let worst = { key: '', id: '', gap: Infinity }
    for (const [key, route] of routes) {
      const cut = key.indexOf('>')
      const own = new Set([key.slice(0, cut), key.slice(cut + 1)])
      const { legs } = legsOf(route.d)
      for (const node of nodes) {
        if (own.has(node.id)) continue
        for (const leg of legs) {
          const gap = distToSegment(node.x, node.y, leg) - node.r
          if (gap < worst.gap) worst = { key, id: node.id, gap }
        }
      }
    }
    expect(
      worst.gap,
      `engste Stelle: ${worst.key} streift ${worst.id} auf ${worst.gap.toFixed(1)} px`,
    ).toBeGreaterThan(-CORNER_SLACK_PX)
  })

  it('führt keinen Weg durch die Sonne', () => {
    // Der Körper in der Mitte ist kein Knoten und stand deshalb in keiner
    // Hindernisliste. Dass heute trotzdem nichts hindurchläuft, ist eine Folge
    // davon, dass der Platzierer die Knoten aus ihm heraushält — und keine
    // Zusage. Hier wird sie eine.
    const routes = forgeRoutes()
    const half = FORGE_STAGE_SIZE / 2
    const sun = SHOP_SUN_MAX_DIAMETER / 2 + FORGE_SUN_EDGE_GAP
    let worst = { key: '', dist: Infinity }
    for (const [key, route] of routes) {
      for (const leg of legsOf(route.d).legs) {
        const dist = distToSegment(half, half, leg)
        if (dist < worst.dist) worst = { key, dist }
      }
    }
    expect(
      worst.dist,
      `${worst.key} kommt der Sonne auf ${worst.dist.toFixed(1)} px nahe (Rand: ${sun})`,
    ).toBeGreaterThanOrEqual(sun - CORNER_SLACK_PX)
  })

  it('hält die Wege kurz an Knicken', () => {
    // Ein Weg darf ausweichen, aber er soll nicht mäandern. Gemessen: 16 Wege
    // ohne jeden Knick, 115 mit genau einem, 58 mit zweien, der schlimmste mit
    // vieren — im Mittel 1,3. Die Grenzen hier liegen darüber, weil die Spec
    // einen Rückfall fangen soll und nicht den Messwert festschreiben.
    // Alles darüber wäre wieder ein Gewirr, nur ein rechtwinkliges.
    const routes = forgeRoutes()
    let sum = 0
    let worst = { key: '', turns: 0 }
    let fallbacks = 0
    for (const [key, route] of routes) {
      sum += route.turns
      if (route.turns > worst.turns) worst = { key, turns: route.turns }
      if (route.viaFallback) fallbacks++
    }
    const mean = sum / routes.size
    expect(mean, `im Mittel ${mean.toFixed(2)} Knicke je Weg`).toBeLessThanOrEqual(2.2)
    expect(
      worst.turns,
      `${worst.key} nimmt ${worst.turns} Knicke; ${fallbacks} Wege brauchten den Ausweichweg`,
    ).toBeLessThanOrEqual(6)
  })

  it('kommt ohne den Ausweichweg fast überall aus', () => {
    // Kein Selbstzweck: eine Häufung heisst, dass die Knoten zu dicht stehen,
    // und dann ist der Hebel `FORGE_MIN_AIR_PX` im Platzierer — nicht die
    // Clearance hier.
    const routes = forgeRoutes()
    const fallbacks = [...routes.values()].filter((r) => r.viaFallback).length
    const share = fallbacks / routes.size
    expect(share, `${fallbacks} von ${routes.size} Wegen brauchten den Ausweichweg`).toBeLessThan(
      0.15,
    )
  })

  it('würfelt nicht', () => {
    // Dasselbe Versprechen wie beim Platzierer: dasselbe Netz in jeder Sitzung,
    // in jedem Spielstand, in jedem Testlauf — ohne dass eine einzige
    // Koordinate gespeichert werden müsste.
    const spy = vi.spyOn(Math, 'random')
    const first = forgeRoutes()
    const second = forgeRoutes()
    expect(spy).not.toHaveBeenCalled()
    for (const [key, route] of first) {
      expect(second.get(key)?.d).toBe(route.d)
    }
  })

  it('führt auch die Stummel von der Sonne rechtwinklig', () => {
    // Sie stehen in keiner Kantenliste, weil die Sonne kein Knoten ist. Liefen
    // sie radial, wären sie die einzigen schrägen Striche im ganzen Bild.
    const places = forgeTreePlacements()
    const centre = { x: 1000, y: 1000 }
    const edgeRadius = SHOP_SUN_MAX_DIAMETER / 2
    for (const [id, at] of places) {
      if (getForgeNode(id) !== undefined) continue // nur die fünf Strahlen
      const route = forgeSunRoute(centre, edgeRadius, id, at)
      expect(route.d.length, `der Stummel zu ${id} ist leer`).toBeGreaterThan(0)
      for (const leg of legsOf(route.d).legs) {
        const flatH = Math.abs(leg.ay - leg.by) < 0.2
        const flatV = Math.abs(leg.ax - leg.bx) < 0.2
        expect(flatH || flatV, `der Stummel zu ${id} läuft schräg`).toBe(true)
      }
    }
  })

  it('setzt den Strich mit Abstand zum Knotenrand an, nicht im Mittelpunkt', () => {
    // Der Grund, warum ein Knoten mit fünf Kanten keinen Stern mehr unter
    // seinem Kreis trägt. Der erste Punkt eines Weges liegt AUF dem Rand des
    // Ursprungsknotens — nicht in seiner Mitte.
    const routes = forgeRoutes()
    const places = forgeTreePlacements()
    for (const [key, route] of routes) {
      const fromId = key.slice(0, key.indexOf('>'))
      const at = places.get(fromId)
      if (!at) continue
      const head = route.d.trim().split(/\s+/)
      const start = { x: Number(head[1]), y: Number(head[2]) }
      const radius = FORGE_NODE_DIAMETER[tierOf(fromId)] / 2
      const reach = Math.hypot(start.x - at.x, start.y - at.y)
      expect(reach, `${key} beginnt im Mittelpunkt von ${fromId}`).toBeGreaterThan(radius * 0.5)
      expect(reach, `${key} beginnt ausserhalb von ${fromId}`).toBeLessThanOrEqual(
        radius + FORGE_ROUTE_CLEARANCE_PX,
      )
    }
  })
})

describe('Star Forge — die Wege bleiben im Netz', () => {
  it('kein Weg verlaesst die Inhalts-Huelle um mehr als den Saum', () => {
    /*
     * Die Kamera klemmt seit dem Umbau gegen `forgeContentBounds()`, also gegen
     * die äussersten KNOTEN. Ein Weg, der weiter ausholt als der dort
     * zugeschlagene `FORGE_CONTENT_SEAM_PX`, würde am Anschlag angeschnitten.
     *
     * Ausholen KÖNNTE er: Kanalversatz bis 4 · `FORGE_ROUTE_CHANNEL_PX`,
     * Stummel `FORGE_MIN_AIR_PX / 2`, und der Ausweichweg sucht bis
     * `FORGE_ROUTE_MARGIN_PX` über die Endpunkt-Box hinaus. Gemessen tut er es
     * nicht — über alle 205 Wege 0,0 px, null Ausweichwege. Genau deshalb steht
     * die Prüfung hier und nicht als Annahme im Kommentar der Konstante: sie
     * ist die einzige Stelle, an der auffällt, wenn ein umgehängter Knoten das
     * Routing nach aussen drückt.
     */
    const bounds = forgeContentBounds()
    let worst = 0
    let worstKey = ''
    let fallbacks = 0
    for (const [key, route] of forgeRoutes()) {
      if (route.viaFallback) fallbacks++
      for (const leg of legsOf(route.d).legs) {
        for (const p of [
          { x: leg.ax, y: leg.ay },
          { x: leg.bx, y: leg.by },
        ]) {
          const over = Math.max(
            bounds.minX - p.x,
            p.x - bounds.maxX,
            bounds.minY - p.y,
            p.y - bounds.maxY,
          )
          if (over > worst) {
            worst = over
            worstKey = key
          }
        }
      }
    }
    expect(
      worst,
      `${worstKey} steht ${worst.toFixed(1)} px ueber der Knoten-Huelle`,
    ).toBeLessThanOrEqual(FORGE_CONTENT_SEAM_PX)
    // Kein Beiwerk: eine Häufung von Ausweichwegen heisst, die Knoten stehen zu
    // dicht — und der Hebel dafür ist `FORGE_MIN_AIR_PX`, nicht der Saum.
    expect(fallbacks, `${fallbacks} Ausweichwege`).toBeLessThanOrEqual(5)
  })
})
