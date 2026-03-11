<template>
  <!-- Meep Progress - Verbessert -->
  <div class="mt-20 text-center">
    <div class="flex items-center justify-center gap-3 mb-3">
      <div
        class="p-1 border rounded-full bg-gradient-to-r from-orange-500/20 to-yellow-500/20 backdrop-blur-sm border-orange-400/30"
      >
        <img src="/img/BardAbilities/BardMeep.png" class="w-8 h-8" />
      </div>
      <span
        class="text-lg font-bold text-transparent bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text"
      >
        {{ gameStore.chimesForMeep }} / {{ gameStore.meepChimeRequirement }}
      </span>
    </div>
    <div
      class="relative w-48 h-3 mx-auto overflow-hidden border rounded-full shadow-inner bg-gray-700/50 backdrop-blur-sm border-white/20"
    >
      <div
        class="h-full transition-all duration-500 ease-out rounded-full shadow-lg bg-gradient-to-r from-orange-500 to-yellow-500"
        :style="{
          width: (gameStore.chimesForMeep / gameStore.meepChimeRequirement) * 100 + '%',
          boxShadow: '0 0 15px rgba(249, 115, 22, 0.6)',
        }"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useGameStore } from '../../../stores/gameStore'

export default defineComponent({
  name: 'MeepProgressComponent',

  setup() {
    const gameStore = useGameStore()

    return {
      gameStore,
    }
  },
})
</script>
