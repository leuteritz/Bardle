<template>
  <div class="relative flex flex-col items-center justify-center mb-8">
    <!-- Chime Button - Groß und zentral -->
    <div
      @click="handleChimeClick"
      class="relative flex flex-col items-center justify-center w-64 h-64 cursor-pointer chime-main-button"
    >
      <!-- Hintergrund-Ringe -->
      <div class="absolute inset-0 rounded-full chime-outer-ring"></div>
      <div class="absolute rounded-full inset-4 chime-inner-ring"></div>

      <!-- Chime Icon -->
      <img
        src="/img/BardAbilities/BardChime.png"
        class="relative w-48 h-48 select-none drop-shadow-2xl chime-icon"
      />

      <!-- Klick-Hinweis -->
      <div class="absolute text-center -bottom-8">
        <p class="text-2xl font-bold text-amber-800 drop-shadow-lg">
          +{{ gameStore.chimesPerClick }} pro Klick
        </p>
        <p class="text-sm text-amber-600 animate-pulse">Klicke für Chimes!</p>
      </div>
    </div>

    <!-- Meep Progress -->
    <div class="mt-8 text-center">
      <div class="flex items-center justify-center gap-2 mb-2">
        <img src="/img/BardAbilities/BardMeep.png" class="w-8 h-8" />
        <span class="text-lg font-bold text-amber-800">
          {{ gameStore.chimesForMeep }} / {{ gameStore.meepChimeRequirement }}
        </span>
      </div>
      <div class="w-48 h-3 overflow-hidden rounded-full bg-amber-200">
        <div
          class="h-full transition-all duration-300 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
          :style="{
            width: (gameStore.chimesForMeep / gameStore.meepChimeRequirement) * 100 + '%',
          }"
        ></div>
      </div>
    </div>

    <!-- Chime Popup Animation -->
    <div
      :key="chimeGainKey"
      class="fixed z-50 text-2xl font-bold pointer-events-none text-amber-800 drop-shadow chime-popup"
      :style="{ top: chimeGainPos.y - 64 + 'px' }"
    >
      +{{ gameStore.chimesPerClick }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useGameStore } from '../../../stores/gameStore'

export default defineComponent({
  name: 'IdleGameComponent',
  components: {},
  setup() {
    const gameStore = useGameStore()

    const chimeGainPos = ref({ x: 0, y: 0 })
    const chimeGainKey = ref(0)

    function handleChimeClick(event) {
      gameStore.addChime()
      chimeGainPos.value = { x: event.clientX, y: event.clientY }
      chimeGainKey.value++
      if (gameStore.chimesForMeep >= gameStore.meepChimeRequirement) {
        setTimeout(() => {
          gameStore.addMeep()
          gameStore.chimesForMeep = 0
        }, 100) // Animation noch anzeigen lassen
      }
    }

    return {
      gameStore,
      handleChimeClick,
      chimeGainPos,
      chimeGainKey,
    }
  },
})
</script>

<style scoped>
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
