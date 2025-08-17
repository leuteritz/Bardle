<template>
  <div class="relative p-3 overflow-hidden">
    <!-- Resources Summary -->
    <div
      class="relative z-10 p-2 transition-all duration-300 border rounded-lg shadow-sm bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30 hover:shadow-md backdrop-blur-sm"
    >
      <div class="flex flex-row items-center justify-center">
        <div class="flex flex-col items-center">
          <div
            class="text-sm font-black text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
          >
            {{ formatNumber(gameStore.chimes || 0) }}
          </div>
          <img
            src="/img/BardAbilities/BardChime.png"
            class="w-12 h-12 transition-transform duration-300 select-none hover:scale-110"
          />
        </div>

        <div class="flex flex-col items-center">
          <div
            class="text-sm font-black text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
          >
            {{ formatNumber(gameStore.meeps || 0) }}
          </div>
          <img
            src="/img/BardAbilities/BardMeep.png"
            class="w-12 h-12 transition-transform duration-300 select-none hover:scale-110"
          />
        </div>

        <div class="flex flex-col items-center">
          <div
            class="text-sm font-black text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
          >
            {{ formatNumber(gameStore.gold || 0) }}
          </div>
          <img
            src="/img/BardGold.png"
            class="w-12 h-12 transition-transform duration-300 select-none hover:scale-110"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { formatNumber } from '../../config/numberFormat'

export default defineComponent({
  name: 'StatsPanelComponent',
  setup() {
    const gameStore = useGameStore()

    return {
      gameStore,
      formatNumber,
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
.animation-delay-4000 {
  animation-delay: 4s;
}
</style>
