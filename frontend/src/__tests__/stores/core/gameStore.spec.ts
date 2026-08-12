import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore, chimeThresholdForLevel } from '@/stores/core/gameStore'
import {
  LEVEL_BASE,
  LEVEL_EXPONENT,
  LEVEL_SCALING_THRESHOLD,
  LEVEL_SCALING_FACTOR,
  LEVEL_SCALING_CAP_LEVEL,
  AUGMENT_LEVEL_INTERVAL,
  MEEP_POWER_MULTIPLIER,
  ABILITY_POWER_PER_LEVEL_DEFAULT,
} from '@/config/constants'

describe('gameStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ─── chimesAtLevelStart (tests chimeThresholdForLevel indirectly) ─────────────

  describe('chimesAtLevelStart', () => {
    it('level=1 → 0 (threshold for level 0)', () => {
      const store = useGameStore()
      store.level = 1
      expect(store.chimesAtLevelStart).toBe(0)
    })

    it('level=2 → 2500 (ceil(2500 * 1^2.2))', () => {
      const store = useGameStore()
      store.level = 2
      expect(store.chimesAtLevelStart).toBe(2500)
    })

    it('level=3 → 11487 (ceil(2500 * 2^2.2))', () => {
      const store = useGameStore()
      store.level = 3
      expect(store.chimesAtLevelStart).toBe(11487)
    })

    it('level=11 → 396224 (ceil(2500 * 10^2.2))', () => {
      const store = useGameStore()
      store.level = 11
      expect(store.chimesAtLevelStart).toBe(396224)
    })
  })

  // ─── calculateLevel ──────────────────────────────────────────────────────────

  describe('calculateLevel', () => {
    it('chimes below threshold: level stays at 1', () => {
      const store = useGameStore()
      store.chimesEarnedForLevel = LEVEL_BASE - 1
      store.calculateLevel()
      expect(store.level).toBe(1)
    })

    it('chimes at threshold: level increments to 2', () => {
      const store = useGameStore()
      store.chimesEarnedForLevel = LEVEL_BASE
      store.calculateLevel()
      expect(store.level).toBe(2)
    })

    it('after level-up, chimesForNextLevel is updated correctly', () => {
      const store = useGameStore()
      store.chimesEarnedForLevel = LEVEL_BASE
      store.calculateLevel()
      // chimesForNextLevel = ceil(2500 * 2^2.2) = 11487
      expect(store.chimesForNextLevel).toBe(11487)
    })
  })

  // ─── levelProgress ───────────────────────────────────────────────────────────

  describe('levelProgress', () => {
    it('0 chimes at level 1 → 0%', () => {
      const store = useGameStore()
      store.chimesEarnedForLevel = 0
      expect(store.levelProgress).toBe(0)
    })

    it('halfway through level 1 → 50%', () => {
      const store = useGameStore()
      store.chimesEarnedForLevel = 1250 // chimesForNextLevel = 2500, atLevelStart = 0
      expect(store.levelProgress).toBe(50)
    })

    it('progress capped at 100%', () => {
      const store = useGameStore()
      store.chimesEarnedForLevel = 99999
      store.chimesForNextLevel = 500
      expect(store.levelProgress).toBe(100)
    })
  })

  // ─── totalPower ──────────────────────────────────────────────────────────────

  describe('totalPower', () => {
    it('0 meeps, no ability levels → 0 power', () => {
      const store = useGameStore()
      expect(store.totalPower).toBe(0)
    })

    // Gegen die Konstanten gerechnet, nicht gegen abgeschriebene Zahlen:
    // `MEEP_POWER_MULTIPLIER` ist eine Balance-Größe und wurde mit der
    // Meep-Ökonomie schon einmal nachgezogen. Ein Literal hier hiesse, dass
    // jede Eichung zwei Fehlschläge produziert, die nichts aussagen.
    it('Meeps tragen den Löwenanteil der Power', () => {
      const store = useGameStore()
      store.meeps = 10
      expect(store.totalPower).toBe(10 * MEEP_POWER_MULTIPLIER)
    })

    it('W-Rang addiert seinen Power-Bonus obendrauf', () => {
      const store = useGameStore()
      store.meeps = 5
      store.abilityLevels = [0, 2, 0, 0]
      expect(store.totalPower).toBe(5 * MEEP_POWER_MULTIPLIER + 2 * ABILITY_POWER_PER_LEVEL_DEFAULT)
    })
  })

  // ─── Die gedeckelte Exponentialbremse ────────────────────────────────────
  describe('chimeThresholdForLevel oberhalb des Bremsdeckels', () => {
    /** Die Differenz, die EINE Stufe kostet — das, was der Spieler spürt. */
    const stepCost = (level: number) =>
      chimeThresholdForLevel(level) - chimeThresholdForLevel(level - 1)

    it('bremst zwischen Schwelle und Deckel weiter exponentiell', () => {
      const a = chimeThresholdForLevel(LEVEL_SCALING_THRESHOLD + 10)
      const b = chimeThresholdForLevel(LEVEL_SCALING_THRESHOLD + 11)
      const polynomialOnly = Math.pow(
        (LEVEL_SCALING_THRESHOLD + 11) / (LEVEL_SCALING_THRESHOLD + 10),
        LEVEL_EXPONENT,
      )
      // Der Sprung ist grösser als die reine Potenz — die Bremse wirkt.
      expect(b / a).toBeGreaterThan(polynomialOnly * 1.05)
    })

    it('läuft weit hinter dem Deckel gegen die reine Potenz', () => {
      const level = LEVEL_SCALING_CAP_LEVEL + 200
      const ratio = chimeThresholdForLevel(level + 1) / chimeThresholdForLevel(level)
      const polynomialOnly = Math.pow((level + 1) / level, LEVEL_EXPONENT)
      // Der Bremsanteil ist auf unter ein Prozent geschrumpft.
      expect(ratio / polynomialOnly).toBeLessThan(1.01)
      expect(ratio).toBeGreaterThan(polynomialOnly)
    })

    it('läuft weich aus statt zu springen', () => {
      // Ein hartes min(level, cap) machte die Stufe hinter dem Deckel schlagartig
      // fünfmal billiger als die davor. Über den Deckel hinweg darf sich der
      // Preis einer Stufe nur um wenige Prozent ändern.
      const before = stepCost(LEVEL_SCALING_CAP_LEVEL)
      const after = stepCost(LEVEL_SCALING_CAP_LEVEL + 1)
      expect(after / before).toBeGreaterThan(0.95)
      expect(after / before).toBeLessThan(1.15)
    })

    it('macht eine hohe Stufe wieder bezahlbar', () => {
      // Ohne Deckel kostete Stufe 200 rund 3,2e14 Chimes — bei einer erreichbaren
      // CPS von 1e8 über hundert Jahre Spielzeit. Der Deckel muss das um
      // Grössenordnungen drücken, sonst ist er wirkungslos.
      const uncapped =
        Math.ceil(LEVEL_BASE * Math.pow(200, LEVEL_EXPONENT)) *
        Math.pow(LEVEL_SCALING_FACTOR, 200 - LEVEL_SCALING_THRESHOLD)
      expect(stepCost(200)).toBeLessThan(uncapped / 1e4)
    })

    it('bleibt monoton — jede Stufe kostet mehr als die vorige', () => {
      for (const level of [2, 31, 99, 100, 101, 150, 300]) {
        expect(stepCost(level)).toBeGreaterThan(stepCost(level - 1))
      }
    })
  })

  // ─── skipAllAugments oberhalb der Bremsschwelle ──────────────────────────
  describe('skipAllAugments', () => {
    // Die Schleife stand einmal auf zwei verschiedenen Formeln: sie setzte
    // `chimesForNextLevel` ungebremst und zog davon die GEBREMSTE Schwelle der
    // Vorstufe ab. Oberhalb von LEVEL_SCALING_THRESHOLD ist diese Differenz
    // negativ — die Abbruchbedingung wurde nie falsch und `chimesEarnedForLevel`
    // wuchs durch die Subtraktion sogar. Der Tab fror ein.
    it('terminiert oberhalb der Bremsschwelle', () => {
      const store = useGameStore()
      store.level = LEVEL_SCALING_THRESHOLD + 5
      store.chimesEarnedForLevel = 0
      store.calculateLevel() // synchronisiert chimesForNextLevel auf die Formel

      const levelBefore = store.level
      store.skipAllAugments()

      expect(store.level).toBe(levelBefore)
      expect(store.chimesEarnedForLevel).toBe(0)
    })

    it('vergibt Augments im selben Takt wie ein echtes Level-Up', () => {
      // Sonst bekäme, wer die Auswahl überspringt, doppelt so viele Augments
      // wie jemand, der sie durchklickt.
      const store = useGameStore()
      store.autoPickAugments = true
      store.level = LEVEL_SCALING_THRESHOLD + 1
      store.chimesEarnedForLevel = 0
      store.calculateLevel()

      const before = store.activeAugments.length
      // Reichlich Vorrat für mehrere Stufen.
      store.chimesEarnedForLevel = store.totalChimesThisLevel * 40
      store.skipAllAugments()

      const gained = store.level - (LEVEL_SCALING_THRESHOLD + 1)
      expect(gained).toBeGreaterThan(AUGMENT_LEVEL_INTERVAL)
      expect(store.activeAugments.length - before).toBeLessThanOrEqual(
        Math.ceil(gained / AUGMENT_LEVEL_INTERVAL),
      )
    })

    it('steigt genau eine Stufe, wenn es für genau eine reicht', () => {
      const store = useGameStore()
      store.level = LEVEL_SCALING_THRESHOLD + 1
      store.chimesEarnedForLevel = 0
      store.calculateLevel()
      // `totalChimesThisLevel` ist die gebremste Differenz — exakt die Zahl,
      // an der sich die Schleife orientieren muss.
      store.chimesEarnedForLevel = store.totalChimesThisLevel

      store.skipAllAugments()

      expect(store.level).toBe(LEVEL_SCALING_THRESHOLD + 2)
      expect(store.totalChimesThisLevel).toBeGreaterThan(0)
    })
  })
})
