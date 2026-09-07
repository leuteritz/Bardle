/**
 * Die Strecke einer Etappe in Lichtjahren.
 *
 * Reine Anzeige — keine Formel des Spiels liest sie. Sie steht hier und nicht in
 * einer Komponente, weil sie ZWEI Leser hat: die Ablesung der Bottom-Bar
 * (`MiniMapHudPanel`) und das Datenband der Live-Bühne. Zweimal ausgeschrieben
 * liefen die beiden Zahlen auseinander, und der Spieler sähe dieselbe Reise mit
 * zwei Längen.
 */
import { CHAMPION_TRAVEL_BASE_LY, CHAMPION_TRAVEL_LY_PER_GALAXY } from '@/config/constants'
import { galaxyDepth } from '@/utils/game/galaxyDepth'

/** Gegen `galaxyDepth`, wie jede Formel, die mit der Galaxienummer wächst. */
export function travelTotalLY(galaxy: number): number {
  return Math.round(CHAMPION_TRAVEL_BASE_LY + galaxyDepth(galaxy) * CHAMPION_TRAVEL_LY_PER_GALAXY)
}

export function travelRemainingLY(galaxy: number, progressPercent: number): number {
  return travelTotalLY(galaxy) * (1 - progressPercent / 100)
}

/** Unter 100 mit einer Nachkommastelle, darüber ganz — sonst wird die Zelle breit. */
export function formatLY(value: number): string {
  return value >= 100 ? `${Math.round(value)}` : value.toFixed(1)
}
