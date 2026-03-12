import { computed } from 'vue'
import { useBattleStore } from '../stores/battleStore'
import { RANK_BORDER_IMAGES } from '../config/constants'

export function useRankCalculations() {
  const battleStore = useBattleStore()

  const rankIcon = computed(() => {
    return RANK_BORDER_IMAGES[battleStore.currentRank.tier] ?? RANK_BORDER_IMAGES.Iron
  })

  const getRankQualityColor = () => {
    const tier = battleStore.currentRank.tier?.toLowerCase()
    switch (tier) {
      case 'iron':
      case 'bronze':
        return 'bg-gradient-to-br from-gray-400 to-gray-500'
      case 'silver':
        return 'bg-gradient-to-br from-gray-300 to-gray-400'
      case 'gold':
        return 'bg-gradient-to-br from-yellow-400 to-yellow-500'
      case 'platinum':
        return 'bg-gradient-to-br from-cyan-400 to-cyan-500'
      case 'emerald':
        return 'bg-gradient-to-br from-emerald-400 to-emerald-500'
      case 'diamond':
        return 'bg-gradient-to-br from-blue-400 to-blue-500'
      case 'master':
        return 'bg-gradient-to-br from-purple-400 to-purple-500'
      case 'grandmaster':
        return 'bg-gradient-to-br from-red-400 to-red-500'
      case 'challenger':
        return 'bg-gradient-to-br from-amber-400 to-amber-500'
      default:
        return 'bg-gradient-to-br from-gray-400 to-gray-500'
    }
  }

  const getRankQualityIcon = () => {
    const tier = battleStore.currentRank.tier?.toLowerCase()
    switch (tier) {
      case 'iron':
        return '🥉'
      case 'bronze':
        return '🥉'
      case 'silver':
        return '🥈'
      case 'gold':
        return '🥇'
      case 'platinum':
        return '💎'
      case 'emerald':
        return '💚'
      case 'diamond':
        return '💠'
      case 'master':
        return '👑'
      case 'grandmaster':
        return '⭐'
      case 'challenger':
        return '🏆'
      default:
        return '•'
    }
  }

  const isMaxRank = () => {
    return battleStore.currentRank.tier === 'Challenger'
  }

  const getPromotionThreshold = () => {
    const tier = battleStore.currentRank.tier?.toLowerCase()
    switch (tier) {
      case 'master':
        return 500
      case 'grandmaster':
        return 1000
      case 'challenger':
        return null
      default:
        return 100
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
      const divisions = ['IV', 'III', 'II', 'I']
      const currentDiv = divisions.indexOf(battleStore.currentRank.division)
      if (currentDiv < divisions.length - 1) {
        return `${battleStore.currentRank.tier} ${divisions[currentDiv + 1]}`
      } else {
        const tiers = [
          'Iron',
          'Bronze',
          'Silver',
          'Gold',
          'Platinum',
          'Emerald',
          'Diamond',
          'Master',
        ]
        const currentTier = tiers.indexOf(battleStore.currentRank.tier)
        if (currentTier < tiers.length - 1) {
          const nextTier = tiers[currentTier + 1]
          return nextTier === 'Master' ? 'Master' : `${nextTier} IV`
        }
        return 'Master'
      }
    }
  }

  const getRankTier = () => {
    const tiers = [
      'Iron',
      'Bronze',
      'Silver',
      'Gold',
      'Platinum',
      'Emerald',
      'Diamond',
      'Master',
      'Grandmaster',
      'Challenger',
    ]
    return tiers.indexOf(battleStore.currentRank.tier) + 1
  }

  const getRankPercentile = () => {
    const tier = battleStore.currentRank.tier?.toLowerCase()
    switch (tier) {
      case 'iron':
        return 95
      case 'bronze':
        return 85
      case 'silver':
        return 70
      case 'gold':
        return 50
      case 'platinum':
        return 30
      case 'emerald':
        return 15
      case 'diamond':
        return 5
      case 'master':
        return 1
      case 'grandmaster':
        return 0.1
      case 'challenger':
        return 0.01
      default:
        return 100
    }
  }

  const isPromotionClose = () => {
    if (!battleStore.currentRank.lp || isMaxRank()) return false
    const threshold = getPromotionThreshold()
    if (!threshold) return false
    const tier = battleStore.currentRank.tier?.toLowerCase()
    if (tier === 'master') {
      return battleStore.currentRank.lp >= 400
    } else if (tier === 'grandmaster') {
      return battleStore.currentRank.lp >= 800
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

  const getWinRateColor = () => {
    const winRate = getWinRate()
    if (winRate >= 70) return 'text-green-300'
    if (winRate >= 50) return 'text-yellow-300'
    if (winRate >= 30) return 'text-orange-300'
    return 'text-red-300'
  }

  const getWinRateBarColor = () => {
    const winRate = getWinRate()
    if (winRate >= 70) return 'bg-gradient-to-r from-green-400 to-green-500'
    if (winRate >= 50) return 'bg-gradient-to-r from-yellow-400 to-yellow-500'
    if (winRate >= 30) return 'bg-gradient-to-r from-orange-400 to-orange-500'
    return 'bg-gradient-to-r from-red-400 to-red-500'
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

  const getBattleRankColor = () => {
    const rank = getBattleRank()
    switch (rank) {
      case 'Legend':
        return 'text-purple-300'
      case 'Elite':
        return 'text-blue-300'
      case 'Veteran':
        return 'text-green-300'
      case 'Fighter':
        return 'text-yellow-300'
      case 'Rookie':
        return 'text-orange-300'
      default:
        return 'text-gray-300'
    }
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
