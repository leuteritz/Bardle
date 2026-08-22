import { computed, type ComputedRef, type Ref } from 'vue'
import { useGameStore } from '@/stores/core/gameStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { usePlanetShopStore, PLANET_ROLES_LIST } from '@/stores/world/planetShopStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { useSynergyStore } from '@/stores/champions/synergyStore'
import { useAugmentStore } from '@/stores/economy/augmentStore'
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { useOmenStore } from '@/stores/progression/omenStore'
import { useMissionStore } from '@/stores/progression/missionStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useSectionStore } from '@/stores/core/sectionStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { STAT_CATEGORIES } from '@/config/ui/statCategories'
import { formatNumber } from '@/config/ui/numberFormat'
import { formatCompactDuration } from '@/utils/ui/format'
import { MATERIALS } from '@/config/economy/materials'
import { AUGMENTS } from '@/config/economy/augments'
import { ITEM_SETS } from '@/config/economy/items'
import {
  FORGE_BRANCHES,
  FORGE_LEAVES,
  FORGE_RELICS,
  FORGE_CONSTELLATIONS,
} from '@/config/progression/starForge'
import { MEEP_TREE_BRANCHES, MEEP_TREE_PATH_NODES } from '@/config/progression/meepTree'
import { CHRONICLE_TOTAL_STAGES } from '@/config/progression/achievements'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  SOLAR_MAX_LEVELS,
  TOTAL_SECTIONS,
  ITEM_SLOT_COUNT,
  BATTLE_TOTAL_GAME_SECONDS,
  SECONDS_PER_HOUR,
  RESONANCE_MAX_STACKS,
} from '@/config/constants'
import type { StatCategoryId, StatCategoryView, StatEntry } from '@/types'

/* ── Value formatters — one place, so every row reads the same ───────────── */
const num = (n: number): string => formatNumber(Math.round(n))
const dec = (n: number, digits = 2): string => n.toFixed(digits)
const int = (n: number): string => String(Math.round(n))
/** A ratio like 0.54 → "54%". */
const pct = (fraction: number): string => `${Math.round(fraction * 100)}%`
/** A multiplier like 1.25 → "+25%"; below 1 it reads as a reduction. */
const bonus = (multiplier: number): string => {
  const delta = Math.round((multiplier - 1) * 100)
  return delta >= 0 ? `+${delta}%` : `${delta}%`
}
const mult = (m: number): string => `×${m.toFixed(2)}`
const dur = (ms: number): string => (ms > 0 ? formatCompactDuration(ms) : '—')
const ratio = (a: number, b: number): string => `${int(a)} / ${int(b)}`

/**
 * Every readable number in Bardle, grouped into the categories of
 * `config/ui/statCategories.ts` and filtered by a free-text query.
 *
 * Display-only: the composable reads stores and formats, it never mutates.
 * Adding a stat means adding one `StatEntry` to the matching builder below —
 * search, counting and the accordion pick it up automatically.
 */
export function useStatCatalog(query: Ref<string>): {
  categories: ComputedRef<StatCategoryView[]>
  totalStatCount: ComputedRef<number>
  matchCount: ComputedRef<number>
} {
  const gameStore = useGameStore()
  const shopStore = useShopStore()
  const battleStore = useBattleStore()
  const galaxyStore = useGalaxyStore()
  const starGroupStore = useStarGroupStore()
  const planetBossStore = usePlanetBossStore()
  const planetShopStore = usePlanetShopStore()
  const solarStore = useSolarUpgradeStore()
  const forgeStore = useStarForgeStore()
  const meepTreeStore = useMeepTreeStore()
  const expeditionStore = useExpeditionStore()
  const inventoryStore = useInventoryStore()
  const itemStore = useItemStore()
  const synergyStore = useSynergyStore()
  const augmentStore = useAugmentStore()
  const drifterStore = useDrifterStore()
  const voidStore = useVoidStore()
  const omenStore = useOmenStore()
  const missionStore = useMissionStore()
  const bardAbilityStore = useBardAbilityStore()
  const achievementStore = useAchievementStore()
  const playerStore = usePlayerStore()
  const sectionStore = useSectionStore()
  const championLevelStore = useChampionLevelStore()

  /* ── Progression ──────────────────────────────────────────────────────── */
  const progression = computed<StatEntry[]>(() => {
    const completedSections = Object.values(sectionStore.sectionProgress).filter(
      (p) => p.completed,
    ).length
    const abilityNames = ['Chime Flow (CpS)', 'Power Strike', 'Meep Call', 'Click Surge']
    /* Level / Universe / Play Time are the hero row right above this section —
       they stay searchable as plain rows instead of being highlighted twice. */
    return [
      {
        key: 'level-progress',
        label: 'Level Progress',
        value: pct(gameStore.levelProgress / 100),
        highlight: true,
        hint: 'Chimes earned toward the next Bard level',
      },
      {
        key: 'total-power',
        label: 'Total Power',
        value: num(gameStore.totalPower),
        highlight: true,
        keywords: 'elo strength',
      },
      {
        key: 'skill-points',
        label: 'Skill Points',
        value: int(gameStore.skillPoints),
        highlight: true,
      },
      { key: 'level', label: 'Bard Level', value: int(gameStore.level) },
      {
        key: 'universe',
        label: 'Universe',
        value: int(gameStore.currentUniverse),
        keywords: 'prestige',
      },
      {
        key: 'play-time',
        label: 'Total Play Time',
        value: dur(gameStore.inGameTime * 1000),
        keywords: 'idle hours session',
      },
      {
        key: 'chimes-to-level',
        label: 'Chimes to Next Level',
        value: num(Math.max(0, gameStore.chimesToNextLevel)),
      },
      {
        key: 'abilities-unlocked',
        label: 'Abilities Unlocked',
        value: ratio(gameStore.abilityLevels.filter((l) => l > 0).length, 4),
        keywords: 'q w e r skills',
      },
      ...gameStore.abilityLevels.map((level, i) => ({
        key: `ability-${i}`,
        label: `${abilityNames[i]} Level`,
        value: int(level),
        keywords: 'ability skill',
      })),
      { key: 'prestiges', label: 'Prestige Resets', value: int(gameStore.totalPrestiges) },
      {
        key: 'universe-progress',
        label: 'Chimes to Next Universe',
        value: num(Math.max(0, gameStore.chimesToUniverseRescue - gameStore.chimesForNextUniverse)),
        keywords: 'prestige rescue',
      },
      {
        key: 'section',
        label: 'Current Section',
        value: ratio(sectionStore.activeSectionId, TOTAL_SECTIONS),
      },
      {
        key: 'sections-unlocked',
        label: 'Sections Unlocked',
        value: ratio(sectionStore.highestUnlockedSectionId, TOTAL_SECTIONS),
      },
      {
        key: 'sections-completed',
        label: 'Sections Completed',
        value: ratio(completedSections, TOTAL_SECTIONS),
      },
      {
        key: 'chronicle-stages',
        label: 'Codex Stages',
        value: ratio(achievementStore.unlockedStageCount, CHRONICLE_TOTAL_STAGES),
        keywords: 'astral codex milestones achievements tracks chronicle',
      },
      {
        key: 'chronicle-rank',
        label: 'Codex Rank',
        value: achievementStore.rankTitle,
        keywords: 'astral codex milestones achievements title chronicle',
      },
      {
        key: 'chronicle-rank-boost',
        label: 'Codex Rank Boost',
        value: `×${achievementStore.rankMult.toFixed(2)}`,
        keywords: 'astral codex rank multiplier track bonus chronicle',
      },
    ]
  })

  /* ── Economy ──────────────────────────────────────────────────────────── */
  const economy = computed<StatEntry[]>(() => {
    const clicks = gameStore.totalClicks
    return [
      {
        key: 'cps',
        label: 'Chimes per Second',
        value: num(gameStore.chimesPerSecond),
        highlight: true,
        keywords: 'cps production',
      },
      {
        key: 'cpc',
        label: 'Chimes per Click',
        value: num(gameStore.chimesPerClick),
        highlight: true,
        keywords: 'cpc click',
      },
      {
        key: 'total-chimes',
        label: 'Chimes Earned (Lifetime)',
        value: num(gameStore.totalChimesEarned),
        highlight: true,
      },
      { key: 'chimes-bank', label: 'Chimes in Bank', value: num(gameStore.chimes) },
      { key: 'clicks', label: 'Total Clicks', value: num(clicks) },
      {
        key: 'chimes-per-click-avg',
        label: 'Average per Click',
        value: clicks > 0 ? num(gameStore.totalChimesEarned / clicks) : '—',
        hint: 'Lifetime chimes divided by every click ever made',
      },
      {
        key: 'lifetime-production',
        label: 'Building Production (Lifetime)',
        value: num(shopStore.totalLifetimeProduction),
      },
      { key: 'meeps', label: 'Meeps Guided', value: num(gameStore.meeps), highlight: true },
      {
        key: 'meeps-earned',
        label: 'Meeps Earned (Lifetime)',
        value: num(gameStore.totalMeepsEarned),
      },
      { key: 'meeps-spent', label: 'Meeps Spent', value: num(gameStore.totalMeepsSpent) },
      {
        key: 'meeps-devoured-run',
        label: 'Meeps Devoured (Run)',
        value: num(gameStore.meepsDevoured),
        keywords: 'void breach loss devoured',
      },
      {
        key: 'next-meep',
        label: 'Chimes to Next Meep',
        value: num(gameStore.chimesToNextMeep),
      },
      {
        key: 'offline-chimes',
        label: 'Offline Chimes Earned',
        value: num(gameStore.totalOfflineChimes),
        keywords: 'away idle',
      },
      {
        key: 'offline-time',
        label: 'Time Spent Offline',
        value: dur(gameStore.totalOfflineSeconds * 1000),
        keywords: 'away',
      },
      {
        key: 'hourly',
        label: 'Projected per Hour',
        value: num(gameStore.chimesPerSecond * SECONDS_PER_HOUR),
        hint: 'Current chimes per second extrapolated to one full hour',
      },
    ]
  })

  /* ── Chime Works (buildings) ──────────────────────────────────────────── */
  const chimeWorks = computed<StatEntry[]>(() => {
    const stats = shopStore.buildingStats
    const totalLevels = shopStore.shopUpgrades.reduce((sum, u) => sum + u.level, 0)
    const rows: StatEntry[] = [
      {
        key: 'buildings-owned',
        label: 'Building Types Owned',
        value: ratio(
          shopStore.shopUpgrades.filter((u) => u.level > 0).length,
          shopStore.shopUpgrades.length,
        ),
        highlight: true,
      },
      {
        key: 'building-levels',
        label: 'Total Building Levels',
        value: num(totalLevels),
        highlight: true,
      },
      {
        key: 'top-producer',
        label: 'Top Producer',
        value: stats.length > 0 ? stats[0].name : '—',
        highlight: true,
        keywords: 'best building',
      },
    ]
    for (const upgrade of shopStore.shopUpgrades) {
      const stat = stats.find((s) => s.id === upgrade.id)
      rows.push({
        key: `building-${upgrade.id}-level`,
        label: `${upgrade.name} — Level`,
        value: int(upgrade.level),
        keywords: 'building',
      })
      rows.push({
        key: `building-${upgrade.id}-out`,
        label: `${upgrade.name} — Output`,
        value: upgrade.baseCPS
          ? `${num((upgrade.baseCPS ?? 0) * upgrade.level)} CpS`
          : `${num((upgrade.baseCPC ?? 0) * upgrade.level)} CpC`,
        keywords: 'building production',
      })
      if (stat) {
        rows.push({
          key: `building-${upgrade.id}-share`,
          label: `${upgrade.name} — Share`,
          value: pct(stat.productionPercentage / 100),
          keywords: 'building efficiency',
        })
      }
    }
    return rows
  })

  /* ── Auto Battle (ladder + match record) ──────────────────────────────── */
  const autoBattle = computed<StatEntry[]>(() => {
    const rank = battleStore.currentRank
    const battles = battleStore.totalBattles
    return [
      {
        key: 'rank',
        label: 'Current Rank',
        value: `${rank.tier} ${rank.division}`,
        highlight: true,
        keywords: 'tier division ladder',
      },
      { key: 'lp', label: 'League Points', value: `${int(rank.lp)} LP`, highlight: true },
      {
        key: 'winrate',
        label: 'Win Rate',
        value: battles > 0 ? pct(battleStore.winRate / 100) : '—',
        highlight: true,
      },
      { key: 'battles', label: 'Battles Played', value: num(battles) },
      { key: 'wins', label: 'Victories', value: num(battleStore.totalWins) },
      { key: 'losses', label: 'Defeats', value: num(battleStore.totalLosses) },
      { key: 'streak', label: 'Current Win Streak', value: int(battleStore.currentWinStreak) },
      { key: 'best-streak', label: 'Best Win Streak', value: int(battleStore.bestWinStreak) },
      { key: 'mmr', label: 'Matchmaking Rating', value: num(battleStore.mmr), keywords: 'mmr elo' },
      {
        key: 'peak-mmr',
        label: 'Peak MMR',
        value: num(battleStore.peakMmr),
        keywords: 'record elo',
      },
      { key: 'lp-gained', label: 'LP Gained (Lifetime)', value: num(battleStore.totalLpGained) },
      { key: 'lp-lost', label: 'LP Lost (Lifetime)', value: num(battleStore.totalLpLost) },
      {
        key: 'tiers-reached',
        label: 'Tiers Reached',
        value: int(Object.keys(battleStore.tierReachedAt).length),
        keywords: 'ladder history',
      },
      {
        key: 'start-win-chance',
        label: 'Next Start Win Chance',
        value: pct(battleStore.nextBattleStartWinChance),
        hint: 'Where the momentum bar begins when the next match starts',
      },
      {
        key: 'battle-time',
        label: 'Time on the Rift',
        value: dur(battleStore.totalBattleTime * 1000),
        keywords: 'duration playtime',
      },
      {
        key: 'avg-battle',
        label: 'Average Match Length',
        value: battles > 0 ? dur((battleStore.totalBattleTime / battles) * 1000) : '—',
      },
      {
        key: 'longest-game',
        label: 'Longest Match',
        value: dur(battleStore.allTime.longestGameSeconds * 1000),
      },
      {
        key: 'games-per-hour',
        label: 'Matches per Rift Hour',
        value:
          battleStore.totalBattleTime > 0
            ? dec((battles / battleStore.totalBattleTime) * SECONDS_PER_HOUR, 1)
            : '—',
        hint: `A full simulated match runs ${BATTLE_TOTAL_GAME_SECONDS} game-seconds`,
      },
      {
        key: 'auto-battle-state',
        label: 'Auto Battle',
        value: battleStore.autoBattleEnabled ? 'Running' : 'Idle',
      },
    ]
  })

  /* ── Combat Record (KDA + multikills) ─────────────────────────────────── */
  const combatRecord = computed<StatEntry[]>(() => {
    const mk = battleStore.allTime.multikills
    const battles = Math.max(1, battleStore.totalBattles)
    return [
      {
        key: 'kda',
        label: 'Career KDA',
        value: dec(battleStore.careerKda),
        highlight: true,
        keywords: 'kill death assist ratio',
      },
      { key: 'kills', label: 'Kills', value: num(battleStore.totalKills), highlight: true },
      { key: 'deaths', label: 'Deaths', value: num(battleStore.totalDeaths), highlight: true },
      { key: 'assists', label: 'Assists', value: num(battleStore.totalAssists) },
      {
        key: 'kills-per-game',
        label: 'Kills per Match',
        value: battleStore.totalBattles > 0 ? dec(battleStore.totalKills / battles, 1) : '—',
      },
      {
        key: 'kill-participation',
        label: 'Kill Participation',
        value: pct(battleStore.avgKillParticipation),
        keywords: 'kp',
      },
      { key: 'first-bloods', label: 'First Bloods', value: num(battleStore.allTime.firstBloods) },
      { key: 'solo-kills', label: 'Solo Kills', value: num(battleStore.allTime.soloKills) },
      {
        key: 'largest-spree',
        label: 'Largest Killing Spree',
        value: int(battleStore.allTime.largestSpree),
      },
      { key: 'double-kills', label: 'Double Kills', value: num(mk.double), keywords: 'multikill' },
      { key: 'triple-kills', label: 'Triple Kills', value: num(mk.triple), keywords: 'multikill' },
      { key: 'quadra-kills', label: 'Quadra Kills', value: num(mk.quadra), keywords: 'multikill' },
      {
        key: 'penta-kills',
        label: 'Pentakills',
        value: num(mk.penta),
        keywords: 'multikill penta',
      },
      { key: 'mvps', label: 'MVP Awards', value: num(battleStore.allTime.mvpAwards) },
      {
        key: 'damage',
        label: 'Damage Dealt',
        value: num(battleStore.allTime.damage),
        keywords: 'dps',
      },
      { key: 'damage-min', label: 'Damage per Minute', value: num(battleStore.damagePerMinute) },
      { key: 'damage-taken', label: 'Damage Taken', value: num(battleStore.allTime.damageTaken) },
      { key: 'healing', label: 'Healing Done', value: num(battleStore.allTime.healing) },
      {
        key: 'cs',
        label: 'Creep Score',
        value: num(battleStore.allTime.cs),
        keywords: 'farm minions',
      },
      { key: 'cs-min', label: 'CS per Minute', value: dec(battleStore.csPerMinute, 1) },
      { key: 'gold', label: 'Gold Earned', value: num(battleStore.allTime.gold) },
      { key: 'gold-min', label: 'Gold per Minute', value: num(battleStore.goldPerMinute) },
    ]
  })

  /* ── Objectives & Vision ──────────────────────────────────────────────── */
  const objectives = computed<StatEntry[]>(() => {
    const at = battleStore.allTime
    const battles = Math.max(1, battleStore.totalBattles)
    return [
      { key: 'dragons', label: 'Drakes Secured', value: num(at.dragons), highlight: true },
      { key: 'barons', label: 'Barons Slain', value: num(at.barons), highlight: true },
      { key: 'turrets', label: 'Turrets Destroyed', value: num(at.turrets), highlight: true },
      { key: 'inhibitors', label: 'Inhibitors Destroyed', value: num(at.inhibitors) },
      {
        key: 'drakes-per-game',
        label: 'Drakes per Match',
        value: battleStore.totalBattles > 0 ? dec(at.dragons / battles, 2) : '—',
      },
      {
        key: 'turrets-per-game',
        label: 'Turrets per Match',
        value: battleStore.totalBattles > 0 ? dec(at.turrets / battles, 2) : '—',
      },
      {
        key: 'wards-placed',
        label: 'Wards Placed',
        value: num(at.wardsPlaced),
        keywords: 'vision',
      },
      {
        key: 'wards-killed',
        label: 'Wards Cleared',
        value: num(at.wardsKilled),
        keywords: 'vision',
      },
      { key: 'control-wards', label: 'Control Wards Bought', value: num(at.controlWards) },
      {
        key: 'vision-score',
        label: 'Average Vision Score',
        value: dec(battleStore.avgVisionScore, 1),
      },
      { key: 'honors-given', label: 'Honors Given', value: num(at.honorsGiven) },
      {
        key: 'honored-now',
        label: 'Honored This Match',
        value: int(battleStore.honoredChampions.length),
        keywords: 'honor',
      },
    ]
  })

  /* ── Champions ────────────────────────────────────────────────────────── */
  const champions = computed<StatEntry[]>(() => {
    const career = Object.entries(battleStore.championCareer)
    const byMetric = (pick: (v: (typeof career)[number][1]) => number): string => {
      if (career.length === 0) return '—'
      const best = career.reduce((a, b) => (pick(b[1]) > pick(a[1]) ? b : a))
      return pick(best[1]) > 0 ? `${best[0]} · ${num(pick(best[1]))}` : '—'
    }
    const orbitFilled = battleStore.assignedChampions.length
    return [
      {
        key: 'owned',
        label: 'Champions Recruited',
        value: int(battleStore.ownedChampions.length),
        highlight: true,
      },
      {
        key: 'orbit',
        label: 'Champions in Orbit',
        value: int(orbitFilled),
        highlight: true,
        keywords: 'team slots',
      },
      {
        key: 'team-slots',
        label: 'Battle Team Slots Filled',
        value: ratio(battleStore.selectedChampions.length, 4),
        highlight: true,
      },
      {
        key: 'career-tracked',
        label: 'Champions with a Career',
        value: int(career.length),
        hint: 'Champions that have played at least one match for you',
      },
      {
        key: 'champions-trained',
        label: 'Champions Trained',
        value: int(championLevelStore.trainedChampionCount),
        hint: 'Champions above level 1',
        keywords: 'level progression',
      },
      {
        key: 'champion-levels-bought',
        label: 'Champion Levels Bought',
        value: int(championLevelStore.totalLevelsBought),
        keywords: 'level up',
      },
      {
        key: 'champion-xp',
        label: 'Champion XP Earned',
        value: num(championLevelStore.totalXpEarned),
        keywords: 'experience',
      },
      {
        key: 'champion-level-cap',
        label: 'Champion Level Cap',
        value: int(championLevelStore.levelCap),
        hint: 'Rises with every galaxy reached',
      },
      { key: 'top-kills', label: 'Most Kills', value: byMetric((c) => c.kills) },
      { key: 'top-damage', label: 'Most Damage', value: byMetric((c) => c.damage) },
      { key: 'top-mvp', label: 'Most MVPs', value: byMetric((c) => c.mvps) },
      { key: 'top-battles', label: 'Most Matches Played', value: byMetric((c) => c.battles) },
      { key: 'top-honors', label: 'Most Honored', value: byMetric((c) => c.honors) },
      { key: 'top-healing', label: 'Most Healing', value: byMetric((c) => c.healing) },
      {
        key: 'recruitable',
        label: 'Recruitable Right Now',
        value: int(battleStore.recruitableChampions.length),
        keywords: 'shop',
      },
      {
        key: 'newly-unlocked',
        label: 'Newly Unlocked',
        value: int(battleStore.newlyUnlockedChampions.length),
      },
      {
        key: 'on-expedition',
        label: 'Away on Expedition',
        value: int(expeditionStore.championsOnExpedition.length),
      },
    ]
  })

  /* ── Galaxy ───────────────────────────────────────────────────────────── */
  const galaxy = computed<StatEntry[]>(() => {
    const attempts = galaxyStore.totalStarsRescued + galaxyStore.totalStarsLost
    return [
      {
        key: 'current-galaxy',
        label: 'Current Galaxy',
        value: int(galaxyStore.currentGalaxy),
        highlight: true,
      },
      {
        key: 'galaxies-freed',
        label: 'Galaxies Freed',
        value: int(galaxyStore.completedGalaxies.length),
        highlight: true,
      },
      {
        key: 'stars-progress',
        label: 'Stars This Galaxy',
        value: ratio(galaxyStore.starsRescued, galaxyStore.starsRequired),
        highlight: true,
      },
      {
        key: 'stars-rescued',
        label: 'Stars Rescued (Lifetime)',
        value: num(galaxyStore.totalStarsRescued),
      },
      { key: 'stars-lost', label: 'Stars Lost (Lifetime)', value: num(galaxyStore.totalStarsLost) },
      {
        key: 'rescue-rate',
        label: 'Rescue Success Rate',
        value: attempts > 0 ? pct(galaxyStore.totalStarsRescued / attempts) : '—',
      },
      {
        key: 'galaxy-bosses',
        label: 'Galaxy Cores Defeated',
        value: num(galaxyStore.totalGalaxyBossesDefeated),
        keywords: 'boss',
      },
      {
        key: 'escorts',
        label: 'Boss Escorts Destroyed',
        value: num(galaxyStore.totalBossEscortsDefeated),
      },
      { key: 'tier', label: 'Galaxy Tier Unlocked', value: int(galaxyStore.unlockedTier) },
      {
        key: 'archive-time',
        label: 'Fastest Galaxy Run',
        value:
          galaxyStore.completedGalaxies.length > 0
            ? dur(Math.min(...galaxyStore.completedGalaxies.map((r) => r.durationSeconds)) * 1000)
            : '—',
        keywords: 'record archive',
      },
      {
        key: 'archive-avg',
        label: 'Average Galaxy Run',
        value:
          galaxyStore.completedGalaxies.length > 0
            ? dur(
                (galaxyStore.completedGalaxies.reduce((s, r) => s + r.durationSeconds, 0) /
                  galaxyStore.completedGalaxies.length) *
                  1000,
              )
            : '—',
      },
      {
        key: 'travel',
        label: 'Champion Travel State',
        value: galaxyStore.championTravelState.replace(/_/g, ' '),
        keywords: 'ship flight',
      },
    ]
  })

  /* ── Star Fights ──────────────────────────────────────────────────────── */
  const starFights = computed<StatEntry[]>(() => {
    const bossAttempts = planetBossStore.totalBossesDefeated + planetBossStore.totalBossesLost
    return [
      {
        key: 'planets-cleared',
        label: 'Planets Cleared',
        value: num(starGroupStore.totalPlanetsCleared),
        highlight: true,
      },
      {
        key: 'bosses-defeated',
        label: 'Planet Bosses Defeated',
        value: num(planetBossStore.totalBossesDefeated),
        highlight: true,
      },
      {
        key: 'boss-winrate',
        label: 'Boss Win Rate',
        value: bossAttempts > 0 ? pct(planetBossStore.totalBossesDefeated / bossAttempts) : '—',
        highlight: true,
      },
      {
        key: 'bosses-lost',
        label: 'Planet Bosses Escaped',
        value: num(planetBossStore.totalBossesLost),
      },
      {
        key: 'boss-damage',
        label: 'Damage Dealt to Bosses',
        value: num(planetBossStore.totalBossDamage),
      },
      {
        key: 'stars-spawned',
        label: 'Stars Encountered',
        value: num(starGroupStore.totalStarsSpawned),
      },
      {
        key: 'stars-active',
        label: 'Stars in Orbit Now',
        value: int(starGroupStore.activeStars.length),
      },
      {
        key: 'resource-stars',
        label: 'Resource Stars Active',
        value: int(starGroupStore.activeResourceStarCount),
      },
      {
        key: 'bosses-active',
        label: 'Boss Fights Running',
        value: int(planetBossStore.activeBosses.filter((b) => !b.defeated && !b.expired).length),
      },
      {
        key: 'volleys',
        label: 'Turret Salvos Fired',
        value: num(planetBossStore.turretVolleyCounter),
        keywords: 'shots battery',
      },
      {
        key: 'cps-penalty',
        label: 'Production Penalty',
        value: planetBossStore.cpsPenaltyActive ? 'Active' : 'None',
        hint: 'A boss that enrages away suppresses chime production for a while',
      },
    ]
  })

  /* ── Planets ──────────────────────────────────────────────────────────── */
  const planets = computed<StatEntry[]>(() => {
    const slots = planetShopStore.slots
    const purchased = planetShopStore.purchasedSlots
    const totalLevels = purchased.reduce((sum, s) => sum + s.level, 0)
    const rows: StatEntry[] = [
      {
        key: 'colonized',
        label: 'Planets Colonized',
        value: ratio(purchased.length, slots.length),
        highlight: true,
      },
      {
        key: 'assigned',
        label: 'Planets with a Role',
        value: int(planetShopStore.activeSlots.length),
        highlight: true,
      },
      {
        key: 'auto-dps',
        label: 'Orbit Auto-Attack DPS',
        value: num(planetShopStore.autoAttackDPS),
        highlight: true,
        keywords: 'turret damage',
      },
      { key: 'planet-levels', label: 'Total Planet Levels', value: num(totalLevels) },
      {
        key: 'avg-planet-level',
        label: 'Average Planet Level',
        value: purchased.length > 0 ? dec(totalLevels / purchased.length, 1) : '—',
      },
      {
        key: 'planets-down',
        label: 'Planets Down',
        value: int(purchased.filter((s) => s.currentHp <= 0).length),
        keywords: 'destroyed wreck',
      },
      {
        key: 'planet-hp',
        label: 'Combined Planet HP',
        value: ratio(
          purchased.reduce((sum, s) => sum + Math.max(0, s.currentHp), 0),
          purchased.reduce((sum, s) => sum + s.maxHp, 0),
        ),
      },
    ]
    for (const role of PLANET_ROLES_LIST) {
      rows.push({
        key: `role-${role.id}`,
        label: `${role.name} Planets`,
        value: int(slots.filter((s) => s.purchased && s.role === role.id).length),
        keywords: 'role planet',
      })
    }
    rows.push(
      {
        key: 'expedition-relay',
        label: 'Relay Expedition Bonus',
        value: bonus(planetShopStore.planetExpeditionRewardMultiplier),
      },
      {
        key: 'aegis',
        label: 'Aegis Damage Reduction',
        value: pct(planetShopStore.planetBossDamageReduction),
      },
      {
        key: 'timewarp',
        label: 'Timewarp Offline Bonus',
        value: bonus(planetShopStore.planetOfflineBoostMultiplier),
      },
      {
        key: 'harvesters',
        label: 'Active Harvest Nodes',
        value: int(planetShopStore.activeHarvestSlots.length),
      },
    )
    return rows
  })

  /* ── Sun & Solar Rays ─────────────────────────────────────────────────── */
  const solar = computed<StatEntry[]>(() => {
    const phaseName = solarStore.isCometState
      ? COMET_PHASE_DATA.name
      : (STAR_PHASE_DATA[solarStore.starPhase]?.name ?? '—')
    const rays: { id: string; label: string; level: number; effect: string }[] = [
      {
        id: 'flight',
        label: 'Flight Speed',
        level: solarStore.flightSpeedLevel,
        effect: bonus(solarStore.flightSpeedMultiplier),
      },
      {
        id: 'hp',
        label: 'Max HP',
        level: solarStore.maxHpLevel,
        effect: `+${num(solarStore.hpBonus)}`,
      },
      {
        id: 'cpc',
        label: 'Chimes / Click',
        level: solarStore.chimesPerClickLevel,
        effect: `+${num(solarStore.cpcBonus)}`,
      },
      {
        id: 'cps',
        label: 'Chimes / Second',
        level: solarStore.chimesPerSecondLevel,
        effect: `+${num(solarStore.cpsBonus)}`,
      },
      {
        id: 'dmg',
        label: 'Damage / Click',
        level: solarStore.dmgPerClickLevel,
        effect: bonus(solarStore.dmgMultiplier),
      },
    ]
    const raySum = rays.reduce((sum, r) => sum + r.level, 0)
    const rows: StatEntry[] = [
      { key: 'phase', label: 'Star Phase', value: phaseName, highlight: true, keywords: 'sun' },
      {
        key: 'phase-step',
        label: 'Phase Progress',
        value: solarStore.isCometState
          ? `0 / ${STAR_PHASE_DATA.length}`
          : ratio(solarStore.starPhase + 1, STAR_PHASE_DATA.length),
        highlight: true,
      },
      {
        key: 'dwell',
        label: 'Time in This Phase',
        value: dur(solarStore.phaseDwellElapsedMs),
        highlight: true,
      },
      {
        key: 'dwell-left',
        label: 'Evolve Gate Remaining',
        value:
          solarStore.phaseDwellRemainingMs > 0 ? dur(solarStore.phaseDwellRemainingMs) : 'Ready',
        keywords: 'evolve timer',
      },
      {
        key: 'phase-total',
        label: 'Total Time as a Star',
        value: dur(solarStore.totalPhaseSeconds * 1000),
      },
      { key: 'comet-time', label: 'Time as a Comet', value: dur(solarStore.cometSeconds * 1000) },
      {
        key: 'ray-levels',
        label: 'Solar Ray Levels',
        value: ratio(raySum, SOLAR_MAX_LEVELS * rays.length),
        keywords: 'upgrades',
      },
      {
        key: 'ray-cap',
        label: 'Next Ray Level Cap',
        value: int(solarStore.maxAllowedLevel),
        hint: 'Rays must be raised evenly — no ray may lead by more than one level',
      },
      {
        key: 'sun-hp',
        label: 'Sun HP',
        value: ratio(playerStore.currentHP, playerStore.maxHP),
        keywords: 'health life',
      },
      { key: 'sun-hp-pct', label: 'Sun HP Percent', value: pct(playerStore.hpPercent / 100) },
      {
        key: 'damage-taken',
        label: 'Damage Taken (Lifetime)',
        value: num(playerStore.totalDamageTaken),
      },
      {
        key: 'hp-regen',
        label: 'HP Regenerated (Lifetime)',
        value: num(playerStore.totalHpRegenerated),
      },
      {
        key: 'times-downed',
        label: 'Times Burned Out',
        value: int(playerStore.timesDowned),
        keywords: 'death zero hp',
      },
    ]
    for (const ray of rays) {
      rows.push({
        key: `ray-${ray.id}`,
        label: `${ray.label} Ray`,
        value: `Lv ${ray.level} · ${ray.effect}`,
        keywords: 'solar ray upgrade',
      })
    }
    return rows
  })

  /* ── Star Forge ───────────────────────────────────────────────────────── */
  const starForge = computed<StatEntry[]>(() => {
    const branchLevels = FORGE_BRANCHES.reduce(
      (sum, b) => sum + (forgeStore.branchLevels[b.id] ?? 0),
      0,
    )
    const leafLevels = FORGE_LEAVES.reduce((sum, l) => sum + (forgeStore.leafLevels[l.id] ?? 0), 0)
    const relicLevels = FORGE_RELICS.reduce(
      (sum, r) => sum + (forgeStore.relicLevels[r.id] ?? 0),
      0,
    )
    const branchesStarted = FORGE_BRANCHES.filter((b) => (forgeStore.branchLevels[b.id] ?? 0) > 0)
    const leavesStarted = FORGE_LEAVES.filter((l) => (forgeStore.leafLevels[l.id] ?? 0) > 0)
    const relicsForged = FORGE_RELICS.filter((r) => (forgeStore.relicLevels[r.id] ?? 0) > 0)
    return [
      {
        key: 'branches',
        label: 'Branches Unlocked',
        value: ratio(branchesStarted.length, FORGE_BRANCHES.length),
        highlight: true,
      },
      {
        key: 'relics',
        label: 'Relics Forged',
        value: ratio(relicsForged.length, FORGE_RELICS.length),
        highlight: true,
      },
      {
        key: 'constellations',
        label: 'Constellations Forged',
        value: ratio(forgeStore.forgedConstellations.length, FORGE_CONSTELLATIONS.length),
        highlight: true,
      },
      { key: 'branch-levels', label: 'Total Branch Levels', value: num(branchLevels) },
      {
        key: 'leaves',
        label: 'Leaves Unlocked',
        value: ratio(leavesStarted.length, FORGE_LEAVES.length),
      },
      { key: 'leaf-levels', label: 'Total Leaf Levels', value: num(leafLevels) },
      { key: 'relic-levels', label: 'Total Relic Levels', value: num(relicLevels) },
      {
        key: 'forge-cps',
        label: 'Forge Production Bonus',
        value: bonus(forgeStore.cpsMult),
        keywords: 'cps',
      },
      {
        key: 'forge-cpc',
        label: 'Forge Click Bonus',
        value: bonus(forgeStore.cpcMult),
        keywords: 'cpc',
      },
      {
        key: 'forge-cpc-from-cps',
        label: 'Click Gains from CpS',
        value: pct(forgeStore.cpcFromCpsPct),
        keywords: 'resonance midas',
      },
      {
        key: 'forge-drop',
        label: 'Material Drop Bonus',
        value: bonus(forgeStore.materialDropMult),
      },
      {
        key: 'forge-extra-drop',
        label: 'Extra Materials per Drop',
        value: int(forgeStore.extraDropCount),
      },
      { key: 'forge-dps', label: 'Champion DPS Bonus', value: bonus(forgeStore.championDpsMult) },
      { key: 'forge-boss', label: 'Boss Damage Bonus', value: bonus(forgeStore.bossDamageMult) },
      { key: 'forge-splash', label: 'Click Splash', value: pct(forgeStore.clickSplashPct) },
      {
        key: 'forge-expedition-reward',
        label: 'Expedition Reward Bonus',
        value: bonus(forgeStore.expeditionRewardMult),
        keywords: 'wayfinder hoard',
      },
      {
        key: 'forge-champion-xp',
        label: 'Champion XP Bonus',
        value: bonus(forgeStore.championXpMult),
        keywords: 'eternal host',
      },
      {
        key: 'forge-star-lifetime',
        label: 'Resource Star Lifetime',
        value: bonus(forgeStore.starLifetimeMult),
        keywords: 'warden vigil',
      },
      { key: 'forge-regen', label: 'Bonus HP Regen / s', value: dec(forgeStore.hpRegenPerSec, 1) },
      {
        key: 'forge-mitigation',
        label: 'Damage Taken Reduction',
        value: pct(1 - forgeStore.damageTakenMult),
      },
      {
        key: 'forge-dwell',
        label: 'Phase Dwell Reduction',
        value: pct(1 - forgeStore.dwellMult),
        keywords: 'quickening evolve',
      },
      {
        key: 'forge-offline',
        label: 'Offline Earnings Bonus',
        value: bonus(forgeStore.offlineEarningsMult),
      },
      {
        key: 'forge-offline-hours',
        label: 'Extra Offline Hours',
        value: `+${dec(forgeStore.offlineMaxHoursBonus, 1)} h`,
      },
      {
        key: 'forge-buffs',
        label: 'Bargain Buffs Active',
        value: int(forgeStore.activeBuffs.length),
        keywords: 'cosmic bargain',
      },
    ]
  })

  /* ── Meep Tree ────────────────────────────────────────────────────────── */
  const meepTree = computed<StatEntry[]>(() => {
    const fx = meepTreeStore.fx
    const rows: StatEntry[] = [
      {
        key: 'nodes',
        label: 'Skills Learned',
        // Gegen die erreichbaren Knoten gerechnet, nicht gegen den Katalog: an
        // der Gabel auf Rang 4 stehen zwei Definitionen für EINEN Schritt, und
        // ein fertiger Baum stünde sonst dauerhaft bei 25/30.
        value: ratio(meepTreeStore.boughtCount, MEEP_TREE_PATH_NODES),
        highlight: true,
      },
      {
        key: 'buyable',
        label: 'Skills Ready to Learn',
        value: int(meepTreeStore.buyableNodeCount),
        highlight: true,
      },
      {
        key: 'completion',
        label: 'Tree Completion',
        value: pct(meepTreeStore.boughtCount / Math.max(1, MEEP_TREE_PATH_NODES)),
        highlight: true,
      },
    ]
    for (const branch of MEEP_TREE_BRANCHES) {
      const progress = meepTreeStore.branchProgress(branch.id)
      rows.push({
        key: `branch-${branch.id}`,
        label: `${branch.name} Branch`,
        value: ratio(progress.bought, progress.total),
        keywords: 'meep branch skill',
      })
    }
    rows.push(
      {
        key: 'tree-cps',
        label: 'Tree Production Bonus',
        value: bonus(fx.cpsMult),
        keywords: 'cps',
      },
      { key: 'tree-cpc', label: 'Tree Click Bonus', value: bonus(fx.cpcMult), keywords: 'cpc' },
      { key: 'tree-double', label: 'Double Click Chance', value: pct(fx.doubleClickChance) },
      { key: 'tree-meep-cost', label: 'Meep Cost Reduction', value: pct(1 - fx.meepCostMult) },
      { key: 'tree-meep-power', label: 'Meep Power Bonus', value: bonus(fx.meepPowerMult) },
      { key: 'tree-power', label: 'Flat Power Bonus', value: `+${num(fx.powerBonus)}` },
      {
        key: 'tree-expedition',
        label: 'Expedition Reward Bonus',
        value: bonus(fx.expeditionRewardMult),
      },
      {
        key: 'tree-expedition-speed',
        label: 'Expedition Speed Bonus',
        value: pct(1 - fx.expeditionSpeedMult),
      },
      { key: 'tree-dps', label: 'Champion DPS Bonus', value: bonus(fx.championDpsMult) },
      { key: 'tree-boss', label: 'Boss Damage Bonus', value: bonus(fx.bossDamageMult) },
      { key: 'tree-drop', label: 'Material Drop Bonus', value: bonus(fx.materialDropMult) },
      { key: 'tree-regen', label: 'Bonus HP Regen / s', value: dec(fx.hpRegenPerSec, 1) },
      {
        key: 'tree-mitigation',
        label: 'Damage Taken Reduction',
        value: pct(1 - fx.damageTakenMult),
      },
      {
        key: 'tree-offline',
        label: 'Offline Earnings Bonus',
        value: bonus(fx.offlineEarningsMult),
      },
    )
    return rows
  })

  /* ── Expeditions ──────────────────────────────────────────────────────── */
  const expeditions = computed<StatEntry[]>(() => {
    const resolved =
      expeditionStore.totalExpeditionsSucceeded + expeditionStore.totalExpeditionsFailed
    const active = expeditionStore.activeExpeditions.filter((e) => e.status === 'active')
    const ready = expeditionStore.activeExpeditions.filter((e) => e.status !== 'active')
    return [
      {
        key: 'succeeded',
        label: 'Expeditions Succeeded',
        value: num(expeditionStore.totalExpeditionsSucceeded),
        highlight: true,
      },
      {
        key: 'success-rate',
        label: 'Success Rate',
        value: resolved > 0 ? pct(expeditionStore.totalExpeditionsSucceeded / resolved) : '—',
        highlight: true,
      },
      {
        key: 'rewards',
        label: 'Chimes from Expeditions',
        value: num(expeditionStore.totalExpeditionChimes),
        highlight: true,
      },
      {
        key: 'started',
        label: 'Expeditions Sent Out',
        value: num(expeditionStore.totalExpeditionsStarted),
      },
      {
        key: 'failed',
        label: 'Expeditions Lost',
        value: num(expeditionStore.totalExpeditionsFailed),
      },
      {
        // The cap is no longer fixed — it widens with the expedition ledger rank.
        key: 'active',
        label: 'Running Right Now',
        value: ratio(active.length, expeditionStore.maxActiveExpeditions),
      },
      {
        key: 'ledgerRank',
        label: 'Ledger Standing',
        value: `${expeditionStore.ledgerRank.name} (${expeditionStore.ledgerCompleted})`,
      },
      { key: 'ready', label: 'Waiting to be Collected', value: int(ready.length) },
      {
        key: 'available',
        label: 'Offers on the Board',
        value: int(expeditionStore.availableExpeditions.length),
      },
      {
        key: 'avg-reward',
        label: 'Average Payout',
        value: resolved > 0 ? num(expeditionStore.totalExpeditionChimes / resolved) : '—',
      },
      {
        key: 'champions-away',
        label: 'Champions Deployed',
        value: int(expeditionStore.championsOnExpedition.length),
      },
    ]
  })

  /* ── Materials & Gear ─────────────────────────────────────────────────── */
  const materials = computed<StatEntry[]>(() => {
    const stock = inventoryStore.collectedMaterials
    const inStock = Object.values(stock).reduce((sum, n) => sum + (n ?? 0), 0)
    const uniqueFound = MATERIALS.filter((m) => (stock[m.id] ?? 0) > 0).length
    const equipped = itemStore.slotEquipment.flatMap((s) => [s.weapon, s.armor, s.artefact])
    const equippedCount = equipped.filter(Boolean).length
    const ownedTotal = Object.values(itemStore.ownedItems).reduce((sum, n) => sum + (n ?? 0), 0)
    const rows: StatEntry[] = [
      {
        key: 'collected',
        label: 'Materials Collected',
        value: num(inventoryStore.totalMaterialsCollected),
        highlight: true,
      },
      { key: 'in-stock', label: 'Materials in Stock', value: num(inStock), highlight: true },
      {
        key: 'items-equipped',
        label: 'Equipment Slots Filled',
        value: ratio(equippedCount, ITEM_SLOT_COUNT * 3),
        highlight: true,
      },
      { key: 'spent', label: 'Materials Spent', value: num(inventoryStore.totalMaterialsSpent) },
      {
        key: 'unique',
        label: 'Material Types Found',
        value: ratio(uniqueFound, MATERIALS.length),
      },
      { key: 'items-owned', label: 'Items Owned', value: num(ownedTotal) },
      {
        key: 'item-types',
        label: 'Item Types Owned',
        value: int(Object.values(itemStore.ownedItems).filter((n) => (n ?? 0) > 0).length),
      },
      {
        key: 'sets',
        label: 'Set Bonuses Active',
        value: ratio(itemStore.activeSetBonuses.length, ITEM_SETS.length),
        keywords: 'equipment set',
      },
      {
        key: 'item-cps',
        label: 'Equipment Production Bonus',
        value: bonus(itemStore.totalCPSMultiplier),
      },
    ]
    for (const material of MATERIALS) {
      rows.push({
        key: `mat-${material.id}`,
        label: material.name,
        value: num(stock[material.id] ?? 0),
        keywords: `material ${material.rarity}`,
      })
    }
    return rows
  })

  /* ── Buffs & Synergies ────────────────────────────────────────────────── */
  const buffs = computed<StatEntry[]>(() => {
    const mod = gameStore.activeModifier
    const activeTraits = synergyStore.activeTraits.filter((t) => t.activeThreshold)
    const activeOrigins = synergyStore.activeOriginSynergies.filter((s) => s.activeThreshold)
    const byRarity = gameStore.activeAugments.reduce<Record<string, number>>((acc, id) => {
      const aug = AUGMENTS.find((a) => a.id === id)
      if (aug) acc[aug.rarity] = (acc[aug.rarity] ?? 0) + 1
      return acc
    }, {})
    const rows: StatEntry[] = [
      {
        key: 'augments',
        label: 'Augments Active',
        value: ratio(gameStore.activeAugments.length, AUGMENTS.length),
        highlight: true,
      },
      {
        key: 'traits',
        label: 'Traits Active',
        value: ratio(activeTraits.length, synergyStore.activeTraits.length),
        highlight: true,
        keywords: 'synergy',
      },
      {
        key: 'origins',
        label: 'Origins Active',
        value: ratio(activeOrigins.length, synergyStore.activeOriginSynergies.length),
        highlight: true,
        keywords: 'synergy region',
      },
    ]
    for (const [rarity, count] of Object.entries(byRarity)) {
      rows.push({
        key: `aug-${rarity}`,
        label: `${rarity.charAt(0).toUpperCase()}${rarity.slice(1)} Augments`,
        value: int(count),
        keywords: 'augment rarity',
      })
    }
    rows.push(
      {
        key: 'syn-cps',
        label: 'Synergy Production Bonus',
        value: bonus(synergyStore.cpsSynergyMultiplier),
      },
      {
        key: 'syn-power',
        label: 'Synergy Power Bonus',
        value: bonus(synergyStore.powerSynergyMultiplier),
      },
      {
        key: 'syn-dps',
        label: 'Synergy Combat DPS Bonus',
        value: bonus(synergyStore.dpsSynergyMultiplier),
      },
      {
        key: 'uni-cps',
        label: 'Universe Production Modifier',
        value: bonus(mod.cpsMultiplier ?? 1),
      },
      { key: 'uni-cpc', label: 'Universe Click Modifier', value: bonus(mod.cpcMultiplier ?? 1) },
      {
        key: 'uni-cost',
        label: 'Building Cost Modifier',
        value: bonus(mod.buildingCostMultiplier ?? 1),
      },
      {
        key: 'uni-meep-cost',
        label: 'Meep Cost Modifier',
        value: bonus(mod.meepCostMultiplier ?? 1),
      },
      {
        key: 'uni-meep-power',
        label: 'Meep Power Modifier',
        value: bonus(mod.meepPowerMultiplier ?? 1),
      },
      {
        key: 'uni-expedition',
        label: 'Universe Expedition Modifier',
        value: bonus(mod.expeditionRewardMultiplier ?? 1),
      },
      {
        key: 'cooldown',
        label: 'Cooldown Reduction',
        value: pct(1 - (mod.cooldownMultiplier ?? 1)),
      },
      {
        key: 'enemy-speed',
        label: 'Enemy Speed Reduction',
        value: pct(1 - (mod.enemySpeedMultiplier ?? 1)),
      },
      {
        key: 'ability-cps',
        label: 'Ability Production Multiplier',
        value: mult(gameStore.abilityCPSMultiplier),
      },
      {
        key: 'ability-cpc',
        label: 'Ability Click Multiplier',
        value: mult(gameStore.abilityCPCMultiplier),
      },
      {
        key: 'ability-power',
        label: 'Ability Power Bonus',
        value: `+${num(gameStore.abilityPowerBonus)}`,
      },
      {
        key: 'timed-buffs',
        label: 'Timed Buffs Running',
        value: int(augmentStore.activeTimedBuffs.length),
      },
      {
        key: 'temp-cps',
        label: 'Temporary Production Buff',
        value: bonus(augmentStore.temporaryCPSMultiplier),
      },
      {
        key: 'mvp-buff',
        label: 'MVP Buff Remaining',
        value: gameStore.mvpBuffSecondsLeft > 0 ? dur(gameStore.mvpBuffSecondsLeft * 1000) : '—',
        keywords: 'honor',
      },
      {
        key: 'drifters-collected',
        label: 'Drifters Collected',
        value: num(drifterStore.totalDriftersCollected),
        highlight: true,
        keywords: 'chime meep probe surge rift beacon leviathan',
      },
      {
        key: 'drifters-catch-rate',
        label: 'Drifter Catch Rate',
        value:
          drifterStore.totalDriftersSpawned > 0
            ? pct(drifterStore.totalDriftersCollected / drifterStore.totalDriftersSpawned)
            : '—',
        keywords: 'drifter accuracy',
      },
      {
        key: 'drifters-missed',
        label: 'Drifters Missed',
        value: num(drifterStore.totalDriftersMissed),
        keywords: 'drifter lost',
      },
      {
        key: 'drifter-buffs',
        label: 'Drifter Buffs Running',
        value: int(drifterStore.liveBuffs.length),
      },
      {
        key: 'drifter-cps',
        label: 'Drifter Production Buff',
        value: bonus(drifterStore.cpsMult),
      },
      {
        key: 'drifter-cpc',
        label: 'Drifter Click Buff',
        value: bonus(drifterStore.cpcMult),
      },
      {
        key: 'drifter-dps',
        label: 'Drifter Damage Buff',
        value: bonus(drifterStore.combatDpsMult),
      },
      {
        key: 'drifter-drops',
        label: 'Drifter Drop Buff',
        value: bonus(drifterStore.materialDropMult),
      },
      {
        key: 'drifter-xp',
        label: 'Drifter XP Buff',
        value: bonus(drifterStore.xpMult),
      },
      // ── Wayfinder ──
      // Nur die Zahl der gegangenen Stufen: WELCHE offen ist, steht auf der
      // Karte im Spielbild und ausführlich in der Sektion am Fuß der
      // Journey-Spalte.
      {
        key: 'wayfinder-claimed',
        label: 'Milestones Walked',
        value: int(missionStore.totalMissionsClaimed),
        keywords: 'wayfinder mission milestone ladder objective',
      },
      // ── Omens ──
      // Nur die Zähler und die laufende Wirkung: welches Vorzeichen gerade offen
      // ist, steht als eigene Karte im Spielbild und muss hier nicht doppelt.
      {
        key: 'omens-completed',
        label: 'Omens Fulfilled',
        value: int(omenStore.totalOmensCompleted),
        keywords: 'omen caretaker objective',
      },
      {
        key: 'omens-swift',
        label: 'Omens Fulfilled Swiftly',
        value: int(omenStore.totalOmensSwift),
        keywords: 'omen deadline bonus',
      },
      {
        key: 'omen-buffs',
        label: 'Omen Buffs Running',
        value: int(omenStore.liveBuffs.length),
      },
      {
        key: 'omen-cps',
        label: 'Omen Production Buff',
        value: bonus(omenStore.cpsMult),
      },
      {
        key: 'omen-cpc',
        label: 'Omen Click Buff',
        value: bonus(omenStore.cpcMult),
      },
      {
        key: 'omen-dps',
        label: 'Omen Damage Buff',
        value: bonus(omenStore.combatDpsMult),
      },
      {
        key: 'omen-drops',
        label: 'Omen Drop Buff',
        value: bonus(omenStore.materialDropMult),
      },
      {
        key: 'omen-xp',
        label: 'Omen XP Buff',
        value: bonus(omenStore.xpMult),
      },
      // ── The Void ──
      // Die einzigen Zahlen im Katalog, bei denen ein HOHER Wert schlecht ist.
      // Die Quote steht deshalb bewusst als „Void Stopped Rate" und nicht als
      // Durchbruchquote — der Katalog soll den Erfolg messen, nicht das
      // Versäumnis, auch wenn beide Zähler danebenstehen.
      // Die Store-Felder heissen weiter `totalRifts*`: sie stehen so im
      // Spielstand, und ein umbenanntes Feld liesse die Zähler still auf null
      // zurückfallen. Was der Spieler liest, sagt „Void"; was gespeichert wird,
      // bleibt `rifts` — dasselbe Muster wie bei Chronicle/Astral Codex.
      {
        key: 'rifts-sealed',
        label: 'Void Slain',
        value: num(voidStore.totalRiftsSealed),
        highlight: true,
        keywords: 'void rift crawler maw husk pilgrim unmaking',
      },
      {
        key: 'rifts-seal-rate',
        label: 'Void Stopped Rate',
        value:
          voidStore.totalRiftsOpened > 0
            ? pct(voidStore.totalRiftsSealed / voidStore.totalRiftsOpened)
            : '—',
        keywords: 'void accuracy stopped',
      },
      {
        key: 'rifts-collapsed',
        label: 'Void Breaches',
        value: num(voidStore.totalRiftsCollapsed),
        keywords: 'void breach impact failed',
      },
      {
        key: 'void-hp-lost',
        label: 'Sun HP Lost to the Void',
        value: num(voidStore.totalVoidHpLost),
        keywords: 'void breach impact damage',
      },
      {
        key: 'void-meeps-lost',
        label: 'Meeps Lost to the Void',
        value: num(gameStore.totalMeepsDevoured),
        keywords: 'void breach impact meep devoured',
      },
      {
        key: 'void-cps',
        label: 'Void Production Effect',
        value: bonus(voidStore.cpsMult),
      },
      {
        key: 'void-cpc',
        label: 'Void Click Effect',
        value: bonus(voidStore.cpcMult),
      },
      {
        key: 'void-dps',
        label: 'Void Damage Effect',
        value: bonus(voidStore.combatDpsMult),
      },
      {
        key: 'void-drops',
        label: 'Void Drop Effect',
        value: bonus(voidStore.materialDropMult),
      },
      {
        key: 'void-xp',
        label: 'Void XP Effect',
        value: bonus(voidStore.xpMult),
      },
      // ── Bard-Fähigkeiten ──
      {
        key: 'resonance',
        label: 'Resonance',
        value: `${int(bardAbilityStore.resonance)} / ${RESONANCE_MAX_STACKS}`,
        highlight: true,
        keywords: "traveler's call passive stacks clicks",
      },
      // Durchweg mit `bard-` vorangestellt: „ability-power" ist oben bereits an
      // die Meep-Fähigkeiten vergeben, und die beiden Systeme dürfen im Katalog
      // nicht ineinanderlaufen.
      {
        key: 'bard-ability-power',
        label: 'Bard Ability Power',
        value: bonus(bardAbilityStore.resonancePowerMult),
        keywords: 'resonance passive q w e r',
      },
      {
        key: 'bard-ability-cdr',
        label: 'Bard Cooldown Reduction',
        value: pct(bardAbilityStore.resonanceCdr),
        keywords: 'resonance passive cooldown',
      },
      {
        key: 'bard-abilities-cast',
        label: 'Bard Abilities Cast',
        value: num(bardAbilityStore.totalCasts),
        keywords: 'q w e r binding shrine journey fate',
      },
      {
        key: 'bard-ability-damage',
        label: 'Bard Ability Damage',
        value: num(bardAbilityStore.totalAbilityDamage),
        keywords: 'cosmic binding tempered fate boss',
      },
      {
        key: 'bard-ability-healing',
        label: 'Bard Ability Healing',
        value: num(bardAbilityStore.totalAbilityHealing),
        keywords: "caretaker's shrine heal",
      },
    )
    return rows
  })

  const BUILDERS: Record<StatCategoryId, ComputedRef<StatEntry[]>> = {
    progression,
    economy,
    chimeWorks,
    autoBattle,
    combatRecord,
    objectives,
    champions,
    galaxy,
    starFights,
    planets,
    solar,
    starForge,
    meepTree,
    expeditions,
    materials,
    buffs,
  }

  const categories = computed<StatCategoryView[]>(() => {
    const q = query.value.trim().toLowerCase()
    return STAT_CATEGORIES.map((def) => {
      const all = BUILDERS[def.id].value
      const stats = q
        ? all.filter(
            (s) =>
              s.label.toLowerCase().includes(q) ||
              s.value.toLowerCase().includes(q) ||
              (s.keywords ?? '').includes(q) ||
              def.label.toLowerCase().includes(q),
          )
        : all
      return { ...def, stats, totalCount: all.length }
    })
  })

  const totalStatCount = computed(() => categories.value.reduce((sum, c) => sum + c.totalCount, 0))
  const matchCount = computed(() => categories.value.reduce((sum, c) => sum + c.stats.length, 0))

  return { categories, totalStatCount, matchCount }
}
