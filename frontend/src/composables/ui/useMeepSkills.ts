import { computed, type ComputedRef } from 'vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { MEEP_TREE_NODES, MEEP_TREE_NODE_INDEX } from '@/config/progression/meepTree'
import { MEEP_TREE_EFFECT_ROWS } from '@/config/constants'
import { formatMeepEffect } from '@/utils/game/meepTreeFx'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import type {
  MeepSkillBucketId,
  MeepSkillChange,
  MeepSkillDetail,
  MeepSkillEntry,
} from '@/types'

/**
 * Der Meep-Baum als LISTE — die eine Quelle, aus der Empfehlungspanel, Karte
 * und schwebendes Kärtchen lesen.
 *
 * Entsprechung zu `useForgeUpgrades` im Shop, und aus demselben Grund ein
 * Composable statt eines Store-Getters: hier steht nichts, was in einen
 * Spielstand gehört. Der Store führt `bought` und `acknowledged`; alles andere
 * ist Ansicht und wird bei jedem Lesen aus ihnen abgeleitet. Ein Kauf in der
 * Liste färbt den Kreis auf der Orbit-Bühne im selben Frame, weil beide Seiten
 * dieselben Pinia-Getter lesen und nichts zwischenspeichern.
 *
 * **Warum die Vorher/Nachher-Zeilen NICHT im Eintrag stehen:** jede kostet ein
 * vollständiges `previewFx()`, also ein Falten aller gekauften Knoten. In der
 * Liste stünde das dreißigmal, gelesen wird es höchstens zweimal. Sie kommen
 * deshalb einzeln über `detailFor(id)` — siehe `MeepSkillDetail`.
 */

/** Woher die Live-Werte kommen, an denen ein `liveStat` skaliert. */
const LIVE_UNIT = { chimesPerSecond: '/s', chimesPerClick: '' } as const

/**
 * Wohin ein Eintrag in der Liste fällt.
 *
 * Reine Funktion und kein `computed`, damit die Liste sie zum EINFRIEREN
 * aufrufen kann: solange der Zeiger sie hält, merkt sie sich das Ergebnis je
 * Knoten, statt es neu zu erfragen (Muster `frozenBuckets` in
 * `ForgeUpgradesSection`). Ohne das wechselte eine Karte den Topf in dem
 * Moment, in dem der Zeiger sie berührt — `acknowledgeNode` macht aus `fresh`
 * ein `ready`, und der Knopf rutschte unter der Hand weg.
 */
export function meepSkillBucket(entry: MeepSkillEntry): MeepSkillBucketId {
  switch (entry.state) {
    case 'bought':
      return 'learned'
    case 'blocked':
      return 'sealed'
    case 'reachable':
      return 'reach'
    case 'locked':
      return 'locked'
    default:
      return entry.notifying ? 'fresh' : 'ready'
  }
}

export function useMeepSkills(): {
  skillEntries: ComputedRef<MeepSkillEntry[]>
  entryById: ComputedRef<Map<string, MeepSkillEntry>>
  bestBuyId: ComputedRef<string | null>
  detailFor: (id: string) => MeepSkillDetail
  buySkill: (id: string) => boolean
} {
  const gameStore = useGameStore()
  const meepTree = useMeepTreeStore()

  /**
   * Ein Eintrag je Katalogknoten — auch für gelernte und versiegelte. Sie
   * stehen im Archiv am Listenende, und ein zweiter Weg zu ihren Namen wäre
   * eine zweite Fassung derselben Daten.
   */
  const skillEntries = computed<MeepSkillEntry[]>(() => {
    const notifying = new Set(meepTree.notifyingNodeIds)

    return MEEP_TREE_NODES.map((node) => {
      const { branch, excl } = MEEP_TREE_NODE_INDEX[node.id]
      const state = meepTree.nodeState(node.id)
      const chain = meepTree.pathTo(node.id)

      return {
        id: node.id,
        name: node.name,
        icon: node.icon,
        effect: node.effect,
        desc: node.desc,
        cost: node.cost,
        branchId: branch.id,
        branchName: branch.name,
        color: branch.color,
        rank: node.tier + 1,
        state,
        canBuy: state === 'buyable',
        canAfford: gameStore.meeps >= node.cost,
        missing: Math.max(0, node.cost - gameStore.meeps),
        notifying: notifying.has(node.id),
        rivals: excl
          .map((id) => MEEP_TREE_NODE_INDEX[id]?.node)
          .filter((n): n is NonNullable<typeof n> => Boolean(n))
          .map((n) => ({ id: n.id, name: n.name })),
        prerequisites: (chain ?? [])
          .filter((id) => id !== node.id)
          .map((id) => MEEP_TREE_NODE_INDEX[id]?.node)
          .filter((n): n is NonNullable<typeof n> => Boolean(n))
          .map((n) => ({ id: n.id, name: n.name, icon: n.icon, cost: n.cost })),
        pathCost: meepTree.meepsToReach(node.id),
      } satisfies MeepSkillEntry
    })
  })

  const entryById = computed(() => new Map(skillEntries.value.map((e) => [e.id, e])))

  /**
   * Der günstigste Knoten, den der Bestand gerade deckt.
   *
   * „Günstigster" und nicht „stärkster", und das ist keine Bequemlichkeit: die
   * Wirkungen des Baums stehen in Prozent, HP, Stunden und Chimes nebeneinander
   * — es gibt keine Einheit, in der `+6 % Expeditionsertrag` und `+1 HP Regen/s`
   * vergleichbar wären. Der Preis ist die einzige Zahl, die alle dreißig Knoten
   * teilen. Dieselbe Regel trägt `useForgeUpgrades.bestBuyId`, und der Store
   * schreibt sie seit jeher an `suggestedNodeIds()`.
   *
   * Bei Preisgleichstand gewinnt der niedrigere Rang: an einer Gabel kosten
   * beide Seiten gleich (das bindet `meepEconomy.spec.ts`), und ohne das
   * Kriterium hinge die Empfehlung an der Katalogreihenfolge.
   */
  const bestBuyId = computed<string | null>(() => {
    let best: MeepSkillEntry | null = null
    for (const entry of skillEntries.value) {
      if (!entry.canBuy) continue
      if (best === null || entry.cost < best.cost || (entry.cost === best.cost && entry.rank < best.rank)) {
        best = entry
      }
    }
    return best?.id ?? null
  })

  /**
   * Was dieser eine Knoten am Spiel ändert — die Zeilen sind EXAKT, nicht
   * geschätzt.
   *
   * `cpsMult`/`cpcMult` tragen ein `liveStat` und skalieren einen bereits
   * gecachten Spielwert: weil der Faktor in `shopStore.calculateTotalCPS/CPC()`
   * multiplikativ eingeht, ist `Wert × Zuwachs` das echte Ergebnis, kein
   * Näherungswert. Alle übrigen zeigen den gefalteten BAUM-Wert selbst; das ist
   * der ehrliche Beitrag des Baums und braucht keine Nachsimulation fremder
   * Systeme.
   *
   * Stand bis zum Umbau in `MeepSkillDetails.vue` — unverändert übernommen,
   * nur an eine Stelle gerückt, an der auch das Kärtchen sie lesen kann.
   */
  function detailFor(id: string): MeepSkillDetail {
    const node = MEEP_TREE_NODE_INDEX[id]?.node
    if (!node) return { changes: [], tags: [] }

    const before = meepTree.fx as unknown as Record<string, number>
    const after = meepTree.previewFx(id) as unknown as Record<string, number>
    const live = {
      chimesPerSecond: gameStore.chimesPerSecond,
      chimesPerClick: gameStore.chimesPerClick,
    } as const

    const changes: MeepSkillChange[] = MEEP_TREE_EFFECT_ROWS.filter(
      (row) => row.key in node.effects,
    ).map((row) => {
      if (row.liveStat) {
        const now = live[row.liveStat]
        const grow = after[row.key] / (before[row.key] || 1)
        return {
          key: row.key,
          label: row.label,
          tag: row.tag,
          from: `${formatNumberCompact(now)}${LIVE_UNIT[row.liveStat]}`,
          to: `${formatNumberCompact(now * grow)}${LIVE_UNIT[row.liveStat]}`,
          good: grow > 1,
        }
      }
      const from = formatMeepEffect(row.kind, before[row.key])
      const to = formatMeepEffect(row.kind, after[row.key])
      return {
        key: row.key,
        label: row.label,
        tag: row.tag,
        from: from?.value ?? '—',
        to: to?.value ?? '—',
        // Bei `lower` ist kleiner besser — die Richtung steckt schon im `kind`.
        good:
          row.kind === 'lower' ? after[row.key] < before[row.key] : after[row.key] > before[row.key],
      }
    })

    const seen = new Set<string>()
    const tags = changes
      .map((c) => c.tag)
      .filter((t) => (seen.has(t.label) ? false : (seen.add(t.label), true)))

    return { changes, tags }
  }

  /**
   * Durchgereicht, nicht nachgebaut: `buyNode` prüft den Zustand selbst, zieht
   * die Meeps ab, führt `totalMeepsSpent` mit und rechnet CPS/CPC neu.
   */
  function buySkill(id: string): boolean {
    return meepTree.buyNode(id)
  }

  return { skillEntries, entryById, bestBuyId, detailFor, buySkill }
}
