<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useGameStore } from '../../stores/gameStore'

export default defineComponent({
  name: 'BardHudComponent',
  setup() {
    const gameStore = useGameStore()

    const xpProgress = computed(() => {
      const currentChimes = gameStore.currentLevelChimes
      const totalChimes = gameStore.totalChimesThisLevel
      return totalChimes > 0 ? Math.max(0, Math.min(1, currentChimes / totalChimes)) : 0
    })

    return {
      gameStore,
      xpProgress,
    }
  },
})
</script>

<template>
  <div class="pointer-events-none select-none">
    <div class="relative flex items-center justify-center">
      <!-- Bard Image -->
      <img
        src="/img/BardAbilities/Bard.png"
        class="w-24 h-24 bg-white border-4 rounded-full shadow-lg border-amber-300"
      />
      <!-- Level Badge -->
      <div
        class="absolute px-2 py-1 text-xs font-bold text-white border rounded-full shadow bottom-2 right-2 bg-amber-600 border-amber-300"
        :class="{ 'bg-green-600 border-green-400': xpProgress >= 1 }"
      >
        {{ gameStore.level }}
      </div>
      <!-- XP Percantage -->
      <div
        class="absolute top-1 right-1 px-1 py-0.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded opacity-90"
      >
        {{ Math.round(xpProgress * 100) }}%
      </div>
    </div>
    <!-- Chimes to next Level */* -->
    <div class="mt-2 text-xs text-center text-amber-700">
      <div class="font-semibold">
        {{ gameStore.currentLevelChimes }} / {{ gameStore.totalChimesThisLevel }} Chimes
      </div>
    </div>
  </div>
</template>

<style scoped></style>
