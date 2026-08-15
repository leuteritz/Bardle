import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  MEEP_TREE_BRANCHES,
  MEEP_TREE_CATALOG_NODES,
  MEEP_TREE_TIERS_PER_BRANCH,
} from '@/config/progression/meepTree'
import { useGameStore } from '@/stores/core/gameStore'
import {
  MEEP_TREE_TOTAL_COST,
  MEEP_RUN_SHARE,
  MEEP_RUN_FACTOR,
  UNIVERSE_RESCUE_INITIAL_COST,
} from '@/config/constants'

/**
 * Ausbeute und Baumkosten sind EINE Balance, an zwei Stellen aufgeschrieben.
 *
 * Meeps fallen nur beim Aufbruch an, und der Baum überlebt jedes Prestige — er
 * ist damit ihre einzige Senke. Läuft eine der beiden Zahlen davon, merkt das
 * niemand: zu billig heisst, der Baum steht nach einem Viertel der Spielzeit
 * und der Prestige-Lohn hat danach kein Ziel mehr; zu teuer heisst, das
 * Prestige zahlt sichtbar nichts. Diese Datei bindet beide aneinander.
 *
 * Die Ausbeute misst seit dem Umbau gegen den BESTEN abgeschlossenen Lauf. Der
 * Bezugspunkt für die Eichung ist deshalb kein absoluter Chime-Betrag mehr,
 * sondern der Dauerrhythmus: `UNIVERSE_RESCUE_COST_MULTIPLIER` ist 2, wer also
 * jeweils an der Rettungsschwelle aufbricht, liegt dauerhaft bei 2× Bestwert.
 */
describe('Meep-Wirtschaft: Ausbeute gegen Baumkosten', () => {
  /** Der KATALOG — alle Definitionen, auch beide Seiten jeder Gabel. */
  const nodes = MEEP_TREE_BRANCHES.flatMap((b) => b.nodes)

  /** Die Kosten eines Rangs, als Liste — bei einer Gabel zwei Einträge. */
  const costsAtTier = (branch: (typeof MEEP_TREE_BRANCHES)[number], tier: number) =>
    branch.nodes.filter((n) => n.tier === tier).map((n) => n.cost)

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** Was ein Aufbruch im Dauerrhythmus (2× Bestwert) einbringt. */
  const steadyYield = () => {
    const game = useGameStore()
    game.bestUniverseRunChimes = 1e12
    game.chimesForNextUniverse = 2e12
    return game.pendingMeeps
  }

  it('ein vollständiger Pfad ergibt genau die gebuchte Gesamtsumme', () => {
    // Gerechnet wird über einen PFAD, nicht über den Katalog: seit der Gabel
    // auf Rang 4 stehen dort zwei Definitionen für EINEN Schritt, und ein
    // Spielstand kann immer nur eine davon halten. Die Katalogsumme (1508)
    // beschreibt einen Baum, den niemand kaufen kann.
    const sum = MEEP_TREE_BRANCHES.reduce(
      (acc, branch) =>
        acc +
        Array.from({ length: MEEP_TREE_TIERS_PER_BRANCH }, (_, tier) =>
          Math.max(...costsAtTier(branch, tier)),
        ).reduce((a, b) => a + b, 0),
      0,
    )
    expect(sum).toBe(MEEP_TREE_TOTAL_COST)
    // Der Katalog ist größer als der Pfad — sonst gäbe es die Gabel gar nicht.
    expect(MEEP_TREE_CATALOG_NODES).toBeGreaterThan(
      MEEP_TREE_BRANCHES.length * MEEP_TREE_TIERS_PER_BRANCH,
    )
  })

  it('beide Seiten einer Gabel kosten gleich viel', () => {
    // Sonst hinge „was ein voller Baum kostet" davon ab, welche Seite der
    // Spieler nimmt, und MEEP_TREE_TOTAL_COST wäre keine Zahl mehr, sondern
    // eine Spanne. Ausserdem wäre die Wahl dann eine Preisfrage statt einer
    // Spielfrage — genau das, was die Gabel NICHT sein soll.
    for (const branch of MEEP_TREE_BRANCHES) {
      for (let tier = 0; tier < MEEP_TREE_TIERS_PER_BRANCH; tier++) {
        const costs = costsAtTier(branch, tier)
        expect(costs.length).toBeGreaterThan(0)
        expect(new Set(costs).size).toBe(1)
      }
    }
  })

  it('jeder Zweig steigt von Rang zu Rang an', () => {
    // Ein Zweig, dessen dritter Rang billiger ist als der zweite, macht die
    // Reihenfolge der Käufe beliebig — und damit die Entscheidung wertlos.
    // Verglichen wird RANG gegen RANG, nicht Array-Nachbar gegen Nachbar:
    // die beiden Gabelknoten sind Nachbarn im Array und gleichteuer.
    for (const branch of MEEP_TREE_BRANCHES) {
      for (let tier = 1; tier < MEEP_TREE_TIERS_PER_BRANCH; tier++) {
        expect(Math.min(...costsAtTier(branch, tier))).toBeGreaterThan(
          Math.max(...costsAtTier(branch, tier - 1)),
        )
      }
    }
  })

  it('der erste Aufbruch öffnet den Baum sofort', () => {
    // Das erste Universum endet an der Rettungsschwelle, und dort bindet noch
    // der Mindestanker. Wäre der günstigste Knoten teurer als diese Ausbeute,
    // hätte der Spieler für seinen ersten Aufbruch nichts vorzuweisen.
    const game = useGameStore()
    game.chimesForNextUniverse = UNIVERSE_RESCUE_INITIAL_COST
    const cheapest = Math.min(...nodes.map((n) => n.cost))
    expect(game.pendingMeeps).toBeGreaterThanOrEqual(cheapest)
  })

  it('der teuerste Knoten ist ein Ziel, aber erreichbar', () => {
    // Über einem Aufbruch, sonst wäre er ein Mitnahmekauf; unter vier, sonst
    // steht der Zweig für einen halben Spielabend still.
    const steady = steadyYield()
    const priciest = Math.max(...nodes.map((n) => n.cost))
    expect(priciest).toBeGreaterThan(steady)
    expect(priciest).toBeLessThanOrEqual(4 * steady)
  })

  it('der ganze Baum passt in die Zahl der Aufbrüche, die das Spiel hergibt', () => {
    // Rund 26 Aufbrüche ohne den eigenen Rabatt des Baums, rund 22 mit ihm.
    // Deutlich weniger hiesse: fertig zur Halbzeit. Deutlich mehr: nie fertig.
    const departures = MEEP_TREE_TOTAL_COST / steadyYield()
    expect(departures).toBeGreaterThan(20)
    expect(departures).toBeLessThan(32)
  })

  it('die Kosten-Multiplikatoren wirken auf die Ausbeute', () => {
    // Sie hängen an der Meep-Anforderung. Verschwindet ihre Wirkungsstelle,
    // zahlt ein Baumknoten, ein Augment und eine Bard-Fähigkeit stumm auf
    // nichts mehr ein — genau das war nach einem früheren Umbau der Fall.
    const game = useGameStore()
    game.bestUniverseRunChimes = 1e9
    const base = 1e9 * MEEP_RUN_SHARE
    game.chimesForNextUniverse = 100 * base
    expect(game.meepChimeRequirement).toBe(base)
    const plain = game.pendingMeeps
    expect(plain).toBe(Math.floor(MEEP_RUN_FACTOR * 10))

    // Gesenkte Anforderung über die dritte Bard-Fähigkeit. Die Wurzel dämpft
    // die Senkung genauso wie den längeren Lauf: aus halber Anforderung wird
    // das 1,41-Fache an Meeps, nicht das Doppelte.
    game.abilityLevels = [0, 0, 3, 0]
    const req = game.meepChimeRequirement
    expect(req).toBeLessThan(base)
    expect(req).toBeCloseTo(base * game.abilityMeepCostMultiplier, 5)
    expect(game.pendingMeeps).toBe(Math.floor(MEEP_RUN_FACTOR * Math.sqrt((100 * base) / req)))
    expect(game.pendingMeeps).toBeGreaterThan(plain)
  })
})
