<script setup lang="ts">
import { useGameStore } from './stores/gameStore'
import { useBattleStore } from './stores/battleStore'
import { useTitleRotation } from './composables/useTitleRotation'
import StatsPanelComponent from './components/bottom/StatsPanelComponent.vue'
import AbilityBarComponent from './components/bottom/AbilityBarComponent.vue'
import BardHudComponent from './components/bottom/BardHudComponent.vue'
import GameCenterComponent from './components/gameCenter/GameCenterComponent.vue'
import RankComponent from './components/RankComponent.vue'
import StarBackgroundComponent from './components/layout/StarBackgroundComponent.vue'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const { currentMsg } = useTitleRotation()

const title = 'Bardle'
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

        <!-- Mitte: Spiel-Titel -->
        <h1
          class="flex items-start justify-center col-span-1 text-4xl font-bold text-amber-600 drop-shadow-lg"
        >
          {{ title }}
        </h1>

        <!-- Rechts: Wechselnde Nachrichten -->
        <div class="flex items-center justify-center col-span-1 mb-44">
          <p
            class="text-xl transition-opacity duration-500 cursor-default select-none text-amber-500 drop-shadow-lg"
          >
            {{ currentMsg }}
          </p>
        </div>
        <div class="absolute z-20 top-3 right-3">
          <div
            class="px-3 py-1 transition-colors duration-200 border rounded-full shadow-lg backdrop-blur-sm bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/30 group-hover:from-purple-500/30 group-hover:to-pink-500/30"
          >
            <span
              class="text-sm font-bold text-transparent whitespace-nowrap bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300"
            >
              ⏱ {{ battleStore.formatTime(gameStore.inGameTime) }}
            </span>
          </div>
        </div>
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
          <div
            class="absolute w-16 h-32 bg-yellow-500 rounded-full shadow-lg lg:w-24 lg:h-48 lg:-right-12"
          ></div>
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
          <div
            class="absolute w-16 h-32 bg-yellow-500 rounded-full shadow-lg lg:w-24 lg:h-48 lg:-left-12"
          ></div>
        </div>
      </div>

      <!-- Unterer Bereich mit Spieler-Informationen -->
      <div class="z-20 flex justify-center w-full">
        <div
          class="relative w-full max-w-4xl overflow-hidden shadow-2xl border-purple-400/30 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-xl"
          :class="{ 'opacity-50': gameStore.isCPSModalOpen }"
        >
          <!-- Animated Background -->
          <div class="absolute inset-0 opacity-20">
            <div
              class="absolute w-32 h-32 bg-purple-500 rounded-full top-4 left-4 mix-blend-multiply filter blur-xl animate-blob"
            ></div>
            <div
              class="absolute bg-pink-500 rounded-full top-4 right-4 w-28 h-28 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
            ></div>
            <div
              class="absolute w-24 h-24 bg-yellow-500 rounded-full bottom-4 left-1/2 mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
            ></div>
          </div>

          <!-- 3-spaltiges Layout -->
          <div class="relative z-10 grid grid-cols-1 md:grid-cols-12 min-h-[140px] gap-2 md:gap-0">
            <!-- Links: Charakter-Status -->
            <div
              class="flex items-center justify-center p-1 md:col-span-3 md:border-r border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-pink-500/10 backdrop-blur-sm"
            >
              <div class="w-full max-w-[200px]">
                <BardHudComponent />
              </div>
            </div>

            <!-- Mitte: Fähigkeiten-Leiste -->
            <div
              class="flex items-center justify-center p-1 md:col-span-6 bg-gradient-to-br from-purple-600/20 to-pink-600/10 backdrop-blur-sm"
            >
              <div class="w-full max-w-lg">
                <AbilityBarComponent />
              </div>
            </div>

            <!-- Rechts: Statistiken -->
            <div
              class="flex items-center justify-center p-1 md:col-span-3 md:border-l border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-pink-500/10 backdrop-blur-sm"
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
  </div>
</template>

<style>
:root {
  --star-base-size: 2px;
  --star-max-size: 6px;
  --cosmic-gradient: linear-gradient(45deg, #1e1b4b, #312e81, #3730a3, #1e40af);
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
</style>
