import { describe, it, expect } from 'vitest'
import {
  solarSignatureFrom,
  emptySolarSignature,
  forgeNodeAxis,
  SOLAR_SIGNATURE_AXIS_BY_NODE,
  SIGNATURE_AXIS_COLOR,
  plasmaSignatureVars,
  blackHoleSignatureVars,
  wakeSignatureBonus,
  cometGoldSignatureLift,
} from '@/utils/game/solarSignature'
import { FORGE_NODES } from '@/config/progression/starForge'
import { SOLAR_BRANCHES, SOLAR_SIGNATURE_STAGES } from '@/config/constants'
import type { ForgeAxisId, SolarSignatureInput } from '@/types'

/**
 * Was der Waechter in seine Sonne gesteckt hat — als Zahl.
 *
 * Diese Spec existiert, weil zwei ihrer Eigenschaften in einem Diff unsichtbar
 * sind. Die erste: dass JEDER Knoten des Katalogs ueber seine `parentId`-Kette
 * bei genau einem Kernstrahl landet. Ein Knoten, der ins Leere haengt, faellt
 * lautlos aus der Signatur — er waere weiterhin kaufbar, wirkte weiterhin, und
 * nur die Sonne bliebe an dieser Stelle stumm. Die zweite: dass die Skala
 * SAETTIGT. Ring 7 kennt keine Obergrenze, und ohne die Kurve stuende die
 * Sonne nach ein paar hundert Bough-Stufen auf einem Wert, den keine Tabelle
 * mehr einholt.
 */

const AXES = SOLAR_BRANCHES.map((r) => r.id) as ForgeAxisId[]

function noRays(): Record<ForgeAxisId, number> {
  return { flightSpeed: 0, maxHp: 0, chimesPerClick: 0, chimesPerSecond: 0, dmgPerClick: 0 }
}

function input(over: Partial<SolarSignatureInput> = {}): SolarSignatureInput {
  return {
    rayLevels: noRays(),
    nodeLevelBags: [],
    relicLevels: 0,
    constellationCount: 0,
    totalPrestiges: 0,
    ...over,
  }
}

describe('Achsenaufloesung', () => {
  it('ordnet JEDEN Katalogknoten genau einem Kernstrahl zu', () => {
    expect(FORGE_NODES.length).toBeGreaterThan(0)
    const orphans = FORGE_NODES.filter((n) => !SOLAR_SIGNATURE_AXIS_BY_NODE.has(n.id))
    expect(orphans.map((n) => n.id)).toEqual([])
  })

  it('nennt nur Achsen, die es wirklich gibt', () => {
    for (const axis of SOLAR_SIGNATURE_AXIS_BY_NODE.values()) {
      expect(AXES).toContain(axis)
    }
  })

  it('gibt einen Kernstrahl als sich selbst zurueck', () => {
    for (const axis of AXES) expect(forgeNodeAxis(axis)).toBe(axis)
  })

  it('kennt eine erfundene Id nicht', () => {
    expect(forgeNodeAxis('nichtImKatalog')).toBeUndefined()
  })

  it('haelt fuer jede Achse eine Farbe bereit', () => {
    for (const axis of AXES) expect(SIGNATURE_AXIS_COLOR[axis]).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

describe('solarSignatureFrom', () => {
  it('ist im frischen Spielstand ueberall null', () => {
    const sig = solarSignatureFrom(input())
    for (const axis of AXES) {
      expect(sig.axes[axis].levels).toBe(0)
      expect(sig.axes[axis].t).toBe(0)
      expect(sig.axes[axis].stage).toBe(0)
    }
    expect(sig.base.levels).toBe(0)
    expect(sig.base.t).toBe(0)
  })

  it('zaehlt die Kernstrahlen auf ihre eigene Achse', () => {
    const sig = solarSignatureFrom(input({ rayLevels: { ...noRays(), maxHp: 4 } }))
    expect(sig.axes.maxHp.levels).toBe(4)
    expect(sig.axes.flightSpeed.levels).toBe(0)
  })

  it('zaehlt einen Baumknoten auf die Achse seiner Wurzel', () => {
    const node = FORGE_NODES.find((n) => SOLAR_SIGNATURE_AXIS_BY_NODE.get(n.id) === 'dmgPerClick')
    expect(node).toBeDefined()
    const sig = solarSignatureFrom(input({ nodeLevelBags: [{ [node!.id]: 3 }] }))
    expect(sig.axes.dmgPerClick.levels).toBe(3)
  })

  it('ignoriert Ids, die im Katalog nicht stehen', () => {
    const sig = solarSignatureFrom(input({ nodeLevelBags: [{ nichtImKatalog: 99 }] }))
    for (const axis of AXES) expect(sig.axes[axis].levels).toBe(0)
  })

  it('ist in jeder Achse monoton', () => {
    const node = FORGE_NODES.find(
      (n) => SOLAR_SIGNATURE_AXIS_BY_NODE.get(n.id) === 'chimesPerSecond',
    )
    let last = -1
    for (const levels of [0, 1, 5, 20, 60, 200]) {
      const t = solarSignatureFrom(input({ nodeLevelBags: [{ [node!.id]: levels }] })).axes
        .chimesPerSecond.t
      expect(t).toBeGreaterThanOrEqual(last)
      last = t
    }
  })

  it('saettigt — auch bei absurd vielen Bough-Stufen bleibt t unter 1', () => {
    const node = FORGE_NODES.find((n) => n.tier === 'bough')
    expect(node).toBeDefined()
    const axis = SOLAR_SIGNATURE_AXIS_BY_NODE.get(node!.id)!
    const sig = solarSignatureFrom(input({ nodeLevelBags: [{ [node!.id]: 1e9 }] }))
    expect(sig.axes[axis].t).toBeLessThanOrEqual(1)
    expect(sig.axes[axis].t).toBeGreaterThan(0.99)
    // Und die Stufe laeuft nicht ueber das Ende der Tabelle hinaus.
    expect(sig.axes[axis].stage).toBeLessThan(SOLAR_SIGNATURE_STAGES.length)
  })

  it('behandelt negative Stufen wie null — ein kaputter Save kippt nichts', () => {
    const sig = solarSignatureFrom(
      input({ rayLevels: { ...noRays(), maxHp: -5 }, relicLevels: -3, totalPrestiges: -1 }),
    )
    expect(sig.axes.maxHp.levels).toBe(0)
    expect(sig.base.levels).toBe(0)
  })
})

describe('Grundsignatur', () => {
  it('nimmt Relikte, Konstellationen und Aufbrueche — und nur die', () => {
    const sig = solarSignatureFrom(
      input({ relicLevels: 6, constellationCount: 3, totalPrestiges: 2 }),
    )
    expect(sig.base.levels).toBe(11)
    expect(sig.base.t).toBeGreaterThan(0)
  })

  it('laesst dabei JEDE Achse unberuehrt — ein Relikt nennt keine', () => {
    const sig = solarSignatureFrom(
      input({ relicLevels: 60, constellationCount: 13, totalPrestiges: 9 }),
    )
    for (const axis of AXES) {
      expect(sig.axes[axis].levels).toBe(0)
      expect(sig.axes[axis].t).toBe(0)
    }
  })

  it('kennt Cosmic Bargains gar nicht als Eingang', () => {
    // Sie sind wiederholbar und laufen ab; eine Achse, die sich beliebig
    // nachfuellen laesst, waere keine Auskunft ueber den Ausbau.
    expect(Object.keys(input())).not.toContain('bargains')
  })
})

describe('Optik-Zuordnung', () => {
  it('liefert fuer die nackte Sonne durchweg Nullwerte', () => {
    const vars = plasmaSignatureVars(emptySolarSignature())
    expect(vars['--sig-spark-a']).toBe('0%')
    expect(vars['--sig-limb-a']).toBe('0%')
    expect(vars['--sig-prom-a']).toBe('0%')
    expect(vars['--sig-granule-a']).toBe('0%')
    expect(vars['--sig-corona-a']).toBe('0%')
  })

  it('gibt Alphas als Prozent-Strings aus, nicht als Brueche', () => {
    // Sie landen in `color-mix(... X%, transparent)`; ein blanker Bruch dort
    // ist ungueltig und faellt still aus.
    const vars = plasmaSignatureVars(
      solarSignatureFrom(input({ rayLevels: { ...noRays(), maxHp: 6 } })),
    )
    for (const key of ['--sig-spark-a', '--sig-limb-a', '--sig-prom-a', '--sig-granule-a']) {
      expect(vars[key]).toMatch(/%$/)
    }
  })

  it('nennt einen Winkel je Protuberanzen-Schritt', () => {
    const vars = plasmaSignatureVars(emptySolarSignature())
    expect(vars['--sig-prom-step']).toMatch(/deg$/)
  })

  it('gibt die Saumbreite als BRUCH aus — Prozent kippt den ganzen box-shadow', () => {
    // Gemessen: `--sig-limb-w: 1%` machte `box-shadow` komplett ungueltig und
    // damit auch die Korona daneben unsichtbar. Ein Blur-Radius kennt kein
    // Prozent; die Scheibe rechnet den Bruch ueber `--disc-d` in Pixel um.
    for (const levels of [0, 6, 90]) {
      const vars = plasmaSignatureVars(
        solarSignatureFrom(input({ rayLevels: { ...noRays(), maxHp: Math.min(levels, 6) } })),
      )
      expect(vars['--sig-limb-w']).not.toMatch(/%/)
      expect(Number(vars['--sig-limb-w'])).not.toBeNaN()
    }
  })

  it('gibt dem Schwarzen Loch Faktoren, keine Absolutwerte', () => {
    const vars = blackHoleSignatureVars(emptySolarSignature())
    for (const key of ['--sig-bh-jet', '--sig-bh-ring', '--sig-bh-halo', '--sig-bh-mote']) {
      expect(Number(vars[key])).toBe(1)
    }
    // Die Akkretionsscheibe reicht mit dem Ausbau weiter nach INNEN.
    expect(Number(vars['--sig-bh-inner'])).toBe(1)
  })

  it('hebt die Faktoren des Schwarzen Lochs mit dem Ausbau', () => {
    const node = FORGE_NODES.find((n) => SOLAR_SIGNATURE_AXIS_BY_NODE.get(n.id) === 'flightSpeed')
    const sig = solarSignatureFrom(input({ nodeLevelBags: [{ [node!.id]: 90 }] }))
    expect(Number(blackHoleSignatureVars(sig)['--sig-bh-jet'])).toBeGreaterThan(1)
  })

  it('gibt dem Kometen nur die GRUNDsignatur, nie eine Achse', () => {
    const axisOnly = solarSignatureFrom(input({ rayLevels: { ...noRays(), dmgPerClick: 6 } }))
    expect(cometGoldSignatureLift(axisOnly)).toBe(0)

    const withBase = solarSignatureFrom(input({ relicLevels: 20 }))
    expect(cometGoldSignatureLift(withBase)).toBeGreaterThan(0)
  })

  it('haengt den Sonnenwind an die Flugachse', () => {
    expect(wakeSignatureBonus(emptySolarSignature())).toBe(0)
    const node = FORGE_NODES.find((n) => SOLAR_SIGNATURE_AXIS_BY_NODE.get(n.id) === 'flightSpeed')
    const sig = solarSignatureFrom(input({ nodeLevelBags: [{ [node!.id]: 90 }] }))
    expect(wakeSignatureBonus(sig)).toBeGreaterThan(0)
  })
})
