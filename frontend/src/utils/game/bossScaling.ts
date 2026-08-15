import {
  BOSS_CLICK_DAMAGE_BASE,
  BOSS_CLICK_RAMP_EXPONENT,
  BOSS_CLICK_RAMP_GALAXY_KILLS,
  BOSS_CLICK_RAMP_KILLS,
  BOSS_TARGET_CLICKS_MAX,
  BOSS_TARGET_CLICKS_START,
} from '@/config/constants'

/**
 * Wie viele Klicks ein Planeten-Boss kosten soll — die entworfene Zahl hinter
 * dem Klick-Kanal seiner HP.
 *
 * Die HP eines Bosses laufen über zwei getrennte Kanäle (`spawnBoss`):
 *
 * ```
 * otherDps      = passiveDPS + autoAttackDPS + fullOrbitDps()
 * clickBudgetHP = expectedClickDamage(clickPower) × bossTargetClicks(...)
 * maxHP         = (otherDps × BOSS_TARGET_KILL_SECONDS + clickBudgetHP) × Multiplikatoren
 * ```
 *
 * Der DPS-Kanal folgt dem, was der Spieler ohne Zutun aufbringt; der Klick-Kanal
 * ist eine Entwurfsentscheidung. Vorher waren beide EIN Summand, und weil der
 * Klickschaden dort im Zähler und beim Klicken im Nenner stand, kürzte er sich
 * weg: jeder Boss kostete exakt 18 Klicks, vom ersten bis zum letzten, und kein
 * Klick-Upgrade änderte je etwas daran.
 *
 * Die Funktionen hier stehen bewusst ausserhalb des Stores: sie sind rein, ohne
 * Pinia testbar, und `docs/balance.md` braucht eine adressierbare Formel.
 */

/**
 * Fortschritt auf der Rampe, gemessen in „gefällten Bossen".
 *
 * Zwei Achsen, eine Skala: `totalBossesDefeated` ist die feine Kurve (überlebt
 * Prestige, und Niederlagen zählen nicht mit — wer scheitert, bleibt am leichten
 * Ende), die Galaxie ein Sockel darunter.
 */
function rampAnchor(bossesDefeated: number, galaxy: number): number {
  const kills = Math.max(0, bossesDefeated)
  const galaxySockel = Math.max(0, galaxy - 1) * BOSS_CLICK_RAMP_GALAXY_KILLS
  return kills + galaxySockel
}

/**
 * Ziel-Klickzahl für einen Boss, der jetzt spawnt.
 *
 * Steigt von `BOSS_TARGET_CLICKS_START` auf `BOSS_TARGET_CLICKS_MAX` und bleibt
 * dort — der späte Kampf kostet exakt so viel wie vor Einführung der Rampe.
 */
export function bossTargetClicks(bossesDefeated: number, galaxy: number): number {
  const anchor = rampAnchor(bossesDefeated, galaxy)
  const progress = Math.min(1, anchor / BOSS_CLICK_RAMP_KILLS) ** BOSS_CLICK_RAMP_EXPONENT
  const span = BOSS_TARGET_CLICKS_MAX - BOSS_TARGET_CLICKS_START
  return Math.max(1, Math.round(BOSS_TARGET_CLICKS_START + span * progress))
}

/**
 * Der Klickschaden, den ein Boss ERWARTET — das geometrische Mittel aus der
 * Basis und dem, was der Spieler wirklich austeilt.
 *
 * ```
 * expected = √(BASIS × clickPower)          →  Klicks = bossTargetClicks / √(clickPower / BASIS)
 * ```
 *
 * Die beiden Randfälle taugen beide nicht, und genau deshalb steht hier die
 * halbe Potenz dazwischen:
 *
 * - **Nur die BASIS** (der Stand vor dem Absenken auf 1): das Budget steht fest,
 *   Upgrades senken die Klickzahl voll durch. Bei einer Basis von 20 trug der
 *   Klick-Kanal damit 120–360 HP und stand dem DPS-Kanal noch gegenüber; bei
 *   Basis 1 sind es 6–18 HP gegen `otherDps × 18` — ab etwa 10 CpS wäre Klicken
 *   zwei Prozent des Kampfes.
 * - **Der volle `clickPower`**: er stünde wieder im Zähler UND im Nenner und
 *   kürzte sich weg — jeder Boss kostete für immer dieselbe Klickzahl, und kein
 *   Upgrade änderte etwas. Das ist der Fehler, den diese Datei behoben hat.
 *
 * Die Wurzel behält beides: der Kanal wächst mit dem Spieler mit (bleibt also
 * gegenüber dem DPS-Kanal sichtbar), und Upgrades sparen trotzdem echte Klicks —
 * nur mit halber statt voller Potenz. Ein hundertfach stärkerer Klick fällt den
 * Boss in einem Zehntel der Klicks, nicht in einem Hundertstel.
 *
 * `clickPower` ist der Schaden EINES Klicks vor situativen Verstärkern
 * (`planetBossStore.clickPower`); das `max` fängt Stände unter der Basis ab,
 * damit die Erwartung nie unter den ersten Klick fällt.
 */
export function expectedClickDamage(clickPower: number): number {
  return Math.sqrt(BOSS_CLICK_DAMAGE_BASE * Math.max(BOSS_CLICK_DAMAGE_BASE, clickPower))
}

/**
 * Der Klick-Kanal der Boss-HP, in HP: die entworfene Klickzahl mal dem
 * erwarteten Schaden je Klick.
 */
export function bossClickBudgetHP(
  bossesDefeated: number,
  galaxy: number,
  clickPower: number,
): number {
  return expectedClickDamage(clickPower) * bossTargetClicks(bossesDefeated, galaxy)
}
