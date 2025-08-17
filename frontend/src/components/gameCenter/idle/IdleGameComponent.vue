<template>
  <div
    class="relative flex flex-col w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
  >
    <!-- Animated Background -->
    <div class="absolute inset-0 opacity-20">
      <div
        class="absolute bg-purple-500 rounded-full top-10 left-10 w-72 h-72 mix-blend-multiply filter blur-xl animate-blob"
      ></div>
      <div
        class="absolute bg-yellow-500 rounded-full top-10 right-10 w-72 h-72 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute bg-pink-500 rounded-full -bottom-8 left-20 w-72 h-72 mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
      ></div>
    </div>

    <!-- Header mit Glassmorphism -->
    <div
      class="relative z-10 flex flex-row items-center justify-between w-full text-center border-b shadow-lg backdrop-blur-lg bg-white/10 border-white/20"
    >
      <!-- Universum-Info -->
      <div class="flex flex-col items-center w-1/4">
        <div class="flex flex-row items-center justify-center gap-3">
          <div
            class="px-3 py-1 text-xs font-medium text-blue-300 border rounded-full bg-blue-500/20 backdrop-blur-sm border-blue-400/30"
          >
            Universum
          </div>
          <div
            class="px-4 py-2 text-xl font-bold text-transparent border bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text border-blue-400/30 rounded-xl backdrop-blur-sm bg-white/10"
          >
            {{ gameStore.currentUniverse }}
          </div>
        </div>
      </div>

      <!-- Progress Section -->
      <div class="flex flex-col items-center w-1/2">
        <div class="flex items-center justify-center gap-3 mb-4">
          <span
            class="text-base font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text"
          >
            🌌 Universum-Rettung: {{ gameStore.universeRescueProgress.toFixed(2) }}%
          </span>
        </div>
        <div
          class="relative h-2 mx-auto overflow-hidden border rounded-full shadow-inner w-80 bg-gray-700/50 backdrop-blur-sm border-white/20"
        >
          <div
            class="h-full transition-all duration-1000 ease-out rounded-full shadow-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
            :style="{
              width: gameStore.universeRescueProgress + '%',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.8)',
            }"
          ></div>
          <div
            class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
          ></div>
        </div>
        <p class="mt-3 text-sm font-medium text-purple-300">
          {{ formatNumber(gameStore.chimesForNextUniverse) }} /
          {{ formatNumber(gameStore.chimesToUniverseRescue) }} Chimes gesammelt
        </p>
      </div>

      <!-- Universe Info -->
      <div class="flex flex-col items-center w-1/4 p-4">
        <div
          class="px-4 py-2 text-base font-bold text-transparent border bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text backdrop-blur-sm bg-white/10 border-emerald-400/30 rounded-xl"
        >
          {{ universes[gameStore.currentUniverse - 1].name }}
        </div>
        <div class="mt-2 text-xs font-medium text-emerald-300 opacity-80">
          {{ universes[gameStore.currentUniverse - 1].description }}
        </div>
      </div>
    </div>

    <!-- Hauptinhalt -->
    <div class="relative z-10 grid flex-1 w-full min-h-0 grid-cols-3">
      <div class="flex flex-col items-center justify-center col-span-2 text-center">
        <!-- Motivationstext -->
        <div
          class="mb-4 border bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border-purple-400/30 rounded-2xl"
        >
          <span
            class="p-2 text-base font-medium text-transparent bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text"
          >
            ✨ Sammle Chimes um das Universum zu retten! ✨
          </span>
        </div>

        <!-- Chime Button - Verbessertes Design -->
        <div
          @click="handleChimeClick"
          class="relative flex flex-col items-center justify-center w-48 h-48 cursor-pointer group chime-main-button"
        >
          <!-- Outer Glow Ring -->
          <div
            class="absolute inset-0 rounded-full opacity-75 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 animate-spin-slow"
          ></div>
          <div
            class="absolute rounded-full inset-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-60 animate-pulse"
          ></div>

          <!-- Inner Button -->
          <div
            class="relative flex items-center justify-center w-40 h-40 border rounded-full shadow-2xl backdrop-blur-sm bg-gradient-to-br from-white/20 to-white/5 border-white/30"
          >
            <img
              src="/img/BardAbilities/BardChime.png"
              class="relative w-32 h-32 transition-all duration-300 select-none drop-shadow-2xl group-hover:scale-110 chime-icon"
              style="filter: drop-shadow(0 0 30px rgba(251, 191, 36, 0.8))"
            />
          </div>

          <!-- Click Info -->
          <div class="absolute text-center -bottom-12">
            <p
              class="text-xl font-bold text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text drop-shadow-lg"
            >
              +{{ gameStore.chimesPerClick }} pro Klick
            </p>
            <p class="text-sm font-medium text-yellow-300 animate-pulse">
              💫 Klicke für Chimes! 💫
            </p>
          </div>
        </div>

        <!-- Meep Progress - Verbessert -->
        <div class="mt-12 text-center">
          <div class="flex items-center justify-center gap-3 mb-3">
            <div
              class="p-1 border rounded-full bg-gradient-to-r from-orange-500/20 to-yellow-500/20 backdrop-blur-sm border-orange-400/30"
            >
              <img src="/img/BardAbilities/BardMeep.png" class="w-8 h-8" />
            </div>
            <span
              class="text-lg font-bold text-transparent bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text"
            >
              {{ gameStore.chimesForMeep }} / {{ gameStore.meepChimeRequirement }}
            </span>
          </div>
          <div
            class="relative w-48 h-3 mx-auto overflow-hidden border rounded-full shadow-inner bg-gray-700/50 backdrop-blur-sm border-white/20"
          >
            <div
              class="h-full transition-all duration-500 ease-out rounded-full shadow-lg bg-gradient-to-r from-orange-500 to-yellow-500"
              :style="{
                width: (gameStore.chimesForMeep / gameStore.meepChimeRequirement) * 100 + '%',
                boxShadow: '0 0 15px rgba(249, 115, 22, 0.6)',
              }"
            ></div>
          </div>
        </div>

        <!-- Chimes per Second -->
        <div
          class="px-6 py-3 mt-8 border bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border-green-400/30 rounded-2xl"
        >
          <span
            class="text-xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text"
          >
            🚀 {{ gameStore.chimesPerSecond }} Chimes/s
          </span>
        </div>
      </div>

      <!-- Shop Area mit Glassmorphism -->

      <div
        class="h-full col-span-1 overflow-x-hidden overflow-y-auto border-l shadow-xl backdrop-blur-lg bg-white/5 border-white/20 custom-scrollbar"
      >
        <ShopComponent />
      </div>
    </div>

    <!-- Enhanced Chime Popup -->
    <div
      :key="chimeGainKey"
      class="fixed z-50 text-2xl font-bold text-transparent pointer-events-none bg-gradient-to-r from-purple-700 to-pink-500 bg-clip-text chime-popup"
      :style="{
        top: chimeGainPos.y - 200 + 'px',
        left: chimeGainPos.x - 400 + 'px',
        filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.8))',
      }"
    >
      +{{ gameStore.chimesPerClick }} ✨
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../../../stores/gameStore'
import { formatNumber } from '../../../config/numberFormat'
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

    const startGameTimer = () => {
      gameTimer = setInterval(() => {
        gameStore.tick()
      }, 1000)
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
/* Animationen */
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes float-enhanced {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg) scale(1);
  }
  50% {
    transform: translateY(-12px) rotate(5deg) scale(1.05);
  }
}

@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 40px rgba(251, 191, 36, 0.9);
    transform: scale(1.02);
  }
}

@keyframes fadeUpEnhanced {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-10px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translateY(-30px) scale(0.8);
  }
}

/* Klassen */
.animate-blob {
  animation: blob 7s infinite;
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

.animate-spin-slow {
  animation: spin-slow 8s linear infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

/* Chime Button Styles */
.chime-main-button {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chime-main-button:hover {
  transform: scale(1.08);
}

.chime-main-button:active {
  transform: scale(0.95);
}

.chime-icon {
  animation: float-enhanced 4s ease-in-out infinite;
}

.chime-main-button:hover .chime-icon {
  animation-duration: 2s;
}

/* Popup Animation */
.chime-popup {
  animation: fadeUpEnhanced 1s ease-out forwards;
}

/* Glassmorphism Utilities */
.backdrop-blur-lg {
  backdrop-filter: blur(16px);
}

.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}

/* Responsive */
@media (max-width: 1024px) {
  .grid-cols-3 {
    grid-template-columns: 1fr;
  }

  .col-span-2 {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .w-48 {
    width: 10rem;
  }

  .h-48 {
    height: 10rem;
  }

  .w-40 {
    width: 8rem;
  }

  .h-40 {
    height: 8rem;
  }
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(30, 27, 75, 0.3);
  border-radius: 10px;
  border: 1px solid rgba(168, 85, 247, 0.2);
  backdrop-filter: blur(4px);
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(
    180deg,
    rgba(168, 85, 247, 0.8) 0%,
    rgba(236, 72, 153, 0.8) 50%,
    rgba(168, 85, 247, 0.6) 100%
  );
  border-radius: 10px;
  border: 1px solid rgba(168, 85, 247, 0.3);
  box-shadow:
    0 0 10px rgba(168, 85, 247, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(
    180deg,
    rgba(168, 85, 247, 1) 0%,
    rgba(236, 72, 153, 1) 50%,
    rgba(168, 85, 247, 0.8) 100%
  );
  box-shadow:
    0 0 20px rgba(168, 85, 247, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transform: scaleY(1.1);
}

.custom-scrollbar::-webkit-scrollbar-thumb:active {
  background: linear-gradient(
    180deg,
    rgba(147, 51, 234, 1) 0%,
    rgba(219, 39, 119, 1) 50%,
    rgba(147, 51, 234, 0.9) 100%
  );
  box-shadow:
    0 0 25px rgba(168, 85, 247, 1),
    inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.custom-scrollbar::-webkit-scrollbar-corner {
  background: rgba(30, 27, 75, 0.3);
  border-radius: 10px;
}

/* Firefox Scrollbar (falls unterstützt) */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(168, 85, 247, 0.8) rgba(30, 27, 75, 0.3);
}

/* Glow-Effekt beim Hovern der Shop-Area */
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  animation: scrollbarGlow 2s ease-in-out infinite;
}

@keyframes scrollbarGlow {
  0%,
  100% {
    box-shadow:
      0 0 15px rgba(168, 85, 247, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow:
      0 0 30px rgba(168, 85, 247, 0.9),
      inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }
}
</style>
