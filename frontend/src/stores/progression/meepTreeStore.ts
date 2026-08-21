import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import {
  MEEP_TREE_BRANCHES,
  MEEP_TREE_NODES,
  MEEP_TREE_NODE_INDEX,
  MEEP_TREE_MULTIPLICATIVE_KEYS,
  MEEP_TREE_TIERS_PER_BRANCH,
  type MeepTreeEffects,
} from '@/config/progression/meepTree'
import { logger } from '@/utils/logger'

/**
 * Fold a set of node ids into one effect bag. Shared by `fx` (what the player
 * owns) and `previewFx` (what one more node would make of it) so the two can
 * never disagree about which keys multiply and which add up.
 */
function foldEffects(ids: readonly string[]): MeepTreeEffects {
  const result = {
    cpsMult: 1,
    cpcMult: 1,
    doubleClickChance: 0,
    cpcFromCpsPct: 0,
    meepCostMult: 1,
    meepPowerMult: 1,
    powerBonus: 0,
    expeditionRewardMult: 1,
    expeditionSpeedMult: 1,
    championDpsMult: 1,
    bossDamageMult: 1,
    materialDropMult: 1,
    hpRegenPerSec: 0,
    damageTakenMult: 1,
    offlineEarningsMult: 1,
    offlineMaxHoursBonus: 0,
  } satisfies MeepTreeEffects
  for (const id of ids) {
    const entry = MEEP_TREE_NODE_INDEX[id]
    if (!entry) continue
    for (const [key, val] of Object.entries(entry.node.effects)) {
      const k = key as keyof MeepTreeEffects
      if (MEEP_TREE_MULTIPLICATIVE_KEYS.includes(k)) {
        result[k] *= val
      } else {
        result[k] += val
      }
    }
  }
  return result
}

/**
 * `reachable` and `blocked` are the two states the tree gained with the rank-4
 * fork: `reachable` means "open, but you cannot pay yet" (it used to live in
 * the node component as a derived flag), `blocked` means "the sibling was
 * taken — this one is gone for good".
 */
export type MeepTreeNodeState = 'bought' | 'buyable' | 'reachable' | 'locked' | 'blocked'

/**
 * Meep Skill Tree — one-time upgrades bought with Meeps, arranged in branch
 * chains of five ranks. A node opens once ANY node of the rank below it is
 * learned; at rank 4 two nodes share a rank and seal each other.
 * Folded effects are consumed all over the game (CPS/CPC pipeline, battle,
 * bosses, expeditions, offline progress, …) analogous to the Star Forge.
 */
export const useMeepTreeStore = defineStore('meepTree', {
  state: () => ({
    /** Bought node ids */
    bought: [] as string[],
    /** Node ids the player has already looked at (hovered) while they were
     *  learnable — hides that node's "ready to learn" notification until it
     *  leaves the buyable state and becomes affordable again. */
    acknowledged: [] as string[],
  }),

  getters: {
    /** All effects of every bought node folded into one bag. */
    fx(): MeepTreeEffects {
      return foldEffects(this.bought)
    },

    boughtCount(): number {
      return this.bought.length
    },

    /** Nodes the player could learn right now (prerequisite met + affordable). */
    buyableNodeCount(): number {
      return MEEP_TREE_NODES.filter((n) => this.nodeState(n.id) === 'buyable').length
    },

    /** Learnable nodes the player has NOT yet looked at — drives every
     *  "skill ready" notify badge (header slot, profile tab, and the badge
     *  hovering over the node itself).
     *  Both sides of an untouched fork notify: choosing between them IS the
     *  decision the badge is pointing at. */
    notifyingNodeIds(): string[] {
      return MEEP_TREE_NODES.filter(
        (n) => this.nodeState(n.id) === 'buyable' && !this.acknowledged.includes(n.id),
      ).map((n) => n.id)
    },

    /** Count behind the notify badges — shrinks as nodes get hovered. */
    unseenBuyableCount(): number {
      return this.notifyingNodeIds.length
    },
  },

  actions: {
    isBought(id: string): boolean {
      return this.bought.includes(id)
    },

    /**
     * The order of these checks IS the rule.
     *
     * `blocked` is tested BEFORE the prerequisite: the sibling that sealed this
     * node had the same prerequisite, so a prerequisite check would happily
     * report `buyable` for a node that can never be learned again.
     */
    nodeState(id: string): MeepTreeNodeState {
      const entry = MEEP_TREE_NODE_INDEX[id]
      if (!entry) return 'locked'
      if (this.isBought(id)) return 'bought'
      if (entry.excl.some((rival) => this.isBought(rival))) return 'blocked'
      if (entry.req.length > 0 && !entry.req.some((r) => this.isBought(r))) return 'locked'
      return useGameStore().meeps >= entry.node.cost ? 'buyable' : 'reachable'
    },

    /** Mark a node as looked at → removes its notify badge and drops the
     *  header/tab counts by one. No-op once already acknowledged or bought. */
    acknowledgeNode(id: string) {
      if (this.nodeState(id) !== 'buyable') return
      if (!this.acknowledged.includes(id)) this.acknowledged.push(id)
    },

    /** Drop acknowledgements for nodes that are no longer learnable so they
     *  re-notify once they become affordable again. Called from the game tick. */
    syncAcknowledged() {
      if (this.acknowledged.length === 0) return
      const next = this.acknowledged.filter((id) => this.nodeState(id) === 'buyable')
      if (next.length !== this.acknowledged.length) this.acknowledged = next
    },

    /**
     * Badge Lab: genau n lernbare Knoten unquittiert lassen.
     *
     * Direkt statt über `acknowledgeNode`: die prüft je ID einzeln und käme auf
     * dasselbe Ergebnis zu n-fachem Preis. Was hier geschrieben wird, IST
     * buyable — `syncAcknowledged()` im Tick lässt es also stehen.
     */
    adminSetUnseen(n: number): number {
      const buyable = MEEP_TREE_NODES.filter((x) => this.nodeState(x.id) === 'buyable').map(
        (x) => x.id,
      )
      this.acknowledged = buyable.slice(Math.max(0, n))
      return Math.min(Math.max(0, n), buyable.length)
    },

    /**
     * The effect bag as it WOULD read with this one node added — the basis of
     * every before/after row in the skill sheet. Never mutates `fx`.
     */
    previewFx(id: string): MeepTreeEffects {
      return this.isBought(id) ? this.fx : foldEffects([...this.bought, id])
    },

    /**
     * The still-unlearned chain from the branch root up to `id`, in order.
     * Empty when the node itself is already learnable, `null` when it is
     * sealed — the sheet writes "Other branch taken" in that case.
     *
     * At a rank the player has not decided yet, the first sibling stands in.
     * That is preferential only in appearance: both sides of a fork cost the
     * same, so the sum this feeds is the same either way.
     */
    pathTo(id: string): string[] | null {
      const entry = MEEP_TREE_NODE_INDEX[id]
      if (!entry || this.nodeState(id) === 'blocked') return null
      const chain: string[] = []
      const ranks = entry.branch.nodes
      for (let tier = 0; tier <= entry.node.tier; tier++) {
        const atTier = ranks.filter((n) => n.tier === tier)
        if (atTier.some((n) => this.isBought(n.id))) continue
        const pick = tier === entry.node.tier ? entry.node : atTier[0]
        chain.push(pick.id)
      }
      return chain
    },

    /** What the whole chain up to `id` still costs; `null` when it is sealed. */
    meepsToReach(id: string): number | null {
      const chain = this.pathTo(id)
      if (!chain) return null
      return chain.reduce((sum, nid) => sum + (MEEP_TREE_NODE_INDEX[nid]?.node.cost ?? 0), 0)
    },

    buyNode(id: string): boolean {
      if (this.nodeState(id) !== 'buyable') return false
      const gameStore = useGameStore()
      const { node } = MEEP_TREE_NODE_INDEX[id]
      gameStore.meeps -= node.cost
      // Der Baum ist die einzige Senke der Währung — ohne diese Zeile stand
      // „Meeps spent" im Katalog und im Header dauerhaft auf 0.
      gameStore.totalMeepsSpent += node.cost
      this.bought.push(id)
      logger.info('Game', `Meep tree node bought: ${node.name}`, { cost: node.cost })
      // Production-affecting nodes must refresh the cached CPS/CPC values
      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()
      return true
    },

    /**
     * Counted in RANKS, not in nodes: a branch has five steps, and the fork at
     * rank 4 offers two ways to take one of them — never two steps.
     */
    branchProgress(branchId: string): { bought: number; total: number } {
      const branch = MEEP_TREE_BRANCHES.find((b) => b.id === branchId)
      if (!branch) return { bought: 0, total: 0 }
      const ranksTaken = new Set(branch.nodes.filter((n) => this.isBought(n.id)).map((n) => n.tier))
      return { bought: ranksTaken.size, total: MEEP_TREE_TIERS_PER_BRANCH }
    },

    resetTree() {
      this.bought = []
      this.acknowledged = []
    },

    /** Production-affecting nodes must refresh the cached CPS/CPC values. */
    refreshProduction() {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()
    },

    /**
     * Admin: instantly learn a COMPLETE tree for free and refresh production.
     * At a fork it always takes the first sibling — taking both would be a
     * state the game can never reach, and the folded effects would read higher
     * than any real save could.
     */
    adminUnlockAll() {
      this.bought = MEEP_TREE_BRANCHES.flatMap((b) =>
        Array.from({ length: MEEP_TREE_TIERS_PER_BRANCH }, (_, tier) =>
          b.nodes.find((n) => n.tier === tier),
        )
          .filter((n): n is NonNullable<typeof n> => n !== undefined)
          .map((n) => n.id),
      )
      this.acknowledged = []
      this.refreshProduction()
      logger.info('Game', 'Admin: unlocked all Meep tree nodes', { count: this.bought.length })
    },

    /** Admin: unlearn every tree node and refresh production. */
    adminResetAll() {
      const count = this.bought.length
      this.bought = []
      this.acknowledged = []
      this.refreshProduction()
      logger.info('Game', 'Admin: reset all Meep tree nodes', { count })
    },
  },
})
