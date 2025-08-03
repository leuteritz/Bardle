<template>
  <div class="relative flex flex-col items-center w-full h-full p-2">
    <!-- Kompakter Header -->
    <div class="flex items-center gap-1 mb-2 text-sm font-bold text-amber-800">🗺️ Battle Map</div>

    <!-- Kompakte Minimap -->
    <div
      class="relative w-48 h-48 overflow-hidden border-2 shadow-lg rounded-xl border-amber-300 bg-gradient-to-br from-green-200 to-green-400"
    >
      <!-- Game Time Display -->
      <div
        class="absolute z-10 px-2 py-1 text-xs font-bold text-white rounded-md top-1 left-1 bg-black/60"
      >
        {{ formatTime(battleStore.gameTime) }}
      </div>

      <!-- Score Display -->
      <div class="absolute z-10 px-2 py-1 text-xs font-bold rounded-md top-1 right-1 bg-black/60">
        <span class="text-blue-400">{{ score.team1Kills }}</span>
        <span class="text-white"> vs </span>
        <span class="text-red-400">{{ score.team2Kills }}</span>
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
            'rounded-full border shadow-md transition-all duration-200',
            i === 0
              ? 'w-3 h-3 bg-amber-400 border-amber-600'
              : 'w-3 h-3 bg-blue-500 border-blue-700',
          ]"
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
          class="w-3 h-3 transition-all duration-200 bg-red-500 border border-red-700 rounded-full shadow-md"
        ></div>
      </div>
    </div>

    <!-- Kompakte Map Info -->
    <div class="flex items-center justify-center mt-2 space-x-1 text-xs">
      <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
      <span class="font-medium text-amber-700">Live Map</span>
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
    const move = ref(80) // Reduzierte Bewegung
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
        { x: 60, y: 180 }, // Bard/Support - skaliert für kleinere Map
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
      const max = 175 // Angepasst für kleinere Map

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
