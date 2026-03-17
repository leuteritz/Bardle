<template>
  <div
    class="relative overflow-visible bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 rounded-xl"
  >
    <!-- Animated Background Blobs -->
    <div class="absolute inset-0 pointer-events-none opacity-20">
      <div
        class="absolute w-24 h-24 bg-blue-500 rounded-full top-4 left-4 mix-blend-multiply filter blur-xl animate-blob"
      ></div>
      <div
        class="absolute w-20 h-20 rounded-full bg-violet-500 top-4 right-4 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute bg-yellow-500 rounded-full -bottom-4 left-8 w-22 h-22 mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
      ></div>
    </div>

    <!-- Card -->
    <div
      class="relative z-10 p-5 transition-shadow duration-500 border shadow-2xl backdrop-blur-lg bg-white/10 border-white/20 rounded-xl group hover:shadow-violet-500/20"
    >
      <!-- Corner Decoration -->
      <div
        class="absolute top-0 right-0 w-32 h-32 translate-x-8 -translate-y-8 rounded-full pointer-events-none bg-gradient-to-br from-blue-400/20 to-transparent"
      ></div>

      <!-- ── RANK HEADER ── -->
      <div class="flex items-center gap-5">
        <!-- Rank Icon -->
        <div class="relative flex-shrink-0">
          <div
            class="absolute transition-opacity duration-500 rounded-full -inset-2 bg-gradient-to-r from-blue-400 to-violet-500 opacity-30 animate-pulse group-hover:opacity-60 blur-sm"
          ></div>
          <div
            class="relative w-20 h-20 overflow-hidden transition-transform duration-300 border-2 rounded-full shadow-xl border-white/30 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm group-hover:scale-105"
          >
            <img :src="rankIcon" alt="Rank Icon" class="object-cover w-full h-full" />
          </div>
          <!-- Quality Badge -->
          <div
            class="absolute flex items-center justify-center w-6 h-6 border-2 rounded-full shadow-lg -top-1 -right-1 border-white/40 backdrop-blur-sm"
            :class="getRankQualityColor()"
          >
            <span class="text-sm font-bold leading-none">{{ getRankQualityIcon() }}</span>
          </div>
          <!-- Promotion Indicator -->
          <div
            v-if="isPromotionClose()"
            class="absolute w-4 h-4 bg-green-500 rounded-full -top-2 -left-2 animate-bounce"
          >
            <div class="absolute inset-0 bg-green-400 rounded-full animate-ping"></div>
          </div>
        </div>

        <!-- Rank Info -->
        <div class="flex flex-col flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <h3
              class="text-2xl font-black leading-tight text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
            >
              {{ battleStore.currentRank.tier }} {{ battleStore.currentRank.division }}
            </h3>
            <span
              class="px-2 py-0.5 text-xs font-medium text-blue-300 border rounded-full bg-blue-500/20 border-blue-400/30 backdrop-blur-sm"
            >
              Current Rank
            </span>
          </div>

          <!-- LP -->
          <div class="flex items-center gap-2 mb-3">
            <span
              class="text-lg font-bold text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
            >
              {{ battleStore.currentRank.lp }}
            </span>
            <span class="text-sm text-blue-400">LP</span>
            <span v-if="getLPToNext() !== null" class="text-xs text-blue-300/70">
              · {{ getLPToNext() }} LP bis {{ getNextRank() }}
            </span>
          </div>

          <!-- Progress Bar -->
          <div v-if="!isMaxRank()">
            <div class="flex justify-between mb-1 text-xs text-blue-300">
              <span>Progress to {{ getNextRank() }}</span>
              <span>{{ getLPProgress() }}%</span>
            </div>
            <div
              class="relative w-full h-2 overflow-hidden border rounded-full bg-gray-700/50 border-white/10 backdrop-blur-sm"
            >
              <div
                class="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-blue-400 to-violet-500"
                :style="{
                  width: `${getLPProgress()}%`,
                  boxShadow: '0 0 12px rgba(168,85,247,0.6)',
                }"
              >
                <div
                  class="h-full rounded-full bg-gradient-to-r from-white/20 to-transparent"
                ></div>
              </div>
              <div
                class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
              ></div>
            </div>
          </div>

          <!-- Max Rank -->
          <div v-else class="flex">
            <div
              class="px-3 py-1 border rounded-full bg-gradient-to-r from-blue-400 to-violet-500 border-blue-400/50"
            >
              <span class="text-xs font-bold text-white">🏆 HIGHEST RANK ACHIEVED</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── RANK STATS ROW ── -->
      <div class="flex items-center justify-around pt-4 mt-4 border-t border-white/10">
        <div class="text-center">
          <div
            class="text-sm font-bold text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
          >
            {{ getRankTier() }}
          </div>
          <div class="text-xs text-blue-400 mt-0.5">Tier</div>
        </div>
        <div class="w-px h-8 bg-white/10"></div>
        <div class="text-center">
          <div
            class="text-sm font-bold text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
          >
            {{ getRankPercentile() }}%
          </div>
          <div class="text-xs text-blue-400 mt-0.5">Top Players</div>
        </div>
        <div class="w-px h-8 bg-white/10"></div>
        <div class="text-center">
          <div class="text-sm font-bold" :class="getStatusColor()">{{ getStatus() }}</div>
          <div class="text-xs text-blue-400 mt-0.5">Status</div>
        </div>
      </div>

      <!-- ── BATTLE STATISTICS ── -->
      <div class="pt-4 mt-5 border-t border-white/10">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-base">⚔️</span>
          <h4
            class="text-sm font-bold text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
          >
            Battle Statistics
          </h4>
          <span
            class="px-2 py-0.5 text-xs font-medium text-blue-300 border rounded-full bg-blue-500/20 border-blue-400/30"
          >
            {{ battleStore.totalBattles }} Battles
          </span>
        </div>

        <!-- Win / Loss / Total -->
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div
            class="p-3 text-center transition-colors duration-200 border rounded-lg bg-blue-500/20 border-blue-400/30 backdrop-blur-sm hover:bg-blue-500/30"
          >
            <div
              class="text-xl font-black text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
            >
              {{ battleStore.totalBattles }}
            </div>
            <div class="text-xs text-blue-400 mt-0.5">Total</div>
          </div>
          <div
            class="p-3 text-center transition-colors duration-200 border rounded-lg bg-green-500/20 border-green-400/30 backdrop-blur-sm hover:bg-green-500/30"
          >
            <div class="text-xl font-black text-green-300">{{ battleStore.totalWins }}</div>
            <div class="text-xs text-blue-400 mt-0.5">Wins</div>
          </div>
          <div
            class="p-3 text-center transition-colors duration-200 border rounded-lg bg-red-500/20 border-red-400/30 backdrop-blur-sm hover:bg-red-500/30"
          >
            <div class="text-xl font-black text-red-300">{{ battleStore.totalLosses }}</div>
            <div class="text-xs text-blue-400 mt-0.5">Losses</div>
          </div>
        </div>

        <!-- Win Rate Bar -->
        <div class="mb-4">
          <div class="flex justify-between text-xs text-blue-300 mb-1.5">
            <span>Performance</span>
            <span :class="getWinRateColor()" class="font-semibold"
              >{{ getWinRate() }}% Win Rate</span
            >
          </div>
          <div
            class="w-full h-2 border rounded-full bg-gray-700/50 border-white/10 backdrop-blur-sm"
          >
            <div
              class="h-2 transition-all duration-500 rounded-full"
              :class="getWinRateBarColor()"
              :style="{ width: `${getWinRate()}%` }"
            ></div>
          </div>
        </div>

        <!-- Extra Stats Grid -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div
            class="p-2.5 text-center rounded-lg bg-blue-500/20 border border-blue-400/30 backdrop-blur-sm"
          >
            <div class="text-sm font-bold text-blue-300">
              {{ battleStore.getAvgBattleTime() }}min
            </div>
            <div class="text-xs text-blue-400 mt-0.5">Avg. Battle Time</div>
          </div>
          <div
            class="p-2.5 text-center rounded-lg bg-amber-500/20 border border-amber-400/30 backdrop-blur-sm"
          >
            <div class="text-sm font-bold text-amber-300">{{ battleStore.bestWinStreak }}</div>
            <div class="text-xs text-blue-400 mt-0.5">Best Streak</div>
          </div>
        </div>

        <!-- Bottom Row -->
        <div class="flex items-center justify-around pt-3 border-t border-white/10">
          <div class="text-center">
            <div class="text-sm font-bold" :class="getWinRateColor()">{{ getWinRate() }}%</div>
            <div class="text-xs text-blue-400 mt-0.5">Win Rate</div>
          </div>
          <div class="w-px h-8 bg-white/10"></div>
          <div class="text-center">
            <div
              class="text-sm font-bold text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
            >
              {{ battleStore.currentWinStreak }}
            </div>
            <div class="text-xs text-blue-400 mt-0.5">Win Streak</div>
          </div>
          <div class="w-px h-8 bg-white/10"></div>
          <div class="text-center">
            <div class="text-sm font-bold" :class="getBattleRankColor()">{{ getBattleRank() }}</div>
            <div class="text-xs text-blue-400 mt-0.5">Battle Rank</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useBattleStore } from '../stores/battleStore'
import { useRankCalculations } from '../composables/useRankCalculations'

export default defineComponent({
  name: 'RankComponent',

  setup() {
    const battleStore = useBattleStore()

    const {
      rankIcon,
      getRankQualityColor,
      getRankQualityIcon,
      isMaxRank,
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
    } = useRankCalculations()

    return {
      battleStore,
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
      getBattleRank,
      getBattleRankColor,
    }
  },
})
</script>

<style scoped>
@keyframes rankGlow {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 35px rgba(139, 92, 246, 0.55);
  }
}

.group:hover {
  animation: rankGlow 2.5s ease-in-out infinite;
}
</style>
