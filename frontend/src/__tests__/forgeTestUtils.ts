import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { getForgeNode } from '@/config/progression/starForge'
import type { ForgeNodeRequirement, SolarBranchId } from '@/types'

/**
 * Setzt einen Vorgänger auf eine Stufe — in den Beutel, der WIRKLICH zu ihm
 * gehört.
 *
 * `nodeLevel` fällt durch alle sechs Beutel, ein Covenant liesse sich deshalb
 * auch in `boughLevels` schreiben und der Test bestünde. Er prüfte dann
 * allerdings einen Zustand, den kein Kaufweg erzeugt.
 *
 * **Steht hier und nicht mehr in einer einzelnen Spec**, seit die Bedingungen
 * über den ganzen Baum UND den Vault verstreut sind: ein Relikt darf einen
 * Ward verlangen, eine Konstellation einen Covenant. Wer den Beutel im Test
 * hart auf `branchLevels` legt, prüft ab da einen Zustand, den es nicht gibt.
 */
export function setForgeLevel(id: string, level: number): void {
  const forge = useStarForgeStore()
  const bags: Record<string, Record<string, number>> = {
    branch: forge.branchLevels,
    leaf: forge.leafLevels,
    ward: forge.wardLevels,
    pact: forge.pactLevels,
    crown: forge.crownLevels,
    bough: forge.boughLevels,
  }
  const tier = getForgeNode(id)?.tier
  if (tier) bags[tier][id] = level
  else useSolarUpgradeStore().branchLevels[id as SolarBranchId] = level
}

/** Erfüllt eine ganze `requires`-Liste — ein Relikt, eine Konstellation, ein Knoten. */
export function meetForgeRequirements(reqs: readonly ForgeNodeRequirement[]): void {
  for (const req of reqs) setForgeLevel(req.id, req.level)
}
