import { describe, it, expect } from 'vitest'
import {
  FORGE_BRIDGE_MAX_PX,
  FORGE_EDGE_MAX_PX,
  FORGE_COMFORT_AIR_PX,
  FORGE_MIN_AIR_PX,
  FORGE_NODE_DIAMETER,
  FORGE_RAY_DIST,
  FORGE_STAGE_SIZE,
  FORGE_SUN_EDGE_GAP,
  FORGE_ROAD_BAND,
  FORGE_ZONE_BAND,
  SHOP_SUN_MAX_DIAMETER,
  SOLAR_BRANCHES,
} from '@/config/constants'
import { FORGE_NODES, getForgeNode } from '@/config/progression/starForge'
import { FORGE_BRIDGES, FORGE_CLUSTERS } from '@/config/progression/starForgeNet'
import { FORGE_SEATS, forgeSeatTier, getForgeSeat } from '@/config/progression/forgeSeats'
import { MEEP_TREE_BRANCHES, MEEP_TREE_NODES } from '@/config/progression/meepTree'
import { FORGE_ROAD_LANES } from '@/config/progression/starForgeNet'
import { forgeEdges, forgeTreePlacements } from '@/utils/ui/forgeTreeLayout'

/**
 * Die Geometrie des NETZES — Nachfolgerin von `forgeGeometry.spec.ts`.
 *
 * Die alte Datei prüfte eine Ringleiter: Radien streng steigend, Ringabstand
 * grösser als die halben Knoten beider Ringe, Kammbänder ohne Überlappung. Alle
 * drei sind Aussagen über ein Raster, das es nicht mehr gibt.
 *
 * Was an ihre Stelle tritt, sind die drei Zusagen des Umbaus, und zwar als
 * Rechnung statt als Absicht:
 *
 *   1. **Nichts überlappt.** Zwischen den Rändern zweier beliebiger Knoten
 *      liegen mindestens `FORGE_MIN_AIR_PX`.
 *   2. **Jede Bedingung ist ein sichtbarer Nachbar.** Keine Struktur- oder
 *      Bedingungskante ist länger als `FORGE_EDGE_MAX_PX` — die Zahl ist so
 *      gewählt, dass beide Enden bei Standardzoom zugleich ins Bild passen.
 *      Genau daran sind die alten Spannfäden gescheitert (438 gegen 221
 *      Bühnen-px bei 484 sichtbaren), und genau das wird hier nachgerechnet.
 *   3. **Kein Knoten steckt in der Sonne oder ragt über die Kante.**
 */

/** Die Rundung der Platzierung auf 0,1 px und der Abbruch des Trenn-Passes nach
 *  fester Rundenzahl lassen bis zu einem Pixel Rest — das ist der Preis dafür,
 *  dass die Laufzeit beschränkt und das Ergebnis reproduzierbar ist. */
const AIR_TOLERANCE_PX = 1

/**
 * Wie weit ein Knoten aus seinem Band gedrückt werden darf.
 *
 * Nicht Schlamperei, sondern ein echter Zielkonflikt — und die Toleranz ist die
 * Stelle, an der er zugegeben wird. Eine Krone verlangt Knoten aus zwei Zonen
 * unter sich, und `FORGE_EDGE_MAX_PX` verlangt, dass diese Kante ins Bild passt.
 * Beides zusammen zieht sie unter die Innenkante ihres Bandes: gemessen 60 px
 * bei `sanctumVeil`, und das schon NACH dem Zugeständnis, das Kronenband auf
 * 620 zu öffnen. Dieselbe Spannung an einem Zweig, der an seinem Solar Ray auf
 * r = 200 hängt.
 *
 * Die kurze Kante gewinnt, weil sie die ältere und die sichtbarere Zusage ist —
 * ein Zubringer ausserhalb des Bildes ist ein Fehler, den der Spieler merkt;
 * ein Knoten 60 px vor seiner Bandkante ist keiner.
 *
 * Was diese Prüfung trotzdem fängt, ist der Fall, der wirklich schadet: ein
 * Knoten, der eine GANZE Zone verrutscht — die Bänder sind 180…280 px breit.
 */
const BAND_TOLERANCE_PX = 70

const RAY_IDS = new Set<string>(SOLAR_BRANCHES.map((b) => b.id))

describe('Star Forge — das Netz steht frei', () => {
  it('jeder SITZ hat genau einen Platz', () => {
    // Gemessen wird gegen `FORGE_SEATS` und nicht mehr gegen die Kataloge: die
    // Sitzfrage ist eine eigene, und sobald ein Knoten aus einem anderen
    // Katalog auf die Buehne kommt, muss diese Zusicherung ihn mitzaehlen,
    // ohne dass jemand hier eine zweite Quelle nachtraegt.
    const places = forgeTreePlacements()
    expect(places.size).toBe(FORGE_SEATS.length)
    for (const seat of FORGE_SEATS) {
      expect(places.get(seat.id), `${seat.id} steht nirgends`).toBeDefined()
    }
  })

  it('die Sitz-Quelle deckt beide Kataloge und kennt keine Dublette', () => {
    const ids = FORGE_SEATS.map((seat) => seat.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const def of FORGE_NODES) expect(forgeSeatTier(def.id)).toBe(def.tier)
    for (const ray of SOLAR_BRANCHES) expect(forgeSeatTier(ray.id)).toBe('root')
  })

  it('kein Knotenpaar unterschreitet die Mindestluft', () => {
    // DIE Prüfung dieser Datei. Sie ersetzt „Ringabstand > halbe Knotensumme":
    // dort genügte es, sieben Radien gegeneinander zu rechnen, weil jeder Knoten
    // auf einem Ring sass. Im Netz gibt es keine Klasse mehr, die man
    // stellvertretend prüfen könnte — also wird jedes Paar gemessen.
    const places = forgeTreePlacements()
    const ids = [...places.keys()]
    let worst = { a: '', b: '', air: Infinity }
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const pa = places.get(ids[i])!
        const pb = places.get(ids[j])!
        const air =
          Math.hypot(pa.x - pb.x, pa.y - pb.y) -
          (FORGE_NODE_DIAMETER[forgeSeatTier(ids[i])] + FORGE_NODE_DIAMETER[forgeSeatTier(ids[j])]) / 2
        if (air < worst.air) worst = { a: ids[i], b: ids[j], air }
      }
    }
    expect(
      worst.air,
      `engste Stelle: ${worst.a} und ${worst.b} halten ${worst.air.toFixed(1)} px`,
    ).toBeGreaterThanOrEqual(FORGE_MIN_AIR_PX - AIR_TOLERANCE_PX)
  })

  it('jede Struktur- und Bedingungskante bleibt kurz genug fürs Bild', () => {
    // Die Zusage, die den ganzen Umbau trägt. Eine Bedingung, deren Zubringer
    // ausserhalb des Bildes steht, ist keine Auskunft, sondern eine Aufgabe:
    // der Spieler musste sich Namen merken und selbst suchen gehen.
    const places = forgeTreePlacements()
    for (const edge of forgeEdges()) {
      if (edge.kind === 'bridge') continue
      const a = places.get(edge.from)
      const b = places.get(edge.to)
      expect(a && b, `${edge.from} → ${edge.to} hängt im Nichts`).toBeTruthy()
      const length = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      expect(
        length,
        `${edge.kind}-Kante ${edge.from} → ${edge.to} misst ${length.toFixed(0)} px`,
      ).toBeLessThanOrEqual(FORGE_EDGE_MAX_PX)
    }
  })

  it('auch die Wege zwischen zwei Zonen bleiben in ihrer weiteren Grenze', () => {
    // Eine Brücke darf weiter sein als eine Bedingung, weil sie etwas anderes
    // verspricht: ihr folgt man, sie muss nicht als Ganzes im Bild stehen.
    // Grenzenlos ist sie deshalb nicht — sonst zöge das Netz an einer Stelle
    // auseinander, an der es zusammenhalten soll.
    const places = forgeTreePlacements()
    for (const bridge of FORGE_BRIDGES) {
      const a = places.get(bridge.from)
      const b = places.get(bridge.to)
      expect(a && b, `Brücke ${bridge.from} → ${bridge.to} hängt im Nichts`).toBeTruthy()
      const length = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      expect(
        length,
        `Brücke ${bridge.from} → ${bridge.to} misst ${length.toFixed(0)} px`,
      ).toBeLessThanOrEqual(FORGE_BRIDGE_MAX_PX)
    }
  })

  it('kein Knoten steckt in der Sonne oder ragt über die Bühnenkante', () => {
    const places = forgeTreePlacements()
    const half = FORGE_STAGE_SIZE / 2
    const sunEdge = SHOP_SUN_MAX_DIAMETER / 2 + FORGE_SUN_EDGE_GAP
    for (const [id, at] of places) {
      const r = FORGE_NODE_DIAMETER[forgeSeatTier(id)] / 2
      const dist = Math.hypot(at.x - half, at.y - half)
      expect(dist - r, `${id} steckt in der Sonne`).toBeGreaterThanOrEqual(sunEdge - 1)
      expect(dist + r, `${id} ragt über die Bühnenkante`).toBeLessThanOrEqual(half + 1)
    }
  })

  it('die fünf Strahlen stehen dort, wo die Karte sie hinsetzt', () => {
    // Sie sind die einzigen Knoten mit fester Position: der Anfang, an dem alles
    // hängt. Zöge die Relaxation sie mit, wanderte der ganze Baum bei der
    // nächsten Katalogänderung.
    const places = forgeTreePlacements()
    const half = FORGE_STAGE_SIZE / 2
    for (const ray of SOLAR_BRANCHES) {
      const at = places.get(ray.id)!
      const dist = Math.hypot(at.x - half, at.y - half)
      expect(dist, `${ray.id} ist gewandert`).toBeCloseTo(FORGE_RAY_DIST, 0)
    }
  })

  it('jeder KNOTEN liegt im Distanzband seiner Phase', () => {
    // Hier stand: „jeder Cluster liegt in dem Distanzband seiner Phase" — geprüft
    // an `cluster.dist`, einer Zahl aus der Karte. Das war eine Aussage über die
    // Karte, nicht über das Bild: wo die Knoten am Ende standen, sagte sie
    // nicht.
    //
    // `dist` gibt es nicht mehr, und deshalb wird jetzt das Ergebnis gemessen.
    // Das Band ist seit dem Umbau eine echte Schranke (`pullIntoSector`), also
    // ist die Prüfung auch erfüllbar — sie ist die härtere Fassung derselben
    // Zusage.
    //
    // Die Bänder überlappen absichtlich; was sie NICHT dürfen, ist die
    // Reihenfolge verlieren, sonst wüchse der Baum nach innen.
    const places = forgeTreePlacements()
    const half = FORGE_STAGE_SIZE / 2
    for (const cluster of FORGE_CLUSTERS) {
      // Zwei Regionen, zwei Bänderleitern: bei der Sonne ist der Index die
      // PHASE, auf der Strasse der RANG. Ein gemeinsames Array wäre eine
      // Sonnenphase, die es nicht gibt.
      const band =
        cluster.region === 'road' ? FORGE_ROAD_BAND[cluster.rank] : FORGE_ZONE_BAND[cluster.phase]
      expect(band, `${cluster.id} hat kein Band`).toBeDefined()
      for (const id of cluster.members) {
        const at = places.get(id)
        if (!at) continue
        const dist = Math.hypot(at.x - half, at.y - half)
        // Die Toleranz deckt, was NACH dem Sektorzug noch schiebt: der harte
        // Trenn-Pass und die Klemmung gegen Sonne und Bühnenkante.
        expect(dist, `${id} (${cluster.id}) steht vor seinem Band`).toBeGreaterThanOrEqual(
          band.inner - BAND_TOLERANCE_PX,
        )
        expect(dist, `${id} (${cluster.id}) steht hinter seinem Band`).toBeLessThanOrEqual(
          band.outer + BAND_TOLERANCE_PX,
        )
      }
    }
  })

  it('der Abstand ist überall ungefähr gleich', () => {
    // DIE Zusage dieses Umbaus, und sie misst das Bild, nicht die Absicht.
    //
    // Vorher: Median 22,0 px — der Anschlag SELBST, an dem mehr als die Hälfte
    // aller Knoten klebte — bei einem Maximum von 112 px und einem
    // Variationskoeffizienten von 0,56. Innen gedrängt, dazwischen leer.
    //
    // Der Variationskoeffizient (Standardabweichung durch Mittelwert) ist dabei
    // die eigentliche Kennzahl: ein Minimum allein sagt nur, dass sich nichts
    // berührt, und ein Mittelwert allein verdeckt, dass er aus zwei Extremen
    // entsteht. Erst die Streuung beantwortet „ungefähr immer gleich".
    const places = forgeTreePlacements()
    const ids = [...places.keys()]
    const air: number[] = []
    for (let i = 0; i < ids.length; i++) {
      let nearest = Infinity
      for (let j = 0; j < ids.length; j++) {
        if (i === j) continue
        const a = places.get(ids[i])!
        const b = places.get(ids[j])!
        const gap =
          Math.hypot(a.x - b.x, a.y - b.y) -
          (FORGE_NODE_DIAMETER[forgeSeatTier(ids[i])] + FORGE_NODE_DIAMETER[forgeSeatTier(ids[j])]) / 2
        if (gap < nearest) nearest = gap
      }
      air.push(nearest)
    }
    const mean = air.reduce((sum, v) => sum + v, 0) / air.length
    const sd = Math.sqrt(air.reduce((sum, v) => sum + (v - mean) ** 2, 0) / air.length)
    const spread = sd / mean
    const sorted = [...air].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]

    expect(
      spread,
      `Variationskoeffizient ${spread.toFixed(3)} (Median ${median.toFixed(0)} px, ` +
        `Minimum ${sorted[0].toFixed(0)}, Maximum ${sorted[sorted.length - 1].toFixed(0)})`,
    ).toBeLessThanOrEqual(0.35)
    // Und der Abstand soll nicht nur gleich sein, sondern auch da: ein Netz mit
    // überall 22 px Luft wäre gleichmässig und trotzdem gedrängt.
    expect(median, `Median-Luft ${median.toFixed(0)} px`).toBeGreaterThanOrEqual(
      FORGE_COMFORT_AIR_PX * 0.7,
    )
  })

  it('die Strasse liegt jenseits der Sonnenleiter', () => {
    // Sie überlappt mit dem letzten Sonnenband — wie jede Zone mit ihrer
    // Nachbarin —, aber sie beginnt und endet weiter aussen. Ohne diese
    // Zusicherung könnte eine Spur eines Tages MITTEN durch die Kronen laufen.
    const lastSun = FORGE_ZONE_BAND[FORGE_ZONE_BAND.length - 1]
    for (let i = 0; i < FORGE_ROAD_BAND.length; i++) {
      expect(FORGE_ROAD_BAND[i].inner, `Strassenband ${i}`).toBeGreaterThan(lastSun.inner)
      expect(FORGE_ROAD_BAND[i].outer, `Strassenband ${i}`).toBeGreaterThan(lastSun.outer)
    }
    for (let i = 1; i < FORGE_ROAD_BAND.length; i++) {
      expect(FORGE_ROAD_BAND[i].inner).toBeGreaterThan(FORGE_ROAD_BAND[i - 1].inner)
      expect(FORGE_ROAD_BAND[i].outer).toBeGreaterThan(FORGE_ROAD_BAND[i - 1].outer)
    }
  })

  it('jede Spur trägt genau einen Meep-Zweig, in Rangreihenfolge', () => {
    // Das POSITIVE Gegenstück zu `forgeMixing.spec.ts`, das die Strasse
    // ausnimmt: dort steht gegen einen Sektor, der über sechs Ringe eine
    // Aussage trug. Hier IST die Spur die Aussage — sie läuft nach aussen statt
    // im Kreis, und ihre Ordnung ist ihr Inhalt. Ohne diese Zusicherung wäre
    // die Ausnahme dort ein Loch ohne Ersatz.
    expect(FORGE_ROAD_LANES.length).toBe(MEEP_TREE_BRANCHES.length)
    for (const lane of FORGE_ROAD_LANES) {
      const branch = MEEP_TREE_BRANCHES.find((b) => lane.id === `lane_${b.id}`)
      expect(branch, `${lane.id} gehört zu keinem Zweig`).toBeDefined()
      expect(lane.members).toEqual(branch!.nodes.map((n) => n.id))
      const tiers = branch!.nodes.map((n) => n.tier)
      expect([...tiers].sort((a, b) => a - b)).toEqual(tiers)
    }
  })

  it('Rang für Rang weiter nach aussen', () => {
    // „Rang = Entfernung" ist der ganze Grund, aus dem eine Spur ein
    // Ringabschnitt über die volle Tiefe ist statt eines Knotens je Ring.
    const places = forgeTreePlacements()
    const half = FORGE_STAGE_SIZE / 2
    const distOf = (id: string) => {
      const at = places.get(id)!
      return Math.hypot(at.x - half, at.y - half)
    }
    for (const branch of MEEP_TREE_BRANCHES) {
      const byTier = new Map<number, number[]>()
      for (const node of branch.nodes) {
        const list = byTier.get(node.tier) ?? []
        list.push(distOf(node.id))
        byTier.set(node.tier, list)
      }
      const tiers = [...byTier.keys()].sort((a, b) => a - b)
      for (let i = 1; i < tiers.length; i++) {
        const prev = Math.max(...byTier.get(tiers[i - 1])!)
        const here = Math.min(...byTier.get(tiers[i])!)
        expect(here, `${branch.id}: Rang ${tiers[i] + 1} steht nicht weiter aussen`).toBeGreaterThan(
          prev - BAND_TOLERANCE_PX,
        )
      }
    }
  })

  it('die Bänder steigen streng, und keines beginnt vor den Strahlen', () => {
    for (let i = 1; i < FORGE_ZONE_BAND.length; i++) {
      expect(
        FORGE_ZONE_BAND[i].inner,
        `Band ${i} beginnt nicht nach Band ${i - 1}`,
      ).toBeGreaterThan(FORGE_ZONE_BAND[i - 1].inner)
      expect(FORGE_ZONE_BAND[i].outer).toBeGreaterThan(FORGE_ZONE_BAND[i - 1].outer)
    }
    expect(FORGE_ZONE_BAND[0].inner).toBeGreaterThan(FORGE_RAY_DIST)
  })

  it('die Karte und der Katalog kennen dieselben Knoten', () => {
    // Ein Name in der Karte, den der Katalog nicht führt, wäre ein Ort ohne
    // Knoten; ein Katalogknoten ohne Karteneintrag stünde nirgends und wäre für
    // den Spieler nicht vorhanden. Beides fällt sonst niemandem auf.
    const mapped = FORGE_CLUSTERS.flatMap((c) => c.members)
    expect(new Set(mapped).size, 'ein Knoten steht in zwei Clustern').toBe(mapped.length)
    const mappedSet = new Set(mapped)
    for (const def of FORGE_NODES) {
      expect(mappedSet.has(def.id), `${def.id} liegt in keinem Cluster`).toBe(true)
    }
    // Gegen die SITZ-Quelle statt gegen einen einzelnen Katalog: die Karte
    // trägt seit The Wandering Knoten aus zwei Katalogen, und ein Ort ohne
    // Knoten fällt sonst niemandem auf.
    for (const id of mapped) {
      expect(getForgeSeat(id), `die Karte kennt ${id}, kein Katalog nicht`).toBeDefined()
    }
    for (const def of MEEP_TREE_NODES) {
      expect(mappedSet.has(def.id), `${def.id} liegt auf keiner Spur`).toBe(true)
    }
    // Die Strahlen gehören keinem Cluster — sie sind der Anfang, kein Ort.
    for (const rayId of RAY_IDS) {
      expect(mappedSet.has(rayId), `${rayId} liegt in einem Cluster`).toBe(false)
    }
  })

  it('jede Brücke verbindet zwei Knoten, die es gibt', () => {
    for (const bridge of FORGE_BRIDGES) {
      expect(getForgeNode(bridge.from), `Brücke von ${bridge.from}`).toBeDefined()
      expect(getForgeNode(bridge.to), `Brücke nach ${bridge.to}`).toBeDefined()
      expect(bridge.from, 'eine Brücke auf sich selbst').not.toBe(bridge.to)
    }
  })

  it('die Platzierung ist deterministisch und würfelt nicht', () => {
    // Härter als ein Gleichheitsvergleich zweier Aufrufe: der liefe auch bei
    // einem Modul-Cache über `Math.random()` durch. Hier wird bewiesen, dass
    // gar nicht gewürfelt wird — das Netz muss in jeder Sitzung, jedem
    // Spielstand und jedem Testlauf dasselbe sein, ohne gespeichert zu werden.
    const first = forgeTreePlacements()
    const second = forgeTreePlacements()
    for (const [id, at] of first) {
      expect(second.get(id)).toEqual(at)
    }
  })
})
