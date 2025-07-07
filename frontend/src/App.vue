<script setup lang="ts">
import { onMounted } from 'vue'
import { useGameStore } from './stores/gameStore'
import LevelComponent from './components/LevelComponent.vue'
import AbilityComponent from './components/AbilityComponent.vue'

const gameStore = useGameStore()

onMounted(() => {
  setInterval(() => {
    gameStore.gernerateMeeps()
  }, 1000)
})
</script>

<template>
  <div
    class="relative flex flex-col items-center justify-center w-full h-screen bg-gradient-to-br from-amber-100 via-yellow-200 to-orange-200 font-['MedievalSharp']"
  >
    <LevelComponent />
    <h1 class="mb-8 font-bold text-center text-7xl text-amber-800 drop-shadow-lg">
      Bard Idle Game
    </h1>
    <div
      class="flex flex-col items-center p-6 mb-8 border shadow-xl bg-white/80 backdrop-blur-sm rounded-2xl border-amber-200"
    >
      <div class="grid grid-cols-2 gap-6 text-2xl font-semibold text-gray-800">
        <div class="flex items-center gap-3">
          <span class="text-amber-600">Chimes:</span>
          <span class="text-3xl font-bold text-amber-800">{{ gameStore.chimes }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-blue-600">Meeps:</span>
          <span class="text-3xl font-bold text-blue-800">{{ gameStore.meeps }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-green-600">Meeps/s:</span>
          <span class="text-3xl font-bold text-green-800">{{ gameStore.meepsPerSecond }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-yellow-600">Gold:</span>
          <span class="text-3xl font-bold text-yellow-800">{{ gameStore.gold }}</span>
        </div>
      </div>
    </div>
    <div class="flex flex-row items-center justify-center gap-8">
      <div
        class="flex items-center justify-center w-32 h-32 transition-all duration-300 cursor-pointer hover:scale-110 hover:rotate-12"
      >
        <img
          src="/img/BardChime.png"
          @click="gameStore.addChime"
          class="object-contain w-full h-full p-4"
        />
      </div>
      <div
        class="flex items-center justify-center w-32 h-32 transition-all duration-300 cursor-pointer hover:scale-110 hover:rotate-12"
      >
        <img
          src="/img/BardMeep.png"
          @click="gameStore.addMeep"
          class="object-contain w-full h-full p-4"
        />
      </div>

      <button
        @click="gameStore.addGold"
        class="px-10 py-6 text-2xl font-bold text-white transition-all duration-300 border-2 border-yellow-700 shadow-lg bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl hover:shadow-xl hover:scale-105 hover:from-yellow-400 hover:to-yellow-500"
      >
        +1 Gold
      </button>
    </div>
  </div>
</template>
