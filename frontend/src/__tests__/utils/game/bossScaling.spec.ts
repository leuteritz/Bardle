import { describe, it, expect } from 'vitest'
import { bossTargetClicks, bossClickBudgetHP, expectedClickDamage } from '@/utils/game/bossScaling'
import { galaxyDepth } from '@/utils/game/galaxyDepth'
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
    //
    // Der Sockel ist die GALAXIE-TIEFE, nicht die Galaxienummer: seit dem
    // Sterndeckel kommen Galaxien schneller, und ein Sockel je Nummer liesse die
    // Rampe entsprechend schneller steigen (`utils/game/galaxyDepth.ts`).
    for (const g of [1, 2, 3, 12, 40]) {
      const sockel = galaxyDepth(g) * BOSS_CLICK_RAMP_GALAXY_KILLS
      expect(bossTargetClicks(0, g)).toBe(bossTargetClicks(sockel, 1))
      expect(bossTargetClicks(10, g)).toBe(bossTargetClicks(10 + sockel, 1))
    }
  })

  it('der HP-Boden liegt unter dem Startbudget', () => {
    // Der Boden greift NACH allen Multiplikatoren. Stünde er über dem
    // Startbudget, frässe er die Rampe wortlos auf — genau das war der Zustand
    // bei BOSS_BASE_HP = 200 (ein stiller Boden von zehn Klicks). Gerechnet
    // wird gegen den SCHWÄCHSTEN Stand: ein Spieler ohne jedes Upgrade.
    expect(BOSS_BASE_HP).toBeLessThan(bossClickBudgetHP(0, 1, BOSS_CLICK_DAMAGE_BASE))
  })

  it('der unaufgewertete Spieler klickt gegen die reine Basis', () => {
    expect(bossClickBudgetHP(0, 1, BOSS_CLICK_DAMAGE_BASE)).toBe(
      BOSS_CLICK_DAMAGE_BASE * BOSS_TARGET_CLICKS_START,
    )
  })
})

/**
 * Die Erwartung ist das GEOMETRISCHE MITTEL aus der Klick-Basis und dem, was
 * der Spieler wirklich austeilt — und beide Randfälle sind bereits einmal
 * gescheitert.
 *
 * Stünde dort der volle Klickschaden, kürzte er sich gegen den Nenner beim
 * Klicken weg: jeder Boss kostete für immer dieselbe Klickzahl. Stünde dort nur
 * die Basis, schrumpfte der Klick-Kanal seit `BOSS_CLICK_DAMAGE_BASE = 1` auf
 * 6–18 HP gegen einen DPS-Kanal von `otherDps × 18` — Klicken wäre ab etwa
 * 10 CpS zwei Prozent des Kampfes. Diese Suite hält die halbe Potenz fest.
 */
describe('Erwarteter Klickschaden', () => {
  it('ist bei einem unaufgewerteten Klick genau die Basis', () => {
    expect(expectedClickDamage(BOSS_CLICK_DAMAGE_BASE)).toBe(BOSS_CLICK_DAMAGE_BASE)
  })

  it('fällt nie unter die Basis', () => {
    expect(expectedClickDamage(0)).toBe(BOSS_CLICK_DAMAGE_BASE)
    expect(expectedClickDamage(BOSS_CLICK_DAMAGE_BASE / 100)).toBe(BOSS_CLICK_DAMAGE_BASE)
  })

  it('wächst monoton mit dem echten Klickschaden', () => {
    let prev = 0
    for (const power of [1, 2, 5, 10, 50, 200, 1000, 50_000]) {
      const expected = expectedClickDamage(BOSS_CLICK_DAMAGE_BASE * power)
      expect(expected).toBeGreaterThanOrEqual(prev)
      prev = expected
    }
  })

  it('ist das geometrische Mittel — halbe Potenz, nicht volle', () => {
    // Hundertfacher Klickschaden hebt die Erwartung nur um das Zehnfache.
    // Wäre es die volle Potenz, hätte der Spieler nichts gewonnen; wäre es gar
    // keine, verlöre der Klick-Kanal gegen den DPS-Kanal.
    expect(expectedClickDamage(BOSS_CLICK_DAMAGE_BASE * 100)).toBeCloseTo(
      BOSS_CLICK_DAMAGE_BASE * 10,
      10,
    )
  })

  it('ein stärkerer Klick spart Klicks, macht den Boss aber nicht trivial', () => {
    // DIE Eigenschaft, die beide Randfälle ausschliesst.
    const clicksAt = (power: number) =>
      bossClickBudgetHP(0, 1, BOSS_CLICK_DAMAGE_BASE * power) / (BOSS_CLICK_DAMAGE_BASE * power)

    const plain = clicksAt(1)
    const strong = clicksAt(100)

    expect(strong).toBeLessThan(plain) // Upgrades wirken — nicht die volle Potenz
    expect(strong).toBeCloseTo(plain / 10, 10) // aber gedämpft — nicht Faktor 100
    expect(plain).toBe(BOSS_TARGET_CLICKS_START)
  })
})
