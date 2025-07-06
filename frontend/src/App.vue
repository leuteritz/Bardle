<script setup lang="ts">
import { onMounted } from 'vue'
import { useGameStore } from './stores/gameStore'
const gameStore = useGameStore()

onMounted(() => {
  setInterval(() => {
    gameStore.gernerateMeeps()
  }, 1000)
})
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full h-screen bg-yellow-200">
    <h1 class="mb-8 text-6xl font-bold text-center">Bard Idle Game</h1>
    <div class="flex flex-col mb-6 text-3xl">
      Meeps: <span class="font-mono">{{ gameStore.meeps }} </span> Meeps per second:
      <span class="font-mono">{{ gameStore.meepsPerSecond = 3 }}</span> Gold:
      <span class="font-mono">{{ gameStore.gold }}</span>
    </div>
    <div class="flex flex-row items-center justify-center">
      <div
        class="flex items-center justify-center w-24 h-24 transition cursor-pointer hover:scale-110"
      >
        <img
          src="./assets/img/BardMeep.png"
          @click="gameStore.addMeep"
          class="object-contain w-full h-full"
        />
      </div>

      <button
        @click="gameStore.addGold"
        class="px-8 py-4 text-2xl text-white transition bg-blue-600 rounded-lg shadow hover:bg-blue-700"
      >
        +1 Gold
      </button>
    </div>
  </div>
</template>
