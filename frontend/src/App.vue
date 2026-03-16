<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from './stores/gameStore'
import { formatNumber } from './config/numberFormat'
import { universes } from './config/universes'
import AbilityBarComponent from './components/bottom/AbilityBarComponent.vue'
import GameCenterComponent from './components/gameCenter/GameCenterComponent.vue'
import RankComponent from './components/RankComponent.vue'
import StarBackgroundComponent from './components/layout/StarBackgroundComponent.vue'
import PlanetRescueOverlay from './components/layout/PlanetRescueOverlay.vue'
import PlanetRescueModal from './components/layout/PlanetRescueModal.vue'
import EncyclopediaPanel from './components/encyclopedia/EncyclopediaPanel.vue'
import AdminDashboard from './components/AdminDashboard.vue'
import UniversePortalComponent from './components/UniversePortalComponent.vue'

const gameStore = useGameStore()

const activeTab = ref('idle')
const tabs = [
  { id: 'idle', label: 'Idle', icon: '🎵' },
  { id: 'battle', label: 'Battle', icon: '⚔️' },
  { id: 'champions', label: 'Champions', icon: '🏆' },
]

const bardPanelOpen = ref(false)
const toggleBardPanel = () => {
  bardPanelOpen.value = !bardPanelOpen.value
}
const xpProgress = computed(() => gameStore.levelProgress / 100)
</script>

<template>
  <div class="min-h-screen cosmic-bg">
    <StarBackgroundComponent />
    <PlanetRescueOverlay />
    <PlanetRescueModal />

    <div
      class="flex flex-col justify-between px-4 pt-4 pb-10 w-full min-h-screen font-['MedievalSharp']"
    >
      <!-- Oberer Bereich mit Navigation -->
      <div class="z-50 grid w-full h-8 grid-cols-3">
        <!-- Links: Bard portrait toggle -->
        <div class="flex items-start justify-start col-span-1 px-4 py-4">
          <div class="relative flex items-start">
            <!-- Clickable Bard portrait -->
            <div class="cursor-pointer group" @click="toggleBardPanel">
              <div class="relative w-36 h-36">
                <!-- Pulse glow -->
                <div
                  class="absolute rounded-full -inset-1 bg-gradient-to-r from-blue-400 via-violet-400 to-blue-500 opacity-40 animate-pulse"
                ></div>
                <!-- XP ring -->
                <svg
                  class="absolute inset-0 w-full h-full transform -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgb(59 130 246 / 0.3)"
                    stroke-width="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgb(59 130 246)"
                    stroke-width="8"
                    stroke-linecap="round"
                    :stroke-dasharray="`${xpProgress * 283} 283`"
                    class="transition-all duration-1000 ease-out"
                    style="filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))"
                  />
                </svg>
                <!-- Portrait image -->
                <div
                  class="absolute overflow-hidden border-2 rounded-full shadow-2xl inset-2 border-blue-400/50 bg-gradient-to-br from-white/20 to-white/5"
                >
                  <img
                    src="/img/BardAbilities/Bard.png"
                    class="object-cover w-full h-full transition-transform duration-500 transform group-hover:scale-110"
                  />
                </div>
                <!-- Level badge -->
                <div class="absolute -bottom-1 -right-1">
                  <div
                    class="flex items-center justify-center border-2 rounded-full shadow-lg h-9 w-9 bg-gradient-to-br from-blue-500 to-violet-600 border-blue-300/50"
                  >
                    <span class="text-xl font-black text-white">{{ gameStore.level }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Dropdown panel -->
            <div
              v-show="bardPanelOpen"
              class="absolute left-0 z-50 flex flex-col gap-4 mt-8 top-full"
            >
              <RankComponent />
              <AbilityBarComponent />
            </div>
          </div>
        </div>

        <!-- Mitte: Chimes & CPS -->
        <div class="flex flex-col items-center justify-center col-span-1 gap-0">
          <!-- Gesamt-Chimes -->
          <div class="flex items-center gap-1 px-4 py-1">
            <img src="/img/BardAbilities/BardChime.png" class="w-24 h-24 chime-glow" />
            <span
              class="font-bold tracking-wider text-transparent text-7xl whitespace-nowrap bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 chimes-text-glow"
            >
              {{ formatNumber(gameStore.chimes) }}
            </span>
          </div>
          <!-- CPS (kein Rahmen) -->
          <div class="flex items-center gap-1 px-2 py-0.5">
            <img src="/img/BardAbilities/BardChime.png" class="w-10 h-10 chime-glow-green" />
            <span
              class="text-2xl font-semibold tracking-wide text-transparent whitespace-nowrap bg-clip-text bg-gradient-to-r from-emerald-300 to-green-400 cps-text-glow"
            >
              {{ gameStore.chimesPerSecond }}/s
            </span>
          </div>
        </div>

        <!-- Rechts: Tab Bar -->
        <div class="flex items-start justify-end col-span-1 pr-10">
          <div
            class="flex gap-1.5 p-1.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/15"
          >
            <button
              v-for="tab in tabs"
              :key="tab.id"
              :class="activeTab === tab.id ? 'tab-active' : 'tab-inactive'"
              class="flex items-center gap-2 px-5 py-3 text-base font-semibold transition-all duration-300 tab-btn rounded-xl"
              @click="activeTab = tab.id"
            >
              <span>{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Hauptbereich -->
      <div class="flex flex-col w-full gap-2">
        <!-- GameCenter: zentriert -->
        <div class="flex justify-center w-full">
          <div class="w-full">
            <GameCenterComponent :active-tab="activeTab" />
          </div>
        </div>

        <UniversePortalComponent />
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
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.6))
    drop-shadow(0 0 20px rgba(251, 191, 36, 0.3));
}

.chime-glow-green {
  filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.5))
    drop-shadow(0 0 16px rgba(52, 211, 153, 0.25));
}

.chimes-text-glow {
  filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.5));
}

.cps-text-glow {
  filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.4));
}
</style>

<style scoped>
.tab-active {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.85), rgba(234, 179, 8, 0.85));
  color: #1a1000;
  box-shadow: 0 0 14px rgba(251, 191, 36, 0.45);
}

.tab-inactive {
  color: rgba(251, 191, 36, 0.5);
}

.tab-btn:hover {
  color: rgba(251, 191, 36, 0.9);
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.2);
}
</style>
