import { computed } from 'vue'
import { useBattleStore } from '../stores/battleStore'
import {
  RANK_BORDER_IMAGES,
  RANK_DIVISIONS,
  RANK_TIERS,
  LP_NORMAL_PROMOTION_THRESHOLD,
  LP_MASTER_PROMOTION_THRESHOLD,
  LP_GRANDMASTER_PROMOTION_THRESHOLD,
} from '../config/constants'

export function useRankCalculations() {
  const battleStore = useBattleStore()

  const rankIcon = computed(() => {
    return RANK_BORDER_IMAGES[battleStore.currentRank.tier] ?? RANK_BORDER_IMAGES.Iron
  })

  const RANK_QUALITY_COLORS: Record<string, string> = {
    iron: 'bg-gradient-to-br from-gray-400 to-gray-500',
    bronze: 'bg-gradient-to-br from-gray-400 to-gray-500',
    silver: 'bg-gradient-to-br from-gray-300 to-gray-400',
    gold: 'bg-gradient-to-br from-yellow-400 to-yellow-500',
    platinum: 'bg-gradient-to-br from-cyan-400 to-cyan-500',
    emerald: 'bg-gradient-to-br from-emerald-400 to-emerald-500',
    diamond: 'bg-gradient-to-br from-blue-400 to-blue-500',
    master: 'bg-gradient-to-br from-purple-400 to-purple-500',
    grandmaster: 'bg-gradient-to-br from-red-400 to-red-500',
    challenger: 'bg-gradient-to-br from-amber-400 to-amber-500',
  }

  const getRankQualityColor = () => {
    const tier = battleStore.currentRank.tier?.toLowerCase()
    return RANK_QUALITY_COLORS[tier] ?? 'bg-gradient-to-br from-gray-400 to-gray-500'
  }

  const RANK_QUALITY_ICONS: Record<string, string> = {
    iron: '🥉',
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    emerald: '💚',
    diamond: '💠',
    master: '👑',
    grandmaster: '⭐',
    challenger: '🏆',
  }

  const getRankQualityIcon = () => {
    const tier = battleStore.currentRank.tier?.toLowerCase()
    return RANK_QUALITY_ICONS[tier] ?? '•'
  }

  const isMaxRank = () => {
    return battleStore.currentRank.tier === 'Challenger'
  }

  const getPromotionThreshold = () => {
    const tier = battleStore.currentRank.tier?.toLowerCase()
    switch (tier) {
      case 'master':
        return LP_MASTER_PROMOTION_THRESHOLD
      case 'grandmaster':
        return LP_GRANDMASTER_PROMOTION_THRESHOLD
      case 'challenger':
        return null
      default:
        return LP_NORMAL_PROMOTION_THRESHOLD
    }
  }

  const getLPProgress = () => {
    if (!battleStore.currentRank.lp || isMaxRank()) return 0
    const threshold = getPromotionThreshold()
    if (!threshold) return 0
    const tier = battleStore.currentRank.tier?.toLowerCase()
    if (tier === 'master' || tier === 'grandmaster') {
      return Math.min(100, (battleStore.currentRank.lp / threshold) * 100)
    } else {
      return Math.min(100, battleStore.currentRank.lp % threshold)
    }
  }

  const getLPToNext = () => {
    if (!battleStore.currentRank.lp || isMaxRank()) return null
    const threshold = getPromotionThreshold()
    if (!threshold) return null
    const tier = battleStore.currentRank.tier?.toLowerCase()
    if (tier === 'master' || tier === 'grandmaster') {
      return Math.max(0, threshold - battleStore.currentRank.lp)
    } else {
      return threshold - (battleStore.currentRank.lp % threshold)
    }
  }

  const getNextRank = () => {
    if (isMaxRank()) return 'Max Rank'
    const tier = battleStore.currentRank.tier?.toLowerCase()
    if (tier === 'master') {
      return 'Grandmaster'
    } else if (tier === 'grandmaster') {
      return 'Challenger'
    } else {
      const currentDiv = RANK_DIVISIONS.indexOf(
        battleStore.currentRank.division as (typeof RANK_DIVISIONS)[number],
      )
      if (currentDiv < RANK_DIVISIONS.length - 1) {
        return `${battleStore.currentRank.tier} ${RANK_DIVISIONS[currentDiv + 1]}`
      } else {
        const tiersUpToMaster = RANK_TIERS.slice(0, -2) // excludes Grandmaster, Challenger
        const currentTier = tiersUpToMaster.indexOf(
          battleStore.currentRank.tier as (typeof tiersUpToMaster)[number],
        )
        if (currentTier < tiersUpToMaster.length - 1) {
          const nextTier = tiersUpToMaster[currentTier + 1]
          return nextTier === 'Master' ? 'Master' : `${nextTier} IV`
        }
        return 'Master'
      }
    }
  }

  const getRankTier = () => {
    return RANK_TIERS.indexOf(battleStore.currentRank.tier as (typeof RANK_TIERS)[number]) + 1
  }

  const RANK_PERCENTILES: Record<string, number> = {
    iron: 95,
    bronze: 85,
    silver: 70,
    gold: 50,
    platinum: 30,
    emerald: 15,
    diamond: 5,
    master: 1,
    grandmaster: 0.1,
    challenger: 0.01,
  }

  const getRankPercentile = () => {
    const tier = battleStore.currentRank.tier?.toLowerCase()
    return RANK_PERCENTILES[tier] ?? 100
  }

  const isPromotionClose = () => {
    if (!battleStore.currentRank.lp || isMaxRank()) return false
    const threshold = getPromotionThreshold()
    if (!threshold) return false
    const tier = battleStore.currentRank.tier?.toLowerCase()
    if (tier === 'master') {
      return battleStore.currentRank.lp >= LP_MASTER_PROMOTION_THRESHOLD * 0.8
    } else if (tier === 'grandmaster') {
      return battleStore.currentRank.lp >= LP_GRANDMASTER_PROMOTION_THRESHOLD * 0.8
    } else {
      return battleStore.currentRank.lp % threshold >= 80
    }
  }

  const getStatus = () => {
    if (isMaxRank()) return 'Apex'
    if (isPromotionClose()) return 'Promotion'
    const tier = battleStore.currentRank.tier?.toLowerCase()
    if (tier === 'master' || tier === 'grandmaster') {
      if (battleStore.currentRank.lp <= 50) return 'Danger'
      return 'Climbing'
    } else {
      if (battleStore.currentRank.lp && battleStore.currentRank.lp % 100 <= 20) return 'Safe'
      return 'Climbing'
    }
  }

  const getStatusColor = () => {
    const status = getStatus()
    switch (status) {
      case 'Apex':
        return 'text-amber-300'
      case 'Promotion':
        return 'text-green-300'
      case 'Danger':
        return 'text-red-300'
      case 'Safe':
        return 'text-blue-300'
      default:
        return 'text-amber-100'
    }
  }

  const getWinRate = () => {
    if (battleStore.totalBattles === 0) return 0
    return Math.round((battleStore.totalWins / battleStore.totalBattles) * 100)
  }

  const WIN_RATE_THRESHOLDS = [70, 50, 30] as const

  const getWinRateThresholdIndex = () => {
    const winRate = getWinRate()
    return WIN_RATE_THRESHOLDS.findIndex((t) => winRate >= t)
  }

  const getWinRateColor = () => {
    const colors = ['text-green-300', 'text-yellow-300', 'text-orange-300', 'text-red-300']
    const idx = getWinRateThresholdIndex()
    return idx === -1 ? colors[3] : colors[idx]
  }

  const getWinRateBarColor = () => {
    const colors = [
      'bg-gradient-to-r from-green-400 to-green-500',
      'bg-gradient-to-r from-yellow-400 to-yellow-500',
      'bg-gradient-to-r from-orange-400 to-orange-500',
      'bg-gradient-to-r from-red-400 to-red-500',
    ]
    const idx = getWinRateThresholdIndex()
    return idx === -1 ? colors[3] : colors[idx]
  }

  const getBattleRank = () => {
    const winRate = getWinRate()
    if (winRate >= 80) return 'Legend'
    if (winRate >= 70) return 'Elite'
    if (winRate >= 60) return 'Veteran'
    if (winRate >= 50) return 'Fighter'
    if (winRate >= 40) return 'Rookie'
    return 'Novice'
  }

  const BATTLE_RANK_COLORS: Record<string, string> = {
    Legend: 'text-purple-300',
    Elite: 'text-blue-300',
    Veteran: 'text-green-300',
    Fighter: 'text-yellow-300',
    Rookie: 'text-orange-300',
  }

  const getBattleRankColor = () => {
    const rank = getBattleRank()
    return BATTLE_RANK_COLORS[rank] ?? 'text-gray-300'
  }

  return {
    rankIcon,
    getRankQualityColor,
    getRankQualityIcon,
    isMaxRank,
    getPromotionThreshold,
    getLPProgress,
    getLPToNext,
    getNextRank,
    getRankTier,
    getRankPercentile,
    isPromotionClose,
    getStatus,
    getStatusColor,
    getWinRate,
    getWinRateColor,
    getWinRateBarColor,
    getBattleRank,
    getBattleRankColor,
  }
}
