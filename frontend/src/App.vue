<script setup lang="ts">
import { useMeepStore } from './stores/meepStore'
const meepStore = useMeepStore()
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full h-screen bg-yellow-500">
    <h1 class="mb-8 text-6xl font-bold text-center">Bard Idle Game</h1>
    <div class="mb-6 text-3xl">
      Meeps: <span class="font-mono">{{ meepStore.meeps }}</span>
    </div>
    <button
      @click="meepStore.addMeep"
      class="px-8 py-4 text-2xl text-white transition bg-blue-600 rounded-lg shadow hover:bg-blue-700"
    >
      +1 Meep
    </button>
  </div>
</template>
