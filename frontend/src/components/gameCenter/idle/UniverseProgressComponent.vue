<template>
  <!-- Header mit Glassmorphism -->
  <div
    class="flex flex-row items-center justify-between w-full p-2 border-b shadow-lg backdrop-blur-lg bg-white/10 border-white/20"
  >
    <!-- Universum-Info -->
    <div class="flex flex-col items-center w-1/4">
      <div class="flex flex-row items-center justify-center gap-3">
        <div
          class="px-3 py-1 text-xs font-medium text-blue-300 border rounded-full bg-blue-500/20 backdrop-blur-sm border-blue-400/30"
        >
          Universum
        </div>
        <div
          class="px-4 py-2 text-xl font-bold text-transparent border bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text border-blue-400/30 rounded-xl backdrop-blur-sm bg-white/10"
        >
          {{ gameStore.currentUniverse }}
        </div>
      </div>
      <!-- Modifier Badge -->
      <div
        v-if="currentModifier"
        class="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border bg-purple-500/10 backdrop-blur-sm border-purple-400/30"
      >
        <span class="text-base">{{ currentModifier.icon }}</span>
        <div class="flex flex-col">
          <span class="text-xs font-bold text-purple-300">{{ currentModifier.name }}</span>
          <span class="text-[10px] text-purple-400/80">{{ currentModifier.description }}</span>
        </div>
      </div>
    </div>

    <!-- Progress Section -->
    <div class="flex flex-col items-center w-1/2">
      <div class="flex items-center justify-center mb-4">
        <span
          class="text-base font-bold text-transparent bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text"
        >
          🌌 Universum-Rettung: {{ gameStore.universeRescueProgress.toFixed(2) }}%
        </span>
      </div>
      <div
        class="relative h-2 mx-auto overflow-hidden border rounded-full shadow-inner w-80 bg-gray-700/50 backdrop-blur-sm border-white/20"
      >
        <div
          class="h-full transition-all duration-1000 ease-out rounded-full shadow-lg bg-gradient-to-r from-blue-500 via-violet-500 to-blue-400"
          :style="{
            width: gameStore.universeRescueProgress + '%',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.8)',
          }"
        ></div>
        <div
          class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
        ></div>
      </div>
      <p class="mt-3 text-sm font-medium text-blue-300">
        {{ formatNumber(gameStore.chimesForNextUniverse) }} /
        {{ formatNumber(gameStore.chimesToUniverseRescue) }} Chimes gesammelt
      </p>
    </div>

    <!-- Universe Info + Prestige Button -->
    <div class="flex flex-col items-center w-1/4">
      <div
        class="px-4 py-2 text-base font-bold text-transparent border bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text backdrop-blur-sm bg-white/10 border-emerald-400/30 rounded-xl"
      >
        {{ universes[gameStore.currentUniverse - 1].name }}
      </div>
      <div class="mt-2 text-xs font-medium text-emerald-300 opacity-80">
        {{ universes[gameStore.currentUniverse - 1].description }}
      </div>
      <button
        v-if="gameStore.prestigeAvailable"
        @click="gameStore.openPrestigeModal()"
        class="prestige-btn mt-2 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-white rounded-xl bg-gradient-to-r from-purple-900 via-violet-700 to-amber-500 border border-amber-400/40 hover:scale-[1.03] active:scale-95 transition-all duration-300"
      >
        PRESTIGE
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useGameStore } from '../../../stores/gameStore'
import { universes } from '../../../config/universes'
import { formatNumber } from '../../../config/numberFormat'

export default defineComponent({
  name: 'UniverseProgressComponent',

  setup() {
    const gameStore = useGameStore()

    const currentModifier = computed(() => {
      return universes[gameStore.currentUniverse - 1]?.modifier ?? null
    })

    return {
      gameStore,
      universes,
      formatNumber,
      currentModifier,
    }
  },
})
</script>

<style scoped>
.prestige-btn {
  box-shadow:
    0 0 18px rgba(139, 92, 246, 0.5),
    0 0 40px rgba(139, 92, 246, 0.2);
  animation: prestigeGlow 2.5s ease-in-out infinite;
}

.prestige-btn:hover {
  box-shadow:
    0 0 24px rgba(139, 92, 246, 0.7),
    0 0 55px rgba(139, 92, 246, 0.35);
}

@keyframes prestigeGlow {
  0%, 100% {
    box-shadow:
      0 0 18px rgba(139, 92, 246, 0.5),
      0 0 40px rgba(139, 92, 246, 0.2);
  }
  50% {
    box-shadow:
      0 0 28px rgba(139, 92, 246, 0.7),
      0 0 60px rgba(139, 92, 246, 0.35);
  }
}
</style>
