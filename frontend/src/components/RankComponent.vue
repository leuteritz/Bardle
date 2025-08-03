<template>
  <div class="relative">
    <!-- Main Rank Display (feste Höhe) -->
    <div
      class="relative p-4 overflow-hidden transition-all duration-300 border-2 shadow-lg group bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 rounded-xl border-amber-400 hover:shadow-xl"
    >
      <!-- Background Decoration -->
      <div
        class="absolute top-0 right-0 w-24 h-24 translate-x-6 -translate-y-6 rounded-full bg-gradient-to-br from-amber-400/20 to-transparent"
      ></div>

      <!-- Rank Display (bleibt unverändert) -->
      <div class="flex items-center space-x-4">
        <!-- Rank Icon mit Glow und Animation -->
        <div class="relative">
          <!-- Outer Glow Ring -->
          <div
            class="absolute transition-opacity duration-300 rounded-full -inset-2 bg-gradient-to-r from-amber-400 to-yellow-500 opacity-30 animate-pulse group-hover:opacity-50"
          ></div>

          <!-- Rank Icon Container -->
          <div
            class="relative w-20 h-20 overflow-hidden transition-transform duration-300 rounded-full shadow-xl bg-gradient-to-br from-amber-100 to-yellow-100 border-3 border-amber-300 group-hover:scale-110"
          >
            <img :src="rankIcon" alt="Rank Icon" class="object-cover w-full h-full" />
          </div>

          <!-- Rank Quality Badge -->
          <div
            class="absolute flex items-center justify-center w-6 h-6 border-2 rounded-full shadow-lg -top-1 -right-1 border-amber-200"
            :class="getRankQualityColor()"
          >
            <span class="text-sm font-bold">{{ getRankQualityIcon() }}</span>
          </div>

          <!-- Promotion Indicator -->
          <div
            v-if="isPromotionClose()"
            class="absolute w-4 h-4 bg-green-500 rounded-full -top-2 -left-2 animate-bounce"
          >
            <div class="absolute inset-0 bg-green-400 rounded-full animate-ping"></div>
          </div>
        </div>

        <!-- Rank Information -->
        <div class="flex flex-col flex-1">
          <!-- Rank Title -->
          <div class="flex items-center mb-2 space-x-2">
            <h3 class="text-2xl font-black text-amber-100">
              {{ gameStore.currentRank.tier }} {{ gameStore.currentRank.division }}
            </h3>
            <div class="px-2 py-1 border rounded-full bg-amber-100/20 border-amber-300/30">
              <span class="text-xs font-medium text-amber-200">Current Rank</span>
            </div>
          </div>

          <!-- LP Information -->
          <div class="flex items-center mb-3 space-x-3">
            <div class="flex items-center space-x-1">
              <span class="text-lg font-bold text-amber-100">{{ gameStore.currentRank.lp }}</span>
              <span class="text-sm text-amber-200">LP</span>
            </div>

            <!-- LP to next rank -->
            <div v-if="getLPToNext() !== null" class="text-xs text-amber-300">
              {{ getLPToNext() }} LP to {{ getNextRank() }}
            </div>
          </div>

          <!-- LP Progress Bar -->
          <div v-if="!isMaxRank()" class="space-y-2">
            <div class="flex justify-between text-xs text-amber-200">
              <span>Progress to {{ getNextRank() }}</span>
              <span>{{ getLPProgress() }}%</span>
            </div>
            <div class="w-full h-2 rounded-full shadow-inner bg-amber-200/20">
              <div
                class="h-2 transition-all duration-500 rounded-full shadow-sm bg-gradient-to-r from-amber-400 to-yellow-500"
                :style="{ width: `${getLPProgress()}%` }"
              >
                <div
                  class="h-full rounded-full bg-gradient-to-r from-white/20 to-transparent"
                ></div>
              </div>
            </div>
          </div>

          <!-- Max Rank Indicator -->
          <div v-else class="space-y-2">
            <div class="flex justify-center">
              <div
                class="px-3 py-1 border rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-300"
              >
                <span class="text-xs font-bold text-amber-900">🏆 HIGHEST RANK ACHIEVED</span>
              </div>
            </div>
          </div>

          <!-- Rank Stats -->
          <div class="flex items-center justify-between pt-3 mt-3 border-t border-amber-500/30">
            <div class="text-center">
              <div class="text-sm font-bold text-amber-100">{{ getRankTier() }}</div>
              <div class="text-xs text-amber-200">Tier</div>
            </div>
            <div class="text-center">
              <div class="text-sm font-bold text-amber-100">{{ getRankPercentile() }}%</div>
              <div class="text-xs text-amber-200">Top Players</div>
            </div>
            <div class="text-center">
              <div class="text-sm font-bold" :class="getStatusColor()">
                {{ getStatus() }}
              </div>
              <div class="text-xs text-amber-200">Status</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Battle Statistics Header (Clickable) - immer sichtbar -->
      <div
        @click="toggleBattleStats"
        class="flex items-center justify-between p-3 mt-4 transition-all duration-200 border rounded-lg cursor-pointer bg-gradient-to-r from-amber-100/10 to-yellow-100/10 border-amber-400/20 hover:bg-amber-100/20 hover:border-amber-400/40"
      >
        <div class="flex items-center space-x-2">
          <span class="text-lg">⚔️</span>
          <h4 class="text-sm font-bold text-amber-100">Battle Statistics</h4>
          <div
            class="px-2 py-1 text-xs font-medium border rounded-full bg-amber-100/20 border-amber-300/30 text-amber-200"
          >
            {{ battleStore.totalBattles }} Battles
          </div>
        </div>

        <!-- Toggle Arrow -->
        <div
          class="flex items-center justify-center w-8 h-8 transition-transform duration-300 rounded-full bg-amber-100/10 hover:bg-amber-100/20"
          :class="{ 'rotate-180': showBattleStats }"
        >
          <span class="text-amber-200">▼</span>
        </div>
      </div>
    </div>

    <!-- Battle Statistics Dropdown - ABSOLUT POSITIONIERT -->
    <div
      v-if="showBattleStats"
      class="absolute left-0 right-0 z-50 mt-2 transition-all duration-300 ease-in-out top-full"
    >
      <div
        class="p-4 border shadow-xl bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 rounded-xl border-amber-400"
      >
        <!-- Main Battle Stats -->
        <div class="grid grid-cols-3 gap-4 mb-3">
          <!-- Total Battles -->
          <div
            class="p-2 text-center transition-all duration-200 border rounded-lg bg-amber-100/10 border-amber-300/20 hover:bg-amber-100/20"
          >
            <div class="text-lg font-black text-amber-100">{{ battleStore.totalBattles }}</div>
            <div class="text-xs text-amber-200">Total Battles</div>
          </div>

          <!-- Total Wins -->
          <div
            class="p-2 text-center transition-all duration-200 border rounded-lg bg-green-100/10 border-green-300/20 hover:bg-green-100/20"
          >
            <div class="text-lg font-black text-green-300">{{ battleStore.totalWins }}</div>
            <div class="text-xs text-amber-200">Victories</div>
          </div>

          <!-- Total Losses -->
          <div
            class="p-2 text-center transition-all duration-200 border rounded-lg bg-red-100/10 border-red-300/20 hover:bg-red-100/20"
          >
            <div class="text-lg font-black text-red-300">{{ battleStore.totalLosses }}</div>
            <div class="text-xs text-amber-200">Defeats</div>
          </div>
        </div>

        <!-- Win Rate and Additional Stats -->
        <div class="flex items-center justify-between pt-2 border-t border-amber-400/20">
          <div class="text-center">
            <div class="text-sm font-bold" :class="getWinRateColor()">{{ getWinRate() }}%</div>
            <div class="text-xs text-amber-200">Win Rate</div>
          </div>

          <div class="text-center">
            <div class="text-sm font-bold text-amber-100">{{ getCurrentWinStreak() }}</div>
            <div class="text-xs text-amber-200">Win Streak</div>
          </div>

          <div class="text-center">
            <div class="text-sm font-bold" :class="getBattleRankColor()">{{ getBattleRank() }}</div>
            <div class="text-xs text-amber-200">Battle Rank</div>
          </div>
        </div>

        <!-- Win Rate Progress Bar -->
        <div class="mt-3">
          <div class="flex justify-between mb-1 text-xs text-amber-200">
            <span>Performance</span>
            <span>{{ getWinRate() }}% Win Rate</span>
          </div>
          <div class="w-full bg-amber-200/20 rounded-full h-1.5">
            <div
              class="h-1.5 rounded-full transition-all duration-500"
              :class="getWinRateBarColor()"
              :style="{ width: `${getWinRate()}%` }"
            ></div>
          </div>
        </div>

        <!-- Additional Battle Details -->
        <div class="grid grid-cols-2 gap-3 mt-4">
          <div class="p-2 text-center border rounded-lg bg-blue-100/10 border-blue-300/20">
            <div class="text-sm font-bold text-blue-300">{{ getAverageGameTime() }}min</div>
            <div class="text-xs text-amber-200">Avg. Game Time</div>
          </div>
          <div class="p-2 text-center border rounded-lg bg-purple-100/10 border-purple-300/20">
            <div class="text-sm font-bold text-purple-300">{{ getBestWinStreak() }}</div>
            <div class="text-xs text-amber-200">Best Streak</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import { useBattleStore } from '../stores/battleStore'
import { useGameStore } from '../stores/gameStore'

export default defineComponent({
  name: 'RankComponent',

  setup() {
    const battleStore = useBattleStore()
    const gameStore = useGameStore()
    const showBattleStats = ref(false)

    const toggleBattleStats = () => {
      showBattleStats.value = !showBattleStats.value
    }

    const rankIcon = computed(() => {
      switch (gameStore.currentRank.tier) {
        case 'Iron':
          return '/img/RankBorder/RankIron.png'
        case 'Bronze':
          return '/img/RankBorder/RankBronze.png'
        case 'Silver':
          return '/img/RankBorder/RankSilver.png'
        case 'Gold':
          return '/img/RankBorder/RankGold.png'
        case 'Platinum':
          return '/img/RankBorder/RankPlatin.png'
        case 'Emerald':
          return '/img/RankBorder/RankEmerald.png'
        case 'Diamond':
          return '/img/RankBorder/RankDiamand.png'
        case 'Master':
          return '/img/RankBorder/RankMaster.png'
        case 'Grandmaster':
          return '/img/RankBorder/RankGrandMaster.png'
        case 'Challenger':
          return '/img/RankBorder/RankChallenger.png'
        default:
          return '/img/RankBorder/RankIron.png'
      }
    })

    // [Alle bestehenden Funktionen bleiben unverändert]
    const getRankQualityColor = () => {
      const tier = gameStore.currentRank.tier?.toLowerCase()
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
      const tier = gameStore.currentRank.tier?.toLowerCase()
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
      return gameStore.currentRank.tier === 'Challenger'
    }

    const getPromotionThreshold = () => {
      const tier = gameStore.currentRank.tier?.toLowerCase()
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
      if (!gameStore.currentRank.lp || isMaxRank()) return 0
      const threshold = getPromotionThreshold()
      if (!threshold) return 0
      const tier = gameStore.currentRank.tier?.toLowerCase()
      if (tier === 'master' || tier === 'grandmaster') {
        return Math.min(100, (gameStore.currentRank.lp / threshold) * 100)
      } else {
        return Math.min(100, gameStore.currentRank.lp % threshold)
      }
    }

    const getLPToNext = () => {
      if (!gameStore.currentRank.lp || isMaxRank()) return null
      const threshold = getPromotionThreshold()
      if (!threshold) return null
      const tier = gameStore.currentRank.tier?.toLowerCase()
      if (tier === 'master' || tier === 'grandmaster') {
        return Math.max(0, threshold - gameStore.currentRank.lp)
      } else {
        return threshold - (gameStore.currentRank.lp % threshold)
      }
    }

    const getNextRank = () => {
      if (isMaxRank()) return 'Max Rank'
      const tier = gameStore.currentRank.tier?.toLowerCase()
      if (tier === 'master') {
        return 'Grandmaster'
      } else if (tier === 'grandmaster') {
        return 'Challenger'
      } else {
        const divisions = ['IV', 'III', 'II', 'I']
        const currentDiv = divisions.indexOf(gameStore.currentRank.division)
        if (currentDiv < divisions.length - 1) {
          return `${gameStore.currentRank.tier} ${divisions[currentDiv + 1]}`
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
          const currentTier = tiers.indexOf(gameStore.currentRank.tier)
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
      return tiers.indexOf(gameStore.currentRank.tier) + 1
    }

    const getRankPercentile = () => {
      const tier = gameStore.currentRank.tier?.toLowerCase()
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
      if (!gameStore.currentRank.lp || isMaxRank()) return false
      const threshold = getPromotionThreshold()
      if (!threshold) return false
      const tier = gameStore.currentRank.tier?.toLowerCase()
      if (tier === 'master') {
        return gameStore.currentRank.lp >= 400
      } else if (tier === 'grandmaster') {
        return gameStore.currentRank.lp >= 800
      } else {
        return gameStore.currentRank.lp % threshold >= 80
      }
    }

    const getStatus = () => {
      if (isMaxRank()) return 'Apex'
      if (isPromotionClose()) return 'Promotion'
      const tier = gameStore.currentRank.tier?.toLowerCase()
      if (tier === 'master' || tier === 'grandmaster') {
        if (gameStore.currentRank.lp <= 50) return 'Danger'
        return 'Climbing'
      } else {
        if (gameStore.currentRank.lp && gameStore.currentRank.lp % 100 <= 20) return 'Safe'
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

    // Battle Statistics Functions
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

    const getCurrentWinStreak = () => {
      return Math.max(0, Math.floor(Math.random() * 5))
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

    // Neue zusätzliche Statistiken
    const getAverageGameTime = () => {
      // Placeholder für durchschnittliche Spielzeit
      return Math.round(15 + Math.random() * 10)
    }

    const getBestWinStreak = () => {
      // Placeholder für beste Win-Streak
      return Math.round(5 + Math.random() * 10)
    }

    return {
      battleStore,
      showBattleStats,
      toggleBattleStats,
      rankIcon,
      getRankQualityColor,
      getRankQualityIcon,
      getLPProgress,
      getLPToNext,
      getNextRank,
      getRankTier,
      getRankPercentile,
      isPromotionClose,
      getStatus,
      getStatusColor,
      isMaxRank,
      getWinRate,
      getWinRateColor,
      getWinRateBarColor,
      getCurrentWinStreak,
      getBattleRank,
      getBattleRankColor,
      getAverageGameTime,
      getBestWinStreak,
      gameStore,
    }
  },
})
</script>

<style scoped>
@keyframes rankGlow {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(251, 191, 36, 0.6);
  }
}

.group:hover {
  animation: rankGlow 2s ease-in-out infinite;
}

/* Übergangsanimationen für das Ausklappen */
.max-h-0 {
  max-height: 0;
}

.max-h-96 {
  max-height: 24rem;
}
</style>
