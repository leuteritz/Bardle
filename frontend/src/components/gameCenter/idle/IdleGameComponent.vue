<template>
  <div class="relative flex items-center justify-center w-full h-full">
    <!-- Animated Sun behind chime -->
    <SunComponent />

    <!-- Chime Button - zentriert, nur das -->
    <div
      @click="handleChimeClick"
      class="fixed z-10 flex flex-col items-center justify-center w-48 h-48 cursor-pointer group chime-main-button"
      style="top: 50%; left: 50%; transform: translate(-50%, -50%)"
    >
      <!-- Outer Glow Ring -->

      <!-- Inner Button -->
      <div class="relative flex items-center justify-center w-40 h-40">
        <img
          src="/img/BardAbilities/BardChime.png"
          class="relative w-32 h-32 transition-all duration-300 select-none rpg-img drop-shadow-2xl group-hover:scale-110 chime-icon"
          style="filter: drop-shadow(0 0 30px rgba(251, 191, 36, 0.8))"
        />
      </div>
    </div>

    <!-- Click Popup Animation -->
    <div
      :key="chimeGainKey"
      class="fixed z-50 flex items-center gap-1 font-bold pointer-events-none chime-popup"
      :style="{
        top: chimeGainPos.y + 'px',
        left: chimeGainPos.x + 'px',
      }"
    >
      <span class="text-2xl chime-gain-text"> +{{ gameStore.chimesPerClick }} </span>
      <img
        src="/img/BardAbilities/BardChime.png"
        class="w-6 h-6 rpg-img"
        style="filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.9))"
      />
    </div>

    <!-- Section Navigator -->
    <div class="fixed z-20 section-nav-wrapper">
      <SectionNavigatorComponent />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../../../stores/gameStore'
import { useBattleStore } from '../../../stores/battleStore'
import { useAugmentStore } from '../../../stores/augmentStore'
import { formatNumber } from '../../../config/numberFormat'
import ChimesPerSecondModal from './ChimesPerSecondModal.vue'
import MeepProgressComponent from './MeepProgressComponent.vue'
import ExpeditionComponent from './ExpeditionComponent.vue'
import SunComponent from './SunComponent.vue'
import SectionNavigatorComponent from './SectionNavigatorComponent.vue'

export default defineComponent({
  name: 'IdleGameComponent',
  components: {
    ChimesPerSecondModal,
    MeepProgressComponent,
    ExpeditionComponent,
    SunComponent,
    SectionNavigatorComponent,
  },
  setup() {
    const gameStore = useGameStore()
    const battleStore = useBattleStore()

    const chimeGainPos = ref({ x: 0, y: 0 })
    const chimeGainKey = ref(0)
    let gameTimer: ReturnType<typeof setInterval> | null = null

    function handleChimeClick(event: MouseEvent) {
      gameStore.addChime()
      // Apply special augment click effects (Double Tap, Chain Reaction, etc.)
      const augmentStore = useAugmentStore()
      const bonus = augmentStore.onClick(gameStore.chimesPerClick, gameStore.activeAugments)
      if (bonus > 0) {
        gameStore.chimes += bonus
        gameStore.chimesForMeep += bonus
        gameStore.chimesForNextUniverse += bonus
      }
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

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopGameTimer()
      } else {
        if (!gameTimer) startGameTimer()
      }
    }

    onMounted(() => {
      startGameTimer()
      document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onUnmounted(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopGameTimer()
    })

    return {
      gameStore,
      battleStore,
      formatNumber,
      handleChimeClick,
      chimeGainPos,
      chimeGainKey,
    }
  },
})
</script>

<style scoped>
.section-nav-wrapper {
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  width: clamp(280px, 40vw, 420px);
}

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

@keyframes cps-shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(200%);
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
    transform: translate(-50%, -100%) scale(1);
  }
  50% {
    transform: translate(-50%, -120%) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -160%) scale(0.8);
  }
}

/* Chime gain popup text */
.chime-gain-text {
  color: #d9ff4d;
  -webkit-text-stroke: 1.5px rgba(0, 0, 0, 0.75);
  text-shadow:
    -1px -1px 0 rgba(0, 0, 0, 0.9),
    1px -1px 0 rgba(0, 0, 0, 0.9),
    -1px 1px 0 rgba(0, 0, 0, 0.9),
    1px 1px 0 rgba(0, 0, 0, 0.9),
    0 0 14px rgba(200, 255, 80, 0.95);
}

/* Klassen */
.animate-blob {
  animation: blob 7s infinite;
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

.animate-cps-shimmer {
  animation: cps-shimmer 1.8s ease-in-out infinite;
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
