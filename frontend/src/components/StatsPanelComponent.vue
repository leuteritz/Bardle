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
  <div class="absolute z-40 bottom-8 left-8">
    <div
      class="flex flex-col gap-3 p-4 border-4 shadow-2xl bg-white/90 backdrop-blur-md rounded-2xl border-amber-300 min-w-[160px]"
    >
      <div class="flex items-center gap-2">
        <img src="/img/BardAbilities/BardChime.png" class="object-contain w-6 h-6" />
        <span class="text-base font-semibold text-amber-700">Chimes</span>
        <span class="ml-auto text-xl font-bold text-amber-800">{{ gameStore.chimes }}</span>
      </div>
      <div class="flex items-center gap-2">
        <img src="/img/BardAbilities/BardMeep.png" class="object-contain w-6 h-6" />
        <span class="text-base font-semibold text-blue-700">Meeps</span>
        <span class="ml-auto text-xl font-bold text-blue-800">{{ gameStore.meeps }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="flex items-center justify-center w-6 h-6 text-lg text-green-700">⚡</span>
        <span class="text-base font-semibold text-green-700">Meeps/s</span>
        <span class="ml-auto text-xl font-bold text-green-800">{{ gameStore.meepsPerSecond }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="flex items-center justify-center w-6 h-6 text-lg text-yellow-700">💰</span>
        <span class="text-base font-semibold text-yellow-700">Gold</span>
        <span class="ml-auto text-xl font-bold text-yellow-800">{{ gameStore.gold }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
