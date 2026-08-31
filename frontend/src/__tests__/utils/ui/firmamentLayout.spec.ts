import { describe, it, expect } from 'vitest'
import {
  buildFirmamentPath,
  firmamentFitBox,
  firmamentPointAt,
  type FirmamentInput,
} from '@/utils/ui/firmamentLayout'
import { FIRMAMENT_SPIRAL_R0, FIRMAMENT_UNLIT_AHEAD } from '@/config/constants'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { UniverseRunRecord } from '@/types'

const starsOf = (g: number) => Math.min(3 + (g - 1), 7)

function rec(
  galaxy: number,
  universe: number,
  completedAt = galaxy * 100,
  rescued = 3,
  lost = 0,
): CompletedGalaxyRecord {
  return {
    galaxy,
    mapSeed: 1000 + galaxy,
    themeIndex: galaxy % 20,
    universe,
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

function base(
  completed: CompletedGalaxyRecord[],
  universe: number,
  currentUniverse: number,
  currentGalaxy: number,
  runs: UniverseRunRecord[] = [],
): FirmamentInput {
  return {
    completed,
    runs,
    universe,
    currentUniverse,
    currentGalaxy,
    currentRescued: 1,
    currentLost: 0,
    currentLandfalls: 0,
    currentThemeIndex: 4,
    starsOf,
  }
}

/* Drei Bahnen: U1 traegt G1..G3, U2 traegt G4..G5, U5 ist die laufende mit G6. */
const ARCHIVE = [rec(1, 1), rec(2, 1), rec(3, 1), rec(4, 2), rec(5, 2)]
const RUNS = [run(1, 350), run(2, 550)]

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

describe('buildFirmamentPath — die Bahn eines Universums', () => {
  it('zeigt nur die Galaxien DIESES Universums', () => {
    expect(buildFirmamentPath(base(ARCHIVE, 1, 5, 6, RUNS)).nodes.map((n) => n.galaxy)).toEqual([
      1, 2, 3,
    ])
    expect(buildFirmamentPath(base(ARCHIVE, 2, 5, 6, RUNS)).nodes.map((n) => n.galaxy)).toEqual([
      4, 5,
    ])
  })

  it('legt eine Galaxie auf genau EINE Bahn', () => {
    const seen = new Set<number>()
    for (const u of [1, 2, 5]) {
      for (const n of buildFirmamentPath(base(ARCHIVE, u, 5, 6, RUNS)).nodes) {
        if (n.state !== 'freed') continue
        expect(seen.has(n.galaxy), `Galaxie ${n.galaxy} zweimal`).toBe(false)
        seen.add(n.galaxy)
      }
    }
    expect(seen.size).toBe(ARCHIVE.length)
  })

  /* Die Forderung, wegen der der Umbau stattfand: jede Bahn faengt bei Start an,
     nicht dort, wo die vorige aufhoerte. */
  it('beginnt JEDE Bahn im Kern', () => {
    for (const u of [1, 2, 5]) {
      const first = buildFirmamentPath(base(ARCHIVE, u, 5, 6, RUNS)).nodes[0]
      expect(first.radius).toBeCloseTo(FIRMAMENT_SPIRAL_R0, 10)
      expect(first.nx).toBeCloseTo(0, 10)
      expect(first.ny).toBeCloseTo(-FIRMAMENT_SPIRAL_R0, 10)
    }
  })

  it('haengt laufende Galaxie und Vorausplaetze nur an die EIGENE Bahn', () => {
    const here = buildFirmamentPath(base(ARCHIVE, 5, 5, 6, RUNS)).nodes
    expect(here.map((n) => n.state)).toEqual(['current', 'unlit', 'unlit', 'unlit', 'unlit'])
    expect(here).toHaveLength(1 + FIRMAMENT_UNLIT_AHEAD)

    // Eine vergangene Bahn endet, wo sie endete — dort gibt es kein „davor".
    const past = buildFirmamentPath(base(ARCHIVE, 1, 5, 6, RUNS)).nodes
    expect(past.every((n) => n.state === 'freed')).toBe(true)
  })

  it('dupliziert die laufende Galaxie nicht, wenn sie schon archiviert ist', () => {
    const archive = [...ARCHIVE, rec(6, 5)]
    const nodes = buildFirmamentPath(base(archive, 5, 5, 6, RUNS)).nodes
    expect(nodes.filter((n) => n.galaxy === 6)).toHaveLength(1)
    expect(nodes[0].state).toBe('freed')
  })

  it('ordnet nach Galaxienummer, nicht nach Zeitstempel', () => {
    const archive = [rec(9, 1, 10), rec(2, 1, 999), rec(5, 1, 500)]
    expect(buildFirmamentPath(base(archive, 1, 5, 20)).nodes.map((n) => n.galaxy)).toEqual([
      2, 5, 9,
    ])
  })

  it('zaehlt gerettete und verlorene Sterne getrennt', () => {
    const nodes = buildFirmamentPath(base([rec(1, 1, 100, 4, 2)], 1, 5, 20)).nodes
    expect(nodes[0].rescued).toBe(4)
    expect(nodes[0].lost).toBe(2)
    expect(nodes[0].landfalls).toBe(1)
  })

  it('traegt eine Bahn ohne jede Galaxie, statt zu werfen', () => {
    const path = buildFirmamentPath(base(ARCHIVE, 7, 5, 6, RUNS))
    expect(path.nodes).toEqual([])
    expect(path.departure).toBeNull()
  })

  it('gibt dem unbeleuchteten Knoten keinen Koerperzuschlag je Stern', () => {
    const nodes = buildFirmamentPath(base(ARCHIVE, 5, 5, 6, RUNS)).nodes
    const unlit = nodes.filter((n) => n.state === 'unlit')
    expect(new Set(unlit.map((n) => n.bodyR)).size).toBe(1)
  })
})

describe('buildFirmamentPath — der gemeinsame Massstab', () => {
  /* Alle Bahnen rechnen gegen DENSELBEN Nenner. Ohne ihn saehe ein Universum mit
     zwei Galaxien aus wie eines mit dreissig. */
  it('laesst die kuerzere Bahn frueher enden als die laengere', () => {
    const long = buildFirmamentPath(base(ARCHIVE, 1, 5, 6, RUNS)).nodes
    const short = buildFirmamentPath(base(ARCHIVE, 2, 5, 6, RUNS)).nodes
    expect(short[short.length - 1].radius).toBeLessThan(long[long.length - 1].radius)
  })

  it('haelt den Knotenabstand ueber einen Universumswechsel hinweg gleich', () => {
    const a = buildFirmamentPath(base(ARCHIVE, 1, 5, 6, RUNS)).nodes
    const b = buildFirmamentPath(base(ARCHIVE, 2, 5, 6, RUNS)).nodes
    const step = (n: (typeof a)[number], m: (typeof a)[number]) =>
      Math.hypot(n.nx - m.nx, n.ny - m.ny)
    expect(step(a[0], a[1])).toBeCloseTo(step(b[0], b[1]), 10)
  })

  it('waechst der Nenner mit der laengsten Bahn, nicht mit der gezeigten', () => {
    const wide = [...ARCHIVE, ...Array.from({ length: 20 }, (_, i) => rec(10 + i, 2))]
    const before = buildFirmamentPath(base(ARCHIVE, 1, 5, 6, RUNS)).nodes
    const after = buildFirmamentPath(base(wide, 1, 5, 6, RUNS)).nodes
    // Dieselben drei Knoten, aber enger — weil Universum 2 laenger geworden ist.
    expect(after[2].radius).toBeLessThan(before[2].radius)
  })
})

describe('buildFirmamentPath — das Tor am Bahnende', () => {
  it('gibt einer vergangenen Bahn genau ein Tor, der eigenen keins', () => {
    expect(buildFirmamentPath(base(ARCHIVE, 1, 5, 6, RUNS)).departure).not.toBeNull()
    expect(buildFirmamentPath(base(ARCHIVE, 5, 5, 6, RUNS)).departure).toBeNull()
  })

  it('zeigt auf das Universum des naechsten Laufs', () => {
    expect(buildFirmamentPath(base(ARCHIVE, 1, 5, 6, RUNS)).departure?.toUniverse).toBe(2)
  })

  it('zeigt hinter dem letzten Lauf auf das laufende Universum', () => {
    expect(buildFirmamentPath(base(ARCHIVE, 2, 5, 6, RUNS)).departure?.toUniverse).toBe(5)
  })

  /* Das Tor traegt KEINE Lage mehr: der Ausgang steht als Portal im schwarzen
     Raum ausserhalb der Scheibe, und wo genau, rechnet `firmamentPortalSpot`
     aus den Buehnenmassen. Diese Datei sagt nur, DASS es eines gibt. */
  it('nimmt der Bahn keinen Spiralplatz weg', () => {
    const withGate = buildFirmamentPath(base(ARCHIVE, 1, 5, 6, RUNS))
    const withoutGate = buildFirmamentPath(base(ARCHIVE, 1, 5, 6, []))
    expect(withGate.departure).not.toBeNull()
    expect(withoutGate.departure).toBeNull()
    // Dieselben Knoten an denselben Stellen — das Portal steht nicht auf der Bahn.
    expect(withGate.nodes).toEqual(withoutGate.nodes)
  })

  /* Ein Universum kann mehrfach besucht werden — die Bahn traegt alle Besuche,
     das Tor nennt den letzten. */
  it('faltet mehrere Besuche zu EINER Bahn mit einem Zaehler', () => {
    const runs = [run(1, 350), run(2, 550), run(1, 900)]
    const archive = [...ARCHIVE, rec(7, 1, 800)]
    const path = buildFirmamentPath(base(archive, 1, 5, 9, runs))

    expect(path.nodes.map((n) => n.galaxy)).toEqual([1, 2, 3, 7])
    expect(path.departure?.visits).toBe(2)
    expect(path.departure?.run.completedAt).toBe(900)
    expect(path.departure?.toUniverse).toBe(5)
  })

  it('erfindet kein Tor, wenn der Lauf aus dem Archiv geschoben wurde', () => {
    expect(buildFirmamentPath(base(ARCHIVE, 1, 5, 6, [])).departure).toBeNull()
  })

  it('faellt ohne Feld auf das erste Universum zurueck, statt zu verschwinden', () => {
    const legacy = [{ ...rec(1, 1), universe: undefined }]
    expect(buildFirmamentPath(base(legacy, 1, 5, 6)).nodes).toHaveLength(1)
  })
})
