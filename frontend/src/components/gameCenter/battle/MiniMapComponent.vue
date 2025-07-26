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
import { defineComponent, ref, onMounted, watch } from 'vue'
import { useGameStore } from '../../../stores/gameStore'

export default defineComponent({
  name: 'MiniMapComponent',
  props: {
    battleId: {
      type: [String, Number],
      default: 0,
    },
  },
  setup(props) {
    const blueChampions = ref([])
    const redChampions = ref([])

    resetChampions()

    const move = ref(100)
    const gameStore = useGameStore()
    let moveTimeout: any = null

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

      moveTimeout = setTimeout(moveChampions, gameStore.gameSpeed)
    }

    function startMovementAfterDelay() {
      // Alle laufenden Timeouts stoppen
      if (moveTimeout) {
        clearTimeout(moveTimeout)
        moveTimeout = null
      }

      // Nach 1 Sekunde mit Bewegung starten
      moveTimeout = setTimeout(() => {
        moveChampions()
      }, 1000)
    }

    function stopMovement() {
      if (moveTimeout) {
        clearTimeout(moveTimeout)
        moveTimeout = null
      }
    }

    function resetChampions() {
      blueChampions.value = [
        // Support
        { x: 80, y: 250 },
        // Adc
        { x: 60, y: 250 },
        // Mid
        { x: 60, y: 210 },
        // Top
        { x: 30, y: 200 },
        // Jungle
        { x: 50, y: 190 },
      ]
      redChampions.value = [
        // Top
        { x: 200, y: 30 },
        // Mid
        { x: 210, y: 60 },
        // Jungle
        { x: 230, y: 90 },
        // Support
        { x: 250, y: 80 },
        // Adc
        { x: 250, y: 60 },
      ]
    }

    watch(
      () => props.battleId,
      () => {
        console.log('battleId changed')

        // Erst alle Bewegungen stoppen
        stopMovement()

        // Dann zurücksetzen
        resetChampions()

        // Nach 1 Sekunde starten
        startMovementAfterDelay()
      },
    )

    onMounted(() => {
      // Nach 1 Sekunde starten beim ersten Laden
      startMovementAfterDelay()
    })

    return {
      blueChampions,
      redChampions,
    }
  },
})
</script>
