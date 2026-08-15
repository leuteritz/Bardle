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
 * clickBudgetHP = BOSS_CLICK_DAMAGE_BASE × bossTargetClicks(...)
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
 * Der Klick-Kanal der Boss-HP, in HP.
 *
 * Umgerechnet über `BOSS_CLICK_DAMAGE_BASE` — die BASIS, nicht den aufgewerteten
 * `gameStore.dmgPerClick`. Genau darin liegt die Entkopplung: das Budget steht
 * fest, also senkt jedes Klickschaden-Upgrade die nötige Klickzahl wirklich,
 * statt sich gegen mitgewachsene HP wegzukürzen.
 */
export function bossClickBudgetHP(bossesDefeated: number, galaxy: number): number {
  return BOSS_CLICK_DAMAGE_BASE * bossTargetClicks(bossesDefeated, galaxy)
}
