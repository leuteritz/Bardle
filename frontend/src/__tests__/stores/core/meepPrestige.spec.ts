import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/stores/core/gameStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { MEEP_RUN_BASE, MEEP_RUN_FACTOR } from '@/config/constants'

/**
 * Meeps sind der Lohn des AUFBRUCHS, nicht des Wartens.
 *
 * Vorher fielen sie einzeln an, sobald genug Chimes aufgelaufen waren, und das
 * Prestige löschte anschliessend Bestand UND Baum — die 25 Knoten wurden also
 * in jedem Universum von vorn gekauft. Jetzt sammelt ein Durchlauf sie an
 * (sichtbar, aber unverfügbar), der Aufbruch zahlt sie aus, und der Baum
 * bleibt stehen.
 *
 * Zwei Dinge sichert diese Datei, weil sie ohne Test stumm brechen würden:
 * dass die Ausbeute mit der WURZEL wächst (und nicht linear — sonst wäre
 * „wann prestige ich?" keine Entscheidung, sondern eine Formalie), und dass
 * das Prestige den Baum in Ruhe lässt.
 */
describe('Meeps als Prestige-Währung', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('ohne Chimes im Durchlauf steht nichts an', () => {
    const game = useGameStore()
    game.chimesForNextUniverse = 0
    expect(game.pendingMeeps).toBe(0)
    expect(game.pendingMeepFill).toBe(0)
  })

  it('wächst mit der Wurzel — vierfache Chimes, doppelte Ausbeute', () => {
    const game = useGameStore()
    // Ein Punkt weit genug oben, dass die Abrundung nicht das Ergebnis trägt.
    const chimes = 100 * MEEP_RUN_BASE
    game.chimesForNextUniverse = chimes
    const single = game.pendingMeeps

    game.chimesForNextUniverse = chimes * 4
    expect(game.pendingMeeps).toBe(single * 2)

    game.chimesForNextUniverse = chimes * 9
    expect(game.pendingMeeps).toBe(single * 3)
  })

  it('folgt der Eichungsformel', () => {
    const game = useGameStore()
    game.chimesForNextUniverse = 25 * MEEP_RUN_BASE
    expect(game.pendingMeeps).toBe(Math.floor(MEEP_RUN_FACTOR * 5))
  })

  it('der Füllstand schliesst genau an die nächste ganze Ausbeute an', () => {
    const game = useGameStore()
    game.chimesForNextUniverse = 40 * MEEP_RUN_BASE
    const before = game.pendingMeeps

    // Exakt die noch fehlenden Chimes nachlegen → eine Ausbeute mehr, Rest ~0.
    game.chimesForNextUniverse += game.chimesToNextMeep
    expect(game.pendingMeeps).toBe(before + 1)
    expect(game.pendingMeepFill).toBeLessThan(0.01)
  })

  it('der Aufbruch zahlt genau die angezeigte Menge aus', () => {
    const game = useGameStore()
    game.chimesForNextUniverse = 64 * MEEP_RUN_BASE
    game.meeps = 7
    const owed = game.pendingMeeps
    expect(owed).toBeGreaterThan(0)

    game.executePrestigeReset(2)

    expect(game.meeps).toBe(7 + owed)
    // Der Laufzähler ist zurückgesetzt, es steht also nichts mehr an.
    expect(game.chimesForNextUniverse).toBe(0)
    expect(game.pendingMeeps).toBe(0)
  })

  it('der Aufbruch lässt den Meep-Baum stehen', () => {
    // Der Grund, warum die Ausbeute überhaupt eine Währung sein kann: würde
    // das Prestige den Baum weiter löschen, wäre jeder ausgezahlte Meep nur
    // die Wiederbeschaffung dessen, was gerade verfallen ist.
    const game = useGameStore()
    const tree = useMeepTreeStore()
    tree.bought = ['vigil_1']
    tree.acknowledged = ['vigil_1']

    game.chimesForNextUniverse = 9 * MEEP_RUN_BASE
    game.executePrestigeReset(3)

    expect(tree.bought).toContain('vigil_1')
    expect(tree.acknowledged).toContain('vigil_1')
  })

  it('ein Fund schreibt sofort gut und zählt auf die Lebensbilanz', () => {
    const game = useGameStore()
    game.meeps = 2
    game.totalMeepsEarned = 2

    game.grantMeeps(3)

    expect(game.meeps).toBe(5)
    expect(game.totalMeepsEarned).toBe(5)
    // Ein Fund ist kein Ertrag des Durchlaufs — er verschiebt die Ausbeute nicht.
    expect(game.pendingMeeps).toBe(0)
  })
})
