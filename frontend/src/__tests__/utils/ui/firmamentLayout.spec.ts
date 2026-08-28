import { describe, it, expect } from 'vitest'
import {
  buildFirmamentGates,
  buildFirmamentNodes,
  firmamentFitBox,
  firmamentGateSignature,
  firmamentPointAt,
  type FirmamentNode,
} from '@/utils/ui/firmamentLayout'
import { FIRMAMENT_UNLIT_AHEAD } from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { UniverseRunRecord } from '@/types'

const starsOf = (g: number) => Math.min(3 + (g - 1), 7)

function rec(galaxy: number, completedAt: number, rescued = 3, lost = 0): CompletedGalaxyRecord {
  return {
    galaxy,
    mapSeed: 1000 + galaxy,
    themeIndex: galaxy % 20,
    attemptResults: [
      ...Array(rescued).fill('rescued' as const),
      ...Array(lost).fill('failed' as const),
    ],
    landfallResults: [{ kind: 'wayside_cairn', cleared: true }],
    durationSeconds: 600,
    completedAt,
  }
}

function run(universe: number, completedAt: number): UniverseRunRecord {
  return {
    universe,
    durationSeconds: 900,
    starsRescued: 12,
    galaxiesFreed: 3,
    chimes: 1e6,
    completedAt,
  }
}

function base(completed: CompletedGalaxyRecord[], currentGalaxy: number) {
  return {
    completed,
    currentGalaxy,
    currentRescued: 1,
    currentLost: 0,
    currentLandfalls: 0,
    currentThemeIndex: 4,
    starsOf,
  }
}

describe('firmamentPointAt', () => {
  it('waechst monoton nach aussen', () => {
    let last = -1
    for (let i = 0; i <= 20; i++) {
      const p = firmamentPointAt(i / 20)
      expect(p.radius).toBeGreaterThan(last)
      last = p.radius
    }
  })

  it('bleibt im Einheitskreis und klemmt ausserhalb 0..1', () => {
    for (const t of [-1, 0, 0.37, 1, 2]) {
      const p = firmamentPointAt(t)
      expect(Math.hypot(p.nx, p.ny)).toBeLessThanOrEqual(1.0000001)
    }
    expect(firmamentPointAt(-1)).toEqual(firmamentPointAt(0))
    expect(firmamentPointAt(2)).toEqual(firmamentPointAt(1))
  })
})

describe('firmamentFitBox', () => {
  it('nimmt die kleinere Kante und zieht den Rand zweimal ab', () => {
    const box = firmamentFitBox(1000, 600, 30)
    expect(box.cx).toBe(500)
    expect(box.cy).toBe(300)
    expect(box.r).toBe(270)
  })

  it('faellt nie unter 1', () => {
    expect(firmamentFitBox(10, 10, 30).r).toBe(1)
  })
})

describe('buildFirmamentNodes', () => {
  it('haengt die laufende Galaxie und die unbeleuchteten Plaetze an', () => {
    const nodes = buildFirmamentNodes(base([rec(1, 10), rec(2, 20)], 3))
    expect(nodes.map((n) => n.galaxy)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(nodes.map((n) => n.state)).toEqual([
      'freed',
      'freed',
      'current',
      'unlit',
      'unlit',
      'unlit',
      'unlit',
    ])
    expect(nodes.filter((n) => n.state === 'unlit')).toHaveLength(FIRMAMENT_UNLIT_AHEAD)
  })

  it('ordnet nach Galaxienummer, nicht nach Zeitstempel', () => {
    // Ein Admin-Sprung archiviert Galaxie 5 vor Galaxie 3.
    const nodes = buildFirmamentNodes(base([rec(5, 10), rec(3, 99)], 6))
    expect(nodes.slice(0, 2).map((n) => n.galaxy)).toEqual([3, 5])
  })

  it('zaehlt gerettete und verlorene Sterne getrennt', () => {
    const nodes = buildFirmamentNodes(base([rec(4, 10, 4, 2)], 5))
    expect(nodes[0].rescued).toBe(4)
    expect(nodes[0].lost).toBe(2)
    expect(nodes[0].stars).toBe(starsOf(4))
  })

  it('dupliziert die laufende Galaxie nicht, wenn sie schon archiviert ist', () => {
    const nodes = buildFirmamentNodes(base([rec(1, 10), rec(2, 20)], 2))
    expect(nodes.filter((n) => n.galaxy === 2)).toHaveLength(1)
    expect(nodes.find((n) => n.galaxy === 2)?.state).toBe('freed')
  })

  it('traegt auch ohne jede befreite Galaxie', () => {
    const nodes = buildFirmamentNodes(base([], 1))
    expect(nodes[0].state).toBe('current')
    expect(nodes).toHaveLength(1 + FIRMAMENT_UNLIT_AHEAD)
    expect(nodes.every((n) => Number.isFinite(n.nx) && Number.isFinite(n.ny))).toBe(true)
  })

  it('gibt dem unbeleuchteten Knoten keinen Koerperzuschlag je Stern', () => {
    const nodes = buildFirmamentNodes(base([rec(1, 10)], 2))
    const unlit = nodes.filter((n) => n.state === 'unlit')
    expect(new Set(unlit.map((n) => n.bodyR)).size).toBe(1)
    expect(nodes[0].bodyR).toBeGreaterThan(unlit[0].bodyR)
  })
})

describe('buildFirmamentGates', () => {
  const nodes = (): FirmamentNode[] =>
    buildFirmamentNodes(base([rec(1, 100), rec(2, 200), rec(3, 300), rec(4, 400)], 5))

  it('setzt das Tor hinter die letzte Galaxie vor dem Aufbruch', () => {
    const gates = buildFirmamentGates(nodes(), [run(1, 250)])
    expect(gates).toHaveLength(1)
    expect(gates[0].afterIndex).toBe(1)
    expect(gates[0].universe).toBe(1)
  })

  it('setzt mehrere Tore in der Reihenfolge der Laeufe', () => {
    const gates = buildFirmamentGates(nodes(), [run(2, 350), run(1, 150)])
    expect(gates.map((g) => g.universe)).toEqual([1, 2])
    expect(gates.map((g) => g.afterIndex)).toEqual([0, 2])
  })

  it('legt kein zweites Tor auf denselben Platz', () => {
    const gates = buildFirmamentGates(nodes(), [run(1, 150), run(2, 180)])
    expect(gates).toHaveLength(1)
  })

  it('liefert nichts statt zu werfen, wenn das Lauf-Archiv leer ist', () => {
    expect(buildFirmamentGates(nodes(), [])).toEqual([])
  })

  it('liefert nichts, wenn der Lauf vor jeder archivierten Galaxie endete', () => {
    expect(buildFirmamentGates(nodes(), [run(1, 50)])).toEqual([])
  })

  it('setzt das Tor vor die laufende Galaxie, wenn der Aufbruch das Letzte war', () => {
    const gates = buildFirmamentGates(nodes(), [run(1, 9_999_999)])
    expect(gates).toHaveLength(1)
    expect(gates[0].afterIndex).toBe(3)
  })

  it('liefert nichts, wenn kein Knoten einen Datensatz traegt', () => {
    // Frischer Spielstand nach einem Prestige: Laeufe im Archiv, aber die
    // Galaxienkette ist noch leer. Nichts zu verankern, also kein Tor.
    const bare = buildFirmamentNodes(base([], 1))
    expect(buildFirmamentGates(bare, [run(1, 500)])).toEqual([])
  })
})

describe('firmamentGateSignature', () => {
  it('kennt nur Nummer und Platz, keinen Zeitstempel', () => {
    const nodes = buildFirmamentNodes(base([rec(1, 100), rec(2, 200), rec(3, 300)], 4))
    const a = firmamentGateSignature(buildFirmamentGates(nodes, [run(1, 250)]))
    const b = firmamentGateSignature(buildFirmamentGates(nodes, [run(1, 260)]))
    expect(a).toBe(b)
    expect(a).toBe('1@1')
    expect(firmamentGateSignature([])).toBe('-')
  })
})
