<script lang="ts">
import { defineComponent } from 'vue'
import { useGameStore } from '../stores/gameStore'

export default defineComponent({
  name: 'StatsBarComponent',
  setup() {
    const gameStore = useGameStore()

    return {
      gameStore,
    }
  },
})
</script>

<template>
  <div class="absolute transform -translate-x-1/2 bottom-8 left-1/2">
    <div
      class="flex items-center gap-8 p-6 border-4 shadow-2xl bg-white/90 backdrop-blur-md rounded-3xl border-amber-300"
      style="
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.95) 0%,
          rgba(254, 243, 199, 0.9) 100%
        );
      "
    >
      <!-- Chimes -->
      <div class="flex flex-col items-center gap-2">
        <div class="flex items-center gap-2">
          <img src="/img/BardAbilities/BardChime.png" class="object-contain w-8 h-8" />
          <span class="text-lg font-semibold text-amber-700">Chimes</span>
        </div>
        <span class="text-3xl font-bold text-amber-800 drop-shadow-sm">{{ gameStore.chimes }}</span>
      </div>

      <!-- Divider -->
      <div class="w-px h-16 bg-gradient-to-b from-transparent via-amber-300 to-transparent"></div>

      <!-- Meeps -->
      <div class="flex flex-col items-center gap-2">
        <div class="flex items-center gap-2">
          <img src="/img/BardAbilities/BardMeep.png" class="object-contain w-8 h-8" />
          <span class="text-lg font-semibold text-blue-700">Meeps</span>
        </div>
        <span class="text-3xl font-bold text-blue-800 drop-shadow-sm">{{ gameStore.meeps }}</span>
      </div>

      <!-- Divider -->
      <div class="w-px h-16 bg-gradient-to-b from-transparent via-blue-300 to-transparent"></div>

      <!-- Meeps/s -->
      <div class="flex flex-col items-center gap-2">
        <div class="flex items-center gap-2">
          <div class="flex items-center justify-center w-8 h-8">
            <span class="text-2xl">⚡</span>
          </div>
          <span class="text-lg font-semibold text-green-700">Meeps/s</span>
        </div>
        <span class="text-3xl font-bold text-green-800 drop-shadow-sm">{{
          gameStore.meepsPerSecond
        }}</span>
      </div>

      <!-- Divider -->
      <div class="w-px h-16 bg-gradient-to-b from-transparent via-green-300 to-transparent"></div>

      <!-- Gold -->
      <div class="flex flex-col items-center gap-2">
        <div class="flex items-center gap-2">
          <div class="flex items-center justify-center w-8 h-8">
            <span class="text-2xl">💰</span>
          </div>
          <span class="text-lg font-semibold text-yellow-700">Gold</span>
        </div>
        <span class="text-3xl font-bold text-yellow-800 drop-shadow-sm">{{ gameStore.gold }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Zusätzliche Styles können hier hinzugefügt werden */
</style>
