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
  <div class="relative flex flex-col items-center gap-0.5 py-0.5">
    <!-- Glow hinter dem Icon -->
    <div class="absolute w-10 h-10 rounded-full pointer-events-none bg-orange-400/15 blur-xl" />

    <!-- Zahl oben -->
    <span
      class="relative text-sm font-bold tabular-nums transition-colors duration-300 leading-none"
      :class="isIncreasing ? 'text-orange-300' : 'text-orange-100'"
      :style="
        isIncreasing
          ? 'text-shadow: 0 0 10px rgba(251,146,60,0.7);'
          : 'text-shadow: 0 0 5px rgba(251,146,60,0.25);'
      "
    >
      {{ formatNumber(displayValue) }}
    </span>

    <!-- Icon unten -->
    <img
      src="/img/BardAbilities/BardMeep.png"
      class="relative w-8 h-8 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)] transition-transform duration-200 hover:scale-110 select-none"
    />
  </div>
</template>
