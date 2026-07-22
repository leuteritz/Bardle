import { defineStore } from 'pinia'
import { useGameStore } from './gameStore'
import { useShopStore } from './shopStore'
import {
  MEEP_TREE_BRANCHES,
  MEEP_TREE_NODE_INDEX,
  MEEP_TREE_MULTIPLICATIVE_KEYS,
  type MeepTreeEffects,
} from '../config/meepTree'
import { logger } from '../utils/logger'

export type MeepTreeNodeState = 'bought' | 'buyable' | 'locked'

/**
 * Meep Skill Tree — one-time upgrades bought with Meeps, arranged in
 * linear branch chains (each node requires the previous one of its branch).
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
      for (const id of this.bought) {
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
    },

    boughtCount(): number {
      return this.bought.length
    },

    /** Nodes the player could learn right now (prerequisite met + affordable). */
    buyableNodeCount(): number {
      return MEEP_TREE_BRANCHES.reduce(
        (sum, branch) =>
          sum + branch.nodes.filter((n) => this.nodeState(n.id) === 'buyable').length,
        0,
      )
    },

    /** Learnable nodes the player has NOT yet looked at — drives every
     *  "skill ready" notify badge (header slot, profile tab, and the badge
     *  hovering over the node itself). */
    notifyingNodeIds(): string[] {
      const ids: string[] = []
      for (const branch of MEEP_TREE_BRANCHES) {
        for (const n of branch.nodes) {
          if (this.nodeState(n.id) === 'buyable' && !this.acknowledged.includes(n.id)) {
            ids.push(n.id)
          }
        }
      }
      return ids
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

    /** bought / buyable (prerequisite met + affordable) / locked */
    nodeState(id: string): MeepTreeNodeState {
      const entry = MEEP_TREE_NODE_INDEX[id]
      if (!entry) return 'locked'
      if (this.isBought(id)) return 'bought'
      const prev = entry.index > 0 ? entry.branch.nodes[entry.index - 1] : null
      const prereqMet = !prev || this.isBought(prev.id)
      if (prereqMet && useGameStore().meeps >= entry.node.cost) return 'buyable'
      return 'locked'
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

    /** Prerequisite is met but the node may still be unaffordable. */
    isUnlocked(id: string): boolean {
      const entry = MEEP_TREE_NODE_INDEX[id]
      if (!entry) return false
      const prev = entry.index > 0 ? entry.branch.nodes[entry.index - 1] : null
      return !prev || this.isBought(prev.id)
    },

    buyNode(id: string): boolean {
      if (this.nodeState(id) !== 'buyable') return false
      const gameStore = useGameStore()
      const { node } = MEEP_TREE_NODE_INDEX[id]
      gameStore.meeps -= node.cost
      this.bought.push(id)
      logger.info('Game', `Meep tree node bought: ${node.name}`, { cost: node.cost })
      // Production-affecting nodes must refresh the cached CPS/CPC values
      const shopStore = useShopStore()
      gameStore.chimesPerSecond = shopStore.calculateTotalCPS()
      gameStore.chimesPerClick = shopStore.calculateTotalCPC()
      return true
    },

    branchProgress(branchId: string): { bought: number; total: number } {
      const branch = MEEP_TREE_BRANCHES.find((b) => b.id === branchId)
      if (!branch) return { bought: 0, total: 0 }
      return {
        bought: branch.nodes.filter((n) => this.isBought(n.id)).length,
        total: branch.nodes.length,
      }
    },

    resetTree() {
      this.bought = []
      this.acknowledged = []
    },
  },
})
