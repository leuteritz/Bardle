<template>
  <div
    class="group relative overflow-hidden rounded-2xl transition-all duration-300 border backdrop-blur-xl bg-black/30 border-violet-500/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_40px_rgba(139,92,246,0.25)] hover:scale-[1.005] hover:-translate-y-0.5"
  >
    <!-- Shimmer Sweep on Hover -->
    <div
      class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
    />

    <!-- Glow Pulse Border when promotion close -->
    <div
      v-if="isPromotionClose()"
      class="absolute inset-0 border pointer-events-none rounded-2xl border-emerald-400/40 animate-pulse"
    />

    <div class="relative z-10 p-5">
      <!-- ── RANK HEADER ── -->
      <div class="flex items-center gap-4">
        <!-- Rank Icon -->
        <div class="relative flex-shrink-0">
          <div
            class="absolute transition-opacity duration-500 rounded-full -inset-2 bg-gradient-to-r from-blue-400 to-violet-500 opacity-20 group-hover:opacity-50 blur-sm"
          />
          <div
            class="relative flex items-center justify-center w-16 h-16 transition-transform duration-300 border shadow-inner rounded-xl bg-gradient-to-br from-white/10 to-white/5 border-white/15 group-hover:scale-110"
          >
            <img
              :src="rankIcon"
              alt="Rank Icon"
              class="relative z-10 object-contain w-10 h-10 drop-shadow-lg"
            />
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
            <div class="absolute inset-0 bg-green-400 rounded-full animate-ping" />
          </div>
        </div>

        <!-- Rank Info -->
        <div class="flex flex-col flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1.5">
            <h3
              class="text-2xl font-black leading-tight tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
            >
              {{ battleStore.currentRank.tier }} {{ battleStore.currentRank.division }}
            </h3>
            <span
              class="px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200 tracking-wider"
            >
              Current Rank
            </span>
          </div>

          <!-- LP -->
          <div class="flex items-center gap-2 mb-3">
            <span
              class="text-lg font-black text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
            >
              {{ battleStore.currentRank.lp }}
            </span>
            <span class="text-sm font-bold text-blue-400">LP</span>
            <span v-if="getLPToNext() !== null" class="text-xs text-blue-300/70">
              · {{ getLPToNext() }} LP bis {{ getNextRank() }}
            </span>
          </div>

          <!-- Progress Bar -->
          <div v-if="!isMaxRank()">
            <div class="flex justify-between mb-1.5 text-xs text-blue-300/70">
              <span>Progress to {{ getNextRank() }}</span>
              <span class="font-bold text-blue-200">{{ getLPProgress() }}%</span>
            </div>
            <div
              class="relative w-full h-2 overflow-hidden border rounded-full bg-gray-800/60 border-white/10 backdrop-blur-sm"
            >
              <div
                class="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-blue-400 to-violet-500"
                :style="{
                  width: `${getLPProgress()}%`,
                  boxShadow: '0 0 12px rgba(168,85,247,0.6)',
                }"
              >
                <div class="h-full rounded-full bg-gradient-to-r from-white/20 to-transparent" />
              </div>
            </div>
          </div>

          <!-- Max Rank -->
          <div v-else>
            <span
              class="px-3 py-1 text-xs font-black tracking-wider text-blue-200 border rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border-blue-400/30"
            >
              🏆 HIGHEST RANK ACHIEVED
            </span>
          </div>
        </div>
      </div>

      <!-- ── RANK STATS ROW ── -->
      <div class="grid grid-cols-3 gap-3 mt-5">
        <div
          class="p-2.5 text-center rounded-xl bg-gradient-to-br from-violet-900/20 to-white/5 border border-white/15 backdrop-blur-sm"
        >
          <div
            class="text-sm font-black text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
          >
            {{ getRankTier() }}
          </div>
          <div class="text-xs text-blue-400 mt-0.5">Tier</div>
        </div>
        <div
          class="p-2.5 text-center rounded-xl bg-gradient-to-br from-violet-900/20 to-white/5 border border-white/15 backdrop-blur-sm"
        >
          <div
            class="text-sm font-black text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
          >
            {{ getRankPercentile() }}%
          </div>
          <div class="text-xs text-blue-400 mt-0.5">Top Players</div>
        </div>
        <div
          class="p-2.5 text-center rounded-xl bg-gradient-to-br from-violet-900/20 to-white/5 border border-white/15 backdrop-blur-sm"
        >
          <div class="text-sm font-black" :class="getStatusColor()">{{ getStatus() }}</div>
          <div class="text-xs text-blue-400 mt-0.5">Status</div>
        </div>
      </div>

      <!-- ── BATTLE STATISTICS ── -->
      <div class="pt-4 mt-5 border-t border-white/10">
        <div class="flex items-center gap-2 mb-4">
          <span class="text-base">⚔️</span>
          <h4
            class="text-sm font-black tracking-wide text-violet-300"
          >
            Battle Statistics
          </h4>
          <span
            class="px-2 py-0.5 text-xs font-black rounded-full bg-gradient-to-r from-blue-500/30 to-violet-500/30 border border-blue-400/30 text-blue-200 tracking-wider"
          >
            {{ battleStore.totalBattles }} Battles
          </span>
        </div>

        <!-- Win / Loss / Total -->
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div
            class="p-3 text-center transition-colors duration-200 border rounded-xl bg-gradient-to-br from-violet-900/20 to-white/5 border-white/15 backdrop-blur-sm hover:bg-white/10"
          >
            <div
              class="text-xl font-black text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
            >
              {{ battleStore.totalBattles }}
            </div>
            <div class="text-xs text-blue-400 mt-0.5">Total</div>
          </div>
          <div
            class="p-3 text-center transition-colors duration-200 border rounded-xl bg-emerald-500/20 border-emerald-400/30 backdrop-blur-sm hover:bg-emerald-500/30"
          >
            <div class="text-xl font-black text-emerald-300">{{ battleStore.totalWins }}</div>
            <div class="text-xs text-blue-400 mt-0.5">Wins</div>
          </div>
          <div
            class="p-3 text-center transition-colors duration-200 border rounded-xl bg-red-500/20 border-red-400/30 backdrop-blur-sm hover:bg-red-500/30"
          >
            <div class="text-xl font-black text-red-300">{{ battleStore.totalLosses }}</div>
            <div class="text-xs text-blue-400 mt-0.5">Losses</div>
          </div>
        </div>

        <!-- Win Rate Bar -->
        <div class="mb-4">
          <div class="flex justify-between mb-1.5 text-xs text-blue-300/70">
            <span>Performance</span>
            <span :class="getWinRateColor()" class="font-black">{{ getWinRate() }}% Win Rate</span>
          </div>
          <div
            class="w-full h-2 border rounded-full bg-gray-800/60 border-white/10 backdrop-blur-sm"
          >
            <div
              class="h-2 transition-all duration-500 rounded-full"
              :class="getWinRateBarColor()"
              :style="{ width: `${getWinRate()}%` }"
            />
          </div>
        </div>

        <!-- Extra Stats Grid -->
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div
            class="p-2.5 text-center rounded-xl bg-gradient-to-br from-violet-900/20 to-white/5 border border-white/15 backdrop-blur-sm"
          >
            <div class="text-sm font-black text-blue-200">
              {{ battleStore.getAvgBattleTime() }}min
            </div>
            <div class="text-xs text-blue-400 mt-0.5">Avg. Battle Time</div>
          </div>
          <div
            class="p-2.5 text-center rounded-xl bg-amber-500/20 border border-amber-400/30 backdrop-blur-sm"
          >
            <div class="text-sm font-black text-amber-300">{{ battleStore.bestWinStreak }}</div>
            <div class="text-xs text-blue-400 mt-0.5">Best Streak</div>
          </div>
        </div>

        <!-- Bottom Row -->
        <div class="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
          <div
            class="p-2.5 text-center rounded-xl bg-gradient-to-br from-violet-900/20 to-white/5 border border-white/15 backdrop-blur-sm"
          >
            <div class="text-sm font-black" :class="getWinRateColor()">{{ getWinRate() }}%</div>
            <div class="text-xs text-blue-400 mt-0.5">Win Rate</div>
          </div>
          <div
            class="p-2.5 text-center rounded-xl bg-gradient-to-br from-violet-900/20 to-white/5 border border-white/15 backdrop-blur-sm"
          >
            <div
              class="text-sm font-black text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
            >
              {{ battleStore.currentWinStreak }}
            </div>
            <div class="text-xs text-blue-400 mt-0.5">Win Streak</div>
          </div>
          <div
            class="p-2.5 text-center rounded-xl bg-gradient-to-br from-violet-900/20 to-white/5 border border-white/15 backdrop-blur-sm"
          >
            <div class="text-sm font-black" :class="getBattleRankColor()">
              {{ getBattleRank() }}
            </div>
            <div class="text-xs text-blue-400 mt-0.5">Battle Rank</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Script bleibt unverändert
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
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
