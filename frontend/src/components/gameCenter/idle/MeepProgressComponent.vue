<template>
  <!-- Meep Progress - Verbessert -->
  <div class="mt-20 text-center">
    <div
      class="inline-block px-4 py-3 transition-all duration-300 border cursor-pointer group meep-card hover:scale-105"
      @click="$emit('click')"
    >
      <div class="flex items-center justify-center gap-3 mb-2">
        <div
          class="p-1 transition-transform duration-300 rounded-full meep-icon-ring group-hover:scale-110"
        >
          <img src="/img/BardAbilities/BardMeep.png" class="rpg-img w-8 h-8" />
        </div>
        <span
          class="text-lg font-bold meep-count"
        >
          {{ gameStore.chimesForMeep }} / {{ gameStore.meepChimeRequirement }}
        </span>
      </div>
      <div
        class="relative w-48 h-3 mx-auto overflow-hidden rounded-full shadow-inner meep-bar-track"
      >
        <div
          class="h-full transition-all duration-500 ease-out rounded-full shadow-lg meep-bar-fill"
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

<style scoped>
.meep-count {
  color: var(--rpg-gold);
}
.meep-card {
  background: rgba(200, 144, 64, 0.08);
  border: 1px solid rgba(200, 144, 64, 0.25);
  border-radius: 4px;
}
.meep-card:hover {
  border-color: rgba(200, 144, 64, 0.5);
  background: rgba(200, 144, 64, 0.12);
}
.meep-icon-ring {
  background: rgba(200, 144, 64, 0.15);
  border: 1px solid rgba(200, 144, 64, 0.3);
}
.meep-bar-track {
  background: var(--rpg-bg-dark);
  border: 1px solid var(--rpg-border-row);
}
.meep-bar-fill {
  background: linear-gradient(to right, var(--rpg-gold-dim), var(--rpg-gold));
}
</style>
