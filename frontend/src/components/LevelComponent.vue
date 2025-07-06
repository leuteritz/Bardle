<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'

const gameStore = useGameStore()
</script>

<template>
  <div
    class="absolute flex flex-col items-center w-64 h-32 gap-2 px-4 py-2 text-xl font-bold text-white rounded-lg shadow-lg bg-amber-600 top-4 left-4"
  >
    <div class="flex items-center gap-2">
      <img src="../assets/img/Bard.png" alt="Level" class="object-contain w-12 h-12" />
      <span>Level {{ gameStore.level }}</span>
    </div>
    <div class="text-sm">
      {{ gameStore.chimesToNextLevel }} Chimes bis Level {{ gameStore.level + 1 }}
    </div>
    <div class="w-full h-2 bg-gray-700 rounded-full">
      <div
        class="h-2 transition-all duration-300 bg-yellow-400 rounded-full"
        :style="{ width: `${gameStore.levelProgress}%` }"
      ></div>
    </div>
  </div>
</template>
