<template>
  <div
    class="relative flex flex-col w-full h-full bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950"
  >
    <!-- Animated Background -->
    <div class="absolute inset-0 opacity-20">
      <div
        class="absolute bg-blue-500 rounded-full top-10 left-10 w-72 h-72 mix-blend-multiply filter blur-xl animate-blob"
      ></div>
      <div
        class="absolute bg-yellow-500 rounded-full top-10 right-10 w-72 h-72 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
      ></div>
      <div
        class="absolute bg-violet-500 rounded-full -bottom-8 left-20 w-72 h-72 mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
      ></div>
    </div>

    <UniverseProgressComponent />

    <!-- Hauptinhalt -->
    <div class="relative z-10 grid flex-1 w-full min-h-0 grid-cols-3">
      <div class="relative flex flex-col items-center justify-center col-span-2 text-center">
        <!-- Absolute positionierte Stats links -->
        <div
          class="absolute flex flex-col gap-6 transform -translate-y-1/2 left-8 top-1/2 stats-left"
        >
          <!-- Chimes per Click -->
          <div
            class="px-6 py-4 border bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm border-yellow-400/30 rounded-2xl"
          >
            <div class="flex flex-col items-center">
              <p class="mb-1 text-sm font-medium text-yellow-300">Pro Klick</p>
              <div class="flex flex-row items-center justify-center gap-1">
                <p
                  class="text-xl font-bold text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text"
                >
                  +{{ formatNumber(gameStore.chimesPerClick) }}
                </p>
                <img src="/img/BardAbilities/BardChime.png" class="w-8 h-8" />
              </div>
            </div>
          </div>

          <!-- Chimes per Second - jetzt klickbar -->
          <div
            class="px-6 py-4 transition-all duration-300 border cursor-pointer bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border-green-400/30 rounded-2xl hover:border-green-300/50"
            @click="gameStore.setCPSModalOpen(true)"
          >
            <div class="flex flex-col items-center">
              <p class="mb-1 text-sm font-medium text-green-300">Pro Sekunde</p>
              <div class="flex flex-row items-center justify-center gap-1">
                <p
                  class="text-xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text"
                >
                  {{ gameStore.chimesPerSecond }}
                </p>
                <img src="/img/BardAbilities/BardChime.png" class="w-8 h-8" />
              </div>
              <p class="text-xs text-green-400/80 animate-pulse">📊 Details anzeigen</p>
            </div>
          </div>
        </div>

        <!-- CPS Modal -->
        <ChimesPerSecondModal
          :is-visible="gameStore.isCPSModalOpen"
          @close="gameStore.setCPSModalOpen(false)"
        />

        <!-- Motivationstext -->
        <div
          class="mb-4 border bg-gradient-to-r from-blue-500/20 to-violet-500/20 backdrop-blur-sm border-blue-400/30 rounded-2xl"
        >
          <span
            class="p-2 text-base font-medium text-transparent bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text"
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
            class="absolute rounded-full inset-1 bg-gradient-to-r from-blue-600 to-violet-600 opacity-60 animate-pulse"
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
            <p class="text-sm font-medium text-yellow-300 animate-pulse">
              💫 Klicke für Chimes! 💫
            </p>
          </div>
        </div>

        <MeepProgressComponent @click="gameStore.setExpeditionModalOpen(true)" />
        <ExpeditionComponent
          :is-visible="gameStore.isExpeditionModalOpen"
          @close="gameStore.setExpeditionModalOpen(false)"
        />
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
      class="fixed z-50 text-2xl font-bold text-transparent pointer-events-none bg-gradient-to-r from-blue-700 to-violet-500 bg-clip-text chime-popup"
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
import ChimesPerSecondModal from './ChimesPerSecondModal.vue'
import UniverseProgressComponent from './UniverseProgressComponent.vue'
import MeepProgressComponent from './MeepProgressComponent.vue'
import ExpeditionComponent from './ExpeditionComponent.vue'

export default defineComponent({
  name: 'IdleGameComponent',
  components: {
    ShopComponent,
    ChimesPerSecondModal,
    UniverseProgressComponent,
    MeepProgressComponent,
    ExpeditionComponent,
  },
  setup() {
    const gameStore = useGameStore()

    const chimeGainPos = ref({ x: 0, y: 0 })
    const chimeGainKey = ref(0)
    let gameTimer: ReturnType<typeof setInterval> | null = null

    function handleChimeClick(event: MouseEvent) {
      gameStore.addChime()
      chimeGainPos.value = { x: event.clientX, y: event.clientY }
      chimeGainKey.value++
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
/* Bestehende Animationen und Styles bleiben unverändert */
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

/* Responsive - Stats ausblenden bei kleineren Bildschirmen */
@media (max-width: 1024px) {
  .grid-cols-3 {
    grid-template-columns: 1fr;
  }

  .col-span-2 {
    grid-column: span 1;
  }

  .stats-left {
    display: none;
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

</style>
