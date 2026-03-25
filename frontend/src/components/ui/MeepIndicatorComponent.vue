<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { formatNumber } from '../../config/numberFormat'

const gameStore = useGameStore()
const displayValue = ref(gameStore.meeps)
const isIncreasing = ref(false)

watch(
  () => gameStore.meeps,
  (newVal, oldVal) => {
    isIncreasing.value = newVal > oldVal
    const steps = 20
    const diff = newVal - oldVal
    const stepSize = diff / steps
    let current = oldVal
    let i = 0
    const interval = setInterval(() => {
      i++
      current += stepSize
      displayValue.value = Math.round(i < steps ? current : newVal)
      if (i >= steps) {
        clearInterval(interval)
        setTimeout(() => (isIncreasing.value = false), 300)
      }
    }, 16)
  },
)
</script>

<template>
  <div class="relative flex items-center gap-2 px-4 py-1.5">
    <!-- Glow hinter dem Icon -->
    <div
      class="absolute w-16 h-16 rounded-full pointer-events-none right-4 bg-orange-400/15 blur-xl"
    />

    <!-- Icon -->
    <img
      src="/img/BardAbilities/BardMeep.png"
      class="relative w-20 h-20 drop-shadow-[0_0_10px_rgba(251,146,60,0.65)] transition-transform duration-200 hover:scale-110 select-none"
    />

    <!-- Text-Block -->
    <div class="flex flex-col items-center leading-tight">
      <!-- Kleines Label -->
      <span class="text-[13px] font-bold tracking-widest uppercase text-orange-600/50 mb-0.5">
        Meeps
      </span>

      <!-- Hauptzahl -->
      <span
        class="text-4xl font-bold tabular-nums transition-colors duration-300 leading-none"
        :class="isIncreasing ? 'text-orange-300' : 'text-orange-100'"
        :style="
          isIncreasing
            ? 'text-shadow: 0 0 18px rgba(251,146,60,0.7), 0 0 6px rgba(251,146,60,0.4);'
            : 'text-shadow: 0 0 8px rgba(251,146,60,0.25);'
        "
      >
        {{ formatNumber(displayValue) }}
      </span>
    </div>
  </div>
</template>
