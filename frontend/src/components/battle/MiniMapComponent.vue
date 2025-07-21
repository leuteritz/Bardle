<template>
  <div class="relative w-[300px] h-[300px]">
    <!-- Minimap-Bild als Hintergrund -->
    <img src="/img/minimap.png" class="absolute w-full h-full pointer-events-none select-none" />

    <!-- Blaue Figuren -->
    <div
      v-for="(champ, i) in blueChampions"
      :key="'blue-' + i"
      class="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow"
      :style="{ left: champ.x + 'px', top: champ.y + 'px' }"
      title="Blauer Champion"
    ></div>

    <!-- Rote Figuren -->
    <div
      v-for="(champ, i) in redChampions"
      :key="'red-' + i"
      class="absolute w-4 h-4 bg-red-500 border-2 border-white rounded-full shadow"
      :style="{ left: champ.x + 'px', top: champ.y + 'px' }"
      title="Roter Champion"
    ></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue'
import { useGameStore } from '../../stores/gameStore'

export default defineComponent({
  name: 'MiniMapComponent',
  setup() {
    // Startpositionen für Champions (ungefähr auf der Map verteilt)
    const blueChampions = ref([
      { x: 40, y: 250 }, // Bot-Lane
      { x: 60, y: 200 }, // Jungle
      { x: 80, y: 120 }, // Mid
      { x: 120, y: 60 }, // Top
      { x: 60, y: 260 }, // Base
    ])
    const redChampions = ref([
      { x: 250, y: 40 }, // Top-Lane
      { x: 200, y: 60 }, // Jungle
      { x: 120, y: 80 }, // Mid
      { x: 260, y: 60 }, // Base
      { x: 260, y: 200 }, // Bot
    ])

    const move = ref(100)
    const gameStore = useGameStore()

    let intervalId: number | undefined

    function moveChampions() {
      // Begrenzungen der Map
      const min = 25
      const max = 250

      // Zufällige Bewegung für jede Figur
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
    }

    onMounted(() => {
      intervalId = window.setInterval(moveChampions, gameStore.gameSpeed)
    })

    onBeforeUnmount(() => {
      if (intervalId) clearInterval(intervalId)
    })

    return {
      blueChampions,
      redChampions,
    }
  },
})
</script>
