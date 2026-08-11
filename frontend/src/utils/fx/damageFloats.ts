// ── Schadenszahlen im Orbit ─────────────────────────────────────────────────
//
// Die Liste selbst lebt im `combatStore` (`damageFloats`) und wird von
// `ChampionOrbit` gerendert; hier steht nur, wer sie befüllt.
//
// Ausgelagert, weil inzwischen ZWEI Stores Zahlen werfen: der roleBehaviorStore
// (Heilung, Schild, Fluch, Burst) und der voidStore (Berührung). Der Zähler
// darf dabei nur EINMAL existieren — zwei Kopien vergäben dieselbe Id doppelt,
// und die `TransitionGroup` in `ChampionOrbit` verschluckt dann bei kollidierendem
// `:key` eine der beiden Zahlen.
import { useCombatStore } from '@/stores/battle/combatStore'

let floatId = 900_000

/**
 * Eine Zahl über einem Orbit-Körper aufsteigen lassen.
 *
 * `extra` setzt die Variante (`healFloat`, `shieldFloat`, `voidFloat`, …) —
 * die Klassen dazu stehen in `ChampionOrbit.vue`.
 */
export function spawnFloat(
  value: number,
  x: number,
  y: number,
  durationMs: number,
  extra: Record<string, boolean> = {},
): void {
  const combatStore = useCombatStore()
  combatStore.damageFloats.push({
    id: floatId++,
    value,
    x,
    y,
    expiresAt: Date.now() + durationMs,
    ...extra,
  } as (typeof combatStore.damageFloats)[number])
}
