<script lang="ts">
import { defineComponent } from 'vue'
import { useGameStore } from '../stores/gameStore'

export default defineComponent({
  name: 'StatsPanelComponent',
  setup() {
    const gameStore = useGameStore()
    return { gameStore }
  },
})
</script>

<template>
  <div class="flex flex-col w-full h-full gap-2 p-4 border-amber-400">
    <div class="flex items-center gap-2">
      <img src="/img/BardAbilities/BardChime.png" class="object-contain w-5 h-5" />
      <span class="w-16 text-sm font-semibold text-amber-100">Chimes:</span>
      <span class="text-lg font-bold text-amber-100">{{ gameStore.chimes }}</span>
    </div>
    <div class="flex items-center gap-2">
      <img src="/img/BardAbilities/BardMeep.png" class="object-contain w-5 h-5" />
      <span class="w-16 text-sm font-semibold text-amber-100">Meeps:</span>
      <span class="text-lg font-bold text-amber-100">{{ gameStore.meeps }}</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="flex items-center justify-center w-5 h-5 text-sm text-green-700">⚡</span>
      <span class="w-16 text-sm font-semibold text-amber-100">Meeps/s:</span>
      <span class="text-lg font-bold text-amber-100">{{ gameStore.meepsPerSecond }}</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="flex items-center justify-center w-5 h-5 text-sm text-yellow-700">💰</span>
      <span class="w-16 text-sm font-semibold text-amber-100">Gold:</span>
      <span class="text-lg font-bold text-amber-100">{{ gameStore.gold }}</span>
    </div>
  </div>
</template>

<style scoped></style>
