import { SOLAR_BRANCHES } from '@/config/constants'
import { FORGE_NODES } from '@/config/progression/starForge'
import { MEEP_TREE_NODES } from '@/config/progression/meepTree'
import type { ForgeUpgradeTier } from '@/types'

/**
 * WER im Star-Forge-Netz einen Platz hat — und wie gross er ist.
 *
 * Die Frage stand bis hierher vierfach im Code, jedes Mal wortgleich als
 * `getForgeNode(id)?.tier ?? 'root'`: im Layout, in der Wegfindung, in der
 * Geometrie-Spec und in der Mischungs-Spec. Solange alles auf der Bühne aus
 * `FORGE_NODES` kam, war das nur eine Wiederholung. Sobald ein Knoten dazukommt,
 * der in einem ANDEREN Katalog steht, ist es ein Fehler mit vier Fundstellen —
 * die Kopien fielen still auf `'root'` zurück und gäben ihm den Durchmesser
 * eines Kernstrahls (64 statt 46).
 *
 * Deshalb eine Quelle. Sie sagt ausschliesslich, wer einen Sitz hat und welchen
 * Durchmesser er trägt; WAS ein Knoten tut, steht weiterhin in seinem eigenen
 * Katalog, und OB er gekauft ist, ausschliesslich im Store.
 *
 * Sie liegt in `config/` und importiert nur aus `config/` — die Sitzfrage darf
 * nicht an einem Store hängen, sonst könnte das Layout ohne Pinia nicht mehr
 * gerechnet werden (und keine Spec käme mehr an es heran).
 */
export interface ForgeSeatDef {
  id: string
  /** Der Schlüssel in `FORGE_NODE_DIAMETER` und `FORGE_LIMB_WIDTH`. */
  tier: ForgeUpgradeTier
}

export const FORGE_SEATS: readonly ForgeSeatDef[] = [
  ...SOLAR_BRANCHES.map((ray): ForgeSeatDef => ({ id: ray.id, tier: 'root' })),
  ...FORGE_NODES.map((def): ForgeSeatDef => ({ id: def.id, tier: def.tier })),
  // The Wandering. Der Zustand dieser Knoten bleibt beim `meepTreeStore` — hier
  // steht nur, dass sie einen Platz im Netz haben und wie gross er ist.
  ...MEEP_TREE_NODES.map((def): ForgeSeatDef => ({ id: def.id, tier: 'meep' })),
]

const SEAT_BY_ID: Record<string, ForgeSeatDef | undefined> = Object.fromEntries(
  FORGE_SEATS.map((seat) => [seat.id, seat]),
)

export function getForgeSeat(id: string): ForgeSeatDef | undefined {
  return SEAT_BY_ID[id]
}

/**
 * Der Durchmesser-Schlüssel eines Sitzes.
 *
 * Der Rückfall auf `'root'` ist der der vier Kopien: die fünf Kernstrahlen
 * stehen in keinem Knotenkatalog, sind aber Sitze. Ein unbekannter Name
 * bekommt damit dieselbe Behandlung wie ein Strahl — sichtbar gross statt
 * unsichtbar klein, und deshalb im Bild sofort als Fehler erkennbar.
 */
export function forgeSeatTier(id: string): ForgeUpgradeTier {
  return SEAT_BY_ID[id]?.tier ?? 'root'
}
