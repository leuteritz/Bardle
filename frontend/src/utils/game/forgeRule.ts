// Star Forge: welche Käufe eine REGEL verschieben statt eine Zahl zu heben.

import { getForgeNode, getForgeConstellation } from '@/config/progression/starForge'
import { FORGE_RULE_LABEL_GESTURE, FORGE_RULE_LABEL_RULE } from '@/config/constants'
import type { ForgeRuleKind } from '@/types'

/**
 * Die EINE Stelle, die beantwortet, ob ein Kauf eine Regel verschiebt.
 *
 * Zwei Kataloge, eine Frage. Der Baumknoten leitet die Antwort aus seinem RANG
 * ab (`tier === 'crown'` — eine Krone hat genau eine Stufe und `effectPerLevel`
 * ist bei ihr bedeutungslos), die Konstellation trägt sie als Feld, weil sie
 * keinen Rang hat, an dem man sie ablesen könnte.
 *
 * **Warum die fünfzehn Kronen KEIN Feld bekommen:** dasselbe Muster wie bei
 * `forgeNodeAxis()` — „Ein Knoten NENNT seine Achse nicht: sie folgt aus
 * `parentId`. Ein Feld daneben wäre eine zweite Wahrheit, die beim ersten
 * Umhängen still falsch wird." Fünfzehn Felder, die alle dasselbe sagen wie das
 * `tier` daneben, sind fünfzehn Stellen, an denen jemand eines vergisst.
 *
 * Die Confluences sind bewusst NICHT dabei. Sie sind ebenfalls Einmalkäufe,
 * aber ihre Wirkung IST eine Prozentzahl („+{v}% für jeden Knoten der Strasse")
 * — nur eine, die mit einem zweiten System wächst. Ein Siegel an ihnen hiesse,
 * das Zeichen bedeute „Einmalkauf", und dann sagte es über den Inhalt nichts
 * mehr.
 */
export function forgeRuleKind(id: string): ForgeRuleKind | null {
  const node = getForgeNode(id)
  if (node) return node.tier === 'crown' ? 'rule' : null
  return getForgeConstellation(id)?.rule ?? null
}

/**
 * Das Wort über dem Namen der Karte — leer, wenn der Kauf einen Betrag hebt.
 *
 * Beide Körperarten der Bühne füllen damit dasselbe Feld: der Baumknoten über
 * `forgeNodeTipView()`, die Fusion über `forgeFusionTipView()`. Eine Weiche je
 * Aufrufer wäre zweimal dieselbe Zuordnung.
 */
export function forgeRuleLabel(id: string): string {
  const kind = forgeRuleKind(id)
  if (kind === null) return ''
  return kind === 'gesture' ? FORGE_RULE_LABEL_GESTURE : FORGE_RULE_LABEL_RULE
}
