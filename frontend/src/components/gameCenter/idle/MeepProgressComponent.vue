<template>
  <!-- Meep Progress - Verbessert -->
  <div class="mt-20 text-center">
    <div
      class="inline-block px-4 py-3 transition-all duration-300 border rounded-2xl cursor-pointer group bg-gradient-to-br from-orange-500/10 to-yellow-500/10 backdrop-blur-sm border-orange-400/30 hover:border-orange-300/60 hover:bg-orange-500/15 hover:scale-105"
      @click="$emit('click')"
    >
      <div class="flex items-center justify-center gap-3 mb-2">
        <div
          class="p-1 transition-transform duration-300 border rounded-full bg-gradient-to-r from-orange-500/20 to-yellow-500/20 backdrop-blur-sm border-orange-400/30 group-hover:scale-110"
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
      <p class="mt-2 text-xs text-orange-400/80 animate-pulse">🌀 Expedition starten</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useGameStore } from '../../../stores/gameStore'

export default defineComponent({
  name: 'MeepProgressComponent',
  emits: ['click'],

  setup() {
    const gameStore = useGameStore()

    return {
      gameStore,
    }
  },
})
</script>
