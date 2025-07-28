<template>
  <div class="relative flex flex-col items-center p-4">
    <!-- Kompaktere Bard Portrait -->
    <div class="relative group">
      <div
        class="absolute rounded-full -inset-2 bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-300 opacity-30 animate-pulse"
      ></div>

      <!-- Kleinerer XP Progress Ring -->
      <div class="relative w-24 h-24">
        <svg class="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgb(251 191 36 / 0.3)"
            stroke-width="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgb(245 158 11)"
            stroke-width="8"
            stroke-linecap="round"
            :stroke-dasharray="`${xpProgress * 283} 283`"
            class="transition-all duration-1000 ease-out"
          />
        </svg>

        <div
          class="absolute overflow-hidden border-2 rounded-full shadow-xl inset-2 border-amber-300 bg-gradient-to-br from-amber-100 to-yellow-100"
        >
          <img
            src="/img/BardAbilities/Bard.png"
            class="object-cover w-full h-full transition-transform duration-500 transform group-hover:scale-110"
          />
        </div>
      </div>

      <!-- Kompakte Level Badge -->
      <div class="absolute -bottom-1 -right-1">
        <div
          class="flex items-center justify-center w-8 h-8 border-2 rounded-full shadow-lg bg-gradient-to-br from-amber-500 to-amber-600 border-amber-200"
        >
          <span class="text-sm font-black text-white">{{ gameStore.level }}</span>
        </div>
      </div>
    </div>

    <!-- Kompakte Character Info -->
    <div class="mt-4 space-y-1 text-center">
      <div class="text-xs text-amber-200">{{ Math.round(xpProgress * 100) }}% XP</div>
    </div>
  </div>
</template>

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
