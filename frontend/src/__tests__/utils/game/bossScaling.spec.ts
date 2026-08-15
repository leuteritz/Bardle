import { describe, it, expect } from 'vitest'
import { bossTargetClicks, bossClickBudgetHP } from '@/utils/game/bossScaling'
import {
  BOSS_BASE_HP,
  BOSS_CLICK_DAMAGE_BASE,
  BOSS_CLICK_RAMP_GALAXY_KILLS,
  BOSS_CLICK_RAMP_KILLS,
  BOSS_TARGET_CLICKS_MAX,
  BOSS_TARGET_CLICKS_START,
} from '@/config/constants'

/**
 * Die Klickzahl eines Bosses ist eine ENTWORFENE Zahl — vorher war sie ein
 * Nebenprodukt und stand deshalb unbemerkt für das ganze Spiel fest.
 *
 * Der Klickschaden stand in der HP-Formel auf beiden Seiten (Summand im
 * Schätzer, Nenner beim Klicken) und kürzte sich weg: jeder Boss kostete 18
 * Klicks, vom ersten bis zum letzten, und kein Upgrade änderte etwas. Früh war
 * das die volle Last (der Klick ist dann die einzige Schadensquelle), spät war
 * es Beiwerk. Diese Datei hält die Rampe fest, die das umdreht.
 */
describe('Boss-Klickrampe', () => {
  it('der allererste Boss kostet genau den Startwert', () => {
    expect(bossTargetClicks(0, 1)).toBe(BOSS_TARGET_CLICKS_START)
  })

  it('steigt monoton und bleibt ganzzahlig über dem Minimum', () => {
    let prev = 0
    for (let n = 0; n <= 300; n++) {
      const clicks = bossTargetClicks(n, 1)
      expect(Number.isInteger(clicks)).toBe(true)
      expect(clicks).toBeGreaterThanOrEqual(1)
      expect(clicks).toBeGreaterThanOrEqual(prev)
      prev = clicks
    }
  })

  it('erreicht am Ende der Rampe den Endwert und bleibt dort', () => {
    expect(bossTargetClicks(BOSS_CLICK_RAMP_KILLS, 1)).toBe(BOSS_TARGET_CLICKS_MAX)
    expect(bossTargetClicks(BOSS_CLICK_RAMP_KILLS * 10, 1)).toBe(BOSS_TARGET_CLICKS_MAX)
  })

  it('der späte Kampf kostet exakt so viel wie vor der Rampe', () => {
    // Die Rampe ist eine Entlastung am Anfang, KEIN Nerf am Ende. 18 ist der
    // Wert, den vorher jeder Boss durchgehend hatte (18 s × 1 Klick/s).
    // Wer diese Zahl senkt, verschiebt still das ganze Spätspiel.
    expect(BOSS_TARGET_CLICKS_MAX).toBe(18)
  })

  it('eine Galaxie zählt wie eine feste Zahl gefällter Bosse', () => {
    // Zwei Fortschrittsachsen, EINE Skala — sonst müssten zwei Kurven
    // zueinander passend gehalten werden.
    expect(bossTargetClicks(0, 3)).toBe(bossTargetClicks(2 * BOSS_CLICK_RAMP_GALAXY_KILLS, 1))
    expect(bossTargetClicks(10, 2)).toBe(bossTargetClicks(10 + BOSS_CLICK_RAMP_GALAXY_KILLS, 1))
  })

  it('der HP-Boden liegt unter dem Startbudget', () => {
    // Der Boden greift NACH allen Multiplikatoren. Stünde er über dem
    // Startbudget, frässe er die Rampe wortlos auf — genau das war der Zustand
    // bei BOSS_BASE_HP = 200 (ein stiller Boden von zehn Klicks).
    expect(BOSS_BASE_HP).toBeLessThan(bossClickBudgetHP(0, 1))
  })

  it('rechnet das Budget über die Klick-BASIS, nicht über Upgrades', () => {
    expect(bossClickBudgetHP(0, 1)).toBe(BOSS_CLICK_DAMAGE_BASE * BOSS_TARGET_CLICKS_START)
  })
})
