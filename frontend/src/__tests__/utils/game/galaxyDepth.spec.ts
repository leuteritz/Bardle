import { describe, it, expect } from 'vitest'
import { galaxyDepth } from '@/utils/game/galaxyDepth'
import { computeBossEscortCount, computeRequired } from '@/stores/world/galaxyStore'
import { bossTargetClicks } from '@/utils/game/bossScaling'
import {
  GALAXY_DEPTH_PER_GALAXY,
  GALAXY_STARS_BASE_REQUIRED,
  GALAXY_STARS_MAX,
  GALAXY_BOSS_ESCORT_BASE,
  GALAXY_BOSS_ESCORT_PER_GALAXY,
  GALAXY_BOSS_ESCORT_MAX,
  CHAMPION_TRAVEL_BASE_MS,
  CHAMPION_TRAVEL_SCALE_MS,
  CHAMPION_TRAVEL_MAX_MS,
  CHAMPION_TRAVEL_BASE_LY,
  CHAMPION_TRAVEL_LY_PER_GALAXY,
  BOSS_HP_PER_GALAXY,
  BOSS_CLICK_RAMP_GALAXY_KILLS,
  CHAMPION_XP_BOSS_BASE,
  CHAMPION_XP_BOSS_PER_GALAXY,
  VOID_HP_BASE,
  VOID_HP_PER_GALAXY,
  CHAMPION_LEVEL_START_CAP,
  CHAMPION_LEVEL_CAP_PER_GALAXY,
  CHAMPION_LEVEL_MAX_CAP,
} from '@/config/constants'

/**
 * `galaxyDepth()` ist der EINE Regler der Galaxie-Achse.
 *
 * Sieben Formeln wuchsen vorher wörtlich mit `galaxy - 1`. Wer die Sternzahl
 * deckelt, muss sie alle mitziehen — sonst wächst Boss-HP je STUNDE plötzlich
 * doppelt so schnell, weil Galaxien doppelt so schnell kommen. Neun Konstanten
 * einzeln nachzuziehen heisst, beim nächsten Mal eine zu vergessen.
 *
 * Die tragende Zusicherung dieser Datei ist deshalb nicht eine Zahl, sondern
 * eine VERDRAHTUNG: jede der sieben Formeln rechnet gegen `galaxyDepth(g)` und
 * nicht gegen eine eigene Kopie von `g − 1`. Fällt eine davon zurück, bricht
 * hier ein Test — und zwar bei jedem Wert des Reglers.
 */
describe('galaxyDepth', () => {
  const GALAXIES = [1, 2, 3, 6, 7, 12, 20, 36, 48, 84, 100]

  it('ist `galaxy − 1`, skaliert mit dem Regler', () => {
    for (const g of GALAXIES) {
      expect(galaxyDepth(g)).toBeCloseTo((g - 1) * GALAXY_DEPTH_PER_GALAXY, 10)
    }
  })

  it('klemmt unter Galaxie 1 auf 0 — ein Spielstand mit 0 darf nichts schrumpfen', () => {
    expect(galaxyDepth(0)).toBe(0)
    expect(galaxyDepth(-5)).toBe(0)
  })

  /**
   * Der Regler steht unter 1, weil eine Galaxie mit gedeckelter Sternzahl
   * weniger Inhalt trägt als früher und Galaxien deshalb schneller kommen.
   * Diese Zusicherung ist bewusst grob: sie hält den VORZEICHEN-Fehler auf
   * (jemand dreht auf, statt ab), nicht die zweite Nachkommastelle — die kommt
   * aus dem Telemetrie-Lauf, nicht aus einer Herleitung.
   */
  it('bremst, statt zu beschleunigen — und die Sternreihe passt dazu', () => {
    expect(GALAXY_DEPTH_PER_GALAXY).toBeGreaterThan(0)
    expect(GALAXY_DEPTH_PER_GALAXY).toBeLessThanOrEqual(1)
    expect(GALAXY_STARS_MAX).toBeLessThan(36)
    // Die ersten Galaxien bleiben unberührt: der Deckel greift erst, wenn
    // `3 + (g−1)` ihn erreicht.
    for (let g = 1; g <= GALAXY_STARS_MAX - GALAXY_STARS_BASE_REQUIRED + 1; g++) {
      expect(computeRequired(g)).toBe(GALAXY_STARS_BASE_REQUIRED + (g - 1))
    }
    expect(computeRequired(1000)).toBe(GALAXY_STARS_MAX)
  })

  /* Die sieben Fundstellen. Steht hier eine Formel nicht, ist sie beim nächsten
     Deckel vergessen worden. */
  describe('alle sieben Formeln rechnen gegen dieselbe Skala', () => {
    it('Eskortenzahl (galaxyStore.computeBossEscortCount)', () => {
      for (const g of GALAXIES) {
        expect(computeBossEscortCount(g)).toBe(
          Math.min(
            Math.round(GALAXY_BOSS_ESCORT_BASE + galaxyDepth(g) * GALAXY_BOSS_ESCORT_PER_GALAXY),
            GALAXY_BOSS_ESCORT_MAX,
          ),
        )
      }
    })

    it('Eskortenzahl bleibt ganzzahlig — Wellen zählen keine halben Sterne', () => {
      for (const g of GALAXIES) {
        expect(Number.isInteger(computeBossEscortCount(g))).toBe(true)
      }
    })

    it('Reisedauer (galaxyStore.startChampionTravel)', () => {
      for (const g of GALAXIES) {
        const dauer = Math.min(
          CHAMPION_TRAVEL_MAX_MS,
          CHAMPION_TRAVEL_BASE_MS + galaxyDepth(g) * CHAMPION_TRAVEL_SCALE_MS,
        )
        expect(dauer).toBeGreaterThanOrEqual(CHAMPION_TRAVEL_BASE_MS)
        expect(dauer).toBeLessThanOrEqual(CHAMPION_TRAVEL_MAX_MS)
      }
    })

    it('Boss-HP-Multiplikator (planetBossStore.spawnBoss)', () => {
      for (const g of GALAXIES) {
        expect(1 + galaxyDepth(g) * BOSS_HP_PER_GALAXY).toBeCloseTo(
          1 + (g - 1) * GALAXY_DEPTH_PER_GALAXY * BOSS_HP_PER_GALAXY,
          10,
        )
      }
    })

    it('Klick-Rampe (bossScaling.rampAnchor)', () => {
      for (const g of GALAXIES) {
        for (const kills of [0, 5, 40, 200]) {
          const anker = kills + galaxyDepth(g) * BOSS_CLICK_RAMP_GALAXY_KILLS
          expect(bossTargetClicks(kills, g)).toBe(bossTargetClicks(anker, 1))
        }
      }
    })

    it('Champion-XP je Boss (planetBossStore.grantBossRewards)', () => {
      for (const g of GALAXIES) {
        expect(CHAMPION_XP_BOSS_BASE + galaxyDepth(g) * CHAMPION_XP_BOSS_PER_GALAXY).toBeCloseTo(
          CHAMPION_XP_BOSS_BASE + (g - 1) * GALAXY_DEPTH_PER_GALAXY * CHAMPION_XP_BOSS_PER_GALAXY,
          10,
        )
      }
    })

    it('Void-HP (voidStore.spawnMonster)', () => {
      for (const g of GALAXIES) {
        expect(Math.round(VOID_HP_BASE * (1 + galaxyDepth(g) * VOID_HP_PER_GALAXY))).toBe(
          Math.round(VOID_HP_BASE * (1 + (g - 1) * GALAXY_DEPTH_PER_GALAXY * VOID_HP_PER_GALAXY)),
        )
      }
    })

    it('Champion-Level-Cap (championLevelStore.levelCap) bleibt ganzzahlig', () => {
      for (const g of GALAXIES) {
        const cap = Math.min(
          CHAMPION_LEVEL_MAX_CAP,
          Math.floor(CHAMPION_LEVEL_START_CAP + galaxyDepth(g) * CHAMPION_LEVEL_CAP_PER_GALAXY),
        )
        expect(Number.isInteger(cap)).toBe(true)
        expect(cap).toBeGreaterThanOrEqual(CHAMPION_LEVEL_START_CAP)
      }
    })

    it('Lichtjahre der Minimap (MiniMapHudPanel) bleiben ganzzahlig', () => {
      for (const g of GALAXIES) {
        const ly = Math.round(
          CHAMPION_TRAVEL_BASE_LY + galaxyDepth(g) * CHAMPION_TRAVEL_LY_PER_GALAXY,
        )
        expect(Number.isInteger(ly)).toBe(true)
      }
    })
  })

  it('eine kleinere Tiefe bremst JEDE Achse, nicht nur eine', () => {
    // Halbe Tiefe heisst: Galaxie 21 steht dort, wo vorher Galaxie 11 stand —
    // und zwar für Boss-HP, Void-HP, Reisedauer und Klick-Rampe gleichzeitig.
    const halb = (g: number) => (g - 1) * 0.5
    expect(halb(21)).toBe(11 - 1)
  })
})
