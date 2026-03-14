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
import EncyclopediaPanel from './components/encyclopedia/EncyclopediaPanel.vue'

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
            class="px-3 py-1 transition-colors duration-200 border rounded-full shadow-lg backdrop-blur-sm bg-gradient-to-r from-blue-500/20 to-violet-500/20 border-blue-400/30 group-hover:from-blue-500/30 group-hover:to-violet-500/30"
          >
            <span
              class="text-sm font-bold text-transparent whitespace-nowrap bg-clip-text bg-gradient-to-r from-blue-300 to-violet-300"
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
          class="relative w-full max-w-4xl overflow-hidden shadow-2xl border-blue-400/30 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 rounded-xl"
          :class="{ 'opacity-50': gameStore.isCPSModalOpen }"
        >
          <!-- Animated Background -->
          <div class="absolute inset-0 opacity-20">
            <div
              class="absolute w-32 h-32 bg-blue-500 rounded-full top-4 left-4 mix-blend-multiply filter blur-xl animate-blob"
            ></div>
            <div
              class="absolute bg-violet-500 rounded-full top-4 right-4 w-28 h-28 mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
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
      class="fixed right-0 z-40 px-2 py-3 transition-all duration-300 border border-r-0 shadow-lg top-1/2 -translate-y-1/2 rounded-l-xl bg-gradient-to-b from-blue-800/80 to-violet-900/80 backdrop-blur-sm border-blue-400/30 hover:from-blue-700/90 hover:to-violet-800/90 hover:shadow-blue-500/20 hover:pr-3 group"
      @click="gameStore.toggleEncyclopedia()"
    >
      <span class="text-lg transition-transform duration-200 group-hover:scale-110">📖</span>
    </button>

    <!-- Encyclopedia Panel -->
    <EncyclopediaPanel />
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
</style>
