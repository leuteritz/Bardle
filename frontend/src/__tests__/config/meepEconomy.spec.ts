import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { MEEP_TREE_BRANCHES } from '@/config/progression/meepTree'
import { useGameStore } from '@/stores/core/gameStore'
import { MEEP_TREE_TOTAL_COST, MEEP_RUN_BASE, MEEP_RUN_FACTOR } from '@/config/constants'

/**
 * Ausbeute und Baumkosten sind EINE Balance, an zwei Stellen aufgeschrieben.
 *
 * Meeps fallen nur beim Aufbruch an, und der Baum überlebt jedes Prestige — er
 * ist damit ihre einzige Senke. Läuft eine der beiden Zahlen davon, merkt das
 * niemand: zu billig heisst, der Baum steht nach einem Viertel der Spielzeit
 * und der Prestige-Lohn hat danach kein Ziel mehr (gemessen genau so passiert,
 * 894 gegen 4482 Ertrag); zu teuer heisst, das Prestige zahlt sichtbar nichts.
 * Diese Datei bindet beide aneinander.
 */
describe('Meep-Wirtschaft: Ausbeute gegen Baumkosten', () => {
  const nodes = MEEP_TREE_BRANCHES.flatMap((b) => b.nodes)

  it('der Katalog ergibt genau die gebuchte Gesamtsumme', () => {
    const sum = nodes.reduce((acc, n) => acc + n.cost, 0)
    expect(sum).toBe(MEEP_TREE_TOTAL_COST)
  })

  it('jeder Zweig steigt in seinen Stufen an', () => {
    // Ein Zweig, dessen dritte Stufe billiger ist als die zweite, macht die
    // Reihenfolge der Käufe beliebig — und damit die Entscheidung wertlos.
    for (const branch of MEEP_TREE_BRANCHES) {
      const costs = branch.nodes.map((n) => n.cost)
      for (let i = 1; i < costs.length; i++) {
        expect(costs[i]).toBeGreaterThan(costs[i - 1])
      }
    }
  })

  it('der erste Knoten ist mit EINEM Aufbruch bezahlt', () => {
    // Der erste Durchlauf des Referenzlaufs endete bei rund 1e11 Chimes. Wäre
    // der günstigste Knoten teurer als dessen Ausbeute, bliebe der Baum beim
    // zweiten Universum immer noch leer — und der Spieler hätte für seinen
    // ersten Aufbruch nichts vorzuweisen.
    setActivePinia(createPinia())
    const game = useGameStore()
    game.chimesForNextUniverse = 1e11
    const cheapest = Math.min(...nodes.map((n) => n.cost))
    expect(game.pendingMeeps).toBeGreaterThanOrEqual(cheapest)
  })

  it('der teuerste Knoten bleibt unter dem, was zwei späte Aufbrüche bringen', () => {
    setActivePinia(createPinia())
    const game = useGameStore()
    // Ein später Durchlauf im Referenzlauf: ~1e16 Laufchimes.
    game.chimesForNextUniverse = 1e16
    const priciest = Math.max(...nodes.map((n) => n.cost))
    expect(priciest).toBeLessThanOrEqual(2 * game.pendingMeeps)
  })

  it('die Kosten-Multiplikatoren wirken auf die Ausbeute', () => {
    // Sie hingen an der alten Meep-Schwelle. Verschwindet ihre Wirkungsstelle,
    // zahlt ein Baumknoten, ein Augment und eine Bard-Fähigkeit stumm auf
    // nichts mehr ein — genau das war nach dem Umbau kurzzeitig der Fall.
    setActivePinia(createPinia())
    const game = useGameStore()
    game.chimesForNextUniverse = 100 * MEEP_RUN_BASE
    expect(game.meepChimeRequirement).toBe(MEEP_RUN_BASE)
    const plain = game.pendingMeeps
    expect(plain).toBe(Math.floor(MEEP_RUN_FACTOR * 10))

    // Gesenkte Anforderung über die dritte Bard-Fähigkeit. Die Wurzel dämpft
    // die Senkung genauso wie den längeren Lauf: aus halber Anforderung wird
    // das 1,41-Fache an Meeps, nicht das Doppelte.
    game.abilityLevels = [0, 0, 3, 0]
    const req = game.meepChimeRequirement
    expect(req).toBeLessThan(MEEP_RUN_BASE)
    expect(req).toBeCloseTo(MEEP_RUN_BASE * game.abilityMeepCostMultiplier, 5)
    expect(game.pendingMeeps).toBe(
      Math.floor(MEEP_RUN_FACTOR * Math.sqrt((100 * MEEP_RUN_BASE) / req)),
    )
    expect(game.pendingMeeps).toBeGreaterThan(plain)
  })
})
