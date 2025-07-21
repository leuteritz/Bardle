<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)

  // ✅ KORRIGIERT - Dynamischer Sweep-Flag
  let angleDiff = endAngle - startAngle
  if (angleDiff < 0) angleDiff += 360
  const arcSweep = angleDiff > 180 ? '1' : '0'

  return ['M', start.x, start.y, 'A', r, r, 0, arcSweep, 0, end.x, end.y].join(' ')
}

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  }
}

export default defineComponent({
  name: 'BardHudComponent',
  setup() {
    const gameStore = useGameStore()

    // Fortschrittsberechnung: aktuelle Chimes / gesamt Chimes für das Level
    const xpProgress = computed(() => {
      const currentChimes = gameStore.currentLevelChimes
      const totalChimes = gameStore.totalChimesThisLevel
      return totalChimes > 0 ? Math.max(0, Math.min(1, currentChimes / totalChimes)) : 0
    })

    // ✅ KORRIGIERT - Korrekte Winkelberechnung für Füllung von leer zu voll
    const endAngle = computed(() => {
      const progress = xpProgress.value
      const angle = 270 + 180 * progress // Von 270° zu 450°
      return angle >= 360 ? angle - 360 : angle // Normalisiere zu 0-360°
    })

    return {
      gameStore,
      xpProgress,
      endAngle,
      describeArc,
    }
  },
})
</script>

<template>
  <div class="flex flex-col items-center justify-center select-none">
    <div class="relative w-28 h-28">
      <!-- SVG Halbkreis XP-Balken -->
      <svg class="absolute top-0 left-0" width="112" height="56" viewBox="0 0 112 56">
        <!-- ✅ KORRIGIERT - Hintergrund-Halbkreis für horizontalen Halbkreis -->

        <!-- ✅ KORRIGIERT - Fortschritts-Halbkreis (wächst von leer zu voll) -->
        <path
          v-if="xpProgress > 0"
          :d="describeArc(56, 56, 48, 270, endAngle)"
          fill="none"
          stroke="#fbbf24"
          stroke-width="10"
          stroke-linecap="round"
        />
      </svg>

      <!-- Bard Bild -->
      <img
        src="/img/BardAbilities/Bard.png"
        class="absolute w-24 h-24 bg-white border-4 rounded-full shadow-lg top-2 left-2 border-amber-300"
        :class="{ 'border-green-400': xpProgress >= 1 }"
      />

      <!-- Level Badge -->
      <div
        class="absolute px-2 py-1 text-xs font-bold text-white border rounded-full shadow bottom-2 right-2 bg-amber-600 border-amber-300"
        :class="{ 'bg-green-600 border-green-400': xpProgress >= 1 }"
      >
        {{ gameStore.level }}
      </div>

      <!-- XP Fortschritt Anzeige -->
      <div
        class="absolute top-1 right-1 px-1 py-0.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded opacity-90"
      >
        {{ Math.round(xpProgress * 100) }}%
      </div>
    </div>

    <!-- Detaillierte Chimes Info -->
    <div class="mt-2 text-xs text-center text-amber-700">
      <div class="font-semibold">
        {{ gameStore.currentLevelChimes }} / {{ gameStore.totalChimesThisLevel }} Chimes
      </div>
    </div>
  </div>
</template>

<style scoped></style>
