<script lang="ts">
import { defineComponent } from 'vue'
import { useGameStore } from '../stores/gameStore'

export default defineComponent({
  name: 'LevelComponent',
  setup() {
    const gameStore = useGameStore()

    return {
      gameStore,
    }
  },
})
</script>

<template>
  <div
    class="absolute flex flex-col items-center w-72 gap-3 px-6 py-4 text-xl font-bold text-white rounded-2xl shadow-2xl h-48 bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 top-4 left-4 font-['MedievalSharp'] border-2 border-amber-400 backdrop-blur-sm"
  >
    <div class="flex items-center gap-3">
      <div class="relative">
        <img
          src="../assets/img/Bard.png"
          alt="Level"
          class="object-contain w-24 h-24 drop-shadow-lg"
        />
      </div>
      <div class="flex flex-col">
        <span class="text-2xl text-amber-100">Level {{ gameStore.level }}</span>
        <span class="text-sm font-normal text-amber-200">Bard's Journey</span>
      </div>
    </div>
    <div class="text-center">
      <div class="mb-1 text-sm font-normal text-amber-200">
        {{ gameStore.chimesToNextLevel }} Chimes bis Level {{ gameStore.level + 1 }}
      </div>
      <div class="w-full h-3 border rounded-full shadow-inner bg-amber-900/50 border-amber-800">
        <div
          class="h-3 transition-all duration-500 ease-out rounded-full shadow-lg bg-gradient-to-r from-yellow-400 to-yellow-300"
          :style="{ width: `${gameStore.levelProgress}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>
