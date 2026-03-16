<template>
  <div class="relative flex items-center justify-center w-full h-full">
    <!-- Animated Sun behind chime -->
    <!-- Sun Animation -->
    <div class="sun-container">
      <div class="sun-corona"></div>
      <div class="sun-rays-outer"></div>
      <div class="sun-rays-inner"></div>
      <div class="sun-core"></div>
      <div class="sun-flare"></div>
    </div>

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
          class="relative w-32 h-32 transition-all duration-300 select-none drop-shadow-2xl group-hover:scale-110 chime-icon"
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
      <span
        class="text-transparent bg-gradient-to-r from-red-800 to-red-900 bg-clip-text text-2xl drop-shadow-[0_0_8px_rgba(34,211,238,0.9)]"
      >
        +{{ gameStore.chimesPerClick }}
      </span>
      <img
        src="/img/BardAbilities/BardChime.png"
        class="w-6 h-6"
        style="filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.9))"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../../../stores/gameStore'
import { useBattleStore } from '../../../stores/battleStore'
import { formatNumber } from '../../../config/numberFormat'
import ShopComponent from './ShopComponent.vue'
import ChimesPerSecondModal from './ChimesPerSecondModal.vue'
import MeepProgressComponent from './MeepProgressComponent.vue'
import ExpeditionComponent from './ExpeditionComponent.vue'

export default defineComponent({
  name: 'IdleGameComponent',
  components: {
    ShopComponent,
    ChimesPerSecondModal,
    MeepProgressComponent,
    ExpeditionComponent,
  },
  setup() {
    const gameStore = useGameStore()
    const battleStore = useBattleStore()

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

/* Sun Animation */
.sun-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 360px;
  height: 360px;
  z-index: 5;
  pointer-events: none;
}

/* Äußerste weiche Glut */
/* Äußerste weiche Glut – längerer, sanfterer Fade */
.sun-corona {
  position: absolute;
  inset: -60px; /* größer, damit mehr Platz zum Auslaufen */
  border-radius: 50%;
  background: radial-gradient(
    circle,
    transparent 25%,
    rgba(255, 80, 0, 0.06) 40%,
    rgba(255, 120, 0, 0.1) 55%,
    rgba(255, 100, 0, 0.05) 70%,
    transparent 90% /* viel weicherer Ausklang */
  );
  animation: corona-breathe 5s ease-in-out infinite;
}

@keyframes corona-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* Äußere Strahlen – Mask mit breiterem Fade-out */
.sun-rays-outer {
  position: absolute;
  inset: -60px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(255, 90, 0, 0.18) 8deg,
    transparent 16deg,
    transparent 30deg,
    rgba(255, 90, 0, 0.18) 38deg,
    transparent 46deg,
    transparent 60deg,
    rgba(255, 90, 0, 0.18) 68deg,
    transparent 76deg,
    transparent 90deg,
    rgba(255, 90, 0, 0.18) 98deg,
    transparent 106deg,
    transparent 120deg,
    rgba(255, 90, 0, 0.18) 128deg,
    transparent 136deg,
    transparent 150deg,
    rgba(255, 90, 0, 0.18) 158deg,
    transparent 166deg,
    transparent 180deg,
    rgba(255, 90, 0, 0.18) 188deg,
    transparent 196deg,
    transparent 210deg,
    rgba(255, 90, 0, 0.18) 218deg,
    transparent 226deg,
    transparent 240deg,
    rgba(255, 90, 0, 0.18) 248deg,
    transparent 256deg,
    transparent 270deg,
    rgba(255, 90, 0, 0.18) 278deg,
    transparent 286deg,
    transparent 300deg,
    rgba(255, 90, 0, 0.18) 308deg,
    transparent 316deg,
    transparent 330deg,
    rgba(255, 90, 0, 0.18) 338deg,
    transparent 346deg,
    transparent 360deg
  );
  animation: rays-outer-rotate 18s linear infinite;
  /* Mehr Spielraum zwischen black und transparent am Außenrand */
  mask-image: radial-gradient(
    circle,
    transparent 30%,
    black 45%,
    black 65%,
    /* Strahlen bleiben länger sichtbar */ transparent 90% /* dann laaangsam auslaufen */
  );
  -webkit-mask-image: radial-gradient(
    circle,
    transparent 30%,
    black 45%,
    black 65%,
    transparent 90%
  );
}

@keyframes rays-outer-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Innere Strahlen – Mask ebenfalls weicher */
.sun-rays-inner {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: conic-gradient(
    /* ... unverändert ... */ from 0deg,
    transparent 0deg,
    rgba(255, 130, 0, 0.35) 6deg,
    transparent 12deg,
    transparent 24deg,
    rgba(255, 130, 0, 0.35) 30deg,
    transparent 36deg,
    transparent 48deg,
    rgba(255, 130, 0, 0.35) 54deg,
    transparent 60deg,
    transparent 72deg,
    rgba(255, 130, 0, 0.35) 78deg,
    transparent 84deg,
    transparent 96deg,
    rgba(255, 130, 0, 0.35) 102deg,
    transparent 108deg,
    transparent 120deg,
    rgba(255, 130, 0, 0.35) 126deg,
    transparent 132deg,
    transparent 144deg,
    rgba(255, 130, 0, 0.35) 150deg,
    transparent 156deg,
    transparent 168deg,
    rgba(255, 130, 0, 0.35) 174deg,
    transparent 180deg,
    transparent 192deg,
    rgba(255, 130, 0, 0.35) 198deg,
    transparent 204deg,
    transparent 216deg,
    rgba(255, 130, 0, 0.35) 222deg,
    transparent 228deg,
    transparent 240deg,
    rgba(255, 130, 0, 0.35) 246deg,
    transparent 252deg,
    transparent 264deg,
    rgba(255, 130, 0, 0.35) 270deg,
    transparent 276deg,
    transparent 288deg,
    rgba(255, 130, 0, 0.35) 294deg,
    transparent 300deg,
    transparent 312deg,
    rgba(255, 130, 0, 0.35) 318deg,
    transparent 324deg,
    transparent 336deg,
    rgba(255, 130, 0, 0.35) 342deg,
    transparent 348deg,
    transparent 360deg
  );
  animation: rays-inner-rotate 8s linear infinite reverse;
  mask-image: radial-gradient(
    circle,
    transparent 38%,
    black 48%,
    black 60%,
    transparent 80% /* weicher als vorher (war 75%) */
  );
  -webkit-mask-image: radial-gradient(
    circle,
    transparent 38%,
    black 48%,
    black 60%,
    transparent 80%
  );
}

@keyframes rays-inner-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Kern mit Farbübergang-Pulsieren */
.sun-core {
  position: absolute;
  inset: 60px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 200, 80, 0.75) 0%,
    rgba(255, 100, 0, 0.55) 40%,
    rgba(255, 60, 0, 0.25) 70%,
    transparent 100%
  );
  animation: core-pulse 3s ease-in-out infinite;
  filter: blur(2px);
}

@keyframes core-pulse {
  0%,
  100% {
    transform: scale(1);
    filter: blur(2px) brightness(1);
  }
  50% {
    transform: scale(1.18);
    filter: blur(3px) brightness(1.3);
  }
}

/* Lens-Flare-artiger Glanzpunkt */
.sun-flare {
  position: absolute;
  top: 30%;
  left: 35%;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 230, 150, 0.6) 0%, transparent 70%);
  animation: flare-drift 6s ease-in-out infinite;
  filter: blur(1px);
}

@keyframes flare-drift {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.5;
  }
  33% {
    transform: translate(8px, -5px) scale(1.3);
    opacity: 0.8;
  }
  66% {
    transform: translate(-5px, 5px) scale(0.9);
    opacity: 0.4;
  }
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
