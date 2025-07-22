<template>
  <div
    class="relative w-[300px] h-[300px] rounded-2xl shadow-2xl border-4 border-amber-300 overflow-hidden"
  >
    <!-- Minimap-Bild als Hintergrund -->
    <img src="/img/minimap.png" class="absolute w-full h-full pointer-events-none select-none" />

    <!-- Blaue Figuren -->
    <div
      v-for="(champ, i) in blueChampions"
      :key="'blue-' + i"
      class="absolute flex items-center justify-center transition-all duration-200"
      :style="{ left: champ.x + 'px', top: champ.y + 'px', zIndex: i === 0 ? 2 : 1 }"
    >
      <div
        :class="[
          'rounded-full border-2 shadow-lg',
          i === 0 ? 'w-4 h-4 bg-amber-400  ' : 'w-4 h-4 bg-blue-500  ',
        ]"
      ></div>
    </div>

    <!-- Rote Figuren -->
    <div
      v-for="(champ, i) in redChampions"
      :key="'red-' + i"
      class="absolute flex items-center justify-center transition-all duration-200"
      :style="{ left: champ.x + 'px', top: champ.y + 'px', zIndex: 1 }"
    >
      <div class="w-4 h-4 bg-red-500 border-2 rounded-full shadow-lg"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue'
import { useGameStore } from '../../stores/gameStore'

export default defineComponent({
  name: 'MiniMapComponent',
  setup() {
    const blueChampions = ref([
      { x: 40, y: 80 },
      { x: 40, y: 80 },
      { x: 40, y: 80 },
      { x: 40, y: 80 },
      { x: 40, y: 80 },
    ])
    const redChampions = ref([
      { x: 200, y: 180 },
      { x: 200, y: 180 },
      { x: 200, y: 180 },
      { x: 200, y: 180 },
      { x: 200, y: 180 },
    ])

    const move = ref(100)
    const gameStore = useGameStore()

    function moveChampions() {
      const min = 25
      const max = 250
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

      setTimeout(moveChampions, gameStore.gameSpeed)
    }

    onMounted(() => {
      moveChampions()
    })

    return {
      blueChampions,
      redChampions,
    }
  },
})
</script>
