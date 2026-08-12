import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/stores/core/gameStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { MEEP_RUN_BASE_MIN, MEEP_RUN_SHARE, MEEP_RUN_FACTOR } from '@/config/constants'

/**
 * Meeps sind der Lohn des AUFBRUCHS, nicht des Wartens.
 *
 * Vorher fielen sie einzeln an, sobald genug Chimes aufgelaufen waren, und das
 * Prestige löschte anschliessend Bestand UND Baum — die 25 Knoten wurden also
 * in jedem Universum von vorn gekauft. Jetzt sammelt ein Durchlauf sie an
 * (sichtbar, aber unverfügbar), der Aufbruch zahlt sie aus, und der Baum
 * bleibt stehen.
 *
 * Die Bezugsgröße ist der BESTE abgeschlossene Lauf (`bestUniverseRunChimes`),
 * nicht mehr eine feste Zahl. Diese Datei sichert, was daran stumm brechen
 * würde: die Wurzel, die Eichung der beiden Anker, die Monotonie der Ratsche,
 * die Reihenfolge beim Aufbruch — und den Void-Frass, der als einziger
 * `pendingMeeps` sinken lassen darf.
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

  it('der erste Meep kostet im frischen Spielstand genau 100 Chimes', () => {
    // Die Zahl, an der die ganze Umstellung hängt: mit der alten festen Basis
    // stand hier 390_625_000, und die Passiv-Kachel rührte sich über Millionen
    // Klicks nicht.
    const game = useGameStore()
    expect(game.bestUniverseRunChimes).toBe(0)
    expect(game.chimesToNextMeep).toBe(100)
  })

  it('Meep k kostet im ersten Lauf k² × 100 Chimes', () => {
    const game = useGameStore()
    for (const k of [1, 2, 3, 5, 8, 20]) {
      game.chimesForNextUniverse = k * k * 100
      expect(game.pendingMeeps).toBe(k)
    }
  })

  it('wächst mit der Wurzel — vierfache Chimes, doppelte Ausbeute', () => {
    const game = useGameStore()
    game.bestUniverseRunChimes = 1e9
    // Ein Punkt weit genug oben, dass die Abrundung nicht das Ergebnis trägt.
    const chimes = 100 * game.meepChimeRequirement
    game.chimesForNextUniverse = chimes
    const single = game.pendingMeeps

    game.chimesForNextUniverse = chimes * 4
    expect(game.pendingMeeps).toBe(single * 2)

    game.chimesForNextUniverse = chimes * 9
    expect(game.pendingMeeps).toBe(single * 3)
  })

  it('ein Lauf auf Bestniveau zahlt dasselbe — in JEDER Größenordnung', () => {
    // Die eigentliche Systemaussage: die Ausbeute hängt nur am VERHÄLTNIS
    // `Laufchimes / Bestlauf`, nicht mehr an der absoluten Größe der Zahlen.
    // Eine Inflation der Wirtschaft kann sie damit nicht verschieben.
    const game = useGameStore()
    const expected = Math.floor(MEEP_RUN_FACTOR / Math.sqrt(MEEP_RUN_SHARE))
    for (const scale of [1e6, 1e9, 1e15]) {
      game.bestUniverseRunChimes = scale
      game.chimesForNextUniverse = scale
      expect(game.pendingMeeps).toBe(expected)
    }
  })

  it('Mindestanker und Anteil greifen genau dort ineinander, wo sie sollen', () => {
    // Der Mindestwert bindet, bis der beste Lauf MEEP_RUN_BASE_MIN /
    // MEEP_RUN_SHARE übersteigt — und das ist die Rettungsschwelle des ersten
    // Universums. Läuft eine der beiden Zahlen weg, klafft dort eine Stufe.
    const game = useGameStore()
    const crossover = MEEP_RUN_BASE_MIN / MEEP_RUN_SHARE

    game.bestUniverseRunChimes = crossover * 0.5
    expect(game.meepChimeRequirement).toBe(MEEP_RUN_BASE_MIN)

    game.bestUniverseRunChimes = crossover * 2
    expect(game.meepChimeRequirement).toBe(crossover * 2 * MEEP_RUN_SHARE)
  })

  it('die Anforderung steht still, solange der Lauf läuft', () => {
    // Sie hängt allein an `bestUniverseRunChimes`, und der steigt nur beim
    // Aufbruch. Ohne diese Eigenschaft könnte `pendingMeeps` mitten im Lauf
    // fallen — und ein Rückgang dort heisst seit dem Void „gefressen".
    const game = useGameStore()
    game.bestUniverseRunChimes = 1e9
    const before = game.meepChimeRequirement

    game.chimesForNextUniverse += 5e9
    game.chimes += 1e9
    game.totalChimesEarned += 1e9

    expect(game.meepChimeRequirement).toBe(before)
  })

  it('der Füllstand schliesst genau an die nächste ganze Ausbeute an', () => {
    const game = useGameStore()
    game.bestUniverseRunChimes = 1e9
    game.chimesForNextUniverse = 40 * game.meepChimeRequirement
    const before = game.pendingMeeps

    // Exakt die noch fehlenden Chimes nachlegen → eine Ausbeute mehr, Rest ~0.
    game.chimesForNextUniverse += game.chimesToNextMeep
    expect(game.pendingMeeps).toBe(before + 1)
    expect(game.pendingMeepFill).toBeLessThan(0.01)
  })

  it('der Aufbruch zahlt genau die angezeigte Menge — die Ratsche greift erst danach', () => {
    // Die Regression, an der die Reihenfolge in `executePrestigeReset` hängt:
    // `finishUniverseRun()` hebt den Anker, und die Anforderung zieht in
    // derselben Zeile nach. Würde der Lohn erst DANACH gelesen, bekäme der
    // Spieler rund ein Drittel weniger, als der Header eben noch versprach.
    const game = useGameStore()
    game.bestUniverseRunChimes = 1e5
    game.chimesForNextUniverse = 2e5
    game.meeps = 7
    const owed = game.pendingMeeps
    expect(owed).toBeGreaterThan(0)

    game.executePrestigeReset(2)

    expect(game.meeps).toBe(7 + owed)
    expect(game.bestUniverseRunChimes).toBe(2e5)
    // Der Laufzähler ist zurückgesetzt, es steht also nichts mehr an.
    expect(game.chimesForNextUniverse).toBe(0)
    expect(game.pendingMeeps).toBe(0)
  })

  it('die Ratsche sinkt nie — auch nicht durch einen absichtlich winzigen Lauf', () => {
    // Sonst wäre der Anker manipulierbar: ein Ein-Chime-Universum setzte ihn
    // zurück, und der Lauf danach zahlte den 100×-Bonus.
    const game = useGameStore()
    game.chimesForNextUniverse = 5e8
    game.executePrestigeReset(2)
    expect(game.bestUniverseRunChimes).toBe(5e8)

    game.chimesForNextUniverse = 1_000
    game.executePrestigeReset(3)
    expect(game.bestUniverseRunChimes).toBe(5e8)
  })

  it('der Aufbruch lässt den Meep-Baum stehen', () => {
    // Der Grund, warum die Ausbeute überhaupt eine Währung sein kann: würde
    // das Prestige den Baum weiter löschen, wäre jeder ausgezahlte Meep nur
    // die Wiederbeschaffung dessen, was gerade verfallen ist.
    const game = useGameStore()
    const tree = useMeepTreeStore()
    tree.bought = ['vigil_1']
    tree.acknowledged = ['vigil_1']

    game.chimesForNextUniverse = 9e6
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

/**
 * Der Void ist die einzige Kraft im Spiel, die anstehende Meeps WEGNIMMT.
 * Zwei Eigenschaften tragen das System, und beide sind ohne Test unsichtbar:
 * verloren gehen kann nur, was schon gesammelt ist (ein frischer Lauf zahlt
 * also nichts), und der Restweg zum nächsten Meep bleibt danach richtig.
 */
describe('Der Void frisst die Ernte', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('bei nichts Anstehendem geht nichts verloren', () => {
    const game = useGameStore()
    game.chimesForNextUniverse = 0
    expect(game.devourMeeps(0.15, 3)).toBe(0)
    expect(game.meepsDevoured).toBe(0)
    expect(game.totalMeepsDevoured).toBe(0)
  })

  it('klemmt auf den Bestand und lässt pendingMeeps nie negativ werden', () => {
    const game = useGameStore()
    game.chimesForNextUniverse = 4 * 100 // exakt 2 Meeps
    expect(game.pendingMeeps).toBe(2)

    expect(game.devourMeeps(0.15, 99)).toBe(2)
    expect(game.pendingMeeps).toBe(0)
    // Ein zweiter Einschlag auf eine leere Ernte kostet nichts mehr.
    expect(game.devourMeeps(0.15, 99)).toBe(0)
    expect(game.pendingMeeps).toBe(0)
  })

  it('nimmt den Anteil, sobald er über dem Mindestbetrag liegt', () => {
    const game = useGameStore()
    game.chimesForNextUniverse = 400 * 100 // 20 Meeps
    expect(game.pendingMeeps).toBe(20)
    expect(game.devourMeeps(0.15, 3)).toBe(3)
    expect(game.pendingMeeps).toBe(17)
  })

  it('der Restweg bleibt richtig: nachlegen bringt genau einen Meep', () => {
    // Der Zielindex muss den Frass MITzählen — sonst zeigte die Anzeige eine
    // Strecke an, die längst zurückgelegt ist.
    const game = useGameStore()
    game.bestUniverseRunChimes = 1e9
    game.chimesForNextUniverse = 2e9

    const lost = game.devourMeeps(0.08, 2)
    expect(lost).toBeGreaterThan(0)

    const before = game.pendingMeeps
    expect(game.chimesToNextMeep).toBeGreaterThan(0)
    game.chimesForNextUniverse += game.chimesToNextMeep
    expect(game.pendingMeeps).toBe(before + 1)
  })

  it('der Frass endet mit dem Lauf, die Lebensbilanz nicht', () => {
    const game = useGameStore()
    game.chimesForNextUniverse = 100 * 100
    game.devourMeeps(0.15, 3)
    const lifetime = game.totalMeepsDevoured
    expect(lifetime).toBeGreaterThan(0)

    game.executePrestigeReset(2)

    expect(game.meepsDevoured).toBe(0)
    expect(game.totalMeepsDevoured).toBe(lifetime)
  })

  it('der Aufbruch zahlt nur, was der Void übrig gelassen hat', () => {
    const game = useGameStore()
    game.chimesForNextUniverse = 400 * 100 // 20 Meeps
    const lost = game.devourMeeps(0.15, 3)
    const owed = game.pendingMeeps
    expect(owed).toBe(20 - lost)

    game.executePrestigeReset(2)
    expect(game.meeps).toBe(owed)
  })
})
