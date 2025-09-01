<template>
  <div
    class="relative flex flex-col items-center p-4 overflow-hidden"
    :class="{ 'backdrop-blur-sm': gameStore.isCPSModalOpen }"
  >
    <!-- Kompaktere Bard Portrait -->
    <div class="relative z-10 group">
      <div
        class="absolute rounded-full -inset-2 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 opacity-40 animate-pulse"
      ></div>

      <!-- Kleinerer XP Progress Ring -->
      <div class="relative w-24 h-24">
        <svg class="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgb(168 85 247 / 0.3)"
            stroke-width="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgb(168 85 247)"
            stroke-width="8"
            stroke-linecap="round"
            :stroke-dasharray="`${xpProgress * 283} 283`"
            class="transition-all duration-1000 ease-out"
            style="filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.8))"
          />
        </svg>

        <div
          class="absolute overflow-hidden border-2 rounded-full shadow-2xl inset-2 border-purple-400/50 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm"
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
          class="flex items-center justify-center w-8 h-8 border-2 rounded-full shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 border-purple-300/50"
        >
          <span class="text-sm font-black text-white">{{ gameStore.level }}</span>
        </div>
      </div>
    </div>

    <!-- Kompakte Character Info -->
    <div class="relative z-10 mt-4 space-y-1 text-center">
      <div class="text-xs text-purple-300">{{ Math.round(xpProgress * 100) }}% XP</div>
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

<style scoped>
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(15px, -25px) scale(1.1);
  }
  66% {
    transform: translate(-10px, 10px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
</style>
