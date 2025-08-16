<template>
  <div class="relative flex flex-col w-full h-full">
    <div
      class="flex flex-row items-center justify-between w-full text-center border-b border-blue-200"
    >
      <!-- Universum-Zahl in der oberen linken Ecke -->
      <div class="flex flex-col items-center w-1/4">
        <div class="flex flex-row items-center justify-center gap-2">
          <div class="mb-1 text-xs text-blue-600">Universum</div>
          <div class="mb-1 text-lg font-bold text-blue-800">
            {{ gameStore.currentUniverse }}
          </div>
        </div>
      </div>

      <div class="flex flex-col items-center w-1/2">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="text-sm font-bold text-blue-800">
            🌌 Universum-Rettung: {{ gameStore.universeRescueProgress.toFixed(2) }}%
          </span>
        </div>
        <div class="w-64 h-1 mx-auto overflow-hidden bg-blue-200 rounded-full">
          <div
            class="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
            :style="{
              width: gameStore.universeRescueProgress + '%',
            }"
          ></div>
        </div>
        <p class="mt-2 text-sm text-blue-600">
          {{ formatNumber(gameStore.chimesForNextUniverse) }} /
          {{ formatNumber(gameStore.chimesToUniverseRescue) }} Chimes gesammelt
        </p>
      </div>

      <div class="flex flex-col items-center w-1/4">
        <div class="text-sm font-semibold text-blue-700 max-w-32">
          {{ universes[gameStore.currentUniverse - 1].name }}
        </div>
        <div class="mt-1 text-xs italic text-blue-500">
          {{ universes[gameStore.currentUniverse - 1].description }}
        </div>
      </div>
    </div>

    <!-- Hauptinhalt in der Mitte des Bildschirms -->
    <div class="grid flex-1 w-full min-h-0 grid-cols-3">
      <!-- <div class="col-span-1"></div> -->
      <div class="flex flex-col items-center justify-center col-span-2">
        <span class="mb-4 text-sm text-blue-600">Sammle Chimes um das Universum zu retten!</span>
        <div
          @click="handleChimeClick"
          class="relative flex flex-col items-center justify-center w-40 h-40 cursor-pointer chime-main-button"
        >
          <!-- w-64 h-64 → w-40 h-40 -->

          <!-- Hintergrund-Ringe -->
          <div class="absolute inset-0 rounded-full chime-outer-ring"></div>
          <div class="absolute rounded-full inset-3 chime-inner-ring"></div>
          <!-- inset-4 → inset-3 -->

          <!-- Kompakteres Chime Icon -->
          <img
            src="/img/BardAbilities/BardChime.png"
            class="relative select-none w-28 h-28 drop-shadow-2xl chime-icon"
          />

          <!-- Kompakter Klick-Hinweis -->
          <div class="absolute text-center -bottom-6">
            <!-- -bottom-8 → -bottom-6 -->
            <p class="text-lg font-bold text-amber-800 drop-shadow-lg">
              <!-- text-2xl → text-lg -->
              +{{ gameStore.chimesPerClick }} pro Klick
            </p>
            <p class="text-xs text-amber-600 animate-pulse">Klicke für Chimes!</p>
            <!-- text-sm → text-xs -->
          </div>
        </div>

        <!-- Kompakter Meep Progress -->
        <div class="mt-6 text-center">
          <!-- mt-8 → mt-4 -->
          <div class="flex items-center justify-center gap-2 mb-2">
            <img src="/img/BardAbilities/BardMeep.png" class="w-6 h-6" />
            <!-- w-8 h-8 → w-6 h-6 -->
            <span class="text-base font-bold text-amber-800">
              <!-- text-lg → text-base -->
              {{ gameStore.chimesForMeep }} / {{ gameStore.meepChimeRequirement }}
            </span>
          </div>
          <div class="w-32 h-2 overflow-hidden rounded-full bg-amber-200">
            <!-- w-48 h-3 → w-32 h-2 -->
            <div
              class="h-full transition-all duration-300 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
              :style="{
                width: (gameStore.chimesForMeep / gameStore.meepChimeRequirement) * 100 + '%',
              }"
            ></div>
          </div>
        </div>

        <span class="mt-6 text-base font-bold text-green-600">
          {{ gameStore.chimesPerSecond }} Chimes/s
        </span>
      </div>

      <div class="h-full col-span-1 overflow-x-hidden overflow-y-auto">
        <ShopComponent />
      </div>
    </div>

    <!-- Chime Popup Animation -->
    <div
      :key="chimeGainKey"
      class="fixed z-50 text-xl font-bold pointer-events-none text-amber-800 drop-shadow chime-popup"
      :style="{ top: chimeGainPos.y - 48 + 'px', left: chimeGainPos.x - 48 + 'px' }"
    >
      <!-- -64 → -48 angepasst für kleinere Komponente -->
      +{{ gameStore.chimesPerClick }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../../../stores/gameStore'
import { formatNumber } from '../../../config/numberFormat' // Direkte Import
import ShopComponent from './ShopComponent.vue'
import { universes } from '../../../config/universes'

export default defineComponent({
  name: 'IdleGameComponent',
  components: {
    ShopComponent,
  },
  setup() {
    const gameStore = useGameStore()
    const showShop = ref(false)

    const chimeGainPos = ref({ x: 0, y: 0 })
    const chimeGainKey = ref(0)
    let gameTimer: ReturnType<typeof setInterval> | null = null

    function handleChimeClick(event) {
      gameStore.addChime()
      chimeGainPos.value = { x: event.clientX, y: event.clientY }
      chimeGainKey.value++
      if (gameStore.chimesForMeep >= gameStore.meepChimeRequirement) {
        setTimeout(() => {
          gameStore.addMeep()
          gameStore.chimesForMeep = 0
        }, 100)
      }
    }

    // Timer für passive Einnahmen
    const startGameTimer = () => {
      gameTimer = setInterval(() => {
        gameStore.tick()
      }, 1000) // Jede Sekunde
    }

    const stopGameTimer = () => {
      if (gameTimer) {
        clearInterval(gameTimer)
        gameTimer = null
      }
    }

    onMounted(() => {
      startGameTimer()
    })

    onUnmounted(() => {
      stopGameTimer()
    })

    return {
      gameStore,
      showShop,
      formatNumber,
      handleChimeClick,
      chimeGainPos,
      chimeGainKey,
      universes,
    }
  },
})
</script>

<style scoped>
/* Alle CSS-Animationen bleiben unverändert */

/* Chime Main Button */
.chime-main-button {
  transition: all 0.2s ease;
}

.chime-main-button:hover {
  transform: scale(1.05);
}

.chime-main-button:active {
  transform: scale(0.95);
}

/* Äußere Ring-Animation */
.chime-outer-ring {
  background: linear-gradient(45deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.3));
  animation: rotate 4s linear infinite;
  border: 4px solid rgba(251, 191, 36, 0.5);
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Innere Ring-Animation */
.chime-inner-ring {
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.2), rgba(251, 191, 36, 0.2));
  animation: pulse 2s ease-in-out infinite;
  border: 2px solid rgba(251, 191, 36, 0.3);
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

/* Chime Icon Animation */
.chime-icon {
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.6));
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-8px) rotate(3deg);
  }
}

/* Hover-Effekte */
.chime-main-button:hover .chime-outer-ring {
  animation-duration: 2s;
  border-color: rgba(251, 191, 36, 0.8);
}

.chime-main-button:hover .chime-icon {
  filter: drop-shadow(0 0 30px rgba(251, 191, 36, 0.8));
}

/* Chime Popup Animation */
.chime-popup {
  animation: fadeUp 0.7s ease-out forwards;
}

@keyframes fadeUp {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-20px);
  }
}
</style>
