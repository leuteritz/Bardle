<template>
  <div
    class="relative flex flex-col items-center w-full h-full p-2 overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-xl"
  >
    <!-- Animated Background -->
    <div class="absolute inset-0 opacity-20">
      <div
        class="absolute w-20 h-20 bg-purple-500 rounded-full top-2 left-2 mix-blend-multiply filter blur-xl animate-blob"
      ></div>
      <div
        class="absolute w-16 h-16 bg-pink-500 rounded-full bottom-2 right-2 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute w-12 h-12 bg-yellow-500 rounded-full top-1/2 left-1/2 mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
      ></div>
    </div>

    <!-- Kompakter Header -->
    <div class="relative z-10 flex items-center gap-2 mb-2 text-sm font-bold">
      <span class="text-lg">🗺️</span>
      <span class="text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
        >Battle Map</span
      >
    </div>

    <!-- Kompakte Minimap -->
    <div
      class="relative z-10 w-48 h-48 overflow-hidden border-2 shadow-2xl rounded-xl border-purple-400/50 bg-gradient-to-br from-green-200 to-green-400 backdrop-blur-sm"
    >
      <!-- Game Time Display -->
      <div
        class="absolute z-10 px-2 py-1 text-xs font-bold text-white border rounded-md top-1 left-1 bg-purple-900/80 border-purple-400/30 backdrop-blur-sm"
      >
        {{ formatTime(battleStore.battleTime) }}
      </div>

      <!-- Score Display -->
      <div
        class="absolute z-10 px-2 py-1 text-xs font-bold border rounded-md top-1 right-1 bg-purple-900/80 border-purple-400/30 backdrop-blur-sm"
      >
        <span class="text-blue-300">{{ score.team1Kills }}</span>
        <span class="text-white"> vs </span>
        <span class="text-red-300">{{ score.team2Kills }}</span>
      </div>

      <!-- Minimap Background -->
      <img
        src="/img/minimap.png"
        class="absolute w-full h-full pointer-events-none select-none opacity-80"
      />

      <!-- Blue Champions -->
      <div
        v-for="(champ, i) in blueChampions"
        :key="'blue-' + i"
        class="absolute flex items-center justify-center transition-all duration-200"
        :style="{
          left: champ.x * 0.75 + 'px',
          top: champ.y * 0.75 + 'px',
          zIndex: i === 0 ? 2 : 1,
        }"
      >
        <div
          :class="[
            'rounded-full border shadow-lg transition-all duration-200',
            i === 0
              ? 'w-3 h-3 bg-purple-400 border-purple-600 shadow-purple-500/50'
              : 'w-3 h-3 bg-blue-500 border-blue-700 shadow-blue-500/50',
          ]"
          :style="{
            boxShadow:
              i === 0 ? '0 0 8px rgba(168, 85, 247, 0.8)' : '0 0 6px rgba(59, 130, 246, 0.6)',
          }"
        ></div>
      </div>

      <!-- Red Champions -->
      <div
        v-for="(champ, i) in redChampions"
        :key="'red-' + i"
        class="absolute flex items-center justify-center transition-all duration-200"
        :style="{
          left: champ.x * 0.75 + 'px',
          top: champ.y * 0.75 + 'px',
          zIndex: 1,
        }"
      >
        <div
          class="w-3 h-3 transition-all duration-200 bg-red-500 border border-red-700 rounded-full shadow-lg shadow-red-500/50"
          style="box-shadow: 0 0 6px rgba(239, 68, 68, 0.6)"
        ></div>
      </div>

      <!-- Glassmorphism Border -->
      <div class="absolute inset-0 border pointer-events-none rounded-xl border-white/20"></div>
    </div>

    <!-- Kompakte Map Info -->
    <div class="relative z-10 flex items-center justify-center mt-2 space-x-2 text-xs">
      <div
        class="w-2 h-2 rounded-full shadow-lg bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse"
      ></div>
      <span
        class="font-medium text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
        >Live Map</span
      >
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue'
import { useGameStore } from '../../../stores/gameStore'
import { useBattleStore } from '../../../stores/battleStore'

export default defineComponent({
  name: 'MiniMapComponent',
  props: {
    battleId: {
      type: [String, Number],
      default: 0,
    },
    score: {
      type: Object,
      default: () => ({ team1Kills: 0, team2Kills: 0 }),
    },
  },
  setup(props) {
    const blueChampions = ref([])
    const redChampions = ref([])
    const move = ref(80)
    const gameStore = useGameStore()
    const battleStore = useBattleStore()
    let moveTimeout: any = null

    function formatTime(seconds: number) {
      const min = Math.floor(seconds / 60)
      const sec = seconds % 60
      return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    }

    function resetChampions() {
      blueChampions.value = [
        { x: 60, y: 180 }, // Bard/Support
        { x: 45, y: 180 }, // ADC
        { x: 45, y: 150 }, // Mid
        { x: 20, y: 140 }, // Top
        { x: 35, y: 130 }, // Jungle
      ]
      redChampions.value = [
        { x: 150, y: 20 }, // Top
        { x: 155, y: 45 }, // Mid
        { x: 170, y: 65 }, // Jungle
        { x: 185, y: 60 }, // Support
        { x: 185, y: 45 }, // ADC
      ]
    }

    function moveChampions() {
      const min = 15
      const max = 175
      blueChampions.value.forEach((champ) => {
        const dx = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * move.value)
        const dy = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * move.value)
        champ.x = Math.max(min, Math.min(max, champ.x + dx))
        champ.y = Math.max(min, Math.min(max, champ.y + dy))
      })
      redChampions.value.forEach((champ) => {
        const dx = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * move.value)
        const dy = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * move.value)
        champ.x = Math.max(min, Math.min(max, champ.x + dx))
        champ.y = Math.max(min, Math.min(max, champ.y + dy))
      })
      moveTimeout = setTimeout(moveChampions, gameStore.gameSpeed)
    }

    function startMovementAfterDelay() {
      if (moveTimeout) {
        clearTimeout(moveTimeout)
        moveTimeout = null
      }
      moveTimeout = setTimeout(() => {
        moveChampions()
      }, gameStore.gameSpeed)
    }

    function stopMovement() {
      if (moveTimeout) {
        clearTimeout(moveTimeout)
        moveTimeout = null
      }
    }

    watch(
      () => props.battleId,
      () => {
        stopMovement()
        resetChampions()
        startMovementAfterDelay()
      },
    )

    onMounted(() => {
      resetChampions()
      startMovementAfterDelay()
    })

    return {
      blueChampions,
      redChampions,
      formatTime,
      battleStore,
    }
  },
})
</script>

<style scoped>
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(15px, -25px) scale(1.1);
  }
  66% {
    transform: translate(-10px, 10px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
.animation-delay-4000 {
  animation-delay: 4s;
}
</style>
