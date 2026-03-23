<template>
  <div
    class="group relative overflow-hidden rounded-2xl border backdrop-blur-md bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
  >
    <div
      class="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
    />

    <div class="p-3 space-y-2">
      <!-- Header -->
      <div class="flex items-center gap-2">
        <div
          class="flex items-center justify-center w-6 h-6 border rounded-lg bg-gradient-to-br from-white/10 to-white/5 border-white/15"
        >
          <span class="text-xs">🗺️</span>
        </div>
        <span
          class="text-xs font-black tracking-wide text-transparent bg-gradient-to-r from-blue-200 via-violet-200 to-blue-300 bg-clip-text"
        >
          Battle Map
        </span>
        <div class="flex items-center gap-1 ml-auto">
          <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span class="text-xs text-emerald-300 font-bold">Live</span>
        </div>
      </div>

      <!-- Map -->
      <div
        class="relative w-full overflow-hidden border-2 rounded-xl border-white/10 bg-gradient-to-br from-green-200 to-green-400 aspect-square"
      >
        <!-- Time -->
        <div
          class="absolute z-10 top-1 left-1 px-1.5 py-0.5 text-xs font-black text-white rounded-lg bg-black/60 border border-white/10 backdrop-blur-sm"
        >
          {{ formatTime(battleStore.battleTime) }}
        </div>
        <!-- Score -->
        <div
          class="absolute z-10 top-1 right-1 px-1.5 py-0.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-sm"
        >
          <span class="text-xs font-black text-blue-300">{{ score.team1Kills }}</span>
          <span class="text-xs text-white/40"> vs </span>
          <span class="text-xs font-black text-red-300">{{ score.team2Kills }}</span>
        </div>

        <img
          src="/img/minimap.png"
          class="absolute w-full h-full pointer-events-none select-none opacity-80"
        />

        <!-- Blue Champions -->
        <div
          v-for="(champ, i) in blueChampions"
          :key="'blue-' + i"
          class="absolute transition-all duration-200"
          :style="{
            left: champ.x * 0.75 + 'px',
            top: champ.y * 0.75 + 'px',
            zIndex: i === 0 ? 2 : 1,
          }"
        >
          <div
            class="border rounded-full shadow-lg"
            :class="
              i === 0
                ? 'w-3 h-3 bg-blue-400 border-blue-600'
                : 'w-3 h-3 bg-blue-500 border-blue-700'
            "
            :style="{ boxShadow: '0 0 6px rgba(59,130,246,0.8)' }"
          />
        </div>

        <!-- Red Champions -->
        <div
          v-for="(champ, i) in redChampions"
          :key="'red-' + i"
          class="absolute transition-all duration-200"
          :style="{ left: champ.x * 0.75 + 'px', top: champ.y * 0.75 + 'px', zIndex: 1 }"
        >
          <div
            class="w-3 h-3 bg-red-500 border border-red-700 rounded-full"
            style="box-shadow: 0 0 6px rgba(239, 68, 68, 0.6)"
          />
        </div>

        <div class="absolute inset-0 border pointer-events-none rounded-xl border-white/20" />
      </div>
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
    battleId: { type: [String, Number], default: 0 },
    score: { type: Object, default: () => ({ team1Kills: 0, team2Kills: 0 }) },
  },
  setup(props) {
    const blueChampions = ref([])
    const redChampions = ref([])
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
        { x: 60, y: 180 },
        { x: 45, y: 180 },
        { x: 45, y: 150 },
        { x: 20, y: 140 },
        { x: 35, y: 130 },
      ]
      redChampions.value = [
        { x: 150, y: 20 },
        { x: 155, y: 45 },
        { x: 170, y: 65 },
        { x: 185, y: 60 },
        { x: 185, y: 45 },
      ]
    }

    function moveChampions() {
      const min = 15,
        max = 175
      ;[...blueChampions.value, ...redChampions.value].forEach((c) => {
        c.x = Math.max(
          min,
          Math.min(max, c.x + (Math.random() < 0.5 ? -1 : 1) * Math.random() * 80),
        )
        c.y = Math.max(
          min,
          Math.min(max, c.y + (Math.random() < 0.5 ? -1 : 1) * Math.random() * 80),
        )
      })
      moveTimeout = setTimeout(moveChampions, gameStore.gameSpeed)
    }

    function start() {
      if (moveTimeout) clearTimeout(moveTimeout)
      moveTimeout = setTimeout(moveChampions, gameStore.gameSpeed)
    }

    watch(
      () => props.battleId,
      () => {
        clearTimeout(moveTimeout)
        resetChampions()
        start()
      },
    )
    onMounted(() => {
      resetChampions()
      start()
    })

    return { blueChampions, redChampions, formatTime, battleStore }
  },
})
</script>
