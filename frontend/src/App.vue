<script setup lang="ts">
import { useGameStore } from './stores/gameStore'
import { useTitleRotation } from './composables/useTitleRotation'
import { formatNumber } from './config/numberFormat'
import StatsPanelComponent from './components/bottom/StatsPanelComponent.vue'
import AbilityBarComponent from './components/bottom/AbilityBarComponent.vue'
import BardHudComponent from './components/bottom/BardHudComponent.vue'
import GameCenterComponent from './components/gameCenter/GameCenterComponent.vue'
import RankComponent from './components/RankComponent.vue'
import StarBackgroundComponent from './components/layout/StarBackgroundComponent.vue'
import EncyclopediaPanel from './components/encyclopedia/EncyclopediaPanel.vue'
import AdminDashboard from './components/AdminDashboard.vue'

const gameStore = useGameStore()
const { currentMsg } = useTitleRotation()
</script>

<template>
  <div class="min-h-screen cosmic-bg">
    <StarBackgroundComponent />

    <div class="flex flex-col justify-between p-4 w-full min-h-screen font-['MedievalSharp']">
      <!-- Oberer Bereich mit Navigation -->
      <div class="z-50 grid w-full h-8 grid-cols-3">
        <!-- Links: Rang-Komponente -->
        <div class="flex items-center justify-start col-span-1">
          <RankComponent />
        </div>

        <!-- Mitte: Chimes & CPS -->
        <div class="flex flex-col items-center justify-center col-span-1 gap-0">
          <!-- Gesamt-Chimes -->
          <div class="flex items-center gap-1 px-4 py-1">
            <img src="/img/BardAbilities/BardChime.png" class="w-24 h-24 chime-glow" />
            <span class="font-bold text-transparent text-7xl whitespace-nowrap tracking-wider bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 chimes-text-glow">
              {{ formatNumber(gameStore.chimes) }}
            </span>
          </div>
          <!-- CPS (kein Rahmen) -->
          <div class="flex items-center gap-1 px-2 py-0.5">
            <img src="/img/BardAbilities/BardChime.png" class="h-10 w-10 chime-glow-green" />
            <span class="text-2xl font-semibold text-transparent whitespace-nowrap tracking-wide bg-clip-text bg-gradient-to-r from-emerald-300 to-green-400 cps-text-glow">
              {{ gameStore.chimesPerSecond }}/s
            </span>
          </div>
        </div>

        <!-- Rechts: Platzhalter (Nachricht ist fixed) -->
        <div class="col-span-1"></div>
      </div>

      <!-- Hauptbereich mit 3 Spalten (responsive) -->
      <div class="grid w-full h-full grid-cols-1 gap-4 lg:grid-cols-5">
        <!-- Links: Charakter mit Portal-Effekt -->
        <div
          class="relative z-20 flex items-center justify-center w-full lg:justify-end lg:col-span-1"
        >
          <img
            src="/img/BardPortalRichtig.png"
            alt="Game Character"
            class="relative z-30 w-32 h-32 lg:w-48 lg:h-48 lg:-right-10"
            loading="lazy"
          />
          <!-- Portal Effect -->
          <div class="absolute w-20 portal-effect h-36 lg:w-28 lg:h-52 lg:-right-12">
            <div class="portal-glow"></div>
            <div class="portal-vortex"></div>
            <div class="portal-ring"></div>
          </div>
        </div>

        <!-- Mitte: Hauptspiel-Komponente -->
        <div class="w-full lg:col-span-3">
          <GameCenterComponent />
        </div>

        <!-- Rechts: Zweiter Charakter mit Portal-Effekt -->
        <div
          class="relative z-20 flex items-center justify-center w-full lg:justify-start lg:col-span-1"
        >
          <img
            src="/img/PortalEndeRichtig.png"
            alt="Game Character"
            class="relative z-30 w-32 h-32 lg:w-48 lg:h-48 lg:-left-10"
            loading="lazy"
          />
          <!-- Portal Effect -->
          <div class="absolute w-20 portal-effect h-36 lg:w-28 lg:h-52 lg:-left-12">
            <div class="portal-glow"></div>
            <div class="portal-vortex"></div>
            <div class="portal-ring"></div>
          </div>
        </div>
      </div>

      <!-- Unterer Bereich mit Spieler-Informationen -->
      <div class="z-20 flex justify-center w-full">
        <div
          class="relative w-full max-w-4xl overflow-hidden shadow-2xl border-blue-400/30 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 rounded-xl"
          :class="{ 'opacity-50': gameStore.isCPSModalOpen }"
        >
          <!-- Animated Background -->
          <div class="absolute inset-0 opacity-20">
            <div
              class="absolute w-32 h-32 bg-blue-500 rounded-full top-4 left-4 mix-blend-multiply filter blur-xl animate-blob"
            ></div>
            <div
              class="absolute rounded-full bg-violet-500 top-4 right-4 w-28 h-28 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
            ></div>
            <div
              class="absolute w-24 h-24 bg-yellow-500 rounded-full bottom-4 left-1/2 mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
            ></div>
          </div>

          <!-- 3-spaltiges Layout -->
          <div class="relative z-10 grid grid-cols-1 md:grid-cols-12 min-h-[140px] gap-2 md:gap-0">
            <!-- Links: Charakter-Status -->
            <div
              class="flex items-center justify-center p-1 md:col-span-3 md:border-r border-blue-400/30 bg-gradient-to-br from-blue-500/20 to-violet-500/10 backdrop-blur-sm"
            >
              <div class="w-full max-w-[200px]">
                <BardHudComponent />
              </div>
            </div>

            <!-- Mitte: Fähigkeiten-Leiste -->
            <div
              class="flex items-center justify-center p-1 md:col-span-6 bg-gradient-to-br from-blue-600/20 to-violet-600/10 backdrop-blur-sm"
            >
              <div class="w-full max-w-lg">
                <AbilityBarComponent />
              </div>
            </div>

            <!-- Rechts: Statistiken -->
            <div
              class="flex items-center justify-center p-1 md:col-span-3 md:border-l border-blue-400/30 bg-gradient-to-br from-blue-500/20 to-violet-500/10 backdrop-blur-sm"
            >
              <div class="w-full">
                <StatsPanelComponent />
              </div>
            </div>
          </div>

          <!-- Glassmorphism Border Effect -->
          <div class="absolute inset-0 border pointer-events-none rounded-xl border-white/20"></div>
        </div>
      </div>
    </div>
    <!-- Encyclopedia Toggle Button -->
    <button
      v-show="!gameStore.isEncyclopediaOpen"
      class="fixed right-0 z-40 px-2 py-3 transition-all duration-300 -translate-y-1/2 border border-r-0 shadow-lg top-1/2 rounded-l-xl bg-gradient-to-b from-blue-800/80 to-violet-900/80 backdrop-blur-sm border-blue-400/30 hover:from-blue-700/90 hover:to-violet-800/90 hover:shadow-blue-500/20 hover:pr-3 group"
      @click="gameStore.toggleEncyclopedia()"
    >
      <span class="text-lg transition-transform duration-200 group-hover:scale-110">📖</span>
    </button>

    <!-- Encyclopedia Panel -->
    <EncyclopediaPanel />

    <!-- Admin Dashboard -->
    <AdminDashboard />

    <!-- Wechselnde Nachrichten – fixed, garantiert über allem -->
    <p
      class="fixed top-10 right-10 z-[200] font-['MedievalSharp'] text-xl transition-opacity duration-500 cursor-default select-none text-amber-500 drop-shadow-lg pointer-events-none"
    >
      {{ currentMsg }}
    </p>

    <span
      class="fixed z-50 text-sm bottom-5 right-5 font-['MedievalSharp'] text-amber-500 drop-shadow-lg"
      >©Leuteritz</span
    >
  </div>
</template>

<style>
:root {
  --star-base-size: 2px;
  --star-max-size: 6px;
  --cosmic-gradient: linear-gradient(45deg, #0a0620, #110b3d, #160e4a, #0d0830);
}

.cosmic-bg {
  background: var(--cosmic-gradient);
  background-size: 400% 400%;
  animation: cosmicShift 20s ease infinite;
}

.cosmic-bg.reduce-motion {
  animation: none;
  background-position: 0% 50%;
}

@keyframes cosmicShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cosmic-bg {
    animation: none !important;
  }
}

.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 500ms;
}

.backdrop-blur-lg {
  backdrop-filter: blur(16px);
}

.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}

.chime-glow {
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.6)) drop-shadow(0 0 20px rgba(251, 191, 36, 0.3));
}

.chime-glow-green {
  filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.5)) drop-shadow(0 0 16px rgba(52, 211, 153, 0.25));
}

.chimes-text-glow {
  filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.5));
}

.cps-text-glow {
  filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.4));
}

/* ── Portal Effect ── */
.portal-effect {
  border-radius: 50%;
  position: absolute;
  overflow: visible;
}

.portal-glow {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 215, 0, 0.4) 0%,
    rgba(255, 180, 0, 0.2) 40%,
    rgba(180, 120, 0, 0.1) 70%,
    transparent 100%
  );
  filter: blur(10px);
  animation: portalPulse 3s ease-in-out infinite;
}

.portal-vortex {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    rgba(255, 215, 0, 0.6),
    rgba(180, 130, 20, 0.2),
    rgba(255, 200, 50, 0.5),
    rgba(120, 80, 10, 0.15),
    rgba(255, 215, 0, 0.6)
  );

  mask-image: radial-gradient(
    ellipse at center,
    transparent 30%,
    black 50%,
    black 70%,
    transparent 90%
  );
  -webkit-mask-image: radial-gradient(
    ellipse at center,
    transparent 30%,
    black 50%,
    black 70%,
    transparent 90%
  );
}

.portal-vortex::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(40, 20, 5, 0.9) 0%,
    rgba(80, 50, 10, 0.7) 35%,
    rgba(180, 120, 20, 0.3) 60%,
    transparent 80%
  );
}

.portal-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
  background:
    linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0)) padding-box,
    linear-gradient(135deg, #ffd700, #b8860b, #ffd700, #daa520, #ffd700) border-box;
  box-shadow:
    0 0 15px 3px rgba(255, 215, 0, 0.4),
    inset 0 0 15px 3px rgba(255, 215, 0, 0.2),
    0 0 30px 6px rgba(255, 180, 0, 0.15);
  animation: portalPulse 3s ease-in-out infinite;
}

@keyframes portalPulse {
  0%,
  100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}
</style>
