import { describe, it, expect } from 'vitest'
import {
  buildUniversePath,
  universeChordHitsStart,
  universeFitBox,
  universeInStartField,
  universeRoadCtrl,
  universeSpots,
  type UniverseInput,
} from '@/utils/ui/universeLayout'
import {
  UNIVERSE_MAP_PATH_MIN_SPAN,
  UNIVERSE_MAP_PATH_R0,
  UNIVERSE_MAP_PATH_R1,
  UNIVERSE_MAP_PATH_RADIUS_EXP,
  UNIVERSE_MAP_PLATE_SPRITE_MARGIN,
  UNIVERSE_MAP_SCATTER_MIN_SEP,
  UNIVERSE_MAP_SCATTER_T_WOBBLE,
  UNIVERSE_MAP_UNLIT_AHEAD,
} from '@/config/constants'
import { universes } from '@/config/progression/universes'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'
import type { UniverseRunRecord } from '@/types'

/** Die Streuung gehoert dem Universum — jede Aussage ueber Plaetze wird deshalb
 *  ueber ALLE Bahnen genommen, nicht ueber eine. */
const UNIVERSE_IDS = universes.map((u) => u.id)

/*
 * Gesammelt statt einzeln geprueft. Die zwei Bahnpruefungen unten laufen ueber
 * 10 Universen x Spannen 8..120 x Knoten; als `expect()` je Knoten waren das
 * 361.600 Aufrufe samt vorab gebauter Meldung — gemessen 2495 und 1059 ms, im
 * vollen Lauf der 5000-ms-Timeout, isoliert gruen. Gesammelt sind es 311 und
 * 276 ms. Geprueft wird unveraendert jede Bedingung an jedem Knoten.
 */
const REPORT_MAX = 8
const report = (rows: string[]) =>
  rows.length <= REPORT_MAX
    ? rows.join('\n')
    : [...rows.slice(0, REPORT_MAX), `… und ${rows.length - REPORT_MAX} weitere`].join('\n')

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
): UniverseInput {
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

describe('universeSpots — die Streuung', () => {
  it('waechst monoton nach aussen', () => {
    for (const u of UNIVERSE_IDS) {
      for (const span of [8, 20, 40]) {
        let last = -1
        for (const p of universeSpots(span, u)) {
          expect(p.radius, `U${u} span ${span}`).toBeGreaterThan(last)
          last = p.radius
        }
      }
    }
  })

  it('bleibt im Einheitskreis', () => {
    for (const u of UNIVERSE_IDS) {
      for (const span of [8, 20, 40, 120]) {
        for (const p of universeSpots(span, u)) {
          expect(Math.hypot(p.nx, p.ny), `U${u} span ${span}`).toBeLessThanOrEqual(1.0000001)
        }
      }
    }
  })

  /* Die Karte ist ein Standbild: derselbe Wurf muss dieselben Plaetze liefern,
     sonst floete sie beim Repaint. */
  it('liefert bei gleicher Spanne und Bahn bitgleiche Plaetze', () => {
    expect(universeSpots(23, 5)).toEqual(universeSpots(23, 5))
  })

  /* Die Forderung, wegen der DIESER Umbau stattfand: wer sich durch die
     Universumsleiste klickt, sah zehnmal dasselbe Sternbild — nur
     unterschiedlich lang. Gebunden wird, dass jedes Paar Bahnen mindestens
     einen Knoten weiter auseinander traegt als den Mindestabstand selbst. */
  it('gibt jedem Universum ein eigenes Sternbild', () => {
    for (const span of [8, 12, 20, 40]) {
      for (let a = 0; a < UNIVERSE_IDS.length; a++) {
        for (let b = a + 1; b < UNIVERSE_IDS.length; b++) {
          const pa = universeSpots(span, UNIVERSE_IDS[a])
          const pb = universeSpots(span, UNIVERSE_IDS[b])
          let far = 0
          for (let i = 0; i < span; i++) {
            far = Math.max(far, Math.hypot(pa[i].nx - pb[i].nx, pa[i].ny - pb[i].ny))
          }
          expect(
            far,
            `span ${span}, U${UNIVERSE_IDS[a]} gegen U${UNIVERSE_IDS[b]}`,
          ).toBeGreaterThan(UNIVERSE_MAP_SCATTER_MIN_SEP)
        }
      }
    }
  })

  /* Die Forderung, wegen der der Umbau DAVOR stattfand. Bei einem festen
     Winkelschritt ist die Streuung null — die alte Spirale faellt hier durch.
     Dieselbe Ablesung, mit der `portalSprite.spec.ts` das Zifferblatt
     ausschliesst. */
  it('wuerfelt den Winkelschritt, statt ihn zu zaehlen', () => {
    for (const u of UNIVERSE_IDS) {
      for (const span of [12, 20, 40]) {
        const spots = universeSpots(span, u)
        const gaps = spots.slice(1).map((p, i) => Math.abs(p.angle - spots[i].angle))
        const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
        const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length)
        expect(sd / mean, `U${u} span ${span}`).toBeGreaterThan(0.25)
      }
    }
  })

  /* Unter der Mitte steht das START-Label. Gebunden wird der GEMALTE Bogen:
     gegen die gerade Sehne geprueft blieben 229 Kurvenpunkte in 24 Spannen im
     Feld stehen, darunter die Alltagsspannen 11 und 19. Eine quadratische
     Bezier liegt in der Huelle ihrer drei Punkte. */
  it('haelt das Feld des START-Labels frei — Knoten UND Boegen', () => {
    const offenders: string[] = []
    for (const u of UNIVERSE_IDS) {
      for (let span = UNIVERSE_MAP_PATH_MIN_SPAN; span <= 120; span++) {
        let prev = { nx: 0, ny: 0 }
        universeSpots(span, u).forEach((p, i) => {
          if (universeInStartField(p.nx, p.ny)) offenders.push(`U${u} span ${span} Knoten ${i}`)
          const c = universeRoadCtrl(prev.nx, prev.ny, p.nx, p.ny, i)
          for (const [ax, ay, bx, by] of [
            [prev.nx, prev.ny, c.x, c.y],
            [c.x, c.y, p.nx, p.ny],
            [prev.nx, prev.ny, p.nx, p.ny],
          ]) {
            if (universeChordHitsStart(ax, ay, bx, by)) {
              offenders.push(`U${u} span ${span} Bogen ${i}`)
            }
          }
          prev = p
        })
      }
    }
    expect(offenders, report(offenders)).toEqual([])
  })

  /* Der Kontrollpunkt liegt weiter aussen als die Sehne — gebunden gegen die
     Sprite-Kante, sonst wandert ein abgeschnittener Rand durchs Bild. */
  it('haelt den Kontrollpunkt innerhalb der Sprite-Kante', () => {
    const offenders: string[] = []
    for (const u of UNIVERSE_IDS) {
      for (let span = UNIVERSE_MAP_PATH_MIN_SPAN; span <= 120; span++) {
        let prev = { nx: 0, ny: 0 }
        universeSpots(span, u).forEach((p, i) => {
          const c = universeRoadCtrl(prev.nx, prev.ny, p.nx, p.ny, i)
          const reach = Math.hypot(c.x, c.y)
          // Negiert, nicht `>=`: fuer NaN waere das false und der Verstoss fiele
          // durch — `toBeLessThan` liess ihn nicht durch.
          if (!(reach < UNIVERSE_MAP_PLATE_SPRITE_MARGIN)) {
            offenders.push(`U${u} span ${span} Platz ${i}: ${reach.toFixed(4)}`)
          }
          prev = p
        })
      }
    }
    expect(offenders, report(offenders)).toEqual([])
  })
})

describe('universeFitBox', () => {
  it('nimmt die kleinere Kante und zieht den Rand zweimal ab', () => {
    const box = universeFitBox(1000, 600, 30)
    expect(box.cx).toBe(500)
    expect(box.cy).toBe(300)
    expect(box.r).toBe(270)
  })

  it('faellt nie unter 1', () => {
    expect(universeFitBox(10, 10, 30).r).toBe(1)
  })
})

describe('buildUniversePath — die Bahn eines Universums', () => {
  it('zeigt nur die Galaxien DIESES Universums', () => {
    expect(buildUniversePath(base(ARCHIVE, 1, 5, 6, RUNS)).nodes.map((n) => n.galaxy)).toEqual([
      1, 2, 3,
    ])
    expect(buildUniversePath(base(ARCHIVE, 2, 5, 6, RUNS)).nodes.map((n) => n.galaxy)).toEqual([
      4, 5,
    ])
  })

  it('legt eine Galaxie auf genau EINE Bahn', () => {
    const seen = new Set<number>()
    for (const u of [1, 2, 5]) {
      for (const n of buildUniversePath(base(ARCHIVE, u, 5, 6, RUNS)).nodes) {
        if (n.state !== 'freed') continue
        expect(seen.has(n.galaxy), `Galaxie ${n.galaxy} zweimal`).toBe(false)
        seen.add(n.galaxy)
      }
    }
    expect(seen.size).toBe(ARCHIVE.length)
  })

  /* Die Forderung, wegen der der Umbau stattfand: jede Bahn faengt bei Start an,
     nicht dort, wo die vorige aufhoerte. Der ABSTAND steht fest — die RICHTUNG
     gehoert dem Universum, nur nicht nach unten, dort steht das Wort START. */
  it('beginnt JEDE Bahn im Kern', () => {
    for (const u of [1, 2, 5]) {
      const first = buildUniversePath(base(ARCHIVE, u, 5, 6, RUNS)).nodes[0]
      expect(first.radius).toBeCloseTo(UNIVERSE_MAP_PATH_R0, 10)
      expect(Math.hypot(first.nx, first.ny)).toBeCloseTo(UNIVERSE_MAP_PATH_R0, 10)
      expect(universeInStartField(first.nx, first.ny)).toBe(false)
      // Die Platte zieht das erste Stueck GERADE, von der Mitte zum Knoten.
      expect(universeChordHitsStart(0, 0, first.nx, first.ny)).toBe(false)
    }
  })

  it('gibt dem ersten Platz je Universum eine andere Himmelsrichtung', () => {
    const dirs = new Set(
      UNIVERSE_IDS.map((u) => Math.round((universeSpots(8, u)[0].angle * 180) / Math.PI)),
    )
    expect(dirs.size).toBeGreaterThanOrEqual(3)
  })

  it('haengt laufende Galaxie und Vorausplaetze nur an die EIGENE Bahn', () => {
    const here = buildUniversePath(base(ARCHIVE, 5, 5, 6, RUNS)).nodes
    expect(here.map((n) => n.state)).toEqual(['current', 'unlit', 'unlit', 'unlit', 'unlit'])
    expect(here).toHaveLength(1 + UNIVERSE_MAP_UNLIT_AHEAD)

    // Eine vergangene Bahn endet, wo sie endete — dort gibt es kein „davor".
    const past = buildUniversePath(base(ARCHIVE, 1, 5, 6, RUNS)).nodes
    expect(past.every((n) => n.state === 'freed')).toBe(true)
  })

  it('dupliziert die laufende Galaxie nicht, wenn sie schon archiviert ist', () => {
    const archive = [...ARCHIVE, rec(6, 5)]
    const nodes = buildUniversePath(base(archive, 5, 5, 6, RUNS)).nodes
    expect(nodes.filter((n) => n.galaxy === 6)).toHaveLength(1)
    expect(nodes[0].state).toBe('freed')
  })

  it('ordnet nach Galaxienummer, nicht nach Zeitstempel', () => {
    const archive = [rec(9, 1, 10), rec(2, 1, 999), rec(5, 1, 500)]
    expect(buildUniversePath(base(archive, 1, 5, 20)).nodes.map((n) => n.galaxy)).toEqual([
      2, 5, 9,
    ])
  })

  it('zaehlt gerettete und verlorene Sterne getrennt', () => {
    const nodes = buildUniversePath(base([rec(1, 1, 100, 4, 2)], 1, 5, 20)).nodes
    expect(nodes[0].rescued).toBe(4)
    expect(nodes[0].lost).toBe(2)
    expect(nodes[0].landfalls).toBe(1)
  })

  it('traegt eine Bahn ohne jede Galaxie, statt zu werfen', () => {
    const path = buildUniversePath(base(ARCHIVE, 7, 5, 6, RUNS))
    expect(path.nodes).toEqual([])
    expect(path.departure).toBeNull()
  })

  it('gibt dem unbeleuchteten Knoten keinen Koerperzuschlag je Stern', () => {
    const nodes = buildUniversePath(base(ARCHIVE, 5, 5, 6, RUNS)).nodes
    const unlit = nodes.filter((n) => n.state === 'unlit')
    expect(new Set(unlit.map((n) => n.bodyR)).size).toBe(1)
  })
})

describe('buildUniversePath — der gemeinsame Massstab', () => {
  /* Alle Bahnen rechnen gegen DENSELBEN Nenner. Ohne ihn saehe ein Universum mit
     zwei Galaxien aus wie eines mit dreissig. */
  it('laesst die kuerzere Bahn frueher enden als die laengere', () => {
    const long = buildUniversePath(base(ARCHIVE, 1, 5, 6, RUNS)).nodes
    const short = buildUniversePath(base(ARCHIVE, 2, 5, 6, RUNS)).nodes
    expect(short[short.length - 1].radius).toBeLessThan(long[long.length - 1].radius)
  })

  /* Was ueber einen Universumswechsel hinweg gleich bleibt, ist seit der
     eigenen Streuung je Bahn nicht mehr der KNOTENABSTAND, sondern die
     RADIUSLEITER: dasselbe Band je Index, aus demselben Nenner. Hier stand
     einmal `step(a[0],a[1]) == step(b[0],b[1])` — das nagelte die Fassung fest,
     in der zehn Universen dasselbe Sternbild trugen. */
  it('haelt die Radiusleiter ueber einen Universumswechsel hinweg gleich', () => {
    const span = UNIVERSE_MAP_PATH_MIN_SPAN
    const rOf = (t: number) =>
      UNIVERSE_MAP_PATH_R0 +
      (UNIVERSE_MAP_PATH_R1 - UNIVERSE_MAP_PATH_R0) *
        Math.pow(Math.min(1, Math.max(0, t / (span - 1))), UNIVERSE_MAP_PATH_RADIUS_EXP)

    for (const u of UNIVERSE_IDS) {
      universeSpots(span, u).forEach((p, i) => {
        const lo = rOf(i === 0 ? 0 : i - UNIVERSE_MAP_SCATTER_T_WOBBLE)
        const hi = rOf(i === 0 ? 0 : i + UNIVERSE_MAP_SCATTER_T_WOBBLE)
        expect(p.radius, `U${u} Platz ${i} unter dem Band`).toBeGreaterThanOrEqual(lo - 1e-12)
        expect(p.radius, `U${u} Platz ${i} ueber dem Band`).toBeLessThanOrEqual(hi + 1e-12)
      })
    }
  })

  /* Und die Baender ueberlappen nicht: kein Platz `i` einer Bahn liegt weiter
     aussen als Platz `i + 1` einer anderen. Das ist „wer weiter kam, kommt
     weiter nach aussen" — die Aussage, die zwei Bahnen vergleichbar haelt. */
  it('laesst die Baender zweier Bahnen nicht ineinanderrutschen', () => {
    const span = UNIVERSE_MAP_PATH_MIN_SPAN
    const all = UNIVERSE_IDS.map((u) => universeSpots(span, u))
    for (let i = 0; i + 1 < span; i++) {
      const outerHere = Math.max(...all.map((p) => p[i].radius))
      const innerNext = Math.min(...all.map((p) => p[i + 1].radius))
      expect(outerHere, `Platz ${i} gegen ${i + 1}`).toBeLessThan(innerNext)
    }
  })

  it('waechst der Nenner mit der laengsten Bahn, nicht mit der gezeigten', () => {
    const wide = [...ARCHIVE, ...Array.from({ length: 20 }, (_, i) => rec(10 + i, 2))]
    const before = buildUniversePath(base(ARCHIVE, 1, 5, 6, RUNS)).nodes
    const after = buildUniversePath(base(wide, 1, 5, 6, RUNS)).nodes
    // Dieselben drei Knoten, aber enger — weil Universum 2 laenger geworden ist.
    expect(after[2].radius).toBeLessThan(before[2].radius)
  })
})

describe('buildUniversePath — das Tor am Bahnende', () => {
  it('gibt einer vergangenen Bahn genau ein Tor, der eigenen keins', () => {
    expect(buildUniversePath(base(ARCHIVE, 1, 5, 6, RUNS)).departure).not.toBeNull()
    expect(buildUniversePath(base(ARCHIVE, 5, 5, 6, RUNS)).departure).toBeNull()
  })

  it('zeigt auf das Universum des naechsten Laufs', () => {
    expect(buildUniversePath(base(ARCHIVE, 1, 5, 6, RUNS)).departure?.toUniverse).toBe(2)
  })

  it('zeigt hinter dem letzten Lauf auf das laufende Universum', () => {
    expect(buildUniversePath(base(ARCHIVE, 2, 5, 6, RUNS)).departure?.toUniverse).toBe(5)
  })

  /* Das Tor traegt KEINE Lage mehr: der Ausgang steht als Portal im schwarzen
     Raum ausserhalb der Scheibe, und wo genau, rechnet `universePortalSpot`
     aus den Buehnenmassen. Diese Datei sagt nur, DASS es eines gibt. */
  it('nimmt der Bahn keinen Platz weg', () => {
    const withGate = buildUniversePath(base(ARCHIVE, 1, 5, 6, RUNS))
    const withoutGate = buildUniversePath(base(ARCHIVE, 1, 5, 6, []))
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
    const path = buildUniversePath(base(archive, 1, 5, 9, runs))

    expect(path.nodes.map((n) => n.galaxy)).toEqual([1, 2, 3, 7])
    expect(path.departure?.visits).toBe(2)
    expect(path.departure?.run.completedAt).toBe(900)
    expect(path.departure?.toUniverse).toBe(5)
  })

  it('erfindet kein Tor, wenn der Lauf aus dem Archiv geschoben wurde', () => {
    expect(buildUniversePath(base(ARCHIVE, 1, 5, 6, [])).departure).toBeNull()
  })

  it('faellt ohne Feld auf das erste Universum zurueck, statt zu verschwinden', () => {
    const legacy = [{ ...rec(1, 1), universe: undefined }]
    expect(buildUniversePath(base(legacy, 1, 5, 6)).nodes).toHaveLength(1)
  })
})
