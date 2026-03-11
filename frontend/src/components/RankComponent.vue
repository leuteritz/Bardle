<template>
  <div
    class="relative overflow-visible bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-xl"
  >
    <!-- Animated Background -->
    <div class="absolute inset-0 opacity-20">
      <div
        class="absolute w-24 h-24 bg-purple-500 rounded-full top-4 left-4 mix-blend-multiply filter blur-xl animate-blob"
      ></div>
      <div
        class="absolute w-20 h-20 bg-pink-500 rounded-full top-4 right-4 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute bg-yellow-500 rounded-full -bottom-4 left-8 w-22 h-22 mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
      ></div>
    </div>

    <!-- Main Rank Display (gleiche Größe wie original) -->
    <div
      class="relative z-10 p-4 overflow-hidden transition-all duration-300 border shadow-lg backdrop-blur-lg bg-white/10 border-white/20 rounded-xl group hover:shadow-xl"
    >
      <!-- Background Decoration (gleich wie original) -->
      <div
        class="absolute top-0 right-0 w-24 h-24 translate-x-6 -translate-y-6 rounded-full bg-gradient-to-br from-purple-400/20 to-transparent"
      ></div>

      <!-- Rank Display (gleiche Größen) -->
      <div class="flex items-center space-x-4">
        <!-- Rank Icon mit futuristischem Glow (gleiche Größe: w-20 h-20) -->
        <div class="relative">
          <!-- Outer Glow Ring -->
          <div
            class="absolute transition-opacity duration-300 rounded-full -inset-2 bg-gradient-to-r from-purple-400 to-pink-500 opacity-30 animate-pulse group-hover:opacity-50"
          ></div>

          <!-- Rank Icon Container (gleiche Größe) -->
          <div
            class="relative w-20 h-20 overflow-hidden transition-transform duration-300 border-2 rounded-full shadow-xl bg-gradient-to-br from-white/20 to-white/5 border-white/30 group-hover:scale-110 backdrop-blur-sm"
          >
            <img :src="rankIcon" alt="Rank Icon" class="object-cover w-full h-full" />
          </div>

          <!-- Rank Quality Badge (gleiche Größe) -->
          <div
            class="absolute flex items-center justify-center w-6 h-6 border-2 rounded-full shadow-lg -top-1 -right-1 border-white/40 backdrop-blur-sm"
            :class="getRankQualityColor()"
          >
            <span class="text-sm font-bold">{{ getRankQualityIcon() }}</span>
          </div>

          <!-- Promotion Indicator (gleiche Größe) -->
          <div
            v-if="isPromotionClose()"
            class="absolute w-4 h-4 bg-green-500 rounded-full -top-2 -left-2 animate-bounce"
          >
            <div class="absolute inset-0 bg-green-400 rounded-full animate-ping"></div>
          </div>
        </div>

        <!-- Rank Information (gleiche Größen) -->
        <div class="flex flex-col flex-1">
          <!-- Rank Title (gleiche Größe: text-2xl) -->
          <div class="flex items-center mb-2 space-x-2">
            <h3
              class="text-2xl font-black text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
            >
              {{ battleStore.currentRank.tier }} {{ battleStore.currentRank.division }}
            </h3>
            <div
              class="px-2 py-1 border rounded-full bg-purple-500/20 border-purple-400/30 backdrop-blur-sm"
            >
              <span class="text-xs font-medium text-purple-300">Current Rank</span>
            </div>
          </div>

          <!-- LP Information (gleiche Größen) -->
          <div class="flex items-center mb-3 space-x-3">
            <div class="flex items-center space-x-1">
              <span
                class="text-lg font-bold text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
                >{{ battleStore.currentRank.lp }}</span
              >
              <span class="text-sm text-purple-400">LP</span>
            </div>

            <!-- LP to next rank -->
            <div v-if="getLPToNext() !== null" class="text-xs text-purple-300">
              {{ getLPToNext() }} LP to {{ getNextRank() }}
            </div>
          </div>

          <!-- LP Progress Bar (gleiche Größe) -->
          <div v-if="!isMaxRank()" class="space-y-2">
            <div class="flex justify-between text-xs text-purple-300">
              <span>Progress to {{ getNextRank() }}</span>
              <span>{{ getLPProgress() }}%</span>
            </div>
            <div
              class="relative w-full h-2 overflow-hidden border rounded-full shadow-inner bg-gray-700/50 backdrop-blur-sm border-white/20"
            >
              <div
                class="h-2 transition-all duration-500 rounded-full shadow-sm bg-gradient-to-r from-purple-400 to-pink-500"
                :style="{
                  width: `${getLPProgress()}%`,
                  boxShadow: '0 0 15px rgba(168, 85, 247, 0.6)',
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

          <!-- Max Rank Indicator -->
          <div v-else class="space-y-2">
            <div class="flex justify-center">
              <div
                class="px-3 py-1 border rounded-full bg-gradient-to-r from-purple-400 to-pink-500 border-purple-400/50 backdrop-blur-sm"
              >
                <span
                  class="text-xs font-bold text-transparent bg-gradient-to-r from-white to-purple-100 bg-clip-text"
                  >🏆 HIGHEST RANK ACHIEVED</span
                >
              </div>
            </div>
          </div>

          <!-- Rank Stats (gleiche Größen) -->
          <div class="flex items-center justify-between pt-3 mt-3 border-t border-white/20">
            <div class="text-center">
              <div
                class="text-sm font-bold text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
              >
                {{ getRankTier() }}
              </div>
              <div class="text-xs text-purple-400">Tier</div>
            </div>
            <div class="text-center">
              <div
                class="text-sm font-bold text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
              >
                {{ getRankPercentile() }}%
              </div>
              <div class="text-xs text-purple-400">Top Players</div>
            </div>
            <div class="text-center">
              <div class="text-sm font-bold" :class="getStatusColor()">
                {{ getStatus() }}
              </div>
              <div class="text-xs text-purple-400">Status</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Battle Statistics Header (gleiche Größen) -->
      <div
        @click="toggleBattleStats"
        class="flex items-center justify-between p-3 mt-4 transition-all duration-200 border rounded-lg cursor-pointer bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30 backdrop-blur-sm hover:from-purple-500/30 hover:to-pink-500/30 hover:border-purple-400/50"
      >
        <div class="flex items-center space-x-2">
          <span class="text-lg">⚔️</span>
          <h4
            class="text-sm font-bold text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
          >
            Battle Statistics
          </h4>
          <div
            class="px-2 py-1 text-xs font-medium text-purple-300 border rounded-full bg-purple-500/20 border-purple-400/30"
          >
            {{ battleStore.totalBattles }} Battles
          </div>
        </div>

        <!-- Toggle Arrow (gleiche Größe) -->
        <div
          class="flex items-center justify-center w-8 h-8 transition-transform duration-300 border rounded-full bg-purple-500/20 hover:bg-purple-500/30 border-purple-400/30"
          :class="{ 'rotate-180': showBattleStats }"
        >
          <span class="text-purple-300">▼</span>
        </div>
      </div>
    </div>

    <!-- Battle Statistics Dropdown - FIX: z-index hinzufügen -->
    <div
      v-if="showBattleStats"
      class="absolute left-0 right-0 z-50 mt-2 transition-all duration-300 ease-in-out top-full"
    >
      <div
        class="p-4 border shadow-xl bg-gradient-to-br from-slate-800 via-purple-900 to-slate-900 rounded-xl border-purple-400/30 backdrop-blur-lg"
      >
        <!-- Main Battle Stats (gleiche Grid) -->
        <div class="grid grid-cols-3 gap-4 mb-3">
          <!-- Total Battles -->
          <div
            class="p-2 text-center transition-all duration-200 border rounded-lg bg-purple-500/20 border-purple-400/30 hover:bg-purple-500/30 backdrop-blur-sm"
          >
            <div
              class="text-lg font-black text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
            >
              {{ battleStore.totalBattles }}
            </div>
            <div class="text-xs text-purple-400">Total Battles</div>
          </div>

          <!-- Total Wins -->
          <div
            class="p-2 text-center transition-all duration-200 border rounded-lg bg-green-500/20 border-green-400/30 hover:bg-green-500/30 backdrop-blur-sm"
          >
            <div class="text-lg font-black text-green-300">{{ battleStore.totalWins }}</div>
            <div class="text-xs text-purple-400">Victories</div>
          </div>

          <!-- Total Losses -->
          <div
            class="p-2 text-center transition-all duration-200 border rounded-lg bg-red-500/20 border-red-400/30 hover:bg-red-500/30 backdrop-blur-sm"
          >
            <div class="text-lg font-black text-red-300">{{ battleStore.totalLosses }}</div>
            <div class="text-xs text-purple-400">Defeats</div>
          </div>
        </div>

        <!-- Win Rate and Additional Stats (gleiche Größen) -->
        <div class="flex items-center justify-between pt-2 border-t border-purple-400/20">
          <div class="text-center">
            <div class="text-sm font-bold" :class="getWinRateColor()">{{ getWinRate() }}%</div>
            <div class="text-xs text-purple-400">Win Rate</div>
          </div>

          <div class="text-center">
            <div
              class="text-sm font-bold text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
            >
              {{ battleStore.currentWinStreak }}
            </div>
            <div class="text-xs text-purple-400">Win Streak</div>
          </div>

          <div class="text-center">
            <div class="text-sm font-bold" :class="getBattleRankColor()">{{ getBattleRank() }}</div>
            <div class="text-xs text-purple-400">Battle Rank</div>
          </div>
        </div>

        <!-- Win Rate Progress Bar (gleiche Größe) -->
        <div class="mt-3">
          <div class="flex justify-between mb-1 text-xs text-purple-300">
            <span>Performance</span>
            <span>{{ getWinRate() }}% Win Rate</span>
          </div>
          <div
            class="w-full bg-gray-700/50 rounded-full h-1.5 border border-white/20 backdrop-blur-sm"
          >
            <div
              class="h-1.5 rounded-full transition-all duration-500"
              :class="getWinRateBarColor()"
              :style="{ width: `${getWinRate()}%` }"
            ></div>
          </div>
        </div>

        <!-- Additional Battle Details (gleiche Größen) -->
        <div class="grid grid-cols-2 gap-3 mt-4">
          <div
            class="p-2 text-center border rounded-lg bg-blue-500/20 border-blue-400/30 backdrop-blur-sm"
          >
            <div class="text-sm font-bold text-blue-300">
              {{ battleStore.getAvgBattleTime() }}min
            </div>
            <div class="text-xs text-purple-400">Avg. Battle Time</div>
          </div>
          <div
            class="p-2 text-center border rounded-lg bg-amber-500/20 border-amber-400/30 backdrop-blur-sm"
          >
            <div class="text-sm font-bold text-amber-300">{{ battleStore.bestWinStreak }}</div>
            <div class="text-xs text-purple-400">Best Streak</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useBattleStore } from '../stores/battleStore'
import { useRankCalculations } from '../composables/useRankCalculations'

export default defineComponent({
  name: 'RankComponent',

  setup() {
    const battleStore = useBattleStore()

    const showBattleStats = ref(false)

    const toggleBattleStats = () => {
      showBattleStats.value = !showBattleStats.value
    }

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
