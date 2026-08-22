// Die Rechnung hinter dem Offline-Fenster „The Crossing" — getrennt von der
// Darstellung, damit sie ohne Mounten prüfbar ist.

import {
  OFFLINE_CROSSING_STEPS,
  OFFLINE_CROSSING_VOID_KEEP,
  OFFLINE_CROSSING_MIN_MULT,
} from '@/config/constants'

/** Wie viele Tore sich überhaupt öffnen lassen — das fünfte bleibt das Void-Tor. */
export const CROSSING_MAX_OPEN = OFFLINE_CROSSING_STEPS.length

/** Multiplikator nach `opened` geöffneten Chime-Toren. */
export function crossingMultiplier(opened: number): number {
  const n = Math.max(0, Math.min(opened, CROSSING_MAX_OPEN))
  let m = OFFLINE_CROSSING_MIN_MULT
  for (let i = 0; i < n; i++) m += OFFLINE_CROSSING_STEPS[i]
  // Die Stufen sind Zweierbrüche-fremd (0.35 + 0.3 …), ohne Rundung steht dort 1.6500000000000001.
  return Math.round(m * 1000) / 1000
}

/**
 * Was nach einem Void-Treffer übrigbleibt: die Hälfte des Bonus, Boden 1.0.
 *
 * Auf ZWEI Stellen gerundet, nicht auf drei: die UI schreibt den Multiplikator
 * als `×1.18`, und ein gezahltes 1.175 hinter einem angezeigten 1.18 ist ein
 * kleiner, aber echter Widerspruch zwischen Anzeige und Gutschrift.
 */
export function voidToll(multiplier: number): number {
  const bonus = Math.max(0, multiplier - OFFLINE_CROSSING_MIN_MULT)
  return Math.round((OFFLINE_CROSSING_MIN_MULT + bonus * OFFLINE_CROSSING_VOID_KEEP) * 100) / 100
}

/**
 * Der Caretaker's Ward: das Void-Tor wird erst NACH dem ersten Griff gesetzt und
 * nie auf ihn. „Auf dem allerersten Klick verloren" ist die eine Erfahrung, die
 * ein Fenster beim Sitzungsstart feindselig macht.
 */
export function placeVoidGate(firstPick: number, gateCount: number, rng = Math.random): number {
  const candidates: number[] = []
  for (let i = 0; i < gateCount; i++) if (i !== firstPick) candidates.push(i)
  return candidates[Math.floor(rng() * candidates.length)] ?? candidates[candidates.length - 1]
}
