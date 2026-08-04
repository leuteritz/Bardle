// Deko-Partikelfelder: aufsteigende Glut und treibender Staub.
//
// Alle Werte werden aus dem Partikel-Index abgeleitet statt gewürfelt. Ein
// `Math.random()` im Style-Getter würde bei jedem Re-Render neu ziehen und das
// ganze Feld springen lassen — die Modulo-Staffelung hier liefert dasselbe Korn
// an derselben Stelle, solange der Index derselbe ist.
//
// Die Felder sind rein dekorativ: nur `transform`- und `opacity`-taugliche
// Werte, keine Filter (siehe Performance-Regeln).

import {
  EMBER_DURATION_BASE_S,
  EMBER_DURATION_STEP_S,
  EMBER_DURATION_VARIANTS,
  EMBER_DELAY_STEP_S,
  EMBER_DELAY_VARIANTS,
  EMBER_SIZE_BASE_PX,
  EMBER_SIZE_VARIANTS,
  EMBER_OPACITY_BASE,
  EMBER_OPACITY_STEP,
  EMBER_OPACITY_VARIANTS,
  PAUSE_DUST_LEFT_STEP_PCT,
  PAUSE_DUST_TOP_STEP_PCT,
  PAUSE_DUST_TOP_OFFSET_PCT,
  PAUSE_DUST_SIZE_BASE_PX,
  PAUSE_DUST_SIZE_VARIANTS,
  PAUSE_DUST_DELAY_STEP_S,
  PAUSE_DUST_DELAY_CYCLE_S,
  PAUSE_DUST_DURATION_BASE_S,
  PAUSE_DUST_DURATION_VARIANTS,
} from '@/config/constants'

/**
 * Ein Glutkorn des aufsteigenden Feldes.
 *
 * @param i Laufindex des Korns.
 * @param leftStepPct Waagerechter Schritt zwischen zwei Körnern. Star-Fight
 *   und Rescue-Overlay geben hier bewusst verschiedene Werte, damit die beiden
 *   Felder nicht deckungsgleich wirken.
 */
export function emberStyle(i: number, leftStepPct: number): Record<string, string> {
  const duration = EMBER_DURATION_BASE_S + (i % EMBER_DURATION_VARIANTS) * EMBER_DURATION_STEP_S
  const delay = (i % EMBER_DELAY_VARIANTS) * EMBER_DELAY_STEP_S
  const left = (i * leftStepPct) % 100
  const size = EMBER_SIZE_BASE_PX + (i % EMBER_SIZE_VARIANTS)
  const opacity = EMBER_OPACITY_BASE + (i % EMBER_OPACITY_VARIANTS) * EMBER_OPACITY_STEP
  return {
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    opacity: `${opacity}`,
  }
}

/** Ein Staubkorn des Pause-Overlays — über die ganze Fläche gestreut. */
export function pauseDustStyle(i: number): Record<string, string> {
  const left = (i * PAUSE_DUST_LEFT_STEP_PCT) % 100
  const top = (i * PAUSE_DUST_TOP_STEP_PCT + PAUSE_DUST_TOP_OFFSET_PCT) % 100
  const size = PAUSE_DUST_SIZE_BASE_PX + (i % PAUSE_DUST_SIZE_VARIANTS)
  const delay = ((i * PAUSE_DUST_DELAY_STEP_S) % PAUSE_DUST_DELAY_CYCLE_S).toFixed(1)
  const duration = (PAUSE_DUST_DURATION_BASE_S + (i % PAUSE_DUST_DURATION_VARIANTS)).toFixed(1)
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  }
}
