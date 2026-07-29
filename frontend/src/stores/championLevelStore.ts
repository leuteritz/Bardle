import { defineStore } from 'pinia'
import type {
  ChampionProgress,
  ChampionStats,
  ChampionRole,
  PendingPerkChoice,
  ChampionLevelCost,
} from '../types'
import {
  CHAMPION_LEVEL_START_CAP,
  CHAMPION_LEVEL_CAP_PER_GALAXY,
  CHAMPION_LEVEL_MAX_CAP,
  CHAMPION_ALLY_XP_SHARE,
  CHAMPION_LAST_STAND_HP_THRESHOLD,
  ROLES,
} from '../config/constants'
import {
  xpForLevel,
  resolveChampionStats,
  levelUpCost,
  isPerkLevel,
  perkTierForLevel,
  perkChoicesFor,
  powerDpsMult,
  vitalityMult,
  focusCooldownMult,
  fortuneMult,
  ascensionStars,
  ascensionRank,
  PERK_BY_ID,
} from '../config/championLevels'
import { CHAMPION_DATA, CHAMPION_ROLES } from '../config/championData'
import { useGameStore } from './gameStore'
import { useInventoryStore } from './inventoryStore'
import { useBattleStore } from './battleStore'
import { useGalaxyStore } from './galaxyStore'
import { usePlayerStore } from './playerStore'
import { logger } from '../utils/logger'

export function defaultChampionProgress(): ChampionProgress {
  return { level: 1, xp: 0, totalXp: 0, perks: {} }
}

/** Bard is the player avatar, not a recruitable champion — it never levels. */
function isLevelable(name: string): boolean {
  return !!CHAMPION_DATA[name]
}

function roleOf(name: string): ChampionRole {
  return CHAMPION_ROLES[name] ?? 'mid'
}

export const useChampionLevelStore = defineStore('championLevel', {
  state: () => ({
    /** Champion name → progression. Created lazily on first XP or first read. */
    progress: {} as Record<string, ChampionProgress>,
    /** Milestones reached but not yet spent — the UI nags until they are picked. */
    pendingPerks: [] as PendingPerkChoice[],
    /** Lifetime counters for the Bard Stats catalog. */
    totalXpEarned: 0,
    totalLevelsBought: 0,
  }),

  getters: {
    /** Level ceiling — starts at 20 and rises with every galaxy reached. */
    levelCap(): number {
      const galaxy = useGalaxyStore().currentGalaxy
      return Math.min(
        CHAMPION_LEVEL_MAX_CAP,
        CHAMPION_LEVEL_START_CAP + Math.max(0, galaxy - 1) * CHAMPION_LEVEL_CAP_PER_GALAXY,
      )
    },

    /** Progression of a champion — a default block for anyone not tracked yet. */
    progressOf:
      (state) =>
      (name: string): ChampionProgress =>
        state.progress[name] ?? defaultChampionProgress(),

    levelOf(): (name: string) => number {
      return (name: string) => this.progressOf(name).level
    },

    perkIdsOf(): (name: string) => string[] {
      return (name: string) => Object.values(this.progressOf(name).perks)
    },

    /** Resolved stat block at the champion's current level, perks included. */
    statsOf(): (name: string) => ChampionStats {
      return (name: string) => {
        const p = this.progressOf(name)
        return resolveChampionStats(name, p.level, roleOf(name), Object.values(p.perks))
      }
    },

    ascensionOf(): (name: string) => { stars: number; rank: ReturnType<typeof ascensionRank> } {
      return (name: string) => {
        const level = this.levelOf(name)
        return { stars: ascensionStars(level), rank: ascensionRank(level) }
      }
    },

    /** XP bar data: earned in this level, needed for the next, and the ratio. */
    xpBarOf(): (name: string) => { current: number; needed: number; pct: number; capped: boolean } {
      return (name: string) => {
        const p = this.progressOf(name)
        const capped = p.level >= this.levelCap
        const needed = xpForLevel(p.level)
        const pct = capped ? 1 : Math.min(1, p.xp / needed)
        return { current: p.xp, needed, pct, capped }
      }
    },

    costOf(): (name: string) => ChampionLevelCost {
      return (name: string) => levelUpCost(name, this.levelOf(name))
    },

    /** Enough XP banked to buy the next level (ignores chimes and materials). */
    hasXpForNextLevel(): (name: string) => boolean {
      return (name: string) => {
        const p = this.progressOf(name)
        if (p.level >= this.levelCap) return false
        return p.xp >= xpForLevel(p.level)
      }
    },

    /** Everything checked: XP banked, chimes and materials in stock, cap not hit. */
    canLevelUp(): (name: string) => boolean {
      return (name: string) => {
        if (!isLevelable(name)) return false
        if (!this.hasXpForNextLevel(name)) return false
        const cost = this.costOf(name)
        if (useGameStore().chimes < cost.chimes) return false
        return useInventoryStore().hasMaterials(cost.materials)
      }
    },

    /** Why the upgrade button is disabled — drives the UI hint. */
    blockReasonOf(): (name: string) => 'cap' | 'xp' | 'chimes' | 'materials' | null {
      return (name: string) => {
        if (this.levelOf(name) >= this.levelCap) return 'cap'
        if (!this.hasXpForNextLevel(name)) return 'xp'
        const cost = this.costOf(name)
        if (useGameStore().chimes < cost.chimes) return 'chimes'
        if (!useInventoryStore().hasMaterials(cost.materials)) return 'materials'
        return null
      }
    },

    /** Perk options for a pending milestone of this champion (empty if none open). */
    perkChoicesOf(): (name: string) => ReturnType<typeof perkChoicesFor> {
      return (name: string) => {
        const pending = this.pendingPerks.find((p) => p.champion === name)
        if (!pending) return []
        return perkChoicesFor(pending.level, this.perkIdsOf(name))
      }
    },

    hasPendingPerk(): (name: string) => boolean {
      return (name: string) => this.pendingPerks.some((p) => p.champion === name)
    },

    // ── Effect getters — the only surface the rest of the game reads ──────────

    /** Value of a perk effect if this champion owns it, else 0. */
    perkEffectOf(): (name: string, effect: string) => number {
      return (name: string, effect: string) => {
        for (const id of this.perkIdsOf(name)) {
          const perk = PERK_BY_ID[id]
          if (perk?.effect === effect) return perk.value ?? 0
        }
        return 0
      }
    },

    /**
     * Orbit damage multiplier of one champion — POWER plus the Last Stand surge
     * while the player is low. Execute and crit are resolved per hit in
     * combatStore, since they depend on the boss and on chance.
     */
    orbitDpsMultOf(): (name: string) => number {
      return (name: string) => {
        let power = this.statsOf(name).power
        const lastStand = this.perkEffectOf(name, 'lastStand')
        if (lastStand > 0) {
          const player = usePlayerStore()
          if (
            player.maxHP > 0 &&
            player.currentHP / player.maxHP <= CHAMPION_LAST_STAND_HP_THRESHOLD
          ) {
            power *= 1 + lastStand
          }
        }
        return powerDpsMult(power)
      }
    },

    /** How much each assigned ally of this role adds, as a multiplier on the base share. */
    allyContributionMultOf(): (name: string) => number {
      return (name: string) => 1 + this.perkEffectOf(name, 'allyEcho')
    },

    /** VITALITY multiplier — star fight HP and auto-battle power. */
    vitalityMultOf(): (name: string) => number {
      return (name: string) => vitalityMult(this.statsOf(name).vitality)
    },

    /**
     * Cooldown factor for the champion holding a role slot (lower is faster).
     * Empty slots return 1 so untouched roles behave exactly as before.
     */
    roleCooldownMult(): (roleIndex: number) => number {
      return (roleIndex: number) => {
        const name = useBattleStore().headerSlots[roleIndex]
        if (!name || !isLevelable(name)) return 1
        return focusCooldownMult(this.statsOf(name).focus, this.perkEffectOf(name, 'cooldownRush'))
      }
    },

    /** Role ability strength (heal amount, burst damage, curse damage) for a slot. */
    roleAbilityMult(): (roleIndex: number) => number {
      return (roleIndex: number) => {
        const name = useBattleStore().headerSlots[roleIndex]
        if (!name || !isLevelable(name)) return 1
        return 1 + this.perkEffectOf(name, 'abilityPower')
      }
    },

    /**
     * Team-wide VITALITY multiplier — the average over the filled main slots.
     * Feeds gameStore.totalPower, so levelled champions win auto battles more
     * often instead of only hitting planet bosses harder.
     */
    teamVitalityMult(): number {
      const mains = useBattleStore().headerSlots.filter((n): n is string => !!n && isLevelable(n))
      if (mains.length === 0) return 1
      let sum = 0
      for (const name of mains) sum += vitalityMult(this.statsOf(name).vitality)
      return sum / mains.length
    },

    /**
     * Team-wide FORTUNE multiplier — the average over the filled main slots, so
     * a full roster of levelled champions pays off without a single hero
     * carrying the whole economy.
     */
    teamFortuneMult(): number {
      const mains = useBattleStore().headerSlots.filter((n): n is string => !!n && isLevelable(n))
      if (mains.length === 0) return 1
      let sum = 0
      for (const name of mains) {
        sum += fortuneMult(this.statsOf(name).fortune) + this.perkEffectOf(name, 'fortuneSurge')
      }
      return sum / mains.length
    },

    /** Champions with a level above 1 — the Bard Stats "trained" counter. */
    trainedChampionCount(state): number {
      return Object.values(state.progress).filter((p) => p.level > 1).length
    },
  },

  actions: {
    /** Creates the progression block for a champion on first use. */
    ensure(name: string): ChampionProgress | null {
      if (!isLevelable(name)) return null
      return (this.progress[name] ??= defaultChampionProgress())
    },

    /** Grants XP to a single champion. Returns the amount actually banked. */
    grantXp(name: string, amount: number): number {
      if (amount <= 0) return 0
      const p = this.ensure(name)
      if (!p) return 0
      const gain = Math.round(amount)
      p.xp += gain
      p.totalXp += gain
      this.totalXpEarned += gain
      return gain
    },

    /**
     * Spreads XP across the roster: the main of each role banks the full amount,
     * every assigned ally of that role banks CHAMPION_ALLY_XP_SHARE of it.
     * Benched champions get nothing.
     */
    grantTeamXp(amount: number): void {
      if (amount <= 0) return
      const battleStore = useBattleStore()
      const allyAmount = amount * CHAMPION_ALLY_XP_SHARE
      for (let role = 0; role < ROLES.length; role++) {
        const main = battleStore.headerSlots[role]
        if (main) this.grantXp(main, amount)
        const allies = battleStore.secondarySlots[role] ?? []
        for (const ally of allies) {
          if (ally) this.grantXp(ally, allyAmount)
        }
      }
    },

    /**
     * Grants XP to one champion and, if it holds a role slot, trickles the ally
     * share down that role's bench. Used by the auto battle, where the payout
     * is individual (kills, MVP) rather than team-wide.
     */
    grantXpWithAllies(name: string, amount: number): void {
      if (amount <= 0) return
      this.grantXp(name, amount)
      const battleStore = useBattleStore()
      const roleIndex = battleStore.headerSlots.indexOf(name)
      if (roleIndex === -1) return
      const allies = battleStore.secondarySlots[roleIndex] ?? []
      for (const ally of allies) {
        if (ally) this.grantXp(ally, amount * CHAMPION_ALLY_XP_SHARE)
      }
    },

    /**
     * Buys one level: spends the banked XP, the chimes and — on ascension
     * levels — the materials. Returns false and changes nothing if anything
     * is missing.
     */
    levelUp(name: string): boolean {
      if (!this.canLevelUp(name)) return false
      const p = this.ensure(name)
      if (!p) return false

      const cost = this.costOf(name)
      const gameStore = useGameStore()
      const inventoryStore = useInventoryStore()

      // Materials first — removeMaterials is the only step that can still fail.
      if (
        Object.keys(cost.materials).length > 0 &&
        !inventoryStore.removeMaterials(cost.materials)
      ) {
        return false
      }
      gameStore.chimes -= cost.chimes
      p.xp -= xpForLevel(p.level)
      p.level += 1
      this.totalLevelsBought += 1

      if (isPerkLevel(p.level) && perkChoicesFor(p.level, Object.values(p.perks)).length > 0) {
        this.pendingPerks.push({
          champion: name,
          level: p.level,
          tier: perkTierForLevel(p.level),
        })
      }

      logger.info('ChampionLevel', `${name} reached level ${p.level}`, { cost: cost.chimes })
      return true
    },

    /** Locks in a perk for an open milestone. */
    choosePerk(name: string, perkId: string): boolean {
      const idx = this.pendingPerks.findIndex((p) => p.champion === name)
      if (idx === -1) return false
      const pending = this.pendingPerks[idx]
      const p = this.ensure(name)
      if (!p) return false

      const valid = perkChoicesFor(pending.level, Object.values(p.perks)).some(
        (c) => c.id === perkId,
      )
      if (!valid) return false

      p.perks[pending.level] = perkId
      this.pendingPerks.splice(idx, 1)
      logger.info('ChampionLevel', `${name} took perk ${perkId}`, { level: pending.level })
      return true
    },

    /**
     * Drops progression for champions that no longer exist and prunes perk
     * choices whose champion left the roster — keeps old saves loadable.
     */
    prune(): void {
      for (const name of Object.keys(this.progress)) {
        if (!isLevelable(name)) delete this.progress[name]
      }
      this.pendingPerks = this.pendingPerks.filter((p) => !!this.progress[p.champion])
    },

    /** Full wipe — only used by resetGame(); prestige keeps champion levels. */
    resetAll(): void {
      this.progress = {}
      this.pendingPerks = []
      this.totalXpEarned = 0
      this.totalLevelsBought = 0
    },
  },
})
