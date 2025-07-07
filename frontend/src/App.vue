<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameStore } from './stores/gameStore'
import LevelComponent from './components/LevelComponent.vue'
import AbilityComponent from './components/AbilityComponent.vue'

const gameStore = useGameStore()

const chimeGainPos = ref({ x: 0, y: 0 })
const chimeGainKey = ref(0)

function handleChimeClick(event) {
  gameStore.addChime()
  chimeGainPos.value = { x: event.clientX, y: event.clientY }
  chimeGainKey.value++
}

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
        class="relative flex items-center justify-center w-32 h-32 transition-all duration-300 cursor-pointer hover:scale-110 hover:rotate-12"
      >
        <img
          src="/img/BardAbilities/BardChime.png"
          @click="handleChimeClick"
          class="object-contain w-full h-full p-4 drop-shadow-lg"
        />
      </div>
      <div
        class="flex items-center justify-center w-32 h-32 transition-all duration-300 cursor-pointer hover:scale-110 hover:rotate-12"
      >
        <img
          src="/img/BardAbilities/BardMeep.png"
          @click="gameStore.addMeep"
          class="object-contain w-full h-full p-4 drop-shadow-lg"
        />
      </div>

      <button
        @click="gameStore.addGold"
        class="px-10 py-6 text-2xl font-bold text-white transition-all duration-300 border-2 border-yellow-700 shadow-lg bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl hover:shadow-xl hover:scale-105 hover:from-yellow-400 hover:to-yellow-500"
      >
        +1 Gold
      </button>
    </div>
    <div
      :key="chimeGainKey"
      class="fixed z-50 text-2xl font-bold pointer-events-none text-amber-800 drop-shadow chime-popup"
      :style="{ left: chimeGainPos.x + 'px', top: chimeGainPos.y - 32 + 'px' }"
    >
      +{{ gameStore.chimesPerClick }}
    </div>
  </div>
</template>

<style scoped>
.chime-popup {
  animation: fadeUp 0.7s ease-out forwards;
}

@keyframes fadeUp {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px);
  }
}
</style>
