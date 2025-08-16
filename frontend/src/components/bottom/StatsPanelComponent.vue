<template>
  <div class="p-3">
    <!-- Resources Summary -->
    <div
      class="p-2 transition-all duration-300 border rounded-lg shadow-sm bg-gradient-to-r from-yellow-100/20 to-amber-100/20 border-yellow-300/30 hover:shadow-md"
    >
      <div class="flex flex-row items-center justify-center">
        <div class="flex flex-col items-center">
          <div class="text-sm font-black text-yellow-100">
            {{ formatNumber(gameStore.chimes || 0) }}
          </div>
          <img src="/img/BardAbilities/BardChime.png" class="w-12 h-12 select-none" />
        </div>

        <div class="flex flex-col items-center">
          <div class="text-sm font-black text-yellow-100">
            {{ formatNumber(gameStore.meeps || 0) }}
          </div>
          <img src="/img/BardAbilities/BardMeep.png" class="w-12 h-12 select-none" />
        </div>

        <div class="flex flex-col items-center">
          <div class="text-sm font-black text-yellow-100">
            {{ formatNumber(gameStore.gold || 0) }}
          </div>
          <img src="/img/BardGold.png" class="w-12 h-12 select-none" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useGameStore } from '../../stores/gameStore'

export default defineComponent({
  name: 'StatsPanelComponent',
  setup() {
    const gameStore = useGameStore()

    // Kompakte Number formatting für große Zahlen
    const formatNumber = (num: number) => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M'
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K'
      }
      return num.toString()
    }

    return {
      gameStore,
      formatNumber,
    }
  },
})
</script>

<style scoped>
@keyframes subtleGlow {
  0%,
  100% {
    box-shadow: 0 0 5px rgba(245, 158, 11, 0.3);
  }
  50% {
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
  }
}

.hover\:glow:hover {
  animation: subtleGlow 2s ease-in-out infinite;
}
</style>
