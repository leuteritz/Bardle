<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from './stores/gameStore'
import { useShopStore } from './stores/shopStore'
import { formatNumber } from './config/numberFormat'
import GameCenterComponent from './components/gameCenter/GameCenterComponent.vue'
import StarBackgroundComponent from './components/layout/StarBackgroundComponent.vue'
import PlanetRescueOverlay from './components/layout/PlanetRescueOverlay.vue'
import PlanetRescueModal from './components/layout/PlanetRescueModal.vue'
import EncyclopediaPanel from './components/encyclopedia/EncyclopediaPanel.vue'
import AdminDashboard from './components/AdminDashboard.vue'
import BardProfileMenu from './components/BardProfileMenu.vue'
import TopRightHudComponent from './components/ui/TopRightHudComponent.vue'

const gameStore = useGameStore()
const shopStore = useShopStore()

const totalUpgrades = computed(() => shopStore.shopUpgrades.reduce((sum, u) => sum + u.level, 0))
const canAffordAny = computed(() =>
  shopStore.shopUpgrades.some((u) => shopStore.canAffordUpgrade(u)),
)

const activeTab = ref('idle')
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
      <div class="z-[100] grid w-full min-h-8 grid-cols-3 items-start">
        <!-- Links: Bard portrait toggle -->
        <div class="flex items-start justify-start col-span-1 px-4 py-4">
          <BardProfileMenu />
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
            <span
              class="text-4xl font-semibold tracking-wide text-transparent whitespace-nowrap bg-clip-text bg-gradient-to-r from-emerald-300 to-green-400 cps-text-glow"
            >
              {{ gameStore.chimesPerSecond }} CPS
            </span>
          </div>
        </div>

        <div class="col-span-1 flex justify-end items-start px-4 py-4">
          <TopRightHudComponent />
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

      </div>
    </div>

    <!-- Encyclopedia Toggle Button -->
    <button
      v-show="!gameStore.isEncyclopediaOpen"
      class="fixed right-0 z-[45] px-2 py-3 transition-all duration-300 -translate-y-1/2 border border-r-0 shadow-lg top-1/2 rounded-l-xl bg-gradient-to-b from-blue-800/80 to-violet-900/80 backdrop-blur-sm border-blue-400/30 hover:from-blue-700/90 hover:to-violet-800/90 hover:shadow-blue-500/20 hover:pr-3 group"
      @click="gameStore.toggleEncyclopedia()"
    >
      <span class="text-lg transition-transform duration-200 group-hover:scale-110">📖</span>
    </button>

    <!-- Encyclopedia Panel -->
    <EncyclopediaPanel />

    <!-- Admin Dashboard (standalone, keyboard shortcut Ctrl+Shift+A) -->
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
