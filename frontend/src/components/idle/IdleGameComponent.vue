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

    <!-- Planet Travel HUD -->
    <TravelHud />

    <!-- Champion Orbit + Combat Visuals -->
    <ChampionOrbit />

    <!-- Player HP Bar -->
    <PlayerHPBar />

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
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useBattleStore } from '../../stores/battleStore'
import { useAugmentStore } from '../../stores/augmentStore'
import { useGalaxyStore } from '../../stores/galaxyStore'
import { formatNumber } from '../../config/numberFormat'
import SunComponent from './sun/SunComponent.vue'
import TravelHud from './sun/TravelHud.vue'
import ChampionOrbit from './sun/ChampionOrbit.vue'
import PlayerHPBar from './sun/PlayerHPBar.vue'

export default defineComponent({
  name: 'IdleGameComponent',
  components: {
    SunComponent,
    TravelHud,
    ChampionOrbit,
    PlayerHPBar,
  },
  setup() {
    const gameStore = useGameStore()
    const battleStore = useBattleStore()
    const galaxyStore = useGalaxyStore()

    const chimeGainPos = ref({ x: 0, y: 0 })
    const chimeGainKey = ref(0)

    // Champion travel indicator
    const showTravel = computed(
      () =>
        galaxyStore.championTravelState === 'traveling' &&
        !galaxyStore.pendingGalaxyBoss &&
        !galaxyStore.isComplete,
    )

    const travelCountdown = computed(() => {
      const ms = galaxyStore.travelRemainingMs
      const s = Math.ceil(ms / 1000)
      const h = Math.floor(s / 3600)
      const m = Math.floor((s % 3600) / 60)
      const sec = s % 60
      if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      return `${m}:${String(sec).padStart(2, '0')}`
    })

    const TRAVEL_MAX_LY = 42.0
    const travelLightYears = computed(() => {
      const remaining = ((100 - galaxyStore.travelProgressPercent) / 100) * TRAVEL_MAX_LY
      return remaining.toFixed(1)
    })
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
      galaxyStore,
      formatNumber,
      handleChimeClick,
      chimeGainPos,
      chimeGainKey,
      showTravel,
      travelCountdown,
      travelLightYears,
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

/* ─── Champion Travel HUD ─── */
@keyframes hud-pulse {
  0%,
  100% {
    box-shadow:
      0 0 8px rgba(232, 192, 64, 0.3),
      inset 0 0 12px rgba(232, 192, 64, 0.05);
  }
  50% {
    box-shadow:
      0 0 22px rgba(232, 192, 64, 0.6),
      inset 0 0 20px rgba(232, 192, 64, 0.12);
  }
}

@keyframes bar-scan {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

.travel-hud {
  position: fixed;
  top: calc(50% + 120px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 9;
  pointer-events: none;
  width: 280px;
  background: rgba(10, 8, 4, 0.9);
  border: 2px solid #7a4e20;
  box-shadow: inset 0 0 0 1px #3e200a;
  border-radius: 4px;
  overflow: hidden;
  animation: hud-pulse 3s ease-in-out infinite;
}

.travel-hud-bar-track {
  width: 100%;
  height: 3px;
  background: #1c1c18;
}

.travel-hud-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #a06820, #e8c040, #ffd060, #e8c040, #a06820);
  background-size: 200% auto;
  animation: bar-scan 2.5s linear infinite;
  transition: width 0.9s linear;
}

.travel-hud-header {
  text-align: center;
  font-size: 0.55rem;
  letter-spacing: 0.18em;
  color: #a07030;
  padding: 5px 0 3px;
  border-bottom: 1px solid #3e200a;
}

.travel-hud-metrics {
  display: flex;
  align-items: stretch;
  padding: 10px 12px;
}

.travel-metric {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.travel-metric-divider {
  width: 1px;
  background: #3e200a;
  margin: 0 10px;
  flex-shrink: 0;
}

.travel-metric-icon {
  color: #c89040;
}

.travel-metric-label {
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  color: #8a6830;
  text-transform: uppercase;
}

.travel-metric-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #e8c040;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.55);
  line-height: 1.1;
}

.travel-unit {
  font-size: 0.7rem;
  color: #a07030;
  letter-spacing: 0.05em;
}

/* Transition */
.travel-fade-enter-active,
.travel-fade-leave-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}

.travel-fade-enter-from,
.travel-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
