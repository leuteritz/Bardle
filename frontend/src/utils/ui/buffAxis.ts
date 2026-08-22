import type { TimedBuffEffects } from '@/types'
import { DRIFTER_BUFF_EFFECT_LABELS, DRIFTER_BUFF_LABEL_ALL } from '@/config/world/drifters'

/**
 * Die zwei Ableitungen, die JEDER Zeit-Buff braucht: welche Achse er anhebt und
 * um wie viel. Drifter, Omen und die Drifter-Karte des Pause-Overlays teilen
 * sie sich — drei Abschriften derselben zwei Zeilen liefen sonst auseinander,
 * sobald jemand eine Achse dazunimmt.
 */

/** Ein Schlüssel nennt seine Achse, mehrere sagen nur, dass es mehrere sind. */
export function buffAxisLabel(effects: TimedBuffEffects): string {
  const keys = Object.keys(effects) as (keyof TimedBuffEffects)[]
  return keys.length === 1 ? DRIFTER_BUFF_EFFECT_LABELS[keys[0]] : DRIFTER_BUFF_LABEL_ALL
}

/** Der stärkste Faktor des Buffs — die Zahl, die auf dem Chip steht. */
export function buffPeakMultiplier(effects: TimedBuffEffects): number {
  const keys = Object.keys(effects) as (keyof TimedBuffEffects)[]
  if (keys.length === 0) return 1
  return Math.max(...keys.map((k) => effects[k] ?? 1))
}
