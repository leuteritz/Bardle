<template>
  <div class="relative flex items-center justify-center w-full h-full">
    <SunComponent />

    <div
      @click="handleChimeClick"
      class="fixed z-10 flex items-center justify-center cursor-pointer chime-main-button"
      :style="chimeButtonStyle"
    >
      <img
        src="/img/BardAbilities/BardChime.png"
        class="rpg-img chime-icon"
        :style="chimeIconStyle"
        draggable="false"
        @dragstart.prevent
      />
    </div>

    <ChampionOrbit />
    <PlanetOrbit />
    <StarSystemComponent />
    <PlayerHPBar />
    <StarSystemRescueTransition />

    <div
      :key="chimeGainKey"
      class="fixed z-50 pointer-events-none chime-popup"
      :style="{
        top: chimeGainPos.y + 'px',
        left: (chimeGainPos.x + chimeGainOffsetX) + 'px',
        '--angle': chimeGainAngle + 'deg',
      }"
    >
      <span class="chime-gain-text" :style="{ fontSize: chimePopupFontSize + 'px' }">
        +{{ $formatNumber(gameStore.chimesPerClick) }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useBattleStore } from '../../stores/battleStore'
import { useAugmentStore } from '../../stores/augmentStore'
import { useGalaxyStore } from '../../stores/galaxyStore'
import { usePlanetShopStore } from '../../stores/planetShopStore'
import { formatNumber } from '../../config/numberFormat'
import SunComponent from './sun/SunComponent.vue'
import ChampionOrbit from './sun/ChampionOrbit.vue'
import PlayerHPBar from './sun/PlayerHPBar.vue'
import StarSystemComponent from './sun/StarSystemComponent.vue'
import StarSystemRescueTransition from './sun/StarSystemRescueTransition.vue'
import PlanetOrbit from './sun/PlanetOrbit.vue'
import { playChimeSound } from '../../composables/useChimeSound'

export default defineComponent({
  name: 'IdleGameComponent',
  components: {
    SunComponent,
    ChampionOrbit,
    PlayerHPBar,
    StarSystemComponent,
    StarSystemRescueTransition,
    PlanetOrbit,
  },
  setup() {
    const gameStore = useGameStore()
    const battleStore = useBattleStore()
    const galaxyStore = useGalaxyStore()
    const planetShopStore = usePlanetShopStore()

    const chimeButtonStyle = computed(() => ({
      width: `${planetShopStore.currentSunRadius * 4}px`,
      height: `${planetShopStore.currentSunRadius * 4}px`,
      transition: 'width 1.5s ease, height 1.5s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }))

    const chimeIconStyle = computed(() => ({
      width: `${planetShopStore.currentSunRadius * 1.5}px`,
      height: `${planetShopStore.currentSunRadius * 1.5}px`,
      filter: 'drop-shadow(0 0 30px rgba(251, 191, 36, 0.8))',
      transition: 'width 1.5s ease, height 1.5s ease',
    }))

    const chimePopupFontSize = computed(() =>
      Math.max(planetShopStore.currentSunRadius * 0.5, 22),
    )

    const chimeGainPos = ref({ x: 0, y: 0 })
    const chimeGainKey = ref(0)
    const chimeGainOffsetX = ref(0)
    const chimeGainAngle = ref(0)

    let gameTimer: ReturnType<typeof setInterval> | null = null

    function handleChimeClick(event: MouseEvent) {
      playChimeSound()
      gameStore.addChime()
      const augmentStore = useAugmentStore()
      const bonus = augmentStore.onClick(gameStore.chimesPerClick, gameStore.activeAugments)

      if (bonus > 0) {
        gameStore.chimes += bonus
        gameStore.chimesForMeep += bonus
        gameStore.chimesForNextUniverse += bonus
      }

      chimeGainPos.value = { x: event.clientX, y: event.clientY }
      chimeGainOffsetX.value = Math.round((Math.random() - 0.5) * 30)
      chimeGainAngle.value = Math.round((Math.random() - 0.5) * 10)
      chimeGainKey.value++
    }

    const startGameTimer = () => {
      if (gameTimer) return
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
      battleStore,
      galaxyStore,
      formatNumber,
      handleChimeClick,
      chimeGainPos,
      chimeGainKey,
      chimeGainOffsetX,
      chimeGainAngle,
      chimeButtonStyle,
      chimeIconStyle,
      chimePopupFontSize,
    }
  },
})
</script>

<style scoped>
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
    transform: translateX(-50%) translateY(-100%) rotate(var(--angle, 0deg)) scale(1.1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-220%) rotate(var(--angle, 0deg)) scale(0.85);
  }
}

.chime-gain-text {
  color: #e8c040;
  font-weight: 900;
  -webkit-text-stroke: 1.5px #3e200a;
  text-shadow:
    0 0 6px #e8c040,
    0 0 14px #c89040,
    0 0 28px rgba(232, 192, 64, 0.5);
}

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

.chime-main-button {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  user-select: none;
}

.chime-main-button:hover {
  transform: translate(-50%, -50%) scale(1.04);
}

.chime-main-button:active {
  transform: translate(-50%, -50%) scale(0.95);
}

.chime-icon {
  user-select: none;
  animation: float-enhanced 4s ease-in-out infinite;
}

.chime-main-button:hover .chime-icon {
  animation-duration: 2s;
}

.chime-popup {
  animation: fadeUpEnhanced 0.8s ease-out forwards;
}

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
