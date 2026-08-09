import { defineStore } from 'pinia'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import type {
  ChampionProgress,
  ChampionStats,
  ChampionRole,
  PendingPerkChoice,
  ChampionLevelCost,
} from '@/types'
import {
  CHAMPION_LEVEL_START_CAP,
  CHAMPION_LEVEL_CAP_PER_GALAXY,
  CHAMPION_LEVEL_MAX_CAP,
  CHAMPION_ALLY_XP_SHARE,
  CHAMPION_AUTO_LEVEL_MAX_PER_TICK,
  CHAMPION_LAST_STAND_HP_THRESHOLD,
  SWORN_ALLY_COUNT,
  SWORN_STAT_SHARE,
  ROLES,
} from '@/config/constants'
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
} from '@/config/champions/championLevels'
import { CHAMPION_DATA, CHAMPION_ROLES } from '@/config/champions/championData'
import { useGameStore } from '@/stores/core/gameStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { logger } from '@/utils/logger'

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
    /**
     * One switch for the whole roster: buy every level the moment it is
     * affordable, instead of waiting for a press on the level panel. Off by
     * default — it spends chimes and ascension materials on its own, and that
     * has to be the player's decision, not the state a new save starts in.
     */
    autoLevelEnabled: false,
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

    /**
     * Sworn contribution a main receives, per stat. The first SWORN_ALLY_COUNT
     * sub-slots of the role lend SWORN_STAT_SHARE of their own resolved stats;
     * the rest of the bench stays a flat headcount bonus in combatStore.
     *
     * Zero for anyone who does not hold a main slot — an ally never sworn-boosts
     * an ally, so this never recurses past one level.
     */
    swornBonusOf(): (name: string) => ChampionStats {
      return (name: string) => {
        const empty: ChampionStats = { power: 0, vitality: 0, focus: 0, fortune: 0 }
        const battleStore = useBattleStore()
        const roleIndex = battleStore.headerSlots.indexOf(name)
        if (roleIndex === -1) return empty
        const row = battleStore.secondarySlots[roleIndex] ?? []
        for (let sub = 0; sub < SWORN_ALLY_COUNT; sub++) {
          const ally = row[sub]
          if (!ally || !isLevelable(ally)) continue
          const allyStats = this.statsOf(ally)
          for (const key of Object.keys(empty) as (keyof ChampionStats)[]) {
            empty[key] += allyStats[key] * SWORN_STAT_SHARE
          }
        }
        return empty
      }
    },

    /**
     * What the champion actually fights with: its own stats plus whatever its
     * sworn allies lend it. Every multiplier below reads THIS, so the sworn bonus
     * reaches orbit DPS, battle power, cooldowns and rewards through one path.
     * `statsOf` stays the champion's own block, which is what the UI prints when
     * it wants to show base and bonus apart.
     */
    effectiveStatsOf(): (name: string) => ChampionStats {
      return (name: string) => {
        const own = this.statsOf(name)
        const sworn = this.swornBonusOf(name)
        return {
          power: own.power + sworn.power,
          vitality: own.vitality + sworn.vitality,
          focus: own.focus + sworn.focus,
          fortune: own.fortune + sworn.fortune,
        }
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

    /**
     * Whether a champion is worth a look: it banked enough XP for the next
     * level, or a milestone perk is still unspent.
     *
     * Deliberately ignores chimes and materials. The sigil board marks all 30
     * slots at once, and a chime-aware check would invalidate every marker on
     * every tick. Affordability is the level panel's job — this only says
     * "something happened here".
     */
    needsAttention(): (name: string) => boolean {
      return (name: string) => this.hasXpForNextLevel(name) || this.hasPendingPerk(name)
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
        let power = this.effectiveStatsOf(name).power
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
      return (name: string) => vitalityMult(this.effectiveStatsOf(name).vitality)
    },

    /**
     * Cooldown factor for the champion holding a role slot (lower is faster).
     * Empty slots return 1 so untouched roles behave exactly as before.
     */
    roleCooldownMult(): (roleIndex: number) => number {
      return (roleIndex: number) => {
        const name = useBattleStore().headerSlots[roleIndex]
        if (!name || !isLevelable(name)) return 1
        return focusCooldownMult(
          this.effectiveStatsOf(name).focus,
          this.perkEffectOf(name, 'cooldownRush'),
        )
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
      for (const name of mains) sum += vitalityMult(this.effectiveStatsOf(name).vitality)
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
        sum +=
          fortuneMult(this.effectiveStatsOf(name).fortune) + this.perkEffectOf(name, 'fortuneSurge')
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

    /** Grants XP to a single champion. Returns the amount actually banked.
     *  The drifter and chronicle multipliers are applied here rather than at the
     *  call sites so every XP source — battles, bosses, expeditions — is covered
     *  at once. */
    grantXp(name: string, amount: number): number {
      if (amount <= 0) return 0
      const p = this.ensure(name)
      if (!p) return 0
      const gain = Math.round(
        amount * useDrifterStore().xpMult * useOmenStore().xpMult * useAchievementStore().xpMult,
      )
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
     * Opens a perk choice if the level just reached is a milestone and the
     * champion has not already taken every perk of that pool. Shared by the
     * normal purchase and the admin shortcut so both follow the same rule.
     */
    _queuePerkIfMilestone(name: string, p: ChampionProgress): void {
      if (!isPerkLevel(p.level)) return
      if (perkChoicesFor(p.level, Object.values(p.perks)).length === 0) return
      this.pendingPerks.push({
        champion: name,
        level: p.level,
        tier: perkTierForLevel(p.level),
      })
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
        !inventoryStore.removeMaterials(cost.materials, 'level')
      ) {
        return false
      }
      gameStore.chimes -= cost.chimes
      p.xp -= xpForLevel(p.level)
      p.level += 1
      this.totalLevelsBought += 1
      this._queuePerkIfMilestone(name, p)

      logger.info('ChampionLevel', `${name} reached level ${p.level}`, { cost: cost.chimes })
      return true
    },

    /**
     * Flips the auto switch. Turning it ON settles the backlog straight away
     * rather than at the next tick — a player who enables it while champions are
     * already sitting on full XP bars expects the levels now, not in a second.
     */
    setAutoLevel(enabled: boolean): void {
      this.autoLevelEnabled = enabled
      if (enabled) this.autoLevelTick()
    },

    /**
     * Auto level-up, driven from gameStore.tick(). Buys every level the roster
     * can currently pay for — same purchase as the panel button, so XP, chimes
     * and ascension materials are all still spent and a level nobody can afford
     * simply waits until the missing part is in stock.
     *
     * Cheapest champion first, re-picked after every single level. A champion
     * gets more expensive the moment it levels, so the next-cheapest one takes
     * over on its own and a tight chime budget spreads across the roster instead
     * of pouring into whichever name happens to sit first in the save. Perk
     * milestones do NOT stop the climb — they queue up in pendingPerks exactly
     * as a manual purchase would and keep nagging until they are picked.
     *
     * Returns how many levels were bought, which is 0 on almost every tick: the
     * search below leaves after one pass over `progress` unless someone actually
     * has a full XP bank.
     */
    autoLevelTick(): number {
      if (!this.autoLevelEnabled) return 0

      let granted = 0
      while (granted < CHAMPION_AUTO_LEVEL_MAX_PER_TICK) {
        let next: string | null = null
        let bestCost = Infinity
        for (const name of Object.keys(this.progress)) {
          if (!this.canLevelUp(name)) continue
          const chimes = this.costOf(name).chimes
          if (chimes < bestCost) {
            bestCost = chimes
            next = name
          }
        }
        if (!next || !this.levelUp(next)) break
        granted++
      }

      if (granted > 0) logger.info('ChampionLevel', `Auto level-up bought ${granted} level(s)`)
      return granted
    },

    /**
     * Admin/testing shortcut: raises every champion assigned to the team —
     * mains and allies alike — by `steps` levels, free of charge and without
     * requiring banked XP. Champions already at the level cap are skipped, so
     * the button is safe to spam. Milestone perks still open normally.
     *
     * Returns how many levels were actually granted.
     */
    adminLevelUpTeam(steps: number): number {
      if (steps <= 0) return 0
      const battleStore = useBattleStore()
      const cap = this.levelCap

      // A champion could in principle sit in more than one place; a set keeps
      // it from being levelled twice in a single press.
      const roster = new Set<string>()
      for (const main of battleStore.headerSlots) if (main) roster.add(main)
      for (const row of battleStore.secondarySlots) {
        for (const ally of row) if (ally) roster.add(ally)
      }

      let granted = 0
      for (const name of roster) {
        const p = this.ensure(name)
        if (!p) continue
        for (let i = 0; i < steps && p.level < cap; i++) {
          p.level += 1
          p.xp = 0
          granted += 1
          this._queuePerkIfMilestone(name, p)
        }
      }
      this.totalLevelsBought += granted
      logger.info('ChampionLevel', `Admin granted ${granted} level(s)`, {
        steps,
        champions: roster.size,
      })
      return granted
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
      this.autoLevelEnabled = false
    },
  },
})
