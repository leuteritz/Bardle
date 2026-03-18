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
  <div class="relative flex items-center px-4 py-2">
    <span
      class="text-5xl font-['MedievalSharp'] font-bold tabular-nums transition-colors duration-300 leading-none self-center"
      :class="isIncreasing ? 'text-orange-300' : 'text-orange-100'"
    >
      {{ formatNumber(displayValue) }}
    </span>

    <!-- Glow hinter dem Icon -->
    <div
      class="absolute w-16 h-16 rounded-full pointer-events-none right-4 bg-orange-400/20 blur-xl"
    />

    <img
      src="/img/BardAbilities/BardMeep.png"
      class="relative w-24 h-24 drop-shadow-[0_0_8px_rgba(251,146,60,0.6)] transition-transform duration-200 hover:scale-110"
    />
  </div>
</template>
